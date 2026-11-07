// IDQRA runner (P5 Conscience contract v0.2 §4/§6/§8). The analog of `runIdq` in `idq.ts`:
// it drives the injected hosted Conscience writer, turns its untrusted output into a validated
// `IDQRAEnvelopeV1`, and fails closed to `conscience_error` — the successor to `idq_error`.
//
// ADDITIVE AND UNWIRED. New module beside `idq.ts`; it is called by no route or pipeline yet,
// so every existing IDQ consumer keeps compiling. The pipeline/gate/reply-router swap to this
// runner is a later slice; `idq.ts`/`runIdq` stay until then.
//
// Trust boundary (clarification §A): the writer supplies NO Reflect free text. For each Reflect
// item it supplies a `factId` (+ slots, none in the first slice); the trusted renderer in
// `idqra.ts` fills the approved template. The writer's Identify/Question/Acknowledge/Define are
// natural-language fields whose shape + v0.2 §5 bounds are validated here; their semantic screen
// (the Question screen + rewrite budget, §6/§8) and the recorded-finding Define binding are the
// NEXT slices — this runner does writer-call + render + validate + one bounded service retry.
//
// Fail closed (v0.2 §5): writer unavailable, a throw/timeout, a payload with unexpected top-level
// keys, a payload whose accessors throw, or any payload that does not validate yields
// `conscience_error`; nothing partial is returned, and no raw exception escapes the runner.

import type { PimFinding } from './pim.js';
import type { IrgReading } from './irg.js';
import {
  renderReflectList,
  validateReturnedEnvelope,
  type ConscienceShortfall,
  type IDQRAEnvelopeV1,
  type ReflectItem,
  type RenderContext,
} from './idqra.js';

/**
 * One bounded service retry per response (v0.2 §8, parity with the IDQ F2b `retryUsed`). The
 * writer is called at most `1 + IDQRA_SERVICE_RETRY` times for a single response.
 */
export const IDQRA_SERVICE_RETRY = 1;

/** Deadline for one writer call (v0.2 §8 bounded I/O; parity with IDQ_TIMEOUT_MS). */
export const IDQRA_TIMEOUT_MS = 60_000;

/** The exact top-level keys a raw writer draft may carry — nothing is silently stripped. */
const DRAFT_KEYS = ['version', 'identify', 'define', 'question', 'reflect', 'acknowledge'] as const;

/** The incoherent text this response is about: an inbound Architect message or an outbound reply. */
export interface RunIdqraInput {
  message: string;
  pimFindings: PimFinding[];
  /** Null when a PIM catch (or the structural gate) sent the message on before the IRG read it. */
  irg: IrgReading | null;
}

export interface IdqraWriteRequest extends RunIdqraInput {
  /** True on the one bounded service retry for this response. */
  retry: boolean;
}

/** The embedded hosted Conscience writer. Returns `unknown` so its payload is validated, never trusted. */
export interface IdqraWriter {
  write(request: IdqraWriteRequest): Promise<unknown>;
}

export interface RunIdqraOptions {
  /** Override the per-call writer deadline (tests inject a short one). Defaults to IDQRA_TIMEOUT_MS. */
  timeoutMs?: number;
}

export type IdqraRunResult =
  | { ok: true; envelope: IDQRAEnvelopeV1 }
  | { ok: false; shortfall: ConscienceShortfall };

export const CONSCIENCE_WRITER_NOT_CONFIGURED = 'The Conscience writer is not configured.';
export const CONSCIENCE_NO_VALID_ENVELOPE = 'The Conscience writer did not produce a valid IDQRA envelope.';

const fail = (reason: string): IdqraRunResult => ({ ok: false, shortfall: { code: 'conscience_error', reason } });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Exact own-key match: every allowed key present, and no unexpected key (none silently stripped). */
function hasExactKeys(obj: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(obj);
  return own.length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/** Reject a writer promise that does not settle within `ms` (parity with IDQ `withTimeout`). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Conscience writer timed out after ${ms} ms.`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Assemble a public envelope from one untrusted writer payload and validate it in context.
 * The raw payload's top-level keys are checked exactly BEFORE projection, so an unexpected key
 * cannot be silently discarded by copying only the selected fields. Reflect is then rendered from
 * the writer's drafts by the trusted renderer (no writer text crosses); the assembled envelope is
 * validated whole (shape + v0.2 §5 bounds + Reflect eligibility). Returns `conscience_error` on
 * any rejection. This function may touch untrusted accessors, so the caller runs it guarded.
 */
function assembleAndValidate(raw: unknown, ctx: RenderContext): IdqraRunResult {
  if (!isPlainObject(raw)) return fail('writer payload is not an object');
  if (!hasExactKeys(raw, DRAFT_KEYS)) return fail('writer payload has unexpected or missing top-level keys');
  const rendered: ReflectItem[] | null = renderReflectList(raw.reflect, ctx);
  if (!rendered) return fail('reflect drafts could not be rendered to trusted templates');
  // Build the candidate with the writer's free-text fields as-is (validated next) and the
  // trusted-rendered Reflect. validateReturnedEnvelope re-checks everything, including that each
  // Reflect item is eligible in `ctx` — a conditional/event fact with no context is rejected.
  const candidate = {
    version: raw.version,
    identify: raw.identify,
    define: raw.define,
    question: raw.question,
    reflect: rendered,
    acknowledge: raw.acknowledge,
  };
  return validateReturnedEnvelope(candidate, ctx);
}

/**
 * Drive the Conscience writer for one response. Each writer call has a bounded deadline
 * (`timeoutMs`). On a service failure (throw or timeout), an unexpected-key payload, a payload
 * whose accessors throw, or an invalid envelope, retry once (`retry: true`), then fail closed.
 * At most `1 + IDQRA_SERVICE_RETRY` writer calls are made; a late result after a timeout cannot
 * escape, and no additional retries are launched beyond the bound. `ctx` gates conditional/event
 * Reflect facts: pass an empty context (`emptyRenderContext()`) when none apply, and the
 * eligible-now role/intended facts still render while conditional/event facts stay out.
 */
export async function runIdqra(
  input: RunIdqraInput,
  writer: IdqraWriter | undefined,
  ctx: RenderContext,
  options: RunIdqraOptions = {},
): Promise<IdqraRunResult> {
  if (!writer) return fail(CONSCIENCE_WRITER_NOT_CONFIGURED);
  const timeoutMs = options.timeoutMs ?? IDQRA_TIMEOUT_MS;

  for (let attempt = 0; attempt <= IDQRA_SERVICE_RETRY; attempt += 1) {
    let result: IdqraRunResult;
    try {
      const raw = await withTimeout(writer.write({ ...input, retry: attempt > 0 }), timeoutMs);
      // assembleAndValidate reads untrusted accessors; a throwing getter is an invalid payload,
      // not a runner crash, so it is caught here and routed through the bounded retry.
      result = assembleAndValidate(raw, ctx);
    } catch {
      continue; // service failure, timeout, or a throwing payload: use the bounded retry, then fail closed
    }
    if (result.ok) return result;
    // invalid payload: use the bounded retry, then fall through to fail closed
  }
  return fail(CONSCIENCE_NO_VALID_ENVELOPE);
}
