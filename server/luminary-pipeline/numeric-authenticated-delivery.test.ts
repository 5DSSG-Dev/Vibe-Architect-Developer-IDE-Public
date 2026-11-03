import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import type { AdminSession } from '../session-store.js';
import { createNumericAuthenticatedDeliveryRouter, type AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';

const origin = 'http://127.0.0.1:3000';
const key = randomUUID();
const session: AdminSession = {
  id: 'verified-session', createdAt: Date.now(), expiresAt: Date.now() + 60_000,
  principal: { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' },
};

async function serve(inputs: AuthenticatedNumericDeliveryInputs, authenticated = true) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (authenticated) req.adminSession = session; next(); });
  app.use('/numeric', createNumericAuthenticatedDeliveryRouter(origin, inputs));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    send: (prompt: string, retryKey = key) => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-csrf-token': 'csrf', 'idempotency-key': retryKey },
      body: JSON.stringify({ prompt }),
    }),
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('authentication and identity conflict stop before model, gates, claim and receiver', async () => {
  const calls = { issue: 0, model: 0, integration: 0, claim: 0, receiver: 0 };
  const inputs: AuthenticatedNumericDeliveryInputs = {
    identities: { issue: async (scope, clientKey, purpose, hash) => {
      calls.issue++;
      assert.match(scope, /^principal:[0-9a-f]{64}$/);
      assert.equal(clientKey, `retry:${key}`);
      assert.equal(purpose, 'ask-reply');
      assert.match(hash, /^[0-9a-f]{64}$/);
      return { status: 'conflict', requestId: null };
    } },
    model: () => { calls.model++; throw new Error('must not run'); },
    integrationForRequest: () => { calls.integration++; throw new Error('must not run'); },
    reform: () => { throw new Error('must not run'); },
    claims: { claimOnce: async () => { calls.claim++; return 'claimed'; } },
    receiver: () => { calls.receiver++; },
  };
  const unauthenticated = await serve(inputs, false);
  try { assert.equal((await unauthenticated.send('Build app')).status, 401); }
  finally { await unauthenticated.close(); }
  assert.deepEqual(calls, { issue: 0, model: 0, integration: 0, claim: 0, receiver: 0 });
  const authenticated = await serve(inputs);
  try { assert.equal((await authenticated.send('Build app')).status, 409); }
  finally { await authenticated.close(); }
  assert.deepEqual(calls, { issue: 1, model: 0, integration: 0, claim: 0, receiver: 0 });
});

test('issued identity reaches model and PIM hold without claim or receiver', async () => {
  const calls: string[] = [];
  const inputs: AuthenticatedNumericDeliveryInputs = {
    identities: { issue: async () => { calls.push('identity'); return { status: 'issued', requestId: `request:${randomUUID()}` }; } },
    model: () => { calls.push('model'); return { modelId: 'synthetic', content: 'candidate' }; },
    integrationForRequest: request => {
      calls.push('integration');
      assert.equal(request.prompt, 'Build app');
      return {
        registry: null,
        trust: { expectedRegistryHash: '0'.repeat(64), approvedActivationHash: '0'.repeat(64) },
        limits: { maxCandidateBytes: 1024, maxRules: 10, maxMatches: 10, maxStaticWorkUnits: 1000 },
        source: { direction: 'inbound', originator: 'architect', recipient: 'luminary', taskId: 'synthetic' },
        irgScorer: () => { throw new Error('IRG must not run after PIM hold'); },
        trustedPtagContext: () => { throw new Error('PTAG must not run after PIM hold'); },
        producePtag: () => { throw new Error('PTAG must not run after PIM hold'); },
      };
    },
    reform: () => { calls.push('reform'); return { modelId: 'synthetic', content: 'revised' }; },
    claims: { claimOnce: async () => { calls.push('claim'); return 'claimed'; } },
    receiver: () => { calls.push('receiver'); },
    maxReforms: 0,
  };
  const f = await serve(inputs);
  try { assert.equal((await f.send('Build app')).status, 503); }
  finally { await f.close(); }
  assert.deepEqual(calls, ['identity', 'model', 'integration']);
});
