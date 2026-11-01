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

## 2026-11-01 | Aster | Paged Element proposal preview (local, pending review)
- Memoize lineDiff by editor/proposed source; request typing/page state does not invalidate comparison. Render at most200 diff rows; accessible Previous/Next and live Showing X–Y of Z. Comparison identity resets page immediately, helper clamps. Full proposal retained; Accept/Decline/Save handlers unchanged. Wrapping controls and focusable scrolling preview added; no provider/server/client changes.
- Base a4a70e007bab3a4c3da355ad33849f09070248bd; overlay blob9493266529389126496ad6eecae3ace6da6b8b69 matched. Depends on unchanged local bounded-lineDiff patch SHA256 a570d4b25104f82b7a7336b7d553ef4ae4f5e64838aa6766898813991b04dbde. Separate branch aster/paged-element-code-preview and incremental patch, no commit/push.
- Node24.22.1: page helper10/10 and app360/360 via direct node --import tsx test runner; tsc --noEmit passed. Automated tests reconstruct all40,002 rows across pages, plus boundaries/empty/clamping/CRLF/Unicode. UI memoization and unchanged accept/full-source/save semantics inspected, not browser-verified.
- Browser limitation: local Vite127.0.0.1:4173 ran; cloud browser could not reach it (ERR_CONNECTION_REFUSED). Initial wildcard bind hit uv_interface_addresses environment error. Actual mounted-row counts, keyboard/narrow-screen navigation and synthetic reply Accept/Decline/Save observations remain unverified; no provider called.
