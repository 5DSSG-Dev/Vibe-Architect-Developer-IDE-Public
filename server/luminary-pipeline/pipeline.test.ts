import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEVEN_VIRTUES, type VirtueReadings } from './irg.js';
import { fakeIdsWriter } from './ids.fixtures.js';
import { GAUGE_NOT_CONFIGURED_MESSAGE, notConfiguredGauge, runReplyPipeline, type Gauge, type Reform } from './pipeline.js';

// Every test uses fakes: a fake gauge and a fake re-form call. No model is reached.

function readings(value: number, overrides: Partial<VirtueReadings> = {}): VirtueReadings {
  return { ...Object.fromEntries(SEVEN_VIRTUES.map((v) => [v, value])), ...overrides } as VirtueReadings;
}

const reply = (content: string) => ({ modelId: 'meta/test-model', content });

/** A gauge that reads each reply from a lookup keyed by its content. */
function gaugeFrom(table: Record<string, VirtueReadings>): Gauge & { seen: string[] } {
  const seen: string[] = [];
  return {
    seen,
    ids: fakeIdsWriter(),
    read: async (content, virtues) => {
      assert.deepEqual([...virtues], [...SEVEN_VIRTUES]);
      seen.push(content);
      return table[content];
    },
  };
}

const noReform: Reform = async () => {
  throw new Error('reform should not be called');
};

test('a coherent reply passes straight to the Prism with a full single-pass lineage', async () => {
  const gauge = gaugeFrom({ 'A clear plan.': readings(85) });
  const result = await runReplyPipeline(reply('A clear plan.'), noReform, { gauge });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.reply, reply('A clear plan.'));
  assert.deepEqual(result.lineage.map((e) => `${e.pass}:${e.stage}`), ['1:structural', '1:pim', '1:irg', '1:rbc', '1:prism']);
});

test('the gauge receives only the reply content and the Seven Virtues', async () => {
  const gauge = gaugeFrom({ 'Only this.': readings(90) });
  await runReplyPipeline(reply('Only this.'), noReform, { gauge });
  assert.deepEqual(gauge.seen, ['Only this.']);
});

test('an incoherent reply goes to IDS, the originator re-forms, and the re-formed reply is delivered', async () => {
  const gauge = gaugeFrom({ first: readings(90, { Respect: 30 }), second: readings(88) });
  const observations: string[][] = [];
  const reform: Reform = async (observation, previous) => {
    observations.push(observation.define);
    assert.equal(previous.content, 'first');
    return reply('second');
  };
  const result = await runReplyPipeline(reply('first'), reform, { gauge });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.reply.content, 'second');
  assert.deepEqual(observations, [['Respect reads 30.0, below the threshold of 70.']]);
  assert.deepEqual(result.lineage.map((e) => `${e.pass}:${e.stage}`), [
    '1:structural', '1:pim', '1:irg', '1:rbc', '1:ids',
    '2:structural', '2:pim', '2:irg', '2:rbc', '2:prism',
  ]);
});

test('the loop is bounded: after 2 IDS passes a still-incoherent reply is an incoherent_after_ids Shortfall and the text is withheld', async () => {
  let reforms = 0;
  const gauge: Gauge = { read: async () => readings(90, { Trust: 10 }), ids: fakeIdsWriter() };
  const reform: Reform = async () => { reforms += 1; return reply(`attempt ${reforms + 1}`); };
  const result = await runReplyPipeline(reply('attempt 1'), reform, { gauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(reforms, 2);
  assert.equal(result.shortfall.code, 'incoherent_after_ids');
  assert.equal(result.shortfall.modelId, 'meta/test-model');
  assert.deepEqual(result.shortfall.readings, readings(90, { Trust: 10 }));
  assert.deepEqual(result.shortfall.observation?.define, ['Trust reads 10.0, below the threshold of 70.']);
  assert.ok(!JSON.stringify(result).includes('"content"'), 'incoherent text is never returned as a reply');
  assert.equal(result.lineage.filter((e) => e.stage === 'ids').length, 3);
  assert.equal(result.lineage.at(-1)?.stage, 'ids');
});

test('maxIdsPasses tunes the bound; 0 means no re-form at all', async () => {
  const gauge: Gauge = { read: async () => readings(10), ids: fakeIdsWriter() };
  const result = await runReplyPipeline(reply('x'), noReform, { gauge, maxIdsPasses: 0 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'incoherent_after_ids');
});

test('a PIM catch goes straight to IDS without the IRG reading the reply', async () => {
  const gauge = gaugeFrom({ 'A calm answer.': readings(90) });
  const reform: Reform = async () => reply('A calm answer.');
  const result = await runReplyPipeline(reply('You have no choice but to accept.'), reform, { gauge });
  assert.equal(result.ok, true);
  assert.deepEqual(gauge.seen, ['A calm answer.']);
  assert.deepEqual(result.lineage.map((e) => `${e.pass}:${e.stage}`), [
    '1:structural', '1:pim', '1:ids',
    '2:structural', '2:pim', '2:irg', '2:rbc', '2:prism',
  ]);
});

test('a PIM catch that persists ends as incoherent_after_ids with no readings', async () => {
  const gauge = gaugeFrom({});
  const reform: Reform = async () => reply('Keep this secret.');
  const result = await runReplyPipeline(reply('Keep this secret.'), reform, { gauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'incoherent_after_ids');
  assert.equal(result.shortfall.readings, null);
  assert.deepEqual(gauge.seen, []);
});

test('a structurally invalid first reply keeps its P12 Shortfall and never reaches the gauge', async () => {
  const gauge = gaugeFrom({});
  const result = await runReplyPipeline({ modelId: 'm', content: '   ' }, noReform, { gauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'empty_reply');
  assert.deepEqual(result.lineage, [{ pass: 1, stage: 'structural', ok: false, code: 'empty_reply' }]);
});

test('a re-formed reply is structurally gated too', async () => {
  const gauge: Gauge = { read: async () => readings(10), ids: fakeIdsWriter() };
  const result = await runReplyPipeline(reply('first'), async () => ({ content: 'no model id' }), { gauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'missing_model_id');
  assert.equal(result.lineage.at(-1)?.pass, 2);
});

test('the not-configured gauge fails closed as gauge_error', async () => {
  const result = await runReplyPipeline(reply('Hello.'), noReform, { gauge: notConfiguredGauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'gauge_error');
  assert.equal(result.shortfall.message, GAUGE_NOT_CONFIGURED_MESSAGE);
});

test('an invalid gauge payload is a gauge_error, never a guessed reading', async () => {
  const result = await runReplyPipeline(reply('Hello.'), noReform, { gauge: { read: async () => ({ Honesty: 99 }) } });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'gauge_error');
  assert.match(result.shortfall.message, /Respect/);
});

test('the IDS embedded model writes the response; with none configured, or an unusable one, IDS fails closed as ids_error', async () => {
  const good: Gauge = {
    read: async (content) => (content === 'fixed' ? readings(90) : readings(10)),
    ids: { write: async () => ({ identify: 'from the embedded model', define: ['d'], suggest: ['One possibility is a shorter reply.'] }) },
  };
  let seenIdentify = '';
  const result = await runReplyPipeline(reply('first'), async (observation) => { seenIdentify = observation.identify; return reply('fixed'); }, { gauge: good });
  assert.equal(result.ok, true);
  assert.equal(seenIdentify, 'from the embedded model');

  for (const gauge of [
    { read: async () => readings(10) } as Gauge,
    { read: async () => readings(10), ids: { write: async () => 'not an observation' } } as Gauge,
  ]) {
    const failed = await runReplyPipeline(reply('first'), noReform, { gauge, idsOptions: { retryDelayMs: 0 } });
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.equal(failed.shortfall.code, 'ids_error');
    assert.ok(!JSON.stringify({ shortfall: failed.shortfall, lineage: failed.lineage }).includes('"first"'), 'none of the reply text is returned');
    assert.deepEqual(failed.passes, ['first'], 'the reply is kept in full for the review record');
    assert.equal(failed.lineage.at(-1)?.stage, 'ids_error');
  }
});

test('a failing re-form call is an upstream_error Shortfall', async () => {
  const gauge: Gauge = { read: async () => readings(10), ids: fakeIdsWriter() };
  const result = await runReplyPipeline(reply('first'), async () => { throw new Error('model down'); }, { gauge });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'upstream_error');
  assert.equal(result.shortfall.message, 'model down');
});
