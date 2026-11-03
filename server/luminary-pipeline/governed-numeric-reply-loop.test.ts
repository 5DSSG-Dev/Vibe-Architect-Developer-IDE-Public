import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { runGovernedNumericReplyLoop } from './governed-numeric-reply-loop.js';
import { SEVEN_VIRTUES } from './irg.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const readings = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));

function pass(candidate: string, attempt: number) {
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const contextBinding = 'test:fact';
  const attemptId = `attempt-${attempt}`;
  const caseId = derivePtagCaseId(candidateHash, contextBinding, attemptId);
  return validatedPtagCheck({ candidateHash, contextBinding, attemptId, caseId, eligibleFactIds: new Set(['TF-03']) }, () => ({
    case_id: caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Fact applies.', matched_fact_ids: ['TF-03'],
    material_units: [candidate], complete_coverage: true, context_binding: contextBinding,
  }));
}

test('malformed initial model reply stops before any numeric gate', async () => {
  let gates = 0;
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: '' }, () => {
    gates += 1;
    throw new Error('must not run');
  }, () => { throw new Error('must not reform'); });
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') {
    assert.equal(result.reason, 'structural_shortfall');
    assert.equal(result.structural?.code, 'empty_reply');
  }
  assert.equal(gates, 0);
  assert.deepEqual(result.lineage, []);
});

test('malformed revised model reply stops before another gate or receiver', async () => {
  let gates = 0;
  const delivered: string[] = [];
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'first' }, (reply) => ({
    pim: () => { gates += 1; return { result: 0, finding: { kind: 'incoherence', reason: 'needs revision' } }; },
    irgScorer: async () => readings,
    ptag: pass(reply.content, 1),
  }), () => ({ modelId: 'model', content: '' }));
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') {
    assert.equal(result.reason, 'structural_shortfall');
    assert.equal(result.structural?.code, 'empty_reply');
  }
  assert.equal(gates, 1);
  assert.deepEqual(delivered, []);
});

test('a governed revision re-enters PIM and delivers only its admitted model reply', async () => {
  const stages: string[] = [];
  const delivered: string[] = [];
  const result = await runGovernedNumericReplyLoop({ modelId: 'model-a', content: 'first' }, (reply, attempt) => ({
    pim: () => { stages.push(`pim:${attempt}`); return attempt === 1
      ? { result: 0, finding: { kind: 'incoherence', reason: 'needs revision' } } : { result: 1 }; },
    irgScorer: async () => { stages.push(`irg:${attempt}`); return readings; },
    ptag: async (candidate) => { stages.push(`ptag:${attempt}`); return pass(reply.content, attempt)(candidate); },
  }), () => ({ modelId: 'model-b', content: 'revised' }));
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.equal(result.status, 'admitted');
  if (result.status === 'admitted') assert.equal(result.reply.modelId, 'model-b');
  assert.deepEqual(stages, ['pim:1', 'pim:2', 'irg:2', 'ptag:2']);
  assert.deepEqual(delivered, ['revised']);
});

test('an adapter cannot substitute unexamined reply content after structural validation', async () => {
  const delivered: string[] = [];
  const result = await runGovernedNumericReplyLoop({ modelId: 'model-a', content: 'examined text' }, (reply) => ({
    pim: () => {
      assert.equal(Object.isFrozen(reply), true);
      (reply as { content: string }).content = 'unexamined text';
      return { result: 1 };
    },
    irgScorer: async () => readings,
    ptag: pass('examined text', 1),
  }), () => { throw new Error('must not reform'); });
  if (result.status === 'admitted') delivered.push(result.reply.content);
  assert.equal(result.status, 'withheld');
  assert.deepEqual(delivered, []);
});

test('admitted and initial structural-withhold results cannot be rewritten for delivery', async () => {
  const admitted = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'examined text' }, (reply) => ({
    pim: () => ({ result: 1 }), irgScorer: async () => readings, ptag: pass(reply.content, 1),
  }), () => { throw new Error('must not reform'); });
  assert.equal(admitted.status, 'admitted');
  assert.equal(Object.isFrozen(admitted), true);
  assert.equal(Object.isFrozen(admitted.lineage), true);
  if (admitted.status === 'admitted') {
    assert.equal(Object.isFrozen(admitted.reply), true);
    assert.throws(() => { (admitted as { reply: unknown }).reply = { modelId: 'forged', content: 'unexamined' }; });
    assert.equal(admitted.reply.content, 'examined text');
  }
  const withheld = await runGovernedNumericReplyLoop({ modelId: 'model', content: '' }, () => {
    throw new Error('must not run');
  }, () => { throw new Error('must not reform'); });
  assert.equal(Object.isFrozen(withheld), true);
  assert.equal(Object.isFrozen(withheld.lineage), true);
  if (withheld.status === 'withheld') assert.equal(Object.isFrozen(withheld.structural), true);
  assert.throws(() => { (withheld as { status: string }).status = 'admitted'; });
  assert.throws(() => { (withheld as { reply?: unknown }).reply = { modelId: 'forged', content: 'unexamined' }; });
  assert.equal(withheld.status, 'withheld');
});

test('reform cannot raise the captured structural byte ceiling', async () => {
  const governance = { maxContentBytes: 10 };
  let gateCalls = 0;
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'first' }, (reply, attempt) => ({
    pim: () => { gateCalls += 1; return attempt === 1
      ? { result: 0, finding: { kind: 'incoherence', reason: 'needs revision' } } : { result: 1 }; },
    irgScorer: async () => readings, ptag: pass(reply.content, attempt),
  }), () => {
    governance.maxContentBytes = Infinity;
    return { modelId: 'model', content: 'revision exceeds ten bytes' };
  }, 2, governance);
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') {
    assert.equal(result.reason, 'structural_shortfall');
    assert.equal(result.structural?.code, 'oversized_reply');
  }
  assert.equal(gateCalls, 1);
});

test('throwing revised content getter is a named structural shortfall', async () => {
  const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'first' }, (reply) => ({
    pim: () => ({ result: 0, finding: { kind: 'unsure', reason: 'needs clarification' } }),
    irgScorer: async () => readings, ptag: pass(reply.content, 1),
  }), () => ({ modelId: 'model', get content(): string { throw new Error('hostile getter'); } }));
  assert.equal(result.status, 'withheld');
  if (result.status === 'withheld') {
    assert.equal(result.reason, 'structural_shortfall');
    assert.equal(result.structural?.code, 'malformed_reply');
    assert.equal(Object.isFrozen(result.structural), true);
  }
});

test('invalid structural ceiling is rejected before any gate', async () => {
  let gates = 0;
  for (const value of [Infinity, 0, Number.NaN]) {
    const result = await runGovernedNumericReplyLoop({ modelId: 'model', content: 'first' }, () => {
      gates += 1;
      throw new Error('must not run');
    }, () => { throw new Error('must not reform'); }, 2, { maxContentBytes: value });
    assert.equal(result.status, 'withheld');
    if (result.status === 'withheld') assert.equal(result.reason, 'configuration_error');
    assert.equal(Object.isFrozen(result), true);
  }
  assert.equal(gates, 0);
});
