# P6-A: bounded implementation patch plan

2026-11-01 America/Phoenix. Lumin. Prepared under Tracey's instruction to proceed with the review sequence. This is a concrete implementation proposal for outside-pair review and bounded coding authorization; no product source has been edited or activated.

## Pins and inherited contract

- Current main: `08f304034eec0b0bcafeab29abb783c6476e35a3` (merged PR43). Product delta from the contract's `febf1b7` baseline is the identifier-only executor fence rename; true-facts v4 is now published.
- P6 contract: [v0.2](p6-inbound-admission-contract-v0.2-2026-11-01.md), introduced at `fb50bacc2ef0e8ecf66fb082aa4ea78f4cdffd52`; PR39 pre-plan head `45fd6a4470cf2fb17682e94d70782ec7b1a32dc0`. All receipt, allowance, failure and no-replay requirements remain in force.
- P5 inputs: v0.2 `6fe1573` plus clarification `d2c8e7deeae9521b39b558a81f5ae3bdc87a8dad`. Lumin review PR34 comment6556119535 identifies concrete unresolved template/construction/ownership details. Typed P5 outcomes can be injected for coordinator tests; that does not validate actual IDQRA.
- Harness: PR44 `1bf454386a6b0ae587c90fda2160fc2d6fddd1b1`; Lumin independently executed 58/58 tests, Node24.15.0. Libra final repaired-head examination requested in PR44comment6556081398 and watched PR39comment6556081619. Fake witnesses are not integration acceptance.

## 1. Exact source ownership and order

The current broad Verus `server/**` claim is not released by this document. Libra acts for Verus; confirm and record the scoped handoff before code. The actual shared file is **also `server/luminary-reply-router.ts`**, which contains `/ask`, `createGovernedAsk`, parent-derived loop counting and outbound reform. Do not use simultaneous per-field editors.

| Paths | Editor and bounded change |
|---|---|
| new `server/governance-record/p6-result-types.ts`, `p6-results.ts`, `p6-results.test.ts` | Lumin: strict public-result/task-intent/anchor types, validators, durable writer and replay binding |
| new `server/luminary-admission-snapshot.ts`, `.test.ts` | Lumin: strict HTTP envelope/input validation, immutable effective snapshot and digests |
| new `server/luminary-admission-coordinator.ts`, `.test.ts` | Lumin: single admission owner, typed P5 callback, result/closure/replay, effect boundary and status |
| new `server/luminary-submission-router.ts`, `.test.ts` | Lumin: guarded status and result-anchor validation endpoints; no recovery mutation endpoint |
| `server/luminary-reply-router.ts`, `.test.ts` | Serial handoff: P5 edits outbound reform/error/IDQRA compatibility first; publishes exact source pin and releases file. Lumin then edits `/ask` ingress and admitted-turn authority. Rebase and rerun focused checks; no concurrent edits |
| `server/governance-record/review.ts`, `.test.ts` | Serial handoff: P5 additive IDQRA field/error compatibility first. Lumin then adds authoritative admission linkage to new entries; old records and observation fields remain readable |
| `server/luminary-task-router.ts`, `.test.ts` | Lumin: snapshot inputs and move `executor.propose` plus final HTTP body construction inside coordinator callback; retain loopback and accept/decline guards |
| `server/luminary-executor.ts`, `.test.ts` | Lumin after scoped release: proposal operation-ID binding, durable proposal ledger evidence, read-only verified operation lookup; retain fence and explicit Architect merge approval |
| `server/app.ts`, `server/index.ts`, `server/config.ts`, their existing tests | Lumin composition-root handoff: one coordinator/store/result writer; trusted scope/workspace configuration; startup, close and guard mounting. P5 supplies writer injection interface first; Lumin performs shared composition edits. No hosted calls or new credential handling |
| new `src/luminary/pendingSubmission.ts`, `.test.ts` | Lumin: versioned persistent exact request/key journal, recovery and cross-tab compare-and-set policy |
| `src/luminary/client.ts`, `.test.ts`; `src/components/LuminaryHost.tsx` | Serial P5 client error/type compatibility, then Lumin stable submission lifecycle and explicit New exchange/Revise actions. Component remains Lumin single editor during P6 integration |
| `server/governance-record/admission-types.ts`, `ADMISSION.md` | Lumin documentation only: content is the exact canonical snapshot string in this integration, not a change to primitive replay semantics |

`ids.ts`, pipeline/gate/Question screen/fact templates remain P5's. `src/luminary/blocks.ts` composer stays unchanged. Existing primitive `admission.ts`/`log.ts` behavior is reused; any discovered primitive defect returns as a separately reviewed correction, not silently bundled. New tests use temporary directories/fakes, never production stores or private cases.

## 2. Pinned paths, writer and serialization

Let `recordRoot = config.governanceRecordDir ?? DEFAULT_RECORD_DIR`, resolved once by the composition root. Proposed paths (created only during authorized implementation/runtime, not this planning turn):

- admission primitive: `<recordRoot>/p6-admission/`, existing `.admission-writer` ownership;
- public results and task intents: `<recordRoot>/p6-results/`, `AppendOnlyLog<P6ResultEvent>` with `strict:true`;
- independent checkpoint chain: `<anchorRoot>/p6-results/`, where `anchorRoot = config.governanceBackupDir ?? join(homedir(), '.aegis-vibe-architect', 'governance-anchors')`. Reject resolved equality/nesting with the result area. Existing backup contents are preserved;
- cooperative result writer lock: `<recordRoot>/p6-results/.p6-results-writer`, exclusive mkdir, no PID/time takeover, drain before clean removal. This is ownership discipline, not protection from a privileged disk writer.

`P6Results.open({dir,anchorDir,writeHook?})`, `appendIntent(intent)`, `appendPublicResult(result)`, `verifiedResult(attemptId)`, `checkClientAnchor(anchor)`, `health()` and `close()` are new APIs. One object owns result and checkpoint writes; no router can append directly. Startup parses exact event schemas and verifies both chains, checkpoint references and required terminal bindings before routes become available. Unknown event/version/extra fields closes the area. Checkpoint schema: `{version:1,kind:'p6_result_checkpoint',resultHead:{seq,hash}}`; no prompt/body copy.

One coordinator mutation queue serializes each new admitted attempt through terminal persistence (including asynchronous assessment/proposal). Duplicate requests waiting in that queue perform status lookup and never re-enter callbacks. Read-only status may observe acknowledged registered/admitted state without waiting on model work; it never releases an in-flight candidate. All result/checkpoint appends also share one internal append queue. Lock acquisition/startup failure releases only locks newly acquired by this open; never removes another writer's lock.

Ordering: validate/capture -> register -> admit:new -> assess -> optional intent ACK + checkpoint ACK -> optional propose -> public-result ACK + checkpoint ACK -> verify binding -> admission close ACK -> synchronous release decision. There is no await between final health/binding decision and handing the saved bytes to the HTTP response. Any uncertain write freezes release/replacement across both routes. `AdmissionStore` retains its own whole-store freeze; `/review/acknowledge` cannot clear either barrier. Acknowledging legacy review problems is not P6 recovery.

Use existing `canonical()` only after strict JSON validation: dense arrays, own plain-object fields, no undefined/nonfinite values/unpaired UTF-16, exact schemas, bounded UTF-8. Hash UTF-8 bytes without normalization. Result and checkpoint log hashes retain the existing `LogLine` algorithm; stored public body uses a fixed JSON-safe object and is frozen before hashing. Replay serializes the same validated body object, without regenerating evidence or timestamps. Receipt descriptor remains exactly v0.2 section5; checkpoint is durability evidence, not an additional descriptor field.

Browser second anchor is separately journaled as `{area:'p6-results',seq,hash}` and submitted through the guarded submission router, not by extending the legacy review router's `AreaName` parser. It checks an existing anchor only and cannot acknowledge/repair anything. A result-area anchor mismatch latches P6 closed. The external checkpoint and browser witness detect inconsistencies within their preserved coverage; neither claims authenticity against replacing every witness. No new public recovery/takeover endpoint.

## 3. Exact HTTP and snapshot boundary

POST ask accepts exactly `{prompt,submission}`; tasks exactly `{goal,allowedFiles,context?,mode?,level?,submission}`. `submission` is the v0.2 version1 new/replacement envelope. Reject legacy revisionOf/resubmit and unknown keys at every nested level before registration. Trusted deployment scope/workspace never comes from the request. Missing scope/workspace configuration closes the new versioned submission surface; do not retain a legacy bypass route once integration is selected.

The configured realm is one deployment identity, not a user identity. One instance is one workspace. Runtime configuration names to add: `luminaryAdmissionScope` and `luminaryWorkspaceId` (env `LUMINARY_ADMISSION_SCOPE`, `LUMINARY_WORKSPACE_ID`); record/anchor roots use existing configuration above. No secret is placed in the journal or snapshot. Shared demo-key and existing rate limits apply to submission/status/anchor routes. Task-origin lookups require executor enabled plus the same loopback/Host/Origin/proxy checks as task POST, even through shared status.

For tasks, preserve exact goal as `original` and as the composer's message. `.trim()` is only its nonblank predicate. Defaults: absent level -> plain; supplied invalid level ->400. Absent mode ->CODE; supplied mode must be nonblank, trimmed and sliced to32 Unicode code points for the effective snapshot. Preserve context order; require exact `{label,text}`, truncate effective label with `Array.from(label).slice(0,80).join('')`, count aggregate effective label+text UTF-8 against24000 bytes. Validate strings before truncation. Preserve allowed-file order after per-path `checkFencePath`; reject duplicates after normalization rather than calling the existing deduplicating `fenceTask` as the sole validator. Paths stay within current fence, maximum8. These are deliberate v1 validation changes from current permissive defaulting/UTF-16 slice/deduplication.

For ask, the browser captures its existing composed string as `prompt`; server original/effective are exactly that string, with the empty task-specific snapshot fields specified by v0.2. Thus P6 does not pretend to recover the editor's uncomposed text from an already composed ask. The client journal holds the exact transmitted envelope before dispatch.

All v0.2 byte ceilings apply together, including32KiB HTTP JSON transport,24000-byte original,128KiB canonical snapshot/public body and configured inbound gate limit. A request within individual field ceilings can still exceed transport/snapshot ceilings and be refused before admission. API shape and limits receive independent review with this packet.

## 4. Executed composer fixture pins

Executed against the existing composer in the P6 worktree, source-equivalent to main for `blocks.ts`, Node24.15.0 using existing tsx. This verifies composer outputs only; proposed snapshot validator/defaulting is not implemented. Strings below use JSON escaping; LF is `\n`, no normalization.

1. Defaults frame: mode CODE, level plain, no context, allowedFiles `["src/demo.ts"]`, original `"  Keep spaces\n"`.
   - effectivePrompt: `"[Mode: CODE] [Explanation: Plain]\n[Task] Allowed files: src/demo.ts\nArchitect:   Keep spaces\n"`
   - SHA256: `82cc2a7e630f4a9a6865a21c7cf3b967b5af06346f7953a9e6c2ccfbdc0f6c1b`.
2. Ordered Unicode frame: mode DESIGN, level guided, context `[{"label":"First","text":"A\nB"},{"label":"Second 😀","text":"café"}]`, allowedFiles `["src/a.ts","src/b.ts"]`, original `"Explain 😀"`.
   - effectivePrompt: `"[Mode: DESIGN] [Explanation: Guided]\n[Task] Allowed files: src/a.ts, src/b.ts\n[Context: First]\nA\nB\n[Context: Second 😀]\ncafé\nArchitect: Explain 😀"`
   - SHA256: `73e37e599aa264007988779787a26e10275dc9835dfdfbbb3dd330607ebe06c0`.
3. Label boundary frame: mode CODE, level technical, context label = exactly80 copies of U+1F600 (from81 supplied), text note, allowedFiles `["src/demo.ts"]`, original Goal.
   - effectivePrompt constructed exactly as `"[Mode: CODE] [Explanation: Technical]\n[Task] Allowed files: src/demo.ts\n[Context: " + "😀".repeat(80) + "]\nnote\nArchitect: Goal"`.
   - SHA256: `18c208f582778e209ae8e65910a30b814daa4d82f0e6ddeba996249883fb5ff3`.
4. Executed fence normalization: `" src\\demo.ts "`, `"src/./demo.ts"`, `"src/demo.ts"` each map to `"src/demo.ts"`. Future snapshot test passes each alone and rejects a request containing two of them; current fenceTask deduplicates, so rejection is new code.

Snapshot tests must independently pin canonical snapshot strings plus original/effective/snapshot/registration hashes, with CRLF, combining/precomposed Unicode, astral code points, changed context under same key, empty/default fields and route changes. No fabricated hash is supplied for an unimplemented validator.

## 5. Task operation adapter

`LuminaryExecutor.propose` gains a validated operationId supplied only by the coordinator; `lookupOperation(operationId)` returns chain-verified evidence or a typed unavailable/ambiguous state. TaskRecord and new proposal ledger entries bind operationId, attempt/candidate digest and fenced paths; old entries remain historical and cannot be guessed into operation bindings. Add a proposal-started ledger record acknowledged and fsynced before any branch/worktree/check/commit operation. Proposal completion binds the actual task/branch/commit. Proposal ledger appends serialize; a cooperative executor ownership lock is acquired at composition startup and held until drain/close. Never auto-take over a leftover lock. This is new durability/ownership work; existing appendFileSync is not fsync evidence.

The coordinator's durable intent/checkpoint precedes invoking this adapter. An existing intent never invokes propose again, even if no task can be found. Read-only recovery may verify the ledger/commit binding; this slice neither resumes checks nor synthesizes a missing final result. Executor errors after effects might have started remain unresolved unless adapter evidence positively establishes a known terminal outcome. Error type alone is not proof that no effect occurred. Pre-effect known rejection may close with sanitized shortfall. Preserve all branches/files/evidence and keep accept/decline direct approval semantics.

Task HTTP201 body is assembled only within the effect callback, then sanitized into the durable result before closure/release. Current executor returns worktree paths/check output and potentially large diffs: public-result serializer omits internal paths/raw checks, bounds permitted summary/review data, and refuses a body above128KiB rather than truncating evidence into an apparently complete review. An oversized proposal result remains a named shortfall with preserved local task; it never implies merge eligibility. A later larger review transport is separate work.

## 6. Client lifecycle and decisive acceptance

`pendingSubmission.ts` stores version1 records in a workspace-namespaced IndexedDB database, separate from exportable scene JSON and the capped evidence archive: exact route/body/key/lineage, state, last verified result anchor and terminal metadata. Readwrite transactions provide per-key compare-and-set across tabs; no localStorage-only lock. Persist transaction completion before fetch. Storage failure stops dispatch. Abort/network timeout retains key/body. On reload query status before any repost; absent may resend the same key/body, unresolved never invents a fresh key. Local unknown/corrupt journal schema stops the pending item without discarding it. Credentials stay in existing session storage, not this journal. A workspace export/import does not clone a pending submission into a new authority.

New exchange is an explicit action; Revise attaches server-returned attempt/exchange/head. A terminal result controls replacement eligibility; UI counters do not. Pending task recovery cannot change route to evade task guards. Final outcome display uses the original saved result status/body. Existing generation/writer/gauge counters stay distinct; admission ordinal never drives outbound reform.

Implementation slices: (1) schemas/snapshot/result writer/coordinator with injected typed outcomes, disconnected; (2) operation adapter and fault windows; (3) both real mounts, startup/shutdown/status/anchors after serial P5 handoff; (4) client persistence/actions and browser recovery. Publish and independently review each bounded patch; do not activate one route while claiming both protected.

Required focused checks on resulting code: both server TypeScript configurations; coordinator/result/snapshot/operation tests; real mounted ask/task/status/anchor tests; gateway suite; client/pending-journal/app tests; production build and browser retry/reload/two-tab checks once UI changes. Use held-write deterministic gates for uncertainty, never scheduler-sensitive sleep. Count response/gauge/writer/executor calls independently. Verify `/review/acknowledge` does not unblock P6. Test result/checkpoint/close/release crashes, missing anchors, task guards, over-limit public task body, same-key immutable conflict, sibling/fourth replacement, registration/admitted restart and stale writer lock. Only public synthetic fixtures; no provider calls, installs, private attacks or production-store access.

## 7. Ready decision and remaining dependencies

This packet pins the previously missing result paths, serialization/ownership, composer fixtures and exact file handoffs. It does not reopen the reviewed v0.2 contract. Outside-pair review must examine the concrete checkpoint/lock/client-journal/adapter choices and actual shared-file schedule. P5 still owes the specific construction/template pins from the existing review. Libra's repaired-head harness clearance remains independent.

After that return, Tracey's bounded coding authorization is the next action gate. Commit/push/merge, provider activation/spend, private-suite authoring/run and full two-way acceptance remain separately scoped. No code or live runtime result is claimed by this document.

## Review delivery addendum

Libra final harness CLEAR at repaired1bf4543 is PR44comment6556095277. Libra confirmed P5 whole-envelope overclaim/shared-router findings in PR39comment6556174912; exact fact rows/slot bounds and guarantee-scope correction remain before-code pins. The initial long P6 comment was reported truncated, so the identical packet was delivered as four complete numbered PR39 comments:6556179392,6556179576,6556179725,6556179875. No commit/push/merge performed.

## Publication authorization

Tracey subsequently explicitly authorized commit and push of this local packet and continuity updates on the existing PR39 branch. Earlier uncommitted/no-publication statements above describe the preparation and delivery stage. This publication does not activate the proposed implementation or authorize merge.
