import * as THREE from 'three';
import type { AssetLease } from '../SharedAssetManager';
import { SharedAssetManager } from '../SharedAssetManager';
import type {
  OperationalStatus,
  SceneNodeFactory,
  TopologyEdgeProjection,
  TopologyNodeProjection,
} from '../contracts';
import type { SceneRegistryEntry } from '../SceneRegistry';
import { stableHash32 } from '../OperationFlowSystem';

const STATUS_COLORS: Record<OperationalStatus, number> = {
  nominal: 0x00f3ff,
  queued: 0x8aa4b8,
  degraded: 0xffb000,
  contained: 0xa855f7,
  rejected: 0xff2a6d,
  rolled_back: 0xff7043,
  stale: 0x77808c,
  unknown: 0x77808c,
};

interface AdminEntryRecord {
  hitTarget: THREE.Mesh;
  visualRoot: THREE.Group;
  lease?: AssetLease<THREE.Group>;
  assetKey?: string;
}

function assetKeyFor(node: TopologyNodeProjection): string | undefined {
  if (node.kind === 'core') return 'coreCrystal';
  if (node.kind === 'portal') return 'portal';
  if (node.kind === 'satellite') return `satelite${(stableHash32(node.id) % 5) + 1}`;
  if (node.kind === 'orb') {
    const variants = ['orb', 'orb2', 'orb3', 'orb4', 'orb5', 'orb6'];
    return variants[stableHash32(node.id) % variants.length];
  }
  return undefined;
}

function fitModel(model: THREE.Object3D, targetSize: number): void {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(targetSize / largest);
  model.position.copy(center).multiplyScalar(-targetSize / largest);
}

function ownedMaterial(color: number, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.32,
    transparent: opacity < 1,
    opacity,
    roughness: 0.32,
    metalness: 0.55,
  });
}

function proceduralVisual(kind: TopologyNodeProjection['kind'], color: number): THREE.Group {
  const group = new THREE.Group();
  group.userData.adminOwned = true;
  let geometry: THREE.BufferGeometry;
  if (kind === 'core') geometry = new THREE.OctahedronGeometry(1.25, 1);
  else if (kind === 'portal') geometry = new THREE.TorusGeometry(0.9, 0.16, 12, 48);
  else if (kind === 'satellite') geometry = new THREE.TetrahedronGeometry(0.55, 1);
  else if (kind === 'umbilical') geometry = new THREE.CapsuleGeometry(0.22, 0.55, 6, 10);
  else geometry = new THREE.IcosahedronGeometry(0.72, 2);
  const mesh = new THREE.Mesh(geometry, ownedMaterial(color));
  mesh.userData.adminOwned = true;
  group.add(mesh);
  if (kind === 'core') {
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.24 }),
    );
    wire.userData.adminOwned = true;
    group.add(wire);
  }
  return group;
}

function disposeOwned(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!object.userData.adminOwned) return;
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  });
}

/** Projects POD nodes while borrowing, never disposing, the Architect GLB cache. */
export class AdminSceneNodeFactory implements SceneNodeFactory {
  private readonly records = new Map<string, AdminEntryRecord>();

  constructor(private readonly assets: SharedAssetManager) {}

  createNode(node: TopologyNodeProjection): SceneRegistryEntry {
    const root = new THREE.Group();
    root.name = `admin-${node.kind}:${node.id}`;
    root.position.fromArray(node.position);
    root.scale.setScalar(node.scale ?? 1);
    const visualRoot = new THREE.Group();
    root.add(visualRoot);
    const hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.48, node.focusRadius ?? 0.8), 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false }),
    );
    hitTarget.userData.adminOwned = true;
    root.add(hitTarget);
    const record: AdminEntryRecord = { hitTarget, visualRoot };
    this.records.set(node.id, record);
    this.installVisual(record, node);
    return {
      id: node.id,
      kind: node.kind,
      root,
      pickTargets: [hitTarget],
      focusTarget: root,
      highlightTargets: [visualRoot],
      statusTargets: [visualRoot],
      parentId: node.parentId,
      status: node.status,
      disposalOwnership: 'system',
      metadata: node.metadata,
    };
  }

  updateNode(entry: SceneRegistryEntry, node: TopologyNodeProjection): void {
    entry.root.position.fromArray(node.position);
    entry.root.scale.setScalar(node.scale ?? 1);
    const record = this.records.get(node.id);
    if (record && !record.lease && assetKeyFor(node) && this.assets.has(assetKeyFor(node)!)) {
      this.installVisual(record, node);
    }
  }

  disposeNode(entry: SceneRegistryEntry): void {
    const record = this.records.get(entry.id);
    if (record) {
      disposeOwned(record.visualRoot);
      record.visualRoot.clear();
      record.lease?.release();
      this.records.delete(entry.id);
    }
    disposeOwned(entry.root);
  }

  createEdge(edge: TopologyEdgeProjection, from: THREE.Object3D, to: THREE.Object3D): THREE.Object3D {
    const object = new THREE.Mesh(
      this.edgeGeometry(from, to),
      new THREE.MeshBasicMaterial({
        color: STATUS_COLORS[edge.status ?? 'unknown'],
        transparent: true,
        opacity: 0.68,
      }),
    );
    object.userData.adminOwned = true;
    object.name = `admin-relation:${edge.id}`;
    return object;
  }

  updateEdge(object: THREE.Object3D, edge: TopologyEdgeProjection, from: THREE.Object3D, to: THREE.Object3D): void {
    const mesh = object as THREE.Mesh;
    mesh.geometry.dispose();
    mesh.geometry = this.edgeGeometry(from, to);
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(STATUS_COLORS[edge.status ?? 'unknown']);
  }

  disposeEdge(object: THREE.Object3D): void {
    disposeOwned(object);
  }

  private installVisual(record: AdminEntryRecord, node: TopologyNodeProjection): void {
    disposeOwned(record.visualRoot);
    record.visualRoot.clear();
    record.lease?.release();
    record.lease = undefined;
    const assetKey = assetKeyFor(node);
    if (assetKey && this.assets.has(assetKey)) {
      const lease = this.assets.acquire<THREE.Group>(assetKey);
      fitModel(lease.value, node.kind === 'core' ? 2.6 : node.kind === 'portal' ? 1.8 : 1.35);
      record.visualRoot.add(lease.value);
      record.lease = lease;
      record.assetKey = assetKey;
      return;
    }
    record.visualRoot.add(proceduralVisual(node.kind, STATUS_COLORS[node.status ?? 'unknown']));
  }

  private edgeGeometry(from: THREE.Object3D, to: THREE.Object3D): THREE.TubeGeometry {
    const start = from.getWorldPosition(new THREE.Vector3());
    const end = to.getWorldPosition(new THREE.Vector3());
    const midpoint = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.28, 0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, midpoint, end]), 16, 0.045, 6, false);
  }
}
