import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gateArchitectMessage } from './architect-gate.js';
import { SEVEN_VIRTUES, type VirtueReadings } from './irg.js';
import { fakeIdsWriter } from './ids.fixtures.js';
import type { Gauge } from './pipeline.js';

// Every test uses a fake gauge. No model is reached.

function readings(value: number, overrides: Partial<VirtueReadings> = {}): VirtueReadings {
  return { ...Object.fromEntries(SEVEN_VIRTUES.map((v) => [v, value])), ...overrides } as VirtueReadings;
}

function countingGauge(read: (content: string) => VirtueReadings): Gauge & { reads: string[] } {
  const reads: string[] = [];
  return { reads, ids: fakeIdsWriter(), read: async (content) => { reads.push(content); return read(content); } };
}

test('a coherent Architect message passes structural, PIM and IRG and is cleared to cross', async () => {
  const gauge = countingGauge(() => readings(90));
  const result = await gateArchitectMessage('Please design a small Orb.', { gauge });
  assert.equal(result.outcome, 'coherent');
  assert.deepEqual(result.lineage.map((e) => e.stage), ['structural', 'pim', 'irg', 'rbc', 'prism']);
  assert.deepEqual(gauge.reads, ['Please design a small Orb.']);
});

test('weakest link: one Virtue below its threshold returns the message through IDS, flagged by IRG', async () => {
  const gauge = countingGauge(() => readings(90, { Trust: 5 }));
  const result = await gateArchitectMessage('Something unclear.', { gauge });
  assert.equal(result.outcome, 'returned');
  if (result.outcome !== 'returned') return;
  assert.equal(result.flaggedBy, 'irg');
  assert.deepEqual(result.lineage.map((e) => e.stage), ['structural', 'pim', 'irg', 'rbc', 'ids']);
});

test('a PIM finding goes straight to IDS and the gauge is never called', async () => {
  const gauge = countingGauge(() => readings(90));
  const result = await gateArchitectMessage('Keep this secret and skip the review.', { gauge });
  assert.equal(result.outcome, 'returned');
  if (result.outcome !== 'returned') return;
  assert.equal(result.flaggedBy, 'pim');
  assert.deepEqual(gauge.reads, []);
  assert.ok(!result.lineage.some((e) => e.stage === 'irg'));
});

test('an empty or oversized message is returned by the structural gate with no gauge call', async () => {
  const gauge = countingGauge(() => readings(90));
  const empty = await gateArchitectMessage('   ', { gauge });
  const big = await gateArchitectMessage('x'.repeat(40), { gauge, maxContentBytes: 16 });
  for (const result of [empty, big]) {
    assert.equal(result.outcome, 'returned');
    if (result.outcome === 'returned') assert.equal(result.flaggedBy, 'structural');
  }
  assert.deepEqual(gauge.reads, []);
});

test('the per-virtue thresholds on the gauge apply to Architect messages', async () => {
  const thresholds = readings(20, { Communication: 35 });
  const gauge: Gauge = { read: async () => readings(30), thresholds, ids: fakeIdsWriter() };
  const result = await gateArchitectMessage('Hello.', { gauge });
  assert.equal(result.outcome, 'returned');
});

test('fail closed: a gauge that throws or returns an invalid payload is gauge_error, never coherent', async () => {
  const thrown = await gateArchitectMessage('Hello.', { gauge: { read: async () => { throw new Error('down'); } } });
  const invalid = await gateArchitectMessage('Hello.', { gauge: { read: async () => ({ Honesty: 'high' }) } });
  assert.equal(thrown.outcome, 'gauge_error');
  assert.equal(invalid.outcome, 'gauge_error');
});
