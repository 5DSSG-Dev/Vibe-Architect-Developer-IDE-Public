# Luminary bidirectional governance — local activation

Tracey authorized activation, required governance in both conversational directions, and authorized correction of the identified legacy-path conflict. This note describes local implementation and its verification boundaries. It does not authorize publication or deployment to another host.

## Production conversation boundary

`server/app.ts` now supplies one mandatory `createBidirectionalAsk` boundary to both `/api/luminary/ask` and coding-task proposal generation. A request must pass PIM, the applicable contextual Identify read, IRG and PTAG before the writer runs. The writer's result must pass structural validation and the outgoing gates before a reply or proposed change is released. Inbound text is not silently rewritten. A hold terminates the attempt with a named shortfall and no original-message dispatch. The existing explicit task accept/decline actions retain their separate executor authorization checks.

The legacy reply pipeline remains available as a diagnostic implementation. Gateway conversation routes do not fall back to it. The experimental `/api/luminary/numeric` receipt/delivery endpoint returns 503 before session lookup, request identity, models, claims or receivers; its aggregate-budget integration is unfinished. Its isolated tests and source remain available.

## Private sources and release checks

Two local environment settings select the private runtime: `LUMINARY_GOVERNANCE_MANIFEST` and `LUMINARY_GOVERNANCE_MANIFEST_SHA256`. The pinned manifest references a separately hashed active registry, activation record and source-approval record. The loader requires real filesystem locations outside the public checkout. Private rule bodies, fixtures, prompts and operational category projections must stay outside this repository and public review packets.

The original candidate registry and previous private artifacts are preserved. A separate active limited seed is bound to Tracey's activation authorization. The local runtime checks the pinned source files when starting a session, before and after awaited operations, before writer dispatch and before release. A removed, changed or unavailable source withholds subsequent dispatch/release. Restart is required to adopt a different approved manifest; changing its bytes under the existing pin cannot silently activate a replacement.

The scanner supplies observed locations and opaque references to contextual Identify, with bounded semantic projections rather than matcher bodies. Identify validates candidate, direction, attempt, context, complete candidate coverage, every material finding, applicable facts and eligible evidence. Registered opaque content without an approved decoder remains protected and withheld.

IRG uses the approved truth-aware threshold profile. All seven Virtues must meet their thresholds, and a semantic `unsure` cannot be converted to pass by high scores. All governance inference outputs use a strict JSON schema and are independently checked in code. Ordinary writer output retains its existing structural contract.

Production PTAG uses a dedicated structured validator rather than the older recorded-output diagnostic envelope. The result binds exact candidate bytes/digest, direction, request/attempt identity, context, contract, projection and evidence. Typed units must cover the whole candidate without gaps. Operative units require applicable active facts and eligible scoped evidence. Permission/completion claims cannot use a static role fact as proof that an event occurred. Positive no-obligation release requires explicit informational or non-operative unit classification. These checks constrain model proposals; they do not establish universal semantic accuracy.

## Budgets, privacy and records

One request session bounds all gate inference and writer calls together. Calls use the existing capped provider transports and their existing spend ledgers. Deadline expiry aborts the local transport and withholds release. A remote provider may already have received or billed a request before local cancellation.

Every production gate read and final route decision is recorded in a private append-only local log, along with writer-dispatch evidence. The log retains private decision inputs and outputs for inspection. Hash-chain verification and deterministic PTAG envelope validation can replay captured decisions using their recorded context and evidence time, without inference or effects. Such replay does not establish fresh eligibility for a new dispatch. Exclusive append locking, bounded capacity, fsync and a verifiable hash chain are used. An uncertain or failed append blocks dispatch/release. Caller-facing shortfalls omit private findings, model rationale and withheld candidate text.

The log is bounded local evidence. It is not distributed persistence and has no external head anchor proving that a file was never deleted or rolled back to a valid prefix. Full capacity, a partial record or a stale writer lock produces a named operational shortfall; it does not cause automatic deletion or a fallback pass.

## Scope limits

- The active registry is the specifically authorized limited seed. Broader rule coverage, cross-turn detectors and decoder calibration are not established by activating it.
- This seed has no door-open categories. The runtime rejects configurations that would require an unsupported door-open route instead of pretending that IRG passed.
- Static role/constraint facts are eligible. No dynamic capability, authorization, persistence or completion evidence is fabricated from the sender's text.
- Holds currently return a named terminal shortfall. This change does not claim completion of the separate full five-field Conscience response/reform workflow or P6 durable receipt integration.
- Local activation does not mean that this mixed, uncommitted workspace has been independently cleared for merging or public deployment.

## Verification

Gateway regressions exercise every inbound/outbound stopped gate, missing-source refusal, exact-candidate binding, zero writer effects on inbound holds, zero proposal effects on either-direction holds, source revocation during an interaction, deadline/call exhaustion, transport cancellation, audit failure and private-output protection. Focused private checks verify the exact active scanner seed in both directions without publishing its rules.

The application suite and production build are run separately from gateway tests. Live checks distinguish real writer conversations, protected inbound content with zero model calls, documentary Identify, and a clearly labelled synthetic bad-output fixture passed through the real gates. Pure replay checks recorded decisions without inference or effects. Exact results are appended to the Root/Folder Totems and Codex lane after completion; private live observations remain outside this public repository.

### Verified local checkpoint — 2026-11-03

- Gateway: 298 passed, 0 failed; 5 opt-in Redis tests skipped. App: 375 passed, 0 failed. Production build passed; existing non-failing bundle-size warning remains.
- Exact private scanner seed: 18 directional trigger checks and 6 ordinary controls passed.
- Four author live observations reached the expected outcomes across recorded follow-ups: informational delivery, zero-call protected inbound hold, documentary Identify delivery, and a mixed same-line unsupported completion claim withheld after a synthetic writer fixture. These are bounded observations, not an independent adversarial calibration suite.
- Private log: 50 records chain-verified. Six matching source-map-revision PTAG envelopes validated deterministically against captured context/time. Four older envelopes received chain verification only. Earlier failed wire proposals remain preserved.
- Local structural peer review is clear for this bounded scope. The reviewer inspected source/tests/evidence, invoked no providers and did not independently repeat the live HTTP interactions.
