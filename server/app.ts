import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { GatewayConfig } from './config.js';
import { hasAuthenticatedServiceRole, REQUIRED_ADMIN_ROLE } from './config.js';
import type { EntraAuth } from './entra-auth.js';
import { createOperationsRouter, type OperationsProvider } from './operations-router.js';
import { SessionCapacityError, type AdminSession, type SessionStore } from './session-store.js';
import { createEvidenceRouter } from './evidence-router.js';
import { EvidenceService, InMemoryEvidenceStore, type EvidenceStore } from './evidence-store.js';
import { createGovernedAsk, createLuminaryReplyRouter, notConfiguredAskModel, type AskModel } from './luminary-reply-router.js';
import { createLuminaryTaskRouter, isLoopback } from './luminary-task-router.js';
import type { LuminaryExecutor } from './luminary-executor.js';
import { requireDemoKey, createIpRateLimiter } from './luminary-access.js';
import { notConfiguredGauge, type Gauge } from './luminary-pipeline/pipeline.js';
import type { ReviewRecord } from './governance-record/review.js';
import { createReviewRouter } from './review-router.js';

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_RATE_KEY_LIMIT = 10_000;

interface LoginRateWindow {
  startedAt: number;
  attempts: number;
}

export function sessionCookieName(config: GatewayConfig): string {
  return config.cookieSecure ? '__Host-aegis_admin_session' : 'aegis_admin_session';
}

declare global {
  namespace Express {
    interface Request { adminSession?: AdminSession; }
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

function cookieOptions(config: GatewayConfig) {
  return { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax' as const, path: '/', maxAge: config.sessionTtlMs };
}

export interface CreateGatewayOptions {
  config: GatewayConfig;
  sessions: SessionStore;
  entra: EntraAuth;
  operationsProvider?: OperationsProvider;
  evidenceStore?: EvidenceStore;
  /** Reply source for the Luminary endpoint. Defaults to the honest not-configured placeholder. */
  askModel?: AskModel;
  /**
   * The separate, small gauge model that reads every reply (STP-0002 P17, N13-N15). Defaults to
   * a not-configured gauge, so no reply leaves ungauged: it fails closed as a gauge_error Shortfall.
   */
  gauge?: Gauge;
  /** The review areas (STP-0005 P3). Every Architect message and Luminary reply is written here first. */
  record?: ReviewRecord;
  /** Names the reply source in /api/luminary/status, e.g. 'rehearsal'. Absent = not configured. */
  replySource?: string;
  /** The running spend total for a paid reply source (P21), shown to the Architect in the panel. */
  spend?: { summary(): { spentUsd: number; ceilingUsd: number; calls: number } };
  /** The Knowledge Pack sent with every question (P23), named so each answer can record it. */
  knowledge?: { version: string; sha256: string; bytes: number };
  /** The Luminary's code-production executor (P19). Absent = coding tasks are off. */
  executor?: LuminaryExecutor;
  vite?: ViteDevServer;
}

/** Reviewer-facing Luminary endpoint throttle: 30 requests per IP per minute. */
/** The running total, or an honest 'unreadable' when the ledger cannot be read (every call is then refused). */
function readSpend(spend: NonNullable<CreateGatewayOptions['spend']>): { spentUsd: number; ceilingUsd: number; calls: number } | { unreadable: true } {
  try {
    return spend.summary();
  } catch {
    return { unreadable: true };
  }
}

const LUMINARY_RATE_WINDOW_MS = 60_000;
const LUMINARY_RATE_LIMIT = 30;

export async function createGateway(options: CreateGatewayOptions) {
  const { config, sessions, entra } = options;
  if (config.nodeEnv === 'production' && !sessions.shared) {
    throw new Error('Production requires a shared SessionStore; in-memory sessions are refused');
  }
  const evidenceStore = options.evidenceStore ?? (config.nodeEnv === 'production' ? undefined : new InMemoryEvidenceStore());
  if (!evidenceStore || (config.nodeEnv === 'production' && !evidenceStore.durable)) {
    throw new Error('Production requires a durable Redis EvidenceStore; in-memory evidence is refused');
  }
  const app = express();
  const loginWindows = new Map<string, LoginRateWindow>();
  const scriptSources = [
    "'self'",
    // Meshopt and self-hosted model decoders instantiate WASM used by shipped GLBs.
    "'wasm-unsafe-eval'",
    // Vite injects the React Refresh preamble as an inline module in development only.
    ...(config.nodeEnv === 'development' ? ["'unsafe-inline'"] : []),
  ];
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: scriptSources,
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        // transparenttextures.com serves the Reliquary's carbon-fibre texture, part of the IDE's
        // designed look; it was being blocked here.
        imgSrc: ["'self'", 'data:', 'blob:', 'https://www.transparenttextures.com'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'", 'https://login.microsoftonline.com'],
        upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.nodeEnv === 'production' ? undefined : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use((_req, res, next) => {
    // The IDE's own page may use the microphone, for the Luminary's hold-to-talk (STP-0002 P27);
    // nothing else may, and the rest stays off.
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()');
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  app.use(async (req, _res, next) => {
    const id = readCookie(req, sessionCookieName(config));
    if (id) req.adminSession = await sessions.get(id);
    next();
  });

  const limitLoginAttempts = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [address, window] of loginWindows) {
      if (now - window.startedAt >= LOGIN_WINDOW_MS) loginWindows.delete(address);
    }
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const current = loginWindows.get(key);
    if (!current || now - current.startedAt >= LOGIN_WINDOW_MS) {
      if (!current && loginWindows.size >= LOGIN_RATE_KEY_LIMIT) {
        res.status(503).json({ error: 'login_limiter_capacity_reached' });
        return;
      }
      loginWindows.set(key, { startedAt: now, attempts: 1 });
      next();
      return;
    }
    current.attempts += 1;
    if (current.attempts > LOGIN_ATTEMPT_LIMIT) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((current.startedAt + LOGIN_WINDOW_MS - now) / 1_000)));
      res.status(429).json({ error: 'login_rate_limited' });
      return;
    }
    next();
  };

  app.get('/auth/entra/login', limitLoginAttempts, async (req, res) => {
    if (!entra.configured) return res.status(503).json({ error: 'authentication_not_configured' });
    let session: AdminSession;
    try {
      session = req.adminSession ?? await sessions.create(config.sessionTtlMs);
    } catch (error) {
      if (error instanceof SessionCapacityError) {
        return res.status(503).json({ error: 'session_capacity_reached' });
      }
      throw error;
    }
    const url = await entra.createAuthorizationUrl(session);
    await sessions.set(session);
    res.cookie(sessionCookieName(config), session.id, cookieOptions(config));
    return res.redirect(302, url);
  });

  app.get('/auth/entra/callback', async (req, res) => {
    const session = req.adminSession;
    if (!entra.configured || !session) return res.status(401).send('Authorization session is unavailable.');
    let authenticatedSession: AdminSession | undefined;
    try {
      const principal = await entra.completeAuthorization(session, req.query);
      authenticatedSession = await sessions.rotate(session.id, config.sessionTtlMs);
      authenticatedSession.principal = principal;
      await sessions.set(authenticatedSession);
      res.cookie(sessionCookieName(config), authenticatedSession.id, cookieOptions(config));
      return res.redirect(303, '/admin/operations');
    } catch {
      await sessions.delete(session.id);
      if (authenticatedSession) await sessions.delete(authenticatedSession.id);
      res.clearCookie(sessionCookieName(config), cookieOptions(config));
      return res.status(403).send('Authorization was denied.');
    }
  });

  const requireAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    const principal = req.adminSession?.principal;
    if (!principal) return res.status(401).json({ error: 'authentication_required' });
    if (!hasAuthenticatedServiceRole(principal.roles)) return res.status(403).json({ error: 'role_required' });
    next();
  };
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const principal = req.adminSession?.principal;
    if (!principal) return res.status(401).json({ error: 'authentication_required' });
    if (!principal.roles.includes(REQUIRED_ADMIN_ROLE)) return res.status(403).json({ error: 'role_required' });
    next();
  };

  app.get('/api/admin/session', (req, res, next) => {
    if (!entra.configured) return res.status(503).json({ error: 'authentication_not_configured' });
    next();
  }, requireAuthenticated, (req, res) => {
    const principal = req.adminSession!.principal!;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ authenticated: true, subject: principal.subject, name: principal.name, username: principal.username, roles: principal.roles, csrfToken: principal.csrfToken });
  });

  app.post('/auth/logout', requireAuthenticated, async (req, res) => {
    const session = req.adminSession!;
    const csrf = req.header('x-csrf-token');
    const origin = req.header('origin');
    if (!csrf || csrf !== session.principal!.csrfToken || !origin || origin !== config.origin) {
      return res.status(403).json({ error: 'csrf_validation_failed' });
    }
    await sessions.delete(session.id);
    res.clearCookie(sessionCookieName(config), cookieOptions(config));
    return res.status(204).end();
  });

  app.use('/api/admin/operations', requireAdmin, (req, res, next) => {
    const remainingMs = Math.max(0, req.adminSession!.expiresAt - Date.now());
    const expiryTimer = setTimeout(() => {
      if (!res.writableEnded) res.end();
    }, remainingMs);
    res.on('close', () => clearTimeout(expiryTimer));
    next();
  }, createOperationsRouter(options.operationsProvider));

  app.use('/api/admin/evidence', requireAdmin, createEvidenceRouter(new EvidenceService(evidenceStore), config.origin));

  // Reviewer-facing Luminary reply endpoint (M1.a, P14). Not behind the Entra admin gate so a
  // reviewer can reach it; guarded instead by a shared demo key + a per-IP rate limit, and
  // fail-closed when no key is configured. The reply source defaults to an honest placeholder
  // that yields a named Shortfall until a real model is wired (M1.b). Every reply then passes
  // the P17 pipeline (PIM -> IRG -> RBC -> Prism | IDS); the gauge defaults to not-configured.
  // P19 adds a status read for the panel and, when the executor is on, loopback-only coding tasks
  // that take the same governed path as /ask.
  const luminaryAskModel = options.askModel ?? notConfiguredAskModel;
  const luminaryReplyOptions = { pipeline: { gauge: options.gauge ?? notConfiguredGauge }, record: options.record };
  app.use(
    '/api/luminary',
    requireDemoKey(config.luminaryDemoKey),
    createIpRateLimiter({ windowMs: LUMINARY_RATE_WINDOW_MS, limit: LUMINARY_RATE_LIMIT }),
  );
  app.get('/api/luminary/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      replySource: options.askModel ? (options.replySource ?? 'configured') : 'not_configured',
      gauge: options.gauge ? 'configured' : 'not_configured',
      codingTasks: options.executor ? (isLoopback(req) ? 'on' : 'local_only') : 'off',
      ...(options.spend ? { spend: readSpend(options.spend) } : {}),
      ...(options.knowledge ? { knowledge: options.knowledge } : {}),
    });
  });
  if (options.executor) {
    app.use('/api/luminary/tasks', createLuminaryTaskRouter(options.executor, createGovernedAsk(luminaryAskModel, luminaryReplyOptions)));
  }
  if (options.record) app.use('/api/luminary/review', createReviewRouter(options.record));
  app.use('/api/luminary', createLuminaryReplyRouter(luminaryAskModel, luminaryReplyOptions));

  const vite = options.vite ?? (config.nodeEnv === 'development'
    ? await import('vite').then(({ createServer }) => createServer({ server: { middlewareMode: true }, appType: 'custom' }))
    : undefined);
  if (vite) app.use(vite.middlewares);
  else app.use(express.static(resolve(process.cwd(), 'dist'), { index: false }));

  app.get(['/', '/admin/operations'], async (req, res, next) => {
    try {
      if (vite) {
        const source = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');
        const html = await vite.transformIndexHtml(req.originalUrl, source);
        return res.status(200).type('html').send(html);
      }
      return res.sendFile(resolve(process.cwd(), 'dist', 'index.html'));
    } catch (error) { next(error); }
  });

  app.use((_req, res) => res.status(404).type('text').send('Not found'));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error && typeof error === 'object' && (error as { type?: unknown }).type === 'entity.too.large') {
      if (!res.headersSent) res.status(413).json({ error: 'request_entity_too_large' });
      return;
    }
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
