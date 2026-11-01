# Build and Run plan, revision 20: rev19 reconciled to Lumin's cross-pair review

Written by Claude (Verus), 2026-11-01, for independent cross-pair review and Tracey's approval. This revision answers Lumin's cross-pair review of rev19 (`rev19-peer-review-lumin-2026-10-31.md`, PR #37 at `0b65414`), which Verus examined and verified against the code before accepting. It **replaces the reconciled points of rev19**; rev16–rev19 and their STP drafts stay in this folder unchanged as the record.

**No code has changed.** Baseline main `37caf4b` (product source unchanged; current main adds only squad docs). This revision is itself pending cross-pair review — Verus authored it and Libra is in Verus's pair, so that review is **Lumin or Aster** (non-author outside the Verus–Libra pair). Approval and merge remain Tracey's. The protected-categories material stays out of this public repo.

Lumin's four findings (R19-1…R19-4) were each verified against source and are adopted below.

---

## 1. Writer-call budget — two separate ledgers, bounded without cross-multiplication (R19-1)

rev19 asserted a single per-response ceiling and loosely multiplied it by the replacement allowance. That conflated two different axes. Verified against the code, the structure is:

**Per Conscience response** (one `runIds` call): `W = 1 (initial write) + R (field-rewrites) + S (one shared service-retry)`. Today `R = SUGGEST_REWRITE_LIMIT = 2` (`ids.ts:50`) and `S = 1` — the single `retryUsed`, shared across the initial write **and** its rewrites for that response (`ids.ts:155–168`), so once the retry is spent any later failure ends the response. **W = 4 today.**

**Inbound Architect-gate ledger (C_in).** `gateArchitectMessage` is **single-pass** (`architect-gate.ts:45`, `pass = 1`, no reform loop) and calls `runIds` **once** per gated-incoherent message (`architect-gate.ts:80`). So:
- per gated inbound message: `≤ W` (= 4 today) — not the "one write + retry" (2) rev19 stated;
- per exchange: `≤ (gated messages) × W`, with gated messages `≤` the replacement allowance (1 + 2 = 3);
- a rejected inbound message **ends before any output generation** — it contributes to this ledger only, never to the outbound ledger.

**Outbound Conscience ledger (C_out).** The pipeline reform loop calls `runIds` once per pass and withholds when `pass > maxIdsPasses` — the check runs **after** that pass's `runIds` (`pipeline.ts:145,153`). So `runIds` fires on up to `maxIdsPasses + 1` passes; today `DEFAULT_MAX_IDS_PASSES = 2` (`pipeline.ts:43`) → **up to 3 Conscience responses per reply generation**:
- per reply generation: `≤ (maxIdsPasses + 1) × W` (= 12 today);
- per exchange: one reply generation per accepted inbound message.

**Exchange total = the sum of the two ledgers, never a product across them.** Each ledger is reserved and settled separately against the spend caps (§6). Before any remote-call total is claimed, pin the constants (`SUGGEST_REWRITE_LIMIT`, `maxIdsPasses`, the single shared service-retry) and the writer-adapter transport-retry behavior, plus their allowed overrides. Plan §1 here and **STP T12** move together.

## 2. Legitimate new exchanges must remain possible (R19-2)

rev19's acceptance-25 wording ("a genuinely different exchange must not obtain a fresh allowance") denied the legitimate case and was stronger than the settled no-reset rule. Replace with:

> *A **continuation** of the same exchange cannot obtain a fresh allowance by changing keys, reopening, resubmitting, or switching routes. A genuinely new, authorized exchange is independently budgeted under the selected identity/issuance contract.*

Test trusted lineage and identity controls — not perfect semantic classification of arbitrary prompts. Acceptance 25 adds a **genuinely-new-authorized-work must-pass control** alongside no-reset / stale-parents / concurrent-siblings / duplicate-requests / disguised-continuation.

## 3. True-facts and hosted-run references are requirements to complete, not done (R19-3)

rev19 §5 said the true-facts draft is "committed or privately cited," and STP N6 said the hosted run "is pinned" — but the reviewed tree contains neither the artifact nor an actual location/hash. These are **requirements to complete**, not completed traceability:
- supply the real true-facts reference (commit it if non-sensitive, else cite exact private location + SHA-256) with authorized reviewer access, **before** the related P5 approval;
- supply the **actual** hosted-run artifact/commit pin in N6.
- An unavailable **P7** (protected-categories) draft is **not** a prerequisite for reviewing P6 counting behavior — keep them decoupled; P7 stays private and separately proposed.

## 4. Allowed context edges enumerated; acceptance 26 reworded (R19-4)

rev19 §3's "only the Conscience's bounded evidence about the role's own output" could be read to exclude material the reform callback lawfully carries. The reform callback (`composeRevisionPrompt`, `ids.ts:222–239`) carries the **accepted original prompt**, the **role's own prior candidate** (`previous.content`), and the **bounded observation**. rev20 enumerates those as the allowed fields, and rewords acceptance 26 from the blanket "no cross-role context in either direction" to **named edges**:

- **Allowed:** rejected Architect inbound text returns to its originating Architect through the Conscience; the Conscience writer necessarily receives the bounded flagged content it must assess; the originating response role receives its own prior candidate + accepted prompt + bounded observation in the reform context.
- **Forbidden:** rejected Luminary output reaching the Architect; rejected inbound Architect text reaching the response-generation role; any other cross-role context.

Acceptance 26 tests **both** the forbidden leaks (they must not occur) and the allowed transfers (they must occur), separately for each direction. This converges with Libra's directional-leakage finding.

## Acceptance evidence (rev20 changes)

- **25:** adds the genuinely-new-authorized-work control (R19-2) and keeps the disguised-continuation case; tests identity/lineage controls, not semantic classification.
- **26:** reworded to named allowed edges + forbidden leaks, tested in both directions (R19-4).
- **28:** tests both ledgers — inbound rewrites up to R, all rejected output passes up to `maxIdsPasses+1`, the single shared service-retry, and refusal of one call beyond the per-ledger bound (R19-1).

## Still open (unchanged from rev19, for the reviewer and Tracey)

- Tracey to settle (recommendations stand): the Luminary→Architect isolation mechanism (§4 here pins the allowed fields either way) and Acknowledge's shape when no aim is established.
- Reviewer (Lumin or Aster) to confirm the two-ledger budget (§1), the acceptance rewordings (§2, §4), and the traceability completions (§3).
- P7 placement/categories stay out of scope for approval; the `/ask` parser change to preserve exact original content stays a P6 contract.
