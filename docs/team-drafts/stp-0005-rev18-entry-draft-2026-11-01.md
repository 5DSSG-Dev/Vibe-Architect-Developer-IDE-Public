# STP-0005 rev18 entries: draft for Tracey's approval

Draft entry text by Claude (Verus), 2026-11-01, for writing through `aegis-stp` on DMTAI-DEV **after** independent review and Tracey's approval. **Not in the STP yet.** These supersede-by-append the rev17 draft entries (`stp-0005-rev17-entry-draft-2026-10-31.md`) to match plan rev18, which reconciles rev17 to Lumin's independent review. Append-only: nothing earlier is rewritten; corrections are new entries that name what they supersede.

Source plan: `build-and-run-plan-rev18-2026-11-01.md`. Baseline main `37caf4b`.

## note N5 (independent review recorded)

Lumin independently reviewed rev17 (plan SHA-256 `60C3A570…`, entry draft `4F53B467…`) on 2026-10-31. Fresh checks on main: application 378/378, gateway 226/226, production build and typecheck pass; no browser/hosted-writer/gauge/jailbreak run; npm reported nine dependency vulnerabilities, no upgrades attempted. Verus's hosted-run metrics remain attributed reports, not independent live verification. Review endorsed the separation of stateless Conscience, local gauge, deterministic Define and external lineage, and required the reconciliations below before rev-level can be an executable blueprint.

## finding S8 (Situation) — supersedes the fresh-count reading in T3

rev17 F3 permitted a resubmission to start a fresh linked count. The architect-decision record, `ADMISSION.md` and the implemented 0/1/2 ordinal all hold one initial + two replacements with **no reset** on reopen or resubmit. T3 (rev17) is not rewritten; this finding and T8 supersede its fresh-count reading.

## finding S9 (Situation)

Allowance consumes at durable admission, before assessment, with no post-admission refund — a material conflict with the rev16/rev17 "a service error uses up no loop." The primitive closes the counting shortfall but does not implement continuation of an admitted-then-failed attempt.

## finding S10 (Situation)

`pipeline.ts` reform composes the Luminary revision with `previous.content` and the observation, so "the model never sees the flagged message" cannot carry over to output revision. Isolation must be specified per direction.

## finding S11 (Situation)

`/tasks` calls the shared governed function directly; an `/ask`-only admission wrapper would leave a bypass. Inbound and outbound admission are distinct and must be mapped separately.

## target T8 (Target) — supersedes the fresh-count part of T3

One initial + two replacements; reopen/resubmit retains identity, lineage and remaining allowance; a duplicate submission returns the existing attempt with no reassessment or provider call; exhausted stays exhausted; a genuinely different exchange is not a disguised continuation.

## target T9 (Target)

Admission consumption and service retries are separate: no consumption before durable admission; no refund after; a bounded service retry is part of the same admitted attempt; ambiguous ack triggers same-key reconciliation, never replay or a new key. Three counters (replacement allowance, rewrite budget, writer service-retry) with a finite total writer-call ceiling.

## target T10 (Target)

Per-direction isolation: Architect→Luminary generation sees only the accepted coherent message; Luminary→Architect output revision has a pinned contract (separate bounded-evidence context, or the originating role receives its own Conscience return); in both, the Architect receives no rejected candidate and no cross-role context is shared.

## proposal P5 (revised) — IDQRA response and hosted writer

As rev17 P5, with Lumin's answers folded in: the whole five-field IDQRA envelope is screened (posture on every model-written field, Question additionally for loaded premises/accusation/disguised direction); Acknowledge names only an explicitly supported aim; Identify paraphrases the act; Define has a deterministic structural-failure variant; recipient/direction come from trusted metadata, not prose; the true-facts guard uses approved fact ids / server-rendered templates with runtime evidence, list version/hash/ownership resolved before approval; both dollar and call caps bind, actual and reserved recorded separately; double writer failure keeps `ids_error` (Define-alone is a separate, separately-approved fallback).

## proposal P6 (revised) — durable counting wired, bounded route contract

Wire the admission primitive with: trusted caller/workspace/direction scope (the shared demo key is not identity); stable client-key lifecycle across retry/reload; exact original content captured (fix the `/ask` trim) and an immutable effective-request envelope; register/admit before assessment; new-vs-existing handling; server-verified receipts; same-key uncertainty recovery; startup lock and graceful close; legacy-record compatibility with no rewrite or invented reset. All governed callers (`/ask` and `/tasks`) in the acceptance map; inbound and outbound admission separated; neither marked complete for the other.

## proposal P7 (unchanged, still a proposal)

The protected-operation boundary as a distinct axis (rev18 section carried from rev17 B): trigger-never-verdict, authorization from trusted scope/consent/capabilities not an asserted claim, its own must-pass cases, and — if adopted — its own frozen-build gate before "complete governance." Not approved by review.

## note N6 (corrections to the rev17 STP draft)

- S6 (hosted-writer live run) is attributed to Verus and pinned to its run artifact/commit; it is an attributed report, not independent verification.
- Storage test base is unambiguous: `32cba0b` pre-storage base; storage head `e1611fb`; merged by `907e225`; Lumin's fresh checks at `37caf4b`.
- N3's true-facts wording reads "proposed list pending approval" — an unreviewed draft is not labelled approved.

## milestone M2 (revised)

Order within governance: P5 (IDQRA + hosted writer), then P6 (wire durable counting, both route paths), with P7 held until Tracey settles it. Done when the independent gate **G** passes and acceptance items 14, 14a, 16, 16a, 17, 18, 18a, 19, 20, 21, 22, 22a, 23, 24, 25 and 26 all pass and are recorded — each named, none hidden in a range. App work still waits on G. Every step is independently reviewed; no author approves their own.
