# Portal Relation Standard v0.1

**Phase:** P4 — Portal External Relations
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/portal/`

---

## 1. Purpose

The Portal Relation Standard defines how the AEGIS VIBE Architect establishes, manages, and terminates external relations through Portals. It extends the CORE Connection Standard v1.0 (which governs internal Umbilical, Tether, and Mesh connections) with an external relation model that maintains the same commitment to explicit contracts, identity gating, and negative space invariants.

### 1.1 Architectural Decision

**Decision:** Portal Transport Profiles (Option B from P4 ADR)

The three internal connection types (Umbilical, Tether, Mesh) are retained as-is. External relations are modeled through a separate `PortalContract` structure rather than adding new `connectionType` values to `RelationContract`. This preserves the existing CORE Connection Standard while adding external capability.

---

## 2. Portal State Machine

### 2.1 Five States

| State | Meaning |
|-------|---------|
| `dormant` | Portal exists but is not connected |
| `negotiating` | Connection handshake in progress |
| `active` | Portal is open and serving traffic |
| `suspended` | Portal paused, tender draining |
| `severed` | Connection terminated, awaiting reset |

### 2.2 Valid Transitions

```
dormant ──▶ negotiating
negotiating ──▶ active
negotiating ──▶ severed
active ──▶ suspended
active ──▶ severed
suspended ──▶ active
suspended ──▶ severed
severed ──▶ dormant
```

### 2.3 Identity Gating

Transitions to `negotiating` (via `openPortal`) and from `suspended` to `active` (via `resumePortal`) require identity permission for the `reversible_bounded` action class. Other transitions do not require identity checks.

---

## 3. Tender (Outboard Process Manager)

### 3.1 Tender States

| State | Meaning |
|-------|---------|
| `initializing` | Tender created, configuring |
| `ready` | Configuration complete, awaiting activation |
| `serving` | Actively processing traffic |
| `draining` | Completing in-flight work, refusing new requests |
| `terminated` | Shut down |

### 3.2 Tender Specification

```typescript
interface TenderSpec {
  tenderId: string;
  portalRef: string;              // owning portal
  state: TenderState;
  endpoint: ExternalEndpoint;     // the external service
  config: {
    bufferSize: number;           // default: 4096
    maxConcurrentFlows: number;   // default: 4
    healthCheckIntervalMs: number; // default: 30000
  };
  createdAt: string;
  hash: string;                   // SHA-256
}
```

---

## 4. External Endpoints

```typescript
interface ExternalEndpoint {
  endpointId: string;
  serviceKind: ExternalServiceKind;  // 'api' | 'database' | 'message_queue' | 'file_storage' | 'compute'
  protocol: string;                   // e.g., 'https', 'wss', 'grpc'
  address: string;                    // endpoint URL or address
  flowDirection: FlowDirection;       // 'inbound' | 'outbound' | 'bidirectional'
  capabilities: string[];            // e.g., ['read', 'write']
  hash: string;
}
```

---

## 5. Boundary Policy

Every portal carries a `BoundaryPolicy` that is evaluated before any connection:

```typescript
interface BoundaryPolicy {
  policyId: string;
  allowedFlowDirections: FlowDirection[];
  allowedServiceKinds: ExternalServiceKind[];
  maxPayloadBytes: number;            // default: 1,048,576 (1 MB)
  requiresIdentityGate: boolean;      // default: true
  hash: string;
}
```

Boundary evaluation checks:
1. Endpoint flow direction is in `allowedFlowDirections`
2. Endpoint service kind is in `allowedServiceKinds`
3. Payload size does not exceed `maxPayloadBytes`

Violations produce structured `BoundaryEvaluation` results with a list of specific violations, not exceptions.

---

## 6. Portal Contract

When a portal reaches `active` state, a `PortalContract` is signed:

```typescript
interface PortalContract {
  contractId: string;
  portalRef: string;
  tenderRef: string;
  endpointRef: string;
  timestamp: string;
  state: 'active' | 'terminated';
  negotiatedProtocol: string;
  flowDirection: FlowDirection;
  boundaryPolicyRef: string;
  negativeSpaceInvariants: {
    never_serializes_witness: boolean;     // always true
    never_persists_prompts: boolean;       // always true
    no_verdict_over_inner_life: boolean;   // always true
  };
  hash: string;                           // SHA-256
}
```

### 6.1 Negative Space Invariants

These invariants are non-negotiable properties that every portal contract enforces:

| Invariant | Meaning |
|-----------|---------|
| `never_serializes_witness` | No witness identity is sent across the portal boundary |
| `never_persists_prompts` | No prompts are stored by the external service |
| `no_verdict_over_inner_life` | No external service makes judgments about inner state |

---

## 7. Portal Operations

| Operation | Prerequisites | Result |
|-----------|--------------|--------|
| `createPortalDescriptor(name, angle, config?)` | None | Dormant portal with boundary policy |
| `openPortal(portal, endpoint, surface)` | Identity permission (`reversible_bounded`) + boundary policy pass | Active portal with tender + contract |
| `closePortal(portal)` | Portal in active/suspended state | Dormant portal, tender terminated, contract cleared |
| `suspendPortal(portal, reason)` | Portal in active state | Suspended portal, tender draining |
| `resumePortal(portal, surface)` | Identity permission + portal in suspended state | Active portal |

---

## 8. Relationship to CORE Connection Standard

| Aspect | CORE Connections (v1.0) | Portal Relations (v0.1) |
|--------|------------------------|------------------------|
| Scope | Internal (Element-to-Element) | External (System-to-Service) |
| Types | Umbilical, Tether, Mesh | Portal (single type) |
| Contract | `RelationContract` | `PortalContract` |
| Process manager | N/A | Tender |
| Boundary | CORE/Orb boundary | Explicit `BoundaryPolicy` |
| Identity gating | Implicit | Explicit via `checkActionPermission` |

---

## 9. Implementation Reference

| Artifact | Path |
|----------|------|
| Type contracts | `src/portal/contracts.ts` |
| Boundary policy | `src/portal/boundary.ts` |
| Lifecycle state machine | `src/portal/lifecycle.ts` |
| Tender and endpoint creation | `src/portal/tender.ts` |
| Portal operations | `src/portal/operations.ts` |
| Public API | `src/portal/index.ts` |
| Conformance tests | `src/portal/portal.test.ts` (45 tests) |

---

## 10. Conformance Requirements

1. Portal state transitions MUST follow the valid transition graph exactly.
2. `openPortal` and `resumePortal` MUST check identity permission for `reversible_bounded`.
3. Boundary policy MUST be evaluated before any negotiation begins.
4. Every active portal MUST have a signed `PortalContract` with all negative space invariants `true`.
5. `closePortal` MUST transition the tender to `terminated` and the portal to `dormant`.
6. All portal artifacts MUST carry SHA-256 hashes.
