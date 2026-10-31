# Folder Totem: src/engine

## Append Log

### 2026-10-30 | Codex | Retire demo-only engines
- Removed `simulationEngine.ts`, which produced preset/random telemetry and log claims without running target operations, and `auditEngine.ts`, whose checks primarily read declarations or unconditionally passed.
- No current source imports these engines. Umbilical runtime validation and contract checks remain in `connectionRuntime.ts`; this removal does not affect those connection-time checks.
- A future M5 scenario runner/audit still requires separately approved design and evidence-backed implementation.

### 2026-10-30 | Codex | Verification and review publication
- Supersedes the pending-check note above: `npm run build` passed, including TypeScript checks; existing Vite large-chunk warning remains. No tests were run.
- Commit `9b5fa25` is part of open PR #25: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25.

## 2026-10-30 | Codex | M4 remove Satellites and Actuators from Element views
- Extended the existing confirmed Remove action to child Elements in the drill-down inspector. Removing a Satellite updates its Orb relationship and socket attachment; removing an Actuator updates its Satellite relationship. Removed items remain in the Apothecary, and workspace navigation snapshots track the updated parent.
- An explicit empty Orb satellite list now means no Satellites; legacy Orbs without a list retain the catalog fallback. This prevents a removed last Satellite from reappearing.
- `npm run build` and `git diff --check` pass; tests were not run. Working on `codex/m4-child-element-removal`, based on current `origin/main`; changes are uncommitted and unpublished.
