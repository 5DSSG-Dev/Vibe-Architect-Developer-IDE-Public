import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { CameraController } from './CameraController';
import { FrameScheduler } from './FrameScheduler';
import { RendererDiagnostics } from './RendererDiagnostics';
import { SceneRegistry } from './SceneRegistry';
import { SelectionSystem } from './SelectionSystem';
import type { RuntimeSceneAdapter } from './SceneAdapter';
import type { RuntimeFrameContext, SceneSystem, SceneWriteDomain } from './contracts';

export interface ThreeRuntimeOptions {
  readonly viewport: HTMLElement;
  readonly canvas?: HTMLCanvasElement;
  readonly initialCameraPosition?: THREE.Vector3;
  readonly initialCameraTarget?: THREE.Vector3;
  readonly homeCameraPose?: { readonly position: THREE.Vector3; readonly target: THREE.Vector3 };
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
  readonly maxPixelRatio?: number;
  readonly antialias?: boolean;
  readonly alpha?: boolean;
  readonly postprocessing?: boolean;
  readonly composerPasses?: readonly ComposerPassRegistration[];
  readonly configureComposer?: (
    composer: EffectComposer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    registerPass: (pass: Pass, ownership?: ComposerPassOwnership) => void
  ) => void;
  readonly sceneAdapter?: RuntimeSceneAdapter;
  readonly createSceneAdapter?: (scene: THREE.Scene) => RuntimeSceneAdapter;
  readonly onAfterRender?: (scene: THREE.Scene, camera: THREE.Camera) => void;
  readonly onResize?: (width: number, height: number, pixelRatio: number) => void;
  readonly onContextLost?: (recovery: ContextLossRecoveryContract) => void;
  readonly onContextRestoreAvailable?: () => void;
}

export type ComposerPassOwnership = 'runtime' | 'external';
export interface ComposerPassRegistration {
  readonly pass: Pass;
  readonly ownership?: ComposerPassOwnership;
}

export interface ContextLossRecoveryContract {
  readonly rebuildRequired: true;
  disposeFailedRuntime(): void;
  requestRebuild(): void;
}

export function createContextLossRecoveryContract(
  disposeFailedRuntime: () => void,
  requestRebuild: () => void
): ContextLossRecoveryContract {
  return { rebuildRequired: true, disposeFailedRuntime, requestRebuild };
}

export function disposeOwnedComposerPasses(passes: readonly { dispose?: () => void }[]): void {
  for (const pass of passes) pass.dispose?.();
}

/**
 * Sole owner of renderer, scene, camera, controls, composer, clock, RAF, resize,
 * context lifecycle, system write domains, and final disposal.
 */
export class ThreeRuntime {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer | null;
  readonly registry = new SceneRegistry();
  readonly selection: SelectionSystem;
  readonly cameraController: CameraController;
  readonly diagnostics: RendererDiagnostics;
  readonly clock = new THREE.Clock(false);

  private readonly scheduler: FrameScheduler;
  private readonly systems = new Map<string, SceneSystem>();
  private readonly writeOwners = new Map<SceneWriteDomain, string>();
  private readonly resizeObserver: ResizeObserver | null;
  private readonly sceneAdapter: RuntimeSceneAdapter | undefined;
  private readonly ownedComposerPasses: Pass[] = [];
  private replayTimeMs = 0;
  private reducedMotion = false;
  private frameNumber = 0;
  private disposed = false;
  private contextLost = false;

  constructor(private readonly options: ThreeRuntimeOptions) {
    const width = Math.max(1, options.viewport.clientWidth);
    const height = Math.max(1, options.viewport.clientHeight);
    this.camera = new THREE.PerspectiveCamera(
      options.fov ?? 48,
      width / height,
      options.near ?? 0.1,
      options.far ?? 500
    );
    this.camera.position.copy(options.homeCameraPose?.position ?? options.initialCameraPosition ?? new THREE.Vector3(0, 5, 12));
    if (options.sceneAdapter && options.createSceneAdapter) {
      throw new Error('Provide sceneAdapter or createSceneAdapter, not both');
    }
    this.sceneAdapter = options.sceneAdapter ?? options.createSceneAdapter?.(this.scene);
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      powerPreference: 'high-performance'
    });
    if (!options.canvas) options.viewport.appendChild(this.renderer.domElement);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 1.5));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.composer = options.postprocessing === false ? null : new EffectComposer(this.renderer);
    if (this.composer) {
      const registerPass = (pass: Pass, ownership: ComposerPassOwnership = 'runtime'): void => {
        this.composer!.addPass(pass);
        if (ownership === 'runtime') this.ownedComposerPasses.push(pass);
      };
      registerPass(new RenderPass(this.scene, this.camera));
      for (const registration of options.composerPasses ?? []) {
        registerPass(registration.pass, registration.ownership);
      }
      options.configureComposer?.(this.composer, this.scene, this.camera, registerPass);
      this.composer.setSize(width, height);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 1.5));
    }

    this.scheduler = new FrameScheduler(this.renderFrame);
    this.cameraController = new CameraController(this.camera, {
      domElement: this.renderer.domElement,
      initialTarget: options.homeCameraPose?.target ?? options.initialCameraTarget,
      onChange: () => this.invalidate(),
      onContinuousChange: (active) => this.scheduler.setContinuous('camera', active)
    });
    this.selection = new SelectionSystem(this.registry);
    this.diagnostics = new RendererDiagnostics(this.renderer);

    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, false);
    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(options.viewport);
    if (!this.resizeObserver) window.addEventListener('resize', this.resize);
    if (this.sceneAdapter?.renderPolicy?.mode === 'cadence') {
      this.scheduler.setCadence('scene-adapter', this.sceneAdapter.renderPolicy.framesPerSecond);
    }
    this.sceneAdapter?.setSize(width, height, this.renderer.getPixelRatio());
    options.onResize?.(width, height, this.renderer.getPixelRatio());
    this.invalidate();
  }

  registerSystem(system: SceneSystem): void {
    this.assertUsable();
    if (this.systems.has(system.id)) throw new Error(`Scene system already registered: ${system.id}`);
    for (const domain of system.writes) {
      const owner = this.writeOwners.get(domain);
      if (owner) throw new Error(`Scene write domain "${domain}" is already owned by ${owner}`);
    }
    for (const domain of system.writes) this.writeOwners.set(domain, system.id);
    this.systems.set(system.id, system);
    try {
      system.attach({ scene: this.scene, registry: this.registry, requestRender: () => this.invalidate() });
    } catch (error) {
      this.systems.delete(system.id);
      for (const domain of system.writes) this.writeOwners.delete(domain);
      throw error;
    }
    this.invalidate();
  }

  unregisterSystem(id: string): void {
    const system = this.systems.get(id);
    if (!system) return;
    this.scheduler.setContinuous(`system:${id}`, false);
    system.dispose();
    this.systems.delete(id);
    for (const domain of system.writes) {
      if (this.writeOwners.get(domain) === id) this.writeOwners.delete(domain);
    }
    this.invalidate();
  }

  setReplayTime(replayTimeMs: number): void {
    if (this.replayTimeMs === replayTimeMs) return;
    this.replayTimeMs = replayTimeMs;
    this.invalidate();
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (this.reducedMotion === reducedMotion) return;
    this.reducedMotion = reducedMotion;
    this.sceneAdapter?.setReducedMotion?.(reducedMotion);
    this.invalidate();
  }

  refreshSelectionTargets(): void {
    this.selection.refreshPickSet();
    this.diagnostics.recordPickSetSize(this.registry.pickTargets().length);
  }

  focusEntity(id: string, nowMs = performance.now(), durationMs = 500): boolean {
    const entry = this.registry.get(id);
    if (!entry) return false;
    const bounds = new THREE.Box3().setFromObject(entry.focusTarget);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const target = sphere.isEmpty() ? entry.focusTarget.getWorldPosition(new THREE.Vector3()) : sphere.center;
    this.cameraController.focus(target, Math.max(0.5, sphere.radius), nowMs, this.reducedMotion ? 1 : durationMs);
    return true;
  }

  resetCamera(nowMs = performance.now(), durationMs = 500): void {
    this.cameraController.reset(nowMs, this.reducedMotion ? 1 : durationMs);
  }

  invalidate(): void {
    if (!this.contextLost) this.scheduler.invalidate();
  }

  private readonly renderFrame = (timestampMs: number): void => {
    if (this.disposed || this.contextLost) return;
    const frameStartedAt = performance.now();
    if (!this.clock.running) this.clock.start();
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.1);
    const elapsedSeconds = this.clock.elapsedTime;
    this.frameNumber += 1;
    this.cameraController.update(timestampMs);
    this.sceneAdapter?.update(elapsedSeconds);
    const frame: RuntimeFrameContext = {
      deltaSeconds,
      elapsedSeconds,
      replayTimeMs: this.replayTimeMs,
      reducedMotion: this.reducedMotion,
      frameNumber: this.frameNumber,
      requestRender: () => this.invalidate()
    };
    for (const system of this.systems.values()) {
      const result = system.update?.(frame);
      this.scheduler.setContinuous(`system:${system.id}`, result?.needsContinuousRender === true);
    }
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.options.onAfterRender?.(this.scene, this.camera);
    this.diagnostics.recordFrameTime(performance.now() - frameStartedAt);
    const operationSystem = this.systems.get('operation-flow') as { activeCount?: number } | undefined;
    const messageFlowSystem = this.systems.get('message-flow') as { activeCount?: number } | undefined;
    this.diagnostics.recordPacketInstances(operationSystem?.activeCount ?? messageFlowSystem?.activeCount ?? 0);
  };

  private readonly resize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.options.viewport.clientWidth);
    const height = Math.max(1, this.options.viewport.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.options.maxPixelRatio ?? 1.5);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(width, height);
    this.sceneAdapter?.setSize(width, height, pixelRatio);
    this.options.onResize?.(width, height, pixelRatio);
    this.invalidate();
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    if (this.contextLost || this.disposed) return;
    this.contextLost = true;
    this.scheduler.stop();
    this.clock.stop();
    const recovery = createContextLossRecoveryContract(
      () => this.dispose(),
      () => this.options.onContextRestoreAvailable?.()
    );
    this.options.onContextLost?.(recovery);
    queueMicrotask(() => {
      if (!this.disposed) this.dispose();
    });
  };

  private readonly onContextRestored = (): void => {
    if (this.disposed) return;
    // Deliberately do not reuse potentially corrupt scene state. The owner can
    // offer “Restore 3D View” and construct a fresh runtime from external state.
    this.options.onContextRestoreAvailable?.();
  };

  private assertUsable(): void {
    if (this.disposed) throw new Error('ThreeRuntime is disposed');
    if (this.contextLost) throw new Error('ThreeRuntime WebGL context is lost');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scheduler.dispose();
    this.clock.stop();
    this.resizeObserver?.disconnect();
    if (!this.resizeObserver) window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored, false);
    for (const id of [...this.systems.keys()].reverse()) this.unregisterSystem(id);
    this.cameraController.dispose();
    this.selection.dispose();
    this.registry.clear();
    this.sceneAdapter?.dispose();
    disposeOwnedComposerPasses(this.ownedComposerPasses);
    this.ownedComposerPasses.length = 0;
    this.composer?.dispose();
    this.renderer.dispose();
    if (!this.options.canvas) this.renderer.domElement.remove();
  }
}
