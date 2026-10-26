# Source Authority Matrix v0.1

**Phase:** P0 — Meaning Freeze and Evidence Baseline
**Date:** 2026-08-17
**Status:** Proposed

---

## Purpose

For every concept that the Architectural Friction Resolution Action Plan touches, this matrix records the canonical definition, governing source, implementation source of truth, and unresolved questions. No implementation may begin from a conceptual image, historical label, or ambiguous term alone.

---

## 1. Identity and Continuity

### Identity Image / Identity Surface

| Field | Value |
|---|---|
| **Canonical definition** | A task-relative projection of identity-bearing evidence, composed of a Minimum Identity Kernel plus dynamically promoted records, Affect-with-Context, held tensions, omission references, and coverage measurements. |
| **Current governing source** | AEGIS VIBE Architect Living Development Environment Spec v1.0, Section: Continuity Module (Tensored Memory). Also referenced in Action Plan P1. |
| **Implementation source of truth** | **Not yet implemented.** The Image Manifest (`public/assets/AEGIS_IMAGE_MANIFEST.md`) references an "Identity Field Builder" (AE-04) whose output is an `IdentityImagePacket`, but no runtime code exists. |
| **Historical/conceptual sources** | Image Manifest AE-04 label "Identity Field Builder"; Living Dev Env Spec Continuity Module concept; concept art image files (see Visual Source Classification). |
| **Unresolved questions** | What are the authored contents of the Minimum Identity Kernel? What is the exact weighting function for dynamic identity promotion? Which identity coverage states permit which classes of reversible action? |
| **Prohibited routing authority** | No concept art image may establish identity serialization format. No UI label ("Identity Context" in `RightPanel.tsx`) may define runtime identity behavior. |

### Continuity Tensors / Current System Image

| Field | Value |
|---|---|
| **Canonical definition** | Four-channel tensor structure (PEER, PCT, NCT, SPINE) recording continuity state. Defined in the admin domain as `TensorChannel`. Current System Image is the live projection of POD operational state. |
| **Current governing source** | Admin domain contracts (`src/admin/domain/contracts.ts`); AEGIS Progressive Reasoning Mathematics v1.0; Living Dev Env Spec. |
| **Implementation source of truth** | `src/admin/domain/contracts.ts` — `TENSOR_CHANNELS`, `TensorChannel` type, `CanonicalPodContract.tensors` record with shape/dtype/axis_order/append_only per channel. Admin projection pipeline consumes these. |
| **Historical/conceptual sources** | Progressive Reasoning Mathematics formal definitions of tensor operations. |
| **Unresolved questions** | Are tensors materialized at runtime or are they currently replay-fixture data only? The admin domain reads them from a topology snapshot, but no runtime tensor write path exists. |
| **Prohibited routing authority** | Progressive Reasoning Mathematics defines the algebra. It does not define the storage implementation or the projection pipeline — those belong to the runtime and admin domain respectively. |

---

## 2. Governance Architecture

### Dispatch

| Field | Value |
|---|---|
| **Canonical definition** | The single coordination point for all authorized application work. All executable software change — normal development, Shortfall recovery, emergency repair, optimization, evolution — passes through Dispatch. |
| **Current governing source** | AEGIS Living Software Doctrine v1.0, Sections 9–10. |
| **Implementation source of truth** | **Not implemented as a functional system.** Referenced as a daemon flag (`activeDaemons.dispatch`) in `src/engine/simulationEngine.ts` UI. Visual concept art exists (`DISPATCHER_1GOLD.png`, `DISPATCHER_GOOD.png`). |
| **Historical/conceptual sources** | Concept art images of Dispatch. Living Software Doctrine chain-of-responsibility diagrams. |
| **Unresolved questions** | None at the definition level. Implementation is greenfield. |
| **Prohibited routing authority** | Concept art images cannot define Dispatch behavior. Simulation engine daemon flags are UI toggles, not operational contracts. |

### Conductor

| Field | Value |
|---|---|
| **Canonical definition** | The final layer of Responsibility before execution. Evaluates originating intent, requesting Element, current operational state, authority, contracts, dependencies, impact, evidence, reversibility, rollback state, Shortfall context, relation integrity, resources, chain of custody, and collateral effects. Authorization permits consideration; Conductor analysis determines whether the action is coherent and ready for execution. |
| **Current governing source** | AEGIS Living Software Doctrine v1.0, Section 11. |
| **Implementation source of truth** | **Not implemented as a functional system.** Referenced as a daemon flag (`activeDaemons.conductor`) in simulation engine. Living Dev Env Spec describes the Conductor role but no code exists. |
| **Historical/conceptual sources** | Living Software Doctrine Sections 11–12; Progressive Reasoning Mathematics coherence scoring. |
| **Unresolved questions** | None at the definition level. Implementation is greenfield. |
| **Prohibited routing authority** | No subsystem becomes exempt from Conductor analysis merely because it is trusted (Doctrine Section 11). |

### Architect Actuator

| Field | Value |
|---|---|
| **Canonical definition** | The Actuator responsible for implementation design within the authorized construction chain. Receives authorized Work Requests from Dispatch, produces implementation designs that feed the Constructor Actuator. |
| **Current governing source** | Action Plan P2 (Construction Verification Gate). Living Software Doctrine chain: Dispatch → Architect → Constructor → Conductor → Execution. |
| **Implementation source of truth** | **Not implemented.** PROBE and SEEKER agents (`.github/agents/`) are read-only reconnaissance Actuators. No write-capable Architect Actuator exists. |
| **Historical/conceptual sources** | Living Software Doctrine Section 12 chain-of-responsibility. |
| **Unresolved questions** | Is the Architect Actuator the same entity as the human Architect using the Canvas, or a distinct system component? The Doctrine uses "Architect" for both roles. |
| **Prohibited routing authority** | PROBE and SEEKER agent definitions do not define Architect Actuator behavior — they are explicitly read-only. |

### Constructor Actuator

| Field | Value |
|---|---|
| **Canonical definition** | The Actuator that performs authorized code construction. Receives designs from the Architect Actuator, produces implementation artifacts subject to the Construction Verification Gate. |
| **Current governing source** | Action Plan P2; Living Software Doctrine chain of responsibility. |
| **Implementation source of truth** | **Not implemented.** The Build Master agent stub (`BuildMasters.agent.md`) contains only the default GitHub agent template with no content. |
| **Historical/conceptual sources** | Implementation Plan 7-step pipeline (INTENT → SPEC → SCAFFOLD → IMPLEMENT → TEST → VALIDATE → REGISTER). Concept art `BUILDMASTER.png`. |
| **Unresolved questions** | None at the definition level. |
| **Prohibited routing authority** | `BUILDMASTER.png` is concept art and cannot define the Constructor pipeline. The empty `BuildMasters.agent.md` stub is not a specification. |

### QA

| Field | Value |
|---|---|
| **Canonical definition** | Independent verification that: the original Shortfall is resolved, the service performs its declared function, contracts remain valid, no unacceptable regression was introduced, and the service can safely return to operation. QA answers: "Is the Element actually healthy again?" |
| **Current governing source** | AEGIS Living Software Doctrine v1.0, Section 8 (QA custodial function). |
| **Implementation source of truth** | **Not implemented as a formal QA system.** Existing test suites (42 tests) provide partial verification. The documented "61/61" baseline from Service Admin Operations refers to a prior test count; current measured baseline is 42 passing (28 server + 14 browser). |
| **Historical/conceptual sources** | Service Admin Operations documented QA baseline. |
| **Unresolved questions** | Is the QA function a distinct runtime component or a verification pipeline that existing test infrastructure feeds? |
| **Prohibited routing authority** | Test pass counts are evidence, not QA system design. |

---

## 3. Surfaces and Interaction

### Admin Operations

| Field | Value |
|---|---|
| **Canonical definition** | Runtime and evidence observatory. Read-only observation view of POD operational state. No operational mutation. Requires authenticated access (Microsoft Entra, `service.operations.read` role). |
| **Current governing source** | `docs/SERVICE_ADMIN_OPERATIONS.md`; implemented in `src/admin/`. |
| **Implementation source of truth** | `src/admin/AdminOperationsApp.tsx` — read-only reducer-based app. `src/admin/domain/` — contracts, validation, mapper, message-flow definitions. `src/three/` — ThreeRuntime + SceneSystem architecture with exclusive write domains. `server/app.ts` — Entra auth enforcement. |
| **Historical/conceptual sources** | `docs/design/admin-message-flow-concept*.png` — design iteration images (v1, v2, v3). |
| **Unresolved questions** | None. This is the most mature and well-separated surface in the codebase. |
| **Prohibited routing authority** | Admin Operations may not mutate canonical POD state. This is enforced architecturally (no mutation APIs exist on the admin surface). |

### Architect Canvas (VIBE Architect 3D Canvas)

| Field | Value |
|---|---|
| **Canonical definition** | Interactive relational design surface. May express intent. May NOT directly mutate canonical POD state (per Action Plan P3). Currently implemented as the primary IDE workspace with 4 modes (DESIGN, CODE, SIMULATE, DEPLOY). |
| **Current governing source** | Living Dev Env Spec v1.0; Action Plan P3; `src/App.tsx` + `src/components/ThreeCanvas.tsx`. |
| **Implementation source of truth** | `src/components/ThreeCanvas.tsx` (1,452 lines, monolithic). `src/App.tsx` holds `CoreManifest` state. `src/engine/relationEngine.ts` defines domain types. Workspace persisted to localStorage. |
| **Historical/conceptual sources** | `IDE+FIELD.png`, `IDE_THE_WAY_I_WANT_IT.png` — conceptual design images. |
| **Unresolved questions** | The Canvas currently directly mutates React state (CoreManifest) through props. P3 requires refactoring to emit RelationalIntentEnvelopes through a unified authority seam. The gap between current architecture (direct state mutation) and target architecture (intent → authority → execution → state) is significant. |
| **Prohibited routing authority** | No Canvas gesture may mutate canonical state before authorization and execution (Action Plan P3.3). Concept art images cannot define Canvas behavior. |

---

## 4. Connection Types

### Umbilical

| Field | Value |
|---|---|
| **Canonical definition** | Primary bidirectional connection between any Element and the CORE. Crosses the CORE boundary. 9-step handshake. Governed by a RelationContract. |
| **Current governing source** | CORE Connection Standard v1.0, Section 2. |
| **Implementation source of truth** | `src/engine/connectionRuntime.ts` — handshake execution with mock checksums. `src/engine/relationEngine.ts` — `RelationContract` type definition. `src/engine/contractStore.ts` — in-memory contract ledger. |
| **Historical/conceptual sources** | Concept art: `UMBILICAL.png`, `UMBILICAL_AWESOME.png`, `UMBILICAL_AWESOME_QUAD.png`, `UMBILICAL_LONG.png`, `UMBILICAL_LONG_STRETCH.png`, `UMBILICAL_LONG_STRETCH2.png`. GLB model: `AEGIS_POD_CRYSTAL.glb` includes umbilical conduit geometry. |
| **Unresolved questions** | None at the definition level. Mock checksums need to be replaced with real cryptographic checksums. |
| **Prohibited routing authority** | Concept art does not define handshake protocol. |

### Tether

| Field | Value |
|---|---|
| **Canonical definition** | Bidirectional connection between a Satellite and its Host Orb. Crosses the Orb boundary. 5-step handshake. |
| **Current governing source** | CORE Connection Standard v1.0, Section 3. |
| **Implementation source of truth** | `src/engine/connectionRuntime.ts` — handshake execution. `src/engine/relationEngine.ts` — `SocketBinding.attachedSatellites`. |
| **Historical/conceptual sources** | Image Manifest CK-04 (Satellite-to-Versikon Attachment Stem). |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | None identified. |

### Mesh

| Field | Value |
|---|---|
| **Canonical definition** | Bidirectional connection between Satellites sharing a service. No CORE or Orb boundary crossed. 4-step handshake. |
| **Current governing source** | CORE Connection Standard v1.0, Section 4. |
| **Implementation source of truth** | `src/engine/connectionRuntime.ts` — handshake execution. |
| **Historical/conceptual sources** | None specific. |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | None identified. |

### Portal

| Field | Value |
|---|---|
| **Canonical definition** | Lawful relational gateway at an internal/external domain threshold. Boundary-crossing gateway for external relations. Not a connection type itself but the architectural element through which external connections are established. |
| **Current governing source** | CORE Element Catalog v1.0, Section 4 (External Connectors). Action Plan P4. Image Manifest CORE-05. |
| **Implementation source of truth** | `src/engine/relationEngine.ts` — `PortalPlacement` type (id, name, angleDeg). `src/admin/domain/contracts.ts` — `PortalProjection` (conceptual_portal with mode, scope, boundary, optional TenderProjection). Portals render in both Canvas and Admin 3D scenes. |
| **Historical/conceptual sources** | Concept art: `PORTAL.png`, `AEGIS_Portal_Prismatic_Iris_3D.png`. GLB models: `PORTAL.glb`. Video: `PORTAL.mp4`. |
| **Unresolved questions** | How does Portal relate to the three connection types? Is a Portal connection a fourth type, or does it use a distinct external-relation contract structure? (This is the P4 ADR decision.) |
| **Prohibited routing authority** | Concept art and GLB models define visual appearance only, not connection semantics. |

### Tender

| Field | Value |
|---|---|
| **Canonical definition** | Stationary Satellite of the Portal. Manifests and maintains the external relation surface. Does not travel or independently perform resource actions. |
| **Current governing source** | Action Plan P4.1. Image Manifest CORE-06. |
| **Implementation source of truth** | `src/admin/domain/contracts.ts` — `TenderProjection` (explicitly `canonical: false`, `projectionKind: 'conceptual_tender'`). Contains safeguards, evidence, status axes. Belongs to a Portal, never free-floating. |
| **Historical/conceptual sources** | Concept art: `TENDER.png`, `PORTAL_TENDER.png`, `AEGIS_Portal_Tender_3D.png`. GLB model: `PORTAL_TENDER.glb`. Service Admin Operations document references Tender language. |
| **Unresolved questions** | The TenderProjection is explicitly marked `canonical: false` — when does it become canonical? What are the specific safeguards it maintains? |
| **Prohibited routing authority** | Concept art showing articulated conduits does not define Tender runtime behavior. Service Admin Operations labels are observational, not definitional. |

### Wormhole

| Field | Value |
|---|---|
| **Canonical definition** | Bounded, relation-specific external transport manifested by the Tender. |
| **Current governing source** | Action Plan P4.1 (definition only). |
| **Implementation source of truth** | **Does not exist in the codebase.** Zero references in any source file. |
| **Historical/conceptual sources** | None. |
| **Unresolved questions** | Full lifecycle, contract structure, and relationship to Umbilical/Tether/Mesh must be defined. Is a Wormhole a new connection type or a Portal-specific transport profile? |
| **Prohibited routing authority** | N/A — nothing exists to prohibit. |

### Courier

| Field | Value |
|---|---|
| **Canonical definition** | Tender-summoned Actuator that performs authorized access or exchange with the docked resource. Authority ends at the declared exchange. Docking does not grant general resource access. |
| **Current governing source** | Action Plan P4.1, P4.4 (definition only). |
| **Implementation source of truth** | **Does not exist in the codebase.** Zero references in any source file. |
| **Historical/conceptual sources** | None. |
| **Unresolved questions** | Is Courier a specialization of an existing Actuator class, a Constructor/operational mode, or an explicitly named Actuator role beneath Tender? (Reserved decision #6 in the Action Plan.) |
| **Prohibited routing authority** | N/A. |

### Customs

| Field | Value |
|---|---|
| **Canonical definition** | Return inspection and routing surface before return enters the Portal/POD. |
| **Current governing source** | Action Plan P4.1, P4.5 (definition only). |
| **Implementation source of truth** | **Does not exist in the codebase.** |
| **Historical/conceptual sources** | None. |
| **Unresolved questions** | Full specification required. Which dedicated Tunnel returns bypass ordinary Customs routing and what equivalent integrity surface replaces it? (Reserved decision #7.) |
| **Prohibited routing authority** | N/A. |

### Dedicated Tunnel

| Field | Value |
|---|---|
| **Canonical definition** | Persistent, explicitly provisioned transport relation with lifecycle and routing distinct from an ordinary Wormhole exchange. Includes dedicated SSH tunnels. |
| **Current governing source** | Action Plan P4.1 (definition only). |
| **Implementation source of truth** | **Does not exist in the codebase.** |
| **Historical/conceptual sources** | None. |
| **Unresolved questions** | Full lifecycle (provision, mutual validation, health, key/tumbler rotation, degradation, suspension, recovery, closure) must be defined. |
| **Prohibited routing authority** | N/A. |

---

## 5. Custodial Architecture

### Annex

| Field | Value |
|---|---|
| **Canonical definition** | Custodial layer within the POD CORE. Functionally analogous to an immune system. Observes system health and coordinates recovery. Does not perform ordinary application work. Operationally independent of the Elements it protects. |
| **Current governing source** | AEGIS Living Software Doctrine v1.0, Sections 6–8. |
| **Implementation source of truth** | **Not implemented.** Referenced in Living Dev Env Spec. No source code exists. |
| **Historical/conceptual sources** | Living Software Doctrine custodial architecture diagrams. |
| **Unresolved questions** | None at the definition level. |
| **Prohibited routing authority** | The Annex may identify the cure. It does not manufacture code outside the application's established chain of custody (Doctrine Section 9). |

### QuarterMaster

| Field | Value |
|---|---|
| **Canonical definition** | Coordinator of custodial activity within the Annex. Receives Shortfalls, opens cases, maintains incident continuity, preserves evidence, coordinates Triage/Patch/Restore/QA, communicates required changes to Dispatch. Possesses custodial responsibility, not independent code-authoring authority. |
| **Current governing source** | AEGIS Living Software Doctrine v1.0, Section 7. |
| **Implementation source of truth** | **Not implemented.** |
| **Historical/conceptual sources** | Living Software Doctrine Section 7. |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | QuarterMaster does not independently introduce executable code. |

---

## 6. Elements and Construction

### Orbs (20 defined)

| Field | Value |
|---|---|
| **Canonical definition** | Primary capability units. Each docks to a CORE Umbilical socket and carries a distinct, self-contained function. |
| **Current governing source** | CORE Element Catalog v1.0, Section 1. |
| **Implementation source of truth** | **None implemented.** No `src/elements/` directory exists. The `ApothecaryItem` type in `src/engine/relationEngine.ts` provides the UI-facing type for element drag-and-drop, but no Orb runtime code exists. |
| **Historical/conceptual sources** | Concept art: `ORB*.png` variants, `QUAD_ORBS1.png`, `RELATION_ORB_OBJECTS.png`. GLB models: `ORB.glb` through `ORB5.glb`, `ORB_SKELETON.glb`. |
| **Unresolved questions** | None at the catalog level. |
| **Prohibited routing authority** | Concept art defines visual appearance. GLB models define 3D rendering. Neither defines Orb runtime behavior or capabilities. |

### Satellites (30 defined, 5 classes)

| Field | Value |
|---|---|
| **Canonical definition** | Host-bound specialized sub-capability units. Tether to Host Orbs. Five classes: I/O, Compute, Storage, Validation, Security. Can Mesh with other Satellites for shared services. |
| **Current governing source** | CORE Element Catalog v1.0, Section 2. |
| **Implementation source of truth** | **None implemented.** The catalog defines IDs, capabilities, and mesh services, but no source code exists for any Satellite. `sat-parse`, `sat-typecheck`, `sat-test`, `sat-contract`, `sat-sandbox` are catalog entries only. |
| **Historical/conceptual sources** | Concept art: `SATELITE.png` through `SATELITE8.png`, `RELATION_SATELITE_OBJECTS.png`. Video: `SATELITE1.mp4`. |
| **Unresolved questions** | None at the catalog level. |
| **Prohibited routing authority** | The Action Plan P2.3 references "composing existing capabilities" — these capabilities do not exist yet and must be built, not composed. |

### Formulas (12 defined)

| Field | Value |
|---|---|
| **Canonical definition** | Composed relational patterns binding multiple Orbs and Satellites into a single deployable unit. A recipe declaring which Elements participate and how they connect. |
| **Current governing source** | CORE Element Catalog v1.0, Section 3. |
| **Implementation source of truth** | **None implemented.** GLB models exist for visual representation (`FORMULA_*.glb`). |
| **Historical/conceptual sources** | Concept art: `FORMULA_*.png` variants, `FORMULA_QUAD_*.png`, `FORMULA_SOLO_1.png`. |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | Concept art and GLB models define visual form only. |

### External Connectors (14 defined)

| Field | Value |
|---|---|
| **Canonical definition** | Portal destinations representing real services outside the CORE boundary. Each handles protocol translation between the external service's API and the CORE's internal relational protocol. |
| **Current governing source** | CORE Element Catalog v1.0, Section 4. |
| **Implementation source of truth** | **None implemented.** The catalog defines 14 external connectors (GitHub, Google Docs, Claude, Slack, Linear, Figma, Supabase, Vercel, npm, Docker Hub, Notion, Google Sheets, Sentry, Azure) with capabilities and auth methods, but no runtime code exists. |
| **Historical/conceptual sources** | Image Manifest IN-01 (Exterior Service Endpoint). |
| **Unresolved questions** | These depend on the Portal External Relation Standard (P4) before implementation. |
| **Prohibited routing authority** | None identified. |

---

## 7. ACTUATOR Architecture

### PROBE

| Field | Value |
|---|---|
| **Canonical definition** | Reconnaissance ACTUATOR. Deploys parallel SCOUTS (Topology, Pattern, History, Dependency, Sentinel) to survey an environment and produce an evidence-based reconnaissance report. Read-only. Never modifies the environment. |
| **Current governing source** | `.github/agents/PROBE.agent.md`. |
| **Implementation source of truth** | `.github/agents/PROBE.agent.md` — complete operational specification including Mission Initialization Gate, 5 SCOUT definitions, structured report format. |
| **Historical/conceptual sources** | None — specification is current. |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | PROBE is explicitly read-only. It cannot be used as authority for write operations. |

### SEEKER

| Field | Value |
|---|---|
| **Canonical definition** | Investigation ACTUATOR. Deploys parallel SURVEYORS (Context, Relationship, Semantic, Dependency, Provenance) for deep investigation. Read-only. |
| **Current governing source** | `.github/agents/SEEKER.agent.md`. |
| **Implementation source of truth** | `.github/agents/SEEKER.agent.md` — complete operational specification. |
| **Historical/conceptual sources** | None — specification is current. |
| **Unresolved questions** | None. |
| **Prohibited routing authority** | SEEKER is explicitly read-only. |

### Build Master

| Field | Value |
|---|---|
| **Canonical definition** | Construction ACTUATOR. 7-step pipeline: INTENT → SPEC → SCAFFOLD → IMPLEMENT → TEST → VALIDATE → REGISTER. |
| **Current governing source** | Implementation Plan, Phase 1. |
| **Implementation source of truth** | **Not implemented.** `.github/agents/BuildMasters.agent.md` contains only the default GitHub agent template with no AEGIS-specific content. |
| **Historical/conceptual sources** | Concept art: `BUILDMASTER.png`. Implementation Plan Phase 1 specification. |
| **Unresolved questions** | The Action Plan P2 redefines the construction chain with different steps than the Implementation Plan. These need reconciliation. |
| **Prohibited routing authority** | `BUILDMASTER.png` is concept art. The empty agent stub is not a specification. |

---

## 8. Implementation Maturity Summary

| Concept | Definition status | Implementation status |
|---|---|---|
| Umbilical / Tether / Mesh connections | Complete (CORE Connection Standard) | Basic (mock checksums) |
| RelationContract | Complete | Implemented (in-memory) |
| NegativeSpaceInvariants | Complete | Implemented (partial — 3 of 5 fields) |
| Portal | Complete | Partial (placement + conceptual projection) |
| Tender | Defined | Conceptual projection only (`canonical: false`) |
| Wormhole / Courier / Customs / Tunnel | Action Plan definitions only | Not present |
| Admin Operations | Complete | Production-ready |
| Architect Canvas | Defined | Functional but monolithic |
| Dispatch / Conductor | Complete (Doctrine) | Daemon flags only |
| Annex / QuarterMaster | Complete (Doctrine) | Not present |
| Identity system | Conceptual | Not present |
| Build Master / Constructor | Partial | Empty stub |
| PROBE / SEEKER | Complete | Complete |
| 76 CORE Elements | Complete (Catalog) | Not present |
| RelationalIntentEnvelope | Action Plan definition only | Not present |
| Continuity Tensors | Complete (admin contracts) | Replay fixture data only |
