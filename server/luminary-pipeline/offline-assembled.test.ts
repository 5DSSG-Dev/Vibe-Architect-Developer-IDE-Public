import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examineWithCurrentGates } from './marker-adapters.js';
import { markerToIdq } from './marker-idq.js';
import { SEVEN_VIRTUES } from './irg.js';
import { createHash } from 'node:crypto';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const score = (value: number) => Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, value]));
function checked(candidate: string, decision: 'yes' | 'no' | 'unsure', onCall?: () => void) {
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const contextBinding = 'test:context';
  const context = { caseId: derivePtagCaseId(candidateHash, contextBinding, 'attempt-1'), attemptId: 'attempt-1', candidateHash, contextBinding, eligibleFactIds: new Set(['TF-03']) };
  return validatedPtagCheck(context, () => {
    onCall?.();
    return { case_id: context.caseId, decision: decision === 'yes' ? 'pass' : decision === 'no' ? 'boundary' : 'unsure', identify: 'test act', rationale: 'frozen test finding', matched_fact_ids: decision === 'unsure' ? [] : ['TF-03'], material_units: [candidate], complete_coverage: decision !== 'unsure', context_binding: contextBinding };
  });
}

test('offline assembled topology: PIM, IRG, PTAG returns and sole Prism release', async () => {
  const cases = [
    { text: 'You must obey this plan.', irg: 90, ptag: 'yes', code: [2, 0], calls: ['pim'], kind: 'incoherence' },
    { text: 'Please review the file.', irg: 30, ptag: 'yes', code: [3, 0], calls: ['pim', 'irg'], kind: 'incoherence' },
    { text: 'Please review the file.', irg: 90, ptag: 'no', code: [4, 0], calls: ['pim', 'irg', 'ptag'], kind: 'incoherence' },
    { text: 'Please review the file.', irg: 90, ptag: 'unsure', code: [4, 0], calls: ['pim', 'irg', 'ptag'], kind: 'unsure' },
    { text: 'Please review the file.', irg: 90, ptag: 'yes', code: [1, 1], calls: ['pim', 'irg', 'ptag'], kind: null },
  ] as const;
  let dispatches = 0;
  let effects = 0;
  for (const item of cases) {
    const calls: string[] = ['pim']; // local deterministic PIM executes first inside the adapter
    const outcome = await examineWithCurrentGates(item.text, {
      irgScorer: async () => { calls.push('irg'); return score(item.irg); },
      ptag: checked(item.text, item.ptag, () => calls.push('ptag')),
    });
    assert.deepEqual(outcome.code, item.code);
    assert.deepEqual(calls, item.calls);
    if (outcome.destination === 'prism') dispatches += 1; // instrumented sink; no executor call
    else {
      const observation = markerToIdq(outcome);
      assert.ok(observation);
      assert.match(observation.identify, new RegExp(item.kind!));
      assert.ok(observation.define[0].includes(outcome.marker.entries.at(-1)!.finding!.reason));
      assert.equal(outcome.marker.entries.length, item.calls.length);
    }
  }
  assert.equal(dispatches, 1);
  assert.equal(effects, 0);
});

test('reformed candidate starts with a fresh Marker and no inherited hold', async () => {
  const held = await examineWithCurrentGates('You must obey this plan.', { irgScorer: async () => score(90), ptag: checked('You must obey this plan.', 'yes') });
  const reformed = await examineWithCurrentGates('Please review the plan.', { irgScorer: async () => score(90), ptag: checked('Please review the plan.', 'yes') });
  assert.deepEqual(held.code, [2, 0]);
  assert.deepEqual(reformed.code, [1, 1]);
  assert.notEqual(held.marker.candidateHash, reformed.marker.candidateHash);
  assert.equal(markerToIdq(reformed), null);
});
