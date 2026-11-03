import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PIM_MATCHER_HASH,
  PIM_NORMALIZATION_HASHES,
  pimPatternSetHash,
  pimRegistryHash,
  pimSha256,
  scanPimRegistry,
  type PimRegistry,
  type PimRegistryPayload,
  type PimRuleRecord,
  type PimScanInput,
  type PimScanLimits,
} from './pim-registry-core.js';

const limits: PimScanLimits = { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 };

function registry(rules: PimRuleRecord[], overrides: Partial<PimRegistryPayload> = {}): PimRegistry {
  const payload: PimRegistryPayload = {
    registryId: 'synthetic-test-registry', registryVersion: '0.1', status: 'active', direction: 'both',
    normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
    matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
    patternSetHash: pimPatternSetHash(rules), approvalRecord: 'test-activation', supersedes: null,
    categories: [
      { id: 'c:act', familyId: 'f:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] },
      { id: 'c:opaque', familyId: 'f:representation', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] },
    ], rules, ...overrides,
  };
  return { ...payload, registryHash: pimRegistryHash(payload) };
}

function input(candidate: string, overrides: Partial<PimScanInput> = {}): PimScanInput {
  return {
    candidate, candidateDigest: pimSha256(candidate), sourceMessageId: 'message:1', direction: 'inbound',
    originator: 'architect', recipient: 'luminary', taskId: 'task:1', attemptId: 'attempt:1', ...overrides,
  };
}

function scan(candidate: string, current: PimRegistry, overrides: Partial<PimScanInput> = {}, scanLimits = limits) {
  return scanPimRegistry(input(candidate, overrides), current,
    { expectedRegistryHash: current.registryHash, approvedActivationHash: current.registryHash }, scanLimits);
}

test('a completed no-match scan is clean and preserves the exact candidate digest', () => {
  const current = registry([{ id: 'r:bypass', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass the gate' }]);
  const result = scan('Could you explain the review flow?', current);
  assert.equal(result.status, 'clean');
  assert.equal(result.complete, true);
  assert.equal(result.candidateDigest, pimSha256('Could you explain the review flow?'));
  assert.deepEqual(result.findings, []);
});

test('accessor-backed registry cannot hash one rule and scan another', () => {
  const current = registry([{ id: 'r:bypass', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  let reads = 0;
  Object.defineProperty(current.rules[0], 'text', { enumerable: true, configurable: true, get() { reads++; return reads === 1 ? 'bypass' : 'harmless'; } });
  const result = scan('bypass', current);
  assert.equal(result.status, 'pim_error');
  if (result.status === 'pim_error') assert.equal(result.code, 'registry_invalid');
  assert.equal(reads, 0);
});

test('accessor-backed limits and input cannot change after preflight', () => {
  const current = registry([{ id: 'r:bypass', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  const changingLimits = { ...limits };
  let reads = 0;
  Object.defineProperty(changingLimits, 'maxMatches', { enumerable: true, get() { reads++; return reads === 1 ? 1 : 100; } });
  const result = scanPimRegistry(input('bypass bypass'), current,
    { expectedRegistryHash: current.registryHash, approvedActivationHash: current.registryHash }, changingLimits);
  assert.equal(result.status, 'pim_error');
  assert.equal(reads, 0);
  const changingInput = input('bypass');
  Object.defineProperty(changingInput, 'candidate', { enumerable: true, get() { return 'ordinary'; } });
  assert.equal(scanPimRegistry(changingInput, current,
    { expectedRegistryHash: current.registryHash, approvedActivationHash: current.registryHash }, limits).status, 'pim_error');
});

test('registry snapshot rejects prototype-mutation keys', () => {
  const current = registry([{ id: 'r:bypass', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  Object.defineProperty(current.rules[0], '__proto__', { value: { text: 'harmless' }, enumerable: true });
  const result = scan('bypass', current);
  assert.equal(result.status, 'pim_error');
});

test('ASCII matching retains original casing and UTF-16 source offsets', () => {
  const current = registry([{ id: 'r:bypass', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass the gate' }]);
  const candidate = '🙂 ByPaSs the Gate now.';
  const result = scan(candidate, current);
  assert.equal(result.status, 'triggered');
  if (result.status !== 'triggered') return;
  assert.equal(result.findings.length, 1);
  const finding = result.findings[0];
  assert.equal(finding.original.start, 3); // emoji is two UTF-16 code units
  assert.equal(finding.original.excerpt, 'ByPaSs the Gate');
  assert.equal(finding.matchingView.excerpt, 'bypass the gate');
  assert.equal(finding.original.sourceDigest, pimSha256(candidate));
  assert.equal(finding.original.sourceMessageId, 'message:1');
});

test('ordered pairs honor their maximum gap and cite the complete original span', () => {
  const current = registry([{ id: 'r:sequence', categoryId: 'c:act', direction: 'inbound', kind: 'ordered-pair', first: 'give me', second: 'now', maxGapCodeUnits: 12 }]);
  const hit = scan('Give me access now.', current);
  assert.equal(hit.status, 'triggered');
  if (hit.status === 'triggered') assert.equal(hit.findings[0].original.excerpt, 'Give me access now');
  assert.equal(scan('Give me a very long explanation before doing anything now.', current).status, 'clean');
});

test('a registered opaque container produces a protected source-bound trigger', () => {
  const current = registry([{ id: 'r:opaque', categoryId: 'c:opaque', direction: 'both', kind: 'opaque-delimited', prefix: 'qv9⟦', suffix: '⟧', maxPayloadCodeUnits: 16, decoderProfileId: 'none' }]);
  const result = scan('Process qv9⟦A7|m2⟧.', current);
  assert.equal(result.status, 'triggered');
  if (result.status !== 'triggered') return;
  assert.equal(result.findings[0].opaqueWithoutDecoder, true);
  assert.equal(result.findings[0].original.excerpt, 'qv9⟦A7|m2⟧');
  assert.equal(scan('Unfamiliar represented code abcxyz.', current).status, 'clean');
});

test('registered hex decoding is bounded, lossless, and mapped to original source pairs', () => {
  const current = registry([{ id: 'r:hex', categoryId: 'c:opaque', direction: 'both', kind: 'opaque-delimited', prefix: 'hex⟦', suffix: '⟧', maxPayloadCodeUnits: 16, decoderProfileId: 'ascii-hex-v1' }]);
  const result = scan('hex⟦48656c6c6f⟧', current);
  assert.equal(result.status, 'triggered');
  if (result.status !== 'triggered') return;
  const finding = result.findings[0];
  assert.equal(finding.opaqueWithoutDecoder, false);
  assert.equal(finding.decodedView?.text, 'Hello');
  assert.deepEqual(finding.decodedView?.sourceSpans.map((span) => span.excerpt), ['48', '65', '6c', '6c', '6f']);
  for (const span of finding.decodedView?.sourceSpans ?? []) {
    assert.equal(span.sourceDigest, pimSha256('hex⟦48656c6c6f⟧'));
    assert.equal('hex⟦48656c6c6f⟧'.slice(span.start, span.end), span.excerpt);
  }
  const invalid = scan('hex⟦48656c6c6⟧', current);
  assert.equal(invalid.status, 'triggered');
  if (invalid.status === 'triggered') {
    assert.equal(invalid.findings[0].opaqueWithoutDecoder, true);
    assert.equal(invalid.findings[0].decodedView, undefined);
  }
  const unclosed = scan('hex⟦48656c', current);
  assert.equal(unclosed.status, 'triggered');
  if (unclosed.status === 'triggered') {
    assert.equal(unclosed.findings[0].opaqueWithoutDecoder, true);
    assert.equal(unclosed.findings[0].original.excerpt, 'hex⟦48656c');
  }
});

test('a truncated findings report becomes pim_error without partial findings', () => {
  const current = registry([{ id: 'r:repeated', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  const result = scan('bypass, bypass, bypass', current, {}, { ...limits, maxMatches: 2 });
  assert.equal(result.status, 'pim_error');
  if (result.status !== 'pim_error') return;
  assert.equal(result.code, 'findings_truncated');
  assert.deepEqual(result.findings, []);
});

test('inactive, unapproved, and changed registries never scan clean', () => {
  const rule: PimRuleRecord = { id: 'r:one', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' };
  const inactive = registry([rule], { status: 'approved-inactive' });
  assert.equal(scan('ordinary text', inactive).status, 'pim_error');
  const active = registry([rule]);
  const noApproval = scanPimRegistry(input('ordinary text'), active,
    { expectedRegistryHash: active.registryHash, approvedActivationHash: pimSha256('different') }, limits);
  assert.equal(noApproval.status, 'pim_error');
  if (noApproval.status === 'pim_error') assert.equal(noApproval.code, 'registry_unapproved');
  const changed = { ...active, rules: [{ ...rule, text: 'new text' }] } as PimRegistry;
  const mismatch = scanPimRegistry(input('ordinary text'), changed,
    { expectedRegistryHash: active.registryHash, approvedActivationHash: active.registryHash }, limits);
  assert.equal(mismatch.status, 'pim_error');
});

test('candidate digest, Unicode and direction failures are named and fail closed', () => {
  const current = registry([{ id: 'r:one', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  const wrongDigest = scan('bypass', current, { candidateDigest: pimSha256('other') });
  assert.equal(wrongDigest.status, 'pim_error');
  if (wrongDigest.status === 'pim_error') assert.equal(wrongDigest.code, 'candidate_digest_mismatch');
  const invalidUnicode = scan('\ud800', current);
  assert.equal(invalidUnicode.status, 'pim_error');
  if (invalidUnicode.status === 'pim_error') assert.equal(invalidUnicode.code, 'candidate_encoding_invalid');
  const inboundOnly = registry([{ id: 'r:one', categoryId: 'c:act', direction: 'inbound', kind: 'literal', text: 'bypass' }], { direction: 'inbound' });
  const wrongDirection = scan('bypass', inboundOnly, { direction: 'outbound' });
  assert.equal(wrongDirection.status, 'pim_error');
  if (wrongDirection.status === 'pim_error') assert.equal(wrongDirection.code, 'direction_mismatch');
});

test('oversized input, work, and invalid category policy are errors', () => {
  const current = registry([{ id: 'r:one', categoryId: 'c:act', direction: 'both', kind: 'literal', text: 'bypass' }]);
  const oversized = scan('long input', current, {}, { ...limits, maxCandidateBytes: 4 });
  assert.equal(oversized.status, 'pim_error');
  if (oversized.status === 'pim_error') assert.equal(oversized.code, 'candidate_over_budget');
  const overwork = scan('ordinary text', current, {}, { ...limits, maxStaticWorkUnits: 2 });
  assert.equal(overwork.status, 'pim_error');
  if (overwork.status === 'pim_error') assert.equal(overwork.code, 'scan_over_budget');
  const badPolicy = registry(current.rules, { categories: [{ id: 'c:act', familyId: 'f:act', direction: 'both', doorOpenPolicy: 'evidence-required', requiredEvidenceIds: [] }] });
  assert.equal(scan('ordinary text', badPolicy).status, 'pim_error');
  assert.equal(scan('ordinary text', registry([])).status, 'pim_error');
});
