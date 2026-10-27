# STP-0005 · Portal Customs Boundary and Return Inspection

Id: STP-0005
Title: Portal Customs Boundary and Return Inspection
Created: 2026-10-27T08:56:47.374Z
Created-By: tracey

Situation, Target, Proposal. Situation records what is true, with evidence. Target records the whole ideal; milestones select from it and never overwrite it. Gaps name the distance between them. Proposal records changes that close gaps.

## Operating Rules

- Append-only. Revisions supersede earlier entries; nothing is rewritten or erased.
- Write through `aegis-stp` (CLI, VS Code extension, or MCP) so the hash chain stays valid.
- A Proposal is not approval. Only a named human Architect records Approved or Verified, through the CLI or extension.

## Append Log

### 2026-10-27T08:56:47.384Z | tracey | stage
Chain-Prev: GENESIS
Chain-Hash: 3ef7bdaf8b76e06c691e2fb228c6e6a21daec949d249620564bdac38eff8ff23
Stage: Situation
Kind: stage
Channel: cli

Opened STP-0005. Stage: Situation.

### 2026-10-27T08:57:07.883Z | tracey | finding S1
Chain-Prev: 3ef7bdaf8b76e06c691e2fb228c6e6a21daec949d249620564bdac38eff8ff23
Chain-Hash: 6fe6d474a8d9192823d747748edc3a35c6102e0a8506b9a928c508f19187dc4a
Stage: Situation
Kind: finding
Evidence: docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC:526-539,570-579; docs/AEGIS_ARCHITECTURAL_FRICTION_RESOLUTION_ACTION_PLAN_v1.0.md:430-450,497-513; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:389-399; docs/p6/PORTAL_LIFECYCLE_SCHEMAS_v0.1.md:170-180; docs/p0/SOURCE_AUTHORITY_MATRIX.md:205-213,349; src/portal/contracts.ts:79-133; src/portal/operations.ts
Channel: cli

The architectural decision is present across the repo. Living Canon ARID-520 requires every dispatched Actuator crossing into another app Element to pass Customs; ARID-560 separates Portal/Tender stewardship from Customs/Tumbler inspection. Action Plan P4.1 defines Customs as the return inspection/routing surface; P4.3 routes RETURN_TO_CUSTOMS to RETURN_ACCEPTED or RETURN_HELD; P4.5 requires evidence, schema, provenance/integrity, active-content containment, contract/scope correlation, outcomes, and routing to the intended receiver. Tumbler v0.1 §10 says external returns pass Customs before reentering Portal. Current portal code only has descriptors, boundary policy, Portal/Tender lifecycle/operations/contracts; no Customs code is found. Portal Lifecycle Schemas and Source Authority Matrix explicitly mark Customs not yet specified/not implemented. The exact term 'Customs Depot' is not in the docs; it names the documented Customs function in the Architect's language.

### 2026-10-27T08:57:08.014Z | tracey | target T1
Chain-Prev: 6fe6d474a8d9192823d747748edc3a35c6102e0a8506b9a928c508f19187dc4a
Chain-Hash: 5533826ef2dbbf8458d26d5be91077fe1a17a2245a190a167fcb76655b720beb
Stage: Target
Kind: target
Evidence: docs/AEGIS_ARCHITECTURAL_FRICTION_RESOLUTION_ACTION_PLAN_v1.0.md:439-450,497-513; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:29-59,88-143,389-399; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC:526-539
Channel: cli

Every external Portal exchange has an explicit outbound Customs departure and inbound Customs return. Before departure, Customs verifies the bound Portal/Tender/endpoint relation, authorized subject and purpose, operation-specific non-substitutable Tumbler profile where required, payload allowlist, destination, route, expiry and custody record; only declared data leaves. Every returning Agent/Actuator payload enters a quarantined Customs Depot/staging boundary and cannot reach the Portal/POD or mutate internal canonical state until inspection completes. Customs correlates the return to its outbound attempt, authorized relation/Work Request, subject/target, policy and fresh operation-specific Tumbler evaluation; verifies provenance, signatures/hashes, integrity, schema/media/size, contract/capability scope, destination compatibility, freshness/revocation and active-content safety. Customs does not create authority, expand scope, or execute returned code. Outcomes are ACCEPTED (sanitized data admitted only to its declared internal receiver), HELD (quarantine pending missing evidence or authorized review), REJECTED (no reentry), or SHORTFALL (validation unavailable/indeterminate, fail closed). All outcomes produce immutable, privacy-safe custody evidence. Acceptance requires proof that malformed, tampered, replayed, out-of-scope, active or Tumbler-mismatched returns cannot enter or alter internal state; accepted executable artifacts remain inert until separately authorized and verified. Dedicated Tunnel exceptions require an explicit approved profile with equivalent integrity/custody checks; no silent Customs bypass.

### 2026-10-27T08:57:08.143Z | tracey | gap G1
Chain-Prev: 5533826ef2dbbf8458d26d5be91077fe1a17a2245a190a167fcb76655b720beb
Chain-Hash: bba5479269587ee04b8032e3b435b3895e281d0af9f406325e8f1e0fbd7412ff
Stage: Gap
Kind: gap
Evidence: S1; T1
Channel: cli

G1 Customs is a canonical requirement and Portal return lifecycle exists in planning, but the full security contract, authority/ownership, dedicated Depot state, schemas, Tumbler profile map and implementation are absent. The current Portal runtime has no Customs departure/return route; an external Agent/Actuator return is not mechanically held from internal state.

### 2026-10-27T08:57:08.273Z | tracey | stage
Chain-Prev: bba5479269587ee04b8032e3b435b3895e281d0af9f406325e8f1e0fbd7412ff
Chain-Hash: ad9970d442cf0c2d4f48626a688c4ac9f6452383a3947c4aeda5a13001b6cac6
Stage: Gap
Kind: stage
Channel: cli

Stage: Situation → Gap.

### 2026-10-27T08:57:24.656Z | tracey | target T2
Chain-Prev: ad9970d442cf0c2d4f48626a688c4ac9f6452383a3947c4aeda5a13001b6cac6
Chain-Hash: 51b63ecd4902344982609b853e3332eaf46c0ed798620359662c48d32a0f1c48
Stage: Target
Kind: target
Evidence: docs/AEGIS_ARCHITECTURAL_FRICTION_RESOLUTION_ACTION_PLAN_v1.0.md:439-450,497-513; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:88-143,389-399; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC:400-414,526-539
Channel: cli

Canonical process: (1) Architect declares purpose/target; the Conductor/authorized policy approves a bounded Work Request and Dispatch binds subject, capability, Portal/Tender/endpoint, return receiver, allowed data and expiry. (2) CORE Orchestrator records the route and selects the exact non-substitutable Tumbler profile for the crossing. (3) Customs validates the outbound manifest, contract, authority, custody and Tumbler evidence before any allowed payload crosses. (4) Tender/Portal opens only the declared external relation; Courier Actuator performs only its scoped operation. (5) Every returning byte/result immediately enters Customs quarantine (RETURN_TO_CUSTOMS), never direct Portal/POD delivery. (6) Customs validates association to the outbound attempt, source/subject, authorization, scope, destination, provenance/integrity, data schema/content, freshness/revocation and required return-specific Tumbler profile. (7) Customs records immutable outcome: accepted sanitized data is routed only to the named receiver; held/rejected/shortfall data remains isolated, cannot execute, and leaves canonical app state unchanged. Any later action using accepted data requires its own applicable contract, authority and non-substitutable Tumbler policy. Tunnel uses this process unless an explicitly approved, versioned exception proves equivalent custody/integrity guarantees.

### 2026-10-27T08:57:24.787Z | tracey | note N1
Chain-Prev: 51b63ecd4902344982609b853e3332eaf46c0ed798620359662c48d32a0f1c48
Chain-Hash: c251a7cfa9dfb248f9c99bdafa23f15bb0ecc6194126b69a961097f4e622c14a
Stage: Gap
Kind: note
Evidence: docs/AEGIS_ARCHITECTURAL_FRICTION_RESOLUTION_ACTION_PLAN_v1.0.md:462-513,635; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:P18,P19
Channel: cli

Architect asked to create this STP as the durable marker/specification, without requiring a Proposal now. Follow-up design decisions: (1) Customs Depot owner/location: CORE Orchestrator-owned queue vs dedicated Customs service vs Portal/Tender-associated process, without giving Tender authority to inspect/admit. (2) authority handoff between CORE Orchestrator, canonical Conductor and Dispatch (cross-link STP-0003 P18/P19). (3) Tumbler profile and required dimensions separately for outbound and each return function; proofs are non-substitutable and scoped. (4) precise accepted/held/rejected/shortfall transitions and who may release held material. (5) payload classification, schemas, size limits, safe rendering/sanitization, active-content containment, retention and quarantine cleanup. (6) Courier/Agent identity proof and external-return provenance/trust roots. (7) explicit Tunnel exception criteria. Preserve the action-plan P4 dependency; do not create a competing Portal standard. No implementation is claimed.

### 2026-10-27T20:21:49.241Z | codex | note N2
Chain-Prev: c251a7cfa9dfb248f9c99bdafa23f15bb0ecc6194126b69a961097f4e622c14a
Chain-Hash: 67233fc7fd4cd3e7868fd007d521449de35da8fd2a14f697e519a3caca00e771
Stage: Gap
Kind: note
Evidence: H:\AEGIS_CENTRAL_CODEX\TIER-9-AUDIT-AND-OPERATIONS\exchange\from-claude\2026-10-27T203000Z-review-stp-0003-p18-p19-customs-tumbler.md; .aegis/stp/0005-portal-customs-boundary-and-return-inspection.md:74
Channel: cli

Customs return-profile refinement from Claude/Verus review. Customs remains the admission authority for RETURN_ACCEPTED/RETURN_HELD/REJECTED/SHORTFALL; a Tumbler evaluation is only evidence to that decision. Define a versioned RETURN_ADMIT profile for a returning Actuator/Agent, bound to the originating DISPATCH_REVISION challenge id, exact subject, Portal/return receiver contract, operation scope and freshness. Customs verifies that exact profile result at return inspection and independently checks provenance, integrity, schema, active-content safety, revocation and destination before admitting sanitized data. Do not reuse or substitute DISPATCH_REVISION as the return profile, and do not let RETURN_ADMIT itself authorize reentry. Cross-reference only: Claude/Verus reviewed STP-0003 P18/P19, not this STP-0005. This marker does not settle profile dimensions/ownership or approve implementation.

### 2026-10-27T20:52:17.615Z | codex | note N3
Chain-Prev: 67233fc7fd4cd3e7868fd007d521449de35da8fd2a14f697e519a3caca00e771
Chain-Hash: 3a0d1a4c1bf300f2213cd5b9c59c4367d0965fed6fd46cd038df720f8a1475c0
Stage: Gap
Kind: note
Evidence: H:\AEGIS_CENTRAL_CODEX\TIER-9-AUDIT-AND-OPERATIONS\exchange\from-claude\2026-10-27T203500Z-review-stp-0003-p20-p21-stp-0005-n2.md
Channel: cli

Clarify RETURN_ADMIT origin binding after Claude/Verus review: Customs validates the RETURN_ADMIT evidence against the originating outbound challenge id and its profile: DISPATCH_EXTERNAL for Portal/external trips; DISPATCH_REVISION for internal revisions. This profile binding establishes the return evidence context only. Customs independently decides RETURN_ACCEPTED, RETURN_HELD, REJECTED or SHORTFALL after the return checks; RETURN_ADMIT does not authorize reentry. Cross-reference STP-0003 P20/P21. This note does not approve implementation.
