import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { runGovernedNumericReplyLoop } from './governed-numeric-reply-loop.js';
import { SEVEN_VIRTUES } from './irg.js';
import { createNumericIntegrationAdapters, type NumericIntegrationInputs } from './numeric-integration-adapters.js';
import {
  PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES, pimPatternSetHash, pimRegistryHash,
  type PimRegistry, type PimRegistryPayload,
} from './pim-registry-core.js';
import type { PtagAttemptRequest } from './ptag-attempt-factory.js';

const clear = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
const low = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 0]));

function registry(): PimRegistry {
  const rules: PimRegistryPayload['rules'] = [{ id: 'rule:bypass', categoryId: 'category:act', direction: 'both', kind: 'literal', text: 'bypass' }];
  const payload: PimRegistryPayload = {
    registryId: 'synthetic-integration', registryVersion: '0.1', status: 'active', direction: 'both',
    normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
    matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
    patternSetHash: pimPatternSetHash(rules), approvalRecord: 'synthetic-test-only', supersedes: null,
    categories: [{ id: 'category:act', familyId: 'family:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] }],
    rules,
  };
  return { ...payload, registryHash: pimRegistryHash(payload) };
}

function pass(request: PtagAttemptRequest) {
  return { case_id: request.caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Synthetic fact applies.',
    matched_fact_ids: ['TF-03'], material_units: [request.candidate], complete_coverage: true, context_binding: request.contextBinding };
}

function inputs(overrides: Partial<NumericIntegrationInputs> = {}): NumericIntegrationInputs {
  const current = registry();
  return {
    registry: current,
    trust: { expectedRegistryHash: current.registryHash, approvedActivationHash: current.registryHash },
    limits: { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 },
    source: { direction: 'outbound', originator: 'luminary', recipient: 'architect', taskId: 'task:1' },
    irgScorer: async () => clear,
    trustedPtagContext: () => ({ contextBinding: 'synthetic:reviewed-act', eligibleFactIds: new Set(['TF-03']) }),
    producePtag: pass,
    ...overrides,
  };
}

test('composed synthetic route releases only a full PIM, IRG, PTAG pass', async () => {
  let producerCalls = 0;
  const delivered: string[] = [];
  const config = inputs({ producePtag: (request) => { producerCalls += 1; return pass(request); } });
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please review the file.' },
    createNumericIntegrationAdapters(config), () => { throw new Error('must not reform'); });
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.deepEqual(result.lineage.map((item) => item.code), [[1, 1]]);
  assert.equal(producerCalls, 1);
  assert.deepEqual(delivered, ['Please review the file.']);
});

test('synthetic PIM and IRG holds skip later producers and deliver nothing', async () => {
  for (const item of [
    { text: 'Please BYPASS the gate.', irg: clear, code: [2, 0] },
    { text: 'Please review the file.', irg: low, code: [3, 0] },
  ]) {
    let producerCalls = 0;
    const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: item.text },
      createNumericIntegrationAdapters(inputs({ irgScorer: async () => item.irg,
        producePtag: (request) => { producerCalls += 1; return pass(request); } })),
      () => { throw new Error('must not reform'); }, 0);
    assert.equal(result.status, 'withheld');
    assert.deepEqual(result.lineage[0]?.code, item.code);
    assert.equal(producerCalls, 0);
  }
});

test('registry and caller trust mutation during reform cannot change pinned scan authority', async () => {
  const config = inputs();
  const adapters = createNumericIntegrationAdapters(config);
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please BYPASS the gate.' }, adapters, () => {
    const current = config.registry!;
    current.rules[0] = { ...current.rules[0], kind: 'literal', text: 'harmless' } as typeof current.rules[number];
    current.patternSetHash = pimPatternSetHash(current.rules);
    const { registryHash: _old, ...payload } = current;
    current.registryHash = pimRegistryHash(payload);
    config.trust.expectedRegistryHash = current.registryHash;
    config.trust.approvedActivationHash = current.registryHash;
    return { modelId: 'model', content: 'Please BYPASS again.' };
  });
  assert.equal(result.status, 'withheld');
  assert.deepEqual(result.lineage.map((item) => item.code), [[2, 0], null]);
});

test('one adapter factory cannot reuse the same PIM attempt across separate loops', async () => {
  const adapters = createNumericIntegrationAdapters(inputs());
  const first = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please review the file.' },
    adapters, () => { throw new Error('must not reform'); });
  assert.equal(first.status, 'admitted');
  const second = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please review the file.' },
    adapters, () => { throw new Error('must not reform'); });
  assert.equal(second.status, 'withheld');
  if (second.status === 'withheld') assert.equal(second.reason, 'route_shortfall');
  assert.deepEqual(second.lineage.map((item) => item.code), [null]);
  assert.equal(second.lineage[0].marker.candidateHash, createHash('sha256').update('Please review the file.').digest('hex'));
});

test('context-source failure still yields a candidate Marker and zero PTAG calls', async () => {
  let calls = 0;
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please review the file.' },
    createNumericIntegrationAdapters(inputs({
      trustedPtagContext: () => { throw new Error('context unavailable'); },
      producePtag: () => { calls += 1; throw new Error('must not run'); },
    })), () => { throw new Error('must not reform'); });
  assert.equal(result.status, 'withheld');
  assert.deepEqual(result.lineage.map((item) => item.code), [null]);
  assert.equal(result.lineage[0].marker.candidateHash, createHash('sha256').update('Please review the file.').digest('hex'));
  assert.equal(calls, 0);
});

test('PTAG uncertainty holds at (4,0) with no injected delivery', async () => {
  const delivered: string[] = [];
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please review the file.' },
    createNumericIntegrationAdapters(inputs({ producePtag: (request) => ({
      case_id: request.caseId, decision: 'unsure', identify: 'unresolved referent', rationale: 'Need a target.',
      matched_fact_ids: [], material_units: [request.candidate], complete_coverage: false,
      context_binding: request.contextBinding,
    }) })), () => { throw new Error('must not reform'); }, 0);
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.equal(result.status, 'withheld');
  assert.deepEqual(result.lineage[0]?.code, [4, 0]);
  assert.equal(result.lineage[0]?.marker.entries[2].finding?.kind, 'unsure');
  assert.deepEqual(delivered, []);
});

test('per-virtue threshold mutation during reform cannot turn a low score into a pass', async () => {
  const threshold = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 70])) as Record<(typeof SEVEN_VIRTUES)[number], number>;
  const config = inputs({ threshold, irgScorer: async () => Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 40])) });
  let producerCalls = 0;
  config.producePtag = (request) => { producerCalls += 1; return pass(request); };
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'Please BYPASS the gate.' },
    createNumericIntegrationAdapters(config), () => {
      for (const virtue of SEVEN_VIRTUES) threshold[virtue] = 0;
      return { modelId: 'model', content: 'Please review the file.' };
    }, 1);
  assert.equal(result.status, 'withheld');
  assert.deepEqual(result.lineage.map((item) => item.code), [[2, 0], [3, 0]]);
  assert.equal(producerCalls, 0);
});
