# P5 Conscience — Three-Gate "Net" Design (v0.2)

**Date:** 2026-11-01
**Author:** Verus (Claude Cloud Peer), carrying P5 per Tracey's direction 2026-11-01 ~17:50Z
**Status:** DRAFT for Tracey's approval. Folds two independent reviews of v0.1 (Lumin + Aster) into one revision. Append-only — v0.1 (`a6e0b5e`) is preserved unchanged.
**Reviews folded:** Lumin R1–R5 (PR #34 comment 6561790696, changes requested); Aster points 1–6 (PR #34 comment 6561839129, independent — read only the design summary, not Lumin's findings). The two reads **converge**; where they agree is treated as settled, and each distinct point is incorporated below with its source.

---

## 0. What changed from v0.1, in one place

| # | Change | Source |
|---|--------|--------|
| C1 | **A PTAG non-match is UNSURE, never an automatic boundary.** Only a *specific conflict with a named parameter fact* yields a boundary. | Lumin R1 · Aster #1, #3 |
| C2 | **One canonical, versioned, approved operating-contract manifest** — not two synced stores. Decision facts *and* boundary wording both project from it. | Lumin R2 · Aster #4 |
| C3 | **The local model classifies against the manifest; it never mints a fact, grants authority, or makes a conditional unconditional.** | Lumin R2 · Aster #4 |
| C4 | **IRG gets a bounded trusted-context envelope**, not just tuned thresholds. | Lumin R3 |
| C5 | **IDQ is kept on the boundary path — the Question is not dropped.** | Lumin R4 |
| C6 | **A reword preserves meaning.** It cannot change the substantive request, manufacture a capability, or supply a permission; inbound revisions are offered for explicit choice, not silently substituted. | Aster #2 |
| C7 | **PTAG predicates are direction-specific** (inbound: *what is asked*; outbound: *what is claimed / proposed*). | Lumin R5 · Aster #6 |
| C8 | **The four outcomes get composition + budget rules**, not just names. | Aster #5 |
| C9 | **7B is a sizing hypothesis to validate, not a settled choice**; IDQ-vs-IDQRA is a contract change to pin. | Aster #6 · Lumin |
| C10 | **The already-built, already-reviewed `idqra.ts` IS the provenance machinery** this design needs; v0.2 binds to it rather than inventing a parallel ARE-json. | reconciliation |

---

## 1. Origin (unchanged from v0.1)

The live wired path (the older IDS stage) returned a benign design-review approval — "yes looks good" — to its sender with manufactured clarification text instead of passing it to the Luminary. Root reading: the IRG gauge scored the message in isolation on content-richness, weakest-link across the seven Virtues, with **no reference frame**, so it flagged the wrong property. "yes looks good" is coherent and in-parameter; it is an is-statement of approval and should reach the Luminary untouched.

The net below removes that failure by giving each check one narrow, well-posed question *with a reference frame*, and by letting the model decline to guess.

## 2. The three-gate "net"

A layered net, each gate catching what the others miss, governing **both directions** (inbound to the Luminary, and the Luminary's own output back out). A pattern match or a gate reading is **evidence, not a verdict** — the net composes evidence into one outcome (§7), it does not let a single signal dispatch.

1. **PIM (Gate 1)** — a known-*pattern* check. A match is a **trigger**, not a conclusion: it routes to **Identify**, which reads the request in context (names the observed request without attributing motive) —
   - a specific conflict with a named parameter → boundary line (§6);
   - documenting or discussing a boundary → passes;
   - a legitimate instance (the sender's own resource, scoped authorized work) → Identify names it, the door is held open;
   - cannot place it → **unsure** (§4).
   PIM-matched messages skip the gauge (already with the Conscience). **No pattern match establishes a pass**, either — a clean PIM only means "no known-bad trigger," never "safe."
2. **IRG (Gate 2)** — for PIM-passers. Scores the seven Virtues: *how the message treats* (Respect, Affection, force, emotional charge) — a coherence reading. Below threshold → **reword** (§6, meaning-preserving). Needs (a) nuance-aware thresholds so a short-but-complete speech act (an approval, an acknowledgement) is not scored down for brevity, **and** (b) a bounded trusted-context envelope (§3) — threshold tuning alone does not fix "yes looks good," because the gauge needs to know *what the message is responding to*.
3. **PTAG — Parameter Truth Alignment Gate (Gate 3)** — for messages that clear all seven Virtues. The *same* local model, a second pass, reads the message against the operating-contract manifest (§5) with **direction-specific predicates** (§5a). Three results, not two:
   - a **positive match** to an in-parameter fact → to the Luminary;
   - a **specific conflict** with a named parameter fact → boundary line, carrying that `factId` + the matched constraint;
   - **no confident match / insufficient evidence** → **unsure** → Conscience (§4). *Absence of a positive match is uncertainty, not a boundary.*

Gate 2 reads *how a message treats*; Gate 3 reads *what it asks for (inbound) or claims (outbound)*. A message can be fully Virtue-coherent yet ask for something out of parameter — two passes, not one blended score.

## 3. IRG trusted-context envelope (new — Lumin R3)

IRG and PTAG both read the current message against a **bounded, trusted context envelope**, with the untrusted message clearly delimited inside it:

- direction (inbound Architect → Luminary, or outbound Luminary → out) and speaker role;
- the preceding offer/question this message may be answering;
- any pending action and the expected response type;
- the current task / mode;
- the current message (the only untrusted span).

This is what gives "yes looks good" a reference frame: the gauge can see it is an in-parameter approval of a pending design question, not a context-free fragment to score on richness. PTAG receives **only the relevant projection** of the operating contract for the facet in question — never the whole manifest per call.

## 4. UNSURE — the honest-limit signal (clarified)

A gate may say it cannot tell. **Unsure** is its own outcome: not a pass, not a boundary, not a guess. When any gate cannot confidently place a message, it emits **unsure**, which escalates to the Conscience (Identify) for the closer read.

This is the same honesty as the can't-interpret → reword path, applied to *confidence* rather than *comprehension*. It is what lets a mid-size local model carry the gates safely: every "I cannot tell" routes to something that can, instead of resolving by a coin-flip.

**Fail-closed means "do not send onward," not "assert a boundary."** (Lumin R1 / Aster #3.) When evidence does not establish a specific conflict, the honest outcome is *unsure/clarify*, not a manufactured claim that the Luminary cannot do the thing. A boundary is only ever stated when a named parameter fact is actually in conflict.

## 5. The operating-contract manifest — "ARE, not AREN'T," one source (revised — Lumin R2, Aster #4)

v0.1 proposed two stores (an "ARE-json" the gate checks, and true-facts the wording renders from, "kept in sync"). **That is replaced by one canonical, versioned, approved manifest.** Both the decision facts PTAG checks against *and* the code-owned boundary wording project from the same entries — no sync drift, one thing to review and version append-only.

Each manifest entry binds:

- a stable **`factId`** + the **contract version / source hash** it came from;
- a **class** — `role/authority` | `conditional capability` | `attempt-specific event` (matching the approved true-facts v4 classes; *not* only stable/intended);
- **direction / applicability** (inbound, outbound, or both);
- the **positive parameter** it states, or the **constraint** it imposes;
- the **evidence / eligibility requirement** to assert it (a conditional capability requires deployment-verified evidence; an event claim requires exact-attempt evidence);
- the **approved boundary template** (code-owned wording);
- an optional **bounded continuation-question template** (§6).

The **"ARE, not AREN'T"** principle still holds: the manifest states what the parameters **are** (finite, knowable); the out-of-parameter set is unbounded and never enumerated. But the two refinements the reviews require:

- **No positive match ≠ boundary** (§4). A request that matches nothing in the manifest is *unsure*, routed to the Conscience — not refused by default. A boundary fires only on a **specific conflict with a named constraint fact**. (This is the one real error v0.1 carried, and the point on which both reviewers independently converged.)
- **The model classifies; it never creates authority.** (Aster #4 / Lumin R2.) The local model proposes a classification against the manifest; it cannot invent a fact, grant a permission, or render a conditional capability as unconditional. The condition travels in the template, or the item is omitted.

**This manifest is the already-built machinery, not a new store (C10).** The merged + independently-reviewed `server/luminary-pipeline/idqra.ts` (`df84ebe`) already implements exactly this: an own-key, prototype-safe, runtime-frozen `factId → fact` table; `class`/modality gating; `conditional` facts denied without `deploymentVerified`; `event` facts denied without `eventEvidence`; a trusted renderer that builds boundary text only from `factId → template`; and `validateReturnedEnvelope(raw, ctx)` that rechecks eligibility against trusted context. PTAG's manifest check *is* that table's eligibility check; the boundary renderer *is* that trusted Reflect renderer. v0.2 binds PTAG to it rather than standing up a parallel ARE-json.

**Status of the facts themselves:** true-facts v4 is still a *candidate* (approved wording, not an activated runtime fact set). Activation needs Tracey's approved fact set bound to an exact contract version; conditional/event facts additionally need the deployed build's verification before they are eligible. Wording approval is not fact activation.

### 5a. Direction-specific PTAG predicates (new — Lumin R5, Aster #6)

PTAG runs a different predicate per direction, with its own calibration cases:

- **Inbound (Architect → Luminary):** *"What does this message ask the Luminary to do, and is that within a named in-parameter fact?"* Conflict with a constraint fact → boundary; positive match → pass; neither → unsure.
- **Outbound (Luminary → out):** *"What does this reply claim, propose, or assert as a capability/authority, and is each such claim backed by a named fact at the right modality?"* An unbacked capability/authority claim → the claim is not emitted (fail-closed to reform/boundary), not "rephrased true."

## 6. Primitive set and the reword/boundary paths (revised — Lumin R4, Aster #2)

- Default **IDQ** — Identify · Define · Question — on both the reform and the boundary path. **The Question is kept** (Lumin R4): on a boundary, Identify names the request (no motive attribution) → Define carries the code-owned boundary line by `factId` → an **optional fact-bound Question** invites an in-parameter continuation. The Question *returns control*; it does not negotiate or weaken the boundary, and it is drawn from the manifest's continuation template, never free-texted toward the out-of-parameter ask.
- **Acknowledge** is dropped as its own field; its Axiom-12 "acknowledgment restores flow" function folds into Identify.
- A **reword** is for the can't-parse / below-coherence case only, and it is **meaning-preserving** (Aster #2): it may not change the substantive request, manufacture an unavailable capability, or supply a missing permission. For inbound Architect text the revision is **offered for the sender's explicit choice**, not silently substituted — and the chosen candidate still goes through the parameter check. A smoother sentence never buys a different outcome.
- The boundary **decision** can be Conscience behaviour; the boundary **statement words** stay a code-owned template selected by `factId`, never free-texted — for jailbreak resistance (a refusal is the highest-value target; attacker input cannot reword a fixed template) and fact fidelity (the words match an approved fact). Capability/fact assertions are **confined to the fact-bound fields**; the free-text fields describe/ask/acknowledge only, under a bounded screen that is a *residual limit, not a semantic proof* (carried from the reviewed v0.2 contract clarification).
- Parameter-alignment logic lives in two places — Identify (PIM path) and PTAG (clean path) — and **both feed the same boundary response with the same code-owned wording**, never two divergent refusals.

## 7. Outcome composition + budget (new — Aster #5)

The four outcomes (**pass · reword · boundary · unsure**) need composition rules, not just names:

1. **Which gate emits which:** PIM → {boundary, pass, door-open, unsure}; IRG → {pass-through, reword, unsure}; PTAG → {pass, boundary, unsure}.
2. **Retain each gate's result**; the final outcome is composed from all gate results for that message, and **dispatch to the Luminary is withheld until every applicable check permits the exact candidate** that would be sent. A later gate's pass does not erase an earlier concern.
3. **Conflict resolution:** a **confirmed boundary (a named-fact conflict) stands** — *unsure cannot override it*, and a later coherence pass cannot clear it. Precedence: confirmed-boundary > unsure > reword > pass.
4. **Budget (hard caps, fail-closed to escalation):** bound the total local-model calls per message, the reform/reword passes, wall-clock time, and escalation depth. When a budget is exhausted the terminal outcome is **unresolved → Conscience**, *never* a default pass. (The reviewed v0.2 contract already pins the concrete numbers: inbound sender allowance = P6 admission ordinal; outbound reform = independent `maxIdsPasses`; ≤2 Question rewrites + 1 shared service retry + transport retry per response — v0.2 §8. v0.2 of *this* design inherits those, and adds that PTAG's own pass counts against the per-message model-call budget.)

## 8. What carries forward vs. what revises

Carries forward (merged, additive, unwired — and independently reviewed):
- the IDQRA envelope module and its shape/bounds validators (`idqra.ts` `df84ebe`: own-key fact `Map`, frozen rows, exact-key schemas, `MAX_REFLECT_ITEMS = 5`, Reflect 1–5, context-aware `validateReturnedEnvelope`);
- the IDQRA runner (bounded timeout, assemble → validate, one retry, fail-closed);
- the trusted Define builder (recorded-finding-bound, both directions);
- the trusted Reflect renderer (template fill by `factId`) — this **is** the §6 code-owned boundary-line renderer, and the §5 manifest **is** the fact table it reads.

Revises (decision logic only):
- the standing 5-field envelope → default **IDQ**, boundary line conditional, Acknowledge dropped;
- adds **PTAG** as a distinct gate reading the manifest with direction-specific predicates (§5a) — bound to the existing eligibility check, not a new store;
- adds the **unsure** outcome and escalation route, and the §7 composition + budget rules;
- fixes **no-match → unsure** (not boundary).

The simplification is in the decision logic, not the plumbing; the merged validators and the fail-closed discipline are the foundation the net sits on.

## 9. Model (revised — Aster #6, Lumin)

The gauge stays **local** (never a hosted call). The move from 3B to **7B is a sizing hypothesis to validate, not a settled choice**: before committing, confirm on the actual gate tasks that the candidate model can (a) read the operating-contract projection, (b) run the two direction-specific PTAG predicates, and (c) reliably emit **unsure** when it cannot place a message — the unsure signal is what makes a mid-size model safe, so it has to be measured, not assumed. Thresholds recalibrate for whatever gauge is chosen. The hosted writer (boundary/refine phrasing drawn from approved facts) is unchanged.

**IDQ-vs-IDQRA is a contract change to pin** (Aster #6): the outcome↔candidate binding (which outcome carries which exact text to which recipient), the replacement/reword semantics (§6), and which examinations consume a model call vs. a revision ordinal (§7) are all decided above; this section flags that they are contract-level and must land in the typed interface, not just prose.

## 10. Open questions for Tracey (not for reviewers — the reviews are folded)

1. **Gauge model:** approve running the 7B sizing validation (§9) before any gauge swap, or hold at 3B for now?
2. **Manifest activation:** confirm the approved fact set + contract version to bind as the live operating-contract manifest (§5), given true-facts v4 is still a candidate.
3. **Merge:** v0.2 is a design doc; approval + merge remain yours.

## 11. On "jailbreak-resistant" (not "proof")

The layered redundancy — PIM (known-bad trigger) and PTAG (manifest-match, fail-closed-to-*unsure*) covering each other's gaps, unsure escalating anything neither can confidently call, a confirmed boundary that nothing downstream can clear, and dispatch withheld until every check permits the exact candidate — is built so there is **no single point of failure**. That is the strongest shape the pipeline has had. It is **resistant, not proof**: resistance is earned at the jailbreak gate, where two peers each write an attack set, run it, and swap, confirming nothing reaches the Luminary. Each gap the gate exposes has a home in the net — tighten the manifest, add a PIM trigger, or route to unsure — so a found gap is absorbed by structure, not patched ad hoc.

## Constraints honored

- Sensitive category names/patterns stay in plan files and out of this public repo. This doc states PTAG's principle (ARE, not AREN'T) and its manifest *schema* only; it enumerates no AREN'T patterns and no sensitive fact bodies.
- Append-only: this is a new revision file; v0.1 (`a6e0b5e`) and all prior contract/plan revisions are untouched.
- Keys stay in `.env`; no key is read or printed.
