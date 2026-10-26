import type * as THREE from 'three';

/** Safe boundary for Aether or other shared environment systems. */
export interface RuntimeSceneAdapter {
  readonly renderPolicy?: { readonly mode: 'on-demand' } | { readonly mode: 'cadence'; readonly framesPerSecond: number };
  setSize(width: number, height: number, pixelRatio: number): void;
  update(elapsedSeconds: number): void;
  setReducedMotion?(reducedMotion: boolean): void;
  dispose(): void;
}

export interface AetherLike {
  setSize(width: number, height: number): void;
  update(elapsedSeconds: number): void;
}

/** Existing Aether has no public disposer, so integration must provide one explicitly. */
export function adaptAether(
  aether: AetherLike,
  disposeAether: () => void,
  framesPerSecond = 12
): RuntimeSceneAdapter {
  let reducedMotion = false;
  return {
    renderPolicy: framesPerSecond > 0
      ? { mode: 'cadence', framesPerSecond }
      : { mode: 'on-demand' },
    setSize: (width, height) => aether.setSize(width, height),
    update: (elapsedSeconds) => { if (!reducedMotion) aether.update(elapsedSeconds); },
    setReducedMotion: (value) => { reducedMotion = value; },
    dispose: disposeAether
  };
}

/**
 * Constructs an environment system inside the runtime scene and captures only
 * the roots it adds. This is the safe bridge for the current Aether class,
 * whose public API does not yet expose dispose().
 */
export function createSceneOwnedAdapter<T extends AetherLike>(
  scene: THREE.Scene,
  create: () => T,
  framesPerSecond = 12
): RuntimeSceneAdapter {
  const existing = new Set(scene.children);
  const system = create();
  const ownedRoots = scene.children.filter((child) => !existing.has(child));
  return adaptAether(system, () => {
    for (const root of ownedRoots) detachAndDisposeObject(root);
  }, framesPerSecond);
}

export function detachAndDisposeObject(root: THREE.Object3D): void {
  root.removeFromParent();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material?.dispose();
  });
}
