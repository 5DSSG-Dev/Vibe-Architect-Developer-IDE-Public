const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;

export function stableHash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function stableUnit(value: string): number {
  return stableHash32(value) / UINT32_MAX_PLUS_ONE;
}

export function stableVisualSeed(id: string): readonly [number, number, number] {
  return [
    stableUnit(`${id}:x`),
    stableUnit(`${id}:y`),
    stableUnit(`${id}:z`),
  ] as const;
}

export function operationProgressAt(
  replayTimeMs: number,
  event: Pick<import('./contracts.ts').OperationEvent, 'eventId' | 'observedAt'>,
  durationMs: number,
): number {
  if (durationMs <= 0) return 1;
  const startMs = Date.parse(event.observedAt);
  const phaseOffset = Math.floor(stableUnit(event.eventId) * Math.min(750, durationMs * 0.1));
  return Math.max(0, Math.min(1, (replayTimeMs - startMs + phaseOffset) / durationMs));
}
