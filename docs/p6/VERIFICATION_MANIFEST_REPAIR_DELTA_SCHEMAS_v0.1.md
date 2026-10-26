# Verification Manifest and Repair Delta Schemas v0.1

**Phase:** P2 — Construction Verification Gate
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/construction/`

---

## 1. Purpose

These schemas define the structured output of the Construction Verification Gate. The Verification Manifest records the outcome of every verification stage. The Repair Delta provides actionable guidance when verification fails.

---

## 2. Verification Manifest Schema

```typescript
interface VerificationManifest {
  manifestId: string;            // unique, format: "manifest-{timestamp}-{counter}"
  constructionId: string;        // links to the ConstructionArtifact
  verdict: GateVerdict;          // 'PASS' | 'PARTIAL' | 'FAIL'
  stageResults: StageResult[];   // ordered by verification stage
  generatedAt: string;           // ISO-8601
  hash: string;                  // SHA-256 over manifest content
}

type GateVerdict = 'PASS' | 'PARTIAL' | 'FAIL';
```

### 2.1 Stage Result

```typescript
interface StageResult {
  stage: VerificationStage;
  passed: boolean;
  evidence: string;              // human-readable explanation
  checkerName: string;           // identifier of the checker that ran
  durationMs?: number;           // optional timing
}
```

### 2.2 Verification Stages (ordered)

```typescript
type VerificationStage =
  | 'identity_gate'
  | 'typecheck'
  | 'test'
  | 'contract_conformance'
  | 'boundary'
  | 'evidence_validation';
```

---

## 3. Repair Delta Schema

```typescript
interface RepairDelta {
  deltaId: string;               // unique, format: "delta-{timestamp}-{counter}"
  manifestRef: string;           // manifestId of the failed verification
  failedStages: VerificationStage[];
  suggestedFixes: SuggestedFix[];
  estimatedComplexity: ComplexityEstimate;
  hash: string;                  // SHA-256 over delta content
}

type ComplexityEstimate = 'trivial' | 'moderate' | 'complex' | 'architectural';
```

### 3.1 Suggested Fix

```typescript
interface SuggestedFix {
  stage: VerificationStage;      // which stage this fix addresses
  description: string;           // what to fix
  affectedFiles: string[];       // file paths involved
  confidence: 'high' | 'medium' | 'low';
}
```

### 3.2 Complexity Estimation Rules

| Complexity | Condition |
|-----------|-----------|
| `trivial` | Single stage failed, high-confidence fix available |
| `moderate` | 2-3 stages failed, or medium-confidence fixes |
| `complex` | 4+ stages failed, or low-confidence fixes |
| `architectural` | Identity gate failed (requires identity surface changes) |

---

## 4. Hash Computation

Both manifests and deltas use SHA-256:

```
manifest.hash = SHA-256(JSON.stringify({
  constructionId, verdict, stageResults (stage + passed per result)
}))

delta.hash = SHA-256(JSON.stringify({
  manifestRef, failedStages, suggestedFixes (stage + description per fix)
}))
```

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| Type definitions | `src/construction/contracts.ts` |
| Manifest generation | `src/construction/gate.ts` — `buildManifest()` |
| Repair delta generation | `src/construction/gate.ts` — `buildRepairDelta()` |
| Conformance tests | `src/construction/construction.test.ts` |

---

## 6. Conformance Requirements

1. A manifest MUST be generated for every gate evaluation, regardless of verdict.
2. A repair delta MUST be generated for every `PARTIAL` or `FAIL` verdict.
3. Repair deltas MUST NOT be generated for `PASS` verdicts.
4. Manifest hash MUST be deterministic for identical inputs.
5. Suggested fixes MUST reference the specific stage they address.
