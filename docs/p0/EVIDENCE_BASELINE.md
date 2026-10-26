# Evidence Baseline v0.1

**Phase:** P0 — Meaning Freeze and Evidence Baseline
**Date:** 2026-08-17
**Status:** Captured

---

## Purpose

Record before-change evidence for all measurable system properties referenced by the Action Plan workstreams. This baseline enables objective comparison after P1–P4 implementation.

---

## 1. Test Suite Baseline

### Server Tests (gateway)

```
Command: npx tsx --test server/**/*.test.ts
Result:  28 pass, 0 fail, 0 skip
Duration: ~5.7s
```

Test files:
- `server/app.test.ts`
- `server/config.test.ts`
- `server/message-flow-contract.test.ts`
- `server/replay-operations-provider.test.ts`
- `server/session-store.test.ts`

Coverage areas: Express gateway routing, Entra auth flow, session lifecycle (memory + Redis), CSRF protection, message-flow contract validation, replay operations provider, configuration validation.

### Browser Tests (src)

```
Command: npx tsx --test src/**/*.test.ts
Result:  14 pass, 0 fail, 0 skip
Duration: ~0.4s
```

Test files:
- `src/three/runtimeFoundation.test.ts`
- `src/admin/domain/validation.test.ts`
- `src/admin/domain/mapper.test.ts`
- `src/admin/domain/adminProjection.test.ts`
- `src/admin/domain/replayStore.test.ts`
- `src/admin/domain/sameOriginOperationsDataSource.test.ts`
- `src/admin/domain/operationsTransportPolicy.test.ts`

Coverage areas: ThreeRuntime lifecycle, scene system registration, write domain exclusivity, renderer disposal, context loss recovery, admin domain validation, canonical contract mapping, projection pipeline, replay store, data source transport policy.

### Combined Baseline

```
Total tests:  42
Total pass:   42
Total fail:   0
Total skip:   0
```

### Type Check Baseline

```
Command: npx tsc --noEmit
Result:  0 errors
```

---

## 2. Identity System Baseline

| Metric | Value | Notes |
|---|---|---|
| Identity packet implementation | **None** | No identity packet type, serialization, or context envelope exists in runtime code. |
| Identity serialization size | **N/A** | Cannot measure — no serialization exists. |
| Identity retrieval coverage | **N/A** | No retrieval system exists. |
| Minimum Identity Kernel | **Not defined** | The authored contents have not been determined. |
| Substrate Context Envelope | **Not defined** | No envelope schema or configuration exists. |
| Identity-related types | `ElementRef` (CORE Connection Standard), `ApothecaryItem` (relation engine) | These are element identification, not identity-surface types. |
| Identity-related UI | "Identity Context" label in `RightPanel.tsx` | UI label only, no backing data model. |

**P1 starting condition:** Greenfield. The identity system must be built, not adapted.

---

## 3. Construction Pipeline Baseline

| Metric | Value | Notes |
|---|---|---|
| Build Master implementation | **Empty stub** | `BuildMasters.agent.md` contains default GitHub template only. |
| Build Master step failure rate | **N/A** | No pipeline exists to measure. |
| Build Master repair rate | **N/A** | No repair loop exists. |
| Verification pipeline stages implemented | **0 of 9** | `sat-parse`, `sat-typecheck`, `sat-test`, `sat-contract`, `sat-sandbox` are catalog entries, not implementations. |
| Verification Manifest | **Not implemented** | No manifest schema or generation exists. |
| Repair Delta | **Not implemented** | No repair delta schema or loop exists. |
| Constructor Actuator | **Not implemented** | No code generation pipeline exists. |

### Existing verification capability (not yet formalized)

| Capability | Tool | Status |
|---|---|---|
| Type checking | `npx tsc --noEmit` | Working. 0 errors at baseline. |
| Server test execution | `npx tsx --test server/**/*.test.ts` | Working. 28/28 pass. |
| Browser test execution | `npx tsx --test src/**/*.test.ts` | Working. 14/14 pass. |
| Linting | Not configured | No ESLint/Biome configuration found. |
| Contract verification | `sat-contract` capability | Not implemented. In-memory contract store exists. |
| Sandbox execution | `sat-sandbox` capability | Not implemented. |

**P2 starting condition:** Greenfield pipeline. Existing test infrastructure provides foundation for `sat-test` and `sat-typecheck` equivalents.

---

## 4. Architect Canvas Baseline

| Metric | Value | Notes |
|---|---|---|
| `ThreeCanvas.tsx` line count | **1,452 lines** | Monolithic component. |
| `ThreeCanvas.tsx` byte size | **55,532 bytes** | Single file. |
| Rendering architecture | Direct Three.js in React component | No SceneSystem separation like Admin. |
| State management | React props from `App.tsx` | `CoreManifest` held in parent component state. |
| Persistence | localStorage | Workspace state serialized to browser storage. |
| Interaction modes | DESIGN, CODE, SIMULATE, DEPLOY | Four workspace modes. |
| Canvas operations | Drag-dock Orbs, attach Satellites, place Portals, right-click inspect, double-click focus, spatial selection | Direct state mutation through React props. |
| Intent normalization | **None** | No RelationalIntentEnvelope. Canvas gestures directly mutate state. |
| Authority seam | **None** | No authorization check between gesture and state mutation. |
| Equivalent keyboard/DOM surface | **Partial** | Apothecary drag-drop exists. No keyboard equivalent for spatial operations. |

**P3 starting condition:** Functional Canvas with direct state mutation. Requires refactoring to intent → authority → execution model.

---

## 5. Admin Operations Baseline

| Metric | Value | Notes |
|---|---|---|
| Architecture maturity | **Production-ready** | Clean domain separation, auth, projection pipeline. |
| Three.js architecture | ThreeRuntime + SceneSystem | Exclusive write domains, frame scheduling. |
| Scene systems | TopologySceneSystem, MessageFlowSystem, OperationFlowSystem, SelectionSystem, StatusOverlaySystem, CameraController | Well-factored with clear ownership. |
| Auth enforcement | Microsoft Entra + `service.operations.read` role | HttpOnly cookies, CSRF, SameSite. |
| Data flow | Canonical POD input → Admin domain projection → Three.js scene projection | Explicit projection boundary. |
| Mutation capability | **None** | Read-only by design. No mutation APIs. |
| WebGL context loss recovery | Implemented in `ThreeRuntime.ts` | Renderer recreated, scene systems re-initialized. |
| Test coverage | 14 browser-side tests | Covers runtime lifecycle, domain validation, projection, transport. |

**P3 impact on Admin:** Minimal. Admin already meets the architectural standard.

---

## 6. Connection Runtime Baseline

| Metric | Value | Notes |
|---|---|---|
| Connection types implemented | Umbilical, Tether, Mesh | All three internal types. |
| Handshake implementation | Basic | Mock checksums (`sha256-mock-*`). Steps execute but verification is simulated. |
| Contract store | In-memory (`contractStore.ts`) | No persistence. Contracts lost on page refresh. |
| Capability registry | In-memory (`capabilityRegistry.ts`) | Tracks capabilities per element. |
| Resource allocator | In-memory (`resourceAllocator.ts`) | Tracks memory/thread budgets. |
| NegativeSpaceInvariants fields | 3 of 5 | Implements `never_serializes_witness`, `never_persists_prompts`, `no_verdict_over_inner_life`. Missing: `no_unilateral_disconnection`, `no_capability_without_contract`. |
| Portal connection type | **Not implemented** | Portal exists as a placement/projection, not a connection type. |
| External relation contracts | **None** | No Wormhole, Courier, Customs, or Tunnel implementation. |

**P4 starting condition:** Internal connection runtime exists with mock verification. External relations are entirely undefined in code.

---

## 7. Source File Metrics

| File | Lines | Bytes | Role |
|---|---|---|---|
| `src/components/ThreeCanvas.tsx` | 1,452 | 55,532 | Architect Canvas (monolithic) |
| `src/engine/relationEngine.ts` | 371 | — | Domain types, default catalog |
| `src/engine/connectionRuntime.ts` | 96 | — | Handshake execution |
| `src/engine/contractStore.ts` | — | — | In-memory contract ledger |
| `src/engine/capabilityRegistry.ts` | — | — | Capability tracking |
| `src/engine/resourceAllocator.ts` | — | — | Memory/thread budget |
| `src/engine/simulationEngine.ts` | — | — | Tick clock, telemetry, fault injection |
| `src/engine/antigravity.ts` | — | — | Free-body spatial positioning |
| `src/engine/Aether.ts` | — | — | Lighting, shader background |
| `src/engine/auditEngine.ts` | — | — | CORE audit |
| `src/admin/domain/contracts.ts` | 244 | — | Admin domain contracts |
| `src/three/ThreeRuntime.ts` | 312 | — | Admin Three.js runtime |
| `src/three/contracts.ts` | 155 | — | Admin scene contracts |

---

## 8. Canonical Document Inventory

| Document | Version | Status |
|---|---|---|
| CORE Connection Standard | v1.0 | Complete, governing |
| CORE Element Catalog | v1.0 | Complete, governing |
| AEGIS Living Software Doctrine | v1.0 | Complete, governing |
| AEGIS Progressive Reasoning Mathematics | v1.0 | Complete, governing (math framework) |
| AEGIS VIBE Architect Living Dev Env Spec | v1.0 | Complete, proposed (2026-08-15) |
| Service Admin Operations | v1.0 | Complete, governing |
| PROBE Agent | v1.0 | Complete, governing |
| SEEKER Agent | v1.0 | Complete, governing |
| BuildMasters Agent | — | **Empty stub** |
| Implementation Plan | v1.0 | Complete, governing (not yet executed) |
| Image Manifest | v1.0 | Complete, governing (visual assets) |

### Referenced but missing documents

| Document | Referenced by |
|---|---|
| `APOTHOCARY_RECIPIES.md` | Living Dev Env Spec |
| `THE_ANNEX_SYSTEM.md` | Living Dev Env Spec |
| `AEGIS_VIBE_ARCHITECT_IDE_ACTUIATORS.md` | Living Dev Env Spec |
| `AEGIS CANON ADDENDUM — SIGIL VALUE RECOGNITION PROTOCOL SVR.md` | Living Dev Env Spec |

---

## 9. Exit Gate Compliance

| Requirement | Status | Evidence |
|---|---|---|
| Every implementation term maps to one canonical meaning or is marked unresolved | **Met** | Source Authority Matrix covers all terms with definitions and unresolved items isolated. |
| Admin Operations and Architect Canvas authority are explicitly separated | **Met** | Authority Matrix entries for both surfaces. Routing/auth separation documented. Code-level separation verified (different apps, different auth, different Three.js architectures). |
| Tender is recorded as a stationary Satellite of the Portal; Couriers are the acting Actuators | **Met** | Authority Matrix records Tender definition. Courier recorded as not-yet-implemented with reserved architectural decision. |
| No implementation begins from a conceptual image alone | **Met** | Visual Source Classification marks all concept art as advisory. No conceptual image is listed as implementation authority. |
| Before-change baselines captured | **Met** | 42 tests passing, 0 type errors, file metrics, connection runtime state, identity system absence, construction pipeline absence all documented. |
