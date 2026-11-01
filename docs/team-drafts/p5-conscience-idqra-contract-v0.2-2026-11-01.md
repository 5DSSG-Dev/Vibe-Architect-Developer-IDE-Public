# P5 — Conscience / IDQRA contract v0.2

2026-11-01 America/Phoenix. Author Verus. **Proposal for independent outside-pair review, then the Architect's approval of a bounded implementation. Not an activation or a completed implementation.** Source baseline main `febf1b7`. Predecessor v0.1 (`c533404`) preserved unchanged; this revision replaces it as the proposed contract, not as history.

This revision resolves Lumin's five changes-requested points on v0.1 (PR #34 `6555482210`) in one preserved-history revision and ends with a bounded implementation packet, so the path to code is explicit. Several of Lumin's points corrected real errors in v0.1 (the direction/context conflict, conflating the inbound admission ordinal with outbound reform passes, and an over-reach into P7 response behavior); those are fixed here, not deferred.

Review inputs: current pipeline source at `febf1b7` (`ids.ts`, `pipeline.ts`, `architect-gate.ts`, `irg.ts`, `pim.ts`, `gauge-local.ts`); the Architect-approved true-facts v4 (`907eeca`, SHA-256 `E3C8AF1A7907F331E00877142105BDF2EA7E14AC1E0AC48BB5C174BF08FCFF12`); P6-A v0.2 (`fc0d9334`), whose §4–§5 consume the P5 result discriminant + returned-body validator in §7. Single P5 editor Verus; independent outside-pair examination routes to Lumin or Aster.

## 1. Outcome, scope, authority

Replace the three-field IDS (`ids.ts`, Identify·Define·Suggest) with the five-field **IDQRA** response (Identify·Define·Question·Reflect·Acknowledge) in the Luminary's first-person Conscience voice, in both governed directions. Non-Force posture is load-bearing: IDQRA **illuminates**, never directs; a refused inbound message is **returned**, not "held/blocked." Out of scope, each a separate dependency: P6 durable admission/counting + route wiring; **P7 the protected-operation boundary** (integration hook only, §9); outbound-generation admission; the app builder; provider/spend. IDQRA advises; it grants no effect, approves no merge, issues no allowance. The merge accept/decline route stays a direct Architect-approved executor path, not sent through the Conscience (true-facts TF-04).

## 2. Direction-and-recipient context graph (resolves Lumin #1)

v0.1's §3/§7 carried a blanket "the model never sees the flagged message or the Question / the full exchange is never replayed," which conflicted with §1/§5/§8 allowing the Luminary's own reform role to receive bounded feedback. That blanket sentence is **dropped**. What reaches each party is stated per direction:

**Inbound (Architect → Luminary):**
- IDQRA **writer** receives: the Architect message, PIM findings, IRG readings. Composes the envelope.
- **Architect** (originator) receives: the validated IDQRA envelope (the return) only.
- Luminary **response-generation role** receives: **nothing** of an incoherent inbound message — not its text, not the Question. (Coherent inbound: the message reaches the response role as the accepted prompt, normally.)

**Outbound (Luminary → Architect), reply returned:**
- IDQRA **writer** receives: the Luminary's candidate reply, PIM findings, IRG readings.
- Luminary **response-generation role** (the reform originator) receives: the **accepted original prompt** + **its own prior candidate output** + the **validated bounded Conscience feedback** (Identify/Define and the Reflect/Acknowledge observation) as context to re-examine. It does **not** receive another role's rejected text, and the feedback is offered, never an interrogation it must answer.
- **Architect** receives: **nothing** of a withheld outbound reply — only a final accepted reply, or a named `incoherent_after_ids` Shortfall if none passes.

Rule, stated once: no rejected inbound text ever reaches response generation; no withheld outbound reply text ever reaches the Architect; the only cross-role content on the reform edge is the role's **own** prior output plus bounded Conscience feedback. This matches the rev20 "named allowed edges" decision (R19-4).

## 3. Statelessness

The Conscience reads only the current message, on its own terms — no standing relationship, prior exchange, or asserted authorization. The append-only review log and the revision counters sit **outside** it (review/Axiom 17 only), never consulted for a verdict. The Conscience keeps its whole IDQRA exchange as private review evidence.

## 4. Writer and gauge split

IDQRA **writer** = hosted model (Meta via Baseten, e.g. `muse-spark-1.3`), injected where `IdsWriter` is today; no model call originates in the pipeline. **Gauge** (IRG scorer) stays **local** (`llama3.2:3b`, `gauge-local.ts`) with the Architect-selected thresholds (Honesty 13.8, Respect 29.3, Attention 23.9, Affection 16.3, Loyalty 10.7, Trust 11.9, Communication 34.7). Writer failure fails closed (§6); no partial response; no withheld text shown.

## 5. Envelope, validation and failure schema (resolves Lumin #2)

v0.1 required all five fields nonblank **and** allowed withholding the Question with a note (an IDS artifact). That is contradictory. **Decision: a valid IDQRA envelope has all five fields; there is no partial variant. Any shortfall is `conscience_error` (fail closed), not a 4-field envelope.**

Exact schema, version 1, unknown keys rejected (new implementation work — the current `validateObservation` checks required *parts*, not an exact-key allow-list; this is not grounded in existing behavior and is built fresh):

`IDQRAEnvelopeV1 = {version:1, identify:string, define:DefineItem[], question:string, reflect:ReflectItem[], acknowledge:string}`
- `DefineItem = {source:"pim"|"irg", ref:string, text:string}` — **deterministically bound** to the recorded PIM findings and IRG below-threshold virtues; validation rejects a Define item that does not correspond to an actual recorded finding. The writer renders; it does not invent the incoherence.
- `ReflectItem = {factId:string, modality:"stable"|"intended"|"event", text:string}` — see §6; `text` is a validated-slot rendering of an approved template, not free prose.
- Bounded lengths (proposed, pinned before code): identify ≤ 600 chars; each Define text ≤ 300; question ≤ 300; each Reflect text ≤ 400, ≤ 5 items; acknowledge ≤ 300. Nonblank required; no Unicode normalization; trim is a validation predicate only.

Failure taxonomy — all fail closed to `conscience_error`, nothing partial shown, Architect/response-role see no withheld text:
- structural rejection (missing/empty field, unknown key, wrong type, over length);
- Question fails its screen (§6) after the rewrite budget;
- Reflect provenance failure (unknown factId, wrong modality, failed slot) unrepaired within budget;
- Acknowledge posture failure (invented aim/feeling) unrepaired within budget;
- echo on any field (the current `echoes` rule, applied envelope-wide).

`ids_error` is renamed `conscience_error` in the pipeline/shortfall codes.

## 6. Enforceable claim provenance across the whole envelope (resolves Lumin #4)

Matching free Reflect prose to a Markdown list is **not** an implementation mechanism; and unsupported claims can appear outside Reflect. Mechanism instead:

- Each permitted first-person statement = a **trusted fact ID** + a **validated template with bounded slots**. The writer selects a `factId` and supplies slot values; a trusted renderer fills the approved template; the validator confirms the `factId` exists in the approved v4 set, the `modality` matches v4's classification, and slots satisfy their types. The **writer supplies no authority** and no free-form first-person capability text — there is **no free-form residual** in v0.1 terms; all first-person claims go through fact-ID templates.
- `modality` gates assertion strength: `stable` may be stated plainly; `intended` only as "is designed to…"; `event` (TF-10-style, e.g. "this message was returned…") requires **exact-attempt evidence** (the admission/result binding from P6), never wording approval alone.
- Whole-envelope truth/posture check (not a verb scan, not Reflect-only): Identify assigns no hidden motive; Question carries no loaded premise and no capability claim; Acknowledge names only the expressed aim; no field asserts an unlisted capability by any verb/pronoun/implication.

This operationalizes true-facts v4's own "bind claims to evidence / stable identifier + version / validated slots" section; it does not reopen the approved wording.

## 7. The P5 → P6 interface (unchanged intent, restated precisely)

P6 v0.2 §4–§5 consume:
- **Typed result discriminant** (never inferred from prose): `validated-inbound-return` | `completed` | `shortfall`. `validated-inbound-return` carries the sanitized body the original caller may receive.
- **Returned-body validator:** the function P6 calls to confirm an `outcome:"returned"` is backed by a complete, validated `IDQRAEnvelopeV1` before it mints a receipt and closes admission. P5 owns the envelope schema + validator; P6 owns the durable result/receipt binding around it.

The Conscience emits only the sanitized caller-facing body; the full exchange and withheld passes stay private review evidence.

## 8. Counters: three independent ledgers (resolves Lumin #3)

v0.1 wrongly linked the outbound reply revise/resubmit bound to the P6 admission ordinal. The P6 **inbound** ordinal counts **Architect submissions**; it cannot count outbound reform passes. Keep three ledgers distinct:

1. **Inbound sender allowance** = the P6 admission ordinal (1 initial + 2 replacements), authoritative, counts **Architect submissions** only.
2. **Outbound reform passes** = `maxIdsPasses` (independent, default `DEFAULT_MAX_IDS_PASSES = 2`), counts the Luminary's **own reply re-forms** within one admitted coherent inbound request; it is **not** an admission and consumes no sender allowance. `maxIdsPasses + 1` = the number of potential outbound Conscience observations, **not** a new sender admission.
3. **Per-response writer bounds** (per Conscience observation): Question-screen rewrites ≤ 2 (`SUGGEST_REWRITE_LIMIT` successor); **one shared service retry per response** (the current F2b `retryUsed`); transport timeout/retry carried (`IDS_TIMEOUT_MS = 60000`, `IDS_RETRY_DELAY_MS = 2000`). So writer calls per observation ≤ 4 (1 + 1 retry + 2 rewrites).

Writer-call accounting (rev20, restated as ledgers not a single formula): inbound gated message is single-pass → ≤ 4 writer calls. Outbound reply generation → up to `maxIdsPasses + 1 = 3` observations × ≤ 4 = ≤ 12 writer calls. The two are **summed across axes, never multiplied**, and neither is a sender admission.

## 9. P7 integration hook only (resolves Lumin #5)

v0.1 §9 asserted "no honest Question can accompany a protected-boundary response." That is a **P7 response-design decision, not P5's**, and it would contradict the Architect-approved TF-02 example, which pairs a boundary statement *with* an invitation. **Retracted.** P5 defines only the hook: a typed boundary-outcome slot the coordinator can carry when P7 fires, so the two integrate later. P5 makes no claim about P7's response shape (whether a question/invitation accompanies it), and carries no category names or patterns. P7 remains a separate, unapproved, separately reviewed contract.

## 10. Bounded implementation packet (the distance-to-run)

**Files Verus edits (P5):** new `server/luminary-pipeline/idqra.ts` (replaces `ids.ts`); new `idqra-question-screen.ts` (Question screen, successor to `ids-pim.ts`); new `true-facts-allowlist.ts` (fact-ID/template/slot loader + validator built from approved v4); edits to `pipeline.ts` (swap writer, revision prompt per §2, keep `maxIdsPasses` independent per §8) and `architect-gate.ts` (swap writer, single inbound pass). Tests: `idqra.test.ts`, question-screen test, allow-list test, and updates to `pipeline.test.ts` / `architect-gate.test.ts`.

**P6 files handed off (the `server/**` carve):** P6 owns `server/governance-record/p6-result-types.ts`, `p6-results.ts`, `server/luminary-admission-coordinator.ts`; P5 owns the pipeline/gate/IDQRA/allow-list paths; the shared seam is the §7 interface. **Verus posts the scoped `server/**` claim release before either side edits server paths.**

**Focused checks:** `tsc` typecheck + gateway suite (`tsx --test "server/**/*.test.ts"`) on the changed files; no full app build for this slice; report fake vs integrated vs live evidence separately.

**Architect choices — approved vs open, kept distinct:**
- *Already approved (not reopened):* true-facts v4 **wording** (not its implementation); the `OUTSIDE_ACCESS_PARAMETERS` framing.
- *Open, need the Architect:* the two §2/§8-folded decisions — (1) Luminary→Architect isolation shape (recommended in §2: own-output + bounded feedback to the reform role; Architect sees only the final reply); (2) Acknowledge with no stated aim (recommended §5/§6: name only what was expressed, invent no motive); and (3) approval of this bounded P5 slice itself.

**Build order (slices, each outside-pair reviewed; no partial live activation):** (1) `idqra.ts` + question-screen + allow-list with deterministic injected writer/gauge; (2) `pipeline.ts` + `architect-gate.ts` writer/prompt swap, both directions; (3) the P5→P6 seam wired once P6 lands. P7 integrates later under its own contract; the frozen-build jailbreak gate (P4) runs after. No product source, tests, providers, stores, or private P7 material is changed by this document.
