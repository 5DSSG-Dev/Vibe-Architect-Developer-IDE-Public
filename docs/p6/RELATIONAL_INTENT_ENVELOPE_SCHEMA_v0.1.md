# RelationalIntentEnvelope Schema v0.1

**Phase:** P3 — Relational Intent Seam
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/intent/contracts.ts`

---

## 1. Purpose

The RelationalIntentEnvelope (IntentEnvelope) is the normalized, typed representation of any user gesture. It is the sole input to the intent resolution and dispatch pipeline, ensuring that every mutation path—regardless of input modality—passes through the same identity-gated processing.

---

## 2. Schema

```typescript
interface IntentEnvelope {
  intentId: string;                // unique, format: "intent-{timestamp}-{counter}"
  gesture: GestureKind;            // one of 10 gesture kinds
  actionClass: string;             // classified action class
  sourceEntityId: string;          // entity initiating the gesture
  targetEntityId: string;          // entity receiving the gesture
  parameters: Record<string, unknown>;  // gesture-specific data
  dispatchRoute: DispatchRoute;    // 'direct' | 'construction' | 'deferred'
  mutationTarget: MutationTarget;  // 'sockets' | 'contracts' | 'portals' | 'daemons' | 'budget'
  timestamp: string;               // ISO-8601
  hash: string;                    // SHA-256 over envelope content
}
```

---

## 3. Gesture Kinds

```typescript
type GestureKind =
  | 'dock_item'           // attach element to socket
  | 'undock_item'         // detach element from socket
  | 'tether_satellite'    // create tether connection
  | 'untether_satellite'  // remove tether connection
  | 'mesh_connect'        // join mesh network
  | 'mesh_disconnect'     // leave mesh network
  | 'portal_place'        // create external portal
  | 'portal_remove'       // remove external portal
  | 'daemon_toggle'       // toggle daemon process
  | 'budget_adjust';      // adjust resource budget
```

---

## 4. Mutation Targets

| Target | Affected By |
|--------|------------|
| `sockets` | `dock_item`, `undock_item` |
| `contracts` | `tether_satellite`, `untether_satellite`, `mesh_connect`, `mesh_disconnect` |
| `portals` | `portal_place`, `portal_remove` |
| `daemons` | `daemon_toggle` |
| `budget` | `budget_adjust` |

---

## 5. Dispatch Routes

| Route | Meaning | Used By |
|-------|---------|---------|
| `construction` | Must pass through Construction Verification Gate | Connection gestures |
| `direct` | Applied directly, reversible | Boundary gestures |
| `deferred` | Identity unavailable, queued | Any gesture when identity is unavailable |

---

## 6. Gesture Input (pre-normalization)

```typescript
interface GestureInput {
  gesture: GestureKind;
  sourceEntityId: string;
  targetEntityId: string;
  parameters?: Record<string, unknown>;
}
```

The normalization step enriches this into a full IntentEnvelope by:
1. Generating a unique `intentId`
2. Classifying the `actionClass` from the gesture kind
3. Looking up `dispatchRoute` and `mutationTarget`
4. Computing the SHA-256 hash
5. Recording the timestamp

---

## 7. Resolution and Dispatch Types

### IntentResolution

```typescript
interface IntentResolution {
  intentId: string;
  verdict: 'permitted' | 'denied' | 'deferred';
  reason: string;
  actionPermission: ActionPermission | null;
  resolvedAt: string;
}
```

### DispatchOutcome

```typescript
interface DispatchOutcome {
  intentId: string;
  decision: DispatchDecision;
  status: 'executed' | 'blocked' | 'deferred' | 'failed';
  mutationApplied: boolean;
  timestamp: string;
}
```

---

## 8. Implementation Reference

| Artifact | Path |
|----------|------|
| Full type definitions | `src/intent/contracts.ts` |
| Normalization | `src/intent/normalize.ts` |
| Canonical ordering | `src/intent/contracts.ts` — `GESTURE_KIND_ORDER` |
| Conformance tests | `src/intent/intent.test.ts` |

---

## 9. Conformance Requirements

1. All 10 gesture kinds MUST be normalizable into valid IntentEnvelopes.
2. `intentId` MUST be unique per normalization call.
3. `actionClass` MUST be derived from `GESTURE_ACTION_CLASS_MAP`, not from parameters.
4. `hash` MUST be SHA-256 over the envelope content excluding the hash field itself.
5. Unknown gesture kinds MUST NOT be accepted by the normalization pipeline.
