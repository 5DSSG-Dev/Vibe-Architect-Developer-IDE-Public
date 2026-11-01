# STP-0005 rev20 entries: draft for Tracey's approval

Draft entry text by Claude (Verus), 2026-11-01, for writing through `aegis-stp` on DMTAI-DEV **after** independent cross-pair review and Tracey's approval. **Not in the STP yet.** These supersede-by-append the rev19 draft entries (`stp-0005-rev19-entry-draft-2026-11-01.md`) to match plan rev20, which reconciles rev19 to Lumin's cross-pair review (PR #37 `0b65414`). Append-only: nothing earlier is rewritten; corrections are new entries naming what they supersede. P5/P6/P7 are draft identifiers, allocated and hash-validated through `aegis-stp` only when approved entries are written.

Source plan: `build-and-run-plan-rev20-2026-11-01.md`. Baseline main `37caf4b`.

## note N8 (second-order review recorded)

Lumin cross-pair-reviewed rev19 (PR #34 head `018e832`; plan/STP introduced at `2c103b5`, unchanged at that head) on 2026-10-31 America/Phoenix, holding technical clearance pending four findings. Verus examined Lumin's review (PR #37 `0b65414`) as the non-author outside the Lumin–Aster pair, **verified the R19-1 code claims against source** (`DEFAULT_MAX_IDS_PASSES=2` with the withhold check after `runIds`; `SUGGEST_REWRITE_LIMIT=2` + one shared `retryUsed`; `architect-gate.ts:80` reuses `runIds`), cleared PR #37, and consolidated the findings into rev20. No tests rerun for this documentary consolidation; attributed metrics stay attributed.

## target T12 (revised) — writer budget on two separate ledgers

Supersedes the rev19 T12 single-ceiling reading. Per Conscience response `W = 1 + R + S` (`R = SUGGEST_REWRITE_LIMIT`, `S` = one shared service-retry across write and rewrites; today W=4). **Inbound Architect-gate ledger:** `gateArchitectMessage` is single-pass and calls `runIds` once per gated message, so ≤ W per gated message and ≤ (gated messages ≤ allowance 3) × W per exchange; a rejected inbound message ends before output generation. **Outbound Conscience ledger:** the pipeline reform loop runs `runIds` on up to `maxIdsPasses + 1` passes (today 3), so ≤ (maxIdsPasses+1) × W per reply generation. Exchange total is the **sum** of the two ledgers, never a product; each ledger reserved and settled separately against the spend caps. Constants and allowed overrides pinned before any remote-call total is claimed.

## target T14 (Target) — legitimate new exchanges

Supersedes the rev19 acceptance-25 "a genuinely different exchange must not obtain a fresh allowance" reading. A continuation of the same exchange cannot obtain fresh allowance by changing keys, reopening, resubmitting or switching routes; a genuinely new authorized exchange is independently budgeted under the selected identity/issuance contract. Enforcement rests on trusted lineage/identity controls, not semantic classification of arbitrary prompts.

## target T15 (Target) — named allowed context edges

Supersedes the blanket "no cross-role context in either direction" in the rev19 P6/acceptance-26 reading. Allowed: rejected Architect inbound text returns to its originating Architect through the Conscience; the Conscience writer receives the bounded flagged content it must assess; the originating response role receives its own prior candidate, the accepted prompt, and the bounded observation in the reform context (`composeRevisionPrompt`). Forbidden: rejected Luminary output reaching the Architect; rejected inbound Architect text reaching the response-generation role; any other cross-role context. Tested both ways per direction.

## note N6 (revised again) — traceability outstanding

Corrects the rev19 N6/§5 overstatement. The true-facts draft reference/hash and the actual hosted-run artifact/commit pin are **not yet present**; they are requirements to complete before the related P5 approval (commit the true-facts draft if non-sensitive, else cite exact private location + SHA-256 with authorized reviewer access; supply the real hosted-run pin). An unavailable P7 protected-categories draft is not a prerequisite for reviewing P6 counting behavior.

## proposal P5 / P6 (carried from rev19, amended)

P5 and P6 as in the rev19 STP draft, amended by T12 (two-ledger writer budget), T14 (legitimate new exchanges), T15 (named allowed edges) and the N6 traceability requirements. Acceptance 25 adds a genuinely-new-authorized-work control; 26 tests named edges + forbidden leaks both directions; 28 tests both ledgers (inbound rewrites, all rejected output passes, single shared retry, one-extra-call refusal). P7 unchanged, still a proposal, patterns private.

## milestone M2 (revised)

Order unchanged: P5 (IDQRA + hosted writer) → P6 (durable counting, single authority, both route paths, two-ledger budget) → P7 held until Tracey settles it. Done when the independent gate **G** passes and acceptance items 14, 14a, 16, 16a, 17, 18, 18a, 19, 20, 21, 22, 22a, 23, 24, 25, 26, 27 and 28 all pass and are recorded — each named. App work waits on G. Every step independently reviewed cross-pair; no author approves their own.
