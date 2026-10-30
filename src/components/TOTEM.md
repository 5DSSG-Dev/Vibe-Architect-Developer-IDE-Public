# Folder Totem: src/components

## Append Log

### 2026-10-30 | Codex | Retire unsupported modes
- Removed `SimulateModeView` and `DeployModeView`; the Header no longer presents dead-end mode tabs. Saved legacy mode values are ignored by App and the workspace opens normally.
- The remaining CORE export is a workspace JSON download, now labeled `Export workspace`. Resource/status labels no longer imply live CPU telemetry or a running simulation.
- M5 remains a future feature; no runtime scenario testing or deployment is claimed.
