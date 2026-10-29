# Folder Totem: src

Created: 2026-10-20T19:17:46.099Z

## Folder Reference

Record conventions, ownership, risks, and useful reference information for this folder here.

## Subfolder Elements

- admin
- components
- engine
- stellar
- three
- utils

## Append Log


## 2026-10-20 � Luminary inclusion source baseline
- Architect selected Luminary as hackathon focus, replacing the unworked Buildmaster product concept. Reference docs/VIBE_LUMINARY_INCLUSION_REVIEW_2026-10-20.md and ROOT_TOTEM.md for seven review sections and unresolved contract choices.
- Verified src/App.tsx places RightPanel only in top-level DESIGN; persistent Luminary availability in CODE and element drill-down requires a wider host. RightPanel.handleSynthesizeIntent is timed catalog string matching with fixed fallback, not model reasoning.
- WorkRequestPanel and engine/workRequestRuntime provide bounded in-memory Markdown composition and evidence verification. Do not describe this as arbitrary project editing or server-enforced user authorization. Preserve useful evidence contracts during replacement planning.
- No source behavior changed; the section-wide review is pending. Next target is UI Flow and Design.

## 2026-10-20 � Coordinated product/repository rename and STP lane
- Architect approved the singular name: Vibe Architect Developer IDE; short name Vibe Architect; AEGIS remains parent attribution.
- Updated index.html title, src/components/Header.tsx title/badge, package.json + package-lock root package names (vibe-architect-developer-ide), four current project metadata headers, and totems/README.md. Added root README.md and append-only naming notices to the two Luminary drafts and conceptual outline. Source filenames, historical evidence/Totem shards and browser storage keys preserved.
- GitHub repository renamed successfully to https://github.com/thelight1122/Vibe-Architect-Developer-IDE using authorized gh API PATCH. Local origin fetch/push URL updated and verified. No commits or source pushes performed.
- Local directory move attempted with exact source/target validation and no overwrite. Windows refused because the directory is in use. Current checkout remains G:\AEGIS_DEVELOPMENT_REPOS\AEGIS_VIBE_ARCHITECT_DEVELOPERS_KIT; intended path G:\AEGIS_DEVELOPMENT_REPOS\Vibe-Architect-Developer-IDE. Close tools holding the workspace and finish move from its parent; do not terminate peer sessions automatically.
- Architect confirmed STP will integrate through its own Totem lane. Seeded .aegis/lanes/stp.md with attribution and design status. Codex uses codex.md; future STP tooling owns its lane appends. This does not claim extension installation or automated synchronization.
- App tests 164/164 passed. Build passed under NODE_ENV=test; final production build is being separately verified. No application logic or native gate changes.

- Final verification addendum: production npm build passed (Vite 5.07s; large-chunk warning); app tests 164 pass. Changed-line trailing spaces removed. Local directory move remains blocked by Windows in-use lock.


## 2026-10-26 | codex | SIMULATE/DEPLOY source map for STP-0004
- simulationEngine.ts:16-31 seeds telemetry; :87-120 changes status and logs containment/recovery without executing a target operation or health probe. App.tsx:570-582 wires parameterless fault callbacks and manifest-based DEPLOY.
- auditEngine.ts:19-122 checks invariant declarations, enum/presence and an unconditional pass; these do not prove runtime enforcement. DeployModeView.tsx:10-37 stores audit separately from current manifest and fabricates a random signature; :52-88 displays unconditional compliance/signed claims.
- Reuse connectionRuntime.ts handshake/heartbeat/severance and evidenceArchive.ts hash-chain checks; integrity hashes are not signer authentication. Evidence, targets and proposed repairs: .aegis/stp/0004-m5-simulate-and-deploy-demo-readiness.md (S1-S10, T1-T7, P1-P6).
- Source inspection only. No product changes or new application test results; M3 shared contracts and M4 operability remain foundation dependencies.

## 2026-10-26 | codex | Existing Element UI/contract integration baseline
- Aether.ts supplies cloudlike animated shader and lighting; ThreeCanvas supplies authored model scene, picking, docking/drop targets, spatial/view controls and Totems. EnvironmentView supplies Orb/Satellite/Actuator drill-down. Browser exercised full hierarchy and reload/resume through Wayfinder.
- relationEngine.ts already defines Element code frames, child ids, SocketBinding, RelationContract, budgets/invariants and manifest. connectionRuntime.ts supplies9/5/4-step Umbilical/Tether/Mesh, reserve/rollback, lifecycle and severance. HandshakeModal calls real Umbilical validation, then persists evidence before App commits UI state.
- Actual gaps: App.tsx:374-395 directly attaches Satellites without Tether call; restored relation ids are absent from contractStore Map after reload; builder rebuild loses child/model/codeFrame fields and adds satelliteClass to Orbs; App lacks Aether slider update wiring. Current named-standard/schema consolidation remains an extension to existing contracts.
- STP-0004 S11-S16/N7-N8 hold source/browser/test evidence. Build pass; gateway42pass; app330pass1fail (identity determinism, reproduced); focused contract/evidence17pass. Documentation/continuity updates only; product code preserved.

## 2026-10-26 | codex | Application CORE boundary and catalog copy correction
- Architect clarifies CORE=main/root application, not CyberPeer Formless Center; no CyberPeer Initiative build option. CoreMatrixModal:35-56,139-150; relationEngine:312-328; three/elementTotem:209-219 and auditEngine:87-96 contain contrary concepts requiring coordinated correction.
- Catalog descriptions are duplicated between relationEngine DEFAULT_APOTHECARY_CATALOG and modelCatalog MODEL_DESCRIPTORS. Update function-first copy consistently; preserve stable ids and user-authored content. New-build app-type/crystal mapping remains planned; current ThreeCanvas crystalVariant selects visual styles in local component state.
- STP-0004 S17-S18/N9/T8-T9/G8-G9/P7-P8 hold evidence and proposals. No code/schema migration or UI change executed.

## 2026-10-29T08:05:36Z | codex | M3 contract runtime and handshake wiring
- src/contracts/ now centralizes Element/connection vocabulary, versioned Umbilical profiles and bandwidth envelopes, canonical digest verification, a CORE-local Orb manifest resolver, and a read-only typed connection event feed.
- connectionRuntime.ts resolves the Orb-presented reference against the CORE library, negotiates a Port-supported profile, reserves resources, and emits lifecycle events; resourceAllocator.ts accounts for memory, threads, GPU and peak bandwidth credits; old manifests without the optional bandwidth budget retain defaults.
- App persists the resolved profile/version at commit. ThreeCanvas selects profile geometry/thickness and includes profile identity in arm reconciliation. Capacity numbers are provisional normalized credits/memory floors, not measured provider/network throughput. Build and diff checks pass; tests not run. See STP-0003 N2/N3 for scope and open items.

## 2026-10-29 | codex | CORE validated profile alternatives
- Refusal events may include profiles only when Orb-declared, Port-supported, and feasible against current CORE capacity. Retry names the profile and CORE revalidates before reservation; Luminary cannot silently connect.
- Suspended remains schema-only; event history is session-memory; custom Orb authoring and Conduit catalog support remain open. See STP-0003 N4. Build and STP validation pass; tests not run.

## 2026-10-29 | codex | Custom Orb contracts
- Architect-authored Orbs must select a profile before save/handshake. Both Orb Builder and Reliquary use the same CORE manifest registration path; custom manifest copies persist in CoreManifest and rehydrate before any Orb reference is resolved. The CORE-selected profile minimum is reflected in the saved memory requirement.
- Production build, diff check, and STP-0003 validation pass; application tests not run. Conduit provider catalog mapping and lifecycle/Luminary gaps remain open.
## 2026-10-29 | codex | Durable connection events
- App archives sanitized CORE connection events in the hash-chained evidence archive and restores the read-only event ledger after archive verification. All evidence writes serialize to preserve hash-chain order. Heartbeat events record state transitions; the existing 5,000-record archive cap still applies.
- Suspended-event production and Luminary consumer coordination remain open. Build and STP validation pass; tests not run.
## 2026-10-29 | codex | Connection-event archive extension
- PR #13 custom Orb contract work merged as d68379d; continuation branch starts from origin/main c43e545. Connection events append to the hash-chained evidence archive and restore to the read-only ledger after verification. Writes serialize through the local queue and Web Locks when available; archive capacity remains 5,000.
