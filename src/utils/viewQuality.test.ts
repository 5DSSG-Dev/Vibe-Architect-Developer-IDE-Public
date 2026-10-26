import assert from 'node:assert/strict';
import test from 'node:test';
import {
  QUALITY_PRESETS,
  QUALITY_PRESET_ORDER,
  effectivePixelRatio,
  prefersReducedMotion,
} from './viewQuality.ts';

test('quality presets trade pixel ratio and bloom monotonically', () => {
  assert.equal(QUALITY_PRESETS.high.maxPixelRatio, 2);
  assert.equal(QUALITY_PRESETS.balanced.maxPixelRatio, 1.5);
  assert.equal(QUALITY_PRESETS.low.maxPixelRatio, 1);
  // Bloom is on for the two higher presets and off at low.
  assert.equal(QUALITY_PRESETS.high.bloom, true);
  assert.equal(QUALITY_PRESETS.balanced.bloom, true);
  assert.equal(QUALITY_PRESETS.low.bloom, false);
  assert.deepEqual([...QUALITY_PRESET_ORDER], ['high', 'balanced', 'low']);
});

test('effective pixel ratio is capped by the preset and never below a floor', () => {
  // A high-DPR display is clamped to the preset cap.
  assert.equal(effectivePixelRatio('low', 3), 1);
  assert.equal(effectivePixelRatio('balanced', 3), 1.5);
  assert.equal(effectivePixelRatio('high', 3), 2);
  // A modest display passes through below the cap.
  assert.equal(effectivePixelRatio('high', 1.25), 1.25);
  // Degenerate ratios are floored so the renderer never gets 0.
  assert.equal(effectivePixelRatio('high', 0), 0.5);
});

test('prefersReducedMotion is false with no matchMedia (test/SSR safe)', () => {
  // Node has no window.matchMedia; the helper must not throw and defaults to
  // full motion.
  assert.equal(prefersReducedMotion(), false);
});
