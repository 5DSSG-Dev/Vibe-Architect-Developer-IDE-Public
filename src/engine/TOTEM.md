# Folder Totem: src/engine

## Append Log

### 2026-10-30 | Codex | Retire demo-only engines
- Removed `simulationEngine.ts`, which produced preset/random telemetry and log claims without running target operations, and `auditEngine.ts`, whose checks primarily read declarations or unconditionally passed.
- No current source imports these engines. Umbilical runtime validation and contract checks remain in `connectionRuntime.ts`; this removal does not affect those connection-time checks.
- A future M5 scenario runner/audit still requires separately approved design and evidence-backed implementation.
