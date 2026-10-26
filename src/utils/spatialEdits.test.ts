import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNDO_HISTORY_CAP,
  canRedo,
  canUndo,
  clearAll,
  clearOverride,
  createSpatialEdits,
  deserializeSpatialEdits,
  getOverride,
  redo,
  serializeSpatialEdits,
  setOverride,
  snapAngle,
  snapPositionToGrid,
  undo,
  type SpatialEdits,
  type Vec3,
} from './spatialEdits.ts';

test('createSpatialEdits starts empty; seeded overrides are cloned', () => {
  const empty = createSpatialEdits();
  assert.equal(Object.keys(empty.overrides).length, 0);
  assert.equal(canUndo(empty), false);
  assert.equal(canRedo(empty), false);

  const seed = { core: { scale: 2 } };
  const seeded = createSpatialEdits(seed);
  assert.deepEqual(getOverride(seeded, 'core'), { scale: 2 });
  // Mutating the seed input must not affect the state (defensive clone).
  seed.core.scale = 99;
  assert.deepEqual(getOverride(seeded, 'core'), { scale: 2 });
});

test('setOverride / getOverride round-trip a full override', () => {
  let s = createSpatialEdits();
  const ov = { position: [1, 2, 3] as Vec3, rotationY: 0.5, scale: 1.5 };
  s = setOverride(s, 'core', ov);
  assert.deepEqual(getOverride(s, 'core'), ov);
  assert.equal(getOverride(s, 'missing'), undefined);
});

test('setOverride merges: partial override keeps other fields', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'orb1', {
    position: [1, 1, 1],
    rotationY: 0.25,
    scale: 2,
  });
  // Update only position; rotationY and scale must survive.
  s = setOverride(s, 'orb1', { position: [5, 6, 7] });
  assert.deepEqual(getOverride(s, 'orb1'), {
    position: [5, 6, 7],
    rotationY: 0.25,
    scale: 2,
  });
  // Update only scale.
  s = setOverride(s, 'orb1', { scale: 3 });
  assert.deepEqual(getOverride(s, 'orb1'), {
    position: [5, 6, 7],
    rotationY: 0.25,
    scale: 3,
  });
});

test('getOverride returns a copy — callers cannot mutate internal state', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'core', { position: [1, 2, 3] });
  const got = getOverride(s, 'core')!;
  (got.position as unknown as number[])[0] = 999;
  assert.deepEqual(getOverride(s, 'core'), { position: [1, 2, 3] });
});

test('clearOverride removes a single key (undoable)', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'a', { scale: 2 });
  s = setOverride(s, 'b', { scale: 3 });
  s = clearOverride(s, 'a');
  assert.equal(getOverride(s, 'a'), undefined);
  assert.deepEqual(getOverride(s, 'b'), { scale: 3 });
});

test('clearAll removes everything (undoable reset)', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'a', { scale: 2 });
  s = setOverride(s, 'b', { scale: 3 });
  s = clearAll(s);
  assert.equal(Object.keys(s.overrides).length, 0);
  assert.equal(canUndo(s), true);
});

test('undo/redo round-trip exactly across set/clear/clearAll', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'a', { position: [1, 0, 0] }); // state A
  s = setOverride(s, 'b', { scale: 2 }); // state B
  s = clearOverride(s, 'a'); // state C
  s = clearAll(s); // state D (empty)

  assert.equal(Object.keys(s.overrides).length, 0);

  // Undo D -> C
  s = undo(s);
  assert.equal(getOverride(s, 'a'), undefined);
  assert.deepEqual(getOverride(s, 'b'), { scale: 2 });
  // Undo C -> B
  s = undo(s);
  assert.deepEqual(getOverride(s, 'a'), { position: [1, 0, 0] });
  assert.deepEqual(getOverride(s, 'b'), { scale: 2 });
  // Undo B -> A
  s = undo(s);
  assert.deepEqual(getOverride(s, 'a'), { position: [1, 0, 0] });
  assert.equal(getOverride(s, 'b'), undefined);
  // Undo A -> empty
  s = undo(s);
  assert.equal(Object.keys(s.overrides).length, 0);
  assert.equal(canUndo(s), false);

  // Redo all the way forward back to D.
  s = redo(s); // -> A
  assert.deepEqual(getOverride(s, 'a'), { position: [1, 0, 0] });
  s = redo(s); // -> B
  assert.deepEqual(getOverride(s, 'b'), { scale: 2 });
  s = redo(s); // -> C
  assert.equal(getOverride(s, 'a'), undefined);
  s = redo(s); // -> D
  assert.equal(Object.keys(s.overrides).length, 0);
  assert.equal(canRedo(s), false);
});

test('a new edit after undo clears the redo stack', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'a', { scale: 1 });
  s = setOverride(s, 'a', { scale: 2 });
  s = undo(s); // back to scale 1, redo now available
  assert.equal(canRedo(s), true);
  s = setOverride(s, 'a', { scale: 5 }); // new edit
  assert.equal(canRedo(s), false);
  // Redo is a no-op now.
  const before = s;
  s = redo(s);
  assert.equal(s, before);
  assert.deepEqual(getOverride(s, 'a'), { scale: 5 });
});

test('undo/redo on empty stacks are no-ops (return same reference)', () => {
  const s = createSpatialEdits();
  assert.equal(undo(s), s);
  assert.equal(redo(s), s);
  assert.equal(canUndo(s), false);
  assert.equal(canRedo(s), false);
});

test('undo history is bounded by UNDO_HISTORY_CAP', () => {
  let s = createSpatialEdits();
  const ops = UNDO_HISTORY_CAP + 25;
  for (let i = 0; i < ops; i++) {
    s = setOverride(s, 'a', { scale: i + 1 });
  }
  assert.equal(s.undoStack.length, UNDO_HISTORY_CAP);
  // We can undo at most CAP times; state remains coherent throughout.
  let undos = 0;
  while (canUndo(s)) {
    s = undo(s);
    undos++;
  }
  assert.equal(undos, UNDO_HISTORY_CAP);
});

test('snapPositionToGrid rounds each axis; guards gridSize <= 0', () => {
  assert.deepEqual(snapPositionToGrid([0.4, 0.6, 1.49], 1), [0, 1, 1]);
  assert.deepEqual(snapPositionToGrid([1.2, 2.7, -3.4], 0.5), [1, 2.5, -3.5]);
  const pos: Vec3 = [1.23, 4.56, 7.89];
  assert.equal(snapPositionToGrid(pos, 0), pos);
  assert.equal(snapPositionToGrid(pos, -2), pos);
});

test('snapAngle snaps to step; guards step <= 0; normalizes to (-PI, PI]', () => {
  const d2r = (d: number) => (d * Math.PI) / 180;
  // 44 deg snaps to 45 deg with a 45-deg step.
  assert.ok(Math.abs(snapAngle(d2r(44), 45) - d2r(45)) < 1e-9);
  // 10 deg snaps to 0 with a 90-deg step.
  assert.ok(Math.abs(snapAngle(d2r(10), 90) - 0) < 1e-9);
  // Guard: step <= 0 returns input unchanged.
  const a = d2r(37);
  assert.equal(snapAngle(a, 0), a);
  assert.equal(snapAngle(a, -90), a);
  // Normalization: 350 deg -> -10 deg (inside (-PI, PI]).
  assert.ok(Math.abs(snapAngle(d2r(350), 10) - d2r(-10)) < 1e-9);
  // 180 deg stays +PI (upper bound included).
  assert.ok(Math.abs(snapAngle(d2r(180), 180) - Math.PI) < 1e-9);
  // 540 deg (=180) also maps to +PI, not -PI.
  assert.ok(Math.abs(snapAngle(d2r(540), 180) - Math.PI) < 1e-9);
});

test('serializeSpatialEdits omits history and is JSON-safe', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'core', { position: [1, 2, 3], scale: 2 });
  s = setOverride(s, 'core', { rotationY: 0.5 });
  const snap = serializeSpatialEdits(s);
  assert.equal(snap.version, 1);
  assert.deepEqual(snap.overrides, {
    core: { position: [1, 2, 3], scale: 2, rotationY: 0.5 },
  });
  // No history keys leak into the snapshot.
  assert.deepEqual(Object.keys(snap).sort(), ['overrides', 'version']);
  // Round-trips through JSON unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(snap)), snap);
});

test('deserializeSpatialEdits round-trips valid input with fresh history', () => {
  let s = createSpatialEdits();
  s = setOverride(s, 'a', { position: [1, 2, 3] });
  s = setOverride(s, 'b', { rotationY: 1, scale: 4 });
  const snap = serializeSpatialEdits(s);
  const restored = deserializeSpatialEdits(JSON.parse(JSON.stringify(snap)));
  assert.deepEqual(getOverride(restored, 'a'), { position: [1, 2, 3] });
  assert.deepEqual(getOverride(restored, 'b'), { rotationY: 1, scale: 4 });
  // History is not restored.
  assert.equal(canUndo(restored), false);
  assert.equal(canRedo(restored), false);
});

test('deserializeSpatialEdits tolerates malformed input (returns empty)', () => {
  const cases: unknown[] = [
    null,
    undefined,
    42,
    'nope',
    [],
    {},
    { version: 2, overrides: { a: { scale: 1 } } }, // wrong version
    { version: 1 }, // missing overrides
    { version: 1, overrides: null },
    { version: 1, overrides: [] },
    { version: 1, overrides: 'x' },
  ];
  for (const input of cases) {
    const s = deserializeSpatialEdits(input);
    assert.equal(Object.keys(s.overrides).length, 0, `input: ${JSON.stringify(input)}`);
    assert.equal(canUndo(s), false);
  }
});

test('deserializeSpatialEdits drops bad entries and ignores unknown fields', () => {
  const input = {
    version: 1,
    overrides: {
      good: { position: [1, 2, 3], junk: 'ignored' },
      badVec: { position: [1, 2] }, // wrong length -> dropped
      badVec2: { position: [1, 'x', 3] }, // non-number -> dropped
      nanRot: { rotationY: Number.NaN }, // non-finite -> dropped
      negScale: { scale: -1 }, // non-positive -> dropped
      zeroScale: { scale: 0 }, // non-positive -> dropped
      infPos: { position: [1, Infinity, 3] }, // non-finite -> dropped
      okScale: { scale: 2 },
    },
  };
  const s = deserializeSpatialEdits(input);
  assert.deepEqual(getOverride(s, 'good'), { position: [1, 2, 3] });
  assert.deepEqual(getOverride(s, 'okScale'), { scale: 2 });
  assert.equal(getOverride(s, 'badVec'), undefined);
  assert.equal(getOverride(s, 'badVec2'), undefined);
  assert.equal(getOverride(s, 'nanRot'), undefined);
  assert.equal(getOverride(s, 'negScale'), undefined);
  assert.equal(getOverride(s, 'zeroScale'), undefined);
  assert.equal(getOverride(s, 'infPos'), undefined);
});

test('immutability: operations never mutate the prior state object', () => {
  const s0 = createSpatialEdits();
  const s1 = setOverride(s0, 'a', { scale: 2 });
  // s0 untouched.
  assert.equal(Object.keys(s0.overrides).length, 0);
  assert.equal(s0.undoStack.length, 0);
  assert.notEqual(s0, s1);

  const s2 = setOverride(s1, 'a', { scale: 3 });
  // s1 untouched: still scale 2, and its stacks are unchanged.
  assert.deepEqual(getOverride(s1, 'a'), { scale: 2 });
  const s1UndoLen = s1.undoStack.length;

  const s3 = undo(s2);
  // undo did not mutate s2.
  assert.deepEqual(getOverride(s2, 'a'), { scale: 3 });
  assert.equal(s1.undoStack.length, s1UndoLen);
  assert.deepEqual(getOverride(s3, 'a'), { scale: 2 });
});

test('SpatialEdits type is usable as a value annotation', () => {
  const s: SpatialEdits = createSpatialEdits();
  assert.ok(s.overrides);
});
