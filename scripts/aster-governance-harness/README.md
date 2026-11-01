# Aster offline governance harness — slice 1

Run from repository root, using the existing Node test runner (validated on Node 24.22.1):

```sh
node --test scripts/aster-governance-harness/harness.test.mjs
```

No npm install, new dependencies, tsx installation, package-script changes, network,
provider, credential, executor, production-store or application startup is required.
These `.mjs` modules use Node built-ins only; `test:gateway` does **not** discover them.

## Contract and evidence format

Manifest/event/PublicResult JSON schemas are version 1. Their checked-in JSON files
match the runtime schema objects in `schemas.mjs` (tested). `matches()` implements
only the small JSON Schema keyword subset used here, not a general-purpose validator.
Schema changes require deliberate version/contract review and regeneration of the
published JSON. Extra fields and unknown versions/roles/contracts fail validation.

`verify({manifest, events, observations})` is a synchronous deterministic function.
It returns `{version:1, status:'pass'|'invalid'|'inconclusive', errors, counts}`.
Errors are stable sorted codes, not raw evidence/payloads. Invalid evidence takes
precedence over incomplete coverage; incomplete coverage never passes.

The manifest pins P6-A v0.2 section 5 at
`fb50bacc2ef0e8ecf66fb082aa4ea78f4cdffd52`, specifies one admitted attempt, route,
expected outcome/counts, rewrite limit, retry scope and per-role ceilings. Contract
changes require explicit updates; “latest” is rejected. The 12-call per-response
and 10-call per-attempt writer fixtures are comparative arithmetic checks, **not a
selection of a live retry contract or authorization to make calls**.

Vocabulary follows PublicResultV1/ReturnedReceiptV1: scope, workspace, direction,
attemptId, exchangeId, ordinal, registrationDigest, snapshotDigest, originalDigest,
effectiveDigest, resultId, bodyDigest, resultAnchor and task operationId. Role tags:
`response.generate`, `response.reform`, `conscience.write`, `gauge.read`. Writer
response groups distinguish initial, rewrite and service retry. The verifier
checks allowed retry scope, rewrite counts and manifest-supplied role ceilings.

Events are strictly ordered and bound to manifest admission identity. A synthetic
acknowledged result record uses the existing `log.ts` canonical JSON/hash shape
(reimplemented without importing production code). A returned closure must follow
that result, bind its result/identity/content fields and match the recomputed
`p6-return-v1:` descriptor reference and result anchor. Release follows closure.
Task effects require prior bound intent and are checked independently of release.
Only the initial isolated result-chain record (seq=1, prevHash=null) is supported.
Multiple attempts, resumed real result chains and other directions are deliberately
not accepted as supported evidence in this first slice.

`fakeAdapters()` records separate in-memory event and observation arrays for dispatch,
release and effect. Self-tests alter these arrays independently to demonstrate
mismatch detection. Synthetic fixtures contain only placeholder identifiers/status
text and are not attack cases, private-suite selections or model evaluations.

## Checks and interpretation

Self-tests cover valid returned/completed/shortfall and task-effect traces, 12/10
budget examples, duplicate dispatch, missing admission/result/closure, release order,
receipt field/anchor/reference mismatches (including recomputed forged references),
result tampering, missing/unknown dispatch evidence, missing effect/release witnesses,
writer retry scope, role caps, count/sequence/schema mismatches and inconclusive
instrumentation. Fixed canonical/hash vectors reduce generator/verifier circularity.

A pass means these supplied synthetic witnesses satisfy this narrow verifier.
Neither event labels nor `coverageComplete:true` independently prove real dispatch
coverage or actual fsync/receipt authenticity. If both fake witnesses omit the same
action, this slice cannot discover it. Real mounted-route adapters must independently
establish capture coverage; fake adapters cannot prove bypass-freedom. Hashes detect
inconsistency, not authenticity against someone replacing all supplied evidence.
The schema checks status/outcome compatibility, not P5 envelope semantics. It uses
provided registration/content digests rather than recreating the real ingress
snapshot. No startup anchors, restart recovery, persistent queues, real stores,
client receipt, multi-process effects, actual authorization or model robustness is
validated here. At-most-once fake effect evidence is not real executor exactly-once
execution. Offline self-tests must never be reported as jailbreak acceptance.

## Scope and review

Authorized by Tracey as recorded in Issue #40 comment 6555761970; scope review by
Libra 6555717959, consolidated by Lumin 6555749813. H1–H5 are reflected in contract
binding, fixture-only limitations, manifest ceilings/shared vocabulary and this
separate command. Published implementation changes are confined to this folder. No shared runtime
wiring, dependencies, STPs or peer implementation is changed.
Return through Lumin; outside-pair code review is required before reliance.
