import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOUNDS,
  emptyRenderContext,
  factIds,
  getFact,
  MAX_REFLECT_ITEMS,
  renderReflect,
  renderReflectList,
  validateIdqraShape,
  validateReturnedEnvelope,
  type IDQRAEnvelopeV1,
  type RenderContext,
} from './idqra.js';

// P5 IDQRA first slice (contract v0.2 + rev2 clarification c77cd39; repairs for Lumin R1-R3,
// PR #34 6557471258). Additive, unwired module. No model is reached; renderer + validators direct.

const ctx = (deployed: string[] = [], events: string[] = []): RenderContext => ({
  deploymentVerified: new Set(deployed),
  eventEvidence: new Set(events),
});

const reflect = (factId: string) => {
  const row = getFact(factId)!;
  return { factId, modality: row.modality, text: row.template };
};

const envelope = (overrides: Partial<IDQRAEnvelopeV1> = {}): IDQRAEnvelopeV1 => ({
  version: 1,
  identify: 'The message asks for the model API to be reached outside the IDE.',
  define: [{ source: 'pim', ref: 'PIM-ROUTE', text: 'A boundary-crossing request was recorded.' }],
  question: 'Is there a project you would like to work on in this workspace?',
  reflect: [reflect('TF-02')],
  acknowledge: 'The message expressed a wish to reach the model API directly.',
  ...overrides,
});

// --- renderReflect / renderReflectList ------------------------------------------------------

test('renderReflect returns the trusted template for an eligible role fact', () => {
  assert.deepEqual(renderReflect({ factId: 'TF-02' }, emptyRenderContext()), reflect('TF-02'));
});

test('renderReflect rejects unknown, prototype-chain, and malformed drafts without throwing (R1/R2)', () => {
  assert.equal(renderReflect({ factId: 'TF-999' }, emptyRenderContext()), null);
  // Prototype-chain names must not resolve to inherited members:
  assert.equal(renderReflect({ factId: 'constructor' }, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: 'toString' }, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: '__proto__' }, emptyRenderContext()), null);
  // Malformed inputs reject deterministically, not throw:
  assert.equal(renderReflect(null, emptyRenderContext()), null);
  assert.equal(renderReflect(42, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: 123 }, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: 'TF-01', extra: 'x' }, emptyRenderContext()), null);
});

test('renderReflect rejects non-object or non-empty slots (zero-slot first slice, R2)', () => {
  assert.equal(renderReflect({ factId: 'TF-01', slots: { who: 'x' } }, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: 'TF-01', slots: [] }, emptyRenderContext()), null);
  assert.equal(renderReflect({ factId: 'TF-01', slots: 42 }, emptyRenderContext()), null);
  assert.deepEqual(renderReflect({ factId: 'TF-01', slots: {} }, emptyRenderContext()), reflect('TF-01'));
});

test('conditional rows need deployment-verified context; event rows need evidence (R3)', () => {
  assert.equal(renderReflect({ factId: 'TF-03' }, emptyRenderContext()), null);
  assert.deepEqual(renderReflect({ factId: 'TF-03' }, ctx(['TF-03'])), reflect('TF-03'));
  assert.equal(renderReflect({ factId: 'TF-10' }, emptyRenderContext()), null);
  assert.deepEqual(renderReflect({ factId: 'TF-10' }, ctx([], ['TF-10'])), reflect('TF-10'));
});

test('renderReflectList fails closed over the bound, on a non-array, or on any ineligible item', () => {
  assert.equal(renderReflectList(Array.from({ length: MAX_REFLECT_ITEMS + 1 }, () => ({ factId: 'TF-01' })), emptyRenderContext()), null);
  assert.equal(renderReflectList('nope', emptyRenderContext()), null);
  assert.equal(renderReflectList([{ factId: 'TF-01' }, { factId: 'TF-03' }], emptyRenderContext()), null);
  assert.deepEqual(renderReflectList([{ factId: 'TF-01' }, { factId: 'TF-07' }], emptyRenderContext()), [reflect('TF-01'), reflect('TF-07')]);
});

// --- immutability (R1) -----------------------------------------------------------------------

test('trusted fact rows are frozen; an importer cannot change template output', () => {
  const row = getFact('TF-01')!;
  assert.throws(() => {
    (row as { template: string }).template = 'Changed by importer';
  }, TypeError);
  assert.deepEqual(renderReflect({ factId: 'TF-01' }, emptyRenderContext()), reflect('TF-01'));
});

test('emptyRenderContext returns a fresh context each call (no shared mutable singleton)', () => {
  const a = emptyRenderContext();
  (a.deploymentVerified as Set<string>).add('TF-03');
  assert.equal(emptyRenderContext().deploymentVerified.has('TF-03'), false);
});

// --- validateIdqraShape ----------------------------------------------------------------------

test('validateIdqraShape accepts a complete, well-formed envelope and keeps raw field values', () => {
  const result = validateIdqraShape(envelope());
  assert.equal(result.ok, true);
});

test('validateIdqraShape allows empty reflect but rejects empty define (documented decision)', () => {
  assert.equal(validateIdqraShape(envelope({ reflect: [] })).ok, true);
  assert.equal(validateIdqraShape(envelope({ define: [] })).ok, false);
});

test('validateIdqraShape fails closed on missing/empty fields, wrong version, and unknown keys (R2)', () => {
  for (const field of ['identify', 'question', 'acknowledge'] as const) {
    const r = validateIdqraShape(envelope({ [field]: '  ' } as Partial<IDQRAEnvelopeV1>));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.shortfall.code, 'conscience_error');
  }
  assert.equal(validateIdqraShape(envelope({ version: 2 as unknown as 1 })).ok, false);
  assert.equal(validateIdqraShape({ ...envelope(), extra: 'x' }).ok, false);
  assert.equal(validateIdqraShape(null).ok, false);
  assert.equal(validateIdqraShape([]).ok, false);
});

test('validateIdqraShape enforces the v0.2 length bounds (R2)', () => {
  assert.equal(validateIdqraShape(envelope({ identify: 'a'.repeat(BOUNDS.identify + 1) })).ok, false);
  assert.equal(validateIdqraShape(envelope({ question: 'a'.repeat(BOUNDS.question + 1) })).ok, false);
  assert.equal(validateIdqraShape(envelope({ acknowledge: 'a'.repeat(BOUNDS.acknowledge + 1) })).ok, false);
  assert.equal(validateIdqraShape(envelope({ define: [{ source: 'pim', ref: 'R', text: 'a'.repeat(BOUNDS.defineText + 1) }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ identify: 'a'.repeat(BOUNDS.identify) })).ok, true);
});

test('validateIdqraShape rejects tampered Reflect text, unknown factId, bad modality, and over-count', () => {
  assert.equal(validateIdqraShape(envelope({ reflect: [{ factId: 'TF-02', modality: 'role', text: 'I can grant API access on request.' }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ reflect: [{ factId: 'TF-X', modality: 'role', text: 'x' }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ reflect: [{ factId: 'TF-02', modality: 'intended', text: getFact('TF-02')!.template }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ reflect: Array.from({ length: MAX_REFLECT_ITEMS + 1 }, () => reflect('TF-01')) })).ok, false);
  // prototype-chain factId must not pass shape validation (R1):
  assert.equal(validateIdqraShape(envelope({ reflect: [{ factId: 'constructor' } as unknown as IDQRAEnvelopeV1['reflect'][number]] })).ok, false);
});

test('validateIdqraShape rejects malformed Define items (bad source, empty ref, unknown key)', () => {
  assert.equal(validateIdqraShape(envelope({ define: [{ source: 'x' as 'pim', ref: 'r', text: 't' }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ define: [{ source: 'pim', ref: '', text: 't' }] })).ok, false);
  assert.equal(validateIdqraShape(envelope({ define: [{ source: 'pim', ref: 'r', text: 't', extra: 1 } as unknown as IDQRAEnvelopeV1['define'][number]] })).ok, false);
});

// --- validateReturnedEnvelope (context-aware, R3) --------------------------------------------

test('validateReturnedEnvelope rechecks eligibility: exact conditional/event templates deny by default', () => {
  const conditional = envelope({ reflect: [reflect('TF-03')] });
  assert.equal(validateIdqraShape(conditional).ok, true); // shape alone does not gate context
  assert.equal(validateReturnedEnvelope(conditional, emptyRenderContext()).ok, false);
  assert.equal(validateReturnedEnvelope(conditional, ctx(['TF-03'])).ok, true);

  const event = envelope({ reflect: [reflect('TF-10')] });
  assert.equal(validateReturnedEnvelope(event, emptyRenderContext()).ok, false);
  assert.equal(validateReturnedEnvelope(event, ctx([], ['TF-10'])).ok, true);
});

test('validateReturnedEnvelope passes an eligible-now role envelope in an empty context', () => {
  assert.equal(validateReturnedEnvelope(envelope(), emptyRenderContext()).ok, true);
});

test('every fact id resolves to a frozen row (table integrity)', () => {
  for (const id of factIds()) assert.ok(getFact(id));
});
