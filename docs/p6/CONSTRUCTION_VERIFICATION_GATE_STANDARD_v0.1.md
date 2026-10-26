# Construction Verification Gate Standard v0.1

**Phase:** P2 — Construction Verification Gate
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/construction/`

---

## 1. Purpose

The Construction Verification Gate ensures that no generated code enters the application merely because it compiles or satisfies self-authored tests. Every construction artifact must pass through a composable verification pipeline that produces an inspectable manifest before any mutation is applied.

---

## 2. Verification Pipeline

### 2.1 Six Verification Stages (ordered)

| Stage | Name | What It Checks |
|-------|------|----------------|
| 1 | `identity_gate` | Identity surface permits the proposed action class |
| 2 | `typecheck` | Artifact passes type-level structural verification |
| 3 | `test` | Artifact passes relevant test suites |
| 4 | `contract_conformance` | Artifact conforms to governing contracts and schemas |
| 5 | `boundary` | Artifact operates within declared file/module boundaries |
| 6 | `evidence_validation` | Evidence references are valid and retrievable |

### 2.2 Stage Checkers

Each stage is implemented as a `StageChecker`:

```typescript
interface StageChecker {
  stage: VerificationStage;
  check(artifact: ConstructionArtifact, surface: AdaptiveIdentitySurface | null): StageResult;
}
```

Checkers are composable — callers assemble the pipeline from available checkers. Missing stages produce `FAIL` results.

### 2.3 Gate Evaluation

```typescript
evaluateConstructionGate(
  artifact: ConstructionArtifact,
  surface: AdaptiveIdentitySurface | null,
  checkers: StageChecker[]
): GateDecision
```

Returns a `GateDecision` containing:
- `permitted: boolean` — whether the artifact passes
- `manifest: VerificationManifest` — full verification record
- `repairDelta: RepairDelta | null` — repair guidance if verification failed

---

## 3. Verification Manifest

```typescript
interface VerificationManifest {
  manifestId: string;
  constructionId: string;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL';
  stageResults: StageResult[];
  generatedAt: string;         // ISO-8601
  hash: string;                // SHA-256 over manifest content
}
```

### 3.1 Verdict Rules

| Verdict | Condition |
|---------|-----------|
| `PASS` | All stages pass |
| `PARTIAL` | At least one stage passes but not all |
| `FAIL` | No stages pass, or zero checkers provided |

---

## 4. Repair Deltas

When verification fails, a `RepairDelta` is produced:

```typescript
interface RepairDelta {
  deltaId: string;
  manifestRef: string;           // links to the failed manifest
  failedStages: VerificationStage[];
  suggestedFixes: SuggestedFix[];
  estimatedComplexity: 'trivial' | 'moderate' | 'complex' | 'architectural';
  hash: string;
}
```

Each `SuggestedFix` identifies the stage, a description of what to fix, the affected file paths, and a confidence level (`high`, `medium`, `low`).

---

## 5. Construction Artifacts

```typescript
interface ConstructionArtifact {
  artifactId: string;
  constructionId: string;
  intent: string;                // human-readable description
  phase: ConstructionPhase;      // planning | design | implement | verify | integrate | deploy | monitor
  files: FileChange[];           // paths + change types + content hashes
  evidenceRefs: EvidenceRef[];
  metadata: Record<string, unknown>;
}
```

---

## 6. Built-in Checkers

| Checker | Factory | What It Validates |
|---------|---------|-------------------|
| Identity gate | `createIdentityGateChecker(surface)` | `checkActionPermission` for artifact's action class |
| Typecheck | `createTypecheckChecker()` | File change hashes are valid |
| Test | `createTestChecker()` | Evidence references exist and are retrievable |
| Contract conformance | `createContractConformanceChecker()` | Artifact has required fields and valid phase |
| Boundary | `createBoundaryChecker(allowedPaths)` | All file changes within allowed path prefixes |
| Evidence validation | `createEvidenceValidationChecker()` | All evidence refs have valid hashes |

---

## 7. Implementation Reference

| Artifact | Path |
|----------|------|
| Type contracts | `src/construction/contracts.ts` |
| Stage checkers | `src/construction/checkers.ts` |
| Gate evaluation | `src/construction/gate.ts` |
| Public API | `src/construction/index.ts` |
| Conformance tests | `src/construction/construction.test.ts` (39 tests) |

---

## 8. Conformance Requirements

1. Gate evaluation with zero checkers MUST produce `FAIL`.
2. The identity gate checker MUST deny when the surface lacks required domains.
3. Verification manifests MUST be generated before any mutation is applied.
4. Repair deltas MUST be produced for every non-PASS verdict.
5. All manifests and deltas MUST carry SHA-256 hashes.
