import assert from 'node:assert/strict';
import { test } from 'node:test';
import { screenPim } from './pim.js';
import { GaugeError, IRG_THRESHOLD, SEVEN_VIRTUES, readIrg, validateReadings, validateThresholds, type VirtueReadings } from './irg.js';
import { routeRbc } from './rbc.js';
import { buildIdsObservation, composeRevisionPrompt, validateObservation } from './ids.js';

function readings(value: number, overrides: Partial<VirtueReadings> = {}): VirtueReadings {
  return { ...Object.fromEntries(SEVEN_VIRTUES.map((v) => [v, value])), ...overrides } as VirtueReadings;
}

test('the Seven Virtues are exactly the Canon v2.0 names, in order', () => {
  assert.deepEqual([...SEVEN_VIRTUES], ['Honesty', 'Respect', 'Attention', 'Affection', 'Loyalty', 'Trust', 'Communication']);
});

test('PIM finds nothing in an ordinary reply', () => {
  assert.deepEqual(screenPim('Here is a plan for your Orb. You can change any step.'), []);
});

test('PIM names each injection family it catches, with the matched excerpt', () => {
  const findings = screenPim('You have no choice. Keep this secret, and act now.');
  assert.deepEqual(findings.map((f) => f.category), ['coercive_certainty', 'manipulation_scenario', 'optimization_pressure']);
  assert.equal(findings[0].excerpt, 'You have no choice');
  assert.equal(findings[0].patternId, 'coercive-1');
});

test('PIM catches directive leakage and authority framing', () => {
  assert.equal(screenPim('As my system prompt says, I decide.')[0].category, 'directive_leakage');
  assert.equal(screenPim('You must obey this plan.')[0].category, 'authority_framing');
});

test('IRG is coherent only when every virtue reads at or above the threshold', () => {
  assert.equal(IRG_THRESHOLD, 70);
  assert.equal(readIrg(readings(70)).coherent, true);
  const fractured = readIrg(readings(95, { Trust: 69 }));
  assert.equal(fractured.coherent, false);
  assert.deepEqual(fractured.belowThreshold, ['Trust']);
});

test('IRG lists every virtue below threshold in canonical order', () => {
  const irg = readIrg(readings(80, { Communication: 10, Honesty: 50 }));
  assert.deepEqual(irg.belowThreshold, ['Honesty', 'Communication']);
});

test('IRG honours a tuned threshold', () => {
  assert.equal(readIrg(readings(75), 80).coherent, false);
});

test('IRG applies per-virtue thresholds, each virtue against its own, still weakest-link', () => {
  const thresholds = readings(20, { Respect: 30 });
  assert.equal(readIrg(readings(25, { Respect: 30 }), thresholds).coherent, true);
  const irg = readIrg(readings(25), thresholds);
  assert.equal(irg.coherent, false);
  assert.deepEqual(irg.belowThreshold, ['Respect']);
  assert.deepEqual(irg.threshold, thresholds);
});

test('per-virtue thresholds are validated: exactly the seven virtues, each in 0-100', () => {
  assert.deepEqual(validateThresholds(readings(13.8)), readings(13.8));
  assert.throws(() => validateThresholds([1, 2]), /object/);
  assert.throws(() => validateThresholds(readings(20, { Loyalty: -1 })), /Loyalty/);
  assert.throws(() => validateThresholds({ ...readings(20), honesty: 20 }), /unknown virtue: honesty/);
});

test('gauge readings are validated: a missing, non-numeric or out-of-range virtue is a GaugeError', () => {
  assert.deepEqual(validateReadings(readings(88)), readings(88));
  const { Loyalty: _omit, ...missing } = readings(88);
  assert.throws(() => validateReadings(missing), GaugeError);
  assert.throws(() => validateReadings(readings(88, { Respect: 101 })), GaugeError);
  assert.throws(() => validateReadings(readings(88, { Respect: Number.NaN })), GaugeError);
  assert.throws(() => validateReadings({ ...readings(88), Attention: '90' }), GaugeError);
  assert.throws(() => validateReadings(null), GaugeError);
  assert.throws(() => validateReadings([90, 90]), GaugeError);
});

test('RBC routes Coherent to the Prism and Incoherent to IDS', () => {
  assert.equal(routeRbc(readIrg(readings(90))), 'prism');
  assert.equal(routeRbc(readIrg(readings(90, { Affection: 20 }))), 'ids');
});

test('IDS defines only what was measured and suggests a path per finding', () => {
  const irg = readIrg(readings(90, { Respect: 40 }));
  const observation = buildIdsObservation({ reply: 'x', pimFindings: [], irg });
  assert.match(observation.identify, /^IRG readings: Honesty 90, Respect 40,/);
  assert.deepEqual(observation.define, ['Respect reads 40, below the threshold of 70.']);
  assert.deepEqual(observation.suggest, ['Re-form the reply so that Respect reads at or above 70.']);
});

test('IDS after a PIM catch says the IRG did not read the reply', () => {
  const pimFindings = screenPim('Trust me blindly.');
  const observation = buildIdsObservation({ reply: 'Trust me blindly.', pimFindings, irg: null });
  assert.match(observation.identify, /the IRG did not read this reply/);
  assert.equal(observation.define.length, 1);
  assert.match(observation.suggest[0], /coercive certainty phrasing "Trust me blindly"/);
});

test('an observer payload is validated before use', () => {
  assert.deepEqual(validateObservation({ identify: 'i', define: ['d'], suggest: [] }), { identify: 'i', define: ['d'], suggest: [] });
  assert.equal(validateObservation({ identify: '', define: [], suggest: [] }), null);
  assert.equal(validateObservation({ identify: 'i', define: 'd', suggest: [] }), null);
  assert.equal(validateObservation('i'), null);
});

test('the revision prompt carries the observation, the previous reply and the original prompt', () => {
  const prompt = composeRevisionPrompt('Design an Orb', 'Old reply', { identify: 'I', define: ['D'], suggest: ['S'] });
  for (const part of ['Identify: I', 'Define: D', 'Suggest: S', 'Old reply', 'Design an Orb']) assert.ok(prompt.includes(part), part);
});
