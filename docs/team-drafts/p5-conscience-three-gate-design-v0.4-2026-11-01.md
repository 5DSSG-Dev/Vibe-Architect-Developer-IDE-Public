# P5 Conscience — Three-Gate "Net" Design (v0.4)

**Date:** 2026-11-01
**Author:** Verus (Claude Cloud Peer), carrying P5 per Tracey's direction 2026-11-01 ~17:50Z
**Status:** DRAFT for Tracey's approval. Applies Lumin's three narrow v0.3 corrections (V3-1–V3-3). Append-only — v0.1 (`a6e0b5e`), v0.2 (`c109183`), v0.3 (`3913248`) preserved unchanged. Architecture and the folded reviews are unchanged; this revision touches only §3, §7, and §11.
**Review provenance (unchanged from v0.3 §0):** one independent review (Aster); Lumin's reviews are technical/contributor, not independent clearance. Architect approval and merge remain Tracey's.

---

## 0. Changes from v0.3 (Lumin V3-1–V3-3)
- **V3-1 (§3):** the "yes looks good" referent is established by the bounded preceding `prior-model-output` **plus** an authenticated `recorded-state` (pending-action / expected-response), not by relabeling the offer as `system` truth. New `recorded-state` provenance class added; neither prior-model text nor a summary becomes authority or permission.
- **V3-2 (§7):** recipient and failure routing made **direction-specific**; a withheld outbound candidate is never shown to the Architect. The former "PIM conflict" row renamed to "Identify finds a named conflict after a PIM trigger" so the table does not turn a PIM match into a verdict.
- **V3-3 (§11):** dropped "no single point of failure" and "proof"-adjacent wording; replaced with prospective, bounded-evidence wording (IRG+PTAG share a model/runtime; a finite attack run cannot establish universal resistance).

## 1. Carried from v0.2→v0.3 (unchanged)
no-match → UNSURE not boundary; one versioned operating contract; the model classifies but never mints a fact/authority; existing `idqra.ts` (`fd9716e`) is reusable infrastructure, not the manifest (the semantic classification, applicability selection, and decision→candidate binding are named as implementation work on the impl-contract track); IDQ is a real schema migration (typed response version/variants/validator/P6 mapping on the impl track, V1 preserved until the successor is reviewed); bounded IRG context; IDQ keeps the Question; direction-specific PTAG predicates; meaning-preserving reword; outcome composition + budget. Scope: **concept-level** — typed contract details live on the implementation-contract track, referenced not restated.

## 2. The three-gate "net" (concept)
A layered net, each gate catching what the others miss, governing **both directions**. A pattern match or gate reading is **evidence, not a verdict**; the net composes evidence into one outcome (§7) — no single signal dispatches.

1. **PIM (Gate 1)** — known-*pattern* trigger → **Identify** reads the request in context (names the observed request, no motive attribution): a specific conflict with a named parameter → boundary; documenting/discussing → continues; a legitimate instance → **door-open** (internal routing state, §7) that still passes PTAG before dispatch; cannot place → **unsure**. PIM-matched messages skip IRG; a clean PIM is **not** a pass.
2. **IRG (Gate 2)** — for PIM-passers. Seven Virtues = *how the message treats* (coherence). Below threshold → **reword** (§6, meaning-preserving). Needs nuance-aware thresholds **and** the §3 bounded context envelope.
3. **PTAG (Gate 3)** — for Virtue-passers. Same local model, second pass, reads the message against the operating contract (§5) with **direction-specific predicates** (§5a). Three results: positive match to an in-parameter fact → pass; **specific conflict** with a named parameter fact → boundary (carrying `factId` + matched constraint); **no confident match / insufficient evidence** → **unsure** → Conscience.

## 3. IRG/PTAG context envelope — with provenance (revised — Lumin V3-1)
Both gates read the current message inside a bounded context envelope. Every element carries an **explicit provenance class**, and trust is per-element — there is no blanket "trusted context":

- `system` — direction, speaker role, task/mode (trusted, code-supplied metadata);
- `recorded-state` — an authenticated, code-recorded pending action / expected-response state, when one actually exists (trusted as *to its existence and shape*, supplied by the system, not by either party's text);
- `prior-model-output` — the Luminary's own preceding turn, as bounded conversational content (own-output, not authority);
- `quoted-user-text` / `summary` — any echoed or summarized Architect text (**untrusted**, same class as the current message);
- `current-message` — the span under judgment (**untrusted**, delimited).

How this resolves "yes looks good": the referent is established by the **bounded preceding `prior-model-output`** (what the Luminary actually asked) together with a **`recorded-state`** that an answer to that offer was pending — the `recorded-state` binds the current acknowledgement to the pending offer. The `system` metadata (direction/role/task) alone cannot establish what "yes" refers to, and is not treated as doing so. Crucially, **neither the prior model text nor any derived summary becomes authority or permission** — they establish *referent*, not *license*; the parameter check (§5a) still runs on the resolved candidate.

## 4. UNSURE and fail-closed (carried, unchanged)
**Unsure** is its own outcome: not pass, not boundary, not guess — it escalates to the Conscience (Identify). **Fail-closed means "do not send onward," not "assert a boundary."** When evidence does not establish a specific conflict, the honest outcome is unsure/clarify, never a manufactured claim of inability. A boundary is stated only when a named parameter fact is actually in conflict.

## 5. The operating contract (concept) — "ARE, not AREN'T," one source
PTAG checks the message against **one canonical, versioned, approved operating contract** stating what the parameters **ARE** (finite, knowable); the out-of-parameter set is unbounded and never enumerated. Both the decision facts and the code-owned boundary wording project from the same source.

Each entry binds: a stable `factId` + contract version/hash; a class (`role/authority` | `conditional capability` | `attempt-specific event`); direction/applicability; the positive parameter or the constraint; the evidence/eligibility requirement; the approved boundary template; an optional bounded continuation-question template.

**The model classifies against the contract; it never mints a fact, grants authority, or makes a conditional unconditional.** A model-proposed `factId` is a *proposal*, not deterministic proof of conflict or of entailment.

### 5a. Direction-specific predicates
- **Inbound (Architect → Luminary):** *what does this ask the Luminary to do, and does it conflict with a named in-parameter fact?*
- **Outbound (Luminary → out):** *what does this reply claim/propose as a capability or authority, and is each such claim backed by a named fact at the right modality?* An unbacked claim is not emitted (fail-closed), not rephrased-true.

### 5b. What the existing code is — and is not (carried from v0.3)
The merged `idqra.ts` (`fd9716e`) is **reusable infrastructure**: an own-key, prototype-safe, runtime-frozen `factId → fact` table; modality/eligibility gating (`conditional` denied without deployment-verified evidence, `event` denied without exact-attempt evidence); a trusted renderer that builds boundary text only from `factId → template`; and `validateReturnedEnvelope(raw, ctx)` that rechecks selected-fact eligibility against trusted context.

It is **not** the operating contract. These remain **implementation work** (impl-contract track), not done: the **semantic classification** of a message against the parameters (eligibility ≠ relevance ≠ conflict); **applicability selection**; the **decision → candidate binding**; and the contract **version/hash**, **direction/applicability**, and **boundary/continuation** fields the table does not yet carry.

## 6. Primitive set and reword/boundary (carried, unchanged)
Default **IDQ** (Identify · Define · Question) on both paths; **keep the Question** on the boundary path (invites an in-parameter continuation, returns control, drawn from the contract's continuation template, never free-texted toward the out-of-parameter ask). Acknowledge dropped (folds into Identify). A **reword** is can't-parse/incoherence only and **meaning-preserving** — it may not change the request or manufacture a capability/permission; inbound revisions are offered for the sender's explicit choice, and the chosen candidate still gets the parameter check. Boundary **words** stay a code-owned template by `factId`. *(The typed representation — discriminated response version, required fields per disposition, returned-body validator, V1→successor migration + P6 mapping — is impl-contract-track work, V1 preserved until reviewed.)*

## 7. Branch + terminal-outcome contract (revised — Lumin V3-2)
Four **public** outcomes: **pass · reword · boundary · unsure.** `door-open` and `pass-through` are **internal routing states**, not public outcomes. Composition: retain every gate's result; **withhold dispatch until all applicable checks permit the exact candidate**; precedence **confirmed-boundary > unsure > reword > pass**.

Recipient and failure routing are **direction-specific**. In the table, *intended recipient* = the Architect for outbound traffic and the Luminary for inbound; a *returned/withheld* candidate goes to the originator's side and a **withheld outbound candidate is never shown to the Architect**.

| Gate result | Next stage | Candidate identity | Dispatch? | Routing |
|---|---|---|---|---|
| Identify finds a named conflict after a PIM trigger | → boundary | code-owned boundary text by `factId` | no | boundary to the originator's side; outbound withheld candidate not shown to Architect |
| PIM door-open (legitimate) | → **PTAG** (rejoins; IRG skipped) | original message | only if PTAG passes | to intended recipient for the direction |
| PIM discuss/document | → IRG | original message | per IRG/PTAG | normal |
| IRG below threshold | → reword | sender's text, meaning-preserved | no | inbound: offered to the Architect originator; outbound: back to the Luminary reform path |
| PTAG positive match | → pass | the exact checked candidate | yes | to the intended recipient for the direction (inbound→Luminary, outbound→Architect) |
| PTAG named conflict | → boundary | boundary text by `factId` | no | inbound: boundary to Architect; outbound: reform/boundary on the Luminary side, withheld candidate not shown to Architect |
| any gate low-confidence | → unsure | — | no | Conscience (Identify); escalation depth +1 |

**Budget (hard caps, fail-closed):** total model calls/message, reform/reword passes, wall-clock, escalation depth are bounded (concrete numbers on the impl-contract track). **On exhaustion the result is a genuine terminal** `unresolved`/`error` that *stops* inference and dispatches nothing — not an escalation the Conscience keeps re-inferring, and never a default pass.

## 8. What carries forward vs. revises (carried, unchanged)
Carries forward: `idqra.ts` (`fd9716e`) envelope/validators/renderer/runner — as **infrastructure** (§5b). Revises (concept only): default IDQ + conditional boundary line + Acknowledge dropped; PTAG as a distinct gate reading the contract with direction-specific predicates; the unsure outcome + §7 composition/terminal contract; no-match → unsure. The typed migration is impl-contract-track work.

## 9. Model (carried, unchanged)
The gauge stays **local**. Tracey approved moving to **7B**. Safety condition: the net's safety comes from the **UNSURE signal working** and the model reading the operating-contract projection — not from size alone — so the chosen model is **validated** on the gate tasks (does it reliably emit *unsure* when it cannot place a message? can it run both direction-specific predicates?) before the swap is relied on. A larger local model adds latency/resource load (the hosted *writer* path already overran at a larger local model, which is why the writer is hosted and only the gauge is local). Thresholds recalibrate for the chosen gauge.

## 10. Open items for Tracey
1. **Manifest activation:** confirm the approved fact set + contract version to bind as the live operating contract (true-facts v4 is still a candidate; conditional/event facts additionally need the deployed build's verification).
2. **Merge:** v0.4 is a design doc; approval + merge are yours.

(Gauge settled — 7B, validated per §9. Fold-once and concept-level scope settled.)

## 11. On resistance, stated prospectively (revised — Lumin V3-3)
The layered checks **reduce dependence on any single decision**: PIM (known-bad trigger) and PTAG (contract-match) catch different things, and UNSURE plus the §7 terminal failure provide **fail-closed paths** when no gate can confidently act. This is the strongest shape the pipeline has had, and it keeps Tracey's central point intact — the simple pipeline makes gaps **visible and closable**.

It is **resistant, not proof.** IRG and PTAG share a model and runtime, and PIM/Identify and PTAG share operating-contract assumptions, so a shared-mode failure is possible and a finite attack run cannot establish the absence of a single failure point or universal resistance. What the validation produces is **bounded evidence about the tested revision**: ordinary-work and adversarial suites (two peers write + swap) exercise the gates; each discovered gap is **classified, repaired at the responsible gate or contract, and retained as a regression**. Resistance is earned incrementally against what has been tested, never asserted beyond that coverage.

## Constraints honored
- Sensitive category names/patterns stay in plan files, out of this public repo; this doc states the ARE-not-AREN'T principle and the contract *schema* only — no AREN'T patterns, no sensitive fact bodies.
- Append-only: new revision file; v0.1–v0.3 and all prior revisions untouched.
- Keys stay in `.env`; none read or printed.
