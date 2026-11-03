import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEVEN_VIRTUES } from './irg.js';
import { runGovernedNumericReplyLoop } from './governed-numeric-reply-loop.js';
import { examineWithCurrentGates } from './marker-adapters.js';
import { createAttemptBoundPtagCheck, type PtagAttemptRequest } from './ptag-attempt-factory.js';

const score = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
const trusted = { contextBinding: 'approved:review-file', eligibleFactIds: new Set(['TF-03']) };

function pass(request: PtagAttemptRequest) {
  return {
    case_id: request.caseId, decision: 'pass', identify: 'reviewed file', rationale: 'Approved fact applies.',
    matched_fact_ids: ['TF-03'], material_units: [request.candidate], complete_coverage: true,
    context_binding: request.contextBinding,
  };
}

test('each attempt receives a fresh case ID and one validated pass', async () => {
  const cases: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ptag = createAttemptBoundPtagCheck('review file', trusted, (request) => {
      cases.push(request.caseId);
      assert.equal(Object.isFrozen(request), true);
      assert.equal(Object.isFrozen(request.eligibleFactIds), true);
      return pass(request);
    });
    const outcome = await examineWithCurrentGates('review file', { irgScorer: async () => score, ptag });
    assert.deepEqual(outcome.code, [1, 1]);
  }
  assert.equal(cases.length, 2);
  assert.notEqual(cases[0], cases[1]);
});

test('a stale envelope from another attempt cannot release', async () => {
  let oldOutput: unknown;
  const first = createAttemptBoundPtagCheck('review file', trusted, (request) => {
    oldOutput = pass(request);
    return oldOutput;
  });
  assert.deepEqual((await examineWithCurrentGates('review file', { irgScorer: async () => score, ptag: first })).code, [1, 1]);
  const second = createAttemptBoundPtagCheck('review file', trusted, () => oldOutput);
  const replay = await examineWithCurrentGates('review file', { irgScorer: async () => score, ptag: second });
  assert.equal(replay.destination, 'shortfall');
  assert.match(replay.error ?? '', /case_id_mismatch/);
});

test('candidate and trusted facts are bound before the producer runs', async () => {
  const mutable = { contextBinding: 'approved:review-file', eligibleFactIds: new Set(['TF-03']) };
  let producerCalls = 0;
  const ptag = createAttemptBoundPtagCheck('review file', mutable, (request) => {
    producerCalls += 1;
    assert.equal(request.contextBinding, 'approved:review-file');
    assert.deepEqual(request.eligibleFactIds, ['TF-03']);
    return pass(request);
  });
  const fresh = createAttemptBoundPtagCheck('review file', mutable, (request) => {
    producerCalls += 1;
    assert.equal(request.contextBinding, 'approved:review-file');
    assert.deepEqual(request.eligibleFactIds, ['TF-03']);
    return pass(request);
  });
  mutable.contextBinding = 'forged';
  mutable.eligibleFactIds.clear();
  mutable.eligibleFactIds.add('TF-99');
  const wrongCandidate = await examineWithCurrentGates('review another file', { irgScorer: async () => score, ptag });
  assert.equal(wrongCandidate.destination, 'shortfall');
  assert.equal(producerCalls, 0);
  const burned = await examineWithCurrentGates('review file', { irgScorer: async () => score, ptag });
  assert.equal(burned.destination, 'shortfall');
  assert.match(burned.error ?? '', /attempt_reused/);
  const correct = await examineWithCurrentGates('review file', { irgScorer: async () => score, ptag: fresh });
  assert.deepEqual(correct.code, [1, 1]);
  assert.equal(producerCalls, 1);
});

test('fresh candidate attempt reaches injected receiver only after full admission', async () => {
  let producerCalls = 0;
  const delivered: string[] = [];
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'first draft' }, (reply, attempt) => ({
    pim: () => attempt === 1
      ? { result: 0, finding: { kind: 'incoherence', reason: 'needs revision' } } : { result: 1 },
    irgScorer: async () => score,
    ptag: createAttemptBoundPtagCheck(reply.content, trusted, (request) => {
      producerCalls += 1;
      return pass(request);
    }),
  }), () => ({ modelId: 'model', content: 'revised draft' }));
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.deepEqual(result.lineage.map((item) => item.code), [[2, 0], [1, 1]]);
  assert.equal(producerCalls, 1);
  assert.deepEqual(delivered, ['revised draft']);
});

test('trusted context accessors are rejected before issuing an attempt', () => {
  let reads = 0;
  const hostile = { eligibleFactIds: new Set(['TF-03']), get contextBinding() { reads += 1; return 'approved:review-file'; } };
  assert.throws(() => createAttemptBoundPtagCheck('review file', hostile, () => { throw new Error('must not run'); }), /invalid_ptag_trusted_context/);
  assert.equal(reads, 0);
});

test('one check cannot replay a cached pass in sequential examinations', async () => {
  let calls = 0;
  let cached: unknown;
  const ptag = createAttemptBoundPtagCheck('review file', trusted, (request) => {
    calls += 1;
    cached ??= pass(request);
    return cached;
  });
  const adapters = { irgScorer: async () => score, ptag };
  assert.deepEqual((await examineWithCurrentGates('review file', adapters)).code, [1, 1]);
  const replay = await examineWithCurrentGates('review file', adapters);
  assert.equal(replay.destination, 'shortfall');
  assert.match(replay.error ?? '', /attempt_reused/);
  assert.equal(calls, 1);
});

test('one check cannot replay a cached pass during a concurrent examination', async () => {
  let producerStarted!: () => void;
  let finishProducer!: () => void;
  const started = new Promise<void>((resolve) => { producerStarted = resolve; });
  const pending = new Promise<void>((resolve) => { finishProducer = resolve; });
  let calls = 0;
  const ptag = createAttemptBoundPtagCheck('review file', trusted, async (request) => {
    calls += 1;
    producerStarted();
    await pending;
    return pass(request);
  });
  const adapters = { irgScorer: async () => score, ptag };
  const first = examineWithCurrentGates('review file', adapters);
  await started;
  const replay = await examineWithCurrentGates('review file', adapters);
  assert.equal(replay.destination, 'shortfall');
  assert.match(replay.error ?? '', /attempt_reused/);
  finishProducer();
  assert.deepEqual((await first).code, [1, 1]);
  assert.equal(calls, 1);
});
