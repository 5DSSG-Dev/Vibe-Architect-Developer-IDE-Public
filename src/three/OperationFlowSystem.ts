import * as THREE from 'three';
import type { OperationProjection, OperationalStatus, RuntimeFrameContext, SceneSystem, SceneSystemContext } from './contracts';

export const DEFAULT_OPERATION_CAPACITY = 128;

export function stableHash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function operationProgress(operation: OperationProjection, replayTimeMs: number): number {
  if (operation.durationMs <= 0) return replayTimeMs >= operation.startedAtMs ? 1 : 0;
  return THREE.MathUtils.clamp(
    (replayTimeMs - operation.startedAtMs) / operation.durationMs,
    0,
    1
  );
}

export function sampleRoute(
  route: readonly (readonly [number, number, number])[],
  progress: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  if (route.length === 0) return target.set(0, 0, 0);
  if (route.length === 1) return target.fromArray(route[0]);
  const lengths: number[] = [0];
  let total = 0;
  for (let index = 1; index < route.length; index += 1) {
    total += new THREE.Vector3().fromArray(route[index - 1]).distanceTo(new THREE.Vector3().fromArray(route[index]));
    lengths.push(total);
  }
  if (total === 0) return target.fromArray(route[0]);
  const distance = THREE.MathUtils.clamp(progress, 0, 1) * total;
  let segment = 1;
  while (segment < lengths.length - 1 && lengths[segment] < distance) segment += 1;
  const startDistance = lengths[segment - 1];
  const segmentLength = Math.max(Number.EPSILON, lengths[segment] - startDistance);
  return target
    .fromArray(route[segment - 1])
    .lerp(new THREE.Vector3().fromArray(route[segment]), (distance - startDistance) / segmentLength);
}

export function deterministicRoutePosition(
  operation: OperationProjection,
  replayTimeMs: number,
  reducedMotion: boolean,
  target = new THREE.Vector3()
): THREE.Vector3 {
  let progress = operationProgress(operation, replayTimeMs);
  if (reducedMotion && operation.route.length > 1) {
    progress = Math.round(progress * (operation.route.length - 1)) / (operation.route.length - 1);
  }
  sampleRoute(operation.route, progress, target);
  if (operation.route.length > 1) {
    const start = new THREE.Vector3().fromArray(operation.route[0]);
    const end = new THREE.Vector3().fromArray(operation.route[operation.route.length - 1]);
    const tangent = end.sub(start).normalize();
    const lane = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0));
    if (lane.lengthSq() < 0.001) lane.set(1, 0, 0);
    const laneIndex = (stableHash32(operation.id) % 7) - 3;
    target.addScaledVector(lane.normalize(), laneIndex * 0.025);
  }
  return target;
}

const STATUS_COLORS: Record<OperationalStatus, THREE.ColorRepresentation> = {
  nominal: 0x00f3ff,
  queued: 0x8aa4b8,
  degraded: 0xffb000,
  contained: 0xa855f7,
  rejected: 0xff2a6d,
  rolled_back: 0xff7043,
  stale: 0x77808c,
  unknown: 0x77808c
};

export interface OperationFlowSystemOptions {
  readonly capacity?: number;
  readonly geometry?: THREE.BufferGeometry;
  readonly material?: THREE.Material;
  readonly ownsGeometry?: boolean;
  readonly ownsMaterial?: boolean;
}

interface PreparedOperation {
  readonly operation: OperationProjection;
  readonly cumulativeLengths: readonly number[];
  readonly totalLength: number;
  readonly laneOffset: THREE.Vector3;
}

function prepareOperation(operation: OperationProjection): PreparedOperation {
  const cumulativeLengths = [0];
  let totalLength = 0;
  for (let index = 1; index < operation.route.length; index += 1) {
    const previous = operation.route[index - 1];
    const current = operation.route[index];
    totalLength += Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1],
      current[2] - previous[2]
    );
    cumulativeLengths.push(totalLength);
  }
  const laneOffset = new THREE.Vector3();
  if (operation.route.length > 1) {
    const start = operation.route[0];
    const end = operation.route[operation.route.length - 1];
    const tangent = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
    laneOffset.crossVectors(tangent, new THREE.Vector3(0, 1, 0));
    if (laneOffset.lengthSq() < 0.001) laneOffset.set(1, 0, 0);
    laneOffset.normalize().multiplyScalar(((stableHash32(operation.id) % 7) - 3) * 0.025);
  }
  return { operation, cumulativeLengths, totalLength, laneOffset };
}

function samplePreparedOperation(
  prepared: PreparedOperation,
  replayTimeMs: number,
  reducedMotion: boolean,
  target: THREE.Vector3
): void {
  const { operation, cumulativeLengths, totalLength } = prepared;
  let progress = operationProgress(operation, replayTimeMs);
  if (reducedMotion && operation.route.length > 1) {
    progress = Math.round(progress * (operation.route.length - 1)) / (operation.route.length - 1);
  }
  if (operation.route.length === 1 || totalLength === 0) {
    target.fromArray(operation.route[0]).add(prepared.laneOffset);
    return;
  }
  const distance = progress * totalLength;
  let segment = 1;
  while (segment < cumulativeLengths.length - 1 && cumulativeLengths[segment] < distance) segment += 1;
  const from = operation.route[segment - 1];
  const to = operation.route[segment];
  const span = Math.max(Number.EPSILON, cumulativeLengths[segment] - cumulativeLengths[segment - 1]);
  const t = (distance - cumulativeLengths[segment - 1]) / span;
  target.set(
    THREE.MathUtils.lerp(from[0], to[0], t),
    THREE.MathUtils.lerp(from[1], to[1], t),
    THREE.MathUtils.lerp(from[2], to[2], t)
  ).add(prepared.laneOffset);
}

/** Fixed-capacity packet pool. Operations update instance matrices; they never create meshes. */
export class OperationFlowSystem implements SceneSystem {
  readonly id = 'operation-flow';
  readonly writes = ['operation-flow'] as const;
  readonly capacity: number;
  readonly mesh: THREE.InstancedMesh;
  private readonly operations: PreparedOperation[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private context: SceneSystemContext | null = null;
  private playbackActive = true;
  private activeInstances = 0;
  private readonly ownsGeometry: boolean;
  private readonly ownsMaterial: boolean;

  constructor(options: OperationFlowSystemOptions = {}) {
    this.capacity = options.capacity ?? DEFAULT_OPERATION_CAPACITY;
    if (this.capacity <= 0) throw new Error('Operation packet capacity must be positive');
    const geometry = options.geometry ?? new THREE.IcosahedronGeometry(0.065, 1);
    const material = options.material ?? new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.ownsGeometry = options.ownsGeometry ?? !options.geometry;
    this.ownsMaterial = options.ownsMaterial ?? !options.material;
    this.mesh = new THREE.InstancedMesh(geometry, material, this.capacity);
    this.mesh.name = 'admin-operation-packets';
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  attach(context: SceneSystemContext): void {
    if (this.context) throw new Error('OperationFlowSystem is already attached');
    this.context = context;
    context.scene.add(this.mesh);
  }

  setOperations(operations: readonly OperationProjection[]): void {
    this.operations.length = 0;
    this.operations.push(...operations.filter((operation) => operation.route.length > 0).map(prepareOperation));
    this.operations.sort((left, right) =>
      left.operation.startedAtMs - right.operation.startedAtMs
      || left.operation.id.localeCompare(right.operation.id)
    );
    this.context?.requestRender();
  }

  setPlaybackActive(active: boolean): void {
    this.playbackActive = active;
    this.context?.requestRender();
  }

  get activeCount(): number { return this.activeInstances; }

  update(frame: RuntimeFrameContext): { needsContinuousRender: boolean } {
    this.activeInstances = 0;
    for (const prepared of this.operations) {
      const operation = prepared.operation;
      if (operation.startedAtMs > frame.replayTimeMs) break;
      if (
        operation.visible === false
        || frame.replayTimeMs > operation.startedAtMs + Math.max(0, operation.durationMs)
      ) continue;
      const index = this.activeInstances;
      if (index >= this.capacity) break;
      samplePreparedOperation(prepared, frame.replayTimeMs, frame.reducedMotion, this.position);
      const scalar = frame.reducedMotion ? 1.35 : 1;
      this.scale.setScalar(scalar);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(index, this.matrix);
      this.mesh.setColorAt(index, this.color.set(STATUS_COLORS[operation.status]));
      this.activeInstances += 1;
    }
    this.mesh.count = this.activeInstances;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return {
      needsContinuousRender: this.playbackActive && !frame.reducedMotion && this.activeInstances > 0
    };
  }

  dispose(): void {
    this.mesh.removeFromParent();
    if (this.ownsGeometry) this.mesh.geometry.dispose();
    if (this.ownsMaterial) {
      const materials = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
      for (const material of materials) material.dispose();
    }
    this.operations.length = 0;
    this.context = null;
  }
}
