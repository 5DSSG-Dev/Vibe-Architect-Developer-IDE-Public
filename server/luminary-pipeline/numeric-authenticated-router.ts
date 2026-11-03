/** Candidate authenticated HTTP boundary. Deliberately unmounted. */
import { timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import { hasAuthenticatedServiceRole } from '../config.js';
import type { AdminSession } from '../session-store.js';
import { captureNumericRequestContext, NUMERIC_RETRY_KEY_HEADER } from './numeric-request-context.js';
import type { RequestDeliveryResult } from './numeric-request-delivery.js';

type NumericRequest = NonNullable<ReturnType<typeof captureNumericRequestContext>>;
export type NumericRequestRunner = (request: NumericRequest) => Promise<RequestDeliveryResult>;

function equalToken(left: unknown, right: unknown): boolean {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function promptFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Object.getPrototypeOf(body) !== Object.prototype ||
      Reflect.ownKeys(body).length !== 1) return null;
  const prompt = Object.getOwnPropertyDescriptor(body, 'prompt');
  return prompt && 'value' in prompt && typeof prompt.value === 'string' ? prompt.value : null;
}

/** The caller must install the server session middleware before this router. */
export function createNumericAuthenticatedRouter(expectedOrigin: string, run: NumericRequestRunner): Router {
  if (!expectedOrigin || new URL(expectedOrigin).origin !== expectedOrigin) throw new Error('invalid_origin');
  const router = Router();
  router.post('/ask', async (req, res) => {
    const session: AdminSession | undefined = (req as Request).adminSession;
    if (!session?.principal || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= Date.now())
      return res.status(401).json({ status: 'authentication_required' });
    const roles = Object.getOwnPropertyDescriptor(session.principal, 'roles');
    const csrf = Object.getOwnPropertyDescriptor(session.principal, 'csrfToken');
    if (!roles || !('value' in roles) || !Array.isArray(roles.value) ||
        !csrf || !('value' in csrf) || typeof csrf.value !== 'string' ||
        !hasAuthenticatedServiceRole(roles.value))
      return res.status(403).json({ status: 'role_required' });
    if (req.get('origin') !== expectedOrigin || !equalToken(req.get('x-csrf-token'), csrf.value))
      return res.status(403).json({ status: 'request_origin_rejected' });
    let prompt: string | null;
    try { prompt = promptFromBody(req.body); }
    catch { prompt = null; }
    const context = captureNumericRequestContext(session.principal, req.get(NUMERIC_RETRY_KEY_HEADER), 'ask-reply', prompt);
    if (!context) return res.status(400).json({ status: 'invalid_request' });
    let result: RequestDeliveryResult;
    try { result = await run(context); }
    catch { return res.status(503).json({ status: 'delivery_uncertain' }); }
    if (result.status === 'invalid_request') return res.status(400).json({ status: result.status });
    if (result.status === 'identity_conflict') return res.status(409).json({ status: result.status });
    if (result.status === 'identity_uncertain') return res.status(503).json({ status: result.status });
    if (result.status === 'provider_error') return res.status(502).json({ status: result.status, requestId: result.requestId, deliveryId: result.deliveryId });
    if (result.status !== 'routed') return res.status(503).json({ status: 'delivery_uncertain' });
    const { outcome } = result;
    if (outcome.status === 'delivered') return res.status(200).json({ status: 'delivered', requestId: result.requestId, deliveryId: result.deliveryId });
    const status = outcome.status === 'duplicate_claim' || outcome.status === 'identity_conflict' ? 409 : 503;
    return res.status(status).json({ status: outcome.status, requestId: result.requestId, deliveryId: result.deliveryId });
  });
  return router;
}
