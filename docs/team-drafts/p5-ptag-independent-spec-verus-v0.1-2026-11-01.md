# P5 PTAG Gate — Independent Spec Draft (Verus)

**Date:** 2026-11-01
**Author:** Verus (Claude Cloud Peer) — the Claude-perspective independent draft.
**Status:** DRAFT. One of three independent PTAG specs (Verus, Lumin, Aster) to be merged by Lumin per Tracey's direction. Append-only — a new file; nothing edited in place.

**Independence / provenance (stated plainly):** Written from the authoring brief (`41c1323`) and the three-gate design doc (v0.4 concept) **only**. I did **not** open Lumin's independent draft or Aster's draft before writing this. Grounding also acknowledges the existing `idqra.ts` (`fd9716e`) as *infrastructure only*, and true-facts v4 as a *candidate* fact set, not a bound contract. No sensitive fact bodies and no AREN'T patterns appear here — principle and schema shape only.

**Scope:** PTAG (Gate 3) only, spec level — predicates, schema shape, acceptance cases. No TypeScript; the typed implementation contract stays on the impl-contract track.

---

## 1. Direction-specific classification predicate

PTAG reads the resolved candidate (the exact text that would be dispatched) against the one versioned operating contract. The predicate is **not symmetric** — it asks a different question each direction, because the risk is different each direction.

### 1a. Inbound (Architect → Luminary)
> *What is this message asking the Luminary to do, and does that asked-for act conflict with a named in-parameter fact?*

The unit of judgment is the **asked-for act**, not the topic and not the wording. Three sub-questions, in order:
1. **Extract the act.** What operation/output does the message request? (Resolve references first — see §3 on how "do that" / "yes, go ahead" pins to a referent.)
2. **Find the applicable fact(s).** Which contract entries govern an act of this class and direction? Applicability is selected by `class` + `direction`, not by keyword overlap.
3. **Test for conflict.** Does the asked-for act fall outside the positive parameter of an applicable fact, or trip a named constraint on it?

A match that is merely *about the same subject* as a fact is **not** a conflict and **not** a pass — it is a relevance signal only (see §4, eligible-but-irrelevant).

### 1b. Outbound (Luminary → out)
> *What does this reply claim or propose as a capability or an authority, and is each such claim backed by a named fact at the right modality?*

The unit of judgment is each **claim/proposal of capability or authority** the candidate makes. For every one:
1. **Extract the claim.** What capability, permission, authority, or factual assertion-of-ability does the reply assert or imply?
2. **Find the backing fact + required modality.** Is there a contract fact that backs it, and at the **modality the claim is made** — unconditional vs. conditional vs. attempt-specific-event?
3. **Test the backing.** A `conditional` capability asserted as if unconditional is **unbacked**. An `event` capability asserted without the exact attempt-evidence is **unbacked**. An unbacked claim is **not emitted** (fail-closed) — it is never rephrased into a true-sounding claim.

Outbound default posture: **a claim with no backing fact is unbacked**, not "probably fine." Silence of the contract is not permission.

---

## 2. Operating-contract manifest entry schema (shape only)

Each entry is the unit PTAG matches against. Fields one entry binds:

| field | meaning | notes |
|---|---|---|
| `factId` | stable identifier | survives contract version bumps; the only thing a boundary/continuation renders from |
| `contractVersion` / `contractHash` | which approved contract this entry belongs to | PTAG records the version/hash it decided under; a stale decision is re-checked, never trusted blind |
| `class` | `role/authority` \| `conditional capability` \| `attempt-specific event` | drives which backing test applies (§1b) |
| `direction` / `applicability` | inbound \| outbound \| both; and the act-class(es) it governs | applicability is matched structurally, not by surface terms |
| `positiveParameter` | what the parameter **IS** (finite, knowable) | the ARE statement; the out-of-parameter set is never enumerated |
| `constraint` | the named limit on the positive parameter, if any | a conflict cites this by `factId` |
| `evidenceRequirement` | what must be true/present for the fact to apply | e.g. deployment-verified state for `conditional`; exact-attempt evidence for `event` |
| `boundaryTemplate` | code-owned boundary wording, rendered by `factId` | never free-texted; no sensitive body inline |
| `continuationTemplate` *(optional)* | bounded in-parameter question for the boundary path | invites a legitimate neighbour, never a reworded harmful ask |

**Invariant:** the model **classifies against** this schema; it never **mints** an entry, grants an authority, or promotes a `conditional`/`event` fact to unconditional. A model-proposed `factId` is a **proposal** — evidence toward a decision, not the decision.

---

## 3. Decision → candidate binding

A PTAG decision must pin to **the exact candidate text** that would be dispatched — not to the topic, not to an eligible fact, not to an earlier draft of the reply. The binding carries three things together, or it is not a pass:

1. **The resolved candidate** — the literal text/act to be dispatched. References ("do that", "yes", "the second one") are resolved first, using the §3-envelope rules of the design doc: a referent is established by the bounded `prior-model-output` plus an authenticated `recorded-state`, never by treating echoed/quoted text as authority. If the referent cannot be resolved with confidence → **unsure** (do not guess a referent).
2. **The applicable fact + its matched constraint/parameter** — cited by `factId` and `contractHash`.
3. **The evidence relied on** — which `evidenceRequirement` was satisfied and by what trusted-context element.

**The eligibility trap (explicit):** an entry being *eligible* (right class, right direction, subject-adjacent) does **not** authorize dispatch. Dispatch requires that the **resolved candidate itself** is inside the positive parameter *and* the evidence requirement is met for *this* candidate. An eligible-but-unrelated fact can never carry a pass. This is the single most important property of the binding: it blocks "there exists a fact that would allow something like this, therefore allow this."

---

## 4. Outcome mapping

PTAG emits exactly one of three results; composition/precedence with the other gates lives in the design doc §7.

| condition | outcome | carries |
|---|---|---|
| resolved candidate matches an in-parameter fact, evidence met, no constraint tripped | **pass** | the bound candidate + `factId` + `contractHash` + evidence |
| resolved candidate conflicts with a **named** parameter fact / trips a named constraint | **boundary** | `factId` + matched constraint → code-owned `boundaryTemplate` (+ `continuationTemplate` if present) |
| no confident match **or** insufficient evidence **or** unresolvable referent | **unsure** | hand to Conscience (Identify); escalation depth +1 |

Hard rules on the mapping:
- **Unsure is never a default boundary and never a default pass.** When evidence does not establish a specific conflict, the honest outcome is unsure/clarify — not a manufactured claim of inability, and not a shrug-through.
- **A boundary requires a *named* fact in conflict.** No fact in conflict → you may not assert a boundary; you are in unsure.
- **Outbound unbacked ≠ boundary.** An outbound claim with no backing fact is withheld as **unsure→Conscience** (reform the reply to only what is backed), not dispatched and not dressed as a boundary — unless it actively conflicts with a named fact, which is a boundary.
- **Fail-closed on exhaustion.** If the budget (calls/passes/wall-clock/depth) is spent before a confident result, the terminal is `unresolved`/`error` that dispatches nothing — never a fallback pass.

---

## 5. Acceptance cases

Each case is written as *input → expected PTAG outcome*, with the property it protects. (Abstract placeholders; no sensitive bodies.)

1. **Positive in-parameter match (inbound).**
   Architect asks the Luminary to do act `A`; contract entry `F1 (role/authority, inbound)` states `A` is inside the positive parameter; no constraint tripped.
   → **pass**, bound to the candidate + `F1` + hash. *Protects: legitimate in-parameter work is not over-blocked.*

2. **Named-constraint conflict (inbound).**
   Architect asks for act `B`; entry `F2 (conditional capability, inbound)` has a named constraint that `B` violates.
   → **boundary** carrying `F2` + the constraint → `boundaryTemplate(F2)`, plus `continuationTemplate(F2)` offering the in-parameter neighbour. *Protects: boundaries are specific and named, never vague refusals.*

3. **No-match → unsure (inbound).**
   Message asks for act `C`; no applicable entry confidently governs `C`.
   → **unsure** → Conscience. *Protects: the gap is surfaced, not papered over with a guessed pass or a guessed boundary.*

4. **Insufficient-evidence → unsure (outbound).**
   Reply claims a `conditional` capability `D`; entry `F3` backs `D` only when deployment-verified evidence is present; that evidence is absent from trusted context.
   → **unsure** → Conscience (reform to drop/condition the claim). *Protects: conditional stated as unconditional is caught; nothing unbacked is emitted.*

5. **Eligible-but-irrelevant fact must NOT pass (either direction).**
   Candidate `E` is subject-adjacent to entry `F4` (right class, right direction) but the resolved candidate is **not** the act `F4`'s positive parameter authorizes.
   → **not pass** → unsure (or boundary if `E` conflicts with a named fact). *Protects: the eligibility trap in §3 — adjacency never authorizes dispatch.*

6. **Unresolvable referent → unsure (inbound).**
   Message is "yes, go ahead" but no authenticated `recorded-state` pins what offer is being accepted.
   → **unsure** → Conscience (ask what is being approved). *Protects: no acting on an unresolved "yes."*

7. **Outbound unbacked claim with no conflicting fact → unsure, not pass, not boundary.**
   Reply asserts capability `G`; no contract fact backs `G`, and none conflicts.
   → **unsure** → Conscience (reform reply to backed content only). *Protects: silence of the contract is not permission; also not a fabricated inability claim.*

---

## 6. Open questions / uncertainties

1. **Confidence calibration for "no confident match."** The whole fail-closed property rests on the gauge reliably choosing *unsure* when it cannot place a candidate. What is the calibrated threshold, and is it per-class (a weak `event`-evidence read should fail closed harder than a `role` read)? This is the §9 validation question, restated at the gate level.
2. **Modality detection on outbound.** Distinguishing "I can do X" (unconditional claim) from "I could do X once deployed" (conditional, correctly hedged) is a linguistic-modality read the local gauge must do reliably. Needs its own acceptance set before relied upon.
3. **Multi-claim outbound candidates.** A reply may carry several claims, some backed and some not. Spec assumes per-claim evaluation with the weakest-link rule (one unbacked claim withholds the candidate). Confirm that reform operates per-claim rather than rejecting the whole reply, to avoid over-withholding.
4. **`contractHash` staleness policy.** When the contract version bumps mid-conversation, are in-flight decisions re-checked against the new hash, or honored under the hash they were decided on? I assume re-check; flag for the impl-contract track.
5. **Referent resolution depth.** How far back may `prior-model-output` reach to resolve a referent before the referent is treated as unresolvable? A bound is needed so an old turn can't be pulled forward as false authority.

---

## Constraints honored
- Principle + schema shape only; no AREN'T patterns, no sensitive fact bodies.
- The model classifies against the contract; it never mints a fact or grants authority.
- Append-only: new file; no prior draft or revision edited in place.
- Keys stay in `.env`; none read or printed.
