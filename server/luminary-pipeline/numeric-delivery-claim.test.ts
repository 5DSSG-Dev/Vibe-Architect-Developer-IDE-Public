import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { SEVEN_VIRTUES } from './irg.js';
import { RedisAtomicDeliveryClaims, runClaimedNumericDelivery, type AtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

const clear = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
const noReform = () => { throw new Error('must not reform'); };
const reply = (content: string) => ({ modelId: 'model', content });

function adapters(candidate: { content: string }, attempt: number, hold = false) {
  const candidateHash = createHash('sha256').update(candidate.content).digest('hex');
  const contextBinding = 'synthetic:test';
  const attemptId = `attempt:${attempt}:${candidateHash}`;
  const caseId = derivePtagCaseId(candidateHash, contextBinding, attemptId);
  return {
    pim: () => hold ? { result: 0, finding: { kind: 'incoherence' as const, reason: 'synthetic hold' } } : { result: 1 },
    irgScorer: async () => clear,
    ptag: validatedPtagCheck({ candidateHash, contextBinding, attemptId, caseId, eligibleFactIds: new Set(['TF-03']) }, () => ({
      case_id: caseId, decision: 'pass', identify: 'reviewed', rationale: 'Synthetic eligible fact.',
      matched_fact_ids: ['TF-03'], material_units: [candidate.content], complete_coverage: true, context_binding: contextBinding,
    })),
  };
}

class MemoryClaims implements AtomicDeliveryClaims {
  readonly seen = new Map<string, string>();
  calls = 0;
  async claimOnce(id: string, hash: string) {
    this.calls += 1;
    const prior = this.seen.get(id);
    if (prior) return prior === hash ? 'duplicate' as const : 'conflict' as const;
    this.seen.set(id, hash);
    return 'claimed' as const;
  }
}

test('held and structurally malformed replies cannot claim or call receiver', async () => {
  const claims = new MemoryClaims();
  let calls = 0;
  const receiver = () => { calls += 1; };
  const held = await runClaimedNumericDelivery(reply('held'), (r, a) => adapters(r, a, true), noReform,
    'delivery:1', claims, receiver, 0);
  const malformed = await runClaimedNumericDelivery({ content: 'missing model' }, adapters, noReform,
    'delivery:2', claims, receiver, 0);
  assert.equal(held.status, 'withheld');
  assert.deepEqual(held.route.lineage[0]?.code, [2, 0]);
  assert.equal(malformed.status, 'withheld');
  assert.equal(claims.calls, 0);
  assert.equal(calls, 0);
});

test('stable delivery identity suppresses sequential, conflicting, and concurrent calls', async () => {
  const claims = new MemoryClaims();
  const received: string[] = [];
  const receiver = (r: { content: string }) => { received.push(r.content); };
  const run = (content: string, id = 'delivery:stable') => runClaimedNumericDelivery(reply(content), adapters,
    noReform, id, claims, receiver, 0);
  assert.equal((await run('first')).status, 'delivered');
  assert.equal((await run('first')).status, 'duplicate_claim');
  assert.equal((await run('different')).status, 'identity_conflict');
  assert.deepEqual(received, ['first']);
  const concurrent = await Promise.all([run('second', 'delivery:parallel'), run('second', 'delivery:parallel')]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), ['delivered', 'duplicate_claim']);
  assert.deepEqual(received, ['first', 'second']);
  assert.equal((await run('first', 'bad id')).status, 'identity_conflict');
  assert.equal(received.length, 2);
});

test('uncertain claim and receiver outcome fail closed without automatic replay', async () => {
  let effects = 0;
  const uncertain: AtomicDeliveryClaims = { claimOnce: async () => 'uncertain' };
  const throwClaim: AtomicDeliveryClaims = { claimOnce: async () => { throw new Error('lost response'); } };
  for (const claims of [uncertain, throwClaim]) {
    const result = await runClaimedNumericDelivery(reply('first'), adapters, noReform,
      'delivery:uncertain', claims, () => { effects += 1; }, 0);
    assert.equal(result.status, 'claim_uncertain');
  }
  assert.equal(effects, 0);
  const claims = new MemoryClaims();
  const receiver = () => { effects += 1; throw new Error('receiver reply lost'); };
  assert.equal((await runClaimedNumericDelivery(reply('first'), adapters, noReform,
    'delivery:effect', claims, receiver, 0)).status, 'delivery_uncertain');
  assert.equal((await runClaimedNumericDelivery(reply('first'), adapters, noReform,
    'delivery:effect', claims, receiver, 0)).status, 'duplicate_claim');
  assert.equal(effects, 1);
});

test('Redis adapter accepts only explicit script codes and treats errors as uncertainty', async () => {
  let answer: unknown = 1;
  let calls = 0;
  const redis = new RedisAtomicDeliveryClaims({ eval: async (_script, options) => {
    calls += 1;
    assert.equal(options.keys.length, 1);
    assert.equal(options.keys[0].includes('delivery:redis'), false);
    assert.match(options.arguments[0], /candidateHash/);
    if (answer instanceof Error) throw answer;
    return answer;
  } });
  const hash = createHash('sha256').update('candidate').digest('hex');
  for (const [value, expected] of [[1, 'claimed'], [0, 'duplicate'], [-1, 'conflict'],
    [null, 'uncertain'], ['0', 'uncertain'], [new Error('network'), 'uncertain']] as const) {
    answer = value;
    assert.equal(await redis.claimOnce('delivery:redis', hash), expected);
  }
  assert.equal(await redis.claimOnce('bad id', hash), 'conflict');
  assert.equal(await redis.claimOnce('delivery:redis', 'bad hash'), 'conflict');
  assert.equal(calls, 6);
});
