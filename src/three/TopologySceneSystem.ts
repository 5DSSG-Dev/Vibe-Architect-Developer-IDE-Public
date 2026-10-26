import * as THREE from 'three';
import type {
  SceneNodeFactory,
  SceneSystem,
  SceneSystemContext,
  TopologyEdgeProjection,
  TopologyNodeProjection,
  TopologyProjection
} from './contracts';
import type { SceneRegistryEntry } from './SceneRegistry';

interface EdgeRecord {
  projection: TopologyEdgeProjection;
  object: THREE.Object3D;
}

/** Reconciles structural topology only; runtime events never replace these Object3D identities. */
export class TopologySceneSystem implements SceneSystem {
  readonly id = 'topology';
  readonly writes = ['topology'] as const;
  private readonly root = new THREE.Group();
  private readonly nodes = new Map<string, { projection: TopologyNodeProjection; entry: SceneRegistryEntry }>();
  private readonly edges = new Map<string, EdgeRecord>();
  private context: SceneSystemContext | null = null;

  constructor(private readonly factory: SceneNodeFactory) {
    this.root.name = 'admin-topology';
  }

  attach(context: SceneSystemContext): void {
    if (this.context) throw new Error('TopologySceneSystem is already attached');
    this.context = context;
    context.scene.add(this.root);
  }

  reconcile(projection: TopologyProjection): { created: number; updated: number; removed: number } {
    const context = this.requireContext();
    const incomingIds = new Set(projection.nodes.map((node) => node.id));
    let created = 0;
    let updated = 0;
    let removed = 0;

    for (const [id, record] of this.nodes) {
      const next = projection.nodes.find((node) => node.id === id);
      if (!next || next.kind !== record.projection.kind) {
        this.removeNode(id);
        removed += 1;
      }
    }

    for (const node of projection.nodes) {
      let record = this.nodes.get(node.id);
      if (!record) {
        const entry = this.factory.createNode(node);
        if (entry.id !== node.id || entry.kind !== node.kind) {
          this.factory.disposeNode(entry);
          throw new Error(`Node factory identity mismatch for ${node.id}`);
        }
        context.registry.register(entry);
        this.nodes.set(node.id, { projection: node, entry });
        this.root.add(entry.root);
        record = this.nodes.get(node.id)!;
        created += 1;
      } else {
        this.factory.updateNode(record.entry, node);
        record.projection = node;
        record.entry.parentId = node.parentId;
        record.entry.status = node.status;
        record.entry.metadata = node.metadata;
        updated += 1;
      }
    }

    // All structural roots remain stable scene siblings. parentId is a logical
    // POD relationship recorded in SceneRegistry, never disposal ownership.
    // Projection positions are therefore world-space coordinates.
    for (const node of projection.nodes) {
      const record = this.nodes.get(node.id)!;
      if (record.entry.root.parent !== this.root) this.root.attach(record.entry.root);
    }

    this.reconcileEdges(projection.edges, incomingIds);
    context.requestRender();
    return { created, updated, removed };
  }

  private reconcileEdges(edges: readonly TopologyEdgeProjection[], nodeIds: ReadonlySet<string>): void {
    const validEdges = edges.filter((edge) => nodeIds.has(edge.fromId) && nodeIds.has(edge.toId));
    const incoming = new Set(validEdges.map((edge) => edge.id));
    for (const [id, record] of this.edges) {
      if (!incoming.has(id)) {
        record.object.removeFromParent();
        this.factory.disposeEdge?.(record.object);
        this.edges.delete(id);
      }
    }
    for (const edge of validEdges) {
      const from = this.nodes.get(edge.fromId)!.entry.root;
      const to = this.nodes.get(edge.toId)!.entry.root;
      const existing = this.edges.get(edge.id);
      if (existing) {
        this.factory.updateEdge?.(existing.object, edge, from, to);
        existing.projection = edge;
      } else if (this.factory.createEdge) {
        const object = this.factory.createEdge(edge, from, to);
        this.root.add(object);
        this.edges.set(edge.id, { projection: edge, object });
      }
    }
  }

  private removeNode(id: string): void {
    const context = this.requireContext();
    const record = this.nodes.get(id);
    if (!record) return;
    context.registry.unregister(id);
    record.entry.root.removeFromParent();
    this.factory.disposeNode(record.entry);
    this.nodes.delete(id);
  }

  getObject(id: string): THREE.Object3D | undefined {
    return this.nodes.get(id)?.entry.root;
  }

  private requireContext(): SceneSystemContext {
    if (!this.context) throw new Error('TopologySceneSystem is not attached');
    return this.context;
  }

  dispose(): void {
    for (const id of [...this.nodes.keys()]) this.removeNode(id);
    for (const record of this.edges.values()) {
      record.object.removeFromParent();
      this.factory.disposeEdge?.(record.object);
    }
    this.edges.clear();
    this.root.removeFromParent();
    this.context = null;
  }
}
