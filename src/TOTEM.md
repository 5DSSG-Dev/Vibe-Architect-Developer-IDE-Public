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

## 2026-10-29 | M3 merged connection-event handoff
- PR #15's event-history work is on main at fe52077. Verus can consume the read-only connection event API and restored evidence history; suspended has no runtime producer. See STP-0003 N9 and Verus lane. M3 acceptance remains open.

## 2026-10-29 | CORE contract regression fixtures repaired
- Umbilical test Orbs now present a registered test contract reference, allowing runtime/evidence tests to reach their intended assertions instead of stopping at handshake step 3. Knowledge Pack equality now normalizes CRLF/LF, preserving content-drift detection across Windows checkouts.
- Targeted runtime/evidence/Knowledge Pack tests pass 20/20; `npm run test:app` passes 341/341. No production code changed.

## 2026-10-29 | Verification follow-up correction
- Fresh whole-app run reports 340/341: the unrelated identity deterministic-rebuild test fails when run with the app suite; `src/identity/identity.test.ts` passes alone (37/37). Targeted M3 runtime/evidence/Knowledge Pack tests remain 20/20. Production build and STP-0003 validation pass.
- 2026-10-29 | codex | M4 CORE immobility and drill-down transitions
- CORE Crystal is fixed at the root and excluded from drag targets; historical saved CORE transforms are discarded while valid Orb placements are retained. CORE remains selectable, animates in place, and no longer arms the turntable on pointer drag.
- Orb and Satellite selections in the default view ease camera focus before entering the next Environment. EnvironmentView eases toward child Elements before drill-down and respects the OS reduced-motion preference. Opt-in ThreeRuntime path now delays Orb entry until its existing focus completes; that experimental path does not yet register Satellites.
- Production build and `git diff --check` pass; build retains the existing Vite large-chunk warning. No tests run and no commit/push performed. Branch: `codex/m4-core-motion-transitions`.
- 2026-10-29 | codex | M3 shared CORE resource budget and M4 combined commit
- CORE default thread capacity is 16; restored workspaces using the previous default of 8 migrate to 16. Capability calculation and allocator now share the same manifest-derived reservations, counting each active Orb by the greater of its saved allocation and declared requirement. Handshake retries rebuild allocator state from the current manifest before capability/resource validation.
- Combined M3 and M4 work compiles with `npm run build`; `git diff --check` passes. Tests were not run. Existing Vite large-chunk warning remains.
- 2026-10-29 | codex | Continuous drill-down zoom handoff
- Drill-down now passes the completed camera offset from the outgoing CORE/Environment view into the incoming Environment. The incoming center starts at a scale matched to the selected Orb/Satellite and eases to its normal focus scale, extending the zoom across scene replacement instead of resetting to the default camera. The experimental ThreeRuntime path now honors OS reduced-motion preference instead of forcing it on.
- `npm run build` and `git diff --check` pass; the existing Vite large-chunk warning remains. Tests were not run.
- 2026-10-29 | Codex | Direct Element information on right-click
- Right-clicking a docked Orb or its attached Satellite in the CORE view, and the center or a child in an Environment, now opens the Element information inspector. The Element library already routed right-click to this inspector and continues to do so. The inspector now presents clearer resource labels and direct `Edit` and `View Code` actions; removed the hard-coded invariant audit result and inline code dump so the popup stays focused on information.
- Production `npm run build` and `git diff --check` pass with the existing Vite chunk-size warning. Tests were not run.
- 2026-10-29 | Codex | Wider Element Environment framing
- Architect review: the continuous zoom works, but the focused Element is too close and the attached Elements should remain visible. CORE-to-Element entry now uses 42% of the starting camera distance (was 28%). Environment drill-down uses 78% (was 45%) with a 9.5-unit minimum to keep the 4.5-unit child ring in frame across deeper levels.
- Production build and `git diff --check` pass; existing Vite chunk-size warning remains. Tests were not run. Change is local and uncommitted.
- 2026-10-29 | Codex | Element-level hover, drag, and context interaction
- In EnvironmentView, removed detached Totem marker dots and anchored hover information at the Element itself. WebGL mesh hit-testing now drives hover details and right-click inspection. Left-drag moves the selected center/child Element and refits its tethers; OrbitControls rotation/pan are disabled so the camera does not orbit with the drag. Click without movement still drills into a child.
- Production build and `git diff --check` pass; tests were not run. Changes are local and uncommitted.

## 2026-10-29 | Codex | Environment click and hover repair
- Marker dots no longer intercept the CORE scene's Orb and Satellite interactions. Their information Totems are marker-free and anchored at Element origins; CORE scene hover uses the matching Element pick proxy.
- Selection runs on the completed click event after drag classification. Element pick proxies take priority over the Luminary's overlapping decorative pick proxy, repairing Orb drill-in.
- Browser verified Orb hover, Orb click to its Environment, Satellite hover, and Satellite click to its child Environment. Browser workspace returned to CORE with empty navigation stack and original socket relations intact. The browser showed 33 failed GLB assets; procedural fallback visuals were used.
- Production build and `git diff --check` pass with the existing chunk-size warning. Tests not run; no commit or push.

## 2026-10-29 | Codex | Publication status correction
- Supersedes earlier pending/uncommitted notes: Element-origin hover and completed-click navigation are committed as `6792987` and pushed to `codex/m4-element-inspection-framing`.
- Follow-up review is open as [PR #24](https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/24). PR #23 was already merged before this follow-up was published.

## 2026-10-30 | Codex | Retire unsupported SIMULATE and DEPLOY modes
- The Architect agreed to remove the synthetic Simulate dashboard and declaration-only Deploy/audit screen from the IDE. The audience is people bringing system architecture and design ability without requiring coding experience or engineering credentials; interface language must explain purpose in everyday terms and keep technical depth available when useful.
- Source removes both modes from the visible workspace and drops their screen/engine modules. The old saved `activeMode` field is ignored, so existing workspaces reopen in the authoring workspace. CORE manifest export remains and is labeled `Export workspace`.
- Removed the synthetic pressure controls and fixed `CPU Load: Medium` display. Changed the sidebar heading from `Telemetry Deck` to `Workspace status`; visible CORE connection counts come from the manifest.
- M5 remains future work: a real bounded scenario runner and deployment flow can return only when they perform real target-specific work and report evidence. This UI removal does not mark M5 complete or change its proposal status.
- No tests or build were run in this change.

## 2026-10-30 | Codex | Verification and review publication
- Supersedes the earlier pending-verification note: `npm run build` passed, including TypeScript checks; Vite reports the existing large-chunk warning. `git diff --check` passed. Tests were not run.
- Fresh browser inspection confirmed the Simulate/Deploy tabs and screens are absent, authoring workspace loads, and the export action is labeled `Export workspace`. Port 3015 had no listener, so Vite was briefly started on 3016 for this check and then stopped.
- Commit `9b5fa25` is pushed to `codex/remove-demo-modes`; PR #25 is open for Architect review: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25. STP-0004 decision D1 records the UI direction; no proposal or M5 completion is claimed.
