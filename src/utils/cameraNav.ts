// ---------------------------------------------------------------------------
// Saved-camera navigation: pure math + data model for the main CORE view.
//
// The main 3D view uses a perspective camera aimed at the origin. This module
// is the pure logic behind "saved views" navigation:
//   - representing a camera pose (position + target),
//   - framing a bounding box so it fits the perspective frustum,
//   - saving / restoring / listing named views (JSON-serializable), and
//   - interpolating between poses with easing.
//
// The CORE is intentionally PURE: plain number tuples, no three.js, no DOM, no
// React, so it runs under `tsx --test`. Thin THREE adapters live at the bottom
// of this file but are type-only at build time (`import type * as THREE`) and
// are never exercised by the tests, so the test run never loads three.
// ---------------------------------------------------------------------------

import type * as THREE from 'three';

// --- Core types ------------------------------------------------------------

/** A 3D point or direction as an immutable [x, y, z] tuple. */
export type Vec3 = readonly [number, number, number];

/** A camera pose: where the camera sits and what point it looks at. */
export interface CameraPose {
  readonly position: Vec3;
  readonly target: Vec3;
}

/** An axis-aligned bounding box. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

// --- Private vector helpers ------------------------------------------------
// Kept local; only `lerp`/`clamp` semantics are surfaced through public API.

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

/** Normalize a vector; a zero-length vector falls back to +Z so callers always
 *  get a usable viewing direction. */
function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (!(len > 0) || !Number.isFinite(len)) return [0, 0, 1];
  return [a[0] / len, a[1] / len, a[2] / len];
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isVec3(v: unknown): v is Vec3 {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    isFiniteNumber(v[0]) &&
    isFiniteNumber(v[1]) &&
    isFiniteNumber(v[2])
  );
}

// --- Framing ---------------------------------------------------------------

/** Default 3/4 viewing direction (from target toward camera): slightly above
 *  and in front. Normalized once at module load. */
export const DEFAULT_VIEW_DIRECTION: Vec3 = normalize([0, 0.6, 1]);

/** Fallback bounding-sphere radius used when the bounds are degenerate (zero or
 *  non-finite size) so the camera never lands on top of the target. */
const FALLBACK_RADIUS = 0.5;

/**
 * Frame a bounding box so its bounding sphere fits BOTH the vertical and the
 * horizontal field of view of a perspective camera.
 *
 * Fit formula
 * -----------
 *   center = (min + max) / 2
 *   R      = |max - min| / 2            (radius of the bounding sphere)
 *   vfov   = fovDegrees in radians      (vertical fov)
 *   hfov   = 2 * atan( tan(vfov / 2) * aspect )   (horizontal fov from aspect)
 *
 * For a sphere of radius R to be tangent to the top/bottom frustum planes the
 * camera must sit at distance   d = R / sin(fov / 2).  Doing this for both axes
 * and taking the larger keeps the sphere inside both pairs of planes:
 *
 *   distance = paddingFactor * max( R / sin(vfov/2), R / sin(hfov/2) )
 *
 * The camera is then placed at   center + normalize(direction) * distance   and
 * aimed at center. A wider aspect only widens hfov (relaxing the horizontal
 * term), so the distance never drops below what the vertical term requires and
 * horizontal content is never clipped.
 */
export function frameBounds(
  bounds: Bounds,
  opts: {
    fovDegrees: number;
    aspect: number;
    paddingFactor?: number;
    direction?: Vec3;
  },
): CameraPose {
  const center: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];

  // Bounding-sphere radius; guard degenerate / non-finite extents.
  const diagonal = length(sub(bounds.max, bounds.min));
  let radius = diagonal / 2;
  if (!(radius > 0) || !Number.isFinite(radius)) radius = FALLBACK_RADIUS;

  // Guard the fov and aspect against nonsense inputs.
  const fovDeg = opts.fovDegrees > 0 && Number.isFinite(opts.fovDegrees)
    ? opts.fovDegrees
    : 50;
  const aspect = opts.aspect > 0 && Number.isFinite(opts.aspect) ? opts.aspect : 1;
  const padding = opts.paddingFactor && opts.paddingFactor > 0 ? opts.paddingFactor : 1.2;

  const vfov = (fovDeg * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);

  const distVertical = radius / Math.sin(vfov / 2);
  const distHorizontal = radius / Math.sin(hfov / 2);
  const distance = padding * Math.max(distVertical, distHorizontal);

  const dir = normalize(opts.direction ?? DEFAULT_VIEW_DIRECTION);
  const position = add(center, scale(dir, distance));

  return { position, target: center };
}

// --- Interpolation ---------------------------------------------------------

/** Component-wise lerp of two poses; `t` is clamped to [0, 1]. */
export function lerpPose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  const tt = clamp01(t);
  return {
    position: lerpVec3(a.position, b.position, tt),
    target: lerpVec3(a.target, b.target, tt),
  };
}

/** Standard cubic ease-in-out. Maps [0,1] -> [0,1] with 0->0, 1->1, and is
 *  symmetric about (0.5, 0.5). Feed the result into `lerpPose`. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// --- Named-views store (immutable, JSON-serializable) ----------------------

export interface SavedViews {
  readonly version: 1;
  readonly views: Readonly<Record<string, CameraPose>>;
}

/** A fresh, empty store. */
export function createSavedViews(): SavedViews {
  return { version: 1, views: {} };
}

/** Save (or replace) a named view; returns a new store, leaving `store`
 *  untouched. The pose is deep-copied into plain tuples. */
export function saveView(store: SavedViews, name: string, pose: CameraPose): SavedViews {
  return {
    version: 1,
    views: {
      ...store.views,
      [name]: {
        position: [pose.position[0], pose.position[1], pose.position[2]],
        target: [pose.target[0], pose.target[1], pose.target[2]],
      },
    },
  };
}

/** Look up a saved view by name, or `undefined` if absent. */
export function getView(store: SavedViews, name: string): CameraPose | undefined {
  return store.views[name];
}

/** Remove a named view; returns a new store (a no-op copy if absent). */
export function deleteView(store: SavedViews, name: string): SavedViews {
  if (!(name in store.views)) return { version: 1, views: { ...store.views } };
  const next: Record<string, CameraPose> = { ...store.views };
  delete next[name];
  return { version: 1, views: next };
}

/** All saved view names in stable, alphabetically sorted order. */
export function listViewNames(store: SavedViews): string[] {
  return Object.keys(store.views).sort();
}

/** Already plain JSON — returned as-is (a normalized copy) for symmetry with
 *  `deserializeSavedViews`. */
export function serializeSavedViews(store: SavedViews): SavedViews {
  const views: Record<string, CameraPose> = {};
  for (const name of listViewNames(store)) {
    const pose = store.views[name];
    views[name] = {
      position: [pose.position[0], pose.position[1], pose.position[2]],
      target: [pose.target[0], pose.target[1], pose.target[2]],
    };
  }
  return { version: 1, views };
}

/**
 * Tolerantly parse an unknown value into a SavedViews store. Malformed input
 * (non-object, missing `views`, wrong shape) yields an empty store. Individual
 * entries whose pose is not a valid Vec3 position + Vec3 target are dropped
 * rather than failing the whole parse.
 */
export function deserializeSavedViews(input: unknown): SavedViews {
  const empty = createSavedViews();
  if (typeof input !== 'object' || input === null) return empty;

  const rawViews = (input as { views?: unknown }).views;
  if (typeof rawViews !== 'object' || rawViews === null) return empty;

  const views: Record<string, CameraPose> = {};
  for (const [name, value] of Object.entries(rawViews as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const pos = (value as { position?: unknown }).position;
    const tgt = (value as { target?: unknown }).target;
    if (!isVec3(pos) || !isVec3(tgt)) continue;
    views[name] = {
      position: [pos[0], pos[1], pos[2]],
      target: [tgt[0], tgt[1], tgt[2]],
    };
  }
  return { version: 1, views };
}

// --- THREE adapters (type-only imports; NOT covered by the pure tests) -----
//
// These bridge the pure model to live three.js objects. They are written
// defensively but deliberately excluded from the test suite so the tests never
// need three at runtime.

/** Minimal shape of an OrbitControls-like object we read/write. */
interface ControlsLike {
  target: THREE.Vector3;
  update?: () => void;
}

/** Copy a pure pose onto a live camera (and optional controls target). */
export function applyPoseToCamera(
  camera: THREE.PerspectiveCamera | THREE.Camera,
  controls: ControlsLike | null | undefined,
  pose: CameraPose,
): void {
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  if (controls && controls.target) {
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    controls.update?.();
  } else if (typeof (camera as THREE.Camera).lookAt === 'function') {
    (camera as THREE.Camera).lookAt(pose.target[0], pose.target[1], pose.target[2]);
  }
}

/** Read a pure pose out of a live camera (target from controls if present,
 *  else the origin). */
export function poseFromCamera(
  camera: THREE.PerspectiveCamera | THREE.Camera,
  controls: ControlsLike | null | undefined,
): CameraPose {
  const t = controls?.target;
  return {
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: t ? [t.x, t.y, t.z] : [0, 0, 0],
  };
}
