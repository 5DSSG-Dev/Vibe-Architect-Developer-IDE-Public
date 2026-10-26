import * as THREE from 'three';
import type { SceneRegistry, SceneRegistryEntry } from './SceneRegistry';

export const ADMIN_PICK_LAYER = 7;

export interface SelectionHit {
  readonly entry: SceneRegistryEntry;
  readonly point: THREE.Vector3;
  readonly distance: number;
}

/** Raycasts only at interaction boundaries and only against registered targets. */
export class SelectionSystem {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pickTargets: THREE.Object3D[] = [];

  constructor(private readonly registry: SceneRegistry, pickLayer = ADMIN_PICK_LAYER) {
    this.raycaster.layers.set(pickLayer);
  }

  refreshPickSet(pickLayer = ADMIN_PICK_LAYER): void {
    this.pickTargets = this.registry.pickTargets();
    for (const target of this.pickTargets) target.traverse((object) => object.layers.enable(pickLayer));
  }

  pick(clientX: number, clientY: number, bounds: DOMRect, camera: THREE.Camera): SelectionHit | null {
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    this.pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, camera);
    const hits = this.raycaster.intersectObjects(this.pickTargets, true);
    for (const hit of hits) {
      const entry = this.registry.resolvePick(hit.object);
      if (entry) return { entry, point: hit.point.clone(), distance: hit.distance };
    }
    return null;
  }

  dispose(): void {
    this.pickTargets = [];
  }
}

