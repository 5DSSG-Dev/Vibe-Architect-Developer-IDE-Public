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

### 2026-10-27T08:06:10.104Z | codex | finding S10
Chain-Prev: 143531530c664afd826632a5125f22e9baa43abfa8210f7f3ec61dc7f0a25787
Chain-Hash: f3d81bba1e6c220a98b9fb778f3105ad1190fee6b4e9b665bb35ac0b7a4f7b39
Stage: Situation
Kind: finding
Evidence: src/App.tsx:359-372; src/engine/connectionRuntime.ts:202-244; src/engine/resourceAllocator.ts:1-40; src/engine/contractStore.ts:3-27; src/engine/connectionRuntime.ts:50; src/engine/connectionRuntime.ts:291-343
Channel: cli

Fresh source review: dropping an Orb currently opens HANDSHAKE in App.tsx; the CORE does not receive a contract reference from the Orb. executeUmbilicalHandshake creates a runtime contract around the catalog item and step 3 checks a caller-supplied protocolSupported boolean. resourceAllocator reserves memory, threads and GPU only. contractStore is a runtime ledger of signed RelationContracts, not a canonical contract-definition library. Lifecycle state is kept in a module-local map with a point lookup; no event subscription/publisher is exposed for the Luminary.

### 2026-10-27T08:06:10.609Z | codex | target T9
Chain-Prev: f3d81bba1e6c220a98b9fb778f3105ad1190fee6b4e9b665bb35ac0b7a4f7b39
Chain-Hash: 81529393121486ad49520951a82d5bad597b8899d65b18f9ea30ff03e3d58040
Stage: Target
Kind: target
Evidence: assumption
Channel: cli

T9 Orb-presented connection contracts. When an Orb is dropped on an open Port, it presents a stable contract reference and version. The CORE resolves the canonical definition from its own contract library, validates compatibility with the Port, selects the contract and corresponding Umbilical profile, and negotiates required resources without querying the Orb for its contract. The Library Orb (file storage) and CORE contract library are distinct concepts.

### 2026-10-27T08:06:11.098Z | codex | target T10
Chain-Prev: 81529393121486ad49520951a82d5bad597b8899d65b18f9ea30ff03e3d58040
Chain-Hash: d651969779b18b3ddb8574621a7a5a128369ff9d0b55bd236feec713ec0ec016
Stage: Target
Kind: target
Evidence: assumption
Channel: cli

T10 Luminary connection monitoring. The CORE makes all connection attempts, lifecycle changes and resource outcomes available through a structured event contract. The Luminary can offer feasible alternatives when a connection is incompatible or resources are exhausted, with clear reasons; any replacement connection still goes through the Architect's choice and the same CORE handshake. M3 defines the event facts and schema; coordinate the Luminary consumer with Verus.

### 2026-10-27T08:06:11.595Z | codex | gap G9
Chain-Prev: d651969779b18b3ddb8574621a7a5a128369ff9d0b55bd236feec713ec0ec016
Chain-Hash: 8461835b8baf2d99066e4ceb0c03260b5e7c7c4ba3edefad93c54134c98a4fdf
Stage: Gap
Kind: gap
Evidence: S10
Targets: T3, T4, T9
Channel: cli

G9 The runtime has no Orb-presented contract reference or canonical profile library for the CORE to resolve. The existing contractStore contains signed runtime instances, while handshake step 3 relies on a caller flag; contract-specific Umbilical selection cannot yet be derived from the Orb's presentation.

### 2026-10-27T08:06:12.081Z | codex | gap G10
Chain-Prev: 8461835b8baf2d99066e4ceb0c03260b5e7c7c4ba3edefad93c54134c98a4fdf
Chain-Hash: 74bbf68facca7fbb8f7f5318db6d12b4937a29f32448c56b5a19a88ad73a10ad
Stage: Gap
Kind: gap
Evidence: S10
Targets: T10
Channel: cli

G10 Connection lifecycle and resource state are not published as a structured event stream for the Luminary. The runtime keeps a private lifecycle map with a getter, so the Luminary cannot reliably monitor all attempts and state transitions or construct current, resource-valid alternatives from CORE-owned facts.

### 2026-10-27T08:06:31.191Z | codex | change P9
Chain-Prev: 74bbf68facca7fbb8f7f5318db6d12b4937a29f32448c56b5a19a88ad73a10ad
Chain-Hash: e80b2b134ed2ea164a56caa6d7b3c7ed0d065918e69bd7f1c1d3f6faec33176e
Stage: Proposal
Kind: change
Status: Drafted
Evidence: .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:67-76; assumption
Closes: G2
Targets: T2, T9
Gaps: G2, G5
Supersedes: P2
Channel: cli

Revise P2 to define versioned Umbilical contract profiles for Pulse, Record, Archive, Interface and Conduit. Each profile must declare its supported protocol, flow/direction, reach, health signals, memory demand, normal bandwidth and peak bandwidth, with explicit units and a policy for negotiating and reserving normal/peak commitments. The Model API Orb profile must declare greater bandwidth and memory needs than a lightweight scheduler profile; no numeric values are invented here. The Library Orb (file storage) uses the appropriate Archive profile; this is distinct from the CORE-owned contract-definition library. Label the profile by function for the Architect and keep technical values available below.

### 2026-10-27T08:06:31.679Z | codex | change P10
Chain-Prev: e80b2b134ed2ea164a56caa6d7b3c7ed0d065918e69bd7f1c1d3f6faec33176e
Chain-Hash: 32e4a5d09b1e7abce6bb507ea731953a50730573d824e15c997b19fd81e4513a
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/engine/contractStore.ts:3-27; src/App.tsx:359-372; assumption
Closes: G3
Targets: T3, T9
Gaps: G3, G9
Supersedes: P3
Channel: cli

Revise P3 so every Orb manifest includes its function and technical names, capabilities/requirements, memory and bandwidth envelope, and a stable contract presentation reference containing contractId and version (plus canonical digest if the registry uses one). On drop, the Orb presents this reference before handshake starts. The CORE resolves the authoritative definition from its own contract library; the manifest is not an instruction to accept unregistered terms. Map the resolved profile to the correct Orb-side Umbilical, e.g. model API/Conduit versus Library Orb/Archive. Keep the six existing Orb functions, including Library (file storage), explicit; distinguish the Library Orb from the CORE contract library.

### 2026-10-27T08:06:32.176Z | codex | change P11
Chain-Prev: 32e4a5d09b1e7abce6bb507ea731953a50730573d824e15c997b19fd81e4513a
Chain-Hash: 5ade20e6133cdf51e05756a6899f5f35e9a9a42d4b9f0be208a791a0fa92a90b
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/App.tsx:359-372; src/engine/connectionRuntime.ts:202-244; src/engine/contractStore.ts:3-27; assumption
Closes: G4
Targets: T3, T4, T9
Gaps: G3, G4, G9
Supersedes: P4
Channel: cli

Revise P4: an Orb dropped on an open Port presents its stable contract reference first. The CORE retrieves the canonical contract definition from its own contract library, verifies the exact identity/version (and digest where defined), then automatically selects the Port-compatible profile and matching Umbilical and negotiates protocol, capabilities and resource commitments. Do not query the Orb for the contract after presentation. Missing, unknown, stale, digest-mismatched or Port-incompatible references fail closed with a typed reason. The caller's protocolSupported flag may remain a test seam only; it is not runtime authority. Drop initiates automatic resolution and negotiation; Architect-facing progress and outcome remain visible.

### 2026-10-27T08:06:32.681Z | codex | change P12
Chain-Prev: 5ade20e6133cdf51e05756a6899f5f35e9a9a42d4b9f0be208a791a0fa92a90b
Chain-Hash: ef0525357bbdf68082fc6e9f41ec8cdfa1afc6fcbdb585f8d60ac766ba6122ae
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/engine/resourceAllocator.ts:1-40; src/engine/connectionRuntime.ts:202-250; assumption
Closes: G5
Targets: T5, T9, T10
Gaps: G5, G9
Supersedes: P5
Channel: cli

Revise P5 to account for negotiated memory, normal/peak bandwidth, threads and GPU access in the CORE resource budget. The Orb presentation supplies declared requirements and the canonical profile supplies reservation policy. The CORE computes the compatible commitment before activation, reserves it atomically, and releases all reservations if a later handshake step fails or the connection is severed. A refusal reports requested versus available resource facts so the Luminary can offer only currently feasible alternatives. No provisional resource numbers or peak-sharing policy are silently treated as settled.

### 2026-10-27T08:06:52.883Z | codex | change P13
Chain-Prev: ef0525357bbdf68082fc6e9f41ec8cdfa1afc6fcbdb585f8d60ac766ba6122ae
Chain-Hash: 912d64083bab913bee6505a1034fc67877360a4c3effc275ecf7fabc64f2f60a
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/engine/connectionRuntime.ts:50; src/engine/connectionRuntime.ts:291-343; src/engine/resourceAllocator.ts:1-40; src/App.tsx:362-372; assumption
Closes: G10
Targets: T10
Channel: cli

P13 CORE-to-Luminary connection event contract. Define a structured, read-only event feed for every connection attempt and lifecycle/resource transition: attempt started, contract/profile resolved, resources committed, refused, active, degraded, suspended, severed, and resources released. Each event carries stable attempt/contract, Orb and Port identifiers; presented and resolved contract/profile versions; state, timestamp, typed reason plus plain-language label; and requested, available, and negotiated memory/bandwidth/thread/GPU facts where applicable. Refusal events include only CORE-validated feasible alternative contract/Port references with reasons and a fresh resource snapshot; revalidate an alternative before any new handshake. The Luminary consumes events and offers alternatives to the Architect, but cannot silently substitute or connect. Exclude prompts, model API keys and unrelated payloads. M3 owns event schema and CORE producer; coordinate the Luminary consumer and presentation with Verus. Acceptance: every attempt and transition is observable, refusal data is sufficient to explain incompatibility or exhaustion and compare alternatives, no secret/prompt data is exposed, and choosing an alternative still uses the CORE contract-resolution and resource-negotiation path.

### 2026-10-27T08:06:53.405Z | codex | status
Chain-Prev: 912d64083bab913bee6505a1034fc67877360a4c3effc275ecf7fabc64f2f60a
Chain-Hash: 4582acecf3452bb1000723f374651a788d1996f999139c695f2c7270443ab7f7
Stage: Proposal
Kind: status
Item: P9
Status: Presented
Channel: cli

Prepared as an implementation-ready successor proposal. This revision is presented for Architect review and does not inherit prior approval.

### 2026-10-27T08:06:53.900Z | codex | status
Chain-Prev: 4582acecf3452bb1000723f374651a788d1996f999139c695f2c7270443ab7f7
Chain-Hash: 1ef22046278a244febbba2d5ca1c91986159096ec2fc9ad0a6618811a698b554
Stage: Proposal
Kind: status
Item: P10
Status: Presented
Channel: cli

Prepared as an implementation-ready successor proposal. This revision is presented for Architect review and does not inherit prior approval.

### 2026-10-27T08:06:54.392Z | codex | status
Chain-Prev: 1ef22046278a244febbba2d5ca1c91986159096ec2fc9ad0a6618811a698b554
Chain-Hash: a0a415b3e8f94e14a9b9a20dc7e44153a0cf19c7cd47edb726d2e91da1520a36
Stage: Proposal
Kind: status
Item: P11
Status: Presented
Channel: cli

Prepared as an implementation-ready successor proposal. This revision is presented for Architect review and does not inherit prior approval.

### 2026-10-27T08:06:54.913Z | codex | status
Chain-Prev: a0a415b3e8f94e14a9b9a20dc7e44153a0cf19c7cd47edb726d2e91da1520a36
Chain-Hash: d93117f44da0ea78296108a0855954a7a2154231822e434d74eda7cffe7f8f68
Stage: Proposal
Kind: status
Item: P12
Status: Presented
Channel: cli

Prepared as an implementation-ready successor proposal. This revision is presented for Architect review and does not inherit prior approval.

### 2026-10-27T08:06:55.405Z | codex | status
Chain-Prev: d93117f44da0ea78296108a0855954a7a2154231822e434d74eda7cffe7f8f68
Chain-Hash: 7f8ff2477eecac8be659692388664b3fa6d195808ba614bd0f8b4c07e93e240d
Stage: Proposal
Kind: status
Item: P13
Status: Presented
Channel: cli

Prepared as an implementation-ready successor proposal. This revision is presented for Architect review and does not inherit prior approval.

### 2026-10-27T08:10:29.459Z | codex | finding S11
Chain-Prev: 7f8ff2477eecac8be659692388664b3fa6d195808ba614bd0f8b4c07e93e240d
Chain-Hash: b98f9ef31b2f1c7f764a2cc3c95b394e855abc4ffdfa950c650f391ffe647df2
Stage: Situation
Kind: finding
Evidence: docs/CORE_ELEMENT_CATALOG.md:12-60; src/engine/relationEngine.ts:406-491; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:317-326; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:361-370
Channel: cli

The catalog defines 20 Orbs under five functional headings (Development & Code, Data & Knowledge, Infrastructure & Operations, Communication & Integration, AI & Reasoning); these are product-function groupings, not Umbilical connection classes. The runtime catalog currently has six built-in service Orbs. Both sources declare memory/thread requirements, but neither defines Orb model-API use, connection flow/reach, or bandwidth by Orb. Existing STP-0003 proposes five Umbilical profiles but has no Orb-to-profile crosswalk; its separate P6 lists candidate profile-to-model visuals.

### 2026-10-27T08:10:29.957Z | codex | target T11
Chain-Prev: b98f9ef31b2f1c7f764a2cc3c95b394e855abc4ffdfa950c650f391ffe647df2
Chain-Hash: 283dc98326064b0f115234a530d6b2905034605c2c448b396daf7ed495f247e5
Stage: Target
Kind: target
Evidence: assumption
Channel: cli

T11 Determine each Orb's contract class from its actual connection behavior, separately from its functional catalog family. Every runtime and catalog Orb declares one or more versioned Umbilical profiles appropriate to its flow, reach and resource envelope. A model-API profile uses greater memory and bandwidth than the Library file-storage profile as directed by the Architect; actual values and any provider-dependent assignments are explicitly evidenced or left open.

### 2026-10-27T08:10:30.487Z | codex | gap G11
Chain-Prev: 283dc98326064b0f115234a530d6b2905034605c2c448b396daf7ed495f247e5
Chain-Hash: ed3bf4a6c4c5327096e9a6fd2eb792d8b816d641531d292d493321d7a6cef254
Stage: Gap
Kind: gap
Evidence: S11
Targets: T11
Channel: cli

G11 No authoritative Orb-class-to-Umbilical-profile mapping exists. The 20-entry catalog and six-entry runtime catalog differ, use different Orb identities, and omit bandwidth/model-API/flow declarations; functional headings alone cannot determine contract needs. Contract-profile choices for model-backed or streaming behavior therefore remain conditional pending implementation evidence.

### 2026-10-27T08:10:44.580Z | codex | change P14
Chain-Prev: ed3bf4a6c4c5327096e9a6fd2eb792d8b816d641531d292d493321d7a6cef254
Chain-Hash: b5a73db29eff006fee6f124338f64298d3c0f5671dd061ba0a25333f6f3fe1d2
Stage: Proposal
Kind: change
Status: Drafted
Evidence: docs/CORE_ELEMENT_CATALOG.md:12-60; src/engine/relationEngine.ts:406-491; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:361-370; assumption
Closes: G2, G3, G6, G11
Targets: T2, T3, T6, T9, T11
Channel: cli

P14 Orb class and Umbilical profile crosswalk. Keep the catalog's five functional families separate from connection classes, and map profiles by actual operation: Pulse for bounded scheduling/control/health (runtime orb-task-scheduler and orb-monitor; orb-event-bus/orb-webhook only for bounded notifications); Record for stateful transactions (runtime orb-auth-service and orb-database-engine; catalog orb-schema, orb-query, orb-env and index lookups); Archive for files, documents and artifacts (runtime orb-file-storage / Library Orb; catalog orb-index ingestion, orb-doc storage, orb-container image layers, orb-refactor source-file transfer and batch orb-transform); Interface for bounded request-response/control APIs (runtime orb-http-gateway; catalog orb-api, orb-deploy control and local orb-ast/refactor/testgen operations); Conduit for any actual model API call, media flow, or sustained high-bandwidth stream. Candidate Conduit consumers include orb-codegen, orb-testgen, orb-embed, orb-intent, orb-review and orb-doc only when their implementation is model-backed; orb-event-bus, orb-webhook and orb-transform use Conduit only when they carry sustained high-volume payload streams. Debug/telemetry may use Pulse for live events and Record for retained lookups. An Orb may declare multiple profiles for distinct operations; CORE selects only a profile identified in its presented contract reference, never from display name alone. Architect direction: a model-API profile requires more memory and bandwidth than the Library file-storage profile. Do not assign numeric requirements from the descriptive catalog: its memory/thread estimates differ from the six runtime entries and neither source specifies bandwidth or confirms provider use. Reuse P6's candidate visual mapping (SHORT/Pulse, LONG2/Record, LONG/Archive, AWESOME/Interface, AWESOME_LONG/Conduit, BROKEN_LONG/failure) as a proposal; verify assets and runtime side behavior before implementation. Open evidence decisions: actual provider-backed Orbs, flow direction, normal/peak units, memory ranges, and which mixed workloads need multiple profile refs.

### 2026-10-27T08:10:45.074Z | codex | status
Chain-Prev: b5a73db29eff006fee6f124338f64298d3c0f5671dd061ba0a25333f6f3fe1d2
Chain-Hash: df265ae0db60e3175846f32c311c26d02c8adaa6a6cdf63949f1d64c08bc6f40
Stage: Proposal
Kind: status
Item: P14
Status: Presented
Channel: cli

Orb-to-profile crosswalk prepared for Architect review. Conditional assignments remain explicitly unresolved pending source/provider evidence; numeric resource commitments are not proposed.

### 2026-10-27T08:11:46.879Z | tracey | finding S12
Chain-Prev: df265ae0db60e3175846f32c311c26d02c8adaa6a6cdf63949f1d64c08bc6f40
Chain-Hash: 0108f8cc1b697baa81fbd469905d6be9425144315e6c52125a1f8d427c8ff0dc
Stage: Situation
Kind: finding
Evidence: public/assets/models/UMBILICAL_AWESOME.glb; public/assets/models/UMBILICAL_AWESOME_LONG.glb; public/assets/models/UMBILICAL_BROKEN_LONG.glb; public/assets/models/UMBILICAL_LONG2.glb; public/assets/models/UMBILICAL_SHORT.glb; src/utils/assetRegistry.ts:35-39; docs/AEGIS_VIBE_ARCHITECT_OPERATING_STANDARDS_AND_FLOWS.md:777-779; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:361-370
Channel: cli

The current checkout contains five separate Umbilical GLB files (AWESOME, AWESOME_LONG, BROKEN_LONG, LONG2, SHORT). The earlier six-model count and P6 Archive-to-UMBILICAL_LONG mapping are historical but no UMBILICAL_LONG.glb exists at public/assets/models or in an rg --files search. Operating standards list only the five present files and current state assets but do not map them to contract profiles. Therefore Archive's visual model is unresolved; candidate P14 mapping is provisional until an asset is located or the Architect directs a substitute.

### 2026-10-27T08:11:49.640Z | tracey | note N2
Chain-Prev: 0108f8cc1b697baa81fbd469905d6be9425144315e6c52125a1f8d427c8ff0dc
Chain-Hash: 6a67416a5b1abd24ccadf128f325221fe319246b587f8f3941e8fa4cffb6e201
Stage: Execution
Kind: note
Evidence: .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:S12; src/utils/assetRegistry.ts:35-39; public/assets/models
Channel: cli

P14 follow-up: verify the Umbilical GLBs in this checkout before carrying the historical mapping into implementation. Five standalone model assets exist; UMBILICAL_LONG.glb is not in the current asset registry or repository search, despite historical P6/Situation counting it. Keep P14 profile classes independent of visuals and leave Archive geometry unresolved; do not infer that LONG2 is interchangeable. S12 records the asset shortfall.

### 2026-10-27T08:27:50.853Z | tracey | finding S13
Chain-Prev: 6a67416a5b1abd24ccadf128f325221fe319246b587f8f3941e8fa4cffb6e201
Chain-Hash: 77d95cefa62c8cffba96c9c57e6f5689a19ca29632820b04be0f048066d9d975
Stage: Situation
Kind: finding
Evidence: src/components/ThreeCanvas.tsx:2658-2671; src/App.tsx:378-397; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:392
Channel: cli

Architect defines a new connection flow: the Luminary helps determine and code an Element; the Architect saves it to the Apothecary and drags it into the workspace. Dropping a Satellite onto an Orb must initiate a host-bound handshake and contract negotiation with that Orb. Current source contradicts this: ThreeCanvas routes Satellite drops to onAttachSatellite, while App.handleAttachSatellite directly appends it to attachedSatellites and logs success; comments explicitly say no handshake is needed. This is distinct from the existing Orb-to-CORE Umbilical handshake and must be modeled as a Satellite-to-host-Orb Tether/Relation contract.

### 2026-10-27T08:27:53.487Z | tracey | target T12
Chain-Prev: 77d95cefa62c8cffba96c9c57e6f5689a19ca29632820b04be0f048066d9d975
Chain-Hash: 3ac2dc7ea17f1b636c062372c24fd0bda0f5923b37649e5e1d41ccd46be32d53
Stage: Target
Kind: target
Evidence: src/components/ThreeCanvas.tsx:2658-2671; src/App.tsx:378-397
Channel: cli

Every Satellite drop onto a host Orb begins a typed, observable host-bound handshake and contract negotiation; no Satellite becomes attached until the Orb validates the presented Satellite contract, capability/protocol compatibility and resource commitment. This Tether contract is distinct from the Orb-to-CORE Umbilical contract. Luminary-authored Elements carry a reviewed, saved manifest and code before placement.

### 2026-10-27T08:27:56.168Z | tracey | gap G12
Chain-Prev: 3ac2dc7ea17f1b636c062372c24fd0bda0f5923b37649e5e1d41ccd46be32d53
Chain-Hash: eb55264878553a4447f82fe3aed5cbbba3393034cca23d1f15e25c04f042d4bc
Stage: Gap
Kind: gap
Evidence: S13
Channel: cli

G12 Satellite placement bypasses contract negotiation: App.handleAttachSatellite directly mutates attachedSatellites, so the host Orb cannot refuse incompatibility or resource exhaustion and there is no handshake receipt or lifecycle evidence. The desired Luminary-to-Apothecary-to-workspace authoring path also needs a reviewed Element manifest/code boundary before drop.

### 2026-10-27T08:28:02.217Z | tracey | change P15
Chain-Prev: eb55264878553a4447f82fe3aed5cbbba3393034cca23d1f15e25c04f042d4bc
Chain-Hash: ca077ad45e2b8b8127add992545f9726a1a4a4d3cee921d03bf2803f6b446327
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/components/ThreeCanvas.tsx:2658-2671; src/App.tsx:378-397; src/engine/connectionRuntime.ts:253-290; src/engine/relationEngine.ts:38-84
Closes: G12
Targets: T12
Channel: cli

P15 Satellite-to-Orb Tether contract and drop handshake. Keep the Orb-to-CORE Umbilical contract separate. When the Architect drops a saved Satellite onto a docked Orb, the Satellite presents a stable versioned contract reference; the host Orb/CORE-side registry resolves the canonical definition, then negotiates the required protocol, host capabilities, permissions and resource commitment. Show pending, active or refused state with typed reason and plain-language explanation. Commit attachment only after successful negotiation; atomically roll back provisional state/resources on any failed step. Publish lifecycle/resource outcome for Luminary guidance and evidence. Replace direct attachedSatellites append in App.handleAttachSatellite with the contract runtime; stale/unknown/incompatible references and resource exhaustion fail closed. Luminary code authoring and reviewed Apothecary save are governed in STP-0002/M4: generated Element proposal must carry category/identity, purpose-first description, technical details, capability/requirement/resource manifest and code; Architect reviews/accepts the proposed artifact before it is saved for drag/drop. Placement itself never executes arbitrary code. Acceptance: dropping a compatible Satellite shows and commits a successful host-bound handshake/receipt; incompatibility or exhaustion shows a typed refusal, leaves no attached Satellite and releases any provisional allocations; reload preserves only committed relation evidence. Coordinate Luminary event consumption and authored Element flow with Verus. Draft only.

### 2026-10-27T08:28:07.884Z | tracey | status
Chain-Prev: ca077ad45e2b8b8127add992545f9726a1a4a4d3cee921d03bf2803f6b446327
Chain-Hash: 3cbc2e0928a9e5ef36dc896a3f304cd5fbe21fe10d0647334125aabb8e7d1212
Stage: Proposal
Kind: status
Item: P15
Status: Presented
Channel: cli

P15 → Presented.

### 2026-10-27T08:31:47.474Z | tracey | finding S14
Chain-Prev: 3cbc2e0928a9e5ef36dc896a3f304cd5fbe21fe10d0647334125aabb8e7d1212
Chain-Hash: a930d209c4f1af039b245f45aa25986d135eb5e4d2e074e0dd7ec89a85d307ef
Stage: Situation
Kind: finding
Evidence: src/engine/relationEngine.ts:319-327,SocketBinding; src/engine/connectionRuntime.ts:201-290,291-343; src/App.tsx:378-397; docs/IDE_ORIENTATION.md:17-24
Channel: cli

Architect states every Element-to-Element connection must be reported to the Orchestrator in the CORE so it maintains the correct Build map: connected parties and what each connection does. The CORE Orchestrator is intended as the main coordinator of application flow. Current CoreManifest stores sockets, attached elements and a contract list, and connectionRuntime has Orb/Tether/Mesh handshake functions, but source search finds no Orchestrator connection-graph projection or general connection event subscription. The desired system-of-record and downstream application routing behavior is not fully represented in current types.

### 2026-10-27T08:31:50.497Z | tracey | target T13
Chain-Prev: a930d209c4f1af039b245f45aa25986d135eb5e4d2e074e0dd7ec89a85d307ef
Chain-Hash: 9763400f5445d09620d5659d3594b5a06b2a0b42e3ca812d84a903bc8245f06f
Stage: Target
Kind: target
Evidence: src/engine/relationEngine.ts:319-327; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:S14
Channel: cli

The CORE Orchestrator maintains the authoritative Build connection map for every Element pair. Each attempted connection and each committed or changed relation is reported with source/target identity and versions, relation/contract type and status, the purpose/function of the connection, negotiated capabilities and data-flow semantics, resource allocation and timestamps/reasons. Only successfully negotiated active relations appear as active edges; refusals and lifecycle changes remain observable as attempt/history records. The Orchestrator uses this map to coordinate application flow only through capabilities actually contracted by connected Elements.

### 2026-10-27T08:31:52.910Z | tracey | gap G13
Chain-Prev: 9763400f5445d09620d5659d3594b5a06b2a0b42e3ca812d84a903bc8245f06f
Chain-Hash: 0683ee45d7dabc981c746cd039cbc726f631ea3da86d53b6c53c5d104abc90f6
Stage: Gap
Kind: gap
Evidence: S14; S13
Channel: cli

G13 Current manifest and runtime connection state do not provide the CORE Orchestrator with a single authoritative graph of every Element relation, its purpose/function and negotiated flow semantics. Connection attempts, active edges, refusals and lifecycle/resource changes cannot all be projected as one coherent Build map from a general event subscription.

### 2026-10-27T08:32:00.663Z | tracey | change P16
Chain-Prev: 0683ee45d7dabc981c746cd039cbc726f631ea3da86d53b6c53c5d104abc90f6
Chain-Hash: 25035fa28437ddb0482562b46328e3546b4c7981216a9e9865ad5dfd3d341caf
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/engine/relationEngine.ts:319-327; src/engine/connectionRuntime.ts:201-343; src/App.tsx:378-397; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:P13,P15
Closes: G13
Targets: T13
Channel: cli

P16 CORE Orchestrator connection map. Define a versioned authoritative BuildGraph owned by the CORE Orchestrator, with one relation record for every negotiated Element pair. Each record names stable source and target Element ids/versions; typed connection (Umbilical, Tether, Mesh or other approved relation); contract id/version/digest; Architect-understandable purpose/function; negotiated capability and data-flow directions; resource commitment; lifecycle state; and provenance/timestamps. Route all connect/disconnect/degrade/refusal/resource transitions through the common connection contract runtime and publish typed events to the Orchestrator. Commit an active graph edge atomically only after successful negotiation; refused attempts remain in attempt history and do not appear as active. Rebuild/persist the map deterministically with the saved Build so the Orchestrator never routes through an uncontracted edge. Luminary reads the same CORE-validated event/map feed to explain outcomes and offer feasible alternatives; it cannot mutate or bypass the graph. Keep actual application execution claims limited to capabilities demonstrably available in the runtime. Coordinate P13 event schema and Luminary consumer. Acceptance: every Element connection attempt and lifecycle change is represented once with traceable contract; active graph edges exactly match committed contracts; the Orchestrator can explain the connected Build and permitted function/flow; save/reload preserves the map and excludes failed attempts from active topology.

### 2026-10-27T08:32:04.793Z | tracey | status
Chain-Prev: 25035fa28437ddb0482562b46328e3546b4c7981216a9e9865ad5dfd3d341caf
Chain-Hash: 6f2059e36f7735fbd5d83796bce55684c6ddacf6013b5db7b6c5c459d1dc7435
Stage: Proposal
Kind: status
Item: P16
Status: Presented
Channel: cli

P16 → Presented.

### 2026-10-27T08:35:10.864Z | tracey | finding S15
Chain-Prev: 6f2059e36f7735fbd5d83796bce55684c6ddacf6013b5db7b6c5c459d1dc7435
Chain-Hash: 894cd4a664cb3f6f0b1193471b6095e29554b52146f8f9c3423dc12027204888
Stage: Situation
Kind: finding
Evidence: docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:29-59,74; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC.md:400-414; src/engine/workRequestRuntime.ts:29-42,199-218; src/engine/relationEngine.ts:319-327
Channel: cli

Architect requires secure Tumbler locks for sensitive operations, originating at the CORE Orchestrator and distributed through the authority chain, to prevent unauthorized Elements or Agents acting without Orchestrator knowledge/approval. Governing references distinguish alignment from authority: Tumbler evaluates a declared crossing and does not authorize work; a Tumbler Generator is scoped to one relation/operation/subject/target/environment/time and derives from a signed Relation Contract. Canonical code-mutation path is Conductor -> Work Request Contract -> Dispatch -> Satellite -> Actuator -> Customs -> Tumbler -> Target Element -> Assurance -> Conductor disposition. Current source search finds WorkRequest approval fields, but no Tumbler or CORE Orchestrator enforcement in app runtime.

### 2026-10-27T08:35:16.908Z | tracey | target T14
Chain-Prev: 894cd4a664cb3f6f0b1193471b6095e29554b52146f8f9c3423dc12027204888
Chain-Hash: d87e50cb49abc33d5b7f49c9863c80aca0cb485ebb2dd598a2c4042524ff7fb9
Stage: Target
Kind: target
Evidence: docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:29-59,74; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC.md:400-414
Channel: cli

For every controlled app capability invocation, the CORE Orchestrator knows the requesting Element/Agent, approved purpose, target, active Relation Contract, and authority-chain state. Sensitive operations additionally require a CORE-Orchestrator-originated, narrowly scoped Tumbler evaluation/challenge carried through the chain and checked at the final action boundary. Tumbler alignment is a validation condition, never the authorization itself. Each hop may attenuate but never expand scope; missing, stale, invalid, revoked or mismatched authority fails closed and is recorded for the Orchestrator.

### 2026-10-27T08:35:20.081Z | tracey | gap G14
Chain-Prev: d87e50cb49abc33d5b7f49c9863c80aca0cb485ebb2dd598a2c4042524ff7fb9
Chain-Hash: d952bc9b24821e9239515ba70e2bde0b7c508fd65ce859a28dd8a7a9b7433435
Stage: Gap
Kind: gap
Evidence: S15; T14
Channel: cli

G14 No current CORE Orchestrator/Tumbler integration enforces action authority across Elements and Agents. WorkRequestRuntime has approval fields, but the application execution paths are not shown enforcing CORE-issued scoped Tumbler state. Without an independently checked authorization grant and enforcement at the final action boundary, a passed Tumbler check alone could be misread as permission or bypassed.

### 2026-10-27T08:35:28.762Z | tracey | change P17
Chain-Prev: d952bc9b24821e9239515ba70e2bde0b7c508fd65ce859a28dd8a7a9b7433435
Chain-Hash: 40455e40e4b056fc109b4497e8f88e30668470032083793195f9576b3d5d7ee0
Stage: Proposal
Kind: change
Status: Drafted
Evidence: docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:29-59,74,389-399; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC.md:400-414,543-562; src/engine/workRequestRuntime.ts:29-42,199-218; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:P13,P16
Closes: G14
Targets: T14
Channel: cli

P17 CORE-issued authority and Tumbler chain for controlled actions. Reconcile the app's intended CORE Orchestrator with the existing Tumbler standard and authority terms before implementation; do not relabel Tumbler alignment as authorization. Classify executable capabilities by sensitivity. Require every capability invocation to bind to an active Relation Contract, approved purpose, subject Element/Agent, target Element, app/build version and Orchestrator-visible authority record. For operations designated sensitive by policy, the CORE Orchestrator initiates and tracks a Tumbler challenge/grant scoped to that one crossing (relation/contract, operation, subject, target, environment, time/freshness and nonce); the validation material flows only through named authorized hops, each hop attenuating scope without expansion. A separate valid Architect/Conductor authorization (for example an approved Work Request) is still required; the Tumbler ALIGNED result alone grants no permission. The final Actuator/action boundary verifies the active contract, signed unrevoked authorization, scope, freshness and Tumbler outcome; fail closed on missing, stale, mismatched, revoked or invalid facts. Emit immutable sanitized events to the CORE Orchestrator for issuance, hop, evaluation, allow/deny, execution and disposition; P13 exposes suitable read-only outcomes to Luminary. Ordinary runtime behavior and UI navigation are not automatically Tumbler-gated; retain existing standard boundaries and only add gates justified by declared operation policy. Acceptance: no controlled Element/Agent capability executes without CORE-visible contract and authority; sensitive operation cannot pass without CORE-originated scoped Tumbler evaluation plus separate authorization; a passed Tumbler never authorizes by itself; tampering/replay/scope expansion/revocation fails closed; every outcome is explainable in Orchestrator history. Draft for review; verify app-specific authority-owner mapping (CORE Orchestrator vs canonical Conductor) with Architect/Verus and reconcile the continuity-standard scope before implementation.

### 2026-10-27T08:35:36.374Z | tracey | status
Chain-Prev: 40455e40e4b056fc109b4497e8f88e30668470032083793195f9576b3d5d7ee0
Chain-Hash: fde0d97eb20a747d88252bc2eff43158d5440e2dccbccdc38a34afef2afe502d
Stage: Proposal
Kind: status
Item: P17
Status: Presented
Channel: cli

P17 → Presented.

### 2026-10-27T08:39:37.728Z | tracey | finding S16
Chain-Prev: fde0d97eb20a747d88252bc2eff43158d5440e2dccbccdc38a34afef2afe502d
Chain-Hash: 3310b41e27b2c47608f464eab6747cd3b146f53be642c4db903683211d16dcb6
Stage: Situation
Kind: finding
Evidence: src/engine/workRequestRuntime.ts:1-5,29-42,137-142,210-223; src/components/WorkRequestPanel.tsx:26-36; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:131-143
Channel: cli

The Work Request runtime already classifies impact as read_only, reversible_local_change, external_write, deployment, identity_security and destructive. Its current mutating-impact gate checks only that approvedBy and approvalRef strings are nonempty; WorkRequestPanel supplies both as hard-coded local values. No policy maps impact classes to protected Tumbler profiles or independently verifies signed authority at an execution boundary. This makes the classifications a useful policy-design input, not a secure approval implementation.

### 2026-10-27T08:39:37.869Z | tracey | target T15
Chain-Prev: 3310b41e27b2c47608f464eab6747cd3b146f53be642c4db903683211d16dcb6
Chain-Hash: 465517fea99e110ee4260bcc9d66be7b6736dbcd086ab55993b8640bddef90b9
Stage: Target
Kind: target
Evidence: src/engine/workRequestRuntime.ts:1-5; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:131-143
Channel: cli

A versioned policy maps each WorkImpactClass and app execution domain (IDE authoring/Continuity Capsule versus built application runtime) to required active Relation Contract, separate authority grant, Tumbler operation profile and final enforcement point. Public read-only behavior stays available where policy permits; protected inspection, edit, external write, deployment, identity/security and destructive actions receive explicit bounded requirements. Unknown/unclassified action or domain fails closed pending policy resolution.

### 2026-10-27T08:39:38.003Z | tracey | gap G15
Chain-Prev: 465517fea99e110ee4260bcc9d66be7b6736dbcd086ab55993b8640bddef90b9
Chain-Hash: d400f30e4797c9d652651640b3ae5eaa4f892dcbdb7b2fe4939cb20e866ef899
Stage: Gap
Kind: gap
Evidence: S16; T15
Channel: cli

G15 The repository has impact labels and draft Tumbler profiles but no reviewed policy mapping action impact/domain to independent authority and Tumbler requirements; current approval attribution fields are caller-supplied strings and are not verified credentials or grants.

### 2026-10-27T08:40:38.085Z | tracey | change P18
Chain-Prev: d400f30e4797c9d652651640b3ae5eaa4f892dcbdb7b2fe4939cb20e866ef899
Chain-Hash: ba20832d15d8ba423ffe9a4ce87805c2942aea7481b3a870c530cdf6ceeb0c06
Stage: Proposal
Kind: change
Status: Drafted
Evidence: docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:29-59,74,88-143,211-300,389-399; docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC.md:400-414,543-562; src/engine/workRequestRuntime.ts:29-42,210-223,293-310; src/components/WorkRequestPanel.tsx:26-36,50-57; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:P13,P16,S15,T14,G14
Closes: G14
Targets: T14
Gaps: G14
Supersedes: P17
Channel: cli

P18 CORE-orchestrated Tumbler validation and authority chain (successor to P17 after source/standard review). Preserve the Architect's requirement that all controlled Element/Agent actions are CORE-visible and that sensitive crossings use CORE-originated Tumbler checks. Tumbler ALIGNED is validation only: it never grants purpose, permission, or a bearer capability. Keep authority separate in a signed Architect/Conductor-approved Work Request and Dispatch binding, both linked to an active signed Relation Contract. Define the CORE Orchestrator as authoritative BuildGraph owner and coordinator: it records each action, selects the approved policy, initiates/scopes the TumblerChallenge, tracks events, and routes only under valid authority. Preserve canonical Conductor as authorization decision owner and Dispatch as route materializer/Ring-Three updater unless the Architect explicitly delegates those roles to CORE Orchestrator; document a single owner and bounded delegation rather than duplicate approval authority. Satellites coordinate; Actuators perform; final execution boundary enforces.

For each Tumbler-required crossing, bind challenge/evaluation to subject Element/Agent, target, operation/capability, active contract id/version/digest, Intent/Work Request, application/build and environment, policy hash, freshness window, nonce and revocation state. Use the v0.1 TumblerChallenge/TumblerEvaluation concepts; avoid the ambiguous term 'Tumbler grant'. Each authority-chain hop verifies provenance and may attenuate scope but never widen it. At the final Actuator/action boundary verify signer/trust, scope intersection, active contract, separate authority, Tumbler result where required, environment, freshness, single-use nonce and revocation. Missing, stale, replayed, revoked, mismatched, unverifiable or out-of-resonance facts deny that action and emit immutable sanitized CORE events for request, authorization, challenge, evaluation, allow/deny, execution and disposition. Luminary reads a sanitized feed; it cannot approve, expand scope or silently retry.

Define distinct policy profiles for IDE Continuity Capsule authoring/reopen/revision/release and for actions in the generated application runtime; do not reuse artifact-continuity dimensions indiscriminately for ordinary app behavior. P19 addresses the concrete WorkImpactClass matrix under T15/G15. Operation profiles that do not require a Tumbler remain governed by their active relation/authorization policy. Unknown action or app domain fails closed. Preserve valid public read-only inspection and already-authorized ordinary runtime behavior according to declared policy. Implementation order: resolve CORE/Conductor/Dispatch duties with Architect and Verus; settle profile/evidence/signer policy using versioned extensions to the standard; implement CORE authority/event state against P16 BuildGraph; gate every actual executor/gateway/deploy boundary; update UX to explain refusal without secrets; migrate saved workspaces without elevating historical approvals. The WorkRequestPanel's caller-supplied approval strings are not authority evidence. Acceptance: ALIGNED without authorization cannot mutate; caller strings, signature/policy/contract mismatch, wrong subject/target/capability, stale/replayed/revoked nonce and scope expansion fail before side effect; valid scoped authorization plus aligned required challenge succeeds once with evidence; each controlled action has a CORE record; failed attempts never appear as active BuildGraph edges; ordinary behavior outside the policy remains available. Verify at execution boundaries, not only in UI. Draft only; no Tumbler enforcement is implemented.

### 2026-10-27T08:40:48.351Z | tracey | change P19
Chain-Prev: ba20832d15d8ba423ffe9a4ce87805c2942aea7481b3a870c530cdf6ceeb0c06
Chain-Hash: 2d412a1db8c6db32dcbd4cf6b723b0e0e905d62d4c4cf53bafee09f4e271b760
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/engine/workRequestRuntime.ts:1-5,29-42,137-142,210-223; src/components/WorkRequestPanel.tsx:26-36,50-57; docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:131-143,389-399; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:S16,T15,G15,P18
Closes: G15
Targets: T15
Gaps: G15
Channel: cli

P19 WorkImpactClass-to-authority/Tumbler policy matrix. Implement versioned policy data, not inline UI checks, for every action in both IDE authoring/Continuity Capsule domain and generated-application runtime. Use current WorkImpactClass enum as input and bind policy resolution to action/capability id, target data sensitivity, active Relation Contract and actual execution boundary. Candidate minimum matrix for Architect/Verus review: (1) read_only: public inspection may run under read-only relation/policy; protected material maps to INSPECT_PROTECTED; (2) reversible_local_change: require explicit scoped Work Request and authority; Tumbler ENTER_EDIT when crossing from sealed Continuity Capsule or other protected workspace, otherwise map by policy; (3) external_write: require scoped authorization, external Portal/route contract and Tumbler DISPATCH_REVISION or a versioned profile extension as domain requires; (4) deployment: require independent verification plus ADMIT_RELEASE and rollback/continuity evidence; (5) identity_security: require identity/Relation/integrity/time policy and explicit security authority, add a versioned operation profile if v0.1 profiles do not express the gate; (6) destructive: deny by default until target, reversibility, explicit authority, recovery anchor and dedicated Tumbler policy are present. No class alone grants capability. Public read-only UI navigation must not invoke Tumbler; unclassified operations deny controlled execution. Include the decision owner mapping: CORE Orchestrator records/coordinates each request; Conductor/Architect authorization and Dispatch route follow P18 unless explicitly delegated. Migrate WorkRequestRuntime's current string-presence check to consume verified authorization evidence at the actual actuator boundary; hard-coded WorkRequestPanel approval fields remain demo-only and must not authorize production actions. Acceptance: every registered capability has a policy row; table-driven tests cover every impact/domain pair and unknown values; aligned Tumbler without authority denies; no-required-Tumbler profile still requires active relation and policy authority; profile-required operation fails closed on missing/stale/out-of-resonance evidence; human-readable reason maps to exact policy rule and no secrets; changes to the matrix require version increment and preserve prior audit records. Draft for review; candidate profile assignments require Architect/Verus and Tumbler-standard owner review.

### 2026-10-27T08:40:48.490Z | tracey | status
Chain-Prev: 2d412a1db8c6db32dcbd4cf6b723b0e0e905d62d4c4cf53bafee09f4e271b760
Chain-Hash: 139b41852b5b1f5f158d2be6d20366efdfd71146df915138c491c8c47f997ffd
Stage: Proposal
Kind: status
Item: P18
Status: Presented
Channel: cli

P18 → Presented.

### 2026-10-27T08:40:48.630Z | tracey | status
Chain-Prev: 139b41852b5b1f5f158d2be6d20366efdfd71146df915138c491c8c47f997ffd
Chain-Hash: 80ebd3c476e1fbc4128afeeee6210cb744bbcf853173c9fd3fb56e2604bc1c58
Stage: Proposal
Kind: status
Item: P19
Status: Presented
Channel: cli

P19 → Presented.

### 2026-10-27T08:42:15.797Z | tracey | note N3
Chain-Prev: 80ebd3c476e1fbc4128afeeee6210cb744bbcf853173c9fd3fb56e2604bc1c58
Chain-Hash: a39d167d6178e849f9ecd7d57b639d15a3e27c1f81e282a710a3c231e1cacdd9
Stage: Execution
Kind: note
Evidence: docs/AEGIS_TUMBLER_CONTINUITY_INTERFACE_STANDARD_v0.1.md:88-143,248-300; .aegis/stp/0003-pod-contracts-and-umbilical-standards.md:P18,P19
Channel: cli

Architect design insight, 2026-10-27: different functions need slightly different Tumblers; non-substitutability is beneficial because one Tumbler kind cannot stand in for another. Interpret this as operation-profile-specific Tumbler policies/challenges, each with distinct required dimensions, subjects, target, relation, environment, scope and version. A result is valid only for its exact declared profile and crossing; no fallback or widening to another profile. Align P18/P19 and Tumbler standard's per-operation profiles, one-profile non-inheritance rule, nonce/freshness and fail-closed mismatches. This insight reinforces specialization; it does not itself settle the profile-to-function matrix or approve implementation.

### 2026-10-27T08:51:17.500Z | tracey | note N4
Chain-Prev: a39d167d6178e849f9ecd7d57b639d15a3e27c1f81e282a710a3c231e1cacdd9
Chain-Hash: 935e6c8cb7d2eaede6bdfd15f8ffba3be5d1a1bbc2c3105edf2a99e11e283b9e
Stage: Execution
Kind: note
Evidence: docs/AEGIS_ADAPTIVE_RELATIONAL_IDE_DOCTRINE_LIVING_CANON_v0.3-LC:526-539,570-579; docs/AEGIS_ARCHITECTURAL_FRICTION_RESOLUTION_ACTION_PLAN_v1.0.md:430-450,497-513,556-562; docs/p6/PORTAL_LIFECYCLE_SCHEMAS_v0.1.md:170-180; docs/p0/SOURCE_AUTHORITY_MATRIX.md:205-213,349; src/portal/contracts.ts; src/portal/operations.ts
Channel: cli

Architect confirms prior design decision: every Actuator or Agent returning after Portal access must clear through the Customs Depot before reentering the App. Repo evidence confirms the function as Customs: the Living Canon says every dispatched Actuator crossing into another Element passes Customs (§21) and Portal/Tender is distinct from Customs/Tumbler transit inspection (§23); the Portal External Relation Action Plan defines Customs as return inspection before Portal/POD reentry, lifecycle RETURN_TO_CUSTOMS -> RETURN_ACCEPTED/RETURN_HELD, and required validation (P4.1/P4.5). The exact name 'Customs Depot' was not found; map it to this existing Customs function unless the canonical owner says otherwise. This is design doctrine/planning, not implementation: Portal Lifecycle Schema says Customs is not yet specified and Source Authority Matrix says no implementation; rg found no Customs in src. Existing src/portal implements Portal/Tender descriptor, boundary policy, lifecycle and operations only. Keep returns quarantined/held until scope, schema, provenance, active-content safety, authority/Tumbler state and destination relation validate; do not update internal canonical state on rejected return. Cross-link P18/P19 and the Portal P4 work rather than duplicate a Customs spec here.
