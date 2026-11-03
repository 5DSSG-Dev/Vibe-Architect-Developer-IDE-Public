/** Unmounted HTTP fault paths: identify which effects occurred before each hold. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import type { AdminSession } from '../session-store.js';
import { createNumericAuthenticatedDeliveryRouter, type AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';
import { SEVEN_VIRTUES } from './irg.js';
import { PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES, pimPatternSetHash, pimRegistryHash,
  type PimRegistryPayload } from './pim-registry-core.js';
import type { PtagAttemptRequest } from './ptag-attempt-factory.js';

const origin = 'http://127.0.0.1:3000';
const session: AdminSession = {
  id: 'synthetic', createdAt: Date.now(), expiresAt: Date.now() + 60_000,
  principal: { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' },
};
const rules: PimRegistryPayload['rules'] = [
  { id: 'rule:bypass', categoryId: 'category:act', direction: 'both', kind: 'literal', text: 'bypass' },
];
const payload: PimRegistryPayload = {
  registryId: 'synthetic-faults', registryVersion: '0.1', status: 'active', direction: 'both',
  normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
  matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
  patternSetHash: pimPatternSetHash(rules), approvalRecord: 'synthetic-test-only', supersedes: null,
  categories: [{ id: 'category:act', familyId: 'family:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] }],
  rules,
};
const registry = { ...payload, registryHash: pimRegistryHash(payload) };
const integrationForRequest: AuthenticatedNumericDeliveryInputs['integrationForRequest'] = () => ({
  registry,
  trust: { expectedRegistryHash: registry.registryHash, approvedActivationHash: registry.registryHash },
  limits: { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 },
  source: { direction: 'outbound', originator: 'luminary', recipient: 'architect', taskId: 'synthetic:task' },
  irgScorer: async () => Object.fromEntries(SEVEN_VIRTUES.map(virtue => [virtue, 90])),
  trustedPtagContext: () => ({ contextBinding: 'synthetic:reviewed', eligibleFactIds: new Set(['TF-03']) }),
  producePtag: (request: PtagAttemptRequest) => ({
    case_id: request.caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Synthetic eligible fact.',
    matched_fact_ids: ['TF-03'], material_units: [request.candidate], complete_coverage: true,
    context_binding: request.contextBinding,
  }),
});

async function serve(inputs: AuthenticatedNumericDeliveryInputs) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.adminSession = session; next(); });
  app.use('/numeric', createNumericAuthenticatedDeliveryRouter(origin, inputs));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const retryKey = randomUUID();
  return {
    send: () => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin,
        'x-csrf-token': 'csrf', 'idempotency-key': retryKey },
      body: JSON.stringify({ prompt: 'Build app' }),
    }),
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test('identity uncertainty and provider failure stop at their own boundary', async () => {
  for (const mode of ['identity_uncertain', 'provider_error'] as const) {
    let modelCalls = 0;
    let claimCalls = 0;
    const f = await serve({
      identities: { issue: async () => mode === 'identity_uncertain'
        ? { status: 'uncertain', requestId: null } : { status: 'issued', requestId: `request:${randomUUID()}` } },
      model: () => { modelCalls++; throw new Error('model unavailable'); },
      integrationForRequest,
      reform: () => { throw new Error('no reform'); },
      claims: { claimOnce: async () => { claimCalls++; return 'claimed'; } },
      receiver: () => { throw new Error('must not run'); },
      maxReforms: 0,
    });
    try {
      const response = await f.send();
      assert.equal(response.status, mode === 'identity_uncertain' ? 503 : 502);
      assert.equal((await response.json() as { status: string }).status, mode);
      assert.equal(modelCalls, mode === 'identity_uncertain' ? 0 : 1);
      assert.equal(claimCalls, 0);
    } finally { await f.close(); }
  }
});

test('claim uncertainty prevents receiver; receiver uncertainty consumes claim and suppresses retry', async () => {
  for (const mode of ['claim_uncertain', 'receiver_uncertain'] as const) {
    let claims = 0;
    let effects = 0;
    const f = await serve({
      identities: { issue: async () => ({ status: 'existing', requestId: 'request:6bed5fe0-c326-40dd-b04d-123302faee96' }) },
      model: () => ({ modelId: 'synthetic', content: 'Please review the file.' }),
      integrationForRequest,
      reform: () => { throw new Error('no reform'); },
      claims: { claimOnce: async () => { claims++; return mode === 'claim_uncertain' ? 'uncertain' : claims === 1 ? 'claimed' : 'duplicate'; } },
      receiver: () => { effects++; throw new Error('ack lost after possible effect'); },
      maxReforms: 0,
    });
    try {
      const first = await f.send();
      assert.equal(first.status, 503);
      assert.equal((await first.json() as { status: string }).status,
        mode === 'claim_uncertain' ? 'claim_uncertain' : 'delivery_uncertain');
      assert.equal(effects, mode === 'claim_uncertain' ? 0 : 1);
      if (mode === 'receiver_uncertain') {
        const retry = await f.send();
        assert.equal(retry.status, 409);
        assert.equal((await retry.json() as { status: string }).status, 'duplicate_claim');
        assert.equal(effects, 1);
      }
    } finally { await f.close(); }
  }
});
