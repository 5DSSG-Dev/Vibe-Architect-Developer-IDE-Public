import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { requireDemoKey, createIpRateLimiter, DEMO_KEY_HEADER, type IpRateLimitOptions } from './luminary-access.js';

const openServers: Array<() => Promise<void>> = [];
after(async () => { for (const close of openServers) await close(); });

// A minimal app that applies the middleware under test, then answers 200 { ok: true }
// from a terminal handler, so a reached handler is distinguishable from a blocked one.
async function serve(middleware: express.RequestHandler) {
  const app = express();
  app.use('/g', middleware, (_req, res) => res.status(200).json({ ok: true }));
  const server: Server = createServer(app);
  const url = await new Promise<string>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/g`));
  });
  openServers.push(() => new Promise<void>((done) => server.close(() => done())));
  return url;
}

test('requireDemoKey fails closed with 503 when no key is configured', async () => {
  const url = await serve(requireDemoKey(undefined));
  const res = await fetch(url, { headers: { [DEMO_KEY_HEADER]: 'anything' } });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'luminary_not_configured');
});

test('requireDemoKey rejects a missing or wrong key with 401, and passes the exact key', async () => {
  const url = await serve(requireDemoKey('s3cret-demo-key'));
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { [DEMO_KEY_HEADER]: 'wrong' } })).status, 401);
  assert.equal((await fetch(url, { headers: { [DEMO_KEY_HEADER]: 's3cret-demo-ke' } })).status, 401); // off by one char
  const ok = await fetch(url, { headers: { [DEMO_KEY_HEADER]: 's3cret-demo-key' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true });
});

function limiter(opts: Partial<IpRateLimitOptions> & { now: () => number }) {
  return createIpRateLimiter({ windowMs: 1_000, limit: 2, ...opts });
}

test('createIpRateLimiter allows up to the limit, then 429s with a Retry-After', async () => {
  let clock = 0;
  const url = await serve(limiter({ now: () => clock }));
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(url)).status, 200);
  const limited = await fetch(url);
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, 'luminary_rate_limited');
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('the window resets once it elapses', async () => {
  let clock = 0;
  const url = await serve(limiter({ now: () => clock }));
  await fetch(url); await fetch(url);
  assert.equal((await fetch(url)).status, 429);
  clock = 1_000; // window elapsed
  assert.equal((await fetch(url)).status, 200);
});

test('a full tracker sheds a new IP with 503 rather than growing unbounded', async () => {
  // keyLimit 0 means any first-seen IP is at capacity immediately.
  const url = await serve(createIpRateLimiter({ windowMs: 1_000, limit: 2, keyLimit: 0, now: () => 0 }));
  const res = await fetch(url);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'luminary_rate_limiter_capacity_reached');
});
