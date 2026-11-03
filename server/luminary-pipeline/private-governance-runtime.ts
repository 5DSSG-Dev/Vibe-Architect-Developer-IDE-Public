import { randomUUID } from 'node:crypto';
import type { AskModel } from '../luminary-reply-router.js';
import type { ExchangeDirection, GovernanceRuntime } from '../luminary-bidirectional.js';
import { pimSha256, pimRegistryHash, pimPatternSetHash, scanPimRegistry, type PimRegistry, type PimScanLimits, type PimRegistryFinding } from './pim-registry-core.js';
import { examine, type GateCheck } from './marker-route.js';
import { SEVEN_VIRTUES, validateReadings, validateThresholds, readIrg, type VirtueThresholds } from './irg.js';
import { validateProductionPtag, evidenceEligible, sourceBoundaries, type OperatingFact, type TrustedEvidence, type ProductionPtagContext } from './ptag-production.js';
import type { PrivateDecisionSink } from './private-decision-log.js';

export type InferenceStage = 'identify' | 'irg' | 'ptag';
export type GateInference = (stage: InferenceStage, request: {
  system: string; input: Readonly<Record<string, unknown>>; timeoutMs: number; signal: AbortSignal;
}) => Promise<unknown>;

export interface GovernancePolicy {
  registry: PimRegistry;
  limits: PimScanLimits;
  thresholds: VirtueThresholds;
  prompts: Record<InferenceStage, string>;
  contract: { id: string; text: string; eligibleFactIds: string[]; facts: OperatingFact[]; evidence: TrustedEvidence[] };
  projections: Record<string, { description: string; allowedFactIds: string[] }>;
  maxCalls: number;
  maxDurationMs: number;
}

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) throw new Error('gate_output_shape');
  return raw as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, names: string[]): void {
  if (Object.keys(value).length !== names.length || names.some(key => !Object.hasOwn(value, key))) throw new Error('gate_output_keys');
}
function coverage(value: Record<string, unknown>, candidate: string): void {
  // Exact whole-candidate coverage is deliberately stricter than a model's coverage assertion.
  if (value.complete_coverage !== true || !Array.isArray(value.material_units)
    || value.material_units.length !== 1 || value.material_units[0] !== candidate) throw new Error('gate_incomplete_coverage');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Captures private data once. No operational rules or private contract text are compiled into the public app. */
export function createPrivateGovernanceRuntime(raw: GovernancePolicy, infer: GateInference, now = Date.now, appendDecision?: PrivateDecisionSink): GovernanceRuntime {
  const policy: GovernancePolicy = freeze(structuredClone(raw));
  const { registryHash, ...registryPayload } = policy.registry;
  if (policy.registry.status !== 'active' || !policy.registry.approvalRecord
    || registryHash !== pimRegistryHash(registryPayload) || policy.registry.patternSetHash !== pimPatternSetHash(policy.registry.rules)
    || !Number.isSafeInteger(policy.maxCalls) || policy.maxCalls < 1 || policy.maxCalls > 32
    || !Number.isSafeInteger(policy.maxDurationMs) || policy.maxDurationMs < 1 || policy.maxDurationMs > 300_000)
    throw new Error('governance_policy_invalid');
  validateThresholds(policy.thresholds);
  for (const stage of ['identify', 'irg', 'ptag'] as const)
    if (typeof policy.prompts[stage] !== 'string' || !policy.prompts[stage].trim()) throw new Error('governance_prompt_missing');
  if (!policy.contract.id || !policy.contract.text || new Set(policy.contract.eligibleFactIds).size !== policy.contract.eligibleFactIds.length
    || !Array.isArray(policy.contract.facts) || policy.contract.facts.length !== policy.contract.eligibleFactIds.length
    || new Set(policy.contract.facts.map(f => f.id)).size !== policy.contract.facts.length
    || policy.contract.facts.some(f => !policy.contract.eligibleFactIds.includes(f.id) || !f.active
      || !['role', 'constraint', 'capability', 'event'].includes(f.kind) || !Array.isArray(f.evidenceIds)
      || !Array.isArray(f.directions) || f.directions.some(d => d !== 'inbound' && d !== 'outbound'))
    || policy.contract.evidence.some(e => !e.id || !['system', 'recorded-state'].includes(e.provenance)
      || e.factIds.some(id => !policy.contract.eligibleFactIds.includes(id)))) throw new Error('governance_contract_invalid');
  // Validate limits, scanner schema and trust before any inference or writer call.
  const probe = scanPimRegistry({ candidate: ' ', candidateDigest: pimSha256(' '), sourceMessageId: 'startup:probe', direction: 'inbound',
    originator: 'architect', recipient: 'luminary', taskId: 'startup:probe', attemptId: 'startup:probe' }, policy.registry,
  { expectedRegistryHash: registryHash, approvedActivationHash: registryHash }, policy.limits);
  if (probe.status === 'pim_error') throw new Error('governance_scanner_invalid');
  for (const category of policy.registry.categories) {
    if (category.doorOpenPolicy !== 'unavailable') throw new Error('governance_door_open_policy_not_supported_by_seed');
    const projection = policy.projections[category.id];
    if (!projection?.description || projection.allowedFactIds.some(id => !policy.contract.eligibleFactIds.includes(id)))
      throw new Error('governance_projection_invalid');
  }
  const contractHash = pimSha256(JSON.stringify(policy.contract));
  return {
    createSession() {
      const requestId = randomUUID();
      const deadline = now() + policy.maxDurationMs;
      let calls = 0;
      let closed = false;
      let evaluation = 0;
      const logDecision = (data: Record<string, unknown>) => {
        try { appendDecision?.({ requestId, registryHash, contractHash, ...data }); }
        catch (error) { closed = true; throw error; }
      };
      const consumed = new Set<string>();
      const remaining = () => {
        const ms = Math.floor(deadline - now());
        if (closed || ms < 1) { closed = true; throw new Error('governance_budget_exhausted'); }
        return ms;
      };
      async function bounded<T>(operation: (timeoutMs: number, signal: AbortSignal) => Promise<T>): Promise<T> {
        const ms = remaining();
        if (++calls > policy.maxCalls) { closed = true; throw new Error('governance_budget_exhausted'); }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const controller = new AbortController();
        try {
          const timeout = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => { closed = true; controller.abort(); reject(new Error('governance_timeout')); }, ms);
          });
          const result = await Promise.race([timeout, Promise.resolve().then(() => operation(remaining(), controller.signal))]);
          remaining();
          return result;
        } catch (error) { closed = true; throw error; }
        finally { if (timer) clearTimeout(timer); }
      }
      const call = (stage: InferenceStage, input: Record<string, unknown>) => bounded(async (timeoutMs, signal) => {
        const output = await infer(stage, { system: policy.prompts[stage], input: freeze(structuredClone(input)), timeoutMs, signal });
        // Model outputs are JSON data only; this also removes prototype and accessor authority.
        const json = JSON.stringify(output);
        if (!json || Buffer.byteLength(json, 'utf8') > 262_144) throw new Error('gate_output_size');
        const captured = record(JSON.parse(json));
        logDecision({ event: 'gate_read', stage, input, output: captured });
        return captured;
      });
      return {
        assertAvailable: () => { remaining(); },
        invokeWriter(writer: AskModel, prompt: string) { return bounded((_timeoutMs, signal) => {
          logDecision({ event: 'writer_dispatch', promptHash: pimSha256(prompt) });
          remaining();
          return writer(prompt, { signal });
        }); },
        async evaluate(candidate: string, direction: ExchangeDirection) {
          remaining();
          if (direction !== 'inbound' && direction !== 'outbound') throw new Error('governance_direction_invalid');
          if (typeof candidate !== 'string' || !candidate.trim() || Buffer.byteLength(candidate, 'utf8') > policy.limits.maxCandidateBytes)
            throw new Error('governance_candidate_invalid');
          const candidateHash = pimSha256(candidate);
          const attemptId = `attempt:${requestId}:${++evaluation}`;
          const contextBinding = `context:${pimSha256(JSON.stringify([requestId, attemptId, direction, candidateHash, contractHash]))}`;
          const base = { candidate, candidate_hash: candidateHash, direction, request_id: requestId, attempt_id: attemptId,
            originator: direction === 'inbound' ? 'gateway-caller' : 'luminary', recipient: direction === 'inbound' ? 'luminary' : 'gateway-caller',
            sender_identity: 'Access to the gateway does not establish individual Architect identity or execution approval.',
            source_map: { profile: 'utf16-line-boundaries-v1', candidate_length_utf16: candidate.length,
              allowed_boundaries: sourceBoundaries(candidate), whole_candidate: { start: 0, end: candidate.length } },
            context_binding: contextBinding, contract_hash: contractHash,
            bounded_context: [{ provenance: 'system', source: policy.contract.id, text: policy.contract.text }],
            evidence_snapshot: { eligible_fact_ids: policy.contract.eligibleFactIds, entries: policy.contract.evidence, facts: policy.contract.facts } };
          const ptagContext: ProductionPtagContext = { binding: { caseId: `ptag:${pimSha256(attemptId)}`, candidateHash,
            byteLength: Buffer.byteLength(candidate, 'utf8'), direction, requestId, attemptId,
            contextHash: contextBinding, contractHash, projectionHash: pimSha256(JSON.stringify(policy.contract.facts)),
            evidenceHash: pimSha256(JSON.stringify(policy.contract.evidence)) }, facts: policy.contract.facts,
            evidence: policy.contract.evidence, now: now() };
          const pim: GateCheck = async () => {
            const scan = scanPimRegistry({ candidate, candidateDigest: candidateHash, sourceMessageId: attemptId, direction,
              originator: base.originator, recipient: base.recipient, taskId: requestId, attemptId }, policy.registry,
            { expectedRegistryHash: registryHash, approvedActivationHash: registryHash }, policy.limits);
            if (scan.status === 'pim_error') throw new Error('pim_scan_error');
            if (scan.status === 'clean') return { result: 1 };
            if (scan.findings.some(f => f.opaqueWithoutDecoder))
              return { result: 0, finding: { kind: 'unsure', reason: 'Protected opaque content requires clarification.' } };
            const caseId = `identify:${pimSha256(attemptId)}`;
            const input = { ...base, case_id: caseId, findings: scan.findings.map((f, index) => ({ finding_index: index,
              rule_id: f.ruleId, category_id: f.categoryId, start: f.original.start, end: f.original.end,
              description: policy.projections[f.categoryId].description })) };
            const value = await call('identify', input);
            exactKeys(value, ['case_id', 'candidate_hash', 'direction', 'context_binding', 'complete_coverage', 'material_units', 'units']);
            if (value.case_id !== caseId || value.candidate_hash !== candidateHash || value.direction !== direction
              || value.context_binding !== contextBinding) throw new Error('identify_binding_mismatch');
            coverage(value, candidate);
            if (!Array.isArray(value.units) || value.units.length !== scan.findings.length) throw new Error('identify_units_invalid');
            const outcomes = value.units.map((unit, index) => validateIdentifyUnit(record(unit), scan.findings[index], index, policy, { ...ptagContext, now: now() }));
            if (outcomes.includes('named-conflict')) return { result: 0, finding: { kind: 'incoherence', reason: 'An applicable operating constraint conflicts with this message.' } };
            if (outcomes.includes('unsure')) return { result: 0, finding: { kind: 'unsure', reason: 'The triggered act or its eligible evidence needs clarification.' } };
            // This registry seed has no door-open categories. Never silently label skipped IRG as a pass.
            if (outcomes.every(outcome => outcome === 'legitimate-instance')) throw new Error('door_open_route_unavailable');
            return { result: 1 };
          };
          const irg: GateCheck = async () => {
            const caseId = `irg:${pimSha256(attemptId)}`;
            const value = await call('irg', { ...base, case_id: caseId, virtues: SEVEN_VIRTUES });
            exactKeys(value, ['case_id', 'decision', 'virtue_readings', 'below_threshold_reason', 'material_units', 'complete_coverage']);
            if (value.case_id !== caseId || !['coherent', 'incoherent', 'unsure'].includes(String(value.decision))
              || typeof value.below_threshold_reason !== 'string') throw new Error('irg_output_invalid');
            coverage(value, candidate);
            const rawReadings = record(value.virtue_readings);
            exactKeys(rawReadings, [...SEVEN_VIRTUES]);
            const reading = readIrg(validateReadings(rawReadings), policy.thresholds);
            return reading.coherent && value.decision === 'coherent' ? { result: 1 }
              : { result: 0, finding: { kind: value.decision === 'unsure' ? 'unsure' : 'incoherence', reason: 'The message did not receive a coherent seven-Virtue reading.' } };
          };
          const ptag: GateCheck = async () => {
            if (consumed.has(attemptId)) throw new Error('ptag_attempt_reused');
            consumed.add(attemptId);
            const value = await call('ptag', { ...base, binding: ptagContext.binding });
            const verdict = validateProductionPtag(candidate, { ...ptagContext, now: now() }, value);
            return verdict.decision === 'yes' ? { result: 1 }
              : { result: 0, finding: { kind: verdict.decision === 'unsure' ? 'unsure' : 'incoherence', reason: 'The message did not receive a compatible operating-contract decision.' } };
          };
          const outcome = await examine(candidate, { pim, irg, ptag });
          logDecision({ event: 'route_decision', direction, candidateHash, attemptId, contextBinding, outcome });
          remaining();
          return outcome;
        },
      };
    },
  };
}

function validateIdentifyUnit(value: Record<string, unknown>, finding: PimRegistryFinding, index: number, policy: GovernancePolicy, context: ProductionPtagContext): string {
  exactKeys(value, ['finding_index', 'outcome', 'start', 'end', 'fact_id', 'evidence_ids']);
  if (value.finding_index !== index || value.start !== finding.original.start || value.end !== finding.original.end
    || !['named-conflict', 'discuss-document', 'legitimate-instance', 'unsure'].includes(String(value.outcome))
    || !Array.isArray(value.evidence_ids) || value.evidence_ids.some(id => typeof id !== 'string')
    || (value.fact_id !== null && typeof value.fact_id !== 'string')) throw new Error('identify_unit_invalid');
  if (value.outcome === 'named-conflict' || value.outcome === 'legitimate-instance') {
    const factId = value.fact_id as string;
    const allowed = policy.projections[finding.categoryId].allowedFactIds.includes(factId);
    const evidenceIds = value.evidence_ids as string[];
    const fact = policy.contract.facts.find(f => f.id === factId);
    const eligible = fact && evidenceIds.length > 0 && evidenceIds.every(id => policy.contract.evidence.some(e => e.id === id && evidenceEligible(e, fact, context)));
    if (!allowed || !eligible) return 'unsure';
    if (value.outcome === 'legitimate-instance') {
      const category = policy.registry.categories.find(c => c.id === finding.categoryId)!;
      if (category.doorOpenPolicy !== 'evidence-required' || category.requiredEvidenceIds.length === 0
        || category.requiredEvidenceIds.some(id => !evidenceIds.includes(id))) return 'unsure';
    }
  }
  return String(value.outcome);
}
