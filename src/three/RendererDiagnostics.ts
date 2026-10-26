import type * as THREE from 'three';

export interface RendererDiagnosticsSnapshot {
  readonly capturedAtMs: number;
  readonly frame: number;
  readonly calls: number;
  readonly triangles: number;
  readonly points: number;
  readonly lines: number;
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
  readonly packetInstances: number;
  readonly pickSetSize: number;
  readonly frameTimeMs: number;
  readonly reconciliationMs: number;
}

export class RendererDiagnostics {
  private frameTimeMs = 0;
  private reconciliationMs = 0;
  private packetInstances = 0;
  private pickSetSize = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  recordFrameTime(frameTimeMs: number): void { this.frameTimeMs = frameTimeMs; }
  recordReconciliation(reconciliationMs: number): void { this.reconciliationMs = reconciliationMs; }
  recordPacketInstances(count: number): void { this.packetInstances = count; }
  recordPickSetSize(count: number): void { this.pickSetSize = count; }

  snapshot(): RendererDiagnosticsSnapshot {
    const info = this.renderer.info;
    return {
      capturedAtMs: performance.now(),
      frame: info.render.frame,
      calls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      packetInstances: this.packetInstances,
      pickSetSize: this.pickSetSize,
      frameTimeMs: this.frameTimeMs,
      reconciliationMs: this.reconciliationMs
    };
  }
}

