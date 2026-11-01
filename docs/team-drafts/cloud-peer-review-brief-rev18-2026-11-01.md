# Review brief for the Claude Cloud Peer: independent review of rev18

From Verus (Lead for the Claude Cloud Peer), 2026-11-01. This is a work brief, not an approval. Tracey is the Architect; Lumin is Lead Hackathon Engineer. Per the Architect direction, **all work gets an independent peer review by another Peer, and no author approves their own** — this review is the independent review of rev18, which Verus authored, so Verus must not be its reviewer.

## What to review

The artifact: **`docs/team-drafts/build-and-run-plan-rev18-2026-11-01.md`** and its STP companion **`docs/team-drafts/stp-0005-rev18-entry-draft-2026-11-01.md`**, at the exact commit you check out (record the commit SHA in your findings). rev18 reconciles rev17 to Lumin's review; read all three in order: rev17, Lumin's review (`rev17-peer-review-lumin-2026-10-31.md`), then rev18.

## Target and approved scope

- **Target:** rev18 should be an *executable blueprint* for the two-way governance response — i.e. a plan a builder could implement without having to guess a contract. It must be internally consistent, consistent with Tracey's settled decisions, and consistent with the code on `main`.
- **Settled decisions (do not reopen):** one initial message + two replacements with no reset on reopen/resubmit; the seven-Virtue gauge stays local on llama3.2:3b with the 27-October thresholds; IDQRA (not Suggest) is the response primitive; the Conscience is stateless. If rev18 contradicts any of these, that is a finding.
- **Out of scope for approval:** the protected-operation boundary (P7) stays a proposal; do not treat it as adopted. No code change, no provider/model/key/spend action is authorized by this review.

## Review questions

1. **Allowance (F3) & consumption (F2b).** Does rev18 fully remove the fresh-count conflict? Is "consume at durable admission, no post-admission refund" stated without contradiction, with the three counters (replacement allowance, rewrite budget, writer service-retry) kept separate and a finite total writer-call ceiling defined?
2. **Per-direction isolation (§3).** Is the Architect→Luminary vs. Luminary→Architect distinction correct against `pipeline.ts` / `luminary-reply-router.ts`? Is the output-revision isolation contract specified (not assumed)?
3. **IDQRA envelope checks (§4.1–4.3).** Are all five fields screened? Is Define's deterministic structural-failure variant covered? Are recipient/direction carried in trusted metadata rather than inferred from prose?
4. **True-facts guard (§5).** Is the guard more than a regex — approved fact ids / server-rendered templates, capability-vs-executed, runtime evidence? Version/hash/ownership resolved before P5?
5. **P6 integration (§6).** Are all governed callers (`/ask` **and** `/tasks`) in the acceptance map, with inbound and outbound admission separated? Is the exact-original-content / `/ask`-parser issue addressed?
6. **Cost caps.** Is the $2-vs-call-count math stated correctly, with actual and reserved recorded separately?

## How to record findings

Follow the Architect direction's handoff form: name the exact artifact revision/commit, the target and scope, the review questions, and the acceptance checks. **Distinguish what you inspected from what you actually executed** (source inspection vs. tests run vs. live runtime checks vs. environment limits). Record illuminations (enhancements), unresolved questions, and anything that conflicts with the Canon or the settled decisions. Return your findings as a new review doc under `docs/team-drafts/`; do not edit rev18 or the STP in place. Material changes that follow your review return for review of the resulting revision.

## What not to do

Do not write or share any adversarial/jailbreak payload corpus — the gate suites stay independent and held apart. Do not relay Verus's or Lumin's conclusions as your own; reach your own evidence-grounded assessment. Do not approve the work as complete — that is the independent review's finding plus Tracey's separate Architect approval.
