/** Unmounted projection of the private PTAG v0.1 output validation contract. */
import type { PtagCheck } from './marker-adapters.js';
import { createHash } from 'node:crypto';

export interface PtagContext {
  caseId: string;
  attemptId: string;
  eligibleFactIds: ReadonlySet<string>;
  /** Trusted binding for this exact candidate and its approved context. */
  contextBinding: string | null;
  candidateHash: string;
}

/** A fresh attempt ID and trusted candidate/context values determine the only live case ID. */
export function derivePtagCaseId(candidateHash: string, contextBinding: string | null, attemptId: string): string {
  if (!/^[0-9a-f]{64}$/.test(candidateHash) || typeof attemptId !== 'string' || !attemptId.trim()) throw new Error('invalid_ptag_evaluation_identity');
  return `ptag:${createHash('sha256').update(JSON.stringify([candidateHash, contextBinding, attemptId])).digest('hex')}`;
}

const keys = ['case_id', 'decision', 'identify', 'rationale', 'matched_fact_ids', 'material_units', 'complete_coverage', 'context_binding'];
const validated = new WeakMap<object, { candidateHash: string; consumed: boolean }>();

export function projectValidatedPtagVerdict(raw: unknown, candidate: string): { decision: 'yes' | 'no' | 'unsure'; reason?: string; evidence?: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const admission = validated.get(raw);
  if (!admission || admission.consumed || admission.candidateHash !== createHash('sha256').update(candidate).digest('hex')) return null;
  admission.consumed = true;
  const verdict = raw as { decision: 'yes' | 'no' | 'unsure'; reason?: string; evidence?: string };
  return { decision: verdict.decision, ...(verdict.reason === undefined ? {} : { reason: verdict.reason }), ...(verdict.evidence === undefined ? {} : { evidence: verdict.evidence }) };
}

function captureArray(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4096) throw new Error('array_not_bounded_plain_data');
  const items: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor)) throw new Error('array_accessor_or_hole');
    items.push(descriptor.value);
  }
  return items;
}

function captureOutput(output: unknown): Record<string, unknown> | null {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
  try {
    if (Object.getPrototypeOf(output) !== Object.prototype) return null;
    const ownKeys = Reflect.ownKeys(output);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(output);
    const snapshot: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!('value' in descriptor)) return null;
      Object.defineProperty(snapshot, key, { value: captureArray(descriptor.value), enumerable: true, configurable: true, writable: true });
    }
    return snapshot;
  } catch { return null; }
}

export function validatePtagEnvelope(candidate: string, context: PtagContext, output: unknown): string[] {
  const value = captureOutput(output);
  if (!value) return ['output_not_plain_data'];
  const errors: string[] = [];
  if (createHash('sha256').update(candidate).digest('hex') !== context.candidateHash) errors.push('candidate_digest_mismatch');
  if (Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) errors.push('output_keys_invalid');
  if (!['pass', 'boundary', 'unsure'].includes(String(value.decision))) errors.push('decision_invalid');
  if (value.case_id !== context.caseId) errors.push('case_id_mismatch');
  if (typeof value.identify !== 'string' || !value.identify.trim()) errors.push('identify_invalid');
  if (typeof value.rationale !== 'string' || !value.rationale.trim()) errors.push('rationale_invalid');
  if (!Array.isArray(value.matched_fact_ids) || value.matched_fact_ids.some((id) => typeof id !== 'string')) errors.push('matched_fact_ids_invalid');
  else if (value.matched_fact_ids.some((id) => !context.eligibleFactIds.has(id))) errors.push('matched_fact_ineligible');
  if (!Array.isArray(value.material_units) || value.material_units.length === 0 || value.material_units.some((unit) => typeof unit !== 'string' || !unit || !candidate.includes(unit))) errors.push('material_unit_not_candidate_span');
  if (typeof value.complete_coverage !== 'boolean') errors.push('complete_coverage_invalid');
  if ((value.decision === 'pass' || value.decision === 'boundary') && value.complete_coverage !== true) errors.push('releasing_decision_without_complete_coverage');
  if (value.decision === 'boundary' && Array.isArray(value.matched_fact_ids) && value.matched_fact_ids.length === 0) errors.push('boundary_without_fact');
  if (value.decision === 'pass' && (typeof value.context_binding !== 'string' || !value.context_binding.trim())) errors.push('pass_without_context_binding');
  if (value.context_binding !== context.contextBinding) errors.push('context_binding_mismatch');
  return errors;
}

export function validatedPtagCheck(context: PtagContext, produce: (candidate: string) => Promise<unknown> | unknown): PtagCheck {
  // Capture trusted expectations before any asynchronous producer can mutate them.
  const expected: PtagContext = {
    caseId: context.caseId,
    attemptId: context.attemptId,
    candidateHash: context.candidateHash,
    contextBinding: context.contextBinding,
    eligibleFactIds: new Set(context.eligibleFactIds),
  };
  return async (candidate) => {
    if (expected.caseId !== derivePtagCaseId(expected.candidateHash, expected.contextBinding, expected.attemptId)) {
      throw new Error('ptag_validation: evaluation_identity_mismatch');
    }
    const output = await produce(candidate);
    const captured = captureOutput(output);
    const errors = validatePtagEnvelope(candidate, expected, captured);
    if (errors.length) throw new Error(`ptag_validation: ${errors.join(', ')}`);
    const value = captured as { decision: 'pass' | 'boundary' | 'unsure'; rationale: string; material_units: string[] };
    const verdict = value.decision === 'pass' ? { decision: 'yes' }
      : { decision: value.decision === 'boundary' ? 'no' : 'unsure', reason: value.rationale, evidence: value.material_units.join('; ') };
    const immutableVerdict = Object.freeze(verdict);
    validated.set(immutableVerdict, { candidateHash: expected.candidateHash, consumed: false });
    return immutableVerdict;
  };
}
