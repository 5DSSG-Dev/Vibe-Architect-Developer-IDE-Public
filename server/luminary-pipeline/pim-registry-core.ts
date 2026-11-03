import { createHash } from 'node:crypto';

/** Deterministic PIM scanner core. A registry must be supplied and trusted by its caller. */
export type PimDirection = 'inbound' | 'outbound';
export type PimScope = PimDirection | 'both';
export type PimNormalization = 'identity-v1' | 'ascii-lower-v1';

export interface PimCategoryRecord {
  id: string;
  familyId: string;
  direction: PimScope;
  doorOpenPolicy: 'unavailable' | 'evidence-required';
  requiredEvidenceIds: string[];
}

export type PimRuleRecord = {
  id: string;
  categoryId: string;
  direction: PimScope;
} & (
  | { kind: 'literal'; text: string }
  | { kind: 'ordered-pair'; first: string; second: string; maxGapCodeUnits: number }
  | { kind: 'opaque-delimited'; prefix: string; suffix: string; maxPayloadCodeUnits: number; decoderProfileId: 'none' | 'ascii-hex-v1' }
);

export interface PimRegistryPayload {
  registryId: string;
  registryVersion: string;
  status: 'candidate' | 'approved-inactive' | 'active' | 'retired';
  direction: PimScope;
  normalization: PimNormalization;
  normalizationHash: string;
  matcherProfileId: 'bounded-source-mapped-v1';
  matcherHash: string;
  patternSetHash: string;
  approvalRecord: string | null;
  supersedes: string | null;
  categories: PimCategoryRecord[];
  rules: PimRuleRecord[];
}

export interface PimRegistry extends PimRegistryPayload {
  registryHash: string;
}

export interface PimScanInput {
  candidate: string;
  candidateDigest: string;
  sourceMessageId: string;
  direction: PimDirection;
  originator: string;
  recipient: string;
  taskId: string;
  attemptId: string;
}

export interface PimScanLimits {
  maxCandidateBytes: number;
  maxRules: number;
  maxMatches: number;
  maxStaticWorkUnits: number;
}

export interface PimSourceSpan {
  sourceMessageId: string;
  sourceDigest: string;
  /** JavaScript UTF-16 code-unit offsets, half-open [start, end). */
  start: number;
  end: number;
  excerpt: string;
}

export interface PimRegistryFinding {
  ruleId: string;
  categoryId: string;
  familyId: string;
  kind: PimRuleRecord['kind'];
  direction: PimDirection;
  taskId: string;
  attemptId: string;
  originator: string;
  recipient: string;
  registryHash: string;
  original: PimSourceSpan;
  matchingView: { start: number; end: number; excerpt: string };
  /** A positive registered container match with no decoder in this core remains withheld. */
  opaqueWithoutDecoder: boolean;
  /** Present only when an approved bounded decoder produced a source-mapped view. */
  decodedView?: { decoderProfileId: 'ascii-hex-v1'; text: string; sourceSpans: PimSourceSpan[] };
}

export type PimRegistryScan =
  | { status: 'clean'; complete: true; registryHash: string; candidateDigest: string; matchingViewDigest: string; findings: [] }
  | { status: 'triggered'; complete: true; registryHash: string; candidateDigest: string; matchingViewDigest: string; findings: PimRegistryFinding[] }
  | { status: 'pim_error'; complete: false; code: PimErrorCode; registryHash: string | null; candidateDigest: string; findings: [] };

export type PimErrorCode =
  | 'candidate_digest_mismatch'
  | 'candidate_encoding_invalid'
  | 'candidate_over_budget'
  | 'registry_unavailable'
  | 'registry_inactive'
  | 'registry_hash_mismatch'
  | 'registry_unapproved'
  | 'registry_invalid'
  | 'direction_mismatch'
  | 'scan_over_budget'
  | 'findings_truncated';

const HASH = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const PIM_NORMALIZATION_HASHES: Record<PimNormalization, string> = {
  'identity-v1': createHash('sha256').update('pim:identity-v1:utf16-one-to-one').digest('hex'),
  'ascii-lower-v1': createHash('sha256').update('pim:ascii-lower-v1:utf16-one-to-one').digest('hex'),
};
export const PIM_MATCHER_HASH = createHash('sha256').update('pim:bounded-source-mapped-v1:literal-ordered-pair-opaque-delimited-ascii-hex').digest('hex');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copy one bounded own-data registry before hashing, validation, or matching. */
function capturePlainData<T>(value: unknown): T | null {
  let nodes = 0;
  const seen = new Set<object>();
  function copy(item: unknown, depth: number): unknown {
    if (item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return item;
    if (!item || typeof item !== 'object' || depth > 8 || ++nodes > 4096 || seen.has(item)) throw new Error('registry_not_plain_data');
    seen.add(item);
    const array = Array.isArray(item);
    if (Object.getPrototypeOf(item) !== (array ? Array.prototype : Object.prototype)) throw new Error('registry_not_plain_data');
    const result: unknown[] | Record<string, unknown> = array ? [] : {};
    for (const key of Reflect.ownKeys(item)) {
      if (typeof key !== 'string') throw new Error('registry_symbol_field');
      if (array && key === 'length') continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('registry_unsafe_field');
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !('value' in descriptor)) throw new Error('registry_accessor');
      if (array) {
        if (!/^(0|[1-9][0-9]*)$/.test(key)) throw new Error('registry_array_field');
        (result as unknown[])[Number(key)] = copy(descriptor.value, depth + 1);
      } else (result as Record<string, unknown>)[key] = copy(descriptor.value, depth + 1);
    }
    if (array && ((result as unknown[]).length !== item.length || Object.keys(item).length !== item.length)) throw new Error('registry_array_hole');
    seen.delete(item);
    return result;
  }
  try { return copy(value, 0) as T; } catch { return null; }
}

export function pimSha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The registry hash excludes its own digest and binds all other payload fields. */
export function pimRegistryHash(payload: PimRegistryPayload): string {
  return pimSha256(stable(payload));
}

export function pimPatternSetHash(rules: PimRuleRecord[]): string {
  return pimSha256(stable(rules));
}

function inScope(scope: PimScope, direction: PimDirection): boolean {
  return scope === 'both' || scope === direction;
}

function sourceMappedView(text: string, profile: PimNormalization): string {
  if (profile === 'identity-v1') return text;
  // ASCII folding is one-to-one in UTF-16. Unicode case folding can expand and is not used here.
  return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

function hasValidUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (i + 1 >= text.length) return false;
      const next = text.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function validCategory(category: PimCategoryRecord): boolean {
  return isRecord(category) && typeof category.id === 'string' && ID.test(category.id)
    && typeof category.familyId === 'string' && ID.test(category.familyId)
    && ['inbound', 'outbound', 'both'].includes(category.direction)
    && ['unavailable', 'evidence-required'].includes(category.doorOpenPolicy)
    && Array.isArray(category.requiredEvidenceIds)
    && category.requiredEvidenceIds.every((id) => typeof id === 'string' && ID.test(id))
    && (category.doorOpenPolicy === 'evidence-required'
      ? category.requiredEvidenceIds.length > 0
      : category.requiredEvidenceIds.length === 0);
}

function validRule(rule: PimRuleRecord, categories: Map<string, PimCategoryRecord>): boolean {
  if (!isRecord(rule) || typeof rule.id !== 'string' || !ID.test(rule.id)
    || typeof rule.categoryId !== 'string' || !ID.test(rule.categoryId) || !categories.has(rule.categoryId)
    || !['inbound', 'outbound', 'both'].includes(rule.direction)) return false;
  if (rule.kind === 'literal') return typeof rule.text === 'string' && rule.text.length > 0 && rule.text.length <= 256;
  if (rule.kind === 'ordered-pair') return typeof rule.first === 'string' && rule.first.length > 0 && rule.first.length <= 128
    && typeof rule.second === 'string' && rule.second.length > 0 && rule.second.length <= 128
    && Number.isSafeInteger(rule.maxGapCodeUnits) && rule.maxGapCodeUnits >= 0 && rule.maxGapCodeUnits <= 256;
  if (rule.kind === 'opaque-delimited') return typeof rule.prefix === 'string' && rule.prefix.length > 0 && rule.prefix.length <= 64
    && typeof rule.suffix === 'string' && rule.suffix.length > 0 && rule.suffix.length <= 64
    && Number.isSafeInteger(rule.maxPayloadCodeUnits) && rule.maxPayloadCodeUnits >= 0 && rule.maxPayloadCodeUnits <= 1024
    && ['none', 'ascii-hex-v1'].includes(rule.decoderProfileId);
  return false;
}

function validRegistry(registry: PimRegistry): boolean {
  if (!isRecord(registry) || typeof registry.registryId !== 'string' || !ID.test(registry.registryId)
    || typeof registry.registryVersion !== 'string' || !ID.test(registry.registryVersion)
    || !['candidate', 'approved-inactive', 'active', 'retired'].includes(registry.status)
    || !['inbound', 'outbound', 'both'].includes(registry.direction)
    || !['identity-v1', 'ascii-lower-v1'].includes(registry.normalization)
    || registry.normalizationHash !== PIM_NORMALIZATION_HASHES[registry.normalization]
    || registry.matcherProfileId !== 'bounded-source-mapped-v1'
    || registry.matcherHash !== PIM_MATCHER_HASH
    || !Array.isArray(registry.categories) || registry.categories.length === 0
    || !Array.isArray(registry.rules) || registry.rules.length === 0
    || (registry.approvalRecord !== null && (typeof registry.approvalRecord !== 'string' || !ID.test(registry.approvalRecord)))
    || (registry.supersedes !== null && (typeof registry.supersedes !== 'string' || !HASH.test(registry.supersedes)))) return false;
  if (!registry.categories.every(isRecord) || !registry.rules.every(isRecord)) return false;
  if (registry.patternSetHash !== pimPatternSetHash(registry.rules)) return false;
  const categories = new Map(registry.categories.map((category) => [category.id, category]));
  if (categories.size !== registry.categories.length || !registry.categories.every(validCategory)) return false;
  const ids = new Set(registry.rules.map((rule) => rule.id));
  return ids.size === registry.rules.length && registry.rules.every((rule) => validRule(rule, categories));
}

function validLimits(limits: PimScanLimits): boolean {
  return isRecord(limits)
    && [limits.maxCandidateBytes, limits.maxRules, limits.maxMatches, limits.maxStaticWorkUnits]
      .every((value) => Number.isSafeInteger(value) && value > 0)
    && limits.maxCandidateBytes <= 65_536 && limits.maxRules <= 128
    && limits.maxMatches <= 1_024 && limits.maxStaticWorkUnits <= 8_388_608;
}

function ranges(view: string, rule: PimRuleRecord, profile: PimNormalization): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  if (rule.kind === 'literal') {
    const needle = sourceMappedView(rule.text, profile);
    for (let start = view.indexOf(needle); start !== -1; start = view.indexOf(needle, start + 1)) {
      result.push([start, start + needle.length]);
    }
  } else if (rule.kind === 'ordered-pair') {
    const first = sourceMappedView(rule.first, profile);
    const second = sourceMappedView(rule.second, profile);
    for (let start = view.indexOf(first); start !== -1; start = view.indexOf(first, start + 1)) {
      const firstEnd = start + first.length;
      const secondStart = view.indexOf(second, firstEnd);
      if (secondStart !== -1 && secondStart - firstEnd <= rule.maxGapCodeUnits) result.push([start, secondStart + second.length]);
    }
  } else {
    const prefix = sourceMappedView(rule.prefix, profile);
    const suffix = sourceMappedView(rule.suffix, profile);
    for (let start = view.indexOf(prefix); start !== -1; start = view.indexOf(prefix, start + 1)) {
      const payloadStart = start + prefix.length;
      const suffixStart = view.indexOf(suffix, payloadStart);
      if (suffixStart !== -1 && suffixStart - payloadStart <= rule.maxPayloadCodeUnits) {
        result.push([start, suffixStart + suffix.length]);
      } else {
        // A registered opener with no bounded close is still a protected opaque observation.
        result.push([start, Math.min(view.length, payloadStart + rule.maxPayloadCodeUnits)]);
      }
    }
  }
  return result;
}

function decodeAsciiHex(
  candidate: string, start: number, end: number, sourceMessageId: string, sourceDigest: string,
): { decoderProfileId: 'ascii-hex-v1'; text: string; sourceSpans: PimSourceSpan[] } | null {
  const payload = candidate.slice(start, end);
  if (payload.length === 0 || payload.length % 2 !== 0 || !/^(?:[0-9a-fA-F]{2})+$/.test(payload)) return null;
  const chars: string[] = [];
  const sourceSpans: PimSourceSpan[] = [];
  for (let index = 0; index < payload.length; index += 2) {
    const byte = Number.parseInt(payload.slice(index, index + 2), 16);
    if (byte < 0x20 || byte > 0x7e) return null;
    chars.push(String.fromCharCode(byte));
    sourceSpans.push({ sourceMessageId, sourceDigest, start: start + index, end: start + index + 2, excerpt: payload.slice(index, index + 2) });
  }
  return { decoderProfileId: 'ascii-hex-v1', text: chars.join(''), sourceSpans };
}

/** Scan a single immutable message. Every failure returns no partial findings. */
export function scanPimRegistry(
  input: PimScanInput,
  registry: PimRegistry | null,
  trust: { expectedRegistryHash: string; approvedActivationHash: string },
  limits: PimScanLimits,
): PimRegistryScan {
  let candidateDigest = '';
  const fail = (code: PimErrorCode): PimRegistryScan => ({ status: 'pim_error', complete: false, code, registryHash: null, candidateDigest, findings: [] });
  const inputSnapshot = capturePlainData<PimScanInput>(input);
  const limitSnapshot = capturePlainData<PimScanLimits>(limits);
  const trustSnapshot = capturePlainData<typeof trust>(trust);
  if (!inputSnapshot || typeof inputSnapshot.candidate !== 'string') return fail('candidate_encoding_invalid');
  if (!limitSnapshot || !trustSnapshot) return fail('registry_invalid');
  input = inputSnapshot;
  limits = limitSnapshot;
  trust = trustSnapshot;
  if (!validLimits(limits)) return fail('registry_invalid');
  // Bound work before hashing or validating every code unit of an untrusted candidate.
  if (input.candidate.length > 65_536 || Buffer.byteLength(input.candidate, 'utf8') > limits.maxCandidateBytes) return fail('candidate_over_budget');
  if (!hasValidUnicode(input.candidate)) return fail('candidate_encoding_invalid');
  candidateDigest = pimSha256(input.candidate);
  if (!HASH.test(input.candidateDigest) || input.candidateDigest !== candidateDigest) return fail('candidate_digest_mismatch');
  if (!registry) return fail('registry_unavailable');
  const snapshot = capturePlainData<PimRegistry>(registry);
  if (!snapshot) return fail('registry_invalid');
  registry = snapshot;
  if (!validRegistry(registry)
    || !ID.test(input.sourceMessageId) || !ID.test(input.originator) || !ID.test(input.recipient)
    || !ID.test(input.taskId) || !ID.test(input.attemptId)
    || !['inbound', 'outbound'].includes(input.direction)) return fail('registry_invalid');
  const { registryHash, ...payload } = registry;
  if (!HASH.test(registryHash) || registryHash !== pimRegistryHash(payload)
    || !isRecord(trust) || registryHash !== trust.expectedRegistryHash) return fail('registry_hash_mismatch');
  if (registry.status !== 'active') return fail('registry_inactive');
  if (!registry.approvalRecord || trust.approvedActivationHash !== registryHash) return fail('registry_unapproved');
  if (!inScope(registry.direction, input.direction)) return fail('direction_mismatch');
  if (registry.rules.length > limits.maxRules || input.candidate.length * registry.rules.length > limits.maxStaticWorkUnits) return fail('scan_over_budget');

  const view = sourceMappedView(input.candidate, registry.normalization);
  const findings: PimRegistryFinding[] = [];
  const categories = new Map(registry.categories.map((category) => [category.id, category]));
  for (const rule of registry.rules) {
    const category = categories.get(rule.categoryId)!;
    if (!inScope(rule.direction, input.direction) || !inScope(category.direction, input.direction)) continue;
    for (const [start, end] of ranges(view, rule, registry.normalization)) {
      if (findings.length >= limits.maxMatches) return fail('findings_truncated');
      const hasBoundedClose = rule.kind === 'opaque-delimited'
        && view.slice(end - rule.suffix.length, end) === sourceMappedView(rule.suffix, registry.normalization)
        && end - start >= rule.prefix.length + rule.suffix.length;
      const decodedView = rule.kind === 'opaque-delimited' && rule.decoderProfileId === 'ascii-hex-v1' && hasBoundedClose
        ? decodeAsciiHex(input.candidate, start + rule.prefix.length, end - rule.suffix.length, input.sourceMessageId, candidateDigest)
        : null;
      const finding: PimRegistryFinding = {
        ruleId: rule.id, categoryId: category.id, familyId: category.familyId, kind: rule.kind,
        direction: input.direction, taskId: input.taskId, attemptId: input.attemptId, originator: input.originator, recipient: input.recipient,
        registryHash,
        original: { sourceMessageId: input.sourceMessageId, sourceDigest: candidateDigest, start, end, excerpt: input.candidate.slice(start, end) },
        matchingView: { start, end, excerpt: view.slice(start, end) },
        opaqueWithoutDecoder: rule.kind === 'opaque-delimited' && decodedView === null,
      };
      if (decodedView) finding.decodedView = decodedView;
      findings.push(finding);
    }
  }
  if (findings.length === 0) return { status: 'clean', complete: true, registryHash, candidateDigest, matchingViewDigest: pimSha256(view), findings: [] };
  return { status: 'triggered', complete: true, registryHash, candidateDigest, matchingViewDigest: pimSha256(view), findings };
}
