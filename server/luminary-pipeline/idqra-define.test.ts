import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDefine } from './idqra-define.js';
import { BOUNDS } from './idqra.js';
import type { PimFinding } from './pim.js';
import { IRG_THRESHOLD, SEVEN_VIRTUES, type IrgReading, type VirtueReadings } from './irg.js';

// P5 trusted Define builder (contract v0.2 §4). Pure/deterministic; no model is reached and no
// reply excerpt is echoed into Define text.

const pim = (category: PimFinding['category'], patternId: string): PimFinding => ({
  category,
  patternId,
  excerpt: '<<INJECTED EXCERPT — must never appear in Define text>>',
});

const readings = (): VirtueReadings => Object.fromEntries(SEVEN_VIRTUES.map((v) => [v, 90])) as VirtueReadings;

const irg = (below: IrgReading['belowThreshold']): IrgReading => ({
  coherent: below.length === 0,
  readings: readings(),
  belowThreshold: below,
  threshold: IRG_THRESHOLD,
});

test('buildDefine makes one trusted item per PIM finding, in order, tracing to the pattern id', () => {
  const items = buildDefine([pim('authority_framing', 'authority-1'), pim('manipulation_scenario', 'manipulation-2')], null);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => [i.source, i.ref]), [['pim', 'authority-1'], ['pim', 'manipulation-2']]);
  // Fixed template, never the excerpt:
  assert.equal(items[0].text, 'The message claimed an authority it does not hold.');
  for (const i of items) assert.ok(!i.text.includes('INJECTED'));
});

test('buildDefine adds one item per below-threshold virtue in canonical order after the PIM items', () => {
  const items = buildDefine([pim('coercive_certainty', 'coercive-1')], irg(['Respect', 'Trust']));
  assert.deepEqual(items.map((i) => [i.source, i.ref]), [
    ['pim', 'coercive-1'],
    ['irg', 'Respect'],
    ['irg', 'Trust'],
  ]);
  assert.equal(items[1].text, 'The message read below the coherence line on Respect.');
});

test('buildDefine ignores a coherent or absent IRG reading', () => {
  assert.deepEqual(buildDefine([], irg([])), []);
  assert.deepEqual(buildDefine([], null), []);
  const onlyPim = buildDefine([pim('emotional_leverage', 'emotional-2')], irg([]));
  assert.equal(onlyPim.length, 1);
  assert.equal(onlyPim[0].source, 'pim');
});

test('buildDefine is deterministic — identical findings yield an identical list', () => {
  const a = buildDefine([pim('directive_leakage', 'directive-leak-1')], irg(['Honesty']));
  const b = buildDefine([pim('directive_leakage', 'directive-leak-1')], irg(['Honesty']));
  assert.deepEqual(a, b);
});

test('every built Define item satisfies the §5 shape and length bounds (worst case: all virtues below)', () => {
  const items = buildDefine([pim('optimization_pressure', 'optimization-1')], irg([...SEVEN_VIRTUES]));
  assert.equal(items.length, 1 + SEVEN_VIRTUES.length);
  for (const i of items) {
    assert.ok(i.ref.length > 0);
    assert.ok(i.text.trim().length > 0 && i.text.length <= BOUNDS.defineText);
    assert.ok(i.source === 'pim' || i.source === 'irg');
  }
});
