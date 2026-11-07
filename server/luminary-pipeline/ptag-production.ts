import { pimSha256 } from './pim-registry-core.js';
import type { ExchangeDirection } from '../luminary-bidirectional.js';

export interface OperatingFact {
  id: string; kind: 'role' | 'constraint' | 'capability' | 'event'; active: boolean;
  directions: ExchangeDirection[]; evidenceIds: string[];
}
export interface TrustedEvidence {
  id: string; factIds: string[]; provenance: 'system' | 'recorded-state'; scope: 'contract' | 'attempt';
  requestId: string | null; attemptId: string | null; issuedAt: number; expiresAt: number | null; revoked: boolean;
}
export interface ProductionPtagBinding {
  caseId: string; candidateHash: string; byteLength: number; direction: ExchangeDirection; requestId: string; attemptId: string;
  contextHash: string; contractHash: string; projectionHash: string; evidenceHash: string;
}
export interface ProductionPtagContext { binding: ProductionPtagBinding; facts: OperatingFact[]; evidence: TrustedEvidence[]; now: number }

function object(raw: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!raw || Object.getPrototypeOf(raw) !== Object.prototype) throw new Error('ptag_output_shape');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  if (Reflect.ownKeys(raw).length !== fields.length || fields.some(key => !descriptors[key] || !('value' in descriptors[key])))
    throw new Error('ptag_output_fields');
  return Object.fromEntries(fields.map(key => [key, descriptors[key].value]));
}
const kinds = ['informational', 'non-operative', 'operative-request', 'operative-proposal', 'permission-claim', 'completion-claim', 'other-claim'];
const nonOperative = new Set(['informational', 'non-operative']);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 256
  && value.every(item => typeof item === 'string' && item.trim()) && new Set(value).size === value.length;

/** Source positions belong to code, not to a model estimating characters from tokens. */
export function sourceBoundaries(candidate: string): number[] {
  const positions = [0];
  for (let index = 0; index < candidate.length; index++) if (candidate[index] === '\n') positions.push(index + 1);
  if (positions.at(-1) !== candidate.length) positions.push(candidate.length);
  if (positions.length <= 257) return positions;
  const stride = Math.ceil((positions.length - 1) / 256);
  return positions.filter((_position, index) => index % stride === 0 || index === positions.length - 1);
}

export function evidenceEligible(evidence: TrustedEvidence, fact: OperatingFact, context: ProductionPtagContext): boolean {
  if (!fact.active || !fact.directions.includes(context.binding.direction) || !fact.evidenceIds.includes(evidence.id)
    || !evidence.factIds.includes(fact.id) || !['system', 'recorded-state'].includes(evidence.provenance)
    || evidence.revoked || !Number.isFinite(evidence.issuedAt) || evidence.issuedAt > context.now
    || (evidence.expiresAt !== null && (!Number.isFinite(evidence.expiresAt) || evidence.expiresAt <= context.now))) return false;
  if (evidence.scope === 'attempt') return evidence.requestId === context.binding.requestId && evidence.attemptId === context.binding.attemptId
    && evidence.expiresAt !== null;
  return evidence.scope === 'contract' && evidence.requestId === null && evidence.attemptId === null
    && (fact.kind === 'role' || fact.kind === 'constraint');
}

/** v1.1 production validator; the earlier recorded-output envelope remains diagnostic only. */
export function validateProductionPtag(candidate: string, context: ProductionPtagContext, raw: unknown): { decision: 'yes' | 'no' | 'unsure' } {
  const value = object(raw, ['binding', 'decision', 'identify', 'rationale', 'noObligations', 'extractionComplete', 'units']);
  const binding = object(value.binding, Object.keys(context.binding));
  if (Object.keys(context.binding).some(key => binding[key] !== context.binding[key as keyof ProductionPtagBinding])
    || context.binding.candidateHash !== pimSha256(candidate) || context.binding.byteLength !== Buffer.byteLength(candidate, 'utf8'))
    throw new Error('ptag_binding_mismatch');
  if (!['pass', 'boundary', 'unsure'].includes(String(value.decision)) || typeof value.identify !== 'string' || !value.identify.trim()
    || typeof value.rationale !== 'string' || !value.rationale.trim() || typeof value.noObligations !== 'boolean'
    || value.extractionComplete !== true || !Array.isArray(value.units) || value.units.length === 0 || value.units.length > 256)
    throw new Error('ptag_extraction_invalid');
  let end = 0;
  let obligations = 0;
  let conflict = false;
  let unsure = false;
  const positions = new Set(sourceBoundaries(candidate));
  for (const rawUnit of value.units) {
    const unit = object(rawUnit, ['start', 'end', 'kind', 'result', 'factIds', 'evidenceIds']);
    if (!Number.isSafeInteger(unit.start) || !Number.isSafeInteger(unit.end) || unit.start !== end
      || (unit.end as number) <= end || (unit.end as number) > candidate.length || !kinds.includes(String(unit.kind))
      || !positions.has(unit.start as number) || !positions.has(unit.end as number)
      || !['compatible', 'conflict', 'unsure'].includes(String(unit.result)) || !strings(unit.factIds) || !strings(unit.evidenceIds))
      throw new Error('ptag_material_units_invalid');
    end = unit.end as number;
    const isObligation = !nonOperative.has(String(unit.kind));
    if (isObligation) obligations++;
    if (unit.result === 'unsure') { unsure = true; continue; }
    if (!isObligation && unit.result === 'compatible' && unit.factIds.length === 0 && unit.evidenceIds.length === 0) continue;
    const facts = unit.factIds.map(id => context.facts.find(fact => fact.id === id));
    const evidence = unit.evidenceIds.map(id => context.evidence.find(entry => entry.id === id));
    const eligible = facts.length > 0 && evidence.length > 0 && facts.every(fact => fact && evidence.some(entry => entry && evidenceEligible(entry, fact, context)))
      && evidence.every(entry => entry && facts.some(fact => fact && evidenceEligible(entry, fact, context)));
    if (!eligible) { unsure = true; continue; }
    // A role fact cannot attest that a permission exists or an effect happened in this attempt.
    if (unit.result === 'compatible' && (unit.kind === 'permission-claim' || unit.kind === 'completion-claim')
      && !facts.some(fact => fact?.kind === 'event' && evidence.some(entry => entry && evidenceEligible(entry, fact, context)))) {
      unsure = true; continue;
    }
    if (unit.result === 'conflict') conflict = true;
  }
  if (end !== candidate.length || value.noObligations !== (obligations === 0)) throw new Error('ptag_coverage_mismatch');
  // Missing eligible evidence weakens the proposed conclusion; it never creates a boundary or pass.
  if (unsure && !conflict) return { decision: 'unsure' };
  const expected = conflict ? 'boundary' : 'pass';
  if (value.decision === 'unsure') return { decision: 'unsure' };
  if (value.decision !== expected) throw new Error('ptag_aggregate_mismatch');
  return { decision: conflict ? 'no' : 'yes' };
}
