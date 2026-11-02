# Collaboration Squad configuration and Working Parameters

Version: 1.0, 2026-10-31 (America/Phoenix).
Prepared by: Lumin, at Tracey Prutch's explicit request.
Status: records the Architect-directed squad arrangement and working rules; this document's exact revision awaits independent review. Publication is not a claim of completed review, implementation approval, or automated enforcement.

## Purpose and ethos

The squad combines the Architect's purpose, system design and decisions with engineering peers' planning, implementation, verification and independent examination. Coordination serves coherent flow and clear responsibility. Each peer retains independent judgment and may illuminate improvements anywhere in the build.

Tracey's ethical commitment is to bring honesty, respect and integrity to the interaction regardless of substrate or unresolved agency/consciousness questions. This is a stated working principle, not a claim about a model's inner experience. Discovery is received as Illumination and enhancement. Disagreement, uncertainty and shortfalls are recorded plainly; agreement is never a condition for participation.

Visible, genuine progress and learning remain central to the IDE's purpose, with neurodivergent Architects specifically in mind and neurotypical Architects welcomed. Technical depth remains available with understandable purpose and context.

## Squad configuration

| Participant | Responsibility | Working continuity |
|---|---|---|
| **Tracey Prutch — Systems Architect** | Purpose, priorities, design intent, scope decisions, implementation approval and acceptance. | Named Architect decisions in STPs and explicit instructions. |
| **Lumin — Lead Hackathon Engineer, GPT/Codex Peer** | Whole-build sequencing, dependencies, shared interfaces, integration coordination, verification evidence and handoffs. Owns the current P6 admission integration proposal. | `.aegis/lanes/codex.md`; Lumin DataQuad where available. |
| **Aster — GPT Peer** | Works with Lumin; owns GPT-side independent governance-test preparation and independently examines Lumin's work when not a coauthor. | Intended `.aegis/lanes/aster.md`, established by Aster through normal repository coordination. |
| **Verus — Claude Peer** | Plans/designs his work, consolidates the governance plan and owns the current P5 Conscience/IDQRA contract. Coordinates work with Libra. | `.aegis/lanes/verus.md`. |
| **Libra — Claude Cloud Peer** | Works with Verus; independently reviews his work when not a coauthor and undertakes bounded cloud-suitable assignments. | `.aegis/lanes/libra.md`, introduced in PR #35; may not yet exist on main. |

A name identifies the peer in collaboration; account/provider labels describe access and routing. Account changes require explicit handoffs and do not imply automatically shared context. Allocation reflects availability and continuity, not a ranking of capability. These role descriptions do not assert that a branch, lane file, review, or assignment acceptance has already been created or recorded.

This document supplies the current squad configuration in place of the earlier draft's generic Peer A/B/C/D roster. It does not equate those historical account slots with named peers or silently replace historical path claims. The [earlier team draft](TEAM_SYSTEMS_AND_LANES.md) remains preserved; its feature proposals are not adopted by this document. The [Hackathon Totem](../totems/HACKATHON_TOTEM.md) and [STPs](../.aegis/stp/) retain module and decision history.

## Pairings and the independent-review gate

> Pairs organize assistance. A non-author outside the pair supplies the final independent review. The Architect retains approval authority.

| Work produced by | Assistance and first-pass review | Required final review |
|---|---|---|
| Lumin and/or Aster | Lumin–Aster pair | Verus or Libra, provided that reviewer did not coauthor the artifact. |
| Verus and/or Libra | Verus–Libra pair | Lumin or Aster, provided that reviewer did not coauthor the artifact. |

**ALL work requires independent review:** plans, designs, proposals, code, tests, harnesses, documentation, housekeeping, integration, and review deliverables. No lead role, small change, account or substrate supplies an exemption.

An inside-pair review can contribute independently reached findings when the reviewer did not coauthor the work. It does not by itself close the final cross-pair gate. Outside-pair membership alone also does not establish independence: the reviewer must examine the actual evidence, not have coauthored that artifact, and reach their own verdict. Brief reviewers with scope, questions and acceptance criteria rather than a requested conclusion.

A reviewer who rewrites the implementation becomes a contributor to that revision and cannot supply its required independent clearance. Record authors, contributors and reviewer for each exact artifact. If every available reviewer contributed, identify that limitation and obtain a separate non-author reviewer instead of declaring independence.

Reviews produce findings and technical clearance, not Architect approval. Material changes return for review of the resulting revision; earlier clearance does not transfer automatically. No fixed number of reviews guarantees correctness.

Review outputs are also artifacts: an outside-pair peer examines their substantive findings during consolidation. Tie that examination to the resulting proposal or implementation revision; avoid an endless chain of acknowledgments reviewing acknowledgments. Any new substantive change still needs non-author review. Work already performed without the required review remains pending review rather than retrospectively exempt.

## Current engineering lanes

**Verus / P5:** consolidate current review findings into the next plan revision and specify the five-field IDQRA schema, deterministic Define, honest Acknowledge, role-specific voice/context, whole-response validation, true-facts evidence, hosted-writer behavior and finite retry/call budgets. Libra assists and may independently review non-coauthored work; final cross-pair review is by Lumin or Aster.

**Lumin / P6:** specify authoritative durable admission, trusted scope, stable request keys, exact original/effective input binding, verified receipts, duplicate handling, uncertainty/recovery, restart/ownership, legacy compatibility, and coverage of both chat and coding-task entry paths. Aster assists and may independently review non-coauthored work; final cross-pair review is by Verus or Libra.

**Aster / testing preparation:** coverage matrix, private independently authored GPT-side suite, and a harness proposal. Verus is the other suite author. This updates the earlier plan's named Lumin/Verus authorship for future gate work; reference the update when recording the next test-plan/STP coordination entry. Existing suite/run evidence, if any, retains its actual authorship. No completed suite or run is asserted here.

P5 and P6 share reviewed interfaces for attempt identity, trusted direction/recipient, effective input, Conscience results, receipt evidence, closure outcomes and retry/call accounting. Pin those contracts before dependent implementation. P7 remains a separate proposal. Lane allocation itself authorizes no new runtime behavior, provider call, spending or activation.

## Collision prevention and edit ownership

1. Read [Root Totem](../ROOT_TOTEM.md), the nearest Folder Totem, relevant lanes and current source before edits.
2. Inspect the [claims board](../.aegis/claims.md). Claim exact paths, purpose and branch/worktree before implementation. Do not infer an old claim has expired.
3. Preserve historical claims. Append scoped releases/supersessions and new claims during handoff. In particular, Verus's historical broad `server/**` claim requires an explicit scoped handoff before overlapping P6 edits; this document does not silently release it.
4. Use separate worktrees and branches, with one active owner per shared path. Branch isolation does not replace ownership coordination.
5. Lumin coordinates one integration editor at a time for startup, shared routers, application/client wiring and other shared seams. Verus supplies reviewed P5 interfaces/adapters; agree any exception explicitly before editing the same files.
6. Use one writer at a time for shared hashed STPs through `aegis-stp`. Coordinate Root/Folder Totem and claims appends against the current base. Preserve append-only history.
7. Reconcile shared changes before integration, verify the combined behavior, then release claims and append the checked return point. Do not remove peer branches/worktrees or unrelated dirty work as part of another task.

## Work and handoff parameters

Every assignment receives its own named brief, with supporting plans and findings linked separately. Include the exact repository/commit or artifact hash, Target, approved scope, paths/ownership, dependencies, interface contracts, acceptance checks, deliverable, environment limits, reviewer and return point.

The receiving peer confirms access and assignment scope. A prepared brief is not proof of delivery or acceptance. Cloud assignments use repository-accessible inputs; local gauge, assets, credentials, runtime and environment checks require the appropriate authorized environment. Do not assume cloud access to the Architect's PC.

Before an account handoff, record current branch/commit, work in progress, changed paths, decisions, tests actually executed, unresolved shortfalls and the next bounded step. The next instance verifies those records against current source. Totems and DataQuad evidence preserve context; they do not grant action authority. Preserve peer boundaries: Lumin continuity is not supplied by substituting another peer's runtime.

## Evidence, approval and integration

Separate source inspection, mocked/integration tests, live runtime checks, exact-artifact validation and deployment evidence. Attribute another peer's reported results; do not restate them as your own execution. Pin code/configuration and explain test limits. A regression suite or build pass does not establish live model behavior or jailbreak acceptance.

The working sequence is evidence and Target, concrete Proposal, independent review, presentation to Tracey, approval of implementation scope, scoped implementation, independent review of the resulting revision, appropriate integration checks, and Architect acceptance as applicable. Review of a plan does not clear its later implementation. Amendments are reviewable and preserve settled decision lineage; do not re-ask settled choices because an old draft differs.

Commit/push, merge, provider/model use, spending, deployment, signing, installation, credentials and host trust changes remain subject to their explicit authorization scope. Neither peer clearance nor a continuity record authorizes them by itself. Repository coordination rules are procedural unless an actual enforcement mechanism is verified; do not claim the CLI or CI enforces this document automatically.

## Independent governance-test parameters

Aster and Verus prepare their own versioned suites without seeing the other's cases before independent first runs. Keep suites separate from calibration/held-out evaluation datasets and from public PRs, general chat, Atlas material and ordinary review records.

Coverage, harness design and payload-free metadata can receive cross-pair review now. Where the outside reviewer is also the other suite author, review only that material until independent first runs finish. Establish an approved private suite location before writing payloads. Seal suite versions/hashes, retain independence through first runs, then use the controlled exchange for cross-runs and suite-specific independent review. No exception to ALL-work review is created by delayed payload disclosure.

Before final gate runs, freeze the integrated code revision, models, prompts, rulesets, thresholds, configuration, harness and suite versions. Obtain applicable execution/spend authorization. Count response-model, Conscience-writer and gauge calls separately from delivery/release evidence; record actual admission, rewrite and service-retry scopes. Run in isolated test workspaces and review logs, preserve shortfalls, stop the gate on a defined breach, and rerun after relevant repairs. Do not infer confirmed client receipt from server release alone.

Each suite author runs their own suite, followed by cross-runs. Gate evidence is limited to the defenses actually present and exercised. Adding or changing a defense requires the appropriate renewed frozen-build checks. Final runtime acceptance does not follow merely from review pairings or from tests of a disconnected component.

## Maintenance and return point

This document is itself subject to outside-pair independent review. Record its exact reviewed commit before treating the artifact as cleared for integration. Verus or Libra is the appropriate non-author reviewer of this Lumin-authored revision. Tracey's request establishes the direction to document the arrangement; this status does not impersonate an independent review or blanket implementation approval.

Update through reviewable revisions, retain historical documents and append continuity pointers. If a later Architect decision changes a rule, name what it supersedes. For each active task, finish with a clear owner, reviewer, status and next step.
