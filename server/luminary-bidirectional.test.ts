import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createBidirectionalAsk, type GovernanceRuntime } from './luminary-bidirectional.js';
import { examine } from './luminary-pipeline/marker-route.js';

function runtime(events: string[], hold?: 'inbound' | 'outbound'): GovernanceRuntime {
  return { createSession: () => ({
    invokeWriter: async (writer, prompt) => { events.push('writer'); return writer(prompt); },
    evaluate: async (candidate, direction) => {
      events.push(direction);
      return examine(candidate, {
        pim: () => direction === hold ? { result: 0, finding: { kind: 'unsure', reason: 'private-sentinel' } } : { result: 1 },
        irg: () => ({ result: 1 }), ptag: () => ({ result: 1 }),
      });
    },
  }) };
}

test('missing production sources stop before writer rather than falling back to legacy gates', async () => {
  let calls = 0;
  const result = await createBidirectionalAsk(async () => { calls++; return { modelId: 'm', content: 'reply' }; })('hello');
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
  if (!result.ok) assert.equal(result.shortfall.code, 'governance_unavailable');
});

test('inbound hold prevents writer, outbound gates and downstream proposal effects', async () => {
  const events: string[] = [];
  const result = await createBidirectionalAsk(async () => { throw new Error('writer must not run'); }, runtime(events, 'inbound'))('hello');
  assert.equal(result.ok, false);
  assert.deepEqual(events, ['inbound']);
  assert(!JSON.stringify(result).includes('private-sentinel'));
});

test('outbound hold withholds the exact candidate and never releases private findings', async () => {
  const events: string[] = [];
  const result = await createBidirectionalAsk(async () => ({ modelId: 'm', content: 'withheld-text' }), runtime(events, 'outbound'))('hello');
  assert.equal(result.ok, false);
  assert.deepEqual(events, ['inbound', 'writer', 'outbound']);
  assert(!JSON.stringify(result).includes('withheld-text'));
  assert(!JSON.stringify(result).includes('private-sentinel'));
});

test('only inbound pass, structurally valid writer output and outbound pass release unchanged bytes', async () => {
  const events: string[] = [];
  const content = '  exact reply\n';
  const result = await createBidirectionalAsk(async prompt => { assert.equal(prompt, 'exact prompt'); return { modelId: 'm', content }; }, runtime(events))('exact prompt');
  assert(result.ok);
  assert.equal(result.reply.content, content);
  assert.deepEqual(events, ['inbound', 'writer', 'outbound']);
  assert.equal(result.lineage?.at(-1)?.stage, 'prism');
});

test('malformed writer output never reaches outbound semantic gates', async () => {
  const events: string[] = [];
  const result = await createBidirectionalAsk(async () => 'malformed', runtime(events))('hello');
  assert(!result.ok);
  assert.deepEqual(events, ['inbound', 'writer']);
});

test('replayed or candidate-mismatched pass markers cannot dispatch to the writer', async () => {
  const events: string[] = [];
  const source = runtime(events);
  const session = source.createSession();
  const captured = await session.evaluate('old prompt', 'inbound');
  assert.notEqual(captured.marker.candidateHash, createHash('sha256').update('new prompt').digest('hex'));
  const forged: GovernanceRuntime = { createSession: () => ({ ...session, evaluate: async () => captured }) };
  const result = await createBidirectionalAsk(async () => { throw new Error('must not run'); }, forged)('new prompt');
  assert(!result.ok);
  assert(!events.includes('writer'));
});
