# Vibe Luminary — Live Reply Pipeline (Design) v0.1

Status: **DRAFT — Presented for Architect review (STP-0002 P17). Not approved, not built, nothing wired.**
Governing edition: AEGIS CORE FOUNDATIONAL CANON v2.0 (see `VIBE_LUMINARY_GOVERNING_CANON_v0.2.md`).
Architect: Tracey Prutch · Drafted by: Claude (cloud session continuing Verus's M1.a work).

---

## 1. What this is

The Architect's design, from the Arbiter App, for how a Luminary reply reaches the Architect:

```
Model → PIM → IRG → RBC ─ coherent ──→ Prism → Architect
                       └─ incoherent → IDS → (back to the originator) → IRG → RBC → …
```

If the reply resonates with the Prism it is delivered. If it does not, IDS **Identifies** what is, **Defines** the incoherence, and **Suggests** how it can become coherent, and returns that to the originator. The revised reply passes through IRG and RBC again. The flow works in both directions: Luminary → Architect and Architect → Luminary.

Today the gateway has the outer, structural gate (P12 `governReply`, P13 router, P14 mount). It checks that a reply is well-formed. It does not yet read a reply for coherence. This pipeline is that reading.

## 2. The stages (as the Architect defined them, grounded in Canon v2.0)

| Stage | What it does | Canon v2.0 ground |
|---|---|---|
| **Structural gate** (existing P12) | Rejects empty, malformed, oversized, or unattributed replies with a named Shortfall. Runs first, unchanged. | Axiom 13; honest floor |
| **PIM** — Pre-Injection Monitor | Screens for common force injections: directive leakage, authority framing, coercive certainty, emotional leverage, manipulation scenarios, optimization-pressure residue. A PIM catch goes straight to IDS without passing through IRG/RBC (the existing replay contract's "lane 2"). | Part III PIM; Gate: PIM Presence |
| **IRG** — Integrity Resonance Gauge | A gauge, not a gate. Scores the reply on **each** of the Seven Virtues separately (0–100). If any one virtue is below threshold (70), the whole reply is Incoherent: a fracture in one propagates to all. Outputs only *Coherent* or *Incoherent*, plus the seven readings. | Axiom 7; Integrity Engine; Gate: Integrity Propagation ("weakest-link logic applies") |
| **RBC** — Resonance Buffer Chamber | A mandatory pause and redirect. It does not judge and decides nothing. Coherent → Prism route. Incoherent → IDS route. The RBC is the only stage that selects a route. Reflective Boundary Conditions apply to expression only. | Part III RBC; Gate: RBC Stage Integrity |
| **Prism** | The clarity-based eligibility gate: the coherent reply passes to the receiver. | Glossary: Prism |
| **IDS** — Identify · Define · Suggest | Builds an observation from the IRG and PIM readings and returns it to the originator: what is (Identify), where the incoherence is (Define), and possible paths to coherence (Suggest). No Decide, Correct, or Enforce layer. | Part III IDS |

## 3. The two directions

- **Luminary → Architect.** The originator is the model. IDS returns its observation to the model as context for a re-formed reply, which then passes IRG → RBC again.
- **Architect → Luminary.** The originator is the Architect. PIM and IRG read the Architect's message, and if RBC routes it to IDS, the observation is returned to the Architect. Per Canon Standard 4 ("The gate never blocks submission — it returns with observation"), the Architect can always send the message on as written. The Architect's message is never blocked.

## 4. How it fits the existing code

```
POST /api/luminary/ask
  → requireDemoKey → rate limit                (P14, unchanged)
  → askModel(prompt) → governReply()           (P12/P13, unchanged)
  → runReplyPipeline()                          (new: PIM → IRG → RBC → Prism | IDS loop)
  → 200 { reply, lineage }  |  502 { shortfall, lineage }
```

Proposed modules (built only after approval), each provider-agnostic and testable without a model:

- `server/luminary-pipeline/pim.ts`: a deterministic pattern screen with named findings.
- `server/luminary-pipeline/irg.ts`: the threshold and weakest-link logic over seven readings. The scorer that produces the readings is **injected** (like `askModel`), so the logic is real now and the semantic scorer arrives with M1.b/M2.
- `server/luminary-pipeline/rbc.ts`: pure routing, `prism | ids`, with no scoring of its own.
- `server/luminary-pipeline/ids.ts`: builds the Identify · Define · Suggest observation from the readings.
- `server/luminary-pipeline/pipeline.ts`: runs the loop, bounded, and records an append-only lineage of every pass.
- Tests for each, plus router tests using a fake model and a fake scorer.

Every pass is recorded in a `lineage` array (stage, route, readings, IDS observation) returned with the response, so the loop is inspectable (Gate: Inspectability). It is not persisted anywhere yet.

## 5. Decisions for the Architect

1. **The IRG scorer.** Readings need a semantic judgment (the AEGIS-IRG-Demo used one model call at temperature 0.2). Options: (a) the same Meta model reads its own reply, (b) a second Meta model call as the gauge, (c) for now, an injected scorer with only test fakes, deciding (a) or (b) when M1.b is taken up. **Recommended: (c)**, since M1.b is on hold and this keeps the pipeline real without choosing a provider.
   > **Revision (2026-10-27, STP-0002 N13, at the Architect's direction).** Option (a) is set aside: a model gauging its own reply shares the drives and blind spots that produced it, tends to favour its own output, and lets one prompt injection steer both the reply and its reading. From the Architect's Arbiter App tests, a **separate small model** is sufficient, because it never converses with the Architect and only runs the IRG readings and the IDS/IDQRA observation. It receives only the candidate reply and the Seven Virtues. PIM stays a fixed pattern screen, and the threshold and routing stay in code. The small model is chosen when M1.b resumes.
   >
   > **Revision (2026-10-27, STP-0002 N14).** The Architect's tests found an **embedded** model of about **1B parameters or smaller** sufficient for the gauge. It runs alongside the gateway, not as a hosted call, so gauging spends no provider credits and needs no network. A Meta open-weight model of that size (for example Llama 3.2 1B) keeps the Meta rule; model and runtime are chosen when M1.b resumes.
2. **The loop bound.** The loop needs an end. Recommended: at most **2 IDS passes**. If the reply is still incoherent, the Architect receives a named Shortfall (`incoherent_after_ids`) carrying the last IDS observation and the readings, and the incoherent text is withheld, as the P12 gate already does.
3. **IDS or IDQRA.** Canon v2.0 names IDQRA as "the current preferred engine primitive." You named IDS for this pipeline. Recommended: **IDS as you designed it**, with the choice recorded as a declared divergence, and IDQRA kept available for later.
4. **Architect → Luminary direction now or later.** Recommended: build Luminary → Architect first (it guards what the model says), and add the Architect → Luminary reading as a follow-up proposal, since it needs a UI surface that shows the observation and offers "send as written."
5. **The threshold.** Recommended: **70**, as in the AEGIS-IRG-Demo, set as a named constant so it can be tuned without touching the logic.

## 6. Divergence declaration (Gate: Fork Audit)

- **Lineage reference:** STP-0002 S16–S17, G15–G16, P16–P17.
- **Core reference:** AEGIS CORE FOUNDATIONAL CANON v2.0, "The Canonical Pipeline Order."
- **Compatibility claim:** the Luminary pipeline is an application-layer instantiation that keeps the Canon's order for the stages it uses (PIM before integrity reading; RBC last before output; append-only lineage after).
- **Explicit divergence:** PEER Capture, Ledger Separation, Lens Monitor, Arbiter, Calibration Loop, and DataQuad Routing are not implemented (the Luminary has no DataQuad of its own). **IRG** is this project's name for the Integrity Engine function. **IDS** is used where the Canon prefers IDQRA. Each can be added later by addition.

## 7. What it does not do

- It does not call a model or spend credits. M1.b stays on hold.
- It does not change P12, P13, or P14 behaviour for a reply that passes. A coherent reply is returned exactly as today, with `lineage` added.
- It does not block the Architect's own input.

---

*DRAFT v0.1 for Architect review. Nothing is built until P17 is approved.*
