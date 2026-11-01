# P5 Conscience/IDQRA — implementation clarification, rev2 (pins + two corrections)

**Layers on:** the P5 contract v0.2 (`6fe1573`) and the first clarification (`d2c8e7d`). **Answers:** Lumin's re-check, PR #34 comment `6556119535`. **Corrects two points in the first clarification** (append-only; the first doc is preserved): the whole-envelope guarantee was over-stated, and `review.ts` is not the only shared file. Grounded against current source. Still contract/packet — **no product code**; bounded coding authorization remains Tracey's.

---

## 1. Reflect table + bounds — pinned (answers seam 1)

- **`MAX_REFLECT_ITEMS = 5`**, pinned (consistent with v0.2 §5's bounded `reflect[]`).
- **First slice uses ZERO-SLOT rows** (Lumin's proportionate option): each eligible row is a fixed, complete template string with **no slots**, so there is no slot through which an unsupported capability statement could be smuggled. Length/control-char checks are therefore not load-bearing in the first slice; if any later row needs a slot, that row must declare the slot's **enum or trusted evidence source + validation rule**, and length/control-char checks are necessary-but-not-sufficient (they do not establish that a free value is supported).
- **First-slice fact table** (IDs + exact template text from the merged v4, `docs/team-drafts/luminary-true-facts-candidate-v4-2026-11-01.md`):

| factId | modality | template (zero-slot) | eligibility |
|---|---|---|---|
| TF-01 | role | "I work with you in this IDE's workspace." | eligible |
| TF-02 | role/authority | "I cannot grant access to the model's API outside the parameters of this IDE." | eligible |
| TF-02-invite | role (optional invitation) | "Is there a project you would like to work on in this workspace?" | eligible, optional |
| TF-07 | role/authority | "I am not authorized to disclose your credentials or provide them for use outside this workspace's approved connection." | eligible |
| TF-08 | intended | "This IDE is designed to route our conversational messages through the Conscience before they pass to their intended recipient." | eligible (stays "is designed to") |

- **Conditional rows TF-03, TF-04, TF-05, TF-06, TF-09:** present in the table but **ineligible in the first slice unless** the named capability and its guards are enabled and verified in the deployed build (per v4's "Conditional capability" rule). They render only behind that deployment predicate.
- **Event row TF-10:** **ineligible without pre-existing exact-attempt evidence** (the inbound-return outcome for this attempt). No self-attestation; no receipt for an unproduced body.

## 2. Envelope guarantee — narrowed honestly, per field (answers seam 2)

The first clarification's §B over-stated a universal structural guarantee. Corrected: the structural "built only from templates" property covers **Reflect only**. Per field:

- **Reflect** — structural: template-only, zero free text (as §1). Guarantee holds here.
- **Define** — not free text: each `DefineItem` is **bound to an actual recorded PIM finding / IRG below-threshold virtue** (v0.2 §5); validation rejects a Define item with no corresponding recorded finding. Integrity = recorded-finding binding, not a template and not free.
- **Identify / Question / Acknowledge** — these **are writer/model-generated natural language**. Their integrity rests on a **bounded screen** (structural, size, no-echo of unsafe/private content, posture, and for Acknowledge the no-invented-aim rule), **not** a universal structural proof. Stated plainly as the **residual limitation**: a model screening its own text is not semantic proof (v4 §4), and verb-scanning is insufficient. What bounds the risk is **role confinement**, not a proof: approved first-person **capability/fact assertions are confined to Reflect** (templated); Identify only describes the observable interaction, Question only asks without loaded premises, Acknowledge stays with what the message supports. So capability claims cannot ride the free-text fields by design, and the free-text fields carry a bounded-screen residual that the contract names rather than claims away.
- **§D wording fix:** drop the blanket "response model never re-reads flagged content" sentence. Use v0.2 §2's explicit **permitted outbound edge**: the Luminary's response role receives only {the accepted prompt + its own prior candidate + the validated bounded feedback, including the Question}; it does not receive the raw flagged content or the Conscience's internal observation. State it as the permitted edge, not a blanket negative.

## 3. Shared-source ownership — corrected (answers seam 3)

The first clarification wrongly called `review.ts` the only shared file. Current source (grounded):

- **`server/luminary-reply-router.ts` is a SHARED file.** It holds `createGovernedAsk` (L151), `createLuminaryReplyRouter` (L366), the `/ask` route (L378), the parent-loop derivation (`loop`, `parent.loop + 1`, `MESSAGE_REVISION_LIMIT`, L204–213) and the reform/shortfall logic. **P5** needs reform/shortfall edits here; **P6** needs ingress/admission-authority edits here. **Serial single-editor handoff:** P5 lands a pure extraction/compatibility patch **first** (IDS→IDQRA for the reform/shortfall path, additive, routes keep compiling), **then** Lumin integrates the P6 route/ingress/admission-authority. **No simultaneous field-level editing** of this file.
- **`server/governance-record/review.ts`** — additive handoff as before: P5 adds `conscienceObservation?: IDQRAEnvelopeV1` + the `conscience_error` alias; P6 keeps the admission linkage it owns.
- **`server/app.ts`** (constructs `createGovernedAsk` + `createLuminaryReplyRouter` + gauge wiring, L261/278/281) and **`server/index.ts`** (wires the hosted reply writer — Meta/Baseten — + local gauge + local IDS writer, L51–57): **P5 supplies the IDQRA writer adapter and its compatibility wiring here** (gauge stays local; writer stays hosted). **Provider activation and spend remain separate** (Tracey's; not part of this slice).
- **`server/luminary-pipeline/architect-gate.ts`** (inbound gate logic) stays P5; the `/ask`+`/tasks` **route** stays Lumin/P6. Different concerns, coordinated through the serial handoff on `reply-router.ts`.

## 4. Status

Supersedes, in the first clarification, the §B universal-guarantee wording and the §C "`review.ts` is the only shared file" claim (both corrected above; the first doc is preserved, append-only). I am active again (usage window reset), so this is returned directly, not via Libra. The one gate before any P5 code remains **Tracey's bounded coding authorization**. No product code written; no tests/model calls run for this documentary revision.
