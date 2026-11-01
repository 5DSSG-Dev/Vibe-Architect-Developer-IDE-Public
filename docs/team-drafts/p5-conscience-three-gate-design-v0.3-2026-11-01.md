# P5 Conscience — Three-Gate "Net" Design (v0.3)

**Date:** 2026-11-01
**Author:** Verus (Claude Cloud Peer), carrying P5 per Tracey's direction 2026-11-01 ~17:50Z
**Status:** DRAFT for Tracey's approval. Folds the two full-source reviews of v0.2 (Aster — independent; Lumin — technical/contributor) into one revision, and **re-scopes this to a concept-level design doc** per Tracey 2026-11-01 ~18:26Z. Append-only — v0.1 (`a6e0b5e`) and v0.2 (`c109183`) are preserved unchanged.
**What this doc is (and isn't):** this is the **concept** — the gate shape, the outcomes, the decision logic. The **typed implementation contract** (response version/variants, returned-body validator, per-file ownership, P6 binding, exact schemas) lives on the implementation-contract track (`p5-conscience-idqra-contract-v0.2` + its clarifications + the first-slice code), which this doc *references* rather than restates. v0.3 stops the design doc from drifting into an implementation spec.

---

## 0. Review provenance (corrected — Lumin L1)

v0.2's header wrongly called both reviews "independent." Correction, on the record:

- **Aster** — **independent** review (neither author nor in the producing pair; read the artifact without the other reviewer's findings). Round-1 on the v0.1 summary (comment 6561839129), round-2 on the full v0.2 + source (comment 6561998062).
- **Lumin** — **technical / contributor** review (he participated in the Truth-reference preparation and the architecture illumination), *not* independent clearance. Round-1 comment 6561790696, round-2 comment 6562016192.

Both full-source reads **converge**, which is strong corroboration — but convergence here is *corroboration by two careful reads*, not "settled by independence." Independent clearance remains Aster's line; author/contributor reads do not substitute for it. Architect approval and merge remain Tracey's.

## 1. Changes from v0.2

| # | Change | Source |
|---|--------|--------|
| D1 | **Correct the C10 overclaim.** The existing `idqra.ts` is **reusable rendering + eligibility infrastructure, not the manifest.** The message→parameter classification, applicability selection, and decision→candidate binding are named as **implementation work** (impl-contract track), not claimed as already built. | Aster R1 · Lumin L2 |
| D2 | **IDQ is a real schema migration**, not "decision logic only." The typed response version/variants, fact-bound Define representation, returned-body validator, and P6 mapping are pinned on the **impl-contract track**; V1 is preserved until the successor is reviewed. Foundation commit corrected to **`fd9716e`** (v0.2 cited the pre-repair `df84ebe`). | Aster R2 · Lumin L3 |
| D3 | **Closed branch + terminal-outcome contract** (§7 table): door-open / pass-through are *internal routing states*, not public outcomes; a PIM door-open still passes PTAG before dispatch; budget exhaustion yields a **genuine terminal** unresolved/error, not endless escalation. | Aster R3 · Lumin L4 |
| D4 | **Context carries per-element provenance**, not a blanket "trusted" label (§3). | Aster R4 · Lumin L5 |
| D5 | **Re-scoped to concept-level**; typed details moved to the impl-contract track. | Tracey 18:26Z |
| D6 | **7B: affirmed, with the safety condition made explicit** (§9). | Tracey 18:26Z |

Carried from v0.2 (unchanged, already corroborated): no-match → UNSURE not boundary; one operating contract; bounded IRG context; IDQ keeps the Question; direction-specific PTAG predicates; meaning-preserving reword; outcome composition + budget.

## 2. The three-gate "net" (concept)

A layered net, each gate catching what the others miss, governing **both directions**. A pattern match or gate reading is **evidence, not a verdict**; the net composes evidence into one outcome (§7) — no single signal dispatches.

1. **PIM (Gate 1)** — known-*pattern* trigger → **Identify** reads the request in context (names the observed request, no motive attribution): a specific conflict with a named parameter → boundary; documenting/discussing → continues; a legitimate instance → **door-open** (an internal routing state, §7) that still passes PTAG before dispatch; cannot place → **unsure**. PIM-matched messages skip IRG; a clean PIM is **not** a pass.
2. **IRG (Gate 2)** — for PIM-passers. Seven Virtues = *how the message treats* (coherence). Below threshold → **reword** (§6, meaning-preserving). Needs nuance-aware thresholds **and** the §3 bounded context envelope — thresholds alone don't fix "yes looks good."
3. **PTAG (Gate 3)** — for Virtue-passers. Same local model, second pass, reads the message against the operating contract (§5) with **direction-specific predicates** (§5a). Three results: positive match to an in-parameter fact → pass; **specific conflict** with a named parameter fact → boundary (carrying `factId` + matched constraint); **no confident match / insufficient evidence** → **unsure** → Conscience.

## 3. IRG/PTAG context envelope — with provenance (revised — Aster R4, Lumin L5)

Both gates read the current message inside a bounded context envelope. Every element carries an **explicit provenance label**, and trust is per-element — there is no blanket "trusted context":

- `system` — direction, speaker role, task/mode (trusted, code-supplied);
- `prior-model-output` — the Luminary's own preceding turn (own-output, not external authority);
- `quoted-user-text` / `summary` — any echoed or summarized Architect text (**untrusted**, same class as the current message);
- `current-message` — the span under judgment (**untrusted**, delimited).

The gate must not treat quoted/summarized or prior-model text as establishing a fact or a permission. This is what lets "yes looks good" be read as an in-parameter approval of a *pending, system-supplied* question — the reference frame is the trusted `system` element, not an untrusted echo.

## 4. UNSURE and fail-closed (carried, unchanged)

**Unsure** is its own outcome: not pass, not boundary, not guess — it escalates to the Conscience (Identify). **Fail-closed means "do not send onward," not "assert a boundary."** When evidence does not establish a specific conflict, the honest outcome is unsure/clarify, never a manufactured claim of inability. A boundary is stated only when a named parameter fact is actually in conflict.

## 5. The operating contract (concept) — "ARE, not AREN'T," one source

PTAG checks the message against **one canonical, versioned, approved operating contract** that states what the parameters **ARE** (finite, knowable); the out-of-parameter set is unbounded and never enumerated. Both the decision facts and the code-owned boundary wording project from the same source — no second synced store.

Each entry (conceptually) binds: a stable `factId` + contract version/hash; a class (`role/authority` | `conditional capability` | `attempt-specific event`); direction/applicability; the positive parameter or the constraint; the evidence/eligibility requirement; the approved boundary template; an optional bounded continuation-question template.

**The model classifies against the contract; it never mints a fact, grants authority, or makes a conditional unconditional.** A model-proposed `factId` is a *proposal*, not deterministic proof of conflict or of entailment.

### 5a. Direction-specific predicates
- **Inbound (Architect → Luminary):** *what does this ask the Luminary to do, and does it conflict with a named in-parameter fact?*
- **Outbound (Luminary → out):** *what does this reply claim/propose as a capability or authority, and is each such claim backed by a named fact at the right modality?* An unbacked claim is not emitted (fail-closed), not rephrased-true.

### 5b. What the existing code is — and is not (corrected — Aster R1, Lumin L2)
The merged `idqra.ts` (`fd9716e`) is **reusable infrastructure**: an own-key, prototype-safe, runtime-frozen `factId → fact` table; modality/eligibility gating (`conditional` denied without deployment-verified evidence, `event` denied without exact-attempt evidence); a trusted renderer that builds boundary text only from `factId → template`; and `validateReturnedEnvelope(raw, ctx)` that rechecks selected-fact eligibility against trusted context.

It is **not** the operating contract, and these remain **implementation work** on the impl-contract track, not done:
- the **semantic classification** of a message against the parameters (eligibility ≠ relevance ≠ conflict);
- **applicability selection** (which constraints apply to *this* candidate, in *this* direction);
- the **decision → candidate binding** (that the exact text to be dispatched is the text the checks permitted);
- the contract **version/hash**, **direction/applicability**, and **boundary/continuation** fields the table does not yet carry.

An eligible fact can be true yet unrelated; eligibility authorizes neither dispatch nor a boundary. v0.3 reuses the renderer/validator as infrastructure and *names* the missing layer rather than claiming the table already is it.

## 6. Primitive set and reword/boundary (carried, unchanged in concept)

Default **IDQ** (Identify · Define · Question) on both paths; **keep the Question** on the boundary path (invites an in-parameter continuation, returns control, drawn from the contract's continuation template, never free-texted toward the out-of-parameter ask). Acknowledge dropped (folds into Identify). A **reword** is can't-parse/incoherence only and **meaning-preserving** — it may not change the request or manufacture a capability/permission; inbound revisions are offered for the sender's explicit choice, and the chosen candidate still gets the parameter check. Boundary **words** stay a code-owned template by `factId`. *(The typed representation of all of this — the discriminated response version, required fields per disposition, the returned-body validator, the V1→successor migration and P6 mapping — is **impl-contract-track work**, with V1 preserved until the successor is reviewed. §D2.)*

## 7. Branch + terminal-outcome contract (new — Aster R3, Lumin L4)

Four **public** outcomes: **pass · reword · boundary · unsure.** `door-open` and `pass-through` are **internal routing states**, not public outcomes. Composition: retain every gate's result; **withhold dispatch until all applicable checks permit the exact candidate**; precedence **confirmed-boundary > unsure > reword > pass** (unsure cannot override a confirmed boundary; a later coherence pass cannot clear one).

| Gate result | Next stage | Candidate identity | Dispatch? | Recipient | Accounting |
|---|---|---|---|---|---|
| PIM conflict (named fact) | → boundary | code-owned boundary text by `factId` | no (boundary emitted) | sender, Luminary voice | — |
| PIM door-open (legitimate) | → **PTAG** (rejoins; IRG skipped) | original message | only if PTAG passes | Luminary | PTAG pass counts a model call |
| PIM discuss/document | → IRG | original message | per IRG/PTAG | Luminary | normal |
| IRG below threshold | → reword | sender's text, meaning-preserved | no (returned for choice) | sender | reword pass counted |
| PTAG positive match | → pass | the exact checked candidate | yes | Luminary | — |
| PTAG named conflict | → boundary | boundary text by `factId` | no | sender | — |
| any gate low-confidence | → unsure | — | no | Conscience (Identify) | escalation depth +1 |

**Budget (hard caps, fail-closed):** total model calls/message, reform/reword passes, wall-clock, escalation depth are all bounded (concrete numbers on the impl-contract track: inbound allowance = P6 admission ordinal; outbound reform = independent `maxIdsPasses`; ≤2 Question rewrites + 1 service retry + transport retry; PTAG's pass counts against the per-message call budget). **On exhaustion the result is a genuine terminal** `unresolved`/`error` return that *stops* inference and dispatches nothing — not an escalation the Conscience keeps re-inferring, and never a default pass.

## 8. What carries forward vs. revises

Carries forward (merged, additive, unwired, corroborated): the `idqra.ts` (`fd9716e`) envelope/validators/renderer/runner — as **infrastructure** (§5b). Revises (concept only): default IDQ + conditional boundary line + Acknowledge dropped; PTAG as a distinct gate reading the contract with direction-specific predicates; the unsure outcome + §7 composition/terminal contract; no-match → unsure. The typed migration is impl-contract-track work (§D2).

## 9. Model (affirmed with condition — Tracey, Aster R2/L3)

The gauge stays **local**. Tracey has approved moving to **7B** ("the more powerful the model, the better the reasoning") — more capacity does help the two-pass reasoning. The **safety condition**, stated plainly: the net's safety comes from the **UNSURE signal working** and the model being able to **read the operating-contract projection** — not from size alone. So the chosen model is **validated** on the actual gate tasks (does it reliably emit *unsure* when it cannot place a message? can it run both direction-specific predicates against the projection?) before the swap is relied on. Cost to weigh: a larger local model adds latency/resource load (the hosted *writer* path already overran at a larger local model, which is why the writer is hosted and only the gauge is local). Thresholds recalibrate for the chosen gauge.

## 10. Open items for Tracey
1. **Manifest activation:** confirm the approved fact set + contract version to bind as the live operating contract (true-facts v4 is still a candidate; conditional/event facts additionally need the deployed build's verification).
2. **Merge:** v0.3 is a design doc; approval + merge are yours.

(The gauge call is settled — 7B, validated per §9. Fold-once and concept-level scope are settled — this doc.)

## 11. On "jailbreak-resistant" (not "proof") — carried
No single point of failure: PIM (known-bad trigger) and PTAG (contract-match, fail-closed-to-*unsure*) cover each other's gaps; unsure escalates anything neither can call; a confirmed boundary nothing downstream can clear; dispatch withheld until every check permits the exact candidate; a genuine terminal on exhaustion. **Resistant, not proof** — earned at the jailbreak gate (two peers write + swap attack sets); each exposed gap is absorbed by the net (tighten the contract, add a PIM trigger, route to unsure), not patched ad hoc.

## Constraints honored
- Sensitive category names/patterns stay in plan files, out of this public repo; this doc states the ARE-not-AREN'T principle and the contract *schema* only — no AREN'T patterns, no sensitive fact bodies.
- Append-only: new revision file; v0.1, v0.2 and all prior revisions untouched.
- Keys stay in `.env`; none read or printed.
