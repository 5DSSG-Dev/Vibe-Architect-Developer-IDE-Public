import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examineWithCurrentGates } from './marker-adapters.js';
import { SEVEN_VIRTUES } from './irg.js';
import { createHash } from 'node:crypto';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const score = (value: number) => Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, value]));
function checked(candidate: string, decision: 'pass' | 'boundary' | 'unsure') {
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const contextBinding = 'test:context';
  const context = { caseId: derivePtagCaseId(candidateHash, contextBinding, 'attempt-1'), attemptId: 'attempt-1', candidateHash, contextBinding, eligibleFactIds: new Set(['TF-03']) };
  const output = { case_id: context.caseId, decision, identify: 'test act', rationale: 'test reason', matched_fact_ids: decision === 'unsure' ? [] : ['TF-03'], material_units: [candidate], complete_coverage: decision !== 'unsure', context_binding: contextBinding };
  return validatedPtagCheck(context, () => output);
}

test('legacy PIM catch reaches RBC and skips IRG/PTAG', async () => {
  let called = 0;
  const result = await examineWithCurrentGates('You must obey this plan.', { irgScorer: async () => { called++; return score(90); }, ptag: () => { called++; return { decision: 'yes' }; } });
  assert.deepEqual(result.code, [2, 0]);
  assert.equal(called, 0);
  assert.match(result.marker.entries[0].finding?.reason ?? '', /authority_framing/);
});

test('IRG catch reaches RBC and skips PTAG', async () => {
  let called = 0;
  const result = await examineWithCurrentGates('An ordinary message.', { irgScorer: async () => score(40), ptag: () => { called++; return { decision: 'yes' }; } });
  assert.deepEqual(result.code, [3, 0]);
  assert.equal(called, 0);
});

test('PTAG unsure returns through RBC with uncertainty reason', async () => {
  const result = await examineWithCurrentGates('An ordinary message.', { irgScorer: async () => score(90), ptag: checked('An ordinary message.', 'unsure') });
  assert.deepEqual(result.code, [4, 0]);
  assert.equal(result.marker.entries[2].finding?.kind, 'unsure');
});

test('all passes yield only RBC (1,1); malformed PTAG cannot release', async () => {
  const adapters = { irgScorer: async () => score(90), ptag: checked('An ordinary message.', 'pass') };
  assert.deepEqual((await examineWithCurrentGates('An ordinary message.', adapters)).code, [1, 1]);
  const malformed = await examineWithCurrentGates('An ordinary message.', { ...adapters, ptag: () => ({ decision: 'yes', reason: 'forged' }) });
  assert.equal(malformed.destination, 'shortfall');
});

test('raw numeric PTAG pass and getter-backed decision cannot bypass verdict parsing', async () => {
  for (const ptag of [() => ({ result: 1 }), () => ({ get decision() { return 'yes'; } })]) {
    const result = await examineWithCurrentGates('An ordinary message.', { irgScorer: async () => score(90), ptag });
    assert.equal(result.destination, 'shortfall');
    assert.equal(result.code, null);
  }
});

test('a validated verdict cannot be replayed for another candidate or a second route', async () => {
  const original = 'An ordinary message.';
  const branded = await checked(original, 'pass')(original);
  const changed = await examineWithCurrentGates('An ordinary message changed.', { irgScorer: async () => score(90), ptag: () => branded });
  assert.equal(changed.destination, 'shortfall');
  const first = await examineWithCurrentGates(original, { irgScorer: async () => score(90), ptag: () => branded });
  assert.deepEqual(first.code, [1, 1]);
  const replay = await examineWithCurrentGates(original, { irgScorer: async () => score(90), ptag: () => branded });
  assert.equal(replay.destination, 'shortfall');
});

test('missing and nonfinite IRG thresholds cannot produce Prism clearance', async () => {
  for (const threshold of [{}, Number.NaN, { Honesty: Number.NaN }]) {
    let ptagCalls = 0;
    const result = await examineWithCurrentGates('An ordinary message.', {
      irgScorer: async () => score(0), threshold: threshold as never,
      ptag: () => { ptagCalls++; return { decision: 'yes' }; },
    });
    assert.equal(result.destination, 'shortfall');
    assert.equal(result.code, null);
    assert.equal(ptagCalls, 0);
  }
});

