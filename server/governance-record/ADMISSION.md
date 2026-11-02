# Durable admission primitive — patch 1

Base: `32cba0b73388a083c6b1028d61a2b726ebb7cc31`.
Branch: `codex/governance-durable-admission`.
Architect approved the storage-only patch and the initial-message-plus-two-replacements rule on 2026-10-31.

## Scope

This service is not imported by any route. It does not change live counting, generate model output, deliver messages, execute tools, migrate existing records, or implement the entire boundary proposal. Existing review-log behavior remains the default. Strict log handling is opt-in and enabled by AdmissionStore.

Use a dedicated protected directory for the new schema. Trusted integration code supplies caller/workspace scope and direction; neither is derived from untrusted model text. The service stores original content and cannot be exposed as an unauthenticated HTTP endpoint.

## Contract

1. `registerSubmission` binds a stable key to exact content and lineage, allocating an exchange only after checking the scoped initial key. It consumes nothing. A pending registration reserves the exchange.
2. `admitSubmission` serializes lookup, eligibility and ordinal allocation with the durable event append. Results distinguish `admission: new` from `existing`. Only new admissions may start processing; transport duplicates never authorize replay.
3. `closeProcessing` records a terminal processing outcome without refund. A returned outcome requires a nonempty trusted receipt reference before the next replacement can register. This service does not verify receipts; the future integration must do so. `shortfall` and `completed` do not open replacement permission.
4. `lookupSubmission` and `getExchange` return defensive copies. Admission events alone determine consumption. Ordinals are 0, 1, 2. A registered or active attempt prevents competing replacements; stale parents are rejected.
5. `reconcileSubmission` reopens and verifies authoritative storage and successfully flushes its index/segments before asserting durability. Matching admitted events retain their identities. A registered submission with no admission becomes `not-admitted`; no assessment or admission is automatically replayed. An absent registration returns null only after successful disk verification.

A not-admitted key remains bound and terminal in this first primitive. The future explicit recovery/continuation API must retain its lineage; it must not silently give a new count. No continuation API or legacy-history linking is activated here. An admitted attempt lacking a processing outcome after restart stays closed to replacements; duplicate lookup exposes its existing identity rather than replaying it.

## Writer ownership and failure behavior

An exclusive directory creation at `.admission-writer` provides cooperative lifetime ownership. A second service/process refuses to open. A graceful close waits for its queue and removes its own lock; a process crash leaves the lock. There is no time/PID-based automatic takeover.

An operator must establish that the former writer is stopped before removing the empty lock directory for recovery. Do not delete log/index files. An unresolved or corrupt chain remains closed and unchanged. This mechanism is not protection against a privileged process deliberately removing the lock or editing protected storage; filesystem access controls are an integration requirement.

Strict logs freeze after uncertain writes, including registration and index writes. The entire store refuses admission until reconciliation; unrelated-key lookups cannot obtain speculative cached success. Replay validates event order and schema as well as hashes. Existing legacy log schemas are rejected without rewriting their bytes.

Reconciliation permits at most two failed calls per store instance and has a configurable caller deadline (default 5 seconds, maximum 60). Explicit reopening is operator recovery, not an automatic retry loop. If an OS write outlives the caller deadline, its serialization queue and writer ownership remain held until the operation settles; no competing write is released. The service cannot cancel an in-flight filesystem operation. An application-level recovery interface remains future work.

A hash chain detects inconsistency, not replacement of an entire valid history without an external anchor. This patch makes no stronger tamper-proof claim. File `sync` success is the storage acknowledgment boundary; actual power-loss guarantees, directory metadata durability, filesystem ACLs and deployment storage behavior require environment validation. Process-exit tests are not power-loss tests.

## Review and integration dependencies

- Architect `/ask` admission before assessment, stable client keys, actual receipt evidence and explicit recovery UI.
- Other governed callers and independent output-exchange admission.
- Protected storage location, access policy, stale-lock recovery runbook, external anchors and retention.
- Legacy continuation, with no rewrite of old records or inferred fresh allowance.
- Contextual operation assessment, whole-return validation and external-effect release are separate patches.

## Verification

Tests use temporary directories and stub fault hooks, never a user's review area. Coverage includes simultaneous duplicates and conflicting sibling requests, immutable payload capture, exact key conflicts, stale parents, no refund after shortfall, independent directions/scopes, strict uncertain-write freeze, explicit reconciliation, registration-only and admitted restarts, a real child-process exit and second-process refusal, preserved partial records, rejected legacy schema, and reconciliation deadlines.

The historical review test expecting fresh-count resubmission intentionally remains unchanged because live routes are not integrated yet. Passing that test is evidence of compatibility, not evidence that the new rule is active.

## Peer review repair, 2026-10-31

The independent GPT reviewer requested three recovery changes. Confirmed non-admission now keeps that exchange closed to new keys pending an explicit future continuation operation. In-process reconciliation preserves unrelated registrations that were already acknowledged. Uncertain writes remember their scoped submission key; reconciling another key cannot clear the freeze. Three targeted tests cover these cases. Full gateway suite passes 225/225 after the repair, and both server TypeScript checks pass. These are reported Lumin checks, not independent peer execution.

## Reconciliation timeout repair, 2026-10-31

The peer identified that a timeout froze the store without naming the timed-out submission. The timeout and error paths now bind recovery to the scoped key while preserving an earlier unresolved key. The serialized worker checks expiration before and after reload/write; a queued timeout cannot clear or replace the existing recovery identity. The held-write regression now attempts absent and unrelated existing keys before same-key reconciliation. Targeted and full gateway checks were rerun after this fix.

## 2026-10-31 | Lumin | Queued timeout coverage
- Peer confirmed timeout repair statically and recommended deterministic queued-timeout coverage. Added held-A/queued-B test: both deadlines expire; B never reloads/appends, unrelated keys stay blocked, and A recovers with the same key. Focused admission suite passes 22/22.
