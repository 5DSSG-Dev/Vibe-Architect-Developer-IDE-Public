import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type Bounds,
  type CameraPose,
  type Vec3,
  createSavedViews,
  deleteView,
  deserializeSavedViews,
  easeInOutCubic,
  frameBounds,
  getView,
  lerpPose,
  listViewNames,
  saveView,
  serializeSavedViews,
} from './cameraNav.ts';

// Assert two numbers are equal within a floating-point tolerance.
function near(actual: number, expected: number, eps = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected ${actual} to be within ${eps} of ${expected}`,
  );
}

function nearVec3(actual: Vec3, expected: Vec3, eps = 1e-9): void {
  near(actual[0], expected[0], eps);
  near(actual[1], expected[1], eps);
  near(actual[2], expected[2], eps);
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const box = (min: Vec3, max: Vec3): Bounds => ({ min, max });

// --- frameBounds -----------------------------------------------------------

test('frameBounds targets the center of the bounds', () => {
  const pose = frameBounds(box([-1, -2, -3], [3, 4, 5]), { fovDegrees: 50, aspect: 1.6 });
  nearVec3(pose.target, [1, 1, 1]);
});

test('frameBounds pulls the camera farther for a bigger box', () => {
  const opts = { fovDegrees: 50, aspect: 1.6 };
  const small = frameBounds(box([-1, -1, -1], [1, 1, 1]), opts);
  const big = frameBounds(box([-10, -10, -10], [10, 10, 10]), opts);
  const dSmall = dist(small.position, small.target);
  const dBig = dist(big.position, big.target);
  assert.ok(dBig > dSmall, `bigger box should be farther: ${dBig} vs ${dSmall}`);
  // Ten times the radius => ten times the framing distance (same direction).
  near(dBig, dSmall * 10, 1e-6);
});

test('frameBounds keeps horizontal content in frame as aspect widens', () => {
  const b = box([-1, -1, -1], [1, 1, 1]);
  const dAt = (aspect: number) => {
    const pose = frameBounds(b, { fovDegrees: 50, aspect });
    return dist(pose.position, pose.target);
  };
  // Narrower (portrait) aspects need at least as much distance to avoid
  // clipping horizontally; distance is non-increasing as aspect widens.
  const dNarrow = dAt(0.5);
  const dSquare = dAt(1);
  const dWide = dAt(2);
  assert.ok(dNarrow >= dSquare, `portrait should not be closer: ${dNarrow} vs ${dSquare}`);
  assert.ok(dSquare >= dWide - 1e-9, `wide should stay sufficient: ${dSquare} vs ${dWide}`);
  // Portrait is strictly farther than square (horizontal term dominates).
  assert.ok(dNarrow > dSquare, 'portrait strictly farther than square');
});

test('frameBounds handles aspect <= 0 and zero-size bounds without NaN', () => {
  const zero = frameBounds(box([2, 2, 2], [2, 2, 2]), { fovDegrees: 50, aspect: 0 });
  for (const v of [...zero.position, ...zero.target]) assert.ok(Number.isFinite(v));
  nearVec3(zero.target, [2, 2, 2]);
  // Degenerate bounds still push the camera off the target (fallback radius).
  assert.ok(dist(zero.position, zero.target) > 0);

  const negAspect = frameBounds(box([-1, -1, -1], [1, 1, 1]), { fovDegrees: 50, aspect: -3 });
  for (const v of [...negAspect.position, ...negAspect.target]) assert.ok(Number.isFinite(v));
});

test('frameBounds applies a custom direction (normalized)', () => {
  const pose = frameBounds(box([-1, -1, -1], [1, 1, 1]), {
    fovDegrees: 50,
    aspect: 1,
    direction: [0, 0, 5], // non-unit; should be normalized to +Z
  });
  const d = dist(pose.position, pose.target);
  nearVec3(pose.position, [0, 0, d], 1e-9);
});

// --- lerpPose --------------------------------------------------------------

const A: CameraPose = { position: [0, 0, 0], target: [1, 1, 1] };
const B: CameraPose = { position: [10, 20, 30], target: [-1, -1, -1] };

test('lerpPose returns endpoints at t=0 and t=1', () => {
  nearVec3(lerpPose(A, B, 0).position, A.position);
  nearVec3(lerpPose(A, B, 0).target, A.target);
  nearVec3(lerpPose(A, B, 1).position, B.position);
  nearVec3(lerpPose(A, B, 1).target, B.target);
});

test('lerpPose blends at the midpoint', () => {
  const mid = lerpPose(A, B, 0.5);
  nearVec3(mid.position, [5, 10, 15]);
  nearVec3(mid.target, [0, 0, 0]);
});

test('lerpPose clamps t outside [0, 1]', () => {
  nearVec3(lerpPose(A, B, -2).position, A.position);
  nearVec3(lerpPose(A, B, 5).position, B.position);
});

// --- easeInOutCubic --------------------------------------------------------

test('easeInOutCubic hits its endpoints and is symmetric about 0.5', () => {
  near(easeInOutCubic(0), 0);
  near(easeInOutCubic(1), 1);
  near(easeInOutCubic(0.5), 0.5);
  // Symmetry: f(t) + f(1 - t) === 1.
  for (const t of [0.1, 0.25, 0.37, 0.8]) {
    near(easeInOutCubic(t) + easeInOutCubic(1 - t), 1);
  }
  // Clamps outside the unit interval.
  near(easeInOutCubic(-1), 0);
  near(easeInOutCubic(2), 1);
});

// --- saved views -----------------------------------------------------------

const pose = (p: Vec3, t: Vec3): CameraPose => ({ position: p, target: t });

test('saved views: save, get, delete, and sorted listing', () => {
  let store = createSavedViews();
  assert.deepEqual(listViewNames(store), []);

  store = saveView(store, 'front', pose([0, 0, 5], [0, 0, 0]));
  store = saveView(store, 'top', pose([0, 5, 0], [0, 0, 0]));
  store = saveView(store, 'angle', pose([3, 3, 3], [0, 0, 0]));

  assert.deepEqual(listViewNames(store), ['angle', 'front', 'top']);
  nearVec3(getView(store, 'front')!.position, [0, 0, 5]);
  assert.equal(getView(store, 'missing'), undefined);

  store = deleteView(store, 'front');
  assert.deepEqual(listViewNames(store), ['angle', 'top']);
  assert.equal(getView(store, 'front'), undefined);
  // Deleting an absent name is a harmless no-op.
  const same = deleteView(store, 'nope');
  assert.deepEqual(listViewNames(same), ['angle', 'top']);
});

test('saveView replaces a same-name view and is immutable', () => {
  const first = saveView(createSavedViews(), 'v', pose([1, 1, 1], [0, 0, 0]));
  const second = saveView(first, 'v', pose([9, 9, 9], [0, 0, 0]));
  assert.equal(listViewNames(second).length, 1);
  nearVec3(getView(second, 'v')!.position, [9, 9, 9]);
  // Original store is untouched (returns new store).
  nearVec3(getView(first, 'v')!.position, [1, 1, 1]);
});

// --- serialize / deserialize ----------------------------------------------

test('serialize/deserialize round-trips a store', () => {
  let store = createSavedViews();
  store = saveView(store, 'a', pose([1, 2, 3], [4, 5, 6]));
  store = saveView(store, 'b', pose([-1, -2, -3], [0, 0, 0]));

  const json = JSON.parse(JSON.stringify(serializeSavedViews(store)));
  const back = deserializeSavedViews(json);
  assert.deepEqual(listViewNames(back), ['a', 'b']);
  nearVec3(getView(back, 'a')!.position, [1, 2, 3]);
  nearVec3(getView(back, 'a')!.target, [4, 5, 6]);
  nearVec3(getView(back, 'b')!.position, [-1, -2, -3]);
});

test('deserializeSavedViews tolerates malformed input', () => {
  for (const bad of [null, undefined, 42, 'nope', [], {}, { views: null }, { views: 7 }]) {
    const s = deserializeSavedViews(bad as unknown);
    assert.equal(s.version, 1);
    assert.deepEqual(listViewNames(s), []);
  }
});

test('deserializeSavedViews drops invalid poses but keeps valid ones', () => {
  const input = {
    version: 1,
    views: {
      good: { position: [1, 2, 3], target: [0, 0, 0] },
      shortPos: { position: [1, 2], target: [0, 0, 0] },
      nanTarget: { position: [1, 2, 3], target: [0, NaN, 0] },
      stringNums: { position: ['1', '2', '3'], target: [0, 0, 0] },
      missingTarget: { position: [1, 2, 3] },
      notAnObject: 5,
      alsoGood: { position: [7, 8, 9], target: [1, 1, 1] },
    },
  };
  const s = deserializeSavedViews(input);
  assert.deepEqual(listViewNames(s), ['alsoGood', 'good']);
  nearVec3(getView(s, 'good')!.position, [1, 2, 3]);
  nearVec3(getView(s, 'alsoGood')!.target, [1, 1, 1]);
});
