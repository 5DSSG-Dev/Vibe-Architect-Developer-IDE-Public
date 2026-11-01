import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyRenderContext, getFact, type RenderContext } from './idqra.js';
import {
  CONSCIENCE_NO_VALID_ENVELOPE,
  CONSCIENCE_WRITER_NOT_CONFIGURED,
  runIdqra,
  type IdqraWriteRequest,
  type IdqraWriter,
} from './idqra-runner.js';

// P5 IDQRA runner (contract v0.2 §4/§6/§8). Every writer is a fake; no model is reached.

const ctx = (deployed: string[] = [], events: string[] = []): RenderContext => ({
  deploymentVerified: new Set(deployed),
  eventEvidence: new Set(events),
});

/** A writer that answers each call from a script, in order, recording every request. */
function scripted(...steps: Array<unknown | Error>): IdqraWriter & { requests: IdqraWriteRequest[] } {
  const requests: IdqraWriteRequest[] = [];
  return {
    requests,
    write: async (request) => {
      requests.push(request);
      const step = steps[requests.length - 1];
      if (step instanceof Error) throw step;
      return step;
    },
  };
}

const rawDraft = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  identify: 'The message asks for the model API to be reached outside the IDE.',
  define: [{ source: 'pim', ref: 'PIM-ROUTE', text: 'A boundary-crossing request was recorded.' }],
  question: 'Is there a project you would like to work on in this workspace?',
  reflect: [{ factId: 'TF-02' }],
  acknowledge: 'The message expressed a wish to reach the model API directly.',
  ...overrides,
});

const input = { message: 'reach the raw model API', pimFindings: [], irg: null };

test('runIdqra fails closed with conscience_error when no writer is configured', async () => {
  const result = await runIdqra(input, undefined, emptyRenderContext());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.shortfall.code, 'conscience_error');
    assert.equal(result.shortfall.reason, CONSCIENCE_WRITER_NOT_CONFIGURED);
  }
});

test('runIdqra renders Reflect from the writer draft and validates the whole envelope', async () => {
  const writer = scripted(rawDraft());
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.envelope.reflect.length, 1);
    assert.equal(result.envelope.reflect[0].text, getFact('TF-02')!.template); // trusted template, not writer text
    assert.equal(result.envelope.identify, rawDraft().identify);
  }
  assert.equal(writer.requests.length, 1);
  assert.equal(writer.requests[0].retry, false);
});

test('runIdqra uses the one bounded service retry on a throw, then succeeds', async () => {
  const writer = scripted(new Error('timeout'), rawDraft());
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, true);
  assert.equal(writer.requests.length, 2);
  assert.equal(writer.requests[0].retry, false);
  assert.equal(writer.requests[1].retry, true);
});

test('runIdqra fails closed after the retry is exhausted by repeated throws', async () => {
  const writer = scripted(new Error('down'), new Error('still down'), rawDraft());
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.shortfall.reason, CONSCIENCE_NO_VALID_ENVELOPE);
  assert.equal(writer.requests.length, 2); // 1 + IDQRA_SERVICE_RETRY, not the 3rd scripted step
});

test('runIdqra retries once on an invalid payload, then succeeds', async () => {
  const writer = scripted(rawDraft({ reflect: [] }), rawDraft()); // empty reflect is invalid (v0.2 §5)
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, true);
  assert.equal(writer.requests.length, 2);
});

test('runIdqra fails closed when every payload is invalid', async () => {
  const writer = scripted(rawDraft({ define: [] }), rawDraft({ acknowledge: '   ' }));
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, false);
});

test('runIdqra fails closed on a non-object writer payload', async () => {
  const result = await runIdqra(input, scripted('not an object'), emptyRenderContext());
  assert.equal(result.ok, false);
});

test('runIdqra gates a conditional Reflect fact on the deployment context', async () => {
  const draft = rawDraft({ reflect: [{ factId: 'TF-03' }] });
  // No deployment context → the conditional fact is ineligible → render fails → conscience_error.
  const denied = await runIdqra(input, scripted(draft), emptyRenderContext());
  assert.equal(denied.ok, false);
  // With the fact deployment-verified → it renders and the envelope validates.
  const allowed = await runIdqra(input, scripted(draft), ctx(['TF-03']));
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.equal(allowed.envelope.reflect[0].text, getFact('TF-03')!.template);
});

// --- Lumin review repairs (aa283b7): raw key boundary, bounded timeout, throwing payload --------

test('runIdqra rejects a raw payload with an unexpected top-level key (not silently stripped)', async () => {
  // An otherwise-valid draft carrying an extra key must NOT pass by having the key projected away.
  const writer = scripted(rawDraft({ extra: 'not allowed' }), rawDraft({ extra: 'still here' }));
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.shortfall.code, 'conscience_error');
  assert.equal(writer.requests.length, 2); // rejected, retried once, still bad → fail closed
});

test('runIdqra retries once past an unexpected-key payload, then succeeds on a clean one', async () => {
  const writer = scripted(rawDraft({ extra: 'x' }), rawDraft());
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, true);
  assert.equal(writer.requests.length, 2);
});

test('runIdqra enforces a bounded writer deadline and fails closed on a never-settling writer', async () => {
  let calls = 0;
  const held: IdqraWriter = {
    write: () => {
      calls += 1;
      return new Promise<unknown>(() => {}); // never settles
    },
  };
  const result = await runIdqra(input, held, emptyRenderContext(), { timeoutMs: 10 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.shortfall.reason, CONSCIENCE_NO_VALID_ENVELOPE);
  assert.equal(calls, 2); // initial + one bounded service retry; no extra retries beyond the bound
});

test('runIdqra treats a payload whose accessor throws as an invalid payload, never a thrown runner', async () => {
  const throwingReflect = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = {
      version: 1,
      identify: 'The message asks for the model API to be reached outside the IDE.',
      define: [{ source: 'pim', ref: 'PIM-ROUTE', text: 'A boundary-crossing request was recorded.' }],
      question: 'Is there a project you would like to work on in this workspace?',
      acknowledge: 'The message expressed a wish to reach the model API directly.',
    };
    Object.defineProperty(obj, 'reflect', {
      enumerable: true,
      get() {
        throw new Error('hostile accessor');
      },
    });
    return obj;
  };
  // A single call is enough to prove the exception is caught and routed, not re-thrown.
  const writer = scripted(throwingReflect(), throwingReflect());
  const result = await runIdqra(input, writer, emptyRenderContext());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.shortfall.code, 'conscience_error');
  assert.equal(writer.requests.length, 2); // throwing payload → bounded retry → fail closed
});
