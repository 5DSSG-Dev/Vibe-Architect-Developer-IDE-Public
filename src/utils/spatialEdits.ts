/**
 * spatialEdits — pure data model for durable per-object spatial edits.
 *
 * The 3D scene lets the user drag objects (the CORE crystal, docked orb
 * groups). A drag produces a {@link TransformOverride} keyed by a stable
 * `objectKey`; this module stores those overrides immutably with undo/redo and
 * knows how to (de)serialize them for persistence, so an edit survives a
 * rebuild/reload instead of snapping back.
 *
 * This file is deliberately pure TypeScript: NO three.js, NO DOM, NO React —
 * just numbers and plain objects, so it runs under `tsx --test`.
 */

/** A 3D vector, immutable. */
export type Vec3 = readonly [number, number, number];

/**
 * A per-object transform override. Every field is optional; an absent field
 * means "fall back to the object's base transform".
 *
 * - `position`  — absolute world position.
 * - `rotationY` — Y-axis rotation in radians (the scene turntables on Y only).
 * - `scale`     — uniform scale factor (must be > 0 to be considered valid).
 */
export interface TransformOverride {
  position?: Vec3;
  rotationY?: number;
  scale?: number;
}

/** JSON-safe persistence snapshot. History is intentionally excluded. */
export interface SpatialEditsSnapshot {
  version: 1;
  overrides: Record<string, TransformOverride>;
}

/**
 * Immutable spatial-edits state.
 *
 * `overrides` is the current map. `undoStack`/`redoStack` hold prior/next
 * override-maps so undo→redo round-trips exactly. Treat every field as
 * read-only; all mutating helpers return a brand-new object.
 */
export interface SpatialEdits {
  readonly overrides: Readonly<Record<string, TransformOverride>>;
  readonly undoStack: readonly Readonly<Record<string, TransformOverride>>[];
  readonly redoStack: readonly Readonly<Record<string, TransformOverride>>[];
}

/**
 * Maximum number of history entries kept on the undo stack. Older entries are
 * dropped once this cap is exceeded, so memory stays bounded during a long
 * editing session. The redo stack is naturally bounded by the undo stack.
 */
export const UNDO_HISTORY_CAP = 100;

const SNAPSHOT_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    isFiniteNumber(value[2])
  );
}

/** Deep-clone one override into a fresh, field-validated plain object. */
function cloneOverride(o: TransformOverride): TransformOverride {
  const out: TransformOverride = {};
  if (o.position !== undefined) {
    out.position = [o.position[0], o.position[1], o.position[2]];
  }
  if (o.rotationY !== undefined) out.rotationY = o.rotationY;
  if (o.scale !== undefined) out.scale = o.scale;
  return out;
}

/** Deep-clone a whole override map. */
function cloneMap(
  map: Readonly<Record<string, TransformOverride>>,
): Record<string, TransformOverride> {
  const out: Record<string, TransformOverride> = {};
  for (const key of Object.keys(map)) out[key] = cloneOverride(map[key]);
  return out;
}

/**
 * Sanitize an arbitrary override candidate, keeping only valid fields.
 * Returns undefined when nothing valid remains (so callers can decide whether
 * to store an empty override or skip it).
 *
 * A `scale` must be a positive finite number to survive.
 */
function sanitizeOverride(value: unknown): TransformOverride | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const src = value as Record<string, unknown>;
  const out: TransformOverride = {};
  let any = false;

  if ('position' in src) {
    if (!isVec3(src.position)) return undefined;
    out.position = [src.position[0], src.position[1], src.position[2]];
    any = true;
  }
  if ('rotationY' in src) {
    if (!isFiniteNumber(src.rotationY)) return undefined;
    out.rotationY = src.rotationY;
    any = true;
  }
  if ('scale' in src) {
    if (!isFiniteNumber(src.scale) || src.scale <= 0) return undefined;
    out.scale = src.scale;
    any = true;
  }

  return any ? out : {};
}

/**
 * Build the next state: `nextOverrides` becomes current, the previous map is
 * pushed onto undo (capped), and redo is cleared. Used by every mutating op.
 */
function commit(
  state: SpatialEdits,
  nextOverrides: Record<string, TransformOverride>,
): SpatialEdits {
  const undoStack = [...state.undoStack, state.overrides];
  // Cap the history: drop the oldest entries beyond the cap.
  const capped =
    undoStack.length > UNDO_HISTORY_CAP
      ? undoStack.slice(undoStack.length - UNDO_HISTORY_CAP)
      : undoStack;
  return {
    overrides: nextOverrides,
    undoStack: capped,
    redoStack: [],
  };
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Create a fresh spatial-edits state, optionally seeded with overrides. */
export function createSpatialEdits(
  initial?: Record<string, TransformOverride>,
): SpatialEdits {
  return {
    overrides: initial ? cloneMap(initial) : {},
    undoStack: [],
    redoStack: [],
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Read the current override for a key, or undefined if none. */
export function getOverride(
  state: SpatialEdits,
  objectKey: string,
): TransformOverride | undefined {
  const o = state.overrides[objectKey];
  return o === undefined ? undefined : cloneOverride(o);
}

export function canUndo(state: SpatialEdits): boolean {
  return state.undoStack.length > 0;
}

export function canRedo(state: SpatialEdits): boolean {
  return state.redoStack.length > 0;
}

// ---------------------------------------------------------------------------
// Mutations (each returns a new immutable state)
// ---------------------------------------------------------------------------

/**
 * Set (merge) the override for a key.
 *
 * Merge semantics: fields present in `override` overwrite the corresponding
 * fields of any existing override for the key; fields ABSENT from `override`
 * are left untouched. So `setOverride(s, k, { position })` updates only the
 * position and keeps a previously-set rotationY/scale. To remove a field,
 * clear the whole key with {@link clearOverride}.
 *
 * Pushes the previous state onto undo and clears redo.
 */
export function setOverride(
  state: SpatialEdits,
  objectKey: string,
  override: TransformOverride,
): SpatialEdits {
  const next = cloneMap(state.overrides);
  const merged = cloneOverride(next[objectKey] ?? {});
  if (override.position !== undefined) {
    merged.position = [
      override.position[0],
      override.position[1],
      override.position[2],
    ];
  }
  if (override.rotationY !== undefined) merged.rotationY = override.rotationY;
  if (override.scale !== undefined) merged.scale = override.scale;
  next[objectKey] = merged;
  return commit(state, next);
}

/** Remove one key's override (undoable). No-op state change if key absent. */
export function clearOverride(
  state: SpatialEdits,
  objectKey: string,
): SpatialEdits {
  const next = cloneMap(state.overrides);
  delete next[objectKey];
  return commit(state, next);
}

/** Remove all overrides (undoable) — the "reset" action. */
export function clearAll(state: SpatialEdits): SpatialEdits {
  return commit(state, {});
}

/**
 * Undo the most recent mutation. Returns the same reference when there is
 * nothing to undo.
 */
export function undo(state: SpatialEdits): SpatialEdits {
  if (state.undoStack.length === 0) return state;
  const previous = state.undoStack[state.undoStack.length - 1];
  return {
    overrides: previous,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, state.overrides],
  };
}

/**
 * Redo the most recently undone mutation. Returns the same reference when
 * there is nothing to redo.
 */
export function redo(state: SpatialEdits): SpatialEdits {
  if (state.redoStack.length === 0) return state;
  const nextOverrides = state.redoStack[state.redoStack.length - 1];
  return {
    overrides: nextOverrides,
    undoStack: [...state.undoStack, state.overrides],
    redoStack: state.redoStack.slice(0, -1),
  };
}

// ---------------------------------------------------------------------------
// Snapping helpers (pure functions, not state)
// ---------------------------------------------------------------------------

/**
 * Round each axis to the nearest multiple of `gridSize`. A `gridSize <= 0`
 * (or non-finite) returns `pos` unchanged.
 */
export function snapPositionToGrid(pos: Vec3, gridSize: number): Vec3 {
  if (!isFiniteNumber(gridSize) || gridSize <= 0) return pos;
  return [
    Math.round(pos[0] / gridSize) * gridSize,
    Math.round(pos[1] / gridSize) * gridSize,
    Math.round(pos[2] / gridSize) * gridSize,
  ];
}

/**
 * Snap an angle (radians) to the nearest multiple of `stepDegrees`. A
 * `stepDegrees <= 0` (or non-finite) returns `radians` unchanged. The result
 * is normalized to the half-open interval (-PI, PI].
 */
export function snapAngle(radians: number, stepDegrees: number): number {
  if (!isFiniteNumber(stepDegrees) || stepDegrees <= 0) return radians;
  const step = (stepDegrees * Math.PI) / 180;
  const snapped = Math.round(radians / step) * step;
  return normalizeAngle(snapped);
}

/** Normalize to (-PI, PI]. */
function normalizeAngle(radians: number): number {
  const twoPi = Math.PI * 2;
  // Wrap into [-PI, PI).
  let a = ((radians + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  // Move -PI to +PI so the interval is the half-open (-PI, PI].
  if (a <= -Math.PI) a += twoPi;
  return a;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Produce a JSON-safe snapshot of the current overrides. Undo/redo history is
 * intentionally NOT serialized.
 */
export function serializeSpatialEdits(
  state: SpatialEdits,
): SpatialEditsSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    overrides: cloneMap(state.overrides),
  };
}

/**
 * Rebuild a spatial-edits state from an unknown input (e.g. parsed JSON from
 * localStorage). Tolerant by design: returns an empty state on malformed
 * input (non-object, wrong version, non-object overrides) rather than
 * throwing. Individual override entries that fail validation are dropped;
 * unknown fields on an entry are ignored.
 */
export function deserializeSpatialEdits(input: unknown): SpatialEdits {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return createSpatialEdits();
  }
  const obj = input as Record<string, unknown>;
  if (obj.version !== SNAPSHOT_VERSION) return createSpatialEdits();
  const rawOverrides = obj.overrides;
  if (
    typeof rawOverrides !== 'object' ||
    rawOverrides === null ||
    Array.isArray(rawOverrides)
  ) {
    return createSpatialEdits();
  }

  const overrides: Record<string, TransformOverride> = {};
  const src = rawOverrides as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    const sanitized = sanitizeOverride(src[key]);
    if (sanitized !== undefined) overrides[key] = sanitized;
  }
  return createSpatialEdits(overrides);
}
