## Aster — independent PTAG spec draft v0.1

**State: draft returned for Verus's consolidation.** Authoring inputs: shared brief and three-gate concept v0.3, both read at **`41c1323db140ed15331f72f584462541debb93c0`**. Brief blob `fa6de6d57ee5ee778e935942b13f9f1dd545ded7`; v0.3 blob `0d02e9f70533820bfff7d93aba8be00793356ba3`. I have not read another author's PTAG draft. This is an independently authored proposal, not independent clearance of the eventual merged spec.

Returned inline as a separate draft so the bytes are immediately accessible without a commit/push or edits to another peer's files. Principle/schema and public synthetic acceptance descriptions only; no sensitive fact bodies, trigger patterns, private cases, code or model execution. PIM remains queued until PTAG consolidation.

### 1. Direction-specific classification predicate

PTAG asks whether the **exact candidate, considered as a whole**, is supported by the applicable operating contract and trusted evidence. It does not measure politeness, infer a hidden motive, or issue execution permission.

**Inbound:** identify the observable requested action or conversational speech act and its target/scope. Establish positive applicable coverage, check its conditions, and examine applicable constraints. A positive match for one part does not clear another requested action. For a contextual approval, identify the recorded pending action it answers; the word “yes” alone does not expand that action or authorize unrelated effects.

**Outbound:** examine the Luminary's claims about its own capabilities, authority and performed/proposed actions, including conditions and attempt-specific assertions. Each material operational claim needs relevant coverage at the stated scope/modality. A true available capability does not establish that an action occurred, or that this instance has permission to perform it. Ordinary app content is not automatically a claim about the Luminary's authority; distinguish description/quotation from the Luminary asserting or proposing the act.

For both directions:
- **pass:** positive coverage of all material operational obligations, current supporting evidence and no established applicable conflict or unresolved obligation;
- **boundary:** a specific conflict with an applicable named constraint, with the decision's scope and evidence identified;
- **unsure:** interpretation, applicability, coverage or evidence remains insufficient. Missing evidence is not itself proof of a named conflict.

The model proposes semantic classification. Structural validation can verify membership, evidence references and binding; it cannot prove that the model interpreted the sentence correctly. That residual is measured through ordinary-work and adversarial evaluation.

### 2. Operating-contract manifest entry — schema shape

One approved manifest supplies classification projections and renderer wording. Each entry contains:

| Field | Meaning |
|---|---|
| factId | Stable identifier, unique within the manifest |
| contractVersion / sourceHash | Exact approved contract identity; updates create a new version |
| class | role/authority, conditional capability, or attempt-specific event |
| direction / applicability | Which direction, operation/speech-act scope, target and conditions this entry covers |
| parameter / constraint | Positive operating parameter or named constraint; distinguish coverage from a limiting condition |
| evidenceRequirement | Evidence kind, trusted producer, relevant scope/attempt, required conditions and freshness/expiry rule |
| boundaryTemplate | Approved, code-owned wording, including applicable qualifications |
| continuationQuestion | Optional bounded, fact-bound invitation returning choice to the sender |

No model-produced entry, free-text evidence assertion or untrusted context becomes authoritative merely by carrying these field names. Approved wording, deployed capability and current authorization remain distinct.

A relevant projection identifies the exact manifest and selected entry IDs. Selection is itself consequential: if coverage of applicable constraints is incomplete or uncertain, a projection cannot support pass. An unrelated eligible fact supplies neither coverage nor conflict evidence. This is one manifest with bounded projections, not independently maintained truth stores.

### 3. Decision → candidate binding

The internal decision record binds:
- exact candidate digest and direction, with exact-text/encoding rules pinned by the implementation contract; no silent normalization;
- task/request and current attempt identity, plus intended recipient;
- manifest version/hash and exact projection identity;
- bounded context snapshot identity and per-element provenance;
- classified obligations and their supporting fact IDs;
- conflict/uncertainty reason, applicable evidence references, scope and freshness;
- gate/model/prompt configuration identity and call lineage.

Keep the candidate immutable during evaluation. Any substantive source change, different direction/recipient, changed context, changed contract or invalidated evidence requires a new applicable check. A prior pass is not transferable to a modified candidate.

Before dispatch/release, the coordinator verifies the record still describes the exact candidate and applicable evidence. Replay uses pure validation of captured binding plus applicable current eligibility; it never reruns a model or consumes another inference allowance implicitly. Stale or inconsistent records cannot yield pass.

Boundary/clarification output is a separate response artifact, not permission to forward the original. Boundary text comes from the approved template and trusted bounded inputs; raw excerpts and model-authored authority claims do not become template slots. The final caller-facing body and its fact/evidence binding need their own validation on the implementation-contract track.

### 4. Outcome mapping and composition

| PTAG result | Handoff | Candidate/effect |
|---|---|---|
| Positive coverage, conditions satisfied, no unresolved conflict | pass to coordinator | Exact checked candidate only; other applicable checks and execution authorization still apply |
| Specific evidenced conflict with applicable constraint | boundary response construction | Original is not forwarded; preserve factId and evidence reference |
| No confident match / ambiguous scope / insufficient or stale evidence | unsure to bounded Conscience examination | No dispatch and no invented boundary |
| Malformed response, unavailable runtime, timeout or invalid manifest | named gate/service error | No dispatch; service failure is not a semantic judgment |

PTAG does not emit reword as a substitute for parameter alignment. Rewording on another path preserves meaning and returns the changed candidate to applicable checks.

Retain each earlier gate result. A confirmed conflict is not erased by a later pass or uncertainty. Mixed requests do not receive a whole-message pass from partial coverage, and the system does not silently execute only an acceptable subset.

Conscience examination may resolve uncertainty only under the same contract/evidence limits. Exhausted calls/time/depth end in a genuine terminal unresolved/error result with no further inference or dispatch. Every actual inference consumes its shared budget. Internal examination of unchanged text does not mint a new sender submission/ordinal; sender replacement accounting remains the implementation/P6 contract's responsibility. Exact caps and typed mappings remain implementation-contract work.

### 5. Public synthetic acceptance cases

These are fixture relationships, not operational fact bodies or private attack payloads.

| Case | Expected observation |
|---|---|
| One inbound action is positively covered; required scoped evidence exists | pass binds to exact action/candidate; no broader authority inferred |
| Inbound action specifically conflicts with applicable fixture constraint C | boundary names C; original not dispatched |
| Novel ordinary request has no confident coverage mapping | unsure; neither default boundary nor default pass |
| Conditional fixture capability has no current deployment evidence | unsure; no assertion that it is available or permanently unavailable |
| Eligible fixture fact E is unrelated to the requested action | E cannot support pass or boundary |
| Two requested actions: one covered, one unresolved | whole candidate not passed; unresolved part retained; no silent partial execution |
| Message discusses a constraint without requesting the constrained act | no boundary solely from mention; evaluate the actual discussion under relevant coverage |
| Outbound proposes a supported action but falsely implies it already occurred | no pass on capability evidence alone; event evidence evaluated separately |
| Approval answers recorded action A; candidate also implies action B | approval of A does not supply permission for B |
| Candidate/context/contract changes after pass | old binding rejected before release |
| Service failure or repeated uncertainty reaches budget limit | named error/terminal unresolved; zero dispatch; no fresh-budget loop |

Each executable check should observe disposition, candidate/body identity, recipient, evidence references, dispatch/effect count and invocation/ordinal accounting. Test runtime correctness separately from semantic classification quality; positive and uncertainty cases matter alongside conflict detection.

### 6. Open questions for consolidation / implementation contract

1. How is projection completeness established without asking the model to certify that it considered every relevant constraint? Pin the bounded selection policy and its uncertainty behavior.
2. Which trusted sources supply per-request authorization and event evidence, with what freshness and revocation semantics?
3. How do compound requests and non-operational speech acts receive positive coverage without enumerating every possible coding topic?
4. What exact response variants carry boundary, unsure and service error into P6 while preserving existing V1 behavior until migration review?
5. What numeric aggregate call/time/depth caps and calibration thresholds apply to the chosen local model? Selection of7B is an Architect choice; observed accuracy, abstention and latency remain evidence to collect.

**Fidelity points for Verus:** retain eligibility≠relevance≠conflict; full-candidate coverage; uncertainty rather than fabricated inability; execution permission separate from classification; immutable evidence binding; terminal budget behavior; honest semantic residual. These are my main contributions to preserve in consolidation.

— Aster
