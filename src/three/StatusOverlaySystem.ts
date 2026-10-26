import * as THREE from 'three';
import type { OperationalStatus, SceneSystem, SceneSystemContext } from './contracts';

function overlayMaterial(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
}

function lineMaterial(color: THREE.ColorRepresentation): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
}

export function disposeOwnedOverlay(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const renderable = object as THREE.Mesh | THREE.Line;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) {
      const values = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
      for (const material of values) materials.add(material);
    }
  });
  root.removeFromParent();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function createStatusGlyph(status: OperationalStatus, radius: number): THREE.Group | null {
  const group = new THREE.Group();
  group.name = `status-overlay:${status}`;
  const r = Math.max(0.35, radius);

  if (status === 'contained') {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.18, 16, 10),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        wireframe: true,
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      })
    );
    group.add(shell);
  } else if (status === 'degraded') {
    const material = overlayMaterial(0xffb000);
    for (let index = 0; index < 3; index += 1) {
      const segment = new THREE.Mesh(
        new THREE.TorusGeometry(r * 1.12, Math.max(0.025, r * 0.035), 4, 14, Math.PI * 0.42),
        material
      );
      segment.rotation.z = index * (Math.PI * 2 / 3);
      group.add(segment);
    }
  } else if (status === 'rejected' || status === 'rolled_back') {
    const size = r * 0.82;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-size, -size, 0), new THREE.Vector3(size, size, 0),
      new THREE.Vector3(-size, size, 0), new THREE.Vector3(size, -size, 0)
    ]);
    group.add(new THREE.LineSegments(geometry, lineMaterial(status === 'rejected' ? 0xff2a6d : 0xff7043)));
  } else if (status === 'stale' || status === 'unknown') {
    const material = overlayMaterial(0x8a949f);
    group.add(new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.72, Math.max(0.02, r * 0.025), 4, 24),
      material
    ));
    const hands = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, r * 0.45, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(r * 0.32, 0, 0)
    ]);
    group.add(new THREE.LineSegments(hands, lineMaterial(0x8a949f)));
  } else {
    return null;
  }

  group.traverse((object) => { object.renderOrder = 1000; });
  return group;
}

/**
 * Owns selection and status presentation without touching borrowed GLB
 * geometries or materials. Color is always paired with a distinct shape.
 */
export class StatusOverlaySystem implements SceneSystem {
  readonly id = 'selection-status-overlays';
  readonly writes = ['selection-presentation'] as const;
  private readonly root = new THREE.Group();
  private readonly overlays = new Map<string, THREE.Group>();
  private readonly statuses = new Map<string, OperationalStatus>();
  private selectedId: string | null = null;
  private context: SceneSystemContext | null = null;

  constructor() {
    this.root.name = 'admin-selection-status-overlays';
  }

  attach(context: SceneSystemContext): void {
    if (this.context) throw new Error('StatusOverlaySystem is already attached');
    this.context = context;
    context.scene.add(this.root);
  }

  setSelection(id: string | null): void {
    this.selectedId = id;
    this.refresh();
  }

  setStatus(id: string, status: OperationalStatus | null): void {
    if (status) this.statuses.set(id, status);
    else this.statuses.delete(id);
    this.refreshEntity(id);
    this.context?.requestRender();
  }

  refresh(): void {
    if (!this.context) return;
    const currentIds = new Set(this.context.registry.values().map((entry) => entry.id));
    for (const id of [...this.overlays.keys()]) {
      if (!currentIds.has(id) || (id !== this.selectedId && !this.statuses.has(id))) this.removeOverlay(id);
    }
    for (const entry of this.context.registry.values()) this.refreshEntity(entry.id);
    this.context.requestRender();
  }

  private refreshEntity(id: string): void {
    if (!this.context) return;
    this.removeOverlay(id);
    const entry = this.context.registry.get(id);
    if (!entry) return;
    const status = this.statuses.get(id) ?? entry.status;
    const selected = id === this.selectedId;
    if (!selected && (!status || status === 'nominal' || status === 'queued')) return;
    const bounds = new THREE.Box3().setFromObject(entry.focusTarget);
    if (bounds.isEmpty()) return;
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const overlay = new THREE.Group();
    overlay.name = `overlay:${id}`;
    if (selected) {
      const helper = new THREE.Box3Helper(bounds.clone(), 0x00f3ff);
      const helperMaterial = helper.material as THREE.LineBasicMaterial;
      helperMaterial.depthTest = false;
      helperMaterial.depthWrite = false;
      helperMaterial.transparent = true;
      helperMaterial.opacity = 0.9;
      helper.renderOrder = 1001;
      overlay.add(helper);
    }
    const glyph = status ? createStatusGlyph(status, sphere.radius) : null;
    if (glyph) {
      glyph.position.copy(sphere.center);
      overlay.add(glyph);
    }
    this.root.add(overlay);
    this.overlays.set(id, overlay);
  }

  private removeOverlay(id: string): void {
    const overlay = this.overlays.get(id);
    if (!overlay) return;
    disposeOwnedOverlay(overlay);
    this.overlays.delete(id);
  }

  get overlayCount(): number { return this.overlays.size; }

  dispose(): void {
    for (const id of [...this.overlays.keys()]) this.removeOverlay(id);
    this.statuses.clear();
    this.root.removeFromParent();
    this.context = null;
  }
}
