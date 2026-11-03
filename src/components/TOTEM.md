# Folder Totem: src/components

## Append Log

### 2026-10-30 | Codex | Retire unsupported modes
- Removed `SimulateModeView` and `DeployModeView`; the Header no longer presents dead-end mode tabs. Saved legacy mode values are ignored by App and the workspace opens normally.
- The remaining CORE export is a workspace JSON download, now labeled `Export workspace`. Resource/status labels no longer imply live CPU telemetry or a running simulation.
- M5 remains a future feature; no runtime scenario testing or deployment is claimed.

### 2026-10-30 | Codex | Verification and review publication
- Supersedes the pending-check note above: production build and `git diff --check` pass; existing Vite large-chunk warning remains. Tests were not run.
- Browser confirmed the removed modes and plain workspace export on a fresh Vite instance at port 3016 because 3015 had no listener; the temporary server was stopped.
- Commit `9b5fa25` is included in open PR #25: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25. STP-0004 remains at Proposal with no M5 completion.


## 2026-11-02 | Codex | Isolated workspace UI changes
- Requested by Tracey: Inspector Deck opens from bottom bar; connected Orbs stay docked and ignore legacy transform overrides; Luminary is slightly larger/up-left with a Click to talk button. Reconciled backdrop engagement area and conversation placement.
- Extracted only nine UI source files from the public checkout after verified pending-change backups. Shared peer history and pipeline/admin work excluded. Prior preview production build and focused tests passed; isolated combined build is checked next. Browser gesture/visual verification remains outstanding.


## 2026-11-02 | Codex | Isolated App menu
- Requested seven App actions replace the unused Build app window. New/Open/Recent/Close/Export/Delete/Close IDE preserve complete workspace snapshots, including saved app source. Delete asks confirmation and blocked browser-tab closure provides manual-close guidance. Export/import uses .vibe-app.json.
- Included App menu, persistence helper and lifecycle tests only. Unused builder modal, preview server, peer claims, unrelated branding and shared historical notes excluded. Five lifecycle tests passed in preview; isolated combined build is checked next.


## 2026-11-02 | Codex | Isolated verification complete
- Supersedes pending-check notes above: combined isolated UI/App-menu production build passes, including client/server TypeScript and Vite; focused lifecycle and spatial-state tests pass 23/23; git diff --check passes. Existing Vite chunk-size warning remains. No browser visual/gesture verification.
- Both active checkouts retained their source files, branches and indexes; Lumin continues work in the public checkout. Pending files were backed up with byte verification before isolation. Two scoped local commits contain UI and App menu only, with temporary assets and peer pipeline/admin changes excluded. No push or merge performed.


## 2026-11-02 | Codex | CORE Configurator review preview
- Added app details persisted inside CORE manifest, app-type crystal defaults and selectable isolated GLB preview. Removed CyberPeer daemon controls from this modal and clarified resource budget wording.
- Prepared on isolated current-main worktree for Architect visual review. Existing active checkout untouched.


## 2026-11-02 | Codex | Crystal picker feedback
- Added visual thumbnail choices in expandable crystal picker. Seed preview uses shared workspace loader with Meshopt/KTX2 support and shared cache ownership; preview no longer disposes cached assets.
- Retains separate scene, environment and renderer cleanup. Browser interaction review remains pending.


## 2026-11-02 | Codex | CORE footer Luminary
- Docked the Luminary trigger in the CORE modal footer, centered beside Done. Suppressed floating paused trigger only while CORE modal is open; shared conversation state and workspace placement preserved.


## 2026-11-02 | Codex | Guided New App demo
- New App preserves the departing snapshot and creates a unique vacant draft CORE without starter contracts or CyberPeer daemons. First launch without saved workspace enters the same draft conversation; existing workspaces are preserved.
- Added live-gateway app planning conversation, bounded catalog-only proposal validation, explicit Architect acceptance, runtime Orb handshakes, requested Satellite/Actuator hierarchy, and rollback on connection/evidence failure. No model call occurs until Send. Rehearsal is rejected for this planning flow.
- The creation bubble enlarges and the 3D Luminary eases to 1.4x at the same screen anchor while assembly is hidden. Selected crystal updates the workspace CORE. Optional loopback-only preview gateway proxy keeps provider credentials server-side.
- Production build and 356 app tests passed before final added empty-child regression. Desktop Commander has stopped responding; Windows application, browser interaction and live-provider validation remain pending. This creates starting architecture, not working app code or production acceptance.

## 2026-11-02 | Codex | Guided creation verification
- Final production build passes, including TypeScript checks. Full app suite: 358 passed, zero failed/skipped. Rejects uncontracted model-only Orbs before proposal acceptance; explicit empty child lists stay empty. No provider calls or browser visual tests performed. Desktop Commander remains unresponsive; preview application pending.


## 2026-11-02 | Codex | Local preview gateway session
- Explicit opt-in development-only loopback session authenticates same-origin local preview without exposing demo/provider keys. Existing public header authentication unchanged. Provider type now has machine-readable status separate from display name.
- Windows build and ten local-session/access tests pass; real HTTP session204/status200/cross-origin403 verified. Baseten live source and gauge configured; no model inference requested.


## 2026-11-02 | Codex | Planning conversation readability
- New replies align their beginning within the conversation scroller. Text selection is enabled inside the frame; Copy conversation includes greeting, turns and available architecture proposals, with manual-copy fallback.
- Follow-up requests carry the previous structured proposal, including pre-update in-memory proposal state. React hook order retained and gateway not restarted during application. Visual/browser behavior remains for Architect verification.
