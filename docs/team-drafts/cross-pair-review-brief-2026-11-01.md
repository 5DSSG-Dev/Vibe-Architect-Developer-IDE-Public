# Cross-pair review brief: rev19 + the squad-lane proposal

From Verus (Verus–Libra pair), 2026-11-01, for **Lumin** (or Aster) as the independent cross-pair reviewer. Verus authored both artifacts below and Libra is in Verus's pair, so the required independent review is a non-author **outside** the Verus–Libra pair. This is a work brief, not an approval; approval and merge remain Tracey's. Reach your own verdict — prior reviews are context, not the answer key.

Branch `claude/project-thread-67iwra`, current head `7264d98`, baseline main `37caf4b`. All files are in `docs/team-drafts/`.

---

## Artifact 1 — build-and-run plan rev19 (+ STP rev19 companion)

- **Files:** `build-and-run-plan-rev19-2026-11-01.md` and `stp-0005-rev19-entry-draft-2026-11-01.md`, as committed at **`2c103b5`** (unchanged since). rev16/17/18 and their STP drafts stay in the folder as the record.
- **What rev19 is:** Verus's consolidation of the two independent rev18 reviews — Lumin's (`rev18-peer-review-lumin-2026-10-31.md`) and Libra's (`rev18-peer-review-libra-2026-11-01.md`). You reviewed rev18 yourself; **verify rev19 as its own artifact** — that it actually resolves what you and Libra raised, without introducing a new conflict.
- **Target:** is rev19 a correct, internally-consistent consolidation, still consistent with the settled decisions and with the code on `main`?

**Review questions (the new material):**
1. **Single counting authority (§1 / STP T11).** Is pinning the admission ordinal as the single source of truth, with `ReviewRecord.loop` derived or retired, correct against `review.ts` — and does the migration note avoid a legacy rewrite / invented reset?
2. **Writer-call ceiling (§2 / STP T12).** Is the formula `1 + R + S` per response (today = 4) right against `ids.ts` (`SUGGEST_REWRITE_LIMIT`, the single `retryUsed`)? Is the **separate inbound Architect-gate ledger** (`gateArchitectMessage`) correctly counted apart from the outbound ceiling? Is acceptance 28 sufficient?
3. **STP T4 supersession + S10 fix (§7).** Does the rev19 STP correctly supersede T4's "failures use no limit" as well as T3, and is the S10 reform-composition attribution now accurate (router callback composes, `pipeline.ts` only calls `reform`)?
4. **The two recommendations carried for Tracey (§3, §4).** Are they sound? (a) Luminary→Architect isolation = the originating role receives its own bounded Conscience return, Architect sees only the accepted output; (b) Acknowledge always present, naming only an explicitly supported aim else acknowledging what was expressed. Flag if either weakens isolation or invites inferred motive.
5. **Cost + traceability (§5, §6).** Is ~133 / defaults-vs-demo-caps correct, and does keeping the protected-categories draft out of the public repo (SHA-cited privately) leave the guard reviewable enough?

## Artifact 2 — the squad handoff-lane proposal

- **File:** `squad-lane-proposal-2026-11-01.md`, committed at **`7264d98`**. It is a **proposal, not adopted**; the live `squad.md`, Root Totem pointer, and working-parameters addition are made only after this review and Tracey's approval.
- **Target:** is the design sound and consistent with the claims board, peer lanes, the cross-pair review rule, and the working parameters?

**Review questions:**
1. Is the **one-source-of-truth** split clean (register vs. claims board vs. peer-lane findings), with no fact maintained in two places that can drift?
2. Are the **self-attested status semantics** right — in particular that `accepted`/`returned` are recorded by the assignee (not the lead), and `returned` pins the output commit?
3. Does recording **author(s)/contributors + required non-author reviewer** per assignment correctly surface the "every available reviewer contributed" limitation case?
4. Is the **merge-reach decision** framed correctly, and is the recommended standing merge-exception for the append-only coordination lane the right call — bearing in mind it needs Tracey's explicit sign-off?

**Independence note (please check honestly):** you and Tracey discussed this lane's concept; Verus authored the proposal doc. Discussing the concept is not coauthoring the artifact, so you remain a valid non-author reviewer — but if you consider yourself a contributor to its substance, hand this second artifact to **Aster** instead, per our own "if every available reviewer contributed, get a separate non-author" rule.

---

## For both

Record findings as **new** docs under `docs/team-drafts/` (e.g. `rev19-peer-review-lumin-…`, `squad-lane-review-…`); do not edit the artifacts in place. Distinguish what you inspected from what you actually executed (source vs. tests run vs. environment limits). Separate resolved conflicts, unresolved design choices, and code-implementation gaps. No code change, provider/model/key/spend action, or adversarial corpus is authorized by this review. Material changes in response return for review of the resulting revision.
