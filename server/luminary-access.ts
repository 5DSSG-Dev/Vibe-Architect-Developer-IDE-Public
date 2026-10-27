// Reviewer-facing access control for the Luminary reply endpoint (M1.a, P14).
// The endpoint must be reachable by a hackathon reviewer — so it cannot sit behind the
// Entra admin gate — yet it must not become an open, credit-burning faucet once a real
// model is wired (M1.b). Two cheap, honest guards satisfy both: a shared demo key the
// reviewer is given, and a per-IP rate limit mirroring the gateway's login limiter.
//
// Fail-closed by construction: if no demo key is configured, the endpoint rejects every
// request (503) rather than defaulting open.

import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Header the reviewer sends the shared demo key in. */
export const DEMO_KEY_HEADER = 'x-luminary-demo-key';

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal lengths; unequal length is a definite mismatch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Require the shared demo key. With no key configured the endpoint is not open — it
 * answers 503 luminary_not_configured, so a missing/empty env var can never expose it.
 */
export function requireDemoKey(expectedKey: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedKey) {
      res.status(503).json({ error: 'luminary_not_configured' });
      return;
    }
    const provided = req.header(DEMO_KEY_HEADER);
    if (!provided || !keysMatch(provided, expectedKey)) {
      res.status(401).json({ error: 'demo_key_required' });
      return;
    }
    next();
  };
}

export interface IpRateLimitOptions {
  /** Rolling window length in ms. */
  windowMs: number;
  /** Max requests allowed per IP within a window. */
  limit: number;
  /** Max distinct IPs tracked at once; at capacity a new IP is shed with 503. */
  keyLimit?: number;
  /** Clock seam for tests. */
  now?: () => number;
}

interface RateWindow {
  startedAt: number;
  attempts: number;
}

/**
 * Per-IP fixed-window rate limiter, mirroring the gateway's login limiter (server/app.ts)
 * so the Luminary endpoint throttles abuse the same proven way. Over the cap → 429 with a
 * Retry-After; tracker at capacity → 503 (fail-closed rather than unbounded memory growth).
 */
export function createIpRateLimiter(options: IpRateLimitOptions) {
  const { windowMs, limit } = options;
  const keyLimit = options.keyLimit ?? 10_000;
  const now = options.now ?? Date.now;
  const windows = new Map<string, RateWindow>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const current = now();
    for (const [address, window] of windows) {
      if (current - window.startedAt >= windowMs) windows.delete(address);
    }
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const existing = windows.get(key);
    if (!existing || current - existing.startedAt >= windowMs) {
      if (!existing && windows.size >= keyLimit) {
        res.status(503).json({ error: 'luminary_rate_limiter_capacity_reached' });
        return;
      }
      windows.set(key, { startedAt: current, attempts: 1 });
      next();
      return;
    }
    existing.attempts += 1;
    if (existing.attempts > limit) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((existing.startedAt + windowMs - current) / 1_000)));
      res.status(429).json({ error: 'luminary_rate_limited' });
      return;
    }
    next();
  };
}
