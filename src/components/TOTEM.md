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
