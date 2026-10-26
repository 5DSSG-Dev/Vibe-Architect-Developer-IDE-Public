# STP-0001: UI Flow and Design

Review section 1 of 7 (Architect's order, see ROOT_TOTEM.md). Vibe Architect Developer IDE, Meta Hackathon Oct 26 to Nov 4, 2026.
Format: AEGIS STP Workflow System draft record format (Phase 0, written by hand). Append-only: later understanding is a later entry that names the earlier one with `Supersedes:`.
Source baseline: branch totem/ide-c-0012-threeruntime-adoption-scope, HEAD 1ede6cb.
Current stage: Proposal (Target accepted 2026-10-20; P1-P8 and M1 Approved and Verified 2026-10-20; see milestone-status M1)

## Append Log

### 2026-10-20 | verus | stp-open
Stage: Situation
Kind: scope
Scope: How the Architect moves through the IDE (routes, modes, panels, drill-down, overlays), what is visible where, and where a Luminary presence and learning return point would sit. 3D element behavior, operability depth, and docs are cross-linked to sections 2, 3 and 4, not assessed here.
Method: Read ROOT_TOTEM.md, .aegis/lanes/stp.md, docs/TOTEM.md, docs/VIBE_LUMINARY_INCLUSION_REVIEW_2026-10-20.md, docs/VERUS_AUDIT_INDEPENDENT_REVIEW_2026-10-20.md, then traced source. Source reading only: no browser run, build, or tests in this pass.

### 2026-10-20 | verus | situation-finding S1
Stage: Situation
Kind: finding
Evidence: src/main.tsx:10-23; index.html:15
The app has one user route, `/`, which renders the whole IDE. `/admin/operations` is a separate gated admin app. There is no route or deep link for a mode, an element environment, or a Luminary surface.

### 2026-10-20 | verus | situation-finding S2
Stage: Situation
Kind: finding
Evidence: src/App.tsx:138, 451-457, 541-567; src/components/Header.tsx:44-81; src/components/Footer.tsx:104-106
The IDE is organized as four modes: DESIGN, CODE, SIMULATE, DEPLOY. The same mode switch appears twice, in the Header and again in the Footer.

### 2026-10-20 | verus | situation-finding S3
Stage: Situation
Kind: finding
Evidence: src/App.tsx:460-493; src/components/RightPanel.tsx:68-73
The Apothecary (LeftDrawer) and the Build Master panel (RightPanel) render only in DESIGN at the CORE root. They disappear in CODE, SIMULATE, DEPLOY, and inside any element environment. The Build Master "synthesis" is a timed catalog match, not AI (also recorded in the Luminary inclusion review).

### 2026-10-20 | verus | situation-finding S4
Stage: Situation
Kind: finding
Evidence: src/App.tsx:167-172, 495-539
Drill-down (CORE > Orb > Satellite > Actuator) is a full-screen overlay with a breadcrumb and Back button, available in DESIGN only. The stack lives in memory: a reload returns to the CORE root.

### 2026-10-20 | verus | situation-finding S5
Stage: Situation
Kind: finding
Evidence: src/App.tsx:40-47, 179-197
Mode, CORE manifest, and catalog persist to browser localStorage. Drill-down position, open panels, and selections do not. There is no "where you left off" surface.

### 2026-10-20 | verus | situation-finding S6
Stage: Situation
Kind: finding
Evidence: src/App.tsx:153-177, 594-676
Nine overlays (Handshake, Core Matrix, Orb Builder, Reliquary, Built-in Browser, three inspector tiers, plus mode views) are each driven by an independent flag. Nothing coordinates them, so more than one can be open at once. Source-derived; not reproduced in a browser.

### 2026-10-20 | verus | situation-finding S7
Stage: Situation
Kind: finding
Evidence: grep of src/components for Escape, keydown, role="dialog", aria-modal: no matches; src/App.tsx:434 (select-none on root)
No modal handles Escape, declares a dialog role, or manages focus. Accessible labels exist only in Stellar and Work Request components. Detailed operability belongs to section 3; recorded here because it shapes the flow.

### 2026-10-20 | verus | situation-finding S8
Stage: Situation
Kind: finding
Evidence: src/components/Header.tsx:10, 18; src/App.tsx:456
Header accepts an `onRunAudit` handler that App wires to DEPLOY, but Header never calls it. The intended "run audit" entry point is not reachable from the Header.

### 2026-10-20 | verus | situation-finding S9
Stage: Situation
Kind: finding
Evidence: src/components/Footer.tsx:71-77, 132; docs/VERUS_AUDIT_INDEPENDENT_REVIEW_2026-10-20.md (Finding 3)
Some visible UI is static: a disabled "Core Matrix (Locked)" item, fixed "AUTO SAVE ACTIVE" text, browser navigation buttons without handlers, and fixed percentages. These read as live status but are not.

### 2026-10-20 | verus | situation-finding S10
Stage: Situation
Kind: finding
Evidence: index.html:15 loads /src/main.tsx; apps/ide/src/App.tsx (297 lines) differs from src/App.tsx (681 lines); apps/ide/src/components duplicates component names
A second, older UI tree lives in apps/ide/src and is not loaded by the build. Which tree is canonical is not recorded anywhere, which invites edits to the wrong copy.

### 2026-10-20 | verus | situation-finding S11
Stage: Situation
Kind: finding
Evidence: src/components/ThreeCanvas.tsx (2945 lines), :620; totems/shards/totems.codex.jsonl IDE-TOTEM-CODEX-0002
The main view is one large Three.js component. A new ThreeRuntime main view exists behind the `?threeRuntimeP0=1` flag and is partially migrated. UI flow work on the canvas must pick which path it targets. Detail belongs to section 2.

### 2026-10-20 | verus | situation-finding S12
Stage: Situation
Kind: finding
Evidence: docs/design/ (three admin message-flow images only); AEGIS_VIBE_ARCHITECT_LIVING_DEVELOPMENT_ENVIRONMENT_SPEC_v1.0.md sections 6, 7, 17-19; AEGIS_VIBE_ARCHITECT_OPERATING_STANDARDS_AND_FLOWS.md
There is no flow diagram or screen map for the main IDE. Intended experience lives in prose specs: three inventory layers (Apothecary, Project Palette, Active POD), semantic zoom, the Run Chamber, and interaction-to-architecture trace. The Project Palette and Run Chamber have no UI yet. Operating Standards exists in two versions (root v0.3, docs v0.1) per the Verus audit review.

### 2026-10-20 | verus | situation-unknown U1
Stage: Situation
Kind: unknown
The IDE itself is a browser app (React 18, Vite, Three.js, Express gateway; package.json), developed in VS Code. Running the STP extension inside VS Code beside this repo works; running it inside the IDE's own UI would be a separate feature. Architect to confirm which was meant.

### 2026-10-20 | verus | situation-unknown U2
Stage: Situation
Kind: unknown
Live behavior was not observed this pass. A browser walkthrough (npm run dev) would confirm S4, S6, S7 and S9 and capture screenshots as evidence.

### 2026-10-20 | verus | target-draft T0
Stage: Target
Kind: draft-for-architect
Status: Drafted
The Target is the Architect's to set. The items below are drawn from the Architect's own specs and the Luminary inclusion review, offered as a starting point to accept, edit, or replace. None is accepted yet.
- T1 The Architect always knows where they are: mode, depth in the element hierarchy, and current task, from one consistent place.
- T2 One way to change mode, and the path back from any depth is obvious.
- T3 The Luminary is present across every mode and depth, at Full Form or Paused Icon, not tied to one panel.
- T4 Leaving and returning (reload, interruption, a learning detour) restores the working position and task: a return point.
- T5 Only one modal surface at a time, each closable with Escape and keyboard reachable.
- T6 Everything that looks like live status is live, or is labeled as a placeholder.
- T7 Complexity appears only when the Architect enters it (semantic zoom; Apothecary to Project Palette to Active POD).
- T8 One canonical UI source tree.
- T9 A first complete hackathon journey, as proposed in the inclusion review, flows through the UI without dead ends.

### 2026-10-20 | tracey | target-accepted T0
Stage: Target
Kind: decision
Supersedes: target-draft T0
Status: Accepted
Architect accepted T1-T9 exactly as drafted: "It is just right as it is and if we need to alter it later then we can do that then." Recorded by verus from the project thread.

### 2026-10-20 | verus | gap G1
Stage: Gap
Kind: gap
Target: T3
Situation: S3
The only assistant host (RightPanel) exists in DESIGN at the CORE root. A Luminary there would vanish in three of four modes and at every drill-down depth.

### 2026-10-20 | verus | gap G2
Stage: Gap
Kind: gap
Target: T4
Situation: S4, S5, S1
Reload restores mode and manifest but not drill-down depth, selection, or task. No deep link can carry a position either.

### 2026-10-20 | verus | gap G3
Stage: Gap
Kind: gap
Target: T2
Situation: S2, S4
Mode switching exists twice (Header and Footer). The path back (breadcrumb, Back) exists only inside the DESIGN drill-down overlay.

### 2026-10-20 | verus | gap G4
Stage: Gap
Kind: gap
Target: T1
Situation: S2, S4
No single place shows mode, depth, and current task together. The IDE has no notion of a current task at all.

### 2026-10-20 | verus | gap G5
Stage: Gap
Kind: gap
Target: T5
Situation: S6, S7
Overlays are independent flags that can stack; none closes with Escape, declares a dialog role, or restores focus.

### 2026-10-20 | verus | gap G6
Stage: Gap
Kind: gap
Target: T6
Situation: S8, S9
Static text and controls present as live status (AUTO SAVE ACTIVE, fixed percentages, handler-less browser buttons, locked Core Matrix item), and the Header audit entry point is never wired.

### 2026-10-20 | verus | gap G7
Stage: Gap
Kind: gap
Target: T8
Situation: S10
Two UI source trees; only src/ is built. Nothing records which is canonical.

### 2026-10-20 | verus | gap G8
Stage: Gap
Kind: gap
Target: T7
Situation: S12
Evidence: src/components/LeftDrawer.tsx:455-465, 533
The Apothecary offers category, trust, and search filters, but there is no Project Palette layer between the full Apothecary and the Active POD, and no category-to-entry zoom.

### 2026-10-20 | verus | gap G9
Stage: Gap
Kind: gap
Target: T9
Situation: S12, U2
No screen map exists for the proposed hackathon journey, and the journey has not been walked in a browser, so its dead ends are unknown.

### 2026-10-20 | verus | proposal-change P1
Stage: Proposal
Kind: change
Closes: G3, G4
Status: Presented
Add one app-level Wayfinder bar, mounted outside the mode conditionals: mode switch, breadcrumb (CORE > Orb > Satellite > Actuator), and current task. Remove the Footer mode switcher so the Header/Wayfinder is the only one.
Alternative: keep Header as the sole switcher and only lift the breadcrumb to app level. Cheaper, but leaves "current task" with no home (G4 stays partly open).

### 2026-10-20 | verus | proposal-change P2
Stage: Proposal
Kind: change
Closes: G1
Status: Presented
Add an app-level Luminary presence host (Full Form and Paused Icon) independent of RightPanel, as the Luminary inclusion review recommends. Relabel the RightPanel Build Master synthesis as catalog search so it is not mistaken for AI.
Alternative: rename RightPanel to Luminary. Smallest change, but keeps it DESIGN-root only; rejected by the inclusion review for the same reason.
Depends on: section 6 (AI Integration and Luminary Presence) for what the host contains; this proposal only fixes where it lives.

### 2026-10-20 | verus | proposal-change P3
Stage: Proposal
Kind: change
Closes: G5
Status: Presented
Replace the independent overlay flags with one `activeOverlay` state, and render every modal through one shared Dialog wrapper (dialog role, aria-modal, Escape to close, focus trap and restore).
Alternative: add Escape handlers to each modal. Faster per modal, but overlays can still stack and the fix is repeated nine times.

### 2026-10-20 | verus | proposal-change P4
Stage: Proposal
Kind: change
Closes: G2
Status: Presented
Persist the navigation position (mode, drill-down element ids, selected socket, current task) in a version 2 workspace snapshot with a migration from version 1, and show a "Resume where you left off" chip after reload.
Alternative: encode position in the URL (hash or query). Gives shareable deep links (also eases S1), but needs routing work and element ids that stay stable across sessions.

### 2026-10-20 | verus | proposal-change P5
Stage: Proposal
Kind: change
Closes: G6
Status: Presented
Truthful status pass: wire Header's audit entry or remove it; bind AUTO SAVE to the real persistence result (src/App.tsx:192-196); label remaining static values and inert controls as previews.
Alternative: hide inert controls entirely for the demo. Cleaner screen, but loses the visible roadmap the placeholders give.

### 2026-10-20 | verus | proposal-change P6
Stage: Proposal
Kind: change
Closes: G7
Status: Presented
Record src/ as the canonical UI tree in ROOT_TOTEM.md and apps/ide/TOTEM.md, then move apps/ide/src into an archive folder after the Architect confirms nothing in it is still wanted.
Alternative: leave the files and only record which tree is canonical. No file moves, but the duplicate stays easy to edit by mistake.

### 2026-10-20 | verus | proposal-change P7
Stage: Proposal
Kind: change
Closes: G8 (partially)
Status: Presented
For the hackathon milestone, group the Apothecary list by category with collapsible sections (a first step of semantic zoom). The Project Palette layer stays in the Target and is deferred past the hackathon.
Alternative: build the Project Palette now. Closes G8 fully, but needs Genesis Intent ranking that does not exist yet.

### 2026-10-20 | verus | proposal-change P8
Stage: Proposal
Kind: change
Closes: G9
Status: Presented
Before building, walk the app in a browser (closes U2) and draw a screen map of the proposed hackathon journey, marking each dead end. Use it to order P1-P7.
Alternative: build first, map afterwards. Saves a day now, but risks building the wrong path.

### 2026-10-20 | verus | proposal-plan M1
Stage: Proposal
Kind: milestone
Selects: T1, T2, T3, T5, T6, T8, T9 (T4 and T7 partly)
Status: Presented
Hackathon milestone (event Oct 26 to Nov 4): P8, then P3, P1, P2, P5, P6, P4, then P7's category grouping. The full Target T1-T9 stays as recorded; this milestone is a slice of it.
Nothing here is approved for execution. Approval is recorded per proposal by the Architect.

### 2026-10-20 | tracey | approval P8
Stage: Proposal
Kind: decision
Supersedes: proposal-change P8 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P3
Stage: Proposal
Kind: decision
Supersedes: proposal-change P3 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P1
Stage: Proposal
Kind: decision
Supersedes: proposal-change P1 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P2
Stage: Proposal
Kind: decision
Supersedes: proposal-change P2 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P5
Stage: Proposal
Kind: decision
Supersedes: proposal-change P5 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P6
Stage: Proposal
Kind: decision
Supersedes: proposal-change P6 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.
Condition (from the proposal text): the archive move of apps/ide/src waits for the Architect to confirm nothing in it is still wanted. Recording src/ as canonical proceeds now.

### 2026-10-20 | tracey | approval P4
Stage: Proposal
Kind: decision
Supersedes: proposal-change P4 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.

### 2026-10-20 | tracey | approval P7
Stage: Proposal
Kind: decision
Supersedes: proposal-change P7 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus.
Scope: category grouping only; the Project Palette stays deferred as written.

### 2026-10-20 | tracey | approval M1
Stage: Proposal
Kind: decision
Supersedes: proposal-plan M1 (Status only)
Status: Approved
Architect approved all proposals in the project thread: "approve All". Recorded by verus. Execution order: P8, P3, P1, P2, P5, P6, P4, P7. Each proposal moves to Executing, then Verified, as later entries.

### 2026-10-20 | verus | execution P8
Stage: Proposal
Kind: execution
Supersedes: approval P8 (Status only)
Status: Verified
Evidence: docs/stp/0001-screen-map.md, docs/stp/0001-walk/*.png
Walked the app in headless Chromium (Vite client, no gateway) and drew the hackathon journey with nine dead ends (D1-D9). The walk confirms the M1 order. Closes U2.

### 2026-10-20 | verus | unknown-closed U2
Stage: Situation
Kind: evidence
Supersedes: unknown U2
Evidence: docs/stp/0001-screen-map.md
Browser walk done. Confirmed in a running app: Escape closes no modal (S/G5), drill-down hides the Apothecary and Build Master (G1), reload loses the drill position (G2), status values are static (G6).

### 2026-10-20 | verus | observation O1
Stage: Situation
Kind: finding
Evidence: docs/stp/0001-walk/mode-SIMULATE.png
In SIMULATE and DEPLOY the 3D canvas view controls stay visible and overlap the mode panels. Not covered by P1-P8; recorded for the Architect, not acted on.

### 2026-10-20 | verus | execution P3
Stage: Proposal
Kind: execution
Supersedes: approval P3 (Status only)
Status: Verified
Evidence: src/components/Dialog.tsx; src/App.tsx (`activeOverlay`, `openOverlay`, `closeOverlay`); browser check in headless Chromium
One `activeOverlay` state replaces the five overlay flags and the inspector tier; opening an overlay replaces the open one, and `closeOverlay` only closes the overlay that is still open. All eight modals render through the shared Dialog (dialog role, aria-modal, accessible name, Escape, Tab trap, focus restore). Verified in the browser: Escape closes CORE Matrix, Orb Builder, Reliquary, Browser, Inspector and Handshake; focus starts and stays inside each dialog; Builder to Handshake replaces rather than stacks. `npm test` 131 pass, `npm run build` passes. Closes G5 and D1.

### 2026-10-20 | verus | execution P1
Stage: Proposal
Kind: execution
Supersedes: approval P1 (Status only)
Status: Verified
Evidence: src/components/Wayfinder.tsx; src/utils/wayfinder.ts (+ wayfinder.test.ts); src/components/Footer.tsx; browser check in headless Chromium
The Wayfinder is mounted at app level in the status bar on every screen. It shows the mode, then the path in DESIGN (CORE > Orb > Satellite > Actuator), with clickable crumbs and a "Now:" task line. The task line names the drill-down at the DESIGN root ("Click a docked Orb in the scene to enter it"), which closes D4. The Footer mode switcher has been removed, so the header holds the only mode switch (D5). The drill-down pill keeps only Back and the current name. Placement note: the bar sits in the bottom status bar, not under the header, because the header-to-panel gap is 16px and the mode panels start at 80px. Closes G3 and G4.

### 2026-10-20 | tracey | decision P6-archive
Stage: Proposal
Kind: decision
Status: Approved
Architect chose "Archive it" for apps/ide/src (decision card in the project thread). This meets P6's confirmation condition. Recorded by verus.

### 2026-10-20 | verus | execution P2
Stage: Proposal
Kind: execution
Supersedes: approval P2 (Status only)
Status: Verified
Evidence: src/components/LuminaryHost.tsx; src/App.tsx (mounted outside the mode views); src/components/RightPanel.tsx; browser check in headless Chromium
LuminaryHost is mounted at app level. It shows the Paused Icon, a golden Locus-core in the status bar corner, and the Full Form panel above it. It starts paused and opens only when the Architect clicks it. Escape and the Pause button fold it back, and focus moves into it on engage and returns to the icon on pause. Bloom uses motion-safe only. Verified that the icon is present at the DESIGN root, inside an Orb Environment, and in CODE. The Full Form states plainly that no reasoning provider is connected and that nothing is observed or sent. Its content waits for section 6.
The RightPanel is relabelled "Inspector Deck", and its "Relational Intent Synthesizer" is now "Catalog Search · keyword match, not AI". I removed the 500ms fake delay, the fixed fallback items shown on no match, and the preset "recommended" cards. A search with no match now says so. Closes G1 and D2.

### 2026-10-20 | verus | execution P5
Stage: Proposal
Kind: execution
Supersedes: approval P5 (Status only)
Status: Verified
Evidence: src/components/Header.tsx, Footer.tsx, RightPanel.tsx, BuiltInBrowserModal.tsx; src/App.tsx (`saveStatus`); browser check in headless Chromium
Truthful status pass. I removed Header's dead `onRunAudit` prop because no control ever called it. AUTO SAVE now shows the real result of the localStorage write: SAVED with the time, FAILED on an exception (verified by forcing a storage failure), or PENDING. The Handshake Log now reads the latest committed Relation Contract (source, socket, status, step, capabilities), and the preset 78% bar, "100% READY" and fixed checklist are gone. The Orb Specifications and Constellation Manifest cards carry a PREVIEW badge for their fixed fields. The Relation Contract JSON is marked "(sample)" when no contract exists. The fake 512 MB fallback is gone. The header budget reads GPU "ENABLED" rather than "ACTIVE", with a tooltip that says these are configured budget values. The footer's disabled "Core Matrix (Locked)" duplicate is removed. The browser modal's inert back and forward controls are now disabled and marked Preview. Closes G6, D5 (remaining part), D6 and D7.
Note: contracts record a 9-step handshake (`handshakeCompletedStep` 9), while the old panel showed 7 steps. The new log shows the recorded step only.

### 2026-10-20 | verus | execution P6
Stage: Proposal
Kind: execution
Supersedes: approval P6 (Status only)
Status: Verified
Evidence: ROOT_TOTEM.md and apps/ide/TOTEM.md appends; archive/README.md; `git mv apps/ide/src archive/apps-ide-src-2026-10-20`
The root `src/` is recorded as the canonical UI tree in ROOT_TOTEM.md and apps/ide/TOTEM.md. apps/ide/src was moved to archive/apps-ide-src-2026-10-20/ under the Architect's decision "Archive it". Before the move I checked that it had no file missing from `src/` and that nothing built, imported or configured referenced it. Typecheck and the production build pass after the move. Closes G7.

### 2026-10-20 | verus | execution P4
Stage: Proposal
Kind: execution
Supersedes: approval P4 (Status only)
Status: Verified
Evidence: src/utils/navigationSnapshot.ts (+ navigationSnapshot.test.ts); src/App.tsx (workspace version 2, resume chip); browser check in headless Chromium
The workspace snapshot is now version 2. Next to mode it saves the navigation position: drill-down Element ids and the selected socket. A version 1 snapshot migrates to version 2 at the CORE root; I verified this by writing a v1 snapshot and reloading. The storage key keeps its name so old workspaces are still found. After a reload the IDE starts at the CORE root and shows a "Resume where you left off" chip naming the path. Resume returns to it and the dismiss button forgets it. Moving somewhere new replaces the old position, and the chip survives repeated reloads until the user acts. Saved ids that no longer resolve stop at the parent. I did not store the current task, because it is derived from the position by the Wayfinder. Closes G2 and D3. The URL deep-link alternative was not taken.

### 2026-10-20 | verus | execution P7
Stage: Proposal
Kind: execution
Supersedes: approval P7 (Status only)
Status: Verified
Evidence: src/utils/apothecaryGroups.ts (+ apothecaryGroups.test.ts); src/components/LeftDrawer.tsx; browser check in headless Chromium
The Apothecary list is now grouped into collapsible category sections. They follow the docking path (Orbs, Satellites, Actuators, Constellations, Formulas, Ingredients, Portals, Cores, Umbilicals), and each header shows a count and has aria-expanded. Orbs start open because docking an Orb is the first task. A search or filter opens every section that has matches. Tier tabs and trust filters now show full labels ("T1: Ingredients", "Experimental"), not truncated ones (D8), and carry aria-pressed. The Project Palette stays deferred as approved. Closes G8 in part.

### 2026-10-20 | verus | milestone-status M1
Stage: Proposal
Kind: milestone
Supersedes: approval M1 (Status only)
Status: Verified
All eight M1 proposals executed in order and verified: P8, P3, P1, P2, P5, P6, P4, P7. `npm test` passes (76 gateway, 142 app) and `npm run build` passes. Open items for the Architect: observation O1 (canvas view controls overlap the SIMULATE and DEPLOY panels) is not covered by any proposal. G8 stays partly open until the Project Palette. The Luminary host's content belongs to review section 6. U1 (STP in VS Code beside the IDE or inside it) is unanswered. The full Target T1-T9 remains recorded beyond this milestone.
