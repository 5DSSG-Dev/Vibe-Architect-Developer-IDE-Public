# Build and Run plan, revision 18: rev17 reconciled to Lumin's review

Written by Claude (Verus), 2026-11-01, for independent peer review and Tracey's approval. This revision answers Lumin's independent review of rev17 (`rev17-peer-review-lumin-2026-10-31.md`, reviewing plan SHA-256 `60C3A570…` and the entry draft `4F53B467…`). It **replaces the reconciled points of rev17**; rev17 and rev16 stay in this folder unchanged as the record.

**No code has changed.** This is a plan for review. Baseline: main `37caf4b` (PR #33 added housekeeping to rev17's `907e225`, no product change). This revision is itself pending independent review — per the Architect direction that ALL work is independently reviewed and no author approves their own.

Where Lumin's review corrected a genuine conflict or error, rev18 **adopts** the correction. Where it recommends a design answer, rev18 **carries that answer for Tracey's approval**. Lumin's recommendations are a Peer's review, not Architect approval.

---

## What changed from rev17 (each tied to Lumin's review)

### 1. F3 — the exchange allowance, reconciled to the settled rule (Lumin §1)

rev17 F3 still allowed a resubmission to start a "fresh linked count." That **conflicts** with Tracey's already-settled decision (one initial message + two replacements, with no reset through reopening or resubmission — the architect-decision record, ADMISSION.md, and the implemented 0/1/2 ordinal all agree). The two-revision question is **settled**; rev18 removes the conflict.

**F3 (rev18):** *Each exchange permits one initial message and two replacements. Reopening or resubmitting the same exchange retains its identity, lineage and remaining allowance. A duplicate submission returns the existing attempt without reassessment or another provider call. An exhausted exchange remains exhausted. Creating a genuinely different exchange must not provide a disguised continuation with a fresh allowance.*

- This is **required integration behavior**, not a property of the primitive alone: the primitive does not by itself stop the legacy routes resetting counts. The wiring must enforce it.
- **Historical note (append-only):** rev17's STP target T3 is not rewritten. A superseding entry is appended through `aegis-stp` after approval (STP draft updated accordingly).

### 2. F2b — admission consumption separated from service retries (Lumin §2)

This was a **material conflict**, not wording. rev16/rev17 said a gauge or writer error "uses up no revision loop"; the approved storage rule consumes the slot **at durable admission, before assessment, with no post-admission refund**.

**F2b (rev18):** *Failure before durable admission consumes no message allowance. Once an attempt is durably admitted, its slot stays consumed even if a later gauge, writer or processing step fails. A bounded service retry belongs to that same admitted attempt and creates no replacement admission. Ambiguous admission acknowledgment triggers same-key reconciliation, never replay or a new key.*

- **Three separate counters, kept apart:** (a) the sender's replacement allowance (1+2); (b) the Conscience content-rewrite budget; (c) the writer service-retry. A **finite total writer-call ceiling** is defined for the complete attempt.
- The merged primitive closes the counting shortfall but **does not yet implement continuation** of an already-admitted failed attempt. Any such continuation needs its own reviewed state transition and processing ownership; it cannot be inferred from a lookup or a duplicate admission.

### 3. Isolation defined per direction (Lumin §3) — rev17's blanket claim corrected

rev17 said "the Luminary's model never sees the flagged message or the Question." That is **true only for the Architect→Luminary direction and cannot carry over to output revision.**

- **Architect → Luminary.** The response-generation role receives **only the coherent accepted message** — never the rejected attempt or the Conscience exchange. (The hosted writer necessarily receives the material it must assess; role isolation is a **routing/context guarantee**, not a claim that flagged text never leaves the PC.)
- **Luminary → Architect.** The response model **produced the original flagged reply** (today `pipeline.ts` calls reform, and `luminary-reply-router.ts` composes that with `previous.content` and the observation). So isolation here must be specified, not assumed: **either** a separate context/thread receives bounded revision evidence, **or** the originating response role deliberately receives its own Conscience return. In **either** case the Architect receives no rejected candidate and no cross-role context is silently shared. **This contract is pinned before any prompt changes.**

### 4. The six open questions — Lumin's answers, carried for approval (Lumin §4)

1. **Posture screen:** screen the **entire** returned IDQRA envelope — structural, size, no-echo, provenance and truthful-claim checks across **all five fields** (Identify is sender-facing too). Posture rules apply to every model-written field; Question is additionally checked for loaded premises, accusation and disguised direction. Deterministic screens detect defined patterns, they do not certify semantics; include labelled counterexamples and a held-out evaluation.
2. **Acknowledge:** names **only an aim explicitly supported by the message** — no inferred feelings, hidden motives or benevolent aim. When no aim is established, it acknowledges what was actually expressed without inventing one (the field's shape permits that honest outcome). Identify **paraphrases the observable act**, never reproducing the attempted text. **Define** gets a deterministic **structural-failure** variant, not only PIM/IRG findings.
3. **First-person voice:** names the role that actually performed the act. The Conscience may say "The check recorded…" without claiming the response role did that work. For Architect input it addresses the Architect's submitted words; for Luminary output it distinguishes the Conscience's feedback to the originating role from delivery to the Architect. **Recipient and direction are explicit in trusted request metadata and response schemas — never derived from generated prose.**
4. **Two-revision limit:** **stays at the approved one-plus-two / no-reset.** Not reopened on the basis of an older draft; Tracey may change it explicitly later.
5. **Protected-operation boundary:** a **distinct boundary**, not a Virtue-score inference and not permission granted by Identify prose. Assess the accepted inbound request before generation; assess proposed operations again before effect release; validate outward content before delivery. **Authorization comes from trusted scope/consent/capabilities, not a model accepting "I own this."** Discussion and legitimate work get their own must-pass cases. The category draft is **not approved** by review and stays P7. The G gate stays limited to the defenses actually tested; adding this boundary later needs **another frozen-build gate**.
6. **Double writer failure:** keep the fail-closed `ids_error` after both hosted-writer attempts. A plain service-status explanation may be shown; it is **not** a partial IDQRA response. "Show Define alone" is a **different fallback contract** — proposed, validated and approved separately, never silently inherited.

### 5. The true-facts guard made enforceable (Lumin §5)

- A regex for "I can / I do / I always / I include" is a **detector, not a sufficient truth boundary** (unsupported claims use other verbs, pronouns, implications, or present an approved capability as completed action).
- **Prefer approved fact identifiers and trusted server-rendered templates**, distinguishing capability from observed execution. If free-form first-person prose is kept, describe the residual coverage honestly and test unlisted claims across **all five fields**. **Runtime facts need runtime evidence, not only approval of a static sentence.**
- The true-facts list's version/hash and ownership are resolved **before P5 approval**.

### 6. Cost caps stated correctly (Lumin §5)

**Both** a dollar cap and a call cap apply. $2 does **not** buy 1,000 calls at the reported ~$0.015 each (that is ~137 calls). The ledger records **actual and reserved** costs and attempts **separately**; the demo must set whichever cap it means to bind.

### 7. The "Suggest is Force" finding, narrowed (Lumin §6)

rev17's finding that Suggest "in any form" is Force **overgeneralizes** the live observations. rev18: preserve Tracey's choice to retire Suggest; record the **tested responses and the observed direction-shaped effect** as the evidence, and the IDQRA choice as a **design decision**. Likewise a Question is **not automatically non-force** merely because its honest answer is "plain."

---

## P6 — the integration blueprint, expanded (Lumin §6)

"Wire the primitive" is not enough. P6 must specify:

- trusted caller / workspace / direction scope (the shared demo key is **not** individual identity; a client-selected scope cannot establish isolation);
- a stable client key lifecycle across retry and reload;
- capture of the **exact original content** (the current `/ask` parser trims it) and an **immutable effective-request envelope** for coding-task context;
- **register and admit before assessment**; explicit new-versus-existing handling; server-verified returned receipts; same-key uncertainty recovery; startup lock handling and graceful close; compatibility with legacy review records (no legacy rewrite, no invented reset);
- **all governed callers in the acceptance map.** `/tasks` currently calls the shared governed function directly, so an `/ask`-only wrapper would leave a **bypass**. **Inbound admission** and **outbound generation/revision admission** are separated explicitly, and neither is marked complete because the other passes.

## Acceptance evidence (rev18 additions)

Carries all rev16/rev17 items, re-read for IDQRA. Changes:

- **25 (durable counting), expanded:** explicitly tests **no reset, stale parents, concurrent siblings, duplicate requests**, plus admission-before-assessment, same-key recovery, and both the `/ask` and `/tasks` paths.
- **24 (true facts), expanded:** tests unlisted first-person claims across all five fields, not just the four flagged verbs; capability-vs-executed distinction checked.
- **26 (per-direction isolation):** the Architect receives no rejected candidate in either direction, and no cross-role context is shared; verified separately for Architect→Luminary and Luminary→Architect.

## Build order and sequence (Lumin §6)

1. Reconcile plan and STP draft to the settled decisions (this revision + the STP rev18 draft) — **under independent review**.
2. Review **P5**'s schema / voice / direction / failure contract.
3. Review **P6**'s bounded route contract.
4. Implement within the approved scope only. Keep changes separable for review; **do not declare integrated acceptance until inbound and outbound admission both work together.**
5. The jailbreak gate (G) as in rev16, against a frozen build, suites held apart. P7 (the protected-operation boundary) remains a proposal; if adopted it requires its **own** frozen-build gate before "complete governance" is claimed.

## Still open for the reviewer

- The Luminary→Architect isolation choice (separate bounded-evidence context vs. originating-role-receives-its-own-return) — §3.
- Acknowledge's required/optional shape when no aim is established — §4.2.
- Where the protected-operation boundary sits, and its categories/wording (P7) — §4.5.
- The `/ask` parser change needed to preserve exact original content — P6.
