# Build and Run plan, revision 19: rev18 consolidated against both peers' reviews

Written by Claude (Verus), 2026-11-01, for independent cross-pair peer review and Tracey's approval. This revision consolidates the two independent reviews of rev18 — Lumin's (`rev18-peer-review-lumin-2026-10-31.md`) and Libra's (`rev18-peer-review-libra-2026-11-01.md`, which ran the gateway suite 226/226 and verified every rev18 structural claim against `main`). It **replaces the reconciled points of rev18**; rev16, rev17 and rev18 stay in this folder unchanged as the record.

**No code has changed.** This is a plan for review. Baseline: main `37caf4b`. Per the Architect direction and the squad configuration, this revision is itself pending its independent review — and because Verus authored it and Libra is Verus's pair, that independent review is **cross-pair: Lumin or Aster** (a non-author outside the Verus–Libra pair). Approval remains Tracey's separate decision.

**Public-repo caution:** this file is pushed to the public repository. It therefore references the protected-categories material only by pointer; the category names and patterns stay in the private draft, never in this plan or the STP draft.

---

## A. Both independent reviews recorded

- **Lumin (rev18):** rev18 resolves the plan-level contradictions and is ready for the cloud peer's design review; not yet an executable contract or implementation approval. Refinements folded below (writer-call ceiling, T4 supersession, directional leakage/allowed edges, cost ≈133).
- **Libra (rev18):** independent, code-grounded (inspected the routers/pipeline/`ids.ts`/admission primitive at `7605f3e`, which is byte-identical to main `37caf4b` for `server/` and `src/luminary/`; ran `npm ci` + `test:gateway` → 226/226). Verdict: no settled decision contradicted; every structural claim checks out against main; "close to an executable blueprint," with five named-but-unresolved contracts. Hosted-run metrics remain attributed to Verus, not reproduced.

Both reviews reached their conclusions independently; neither relayed the other's or the author's. rev19 adopts the corrections, carries the design recommendations for Tracey's approval, and leaves genuinely open decisions marked as such.

## 1. Single counting authority after wiring (Libra I-2)

rev18 kept three *separate* counters correctly, but did not say which counter is authoritative once P6 wires the admission primitive. Counting runs live today in `ReviewRecord.loop` (`server/governance-record/review.ts`, ordinal 0/1/2), while P6 introduces the admission primitive's **own** 0/1/2 ordinal as "the counting authority." Two independent counters can diverge.

**rev19 pins:** after wiring, the **admission primitive's ordinal is the single source of truth** for the replacement allowance. `ReviewRecord.loop` is **derived from the admission record** (or retired in its favour) — never maintained as a second independent count that must be "kept in sync." A reviewed migration note covers existing review records (no legacy rewrite, no invented reset; the derived value reproduces the recorded history). Acceptance gains an explicit single-counter check (below).

## 2. The total writer-call ceiling made explicit (Lumin + Libra I-1)

rev18 asserted a finite ceiling "is defined" without a value or formula, and did not count the **separate inbound Architect-gate writer calls** (`gateArchitectMessage` invokes the writer when the Architect's own message is incoherent — a different call path from the outbound Conscience write).

**rev19 states the ceiling as a formula**, bound to the existing config constants, and counts both call paths on separate ledgers:

- **Per Conscience response** (one governed generation): `writer_calls ≤ 1 (initial IDQRA write) + R (field-rewrites) + S (service-retries)`, where `R` = the IDQRA field-rewrite budget (today `SUGGEST_REWRITE_LIMIT = 2`) and `S` = **one shared** bounded service-retry for that response (today the single `retryUsed` in `runIds`). The service-retry is a single shared budget for the response, **not** applied per field. With today's constants the per-response ceiling is `1 + 2 + 1 = 4`.
- **Per exchange:** an exchange admits at most one initial + two replacements (allowance `A = 3` message-instances). Outbound Conscience writer calls over the exchange are therefore `≤ A × (per-response ceiling)` only for messages that require a response; this bound is an upper envelope, not an expectation.
- **Inbound Architect-gate writer calls are counted on their own ledger**, one bounded write (plus its single service-retry) per inbound message that fails the gate — never folded into the outbound per-response ceiling.
- The exact constants are read from config at build time; the acceptance test asserts the **measured** writer-call count across a full exchange never exceeds this formula on either ledger. The dollar and call caps (§6) still bind independently of this structural ceiling.

## 3. Luminary→Architect isolation mechanism — recommendation for Tracey (rev18 §3 open item)

rev18 named two permissible mechanisms and left the choice open. Both reviewers asked for a concrete recommendation with tradeoffs. **Recommended (for Tracey to settle by walking the flow, not adopted here):** the **originating response role receives its own Conscience return** in a bounded revision context, rather than standing up a separate thread.

- **Why:** it preserves the stateless-Conscience model and reuses the path that already exists — `luminary-reply-router.ts:303` composes the revision from the role's *own* previous reply, the original prompt and the observation (`ids.ts:222-239`). The Conscience's first-person return is additional bounded evidence to that same role, which already lawfully sees its own prior output.
- **The hard guarantee that must hold either way:** the revision context carries **only** the Conscience's bounded evidence about the role's own output — never the Architect's rejected inbound text, never cross-role material — and the **Architect receives only the final accepted output**, never a rejected candidate.
- **Tradeoff vs. the separate-context option:** lower complexity and no new thread lifecycle, at the cost of keeping the response role's revision prompt disciplined (the bounded-evidence rule above is the thing a reviewer must check). The separate-context option isolates more strongly but adds a thread/state surface. Flagged for Tracey; this is safety-critical and gets walked step by step before any prompt change.

## 4. Acknowledge's shape when no aim is established — recommendation (rev18 §4.2 open item)

**Recommended:** Acknowledge is **structurally always present** (the envelope screen requires the field), but its content is conditional: when the message supports an **explicitly stated** aim, Acknowledge names that aim; when no aim is established, it acknowledges **what was actually expressed** — the observable content — and **invents no motive, feeling, or benevolent aim**. This keeps the five-field envelope uniform for the deterministic screen while honoring the "no inferred motive" rule. Carried for approval.

## 5. True-facts and protected-categories drafts — traceability (Lumin + Libra I-4 / Q4-b)

Both reviewers could only review the *contract around* the true-facts guard, because `luminary-true-facts-draft-2026-10-31.md` is **not in the repository**. rev19 resolves the traceability, honoring the public-repo caution:

- The **true-facts draft** is committed to `docs/team-drafts/` (it carries no sensitive patterns) **or**, if kept out, is cited by exact private location + SHA-256 so a reviewer can locate and hash-match it. Its version/hash and ownership are resolved before P5 approval, as rev18 already required.
- The **protected-categories boundary draft (P7)** stays **out of the public repo**. It is supplied to a reviewer privately and cited by SHA-256 only. P7 remains a proposal with its own frozen-build gate if adopted; nothing here approves it.

## 6. Cost caps — precision (Libra Q6)

- `$2 ÷ ~$0.015 ≈ 133` whole calls (rev18's "~137" is corrected to ~133); neither figure is a purchasable guarantee, so reserved-vs-actual accounting still governs.
- The `$2 / 1,000-call` pairing in earlier drafts was a **demo illustration, not a code default.** Code defaults are `DEFAULT_META_SPEND_CAP_USD = 0.25` and `DEFAULT_META_MAX_CALLS = 2` (smoke), with live use driven by `LUMINARY_META_CEILING_USD`. **The demo must bind its intended caps explicitly** and record the numbers it sets; the ledger records reserved and actual separately (`luminary-meta.ts:62-79, 127-133`).

## 7. STP alignment (Lumin §4 + Libra I-3) — see the STP rev19 draft

- **Supersede T4 as well as T3.** rev18's STP superseded T3's fresh-count reading; the existing STP **T4** ("gauge/IDS failures use no limit") also conflicts with F2b/T9 and gets its own superseding append, so the STP carries one operative rule.
- **Fix S10 wording:** the Luminary revision is composed in the **router's injected reform callback**, not in `pipeline.ts` (which only calls `reform(observation, reply)` at `pipeline.ts:169`). The STP S10 text is corrected to match rev18 §3's precise attribution.
- **Draft ids:** P5/P6/P7 are draft identifiers, allocated and hash-validated through `aegis-stp` only when approved entries are written — not live hashed entries to edit now. N6 pins the **actual** hosted-run artifact/commit rather than asserting it is pinned.

## Acceptance evidence (rev19 additions)

Carries all rev16/17/18 items. Adds/sharpens:

- **25 (durable counting):** now also names an explicit **"disguised continuation"** case (Libra I-5) — a genuinely different exchange must not obtain a fresh allowance — alongside no-reset, stale parents, concurrent siblings, duplicate requests, admission-before-assessment, same-key recovery, and both `/ask` and `/tasks`.
- **27 (single counting authority), new:** after wiring, exactly one authoritative counter governs the allowance; `ReviewRecord.loop` is derived from (or replaced by) the admission ordinal; a forced-divergence test cannot produce two disagreeing counts.
- **28 (writer-call ceiling), new:** measured writer calls over a full exchange never exceed the §2 formula, on **both** the outbound Conscience ledger and the inbound Architect-gate ledger; timeout and reservation-release paths are exercised.

## Still open for the cross-pair reviewer and Tracey

- **Tracey to settle** (recommendations given, §3 and §4): the Luminary→Architect isolation mechanism, and Acknowledge's shape when no aim is established.
- **Reviewer (Lumin or Aster) to examine:** the counting-authority pin (§1), the writer-call formula including the Architect-gate ledger (§2), the STP T4 supersession and S10 fix (§7), and the true-facts traceability (§5).
- P7 placement/categories stay out of scope for approval; `/ask` parser change to preserve exact original content stays a P6 contract.
