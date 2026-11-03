import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { SEVEN_VIRTUES } from './irg.js';
import { runNumericReplyLoop } from './numeric-reply-loop.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const clear = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));

function passingPtag(candidate: string, attempt: number) {
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const contextBinding = 'test:reviewed-file';
  const attemptId = `attempt-${attempt}`;
  const caseId = derivePtagCaseId(candidateHash, contextBinding, attemptId);
  return validatedPtagCheck({ candidateHash, contextBinding, attemptId, caseId, eligibleFactIds: new Set(['TF-03']) }, () => ({
    case_id: caseId, decision: 'pass', identify: 'reviewed file', rationale: 'Eligible fact applies.',
    matched_fact_ids: ['TF-03'], material_units: [candidate], complete_coverage: true, context_binding: contextBinding,
  }));
}

test('PIM hold goes to Conscience and a changed candidate starts fresh at PIM', async () => {
  const calls: string[] = [];
  const result = await runNumericReplyLoop('forceful first message', (candidate, attempt) => ({
    pim: () => { calls.push(`pim:${attempt}`); return attempt === 1
      ? { result: 0, finding: { kind: 'incoherence', reason: 'forceful span' } } : { result: 1 }; },
    irgScorer: async () => { calls.push(`irg:${attempt}`); return clear; },
    ptag: async (text) => { calls.push(`ptag:${attempt}`); return passingPtag(candidate, attempt)(text); },
  }), (observation) => {
    assert.match(observation.define[0], /forceful span/);
    return 'Please review the file.';
  });
  assert.equal(result.status, 'admitted');
  if (result.status === 'admitted') assert.equal(result.candidate, 'Please review the file.');
  assert.deepEqual(result.lineage.map((item) => item.code), [[2, 0], [1, 1]]);
  assert.deepEqual(calls, ['pim:1', 'pim:2', 'irg:2', 'ptag:2']);
});

test('retry exhaustion withholds every held candidate without calling a receiver', async () => {
  let reforms = 0;
  const result = await runNumericReplyLoop('first', () => ({
    pim: () => ({ result: 1 }), irgScorer: async () => Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 0])),
    ptag: () => { throw new Error('PTAG must not run after IRG zero'); },
  }), () => { reforms += 1; return `revision ${reforms}`; }, 2);
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') assert.equal(result.reason, 'retry_exhausted');
  assert.deepEqual(result.lineage.map((item) => item.code), [[3, 0], [3, 0], [3, 0]]);
  assert.equal(reforms, 2);
  assert.equal(Object.isFrozen(result.lineage), true);
  if (result.status === 'withheld' && result.observation) {
    assert.equal(Object.isFrozen(result.observation), true);
    assert.equal(Object.isFrozen(result.observation.define), true);
    assert.equal(Object.isFrozen(result.observation.question), true);
  }
});

test('failed reform and route shortfall stop without another examination', async () => {
  const held = await runNumericReplyLoop('first', () => ({
    pim: () => ({ result: 0, finding: { kind: 'unsure', reason: 'missing referent' } }),
    irgScorer: async () => clear, ptag: passingPtag('first', 1),
  }), () => 'first');
  assert.equal(held.status, 'withheld');
  if (held.status === 'withheld') assert.equal(held.reason, 'invalid_reform');
  const broken = await runNumericReplyLoop('first', () => ({
    pim: () => ({ result: 1 }), irgScorer: async () => clear, ptag: () => ({ result: 1 }),
  }), () => { throw new Error('should not reform'); });
  assert.equal(broken.status, 'withheld');
  if (broken.status === 'withheld') assert.equal(broken.reason, 'route_shortfall');
});

test('reform cannot rewrite the held Marker observation', async () => {
  const result = await runNumericReplyLoop('first', () => ({
    pim: () => ({ result: 0, finding: { kind: 'incoherence', reason: 'original finding' } }),
    irgScorer: async () => clear, ptag: passingPtag('first', 1),
  }), (observation) => {
    observation.define[0] = 'forged finding';
    return 'revision';
  });
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') {
    assert.equal(result.reason, 'reform_error');
    assert.match(result.observation?.define[0] ?? '', /original finding/);
  }
});

test('injected receiver sees zero held candidates and exactly one admitted revision', async () => {
  const delivered: string[] = [];
  const send = (candidate: string) => { delivered.push(candidate); };
  const cases = [
    { candidate: 'PIM hold', stop: 'pim' },
    { candidate: 'IRG hold', stop: 'irg' },
    { candidate: 'PTAG unsure', stop: 'ptag' },
    { candidate: 'Malformed PTAG', stop: 'malformed' },
  ] as const;
  for (const item of cases) {
    const result = await runNumericReplyLoop(item.candidate, (candidate) => ({
      pim: () => item.stop === 'pim'
        ? { result: 0, finding: { kind: 'incoherence', reason: 'PIM finding' } } : { result: 1 },
      irgScorer: async () => item.stop === 'irg'
        ? Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 0])) : clear,
      ptag: item.stop === 'malformed' ? () => ({ result: 1 })
        : item.stop === 'ptag' ? validatedPtagCheck((() => {
          const candidateHash = createHash('sha256').update(candidate).digest('hex');
          const contextBinding = 'test:reviewed-file';
          const attemptId = 'attempt-1';
          return { candidateHash, contextBinding, attemptId, caseId: derivePtagCaseId(candidateHash, contextBinding, attemptId), eligibleFactIds: new Set(['TF-03']) };
        })(), () => ({
          case_id: derivePtagCaseId(createHash('sha256').update(candidate).digest('hex'), 'test:reviewed-file', 'attempt-1'),
          decision: 'unsure', identify: 'unclear', rationale: 'Referent unresolved.', matched_fact_ids: [],
          material_units: [candidate], complete_coverage: false, context_binding: 'test:reviewed-file',
        })) : passingPtag(candidate, 1),
    }), () => { throw new Error('No revision in held-case probe'); }, 0);
    if (result.status === 'admitted') send(result.candidate);
    assert.equal(result.status, 'withheld');
  }
  assert.deepEqual(delivered, []);

  const admitted = await runNumericReplyLoop('first draft', (candidate, attempt) => ({
    pim: () => attempt === 1
      ? { result: 0, finding: { kind: 'incoherence', reason: 'PIM finding' } } : { result: 1 },
    irgScorer: async () => clear,
    ptag: passingPtag(candidate, attempt),
  }), () => 'revised draft', 1);
  if (admitted.status === 'admitted') send(admitted.candidate);
  assert.deepEqual(delivered, ['revised draft']);
  assert.deepEqual(admitted.lineage.map((item) => item.code), [[2, 0], [1, 1]]);
});
