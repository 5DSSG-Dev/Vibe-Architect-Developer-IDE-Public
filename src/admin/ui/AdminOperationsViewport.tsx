import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Aether } from '../../engine/Aether';
import { gltfModelCache, preloadAllGltfModels } from '../../utils/gltfLoaderService';
import {
  createSceneOwnedAdapter,
  MessageFlowSystem,
  OperationFlowSystem,
  SharedAssetManager,
  StatusOverlaySystem,
  ThreeRuntime,
  TopologySceneSystem,
  type ContextLossRecoveryContract,
  type MessageFlowProjection,
  type OperationProjection,
  type OperationalStatus,
  type TopologyProjection,
} from '../../three/index';
import { AdminSceneNodeFactory } from '../../three/admin/AdminSceneNodeFactory';
import type { ComponentKind } from '../domain/index.ts';
import { createMessageFlowProjection } from '../projection/messageFlowProjection.ts';

const EMPTY_MESSAGE_FLOW = createMessageFlowProjection();

export interface AdminOperationsViewportProps {
  topology: TopologyProjection;
  operations: readonly OperationProjection[];
  replayTimeMs: number;
  playbackActive: boolean;
  reducedMotion: boolean;
  selectedComponent?: { kind: ComponentKind; id: string };
  onSelectComponent(component?: { kind: ComponentKind; id: string }): void;
  enabled: boolean;
  focusRequest: number;
  resetRequest: number;
  statusByComponent: ReadonlyMap<string, OperationalStatus>;
  /** Flow is the default service-observation shot; topology remains literal and available. */
  viewMode?: 'flow' | 'topology';
  messageFlow?: MessageFlowProjection;
}

export function AdminOperationsViewport({
  topology,
  operations,
  replayTimeMs,
  playbackActive,
  reducedMotion,
  selectedComponent,
  onSelectComponent,
  enabled,
  focusRequest,
  resetRequest,
  statusByComponent,
  viewMode = 'flow',
  messageFlow,
}: AdminOperationsViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeRuntime | null>(null);
  const topologyRef = useRef<TopologySceneSystem | null>(null);
  const flowRef = useRef<OperationFlowSystem | null>(null);
  const messageFlowRef = useRef<MessageFlowSystem | null>(null);
  const overlayRef = useRef<StatusOverlaySystem | null>(null);
  const recoveryRef = useRef<ContextLossRecoveryContract | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const latestTopologyRef = useRef(topology);
  latestTopologyRef.current = topology;
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [viewportState, setViewportState] = useState<'ready' | 'loading' | 'lost' | 'unsupported'>('loading');

  useEffect(() => {
    if (!enabled || !viewportRef.current) return;
    let disposed = false;
    let runtime: ThreeRuntime | undefined;
    const assets = new SharedAssetManager();
    try {
      runtime = new ThreeRuntime({
        viewport: viewportRef.current,
        homeCameraPose: viewMode === 'flow' ? {
          position: new THREE.Vector3(0, 5.8, 19),
          target: new THREE.Vector3(0, -0.35, 0),
        } : {
          position: new THREE.Vector3(0, 6.5, 14.5),
          target: new THREE.Vector3(0, 0, 0),
        },
        fov: viewMode === 'flow' ? 44 : 48,
        maxPixelRatio: 1.5,
        postprocessing: true,
        createSceneAdapter: (scene) => createSceneOwnedAdapter(scene, () => new Aether(scene, {
          ambientIntensity: 1.05,
          directionalIntensity: 1.6,
          directionalAngle: 0.78,
        }), 12),
        onContextLost: (recovery) => {
          if (!disposed) {
            recoveryRef.current = recovery;
            setViewportState('lost');
          }
        },
        onContextRestoreAvailable: () => {
          if (!disposed) {
            recoveryRef.current = null;
            setViewportState('loading');
            setRestoreNonce((value) => value + 1);
          }
        },
      });
      runtime.scene.fog = new THREE.Fog(0x080b10, 18, 46);
      runtime.cameraController.controls.enablePan = false;
      runtime.cameraController.controls.minPolarAngle = Math.PI * 0.16;
      runtime.cameraController.controls.maxPolarAngle = Math.PI * 0.82;
      runtime.cameraController.controls.update();

      assets.registerBorrowedCache(gltfModelCache, (group) => group.clone(true));
      const factory = new AdminSceneNodeFactory(assets);
      const topologySystem = viewMode === 'topology' ? new TopologySceneSystem(factory) : null;
      const flowSystem = viewMode === 'topology' ? new OperationFlowSystem({ capacity: 128 }) : null;
      const messageSystem = viewMode === 'flow' ? new MessageFlowSystem(128) : null;
      const overlaySystem = viewMode === 'topology' ? new StatusOverlaySystem() : null;
      if (viewMode === 'flow') {
        runtime.registerSystem(messageSystem!);
        messageSystem!.setProjection(messageFlow ?? EMPTY_MESSAGE_FLOW);
        messageSystem!.setPlaybackActive(playbackActive);
      } else {
        runtime.registerSystem(topologySystem!);
        runtime.registerSystem(flowSystem!);
        runtime.registerSystem(overlaySystem!);
        topologySystem!.reconcile(topology);
        overlaySystem!.refresh();
        flowSystem!.setOperations(operations);
        flowSystem!.setPlaybackActive(playbackActive);
      }
      runtime.setReplayTime(replayTimeMs);
      runtime.setReducedMotion(reducedMotion);
      runtime.refreshSelectionTargets();
      runtimeRef.current = runtime;
      topologyRef.current = topologySystem;
      flowRef.current = flowSystem;
      messageFlowRef.current = messageSystem;
      overlayRef.current = overlaySystem;
      setViewportState('ready');

      void preloadAllGltfModels(runtime.renderer).then(() => {
        if (disposed || !runtime) return;
        assets.registerBorrowedCache(gltfModelCache, (group) => group.clone(true));
        if (viewMode === 'topology') {
          topologySystem!.reconcile(latestTopologyRef.current);
          runtime.refreshSelectionTargets();
          overlaySystem!.refresh();
        }
      });
    } catch (error) {
      console.error('[Admin Operations] WebGL viewport unavailable', error);
      runtime?.dispose();
      assets.dispose();
      setViewportState('unsupported');
    }

    return () => {
      disposed = true;
      runtimeRef.current = null;
      topologyRef.current = null;
      flowRef.current = null;
      messageFlowRef.current = null;
      overlayRef.current = null;
      recoveryRef.current = null;
      runtime?.dispose();
      assets.dispose();
    };
  }, [enabled, restoreNonce, viewMode]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const system = topologyRef.current;
    if (!runtime || !system) return;
    system.reconcile(topology);
    runtime.refreshSelectionTargets();
    overlayRef.current?.refresh();
  }, [topology]);

  useEffect(() => {
    flowRef.current?.setOperations(operations);
  }, [operations]);

  useEffect(() => {
    if (messageFlow) messageFlowRef.current?.setProjection(messageFlow);
  }, [messageFlow]);

  useEffect(() => {
    flowRef.current?.setPlaybackActive(playbackActive);
    messageFlowRef.current?.setPlaybackActive(playbackActive);
  }, [playbackActive]);

  useEffect(() => {
    runtimeRef.current?.setReplayTime(replayTimeMs);
  }, [replayTimeMs]);

  useEffect(() => {
    runtimeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    overlayRef.current?.setSelection(selectedComponent?.id ?? null);
  }, [selectedComponent]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    for (const node of topology.nodes) overlay.setStatus(node.id, statusByComponent.get(node.id) ?? node.status ?? null);
    overlay.refresh();
  }, [statusByComponent, topology]);

  useEffect(() => {
    if (selectedComponent && focusRequest > 0) runtimeRef.current?.focusEntity(selectedComponent.id);
  }, [focusRequest, selectedComponent]);

  useEffect(() => {
    if (resetRequest > 0) runtimeRef.current?.resetCamera();
  }, [resetRequest]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime || !viewportRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const hit = runtime.selection.pick(
      event.clientX,
      event.clientY,
      viewportRef.current.getBoundingClientRect(),
      runtime.camera,
    );
    if (!hit) return onSelectComponent(undefined);
    const domainKind = hit.entry.metadata?.domainKind;
    const kind = typeof domainKind === 'string'
      ? domainKind as ComponentKind
      : hit.entry.kind === 'core' ? 'pod' : hit.entry.kind;
    onSelectComponent({ kind, id: hit.entry.id });
  };

  if (!enabled) {
    return <div className="admin-viewport-state"><strong>DOM Operations View</strong><span>3D is disabled at this viewport size.</span></div>;
  }

  return (
    <div
      ref={viewportRef}
      className="admin-viewport"
      role="application"
      aria-label={viewMode === 'flow'
        ? 'Service message flow three-dimensional viewport. Observe Sender ingress, PIM, IRG, CORE transit, RBC, then Prism delivery to Receiver or IDS return to Sender.'
        : 'POD operations three-dimensional viewport. Orbit with pointer or touch. Select a component to inspect it.'}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {viewportState === 'loading' && <div className="admin-viewport-state" aria-live="polite">Preparing POD viewport…</div>}
      {viewportState === 'lost' && (
        <div className="admin-viewport-state" role="alert">
          <strong>3D context was lost</strong>
          <span>The operational DOM view remains available.</span>
          <button type="button" onClick={() => recoveryRef.current?.requestRebuild()}>
            Restore 3D View
          </button>
        </div>
      )}
      {viewportState === 'unsupported' && (
        <div className="admin-viewport-state" role="status">
          <strong>3D view unavailable</strong>
          <span>Use the topology, inspector, and timeline controls.</span>
        </div>
      )}
      <div className="admin-viewport-hint" aria-hidden="true">{viewMode === 'flow' ? 'MESSAGE FLOW · ORBIT · REPLAY' : 'ORBIT · SELECT · FOCUS'}</div>
    </div>
  );
}
