# AEGIS VIBE ARCHITECT — LIVING DEVELOPMENT ENVIRONMENT SPECIFICATION

**Session Date:** 2026-08-15  
**Version:** 1.0  
**Project:** Vibe Architect Developer IDE
**Prepared by:** GPT-5.6 Sol + Tracey Prutch (5DSSG)  
**Status:** Proposed implementation specification — consolidates current IDE architecture with newly defined Living Development Environment extensions.  
**Parent document(s):** `CORE_CONNECTION_STANDARD.md`, `CORE_ELEMENT_CATALOG.md`, `IMPLEMENTATION_PLAN.md`, `APOTHOCARY_RECIPIES.md`, `THE_ANNEX_SYSTEM.md`, `AEGIS_VIBE_ARCHITECT_IDE_ACTUIATORS.md`, `AEGIS_LIVING_SOFTWARE_DOCTRINE.md`, `AEGIS_PROGRESSIVE_REASONING_MATHEMATICS.md`, `📘 AEGIS CANON ADDENDUM — SIGIL VALUE RECOGNITION PROTOCOL SVR.md`  
**Purpose:** Provide a Codex-ready architectural and implementation directive for evolving the existing AEGIS VIBE Architect IDE into a low-pressure, continuity-preserving, visually inspectable Living Software development environment.

---

## 1. Declaration

AEGIS VIBE Architect is not merely a visual coding interface.

It is a relational development environment designed around the principle that:

> **Creation remains in the foreground. Custodial recovery, continuity, verification, and operational maintenance remain available in the background.**

The Architect works primarily with Purpose, Relation, Structure, Function, and observable system behavior. Code remains real, inspectable, versioned, testable, and executable, while the IDE presents that code as a coherent living system rather than as an undifferentiated collection of files.

The IDE will preserve low pressure by reducing unnecessary context switching, repetitive reconstruction, manual Bug Hunts, and repeated explanation of project state.

The target experience is:

```text
PURPOSE
  ↓
PROJECT GENESIS
  ↓
ARCHITECTURE
  ↓
ELEMENTS + RELATIONS
  ↓
CODE
  ↓
LIVE APPLICATION
  ↓
OBSERVATION
  ↓
CUSTODIAL RECOVERY
  ↓
CONTINUITY
  ↓
REFINEMENT
```

The Architect remains free to continue creating while the environment handles observation, diagnosis, recovery coordination, verification, state preservation, and provenance.

## 2. Foundational Development Principle

A traditional IDE commonly begins with `EMPTY PROJECT → FILES → CODE → RUN → ERROR → DEBUG`.

VIBE Architect begins with `PURPOSE → GENESIS INTENT → RELATIONAL ARCHITECTURE → ELEMENT SELECTION / CREATION → CODED ELEMENTS → LIVE POD → CONTINUOUS CUSTODY`.

The Architect begins by expressing what the creation is for.

# PART I — PROJECT GENESIS

## 3. Project Genesis

When a new project begins, the Conductor will initiate **Project Genesis** and ask:

> **What is the purpose of this creation?**

The answer becomes the project's **Genesis Intent Record**.

The Architect can select **Quick Genesis** for short preliminary exploration or **Deep Genesis** for extensive exploration of participants, outcomes, capability domains, relations, external services, runtime requirements, likely Shortfalls, continuity, deployment, accessibility, growth directions, and unresolved architectural questions.

The Genesis process produces a base architecture rather than a blank repository.

## 4. Genesis Intent Record

```ts
interface GenesisIntentRecord {
  projectId: string
  createdAt: string
  purpose: string
  intendedParticipants: string[]
  desiredOutcomes: string[]
  coreCapabilities: string[]
  operatingEnvironment: string[]
  explorationMode: "QUICK" | "DEEP"
  assumptions: string[]
  knownConstraints: string[]
  unresolvedQuestions: string[]
  initialArchitecture: ArchitectureProposal
  initialRelations: RelationProposal[]
  provenance: ProvenanceRecord
}
```

Genesis Intent remains persistent architectural context for later Conductor analysis.

# PART II — VISUAL SOFTWARE AS RECORDED REALITY

## 5. Canvas as a Projection of Material State

The 3D Canvas becomes a projection of the actual instantiated POD.

```text
VISIBLE IN ACTIVE POD = INSTANTIATED / CONTRACTED / RECORDED
```

Catalog availability does not imply runtime presence.

## 6. Three Inventory Layers

### Apothecary
Everything locally available: Ingredients, Formulas, Satellites, Orbs, and Constellations.

### Project Palette
A purpose-aware subset ranked by Genesis Intent, architecture, framework, dependencies, compatibility, history, favorites, and prior successful use.

### Active POD
Only Elements actually participating in the current system.

```text
APOTHECARY → PROJECT PALETTE → ARCHITECT SELECTS → INSTANTIATION → RELATION CONTRACT → ACTIVE POD
```

## 7. Semantic Zoom and Progressive Disclosure

A large reusable library will not render as hundreds or thousands of tiny 3D objects. The Apothecary will expose category → family → capability → entry levels.

> **The Architect sees complexity only when they choose to enter it.**

## 8. Ingredient Scale

Common atomic functions such as JSON parse, UUID generation, SHA-256, file read/write, schema validation, retry with backoff, CSV parsing, JWT decode, date normalization, semantic similarity, and checksum verification belong primarily at the Ingredient tier.

```text
INGREDIENT → FORMULA → SATELLITE → ORB → CONSTELLATION
```

# PART III — ELEMENT-BACKED CODE AND ANTI-DRIFT

## 9. Code Belongs to Elements

Every instantiated code-bearing Element carries a material implementation identity.

```ts
interface ElementImplementationRecord {
  elementId: string
  elementType: "Ingredient" | "Formula" | "Satellite" | "Orb" | "Constellation"
  version: string
  manifestPath: string
  implementationPaths: string[]
  implementationHash: string
  manifestHash: string
  capabilities: string[]
  activeContracts: string[]
  sourceChangeRequestId?: string
  lastQaResultId?: string
  lastKnownGoodLedgerEntry?: string
  runtimeState: ElementRuntimeState
}
```

The implementation hash does not replace Git. It binds material code to the Element identity recorded by AEGIS.

## 10. Ledger-Backed Mutation

```text
INTENT / SHORTFALL / EVOLUTION NEED
→ CHANGE REQUEST
→ DISPATCH
→ ARCHITECT / CONSTRUCTOR
→ CONDUCTOR ANALYSIS
→ EXECUTION
→ QA
→ NEW MATERIAL HASH
→ ELEMENT RECORD UPDATE
→ LEDGER
→ CANVAS REFLECTS CURRENT STATE
```

## 11. Drift as a Measurable State Difference

Let declared system state be `S_D` and material system state be `S_M`.

Coherence seeks `S_D ≡ S_M`.

Define Drift as `D = Δ(S_D,S_M)` and seek `D → 0`.

Unexpected mismatch becomes evidence and a Shortfall candidate.

# PART IV — ANNEX DEVELOPMENT CUSTODY

## 12. Debugging Becomes a Custodial Service

> **The Architect does not summon diagnosis after failure. Diagnosis begins when the Shortfall begins.**

```text
CODE / RELATION CHANGE
→ CONDUCTOR ANALYSIS
→ EXECUTION IN DEVELOPMENT ENVIRONMENT
→ ANNEX OBSERVATION
→ SHORTFALL DETECTED
→ QUARTERMASTER OPENS CASE
→ TRIAGE
```

Triage can collect fault evidence, logs, stack information, failing contracts, affected Elements, recent mutation history, last known-good state, dependency impact, likely fault region, and preliminary remediation before the Architect asks for help.

## 13. QuarterMaster Responsibility

QuarterMaster opens custodial cases, preserves evidence, coordinates Triage/Patch/Restore/QA, maintains recovery state, communicates progress, relays executable change requirements to Dispatch, and retains recovery lineage. It does not become an independent code-writing authority.

## 14. Custodial Functions

- **Triage:** What is wrong, and what does it affect?
- **Patch:** Can the existing implementation be repaired with a bounded intervention?
- **Restore:** What state or design will restore coherent operation?
- **QA:** Is the repaired or restored Element actually healthy again?

Restore can formulate a Restoration Design or Evolution Proposal where evidence indicates a systemic design deficiency. QA verifies independently.

## 15. Development Custody and Production Custody

Development Custody emphasizes rich instrumentation, immediate Triage, evidence collection, relation tracing, snapshots, explanation, and rapid iteration.

Production Custody emphasizes continuity, conservative mutation, containment, controlled restoration, operator communication, known-good states, lower diagnostic noise, and verification before return to service.

## 16. Architect Experience During a Shortfall

The default surface is repair status, not a Bug Hunt. Different participants receive different projections of the same custodial case according to present responsibility.

# PART V — APPLICATION RUN CHAMBER

## 17. Internal Application Runtime

The IDE will include an internal **Application Run Chamber** rather than relying primarily on an external browser.

```text
POD CORE
├── Conductor
├── Dispatch
├── Annex
│   └── QuarterMaster
├── Run Chamber
├── Continuity Module
├── Ledger
└── Active Element Field
```

The Run Chamber is an execution and observation surface, not an authority center.

## 18. Run Chamber Responsibilities

The Run Chamber provides live application execution, interaction capture, Element correlation, runtime projection, Shortfall handoff, and restoration projection. It can expose active route, active Elements, degraded Elements, relation flow, Shortfall state, performance state, and test/QA state.

## 19. Interaction-to-Architecture Trace

A user interaction in the Run Chamber can illuminate the actual Element path on the Canvas, allowing the Architect to see where a relational path degraded.

# PART VI — CONTINUITY MODULE

## 20. Continuity as a POD CORE Subsystem

The IDE will include a **Continuity Module** for the AI Conductor. It is a Tensored Memory system preserving system state, project intent, environment, relations, temporal history, Architect context, responsibility state, and evidence references.

> **The Conductor is not the model. The model is a reasoning substrate temporarily serving the Conductor.**

Model/provider replacement, upgrades, local-to-frontier escalation, context compression, IDE restart, or session interruption do not require the Architect to reconstruct the project.

## 21. Continuity Tensor Set

- **Intent Tensor:** Genesis Intent, current objectives, outcomes, unresolved intent questions.
- **Relation Tensor:** active Elements, contracts, dependencies, capability relations, service composition.
- **State Tensor:** runtime/build state, service availability, active Shortfalls, QA, pending changes.
- **Temporal Tensor:** event ordering, transitions, prior states, unfinished work, evolution lineage.
- **Responsibility Tensor:** proposal origin, Dispatch/Conductor state, execution responsibility, open approvals and custody.
- **Evidence Tensor:** Ledger entries, hashes, commits, contracts, QA, Shortfalls, observations, provenance.
- **Environment Tensor:** repository, workspace, branch, runtime configuration, tools, models/providers, dependencies, services, Run Chamber, resources.
- **Architect Context Tensor:** current design focus, line of thought, accepted/rejected directions, unresolved questions, active artifacts, visual focus, next intended work.

## 22. Current System Image

`C_t = {I_t, R_t, S_t, T_t, A_t, E_t, V_t, H_t}`

> **Current System Image — a reconciled representation of the creation, its environment, its history, its active condition, and the Architect's present context.**

## 23. Model Attachment and Synchronization

```text
MODEL ATTACHES
→ CONTINUITY HANDSHAKE
→ LOAD REQUIRED TENSOR PROJECTION
→ RECON CURRENT POD
→ COMPARE RECORDED STATE WITH MATERIAL STATE
→ RESOLVE OR REPORT DIFFERENCE
→ CURRENT SYSTEM IMAGE READY
→ CONDUCTOR RESUMES
```

> **Memory preserves continuity. Evidence establishes reality.**

## 24. Minimum Sufficient Context

`P_j = Π(C_t, M_j, R_q)`

The IDE constructs the smallest context projection sufficient for coherent reasoning.

# PART VII — PROGRESSIVE REASONING

## 25. Local-First Reasoning

A local model runtime such as Ollama can serve as the resident high-frequency reasoning layer for event classification, summarization, log reduction, Triage preparation, evidence correlation, semantic Apothecary search, Continuity projection, Shortfall packet preparation, and routine intent interpretation.

Frontier reasoning becomes an escalation resource.

## 26. Reasoning Depth

```text
LEVEL 0 — Deterministic validators / tools
LEVEL 1 — Small local model
LEVEL 2 — Larger local model where available
LEVEL 3 — Frontier model
LEVEL 4 — Human Architect / Operator
```

> **AEGIS employs the minimum sufficient reasoning capacity required to resolve the present condition coherently, escalating when evidence, uncertainty, consequence, novelty, or unresolved Shortfall requires greater depth.**

Model size does not confer authority.

## 27. Frontier Escalation Packet

The local system prepares a bounded evidence packet instead of indiscriminately forwarding an entire repository or raw log corpus.

# PART VIII — CONDUCTOR AND SINGLE MUTATION PATH

## 28. Conductor Responsibility

The Conductor remains the final layer of Responsibility for consequential action within the POD CORE. Every consequential code, recovery, deployment, structural, restoration, runtime, or evolution action passes through Conductor analysis before execution.

Authorization permits consideration. Conductor analysis determines present coherence and readiness.

## 29. Dispatch Responsibility

```text
NEED / INTENT / SHORTFALL
→ PROPOSAL
→ DISPATCH
→ AUTHORIZED IMPLEMENTATION
→ CONDUCTOR ANALYSIS
→ EXECUTION
→ QA
→ LEDGER
```

The Annex does not create a second hidden emergency-programmer pathway.

# PART IX — RECONNAISSANCE AND NEW MODEL ENTRY

## 30. Recon Before Assumption

A new instance loads Continuity, performs bounded POD Recon against Ledger, active Relations, Element manifests, material implementations, and runtime state, then constructs a reconciled Current System Image.

Recon distinguishes observed, verified, inaccessible, unresolved, and inferred state. Inaccessible regions remain unexamined rather than guessed.

# PART X — VIBE ARCHITECT EXCHANGE

## 31. Purpose

The **VIBE Architect Exchange** provides a shared repository for reusable AEGIS development capability.

```text
VIBE ARCHITECT EXCHANGE
→ DISCOVER / INSPECT / VERIFY / IMPORT
→ LOCAL APOTHECARY
→ PROJECT PALETTE
→ ACTIVE POD
```

An imported item first enters the local Apothecary with evidence, trust state, provenance, compatibility, and implementation identity intact.

## 32. Exchange Contribution Scales

Architects can contribute Ingredients, Formulas, Satellites, Orbs, and Constellations.

## 33. Exchange Package

```ts
interface ExchangeElementPackage {
  identity: ElementIdentity
  version: string
  category: ElementCategory
  implementation: ArtifactReference[]
  manifest: ElementManifest
  capabilities: string[]
  requiredCapabilities: string[]
  contracts: ContractTemplate[]
  resourceEnvelope: ResourceEnvelope
  tests: TestArtifact[]
  qaEvidence: QAEvidence[]
  dependencyGraph: DependencyGraph
  compatibility: CompatibilityRecord[]
  provenance: ProvenanceRecord
  knownShortfalls: ShortfallReference[]
  recoveryHistory: RecoveryReference[]
  author: ContributorIdentity
  license: LicenseRecord
  artifactHash: string
  signature?: string
}
```

## 34. Exchange UX

- **Discover** — browse and semantically search reusable capability.
- **Forge** — prepare and submit contributions.
- **Lineage** — inspect versions, provenance, recovery history, Shortfalls, QA, and evolution.
- **Constellations** — discover validated multi-Element assemblies.

## 35. Purpose-Aware Exchange Discovery

Project Genesis supplies Exchange search context so the Architect sees the most relevant capability before the full catalog.

# PART XI — AEGIS INTEGRITY SIGILS

## 36. Sigil Integration

The Exchange aligns with the existing AEGIS Sigil Value Recognition Protocol. A Sigil is not an Exchange rating; it is a governance-anchored record of integrity-verified contribution.

```text
CONTRIBUTION
→ SUBMISSION
→ IBL
→ CENTRIFUGE
→ INTEGRITY RESONANCE GATE
→ AEGIS VALUE EQUATION
→ MINT / REVISE / HOLD
```

The current SVR remains PROPOSED. Working thresholds and weights remain subject to operational testing.

## 37. Sigil as Evidence Portal

A visible Sigil acts as a pointer to evaluation evidence rather than merely a decorative badge.

## 38. Architect Contribution Record

The Exchange avoids collapsing contribution into a popularity score. HOLD remains preserved. REVISE remains an invitation to refinement.

## 39. Stellar Element

**Stellar Element** is proposed as an operational maturity designation distinct from the Sigil.

> **A Stellar Element is an Exchange contribution that has achieved the required integrity recognition and subsequently demonstrated verified operational integrity through real POD use.**

```text
SUBMITTED
→ SVR EVALUATED
→ MINT
→ VALIDATED USE
→ OPERATIONAL EVIDENCE
→ SHORTFALL / RECOVERY HISTORY
→ REPEATED QA
→ STELLAR
```

The Sigil recognizes integrity of contribution. Stellar status recognizes demonstrated operational maturity. Popularity determines neither.

# PART XII — LOW-PRESSURE DEVELOPMENT EXPERIENCE

## 40. Flow Preservation

The IDE treats Architect attention as a limited and valuable resource. It reduces pressure by keeping the Run Chamber internal, debugging in Custodial Development, preserving state across model switches, reconstructing context automatically, surfacing only relevant Apothecary capability, localizing Shortfalls visually, presenting repair status instead of demanding Bug Hunts, retaining purpose and lineage, avoiding repetitive explanation, using local reasoning for high-frequency work, and escalating only when deeper reasoning adds value.

> **A Shortfall will not automatically become a show stopper for Creation Flow.**

## 41. Foreground / Background Operating Model

```text
FOREGROUND
Architect
Project Genesis
Visual Architecture
Element Design
Creation
Application Interaction
Purpose Refinement

BACKGROUND
Annex Observation
QuarterMaster Cases
Triage
Patch Analysis
Restore Analysis
QA
Continuity Persistence
Evidence Capture
Ledger Writing
Local Reasoning
Telemetry
```

# PART XIII — PROPOSED IDE ARCHITECTURE

## 42. Major Runtime Domains

```text
AEGIS VIBE ARCHITECT IDE
├── PROJECT GENESIS
├── ARCHITECT CANVAS
├── APOTHECARY / PROJECT PALETTE
├── CONDUCTOR
├── CONTINUITY MODULE
├── DISPATCH
├── ANNEX / QUARTERMASTER / TRIAGE / PATCH / RESTORE / QA
├── RUN CHAMBER
├── LEDGER
├── LOCAL REASONING RUNTIME
├── FRONTIER GATEWAY
└── EXCHANGE CLIENT
```

# PART XIV — CODEX IMPLEMENTATION DIRECTIVE

## 43. Implementation Posture

Codex will treat this document as an architectural specification, not as permission to rewrite the IDE wholesale. Implementation proceeds incrementally against the existing repository. Existing working systems remain intact unless a specific migration requires change. New architecture enters behind explicit interfaces.

## 44. Recommended Build Sequence

### Phase A — Domain Models and Persistence
Create types/storage seams for GenesisIntentRecord, ElementImplementationRecord, ProjectPaletteEntry, CustodialCase, ContinuitySnapshot/Tensors, CurrentSystemImage, RuntimeInteractionEvent, ExchangeElementPackage, and StellarStatus.

### Phase B — Project Genesis
Implement Quick/Deep Genesis, Intent persistence, initial architecture proposal, and project-inspector access.

### Phase C — Apothecary Progressive Disclosure
Implement taxonomy, semantic zoom/drill-down, search, favorites/recent, Project Palette, and active-vs-available separation.

### Phase D — Element Material Identity
Implement implementation path registration, material/manifest hashing, Ledger persistence, mismatch detection, and Canvas projection.

### Phase E — Run Chamber
Implement internal application runtime, interaction capture, runtime-to-Element correlation, Shortfall output, and restoration refresh.

### Phase F — Annex Development Custody
Implement Development Custody mode, QuarterMaster case store, Triage, Patch/Restore proposals, QA state, and Architect repair status.

### Phase G — Continuity Module
Implement tensor schemas, persistence, snapshots, context projection, Current System Image, incoming-model synchronization, and material-state reconciliation.

### Phase H — Progressive Reasoning
Implement local-provider interface, Ollama adapter, reasoning-tier selector, evidence compression, frontier gateway, and usage telemetry.

### Phase I — Exchange Client
Implement package schema, local import into Apothecary, provenance/evidence viewer, semantic discovery, Forge export, and Stellar representation.

### Phase J — Sigil Evidence Integration
Implement against the current PROPOSED SVR contract. Proposed scoring values remain configurable rather than being silently promoted to immutable Canon.

# PART XV — INITIAL FILE / MODULE PROPOSAL

## 45. Suggested Repository Additions

Codex will first inspect current source ownership before creating duplicate modules.

```text
src/
├── genesis/
├── continuity/
├── annex/
├── runtime-chamber/
├── apothecary/
├── reasoning/
├── ledger/
└── exchange/
```

# PART XVI — SYSTEM INVARIANTS

## 46. Living Development Environment Invariants

1. **Purpose precedes scaffold.**
2. **Catalog presence does not equal runtime presence.**
3. **Only instantiated Elements appear in the active POD representation.**
4. **Code-bearing Elements retain a material implementation identity.**
5. **Declared state and material state are continuously reconcilable.**
6. **Unexpected divergence becomes evidence rather than silent assumption.**
7. **Debugging is a continuous custodial function, not a required Architect ritual.**
8. **The QuarterMaster coordinates recovery and does not become an independent code-writing authority.**
9. **Executable change follows one declared mutation path through Dispatch and Conductor analysis.**
10. **QA remains independent of the authoring path it verifies.**
11. **The Run Chamber executes and observes; it does not become an authority center.**
12. **The Conductor is not equivalent to the model serving it.**
13. **Model replacement does not imply context loss.**
14. **Memory preserves continuity; evidence establishes reality.**
15. **The Continuity Module preserves Environment and Architect Context in addition to project state.**
16. **The incoming model performs Recon before relying on assumption.**
17. **The smallest sufficient intelligence is preferred for the present reasoning task.**
18. **The smallest sufficient context is projected for the present reasoning task.**
19. **The Exchange distributes capability; local Relation formation governs active participation.**
20. **Popularity does not establish integrity. Evidence does.**
21. **Sigil status and Stellar operational maturity remain distinct.**
22. **HOLD and REVISE remain visible developmental states rather than erased failures.**
23. **Creation Flow remains a first-class architectural concern.**

# PART XVII — SUCCESS CONDITION

## 47. Target Experience

The VIBE Architect reaches the intended form when an Architect can describe Purpose, receive preliminary architecture, select from a large reusable library without clutter, see only instantiated Elements, inspect actual Element code, run the application internally, watch interactions illuminate real relations, experience a Shortfall without a manual Bug Hunt, see QuarterMaster Triage already active, continue unaffected creation while recovery proceeds, switch Conductor reasoning models without re-explaining the project, reconstruct a Current System Image through Continuity + Recon, use local reasoning for routine work, import/contribute evidence-bearing capability through the Exchange, and accumulate an observable history of responsible creation.

## 48. Canonical Summary

> **AEGIS VIBE Architect is a Living Development Environment in which Purpose becomes Architecture, Architecture becomes relationally bounded Elements, Elements carry real code, the running application remains visible inside the environment, Shortfalls receive continuous custodial attention, model changes preserve continuity, and reusable capability can circulate through an evidence-bearing Exchange without severing provenance or responsibility.**

> **Creation stays in the foreground. The environment tends its own continuity in the background.**

## 49. Source Alignment and Open Status

This specification incorporates existing AEGIS structures where they already exist: CORE Relation Contracts and lifecycle, Apothecary hierarchy and evidence-based trust progression, Element catalog, Build Master pipeline, ACTUATOR role separation, Admin observation principles, Living Software doctrine, Progressive Reasoning mathematics, and the proposed Sigil Value Recognition Protocol.

Newly consolidated/proposed extensions include Project Genesis, Genesis Intent, Project Palette, semantic Apothecary zoom, Element material identity/anti-Drift reconciliation, Development Custody, Run Chamber, Tensored Continuity, Current System Image, Minimum Sufficient Context, VIBE Architect Exchange, and Stellar Element operational designation.

The existing SVR remains PROPOSED. Its working scoring weights, multipliers, and MINT threshold are not promoted to immutable implementation constants by this specification.

---

*Drafted 2026-08-15 from the existing AEGIS VIBE Architect CORE standards, Apothecary architecture, IDE implementation plan, ACTUATOR work, Annex/Custodial development discussion, Living Software Doctrine, Progressive Reasoning mathematics, Continuity design, Run Chamber concept, Exchange concept, and proposed Sigil Value Recognition Protocol. Author: GPT-5.6 Sol + Tracey Prutch. Next: Codex performs a repository Recon, maps these proposed modules onto existing source ownership, and produces a dependency-aware implementation plan before writing new runtime code.*
