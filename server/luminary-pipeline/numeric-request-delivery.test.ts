import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { SEVEN_VIRTUES } from './irg.js';
import { runNumericRequestDelivery, type RequestIdentities } from './numeric-request-delivery.js';
import type { AtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const request = () => ({ scope: 'architect:1', clientKey: 'retry:1', purpose: 'task-proposal' as const, prompt: 'Build a useful app' });
const clear = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
const noReform = () => { throw new Error('no reform'); };

function adapters(reply: { content: string }, attempt: number, hold = false) {
  const candidateHash = createHash('sha256').update(reply.content).digest('hex');
  const contextBinding = 'synthetic:approved';
  const attemptId = `attempt:${randomUUID()}:${attempt}`;
  const caseId = derivePtagCaseId(candidateHash, contextBinding, attemptId);
  return {
    pim: () => hold ? { result: 0, finding: { kind: 'incoherence' as const, reason: 'synthetic hold' } } : { result: 1 },
    irgScorer: async () => clear,
    ptag: validatedPtagCheck({ candidateHash, contextBinding, attemptId, caseId, eligibleFactIds: new Set(['TF-03']) }, () => ({
      case_id: caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Synthetic eligible fact.',
      matched_fact_ids: ['TF-03'], material_units: [reply.content], complete_coverage: true, context_binding: contextBinding,
    })),
  };
}

function stores() {
  const requestIds = new Map<string, { hash: string; id: string }>();
  const identities: RequestIdentities = { issue: async (scope, clientKey, purpose, hash) => {
    const key = JSON.stringify([scope, clientKey, purpose]);
    const prior = requestIds.get(key);
    if (prior) return prior.hash === hash
      ? { status: 'existing', requestId: prior.id } : { status: 'conflict', requestId: null };
    const id = `request:${randomUUID()}`;
    requestIds.set(key, { hash, id });
    return { status: 'issued', requestId: id };
  } };
  const claimed = new Map<string, string>();
  const claims: AtomicDeliveryClaims = { claimOnce: async (id, hash) => {
    const prior = claimed.get(id);
    if (prior) return prior === hash ? 'duplicate' : 'conflict';
    claimed.set(id, hash);
    return 'claimed';
  } };
  return { identities, claims, requestIds, claimed };
}

test('request identity precedes provider and holds with no delivery on conflict or uncertainty', async () => {
  const { identities, claims } = stores();
  let provider = 0;
  let receiver = 0;
  const model = () => { provider += 1; return { modelId: 'model', content: 'Please review the file.' }; };
  const deliver = () => { receiver += 1; };
  const run = (input: ReturnType<typeof request>, issuer = identities) => runNumericRequestDelivery(input,
    issuer, model, adapters, noReform, claims, deliver, 0);
  assert.equal((await run(request())).status, 'routed');
  assert.equal(provider, 1);
  assert.equal(receiver, 1);
  assert.equal((await run({ ...request(), prompt: 'Changed task' })).status, 'identity_conflict');
  assert.equal(provider, 1);
  assert.equal((await run(request(), { issue: async () => { throw new Error('Redis unavailable'); } })).status, 'identity_uncertain');
  assert.equal(provider, 1);
  const retry = await run(request());
  assert.equal(retry.status, 'routed');
  if (retry.status === 'routed') assert.equal(retry.outcome.status, 'duplicate_claim');
  assert.equal(receiver, 1);
});

test('held numeric candidate receives no claim or receiver effect', async () => {
  const { identities, claims, claimed } = stores();
  let receiver = 0;
  const result = await runNumericRequestDelivery(request(), identities,
    () => ({ modelId: 'model', content: 'held' }), (reply, attempt) => adapters(reply, attempt, true),
    noReform, claims, () => { receiver += 1; }, 0);
  assert.equal(result.status, 'routed');
  if (result.status === 'routed') assert.equal(result.outcome.status, 'withheld');
  assert.equal(claimed.size, 0);
  assert.equal(receiver, 0);
});

test('provider failure preserves the issued identity and creates no delivery claim', async () => {
  const { identities, claims, claimed } = stores();
  const result = await runNumericRequestDelivery(request(), identities,
    () => { throw new Error('provider unavailable'); }, adapters, noReform, claims,
    () => { throw new Error('receiver must not run'); }, 0);
  assert.equal(result.status, 'provider_error');
  if (result.status === 'provider_error') {
    assert.match(result.requestId, /^request:/);
    assert.match(result.deliveryId, /^delivery:/);
  }
  assert.equal(claimed.size, 0);
});

test('request accessors and mutation during identity lookup cannot change provider input or purpose', async () => {
  const { claims } = stores();
  let providerPrompt = '';
  const raw = request();
  const identities: RequestIdentities = { issue: async () => {
    raw.prompt = 'Changed after capture';
    raw.purpose = 'ask-reply' as typeof raw.purpose;
    return { status: 'issued', requestId: `request:${randomUUID()}` };
  } };
  const result = await runNumericRequestDelivery(raw, identities,
    (prompt) => { providerPrompt = prompt; return { modelId: 'model', content: 'Please review the file.' }; },
    adapters, noReform, claims, () => {}, 0);
  assert.equal(providerPrompt, 'Build a useful app');
  assert.equal(result.status, 'routed');
  const accessor = Object.defineProperty({}, 'prompt', { get: () => 'hidden', enumerable: true });
  assert.equal((await runNumericRequestDelivery(accessor as ReturnType<typeof request>, identities,
    () => { throw new Error('provider must not run'); }, adapters, noReform, claims, () => {}, 0)).status, 'invalid_request');
});
