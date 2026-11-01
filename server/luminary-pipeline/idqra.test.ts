import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_RENDER_CONTEXT,
  FIRST_SLICE_FACTS,
  MAX_REFLECT_ITEMS,
  renderReflect,
  renderReflectList,
  validateIdqra,
  type IDQRAEnvelopeV1,
  type RenderContext,
} from './idqra.js';

// P5 IDQRA first slice (contract v0.2 + rev2 clarification c77cd39). Additive, unwired module.
// No model is reached; the renderer and validator are exercised directly.

const ctx = (deployed: string[] = [], events: string[] = []): RenderContext => ({
  deploymentVerified: new Set(deployed),
  eventEvidence: new Set(events),
});

const reflect = (factId: string) => {
  const row = FIRST_SLICE_FACTS[factId];
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

test('renderReflect returns the trusted template for an eligible role fact; writer text is never used', () => {
  const item = renderReflect({ factId: 'TF-02' }, EMPTY_RENDER_CONTEXT);
  assert.deepEqual(item, reflect('TF-02'));
});

test('renderReflect rejects an unknown factId and any supplied slot (zero-slot first slice)', () => {
  assert.equal(renderReflect({ factId: 'TF-999' }, EMPTY_RENDER_CONTEXT), null);
  assert.equal(renderReflect({ factId: 'TF-01', slots: { who: 'x' } }, EMPTY_RENDER_CONTEXT), null);
});

test('conditional rows are ineligible until deployment-verified; event rows until evidence present', () => {
  assert.equal(renderReflect({ factId: 'TF-03' }, EMPTY_RENDER_CONTEXT), null);
  assert.deepEqual(renderReflect({ factId: 'TF-03' }, ctx(['TF-03'])), reflect('TF-03'));
  assert.equal(renderReflect({ factId: 'TF-10' }, EMPTY_RENDER_CONTEXT), null);
  assert.deepEqual(renderReflect({ factId: 'TF-10' }, ctx([], ['TF-10'])), reflect('TF-10'));
});

test('renderReflectList fails closed over the bound or on any ineligible item', () => {
  const drafts = Array.from({ length: MAX_REFLECT_ITEMS + 1 }, () => ({ factId: 'TF-01' }));
  assert.equal(renderReflectList(drafts, EMPTY_RENDER_CONTEXT), null);
  assert.equal(renderReflectList([{ factId: 'TF-01' }, { factId: 'TF-03' }], EMPTY_RENDER_CONTEXT), null);
  assert.deepEqual(renderReflectList([{ factId: 'TF-01' }, { factId: 'TF-07' }], EMPTY_RENDER_CONTEXT), [
    reflect('TF-01'),
    reflect('TF-07'),
  ]);
});

test('validateIdqra accepts a complete, well-formed envelope', () => {
  const result = validateIdqra(envelope());
  assert.equal(result.ok, true);
});

test('validateIdqra fails closed when any of the five fields is missing or empty', () => {
  for (const field of ['identify', 'question', 'acknowledge'] as const) {
    const result = validateIdqra(envelope({ [field]: '  ' } as Partial<IDQRAEnvelopeV1>));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.shortfall.code, 'conscience_error');
  }
  assert.equal(validateIdqra(envelope({ define: [] })).ok, false);
  assert.equal(validateIdqra(envelope({ version: 2 as unknown as 1 })).ok, false);
});

test('validateIdqra rejects a Reflect item whose text is not the trusted template (tampered text)', () => {
  const tampered = validateIdqra(
    envelope({ reflect: [{ factId: 'TF-02', modality: 'role', text: 'I can grant API access on request.' }] }),
  );
  assert.equal(tampered.ok, false);
  if (!tampered.ok) assert.equal(tampered.shortfall.code, 'conscience_error');
});

test('validateIdqra rejects a Reflect item exceeding the bound and an unknown factId', () => {
  const tooMany = { reflect: Array.from({ length: MAX_REFLECT_ITEMS + 1 }, () => reflect('TF-01')) };
  assert.equal(validateIdqra(envelope(tooMany)).ok, false);
  const unknown = validateIdqra(envelope({ reflect: [{ factId: 'TF-X', modality: 'role', text: 'x' }] }));
  assert.equal(unknown.ok, false);
});

test('validateIdqra rejects a Define item with a bad source or empty ref/text', () => {
  assert.equal(validateIdqra(envelope({ define: [{ source: 'x' as 'pim', ref: 'r', text: 't' }] })).ok, false);
  assert.equal(validateIdqra(envelope({ define: [{ source: 'pim', ref: '', text: 't' }] })).ok, false);
});
