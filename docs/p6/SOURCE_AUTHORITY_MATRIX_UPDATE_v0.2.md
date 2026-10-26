# Source Authority Matrix Update v0.2

**Phase:** P6 — Documentation and Release Set
**Date:** 2026-09-07
**Status:** Proposed — extends P0 Source Authority Matrix v0.1

---

## 1. Purpose

This update records implementation evidence against each concept the P0 Source Authority Matrix defined. Concepts that were "Not yet implemented" in P0 now have runtime source-of-truth references. Visual-source classification status is carried forward from `docs/p0/VISUAL_SOURCE_CLASSIFICATION.md`.

---

## 2. Updated Authority Assignments

### 2.1 Identity and Continuity

| Concept | P0 Status | P6 Status | Implementation Source of Truth |
|---------|-----------|-----------|-------------------------------|
| Identity Image / Identity Surface | Not yet implemented | **Implemented (P1)** | `src/identity/surface.ts` — `projectIdentitySurface()` |
| Minimum Identity Kernel | Not yet implemented | **Implemented (P1)** | `src/identity/kernel.ts` — `buildMinimumIdentityKernel()` |
| Identity Coverage States | Not yet implemented | **Implemented (P1)** | `src/identity/projection.ts` — `determineCoverageState()` |
| Action Permission Model | Not yet implemented | **Implemented (P1)** | `src/identity/surface.ts` — `checkActionPermission()` |
| Shortfall Records | Not yet implemented | **Implemented (P1)** | `src/identity/surface.ts` — `ProjectionResult.shortfall` |
| Substrate Context Envelope | Not yet implemented | **Implemented (P1)** | `src/identity/contracts.ts` — `ENVELOPE_PROFILES` |

### 2.2 Construction and Verification

| Concept | P0 Status | P6 Status | Implementation Source of Truth |
|---------|-----------|-----------|-------------------------------|
| Construction Verification Gate | Not yet implemented | **Implemented (P2)** | `src/construction/gate.ts` — `evaluateConstructionGate()` |
| Verification Manifest | Not yet implemented | **Implemented (P2)** | `src/construction/gate.ts` — `buildManifest()` |
| Repair Delta | Not yet implemented | **Implemented (P2)** | `src/construction/gate.ts` — `buildRepairDelta()` |
| Stage Checkers | Not yet implemented | **Implemented (P2)** | `src/construction/checkers.ts` — 6 checker factories |

### 2.3 Intent and Gesture Processing

| Concept | P0 Status | P6 Status | Implementation Source of Truth |
|---------|-----------|-----------|-------------------------------|
| RelationalIntentEnvelope | Not yet implemented | **Implemented (P3)** | `src/intent/contracts.ts` — `IntentEnvelope` |
| Gesture Normalization | Not yet implemented | **Implemented (P3)** | `src/intent/normalize.ts` — `normalizeGesture()` |
| Intent Resolution | Not yet implemented | **Implemented (P3)** | `src/intent/resolve.ts` — `resolveIntent()` |
| Intent Dispatch | Not yet implemented | **Implemented (P3)** | `src/intent/dispatch.ts` — `dispatchIntent()` |

### 2.4 External Relations

| Concept | P0 Status | P6 Status | Implementation Source of Truth |
|---------|-----------|-----------|-------------------------------|
| Portal (external relation) | Not yet implemented | **Implemented (P4)** | `src/portal/operations.ts` |
| Tender (outboard process) | Not yet implemented | **Implemented (P4)** | `src/portal/tender.ts` — `createTender()` |
| Boundary Policy | Not yet implemented | **Implemented (P4)** | `src/portal/boundary.ts` — `createBoundaryPolicy()` |
| Portal Contract | Not yet implemented | **Implemented (P4)** | `src/portal/operations.ts` — `buildPortalContract()` |
| Wormhole | Not yet implemented | **Not yet implemented** | Reserved for future ADR |
| Courier | Not yet implemented | **Not yet implemented** | Reserved for future ADR (Decision #6) |
| Customs | Not yet implemented | **Not yet implemented** | Reserved for future ADR |
| Tunnel | Not yet implemented | **Not yet implemented** | Reserved for future ADR (Decision #7) |

---

## 3. Visual-Source Status

Per `docs/p0/VISUAL_SOURCE_CLASSIFICATION.md`, all concept art and design images remain **conceptual/historical only**. No visual asset has been promoted to runtime authority. The implementation sources of truth listed above supersede any visual representations.

---

## 4. Prohibited Routing Authority (unchanged)

The following prohibitions from P0 remain in effect:

1. No concept art image may establish serialization format.
2. No UI label may define runtime behavior.
3. No `.odt`/`.ods` document may serve as implementation source of truth.
4. No historical document may override a versioned standard.

---

## 5. Unresolved Items

| Item | Status | Reference |
|------|--------|-----------|
| Authored contents of Minimum Identity Kernel | **Partially resolved** — kernel schema defined, contents are input-driven | Decision #2 |
| Exact weighting function for dynamic identity promotion | **Implemented** — 7-signal scoring in `projection.ts` | `scoreDomainRelevance()` |
| Coverage states permitting reversible actions | **Implemented** — state permission table in `surface.ts` | Decision #4 |
| Maximum automatic Repair Delta attempts | **Not yet resolved** | Decision #5 |
| Courier role classification | **Not yet resolved** | Decision #6 |
| Tunnel bypass routing | **Not yet resolved** | Decision #7 |
