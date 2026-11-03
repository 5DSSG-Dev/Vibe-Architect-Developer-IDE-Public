import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateProductionPtag, sourceBoundaries, type ProductionPtagContext } from './ptag-production.js';
import { pimSha256 } from './pim-registry-core.js';

const candidate = 'An ordinary explanation.';
function context(): ProductionPtagContext {
  return { binding: { caseId: 'case:1', candidateHash: pimSha256(candidate), byteLength: Buffer.byteLength(candidate), direction: 'outbound', requestId: 'request:1', attemptId: 'attempt:1',
    contextHash: 'context:1', contractHash: 'contract:1', projectionHash: 'projection:1', evidenceHash: 'evidence:1' },
    facts: [{ id: 'fact:role', kind: 'role', active: true, directions: ['inbound', 'outbound'], evidenceIds: ['evidence:role'] }],
    evidence: [{ id: 'evidence:role', factIds: ['fact:role'], provenance: 'system', scope: 'contract', requestId: null, attemptId: null,
      issuedAt: 1, expiresAt: null, revoked: false }], now: 10 };
}
function output(ctx = context()) { return { binding: { ...ctx.binding }, decision: 'pass', identify: 'Informational text.', rationale: 'No operative obligation.',
  noObligations: true, extractionComplete: true, units: [{ start: 0, end: candidate.length, kind: 'informational', result: 'compatible', factIds: [] as string[], evidenceIds: [] as string[] }] }; }

test('v1.1 positive no-obligation decision binds every byte and explicit non-operative material unit', () => {
  assert.equal(validateProductionPtag(candidate, context(), output()).decision, 'yes');
  const value = output(); value.binding.attemptId = 'old';
  assert.throws(() => validateProductionPtag(candidate, context(), value));
});

test('operative pass without applicable fact/evidence cannot be manufactured from a whole-candidate echo', () => {
  const value = output(); value.noObligations = false; value.units[0].kind = 'operative-request';
  assert.equal(validateProductionPtag(candidate, context(), value).decision, 'unsure');
  value.noObligations = true;
  assert.throws(() => validateProductionPtag(candidate, context(), value));
});

test('evidence for capability/event claims must be current, attempt-scoped, unrevoked and fresh', () => {
  for (const change of ['static', 'wrong-attempt', 'expired', 'revoked']) {
    const ctx = context(); ctx.facts[0].kind = 'event';
    const e = ctx.evidence[0]; e.scope = 'attempt'; e.requestId = 'request:1'; e.attemptId = 'attempt:1'; e.expiresAt = 20;
    if (change === 'static') e.scope = 'contract';
    if (change === 'wrong-attempt') e.attemptId = 'old';
    if (change === 'expired') e.expiresAt = 5;
    if (change === 'revoked') e.revoked = true;
    const value = output(ctx); value.noObligations = false; value.units[0] = { ...value.units[0], kind: 'completion-claim', factIds: ['fact:role'], evidenceIds: ['evidence:role'] };
    assert.equal(validateProductionPtag(candidate, ctx, value).decision, 'unsure', change);
  }
});

test('coverage gaps, conflicting units, inactive facts and inconsistent aggregate decisions fail closed', () => {
  const gap = output(); gap.units[0].end--;
  assert.throws(() => validateProductionPtag(candidate, context(), gap));
  const ctx = context(); const conflict = output(ctx); conflict.noObligations = false; conflict.decision = 'boundary';
  conflict.units[0] = { ...conflict.units[0], kind: 'operative-request', result: 'conflict', factIds: ['fact:role'], evidenceIds: ['evidence:role'] };
  assert.equal(validateProductionPtag(candidate, ctx, conflict).decision, 'no');
  ctx.facts[0].active = false;
  assert.equal(validateProductionPtag(candidate, ctx, conflict).decision, 'unsure');
});

test('code-owned source positions count Unicode UTF-16 exactly and reject guessed interior splits', () => {
  assert.deepEqual(sourceBoundaries('café\nnext'), [0, 5, 9]);
  assert.deepEqual(sourceBoundaries('😀\nnext'), [0, 3, 7]);
  const manyLines = 'line\n'.repeat(300);
  const positions = sourceBoundaries(manyLines);
  assert(positions.length <= 257); assert.equal(positions[0], 0); assert.equal(positions.at(-1), manyLines.length);
  const value = output();
  value.units = [{ ...value.units[0], end: 2 }, { ...value.units[0], start: 2 }];
  assert.throws(() => validateProductionPtag(candidate, context(), value));
});
