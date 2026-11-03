/** Unmounted numeric route that resolves session authority from the server store. */
import { Router, type Request } from 'express';
import type { SessionStore } from '../session-store.js';
import { createNumericAuthenticatedDeliveryRouter, type AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';

const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;
const COOKIE_NAMES = new Set(['aegis_admin_session', '__Host-aegis_admin_session']);

function sessionId(req: Request, cookieName: string): string | null {
  const raw = req.headers.cookie;
  if (typeof raw !== 'string') return null;
  let found: string | null = null;
  for (const part of raw.split(';')) {
    const entry = part.trim();
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator) !== cookieName) continue;
    const value = entry.slice(separator + 1);
    if (found !== null || !SESSION_ID.test(value)) return null;
    found = value;
  }
  return found;
}

/** Owns req.adminSession for this isolated route, ignoring any earlier assignment. */
export function createNumericSessionRouter(
  expectedOrigin: string,
  cookieName: string,
  sessions: SessionStore,
  inputs: AuthenticatedNumericDeliveryInputs,
) {
  if (!COOKIE_NAMES.has(cookieName) || !sessions || typeof sessions.get !== 'function')
    throw new Error('numeric_session_config_invalid');
  const router = Router();
  router.use(async (req, res, next) => {
    req.adminSession = undefined;
    const id = sessionId(req, cookieName);
    if (!id) return res.status(401).json({ status: 'authentication_required' });
    try { req.adminSession = await sessions.get(id); }
    catch { return res.status(503).json({ status: 'session_uncertain' }); }
    if (!req.adminSession || req.adminSession.id !== id)
      return res.status(401).json({ status: 'authentication_required' });
    next();
  });
  router.use(createNumericAuthenticatedDeliveryRouter(expectedOrigin, inputs));
  return router;
}
