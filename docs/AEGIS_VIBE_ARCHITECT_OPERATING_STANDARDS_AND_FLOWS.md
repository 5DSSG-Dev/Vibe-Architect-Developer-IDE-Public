# AEGIS VIBE ARCHITECT — OPERATING STANDARDS AND FLOWS

**Initiated:** 2026-08-15  
**Version:** 0.3 — Living Document  
**Project:** Vibe Architect Developer IDE
**Authors:** Tracey Prutch (5DSSG) + Claude (Anthropic)  
**Status:** Active architectural discovery — this document grows as new facets of the IDE are identified, designed, and refined.  
**Parent document:** `AEGIS_VIBE_ARCHITECT_LIVING_DEVELOPMENT_ENVIRONMENT_SPEC_v1.0.md`  
**Purpose:** Capture operating standards, architectural flows, Element designs, Reagent catalogs, connectivity contracts, and Formula specifications as they emerge from collaborative design sessions. This document is the working companion to the formal specification.

---

## Document Governance

This is a Living Document. Sections are added, revised, and refined as design decisions are made. Each section records:

- **What** was decided
- **Why** it was decided
- **What it connects to** in the broader architecture

Sections marked `[PROPOSED]` are under active discussion. Sections marked `[ACCEPTED]` reflect confirmed architectural decisions. Sections marked `[OPEN]` require further exploration before acceptance.

---

# PART I — FOUNDATIONAL TECHNOLOGY DECISIONS

## 1. Stellar as the IDE Implementation Language `[ACCEPTED]`

### Decision

The AEGIS VIBE Architect IDE will be built in Stellar.

### Rationale

Code written in Stellar runs with **no language translation layer**. There is no interpreter, no JIT compilation step, no garbage collector pause, and no event-loop contention between the rendering surface and the logic processor. Code compiles to native execution.

This matters specifically because the VIBE Architect is not a text editor with AI features. It is a Living Development Environment that simultaneously runs:

- A 3D Canvas projecting Element state in real time
- An Annex observation pipeline monitoring all active Elements
- An 8-tensor Continuity Module persisting system state
- A local reasoning model processing high-frequency logic
- A Ledger recording every consequential mutation
- A Run Chamber hosting a live application

In an interpreted environment (Electron/V8, for example), each of these subsystems contends for the same event loop, pays garbage collection tax, and serializes data across IPC boundaries between processes. The translation layer becomes the bottleneck — not the logic itself.

In Stellar, the IDE's subsystems execute at native speed. The Conductor's reasoning loop, the Annex's observation pipeline, the Continuity Module's tensor persistence, and the Ledger all operate without runtime overhead. The 3D Canvas and Run Chamber become first-class rendering surfaces rather than DOM-bound approximations.

### Extension and Snippet Compatibility

Stellar supports snippets and extensions. The VIBE Architect Exchange (defined in the parent specification, Part X) distributes reusable capability as Element packages. In Stellar, these arrive as native extensions rather than interpreted plugins — the Exchange becomes a native capability distribution system.

### Architectural Consequence

Every layer of the IDE runs at its natural speed:

```
USER INTERACTION
      |
STELLAR NATIVE IDE (zero translation)
      |
LOCAL OLLAMA MODEL (first-tier reasoning)
      |
CONTINUITY MODULE (native tensor operations)
      |
FRONTIER ESCALATION (only when depth requires it)
```

---

## 2. Distributed Logic Processing Architecture `[ACCEPTED]`

### Decision

A small-form local model running on Ollama serves as the **primary logic processor** for the IDE. The frontier model (cloud-hosted, higher-capacity) is an **escalation resource** invoked only when the local model's capacity is exceeded.

### Rationale

This is not "local model as fallback." The local model is the first-tier processor that handles the high-frequency, high-volume reasoning work the IDE requires continuously:

- Event classification (is this a Shortfall or normal behavior?)
- State summarization
- Log reduction
- Triage preparation
- Evidence correlation
- Known-pattern matching
- Semantic Apothecary search
- Continuity projection construction
- Shortfall packet preparation
- Routine intent interpretation
- Optimization audit analysis
- Hardware capability assessment

These operations happen constantly — every frame, every code change, every Element state transition. Each one is a sub-second local inference, not a network round-trip. The Annex's continuous observation (parent specification, Section 12) is only economically and latency-viable if observation is local.

The frontier model activates when the problem genuinely exceeds local capacity:

- Novel Shortfall patterns not matching known classifications
- Architectural evolution proposals
- Multi-Element restoration designs
- Complex intent interpretation requiring deep contextual reasoning
- Cross-Constellation impact analysis

### Escalation Boundary `[OPEN]`

The mechanism by which the local model determines it should escalate remains under active design. Two candidate approaches:

**Confidence-threshold escalation:** The local model classifies confidence on every output. Any result below a defined threshold becomes a Frontier Escalation Packet (parent specification, Section 27).

**Operation-type escalation:** A fixed set of operation types always escalate regardless of local confidence (architectural evolution, novel Shortfall patterns, multi-Element restoration designs).

The final design may combine both approaches.

### Progressive Reasoning Tiers

```
LEVEL 0 — Deterministic validators and tools
LEVEL 1 — Small local model (Ollama)
LEVEL 2 — Larger local model where available
LEVEL 3 — Frontier model
LEVEL 4 — Human Architect / Operator
```

The governing principle from the parent specification:

> **AEGIS employs the minimum sufficient reasoning capacity required to resolve the present condition coherently, escalating when evidence, uncertainty, consequence, novelty, or unresolved Shortfall requires greater depth.**

Model size does not confer authority.

---

# PART II — ELEMENT HIERARCHY

## 3. Element Scale `[ACCEPTED]`

```
REAGENT
    |
FORMULA
    |
SATELLITE
    |
ORB
    |
CONSTELLATION
```

**Reagent** — a Programmable Code Catalyst. The atomic tier. A single reusable function that performs one pure computation. No visible runtime object on the Canvas at default zoom. No business logic, no state management, no rendering decisions. Reagents catalyze higher-level computation when Formulas and Satellites compose them. Examples: matrix multiply, ray-triangle intersect, bilinear texture sample, SHA-256 hash, channel open, heartbeat send.

**Formula** — a composed sequence of Reagents that produces a higher-order capability. Not yet a service. A Formula binds Reagents together with specific rules about lifecycle, ordering, or enforcement. Examples: Umbilical Formula (lifecycle-bound connection), Tether Formula (independent peer connection).

**Satellite** — a bounded functional unit with a defined input/output contract. Participates in an Orb. Has identity and contracts. Examples: Geometry Modeler, Physics Generator, Image Processor, Pixel Setter.

**Orb** — a bounded service composed of Satellites. Has identity, contracts, runtime state, and an Umbilical to POD CORE. Examples: Render Engine, Hardware Recon, Quality Governor.

**Constellation** — a package of Stellar Elements operating in its own bounded environment. Contains one or more Orbs, their Satellites, and all Reagent dependencies within a unified execution boundary. Connects to POD CORE through an Umbilical and to peer Elements through Tethers. Self-contained operational system. Example: Oculum Constellation.

### 3D Asset Library

The following Element tiers already have rigged .glb models in the Apothecary asset library (`public/assets/models/`):

| Tier | Assets |
|---|---|
| POD / CORE | `AEGIS_Pod_Seed_Crystal_3D.glb`, `AEGIS_POD_CRYSTAL.glb`, `CORE_CRYSTAL_CAGED.glb`, `CORE_CRYSTAL_CAGED2.glb` |
| Orb | `ORB.glb` through `ORB_9_0.glb` (9+ variants) |
| Satellite | `SATELITE1.glb` through `SATELITE5.glb` |
| Formula | `FORMULA_1.glb`, `FORMULA_3_1.glb`, `FORMULA_3_2.glb`, `FORMULA_3_3.glb` |
| Portal | `PORTAL.glb`, `PORTAL_TENDER.glb` |
| Umbilical | `UMBILICAL_AWESOME.glb`, `UMBILICAL_AWESOME_LONG.glb`, `UMBILICAL_BROKEN_LONG.glb`, `UMBILICAL_LONG2.glb`, `UMBILICAL_SHORT.glb` |
| Reagent | *Concept art complete (7 forms). Separation and to3D conversion pending.* |
| Other | `AEGIS_CODEX_ARCHIVIST.glb`, `DIGITIZER_1.glb`, `ENERGY_HAZE.glb`, `prismatic-aegis-emblem.glb`, `crystals.glb` |

### Reagent Visual Taxonomy `[PROPOSED]`

Each Reagent visual form maps to a functional family, so the Architect can identify the category at a glance by shape and color:

| Visual Form | Family | Color |
|---|---|---|
| Cylindrical capsule | Channel Reagents | Cyan |
| Triangular crystal | Contract Reagents | Purple / Violet |
| Elongated vial | Message Reagents | Amber / Gold |
| Multi-gem spheroid | State Reagents | Multi (green, purple, pink) |
| Pointed capsule | Lifecycle Reagents | Red / Magenta |
| Lenticular eye | Health Reagents | Blue / Indigo |
| Crystalline junction | Computation Reagents | Multi (purple, cyan, amber, pink) |

---

# PART III — CONSTELLATION ARCHITECTURE

## 4. Constellation Definition `[ACCEPTED]`

A **Constellation** is a package of Stellar Elements that operates in its own bounded environment. It contains one or more Orbs, their Satellites, and all Reagent dependencies within a unified execution boundary.

A Constellation is not merely a large Orb. It is a **self-contained operational system** with:

- Its own memory space
- Its own execution loop (where applicable)
- Its own observation surface
- A unified external interface

### Constellation Connectivity

Constellations connect to the broader POD through two contract types:

**Umbilical** — the connection from a Constellation to POD CORE. This is the lifeline. The Constellation cannot exist without it. The Umbilical carries structured data in both directions: Element state, interaction events, Shortfall signals, capability reports inward; rendered output, hit results, health data outward.

**Tether** — the connection from a Constellation to another Orb or Constellation. Tethers are peer connections governed by Relation Contracts. They can be present or absent without breaking the Constellation's internal operation.

```
CONSTELLATION
  |
  |==UMBILICAL==> POD CORE (required, bidirectional)
  |
  |--TETHER-----> Orb or Constellation (optional, contracted)
  |--TETHER-----> Orb or Constellation (optional, contracted)
```

### Constellation Lifecycle

```
CONSTELLATION PACKAGE (in Apothecary or Exchange)
        |
INSTANTIATION
        |
UMBILICAL HANDSHAKE
  |-- Registration: identity, version, manifest hash
  |-- Specs: contained Orbs, Satellites, Reagent count
  |-- Capability declaration: what the Constellation provides
  |-- Contract declaration: what it requires from POD CORE
  |-- Environment report: hardware, resources, state
  |-- Relation requests: which Tethers it needs
        |
POD CORE VALIDATES
  |-- Manifest hash matches known good
  |-- No contract conflicts with existing Elements
  |-- Tether targets exist and accept
  |-- Ledger records instantiation and contract formation
        |
ANNEX REGISTERS
  |-- Observation surfaces defined
  |-- Shortfall thresholds set
  |-- Baseline performance captured
  |-- Custodial responsibility assumed
        |
CONSTELLATION IS LIVE
```

After the Umbilical handshake completes, the Constellation is a full citizen of the POD's custodial environment.

---

## 5. The Oculum Constellation `[ACCEPTED]`

### Purpose

The **Oculum Constellation** is the AEGIS VIBE Architect's 3D rendering system. It is the eye of the IDE — the system that sees the creation and renders it visible to the Architect.

Oculum is not a third-party rendering library. It is a Constellation built from AEGIS Elements using Stellar, serving as both the IDE's visual engine and the first proof that the Element architecture can sustain real computational workloads.

### Internal Architecture

```
OCULUM CONSTELLATION
|
|==UMBILICAL==> POD CORE
|     |-- IN:  Element state (what to render, current condition)
|     |-- IN:  Interaction events (Architect clicked Element X)
|     |-- OUT: Rendered frame
|     |-- OUT: Interaction hit results
|     |-- OUT: Shortfall signals (frame budget exceeded)
|     |-- OUT: Capability report (hardware envelope)
|
|--TETHER-----> Run Chamber Orb
|     |-- IN:  Application render request, viewport allocation
|     |-- OUT: Application frame, runtime Element correlation data
|
|--TETHER-----> Continuity Module
|     |-- IN:  State restore request (model switch, session resume)
|     |-- OUT: Current Canvas state snapshot for Environment Tensor
|
|-- ORB: Hardware Recon
|     |-- Discovers, classifies, monitors execution environment
|
|-- ORB: Render Engine
|     |-- SATELLITE: Geometry Modeler
|     |-- SATELLITE: Physics Generator
|     |-- SATELLITE: Image Processor
|     |-- SATELLITE: Pixel Setter
|
|-- ORB: Quality Governor
|     |-- Capability Envelope calculation
|     |-- Quality function evaluation
|     |-- Per-Satellite budget allocation
|
|-- REAGENT FIELD
      |-- All atomic operations consumed by the above
```

---

## 6. Render Engine Orb — Satellite Responsibilities `[ACCEPTED]`

### Geometry Modeler Satellite

Scene graph management, mesh generation, vertex manipulation, spatial transformations (translate, rotate, scale), LOD selection, and frustum culling.

**Input contract:** Scene description with Element identifiers and transformation state.  
**Output contract:** Transformed vertices and culled meshes ready for physics and rendering.

### Physics Generator Satellite

Collision detection, spatial relationship calculation, animation physics and interpolation, force and constraint resolution, bounding volume hierarchy management.

**Input contract:** Transformed geometry and interaction events.  
**Output contract:** Resolved positions, collision results, and animation states.

### Image Processor Satellite

Texture loading and management, material composition, lighting calculation, shadow mapping, and post-processing effects.

**Input contract:** Resolved geometry with material assignments and light state.  
**Output contract:** Lit, textured, shaded fragments ready for rasterization.

### Pixel Setter Satellite

Rasterization, fragment operations, depth buffer management, anti-aliasing, and final framebuffer write.

**Input contract:** Shaded fragments with depth and material data.  
**Output contract:** Final pixels written to the framebuffer or GPU command buffer.

### Pipeline Flow

```
GEOMETRY MODELER
  "here is the scene as transformed vertices and culled meshes"
        |
PHYSICS GENERATOR
  "here are the resolved positions, collisions, and animations"
        |
IMAGE PROCESSOR
  "here are the lit, textured, shaded fragments"
        |
PIXEL SETTER
  "here are the final pixels, written to the framebuffer"
```

In Stellar, these Satellite boundaries are **architectural boundaries, not runtime barriers**. The compiler sees through them. The boundaries exist for versioning, QA, observability, and Exchange distribution — not as runtime isolation or IPC hops.

---

## 7. Adaptive Rendering — Hardware Recon and Quality Governor `[ACCEPTED]`

### Hardware Recon

The Oculum Constellation does not assume its hardware. It discovers it.

```
OCULUM ORB INITIALIZATION
        |
HARDWARE RECON
  |-- GPU present?
  |     |-- YES: identify vendor, VRAM, compute capability, driver version
  |     |-- NO:  identify CPU cores, clock, cache, integrated graphics chip
  |-- Available memory
  |-- Display resolution / refresh rate
  |-- Thermal / power state (laptop vs. plugged in)
        |
CAPABILITY ENVELOPE
        |
QUALITY PROFILE SELECTION
        |
SATELLITE CONFIGURATION
        |
RENDER PIPELINE ACTIVE
```

### Capability Envelope

The **Capability Envelope** is the assessed maximum sustained rendering capacity of the current hardware. It is not a preset (low/medium/high). It is a calculated boundary that each Satellite receives as a budget.

### Quality Function

```
Q = f(H, R, T)

where:
  H = hardware capability (GPU compute, CPU capacity, memory)
  R = rendering demand (scene complexity, Element count, interaction rate)
  T = target frame time (inverse of desired frame rate)
```

Quality is a **continuously evaluated function**, not a setting. If the Architect opens a dense scene and frame time exceeds the target, Oculum adjusts the Capability Envelope downward. If Elements are removed and headroom opens, quality rises back. This is the Annex observation principle applied to the rendering pipeline itself.

### Adaptive Satellite Configuration

The same four Satellites run in every configuration. What changes is the budget each receives:

**Dedicated GPU (high capability)**

| Satellite | Configuration |
|---|---|
| Geometry Modeler | Full LOD range, high vertex count, dense meshes |
| Physics Generator | Fine-grained collision, high iteration count |
| Image Processor | Real-time shadows, PBR materials, post-processing |
| Pixel Setter | GPU command buffer, hardware rasterization, MSAA |

**Integrated Graphics (moderate capability)**

| Satellite | Configuration |
|---|---|
| Geometry Modeler | Aggressive LOD, simplified meshes, wider culling |
| Physics Generator | Reduced iteration, broadphase-dominant collision |
| Image Processor | Baked lighting, simplified materials, minimal post |
| Pixel Setter | GPU command buffer, reduced resolution, FXAA |

**CPU Only (minimal capability)**

| Satellite | Configuration |
|---|---|
| Geometry Modeler | Lowest LOD, wireframe-capable, maximum culling |
| Physics Generator | Essential collision only, fixed-step |
| Image Processor | Flat shading, no shadows, no post-processing |
| Pixel Setter | Software rasterizer, optimal resolution for CPU throughput |

### Architect Experience

The Architect never sees a graphics settings panel. The Oculum Constellation ensures what they see is the best representation their hardware can deliver at interactive speed. Visual fidelity scales. Architectural accuracy does not degrade. A CPU-only render shows the same Elements, Relations, and Shortfall states — drawn simpler.

---

# PART IV — REAGENT CATALOGS

## 8. Oculum Computation Reagents `[ACCEPTED]`

Approximately **105 Reagents** organized by consuming Satellite and shared infrastructure. Every Reagent is a Programmable Code Catalyst — an atomic function that Satellites compose into capability.

### 8.1 Geometry Modeler Reagents

**Linear Algebra Primitives**
- Matrix 4x4 multiply
- Matrix inverse
- Matrix transpose
- Quaternion multiply
- Quaternion to matrix
- Quaternion SLERP
- Vector normalize
- Vector dot product
- Vector cross product
- Vector add / subtract / scale

**Spatial Operations**
- AABB construct
- AABB intersection test
- OBB construct
- Frustum plane extract
- Frustum cull test
- Barycentric coordinate compute

**Mesh Operations**
- Triangle normal compute
- Vertex transform
- Vertex buffer pack
- Index buffer generate
- Mesh subdivide
- Mesh decimate
- Edge collapse
- Half-edge traverse
- LOD select

### 8.2 Physics Generator Reagents

**Intersection Tests**
- Ray-triangle intersect
- Ray-AABB intersect
- Ray-sphere intersect
- Separating axis test

**Collision**
- GJK collision detect
- EPA penetration depth
- Broadphase spatial hash insert / query
- BVH construct
- BVH traverse

**Integration**
- Euler integrate
- Verlet integrate
- RK4 integrate
- Constraint solve (sequential impulse)
- Spring-damper evaluate

**Interpolation**
- Linear interpolate
- Bezier evaluate
- Catmull-Rom spline evaluate
- Hermite evaluate
- Smoothstep

### 8.3 Image Processor Reagents

**Sampling**
- Bilinear texture sample
- Trilinear texture sample (mipmap)
- Cubemap environment sample
- Texture atlas lookup
- Mipmap generate

**Lighting**
- Phong / Blinn-Phong evaluate
- Cook-Torrance PBR BRDF evaluate
- Fresnel (Schlick approximation)
- Ambient occlusion sample
- Shadow depth compare
- Percentage-closer filter shadow

**Color**
- Color space convert (linear / sRGB / HSL)
- Tone map (Reinhard, ACES)
- HDR exposure adjust
- Gamma correct
- Gamma uncorrect

**Post-Processing**
- Gaussian blur kernel
- Bloom bright extract
- Normal map transform (tangent to world)
- Alpha blend

### 8.4 Pixel Setter Reagents

**Rasterization**
- Triangle edge function setup
- Scanline rasterize
- Viewport clip
- Scissor test

**Buffer Operations**
- Depth compare-and-write
- Stencil operation
- Framebuffer read
- Framebuffer write
- Framebuffer clear
- Double buffer swap

**Quality**
- MSAA sample resolve
- FXAA edge detect and blend
- Dither
- Alpha test
- Pixel blend (src/dst modes)
- Pixel format convert

### 8.5 Hardware Recon Reagents

- GPU enumerate
- GPU compute capability query
- VRAM query
- Integrated graphics detect
- CPU core count
- CPU clock query
- Cache topology query
- Display resolution query
- Display refresh rate query
- Available memory query
- Thermal state read
- Power state read (battery / AC)

### 8.6 Shared Infrastructure Reagents

- Memory pool allocate / free
- Object pool acquire / release
- Ring buffer
- High-resolution timer
- Perlin noise
- Simplex noise
- Clamp
- Min / Max
- Random generate (deterministic seed)
- SHA-256 (Element identity hashing)

---

## 9. Connection Reagents `[ACCEPTED]`

**37 Reagents** that provide the atomic connectivity primitives for all Umbilical and Tether connections across the entire AEGIS ecosystem. Every Constellation, Orb, and connected Element composes from this same set.

### 9.1 Channel Reagents (Cyan Capsule)

| Reagent | Function |
|---|---|
| Channel open | Establish a typed bidirectional data path between two endpoints |
| Channel close | Gracefully terminate a channel, draining pending messages |
| Channel state read | Return current channel condition (open, draining, closed, faulted) |
| Channel capacity check | Report available throughput and buffer depth |

### 9.2 Message Reagents (Amber Vial)

| Reagent | Function |
|---|---|
| Message serialize | Convert a typed payload to wire format (zero-copy where possible) |
| Message deserialize | Reconstruct a typed payload from wire format |
| Message validate | Check a payload against a declared contract schema |
| Message route | Direct a message to the correct channel by contract type |
| Message acknowledge | Confirm receipt and processing of a message |
| Message reject | Return a message with a rejection reason |

### 9.3 Handshake Reagents

| Reagent | Function |
|---|---|
| Registration pack | Bundle identity, version, manifest hash, specs, capability declaration, and contract requirements into a handshake payload |
| Registration unpack | Decompose a received handshake payload into verified fields |
| Registration verify | Validate manifest hash, check contract compatibility, confirm no conflicts |
| Handshake initiate | Send a registration pack and await acceptance |
| Handshake accept | Validate a received registration and return acceptance with terms |
| Handshake reject | Return rejection with specific reason (contract conflict, manifest mismatch, capacity) |
| Handshake complete | Finalize the connection after both sides confirm |

### 9.4 Health Reagents (Blue Lenticular Eye)

| Reagent | Function |
|---|---|
| Heartbeat send | Emit a lightweight liveness signal on a channel |
| Heartbeat check | Evaluate whether a heartbeat has been received within the expected window |
| Heartbeat timeout | Declare a connection unresponsive after missed heartbeats |
| Backpressure signal | Notify the sender that the receiver is approaching capacity |
| Flow regulate | Adjust message rate based on backpressure and capacity |

### 9.5 Contract Reagents (Purple Triangular Crystal)

| Reagent | Function |
|---|---|
| Contract match | Compare a provider's capability declaration against a consumer's requirements — return fit/gap |
| Contract verify | Check whether current obligations declared in a contract are being met |
| Contract form | Create a binding Relation Contract from matched capabilities and requirements |
| Contract dissolve | Terminate a contract with evidence of completion or reason for dissolution |
| Contract breach detect | Identify when a contracted obligation has been violated |

### 9.6 State Reagents (Multi-Gem Spheroid)

| Reagent | Function |
|---|---|
| State snapshot pack | Serialize current Element state into a transferable snapshot |
| State snapshot unpack | Reconstruct Element state from a received snapshot |
| State diff compute | Calculate the delta between two state snapshots |
| State diff apply | Apply a state delta to bring a snapshot current |
| State reconcile | Compare declared state with observed state and report divergence |

### 9.7 Lifecycle Reagents (Red Pointed Capsule)

| Reagent | Function |
|---|---|
| Graceful disconnect signal | Announce planned disconnection with drain window |
| Forced disconnect | Immediately sever a connection (fault condition) |
| Reconnect negotiate | Re-establish a previously held connection, resuming from last known state |
| Reconnect verify | Confirm that a reconnected channel's state matches expectations |
| Dependency register | Declare that one Element's lifecycle depends on this connection |
| Dependency check | Verify that all lifecycle dependencies are satisfied |

---

## 10. Vivarium Reagents `[ACCEPTED]`

**33 Reagents** that provide the atomic observation, execution, and illumination primitives for the Vivarium Constellation's Interaction Capture, Architecture Correlator, Execution Engine, and Illumination systems.

### 10.1 Trace Reagents

| Reagent | Function |
|---|---|
| Event capture | Record a raw interaction event with high-resolution timestamp |
| Event classify | Categorize an event (UI, network, state, lifecycle, error) |
| Event timestamp | Attach a monotonic high-resolution timestamp |
| Stack trace capture | Record the call stack at the point of an event |
| Element ID resolve | Map a runtime call site to its owning architectural Element |
| Trace link | Connect one event to the next in a causal chain |
| Trace complete | Close a trace when the interaction chain finishes |
| Trace serialize | Convert a completed trace to Ledger-ready format |
| Illumination signal emit | Send an Element activation signal to Oculum |
| Illumination signal clear | Signal that an Element is no longer active |
| Latency measure | Calculate elapsed time between two trace links |
| Error classify | Determine if a runtime error is a Shortfall or expected behavior |

### 10.2 Application Reagents

| Reagent | Function |
|---|---|
| Process spawn | Start an application process with specified arguments and environment |
| Process terminate | Gracefully stop a running process |
| Process health check | Verify a running process is responsive |
| Process crash detect | Identify unexpected process termination |
| Port allocate | Reserve an available network port for the application |
| Port release | Free a previously allocated port |
| Environment variable set | Inject a configuration value into the process environment |
| Environment variable read | Read a configuration value from the process environment |
| File watch register | Begin monitoring a file path for changes |
| File change detect | Identify that a watched file has been modified |
| Hot reload trigger | Signal the running process to reload changed code without restart |
| Stdout capture | Record standard output from the application process |
| Stderr capture | Record standard error from the application process |
| Exit code evaluate | Interpret the meaning of a process exit code |
| Resource measure | Sample CPU, memory, and I/O usage of the application process |
| Dependency resolve | Identify and verify runtime dependencies before process start |

### 10.3 Illumination Reagents

| Reagent | Function |
|---|---|
| Activation pulse | Generate a timed visual activation signal for one Element |
| Activation chain | Compose multiple activation pulses into a sequential flow |
| Activation intensity | Scale signal brightness by latency or load (hotter = slower) |
| Degradation signal | Mark an Element's illumination as degraded (error, slow, overloaded) |
| Flow direction | Indicate data flow direction between two illuminated Elements |

---

# PART V — CONNECTIVITY FORMULAS

## 10. Umbilical Formula `[ACCEPTED]`

The Umbilical is a **Formula** — it composes Connection Reagents into a higher-order capability with specific rules about lifecycle binding, mandatory enforcement, and bidirectional flow.

### Lifecycle Rule

The Constellation cannot outlive its Umbilical. If the Umbilical is severed and cannot reconnect, the Constellation enters a suspended state — it does not continue operating without POD CORE.

### Directionality

Bidirectional. Both POD CORE and Constellation send and receive.

### Reagent Composition

```
UMBILICAL FORMULA
|
|-- Channel open (bidirectional, typed)
|-- Registration pack (identity + manifest + specs + capability + contracts + environment)
|-- Handshake initiate -> Handshake accept -> Handshake complete
|-- Registration verify (POD CORE validates manifest, contracts, conflicts)
|-- Contract form (capability <-> requirement binding)
|-- Dependency register (Constellation lifecycle -> Umbilical)
|-- Heartbeat send / Heartbeat check (continuous)
|-- Flow regulate (backpressure-aware)
|-- State snapshot pack / unpack (for Continuity sync)
|-- Reconnect negotiate / verify (on interruption)
|-- Graceful disconnect signal (on planned shutdown)
```

### Contract Enforcement

Mandatory. A broken Umbilical contract triggers an immediate Shortfall through the Annex. The QuarterMaster opens a custodial case. The Constellation suspends non-essential operations until the Umbilical is restored or the Constellation is gracefully decommissioned.

### Data Flow

```
POD CORE -> CONSTELLATION
  |-- Element state updates
  |-- Canvas focus / Architect interaction events
  |-- Quality Governor directives (from Annex audits)
  |-- Upgrade dispatch commands
  |-- State restore requests (model switch, session resume)

CONSTELLATION -> POD CORE
  |-- Rendered output / computed results
  |-- Interaction hit results
  |-- Shortfall signals
  |-- Capability reports (hardware envelope)
  |-- Health telemetry
  |-- State snapshots (for Continuity Environment Tensor)
```

### 3D Asset States

| State | Model |
|---|---|
| Active, healthy | `UMBILICAL_AWESOME.glb` / `UMBILICAL_AWESOME_LONG.glb` |
| Active, extended | `UMBILICAL_LONG2.glb` / `UMBILICAL_SHORT.glb` |
| Severed / faulted | `UMBILICAL_BROKEN_LONG.glb` |

---

## 11. Tether Formula `[ACCEPTED]`

The Tether uses the same Connection Reagents as the Umbilical but with fundamentally different lifecycle semantics.

### Lifecycle Rule

Neither end depends on the Tether for survival. Either end can disconnect without killing the other. A severed Tether degrades capability but does not suspend operation.

### Directionality

Defined per Tether. Can be unidirectional (one provider, one consumer) or bidirectional (mutual exchange).

### Reagent Composition

```
TETHER FORMULA
|
|-- Channel open (typed, direction declared)
|-- Registration pack (identity + capability subset relevant to this peer)
|-- Handshake initiate -> Handshake accept -> Handshake complete
|-- Contract match (does this peer provide what I need?)
|-- Contract form (peer Relation Contract)
|-- Heartbeat send / Heartbeat check (optional, negotiated)
|-- Flow regulate (backpressure-aware)
|-- Contract verify (periodic)
|-- Contract dissolve (on intentional detach)
|-- Graceful disconnect signal (on planned detach)
|-- Reconnect negotiate (on interruption, optional)
```

### Contract Enforcement

Negotiated. A broken Tether contract does not suspend the Constellation — it triggers a **degraded capability report** through the Umbilical to POD CORE, where the Annex evaluates impact and decides whether it constitutes a Shortfall.

### Key Difference from Umbilical

No `Dependency register`. The Tether does not create a lifecycle dependency. Attach and detach are normal operations, not fault conditions.

---

# PART VI — THE VIVARIUM CONSTELLATION (RUN CHAMBER)

## 12. Vivarium Definition `[ACCEPTED]`

### Purpose

The **Vivarium Constellation** is the AEGIS VIBE Architect's internal application runtime — the controlled environment where the Architect's creation runs alive, observable, and under continuous custodial care without leaving the IDE.

The name comes from the practice of building controlled environments where living things are observed under real conditions. Temperature, humidity, lighting, substrate — the environment is designed so inhabitants can live naturally while the builder observes and intervenes only when needed. The Vivarium Constellation does the same for running software.

> **The Architect does not switch to an external browser, terminal, or test harness. The creation runs inside the Vivarium, and the Vivarium feeds what it observes back to the Canvas.**

### Classification

The Vivarium is a **Constellation**, not an Orb. It contains multiple cooperating Orbs with their own Satellites, maintains its own execution boundary (the running application's process space), and presents a unified external interface through its Umbilical and Tethers.

### Internal Architecture

```
VIVARIUM CONSTELLATION (Run Chamber)
|
|==UMBILICAL==> POD CORE
|     |-- IN:  Active Element registry, build state, Dispatch commands
|     |-- IN:  Architect interaction (run, stop, restart, inspect)
|     |-- OUT: Application state, Shortfall signals, health telemetry
|     |-- OUT: Runtime evidence for Ledger
|
|--TETHER-----> Oculum Constellation
|     |-- OUT: Illumination signals (which Elements are firing)
|     |-- OUT: Trace data (interaction-to-architecture chains)
|     |-- IN:  Canvas selection events (Architect clicked an Element,
|     |        show its runtime activity)
|
|--TETHER-----> Continuity Module
|     |-- OUT: Application runtime state snapshot
|     |-- IN:  State restore on session resume
|
|--TETHER-----> Annex
|     |-- OUT: Runtime Shortfall evidence packets
|     |-- IN:  Custodial directives (isolate, restart, rollback)
|
|-- ORB: Execution Engine
|     |-- SATELLITE: Process Manager
|     |-- SATELLITE: Environment Provisioner
|     |-- SATELLITE: Hot Reload Watcher
|
|-- ORB: Interaction Capture
|     |-- SATELLITE: Event Interceptor
|     |-- SATELLITE: Network Monitor
|     |-- SATELLITE: State Observer
|
|-- ORB: Architecture Correlator
|     |-- SATELLITE: Element Mapper
|     |-- SATELLITE: Trace Builder
|     |-- SATELLITE: Illumination Emitter
|
|-- ORB: Application Surface
|     |-- SATELLITE: Stellar Surface (native Stellar apps)
|     |-- SATELLITE: Web Surface (HTML/CSS/JS apps)
|     |-- SATELLITE: Service Surface (headless API/backend)
|     |-- SATELLITE: Terminal Surface (CLI apps)
|
|-- REAGENT FIELD
      |-- Trace Reagents + Application Reagents + Illumination Reagents
```

---

## 13. Execution Engine Orb `[ACCEPTED]`

The Execution Engine manages the lifecycle of the running application. It does not run the app — it manages the environment the app runs in.

### Process Manager Satellite

Starts, stops, restarts, and monitors application processes. Tracks PID, resource consumption, and crash state. Distinguishes between clean exit and unexpected termination.

**Input contract:** Run command with Element identity and configuration.
**Output contract:** Process handle with lifecycle events (started, healthy, degraded, crashed, stopped).

### Environment Provisioner Satellite

Sets up everything the app needs before it starts: runtime dependencies, port allocation, environment variables, database connections, file paths, configuration injection. The Architect does not configure dev environments — the Vivarium reads the architecture and provisions what is needed.

**Input contract:** Architecture declaration with dependency graph and configuration requirements.
**Output contract:** Provisioned environment with verified dependencies and allocated resources.

### Hot Reload Watcher Satellite

Monitors Element implementations for code changes. When a Reagent, Formula, Satellite, or Orb's implementation changes (detected by material hash drift), the Watcher determines the appropriate reload strategy:

```
CODE CHANGE DETECTED (material hash changed)
        |
HOT RELOAD WATCHER EVALUATES
  |-- Leaf Reagent change? -> Hot reload (inject without restart)
  |-- Satellite contract change? -> Warm restart (restart affected service)
  |-- Structural / Orb change? -> Cold restart (full cycle)
        |
EXECUTION ENGINE APPLIES
        |
APPLICATION CONTINUES WITH NEW CODE
        |
ANNEX OBSERVES (did the reload introduce a Shortfall?)
```

**Input contract:** File watch events with Element identity mapping.
**Output contract:** Reload directive (hot/warm/cold) with affected Element scope.

---

## 14. Interaction Capture Orb `[ACCEPTED]`

The observation engine. Everything that happens inside the running app is captured, classified, and made available for architecture correlation.

### Event Interceptor Satellite

Captures UI events: clicks, keypresses, form submissions, navigation, scroll, focus changes. Every user-facing interaction is recorded with a high-resolution timestamp and the component path that received it.

**Input contract:** Raw UI event stream from the Application Surface.
**Output contract:** Classified, timestamped event records with component identity.

### Network Monitor Satellite

Captures every network operation: HTTP requests and responses, WebSocket messages, database queries, file I/O. Records method, URL/path, payload size, response code, latency, and error state.

**Input contract:** Raw network event stream from the application process.
**Output contract:** Classified network records with timing and payload metadata.

### State Observer Satellite

Tracks application state transitions: component mounts/unmounts, state store mutations, route changes, session state, error boundaries. The Observer records what the application's internal state looked like at any point in time.

**Input contract:** State mutation events from the application runtime.
**Output contract:** State transition records with before/after snapshots.

### Combined Output

All three Satellites share a timeline:

```
EVENT STREAM
|-- timestamp: 1724351847.293
|-- type: UI_CLICK
|-- target: "Save Customer" button
|-- component: CustomerForm

NETWORK STREAM
|-- timestamp: 1724351847.312
|-- type: HTTP_POST
|-- url: /api/customers
|-- payload: 847 bytes
|-- response: 201 Created
|-- latency: 142ms

STATE STREAM
|-- timestamp: 1724351847.455
|-- type: STATE_MUTATION
|-- store: customerStore
|-- field: customers[]
|-- action: APPEND
```

---

## 15. Architecture Correlator Orb `[ACCEPTED]`

The bridge between "what the app did" and "which Elements did it." This is what makes the Vivarium fundamentally different from a browser dev tools panel.

### Element Mapper Satellite

Maintains a live mapping between runtime constructs (components, services, routes, handlers) and their architectural Elements (which Orb, which Satellite, which Formula, which Reagent).

This mapping comes from the Element Material Identity system (parent specification, Section 9). Every code-bearing Element carries an `ElementImplementationRecord` that binds implementation paths to Element identity. The Mapper inverts that index: given a runtime call stack, it resolves the Element chain.

**Input contract:** Runtime call stack or component identity.
**Output contract:** Resolved Element identity chain (Reagent -> Formula -> Satellite -> Orb).

### Trace Builder Satellite

Takes the raw event, network, and state streams from Interaction Capture and constructs **Architecture Traces** — ordered chains showing which Elements participated in each interaction.

**Input contract:** Correlated event/network/state streams with Element identity.
**Output contract:** Complete Architecture Trace with timing, Element chain, and health state.

Example Architecture Trace:

```
ARCHITECTURE TRACE: "Save Customer"
|
|-- [0] UI_CLICK -> CustomerForm (Formula: customer-ui)
|     timestamp: .293
|
|-- [1] HANDLER -> CustomerController (Satellite: customer-logic)
|     timestamp: .295
|     Reagents: validate-schema, sanitize-input
|
|-- [2] HTTP_POST -> APIGateway (Orb: api-gateway)
|     timestamp: .312
|     Reagents: route-match, auth-check, rate-limit
|
|-- [3] VALIDATION -> SchemaValidator (Satellite: schema-validation)
|     timestamp: .318
|     Reagents: json-schema-validate, constraint-check
|
|-- [4] PERSIST -> StorageOrb (Orb: storage)
|     timestamp: .334
|     Reagents: query-build, connection-acquire, execute, connection-release
|
|-- [5] RESPONSE -> APIGateway (Orb: api-gateway)
|     timestamp: .448
|     Reagents: response-serialize, header-set
|
|-- [6] STATE_MUTATION -> CustomerStore (Formula: customer-state)
|     timestamp: .455
|
|-- [7] UI_UPDATE -> CustomerList (Formula: customer-ui)
|     timestamp: .461
|
TOTAL: 168ms across 4 Orbs, 2 Satellites, 3 Formulas, 11 Reagents
```

### Illumination Emitter Satellite

Takes the Architecture Trace and sends **Illumination Signals** to Oculum through the Tether. These signals tell the Canvas which Elements to light up, in what order, with what timing.

**Input contract:** Completed Architecture Trace.
**Output contract:** Illumination Signal sequence delivered to Oculum via Tether.

```
ILLUMINATION SIGNAL
  |-- trace_id: TR-29847
  |-- sequence: [
  |     { element: "customer-ui", type: "Formula", at: .293, duration: 2ms },
  |     { element: "customer-logic", type: "Satellite", at: .295, duration: 17ms },
  |     { element: "api-gateway", type: "Orb", at: .312, duration: 136ms },
  |     { element: "schema-validation", type: "Satellite", at: .318, duration: 16ms },
  |     { element: "storage", type: "Orb", at: .334, duration: 114ms },
  |     { element: "customer-state", type: "Formula", at: .455, duration: 3ms },
  |     { element: "customer-ui", type: "Formula", at: .461, duration: 4ms }
  |   ]
  |-- health: ALL_HEALTHY
  |-- latency_budget: WITHIN
```

The Architect clicks "Save Customer" in the Vivarium. On the Canvas, the Orbs and Satellites light up in sequence — a visible pulse flowing through the architecture. The Architect can see their creation working.

---

## 16. Application Surface Orb `[ACCEPTED]`

The rendering surface where the running application is visible to the Architect. Different application types activate different Surface Satellites:

### Stellar Surface Satellite

For applications built in Stellar. **Zero translation.** The app renders natively inside the Vivarium at full speed. The IDE and the app share the same substrate. This is the golden path.

### Web Surface Satellite

For HTML/CSS/JS applications. The Vivarium hosts a web rendering surface. The key difference from an external browser: the Web Surface is fully instrumented by Interaction Capture. Every DOM event, network call, and state change is captured at the source, not reconstructed from dev tools.

### Service Surface Satellite

For headless backend services and APIs. No visual rendering — instead, the Surface shows request/response flow, active connections, queue depth, and health. A live architecture diagram of the running service, not a terminal dumping stdout.

### Terminal Surface Satellite

For CLI applications. An embedded terminal that captures stdin/stdout/stderr and correlates output to the Elements that produced it.

### Multi-Surface Support

A full-stack application can activate multiple Surface Satellites simultaneously — Web Surface for the frontend and Service Surface for the backend. The Architecture Correlator traces across the boundary, and the Illumination Emitter shows the full request flow from UI click through API to database and back.

---

## 17. Interaction-to-Architecture Trace — The Architect's Experience `[ACCEPTED]`

### Normal Operation

```
ARCHITECT IS DESIGNING
        |
CLICKS "RUN" (or app is already running via Hot Reload)
        |
VIVARIUM ACTIVATES
  |-- Execution Engine provisions and starts
  |-- Application Surface renders the running app
  |-- Interaction Capture begins observing
        |
ARCHITECT INTERACTS WITH THEIR APP
        |
EVERY INTERACTION:
  |-- Vivarium captures it
  |-- Correlator maps it to Elements
  |-- Trace Builder constructs the Architecture Trace
  |-- Illumination Emitter sends signals to Oculum
  |-- Canvas lights up the participating Elements
        |
ARCHITECT SEES:
  Left: Canvas with Orbs and Satellites pulsing with activity
  Right: Their app running live in the Vivarium
  Connection: Every click in the app illuminates the architecture
```

### Shortfall Detection

```
RUNTIME ERROR IN VIVARIUM
        |
INTERACTION CAPTURE: error event captured
ERROR CLASSIFY: this is a Shortfall, not expected behavior
TRACE BUILDER: trace shows error originated in StorageOrb
ILLUMINATION EMITTER: StorageOrb glows RED on the Canvas
        |
SIMULTANEOUSLY:
ANNEX receives Shortfall evidence through Tether
QUARTERMASTER opens a custodial case
TRIAGE begins with the full Architecture Trace as evidence
        |
ARCHITECT SEES:
  Canvas: StorageOrb is red, everything else is healthy
  Vivarium: error state visible in the app
  Status: "StorageOrb — Shortfall detected, Triage in progress"
        |
ARCHITECT CONTINUES DESIGNING
  The Annex is handling it
```

---

# PART VII — ANNEX CUSTODIAL COVERAGE FOR CONSTELLATIONS

## 18. Custodial Membership Through the Umbilical `[ACCEPTED]`

The Umbilical handshake does not merely establish data flow. It establishes **custodial membership**. The moment a Constellation completes its Umbilical handshake, the Annex assumes full custodial responsibility.

The Constellation does not maintain its own health. The POD CORE does.

Three tiers of custodial coverage apply:

### 18.1 Instant Response Triage

The Annex observes the Constellation continuously through the Umbilical. It does not poll — it watches.

```
ANOMALY DETECTED (by Annex, not by Constellation, not by Architect)
        |
QUARTERMASTER OPENS CASE
  |-- Which Satellite is over budget?
  |-- Is it a regression from a recent change?
  |-- Is it a hardware state change (thermal throttle, battery switch)?
  |-- What is the probable fault region?
  |-- What evidence is available?
        |
TRIAGE COMPLETE — before the Architect notices
        |
AUTOMATED ADJUSTMENT (within Quality Governor authority)
  or
PATCH PROPOSED TO CONDUCTOR (requires Dispatch)
  or
SHORTFALL REPORTED TO ARCHITECT (if structural)
```

### 18.2 Scheduled Optimization Audits

The Annex performs periodic optimization audits using the local reasoning model:

```
OPTIMIZATION AUDIT — OCULUM (scheduled)

PERFORMANCE BASELINE
  |-- Average frame time vs. target
  |-- Per-Satellite budget utilization
  |-- Headroom percentage

DRIFT CHECK
  |-- Manifest hash: matches registered?
  |-- Reagent versions: current?
  |-- Satellite contracts: satisfied?
  |-- Hardware envelope: changed?

OPPORTUNITY ANALYSIS
  |-- Underutilized budgets (can raise quality)
  |-- Approaching limits (should monitor)
  |-- Available Reagent updates in Apothecary
  |-- Threshold adjustments given current headroom

RECOMMENDATION
  |-- Safe adjustments: Quality Governor applies directly
  |-- Structural changes: routed through Dispatch and Conductor
```

### 18.3 Upgrades When Appropriate

```
EXCHANGE PUBLISHES NEW ELEMENT VERSION
        |
ANNEX DETECTS (during scheduled audit)
        |
EVALUATION
  |-- Is current Element in Shortfall?
  |-- Does upgrade address a known issue?
  |-- Does upgrade improve a measured bottleneck?
  |-- What is the upgrade's Sigil status?
  |-- What is the upgrade's Stellar status?
  |-- Risk assessment
        |
RECOMMENDATION TO CONDUCTOR
        |
CONDUCTOR ANALYSIS
  |-- Contract compatibility confirmed
  |-- Reagent dependencies available
  |-- Rollback path exists
  |-- Decision: DISPATCH or DEFER
        |
DISPATCH (if approved)
  |-- New version installed alongside current
  |-- QA runs against Element contracts
  |-- Regression suite passes
  |-- Performance benchmark confirms improvement
  |-- New version promoted to active
  |-- Prior version retained as rollback
  |-- Ledger records upgrade with full provenance
```

The full lifecycle from Umbilical handshake forward:
- **Failures** are caught and triaged before the Architect notices
- **Performance** is audited on schedule and optimized within headroom
- **Evolution** happens when better capability arrives and passes verification

---

# PART VIII — REAGENT TOTALS AND APOTHECARY SUMMARY

## 19. Current Reagent Census `[ACCEPTED]`

| Domain | Count | Section |
|---|---|---|
| Geometry Modeler | 19 | 8.1 |
| Physics Generator | 18 | 8.2 |
| Image Processor | 19 | 8.3 |
| Pixel Setter | 16 | 8.4 |
| Hardware Recon | 12 | 8.5 |
| Shared Infrastructure | 10 | 8.6 |
| **Subtotal: Oculum Computation Reagents** | **94** | |
| Channel | 4 | 9.1 |
| Message | 6 | 9.2 |
| Handshake | 7 | 9.3 |
| Health | 5 | 9.4 |
| Contract | 5 | 9.5 |
| State | 5 | 9.6 |
| Lifecycle | 6 | 9.7 |
| **Subtotal: Connection Reagents** | **37** | |
| Trace | 12 | 10.1 |
| Application | 16 | 10.2 |
| Illumination | 5 | 10.3 |
| **Subtotal: Vivarium Reagents** | **33** | |
| | | |
| **Total Reagents Cataloged** | **164** | |

Additional Reagent families will be cataloged as new Constellations, Orbs, and Satellites are designed.

---

# PART IX — OPEN QUESTIONS AND DISCOVERY QUEUE

## 20. Open Items

### 20.1 Escalation Boundary Design `[OPEN]`
How does the local Ollama model determine when to escalate to the frontier? Confidence-threshold, operation-type classification, or a hybrid approach? See Section 2.

### 20.2 Run Chamber Architecture `[RESOLVED — See Part VI]`
**Resolved 2026-08-22.** The Run Chamber is the **Vivarium Constellation** — a full Constellation with 4 Orbs (Execution Engine, Interaction Capture, Architecture Correlator, Application Surface), 13 Satellites, and 33 dedicated Reagents. It supports 4 application surface types (Stellar, Web, Service, Terminal) and connects to Oculum via Tether for Interaction-to-Architecture Trace illumination. See Sections 12-17.

### 20.3 Continuity Tensor Serialization Format `[OPEN]`
The 8-tensor Continuity Module (parent specification, Part VI) requires a persistence format that supports sub-second model synchronization. Format choice determines whether model switching feels seamless or introduces perceptible delay.

### 20.4 GPU Command Buffer Interface `[OPEN]`
When a GPU is present, the Pixel Setter Satellite targets a GPU command buffer rather than a software framebuffer. The thin interface between the Pixel Setter and GPU hardware needs specification — likely as one or more Reagents within the Pixel Setter's dependency set.

### 20.5 Minimum Viable Slice `[OPEN]`
Which subset of the full architecture delivers the most value soonest? Candidate: Genesis + Element Material Identity + Continuity (parent specification Phases B, D, G). Custodial Recovery (Phase F) is the most novel feature but depends on the identity and continuity foundations.

### 20.6 Reagent Visual Taxonomy Finalization `[OPEN]`
Seven Reagent forms exist as concept art. Pending: separation into individual assets, to3D conversion to .glb, and confirmation of form-to-family mapping. Lumin to create when available.

### 20.7 Tether 3D Asset `[OPEN]`
Umbilical has 5 model variants including a broken state. Tether needs its own visual form — visually distinct from Umbilical to communicate "optional peer connection" vs. "required lifeline." Lumin to create when available.

### 20.8 Vivarium 3D Assets `[OPEN]`
The Vivarium Constellation needs its own visual form for the Canvas. Candidates: a terrarium/chamber container that visually encloses the running application, with glass-like transparency showing the app running inside. The four Application Surface Satellites may need distinct visual forms. Lumin to create when available.

### 20.9 Web Surface Translation Layer `[OPEN]`
The Stellar Surface runs apps with zero translation (golden path). The Web Surface necessarily introduces a rendering layer for HTML/CSS/JS. Specification needed for how the Web Surface is instrumented by Interaction Capture while minimizing translation overhead. May require a dedicated Reagent set for DOM instrumentation.

---

# APPENDIX A — DOCUMENT HISTORY

| Date | Version | Change | Section(s) |
|---|---|---|---|
| 2026-08-15 | 0.1 | Initial document created from design session | All |
| 2026-08-22 | 0.2 | Renamed Ingredient -> Reagent throughout | All |
| | | Added "Programmable Code Catalysts" designation | Part II, Section 3 |
| | | Added 3D Asset Library inventory | Part II, Section 3 |
| | | Added Reagent Visual Taxonomy | Part II, Section 3 |
| | | Added 37 Connection Reagents catalog | Part IV, Section 9 |
| | | Added Umbilical Formula specification | Part V, Section 10 |
| | | Added Tether Formula specification | Part V, Section 11 |
| | | Added Umbilical 3D asset state mapping | Part V, Section 10 |
| | | Added Reagent Census (131 total) | Part VII, Section 13 |
| | | Noted Codex relocation to M:\ drive | Project reference |
| 2026-08-22 | 0.3 | Added Vivarium Constellation (Run Chamber) | Part VI, Sections 12-17 |
| | | Added 33 Vivarium Reagents (Trace, Application, Illumination) | Part IV, Section 10 |
| | | Added Interaction-to-Architecture Trace specification | Section 17 |
| | | Added Canvas Illumination pipeline | Section 17 |
| | | Added 4 Application Surface types (Stellar, Web, Service, Terminal) | Section 16 |
| | | Updated Reagent Census (164 total: 94 + 37 + 33) | Part VIII, Section 19 |
| | | Resolved Run Chamber open question | Part IX, Item 20.2 |
| | | Added new open items: Vivarium 3D assets, Web Surface translation | Part IX, Items 20.8-20.9 |
| | | Renumbered sections for Vivarium insertion | Parts VI-IX |

---

# APPENDIX B — TERMINOLOGY ALIGNMENT

The parent specification (`AEGIS_VIBE_ARCHITECT_LIVING_DEVELOPMENT_ENVIRONMENT_SPEC_v1.0.md`) uses the term **Ingredient** at the atomic tier. This document adopts **Reagent** as the canonical term based on the Apothecary metaphor: in an Apothecary, you work with Reagents — active, catalytic substances — not passive ingredients.

When reading the parent specification, substitute:
- "Ingredient" -> **Reagent**
- "Ingredient tier" -> **Reagent tier**
- "Ingredient Scale" (Section 8) -> **Reagent Scale**

The parent specification will be updated to reflect this terminology change in its next revision.
