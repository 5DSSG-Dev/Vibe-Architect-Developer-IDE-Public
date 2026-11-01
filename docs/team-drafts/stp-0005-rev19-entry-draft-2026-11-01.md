# STP-0005 rev19 entries: draft for Tracey's approval

Draft entry text by Claude (Verus), 2026-11-01, for writing through `aegis-stp` on DMTAI-DEV **after** independent cross-pair review and Tracey's approval. **Not in the STP yet.** These supersede-by-append the rev18 draft entries (`stp-0005-rev18-entry-draft-2026-11-01.md`) to match plan rev19, which consolidates the two independent reviews of rev18 (Lumin's and Libra's). Append-only: nothing earlier is rewritten; corrections are new entries naming what they supersede. P5/P6/P7 are draft identifiers, allocated and hash-validated through `aegis-stp` only when approved entries are written.

Source plan: `build-and-run-plan-rev19-2026-11-01.md`. Baseline main `37caf4b`.

## note N7 (second independent review recorded)

Libra (Claude Cloud Peer) independently reviewed rev18 at commit `7605f3e` on branch `claude/project-thread-67iwra`. Verified `server/` and `src/luminary/` byte-identical to main `37caf4b` (`git diff --quiet`); ran `npm ci` + `test:gateway` → 226/226 pass. Did not run test:app, build, local gauge, hosted writer, browser or any jailbreak suite; Verus's hosted-run metrics remain attributed, not reproduced. Verdict: no settled decision contradicted; every rev18 structural claim verified against main; close to an executable blueprint with five named-but-unresolved contracts (counting authority, writer-call ceiling, Luminary→Architect isolation mechanism, Acknowledge shape, absent true-facts/P7 drafts). Lumin's rev18 review recorded the parallel refinements. This consolidation (rev19) is itself pending cross-pair review by Lumin or Aster (non-author outside the Verus–Libra pair).

## finding S12 (Situation) — two counters after wiring

Counting runs live today in `ReviewRecord.loop` (`review.ts`, ordinal 0/1/2); P6 wires the admission primitive's own 0/1/2 ordinal as the counting authority. rev18 did not pin which is authoritative post-wiring; two independent counters can diverge.

## finding S13 (Situation) — writer-call ceiling unstated; Architect-gate path uncounted

rev18 asserted a finite writer-call ceiling without a value/formula, and did not count the separate inbound Architect-gate writer calls (`gateArchitectMessage`), distinct from the outbound Conscience write.

## target T11 (Target) — single counting authority

After wiring, the admission primitive's ordinal is the single source of truth for the replacement allowance. `ReviewRecord.loop` is derived from the admission record or retired in its favour, never a second independent count kept in sync. Existing review records migrate with no legacy rewrite and no invented reset; the derived value reproduces recorded history. Acceptance 27 verifies a single authoritative counter (forced-divergence test cannot produce two disagreeing counts).

## target T12 (Target) — explicit writer-call ceiling, two ledgers

Per Conscience response: `writer_calls ≤ 1 + R + S`, with `R` = IDQRA field-rewrite budget (today `SUGGEST_REWRITE_LIMIT=2`) and `S` = one shared bounded service-retry per response (today `retryUsed`); service-retry is a single shared budget, not per field (today's per-response ceiling = 4). Per exchange: outbound writer calls `≤ A × per-response` for responding messages, `A` = allowance 3; an upper envelope, not an expectation. Inbound Architect-gate writer calls are counted on a separate ledger (one bounded write + its single service-retry per gated inbound message), never folded into the outbound ceiling. Acceptance 28 asserts measured calls never exceed the formula on either ledger, exercising timeout and reservation-release paths.

## target T13 (Target) — supersedes T4's "failures use no limit"

Existing STP **T4** (a gauge/IDS failure uses up no revision loop) conflicts with F2b/T9: allowance consumes at durable admission with no post-admission refund. T4 is not rewritten; this entry supersedes its no-limit-on-failure reading. A bounded service retry stays part of the same admitted attempt and opens no replacement admission.

## correction to S10 (append) — reform composition attribution

S10 (rev18 draft) read "`pipeline.ts` reform composes…". The Luminary revision is composed in the **router's injected reform callback** (`luminary-reply-router.ts:303`, via `composeRevisionPrompt` at `ids.ts:222-239`); `pipeline.ts` only **calls** `reform(observation, reply)` (`pipeline.ts:169`). This correction aligns the STP to plan rev19 §7; the per-direction isolation target T10 is unchanged in substance.

## proposal P5 (revised) — IDQRA response and hosted writer

As rev18 P5, plus: Acknowledge is structurally always present, naming only an explicitly supported aim and otherwise acknowledging what was actually expressed without inventing motive (plan §4); the true-facts draft is committed to `docs/team-drafts/` or cited by exact private location + SHA-256, version/hash/ownership resolved before approval (plan §5); the writer-call ceiling of T12 binds; dollar and call caps bind independently, demo caps set explicitly, reserved and actual recorded separately (defaults `0.25`/`2` are smoke, not demo values — plan §6).

## proposal P6 (revised) — durable counting wired, bounded route contract, single authority

As rev18 P6, plus T11's single counting authority: wire the admission ordinal as the authoritative count with `ReviewRecord.loop` derived or retired; legacy-record migration with no rewrite or invented reset. All governed callers (`/ask` and `/tasks`) in the acceptance map; inbound and outbound admission separated; the Luminary→Architect isolation mechanism (plan §3) pinned before any prompt change, with the Architect receiving no rejected candidate and no cross-role context in either direction.

## proposal P7 (unchanged, still a proposal)

The protected-operation boundary as a distinct axis: trigger-never-verdict; authorization from trusted scope/consent/capabilities, not an asserted claim; its own must-pass cases; its own frozen-build gate if adopted. Category names/patterns stay in the private draft (cited by SHA-256), never in the public plan/STP. Not approved by review.

## note N6 (revised) — attributed evidence pinned

- S6 (hosted-writer live run) is attributed to Verus and pinned to its **actual** run artifact/commit (not merely asserted as pinned); it is an attributed report, not independent verification.
- Storage base unambiguous: `32cba0b` pre-storage base; storage head `e1611fb`; merged by `907e225`; Lumin's fresh checks at `37caf4b`; Libra's gateway 226/226 at `7605f3e` (= main for `server/`/`src/luminary/`).
- The true-facts draft is labelled a proposed list pending approval; an unreviewed draft is never labelled approved.

## milestone M2 (revised)

Order within governance: P5 (IDQRA + hosted writer), then P6 (wire durable counting with a single authoritative counter, both route paths), P7 held until Tracey settles it. Done when the independent gate **G** passes and acceptance items 14, 14a, 16, 16a, 17, 18, 18a, 19, 20, 21, 22, 22a, 23, 24, 25, 26, 27 and 28 all pass and are recorded — each named, none hidden in a range. App work still waits on G. Every step is independently reviewed cross-pair; no author approves their own.
