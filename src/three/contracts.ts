import type * as THREE from 'three';
import type { SceneElementKind } from '../contracts/elementSchema';

export type SceneWriteDomain =
  | 'topology'
  | 'operation-flow'
  | 'message-flow'
  | 'selection-presentation'
  | 'camera'
  | 'environment';

export interface RuntimeFrameContext {
  readonly deltaSeconds: number;
  readonly elapsedSeconds: number;
  readonly replayTimeMs: number;
  readonly reducedMotion: boolean;
  readonly frameNumber: number;
  requestRender(): void;
}

export interface SceneSystemContext {
  readonly scene: THREE.Scene;
  readonly registry: import('./SceneRegistry').SceneRegistry;
  requestRender(): void;
}

export interface SceneSystem {
  readonly id: string;
  readonly writes: readonly SceneWriteDomain[];
  attach(context: SceneSystemContext): void;
  update?(frame: RuntimeFrameContext): { needsContinuousRender?: boolean } | void;
  dispose(): void;
}

export type SceneEntityKind = SceneElementKind;
export type OperationalStatus =
  | 'nominal'
  | 'queued'
  | 'degraded'
  | 'contained'
  | 'rejected'
  | 'rolled_back'
  | 'stale'
  | 'unknown';

export interface TopologyNodeProjection {
  readonly id: string;
  readonly kind: SceneEntityKind;
  readonly parentId?: string;
  /** World-space position. parentId is logical POD lineage, not Object3D parenting. */
  readonly position: readonly [number, number, number];
  readonly scale?: number;
  readonly visible?: boolean;
  readonly pickable?: boolean;
  readonly focusRadius?: number;
  readonly status?: OperationalStatus;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TopologyEdgeProjection {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly status?: OperationalStatus;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TopologyProjection {
  readonly version: string;
  readonly nodes: readonly TopologyNodeProjection[];
  readonly edges: readonly TopologyEdgeProjection[];
}

export interface OperationProjection {
  readonly id: string;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly route: readonly (readonly [number, number, number])[];
  readonly status: OperationalStatus;
  readonly visible?: boolean;
}

/**
 * Presentation-only service-flow vocabulary. This is deliberately separate
 * from TopologyProjection: POD identity remains canonical while the ordered
 * service shot is an observable, sanitized projection.
 */
export type MessageFlowStageId =
  | 'sender_ingress'
  | 'pim_in'
  | 'irg'
  | 'core_transit_projection'
  | 'rbc'
  | 'prism'
  | 'ids'
  | 'pim_out'
  | 'receiver_delivery'
  | 'sender_return'
  | 'unavailable';

export type MessageFlowStageState = 'idle' | 'queued' | 'active' | 'completed' | 'contained' | 'unavailable';

export type MessageFlowVisualAnchorId =
  | Exclude<MessageFlowStageId, 'pim_out'>
  | 'pim_out_receiver_projection'
  | 'pim_out_sender_projection';

export interface MessageFlowStageProjection {
  readonly id: MessageFlowVisualAnchorId;
  readonly semanticStage: MessageFlowStageId;
  readonly label: string;
  readonly position: readonly [number, number, number];
  readonly state: MessageFlowStageState;
  readonly canonical: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface MessageFlowConduitProjection {
  readonly id: string;
  readonly from: MessageFlowVisualAnchorId;
  readonly to: MessageFlowVisualAnchorId;
  readonly branch: 'shared' | 'prism' | 'ids' | 'lane_2' | 'unavailable';
}

export interface MessageFlowTransactionProjection {
  readonly id: string;
  readonly traceId: string;
  readonly exchangeDirection: 'human_to_ai' | 'ai_to_human';
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly route: readonly MessageFlowStageId[];
  /** Branch-specific visual anchors; semantic route remains authoritative. */
  readonly visualRoute: readonly MessageFlowVisualAnchorId[];
  /** Absolute replay timestamps, one per route stage. */
  readonly stageObservedAtMs: readonly number[];
  readonly status: OperationalStatus;
  readonly selected?: boolean;
  readonly visible?: boolean;
}

export interface MessageFlowProjection {
  readonly version: string;
  readonly presentationOnly: true;
  readonly stages: readonly MessageFlowStageProjection[];
  readonly conduits: readonly MessageFlowConduitProjection[];
  readonly transactions: readonly MessageFlowTransactionProjection[];
}

export interface SceneNodeFactory {
  createNode(node: TopologyNodeProjection): import('./SceneRegistry').SceneRegistryEntry;
  updateNode(entry: import('./SceneRegistry').SceneRegistryEntry, node: TopologyNodeProjection): void;
  disposeNode(entry: import('./SceneRegistry').SceneRegistryEntry): void;
  createEdge?(edge: TopologyEdgeProjection, from: THREE.Object3D, to: THREE.Object3D): THREE.Object3D;
  updateEdge?(object: THREE.Object3D, edge: TopologyEdgeProjection, from: THREE.Object3D, to: THREE.Object3D): void;
  disposeEdge?(object: THREE.Object3D): void;
}
