# Relational Intent Seam Standard v0.1

**Phase:** P3 — Relational Intent Seam
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/intent/`

---

## 1. Purpose

The Relational Intent Seam is the typed boundary between user gestures and system mutations. It ensures that the Architect can work through any input modality (3D canvas, keyboard, DOM, terminal, language) without creating competing authorities. Every gesture is normalized into a typed IntentEnvelope, resolved against identity permissions, and dispatched through the appropriate routing path.

---

## 2. Gesture Classification

### 2.1 Ten Gesture Kinds

| Gesture | Category | Target |
|---------|----------|--------|
| `dock_item` | Connection | sockets |
| `undock_item` | Connection | sockets |
| `tether_satellite` | Connection | contracts |
| `untether_satellite` | Connection | contracts |
| `mesh_connect` | Connection | contracts |
| `mesh_disconnect` | Connection | contracts |
| `portal_place` | Boundary | portals |
| `portal_remove` | Boundary | portals |
| `daemon_toggle` | Boundary | daemons |
| `budget_adjust` | Boundary | budget |

### 2.2 Action Class Mapping

| Gesture Category | Action Class | Reason |
|-----------------|-------------|--------|
| Connection gestures | `consequential_mutation` | Modify structural relationships |
| Boundary gestures | `reversible_bounded` | Adjust limits and external boundaries |

### 2.3 Dispatch Route Mapping

| Gesture Category | Route | Reason |
|-----------------|-------|--------|
| Connection gestures | `construction` | Must pass through verification gate |
| Boundary gestures | `direct` | Reversible, no construction verification needed |

---

## 3. Pipeline

```
Gesture Input
     │
     ▼
Normalize ──▶ IntentEnvelope { intentId, gestureKind, actionClass, sourceEntity, targetEntity, ... }
     │
     ▼
Resolve ──▶ IntentResolution { verdict: permitted | denied | deferred }
     │
     ▼
Dispatch ──▶ DispatchOutcome { status: executed | blocked | deferred | failed, mutationApplied }
```

### 3.1 Normalization

`normalizeGesture(input)` produces an `IntentEnvelope`:
- Generates unique `intentId` (format: `intent-{timestamp}-{counter}`)
- Classifies `actionClass` from gesture kind
- Assigns `dispatchRoute` and `mutationTarget`
- Computes SHA-256 hash over envelope content
- Records timestamp

### 3.2 Resolution

`resolveIntent(envelope, surface)` produces an `IntentResolution`:

| Surface State | Resolution |
|--------------|------------|
| Surface available, permission granted | `permitted` |
| Surface available, permission denied | `denied` |
| Surface `null` (unavailable) | `deferred` |

### 3.3 Dispatch

`dispatchIntent(envelope, surface)` produces a `DispatchOutcome`:

| Resolution | Dispatch Route | Outcome |
|-----------|---------------|---------|
| `permitted` | `construction` | `executed` with `mutationApplied: true` |
| `permitted` | `direct` | `executed` with `mutationApplied: true` |
| `denied` | any | `blocked` with `mutationApplied: false` |
| `deferred` | any | `deferred` with `mutationApplied: false` |

---

## 4. Outcome Statuses

| Status | Meaning |
|--------|---------|
| `executed` | Intent was fully processed and mutation applied |
| `blocked` | Identity permission denied the action |
| `deferred` | Identity unavailable; intent queued for later |
| `failed` | Processing error (should not occur in normal operation) |

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| Type contracts | `src/intent/contracts.ts` |
| Normalization | `src/intent/normalize.ts` |
| Resolution | `src/intent/resolve.ts` |
| Dispatch | `src/intent/dispatch.ts` |
| Public API | `src/intent/index.ts` |
| Conformance tests | `src/intent/intent.test.ts` (39 tests) |

---

## 6. Conformance Requirements

1. Every gesture MUST be normalized into an IntentEnvelope before resolution.
2. Connection gestures MUST be classified as `consequential_mutation`.
3. Boundary gestures MUST be classified as `reversible_bounded`.
4. When identity surface is `null`, resolution MUST return `deferred`, never crash.
5. `mutationApplied` MUST be `false` for any non-`executed` outcome.
6. All IntentEnvelopes MUST carry SHA-256 hashes.
