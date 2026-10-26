import * as THREE from 'three';
import type { OperationalStatus, SceneEntityKind } from './contracts';

export type DisposalOwnership = 'system' | 'asset-manager' | 'external';

export interface SceneRegistryEntry {
  readonly id: string;
  readonly kind: SceneEntityKind;
  readonly root: THREE.Object3D;
  readonly pickTargets: readonly THREE.Object3D[];
  readonly focusTarget: THREE.Object3D;
  readonly highlightTargets: readonly THREE.Object3D[];
  readonly statusTargets: readonly THREE.Object3D[];
  parentId?: string;
  status?: OperationalStatus;
  readonly disposalOwnership: DisposalOwnership;
  metadata?: Readonly<Record<string, unknown>>;
}

export class SceneRegistry {
  private readonly entries = new Map<string, SceneRegistryEntry>();
  private readonly pickTargetIds = new Map<string, string>();

  register(entry: SceneRegistryEntry): void {
    if (this.entries.has(entry.id)) throw new Error(`Scene entity already registered: ${entry.id}`);
    this.entries.set(entry.id, entry);
    for (const target of entry.pickTargets) {
      target.traverse((object) => this.pickTargetIds.set(object.uuid, entry.id));
    }
  }

  replace(entry: SceneRegistryEntry): void {
    this.unregister(entry.id);
    this.register(entry);
  }

  unregister(id: string): SceneRegistryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    for (const target of entry.pickTargets) {
      target.traverse((object) => this.pickTargetIds.delete(object.uuid));
    }
    this.entries.delete(id);
    return entry;
  }

  get(id: string): SceneRegistryEntry | undefined {
    return this.entries.get(id);
  }

  resolvePick(object: THREE.Object3D): SceneRegistryEntry | undefined {
    let current: THREE.Object3D | null = object;
    while (current) {
      const id = this.pickTargetIds.get(current.uuid);
      if (id) return this.entries.get(id);
      current = current.parent;
    }
    return undefined;
  }

  pickTargets(): THREE.Object3D[] {
    return [...this.entries.values()].flatMap((entry) => [...entry.pickTargets]);
  }

  values(): readonly SceneRegistryEntry[] {
    return [...this.entries.values()];
  }

  clear(): void {
    this.entries.clear();
    this.pickTargetIds.clear();
  }
}
