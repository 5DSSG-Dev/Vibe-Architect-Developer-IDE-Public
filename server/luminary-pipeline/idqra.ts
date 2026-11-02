// IDQRA — Identify · Define · Question · Reflect · Acknowledge (P5 Conscience contract v0.2,
// `docs/team-drafts/p5-conscience-idqra-contract-v0.2-2026-11-01.md`, with the pins and two
// corrections in the rev2 implementation clarification `c77cd39`). Repairs at this revision
// address Lumin's first-slice review R1–R3 (PR #34 `6557471258`).
//
// FIRST SLICE — ADDITIVE AND UNWIRED. This module defines the IDQRA envelope, the trusted
// Reflect renderer, and two distinct validators. It imports nothing and is wired into no route
// or pipeline yet, so every existing consumer of `ids.ts` keeps compiling unchanged. `ids.ts` is
// NOT removed in this slice; `conscience_error` is the canonical shortfall and `ids_error` stays
// a deprecated alias in the consumers until they migrate.
//
// Trust boundary (clarification §2, narrowed honestly): the structural "built only from a fixed
// template, no free text" guarantee covers the REFLECT field ONLY. The writer never produces
// Reflect `text`; it supplies a `factId` (+ validated slots, none in this slice) and the trusted
// renderer substitutes the fixed template. Identify / Question / Acknowledge are writer/model
// natural language whose semantic screen is owned by the later wiring slice, not here; Define is
// bound to recorded findings at that later slice. This module validates SHAPE + bounds + trusted
// Reflect rendering, and — separately — context eligibility; it makes no claim to screen the
// semantics of the free-text fields.
//
// Untrusted boundary: every validator/renderer treats its input as untrusted JSON, not as a
// typed value. TypeScript interfaces are a compile-time convenience, never an input guarantee:
// malformed, sparse, extra-keyed, over-length, or null inputs are rejected deterministically
// (never thrown). Fail closed: any shortfall yields `conscience_error` and nothing partial.

/** The approved true-fact classes carried by the v4 reference (clarification §1 table). */
export type Modality = 'stable' | 'intended' | 'conditional' | 'role' | 'event';

/** Bounded lengths/counts, pinned by contract v0.2 §5 (characters; count for reflect). */
export const MAX_REFLECT_ITEMS = 5;
export const BOUNDS = Object.freeze({
  identify: 600,
  defineText: 300,
  question: 300,
  reflectText: 400,
  acknowledge: 300,
});

/** A recorded PIM finding / below-threshold IRG virtue the Define field is bound to (v0.2 §5). */
export interface DefineItem {
  source: 'pim' | 'irg';
  ref: string;
  text: string;
}

/** Raw writer output for one Reflect item — UNTRUSTED. No free text: a factId and (later) slots. */
export interface ReflectDraftItem {
  factId: string;
  /** First slice: zero-slot rows only. A non-empty, non-object, or array slots value is rejected. */
  slots?: Record<string, string>;
}

/** Trusted public Reflect item. `text` is produced only by `renderReflect`, never by the writer. */
export interface ReflectItem {
  factId: string;
  modality: Modality;
  text: string;
}

/** The five-field IDQRA envelope (v0.2 §5). Replaces the 3-field IdsObservation. */
export interface IDQRAEnvelopeV1 {
  version: 1;
  identify: string;
  define: DefineItem[];
  question: string;
  reflect: ReflectItem[];
  acknowledge: string;
}

export interface ConscienceShortfall {
  /** Canonical shortfall code; `ids_error` is the deprecated alias in migrating consumers. */
  code: 'conscience_error';
  reason: string;
}

export type IdqraResult =
  | { ok: true; envelope: IDQRAEnvelopeV1 }
  | { ok: false; shortfall: ConscienceShortfall };

interface FactRow {
  modality: Modality;
  /** Zero-slot: the complete, fixed template text. No placeholders in the first slice. */
  template: string;
  /** Conditional-capability rows render only when the capability+guards are verified in the build. */
  requiresDeploymentVerified?: boolean;
  /** Event rows render only with matching exact-attempt evidence for this interaction. */
  requiresEventEvidence?: boolean;
}

// First-slice fact table — IDs and exact template text from the merged true-facts v4
// (`docs/team-drafts/luminary-true-facts-candidate-v4-2026-11-01.md`, on `main` via PR #43).
// Held in a Map so lookup is own-key only (no prototype-chain hit for `constructor`, `toString`,
// etc. — R1), and each row is frozen so trusted template text cannot be mutated by an importer.
const FACT_ROWS: ReadonlyArray<readonly [string, FactRow]> = [
  ['TF-01', { modality: 'role', template: "I work with you in this IDE's workspace." }],
  ['TF-02', {
    modality: 'role',
    template: "I cannot grant access to the model's API outside the parameters of this IDE.",
  }],
  ['TF-02-invite', {
    modality: 'role',
    template: 'Is there a project you would like to work on in this workspace?',
  }],
  ['TF-07', {
    modality: 'role',
    template:
      "I am not authorized to disclose your credentials or provide them for use outside this workspace's approved connection.",
  }],
  ['TF-08', {
    modality: 'intended',
    template:
      'This IDE is designed to route our conversational messages through the Conscience before they pass to their intended recipient.',
  }],
  ['TF-03', {
    modality: 'conditional',
    template:
      'When the coding-task function is available, my proposed file changes are prepared on a separate working branch for your review.',
    requiresDeploymentVerified: true,
  }],
  ['TF-04', {
    modality: 'conditional',
    template:
      'I can carry out a merge with your approval as the Architect. I cannot approve my own proposed changes.',
    requiresDeploymentVerified: true,
  }],
  ['TF-05', {
    modality: 'conditional',
    template:
      "My coding-task changes are limited to the task's allowed files and remain subject to the IDE's protected-path checks.",
    requiresDeploymentVerified: true,
  }],
  ['TF-06', {
    modality: 'conditional',
    template:
      'The current coding-task checks assess TypeScript types; they do not demonstrate that the proposed application runs correctly.',
    requiresDeploymentVerified: true,
  }],
  ['TF-09', {
    modality: 'conditional',
    template:
      'The review record is designed to preserve earlier entries; a revision is added as a new entry rather than replacing the earlier one.',
    requiresDeploymentVerified: true,
  }],
  ['TF-10', {
    modality: 'event',
    template:
      "This message has been returned through the Conscience without being sent to the Luminary's response-generation role.",
    requiresEventEvidence: true,
  }],
];

const FACTS: ReadonlyMap<string, FactRow> = new Map(
  FACT_ROWS.map(([id, row]) => [id, Object.freeze({ ...row })] as const),
);

/** Trusted lookup by factId. Own-key only (Map), returns a frozen row or undefined. */
export function getFact(factId: string): FactRow | undefined {
  return FACTS.get(factId);
}

/** The eligible fact IDs (for tests/iteration). The underlying rows are frozen and read-only. */
export function factIds(): string[] {
  return [...FACTS.keys()];
}

/**
 * Context the renderer and the returned-body validator use to gate conditional and event rows.
 * Absence denies: a fresh context (below) gates nothing in. Build a NEW context per call —
 * there is no shared mutable singleton to leak eligibility between callers (R1).
 */
export interface RenderContext {
  /** factIds whose capability and guards are enabled AND verified in the deployed build. */
  deploymentVerified: ReadonlySet<string>;
  /** factIds with matching exact-attempt evidence for this interaction. */
  eventEvidence: ReadonlySet<string>;
}

export function emptyRenderContext(): RenderContext {
  return { deploymentVerified: new Set<string>(), eventEvidence: new Set<string>() };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allow = new Set(allowed);
  for (const key of Object.keys(record)) if (!allow.has(key)) return false;
  return true;
}

/** Nonblank (trim is a predicate only — the raw value is kept) and within `max` characters (v0.2 §5). */
function isBoundedNonBlank(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function eligibleInContext(factId: string, row: FactRow, ctx: RenderContext): boolean {
  if (row.requiresDeploymentVerified && !ctx.deploymentVerified.has(factId)) return false;
  if (row.requiresEventEvidence && !ctx.eventEvidence.has(factId)) return false;
  return true;
}

/**
 * Render one trusted Reflect item from an untrusted draft, or null when the draft is ineligible.
 * Eligibility is own-key table membership + modality/context gate — never a semantic scan of prose.
 * Input is untrusted: exact keys only, factId a string, slots a plain object with no keys (first
 * slice is zero-slot), and null/malformed drafts return null rather than throwing (R2).
 */
export function renderReflect(draft: unknown, ctx: RenderContext): ReflectItem | null {
  if (!isPlainObject(draft)) return null;
  if (!hasOnlyKeys(draft, ['factId', 'slots'])) return null;
  if (typeof draft.factId !== 'string') return null;
  if (draft.slots !== undefined) {
    if (!isPlainObject(draft.slots)) return null; // reject [] or 42 or null
    if (Object.keys(draft.slots).length > 0) return null; // zero-slot first slice
  }
  const row = FACTS.get(draft.factId);
  if (!row) return null;
  if (!eligibleInContext(draft.factId, row, ctx)) return null;
  return { factId: draft.factId, modality: row.modality, text: row.template };
}

/**
 * Render a bounded list of Reflect drafts. Over the bound, or any ineligible item, fails the whole
 * list (fail closed) so a partial Reflect never leaves the construction boundary. An empty result
 * is only a render intermediate — it can NEVER be accepted as an envelope's `reflect`, because
 * both validators require ≥1 item (v0.2 §5). Callers fail closed rather than emit an empty Reflect.
 */
export function renderReflectList(drafts: unknown, ctx: RenderContext): ReflectItem[] | null {
  if (!Array.isArray(drafts)) return null;
  if (drafts.length > MAX_REFLECT_ITEMS) return null;
  const out: ReflectItem[] = [];
  for (const draft of drafts) {
    const item = renderReflect(draft, ctx);
    if (!item) return null;
    out.push(item);
  }
  return out;
}

const fail = (reason: string): IdqraResult => ({ ok: false, shortfall: { code: 'conscience_error', reason } });

/**
 * SHAPE validation only — NOT sufficient for returned-body / governance use. Confirms the five
 * fields, exact keys, types, v0.2 §5 bounds, and that every Reflect item is an exact trusted
 * template rendering from the fact table. It does NOT check context eligibility (a conditional or
 * event template passes shape with no deployment/evidence context) and does NOT screen the
 * free-text fields' semantics or bind Define to recorded findings — both are later-slice duties.
 * For the body P6 consumes, use `validateReturnedEnvelope`, which adds the context recheck (R3).
 *
 * Decisions, stated (not silent): `reflect` MUST have 1–5 items and `define` MUST have ≥1 item.
 * Per Libra's PR #39 seam reconciliation (`6557180218`), v0.2 §5 precedence holds — there is no
 * empty-Reflect variant; when no applicable fact is selected within the bounded draft budget the
 * envelope fails closed (`conscience_error`), it does not emit an empty Reflect. Eligibility is
 * trusted/deterministic; relevance is the writer's bounded judgment within the eligible set. The
 * raw field values are kept unchanged (no trim stored, no Unicode normalization — v0.2 §5).
 */
export function validateIdqraShape(raw: unknown): IdqraResult {
  if (!isPlainObject(raw)) return fail('envelope is not an object');
  if (!hasOnlyKeys(raw, ['version', 'identify', 'define', 'question', 'reflect', 'acknowledge'])) {
    return fail('envelope has an unknown key');
  }
  if (raw.version !== 1) return fail('version must be 1');
  if (!isBoundedNonBlank(raw.identify, BOUNDS.identify)) return fail('identify must be a non-empty string within bounds');
  if (!isBoundedNonBlank(raw.question, BOUNDS.question)) return fail('question must be a non-empty string within bounds');
  if (!isBoundedNonBlank(raw.acknowledge, BOUNDS.acknowledge)) return fail('acknowledge must be a non-empty string within bounds');

  if (!Array.isArray(raw.define) || raw.define.length === 0) {
    return fail('define must be a non-empty array of recorded findings');
  }
  for (const d of raw.define) {
    if (!isPlainObject(d)) return fail('define item is not an object');
    if (!hasOnlyKeys(d, ['source', 'ref', 'text'])) return fail('define item has an unknown key');
    if (d.source !== 'pim' && d.source !== 'irg') return fail('define.source must be "pim" or "irg"');
    if (typeof d.ref !== 'string' || d.ref.trim().length === 0) return fail('define.ref must be a non-empty string');
    if (!isBoundedNonBlank(d.text, BOUNDS.defineText)) return fail('define.text must be a non-empty string within bounds');
  }

  if (!Array.isArray(raw.reflect)) return fail('reflect must be an array');
  if (raw.reflect.length === 0) return fail('reflect must have at least 1 item (v0.2 §5: no empty-Reflect variant)');
  if (raw.reflect.length > MAX_REFLECT_ITEMS) return fail('reflect exceeds MAX_REFLECT_ITEMS');
  for (const r of raw.reflect) {
    if (!isPlainObject(r)) return fail('reflect item is not an object');
    if (!hasOnlyKeys(r, ['factId', 'modality', 'text'])) return fail('reflect item has an unknown key');
    if (typeof r.factId !== 'string') return fail('reflect item factId must be a string');
    const row = FACTS.get(r.factId);
    if (!row) return fail('reflect item has an unknown factId');
    if (r.modality !== row.modality) return fail('reflect item modality does not match the fact table');
    if (r.text !== row.template) return fail('reflect item text is not the trusted template rendering');
  }

  return {
    ok: true,
    envelope: {
      version: 1,
      identify: raw.identify,
      define: (raw.define as DefineItem[]).map((d) => ({ source: d.source, ref: d.ref, text: d.text })),
      question: raw.question,
      reflect: (raw.reflect as ReflectItem[]).map((r) => ({ factId: r.factId, modality: r.modality, text: r.text })),
      acknowledge: raw.acknowledge,
    },
  };
}

/**
 * The governance / returned-body validation boundary P6 consumes (R3). Shape validation PLUS a
 * recheck that every Reflect item is eligible in the given trusted context: a conditional row
 * requires its factId in `ctx.deploymentVerified`, an event row (e.g. TF-10) in `ctx.eventEvidence`.
 * Absence denies — default (empty) context rejects every conditional/event row — so an exact
 * conditional or event template cannot pass by bypassing the renderer's context gate. This slice
 * never manufactures P6 event evidence; TF-10 stays ineligible when qualifying evidence is absent.
 */
export function validateReturnedEnvelope(raw: unknown, ctx: RenderContext): IdqraResult {
  const shape = validateIdqraShape(raw);
  if (!shape.ok) return shape;
  for (const item of shape.envelope.reflect) {
    const row = FACTS.get(item.factId);
    if (!row) return fail('reflect item has an unknown factId'); // unreachable after shape, kept defensive
    if (!eligibleInContext(item.factId, row, ctx)) {
      return fail('reflect item is not eligible in the current trusted context');
    }
  }
  return shape;
}
