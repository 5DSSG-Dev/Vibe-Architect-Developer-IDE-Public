# Integrated Assurance Report v0.1

**Phase:** P5 — Integrated Assurance
**Date:** 2026-09-07
**Status:** Validated — reproducible evidence in `src/assurance/`

---

## 1. Purpose

This report demonstrates that Phases P1 through P4 operate as one integrated architecture. Five end-to-end scenarios exercise the full pipeline from identity projection through construction verification, intent processing, and portal operations.

---

## 2. Report Summary

| Metric | Value |
|--------|-------|
| Scenarios executed | 5 |
| Scenarios passed | 5 |
| Scenarios failed | 0 |
| Total assertions | 30 |
| Overall verdict | **PASS** |

---

## 3. Scenario Results

### Scenario A — Identity-Constrained Construction

**ID:** `identity_constrained_construction`

**What it proves:** Degraded identity (4 of 5 required domains for `consequential_mutation`) constrains action permissions proportionally. Observation survives; conversation and mutation are denied. Promotion to full records restores all permissions.

| Assertion | Result |
|-----------|--------|
| Coverage state is IDENTITY_DEGRADED | PASS |
| Observation permitted at degraded state | PASS |
| Conversation denied at degraded state | PASS |
| Mutation denied at degraded state | PASS |
| Mutation paused until promotion | PASS |
| Mutation permitted after promotion | PASS |

**Pipeline exercised:** P1 (identity projection, coverage states, action permissions)

---

### Scenario B — Canvas-Generated Intent Pipeline

**ID:** `canvas_generated_intent`

**What it proves:** A canvas gesture (dock_item) flows through the complete pipeline: normalization, identity-gated resolution, construction-routed dispatch, verification gate, and mutation application.

| Assertion | Result |
|-----------|--------|
| Gesture normalized | PASS |
| Action class is consequential_mutation | PASS |
| Identity resolution permitted | PASS |
| Dispatch routed via construction | PASS |
| Dispatch outcome executed | PASS |
| Construction gate passed | PASS |
| Mutation applied | PASS |

**Pipeline exercised:** P1 (identity surface) → P3 (normalize, resolve, dispatch) → P2 (construction gate)

---

### Scenario C — Generated External Connector

**ID:** `generated_external_connector`

**What it proves:** A portal can be created, opened (with identity gating and boundary policy), contract signed with negative space invariants, and cleanly closed back to dormant state.

| Assertion | Result |
|-----------|--------|
| Portal reaches active state | PASS |
| Tender is serving | PASS |
| Contract signed | PASS |
| Boundary policy enforced | PASS |
| Negative space invariants preserved | PASS |
| Portal returns to dormant after close | PASS |

**Pipeline exercised:** P1 (identity permission) → P4 (portal lifecycle, tender, boundary, contract)

---

### Scenario D — Shortfall During Exchange

**ID:** `shortfall_during_exchange`

**What it proves:** Degraded identity (single domain) prevents portal opening and blocks mutation. Internal state remains unchanged — failure-as-data with no side effects.

| Assertion | Result |
|-----------|--------|
| Portal open attempted | PASS |
| Identity denied portal opening | PASS |
| Shortfall or degradation recorded | PASS |
| Internal state unchanged | PASS |

**Pipeline exercised:** P1 (degraded identity, shortfall) → P4 (portal denied) → P3 (dispatch blocked)

---

### Scenario E — Degraded Surface Continuity

**ID:** `degraded_surface_continuity`

**What it proves:** Action permissions degrade gracefully across three coverage states. Full surface permits all actions. Degraded surface permits only observation. Unavailable surface defers rather than crashes.

| Assertion | Result |
|-----------|--------|
| Full surface: observation permitted | PASS |
| Full surface: conversation permitted | PASS |
| Full surface: mutation permitted | PASS |
| Degraded surface: observation permitted | PASS |
| Degraded surface: conversation denied | PASS |
| Degraded surface: mutation denied | PASS |
| Unavailable surface: observation permitted | PASS |
| Unavailable surface: mutation deferred | PASS |

**Pipeline exercised:** P1 (all 5 coverage states, action permission matrix) → P3 (deferred dispatch)

---

## 4. Cross-Phase Integration Evidence

| Integration Point | Scenarios That Exercise It |
|-------------------|---------------------------|
| P1 → P2: Identity gate checker in construction pipeline | B |
| P1 → P3: Identity-gated intent resolution | B, D, E |
| P1 → P4: Identity-gated portal operations | C, D |
| P3 → P2: Construction-routed dispatch through verification gate | B |
| P1 coverage state → action permissions | A, D, E |
| Failure-as-data (no crashes on identity gaps) | A, D, E |
| Full lifecycle (create → operate → close) | C |

---

## 5. Reproducibility

The assurance suite is fully reproducible:

```bash
npx tsx --test src/assurance/assurance.test.ts
```

The report builder in `src/assurance/report.ts` aggregates scenario evidence into an `IntegratedAssuranceReport` with deterministic SHA-256 hashing.

---

## 6. Implementation Reference

| Artifact | Path |
|----------|------|
| Scenario contracts | `src/assurance/contracts.ts` |
| Scenario runners | `src/assurance/scenarios.ts` |
| Report builder | `src/assurance/report.ts` |
| Public API | `src/assurance/index.ts` |
| Conformance tests | `src/assurance/assurance.test.ts` (45 tests) |
