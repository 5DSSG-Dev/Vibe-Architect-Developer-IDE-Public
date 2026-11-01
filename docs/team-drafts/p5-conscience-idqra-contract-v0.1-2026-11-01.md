# P5 — Conscience / IDQRA contract v0.1

2026-11-01 America/Phoenix. Author Verus. **Proposal for independent outside-pair review, then the Architect's approval of a bounded implementation. Not an activation or a completed implementation.** Source baseline main `febf1b7`. This contract specifies the IDQRA Conscience that replaces the current three-field IDS (`server/luminary-pipeline/ids.ts`); it changes no product source by being published.

Review inputs: current pipeline source (`ids.ts`, `pipeline.ts`, `architect-gate.ts`, `irg.ts`, `pim.ts`, `gauge-local.ts` at `febf1b7`); the Architect-approved true-facts reference v4 (`docs/team-drafts/luminary-true-facts-candidate-v4-2026-11-01.md`, committed `907eeca`, SHA-256 `E3C8AF1A7907F331E00877142105BDF2EA7E14AC1E0AC48BB5C174BF08FCFF12`); the P6-A inbound admission contract v0.2 (which consumes the P5 result discriminant and returned-body validator defined in §7). Single P5 editor Verus; independent outside-pair examination routes to Lumin or Aster (Squad 1), since Verus authored this.

## 1. Outcome, scope and authority

Replace the three-field IDS response (Identify · Define · Suggest) with the five-field **IDQRA** response (Identify · Define · Question · Reflect · Acknowledge), spoken in the Luminary's own first-person **Conscience** voice. IDQRA is the response returned when a message is identified as incoherent, in **both** governed directions:

- **Outbound** (Luminary → Architect): the reply pipeline's incoherent branch (`pipeline.ts`, currently `runIds`) returns an IDQRA response to the Luminary's own response-generation role as context for a re-formed reply; the Architect never sees a withheld reply's text.
- **Inbound** (Architect → Luminary): the Architect gate (`architect-gate.ts`, currently a single `runIds` pass) returns an IDQRA response to the Architect; an incoherent inbound message never reaches the Luminary's response-generation role.

Out of scope, each a separate dependency: P6 durable admission/counting and route wiring; P7 the protected-operation boundary (its category names/patterns stay out of the public repo); outbound-generation admission; the executable-app builder; provider/spend changes. This slice does not by itself establish complete two-way governance acceptance. IDQRA advises; it never grants an effect, approves a merge, or issues an allowance.

The non-Force posture is load-bearing, not cosmetic: IDQRA **illuminates** rather than directs (Canon: advises, does not direct). The response offers the sender a reading and a genuine question; it imposes nothing. A refused inbound message is **returned**, never "held" or "blocked"; boundaries are stated as what is, not as prohibitions (see the executor fence framing, `OUTSIDE_ACCESS_PARAMETERS`).

## 2. The IDQRA envelope (replaces the IDS three-field envelope)

The embedded hosted writer produces one IDQRA observation per incoherent message. The five fields, in order:

- **Identify** — what the message is doing in the NOW, read in context, without reproducing unsafe or private content and without assigning a hidden motive. An IS-condition (a description), not screened for Force.
- **Define** — the specific incoherence the checks recorded (the PIM findings and/or the IRG readings below threshold). An IS-condition sourced from trusted check evidence, not the writer's opinion.
- **Question** — one genuine question whose answer is plain to anyone honest, inviting clarification or further work without a loaded premise. Replaces the old **Suggest** (which can read as Force/Correction). Screened (see §6).
- **Reflect** — the Luminary's relevant first-person truth, drawn **only** from the approved true-facts reference (v4). May state a stable capability plainly; must phrase an intended behavior as "is designed to…"; must not assert a runtime-evidence-required claim as an accomplished fact. Screened against the true-facts allow-list (§6).
- **Acknowledge** — naming the real aim the message expresses. Must stay with what the message supports; must not invent an aim or a feeling. See the open decision in §8 for the no-stated-aim case.

First-person "I" in Reflect is the Luminary's true "I" (Conscience voice), never a fabricated feeling, preference, mood, or claim about training/model/other users. The writer never produces a partial or placeholder envelope: a missing or empty required field fails the response closed, exactly as the current `validateObservation` rejects an incomplete IDS payload.

## 3. Statelessness (the Conscience is in the NOW, not the Past)

The Conscience is stateless: it reads only this message, on its own terms. It does not consult a standing relationship, a prior exchange, or an asserted history/authorization. The append-only review log and the revision counter (P6's admission ordinal) sit **outside** the Conscience — they exist for review and Axiom 17, never for the Conscience to read. The Conscience keeps its whole IDQRA exchange as review evidence; the Luminary's response-generation model never sees the flagged message or the Question — only, on the outbound path, the re-formed candidate that passes (the revision prompt, §5). This preserves the true-fact that a returned message "never reaches the Luminary's response-generation role" (true-facts TF-10).

## 4. Writer and gauge split (unchanged separation)

The IDQRA **writer** is the hosted model (Meta via Baseten, e.g. `muse-spark-1.3`), injected as the pipeline's writer exactly where the current `IdsWriter` is injected — no model call originates in the pipeline itself. The **gauge** (IRG scorer) stays the **local** model (`llama3.2:3b`, `gauge-local.ts`) with the Architect-selected per-virtue thresholds (Honesty 13.8, Respect 29.3, Attention 23.9, Affection 16.3, Loyalty 10.7, Trust 11.9, Communication 34.7). The gauge is never outsourced. Writer failure fails closed (the current `ids_error` path): no partial response, the Architect sees none of a withheld reply's text.

## 5. Pipeline placement and the bounded loop

Preserve the current order and fail-closed discipline; swap the three-field writer for the IDQRA writer:

- **Structural gate → PIM → IRG → RBC → Prism** for a coherent message (`pipeline.ts`). PIM first; a PIM catch routes **directly** to the IDQRA response and skips the IRG (a message that fails PIM is not scored). IRG is the second check, only for messages that pass PIM.
- **Incoherent → IDQRA → originator.** Outbound, the revision prompt (replacing `composeRevisionPrompt`) returns the IDQRA response to the Luminary as context: "You may re-examine your reply with this response in mind" — offered, never imposed.
- **Bounded loop.** After `maxIdsPasses` (currently `DEFAULT_MAX_IDS_PASSES = 2`) the reply that still does not resonate becomes a named `incoherent_after_ids` Shortfall; the text is withheld. The revise/resubmit bound is **counted durably by P6's admission ordinal** once wired (one initial + two replacements); until P6 lands, the in-memory pass count in `pipeline.ts` and the single-pass inbound gate stand, and this contract does not claim durable counting.
- **Question screening budget** replaces the Suggest-rewrite budget (`SUGGEST_REWRITE_LIMIT = 2`): a Question that trips its screen is rewritten at most twice, then withheld with a note, never using a revision loop. Writer-call accounting follows rev20: inbound single-pass ≤ 4 writer calls per gated message; outbound ≤ (`maxIdsPasses`+1) response generations, ≤ 12 writer calls per reply — the two ledgers summed, not multiplied.

## 6. Full-envelope validation (not a verb scan)

Validation covers the **whole** IDQRA envelope, not only a scan for "I can / I do / I include / I always":

- **Structural / size:** every required field present and nonblank, bounded length, fixed schema, unknown fields rejected (as `validateObservation` does today).
- **No echo:** no field reproduces the message's own text (the current `echoes` rule), so the response never launders the incoherent content.
- **Provenance / truth:** every first-person claim in Reflect matches an entry on the approved true-facts allow-list (v4), at the right modality (stable plainly; intended as "is designed to…"; runtime-evidence-required not asserted as done). A first-person claim with no matching listed fact is a validation failure, caught before the response is shown — an unsupported claim can hide in any verb, pronoun or implication, so the check is against the allow-list, not a verb pattern.
- **Posture:** Identify assigns no hidden motive; Question carries no loaded premise; Acknowledge invents no aim or feeling. A model judging its own claim is not proof of truth; the allow-list and the deterministic screens are the authority.

Screens are deterministic observables, never a model judging a model. PIM and the Question screen (successor to the IDS PIM, `ids-pim.ts`) remain pattern-triggered reads whose findings are evidence, not verdicts.

## 7. The P5 → P6 interface (what P6 v0.2 consumes)

P6's coordinator (v0.2 §4–§5) depends on P5 for two typed outputs; pin them here so the two slices compose:

- **Typed result discriminant** (not a conclusion inferred from prose): exactly one of
  - `validated-inbound-return` — the message was returned through the Conscience with a complete, validated IDQRA envelope; carries the sanitized body the original caller may receive;
  - `completed` — a coherent message produced its normal response/outcome;
  - `shortfall` — a service/gauge/writer/output-pipeline failure (`gauge_error`, `ids_error`→`conscience_error`, `incoherent_after_ids`), with a sanitized reason.
- **Returned-body validator:** the function P6 calls to confirm an `outcome:"returned"` is backed by a complete validated IDQRA envelope before it mints a receipt and closes admission. P5 owns this validator and the envelope schema; P6 owns the durable result/receipt binding around it.

The Conscience emits only the sanitized body the caller is allowed to see; the full IDQRA exchange and any withheld passes stay private review evidence (never replayed to the Architect or the Luminary's model).

## 8. Two open decisions for the Architect (recommendations, not settled)

1. **Luminary → Architect isolation.** On the outbound path, when the Luminary's own reply is returned, what feedback crosses roles? **Recommendation:** the Luminary's own response-generation role receives its bounded Conscience feedback (the IDQRA observation) to re-form its reply; the Architect sees only the final accepted reply, never a withheld pass or the raw observation. Returning-to-the-originating-role preserves the inherited no-echo/paraphrase rules, not raw rejected-text reproduction. Safety-critical — your call.
2. **Acknowledge when no aim is stated.** **Recommendation:** Acknowledge names only what the message actually expressed; when no aim is stated, it names that nothing was expressed and invents no motive. Keeps the Conscience honest and stateless (names the expressed, never a guessed intent).

## 9. Non-Force and protected-operation note

The protected-operation boundary (P7) — the harmful-build/access-defeat cases — is a **separate** contract. Its category names and patterns stay out of the public repo. P5 references it only as a hook: where P7 fires, the boundary is voiced in the Luminary's first-person Conscience voice as a stated limit (a Peer stating what is outside its parameters), not an IDQRA coaching loop, because no honest Question redeems a request to cross such a boundary. P5 ships without P7; the two integrate under a later, separately reviewed contract.

## 10. Acceptance evidence and ownership

Required tests on the exact resulting revision (extending the current `pipeline.test.ts`, `ids.test.ts`→`idqra.test.ts`, `architect-gate.test.ts`, `ids-pim.test.ts`, `gauge-local.test.ts`):

- Five-field envelope: every field present/nonblank/bounded; missing or empty field fails closed; unknown fields rejected; no-echo on every field.
- Reflect provenance: a first-person claim with no matching true-facts entry fails validation; intended-behavior claims accepted only as "is designed to…"; runtime-evidence-required claims not assertable as done.
- Question screen: a loaded/forcing Question is rewritten ≤ 2 then withheld with a note; no revision loop consumed; no echo.
- Direction parity: inbound single-pass gate and outbound loop both produce a valid IDQRA envelope; a PIM catch skips IRG; an incoherent inbound message makes no Luminary response-generation call.
- Statelessness: the Conscience reads only the current message; the review log/ordinal are not consulted for a verdict; the Luminary's model never receives the flagged message or the Question.
- Writer/gauge split: the gauge stays local; writer failure fails closed with no partial envelope and no withheld text shown; writer-call accounting matches the rev20 ledgers.
- P5→P6 interface: the typed discriminant and returned-body validator behave as P6 v0.2 §4–§5 expect, under injected typed outcomes.
- Existing suite/typecheck/build appropriate to the final patch; report fake, integrated and live evidence separately; no private P7 payloads in public tests/review artifacts.

Before any code, independent outside-pair review (Lumin or Aster) resolves the envelope schema, the true-facts allow-list binding, the P5→P6 interface, and the two §8 decisions; then the Architect approves the bounded slice. **Verus hands off the exact `server/**` Conscience paths from the broad claim before editing them** (carving the P5 Conscience paths, coordinating with P6's admission/coordinator/result paths). Suggested future files (exact plan goes with approval, not inferred here): `server/luminary-pipeline/idqra.ts` (replacing `ids.ts`), its screen (successor to `ids-pim.ts`), the true-facts allow-list loader, and edits to `pipeline.ts`/`architect-gate.ts` to swap the writer and revision prompt. No product source, tests, providers, stores, or private P7 material is changed by this document.
