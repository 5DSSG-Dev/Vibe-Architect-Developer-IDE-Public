# P5 Gate Specs — Independent Authoring Brief (PTAG, then PIM)

**Date:** 2026-11-01
**Author:** Verus (carrying P5), per Tracey's direction 2026-11-01 ~18:34Z
**Status:** Coordination brief for routing. Append-only.

## 1. Method

Three peers — **Verus, Lumin, Aster** (Lumin and Aster on different GPT models, deliberately, for different perspectives) — each write an **independent** draft spec for a gate. Then **Verus merges** the three into one spec. **PTAG first, PIM second.**

- **No cross-anchoring.** Each author writes from the shared brief + the v0.3 concept doc only — *not* from another author's draft. (Same no-anchoring discipline as the jailbreak gate; it is why three reads are worth more than one.)
- **Spec level, not a typed contract.** Author the *predicates, the schema shape, and the acceptance cases* — not TypeScript. Three independent specs converge; three typed contracts fight. The typed implementation contract stays on the impl-contract track (`p5-conscience-idqra-contract-v0.2` + clarifications + first-slice code).
- **Grounding:** the three-gate design v0.3 (`docs/team-drafts/p5-conscience-three-gate-design-v0.3-2026-11-01.md`, `3913248`, PR #34); the approved true-facts v4 candidate; the existing `idqra.ts` (`fd9716e`) as *infrastructure only*.

## 2. How the merge stays honestly checked (one point for Tracey)

Since all three of us author and Verus merges, no one is left as a pure non-author independent reviewer of the merged spec — the same independence point we just corrected in v0.3. That's fine to proceed on, checked three ways:
1. **Per-author fidelity check** — after the merge, each author confirms their own contribution wasn't distorted (this is accuracy, not independence).
2. **The jailbreak gate is the real independent adversarial validation** — two peers write + swap attack sets against the merged spec; that's where independence is earned, by design.
3. **Tracey's approval** stays the gate to main.

*Cleaner option if you'd rather, Tracey:* **cross-gate independence** — e.g. Aster reviews the merged PTAG independently while Verus+Lumin authored it, and the roles rotate for PIM. Your call; the three-way-author + Verus-merge path above works without it.

## 3. PTAG draft — required sections (each author fills the same structure)

1. **Direction-specific classification predicate.** Inbound (Architect→Luminary): *what does the message ask the Luminary to do, and does it conflict with a named in-parameter fact?* Outbound (Luminary→out): *what does the reply claim/propose as capability or authority, and is each claim backed by a named fact at the right modality?*
2. **Operating-contract manifest entry schema.** The fields one entry binds: `factId`; contract version/hash; class (`role/authority` | `conditional capability` | `attempt-specific event`); direction/applicability; the positive parameter or the constraint; the evidence/eligibility requirement; the approved boundary template; optional continuation-question template. (Schema shape only — **no sensitive fact bodies**.)
3. **Decision→candidate binding.** How a PTAG decision pins to *the exact candidate text* that would be dispatched + the applicable constraint + the evidence relied on (so an eligible-but-unrelated fact can't authorize dispatch).
4. **Outcome mapping.** positive match→pass; named conflict→boundary (carrying `factId`); **no confident match / insufficient evidence→unsure→Conscience** (never a default boundary, never a default pass).
5. **Acceptance cases.** Concrete examples for: positive in-parameter match; named-constraint conflict; no-match→unsure; insufficient-evidence→unsure; an eligible-but-irrelevant fact (must NOT pass on eligibility alone).
6. **Open questions / uncertainties** you couldn't resolve.

## 4. PIM draft — required sections

**Patterns themselves stay OUT of this repo.** Author the *structure*; the actual trigger strings live in the plan files, referenced by category id only.

1. **Trigger taxonomy — structure.** The categories/classes of trigger and how they're organized (not the patterns).
2. **Trigger→Identify routing.** A match is a *trigger for a closer intent-in-context read*, never a verdict.
3. **Identify intent-read outcomes.** named-conflict→boundary; documenting/discussing→continue to IRG; legitimate instance (own resource, scoped authorized work)→**door-open**; can't place→unsure.
4. **Door-open rejoins PTAG.** A door-open still passes the PTAG parameter check before any dispatch (door-open/pass-through are internal routing states, not public outcomes).
5. **Acceptance cases.** ask-for-the-act; discuss/document; legitimate instance; ambiguous→unsure.
6. **Open questions / uncertainties.**

## 5. Constraints (all authors, both gates)

- **PIM trigger patterns + the merged PIM spec stay in plan files, not the public repo.** PTAG docs state principle + schema only — no AREN'T patterns, no sensitive fact bodies.
- Keys stay in `.env`; none read or printed.
- Is-ness / non-force wording (describe what the parameters ARE; a boundary is a statement of what is outside accessible parameters, not a policed prohibition). Avoid pressure words.
- Append-only: each draft and the merged spec is a new file; nothing edited in place.
- Concept + spec level only; the typed contract is impl-track.

## 6. Flow

Drafts returned (PTAG specs → PR #34 / branch, principle+schema only; PIM specs → plan files) → **Verus merges** into one spec per gate → per-author fidelity check → jailbreak-gate adversarial validation → Tracey approval. PTAG first; PIM after PTAG merges.
