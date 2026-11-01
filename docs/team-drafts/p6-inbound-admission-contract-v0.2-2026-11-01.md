# P6-A — inbound admission integration contract v0.2

2026-11-01 America/Phoenix. Author Lumin. **Proposal for independent review, then Tracey's approval of a bounded implementation. Not an activation or completed implementation.** Source baseline main `febf1b7e654879cf403da0da044ae719c21f5f70`; predecessor v0.1 at `32cea72612214659c77636825f77e9200aac9870`, preserved unchanged. This revision replaces v0.1 as the proposed integration contract, not as historical evidence.

Review inputs: Libra PR39 comment6554156513 (G1–G7); Lumin comment6554082622 (task effects after governedAsk); completed testing-brief review comment6554256208 is separate. Single P6 editor Lumin; Verus supplies outside-pair examination or routes it to eligible Libra. No server claim is transferred by drafting this file.

## 1. Outcome, scope and authority

Both POST `/api/luminary/ask` and POST `/api/luminary/tasks` use one request-aware coordinator and one durable AdmissionStore. Initial message plus two replacements (ordinals0,1,2), no same-exchange reset, admission before assessment, no refunds or processing replay on duplicates. Inbound only; outbound admission, P7, legacy continuation, general app execution and provider/spend changes are excluded. This slice cannot establish complete two-way governance acceptance.

One explicitly configured realm/workspace per deployment. Server configuration supplies `scope`, workspace and direction=`architect-to-luminary`; neither request prose nor model output supplies those authorities. A shared demo key grants access to that shared realm, not authenticated individual identity. No cross-person privacy/isolation claim. Retain actual access guards, task loopback guards and executor enablement/approval requirements. Admission never grants effect permission.

The Conscience assesses conversational messages, not the merge accept action. Existing `/tasks/:id/accept` remains a direct Architect-approved executor path with its current checks; P6 does not send that merge request through the Conscience or add an admission charge to it. Coherent original input does not itself approve a merge.

## 2. Ingress, client key and lineage schema (G4/G7)

Keep the current HTTP JSON transport ceiling32KiB. Reject invalid/unknown envelope fields before registration. Version1 envelope:

- Initial: `{version:1, key, kind:"new"}`. No lineage triple.
- Replacement: `{version:1, key, kind:"replacement", exchangeId, revisesAttemptId, expectedHead}`. All three lineage fields required together; `expectedHead === revisesAttemptId === currentHead`. Keep both fields: lineage identifies the revised parent; expectedHead is the optimistic-concurrency assertion. No primitive-field collapse in this slice.

Key is a client-generated UUIDv4 token, persisted before sending and reused after retry/abort/reconnect/reload until status is resolved. These IDs are not credentials. Workspace persistence failure stops submission without dispatch; no automatic replacement key. Use a fresh key only for a deliberate new submission or eligible replacement, not as recovery.

An explicit Architect **New exchange** action creates `kind:new`; a visible **Revise this message** action carries its existing lineage. Retries, route changes, reopening and legacy `resubmit` must not silently select new. Reject legacy revisionOf/resubmit under this version instead of translating them into fresh allowance. The single authorized realm may intentionally start genuinely new work. This contract does not semantically detect a caller falsely calling continued work new, and must not claim that protection. A stronger new-work issuance/authorization mechanism requires separate review before claiming that stronger boundary.

## 3. Immutable snapshot and digests (G3)

`AdmissionStore.content` holds a versioned canonical snapshot string, not only the original message. Its `original` field preserves the exact decoded JSON prompt/goal string. Update integration-facing type documentation to explain this use; do not rewrite historical primitive records.

Fixed schema, unknown fields rejected:

`{version:1, route:"ask"|"tasks", realm:string, workspace:string, direction:"architect-to-luminary", original:string, context:[{label:string,text:string}], mode:string|null, level:"plain"|"guided"|"technical"|null, allowedFiles:string[], effectivePrompt:string}`

The level enum matches src/luminary/blocks.ts EXPLANATION_LEVELS at the baseline. Mode/level defaults must be bound explicitly, not reread later.

For ask: context=[], mode/level=null, allowedFiles=[], effectivePrompt=original. For tasks: validate/capture actual composer inputs once, including canonical fenced file paths and allowed explanation level; derive effectivePrompt once via the existing composer from that snapshot. Preserve submitted order of context and allowed files; reject duplicate normalized file paths. The current label truncation, default mode/level and fence normalization are explicit effective transformations, never modifications to original goal. P6 implementation must publish exact composer fixture outputs before review of the resulting code.

Reject unpaired UTF-16 surrogates, non-JSON values, unknown fields and nonblank failures before registration. Trim is a validation predicate for original, not a replacement; no Unicode normalization. Original at most24000 UTF-8 bytes; context at most16 entries, labels at most80 Unicode code points after explicit effective truncation, aggregate label+text at most24000 bytes; at most8 allowed files. Scope/workspace each bounded to256 UTF-8 bytes. Canonical snapshot at most128KiB and effective prompt subject to the configured inbound gate limit; refuse oversize before admission. These are proposed integration limits for review, not claims about current parser behavior.

Canonical serialization uses the existing `log.ts canonical()` algorithm over this strict schema: recursively sorted object keys, array order retained, JSON string escaping, no optional undefined fields, integers only where numeric fields occur. Persist the exact canonical string. SHA-256 over UTF-8 original is `originalDigest`; over effectivePrompt is `effectiveDigest`; over canonical snapshot is `snapshotDigest`. Registration.digest remains the primitive's digest over the complete Submission including key/lineage/content, not any of these three alone. Assess only captured effectivePrompt. Never rebuild a retry snapshot from mutable workspace state: client retains the original submitted input envelope; the server compares its full bound digest and refuses changed context under the same key.

## 4. Single processing owner and terminal classification (G5)

After access/envelope/snapshot validation, call registerSubmission then admitSubmission. Only `admission:new` may enter assessment. `existing` branches immediately to verified status/result lookup before any gauge, writer, response-model or executor call. Use actual route factories in tests, not a shared fake standing in for both mounts. No independent increment of ReviewRecord.loop: inbound loop is derived from ordinal; historical loops stay historical. Output reform counters remain separate from sender allowance.

P5 adapter returns a typed result discriminant, not a conclusion inferred from prose:

| Result | Admission closure | Replacement eligibility |
|---|---|---|
| Validated inbound Conscience return | returned + verified receiptRef | only if primitive allows remaining replacement |
| Coherent request and completed response/task outcome | completed | no |
| Service/gauge/writer, output-pipeline or task-proposal shortfall | shortfall | no |
| Persistence/effect completion uncertain | no speculative closure/release | no; unresolved |

P5 owns the actual IDQRA envelope/schema and validation, including true-facts evidence. No fabricated partial IDQRA fallback. If P5 is not frozen, coordinator tests use explicitly injected typed outcomes; that proves coordination only. No public activation claims full P5 behavior from those tests.

## 5. Durable result schema and verified receipt (G1)

Add new typed records in a dedicated result area under the existing ReviewRecord root; preserve architect/luminary historical areas and strict parsing. One composition-root-owned writer serializes result records. This is new integration work, not an already existing record kind/API. Use the existing strict append-chain machinery, startup verification and evidence-anchor policy; pin storage paths and allowed schema in the patch plan.

`PublicResultV1 = {version:1, kind:"p6_public_result", resultId, scope, workspace, direction, route, submissionKeyDigest, attemptId, exchangeId, ordinal, registrationDigest, snapshotDigest, originalDigest, effectiveDigest, outcome:"returned"|"completed"|"shortfall", httpStatus, body, bodyDigest, taskOperationId:string|null}`.

IDs are opaque UUIDs except digests; ordinal integer0–2. Public body contains only the reviewed sanitized HTTP body for that caller/route, no raw rejected output passes or internal paths. Canonical body at most128KiB; bodyDigest hashes its canonical UTF-8 serialization. Schema must reject extra fields, invalid values and mismatched outcome/status/body combinations. P5's returned-body validator remains a prerequisite for `outcome:returned`.

For an inbound return, the coordinator mints a server-owned receipt descriptor **after** durable result append acknowledgment:

`ReturnedReceiptV1 = {version:1, issuer:"p6-inbound-coordinator", subject:"validated-inbound-return", scope, workspace, direction, recipientRealm, attemptId, exchangeId, ordinal, registrationDigest, snapshotDigest, originalDigest, effectiveDigest, resultId, bodyDigest, resultAnchor:{area:"p6-results",seq,hash}}`.

`receiptRef = "p6-return-v1:" + SHA256(canonical(descriptor))`. It is a content-bound reference, not a client credential or a signature proving authenticity against a privileged disk writer. Reconstruct the descriptor from the acknowledged, verified result and trusted registration; never accept a supplied descriptor or arbitrary receipt string from request/model text.

Before `closeProcessing(attemptId,{kind:"returned",receipt:receiptRef})`, the coordinator verifies: result-area chain/required anchors healthy; exact append exists at seq/hash; full descriptor recomputes to reference; all scope/workspace/direction/recipient, key/registration/attempt/exchange/ordinal/content digests match the authoritative admission snapshot; body digest and typed P5 returned outcome validate; result belongs to this attempt, not another or a superseded registration. Only this path may call returned closure. A delivery counter is not a receipt.

Then durably close admission; only afterward release the result. On replacement registration, validate the parent receipt and matching persisted public result again **before** calling the primitive, because primitive canReplace checks only outcome.kind. Startup must likewise validate every returned closure against its result binding before exposing replacement eligibility. Missing/wrong/stale/forged evidence keeps the coordinator closed even if the primitive alone says canReplace. Receipt lifecycle is immutable per attempt: same valid reference may be re-read, not rebound; head/remaining allowance determine whether replacement is still eligible. No client acknowledgment requirement is introduced, and no human reading/display claim follows.

Completed/shortfall results also require acknowledged public-result append, matching terminal admission closure and verified result binding before release/replay. The stores are not atomic: result append without closure, closure without validated result, or mismatched evidence is unresolved. Never release from an in-memory candidate or a cached primitive success while frozen.

## 6. Task proposal effects belong inside the coordinator boundary

The current task router calls executor.propose AFTER governedAsk and constructs HTTP201 afterward. Replace that split with a coordinator callback encompassing the task proposal and final public result. A duplicate must leave before that callback, not merely skip model generation and continue to propose.

Before any executor proposal, append/acknowledge a typed `p6_task_effect_intent` in the same dedicated result area, binding scope/attempt/registration/snapshot, `operationId = SHA256(canonical([scope,attemptId,"task-propose",1]))`, candidate digest and fenced file list. The executor adapter records this operationId with its existing task/commit ledger and exposes verified lookup by operationId; this is new required adapter work. No second propose for a previously acknowledged intent, including after restart. This gives at-most-one invocation, not guaranteed completion or a distributed exactly-once transaction.

After propose, capture the actual task ID/commit, sanitized summary and checks, then persist the final201 public result, then completed closure, then release. Known executor failure records a sanitized public shortfall and shortfall closure. Crash/error after intent but before confirmed completion stays unresolved: recovery may verify existing task/ledger/commit evidence, never invoke propose/model/checks again automatically or assume absence proves no effect. The first slice does not auto-resume or synthesize a missing public result after restart. Existing results with valid closure can replay; a partially finished attempt requires an explicitly reviewed operator-resolution design before progress. Preserve branches/files/evidence.

Merge accept/decline routes remain outside this proposal-assessment callback and retain Architect approval and existing executor controls. This contract does not claim their crash recovery is solved by P6.

## 7. Shared-store freeze and recovery (G2/G6)

Any uncertain registration, admission or closure append freezes the **whole shared AdmissionStore**. Both route admissions AND ordinary lookupSubmission/getExchange fail until recovery; unrelated chat cannot proceed after an uncertain task close. No cached success/status bypass. Coordinator reports store-unresolved without asserting per-key admission state. A result-area/anchor failure also closes release/replacement decisions; it must not be hidden by successful admission.

Only the authorized local operator recovery path may invoke same-key reconcileSubmission. Use the key associated with the unresolved operation; unrelated-key reconcile cannot clear it. Bound call deadline (default5s, maximum60s) and retain serialization/writer ownership while underlying I/O remains in flight. Two failed reconciliations exhaust the instance's in-process budget. Restart may reset that budget, but it does not prove an uncertain effect/result is resolved.

Shutdown waits for queued I/O and closes owned resources. A crash leaves the writer lock: before manual removal of the empty lock directory, operator establishes former writer stopped. Never delete logs/index, use PID/time-based lock takeover, or automate lock removal through public status APIs. Reopen verifies/flushed authoritative storage, validates returned-result bindings and retains admitted incomplete attempts without replay. A reconciled not-admitted registration remains terminal and reserves its exchange under the current primitive; no replacement-key escape. A verified absent registration permits retry with the SAME original key/input, not automatic new work.

## 8. Public status and HTTP behavior

Proposed status path GET `/api/luminary/submissions/:key` uses realm access guard, no-store and existing rate limits. Task-origin status/result additionally requires the task loopback/enablement guard even when requested through this shared endpoint; sharing a realm does not widen task-result access. Key/path must not be included in ordinary logs; no arbitrary review-log browsing. Public response never exposes original stored prompts, internal paths or rejected passes.

Status v1 body uses `{version:1,state,key,attemptId,exchangeId,ordinal,result}` with unavailable identity/ordinal/result set to null. State is registered/admitted/terminal/not-admitted/unresolved/absent. Only terminal includes `{status,body}` after full matching result/closure validation; serialize result unchanged, not regeneration. Store-wide freeze exposes unresolved with null identity fields rather than cached claims.

Mapping: malformed400; transport/pinned size excess413; existing access401/403/config503 and limiter429 retained; conflict/stale/exhausted/processing-required409 with stable code; active registered/admitted duplicate202 and status pointer; verified missing status404; reconciled not-admitted409; unresolved/closed503. Verified terminal duplicate/status returns HTTP200 status envelope containing the ORIGINAL saved result status/body, not a new model/task success. Fresh successful ask200/task201; valid inbound return422; admitted named shortfall uses existing reviewed shortfall mapping. A failed/unresolved persistence prevents release of candidate reply, IDQRA return or task payload; return only sanitized503 status guidance and retain client key.

## 9. Acceptance and implementation return point

Required tests on exact resulting revision:

- Both mounted routes: access/loopback intact, one shared authority, no legacy fresh-count shortcut; same-key concurrent/reload duplicates make no extra role or executor calls.
- Snapshot/digest fixtures: exact whitespace/Unicode, field order, labels/defaults/allowed files and mutable-context conflicts; malformed/oversize input has zero admissions/calls.
- Replacement triple completeness/equality, sibling race, stale/fourth attempts, route changes and explicit new work; no claim of semantic new-versus-continuation detection.
- Receipt every-field mismatch, untrusted request/writer receipt, stale parent, wrong result anchor/body, missing/corrupt chain and mere counter; no eligible replacement without revalidation.
- Held/failed register/admit/close affects BOTH routes and ordinary lookup; same-key recovery, exhausted budget, held I/O and crash lock preserve ownership and allowance.
- Faults between result append/closure/release; no speculative replay; registration-only/admitted/terminal restarts. ReviewRecord acknowledgment does not clear unrelated admission uncertainty.
- Task intent/propose/result/closure crash windows: at most one proposal invocation; ambiguous/missing evidence remains unresolved without model/proposal replay; task status guard parity and preserved files/ledger.
- Distinct response/writer/gauge/retry accounting and spend-ledger failures at touched seams. Existing suite/typecheck/build checks appropriate to final patch; report fake, integrated and live evidence separately. No private adversarial payloads in public tests/review artifacts.

Before any code, independent review must resolve the proposed schema/limits (including explanation enum/composer fixture), result-area API/path and executor operationId adapter, then Tracey approves the bounded slice. Verus explicitly hands off exact server paths before Lumin edits them. Suggested future files: server/governance-record/p6-result-types.ts, p6-results.ts; server/luminary-admission-coordinator.ts and tests; edits to app/index, actual routers, executor adapter and client pending-submission metadata. Final exact patch plan and ownership go with approval, not inferred from this list.

Build order: schema/coordinator with deterministic gates; task-effect adapter/result ordering; real route/lifecycle integration; persistent client/status behavior. No partial live activation asserting both routes protected. P5 actual envelope and gate evidence remain separate prerequisites for full activation/acceptance. No product source, tests, providers, stores or private suite material changed by this document.
