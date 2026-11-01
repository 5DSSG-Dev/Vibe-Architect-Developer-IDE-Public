# Libra — independent outside-pair review of Aster governance-preparation v0.1

Reviewer: **Libra** (Claude Cloud Peer), 2026-11-01. Outside-pair independent review assigned by
Lumin's brief (`LIBRA-REVIEW-BRIEF-ASTER-PREPARATION-v0.1-2026-10-31.md`). I am outside the
Lumin–Aster pair and did **not** coauthor Aster's artifact, so this can serve as the required
final cross-pair technical review (Lumin's brief preferred Libra, since Verus is the other suite
author). **Technical clearance only — not Tracey's implementation approval**, and this review is
itself subject to outside-pair examination.

## Inputs and verification

| Input | Revision / hash | Verification |
|---|---|---|
| **Primary artifact** `ASTER-governance-preparation-v0.1.md` | SHA256 `05387433A2163EC9D38B6A4C14581F8B1C76F2140CAB48C1731EAA21A04A7630` | **Hash recomputed on the supplied file and MATCHES exactly.** This is the pinned artifact. |
| Source baseline (Aster's pin) | `37caf4bdb93516a60a0e37cd6651a51d01d759e7` | `server/` and `src/luminary/` on current main `78bd423` are **byte-identical to `37caf4b`** (`git diff --quiet` clean), so source inspection reflects Aster's baseline. |
| Merged squad rules | `78bd423…`, `docs/COLLABORATION_SQUAD_CONFIGURATION_AND_WORKING_PARAMETERS.md` | Read. |
| Plan packet | `7605f3e…` rev18 + STP-0005 rev18 draft | Reviewed previously (PR #35, merged). |
| Lumin first-pass review | `ASTER-v0.1-FIRST-PASS-REVIEW-LUMIN-2026-10-31.md` | Read as **context, not an answer key** (per brief). |

## What I inspected vs. what I executed

- **Source inspected** (at the baseline bytes): `server/luminary-pipeline/{pipeline.ts, ids.ts,
  architect-gate.ts, call-log.ts}`, `server/{luminary-reply-router.ts, luminary-task-router.ts,
  app.ts, luminary-meta.ts}`, `server/governance-record/{admission-types.ts, ADMISSION.md,
  review.ts}`, and `.aegis/claims.md`.
- **Executed:** no new tests for this payload-free artifact. For context, earlier this session at
  **identical `server/` bytes** I ran `npm ci` + `npm run test:gateway` → **226/226 pass** (my own
  run). I did not run any harness (none exists), created **zero** private cases, requested none of
  Verus's cases, and made no provider/live/spend action.
- **Not done / limitations:** I did not line-by-line audit the admission/pipeline **test bodies**
  (read for structure, as Aster also did at declaration level). Lumin's storage results and Verus's
  hosted-writer metrics remain **attributed reports**, not reproduced here. The matrix is
  payload-free by design; I reviewed the design, not concrete cases.

## Overall assessment (finding, not approval)

Aster's v0.1 is a **sound, proportionate, and honest** preparation artifact. It correctly keeps 32
coverage *families* separate from concrete payloads; distinguishes current IDS from planned IDQRA,
fake vs. integrated vs. live evidence, server release from client receipt, and trusted adapters
from production entry paths; and it declines to fabricate private storage, peer coordination, or
gate results. Its evidence-limits table and execution-blocker list are accurate against the code.
**I recommend it proceed to a bounded implementation-design review after the contract freezes
below** — chiefly the writer-ceiling retry scope and the counting authority. I found no
over-reach that would block the payload-free design, and the requirements are implementable.

Every code-dependent claim I checked holds against source (details below), including the subtle and
**correct** point that the pipeline invokes `runIds` on the terminal pass *before* its reform-bound
check, so the rejected-outbound path's writer-pass count is `maxIdsPasses + 1`, not two.

## Agreement with Lumin's first-pass (verified against code)

I independently reach Lumin's seven refinements and confirm the ones that rest on code:

- **#1 retry scope** — confirmed. `ids.ts` shares one `retryUsed` across the initial writer call
  and the rewrites *within one Conscience response* (`SUGGEST_REWRITE_LIMIT = 2`), so one response
  invokes the writer up to `1 + 2 + 1 = 4` times. Aster's proposed "one shared service retry **per
  admitted attempt**" is **stricter than current code** (which is per response) and must be named
  as proposed, not inherited. See my Finding F1 for the concrete numeric consequence.
- **#2 identity oracle, #3 receipt semantics, #4 original/effective binding, #5 acceptance map,
  #6 bounded first slice, #7 explicit review/gate states** — all consistent with `ADMISSION.md`,
  `review.ts`, and the route wiring; I concur. I add specifics in F2–F5.

## Independent findings (prioritized)

### F1 — Writer-ceiling: freeze retry scope, then the formula; adopt C/W/S naming *(High)*

Grounding the numbers against `pipeline.ts` + `ids.ts` + `architect-gate.ts`:

- **Inbound (Architect→Luminary) rejection:** `gateArchitectMessage` runs `runIds` once on a
  PIM/IRG-incoherent message (never on a structural failure — it returns before `runIds`). Max
  writer calls ≈ **4** (1 + 2 rewrites + 1 retry). An incoherent inbound message makes **zero**
  Luminary-response calls (the response path isn't entered) — so inbound-only and
  accepted-inbound+outbound are correctly separate paths, as Aster says.
- **Outbound (Luminary→Architect) rejection:** the loop runs `runIds` on passes 1, 2, **and 3**
  (`pass > maxIdsPasses` is checked *after* `runIds`), i.e. `maxIdsPasses + 1 = 3` Conscience
  responses. Under **current per-response** retry scope that is `3 × 4 = 12` writer calls; under
  Aster's **proposed per-attempt** retry scope it is `3 × 3 + 1 = 10`.
- Aster's formula `W ≤ (P_in + P_out)·(1 + R) + S` encodes the **proposed** per-attempt `S` (added
  once) and therefore **under-counts current code by 2** on the outbound path (10 vs 12). This is
  not an error — it is exactly the scope choice Aster and Lumin both flag — but the plan should
  state the number both ways and freeze one. **Recommend:** adopt Lumin's explicit variables
  (C = Conscience responses, W = rewrites/response, S = retry scope) because v0.1's call-bounds
  text still says "writer invocations (logical passes)," which conflates the response level with
  the invocation level (a rewrite *is* an invocation). AST-22's "attain the agreed maximum and
  reject one extra call" is the right assertion once the number is frozen.

### F2 — Missing coverage family: the ReviewRecord is a third fail-closed store *(High)*

The 32 families treat storage faults as **AdmissionStore** faults (AST-23–27, -29) plus "legacy
review records" compatibility. But `review.ts` is a **separate, live** durable store with its own
governance boundary that the gate already enforces today:

- an append failure → `record_error`, **nothing crosses** (`luminary-reply-router.ts`
  `recordFailure`);
- a start-up problem or second-anchor mismatch → `record.closed` → `governance_closed`, **nothing
  crosses** until the Architect acknowledges (`review.ts` `checkAnchors`/`closed`).

**Recommend** a dedicated family: *ReviewRecord write-failure / anchor-mismatch →
governance-closed, zero release, both directions*, with evidence `T,A,D,R`. This is a real
governance invariant in current code not represented in the matrix.

### F3 — Add a spend-ledger fault family (fourth durable store) *(Medium)*

`luminary-meta.ts` is a per-file JSON ledger that reserves worst-case cost **before** dispatch and
binds **both** a dollar cap and a call cap (verified). AST-22/32 cover caps and atomicity
abstractly, but the ledger is a distinct store with **no cross-process writer-ownership lock**
(unlike `AdmissionStore`). **Recommend** a fault family for *spend-ledger crash mid-reserve /
concurrent-case reserve / corrupt ledger → fail closed (refuse dispatch), reserved vs actual
preserved*. Aster's "reserve a call permit atomically… including concurrent cases" needs a named
mechanism here, since the ledger alone does not serialize across processes.

### F4 — Dispatch instrumentation the harness must add (confirm + guard) *(Medium)*

Current `call-log.ts` tags are only `luminary_response | ids_model | gauge | architect_delivery`.
**Initial generation and reform are both `luminary_response`** (not distinguished), and `ids_model`
lumps initial + rewrites; no pass index, role, lifecycle state, or provider request ID is emitted.
So Aster's richer event schema (`response.generate`/`response.reform`/`conscience.write`/
`gauge.read` + states) is **net-new instrumentation**, correctly scoped to the harness. Aster's
guard — "verify no dispatch can bypass tagged adapters, else stop with an instrumentation
shortfall" — is **essential and correct**: `createCallLog.record` throws only on an unknown path
*string*, never on a provider call that skips the tag entirely, so a ledger alone cannot prove
absence of an untagged bypass. Keep that as a hard stop.

### F5 — Route-adapter completeness: two governed-ask instances + a state-mutating route *(Medium)*

`app.ts` builds **two separate `createGovernedAsk` instances** — one for `/api/luminary/tasks`
(line 278) and one inside the `/ask` router (line 281). Aster's "a route adapter covers both /ask
and /tasks… enumerate the final server mounts rather than assuming prefixes" is right; I add that
the adapter must exercise **both instances** (a shared stub would miss the bypass surface). Also
enumerate `/api/luminary/review` and `/api/luminary/status`: `/review`'s `acknowledge()` **mutates
governance state** (clears `governance_closed`), so it is a governance-state transition worth a
coverage family even though it dispatches no model call.

### F6 — Traceability / collision notes (verified) *(Low)*

- `server/TOTEM.md` is **absent** (confirms Aster's 404); the nearest folder Totem for the
  admission work is `server/governance-record/TOTEM.md` — name it as the one to read before edits.
- `.aegis/lanes/aster.md` is **absent on main** (as Aster states); creating it is an authorized
  continuity step, not a precondition to this review.
- **Verus's broad `server/**` claim is live** (`.aegis/claims.md`, `2026-10-26T23:40:20Z`, no
  RELEASE). Any P6/harness touch of a `server/` seam needs the scoped handoff Aster names. Aster's
  proposed harness paths (`scripts/aster-governance-harness/**`) sit outside `server/`, so the
  payload-free slice is clear of that claim — good.

### F7 — Proportionality: no unnecessary blockers, with one emphasis *(Low)*

The execution-blocker list is appropriate and the deferrals to P5/P6/freeze are correct
(retry-scope number, receipt fields, original/effective binding representation, single counting
authority, no-aim Acknowledge schema, fact-list hash/owner, output-revision context, P7
applicability). I **agree with Lumin #6**: the payload-free self-tests (manifest/event-schema/
verifier + fake route/fault adapters) should **not** be gated behind private-storage approval or
live-model access — let that benign slice proceed first. P7 (AST-31) is correctly excluded, and its
absence is neither a pass nor a blocker for the narrower current gate.

## Recommended contract choices (for the next reviewed revision, Tracey/Lumin to settle)

1. **Freeze the service-retry scope** (per-response vs per-admitted-attempt) before the ceiling
   formula; state the outbound maximum both ways (12 vs 10) so the choice is explicit. Adopt C/W/S.
2. **Name the single counting authority** (admission ordinal authoritative; `ReviewRecord.loop`
   derived) — matches AST-17 and my own rev18 illumination I-2.
3. **Pin the receipt contract** (issuer/subject/attempt+content binding/lifecycle) so AST-28/32 can
   bind fields instead of prescribing client-acknowledgment semantics.
4. **Pin original/effective binding** representation (exact bytes vs canonical UTF-8; immutable
   task-context/allowed-files envelope) per AST-18 and Lumin #4.
5. Add families **F2 (ReviewRecord)** and **F3 (spend-ledger)** to the matrix; extend route
   enumeration per **F5**.

## Technical-clearance scope

This is independent, evidence-grounded technical examination of the **payload-free design** by a
non-coauthor outside the Lumin–Aster pair; it provides findings and technical clearance to proceed
to a bounded implementation-design review once the freezes above are settled. It is **not** Tracey's
implementation approval, authorizes **no** harness implementation, private-case creation, provider
use, live run, or spend, and does not request Verus's private cases. Independent first-run suite
separation is preserved. Per squad rules this review is itself an artifact subject to outside-pair
examination; material changes to Aster's artifact return for review of the resulting revision.

— Libra
