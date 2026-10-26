# Implementation Backlog and Dependency Map v0.1

**Phase:** P6 — Documentation and Release Set
**Date:** 2026-09-07
**Status:** Current as of P5 completion

---

## 1. Completed Phases

| Phase | Name | Status | Tests | Key Artifacts |
|-------|------|--------|-------|---------------|
| P0 | Meaning Freeze | **Complete** | N/A | Source Authority Matrix, Visual Source Classification, Evidence Baseline |
| P1 | Adaptive Identity Surface | **Complete** | 37 | `src/identity/` — projection, kernel, coverage, permissions |
| P2 | Construction Verification Gate | **Complete** | 39 | `src/construction/` — checkers, gate, manifests, repair deltas |
| P3 | Relational Intent Seam | **Complete** | 39 | `src/intent/` — normalize, resolve, dispatch |
| P4 | Portal External Relations | **Complete** | 45 | `src/portal/` — lifecycle, boundary, tender, operations |
| P5 | Integrated Assurance | **Complete** | 45 | `src/assurance/` — 5 scenarios, report builder |
| P6 | Documentation and Release Set | **Complete** | N/A | `docs/p6/` — 12 deliverables |

**Total conformance tests:** 205

---

## 2. Dependency Map

```
P0 (Meaning Freeze)
 │
 ├──▶ P1 (Adaptive Identity Surface)
 │     │
 │     ├──▶ P2 (Construction Verification Gate)
 │     │     │
 │     │     └──▶ P3 (Relational Intent Seam) ◀── P1
 │     │           │
 │     ├───────────┘
 │     │
 │     └──▶ P4 (Portal External Relations)
 │
 └──▶ P5 (Integrated Assurance) ◀── P1, P2, P3, P4
       │
       └──▶ P6 (Documentation and Release Set) ◀── all phases
```

### 2.1 Runtime Dependencies

| Module | Depends On |
|--------|-----------|
| `src/identity/` | (standalone) |
| `src/construction/` | `src/identity/` (identity gate checker) |
| `src/intent/` | `src/identity/` (action permissions) |
| `src/portal/` | `src/identity/` (action permissions) |
| `src/assurance/` | `src/identity/`, `src/construction/`, `src/intent/`, `src/portal/` |

---

## 3. Resolved Architectural Decisions

| # | Decision | Resolution | Evidence |
|---|----------|------------|----------|
| 1 | External relations: new connection types vs portal profiles | **Portal Transport Profiles (Option B)** | `src/portal/contracts.ts` |
| 2 | Authored contents of Minimum Identity Kernel | **Input-driven** — kernel is constructed from provided records | `src/identity/kernel.ts` |
| 3 | Weighting function for dynamic identity promotion | **7-signal scoring** | `src/identity/projection.ts` — `scoreDomainRelevance()` |
| 4 | Coverage states permitting reversible actions | **State permission table** | `src/identity/surface.ts` — `statePermissions` |

---

## 4. Unresolved Architectural Decisions

| # | Decision | Status | Blocking |
|---|----------|--------|----------|
| 5 | Maximum automatic Repair Delta attempts per risk class | Not yet resolved | Future enhancement |
| 6 | Courier: Actuator specialization, Constructor mode, or explicit Tender role | Not yet resolved | Wormhole/Courier/Customs/Tunnel schemas |
| 7 | Tunnel return bypass routing and equivalent integrity surface | Not yet resolved | Wormhole/Courier/Customs/Tunnel schemas |

---

## 5. Outstanding Work Items

| Priority | Item | Dependency | Status |
|----------|------|------------|--------|
| 1 | Wormhole lifecycle schema | ADR for Decision #6, #7 | Not started |
| 2 | Courier specification | ADR for Decision #6 | Not started |
| 3 | Customs inbound/outbound validation | Portal Standard v0.1 | Not started |
| 4 | Tunnel specification | ADR for Decision #7 | Not started |
| 5 | Repair Delta retry limits | Construction Gate Standard v0.1 | Not started |
| 6 | Canvas UI integration | Intent Seam Standard v0.1 | Not started — `src/intent/` provides API, canvas needs adapter |
| 7 | Runtime portal integration | Portal Standard v0.1 | Not started — `src/portal/` provides API, `connectionRuntime.ts` needs adapter |
| 8 | Identity persistence | Identity Surface Standard v0.1 | Not started — currently in-memory only |

---

## 6. Release Condition Checklist

| Condition | Status |
|-----------|--------|
| Proposed definitions reviewed against Living Canon and current architecture | **Met** — all standards reference Living Canon concepts |
| Schemas and lifecycle definitions have executable conformance tests | **Met** — 205 tests across P1-P5 |
| Historical/conceptual assets marked so they cannot become accidental runtime authority | **Met** — Visual Source Classification in `docs/p0/`, Source Authority Matrix updated |
| Implementation evidence recorded before standard moves from proposed to validated | **Met** — P5 Integrated Assurance report with 30 assertions across 5 scenarios |
