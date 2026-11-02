# Governance record folder Totem

Append-only continuity; verify against current source and tests.


## 2026-10-31 | Lumin | Approved storage-only admission patch
- Architect approved initial + two replacements without same-exchange reset, then approved bounded storage-only implementation. Branch codex/governance-durable-admission starts at pinned 32cba0b; Atlas work remains on its separate published branch.
- Added versioned registration/admission/resolution/closure events, exact scoped keys, immutable payload capture, serialized allowance checks, strict uncertain-write freeze, explicit reconciliation, cooperative exclusive writer ownership and replay. No route activation, migration, provider calls or tool execution.
- Validation: 18 new admission tests plus existing gateway tests pass 222/222 under NODE_ENV=test. Initial full run exposed a timing-sensitive new test (221/222); replaced its short sleep assumption with a controlled held write and reran successfully. Server typechecks and diff check passed.
- Review limits and integration prerequisites in server/governance-record/ADMISSION.md. Live resubmission behavior remains unchanged. No commit, push or merge performed in this implementation turn.

## 2026-10-31 | Lumin | Admission recovery peer-review repairs
- GPT peer requested changes to recovery handling: confirmed non-admission could be bypassed by a new key, unrelated reconciliation stranded live registrations, and unrelated keys could clear an uncertainty freeze. Repaired all three in the storage-only primitive; added targeted tests. Full gateway 225/225, server typechecks and staged diff check pass. Route activation remains out of scope; peer review of repair remains pending.

## 2026-10-31 | Lumin | Timeout recovery identity
- Peer review found reconciliation timeout froze without a recovery key. Bound timeout/error to scoped key, preserving earlier identity; extended held-write test with absent and unrelated existing keys. Same-key recovery remains required.

## 2026-10-31 | Lumin | Queued timeout coverage
- Peer confirmed timeout repair statically and recommended deterministic queued-timeout coverage. Added held-A/queued-B test: both deadlines expire; B never reloads/appends, unrelated keys stay blocked, and A recovers with the same key. Focused admission suite passes 22/22.
