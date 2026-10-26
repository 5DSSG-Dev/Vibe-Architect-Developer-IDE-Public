# Minimum Identity Kernel Schema v0.1

**Phase:** P1 — Adaptive Identity Surface
**Date:** 2026-09-07
**Status:** Proposed — implementation evidence in `src/identity/kernel.ts`

---

## 1. Purpose

The Minimum Identity Kernel is the irreducible identity payload that must be present for any action beyond observation. It is constructed from the four foundational domains and serialized into a byte-measured structure that must fit within the Substrate Context Envelope before any promotion can occur.

---

## 2. Schema

```typescript
interface MinimumIdentityKernel {
  kernelId: string;               // unique per construction
  records: IdentityRecord[];      // foundational domain records
  serializedBytes: number;        // measured byte size of serialized kernel
  constructedAt: string;          // ISO-8601 timestamp
  hash: string;                   // SHA-256 over serialized kernel content
}
```

### 2.1 Required Domains

The kernel MUST include records from these four domains when available:

1. `foundational_commitments` (required — kernel construction fails without this)
2. `sovereignty_consent`
3. `authority_limitations`
4. `active_tensions`

### 2.2 Construction Rules

1. `extractKernelRecords(records)` filters input records to the four kernel domains.
2. Construction fails (returns `null`) if no `foundational_commitments` records exist.
3. `buildMinimumIdentityKernel(records)` serializes the filtered records, measures byte size, and computes SHA-256 hash.
4. `kernelFitsEnvelope(kernel, envelope)` checks `kernel.serializedBytes <= envelope.maxSerializedBytes`.

### 2.3 Hash Computation

```
hash = SHA-256( JSON.stringify(kernelRecords) )
```

The hash covers the full serialized content, ensuring any change to kernel records produces a different hash.

---

## 3. Byte Measurement

Serialized bytes are computed as:

```
serializedBytes = TextEncoder.encode( JSON.stringify(records) ).byteLength
```

This measures the actual UTF-8 byte length, not character count or token estimate.

---

## 4. Kernel in the Projection Pipeline

```
Records ──▶ extractKernelRecords ──▶ buildMinimumIdentityKernel ──▶ kernelFitsEnvelope?
                                                                         │
                                                           YES: proceed to promotion
                                                           NO:  shortfall (overflow)
```

The kernel is always constructed first. If it does not fit the envelope, projection fails with an overflow shortfall — no promoted records are evaluated.

---

## 5. Implementation Reference

| Artifact | Path |
|----------|------|
| Kernel construction | `src/identity/kernel.ts` |
| Type definitions | `src/identity/contracts.ts` — `MinimumIdentityKernel` |
| Conformance tests | `src/identity/identity.test.ts` — kernel suite |

---

## 6. Conformance Requirements

1. Kernel construction MUST fail if no `foundational_commitments` records are provided.
2. Kernel hash MUST be deterministic for identical input records.
3. Byte measurement MUST use UTF-8 encoding via `TextEncoder`.
4. Kernel MUST be checked against envelope capacity before promotion begins.
