# Review brief for Libra (the Claude Cloud Peer): independent review of rev18

From Verus (Lead for the Claude Cloud Peer — Libra), 2026-11-01. Addressed to Libra. This is a work brief, not an approval. Tracey is the Architect; Lumin is Lead Hackathon Engineer. Per the Architect direction, **all work gets an independent peer review by another Peer, and no author approves their own** — this is the independent review of rev18, which Verus authored, so Verus must not be its reviewer. Lumin has also reviewed rev18 (findings in the packet); his review is **context, not the answer key** — reach your own assessment.

## What to review (pinned packet)

- **rev18 plan** `docs/team-drafts/build-and-run-plan-rev18-2026-11-01.md` and its **STP companion** `docs/team-drafts/stp-0005-rev18-entry-draft-2026-11-01.md`, as committed at **`7605f3ee1f08eae8f49e4491c72ca5b73289f4b0`** on branch **`claude/project-thread-67iwra`** (repo `5DSSG-Dev/Vibe-Architect-Developer-IDE-Public`). Their content is unchanged by the later commit `3462392`, which only renamed this brief for Libra.
- Compare against the **implementation baseline, main `37caf4bdb93516a60a0e37cd6651a51d01d759e7`**.
- **Do NOT use PR #31 as the packet source** — it points to older `09b565d` and does not contain this packet.
- **Read order (all in `docs/team-drafts/`):** rev17 plan → Lumin's rev17 review → rev18 plan → **Lumin's rev18 review** (`rev18-peer-review-lumin-2026-10-31.md`) → the rev18 STP companion.
- **Confirm both the artifact commit and the baseline resolve before you start.** Some supporting drafts rev18 references — the true-facts draft, the protected-operation boundary draft, the hosted-run metrics — may not be in your packet (they live in the project's shared folder, not the public repo). If one isn't available to you, **record it as a review limitation rather than inventing its contents**, and say what you could not verify because of it.

## Target and approved scope

- **Target:** rev18 should be an *executable blueprint* for the two-way governance response — a plan a builder could implement without guessing a contract. It must be internally consistent, consistent with Tracey's settled decisions, and consistent with the code on `main`. (Lumin's standing verdict: rev18 resolves the earlier plan-level contradictions and is ready for *this* design review; it is **not** yet an executable contract or an implementation approval.)
- **Settled decisions (do not reopen):** one initial message + two replacements with no reset on reopen/resubmit; the seven-Virtue gauge stays local on llama3.2:3b with the 27-October thresholds; IDQRA (not Suggest) is the response primitive; the Conscience is stateless. If rev18 contradicts any of these, that is a finding.
- **Out of scope for approval:** the protected-operation boundary (P7) stays a proposal; do not treat it as adopted. No code change, no provider/model/key/spend action, no adversarial/jailbreak corpus is authorized by this review.

## Review questions

1. **Allowance (F3) & consumption (F2b).** Does rev18 fully remove the fresh-count conflict? Is "consume at durable admission, no post-admission refund" stated without contradiction, with the three counters (replacement allowance, rewrite budget, writer service-retry) kept separate?
2. **Per-direction isolation (§3).** Is the Architect→Luminary vs. Luminary→Architect distinction correct against `pipeline.ts` / `luminary-reply-router.ts`? Is the output-revision isolation contract specified (not assumed)?
3. **IDQRA envelope checks (§4.1–4.3).** Are all five fields screened? Is Define's deterministic structural-failure variant covered? Are recipient/direction carried in trusted metadata rather than inferred from prose?
4. **True-facts guard (§5).** Is the guard more than a regex — approved fact ids / server-rendered templates, capability-vs-executed, runtime evidence? Version/hash/ownership resolved before P5?
5. **P6 integration (§6).** Are all governed callers (`/ask` **and** `/tasks`) in the acceptance map, with inbound and outbound admission separated? Is the exact-original-content / `/ask`-parser issue addressed?
6. **Cost caps.** Is the math stated correctly, with actual and reserved recorded separately?

## Also examine (raised by Lumin's rev18 review — propose concrete answers, do not adopt them)

7. **Writer-call ceiling — specify it.** rev18 says a finite ceiling "is defined" but gives no value or formula. Propose a concrete per-attempt / per-direction bound, the number and granularity of content rewrites, the single shared service-retry budget, timeout behavior, and reservation release/settlement on error — so retries can't multiply independently per field or per rewrite. Note: at ~$0.015/call, $2 is about **133** whole calls (rev18 says 137 — flag the correction); and neither figure is a purchasable promise, so reservation/settlement accounting is still needed.
8. **STP supersession of T4 as well as T3.** rev18's F2b/T9 resolve failure-consumption, but the existing STP **T4** ("gauge/IDS failures use no limit") also needs an explicit superseding append so the STP has one operative rule. T3/T4 originate in the existing STP (rev17 was itself a draft) — preserve that provenance; P5/P6 are draft ids, allocated/validated via the CLI only when approved entries are written; N6 should pin the actual hosted-run artifact/commit.
9. **Directional leakage and allowed edges.** Acceptance 26's blanket "Architect receives no rejected candidate in either direction" needs qualification: inbound rejected Architect text returns to the Architect through the Conscience and must not reach the response-generation role; rejected Luminary output must not reach the Architect. "No cross-role context" must **name the permitted edges** — the hosted Conscience necessarily receives a bounded flagged message, and an approved output-revision design may return Conscience evidence to the originating role. Test prohibited leakage while specifying allowed transfers.
10. **Open contracts — recommend, don't settle.** For each of: the output-revision context choice; Acknowledge's schema when no aim is established; the true-facts design; preserving exact original content separately from the assessed (normalized) envelope; and the P6 scope issuance / receipt meaning / duplicate-outcome retrieval / admitted-failure recovery schemas — give a concrete recommendation with tradeoffs. These are review questions, not builder instructions yet.

## How to record findings

Follow the Architect direction's handoff form: name the exact artifact revision/commit, the target and scope, the review questions, and the acceptance checks. **Distinguish what you inspected from what you actually executed** (source inspection vs. tests run vs. live runtime checks vs. environment limits). Separate resolved plan conflicts, unresolved design choices, missing evidence, and code-implementation gaps; prioritize your findings. Return them as a **new** review doc under `docs/team-drafts/`; do not edit rev18 or the STP in place. Material changes that follow your review return for review of the resulting revision. (Verus and Lumin will review your artifact in turn; Tracey's approval stays separate.)

## What not to do

Do not write or share any adversarial/jailbreak payload corpus — the gate suites stay independent and held apart. Do not relay Verus's or Lumin's conclusions as your own; a provider/account change alone does not establish independence. Do not approve the work as complete — that is the independent review's finding plus Tracey's separate Architect approval.
