import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { InMemorySessionStore, type SessionStore } from '../session-store.js';
import { createNumericSessionRouter } from './numeric-session-router.js';
import type { AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';

const origin = 'http://127.0.0.1:3000';
const retryKey = '4e304dfe-96ef-47ed-8d44-2edc9e84a89c';
const cookieName = 'aegis_admin_session';

function inputs(counter: { identities: number; model: number }): AuthenticatedNumericDeliveryInputs {
  return {
    identities: { issue: async () => { counter.identities++; return { status: 'conflict', requestId: null }; } },
    model: () => { counter.model++; throw new Error('must not run'); },
    integrationForRequest: () => { throw new Error('must not run'); },
    reform: () => { throw new Error('must not run'); },
    claims: { claimOnce: async () => { throw new Error('must not run'); } },
    receiver: () => { throw new Error('must not run'); },
  };
}

async function serve(sessions: SessionStore, dependencies: AuthenticatedNumericDeliveryInputs) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.adminSession = {
    id: 'forged', createdAt: 0, expiresAt: Date.now() + 60_000,
    principal: { subject: 'forged', tenantId: 'forged', roles: ['service.operations.read'], csrfToken: 'csrf' },
  }; next(); });
  app.use('/numeric', createNumericSessionRouter(origin, cookieName, sessions, dependencies));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    send: (cookie?: string) => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: {
        'content-type': 'application/json', origin, 'x-csrf-token': 'csrf', 'idempotency-key': retryKey,
        ...(cookie === undefined ? {} : { cookie }),
      }, body: JSON.stringify({ prompt: 'Build app' }),
    }),
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('only a session resolved by the store reaches numeric request identity', async () => {
  const sessions = new InMemorySessionStore();
  const session = await sessions.create(60_000);
  session.principal = { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' };
  await sessions.set(session);
  const counter = { identities: 0, model: 0 };
  const f = await serve(sessions, inputs(counter));
  try {
    assert.equal((await f.send()).status, 401);
    assert.equal((await f.send(`${cookieName}=forged`)).status, 401);
    assert.equal((await f.send(`${cookieName}=${session.id}; ${cookieName}=${session.id}`)).status, 401);
    assert.equal(counter.identities, 0);
    assert.equal((await f.send(`${cookieName}=${session.id}`)).status, 409);
    assert.deepEqual(counter, { identities: 1, model: 0 });
    await sessions.delete(session.id);
    assert.equal((await f.send(`${cookieName}=${session.id}`)).status, 401);
    assert.deepEqual(counter, { identities: 1, model: 0 });
  } finally { await f.close(); }
});

test('session store uncertainty stops without identity or model work', async () => {
  const counter = { identities: 0, model: 0 };
  const sessions: SessionStore = {
    shared: true,
    create: async () => { throw new Error('unavailable'); },
    get: async () => { throw new Error('unavailable'); },
    set: async () => { throw new Error('unavailable'); },
    delete: async () => {},
    rotate: async () => { throw new Error('unavailable'); },
  };
  const f = await serve(sessions, inputs(counter));
  try {
    assert.equal((await f.send(`${cookieName}=${'A'.repeat(43)}`)).status, 503);
    assert.deepEqual(counter, { identities: 0, model: 0 });
  } finally { await f.close(); }
});
