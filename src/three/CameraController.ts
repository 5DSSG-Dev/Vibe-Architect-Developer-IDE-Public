import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraPose {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
}

export interface CameraControllerOptions {
  readonly domElement: HTMLElement;
  readonly initialTarget?: THREE.Vector3;
  readonly minDistance?: number;
  readonly maxDistance?: number;
  readonly onChange?: () => void;
  readonly onContinuousChange?: (active: boolean) => void;
  readonly onFocusCancelled?: () => void;
}

interface CameraTransition {
  startedAtMs: number;
  durationMs: number;
  from: CameraPose;
  to: CameraPose;
}

export function easeInOutCubic(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** The only writer of camera pose and OrbitControls target. */
export class CameraController {
  readonly controls: OrbitControls;
  private readonly home: CameraPose;
  private transition: CameraTransition | null = null;
  private settling = false;

  constructor(readonly camera: THREE.PerspectiveCamera, private readonly options: CameraControllerOptions) {
    this.controls = new OrbitControls(camera, options.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = options.minDistance ?? 2;
    this.controls.maxDistance = options.maxDistance ?? 80;
    this.controls.target.copy(options.initialTarget ?? new THREE.Vector3());
    this.controls.update();
    this.home = this.capturePose();
    this.controls.addEventListener('start', this.onControlStart);
    this.controls.addEventListener('change', this.onControlChange);
    this.controls.addEventListener('end', this.onControlEnd);
  }

  capturePose(): CameraPose {
    return { position: this.camera.position.clone(), target: this.controls.target.clone() };
  }

  focus(target: THREE.Vector3, radius: number, nowMs: number, durationMs = 500): void {
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0.25, 1).normalize();
    const distance = THREE.MathUtils.clamp(radius * 2.8, this.controls.minDistance, this.controls.maxDistance);
    this.transition = {
      startedAtMs: nowMs,
      durationMs: Math.max(1, durationMs),
      from: this.capturePose(),
      to: { position: target.clone().addScaledVector(direction, distance), target: target.clone() }
    };
    this.options.onContinuousChange?.(true);
  }

  reset(nowMs: number, durationMs = 500): void {
    this.transition = {
      startedAtMs: nowMs,
      durationMs: Math.max(1, durationMs),
      from: this.capturePose(),
      to: { position: this.home.position.clone(), target: this.home.target.clone() }
    };
    this.options.onContinuousChange?.(true);
  }

  cancelFocus(notify = true): void {
    if (!this.transition) return;
    this.transition = null;
    if (notify) this.options.onFocusCancelled?.();
  }

  update(nowMs: number): boolean {
    if (this.transition) {
      const raw = (nowMs - this.transition.startedAtMs) / this.transition.durationMs;
      const t = easeInOutCubic(raw);
      this.camera.position.lerpVectors(this.transition.from.position, this.transition.to.position, t);
      this.controls.target.lerpVectors(this.transition.from.target, this.transition.to.target, t);
      this.controls.update();
      this.options.onChange?.();
      if (raw >= 1) this.transition = null;
    } else if (this.settling) {
      const changed = this.controls.update();
      this.options.onChange?.();
      if (!changed) this.settling = false;
    }
    const active = Boolean(this.transition) || this.settling;
    this.options.onContinuousChange?.(active);
    return active;
  }

  private readonly onControlStart = (): void => {
    this.cancelFocus(true);
    this.settling = true;
    this.options.onContinuousChange?.(true);
  };

  private readonly onControlChange = (): void => this.options.onChange?.();

  private readonly onControlEnd = (): void => {
    this.settling = true;
    this.options.onContinuousChange?.(true);
  };

  dispose(): void {
    this.controls.removeEventListener('start', this.onControlStart);
    this.controls.removeEventListener('change', this.onControlChange);
    this.controls.removeEventListener('end', this.onControlEnd);
    this.controls.dispose();
    this.transition = null;
  }
}

