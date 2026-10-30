// Coding-task routes for the Luminary (STP-0002 P19, N24, N25), mounted under /api/luminary/tasks.
// The Architect assigns a task; the Luminary's reply takes the same governed path as /ask; the
// executor puts the proposed change on the Luminary's own branch and runs the checks; only the
// Architect's accept merges it. Loopback only: the executor writes to this computer's checkout,
// so a reviewer reaching the demo from elsewhere can talk to the Luminary but never reach this.
//
// "Loopback" means all of: the socket is local, the Host names this computer, any Origin is local,
// and no proxy or tunnel header is present. A tunnel or reverse proxy on the same computer connects
// from loopback too, so the socket alone is not enough; such proxies add forwarding headers or carry
// the public host name, and either one closes the executor. A proxy set up to strip every such header
// and rewrite Host would still defeat this, which is why the executor stays off unless
// LUMINARY_EXECUTOR=on and must never be switched on behind a tunnel.

import { Router, type NextFunction, type Request, type Response } from 'express';
import { composePrompt, findChange, EXPLANATION_LEVELS, type ExplanationLevel } from '../src/luminary/blocks.js';
import { ExecutorShortfall, LuminaryExecutor } from './luminary-executor.js';
import { evidence, shortfallStatus, type GovernedAskResult } from './luminary-reply-router.js';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
/** Headers a reverse proxy or tunnel adds. Any one of them means the request was relayed. */
const PROXY_HEADERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip', 'via', 'cf-connecting-ip', 'true-client-ip', 'x-original-host', 'ngrok-trace-id'];

const hostName = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('[')) return trimmed.slice(0, trimmed.indexOf(']') + 1);
  return trimmed.split(':')[0];
};

const isLocalOrigin = (origin: string) => {
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
};

/** The socket address, not a forwarded header, so a proxy cannot make a remote caller look local. */
export const isLoopback = (req: Request) => {
  if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return false;
  if (PROXY_HEADERS.some((name) => req.headers[name] !== undefined)) return false;
  if (!LOOPBACK_HOSTS.has(hostName(req.headers.host ?? ''))) return false;
  const origin = req.headers.origin;
  return origin === undefined || isLocalOrigin(origin);
};

export function requireLoopback(req: Request, res: Response, next: NextFunction): void {
  if (!isLoopback(req)) {
    res.status(403).json({ error: 'executor_local_only' });
    return;
  }
  next();
}

/** Context chips sent with a coding task: the same shape and limit the Ask path uses. */
export const TASK_CONTEXT_LIMIT_BYTES = 24_000;
export function readTaskContext(raw: unknown): { label: string; text: string }[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 16) return null;
  const items: { label: string; text: string }[] = [];
  let size = 0;
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const { label, text } = item as Record<string, unknown>;
    if (typeof label !== 'string' || typeof text !== 'string') return null;
    size += Buffer.byteLength(text, 'utf8');
    items.push({ label: label.slice(0, 80), text });
  }
  return size > TASK_CONTEXT_LIMIT_BYTES ? null : items;
}

const SHORTFALL_HTTP: Record<ExecutorShortfall['code'], number> = {
  fence: 422,
  no_change: 422,
  not_found: 404,
  not_open: 409,
  git_error: 500,
  merge_conflict: 409,
  ledger_invalid: 409,
  ledger_error: 500,
  review_incomplete: 409,
};

function sendExecutorShortfall(res: Response, error: unknown): void {
  if (error instanceof ExecutorShortfall) {
    res.status(SHORTFALL_HTTP[error.code]).json({ error: 'executor_shortfall', shortfall: { code: error.code, message: error.message } });
    return;
  }
  res.status(500).json({ error: 'executor_shortfall', shortfall: { code: 'git_error', message: error instanceof Error ? error.message : 'The executor failed.' } });
}

export function createLuminaryTaskRouter(executor: LuminaryExecutor, governedAsk: (prompt: string) => Promise<GovernedAskResult>): Router {
  const router = Router();
  router.use(requireLoopback);

  router.post('/', async (req: Request, res: Response) => {
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    if (!goal) {
      res.status(400).json({ error: 'malformed_request', detail: 'A coding task needs a goal.' });
      return;
    }
    const level: ExplanationLevel = (EXPLANATION_LEVELS as readonly unknown[]).includes(body.level) ? (body.level as ExplanationLevel) : 'plain';
    const mode = typeof body.mode === 'string' && body.mode.trim() ? body.mode.trim().slice(0, 32) : 'CODE';
    const context = readTaskContext(body.context);
    if (!context) {
      res.status(400).json({ error: 'malformed_request', detail: `Context must be a list of labelled notes, ${TASK_CONTEXT_LIMIT_BYTES} bytes at most.` });
      return;
    }

    let allowedFiles: string[];
    try {
      allowedFiles = LuminaryExecutor.fenceTask(body.allowedFiles);
    } catch (error) {
      sendExecutorShortfall(res, error);
      return;
    }

    const result = await governedAsk(composePrompt({ mode, level, context, message: goal, task: { allowedFiles } }));
    if (!result.ok) {
      res.status(shortfallStatus(result.shortfall.code)).json({ error: 'luminary_shortfall', shortfall: result.shortfall, ...evidence(result) });
      return;
    }

    try {
      const task = await executor.propose({ goal, allowedFiles, modelId: result.reply.modelId, change: findChange(result.reply.content) });
      res.status(201).json({ reply: result.reply, lineage: result.lineage, task: task });
    } catch (error) {
      if (error instanceof ExecutorShortfall) {
        res.status(SHORTFALL_HTTP[error.code]).json({ error: 'executor_shortfall', reply: result.reply, lineage: result.lineage, shortfall: { code: error.code, message: error.message } });
        return;
      }
      sendExecutorShortfall(res, error);
    }
  });

  router.post('/:id/accept', async (req: Request, res: Response) => {
    try {
      res.json({ task: await executor.accept(String(req.params.id)) });
    } catch (error) {
      sendExecutorShortfall(res, error);
    }
  });

  router.post('/:id/decline', async (req: Request, res: Response) => {
    try {
      res.json({ task: await executor.decline(String(req.params.id)) });
    } catch (error) {
      sendExecutorShortfall(res, error);
    }
  });

  router.get('/ledger', (_req: Request, res: Response) => {
    res.json(executor.readLedger());
  });

  return router;
}
