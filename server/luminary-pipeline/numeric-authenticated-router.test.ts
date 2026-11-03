import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import type { AdminSession } from '../session-store.js';
import { createNumericAuthenticatedRouter, type NumericRequestRunner } from './numeric-authenticated-router.js';

const origin = 'http://127.0.0.1:3000';
const retryKey = '4e304dfe-96ef-47ed-8d44-2edc9e84a89c';
const session = (): AdminSession => ({
  id: 'session', createdAt: Date.now(), expiresAt: Date.now() + 60_000,
  principal: { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' },
});

async function fixture(run: NumericRequestRunner, current: AdminSession | undefined) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.adminSession = current; next(); });
  app.use('/numeric', createNumericAuthenticatedRouter(origin, run));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    send: (body: unknown, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-csrf-token': 'csrf', 'idempotency-key': retryKey, ...headers },
      body: JSON.stringify(body),
    }),
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('valid session context reaches orchestration without client-supplied principal', async () => {
  let calls = 0;
  const f = await fixture(async request => {
    calls++;
    assert.equal(request.prompt, 'Build an app');
    assert.equal(request.purpose, 'ask-reply');
    assert.match(request.scope, /^principal:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(request), true);
    return { status: 'identity_conflict', requestId: null, deliveryId: null };
  }, session());
  try {
    const response = await f.send({ prompt: 'Build an app' });
    assert.equal(response.status, 409);
    assert.equal(calls, 1);
  } finally { await f.close(); }
});

test('session, role, origin, CSRF and request shape failures stop before orchestration', async () => {
  let calls = 0;
  const run: NumericRequestRunner = async () => { calls++; return { status: 'identity_uncertain', requestId: null, deliveryId: null }; };
  const cases: Array<[AdminSession | undefined, unknown, Record<string, string>, number]> = [
    [undefined, { prompt: 'Hi' }, {}, 401],
    [{ ...session(), expiresAt: Date.now() - 1 }, { prompt: 'Hi' }, {}, 401],
    [{ ...session(), principal: { ...session().principal!, roles: [] } }, { prompt: 'Hi' }, {}, 403],
    [session(), { prompt: 'Hi' }, { origin: 'http://evil.example' }, 403],
    [session(), { prompt: 'Hi' }, { 'x-csrf-token': 'wrong' }, 403],
    [session(), { prompt: 'Hi' }, { 'idempotency-key': 'wrong' }, 400],
    [session(), { prompt: 'Hi', principal: { subject: 'forged' } }, {}, 400],
  ];
  for (const [current, body, headers, status] of cases) {
    const f = await fixture(run, current);
    try { assert.equal((await f.send(body, headers)).status, status); }
    finally { await f.close(); }
  }
  assert.equal(calls, 0);
});
