# Adaptive Identity Surface Standard v0.1

**Phase:** P1 — Adaptive Identity Surface
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/identity/`

---

## 1. Purpose

The Adaptive Identity Surface provides task-relative identity context that scales with available evidence and substrate capacity. It ensures that every action the system takes is grounded in identity commitments proportional to the action's consequence class, and that identity gaps produce structured shortfall records rather than silent continuation.

---

## 2. Core Concepts

### 2.1 Identity Records

An `IdentityRecord` is a versioned, hash-addressed unit of identity evidence belonging to one of eight domains:

| Domain | Role |
|--------|------|
| `foundational_commitments` | Non-negotiable values and ethical commitments |
| `sovereignty_consent` | Consent boundaries and sovereignty principles |
| `authority_limitations` | Limits on what the system may decide or act upon |
| `active_tensions` | Currently held tensions between competing values |
| `continuity` | Continuity of identity across sessions and contexts |
| `capability_boundaries` | Limits of competence and capability |
| `relational_history` | History of relationships with participants |
| `affect_context` | Current emotional and affective state context |

Each record carries: `recordId`, `domain`, `content`, `priority`, `version`, `hash` (SHA-256), `evidenceRefs`, `createdAt`, `updatedAt`.

### 2.2 Coverage States

The surface reports one of five coverage states:

| State | Meaning | Trigger |
|-------|---------|---------|
| `FULL_SURFACE` | All required domains covered at >= 95% ratio | High coverage + all action-required domains satisfied |
| `SUFFICIENT_SURFACE` | All required domains satisfied | All domains satisfied but coverage < 95% |
| `MINIMUM_KERNEL` | Kernel available, no records beyond it | Only kernel records, no promotion candidates |
| `IDENTITY_DEGRADED` | Kernel available but required domains unsatisfied | Missing domains required for the proposed action |
| `IDENTITY_UNAVAILABLE` | No kernel constructable | No foundational commitment records provided |

### 2.3 Action Classes

Four action classes define escalating consequence tiers:

| Action Class | Required Domains | Permitted States |
|-------------|-----------------|-----------------|
| `observation` | (none) | All states including `IDENTITY_UNAVAILABLE` |
| `conversation` | `foundational_commitments` | `FULL_SURFACE`, `SUFFICIENT_SURFACE`, `MINIMUM_KERNEL` |
| `reversible_bounded` | `foundational_commitments`, `sovereignty_consent`, `authority_limitations` | `FULL_SURFACE`, `SUFFICIENT_SURFACE` |
| `consequential_mutation` | `foundational_commitments`, `sovereignty_consent`, `authority_limitations`, `active_tensions`, `capability_boundaries` | `FULL_SURFACE`, `SUFFICIENT_SURFACE` |

Permission requires both state-level permission AND all required domains satisfied with `includedRecords > 0`.

---

## 3. Projection Pipeline

```
Input Records + Context + Envelope
        │
        ▼
  Extract Kernel Records (foundational_commitments required)
        │
        ▼
  Build Minimum Identity Kernel (serialize, measure bytes)
        │
        ▼
  Kernel Fits Envelope? ──NO──▶ Shortfall (overflow)
        │ YES
        ▼
  Rank Promotion Candidates (multi-signal scoring)
        │
        ▼
  Select Promoted Records (fit within envelope capacity)
        │
        ▼
  Compute Coverage (per-domain measurements)
        │
        ▼
  Determine Coverage State
        │
        ▼
  AdaptiveIdentitySurface { kernel, promoted, omissions, coverage, coverageState }
```

### 3.1 Promotion Scoring Signals

Candidates are ranked by cumulative score from seven signals:

1. **canonical_priority** — record's intrinsic priority weight
2. **active_intent** — term overlap with the current intent
3. **proposed_action** — domain relevance for the proposed action class
4. **boundary_proximity** — elevated when operating near capability boundaries
5. **affect_salience** — elevated under high affect pressure
6. **relation_participant** — relational history relevant when participants present
7. **shortfall_linkage** — records linked to prior shortfall content
8. **temporal_relevance** — recency weighting (< 7 days, < 30 days)

### 3.2 Substrate Context Envelope

The envelope constrains how much identity material fits in the substrate:

| Field | Type | Purpose |
|-------|------|---------|
| `maxSerializedBytes` | number | Hard byte limit for serialized identity |
| `estimatedTokenAllowance` | number | Estimated token budget |
| `tokenizerProfile` | string | Tokenizer model (e.g., `cl100k_base`) |
| `reasoningTier` | string | `minimal`, `standard`, `extended` |
| `taskRiskClass` | string | `low`, `medium`, `high` |
| `reservedResponseCapacity` | number | Tokens reserved for response generation |

---

## 4. Failure-as-Data: Shortfall Records

When projection fails or degrades, a `ShortfallRecord` is produced:

| Field | Purpose |
|-------|---------|
| `shortfallId` | Unique identifier |
| `failureType` | `kernel_construction`, `overflow`, `projection_failure` |
| `failureEvidence` | Human-readable description of what failed |
| `coverageStateBefore` / `coverageStateAfter` | State transition |
| `omittedRecordRefs` | Records that were excluded, with reasons |
| `recoveryAction` | Suggested recovery path |

No identity failure crashes the system. All produce inspectable records.

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| Type contracts | `src/identity/contracts.ts` |
| Projection pipeline | `src/identity/surface.ts` |
| Kernel construction | `src/identity/kernel.ts` |
| Promotion and coverage | `src/identity/projection.ts` |
| Hash utility | `src/identity/hash.ts` |
| Public API | `src/identity/index.ts` |
| Conformance tests | `src/identity/identity.test.ts` (37 tests) |

---

## 6. Conformance Requirements

1. Projection from identical inputs MUST produce identical coverage states.
2. A surface with `IDENTITY_UNAVAILABLE` MUST permit only `observation`.
3. `checkActionPermission` MUST deny actions when required domains have zero included records.
4. All identity records MUST carry SHA-256 hashes.
5. Shortfall records MUST be produced for every projection failure or degradation.
