# Substrate Context Envelope Schema v0.1

**Phase:** P1 — Adaptive Identity Surface
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/identity/contracts.ts`

---

## 1. Purpose

The Substrate Context Envelope defines the capacity constraints of the substrate (LLM context window, local memory, or other execution environment) that identity projection must fit within. It determines how much identity material can be included and influences the reasoning tier and risk assessment.

---

## 2. Schema

```typescript
interface SubstrateContextEnvelope {
  maxSerializedBytes: number;           // hard byte limit
  estimatedTokenAllowance: number;      // approximate token budget
  tokenizerProfile: string;             // tokenizer model identifier
  reasoningTier: string;                // 'minimal' | 'standard' | 'extended'
  taskRiskClass: string;                // 'low' | 'medium' | 'high'
  reservedResponseCapacity: number;     // tokens reserved for response
}
```

---

## 3. Pre-defined Profiles

| Profile | Max Bytes | Token Allowance | Reasoning Tier | Risk Class | Reserved |
|---------|-----------|----------------|----------------|------------|----------|
| `minimal-3k` | 3,200 | 800 | minimal | low | 400 |
| `standard-8k` | 8,192 | 2,048 | standard | medium | 800 |
| `extended-32k` | 32,768 | 8,192 | extended | medium | 2,000 |
| `maximum-128k` | 131,072 | 32,768 | extended | high | 8,000 |

Profiles are accessed via `ENVELOPE_PROFILES['profile-name']`.

---

## 4. Role in Identity Projection

The envelope constrains two stages of projection:

1. **Kernel fit check** — `kernel.serializedBytes <= envelope.maxSerializedBytes`
2. **Promotion budget** — promoted records are added until cumulative bytes reach `maxSerializedBytes`

Records that would exceed the envelope are added to the omission list with a reason citing the capacity limit.

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| Schema and profiles | `src/identity/contracts.ts` — `SubstrateContextEnvelope`, `ENVELOPE_PROFILES` |
| Envelope capacity check | `src/identity/kernel.ts` — `kernelFitsEnvelope()` |
| Promotion budget enforcement | `src/identity/projection.ts` — `selectPromotedRecords()` |

---

## 6. Conformance Requirements

1. All four pre-defined profiles MUST be available via `ENVELOPE_PROFILES`.
2. `maxSerializedBytes` MUST be the hard limit — no record selection may exceed it.
3. Byte measurement MUST use UTF-8 encoding consistent with the kernel schema.
4. Custom envelopes MAY be constructed for specific deployment scenarios.
