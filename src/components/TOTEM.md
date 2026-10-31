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

## 2026-10-30 | Codex | M4 remove Satellites and Actuators from Element views
- Extended the existing confirmed Remove action to child Elements in the drill-down inspector. Removing a Satellite updates its Orb relationship and socket attachment; removing an Actuator updates its Satellite relationship. Removed items remain in the Apothecary, and workspace navigation snapshots track the updated parent.
- An explicit empty Orb satellite list now means no Satellites; legacy Orbs without a list retain the catalog fallback. This prevents a removed last Satellite from reappearing.
- `npm run build` and `git diff --check` pass; tests were not run. Working on `codex/m4-child-element-removal`, based on current `origin/main`; changes are uncommitted and unpublished.
