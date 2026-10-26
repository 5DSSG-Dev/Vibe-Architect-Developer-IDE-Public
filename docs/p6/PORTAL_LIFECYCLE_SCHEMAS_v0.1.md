# Portal/Tender Lifecycle Schemas v0.1

**Phase:** P4 — Portal External Relations
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/portal/lifecycle.ts`

---

## 1. Purpose

This document defines the lifecycle state machines for Portals and Tenders. These are the only valid state progressions for external relation management. Invalid transitions are rejected with structured error responses.

---

## 2. Portal Lifecycle

### 2.1 States

```typescript
type PortalState = 'dormant' | 'negotiating' | 'active' | 'suspended' | 'severed';

const PORTAL_STATE_ORDER: PortalState[] = [
  'dormant', 'negotiating', 'active', 'suspended', 'severed'
];
```

### 2.2 Transition Graph

```
    ┌────────────────────────────────────────┐
    │                                        │
    ▼                                        │
 dormant ──▶ negotiating ──▶ active ──▶ severed
                  │              │           ▲
                  │              ▼           │
                  └──────▶ suspended ────────┘
```

### 2.3 Transition Table

| From | To | Condition |
|------|----|-----------|
| `dormant` | `negotiating` | Identity permission required |
| `negotiating` | `active` | Tender ready |
| `negotiating` | `severed` | Negotiation failed |
| `active` | `suspended` | Operator or policy decision |
| `active` | `severed` | Connection lost or closed |
| `suspended` | `active` | Identity permission required |
| `suspended` | `severed` | Closure while suspended |
| `severed` | `dormant` | Reset after closure |

### 2.4 Transition Request

```typescript
interface TransitionRequest {
  targetState: PortalState;
  reason: string;
  permission: ActionPermission | null;
}
```

### 2.5 Transition Result

```typescript
interface TransitionResult {
  success: boolean;
  portal: PortalDescriptor;
  transition: PortalTransition | null;
  failureReason?: string;
}
```

### 2.6 Transition Record

```typescript
interface PortalTransition {
  from: PortalState;
  to: PortalState;
  timestamp: string;    // ISO-8601
  reason: string;
}
```

---

## 3. Tender Lifecycle

### 3.1 States

```typescript
type TenderState = 'initializing' | 'ready' | 'serving' | 'draining' | 'terminated';

const TENDER_STATE_ORDER: TenderState[] = [
  'initializing', 'ready', 'serving', 'draining', 'terminated'
];
```

### 3.2 Transition Graph

```
 initializing ──▶ ready ──▶ serving ──▶ draining ──▶ terminated
      │              │          │                        ▲
      │              │          └────────────────────────┤
      │              └──────────────────────────────────┤
      └─────────────────────────────────────────────────┘
```

### 3.3 Transition Table

| From | To | Condition |
|------|----|-----------|
| `initializing` | `ready` | Configuration validated |
| `initializing` | `terminated` | Configuration failed |
| `ready` | `serving` | Portal activated |
| `ready` | `terminated` | Portal closed before activation |
| `serving` | `draining` | Portal closing, completing in-flight work |
| `serving` | `terminated` | Immediate termination |
| `draining` | `terminated` | All in-flight work complete |

---

## 4. Combined Open/Close Sequences

### 4.1 Open Portal (happy path)

```
Portal:  dormant → negotiating → active
Tender:  (created) → initializing → ready → serving
Result:  PortalContract signed
```

### 4.2 Close Portal

```
Tender:  serving → draining → terminated
Portal:  active → severed → dormant
Result:  Tender cleared, contract nulled
```

### 4.3 Suspend/Resume

```
Suspend: Portal active → suspended, Tender serving → draining
Resume:  Portal suspended → active (identity check required)
```

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| State definitions | `src/portal/contracts.ts` |
| Transition validation | `src/portal/lifecycle.ts` |
| Portal operations | `src/portal/operations.ts` |
| Conformance tests | `src/portal/portal.test.ts` — lifecycle suite |

---

## 6. Conformance Requirements

1. `isValidPortalTransition(from, to)` MUST return `false` for any transition not in the table.
2. `isValidTenderTransition(from, to)` MUST return `false` for any transition not in the table.
3. Invalid transition attempts MUST return structured `TransitionResult` with `success: false`.
4. `terminated` tenders MUST be allowed to transition to `initializing` (recycling).
5. Portal and tender state orders MUST be the canonical ordering for serialization.

---

## 7. Scope Note: Wormhole, Courier, Customs, and Tunnel

The P4 ADR reserves the following concepts for future phases:

| Concept | Status | Notes |
|---------|--------|-------|
| **Wormhole** | Not yet specified | Direct point-to-point bypass; requires dedicated ADR |
| **Courier** | Not yet specified | Reserved decision: specialization of Actuator, Constructor mode, or explicit role beneath Tender |
| **Customs** | Not yet specified | Inbound/outbound validation at portal boundary |
| **Tunnel** | Not yet specified | Reserved decision: which returns bypass ordinary Customs routing |

These will be specified when their ADRs are recorded. See Architectural Decision #6 and #7 in the Action Plan.
