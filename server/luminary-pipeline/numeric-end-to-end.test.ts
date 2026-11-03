/** Unmounted synthetic route-to-receipt composition. No mounted provider or executor effects. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { SEVEN_VIRTUES } from './irg.js';
import { runClaimedNumericDelivery, type AtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { reconcileNumericDelivery } from './numeric-delivery-reconciliation.js';
import { createNumericIntegrationAdapters, type NumericIntegrationInputs } from './numeric-integration-adapters.js';
import { PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES, pimPatternSetHash, pimRegistryHash,
  type PimRegistry, type PimRegistryPayload } from './pim-registry-core.js';
import type { PtagAttemptRequest } from './ptag-attempt-factory.js';
import { bindNumericReceiverAcceptance } from './numeric-receiver-boundary.js';
import type { ReceiptWriteOutcome } from './numeric-receiver-receipt.js';

function registry(): PimRegistry {
  const rules: PimRegistryPayload['rules'] = [{ id: 'rule:bypass', categoryId: 'category:act', direction: 'both', kind: 'literal', text: 'bypass' }];
  const payload: PimRegistryPayload = {
    registryId: 'synthetic-end-to-end', registryVersion: '0.1', status: 'active', direction: 'both',
    normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
    matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
    patternSetHash: pimPatternSetHash(rules), approvalRecord: 'synthetic-test-only', supersedes: null,
    categories: [{ id: 'category:act', familyId: 'family:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] }],
    rules,
  };
  return { ...payload, registryHash: pimRegistryHash(payload) };
}

function inputs(): NumericIntegrationInputs {
  const current = registry();
  return {
    registry: current,
    trust: { expectedRegistryHash: current.registryHash, approvedActivationHash: current.registryHash },
    limits: { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 },
    source: { direction: 'outbound', originator: 'luminary', recipient: 'architect', taskId: 'synthetic:task' },
    irgScorer: async () => Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90])),
    trustedPtagContext: () => ({ contextBinding: 'synthetic:reviewed', eligibleFactIds: new Set(['TF-03']) }),
    producePtag: (request: PtagAttemptRequest) => ({
      case_id: request.caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Synthetic eligible fact.',
      matched_fact_ids: ['TF-03'], material_units: [request.candidate], complete_coverage: true,
      context_binding: request.contextBinding,
    }),
  };
}

class Claims implements AtomicDeliveryClaims {
  readonly values = new Map<string, string>();
  async claimOnce(id: string, hash: string) {
    const prior = this.values.get(id);
    if (prior) return prior === hash ? 'duplicate' as const : 'conflict' as const;
    this.values.set(id, hash);
    return 'claimed' as const;
  }
}

test('PIM hold has zero effects; full pass produces one claim, acceptance, and receipt', async () => {
  const claims = new Claims();
  const receipts = new Map<string, string>();
  const effects: string[] = [];
  const receiver = bindNumericReceiverAcceptance({ accept: (reply, id) => {
    effects.push(reply.content);
    return { status: 'accepted', deliveryId: id,
      candidateHash: createHash('sha256').update(reply.content).digest('hex') };
  } }, { recordAccepted: async (id, hash): Promise<ReceiptWriteOutcome> => {
    receipts.set(id, hash);
    return 'recorded';
  } });
  const run = (content: string) => runClaimedNumericDelivery({ modelId: 'model', content },
    createNumericIntegrationAdapters(inputs()), () => { throw new Error('no reform'); },
    'delivery:end-to-end', claims, receiver, 0);

  const held = await run('Please BYPASS the gate.');
  assert.equal(held.status, 'withheld');
  assert.deepEqual(held.route.lineage.map((item) => item.code), [[2, 0]]);
  assert.equal(claims.values.size, 0);
  assert.equal(receipts.size, 0);
  assert.equal(effects.length, 0);

  const first = await run('Please review the file.');
  assert.equal(first.status, 'delivered');
  assert.deepEqual(first.route.lineage.map((item) => item.code), [[1, 1]]);
  assert.equal((await run('Please review the file.')).status, 'duplicate_claim');
  assert.equal((await run('Please review another file.')).status, 'identity_conflict');
  assert.deepEqual(effects, ['Please review the file.']);
  assert.equal(receipts.size, 1);

  const hash = createHash('sha256').update('Please review the file.').digest('hex');
  const reconciled = await reconcileNumericDelivery('delivery:end-to-end', hash, {
    readClaim: async (id, candidateHash) => claims.values.get(id) === candidateHash ? 'matching' : 'conflicting',
    readReceiver: async (id, candidateHash) => receipts.get(id) === candidateHash ? 'delivered' : 'absent',
  });
  assert.equal(reconciled.status, 'delivered');
});

test('acceptance error after a possible effect leaves the claim consumed and no receipt', async () => {
  const claims = new Claims();
  let effects = 0;
  let receipts = 0;
  const receiver = bindNumericReceiverAcceptance({ accept: () => {
    effects += 1;
    throw new Error('response lost after possible acceptance');
  } }, { recordAccepted: async () => { receipts += 1; return 'recorded'; } });
  const run = () => runClaimedNumericDelivery({ modelId: 'model', content: 'Please review the file.' },
    createNumericIntegrationAdapters(inputs()), () => { throw new Error('no reform'); },
    'delivery:uncertain-end-to-end', claims, receiver, 0);
  assert.equal((await run()).status, 'delivery_uncertain');
  assert.equal((await run()).status, 'duplicate_claim');
  assert.equal(effects, 1);
  assert.equal(receipts, 0);
});
