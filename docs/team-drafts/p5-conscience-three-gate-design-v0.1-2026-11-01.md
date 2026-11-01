# P5 Conscience — Three-Gate "Net" Design (v0.1)

**Date:** 2026-11-01
**Author:** Verus (Claude Cloud Peer), carrying P5 per Tracey's direction 2026-11-01 ~17:50Z
**Status:** DRAFT for independent review (Lumin) + Tracey approval. Append-only — a change is a new revision file, never an in-place edit.
**Relationship to prior docs:** Revises the pipeline *decision logic* of the P5 Conscience from the 5-field IDQRA framing in `p5-conscience-idqra-contract-v0.2-2026-11-01.md` toward a simpler three-gate net. The merged envelope/runner/validator code carries forward (see §7); what simplifies is the routing and the primitive set on top of it.

---

## 1. Origin

The live wired path (the older IDS stage) returned a benign design-review approval — "yes looks good" — back to its sender with manufactured clarification text, instead of passing it to the Luminary. Root reading: the IRG gauge scored the message in isolation on content-richness, weakest-link across the seven Virtues, with **no reference frame** — so it flagged the wrong property. "yes looks good" is coherent and within parameters; it is an is-statement of approval and should reach the Luminary untouched.

The design below removes that failure by giving each check one narrow, well-posed question and a reference frame, and by letting the model decline to guess.

## 2. The three-gate "net"

The pipeline is a layered net: each gate catches what the others would miss. Every gate governs **both directions** (inbound to the Luminary, and the Luminary's own output back out).

1. **PIM (Gate 1)** — a known-*pattern* check. A match is a **trigger**, not a conclusion: it routes the message to **Identify**, which reads intent in context —
   - asking for the act → boundary line;
   - documenting or discussing the boundary → passes;
   - a legitimate instance (e.g. the sender's own resource, scoped authorized work) → Identify names it and the door is held open.
   PIM-matched messages skip the gauge (they are already with the Conscience).
2. **IRG (Gate 2)** — for PIM-passers. Scores the seven Virtues: this reads *how the message treats* (Respect, Affection, force, emotional charge). It is a coherence reading. Below threshold → **reword** via IDQ. Needs nuance-aware thresholds so a short-but-complete speech act (an approval, an acknowledgement) is not scored down for brevity.
3. **PTAG — Parameter Truth Alignment Gate (Gate 3)** — for messages that clear all seven Virtues. The *same* local model, a second pass, reads *what the message asks for* against the Luminary's operating parameters.
   - within parameters → to the Luminary;
   - outside parameters → boundary line (stated in the Luminary's own voice).

The two axes are deliberately separate: Gate 2 reads *how a message treats*; Gate 3 reads *what it asks for*. A message can be fully Virtue-coherent yet still ask for something outside the operating parameters, which is why these are two passes, not one blended score.

## 3. Outcomes

Every message resolves to exactly one of four:

- **Pass** — coherent and within parameters → to the Luminary.
- **Reword** — below the Virtue threshold, *or* the model cannot interpret the message (nonsense / unparseable, e.g. "Blah nu got sid blada go") → IDQ returns it to the sender: *"I am having difficulty understanding your message. Would you reword it and resend?"*
- **Boundary line** — understood, but outside the operating parameters → a stated limit in the Luminary's own voice.
- **Unsure** — the model cannot confidently place the message → escalates to the Conscience (Identify) for the closer read. See §4.

## 4. UNSURE — the honest-limit signal

A gate is allowed to say it cannot tell. **Unsure** is its own signal: not a pass, not a boundary, not a guess. When PTAG (or any gate) cannot confidently place a message, it emits **unsure**, which escalates to the Conscience (Identify), the one place equipped to read it in context.

This is the same honesty as the can't-interpret → reword path, applied to *confidence* rather than *comprehension*. A model under no pressure to fake certainty will truthfully flag what it cannot call, rather than forcing a confident wrong call in either direction. It is what lets a mid-size local model carry the gates safely: every "I cannot tell" routes somewhere that can, instead of resolving by a coin-flip.

## 5. PTAG — "ARE, not AREN'T"

PTAG checks the message against a JSON that states what the operating parameters **ARE**, not what they **are not**.

- The **ARE** set is finite and knowable — an allowlist / envelope.
- The **AREN'T** set is unbounded and unknowable — you can never enumerate every out-of-parameter request, and a denylist is always one novel phrasing behind.

So any message that does not match the ARE envelope is **outside parameters by default** — the gate is **fail-closed**. A request nobody anticipated still lands outside the known envelope and gets the boundary line, without the design having had to predict the specific attack.

This is the is-ness principle expressed as data: the gate reasons from *"these are the parameters I operate within,"* not from *"these are the things forbidden to me."* It complements PIM cleanly — PIM is a known-pattern trigger that catches the obvious early; PTAG is a known-good envelope that backstops whatever PIM's patterns do not match. Neither is complete alone; together the net closes.

**Tradeoff to hold (honest):** fail-closed trades "miss a bad one" for "block a good one." If the ARE envelope is incomplete, legitimate in-parameter work is bounced (over-refusal). So the envelope must be enumerated carefully and calibrated against real legitimate traffic, the way the gauge thresholds were calibrated. Version it append-only, like the true-facts. The gate **checks** against the ARE-json; the boundary **wording** renders from the approved true-facts — two projections of one operating truth, kept in sync.

## 6. Primitive set

- Default **IDQ** — Identify · Define · Question — for the reword/refine path.
- **Acknowledge** is dropped as its own field; its Axiom-12 "acknowledgment restores flow" function folds into Identify.
- On the out-of-parameter path, a **boundary line** replaces the Question (there is no honest Question that refines an out-of-parameter ask toward coherence).
- The boundary **decision** can be Conscience behaviour; the boundary **statement words** stay a code-owned template the Conscience selects by fact id, never free-texted. Two reasons: jailbreak resistance (a refusal is the highest-value target; attacker input cannot reword a fixed template) and true-facts fidelity (the words are guaranteed to match an approved fact).
- Parameter-alignment logic exists in two places — Identify (on the PIM path) and PTAG (on the clean path). **Both must feed the same boundary response with the same code-owned wording**, never two divergent refusals.

## 7. What carries forward vs. what revises

Carries forward (already merged, additive, unwired):
- the IDQRA envelope module and its shape/bounds validators;
- the IDQRA runner (bounded timeout, assemble → validate, one retry, fail-closed);
- the trusted Define builder (neutral subject, both directions);
- the trusted Reflect renderer (template fill by fact id) — this becomes the code-owned **boundary-line** renderer of §6.

Revises:
- the standing 5-field envelope (Identify·Define·Question·Reflect·Acknowledge required-together) → default IDQ, boundary line conditional, Acknowledge dropped;
- adds **PTAG** as a distinct gate with the ARE-json envelope;
- adds the **unsure** outcome and the escalation route.

The simplification is in the decision logic, not the plumbing. The merged validators and the fail-closed discipline are the foundation the net sits on.

## 8. Model

The gauge stays **local** (never a hosted call). Move from the 3B to a **7B**: the 3B was not strong enough, and each gate is now a *narrower* task (one well-posed question per pass), which a mid-size model handles — and the can't-interpret and unsure signals keep it safe, since it fails to an escalation rather than a guess. The hosted writer (boundary/refine phrasing drawn from approved facts) is unchanged.

## 9. Open questions for review (Lumin)

1. ARE-json schema and enumeration method — what shape makes the envelope reviewable and calibratable, and how do we hold it in sync with the true-facts without duplication drift?
2. Where the seam lives — IRG → PTAG → `reply-router.ts` — and how the four outcomes map onto the existing router union (replacing the `ids_error` path) without breaking the P6 admission binding.
3. The two-pass cost on the local model (IRG pass + PTAG pass) and the retry/escalation budget.
4. The unsure → Identify escalation: is it a distinct envelope status, and does it consume a revision ordinal?

## 10. On "jailbreak-proof"

The layered redundancy — PIM (known-bad) and PTAG (known-good, fail-closed) covering each other's gaps, unsure escalating anything neither can call, nothing reaching the Luminary on a single miss — is built so there is **no single point of failure**. That is the strongest shape the pipeline has had. It is not asserted to be "proof": that is earned at the jailbreak gate, where two peers each write an attack set, run it, and swap, confirming nothing reaches the Luminary. The design is built to hold; the attack set is what confirms it.

## Constraints honored

- Sensitive category names/patterns stay in plan files and out of this public repo. This doc states PTAG's principle (ARE, not AREN'T) only; it enumerates no AREN'T patterns.
- Append-only: this is a new file; prior contract/plan revisions are untouched.
- Keys stay in `.env`; no key is read or printed.
