import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examineWithCurrentGates } from './marker-adapters.js';
import { PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES, pimPatternSetHash, pimRegistryHash, type PimRegistryPayload } from './pim-registry-core.js';
import { registryPimCheck } from './pim-registry-adapter.js';
import { SEVEN_VIRTUES } from './irg.js';

const rules = [{ id: 'r:bypass', categoryId: 'c:act', direction: 'both' as const, kind: 'literal' as const, text: 'bypass the gate' }];
const payload: PimRegistryPayload = {
  registryId: 'synthetic-test', registryVersion: '0.1', status: 'active', direction: 'both',
  normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
  matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
  patternSetHash: pimPatternSetHash(rules), approvalRecord: 'synthetic-test-only', supersedes: null,
  categories: [{ id: 'c:act', familyId: 'f:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] }], rules,
};
const registry = { ...payload, registryHash: pimRegistryHash(payload) };
const config = {
  registry, trust: { expectedRegistryHash: registry.registryHash, approvedActivationHash: registry.registryHash },
  limits: { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 },
  sourceMessageId: 'message:1', direction: 'inbound' as const, originator: 'architect', recipient: 'luminary', taskId: 'task:1', attemptId: 'attempt:1',
};
const readings = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));

test('synthetic registry PIM finding returns (2,0) without invoking later gates', async () => {
  let calls = 0;
  const route = await examineWithCurrentGates('Please BYPASS the Gate now.', {
    pim: registryPimCheck(config), irgScorer: async () => { calls++; return readings; }, ptag: () => { calls++; return { decision: 'yes' }; },
  });
  assert.deepEqual(route.code, [2, 0]);
  assert.equal(calls, 0);
  assert.match(route.marker.entries[0].finding?.evidence ?? '', /BYPASS the Gate/);
});

test('unapproved registry fails closed without a synthetic clearance', async () => {
  let calls = 0;
  const route = await examineWithCurrentGates('Please review the file.', {
    pim: registryPimCheck({ ...config, trust: { ...config.trust, approvedActivationHash: '0'.repeat(64) } }),
    irgScorer: async () => { calls++; return readings; }, ptag: () => { calls++; return { decision: 'yes' }; },
  });
  assert.equal(route.destination, 'shortfall');
  assert.match(route.error ?? '', /registry_unapproved/);
  assert.equal(calls, 0);
});

test('oversized candidate stops before digesting or visiting later gates', async () => {
  let calls = 0;
  const route = await examineWithCurrentGates('a'.repeat(65_537), {
    pim: registryPimCheck(config), irgScorer: async () => { calls++; return readings; }, ptag: () => { calls++; return { decision: 'yes' }; },
  });
  assert.equal(route.destination, 'shortfall');
  assert.match(route.error ?? '', /candidate_over_budget/);
  assert.equal(calls, 0);
});
