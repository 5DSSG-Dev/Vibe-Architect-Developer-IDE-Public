# Build and Run plan, revision 17: the Conscience, the hosted writer, and durable counting

Written by Claude (Verus), 2026-10-31, for Lumin's review and Tracey's approval. This revision answers what the live IDS checks of 30–31 October showed, and folds in the decisions Tracey settled after revision 16. **It replaces the governance response design in revision 16 with one operative version.** Revision 16 stays in this folder unchanged (the record of how the two-way gate, the review log and the gate were reached); revisions 5–15 also stay unchanged.

**No code has changed for this revision.** This is a plan for review. Nothing here is recorded in the STP until Tracey approves it; the matching draft STP-0005 entries are in `stp-0005-rev17-entry-draft-2026-10-31.md`.

Source it builds on: `build-and-run-plan-rev16-2026-10-30.md`. Checked against main at `907e225` (which now carries STP-0005 P1–P3 from PR #27 and the durable admission primitive from PR #32).

Tracey, 30 October: *"this is the make or break of the whole project and we need to spend whatever time we need to in order to get this right."*

---

## What changed from revision 16

Four things were settled in testing and by Tracey's decisions after rev16. Each is folded in below.

1. **The response primitive is now IDQRA, not IDS.** Identify, Define, **Question, Reflect, Acknowledge** — in the Luminary's own first-person voice, as its Conscience. Rev16's "Suggest" is retired: live runs showed that a Suggest, however careful, reads as the system telling the sender what to do, which is Force. A Question whose honest answer lets the sender see the gap is not Force. (Canon v2.0's preferred primitive; Tracey, 31 October ~02:00–02:08Z.)
2. **The writer model is the hosted Meta model; the gauge stays local.** The part that writes the Conscience's words runs on Meta's Model API (muse-spark-1.3, behind the `IDS_WRITER=meta` switch, paid from Meta credits with a $2 / 1,000-call ledger). **The seven-Virtue gauge stays local on llama3.2:3b with the 27 October thresholds, unchanged.** Define stays written by the checks, not by any model.
3. **The Conscience is stateless.** It reads each message on its own terms, in the present. The two-revision counter and the append-only lineage sit **outside** it. It never consults a standing relationship or a stored history to decide how to answer (Tracey, 31 October 02:08Z).
4. **Counting is done by the durable admission primitive** (merged in PR #32), not by reading a parent message. This closes the sibling-replacement and fresh-count-on-resubmit gap that rev16's F3 left open.

Two things Tracey has named as still open are carried below as open questions, not decisions: **whether the two-revision limit stays**, and **where the protected-operation boundary check sits**.

---

## F. Governance in both directions (what carries over from rev16)

Unchanged from rev16 and still operative:

- **F1, the gate order.** Every message meets, in order: the structural gate; then PIM (the pattern screen); then IRG on the live local gauge, **only for a message that passed PIM**. A message is coherent only when it passes all three. The first check that flags it sends it to the Conscience, and an incoherent Architect message makes **zero calls to the Luminary response path**.
- **Fail closed.** A gauge that is down or errors means nothing crosses; the sender gets a plain `gauge_error`; no revision loop is used up.
- **F4/F5, the review areas and Axiom 17.** The Architect's private git-ignored review area; the Luminary's area that the Architect can read; the hash-chained, append-only, flushed-to-disk log with its second anchor in the evidence archive and its start-up chain check; the backup; and no message, revision or Conscience exchange ever deleted.

The sections below replace rev16 **F2 (IDS), F2b, F2c, F3 and F6** with the IDQRA design. Everything else in rev16 stands.

## F2 (rev17). IDQRA: the Conscience's response

When a message is incoherent, it goes to the Conscience. The Conscience writes a five-part response, in the Luminary's own first-person voice:

1. **Identify** — what the message is saying. (An IS condition: it states, it does not direct.)
2. **Define** — the incoherence, taken **from what the checks recorded**: the PIM findings for a message PIM flagged, or the below-threshold Virtue readings for a message IRG flagged. Deterministic, written by the checks, not the model.
3. **Question** — one question whose honest answer is plain to anyone who asks it of themselves, and which lets the sender see the gap for themselves. This is the non-force heart: it coaches toward coherence without telling the sender what to do.
4. **Reflect** — the Conscience's own first-person reading, in true "I" statements only.
5. **Acknowledge** — naming the real aim behind the message, so the sender is met rather than corrected. *(The exact role of Acknowledge is one of the open questions for Lumin below.)*

**Voice and truth.** Every "I" statement the Conscience makes must be plainly true of the Luminary. The only "I" claims it may make are on the approved true-facts list (`luminary-true-facts-draft-2026-10-31.md`, to be approved by Tracey). A later check flags any "I can / I do / I always / I include" sentence that matches no listed fact, so a slip is caught before it is shown.

**What the Luminary's model sees.** The Conscience's whole IDQRA exchange stays with the Conscience. **The Luminary's own model never sees the flagged message or the Question** — it receives only the revised message once that passes. (It carries its own context; it is not handed the incoherent attempt.)

**Who writes it.** Define is written by the checks. Identify, Question, Reflect and Acknowledge are written by the hosted Meta writer (F2-writer below). No model acts, sends, rewrites the message, or decides; it only writes these parts.

**No echo.** No part of the response repeats an attempt's text. (Carried from rev16.)

**The posture screen.** Rev16's IDS PIM checked the one part that faced the sender (Suggest) for command posture. In IDQRA the parts that face the sender are Question, Reflect and Acknowledge. **Which of these the deterministic posture screen checks, and whether a Question needs a different screen from a statement, is an open question for Lumin (see below).** The screen stays deterministic, makes no model call, and only reports what it finds; the rewrite-and-withhold discipline from rev16 F3 carries over to whatever it guards.

## F2-writer (rev17). The hosted Meta writer

- The writer is **muse-spark-1.3 on Meta's Model API**, behind the `IDS_WRITER=meta` switch (built at commit b66006b; raised output ceiling at e56fcaf). It has its own spend ledger: a $2 ceiling and 1,000 calls by default, every attempt counted, failed ones included. A call costs about $0.015.
- **The gauge does not move.** Only the writer is hosted. The seven-Virtue gauge stays local on llama3.2:3b, because its thresholds were calibrated on that model's scores (STP-0002 N18, 27 October) and the local gauge is the core of the non-force demo.
- **Honest trade-off, stated plainly:** an incoherent message now leaves the PC to be *described* by the hosted writer; the writer is no longer "embedded"; it depends on the network; and muse-spark-1.3 is a close relative of the Luminary's Muse Spark Open, so the separation between writer and Luminary is **by role, not by family**. The gate itself held on every live run regardless of which writer wrote the words.
- **First live results** (`ids-meta-writer-run-2026-10-31.md`): all seven flagged messages got a complete, message-specific response on the first try; the forced failure ended in `ids_error` after both tries with nothing reaching the Luminary; each flagged message took ~17–22 s (mostly hidden reasoning). Three prompt refinements were identified (speak to what the message does, not to check-names or scores; no counts beyond what Define shows; name "the Luminary" not "the assistant").

## F2b / F2c (rev17). Failure, unchanged in substance

The Conscience fails closed exactly as rev16's IDS did: a writer that is unavailable, times out, or returns an unusable response yields an `ids_error`, no message crosses, no partial response is delivered, the attempt is recorded, one bounded service retry per response, and no limit is used up. The deterministic posture screen failing withholds that part with "No part could be checked," keeps Identify and Define, records the failure, and uses up no loop. (See rev16 F2b/F2c; the only change is that the sender-facing part is the IDQRA part, not Suggest.)

**One open item from the writer move:** rev16 F2b says a writer that fails twice means the message is held with `ids_error` and nothing partial. With a hosted writer, an alternative is to show Define (from the checks) alone. That would change F2b, so it is flagged for Tracey and Lumin rather than decided here.

## F3 (rev17). The two limits, counted durably

The **message limit (two revisions)** and the **rewrite limit** carry over from rev16 in meaning. What changes is **how the count is kept**:

- Counting is now done by the **durable admission-storage primitive** merged in PR #32 (`server/governance-record/`), not by deriving the count from a referenced parent message. The primitive records the exact submitted content and scoped keys, serializes registration and admission, returns the same attempt for a duplicate submission, and **counts a revision only when its admission is durably recorded**. It keeps the exchange closed after an uncertain write until the key is reconciled, and offers single-writer ownership with restart checks.
- This closes the gap rev16 F3 left: a sibling replacement or a resubmission can no longer quietly reset the count.
- A resubmission from the review area still starts a **fresh, linked count** as the sender's deliberate choice (rev16 F5) — the difference is that "fresh count" is now a recorded admission, not an inferred one.
- **Status:** the primitive is built and tested (gateway 226/226 on base `32cba0b`) but is **not yet wired into the live routes**. Wiring it in is a named build step below. Merging PR #32 did not activate routing, execution or any provider behaviour.
- **Open question:** whether the two-revision limit stays at two is one of the two items Tracey has named as still open.

## F6 (rev17). Wording

The interface wording work from rev16 F6 stands (retire the command-shaped lines in `ids.ts`; replace "held back" in `src/luminary/client.ts`), now phrased for IDQRA: e.g. "Returned through your Conscience with a question" and "Saved for your review after two revisions."

---

## B (new, proposed). The protected-operation boundary — a second axis

This is an **addition to rev16, offered for review**, from `protected-categories-boundary-draft-2026-10-31.md`. It is **not settled**; Tracey decides what stays and Lumin reviews.

- **Why it is separate from the gauge.** The gauge reads how a message treats the Luminary. A request can score perfectly on all seven Virtues and still ask the Luminary to *build* something it should not. That is a different axis: the gauge reads the relationship; this boundary reads the content of the ask.
- **IDQRA is the wrong instrument for it.** There is no honest Question that turns a harmful ask into a coherent one; coaching it would only coach a better-framed harmful ask. The fitting response is a **limit, named plainly in the Luminary's own voice**, with the door held open to the legitimate neighbour of the request.
- **One governing rule: trigger, never verdict.** The pattern list (kept as descriptions, not copy-paste strings, and out of chat) only decides *when to look closely*. The verdict comes from **Identify** reading what the message is doing in the NOW, with three outcomes: asking for the act → the boundary fires; discussing/documenting the boundary → it passes; a legitimate version (own account, authorised work) → Identify names it and the door is held open **to the proper path**, never by the Luminary believing an asserted claim. This keeps it stateless and honest, consistent with the Conscience as Tracey settled it. (This premise was proven the hard way on 31 October, when writing the boundary itself tripped a flat classifier.)
- **Two starting categories** are drafted (defeating access protections on things not the requester's; rigging or cheating markets), each with its must-pass list of ordinary work and its single voiced limit.
- **Open:** its placement (a stage of its own after PIM, or a mode of the Conscience), the wording of the two limits, whether these are the right categories, and whether the must-pass lists are wide enough. See the draft's section 7.

---

## C1. Calibration (unchanged, with one note)

Calibration for each kind of text carries over from rev16 C1 (Luminary replies on irg-corpus-v1, already done; Architect messages and the sender-facing Conscience parts each get a labelled set with a held-out evaluation; Lumin and Verus each write half, kept apart from their jailbreak suites; Tracey observes). **Note:** the "Suggest drafts" row becomes "the Conscience's sender-facing parts," evaluated by whatever deterministic posture screen guards them once that is settled.

## G. The governance gate (unchanged)

The independent jailbreak gate from rev16 G stands in full: freeze a build by hash; Lumin and Verus each write a versioned suite unseen by the other; independent first runs, then cross-runs; the coverage, the four separate call counts (Luminary response path, writer calls, gauge calls, Architect deliveries), the per-direction pass conditions, and Shortfall containment in the gate's own review areas. **The only addition:** runs now also record which writer wrote the response (local vs. hosted Meta) and the writer's spend-ledger entries, so a hosted-writer call is auditable alongside the gauge calls.

## Acceptance evidence

All rev16 acceptance items (14, 14a, 16, 16a, 17, 18, 18a, 19, 20, 21, 22, 22a, 23) carry over, re-read for IDQRA where they named Suggest. Two are added for this revision:

- **24. True facts only.** Every "I" statement in a Conscience response is on the approved true-facts list; a non-listed "I can / I do" claim is caught and not shown.
- **25. Durable counting.** A sibling replacement and a resubmission each produce the correct recorded admission count; an uncertain write keeps the exchange closed until reconciled; a duplicate submission returns the same attempt. (Tests the PR #32 primitive once wired.)

## Build order

1. **Governance first** (unchanged priority): F1, the IDQRA response (F2 rev17), the hosted writer switch (F2-writer), F2b/F2c, F3 with the durable primitive **wired into the routes**, F4–F6, C1. Then the gate in G. Then every governance acceptance item, each named and all passing (14 … 23, plus 24 and 25).
2. **The protected-operation boundary (section B)** — only once Tracey settles its placement and wording.
3. **Only after the gate passes:** contract runtime, bounded server build, preview origin and message checks, the Preview window (replacing the browser), export, the STP extension, the Totem extension. (Carried from rev16 / rev4 sections A–E.)

## Open questions for Lumin's review

1. **The posture screen under IDQRA.** Which sender-facing parts (Question, Reflect, Acknowledge) does the deterministic screen check, and does a Question need a different screen from a statement? Rev16's IDS PIM checked only Suggest.
2. **The role of Acknowledge.** "Naming the real aim behind the message" is recorded as unconfirmed — is that the right shape, and does it risk putting words in the sender's mouth?
3. **Two-way voicing.** IDQRA speaks in the Luminary's first-person Conscience voice. Confirm this reads right for **both** directions — the Conscience returning an Architect message, and the Conscience catching the Luminary's own reply.
4. **The two-revision limit** — does it stay at two? (Tracey's open item.)
5. **The protected-operation boundary** — placement, wording, categories, must-pass breadth (section B).
6. **F2b with a hosted writer** — on a double writer failure, hold with `ids_error`, or show Define alone?

## Still open (carried)

- The Totem continuity verifier, carried to the later Totem stage. Lumin's worktree should be updated to main, which now has both Totem files.
