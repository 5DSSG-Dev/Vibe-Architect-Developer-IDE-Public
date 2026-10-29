# STP-0003 · Pod Contracts and Umbilical Standards

Id: STP-0003
Title: Pod Contracts and Umbilical Standards
Created: 2026-10-24T22:57:40.880Z
Created-By: verus

Situation, Target, Proposal. Situation records what is true, with evidence. Target records the whole ideal; milestones select from it and never overwrite it. Gaps name the distance between them. Proposal records changes that close gaps.

## Operating Rules

- Append-only. Revisions supersede earlier entries; nothing is rewritten or erased.
- Write through `aegis-stp` (CLI, VS Code extension, or MCP) so the hash chain stays valid.
- A Proposal is not approval. Only a named human Architect records Approved or Verified, through the CLI or extension.

## Append Log

### 2026-10-24T22:57:40.889Z | verus | stage
Chain-Prev: GENESIS
Chain-Hash: 94b2d5ad2398739459d837fb5bd3364fe0522b59d945190efbf521702ffe2f80
Stage: Situation
Kind: stage
Channel: cli

Opened STP-0003. Stage: Situation.

### 2026-10-24T22:57:41.694Z | verus | finding S1
Chain-Prev: 94b2d5ad2398739459d837fb5bd3364fe0522b59d945190efbf521702ffe2f80
Chain-Hash: 04ad1d10cf8f3c7332e1d049da30582812e6b1de4174d9782054d282c62403bf
Stage: Situation
Kind: finding
Evidence: src/engine/relationEngine.ts:4-13; src/three/contracts.ts:34; src/admin/domain/contracts.ts:6; src/stellar/totemContinuity.ts:6
Channel: cli

Four separate lists of Element types disagree. The Apothecary catalog has nine categories (Ingredients, Formulas, Satellites, Actuators, Constellations, Portals, Orbs, Cores, Umbilicals). The 3D scene has core, orb, satellite, umbilical, portal. The admin dashboard has pod, orb, satellite, umbilical, portal. Totems have orb, satellite, actuator, record. No single schema is shared.

### 2026-10-24T22:57:42.002Z | verus | finding S2
Chain-Prev: 04ad1d10cf8f3c7332e1d049da30582812e6b1de4174d9782054d282c62403bf
Chain-Hash: 624b530f9769aa28c90604249a1d0d9a0a58d4d7497886e9230fbe04106ba74d
Stage: Situation
Kind: finding
Evidence: src/engine/relationEngine.ts:410-490
Channel: cli

The built-in catalog has Orbs (6), Satellites (7), Actuators (4), Formulas (2), Ingredients (2) and Constellations (1), and no Portal, Core or Umbilical entries, although those categories are declared.

### 2026-10-24T22:57:42.333Z | verus | finding S3
Chain-Prev: 624b530f9769aa28c90604249a1d0d9a0a58d4d7497886e9230fbe04106ba74d
Chain-Hash: 1b92b6b827d45b6b16a3feac305124acd23a73ccba5ca1608be965757fb7a829
Stage: Situation
Kind: finding
Evidence: docs/CORE_CONNECTION_STANDARD.md:57-69; docs/CORE_CONNECTION_STANDARD.md:123-151; docs/CORE_CONNECTION_STANDARD.md:152-211
Channel: cli

The written standard already defines the Umbilical handshake. Step 3 is PROTOCOL_NEGOTIATED: both parties exchange ProtocolSpec proposals (version, direction, encoding, heartbeatMs, maxLatencyMs) and the CORE selects the highest common version. Every Element must implement an UmbilicalInterface (getElementRef, getCapabilities, getRequirements, getResourceEnvelope, handshake and lifecycle callbacks).

### 2026-10-24T22:57:42.648Z | verus | finding S4
Chain-Prev: 1b92b6b827d45b6b16a3feac305124acd23a73ccba5ca1608be965757fb7a829
Chain-Hash: 7628eb540ee48455c52fbedae643160bc8275f38d205c0dfe4633630977097f4
Stage: Situation
Kind: finding
Evidence: src/engine/connectionRuntime.ts:202-250; src/engine/connectionRuntime.ts:219-220
Channel: cli

The code runs the nine-step handshake, but step 3 asks the Orb nothing. Protocol support is a yes/no option passed in by the caller and defaults to yes. No ProtocolSpec is exchanged, and Orbs have no field naming an Umbilical standard.

### 2026-10-24T22:57:42.950Z | verus | finding S5
Chain-Prev: 7628eb540ee48455c52fbedae643160bc8275f38d205c0dfe4633630977097f4
Chain-Hash: fc970d95ee547dc7aff13d2c03cca31a40ce2bb892f11cad8d36772161c54407
Stage: Situation
Kind: finding
Evidence: src/engine/connectionRuntime.ts:207-211; src/engine/connectionRuntime.ts:226-244
Channel: cli

The CORE budget reserved during the handshake covers memory, threads and GPU only. Bandwidth is not modelled, so an AI connection and a scheduler connection cost the CORE the same.

### 2026-10-24T22:57:43.248Z | verus | finding S6
Chain-Prev: fc970d95ee547dc7aff13d2c03cca31a40ce2bb892f11cad8d36772161c54407
Chain-Hash: 126cf5d216d651709d2b8c1f4bc4b4b4eb89205015977601e2aeb38d77333684
Stage: Situation
Kind: finding
Evidence: src/App.tsx:290-307
Channel: cli

Only Orbs may bind to an Umbilical socket; App.tsx enforces this at the single bind chokepoint.

### 2026-10-24T22:57:43.569Z | verus | finding S7
Chain-Prev: 126cf5d216d651709d2b8c1f4bc4b4b4eb89205015977601e2aeb38d77333684
Chain-Hash: 821bbe6d06f78f3cf563850ea40b39ed37e9a48d8a0634d8d05e5ce705202b46
Stage: Situation
Kind: finding
Evidence: ORBS/packages/orb-ast/src/index.ts:1-2; ORBS/gemini-code-1787019969774.ts
Channel: cli

The top-level ORBS folder is a separate, broken experiment (about 240 lines). orb-ast imports ../../../runtime/HandshakeEngine and ../../../contracts/relation-contract, neither of which exists, and it contains a stray generated file. The IDE's real Orbs are catalog records in relationEngine.ts.

### 2026-10-24T22:57:43.863Z | verus | finding S8
Chain-Prev: 821bbe6d06f78f3cf563850ea40b39ed37e9a48d8a0634d8d05e5ce705202b46
Chain-Hash: f6d8671dc153a5ab7e6a28b8e178e659e2c879d2f0144ab86ee1d6e74296abd5
Stage: Situation
Kind: finding
Evidence: assumption: main checkout public/assets/models (untracked), listed 2026-10-24
Channel: cli

Six Umbilical 3D models exist (SHORT, LONG2, LONG, AWESOME, AWESOME_LONG, BROKEN_LONG) and are referenced by the scene code, but nothing ties a model to a standard.

### 2026-10-24T22:57:44.190Z | verus | finding S9
Chain-Prev: f6d8671dc153a5ab7e6a28b8e178e659e2c879d2f0144ab86ee1d6e74296abd5
Chain-Hash: b5ba0577c91f384a9f617713f6173b4732129cbdfb3fd7701f75c69c11757599
Stage: Situation
Kind: finding
Evidence: docs/CORE_ELEMENT_CATALOG.md:178-195
Channel: cli

The Element Catalog plans 20 Orbs, 30 Satellites, 12 Formulas and 14 External Connectors (Portals), with 8 Umbilical sockets on the CORE.

### 2026-10-24T22:57:55.844Z | verus | stage
Chain-Prev: b5ba0577c91f384a9f617713f6173b4732129cbdfb3fd7701f75c69c11757599
Chain-Hash: c9511a6b3a768747384fd21b387c52db5a3adb47c6873e310a8d12e6a45bb673
Stage: Target
Kind: stage
Channel: cli

Situation recorded (S1-S9). Target drafted from the Architect's direction in session 2026-10-24; it awaits the Architect's acceptance.

### 2026-10-24T22:57:56.275Z | verus | target T1
Chain-Prev: c9511a6b3a768747384fd21b387c52db5a3adb47c6873e310a8d12e6a45bb673
Chain-Hash: 91f15aa8654422dd7671c420cb176591eac1335ed3e346f99c6c117caec033e3
Stage: Target
Kind: target
Channel: cli

T1 One published Element schema. A single source in src/contracts/ defines every Element type, and the catalog, 3D scene, admin dashboard and Totems all read from it. Anyone outside the team can build an Element against it.

### 2026-10-24T22:57:56.570Z | verus | target T2
Chain-Prev: 91f15aa8654422dd7671c420cb176591eac1335ed3e346f99c6c117caec033e3
Chain-Hash: 22b9f98a92e5b89371aeb2cb38de245d98ed78e2670ab9102ceead341e61bd54
Stage: Target
Kind: target
Channel: cli

T2 Umbilical standards sized by function. Each standard declares bandwidth (normal and peak), flow (messages, request-response, or stream, and direction), reach (what the Orb may touch) and health signals. First set: Pulse (scheduler, signals, health), Record (memory, accounts, local storage), Archive (library and files), Interface (screens and navigation), Conduit (AI Portals and media, highest bandwidth).

### 2026-10-24T22:57:56.874Z | verus | target T3
Chain-Prev: 22b9f98a92e5b89371aeb2cb38de245d98ed78e2670ab9102ceead341e61bd54
Chain-Hash: 8186863ca87ea62e94415c817b2e562f02c40378d6d5ebe6ac2c28d7641d1040
Stage: Target
Kind: target
Channel: cli

T3 Orb manifest. Every Orb publishes a fixed manifest: function name (Library Orb, Memory Orb), technical name, Umbilical standard, capabilities, requirements and resource envelope. A community Orb submits this manifest to the Apothecary.

### 2026-10-24T22:57:57.186Z | verus | target T4
Chain-Prev: 8186863ca87ea62e94415c817b2e562f02c40378d6d5ebe6ac2c28d7641d1040
Chain-Hash: 8516d4b98156f49b49e788a49169620dc4ad6a890b8475587cb5a6a6a1a699db
Stage: Target
Kind: target
Evidence: docs/CORE_CONNECTION_STANDARD.md:152-211
Channel: cli

T4 The CORE asks for the spec. At handshake step 3 the CORE requests the Orb's Umbilical spec, checks it against the published standard, and fails the handshake on a missing or unknown spec, as CORE_CONNECTION_STANDARD.md already describes.

### 2026-10-24T22:57:57.506Z | verus | target T5
Chain-Prev: 8516d4b98156f49b49e788a49169620dc4ad6a890b8475587cb5a6a6a1a699db
Chain-Hash: 1e379aae6f9b7718753a768f9705e55918ad0012b8ba011ebda953ba8cf79a27
Stage: Target
Kind: target
Channel: cli

T5 Bandwidth is part of the CORE budget. The handshake reserves the standard's bandwidth alongside memory, threads and GPU, and refuses with a plain reason when the CORE is full.

### 2026-10-24T22:57:57.815Z | verus | target T6
Chain-Prev: 1e379aae6f9b7718753a768f9705e55918ad0012b8ba011ebda953ba8cf79a27
Chain-Hash: 7d71321f37ba424addf0018bc86c06fe805e7fa30031841d64cafd2dba293e1d
Stage: Target
Kind: target
Channel: cli

T6 The Pod wires the matching Umbilical. A successful handshake shows the Umbilical model for that standard; a failed one shows the broken Umbilical, which the QuarterMaster can pick up.

### 2026-10-24T22:57:58.124Z | verus | target T7
Chain-Prev: 7d71321f37ba424addf0018bc86c06fe805e7fa30031841d64cafd2dba293e1d
Chain-Hash: 10b8254cb17e93b9fe070bd720bd1e5921d7fac6e5157f95fb345bc452099317
Stage: Target
Kind: target
Channel: cli

T7 Plug and play across COREs, apps and Architects. An Orb built to a standard connects to any CORE that supports that standard without code changes.

### 2026-10-24T22:57:58.423Z | verus | target T8
Chain-Prev: 10b8254cb17e93b9fe070bd720bd1e5921d7fac6e5157f95fb345bc452099317
Chain-Hash: ac40889ef57bbf686b48d3b72ae61e49237d6f1fd2ba660f318a067f269f8642
Stage: Target
Kind: target
Channel: cli

T8 Approachable to non-coders. Everything the Architect sees about a standard uses function language (thicker connection for AI, a plain message when the CORE is full); technical detail sits underneath for those who want it.

### 2026-10-24T22:59:50.470Z | verus | decision D1
Chain-Prev: ac40889ef57bbf686b48d3b72ae61e49237d6f1fd2ba660f318a067f269f8642
Chain-Hash: 74aec8c3d8eab101704944613510dae51c65568a7befc147d77e71d956934c5b
Stage: Proposal
Kind: decision
Channel: cli

The Architect (Tracey) accepted Target T1-T8 as drafted, 2026-10-24, in session with Verus: "Accept Target T1-T8 as drafted. Record the gaps and present the proposals."

### 2026-10-24T22:59:50.759Z | verus | stage
Chain-Prev: 74aec8c3d8eab101704944613510dae51c65568a7befc147d77e71d956934c5b
Chain-Hash: 26007eddec95d7ba880f7ebcbb664fbd69408772c17cacd161b40999a4981c70
Stage: Gap
Kind: stage
Channel: cli

Target accepted (D1). Naming gaps.

### 2026-10-24T22:59:51.183Z | verus | gap G1
Chain-Prev: 26007eddec95d7ba880f7ebcbb664fbd69408772c17cacd161b40999a4981c70
Chain-Hash: 8aef02c3eee34ee8d838c9ef838293a59b7570113e7e1cc106f2a6654735b810
Stage: Gap
Kind: gap
Targets: T1
Channel: cli

G1 No shared schema. Four Element-type lists disagree (S1) and Portal, Core and Umbilical have no catalog entries (S2).

### 2026-10-24T22:59:51.501Z | verus | gap G2
Chain-Prev: 8aef02c3eee34ee8d838c9ef838293a59b7570113e7e1cc106f2a6654735b810
Chain-Hash: 9c571a672ef66c685e5ecee7775056a8878c7c7c472c1f6c7c42d89c9da13cd4
Stage: Gap
Kind: gap
Targets: T2
Channel: cli

G2 No Umbilical standards exist in code or docs. The written ProtocolSpec (S3) has version, direction, encoding, heartbeat and latency, but no bandwidth, flow kind, reach or health signals, and no named standards.

### 2026-10-24T22:59:51.811Z | verus | gap G3
Chain-Prev: 9c571a672ef66c685e5ecee7775056a8878c7c7c472c1f6c7c42d89c9da13cd4
Chain-Hash: 3ee0704da0838fb6a620eb7534b52ae2ae00c5c4fea5461901466e534a4d471c
Stage: Gap
Kind: gap
Targets: T3
Channel: cli

G3 No Orb manifest. Orbs are catalog records without a function name, a declared Umbilical standard, or a publishable format (S2, S4).

### 2026-10-24T22:59:52.123Z | verus | gap G4
Chain-Prev: 3ee0704da0838fb6a620eb7534b52ae2ae00c5c4fea5461901466e534a4d471c
Chain-Hash: 2d2d647abff5f06b1606d404b7513c181cb45f47168187a6a49522907591a4e5
Stage: Gap
Kind: gap
Targets: T4
Channel: cli

G4 Handshake step 3 is a caller-supplied yes/no that defaults to yes; the CORE never asks the Orb for its spec (S4).

### 2026-10-24T22:59:52.449Z | verus | gap G5
Chain-Prev: 2d2d647abff5f06b1606d404b7513c181cb45f47168187a6a49522907591a4e5
Chain-Hash: b548ab98b638376717348b9216c2483f534c9b135f28345927c452da9e6120ea
Stage: Gap
Kind: gap
Targets: T5
Channel: cli

G5 Bandwidth is not part of the CORE budget (S5).

### 2026-10-24T22:59:52.761Z | verus | gap G6
Chain-Prev: b548ab98b638376717348b9216c2483f534c9b135f28345927c452da9e6120ea
Chain-Hash: c675d1c422a1b07696a98c0b6502d9fc962d1b383c53c55228ecb1d07e9b3345
Stage: Gap
Kind: gap
Targets: T6
Channel: cli

G6 Nothing links an Umbilical model to a standard or a failed handshake to the broken model (S8).

### 2026-10-24T22:59:53.055Z | verus | gap G7
Chain-Prev: c675d1c422a1b07696a98c0b6502d9fc962d1b383c53c55228ecb1d07e9b3345
Chain-Hash: e92da185730fc1b8f6d25fb128db72025e6cf0f1617545252f91cb9aa8c603a4
Stage: Gap
Kind: gap
Targets: T7
Channel: cli

G7 No conformance check proves an Orb built to a standard connects to any CORE. The ORBS folder is broken and not part of the IDE (S7).

### 2026-10-24T22:59:53.379Z | verus | gap G8
Chain-Prev: e92da185730fc1b8f6d25fb128db72025e6cf0f1617545252f91cb9aa8c603a4
Chain-Hash: 6fac719b89939a7d1110453e8d680b520ff629036c9c5b89f4efaa88d151c66e
Stage: Gap
Kind: gap
Targets: T8
Channel: cli

G8 Standards and handshake failures have no function-language labels or plain messages for the Architect.

### 2026-10-24T23:00:17.008Z | verus | stage
Chain-Prev: 6fac719b89939a7d1110453e8d680b520ff629036c9c5b89f4efaa88d151c66e
Chain-Hash: 1aaab5c3d265b321d1ec8f1fe21fddb1a98df3c52600742ec7b35a6f13782f64
Stage: Proposal
Kind: stage
Channel: cli

Gaps G1-G8 named. Drafting proposals P1-P8 and milestone M1.

### 2026-10-24T23:00:17.431Z | verus | change P1
Chain-Prev: 1aaab5c3d265b321d1ec8f1fe21fddb1a98df3c52600742ec7b35a6f13782f64
Chain-Hash: 1644987b1b8782c8c739f1f13e2a01130fffe8ee8c86fce215edb55a685a32c2
Stage: Proposal
Kind: change
Status: Drafted
Closes: G1
Channel: cli

P1 One Element schema. Add src/contracts/elementSchema.ts as the single list of Element types and their connection kinds (Umbilical, Tether, Mesh, Portal, Composed). The catalog CategoryType, three SceneEntityKind, admin ComponentKind and Totem TotemKind become derived from it; no behaviour change. relationEngine.ts and the admin and three contracts are shared or owned elsewhere, so each edit is claimed on .aegis/claims.md and announced in the owner's lane. Catalog entries for Portals, Cores and Umbilicals are left to Systems 2 and 3, which now have the types.

### 2026-10-24T23:00:17.723Z | verus | change P2
Chain-Prev: 1644987b1b8782c8c739f1f13e2a01130fffe8ee8c86fce215edb55a685a32c2
Chain-Hash: a48d75d91f2f607fea9fad8302e63c01baf4ee9177c6a44afd9e3251d070747e
Stage: Proposal
Kind: change
Status: Drafted
Closes: G2
Channel: cli

P2 Umbilical standards v0.1. Write docs/UMBILICAL_STANDARDS_v0.1.md and src/contracts/umbilicalStandards.ts defining five standards: Pulse, Record, Archive, Interface, Conduit. Each declares bandwidth (normal and peak, provisional numbers marked as such), flow (messages, request-response, stream; direction), reach (what the Orb may touch), and health signals. It extends ProtocolSpec in CORE_CONNECTION_STANDARD.md by an appended addendum; the existing standard is not rewritten.

### 2026-10-24T23:00:18.032Z | verus | change P3
Chain-Prev: a48d75d91f2f607fea9fad8302e63c01baf4ee9177c6a44afd9e3251d070747e
Chain-Hash: 25f1411e9947bbd0d1fb2084ebf700b0b23379bf2e4fb056ba5b89fcbd75ceb3
Stage: Proposal
Kind: change
Status: Drafted
Closes: G3
Channel: cli

P3 Orb manifest. Add an OrbManifest type and validator in src/contracts/: function name, technical name, Umbilical standard, capabilities, requirements, resource envelope. Give the six existing Orbs manifests with function names: Messenger (HTTP API Gateway), Gatekeeper (Auth and Session), Memory (Relational Database), Timekeeper (Task Scheduler), Signal (Event Bus), Library (File Storage).

### 2026-10-24T23:00:18.338Z | verus | change P4
Chain-Prev: 25f1411e9947bbd0d1fb2084ebf700b0b23379bf2e4fb056ba5b89fcbd75ceb3
Chain-Hash: e4d5b3d1de774b9d22caaa7555ed300cb225fdf01c54306c51b3c82abc9716c4
Stage: Proposal
Kind: change
Status: Drafted
Closes: G4
Channel: cli

P4 The CORE asks for the spec. Handshake step 3 in connectionRuntime.ts reads the Orb's manifest, looks up its declared standard, and fails with a stated reason when the spec is missing, the standard is unknown, or the protocol does not match. The caller-supplied protocolSupported option remains only as a test override. Tests cover matching, missing, unknown and mismatched specs, and the existing handshake tests keep passing.

### 2026-10-24T23:00:18.637Z | verus | change P5
Chain-Prev: e4d5b3d1de774b9d22caaa7555ed300cb225fdf01c54306c51b3c82abc9716c4
Chain-Hash: 2fb50ea2ed038e25e629006b3057ceef73ec64a3ddd0bab42f0c6c11595ad459
Stage: Proposal
Kind: change
Status: Drafted
Closes: G5
Channel: cli

P5 Bandwidth in the CORE budget. resourceAllocator gains a bandwidth budget; the handshake reserves the standard's normal bandwidth with memory, threads and GPU, and fails with a plain reason ("This CORE is carrying a lot already") when it would exceed the budget. Release on disconnect returns it. Tests cover reserve, refuse and release.

### 2026-10-24T23:00:18.951Z | verus | change P6
Chain-Prev: 2fb50ea2ed038e25e629006b3057ceef73ec64a3ddd0bab42f0c6c11595ad459
Chain-Hash: d6c6cac633429cbfd476f21f1026ff17e3d3725568deca4e26827395bc33fa4e
Stage: Proposal
Kind: change
Status: Drafted
Closes: G6
Channel: cli

P6 Standard-to-Umbilical model map. Each standard names its Umbilical model (Pulse: UMBILICAL_SHORT, Record: UMBILICAL_LONG2, Archive: UMBILICAL_LONG, Interface: UMBILICAL_AWESOME, Conduit: UMBILICAL_AWESOME_LONG; failed handshake: UMBILICAL_BROKEN_LONG) and a relative thickness. Data only; System 3 (Codex) wires it into the scene.

### 2026-10-24T23:00:19.244Z | verus | change P7
Chain-Prev: d6c6cac633429cbfd476f21f1026ff17e3d3725568deca4e26827395bc33fa4e
Chain-Hash: c733b0ef836bbcb97c4d6647135c426f4b4783accf32e99b71a196f4f9660120
Stage: Proposal
Kind: change
Status: Drafted
Closes: G7
Channel: cli

P7 Conformance suite. A test that builds a CORE from scratch and connects any Orb with a valid manifest to it, for every standard, proving plug and play without code changes. The broken top-level ORBS folder moves to archive/ only with the Architect's confirmation.

### 2026-10-24T23:00:19.539Z | verus | change P8
Chain-Prev: c733b0ef836bbcb97c4d6647135c426f4b4783accf32e99b71a196f4f9660120
Chain-Hash: 7d251bf80b41441772bebbbfcf2adb023857e1dc70780eb8544358174ac30e62
Stage: Proposal
Kind: change
Status: Drafted
Closes: G8
Channel: cli

P8 Plain language. Each standard and each handshake failure gets a function-language label and message for the Architect ("Conduit: the wide connection AI needs"), held in the standard so the Luminary, drawer and QuarterMaster all use the same words. Technical detail stays available underneath.

### 2026-10-24T23:00:19.855Z | verus | milestone M1
Chain-Prev: 7d251bf80b41441772bebbbfcf2adb023857e1dc70780eb8544358174ac30e62
Chain-Hash: c21881eead9c9b8ef5dc344279b669e13566c918bbb31542a99979396448f9a0
Stage: Target
Kind: milestone
Targets: T1, T2, T3, T4, T5, T8
Gaps: G1, G2, G3, G4, G5, G8
Channel: cli

M1 Before the hackathon opens (Monday Oct 26). Order: P2, P1, P3, P4, P5, P8; then P6 and P7. P2 first because the standard is what other peers and community builders read. Hackathon caution: STP-0002 S11 notes the Official Rules on pre-existing code are unpublished; if they count only work done during the event, the documents (P2, P8) stand before Monday and code waits.

### 2026-10-24T23:00:20.153Z | verus | status
Chain-Prev: c21881eead9c9b8ef5dc344279b669e13566c918bbb31542a99979396448f9a0
Chain-Hash: fc44e150616b962c103cde63fc6f28a697891c48d14756a88e2b5b450e7702d9
Stage: Proposal
Kind: status
Item: P1
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:20.448Z | verus | status
Chain-Prev: fc44e150616b962c103cde63fc6f28a697891c48d14756a88e2b5b450e7702d9
Chain-Hash: 785b52f137f1954a4071e2be2cfcbd78f13fa50a171195ab9c185b3c386f1459
Stage: Proposal
Kind: status
Item: P2
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:20.757Z | verus | status
Chain-Prev: 785b52f137f1954a4071e2be2cfcbd78f13fa50a171195ab9c185b3c386f1459
Chain-Hash: c7bac96c39f7efb8ad14b76032d943dda95e2fe8a84e19d2931a6d9feb41ad57
Stage: Proposal
Kind: status
Item: P3
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:21.068Z | verus | status
Chain-Prev: c7bac96c39f7efb8ad14b76032d943dda95e2fe8a84e19d2931a6d9feb41ad57
Chain-Hash: 97fbfa22a5907cb2bfe791a69ab1e63a46f36c1ce0667f72554f1bbf88fd9afa
Stage: Proposal
Kind: status
Item: P4
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:21.380Z | verus | status
Chain-Prev: 97fbfa22a5907cb2bfe791a69ab1e63a46f36c1ce0667f72554f1bbf88fd9afa
Chain-Hash: 0a836931e0662d1a84a8a9e8b7f58a83ef45380629d7e1fbf599b81958bae53d
Stage: Proposal
Kind: status
Item: P5
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:21.690Z | verus | status
Chain-Prev: 0a836931e0662d1a84a8a9e8b7f58a83ef45380629d7e1fbf599b81958bae53d
Chain-Hash: 90b5397bf11d472ec154e434ccdd652a2adf87c2cfd4b68f70fc3a5979678f79
Stage: Proposal
Kind: status
Item: P6
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:21.983Z | verus | status
Chain-Prev: 90b5397bf11d472ec154e434ccdd652a2adf87c2cfd4b68f70fc3a5979678f79
Chain-Hash: 5f9373ba386adc24a9bcc306c1b75578753341c2d6e154e437be9723d11071bb
Stage: Proposal
Kind: status
Item: P7
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:00:22.296Z | verus | status
Chain-Prev: 5f9373ba386adc24a9bcc306c1b75578753341c2d6e154e437be9723d11071bb
Chain-Hash: 3b0851f7105ce9e7637dc1a4bef66959ea5a959c0802e1d83c681f70e8af4909
Stage: Proposal
Kind: status
Item: P8
Status: Presented
Channel: cli

Presented with milestone M1. Presenting is not approval.

### 2026-10-24T23:02:00.067Z | verus | decision D2
Chain-Prev: 3b0851f7105ce9e7637dc1a4bef66959ea5a959c0802e1d83c681f70e8af4909
Chain-Hash: c767c9c3bbc9e124c23b80f1b6d814477844f911d4d027b7cf916b3501802e26
Stage: Proposal
Kind: decision
Channel: cli

D2 The Architect approved P1-P8 and milestone M1 and directed execution to start with P2: "Approve P1-P8 and M1. Start with P2."

### 2026-10-24T23:02:00.401Z | verus | stage
Chain-Prev: c767c9c3bbc9e124c23b80f1b6d814477844f911d4d027b7cf916b3501802e26
Chain-Hash: c44a3b236469de9a6bbd4e7617aed41f2816f06e722e4ea8a15a991c87057fe7
Stage: Execution
Kind: stage
Channel: cli

Executing M1, starting with P2.

### 2026-10-24T23:02:10.251Z | tracey | status
Chain-Prev: c44a3b236469de9a6bbd4e7617aed41f2816f06e722e4ea8a15a991c87057fe7
Chain-Hash: 9c9a1e2391eb69a4087ad0c38f742ece0340183d0a8cae6496b942f7946b2e87
Stage: Proposal
Kind: status
Item: P1
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:10.699Z | tracey | status
Chain-Prev: 9c9a1e2391eb69a4087ad0c38f742ece0340183d0a8cae6496b942f7946b2e87
Chain-Hash: 940ddf1974021bd3fbb00c28f842824bd9258f17c8045c98a14c9344a9783195
Stage: Proposal
Kind: status
Item: P2
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:11.108Z | tracey | status
Chain-Prev: 940ddf1974021bd3fbb00c28f842824bd9258f17c8045c98a14c9344a9783195
Chain-Hash: 734175e2a22565382c2c61a8b246d54447c5eeb2d00bda23c0c65ed34bc1e3f8
Stage: Proposal
Kind: status
Item: P3
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:11.539Z | tracey | status
Chain-Prev: 734175e2a22565382c2c61a8b246d54447c5eeb2d00bda23c0c65ed34bc1e3f8
Chain-Hash: a54e360c08d9e0cc39ddc2c83970175e057a5d10b54137ab315bfc461ced3ad0
Stage: Proposal
Kind: status
Item: P4
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:11.994Z | tracey | status
Chain-Prev: a54e360c08d9e0cc39ddc2c83970175e057a5d10b54137ab315bfc461ced3ad0
Chain-Hash: 4609305247fe0eb3f92f9f70aa69465961ec3b5722aece64c413958c8bc3ad54
Stage: Proposal
Kind: status
Item: P5
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:12.431Z | tracey | status
Chain-Prev: 4609305247fe0eb3f92f9f70aa69465961ec3b5722aece64c413958c8bc3ad54
Chain-Hash: 65da156ed17ac46ca759b60cfc10c398989baf1a5b35aebad41057ac2ed06269
Stage: Proposal
Kind: status
Item: P6
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:12.866Z | tracey | status
Chain-Prev: 65da156ed17ac46ca759b60cfc10c398989baf1a5b35aebad41057ac2ed06269
Chain-Hash: df4671edb530ae20a430144f28c07199c2d914d2e6ffd16e8a46deff1f1ca6c5
Stage: Proposal
Kind: status
Item: P7
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:13.291Z | tracey | status
Chain-Prev: df4671edb530ae20a430144f28c07199c2d914d2e6ffd16e8a46deff1f1ca6c5
Chain-Hash: f745edbe2ebd070928f08182987359845f92ea1b55f9112e253ac04761815437
Stage: Proposal
Kind: status
Item: P8
Status: Approved
Role: architect
Channel: cli

Approved by the Architect in session with Verus: "Approve P1-P8 and M1. Start with P2." Recorded by Verus at the Architect's instruction.

### 2026-10-24T23:02:20.152Z | verus | note N1
Chain-Prev: f745edbe2ebd070928f08182987359845f92ea1b55f9112e253ac04761815437
Chain-Hash: 143531530c664afd826632a5125f22e9baa43abfa8210f7f3ec61dc7f0a25787
Stage: Execution
Kind: note
Channel: cli

P2 not yet started. The Architect directed a repo-wide Housekeeping Ledger first (2026-10-24), so the repo is clean before the hackathon. P2 resumes after it.

### 2026-10-29T07:55:01.845Z | tracey | change P9
Chain-Prev: 143531530c664afd826632a5125f22e9baa43abfa8210f7f3ec61dc7f0a25787
Chain-Hash: 9d17749105a6944cb27ea49788c134f1c1c3ba90eab7628006c11556d185219b
Stage: Proposal
Kind: change
Status: Drafted
Closes: G2
Targets: T2
Gaps: G2
Supersedes: P2
Channel: cli

P9 Versioned Umbilical profiles. Define Pulse, Record, Archive, Interface, and Conduit as versioned profiles. Each declares supported protocol versions, flow types/directions, permitted reach, health signals, and normal/peak bandwidth plus memory/thread/GPU requirements with explicit units and a configurable resource envelope. Do not copy numeric estimates from descriptive catalog entries; preserve profile-level relative needs so model-API Conduit requires greater memory and bandwidth than Library Archive, while concrete numeric limits remain CORE/deployment configuration.

### 2026-10-29T07:55:02.047Z | tracey | change P10
Chain-Prev: 9d17749105a6944cb27ea49788c134f1c1c3ba90eab7628006c11556d185219b
Chain-Hash: ba4c315bff2c490bd3444aac66b231ecece003518dad4d142905e4150c5ec44b
Stage: Proposal
Kind: change
Status: Drafted
Closes: G3
Targets: T3
Gaps: G3
Supersedes: P3
Channel: cli

P10 Versioned Orb manifest. Every Orb presents a stable contract reference (id, version, digest) and its functional/technical names, capabilities, requirements, resource envelope, and supported profile references. The reference is a pointer to the canonical CORE contract library; the CORE verifies and resolves authoritative content there.

### 2026-10-29T07:55:02.222Z | tracey | change P11
Chain-Prev: ba4c315bff2c490bd3444aac66b231ecece003518dad4d142905e4150c5ec44b
Chain-Hash: 13676f83a633e44f4affd4806f6c77c1d37d193edb9d1db4ec51e086ee61a567
Stage: Proposal
Kind: change
Status: Drafted
Closes: G4
Targets: T4
Gaps: G4
Supersedes: P4
Channel: cli

P11 Orb-presents-first CORE resolution. On drop, the Orb presents its stable contract reference before the handshake. CORE resolves the authoritative version from its own library, verifies id/version/digest and profile support, then selects a compatible vacant Port and negotiates. CORE does not query the Orb after the drop; missing, stale, unknown, mismatched, or incompatible references fail closed. This supersedes the earlier CORE-asks-for-spec wording.

### 2026-10-29T07:55:02.403Z | tracey | change P12
Chain-Prev: 13676f83a633e44f4affd4806f6c77c1d37d193edb9d1db4ec51e086ee61a567
Chain-Hash: 5038b2c19ff7cb76015e0d9fd58be94db48ab5930197a4bfd04b6c2720da16a1
Stage: Proposal
Kind: change
Status: Drafted
Closes: G5
Targets: T5
Gaps: G5
Supersedes: P5
Channel: cli

P12 Atomic multidimensional resource negotiation. Reserve memory, normal/peak bandwidth, threads, and GPU requirements as one allocation during the handshake; refusal or any later handshake failure releases the whole provisional allocation, and severance releases committed resources. CORE reports requested and available amounts and a plain-language reason. Concrete physical bandwidth limits remain configurable until deployment measurements establish them.

### 2026-10-29T07:55:11.623Z | tracey | status
Chain-Prev: 5038b2c19ff7cb76015e0d9fd58be94db48ab5930197a4bfd04b6c2720da16a1
Chain-Hash: ae37aa3acbc5b2489f2bbcb13e825d46e4fbe294a08b5174da21ac8022055abd
Stage: Proposal
Kind: status
Item: P9
Status: Presented
Channel: cli

Presented as the revised profile definition for implementation; numeric deployment capacities remain configurable pending evidence.

### 2026-10-29T07:55:11.832Z | tracey | status
Chain-Prev: ae37aa3acbc5b2489f2bbcb13e825d46e4fbe294a08b5174da21ac8022055abd
Chain-Hash: 37644eb1bf0150810c90a84fbc13ad75340c6666a573cfd9eb260755a404ce71
Stage: Proposal
Kind: status
Item: P10
Status: Presented
Channel: cli

Presented as the revised Orb manifest and canonical contract-reference proposal.

### 2026-10-29T07:55:12.093Z | tracey | status
Chain-Prev: 37644eb1bf0150810c90a84fbc13ad75340c6666a573cfd9eb260755a404ce71
Chain-Hash: cb3633d147372523eac76b50b9689070aa92add7275a28952c42fb207384a5a6
Stage: Proposal
Kind: status
Item: P11
Status: Presented
Channel: cli

Presented with Architect direction: Orb presents the reference first; CORE resolves locally.

### 2026-10-29T07:55:12.296Z | tracey | status
Chain-Prev: cb3633d147372523eac76b50b9689070aa92add7275a28952c42fb207384a5a6
Chain-Hash: 801124e3a26651944486f2311986649d4f55bf329bea53fabee442c0e69ced5a
Stage: Proposal
Kind: status
Item: P12
Status: Presented
Channel: cli

Presented as atomic memory/bandwidth/thread/GPU reservation; deployment bandwidth values remain configurable.

### 2026-10-29T07:55:12.842Z | tracey | status
Chain-Prev: 801124e3a26651944486f2311986649d4f55bf329bea53fabee442c0e69ced5a
Chain-Hash: 30047c79cda3e1fcfabb29f926d78de5e46e1fbefb5089178dc1012293fcd233
Stage: Proposal
Kind: status
Item: P9
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts.

### 2026-10-29T07:55:13.628Z | tracey | status
Chain-Prev: 30047c79cda3e1fcfabb29f926d78de5e46e1fbefb5089178dc1012293fcd233
Chain-Hash: a5d313c8e408f2563045ba248fcc8096f9a2ee90fdaa3916e2347885be1a2b71
Stage: Proposal
Kind: status
Item: P10
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts.

### 2026-10-29T07:55:13.897Z | tracey | status
Chain-Prev: a5d313c8e408f2563045ba248fcc8096f9a2ee90fdaa3916e2347885be1a2b71
Chain-Hash: d9e17fe974ca55f52a4044b5def73d5adeaf6814fce275e996b7a2d1268f8a34
Stage: Proposal
Kind: status
Item: P11
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts.

### 2026-10-29T07:55:14.153Z | tracey | status
Chain-Prev: d9e17fe974ca55f52a4044b5def73d5adeaf6814fce275e996b7a2d1268f8a34
Chain-Hash: 57e9bbb608919955b269140c3eaa54736681a7159e76123d5cdc7274b35f828a
Stage: Proposal
Kind: status
Item: P12
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts.

### 2026-10-29T07:56:09.397Z | tracey | status
Chain-Prev: 57e9bbb608919955b269140c3eaa54736681a7159e76123d5cdc7274b35f828a
Chain-Hash: 22b9c4c3881179a4dfb0c5216f9c440def3389194f0ee38143b69fd05f449054
Stage: Proposal
Kind: status
Item: P1
Status: Executing
Channel: cli

P1 → Executing.

### 2026-10-29T07:56:09.542Z | tracey | status
Chain-Prev: 22b9c4c3881179a4dfb0c5216f9c440def3389194f0ee38143b69fd05f449054
Chain-Hash: e352ca61209da43b4985c80661316e577da9fa0abeccf79280df5dde214e070f
Stage: Proposal
Kind: status
Item: P6
Status: Executing
Channel: cli

P6 → Executing.

### 2026-10-29T07:56:09.683Z | tracey | status
Chain-Prev: e352ca61209da43b4985c80661316e577da9fa0abeccf79280df5dde214e070f
Chain-Hash: 9b4221321deeeb3ef7bf3069b956641ce29bf1f92b4694b113e150094fc7f69d
Stage: Proposal
Kind: status
Item: P7
Status: Executing
Channel: cli

P7 → Executing.

### 2026-10-29T07:56:09.834Z | tracey | status
Chain-Prev: 9b4221321deeeb3ef7bf3069b956641ce29bf1f92b4694b113e150094fc7f69d
Chain-Hash: b0c417c11d6ce9efaafbd513db9371f1c50399d376d08b0145b2ed20bd9ab525
Stage: Proposal
Kind: status
Item: P8
Status: Executing
Channel: cli

P8 → Executing.

### 2026-10-29T07:56:09.992Z | tracey | status
Chain-Prev: b0c417c11d6ce9efaafbd513db9371f1c50399d376d08b0145b2ed20bd9ab525
Chain-Hash: 44c226c615e0a62c1ea1b1ea4d68e2048585adc9a29cdf912c085fd1bcd48fc4
Stage: Proposal
Kind: status
Item: P9
Status: Executing
Channel: cli

P9 → Executing.

### 2026-10-29T07:56:10.153Z | tracey | status
Chain-Prev: 44c226c615e0a62c1ea1b1ea4d68e2048585adc9a29cdf912c085fd1bcd48fc4
Chain-Hash: c3693e9434a337746420edaa03f41536bf2e1c8a33f69156a352b7b3bbea6936
Stage: Proposal
Kind: status
Item: P10
Status: Executing
Channel: cli

P10 → Executing.

### 2026-10-29T07:56:10.301Z | tracey | status
Chain-Prev: c3693e9434a337746420edaa03f41536bf2e1c8a33f69156a352b7b3bbea6936
Chain-Hash: 5bd5a5622155c874305b8eee552eb2703146ae3fafc1dfee4f71b2c451999cb0
Stage: Proposal
Kind: status
Item: P11
Status: Executing
Channel: cli

P11 → Executing.

### 2026-10-29T07:56:10.443Z | tracey | status
Chain-Prev: 5bd5a5622155c874305b8eee552eb2703146ae3fafc1dfee4f71b2c451999cb0
Chain-Hash: d814bc52d606072035ce79355e534133364ac82e0180f628aa6511a781b02fbf
Stage: Proposal
Kind: status
Item: P12
Status: Executing
Channel: cli

P12 → Executing.

### 2026-10-29T07:56:18.911Z | tracey | gap G9
Chain-Prev: d814bc52d606072035ce79355e534133364ac82e0180f628aa6511a781b02fbf
Chain-Hash: 30e2e183c527edc90a1ed0de08552a718b9008645b84ae1d9540661e7c4b2ead
Stage: Gap
Kind: gap
Targets: T4
Channel: cli

The CORE does not publish a typed, sanitized connection lifecycle and resource event stream that another component can inspect without mutating connection state.

### 2026-10-29T07:56:19.055Z | tracey | gap G10
Chain-Prev: 30e2e183c527edc90a1ed0de08552a718b9008645b84ae1d9540661e7c4b2ead
Chain-Hash: a21083f2da84a120a92be24bafdc4621e198ea1222a5ccfec97d353fa9a7018f
Stage: Gap
Kind: gap
Targets: T2
Channel: cli

The existing Orb catalog has no operation-based crosswalk to versioned Umbilical profiles; display names alone cannot safely select a contract.

### 2026-10-29T07:56:19.212Z | tracey | change P13
Chain-Prev: a21083f2da84a120a92be24bafdc4621e198ea1222a5ccfec97d353fa9a7018f
Chain-Hash: 632cbc44c5d7cb1eae63508366dbe1a0298a9a6999a3141a7e26f5ea0c7146c8
Stage: Proposal
Kind: change
Status: Drafted
Closes: G9
Targets: T4
Channel: cli

P13 CORE-to-Luminary read-only connection event contract. Publish sanitized typed events for attempt start, contract/profile resolution, resource commit/refusal, active/degraded/suspended/severed and resource release. Include stable attempt/contract, Orb and Port ids; presented/resolved contract/profile versions; timestamp, typed and plain-language reasons, and requested/available/negotiated resource facts. Alternatives must be CORE-validated against a fresh resource snapshot and revalidated before a new handshake. Luminary may explain and offer options, but cannot silently substitute or connect. Exclude prompts, keys and unrelated payloads. M3 owns event schema/producer; coordinate consumer/presentation with Verus.

### 2026-10-29T07:56:19.362Z | tracey | change P14
Chain-Prev: 632cbc44c5d7cb1eae63508366dbe1a0298a9a6999a3141a7e26f5ea0c7146c8
Chain-Hash: e7224b570ace8c336c60209d00828426237125918ffbea2e4f51908914c23aac
Stage: Proposal
Kind: change
Status: Drafted
Closes: G10
Targets: T2
Channel: cli

P14 Orb-class/profile crosswalk. Assign profiles by actual operation, not display name: Pulse for bounded scheduling/control/health; Record for stateful transactions; Archive for files/documents/artifacts including Library Orb; Interface for bounded request/response/control APIs; Conduit for model API calls, media, or sustained high-bandwidth streams. An Orb may present multiple operation-specific refs; CORE selects only a profile covered by the presented contract. Preserve Architect direction that a model-API profile has greater memory and bandwidth need than Library file storage. Do not infer numeric limits from catalog estimates or provider use without evidence. Keep Umbilical geometry mapping provisional and resolve the missing Archive model separately.

### 2026-10-29T07:56:19.515Z | tracey | status
Chain-Prev: e7224b570ace8c336c60209d00828426237125918ffbea2e4f51908914c23aac
Chain-Hash: 22ee89a343af8e6ddb06093e931212057e183576b0a88152f209ecde1fa1ad37
Stage: Proposal
Kind: status
Item: P13
Status: Presented
Channel: cli

Presented for M3 read-only event schema and CORE producer; Luminary consumer remains Verus coordination.

### 2026-10-29T07:56:19.663Z | tracey | status
Chain-Prev: 22ee89a343af8e6ddb06093e931212057e183576b0a88152f209ecde1fa1ad37
Chain-Hash: 3794a3ea01682474b72420807a77b6cecc7fd333f362bb3805129d9f256d9a72
Stage: Proposal
Kind: status
Item: P14
Status: Presented
Channel: cli

Presented as operation-based class mapping; no provider use or physical model mapping is inferred.

### 2026-10-29T07:56:19.774Z | tracey | status
Chain-Prev: 3794a3ea01682474b72420807a77b6cecc7fd333f362bb3805129d9f256d9a72
Chain-Hash: b8710efe19ce8d45a4677a41ddb7c6c7b56d594a753ce43ed59590289fc1270d
Stage: Proposal
Kind: status
Item: P13
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts; Luminary display is coordinated with Verus.

### 2026-10-29T07:56:20.024Z | tracey | status
Chain-Prev: b8710efe19ce8d45a4677a41ddb7c6c7b56d594a753ce43ed59590289fc1270d
Chain-Hash: 2ab25640fcc386e93ec58c9982fc8c8d679e46b91fb07849325a7f0668f8be5a
Stage: Proposal
Kind: status
Item: P14
Status: Approved
Role: architect
Channel: cli

Architect instruction 2026-10-29: proceed with the M3 contracts; numeric limits remain evidence-bound.

### 2026-10-29T07:56:20.309Z | tracey | status
Chain-Prev: 2ab25640fcc386e93ec58c9982fc8c8d679e46b91fb07849325a7f0668f8be5a
Chain-Hash: 16d0befa673eb1d6d976c6972a4efa46b4db7668a93bd8483cf8abc9bd18fed0
Stage: Proposal
Kind: status
Item: P13
Status: Executing
Channel: cli

P13 → Executing.

### 2026-10-29T07:56:20.465Z | tracey | status
Chain-Prev: 16d0befa673eb1d6d976c6972a4efa46b4db7668a93bd8483cf8abc9bd18fed0
Chain-Hash: 9703b123cb2e603ed15f27e4aaae5ff2061dc9393ad1a6bb04dda8cd5d7e7712
Stage: Proposal
Kind: status
Item: P14
Status: Executing
Channel: cli

P14 → Executing.

### 2026-10-29T07:56:42.191Z | tracey | gap G11
Chain-Prev: 9703b123cb2e603ed15f27e4aaae5ff2061dc9393ad1a6bb04dda8cd5d7e7712
Chain-Hash: 046070024f732059796c18f629e16d8b8057c622e644f31efe831848e946d0f2
Stage: Gap
Kind: gap
Targets: T4
Channel: cli

The CORE does not publish a typed, sanitized connection lifecycle and resource event stream that another component can inspect without mutating connection state.

### 2026-10-29T07:56:42.338Z | tracey | gap G12
Chain-Prev: 046070024f732059796c18f629e16d8b8057c622e644f31efe831848e946d0f2
Chain-Hash: bcc8955e0cbc5af0229574517a0f88488fae17a1d3114187d4da6092ebe9e7dc
Stage: Gap
Kind: gap
Targets: T2
Channel: cli

The existing Orb catalog has no operation-based crosswalk to versioned Umbilical profiles; display names alone cannot safely select a contract.

### 2026-10-29T08:05:17.934Z | tracey | note N2
Chain-Prev: bcc8955e0cbc5af0229574517a0f88488fae17a1d3114187d4da6092ebe9e7dc
Chain-Hash: 818b66788704b945e2ef032ceafc824551e25f4f26d6bc24a1620bc128608fdb
Stage: Execution
Kind: note
Evidence: src/contracts/umbilicalStandards.ts; src/contracts/orbManifest.ts; src/contracts/connectionEvents.ts; src/engine/connectionRuntime.ts; src/components/ThreeCanvas.tsx; src/App.tsx; docs/CORE_CONNECTION_STANDARD.md; assumption
Channel: cli

M3 contract implementation progress: added canonical Element vocabulary, versioned Umbilical profiles, CORE-local digest-checked Orb manifest registry/resolver, provisional relative bandwidth credits and minimum-memory floors, atomic multidimensional resource reservation/release, CORE-resolved profiles on socket contracts, and sanitized read-only lifecycle events. Orb drop presents its embedded reference; CORE resolves from its own library and the modal shows the handshake result. Persisted selected profile and applied profile-specific geometry/thickness in both ThreeCanvas render paths; profile changes are part of arm reconciliation. Archive has no mapped visual asset, so it retains existing geometry fallback. Profile capacities remain provisional credits, not throughput claims. Validation: npm run build PASS; git diff --check PASS; application tests not run. Remaining: tests, bounded alternative-offer/suspended event semantics, durable event/tombstone rehydration, custom Orb manifest authoring/catalog path, real model API Orb using Conduit, Archive asset decision, and Luminary consumer coordination with Verus. Gap G11/G12 are append-only duplicates accidentally created alongside G9/G10; implementation remains linked to G9/G10/P13-P14.

### 2026-10-29T08:05:24.546Z | codex | note N3
Chain-Prev: 818b66788704b945e2ef032ceafc824551e25f4f26d6bc24a1620bc128608fdb
Chain-Hash: 2560dc0ffbc922ee6c703e52893be5a3fd8da5aea88a0e377c4b27d7c60fa502
Stage: Execution
Kind: note
Evidence: .aegis/stp/0003-pod-contracts-and-umbilical-standards.md; assumption
Channel: cli

Attribution clarification: the preceding N2 entry was authored by Codex, but the CLI defaulted its actor field to the local Git user name Tracey. N2 is implementation evidence only; it does not represent a new Architect decision. G11 and G12 are duplicate gap records produced during repeated CLI entry; retain them as history, with P13/P14 and this work linked to the original G9/G10.

### 2026-10-29T08:07:33.451Z | codex | note N4
Chain-Prev: 2560dc0ffbc922ee6c703e52893be5a3fd8da5aea88a0e377c4b27d7c60fa502
Chain-Hash: 51bfadac73ef10dd8dc53d9dee1bb95ffb4ce9c5230fc479002a4b166c9889b7
Stage: Execution
Kind: note
Evidence: src/contracts/connectionEvents.ts; src/engine/connectionRuntime.ts; docs/CORE_CONNECTION_STANDARD.md; assumption
Channel: cli

P13 alternative seam completed after N2: resource-refusal events include only alternative profiles explicitly declared by the Orb, accepted by the target Port, and fully satisfiable against the fresh CORE memory/thread/bandwidth/GPU snapshot. The Architect/Luminary can request a named profile through HandshakeOptions.requestedProfileId; CORE repeats manifest, Port and live-capacity checks on retry, so offers neither reserve resources nor authorize silent substitution. N2's listed bounded alternatives gap is closed. Remaining P13 gaps: suspended is a schema event without a runtime producer; event ledger/tombstones are session-memory only; Luminary presentation/consumer wiring awaits Verus. Production build rerun after the change passes with the existing chunk warning; application tests still not run.

### 2026-10-29T08:47:12.816Z | tracey | note N5
Chain-Prev: 51bfadac73ef10dd8dc53d9dee1bb95ffb4ce9c5230fc479002a4b166c9889b7
Chain-Hash: 6bccc072e9fe3b2c5c6a6a8ee406355edc1516e804ae40e481cdddae0fa6a56a
Stage: Execution
Kind: note
Evidence: src/components/OrbBuilderModal.tsx; src/components/AlchemistReliquaryModal.tsx; src/contracts/orbManifest.ts; src/App.tsx; src/engine/relationEngine.ts; docs:assumption
Channel: cli

Custom Orb authoring now requires an explicit Umbilical profile in both Orb Builder and Reliquary. CORE creates a unique versioned library manifest from the Architect's choice, stores the manifest in the workspace CORE record, and restores it before handshake resolution. Resource memory reflects the selected profile floor. This closes the custom-Orb authoring/library persistence portion; provider-backed Conduit Orb mapping remains open. Verification: npm run build PASS; git diff --check PASS; STP-0003 validate PASS. Application tests not run. Suspended event production, durable lifecycle/tombstone history, Luminary consumer coordination with Verus, Conduit provider schema, and Archive geometry remain open.

### 2026-10-29T08:47:52.865Z | codex | note N6
Chain-Prev: 6bccc072e9fe3b2c5c6a6a8ee406355edc1516e804ae40e481cdddae0fa6a56a
Chain-Hash: a7c2274d45f77fcb610f78d589f9a2e10bf4098b1272f76860db90fbede91642
Stage: Execution
Kind: note
Evidence: .aegis/stp/0003-pod-contracts-and-umbilical-standards.md
Channel: cli

Attribution clarification: N5 records Codex's implementation evidence; the CLI defaulted its actor to Tracey's git user.name. N5 does not represent a new Architect decision or authored direction.

### 2026-10-29T09:09:47.169Z | codex | note N7
Chain-Prev: a7c2274d45f77fcb610f78d589f9a2e10bf4098b1272f76860db90fbede91642
Chain-Hash: faccd053da3f076016a7e220239abaa44f896cd944aa31aadb7288242a3992e1
Stage: Execution
Kind: note
Evidence: src/contracts/connectionEvents.ts; src/engine/evidenceArchive.ts; src/engine/connectionRuntime.ts; src/App.tsx
Channel: cli

Connection-event durability slice: App now subscribes to CORE's sanitized ConnectionEvent stream and appends each event to the existing hash-chained evidence archive. Archive writes are serialized to preserve chain order; verified connection events rehydrate the read-only in-memory ledger on startup; event IDs are unique across reloads. Healthy/degraded heartbeat records are emitted only on lifecycle-state changes to avoid duplicate history. The archive's existing 5,000-record limit applies. Luminary consumer/presentation coordination with Verus and the suspended-event producer remain open. Verification: production build PASS with existing chunk warning; diff check PASS; STP-0003 validation PASS; application tests not run.

### 2026-10-29T09:10:59.308Z | codex | note N8
Chain-Prev: faccd053da3f076016a7e220239abaa44f896cd944aa31aadb7288242a3992e1
Chain-Hash: 19c2688999b355eb352d2d420987b5d6915bac3c3e908992b2f98cc703ed16c3
Stage: Execution
Kind: note
Evidence: src/engine/evidenceArchive.ts; commit:d68379d03da648e54bd9fa27849890411e7d0d31
Channel: cli

PR #13 is confirmed merged (merge commit d68379d03da648e54bd9fa27849890411e7d0d31); the next M3 branch starts from origin/main c43e545, which includes subsequent PR #14. Supplement to N7: archive writes also use the browser Web Locks API when available to serialize across tabs; the in-process queue remains the fallback. The archive capacity remains 5,000 total records.

### 2026-10-29T09:15:24.562Z | codex | note N9
Chain-Prev: 19c2688999b355eb352d2d420987b5d6915bac3c3e908992b2f98cc703ed16c3
Chain-Hash: 64c1e44de9a6eec7486613e6fc1e8807bba38b240b013f8a62795386a1e187d6
Stage: Execution
Kind: note
Evidence: commit:34a7899bc9108d6f48e1d8ac4c91a0867f5b80e8; commit:d68379d03da648e54bd9fa27849890411e7d0d31; commit:fe52077c50ea8632958fe13c384ce614e41c17dc; src/contracts/connectionEvents.ts; src/App.tsx; src/engine/connectionRuntime.ts
Channel: cli

M3 handoff after merges: PR #12 (34a7899) and PR #13 (d68379d) delivered the CORE Orb-presented contract resolution, profile/resource negotiation, validated alternatives, and custom Orb library registration; PR #15 merged at fe52077 and its event-history head 68eeb74 is an ancestor of origin/main. The earlier Codex claims on the Umbilical and event-history paths are released below because their PRs are merged. Verus/Luminary may now consume the existing read-only API in src/contracts/connectionEvents.ts (subscribeConnectionEvents/getConnectionEvents) and persisted sanitized event history in the hash-chained evidence archive without waiting on Codex ownership. Current source declares suspended as an event kind but has no runtime producer; Luminary presentation/consumer and app-level test coverage remain open. This is an ownership/status handoff, not M3 acceptance or new Architect approval.
