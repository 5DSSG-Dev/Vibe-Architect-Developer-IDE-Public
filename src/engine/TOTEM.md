# Folder Totem: src/engine

## Append Log

### 2026-10-30 | Codex | Retire demo-only engines
- Removed `simulationEngine.ts`, which produced preset/random telemetry and log claims without running target operations, and `auditEngine.ts`, whose checks primarily read declarations or unconditionally passed.
- No current source imports these engines. Umbilical runtime validation and contract checks remain in `connectionRuntime.ts`; this removal does not affect those connection-time checks.
- A future M5 scenario runner/audit still requires separately approved design and evidence-backed implementation.

### 2026-10-30 | Codex | Verification and review publication
- Supersedes the pending-check note above: `npm run build` passed, including TypeScript checks; existing Vite large-chunk warning remains. No tests were run.
- Commit `9b5fa25` is part of open PR #25: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25.


## 2026-11-02 | Codex | CORE Configurator review preview
- Added app details persisted inside CORE manifest, app-type crystal defaults and selectable isolated GLB preview. Removed CyberPeer daemon controls from this modal and clarified resource budget wording.
- Prepared on isolated current-main worktree for Architect visual review. Existing active checkout untouched.
