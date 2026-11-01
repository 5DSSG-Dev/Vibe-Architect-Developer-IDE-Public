# P6-A — inbound admission integration contract v0.1

2026-10-31 America/Phoenix. Author Lumin. Proposal for independent technical review and Architect implementation approval. Source baseline `febf1b7` (product unchanged from inspected37caf4b). This is a product integration slice, not an additional coordination framework. P5's IDQRA contract and the final frozen gate remain separate dependencies.

## Target and bounded scope

Make the existing durable AdmissionStore authoritative for incoming Architect requests on both `/api/luminary/ask` and `/api/luminary/tasks`. One initial submission plus two replacements per exchange, no same-exchange reset, durable admission before assessment, no post-admission refund, and no model replay on duplicates. Preserve original content, bind effective task context, and expose honest recoverable status.

No outbound-generation admission, general operation-release authorization, private corpus, P7, executable-app builder, legacy migration/continuation, or provider/spend configuration change is included. This slice cannot establish complete two-way governance or gate acceptance. Existing executor approval/loopback constraints remain necessary; admission never grants permission to execute an effect.

## Proposed deployment scope

First integration supports one explicitly configured Architect workspace/caller realm per gateway deployment. Trusted server configuration supplies that realm, workspace identity and direction; request/model text cannot choose or override them. The shared demo key is only access to that shared realm, not individual identity. Every holder is in the same authorized realm: no per-person privacy/isolation claim. Do not reuse this contract as a multi-user service without a separately reviewed authenticated identity/realm binding. The reviewer must assess whether this bounded deployment is appropriate before approval.

Admission uses a dedicated configured protected directory, separate from legacy review logs. One store instance is opened by the gateway composition root and shared across both governed-ask instances. Startup/open/close failures fail closed; shutdown waits for outstanding I/O and closes owned resources. No PID/time lock stealing. No deletion or rewrite of legacy review logs.

## Exact request and input binding

Extend both request types with a versioned `submission` envelope: `key` (stable opaque random client token, bounded length), optional `exchangeId`, `revisesAttemptId`, and `expectedHead`. Preserve the key across HTTP retry, abort, reconnect and reload until a terminal status is known. Store pending-client metadata with the workspace; inability to persist it stops submission rather than generating a replacement key. These identifiers are lineage/idempotency fields, never authorization credentials.

Original content means the decoded JSON prompt/goal string encoded unchanged as UTF-8, not the complete raw HTTP body. Validate nonblank with trim only as a predicate, never replace the original with trimmed text. No Unicode normalization. Bound byte length before persistence; malformed transport/envelope or oversized/blank input is refused without admission.

Create a fixed-version immutable server-built submission snapshot containing original content, route kind, trusted realm/workspace/direction, and the effective prompt/context/allowed-files values actually assessed. Capture context before registration; derive any task prompt from that captured snapshot exactly once. Persist a deterministic serialization of this snapshot in AdmissionStore.content; assessment consumes the captured effective prompt and never rereads mutable request/workspace context. Changing any bound field under a stable key is a conflict. Serialization/version must be pinned and tested before implementation approval; only JSON-safe bounded fields, no timestamps or volatile UI state.

A continuation names the existing exchange/head; it cannot obtain fresh allowance through a different key or route. A truly new authorized exchange gets its own allowance under the realm's issuance contract. No promise to semantically classify arbitrary prompts as new versus continued work. The first slice must expose an explicit new-exchange action and preserve visible continuation context rather than silently reset it.

## Shared ingress sequence

All ingress paths call the same request-aware admission coordinator with the same AdmissionStore instance. Neither /ask nor /tasks wraps a separate unadmitted shortcut. Keep the actual route factories and executor checks in integration tests.

1. Check access/loopback/request validity and construct the frozen snapshot. No gauge/writer/response-model call yet.
2. Register the stable key with exact scope/content/lineage; durably admit it through AdmissionStore.
3. `new` admission is the sole permission for this invocation to start assessment. `existing` returns recorded status/outcome only; it never starts or resumes processing.
4. Derive legacy/display loop from the admission ordinal. Never increment an independent ReviewRecord.loop. Stored historical loop values remain historical, not a way to issue new allowance.
5. Run inbound governance and the existing bounded response path. P5 determines the actual Conscience schema; P6 must not manufacture a partial or placeholder IDQRA response.
6. Persist the public result binding and review evidence, then durably close admission processing with a terminal outcome before releasing the response. An uncertain persistence/closure prevents release and requires status/reconciliation; no successful response inferred from an in-memory result.

## Durable result and receipt ordering

Propose a versioned additive ReviewRecord entry for the public result binding: trusted realm/direction, attempt/exchange/key digest, original/effective digest, admission ordinal, exact public HTTP result/status and outcome. It stores only the sanitized response that the original caller is allowed to receive; rejected output passes remain private review evidence, not replay payloads. Link result identity to a verified chain anchor. The exact new entry schema and replay validation require review before implementation.

For a valid inbound Conscience return, the server generates a receipt bound to that exact durable result, attempt, recipient realm and content digests. The coordinator independently validates the linked persisted result before accepting it as `returned` evidence. Then `closeProcessing(returned, receiptRef)` durably opens the next eligible replacement, subject to remaining allowance. ReceiptRef cannot be supplied as authority by the client or writer. The receipt proves a durable server-side returned-result decision, not human reading or client display. If a client acknowledgment policy is desired later, that is a separate reviewed contract.

A successful completed request closes as `completed`; an admitted processing/gauge/writer shortfall closes as `shortfall`. Neither refunds allowance or automatically opens replacement permission. Ordinary bounded service retries within that invocation do not create admissions. Resuming an admitted failed/incomplete attempt requires a separate explicit continuation design, not lookup or automatic replay.

If review result append succeeds but closing admission fails, do not release it. The stores are not one atomic transaction. Status lookup must require a verified matching terminal admission outcome plus matching result evidence. Pending/ambiguous mismatches stay unresolved; no speculative result replay. Reconciliation may confirm persistence but never itself execute the model again.

## Status and client behavior

A scope-bound status read identifies a submission key and returns attempt/exchange/ordinal plus registered/admitted/terminal/not-admitted/unresolved state and verified public terminal result where eligible. Use existing access guards; do not expose original stored prompts, other realms, internal paths, raw rejection passes or arbitrary log reads. Apply no-store and bounded request rates.

An active duplicate can report processing/pending (for example202 with status pointer); conflicting bindings report conflict; exhausted or stale lineage gives an explicit refusal. Exact HTTP/code schema belongs to the reviewed implementation contract, with no generic success on uncertainty. An uncertain write must tell the client to retain its key and seek explicit reconciliation. Do not auto-poll into assessment, generate a new key, reset exchange, or hide the failure behind a new request.

`reconcileSubmission` remains an explicit same-key recovery operation controlled by the authorized local Architect/operator path. No public automatic recovery or stale-lock deletion endpoint is introduced. A confirmed not-admitted registration remains terminal under the current primitive; no replacement-key escape is created. UI must explain the actual state without claiming the message was read or delivered merely because a server counter incremented.

## Prospective source ownership and slice order

After scoped handoff from Verus's broad server claim: composition/lifecycle in server/index.ts and app.ts; shared coordinator and focused tests; review result schema/linkage in server/governance-record; /ask and /tasks adapters; stable client metadata and UI status plumbing. Exact new file paths and acceptance schema are to be pinned in the reviewed patch plan before code edits. Do not claim server/** ownership or edit P5 writer internals.

Implement reviewable slices: (1) result/receipt schema and coordinator with deterministic injected gates; (2) both real route adapters and store lifecycle; (3) stable-client-key/reload/status behavior. No partial live activation claiming both routes protected until both actual paths pass. Outbound admission follows separately; complete governance acceptance waits for both directions and the independent frozen gate.

## Required acceptance evidence

- Concurrent same-key calls: one durable admission and one assessment owner; all duplicates reuse identity without extra gauge/writer/response/executor calls.
- Conflicting snapshot under one key fails; exact whitespace/context survives register/reload/assessment; no mutable task-context escape.
- Concurrent sibling replacements yield one winner; stale parents and fourth admission fail. Same-exchange reopen/resubmit/route change cannot reset, while genuinely new authorized work remains possible.
- Real /ask and /tasks mounted paths share authority; no separate governed-ask bypass. Access/loopback and effect approval remain enforced.
- A held admission append blocks all assessment; post-admission service errors retain consumption. Current retry scope and per-role budgets are checked separately from sender allowance.
- Inject result-write/close-write faults and ambiguous acknowledgments. No release without verified durable closure/result; same-key status returns verified terminal evidence without replay; mismatches stay unresolved.
- Receipt forgery, wrong scope/direction/attempt/content, stale result and a mere delivery counter cannot open replacement. Actual client receipt is not inferred.
- Registration-only/admitted/terminal restarts conserve identity/allowance. Held I/O and queued timeouts preserve writer ownership; no automatic lock takeover or hidden continuation.
- ReviewRecord write failure/anchor mismatch, access acknowledgment state changes, and provider-spend faults are tested where their boundaries are touched. Passing admission tests does not establish ledger/process-wide spend safety.
- Existing tests and appropriate app/gateway/typecheck/build checks pass on the resulting pinned code. Client reload/status and actual assets require relevant runtime checks; report mocked versus live evidence explicitly.

## Decision packet and return point

Verus supplies non-author outside-pair review of this Lumin-authored contract, including any needed Libra examination through Verus. Review scope/receipt semantics, fixed deployment realm, deterministic snapshot schema, durable two-store ordering and route parity. Return one consolidated verdict on the exact revision; do not interpret unanswered design questions as implementation discretion. Tracey approves the resulting bounded implementation scope after review. No code, provider calls, store migration, live activation or new task acceptance is claimed by publishing this proposal.
