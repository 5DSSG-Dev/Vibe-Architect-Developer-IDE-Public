# Vibe Luminary inclusion review and hackathon continuity baseline

Date: 2026-10-20 (America/Phoenix)
Status: Initial source-grounded review and proposed inclusion architecture. Implementation not started.
Baseline: 714920c03174fa9145b1c251f474a83dd1dd896b on totem/ide-c-0012-threeruntime-adoption-scope.

## Architect direction recorded this turn

The Vibe Luminary is the focal point for the upcoming Meta Hackathon and will replace the unworked Buildmaster concept in this IDE. Begin by reviewing the two Luminary drafts and preparing their inclusion, then review the build section by section. Maintain the associated Folder Totems as work proceeds. This is user direction; it supersedes treating Buildmaster as the future assistant product concept. It does not mean the replacement is implemented or that every mechanism named in the drafts has been approved.

Preserve these seven review sections in the Architect's order:

1. UI Flow and Design
2. 3D Element Setup and Function
3. UX Operability
4. Documentation
5. POD Architecture Engineering
6. AI Integration & Luminary Presence
7. Governance and Alignment

These are the initial review framework, not a claim that each section has been audited. Cross-cutting dependencies should be linked between Totems rather than forced into one owner.

## Documents inspected

- docs/VIBE_LUMINARY_BEHAVIOR_CONTRACT_v0.1.md: presence, voice, offers, Architect control, collaborative snippet drafting. Draft co-created with Verus; not implementation evidence.
- docs/VIBE_LUMINARY_ROLE_AND_ENGINEERING_DRAFT_v0.1.md: Advisor/Lead Engineer role, delegated work, evidence, continuity, provider adapter, Education Module and acceptance cases. Proposal with open architecture choices.
- docs/AEGIS Vibe Architect Developers Kit AI Luminary Specs.md: inspected as conceptual lineage; its sovereign-peer language does not silently override the two newer drafts or this turn's direction.

The two primary drafts are preserved without wording changes. Their compatible core is capable engineering assistance, Architect control, honest evidence, transparent context, Education and Illumination, and no invented model/tool results.

## Reconciliation needed before implementation

| Topic | Evidence and consequence | Proposed resolution; not yet accepted |
| --- | --- | --- |
| Advice versus execution | Behavior sections 2/5 say 'never acts', drafts/snippets, Architect acceptance; engineering sections 3/5/6/10 include authorized tool work. A literal implementation could be either inert or over-permissive. | No unsolicited mutation. Support explicit proposal-only and authorized-task modes; accepted changes flow through a scoped executor with receipts. Routine steps can use existing task authorization. |
| Paused observation | Behavior sections 1-3 describe observation, stuck-signal offers, and learning; engineering section 11 disables background observation unless separately enabled. | Paused presence does not imply observation permission. Keep observation/unsolicited offers off until explicitly enabled for a named coding scope. Define pause, silence, cancellation and observation as distinct controls. |
| Advice and voice | Behavior section 4 excludes 'should', 'must', alarms and verdicts; engineering section 4.2 permits direct instructions, strong recommendations and plain warnings. | Preserve non-commanding tone while stating technical constraints and actual test failures plainly. Separate evaluation of code from judgment of the Architect. Architect resolves exact voice contract. |
| Role and naming | Standalone Steward/context provider versus Advisor/Lead Engineer; conceptual outline uses sovereign-peer framing. | Use one Luminary product role and explain Steward as advisory posture. Specify capabilities separately. Do not connect this IDE role to private Lumin/Verus continuity by assumption. |
| Personal adaptation | Behavior dial learns from acceptance/dismissal; engineering sections 7/8 require visible, correctable observations and personal deletion controls. | Session-only adaptation first; durable personal adaptation opt-in and separately removable. Do not store personal content in immutable project Totems. |
| Education scope | Engineering section 13.1 proposes addable Guided Sessions and contextual Q&A; schedules its demonstration separately from baseline release. | Keep both in the inclusion map. Select one contextual learning path for the first demo; packaging and one Guided Session remain explicit scope decisions, not dropped requirements. |

Do not infer stuckness, mood or ability from a stall alone. If offers are later enabled, define permitted event sources, explicit task/domain scope, confidence policy, frequency caps, dismissal behavior, data retention and acceptance checks. The approximate 15-second bubble lifetime is a draft interaction parameter, not a measured requirement.

## Current integration evidence

- src/main.tsx chooses main IDE and protected admin routes. No dedicated Luminary route is present in inspected routing.
- src/App.tsx mounts RightPanel only for DESIGN with environmentStack.length === 0. A Luminary hosted solely there disappears in CODE and element environments.
- src/components/RightPanel.tsx: Build Master Inspector Deck; handleSynthesizeIntent uses setTimeout, string matching over the catalog and fixed fallback items. This is a deterministic search/mock flow, not live AI inference. Hard-coded readiness/handshake percentages must not become Luminary activity evidence.
- src/components/WorkRequestPanel.tsx and src/engine/workRequestRuntime.ts: bounded document.markdown.compose capability creates an in-memory artifact, computes/verifies evidence and supports explicit download. This is real deterministic work, not a general source editor, model integration or filesystem executor. Its local-architect approval strings are not server authorization proof.
- .github/agents/BuildMasters.agent.md is an unimplemented custom-agent template. Replacing the product concept does not require deleting this historical file during review.
- server/app.ts already separates protected evidence, capability and native-starter routes. Existing authorization and CSRF mechanisms are integration references, not automatic permission to expose model or project-write endpoints.
- No Luminary reasoning endpoint/provider invocation was found in the inspected active frontend/server paths. Full Form animation, paused offers, personal adaptation, learning workspace and Luminary continuity UI remain proposed.

## Proposed inclusion architecture

Decision status: Proposed. Architect direction accepts the Luminary focus and Buildmaster replacement, not every architecture option below.

Options considered:
- Rename RightPanel: smallest UI change, but retains DESIGN-only placement and would misrepresent deterministic search as AI.
- Add an application-level Luminary host and reuse bounded artifact/evidence contracts where suitable: recommended basis for section review. Keeps presence stable across workspace modes while giving the executor and provider separate responsibilities.
- Replace the IDE with a full multi-agent/native organization: broad scope and dependent on unproven integrations; defer from first demonstration.

Recommended seams to examine section by section:
1. App-level presence host: Full Form / Paused Icon, focus restoration, keyboard access, reduced motion, visible stop/cancel. Keep ordinary loading/error/provider activity distinct from the two visual presence scales.
2. Context selection: active task, selected source/artifact, explicit allowed files, source version/hash and budget. Show what will be sent. A selection is context, not tool authorization.
3. Server-side provider adapter: genuine model request/response, declared provider, bounded cost/context, cancellation and truthful unavailability. Provider/Meta API details and competition rules need separate current verification when selected; this review performs no provider setup or model call.
4. Proposal and execution boundary: reviewable artifact/diff plus an authorized supported action. Reuse Work Request evidence concepts only where contracts fit; do not claim arbitrary code edits from the current Markdown actuator.
5. Project continuity: attributed append-only decisions/shortfalls with current views and source references; personal preferences/progress stored separately with inspection/correction/deletion controls.
6. Learning return point: Explore this concept -> contextual Q&A -> Return to project, preserving source snapshot and task anchor. Imported Guided Sessions are instructional content, never execution authority.
7. Governance evidence: distinguish model suggestion, authorization, actual executor receipt, check result and retained record. Canon source/edition selection remains open. Native execution gates remain unchanged.

## Seven-section review map

| Section | Initial source targets | Luminary inclusion questions / completion evidence |
| --- | --- | --- |
| UI Flow and Design | src/App.tsx; Header, Footer, RightPanel, LeftDrawer; docs/design | Presence across modes/drill-down; task/context/learning return flow; discoverable controls and demonstrated navigation. |
| 3D Element Setup and Function | src/three; ThreeCanvas, EnvironmentView; src/utils; model assets | Selection-to-context identifiers; real taxonomy and relationships; motion budget; demonstrable element interactions. Emblem asset approval remains open. |
| UX Operability | src/components; src/admin/ui; existing interaction tests | Keyboard/focus, stop/cancel, unavailable state, pending actions, error recovery and truthful progress. |
| Documentation | docs and root doctrine/specs; Folder Totems | Reconcile draft conflicts with Architect decisions; document setup, source authority, actual demo behavior and limits; preserve historical lineage. |
| POD Architecture Engineering | src/engine; WorkRequestPanel; server evidence/capability paths; native references | Trace proposal -> authorized action -> artifact -> verification -> evidence; distinguish browser demonstration contracts from enforceable server authority. |
| AI Integration & Luminary Presence | proposed Luminary host/provider/context/continuity seams | Genuine model reasoning, chosen provider and data-sharing policy, resumable decisions, optional learning; receipts and honest outage handling. |
| Governance and Alignment | both Luminary drafts; Canon source decision; auth, evidence, continuity policy | Reconciled observation/initiative/voice parameters, project versus personal records, untrusted-context handling and adversarial workflow checks. |

## Proposed first complete hackathon workflow

Architect opens Luminary from a real project selection -> inspects permitted context -> asks for an engineering improvement -> genuine model supplies an evidence-grounded proposal -> Architect clarifies a design choice -> supported authorized action produces a useful artifact -> actual check results are shown -> approved project decision is recorded -> later session resumes from that decision. Contextual Q&A explains a relevant concept and returns to the originating work. Stop and model-unavailable cases are demonstrated honestly.

This is proposed scope. A bounded artifact is feasible with existing mechanisms; editing arbitrary project files requires additional executor design. Provider/funding, Canon edition, exact writable capability, retention design, observation preference and visual asset selection remain unresolved. These do not block the documentation/source review underway.

## Verification and next step

Read-only source tracing and cross-document comparison performed this turn. No runtime behavior changed; no test run is claimed for this documentation-only addition. Prior build/test results remain dated historical evidence in the audit review and Root Totem. No provider calls, keys, installs, deployments, native gate changes, commits or pushes.

Next section: UI Flow and Design, tracing the current journey and Luminary host placement while carrying these seven review categories forward. Work each section to a verified Totem entry; do not mark the whole repository reviewed from this first pass.
