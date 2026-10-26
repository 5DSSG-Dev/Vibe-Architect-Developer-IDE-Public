import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ApothecaryItem } from '../engine/relationEngine';
import { gltfModelCache, setupGltfLoaderRenderer } from './gltfLoaderService';
import { modelKeyForItem } from './meshBuilders';

/**
 * Shared offscreen renderer for Apothecary catalogue thumbnails.
 *
 * Browsers cap concurrent WebGL contexts (commonly ~16), and the main scene
 * already holds one — so giving every catalogue card its own renderer would
 * start evicting contexts as the list grows. Instead a single 128px renderer
 * draws one model at a time and each card blits the result into its own 2D
 * canvas with drawImage.
 */

const SIZE = 128;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let holder: THREE.Group | null = null;
let ready = false;
let warned = false;

function init(): boolean {
  if (ready) return renderer !== null;
  ready = true;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (err) {
    console.warn('[THUMBNAIL] WebGL unavailable, falling back to wireframes:', err);
    renderer = null;
    return false;
  }

  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ReinhardToneMapping;

  // The loader holds the first load until some renderer registers, so KTX2 can
  // detect supported formats. Register ours too — otherwise thumbnails deadlock
  // whenever the drawer is open without the 3D canvas mounted.
  setupGltfLoaderRenderer(renderer);

  scene = new THREE.Scene();

  // Same reasoning as the main scene: these models are metallic, and metal shows
  // reflected environment rather than diffuse light. Without an envMap they
  // render as black silhouettes.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.PointLight(0x00f3ff, 12, 12);
  key.position.set(2.2, 2.4, 3.2);
  scene.add(key);
  const rim = new THREE.PointLight(0xa855f7, 8, 12);
  rim.position.set(-2.6, -1.6, -2.2);
  scene.add(rim);

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 3.15);
  camera.lookAt(0, 0, 0);

  holder = new THREE.Group();
  scene.add(holder);

  return true;
}

/** Maps a catalogue item to the model that represents it in 3D. */
export function thumbnailModelKey(item: ApothecaryItem): string {
  return modelKeyForItem(item);
}

/**
 * Fitted-clone cache, keyed by modelKey. The clone, its Box3 refit, recenter and
 * uniform scale never change frame-to-frame — only the rotation does — so this
 * work is done exactly ONCE per model and reused on every subsequent render.
 * Before this cache the per-card animation loops re-cloned and re-fitted every
 * source model on every frame.
 */
const fittedCache = new Map<string, THREE.Group>();

/**
 * Returns the cached fitted group for a model, building it on first request, or
 * null while the source model has not loaded yet. A fitted group is never cached
 * until its source exists, so callers keep the wireframe fallback until then.
 */
function getFittedModel(modelKey: string): THREE.Group | null {
  const cached = fittedCache.get(modelKey);
  if (cached) return cached;

  const source = gltfModelCache.get(modelKey);
  if (!source) {
    // Quiet while the cache is still filling — that's the normal startup state.
    // Only complain if other models arrived and this key genuinely has no match.
    if (!warned && gltfModelCache.size > 0) {
      warned = true;
      console.warn(`[THUMBNAIL] no model for "${modelKey}". cached:`, [...gltfModelCache.keys()]);
    }
    return null;
  }

  const model = source.clone(true);

  // Normalise: the models are authored around 1 unit but not identically, so fit
  // each to the same on-screen size instead of trusting the source scale.
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const extent = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);

  const fitted = new THREE.Group();
  fitted.add(model);
  fitted.scale.setScalar(1.85 / extent);

  fittedCache.set(modelKey, fitted);
  return fitted;
}

/**
 * True once a model can be drawn as a real GLB thumbnail (its fitted clone is
 * cached, or its source has loaded and only needs one fit). Cards use this to
 * stop polling for a model that has arrived.
 */
export function isThumbnailReady(modelKey: string): boolean {
  return fittedCache.has(modelKey) || gltfModelCache.has(modelKey);
}

/**
 * Renders one model at the given rotation and returns the shared canvas, or null
 * if the model has not loaded yet (callers fall back to the wireframe thumbnail).
 *
 * This is a single static-frame render: the clone/fit/recenter/scale is cached
 * (see getFittedModel), so the per-frame path here only sets the rotation and
 * draws. Call it once for a static thumbnail, or repeatedly for animation.
 */
export function renderThumbnail(modelKey: string, rotationY: number, rotationX: number): HTMLCanvasElement | null {
  // init() before the cache check: it registers the renderer that unblocks
  // loading in the first place.
  if (!init() || !renderer || !scene || !camera || !holder) {
    if (!warned) { warned = true; console.warn('[THUMBNAIL] studio init failed'); }
    return null;
  }

  const fitted = getFittedModel(modelKey);
  if (!fitted) return null;

  holder.clear();
  fitted.rotation.y = rotationY;
  fitted.rotation.x = rotationX;
  holder.add(fitted);

  renderer.render(scene, camera);
  return renderer.domElement;
}

export function disposeThumbnailStudio() {
  holder?.clear();
  fittedCache.clear();
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  holder = null;
  ready = false;
}
