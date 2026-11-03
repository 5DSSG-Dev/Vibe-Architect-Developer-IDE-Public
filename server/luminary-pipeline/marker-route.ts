/** Unmounted numeric route seam. Stage adapters own their findings; RBC only checks their results. */
import { createHash } from 'node:crypto';

export type Gate = 'pim' | 'irg' | 'ptag';
export type GateResult = 0 | 1;
export type HoldCode = readonly [2 | 3 | 4, 0];
export type RouteCode = HoldCode | readonly [1, 1];
export interface Finding {
  kind: 'incoherence' | 'unsure' | 'operational_error';
  reason: string;
  evidence?: string;
}
export interface MarkerEntry {
  gate: Gate;
  result: GateResult;
  finding?: Finding;
}
export interface Marker {
  candidateHash: string;
  entries: readonly MarkerEntry[];
}
export interface RouteOutcome {
  readonly code: RouteCode | null;
  readonly destination: 'prism' | 'conscience' | 'shortfall';
  readonly marker: Marker;
  readonly error?: string;
}
export type GateCheck = (candidate: string) => Promise<unknown> | unknown;
export interface GateChecks { pim: GateCheck; irg: GateCheck; ptag: GateCheck }

const gates: readonly Gate[] = ['pim', 'irg', 'ptag'];
const holdNumber: Record<Gate, 2 | 3 | 4> = { pim: 2, irg: 3, ptag: 4 };

function ownData(raw: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(raw, key);
  if (!descriptor || !('value' in descriptor)) throw new Error('accessor_or_missing');
  return descriptor.value;
}

function captureResult(raw: unknown): { result: GateResult; finding?: Finding } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  try {
    const value = raw as object;
    const keys = Object.keys(value);
    if (keys.some((key) => key !== 'result' && key !== 'finding' && key !== 'gate')) return null;
    const result = ownData(value, 'result');
    if (result !== 0 && result !== 1) return null;
    if (result === 1) return keys.includes('finding') ? null : { result: 1 };
    const findingRaw = ownData(value, 'finding');
    if (!findingRaw || typeof findingRaw !== 'object' || Array.isArray(findingRaw)) return null;
    const findingKeys = Object.keys(findingRaw);
    if (findingKeys.some((key) => !['kind', 'reason', 'evidence'].includes(key))) return null;
    const kind = ownData(findingRaw, 'kind');
    const reason = ownData(findingRaw, 'reason');
    const evidence = findingKeys.includes('evidence') ? ownData(findingRaw, 'evidence') : undefined;
    if (kind !== 'incoherence' && kind !== 'unsure' && kind !== 'operational_error') return null;
    if (typeof reason !== 'string' || !reason.trim() || (evidence !== undefined && typeof evidence !== 'string')) return null;
    return { result: 0, finding: { kind, reason, ...(evidence === undefined ? {} : { evidence }) } };
  } catch { return null; }
}

/** RBC's fixed correspondence: only a complete sequence of ones resonates with Prism. */
function resonate(marker: Marker, candidate: string): RouteOutcome {
  const hash = createHash('sha256').update(candidate).digest('hex');
  if (marker.candidateHash !== hash) return { code: null, destination: 'shortfall', marker, error: 'candidate_mismatch' };
  if (marker.entries.length === 0 || marker.entries.length > 3) return { code: null, destination: 'shortfall', marker, error: 'incomplete_marker' };
  for (let index = 0; index < marker.entries.length; index += 1) {
    const entry = marker.entries[index];
    if (entry.gate !== gates[index] || !captureResult(entry)) return { code: null, destination: 'shortfall', marker, error: 'invalid_marker' };
    if (entry.result === 0) {
      if (index !== marker.entries.length - 1) return { code: null, destination: 'shortfall', marker, error: 'continued_after_hold' };
      return { code: [holdNumber[entry.gate], 0], destination: 'conscience', marker };
    }
  }
  if (marker.entries.length !== 3) return { code: null, destination: 'shortfall', marker, error: 'incomplete_marker' };
  return { code: [1, 1], destination: 'prism', marker };
}

function seal(outcome: RouteOutcome): RouteOutcome {
  for (const entry of outcome.marker.entries) {
    if (entry.finding) Object.freeze(entry.finding);
    Object.freeze(entry);
  }
  Object.freeze(outcome.marker.entries);
  Object.freeze(outcome.marker);
  if (outcome.code) Object.freeze(outcome.code);
  return Object.freeze(outcome);
}

/** Run each gate at most once; a zero never calls later gates. */
export async function examine(candidate: string, checks: GateChecks): Promise<RouteOutcome> {
  const marker: Marker = { candidateHash: createHash('sha256').update(candidate).digest('hex'), entries: [] };
  const entries = marker.entries as MarkerEntry[];
  for (const gate of gates) {
    let raw: unknown;
    try { raw = await checks[gate](candidate); }
    catch (error) {
      return seal({ code: null, destination: 'shortfall', marker, error: `${gate}_error: ${error instanceof Error ? error.message : String(error)}` });
    }
    const captured = captureResult(raw);
    if (!captured) return seal({ code: null, destination: 'shortfall', marker, error: `${gate}_invalid_result` });
    entries.push({ gate, ...captured });
    if (captured.result === 0) break;
  }
  return seal(resonate(marker, candidate));
}
