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


## 2026-11-02 | Codex | Guided New App demo
- New App preserves the departing snapshot and creates a unique vacant draft CORE without starter contracts or CyberPeer daemons. First launch without saved workspace enters the same draft conversation; existing workspaces are preserved.
- Added live-gateway app planning conversation, bounded catalog-only proposal validation, explicit Architect acceptance, runtime Orb handshakes, requested Satellite/Actuator hierarchy, and rollback on connection/evidence failure. No model call occurs until Send. Rehearsal is rejected for this planning flow.
- The creation bubble enlarges and the 3D Luminary eases to 1.4x at the same screen anchor while assembly is hidden. Selected crystal updates the workspace CORE. Optional loopback-only preview gateway proxy keeps provider credentials server-side.
- Production build and 356 app tests passed before final added empty-child regression. Desktop Commander has stopped responding; Windows application, browser interaction and live-provider validation remain pending. This creates starting architecture, not working app code or production acceptance.

## 2026-11-02 | Codex | Guided creation verification
- Final production build passes, including TypeScript checks. Full app suite: 358 passed, zero failed/skipped. Rejects uncontracted model-only Orbs before proposal acceptance; explicit empty child lists stay empty. No provider calls or browser visual tests performed. Desktop Commander remains unresponsive; preview application pending.


## 2026-11-02 | Codex | Suggestion shelf and Element-screen Luminary
- New App composer keeps up to three model suggestions below input. Choice clicks send directly, preserve unsent draft, retain unused choices and replace selected slot after successful response. Failed calls retain choices and proposal; no filler suggestions are invented. Prompt history retains initial requirements and latest architecture without resending every old proposal.
- Orb/Satellite/Actuator EnvironmentView now creates the shared Luminary Presence, follows the same screen anchor, supports avatar click/hover and disposes owned resources. Async model completion is guarded after unmount.
- Thirteen focused creation/suggestion/anchor/cache-ownership checks pass. Windows build checked; browser visual and live suggestion-click confirmation remain with Architect. Saved app data was not cleared.
