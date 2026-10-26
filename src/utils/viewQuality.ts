// ---------------------------------------------------------------------------
// View quality presets + reduced-motion detection for the main CORE scene.
//
// Batch 2 render controls. These are display-only levers over the WebGL view:
// a preset selects a device-pixel-ratio cap and whether the bloom pass runs,
// and reduced motion follows the OS accessibility preference by default while
// remaining user-overridable. Nothing here touches the manifest, the catalog,
// or any Stellar execution path.
// ---------------------------------------------------------------------------

export type QualityPreset = 'high' | 'balanced' | 'low';

export interface QualitySettings {
  /** Upper bound applied to window.devicePixelRatio when sizing the renderer. */
  readonly maxPixelRatio: number;
  /** Whether the UnrealBloom post pass runs at this preset by default. */
  readonly bloom: boolean;
}

// High keeps the current look (pixel ratio capped at 2, bloom on). Balanced
// trims the pixel ratio to 1.5 — the same cap the shared ThreeRuntime uses —
// while keeping bloom. Low drops to 1.0 and turns bloom off, the cheapest pass
// that still renders the scene.
export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  high: { maxPixelRatio: 2, bloom: true },
  balanced: { maxPixelRatio: 1.5, bloom: true },
  low: { maxPixelRatio: 1, bloom: false },
};

export const DEFAULT_QUALITY_PRESET: QualityPreset = 'high';

/** Ordered list for rendering the preset selector. */
export const QUALITY_PRESET_ORDER: readonly QualityPreset[] = ['high', 'balanced', 'low'];

export const QUALITY_PRESET_LABELS: Record<QualityPreset, string> = {
  high: 'High',
  balanced: 'Balanced',
  low: 'Low',
};

/**
 * Effective device pixel ratio for a preset: never above the display's own
 * ratio, and never above the preset cap. Guarded so it also returns a sane
 * value in a non-DOM test environment.
 */
export function effectivePixelRatio(preset: QualityPreset, devicePixelRatio?: number): number {
  const dpr = typeof devicePixelRatio === 'number'
    ? devicePixelRatio
    : (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1);
  return Math.min(Math.max(dpr, 0.5), QUALITY_PRESETS[preset].maxPixelRatio);
}

/**
 * True when the OS asks for reduced motion. Guarded for SSR / test runners that
 * have no matchMedia, where it resolves to false (full motion) by default.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
