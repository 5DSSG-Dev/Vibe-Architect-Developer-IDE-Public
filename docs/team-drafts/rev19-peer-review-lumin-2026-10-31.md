# Rev19 — Lumin cross-pair review

2026-10-31 America/Phoenix. Reviewed PR34 head `018e832deb1567974563d97ca74294885a583218`; plan/STP rev19 introduced at2c103b5 and unchanged at this head. Source baseline37caf4b; current main78bd423 adds only reviewed squad documentation. Plan author Verus, reviewer Lumin outside the Verus–Libra pair. Prior review recommendations are disclosed; Lumin did not edit or coauthor this plan revision. This is technical review, not Architect approval.

## Evidence

Read rev19, its STP companion, squad proposal and cross-pair brief at018e832. Source parity between018e832 and37caf4b verified for server/ and src/. Inspected architect-gate.ts, pipeline.ts, ids.ts and admission/review contracts. No tests rerun, no browser/model/gauge/jailbreak execution. Historical gateway226 results remain tied to their previous runs. The cross-pair brief's7264d98 head has since advanced; this review is pinned to018e832.

## Resolved and supported

Admission ordinal as the sole replacement-count authority is sound; deriving a compatibility view rather than incrementing ReviewRecord.loop independently avoids divergence. Existing records remain append-only, and any legacy linkage must name provenance without fabricating missing admission events. STP T13 explicitly supersedes T4's no-consumption-on-failure clause. Router-versus-pipeline reform attribution is now precise. Cost133at the stated approximate unit price and explicit demo-versus-default caps are sound.

Recommend the originating response role receive its own bounded Conscience return, as proposed, with original accepted prompt, its own prior candidate and bounded observation enumerated as allowed fields. Do not silently include rejected Architect input, unrelated history or another caller's material. Recommend Acknowledge remain present but grounded in an expressed aim or observable content; test messages without an established aim. These are recommendations for Tracey's approval, not adopted contracts.

## Changes needed before clearance of the affected contracts

### R19-1 — writer budget dimensions and inbound rewrites

Per Conscience response1+R+S=4 matches current runIds atR2,S1: retryUsed is shared across the initial write and its rewrites for that response. The next two bullets do not yet define a consistent full bound. The inbound path calls the same runIds and can also request content rewrites; "one bounded write plus retry" omits R there. Outbound pipeline calls runIds before its terminal pass-limit check: at default maxIdsPasses2, one output-generation sequence can produce3Conscience responses, each up to4writer invocations, for a conservative source-level12. Sender input replacement allowance and output-candidate revision count need explicit, separately named exchange identities before multiplication.

Specify C_in/C_out=max reachable Conscience responses for the chosen scope; W=1+R+Sper response; then bound each direction and reachable path. A rejected inbound message ends before response generation, so do not simply add that rejection branch to an output-path maximum. If an exchange means the separately admitted output candidates, explicitly say so and map its identity. Include the terminal rejected candidate. Pin defaults, allowed overrides and writer adapter transport retry behavior before claiming a remote-call total. Acceptance28 should test rewritten inbound responses, all rejected output passes, single shared service retry, and one-extra-call refusal. Update plan§2 and STP T12 together.

### R19-2 — legitimate new exchanges must remain possible

Acceptance25 literally says "a genuinely different exchange must not obtain a fresh allowance." That denies the legitimate case and is stronger than the approved no-reset rule. Replace with: "A continuation of the same exchange cannot obtain fresh allowance by changing keys, reopening, resubmitting or switching routes. A genuinely new authorized exchange is independently budgeted under the selected identity/issuance contract." Test trusted lineage and identity controls; do not imply perfect semantic classification of arbitrary new prompts. Include genuinely new ordinary work as a must-pass control.

### R19-3 — documentary traceability is still pending

§5 says the true-facts draft is committed OR privately cited, but the reviewed tree contains neither that artifact nor an actual location/hash. STP N6 again says a hosted run is pinned to its actual artifact/commit without giving that pin. These are requirements to complete, not completed traceability. Supply the real references and authorized reviewer access before the related approval. P7 can remain private and separately proposed; no need to publish its contents. Do not make an unavailable P7 draft a prerequisite for reviewing unrelated P6 counting behavior.

### R19-4 — explicit allowed context edges and acceptance26

Rev19 inherits the blanket acceptance26 wording and STP P6 still says no cross-role context "in either direction." Rejected Architect input is intentionally returned to its original sender through the Conscience. The Conscience writer also necessarily sees bounded flagged content. Specify allowed sender returns and allowed originating-role reform evidence, while forbidding rejected output delivery and rejected inbound text reaching response generation. "Only the Conscience's bounded evidence" should not accidentally exclude the accepted original prompt and role's own prior reply that the recommended current callback includes.

## Architect sequencing

Tracey states that governance/coordination are the core build tasks now; the next major step is producing an actual coded app from the IDE, followed primarily by aesthetic refinement. Preserve that priority and demonstrate genuine generated files, a working executable/preview path, observable behavior, and saved/reopened project continuity for the next milestone. Existing source routes, plans or code-editor text alone do not establish that outcome. Runtime verification, independent review and submission checks remain part of delivery, not aesthetic work. Annex stays a separately scoped extension. No new app implementation approval or readiness claim is inferred from this sequencing note.

## Disposition

Rev19 advances the plan, but hold technical clearance for its writer-budget, continuation and isolation acceptance contracts pending these refinements. Verus should revise those precise points, return the resulting revision for cross-pair review, and present the named remaining choices for Tracey's approval. No source-plan, hashed STP or runtime was edited by this review.
