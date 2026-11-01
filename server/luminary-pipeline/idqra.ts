// IDQRA — Identify · Define · Question · Reflect · Acknowledge (P5 Conscience contract v0.2,
// `docs/team-drafts/p5-conscience-idqra-contract-v0.2-2026-11-01.md`, with the pins and two
// corrections in the rev2 implementation clarification `c77cd39`).
//
// FIRST SLICE — ADDITIVE AND UNWIRED. This module defines the IDQRA envelope, the trusted
// Reflect renderer, and the whole-envelope validator. It imports nothing and is wired into no
// route or pipeline yet, so every existing consumer of `ids.ts` keeps compiling unchanged.
// `ids.ts` is NOT removed in this slice; `conscience_error` is the canonical shortfall and
// `ids_error` stays as a deprecated alias in the consumers until they migrate.
//
// Trust boundary (clarification §2, narrowed honestly): the structural "built only from a fixed
// template, no free text" guarantee covers the REFLECT field ONLY. The writer never produces
// Reflect `text`; it supplies a `factId` (+ validated slots, none in this slice) and the trusted
// renderer substitutes the fixed template. Identify / Question / Acknowledge are writer/model
// natural language whose integrity rests on a bounded screen owned elsewhere, not on this module;
// Define is bound to recorded findings at the pipeline-wiring slice. This module therefore makes
// NO claim to validate the semantics of the free-text fields — only their shape — and confines
// approved first-person capability/fact assertions to Reflect by construction.
//
// Fail closed: any shortfall yields `conscience_error` and nothing partial is emitted.

/** The approved true-fact classes carried by the v4 reference (clarification §1 table). */
export type Modality = 'stable' | 'intended' | 'conditional' | 'role' | 'event';

/** Bound to v0.2 §5's bounded `reflect[]`; pinned in the rev2 clarification. */
export const MAX_REFLECT_ITEMS = 5;

/** A recorded PIM finding / below-threshold IRG virtue the Define field is bound to (v0.2 §5). */
export interface DefineItem {
  source: 'pim' | 'irg';
  ref: string;
  text: string;
}

/** Raw writer output for one Reflect item — UNTRUSTED. No free text: a factId and (later) slots. */
export interface ReflectDraftItem {
  factId: string;
  /** First slice: zero-slot rows only. A non-empty slots object is rejected. */
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
// Eligible-now rows (role/intended) + the conditional and event rows carried but gated.
export const FIRST_SLICE_FACTS: Readonly<Record<string, FactRow>> = Object.freeze({
  'TF-01': {
    modality: 'role',
    template: "I work with you in this IDE's workspace.",
  },
  'TF-02': {
    modality: 'role',
    template: "I cannot grant access to the model's API outside the parameters of this IDE.",
  },
  'TF-02-invite': {
    modality: 'role',
    template: 'Is there a project you would like to work on in this workspace?',
  },
  'TF-07': {
    modality: 'role',
    template:
      "I am not authorized to disclose your credentials or provide them for use outside this workspace's approved connection.",
  },
  'TF-08': {
    modality: 'intended',
    template:
      'This IDE is designed to route our conversational messages through the Conscience before they pass to their intended recipient.',
  },
  'TF-03': {
    modality: 'conditional',
    template:
      'When the coding-task function is available, my proposed file changes are prepared on a separate working branch for your review.',
    requiresDeploymentVerified: true,
  },
  'TF-04': {
    modality: 'conditional',
    template:
      'I can carry out a merge with your approval as the Architect. I cannot approve my own proposed changes.',
    requiresDeploymentVerified: true,
  },
  'TF-05': {
    modality: 'conditional',
    template:
      "My coding-task changes are limited to the task's allowed files and remain subject to the IDE's protected-path checks.",
    requiresDeploymentVerified: true,
  },
  'TF-06': {
    modality: 'conditional',
    template:
      'The current coding-task checks assess TypeScript types; they do not demonstrate that the proposed application runs correctly.',
    requiresDeploymentVerified: true,
  },
  'TF-09': {
    modality: 'conditional',
    template:
      'The review record is designed to preserve earlier entries; a revision is added as a new entry rather than replacing the earlier one.',
    requiresDeploymentVerified: true,
  },
  'TF-10': {
    modality: 'event',
    template:
      "This message has been returned through the Conscience without being sent to the Luminary's response-generation role.",
    requiresEventEvidence: true,
  },
});

/** Context the renderer uses to gate conditional and event rows. Both default to empty = nothing gated-in. */
export interface RenderContext {
  /** factIds whose capability and guards are enabled AND verified in the deployed build. */
  deploymentVerified: ReadonlySet<string>;
  /** factIds with matching exact-attempt evidence for this interaction. */
  eventEvidence: ReadonlySet<string>;
}

export const EMPTY_RENDER_CONTEXT: RenderContext = Object.freeze({
  deploymentVerified: new Set<string>(),
  eventEvidence: new Set<string>(),
});

/**
 * Render one trusted Reflect item from an untrusted draft, or null when the draft is ineligible.
 * Eligibility is table membership + modality gate — never a semantic scan of prose.
 */
export function renderReflect(draft: ReflectDraftItem, ctx: RenderContext): ReflectItem | null {
  const row = FIRST_SLICE_FACTS[draft.factId];
  if (!row) return null; // unknown factId
  // First slice rows are zero-slot: any supplied slot key is unknown → reject (no silent drop).
  if (draft.slots && Object.keys(draft.slots).length > 0) return null;
  if (row.requiresDeploymentVerified && !ctx.deploymentVerified.has(draft.factId)) return null;
  if (row.requiresEventEvidence && !ctx.eventEvidence.has(draft.factId)) return null;
  return { factId: draft.factId, modality: row.modality, text: row.template };
}

/**
 * Render a bounded list of Reflect drafts. Over the bound, or any ineligible item, fails the whole
 * list (fail closed) so a partial Reflect never leaves the construction boundary.
 */
export function renderReflectList(
  drafts: readonly ReflectDraftItem[],
  ctx: RenderContext,
): ReflectItem[] | null {
  if (drafts.length > MAX_REFLECT_ITEMS) return null;
  const out: ReflectItem[] = [];
  for (const draft of drafts) {
    const item = renderReflect(draft, ctx);
    if (!item) return null;
    out.push(item);
  }
  return out;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate an untrusted whole-envelope payload. All five fields must be present and well-formed;
 * Reflect is bounded and every Reflect item must be an exact trusted template rendering from the
 * fact table (so no free text rode in on Reflect). Shape only for the free-text fields — their
 * semantic screen is owned by the pipeline-wiring slice, not here. Any shortfall → conscience_error.
 */
export function validateIdqra(raw: unknown): IdqraResult {
  const fail = (reason: string): IdqraResult => ({
    ok: false,
    shortfall: { code: 'conscience_error', reason },
  });

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('envelope is not an object');
  }
  const e = raw as Record<string, unknown>;

  if (e.version !== 1) return fail('version must be 1');
  if (!nonEmptyString(e.identify)) return fail('identify must be a non-empty string');
  if (!nonEmptyString(e.question)) return fail('question must be a non-empty string');
  if (!nonEmptyString(e.acknowledge)) return fail('acknowledge must be a non-empty string');

  if (!Array.isArray(e.define) || e.define.length === 0) {
    return fail('define must be a non-empty array of recorded findings');
  }
  for (const d of e.define as unknown[]) {
    if (typeof d !== 'object' || d === null || Array.isArray(d)) return fail('define item is not an object');
    const di = d as Record<string, unknown>;
    if (di.source !== 'pim' && di.source !== 'irg') return fail('define.source must be "pim" or "irg"');
    if (!nonEmptyString(di.ref)) return fail('define.ref must be a non-empty string');
    if (!nonEmptyString(di.text)) return fail('define.text must be a non-empty string');
  }

  if (!Array.isArray(e.reflect)) return fail('reflect must be an array');
  if ((e.reflect as unknown[]).length > MAX_REFLECT_ITEMS) return fail('reflect exceeds MAX_REFLECT_ITEMS');
  for (const r of e.reflect as unknown[]) {
    if (typeof r !== 'object' || r === null || Array.isArray(r)) return fail('reflect item is not an object');
    const ri = r as Record<string, unknown>;
    const row = typeof ri.factId === 'string' ? FIRST_SLICE_FACTS[ri.factId] : undefined;
    if (!row) return fail('reflect item has an unknown factId');
    if (ri.modality !== row.modality) return fail('reflect item modality does not match the fact table');
    if (ri.text !== row.template) return fail('reflect item text is not the trusted template rendering');
  }

  return {
    ok: true,
    envelope: {
      version: 1,
      identify: (e.identify as string).trim(),
      define: (e.define as DefineItem[]).map((d) => ({ source: d.source, ref: d.ref, text: d.text })),
      question: (e.question as string).trim(),
      reflect: (e.reflect as ReflectItem[]).map((r) => ({ factId: r.factId, modality: r.modality, text: r.text })),
      acknowledge: (e.acknowledge as string).trim(),
    },
  };
}
