import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import type { ViteDevServer } from 'vite';
import { createGateway, sessionCookieName } from './app.js';
import type { GatewayConfig } from './config.js';
import { InMemorySessionStore } from './session-store.js';
import type { AuthenticatedNumericDeliveryInputs } from './luminary-pipeline/numeric-authenticated-delivery.js';

const config: GatewayConfig = {
  nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1:3000', sessionTtlMs: 60_000,
  cookieSecure: false, trustProxy: false,
};
const vite = { middlewares: express.Router() } as unknown as ViteDevServer;
const entra = {
  configured: false,
  createAuthorizationUrl: async () => { throw new Error('not configured'); },
  completeAuthorization: async () => { throw new Error('not configured'); },
};

test('experimental numeric route is withheld before identity/model until its aggregate boundary is integrated', async () => {
  const sessions = new InMemorySessionStore();
  const state = { identity: 0, model: 0 };
  const numericRoute: AuthenticatedNumericDeliveryInputs = {
    identities: { issue: async () => { state.identity++; return { status: 'conflict', requestId: null }; } },
    model: () => { state.model++; throw new Error('must not run'); },
    integrationForRequest: () => { throw new Error('must not run'); },
    reform: () => { throw new Error('must not run'); },
    claims: { claimOnce: async () => { throw new Error('must not run'); } },
    receiver: () => { throw new Error('must not run'); },
  };
  const disabled = await createGateway({ config, sessions, entra, vite });
  const disabledServer = disabled.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => disabledServer.once('listening', resolve));
  try {
    const address = disabledServer.address();
    assert(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/luminary/numeric/ask`, { method: 'POST' });
    assert.notEqual(response.status, 409);
    assert.equal(state.identity, 0);
  } finally { await new Promise<void>(resolve => disabledServer.close(() => resolve())); }

  const session = await sessions.create(60_000);
  session.principal = { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' };
  await sessions.set(session);
  const app = await createGateway({ config, sessions, entra, vite, numericRoute });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/luminary/numeric/ask`;
  const send = (cookie?: string) => fetch(base, {
    method: 'POST', headers: {
      'content-type': 'application/json', origin: config.origin, 'x-csrf-token': 'csrf',
      'idempotency-key': randomUUID(), ...(cookie ? { cookie } : {}),
    }, body: JSON.stringify({ prompt: 'Build app' }),
  });
  try {
    assert.equal((await send()).status, 503);
    assert.equal(state.identity, 0);
    assert.equal((await send(`${sessionCookieName(config)}=${session.id}`)).status, 503);
    assert.deepEqual(state, { identity: 0, model: 0 });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('withheld numeric route does not consult session store or invoke any effect source', async () => {
  const sessions = new InMemorySessionStore();
  const session = await sessions.create(60_000);
  let lookups = 0;
  const failingSessions = new Proxy(sessions, {
    get(target, property, receiver) {
      if (property === 'get') return async () => { lookups++; throw new Error('store unavailable'); };
      return Reflect.get(target, property, receiver);
    },
  });
  let effects = 0;
  const numericRoute: AuthenticatedNumericDeliveryInputs = {
    identities: { issue: async () => { effects++; throw new Error('identity must not run'); } },
    model: () => { effects++; throw new Error('model must not run'); },
    integrationForRequest: () => { effects++; throw new Error('integration must not run'); },
    reform: () => { effects++; throw new Error('reform must not run'); },
    claims: { claimOnce: async () => { effects++; throw new Error('claim must not run'); } },
    receiver: () => { effects++; throw new Error('receiver must not run'); },
  };
  const app = await createGateway({ config, sessions: failingSessions, entra, vite, numericRoute });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address();
    assert(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/luminary/numeric/ask`, {
      method: 'POST',
      headers: { cookie: `${sessionCookieName(config)}=${session.id}` },
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'governance_unavailable' });
    assert.equal(lookups, 0);
    assert.equal(effects, 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
