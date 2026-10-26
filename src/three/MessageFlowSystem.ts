import * as THREE from 'three';
import type {
  MessageFlowProjection,
  MessageFlowStageProjection,
  MessageFlowTransactionProjection,
  MessageFlowVisualAnchorId,
  OperationalStatus,
  RuntimeFrameContext,
  SceneSystem,
  SceneSystemContext,
} from './contracts';

const FLOW_COLORS = {
  idle: 0x25465a,
  queued: 0x8aa4b8,
  active: 0x00f3ff,
  completed: 0x20e3b2,
  contained: 0xa855f7,
  unavailable: 0x77808c,
  prism: 0x7af7ff,
  ids: 0xc06cff,
} as const;

const STATUS_COLORS: Record<OperationalStatus, number> = {
  nominal: 0x00f3ff, queued: 0x8aa4b8, degraded: 0xffb000,
  contained: 0xa855f7, rejected: 0xff2a6d, rolled_back: 0xff7043,
  stale: 0x77808c, unknown: 0x77808c,
};

interface PreparedTransaction {
  readonly transaction: MessageFlowTransactionProjection;
  readonly route: readonly THREE.Vector3[];
  readonly routeIds: readonly MessageFlowVisualAnchorId[];
  readonly cumulativeLengths: readonly number[];
  readonly totalLength: number;
}

export function messageFlowProgress(transaction: MessageFlowTransactionProjection, replayTimeMs: number): number {
  const first = transaction.stageObservedAtMs[0] ?? transaction.startedAtMs;
  const last = transaction.stageObservedAtMs[transaction.stageObservedAtMs.length - 1] ?? first;
  if (last <= first) return replayTimeMs >= first ? 1 : 0;
  return THREE.MathUtils.clamp((replayTimeMs - first) / (last - first), 0, 1);
}

function prepareTransaction(
  transaction: MessageFlowTransactionProjection,
  positions: ReadonlyMap<MessageFlowVisualAnchorId, THREE.Vector3>,
): PreparedTransaction | null {
  const route = transaction.visualRoute.map((stage) => positions.get(stage)?.clone()).filter((point): point is THREE.Vector3 => Boolean(point));
  if (route.length !== transaction.visualRoute.length || route.length === 0) return null;
  const cumulativeLengths = [0];
  let totalLength = 0;
  for (let index = 1; index < route.length; index += 1) {
    totalLength += route[index - 1].distanceTo(route[index]);
    cumulativeLengths.push(totalLength);
  }
  return { transaction, route, routeIds: transaction.visualRoute, cumulativeLengths, totalLength };
}

function quadraticPoint(from: THREE.Vector3, control: THREE.Vector3, to: THREE.Vector3, amount: number, target: THREE.Vector3): THREE.Vector3 {
  const inverse = 1 - amount;
  return target.set(
    inverse * inverse * from.x + 2 * inverse * amount * control.x + amount * amount * to.x,
    inverse * inverse * from.y + 2 * inverse * amount * control.y + amount * amount * to.y,
    inverse * inverse * from.z + 2 * inverse * amount * control.z + amount * amount * to.z,
  );
}

function returnLoopControl(fromId: MessageFlowVisualAnchorId, toId: MessageFlowVisualAnchorId): THREE.Vector3 | null {
  if (fromId === 'ids' && toId === 'pim_out_sender_projection') return new THREE.Vector3(-0.2, -4.45, 0);
  if (fromId === 'pim_out_sender_projection' && toId === 'sender_return') return new THREE.Vector3(-6.0, -3.45, 0);
  return null;
}

function sampleVisualSegment(
  fromId: MessageFlowVisualAnchorId,
  toId: MessageFlowVisualAnchorId,
  from: THREE.Vector3,
  to: THREE.Vector3,
  amount: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const control = returnLoopControl(fromId, toId);
  return control ? quadraticPoint(from, control, to, amount, target) : target.copy(from).lerp(to, amount);
}

export function sampleMessageFlowTransaction(
  prepared: Pick<PreparedTransaction, 'transaction' | 'route' | 'cumulativeLengths' | 'totalLength'> & { readonly routeIds?: readonly MessageFlowVisualAnchorId[] },
  replayTimeMs: number,
  reducedMotion: boolean,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  if (prepared.route.length === 1 || prepared.totalLength <= Number.EPSILON) return target.copy(prepared.route[0]);
  const times = prepared.transaction.stageObservedAtMs;
  if (replayTimeMs <= (times[0] ?? prepared.transaction.startedAtMs)) return target.copy(prepared.route[0]);
  let segment = 1;
  while (segment < times.length - 1 && times[segment] < replayTimeMs) segment += 1;
  if (segment >= prepared.route.length || replayTimeMs >= (times[times.length - 1] ?? prepared.transaction.startedAtMs)) {
    return target.copy(prepared.route[prepared.route.length - 1]);
  }
  if (reducedMotion) return target.copy(prepared.route[segment - 1]);
  const fromTime = times[segment - 1];
  const toTime = times[segment];
  const amount = toTime <= fromTime ? 1 : THREE.MathUtils.clamp((replayTimeMs - fromTime) / (toTime - fromTime), 0, 1);
  const fromId = prepared.routeIds?.[segment - 1];
  const toId = prepared.routeIds?.[segment];
  return fromId && toId
    ? sampleVisualSegment(fromId, toId, prepared.route[segment - 1], prepared.route[segment], amount, target)
    : target.copy(prepared.route[segment - 1]).lerp(prepared.route[segment], amount);
}

function material(color: number, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.7, roughness: 0.34, metalness: 0.36,
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
  });
}

function stageGeometry(stage: MessageFlowVisualAnchorId): THREE.BufferGeometry {
  switch (stage) {
    case 'sender_ingress': return new THREE.TorusGeometry(0.58, 0.11, 8, 20, Math.PI * 1.55);
    case 'receiver_delivery': return new THREE.DodecahedronGeometry(0.58, 0);
    case 'sender_return': return new THREE.TorusGeometry(0.58, 0.13, 8, 20, Math.PI * 1.72);
    case 'pim_in':
    case 'pim_out_receiver_projection':
    case 'pim_out_sender_projection': return new THREE.RingGeometry(0.28, 0.62, 4, 1);
    case 'irg': return new THREE.TorusGeometry(0.58, 0.1, 5, 7);
    case 'core_transit_projection': return new THREE.OctahedronGeometry(0.83, 1);
    case 'rbc': return new THREE.TorusGeometry(0.66, 0.19, 8, 24);
    case 'prism': return new THREE.TetrahedronGeometry(0.67, 0);
    case 'ids': return new THREE.TorusKnotGeometry(0.43, 0.095, 40, 6, 2, 3);
    case 'unavailable': return new THREE.TorusGeometry(0.58, 0.1, 6, 16, Math.PI * 1.7);
  }
}

function createStageVisual(stage: MessageFlowStageProjection): THREE.Object3D {
  const color = stageColor(stage);
  if (stage.id === 'core_transit_projection') {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.84, 1),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.58, depthWrite: false }),
    );
    shell.renderOrder = 2;
    const relay = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.055, 6, 18),
      new THREE.MeshBasicMaterial({ color: FLOW_COLORS.active, transparent: true, opacity: 0.88, depthWrite: false }),
    );
    relay.rotation.y = Math.PI / 2;
    relay.renderOrder = 3;
    group.add(shell, relay);
    return group;
  }
  if (stage.id === 'pim_in' || stage.id === 'pim_out_receiver_projection' || stage.id === 'pim_out_sender_projection') {
    const group = new THREE.Group();
    for (const offset of [-0.2, 0.2]) {
      const aperture = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.48, 4, 1),
        material(color, stage.state === 'idle' ? 0.48 : 0.92),
      );
      aperture.position.x = offset;
      aperture.rotation.z = Math.PI / 4;
      group.add(aperture);
    }
    return group;
  }
  return new THREE.Mesh(stageGeometry(stage.id), material(color, stage.state === 'idle' ? 0.48 : 0.92));
}

function stageColor(stage: MessageFlowStageProjection): number {
  if (stage.metadata?.implementationState === 'placeholder_pass_through') return 0xffb000;
  if (stage.metadata?.implementationState === 'presentation_only') return 0x5cc8ff;
  if (stage.state === 'unavailable') return FLOW_COLORS.unavailable;
  if (stage.id === 'prism') return FLOW_COLORS.prism;
  if (stage.id === 'ids') return FLOW_COLORS.ids;
  if (stage.id === 'receiver_delivery') return 0x56f7c4;
  if (stage.id === 'sender_return') return FLOW_COLORS.ids;
  return FLOW_COLORS[stage.state];
}

function disposeTree(root: THREE.Object3D): void {
  root.removeFromParent();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((entry) => entry.dispose());
  });
}

/** Ordered, presentation-only service shot. It never mutates canonical POD/GLB objects. */
export class MessageFlowSystem implements SceneSystem {
  readonly id = 'message-flow';
  readonly writes = ['message-flow'] as const;
  readonly capacity: number;
  readonly packetPool: THREE.InstancedMesh;
  readonly selectedCapsule: THREE.Mesh;
  readonly selectedTrail: THREE.Line;
  readonly arrowheads: THREE.InstancedMesh;
  private readonly root = new THREE.Group();
  private readonly stagesRoot = new THREE.Group();
  private conduit: THREE.LineSegments | null = null;
  private projection: MessageFlowProjection | null = null;
  private readonly positions = new Map<MessageFlowVisualAnchorId, THREE.Vector3>();
  private readonly transactions: PreparedTransaction[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly scale = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private context: SceneSystemContext | null = null;
  private playbackActive = true;
  private activeInstances = 0;

  constructor(capacity = 128) {
    if (capacity <= 0) throw new Error('Message flow packet capacity must be positive');
    this.capacity = capacity;
    this.root.name = 'admin-message-flow';
    this.stagesRoot.name = 'admin-message-flow-stages';
    this.root.add(this.stagesRoot);
    this.packetPool = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.07, 0.18, 3, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      capacity,
    );
    this.packetPool.name = 'admin-message-flow-packet-pool';
    this.packetPool.frustumCulled = false;
    this.packetPool.count = 0;
    this.selectedCapsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.3, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    this.selectedCapsule.name = 'admin-message-flow-selected-capsule';
    this.selectedCapsule.visible = false;
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    this.selectedTrail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: FLOW_COLORS.active, transparent: true, opacity: 0.62 }));
    this.selectedTrail.name = 'admin-message-flow-selected-trail';
    this.selectedTrail.visible = false;
    this.arrowheads = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.08, 0.24, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false }),
      32,
    );
    this.arrowheads.name = 'admin-message-flow-direction-arrows';
    this.arrowheads.frustumCulled = false;
    this.arrowheads.count = 0;
    this.root.add(this.packetPool, this.selectedTrail, this.selectedCapsule, this.arrowheads);
  }

  attach(context: SceneSystemContext): void {
    if (this.context) throw new Error('MessageFlowSystem is already attached');
    this.context = context;
    context.scene.add(this.root);
  }

  setProjection(projection: MessageFlowProjection): void {
    if (this.projection?.version === projection.version) return;
    this.projection = projection;
    this.positions.clear();
    while (this.stagesRoot.children.length) disposeTree(this.stagesRoot.children[0]);
    this.conduit?.removeFromParent();
    this.conduit?.geometry.dispose();
    (this.conduit?.material as THREE.Material | undefined)?.dispose();
    this.conduit = null;

    for (const stage of projection.stages) {
      const visual = createStageVisual(stage);
      visual.name = `message-flow-stage:${stage.id}`;
      visual.position.fromArray(stage.position);
      if (stage.id === 'sender_ingress') visual.rotation.z = Math.PI * 0.24;
      if (stage.id === 'sender_return') visual.rotation.z = Math.PI * 1.12;
      if (stage.id === 'unavailable') visual.rotation.z = Math.PI * 0.15;
      visual.scale.setScalar(stage.state === 'active' ? 1.14 : 1);
      visual.userData = { ...stage.metadata, messageFlowStage: stage.id, canonical: stage.canonical };
      this.stagesRoot.add(visual);
      this.positions.set(stage.id, visual.position.clone());
    }

    const conduitPositions: number[] = [];
    const conduitColors: number[] = [];
    let arrowIndex = 0;
    const arrowMatrix = new THREE.Matrix4();
    const arrowPosition = new THREE.Vector3();
    const arrowDirection = new THREE.Vector3();
    const arrowRotation = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const curvePointA = new THREE.Vector3();
    const curvePointB = new THREE.Vector3();
    for (const edge of projection.conduits) {
      const from = this.positions.get(edge.from);
      const to = this.positions.get(edge.to);
      if (!from || !to) continue;
      const edgeColor = edge.branch === 'prism' ? FLOW_COLORS.prism
        : edge.branch === 'ids' || edge.branch === 'lane_2' ? FLOW_COLORS.ids
          : edge.branch === 'unavailable' ? FLOW_COLORS.unavailable : FLOW_COLORS.idle;
      const c = new THREE.Color(edgeColor).multiplyScalar(0.6);
      const curved = Boolean(returnLoopControl(edge.from, edge.to));
      const subdivisions = curved ? 18 : 1;
      for (let segment = 0; segment < subdivisions; segment += 1) {
        sampleVisualSegment(edge.from, edge.to, from, to, segment / subdivisions, curvePointA);
        sampleVisualSegment(edge.from, edge.to, from, to, (segment + 1) / subdivisions, curvePointB);
        conduitPositions.push(curvePointA.x, curvePointA.y, curvePointA.z, curvePointB.x, curvePointB.y, curvePointB.z);
        conduitColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      if (arrowIndex < this.arrowheads.instanceMatrix.count) {
        sampleVisualSegment(edge.from, edge.to, from, to, 0.7, arrowPosition);
        sampleVisualSegment(edge.from, edge.to, from, to, 0.69, curvePointA);
        sampleVisualSegment(edge.from, edge.to, from, to, 0.71, curvePointB);
        arrowDirection.copy(curvePointB).sub(curvePointA).normalize();
        arrowRotation.setFromUnitVectors(up, arrowDirection);
        arrowMatrix.compose(arrowPosition, arrowRotation, new THREE.Vector3(1, 1, 1));
        this.arrowheads.setMatrixAt(arrowIndex, arrowMatrix);
        this.arrowheads.setColorAt(arrowIndex, new THREE.Color(edgeColor).multiplyScalar(0.75));
        arrowIndex += 1;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(conduitPositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(conduitColors, 3));
    this.conduit = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.68 }));
    this.conduit.name = 'admin-message-flow-directional-conduits';
    this.root.add(this.conduit);
    this.arrowheads.count = arrowIndex;
    this.arrowheads.instanceMatrix.needsUpdate = true;
    if (this.arrowheads.instanceColor) this.arrowheads.instanceColor.needsUpdate = true;

    this.transactions.length = 0;
    for (const transaction of projection.transactions) {
      const prepared = prepareTransaction(transaction, this.positions);
      if (prepared) this.transactions.push(prepared);
    }
    this.transactions.sort((left, right) => left.transaction.startedAtMs - right.transaction.startedAtMs || left.transaction.id.localeCompare(right.transaction.id));
    this.context?.requestRender();
  }

  setPlaybackActive(active: boolean): void {
    this.playbackActive = active;
    this.context?.requestRender();
  }

  get activeCount(): number { return this.activeInstances + (this.selectedCapsule.visible ? 1 : 0); }

  update(frame: RuntimeFrameContext): { needsContinuousRender: boolean } {
    this.activeInstances = 0;
    this.selectedCapsule.visible = false;
    this.selectedTrail.visible = false;
    let transactionInMotion = false;
    for (const prepared of this.transactions) {
      const transaction = prepared.transaction;
      if (transaction.visible === false || frame.replayTimeMs < transaction.startedAtMs) continue;
      const progress = messageFlowProgress(transaction, frame.replayTimeMs);
      transactionInMotion ||= progress > 0 && progress < 1;
      sampleMessageFlowTransaction(prepared, frame.replayTimeMs, frame.reducedMotion, this.position);
      if (transaction.selected) {
        this.selectedCapsule.position.copy(this.position);
        (this.selectedCapsule.material as THREE.MeshBasicMaterial).color.setHex(STATUS_COLORS[transaction.status]);
        this.selectedCapsule.visible = true;
        if (!frame.reducedMotion && progress > 0 && progress < 1) this.updateTrail(prepared, frame.replayTimeMs);
        continue;
      }
      if (this.activeInstances >= this.capacity) continue;
      this.scale.setScalar(frame.reducedMotion ? 1.2 : 0.88);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.packetPool.setMatrixAt(this.activeInstances, this.matrix);
      this.packetPool.setColorAt(this.activeInstances, this.color.setHex(STATUS_COLORS[transaction.status]));
      this.activeInstances += 1;
    }
    this.packetPool.count = this.activeInstances;
    this.packetPool.instanceMatrix.needsUpdate = true;
    if (this.packetPool.instanceColor) this.packetPool.instanceColor.needsUpdate = true;
    return { needsContinuousRender: this.playbackActive && !frame.reducedMotion && transactionInMotion };
  }

  private updateTrail(transaction: PreparedTransaction, replayTimeMs: number): void {
    const attribute = this.selectedTrail.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < attribute.count; index += 1) {
      const trailTime = replayTimeMs - (attribute.count - 1 - index) * 85;
      sampleMessageFlowTransaction(transaction, trailTime, false, this.position);
      attribute.setXYZ(index, this.position.x, this.position.y, this.position.z);
    }
    attribute.needsUpdate = true;
    this.selectedTrail.visible = true;
  }

  dispose(): void {
    this.root.removeFromParent();
    while (this.stagesRoot.children.length) disposeTree(this.stagesRoot.children[0]);
    this.conduit?.geometry.dispose();
    (this.conduit?.material as THREE.Material | undefined)?.dispose();
    this.packetPool.geometry.dispose();
    (this.packetPool.material as THREE.Material).dispose();
    this.selectedCapsule.geometry.dispose();
    (this.selectedCapsule.material as THREE.Material).dispose();
    this.selectedTrail.geometry.dispose();
    (this.selectedTrail.material as THREE.Material).dispose();
    this.arrowheads.geometry.dispose();
    (this.arrowheads.material as THREE.Material).dispose();
    this.transactions.length = 0;
    this.positions.clear();
    this.context = null;
  }
}
