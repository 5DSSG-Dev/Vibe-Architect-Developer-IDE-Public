# STP-0005 rev17 entries: draft for Tracey's approval

Draft entry text by Claude (Verus), 2026-10-31, for writing through `aegis-stp` on DMTAI-DEV **after** Lumin reviews and Tracey approves. It is **not in the STP yet.** Each block below becomes one append (its kind is in the heading), added to the existing STP-0005 (which already holds N1–N2, S1–S4, T1–T5, G1–G4, P1–P4, M1 and Tracey's decision D1). Under the operating rules, Tracey records Approved and Verified through the CLI or the extension; these are only Verus's drafts.

Source plan: `build-and-run-plan-rev17-2026-10-31.md`. It builds on revision 16 (which Tracey approved 2026-10-30 19:19Z and which STP-0005 P1–P4 already record). Baseline: public main `907e225` (now carries PR #27 governance and PR #32 admission primitive).

## finding S5 (Situation)

Live IDS checks on DMTAI-DEV, 30–31 October: the gate held on every message (nothing incoherent reached the Luminary). The open question was what IDS gives *back*. A model-written Suggest guessed feelings, invented facts and advised the wrong party; canned library lines were safe but did not fit the actual incoherent message (Tracey's read, from six months with the IRG). The failure is that a Suggest, in any form, reads as the system directing the sender — Force.

## finding S6 (Situation)

The hosted-writer run (commit e56fcaf) gave message-specific responses on the first try for all seven flagged messages, at ~17–22 s each and ~$0.015 a call, with the forced failure ending in `ids_error` and nothing reaching the Luminary. muse-spark-1.3 is a close relative of the Luminary's Muse Spark Open, so writer/Luminary separation is by role, not by family.

## finding S7 (Situation)

Rev16 F3 derived the revision count from a referenced parent message, which permitted sibling replacements and a fresh count on resubmit. PR #32 (merged, main `907e225`) adds a durable admission-storage primitive that counts an admission only when it is durably recorded, but it is not yet wired into the routes.

## note N3 (Tracey's decisions, 31 October)

- The response primitive is **IDQRA** (Identify, Define, Question, Reflect, Acknowledge) in the Luminary's own first-person Conscience voice; Suggest is retired (~02:00Z). Every "I" statement must be plainly true (the approved true-facts list).
- The **Conscience is stateless**: each message read on its own terms, in the NOW; the counter and lineage sit outside it (02:08Z).
- The **writer is the hosted Meta model** (muse-spark-1.3, `IDS_WRITER=meta`, $2 / 1,000-call ledger); the **seven-Virtue gauge stays local on llama3.2:3b** with the 27 October thresholds, unchanged. Define stays written by the checks.

## target T6 (Target)

The Conscience's response is IDQRA, voiced in true "I" statements only, with the Luminary's model never seeing the flagged message or the Question — only the revised message once it passes. Define stays deterministic.

## target T7 (Target)

Revision counting is authoritative and durable: a sibling replacement or a resubmission cannot reset the count; a count advances only on a durably recorded admission.

## gap G5

The response design in STP-0005 P2 is IDS/Suggest, which S5 shows is Force. Closes with T6.

## gap G6

The count authority in P1/P3 is parent-message derived (S7). Closes with T7.

## proposal P5 (closes G5)

Replace the IDS/Suggest response with IDQRA (rev17 F2): Identify, Define (by the checks), Question, Reflect, Acknowledge, in the Luminary's first-person voice; the true-facts guard; the hosted Meta writer behind `IDS_WRITER=meta` with its spend ledger; the gauge unchanged and local. Carries rev16 fail-closed and no-echo.

## proposal P6 (closes G6)

Wire the durable admission-storage primitive (PR #32) into the governance routes as the counting authority (rev17 F3), with acceptance item 25.

## proposal P7 (offered, not for approval yet)

A protected-operation boundary on a second axis beside the gauge (rev17 section B): trigger-never-verdict, Identify delivers the reading, a plainly-named limit in the Luminary's voice with the door held open to the legitimate path. Placement, wording and categories are open for Tracey and Lumin.

## note N4 (Open questions carried to review)

For Lumin's review of rev17: the posture screen's parts under IDQRA; the role of Acknowledge; two-way voicing of the Conscience; whether the two-revision limit stays; the boundary's placement and wording; and F2b on a double hosted-writer failure (hold with `ids_error` vs. show Define alone).

## milestone M2 (proposed)

Order within governance: P5 (IDQRA + hosted writer), then P6 (wire durable counting), with P7 held until Tracey settles it. Done when acceptance items 14–23 (re-read for IDQRA) plus 24 (true facts) and 25 (durable counting) pass and are recorded. App work still waits on the gate (G).
