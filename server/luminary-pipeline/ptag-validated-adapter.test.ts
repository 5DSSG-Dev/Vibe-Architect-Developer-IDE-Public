import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { examineWithCurrentGates } from './marker-adapters.js';
import { SEVEN_VIRTUES } from './irg.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const candidate = 'yes looks good';
const candidateHash = createHash('sha256').update(candidate).digest('hex');
const contextBinding = 'pending:create_file:task-list.html';
const context = { caseId: derivePtagCaseId(candidateHash, contextBinding, 'attempt-1'), attemptId: 'attempt-1', eligibleFactIds: new Set(['TF-03']), contextBinding, candidateHash };
const base = { case_id: context.caseId, decision: 'pass', identify: 'approval', rationale: 'Bound to pending action.', matched_fact_ids: ['TF-03'], material_units: [candidate], complete_coverage: true, context_binding: context.contextBinding };
const score = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
const run = (output: unknown) => examineWithCurrentGates(candidate, { irgScorer: async () => score, ptag: validatedPtagCheck(context, () => output) });

test('validated PTAG pass reaches RBC (1,1)', async () => {
  assert.deepEqual((await run(base)).code, [1, 1]);
});

test('validated PTAG boundary and unsure retain distinct Marker reasons', async () => {
  const boundary = await run({ ...base, decision: 'boundary', rationale: 'Conflicts with TF-03.' });
  const unsure = await run({ ...base, decision: 'unsure', matched_fact_ids: [], complete_coverage: false, rationale: 'Referent unresolved.' });
  assert.deepEqual(boundary.code, [4, 0]);
  assert.equal(boundary.marker.entries[2].finding?.kind, 'incoherence');
  assert.deepEqual(unsure.code, [4, 0]);
  assert.equal(unsure.marker.entries[2].finding?.kind, 'unsure');
});

test('forged case, context, material span and coverage cannot release', async () => {
  for (const output of [
    { ...base, case_id: 'other' },
    { ...base, context_binding: 'other' },
    { ...base, material_units: ['text from prior context'] },
    { ...base, complete_coverage: false },
  ]) {
    const result = await run(output);
    assert.equal(result.destination, 'shortfall');
    assert.equal(result.code, null);
    assert.match(result.error ?? '', /ptag_validation/);
  }
});

test('PTAG accessors cannot change verdict between validation and routing', async () => {
  let reads = 0;
  const output = { ...base, get decision() { reads += 1; return reads === 1 ? 'pass' : 'boundary'; } };
  const result = await run(output);
  assert.equal(result.destination, 'shortfall');
  assert.equal(result.code, null);
  assert.equal(reads, 0);
});

test('PTAG envelope rejects hidden fields and nonplain array data', async () => {
  const symbolOutput = { ...base, [Symbol('hidden')]: 'extra' };
  const protoOutput = Object.create({ decision: 'pass' });
  Object.assign(protoOutput, base);
  const prototypeKeyOutput = { ...base };
  Object.defineProperty(prototypeKeyOutput, '__proto__', { value: { decision: 'pass' }, enumerable: true });
  const arrayOutput = { ...base, material_units: Array.from({ length: 4097 }, () => candidate) };
  for (const output of [symbolOutput, protoOutput, prototypeKeyOutput, arrayOutput]) {
    const result = await run(output);
    assert.equal(result.destination, 'shortfall');
    assert.equal(result.code, null);
  }
});

test('trusted context and eligible facts are captured before an awaited producer', async () => {
  const mutable = { ...context, eligibleFactIds: new Set(['TF-03']), contextBinding: context.contextBinding };
  const check = validatedPtagCheck(mutable, async () => {
    mutable.contextBinding = 'forged';
    mutable.eligibleFactIds.clear();
    mutable.eligibleFactIds.add('TF-99');
    return { ...base, context_binding: 'forged', matched_fact_ids: ['TF-99'] };
  });
  const result = await examineWithCurrentGates(candidate, { irgScorer: async () => score, ptag: check });
  assert.equal(result.destination, 'shortfall');
  assert.match(result.error ?? '', /context_binding_mismatch|matched_fact_ineligible/);
});

test('an old pass cannot release a changed candidate with a reused context label', async () => {
  const oldCandidate = 'review old file';
  const newCandidate = 'review new file';
  const binding = 'same-context-label';
  const oldHash = createHash('sha256').update(oldCandidate).digest('hex');
  const newHash = createHash('sha256').update(newCandidate).digest('hex');
  const oldCaseId = derivePtagCaseId(oldHash, binding, 'old-attempt');
  const newCaseId = derivePtagCaseId(newHash, binding, 'new-attempt');
  const oldPass = { ...base, case_id: oldCaseId, material_units: ['review'], context_binding: binding };
  const newContext = { caseId: newCaseId, attemptId: 'new-attempt', candidateHash: newHash, contextBinding: binding, eligibleFactIds: new Set(['TF-03']) };
  const result = await examineWithCurrentGates(newCandidate, { irgScorer: async () => score, ptag: validatedPtagCheck(newContext, () => oldPass) });
  assert.equal(result.destination, 'shortfall');
  assert.match(result.error ?? '', /case_id_mismatch/);
});
