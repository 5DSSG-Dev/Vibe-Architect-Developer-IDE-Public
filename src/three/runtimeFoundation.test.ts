import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { FrameScheduler, type AnimationFrameDriver, type DelayDriver } from './FrameScheduler.ts';
import { deterministicRoutePosition, operationProgress } from './OperationFlowSystem.ts';
import { MessageFlowSystem, messageFlowProgress, sampleMessageFlowTransaction } from './MessageFlowSystem.ts';
import { adaptAether } from './SceneAdapter.ts';
import { createMessageFlowProjection } from '../admin/projection/messageFlowProjection.ts';
import { SharedAssetManager } from './SharedAssetManager.ts';
import { SceneRegistry } from './SceneRegistry.ts';
import { StatusOverlaySystem } from './StatusOverlaySystem.ts';
import { TopologySceneSystem } from './TopologySceneSystem.ts';
import {
  createContextLossRecoveryContract,
  disposeOwnedComposerPasses
} from './ThreeRuntime.ts';
import type { OperationProjection, SceneNodeFactory, TopologyProjection } from './contracts.ts';

class ManualFrameDriver implements AnimationFrameDriver {
  private nextId = 1;
  private readonly callbacks = new Map<number, FrameRequestCallback>();
  request(callback: FrameRequestCallback): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }
  cancel(handle: number): void { this.callbacks.delete(handle); }
  flush(timestamp = 0): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of callbacks) callback(timestamp);
  }
  get pending(): number { return this.callbacks.size; }
}

class ManualDelayDriver implements DelayDriver {
  private nextId = 1;
  private readonly callbacks = new Map<number, () => void>();
  schedule(callback: () => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }
  cancel(handle: number): void { this.callbacks.delete(handle); }
  flush(): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of callbacks) callback();
  }
  get pending(): number { return this.callbacks.size; }
}

const operation: OperationProjection = {
  id: 'operation:stable',
  startedAtMs: 1_000,
  durationMs: 1_000,
  route: [[0, 0, 0], [5, 0, 0], [10, 0, 0]],
  status: 'nominal'
};

test('FrameScheduler sleeps while idle and renders once when invalidated', () => {
  const driver = new ManualFrameDriver();
  let frames = 0;
  const scheduler = new FrameScheduler(() => { frames += 1; }, driver);
  assert.equal(driver.pending, 0);
  scheduler.invalidate();
  scheduler.invalidate();
  assert.equal(driver.pending, 1);
  driver.flush();
  assert.equal(frames, 1);
  assert.equal(driver.pending, 0);
  scheduler.dispose();
});

test('FrameScheduler continues only for an explicit active reason', () => {
  const driver = new ManualFrameDriver();
  let frames = 0;
  const scheduler = new FrameScheduler(() => { frames += 1; }, driver);
  scheduler.setContinuous('operation-flow', true);
  driver.flush();
  assert.equal(frames, 1);
  assert.equal(driver.pending, 1);
  scheduler.setContinuous('operation-flow', false);
  driver.flush();
  assert.equal(frames, 1);
  scheduler.dispose();
});

test('FrameScheduler runs atmosphere at bounded cadence without continuous RAF', () => {
  const frames = new ManualFrameDriver();
  const delays = new ManualDelayDriver();
  let rendered = 0;
  const scheduler = new FrameScheduler(() => { rendered += 1; }, frames, delays);
  scheduler.setCadence('aether', 12);
  assert.equal(frames.pending, 0);
  assert.equal(delays.pending, 1);
  delays.flush();
  assert.equal(frames.pending, 1);
  frames.flush(84);
  assert.equal(rendered, 1);
  assert.equal(frames.pending, 0);
  assert.equal(delays.pending, 1);
  scheduler.dispose();
});

test('route projection is deterministic at the same replay timestamp', () => {
  assert.equal(operationProgress(operation, 1_500), 0.5);
  const first = deterministicRoutePosition(operation, 1_500, false);
  const second = deterministicRoutePosition(operation, 1_500, false);
  assert.deepEqual(first.toArray(), second.toArray());
  const reduced = deterministicRoutePosition(operation, 1_400, true);
  assert.equal(reduced.x, 5);
});

test('message flow samples consecutive observation timestamps and reduced motion rests at a stage', () => {
  const transaction = {
    id: 'flow:test', traceId: 'trace:test', exchangeDirection: 'human_to_ai' as const, startedAtMs: 1_000, durationMs: 3_000,
    route: ['sender_ingress', 'pim_in', 'irg'] as const,
    visualRoute: ['sender_ingress', 'pim_in', 'irg'] as const,
    stageObservedAtMs: [1_000, 2_000, 4_000], status: 'nominal' as const,
  };
  const prepared = {
    transaction,
    route: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0), new THREE.Vector3(6, 0, 0)],
    cumulativeLengths: [0, 2, 6], totalLength: 6,
  };
  assert.equal(messageFlowProgress(transaction, 2_500), 0.5);
  assert.equal(sampleMessageFlowTransaction(prepared, 3_000, false).x, 4);
  assert.equal(sampleMessageFlowTransaction(prepared, 3_000, true).x, 2);
  assert.deepEqual(
    sampleMessageFlowTransaction(prepared, 3_000, false).toArray(),
    sampleMessageFlowTransaction(prepared, 3_000, false).toArray(),
  );
});

test('IDS return packet follows the lower loop instead of crossing CORE', () => {
  const transaction = {
    id: 'flow:ids-loop', traceId: 'trace:ids-loop', exchangeDirection: 'ai_to_human' as const,
    startedAtMs: 1_000, durationMs: 2_000,
    route: ['ids', 'pim_out', 'sender_return'] as const,
    visualRoute: ['ids', 'pim_out_sender_projection', 'sender_return'] as const,
    stageObservedAtMs: [1_000, 2_000, 3_000], status: 'contained' as const,
  };
  const prepared = {
    transaction,
    routeIds: transaction.visualRoute,
    route: [new THREE.Vector3(3.2, -1.65, 0), new THREE.Vector3(-5.5, -2.55, 0), new THREE.Vector3(-6.1, -3, 0)],
    cumulativeLengths: [0, 8.75, 10.5], totalLength: 10.5,
  };
  const lowerLoop = sampleMessageFlowTransaction(prepared, 1_500, false);
  assert.ok(lowerLoop.y < -3);
  assert.ok(Math.abs(lowerLoop.x) < 3.2);
  assert.deepEqual(lowerLoop.toArray(), sampleMessageFlowTransaction(prepared, 1_500, false).toArray());
});

test('message flow uses a visible CORE chamber, dual PIM apertures, and a bounded draw-call shape budget', () => {
  const scene = new THREE.Scene();
  const system = new MessageFlowSystem(8);
  system.attach({ scene, registry: new SceneRegistry(), requestRender: () => undefined });
  system.setProjection(createMessageFlowProjection());
  const core = scene.getObjectByName('message-flow-stage:core_transit_projection');
  const pim = scene.getObjectByName('message-flow-stage:pim_in');
  assert.equal(core?.children.length, 2);
  const shell = core?.children[0] as THREE.Mesh;
  assert.equal((shell.material as THREE.Material).depthWrite, false);
  assert.equal(pim?.children.length, 2);
  let renderables = 0;
  scene.traverse((object) => { if ((object as THREE.Mesh).isMesh || (object as THREE.Line).isLine) renderables += 1; });
  assert.ok(renderables <= 24);
  system.dispose();
});

test('reduced motion freezes Aether updates without changing ownership', () => {
  let updates = 0;
  let disposals = 0;
  const adapter = adaptAether({ setSize: () => undefined, update: () => { updates += 1; } }, () => { disposals += 1; });
  adapter.update(1);
  adapter.setReducedMotion?.(true);
  adapter.update(2);
  assert.equal(updates, 1);
  adapter.dispose();
  assert.equal(disposals, 1);
});

test('SharedAssetManager never disposes borrowed cache assets', () => {
  const manager = new SharedAssetManager();
  let ownedDisposals = 0;
  let borrowedDisposals = 0;
  manager.register('owned', {}, { ownership: 'owned', dispose: () => { ownedDisposals += 1; } });
  manager.register('borrowed', {}, { ownership: 'borrowed', dispose: () => { borrowedDisposals += 1; } });
  const lease = manager.acquire('borrowed');
  lease.release();
  manager.dispose();
  assert.equal(ownedDisposals, 1);
  assert.equal(borrowedDisposals, 0);
});

test('SharedAssetManager disposes lease-local clones exactly once', () => {
  const manager = new SharedAssetManager();
  let cloneDisposals = 0;
  manager.register('borrowed-clone', { source: true }, {
    ownership: 'borrowed',
    clone: () => ({ source: false }),
    disposeClone: () => { cloneDisposals += 1; }
  });
  const lease = manager.acquire<{ source: boolean }>('borrowed-clone');
  lease.release();
  lease.release();
  assert.equal(cloneDisposals, 1);
  manager.dispose();
  assert.equal(cloneDisposals, 1);
});

test('TopologySceneSystem keeps logical children as siblings and removes invalid edges', () => {
  const disposedNodes: string[] = [];
  let disposedEdges = 0;
  const factory: SceneNodeFactory = {
    createNode: (node) => {
      const root = new THREE.Group();
      root.name = node.id;
      return {
        id: node.id,
        kind: node.kind,
        root,
        pickTargets: [root],
        focusTarget: root,
        highlightTargets: [root],
        statusTargets: [root],
        parentId: node.parentId,
        disposalOwnership: 'system'
      };
    },
    updateNode: () => undefined,
    disposeNode: (entry) => entry.root.traverse((object) => disposedNodes.push(object.name)),
    createEdge: () => new THREE.Group(),
    disposeEdge: () => { disposedEdges += 1; }
  };
  const scene = new THREE.Scene();
  const registry = new SceneRegistry();
  const system = new TopologySceneSystem(factory);
  system.attach({ scene, registry, requestRender: () => undefined });
  const first: TopologyProjection = {
    version: '1',
    nodes: [
      { id: 'core', kind: 'core', position: [0, 0, 0] },
      { id: 'satellite', kind: 'satellite', parentId: 'core', position: [2, 0, 0] }
    ],
    edges: [{ id: 'edge', fromId: 'core', toId: 'satellite' }]
  };
  system.reconcile(first);
  assert.equal(system.getObject('core')?.parent, system.getObject('satellite')?.parent);
  system.reconcile({
    version: '2',
    nodes: [{ id: 'satellite', kind: 'satellite', parentId: 'core', position: [2, 0, 0] }],
    edges: [{ id: 'edge', fromId: 'core', toId: 'satellite' }]
  });
  assert.equal(registry.get('satellite')?.root.name, 'satellite');
  assert.equal(disposedNodes.includes('satellite'), false);
  assert.equal(disposedEdges, 1);
  system.dispose();
});

test('context-loss recovery remains callable after the failed runtime is disposed', () => {
  let disposed = 0;
  let rebuilt = 0;
  const recovery = createContextLossRecoveryContract(
    () => { disposed += 1; },
    () => { rebuilt += 1; }
  );
  recovery.disposeFailedRuntime();
  recovery.requestRebuild();
  assert.equal(recovery.rebuildRequired, true);
  assert.equal(disposed, 1);
  assert.equal(rebuilt, 1);
});

test('only runtime-owned composer passes are disposed by the ownership helper', () => {
  let owned = 0;
  let external = 0;
  disposeOwnedComposerPasses([{ dispose: () => { owned += 1; } }]);
  assert.equal(owned, 1);
  assert.equal(external, 0);
  external += 1; // external owner remains responsible for its pass
  assert.equal(external, 1);
});

test('status overlays never mutate or dispose borrowed GLB materials', () => {
  const scene = new THREE.Scene();
  const registry = new SceneRegistry();
  const borrowedMaterial = new THREE.MeshStandardMaterial({ color: 0x123456 });
  let borrowedDisposals = 0;
  borrowedMaterial.dispose = () => { borrowedDisposals += 1; };
  const borrowedMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), borrowedMaterial);
  registry.register({
    id: 'orb', kind: 'orb', root: borrowedMesh, pickTargets: [borrowedMesh],
    focusTarget: borrowedMesh, highlightTargets: [borrowedMesh], statusTargets: [borrowedMesh],
    disposalOwnership: 'external', status: 'degraded'
  });
  scene.add(borrowedMesh);
  const overlays = new StatusOverlaySystem();
  overlays.attach({ scene, registry, requestRender: () => undefined });
  overlays.setSelection('orb');
  overlays.setStatus('orb', 'contained');
  assert.equal(overlays.overlayCount, 1);
  assert.equal(borrowedMaterial.color.getHex(), 0x123456);
  overlays.dispose();
  assert.equal(borrowedDisposals, 0);
  borrowedMesh.geometry.dispose();
});
