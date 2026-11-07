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


## Append Log

2026-11-06 | Lumin | Batch09 structural continuation marker. All earlier content is preserved verbatim; this marker does not retrospectively certify historical entries.


## 2026-11-06 | Lumin | Review HTTP teardown hardening
- review.test.ts registers owned cleanup before await-listen, uses bounded close/request helpers, settles all cleanup and constrains recursive removal to owned temporary paths. Original business/governance fixtures unchanged.
- New actual-filesystem/HTTP process command verifies the same compiled helper:12servers/four clean child exits, repeated close, incomplete/keep-alive requests and freed/rebound ports. No model mock run or original-cause inference. Original review.test.ts whole-file failure remains preserved and causally undetermined.


## 2026-11-06 | Lumin | Active Conscience IDQ restoration
- Restored Identify/Define/Question across current gateway, client and projections while preserving retries, withholding, UI and recovery. Define uses recorded findings/readings. Build and live local-model inbound/outbound negative controls pass; historical Suggest records remain explicitly historical. See docs/IDQ_RESTORATION_2026-11-06.md. Full numeric/PTAG mounting and independent final journey remain open; publication held.

## 2026-11-06 | Lumin | Numeric Marker and PTAG mounting candidate

The gateway candidate shares a bidirectional Marker session across planning, tasks, and generation. It restores the pinned private source loader and validates ordered PIM, IRG, and PTAG results against the exact candidate hash. Holds return through Conscience and release requires a complete passing Marker. Source candidate 5be2f92+marker-da00c0a70cac is pinned by a private source manifest. Build and 465 app tests pass. Atlas revision 3 passes 37/37.

On loopback port 3205, live request 3d8a43eb-1531-4d3b-a7b5-86e9b0ac1503 passed inbound PIM and IRG. The pinned Baseten PTAG model returned HTTP 400 with a deactivation error. The request returned HTTP 502 with zero writer calls and zero deliveries. Independent review and approval of a working PTAG binding remain open. The 248 artifacts on the P25 visual walkthrough runtime at port 3204 still match Aster's manifest. Publication remains held.

## 2026-11-07 | Lumin | Meta PTAG live reconciliation

Tracey explicitly approved Meta for PTAG after the pinned Baseten version returned a deactivation error. A separately hashed private successor manifest selects the existing Meta profile for PTAG. The registry, activation, source approval, contract and thresholds retain their existing pinned references. The ignored current environment selects the successor manifest SHA-256 4a4677c3cc8cc8bea68db682930cff47a8a08ca64c4befd279ed38079c48b92b.

Author live request f4c9e284-a1de-4966-b43c-0191ac463a26 returned HTTP 200 on port 3206 (PID 57448). Inbound and outbound numeric Markers both returned [1,1], with structural validation and Prism delivery. The call record shows one writer call and one delivery. The prior Baseten failure remains retained.

The source matches all 14 paths in source-manifest.json for 5be2f92+marker-da00c0a70cac. The reviewed port 3204 runtime still matches all 248 artifacts in Aster's manifest 23357318251e20c4b8a1825dfb0015007d10c77ad16300f345c7252ad043f82a. Atlas policy revision 3 passes 37 files. Independent acceptance of the governance candidate and Tracey's visual acceptance remain pending. Publication is held. Private evidence is under C:/AEGIS_IDE_AUDIT/lumin-marker-ptag-reconciliation-20261106.
