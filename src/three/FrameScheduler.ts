export interface AnimationFrameDriver {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export interface DelayDriver {
  schedule(callback: () => void, delayMs: number): number;
  cancel(handle: number): void;
}

const browserDriver: AnimationFrameDriver = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle)
};

const browserDelayDriver: DelayDriver = {
  schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel: (handle) => window.clearTimeout(handle)
};

/** One RAF owner: active work renders continuously; idle scenes render only when invalidated. */
export class FrameScheduler {
  private handle: number | null = null;
  private delayHandle: number | null = null;
  private invalidated = false;
  private disposed = false;
  private readonly activeReasons = new Set<string>();
  private readonly cadenceIntervals = new Map<string, number>();

  constructor(
    private readonly onFrame: (timestampMs: number) => void,
    private readonly driver: AnimationFrameDriver = browserDriver,
    private readonly delayDriver: DelayDriver = browserDelayDriver
  ) {}

  invalidate(): void {
    if (this.disposed) return;
    this.invalidated = true;
    this.schedule();
  }

  setContinuous(reason: string, active: boolean): void {
    if (this.disposed) return;
    if (active) this.activeReasons.add(reason);
    else this.activeReasons.delete(reason);
    if (active) {
      this.cancelCadenceDelay();
      this.schedule();
    } else {
      this.scheduleCadence();
    }
  }

  /** Bounded low-frequency rendering for atmosphere without a 60fps idle loop. */
  setCadence(reason: string, framesPerSecond: number | null): void {
    if (this.disposed) return;
    if (framesPerSecond === null || framesPerSecond <= 0) this.cadenceIntervals.delete(reason);
    else this.cadenceIntervals.set(reason, 1000 / framesPerSecond);
    this.scheduleCadence();
  }

  get isContinuous(): boolean {
    return this.activeReasons.size > 0;
  }

  get continuousReasons(): readonly string[] {
    return [...this.activeReasons];
  }

  private schedule(): void {
    if (this.handle !== null || this.disposed) return;
    this.handle = this.driver.request(this.tick);
  }

  private readonly tick = (timestampMs: number): void => {
    this.handle = null;
    if (this.disposed) return;
    if (!this.invalidated && !this.isContinuous) return;
    this.invalidated = false;
    this.onFrame(timestampMs);
    if (this.invalidated || this.isContinuous) this.schedule();
    else this.scheduleCadence();
  };

  private scheduleCadence(): void {
    if (this.disposed || this.isContinuous || this.delayHandle !== null || this.cadenceIntervals.size === 0) return;
    const delayMs = Math.max(1, Math.min(...this.cadenceIntervals.values()));
    this.delayHandle = this.delayDriver.schedule(() => {
      this.delayHandle = null;
      this.invalidate();
    }, delayMs);
  }

  private cancelCadenceDelay(): void {
    if (this.delayHandle !== null) this.delayDriver.cancel(this.delayHandle);
    this.delayHandle = null;
  }

  stop(): void {
    if (this.handle !== null) this.driver.cancel(this.handle);
    this.handle = null;
    this.cancelCadenceDelay();
    this.invalidated = false;
    this.activeReasons.clear();
    this.cadenceIntervals.clear();
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }
}
