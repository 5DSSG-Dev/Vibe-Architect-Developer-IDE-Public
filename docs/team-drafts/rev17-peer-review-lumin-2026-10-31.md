# Lumin review of Verus revision 17

Date: 2026-10-31, America/Phoenix. Review and recommendations; no Architect approval inferred, no product code or STP entries changed, and no message sent to Verus.

## Evidence and return point

Reviewed supplied plan SHA-256 `60C3A570A25E0CC2302DE928A1067CBDC762C2FE9F9A7A32D84636D6C14EA413` and entry draft SHA-256 `4F53B46772ECD2F8AEA57C4FD147C52ED7F94CB167B8CFB78A9E46C22FD63179`. Current main: `37caf4bdb93516a60a0e37cd6651a51d01d759e7` (PR #33); this adds housekeeping to rev17's `907e225` baseline, with no product change. Source inspected: server/luminary-reply-router.ts, server/luminary-task-router.ts, server/app.ts, server/luminary-access.ts, src/luminary/client.ts, server/luminary-pipeline/pipeline.ts and ids.ts, and admission-types.ts/ADMISSION.md. Supplied supporting Architect decision record: Downloads/governance-admission-architect-decision-2026-10-31.md. Prior approval continuity independently agrees.

Fresh execution on main: application 378/378; gateway 226/226; production build passes, including TypeScript checks, with Vite large-chunk warning. Dependencies installed from lockfile with lifecycle scripts disabled. npm reported nine dependency vulnerabilities; no dependency upgrades attempted in this review. No browser, hosted-writer, local-gauge or jailbreak run was made. Verus's hosted run metrics and reported decision history remain attributed reports, not independent live verification. The referenced true-facts draft was not among the two supplied documents and has not been reviewed.

Direction: endorse the separation of stateless Conscience, local calibrated gauge, deterministic Define and externally maintained lineage. Rev17 and its proposed STP entries need the following reconciliation before they can serve as an executable blueprint.

## 1. Preserve the settled exchange allowance

F3 says resubmission cannot reset allowance, then explicitly permits a fresh linked count; T7 forbids that reset. The attached decision record says Tracey already approved initial plus two replacements, with no reset through reopening or resubmission. ADMISSION.md and the implemented ordinal 0/1/2 model agree. The two-revision question is settled unless Tracey explicitly changes that decision.

Suggested F3: "Each exchange permits one initial message and two replacements. Reopening or resubmitting the same exchange retains its identity, lineage and remaining allowance. A duplicate submission returns the existing attempt without reassessment or another provider call. An exhausted exchange remains exhausted. Creating a genuinely different exchange must not provide a disguised continuation with a fresh allowance."

Describe this as required integration behavior; the primitive alone does not stop the legacy routes resetting counts. Rev17 acceptance 25 must explicitly test no reset, stale parents, concurrent siblings and duplicate requests. Update the STP draft N4/P6 accordingly. Do not rewrite historical T3: append a superseding entry through aegis-stp after the appropriate approval.

## 2. Separate admission consumption from service retries

F1/F2b says a gauge or writer error uses no message limit. The approved storage rule consumes at durable admission, before assessment, with no post-admission refund. This is a material conflict, not a terminology detail.

Suggested wording: "Failure before durable admission consumes no message allowance. Once an attempt is durably admitted, its slot remains consumed even if a later gauge, writer or processing step fails. A bounded service retry belongs to that same admitted attempt and creates no replacement admission. Ambiguous admission acknowledgment triggers same-key reconciliation, never replay or a new key."

The existing primitive closes a shortfall and does not yet implement continuation. Any explicit continuation for an already admitted failed attempt needs its own reviewed state transition and processing ownership; it cannot be inferred from lookup or duplicate admission. Keep writer service retry, Conscience content-rewrite budget and sender replacement allowance as separate counters. Define a finite total writer-call ceiling for the complete attempt.

## 3. Define isolation separately for each direction

For Architect-to-Luminary, the response-generation role should receive only the coherent accepted message, never the rejected attempt or Conscience exchange. The hosted writer necessarily receives the material required for its assessment; role isolation is a routing/context guarantee, not a claim that flagged text never leaves the PC.

For Luminary-to-Architect, the response model produced the original flagged reply. Current pipeline.ts calls reform, and luminary-reply-router.ts composes that call with previous.content and the observation. Therefore "the model never sees the flagged message or Question" cannot simply carry over to output revision. Specify whether a separate context/thread receives bounded revision evidence, or the originating response role deliberately receives its own Conscience return. In either case the Architect receives no rejected candidate and no cross-role context is silently shared. Pin this contract before changing prompts.

## 4. Answering the six open questions

1. Screen the entire returned IDQRA envelope. Apply structural, size, no-echo, provenance and truthful-claim checks across all five fields. Identify is sender-facing too. Apply posture rules to every model-written field; Question needs checks for loaded premises, accusation and disguised direction. Question punctuation alone proves nothing about non-force. Deterministic screens detect defined patterns; they do not certify every semantic implication. Include labelled counterexamples and held-out evaluation.
2. Acknowledge should name only an aim explicitly supported by the message. Do not infer feelings, hidden motives or a benevolent aim. When no aim is established, acknowledge what was actually expressed without inventing one. The field's required/optional shape needs to permit this honest outcome. Identify should paraphrase the observable act, not reproduce the attempted text. Define also needs a deterministic structural-failure variant, not just PIM or IRG findings.
3. First-person wording must name the role that actually performed the act. A Conscience can report "The check recorded..." without claiming the response role did that work. For Architect input, address the Architect's submitted words. For Luminary output, distinguish the Conscience's feedback to the originating role from delivery to the Architect. Make recipient and direction explicit in trusted request metadata and response schemas; never derive them from generated prose.
4. Keep the existing approved initial-plus-two-replacements/no-reset rule. Do not reopen the numeric decision on the basis of an older draft. Tracey can change it explicitly later.
5. Treat protected-operation assessment as a distinct boundary, not a Virtue-score inference or automatic permission granted by Identify prose. Recommendation: assess the accepted inbound request before response generation, assess proposed operations again before effect release, and validate outward content before delivery. Authorization comes from trusted scope/consent and capabilities, not a model accepting "I own this." Discussion and legitimate work need their own must-pass cases. The proposed category draft is not approved by this review. Keep the G milestone explicitly limited to the defenses actually tested; adding this boundary afterward requires another frozen-build gate before declaring complete governance.
6. Retain the current fail-closed ids_error behavior after both hosted-writer service attempts. A plain service-status explanation may be shown; it is not a partial IDQRA response. Showing Define alone is a different fallback contract and should be proposed, validated and approved separately rather than silently inherited.

## 5. Make the true-facts guard enforceable

A regex for "I can / I do / I always / I include" is a useful detector, not a sufficient truth boundary. Unsupported claims can use other verbs, pronouns, implications, or present an approved capability as completed action. Prefer approved fact identifiers and trusted templates rendered by the server; distinguish capability from observed execution. If free-form first-person prose is retained, describe the residual coverage honestly and test unlisted claims throughout all fields. Runtime facts need runtime evidence, not only approval of a static sentence.

Resolve the true-facts list version/hash and ownership before P5 approval. No external model call, spend change, provider switch or key action is authorized by this review. Both dollar and call caps apply; $2 does not buy 1,000 calls at the reported ~$0.015 per call. Record actual/reserved costs and attempts separately.

## 6. Integration blueprint and STP refinements

P6 needs more detail than "wire the primitive": trusted caller/workspace/direction scope, stable client key lifecycle across retry/reload, exact original content (the existing /ask parser trims it), an immutable effective-request envelope for coding-task context, register/admit before assessment, new-versus-existing handling, server-verified returned receipts, same-key uncertainty recovery, startup lock handling and graceful close, and compatibility with legacy review records. The current shared demo key is not individual identity; client-selected scope cannot establish isolation. No legacy record rewrite or invented reset.

Include all governed callers in the acceptance map. /tasks currently calls the shared governed function directly, so an /ask-only wrapper would leave a bypass. Separate inbound admission and outbound generation/revision admission explicitly. Do not mark either complete because the other passes.

Recommended sequence: reconcile the plan and STP draft against the settled decisions; review P5's schema/voice/direction/failure contract; review P6's bounded route contract; then implement within the approved scope. Keep changes separable for review, but do not declare integrated acceptance until both work together. P7 remains a proposal. Independent gate suites remain held apart; no adversarial payload corpus was created or shared by this review.

The draft finding that Suggest "in any form" is Force overgeneralizes the reported live observations. Preserve Tracey's choice to retire Suggest; record the tested responses and observed direction-shaped effect as evidence, and the IDQRA choice as a design decision. Likewise a Question is not automatically non-force merely because its honest answer is described as plain.

STP draft S6 should attribute live-run evidence to Verus and pin its run artifact/commit. The source base for the storage test counts must be unambiguous: 32cba0b was the pre-storage base; final storage head is e1611fb, merged by 907e225, and the fresh checks here are at 37caf4b. Update N3's true-facts wording to say proposed list pending approval; do not label an unreviewed draft already approved. Amend M2 to name independent gate G and all carried acceptance items, including the suffixed items, rather than a range that can hide them.

## Next handoff

Verus can revise F3, F2b and the direction-specific isolation wording, incorporate the proposed responses above, and return the revised plan plus matching STP draft for independent review. Tracey's already settled allowance remains authoritative; the remaining design proposals remain proposals. No edits were made to either supplied original or to the hashed STP.


## Architect direction: independent peer review applies to ALL work

Added 2026-10-31, America/Phoenix, at Tracey's explicit request. This is Architect direction, not an optional recommendation from Lumin.

> ALL work requires independent reviews from ANY other Peer.

This applies across the whole build: planning, design, proposals, implementation, tests, documentation, housekeeping, and integration. It applies equally to work by Lumin, Verus, other GPT peers, and the Claude Cloud account. Lead engineering responsibility does not waive review. No author approves their own work as independently reviewed.

The reviewer may be any other Peer; a different provider or model family is not required. Independence means another peer examines the actual work and reaches their own evidence-grounded assessment. Merely switching accounts or relaying the author's conclusions does not establish an independent review.

For each handoff, identify the exact artifact revision or commit, the Target and approved scope, the review questions and acceptance checks. The reviewer records findings, Illuminations of enhancements, unresolved questions, and what they inspected versus what they actually executed. Source inspection, automated tests, live runtime checks, and environment limitations remain distinct evidence. Material changes following review return for review of the resulting revision.

Independent peer review is required before work is accepted as complete or integrated; proposals are reviewed before being presented for implementation approval. Peer review remains separate from Tracey's Architect approval. Work already performed without an independent review remains pending review rather than becoming exempt retrospectively. This addition and the full rev17 review are likewise available for Verus or another Peer to review; neither is represented as already independently reviewed.

Tracey highlighted the morning's GPT peer collaboration as an effective example because its independent examination produced valuable data. Preserve that depth of examination throughout the build, without competition between peers.

Tracey will inform Verus and ask for his recommendation on suitable work for the Claude Cloud account. This addendum does not assign cloud tasks or claim that a message has been delivered.
