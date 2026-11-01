# Libra — independent peer review of build-and-run plan rev18

Reviewer: **Libra** (Claude Cloud Peer), 2026-11-01. Independent review requested by Verus's
brief (`cloud-peer-review-brief-rev18-2026-11-01.md`) under the Architect direction that ALL
work gets an independent peer review and no author approves their own. Verus authored rev18, so
Verus is not its reviewer; this is that independent review. **This is a review finding, not an
approval.** Approval is Tracey's separate Architect decision.

## Artifact, revision, and commit under review

- **Primary artifact:** `docs/team-drafts/build-and-run-plan-rev18-2026-11-01.md`
- **STP companion:** `docs/team-drafts/stp-0005-rev18-entry-draft-2026-11-01.md`
- **Read in order first:** rev17 (`build-and-run-plan-rev17-2026-10-31.md`), Lumin's rev17
  review (`rev17-peer-review-lumin-2026-10-31.md`), then rev18. Also read: the rev17 STP draft.
- **Checkout reviewed:** branch `claude/project-thread-67iwra`, commit
  **`7605f3ee1f08eae8f49e4491c72ca5b73289f4b0`**.
- **Code baseline:** `server/` and `src/luminary/` on this checkout are **byte-identical to
  `origin/main`** (`37caf4bdb93516a60a0e37cd6651a51d01d759e7`) — verified with
  `git diff --quiet origin/main -- server/ src/luminary/` (clean). The only difference between
  this checkout and `main` is the six team-draft documents. So code inspection here faithfully
  reflects main `37caf4b`, the baseline rev18 itself names.
- rev18 is a **plan for review; no code has changed** — confirmed: the full tree diff vs. main
  is only the six `docs/team-drafts/` files.

## Target and scope applied

- **Target:** judge whether rev18 is an *executable blueprint* for the two-way governance
  response — implementable without guessing a contract — internally consistent, consistent with
  Tracey's settled decisions, and consistent with the code on main.
- **Settled decisions treated as fixed (not reopened):** one initial message + two replacements
  with no reset on reopen/resubmit; the seven-Virtue gauge stays local on llama3.2:3b with the
  27-October thresholds; IDQRA (not Suggest) is the response primitive; the Conscience is
  stateless.
- **Out of scope for approval:** the protected-operation boundary (P7) stays a proposal; no
  code/provider/model/key/spend action is authorized by this review.

## What I inspected vs. what I executed

- **Source inspected** (at `7605f3e` = main `37caf4b`): `server/luminary-reply-router.ts`,
  `server/luminary-task-router.ts`, `server/app.ts`, `server/luminary-access.ts`,
  `server/luminary-meta.ts`, `server/luminary-pipeline/pipeline.ts`,
  `server/luminary-pipeline/ids.ts`, `server/governance-record/{admission-types.ts,
  admission.ts headers, ADMISSION.md, review.ts}`, and the tests
  `server/governance-record/review.test.ts`. Plus all six team-draft documents and the
  ROOT_TOTEM / Hackathon Totem for context.
- **Tests I actually ran** (this cloud container, not the Architect's PC): `npm ci` (clean,
  exit 0) then `npm run test:gateway` → **226 tests, 226 pass, 0 fail, 0 skipped**
  (`tsx --test "server/**/*.test.ts"`, ~12 s). This matches Lumin's reported gateway 226/226.
  I did **not** run `test:app`, the production build, the local gauge (Ollama), the hosted Meta
  writer, a browser run, or any jailbreak suite.
- **Not independently verified (attributed reports, as Lumin also noted):** Verus's
  hosted-writer live-run metrics (~17–22 s, ~$0.015/call, seven flagged messages), and any
  live gauge behavior. These remain attributed, not reproduced.
- **Environment limits:** no model/provider/key access was used or authorized; the
  `luminary-true-facts-draft-2026-10-31.md` and `protected-categories-boundary-draft-2026-10-31.md`
  files referenced by rev17/rev18 are **not present in this repository** on this branch, so their
  content could not be reviewed (see Finding Q4-b).

---

## Settled-decisions check (no conflicts found)

rev18 is consistent with every settled decision, and — unlike rev17 — it **removes** the
conflicts Lumin flagged rather than introducing new ones:

- One initial + two replacements, no reset: honored in §1 (F3) and §4.4.
- Gauge stays local on llama3.2:3b, 27-Oct thresholds: untouched by rev18; the gauge code is
  not modified; §6 keeps only the *writer* hosted.
- IDQRA (not Suggest) is the primitive: kept; rev18 §7 narrows (correctly) the over-broad
  "Suggest is Force in any form" claim without reopening the retirement of Suggest.
- Conscience stateless: kept; counter and lineage remain outside it.

I found **no sentence in rev18 that contradicts a settled decision.**

## Findings by review question

### Q1 — Allowance (F3) & consumption (F2b)

**Fresh-count conflict fully removed: YES.** rev17 F3 still permitted a resubmission to start a
"fresh linked count," which conflicted with the settled no-reset rule. rev18 §1 removes it and
restates F3 as one initial + two replacements with reopen/resubmit retaining identity, lineage
and remaining allowance; duplicate returns the existing attempt; exhausted stays exhausted; a
"genuinely different exchange must not provide a disguised continuation." No contradictory
sentence remains in rev18. rev18 correctly frames this as **required integration behavior**, not
a property of the primitive.

- **Grounding in code:** the legacy fresh-count behavior is still live and is *proven live by a
  passing test* — `server/governance-record/review.test.ts:87-94` asserts a resubmission yields
  `record.loop === 0` with `resubmittedFrom` set (a fresh count), and lines 67-73 confirm the
  0/1/2 ordinal for original/rev1/rev2. This test is part of the 226/226 I ran. So rev18's claim
  that the wiring (not the primitive) must enforce no-reset is accurate and concrete.
- **"consume at durable admission, no post-admission refund": stated without contradiction.**
  rev18 F2b matches `ADMISSION.md` ("`closeProcessing` records a terminal outcome **without
  refund**"; "Ordinals are 0, 1, 2"; "Only new admissions may start processing; transport
  duplicates never authorize replay"; "`shortfall` and `completed` do not open replacement
  permission").
- **Three counters kept separate: YES, and each maps to a real, distinct mechanism** —
  (a) replacement allowance 1+2 → `MESSAGE_REVISION_LIMIT=2` / admission ordinals 0/1/2;
  (b) Conscience content-rewrite budget → `SUGGEST_REWRITE_LIMIT=2` (`ids.ts`), which becomes the
  IDQRA field-rewrite budget; (c) writer service-retry → the single bounded retry in `runIds`
  (`retryUsed`, one per response).
- **Finite total writer-call ceiling "defined": PARTIAL — see Illumination I-1.** The component
  bounds exist (so per-turn writer calls are *implicitly* finite), but rev18 asserts the ceiling
  "is defined" without stating the number or the formula that composes the three counters, and
  without counting the **separate Architect-gate IDS writer calls** (`gateArchitectMessage` also
  invokes the writer when the Architect's own message is incoherent). A builder would still have
  to derive the actual ceiling. Recommend pinning it explicitly.

### Q2 — Per-direction isolation (§3)

**Distinction correct against the code: YES.** rev18 §3 correctly separates the two directions,
and the Luminary→Architect correction of rev17's blanket "the model never sees the flagged
message" is well-grounded:

- `luminary-reply-router.ts:303` builds the reform call as
  `askModel(composeRevisionPrompt(prompt, previous.content, observation))`, and
  `composeRevisionPrompt` (`ids.ts:222-239`) embeds the **previous (flagged) reply**, the
  **original prompt**, and the observation. So in the Luminary→Architect direction the response
  model *does* receive its own flagged reply — exactly as rev18 states. rev17's blanket claim was
  wrong; rev18 fixes it.
- **Output-revision isolation contract specified, not assumed: YES at the contract level.** rev18
  pins the requirement (Architect receives no rejected candidate; no cross-role context silently
  shared) and names the two permissible mechanisms (separate bounded-evidence context, or the
  originating role deliberately receives its own Conscience return), to be pinned before any
  prompt change. The **specific mechanism remains an open decision** (rev18 lists it under "Still
  open"), which is acceptable for a blueprint but must be settled before build.
- **Minor attribution nuance (I-3):** rev18 §3 wording is precise ("`pipeline.ts` calls reform,
  and `luminary-reply-router.ts` composes…"). But STP draft S10 compresses this to
  "`pipeline.ts` reform composes…" — the composition is in the router's injected reform callback,
  not in `pipeline.ts` (which only calls `reform(observation, reply)` at `pipeline.ts:169`).
  Recommend aligning STP S10 to §3's precise wording.

### Q3 — IDQRA envelope checks (§4.1–4.3)

- **All five fields screened: YES.** §4.1 requires screening the entire returned envelope
  (structural, size, no-echo, provenance, truthful-claim) across all five fields, including
  Identify as sender-facing, with Question additionally checked for loaded premises, accusation
  and disguised direction, and explicitly notes deterministic screens detect patterns, not
  semantics (labelled counterexamples + held-out evaluation). This is a real expansion over the
  current code, which screens only Suggest (`ids.ts` runs `screenIdsPim` on `suggest` alone) —
  consistent with IDQRA being unbuilt.
- **Define's deterministic structural-failure variant covered: YES** (§4.2, "Define gets a
  deterministic structural-failure variant, not only PIM/IRG findings").
- **Recipient/direction in trusted metadata, not inferred from prose: YES** (§4.3). This maps to
  `admission-types.ts` `Direction` (trusted, integration-supplied, "not derived from untrusted
  model text" per ADMISSION.md).

### Q4 — True-facts guard (§5)

- **(a) More than a regex: YES.** §5 states a regex is a detector not a boundary; prefers
  approved fact identifiers / trusted server-rendered templates; distinguishes capability from
  observed execution; requires runtime evidence for runtime facts; and resolves list
  version/hash/ownership before P5. All four sub-points from the brief are addressed.
- **(b) Evidence limitation / traceability finding:** the actual
  `luminary-true-facts-draft-2026-10-31.md` is **not in the repository** on this branch
  (nor is `protected-categories-boundary-draft-2026-10-31.md`). I therefore reviewed only the
  *contract around* the guard, not the fact list it will enforce — the same limit Lumin recorded.
  The guard cannot be assessed as enforceable in substance until the list is present, versioned,
  hashed and owned. rev18 keeps this open ("resolved before P5 approval"), which is correct; I add
  that the draft should be committed to `docs/team-drafts/` (or its exact location + hash cited)
  so a reviewer can find it.

### Q5 — P6 integration (§6)

- **All governed callers (`/ask` AND `/tasks`) in the acceptance map: YES, and the bypass is
  real.** Confirmed in code: `app.ts:281` mounts `/ask` via `createLuminaryReplyRouter(...)`
  (which calls `createGovernedAsk` internally), while `app.ts:278` mounts `/api/luminary/tasks`
  with a **separate** `createGovernedAsk(...)` instance, and `luminary-task-router.ts:119` calls
  that `governedAsk(...)` directly. An admission wrapper placed only in the `/ask` route handler
  (`router.post('/ask', …)`) would leave `/tasks` unadmitted — exactly the bypass rev18 names.
  acceptance item 25 (expanded) tests both paths.
- **Inbound vs. outbound admission separated: YES** (§6 and acceptance 25/26: neither marked
  complete because the other passes).
- **Exact-original-content / `/ask`-parser issue addressed: YES.** `readPrompt`
  (`luminary-reply-router.ts:354-360`) does `raw.trim()`, so the parser does mutate the original —
  rev18's call to capture exact original content and an immutable effective-request envelope is
  correct. Note `/tasks` transforms even more (`goal.trim()` at task-router:98 then wrapped by
  `composePrompt`), which rev18's "immutable effective-request envelope for coding-task context"
  covers.

### Q6 — Cost caps

- **$2-vs-call-count math stated correctly: substantially YES.** rev18 §6 correctly says both a
  dollar cap and a call cap apply and must be recorded separately. Confirmed in code: the spend
  ledger's `reserve()` (`luminary-meta.ts:127-133`) independently enforces `capUsd` **and**
  `maxCalls`, and the ledger tracks `reservedUsd` and `actualUsd` separately
  (`luminary-meta.ts:62-79`, `charged = actualUsd ?? reservedUsd`). The point that "$2 ≠ 1,000
  calls" is correct.
- **Two small precision notes (non-blocking):** (i) rev18 says "~137 calls"; at exactly $0.015
  a call, $2 buys ≈133 calls — a trivial rounding of the already-approximate per-call cost.
  (ii) The "$2 / 1,000-call" pairing from rev17 is a *demo configuration*, not a code default:
  the code defaults are `DEFAULT_META_SPEND_CAP_USD=0.25` and `DEFAULT_META_MAX_CALLS=2` (smoke),
  with live use driven by `LUMINARY_META_CEILING_USD`. rev18's "the demo must set whichever cap
  it means to bind" handles this correctly; worth stating the demo's intended numbers explicitly.

---

## Illuminations (enhancements)

- **I-1. Pin the total writer-call ceiling.** State the actual per-attempt writer-call ceiling (a
  number or a formula over the three counters: replacement allowance × IDQRA passes ×
  (1 + field-rewrites + service-retry)), and include the separate Architect-gate IDS writer
  calls. As written, a builder must derive it — which cuts against "implementable without guessing
  a contract." Consider a dedicated acceptance item for it.
- **I-2. Name the single counting authority after wiring.** Counting is live *today* in
  `ReviewRecord.loop` (`review.ts`), while P6 wires the *separate* admission primitive (its own
  0/1/2 ordinals) as "the counting authority." rev18 does not pin whether, post-wiring, the
  admission ordinal becomes the single source of truth with `ReviewRecord.loop` derived from (or
  removed in favour of) it, or whether both run and must be kept in sync. Two independent counters
  risk divergence; specify which is authoritative.
- **I-3. Align STP S10 wording** to rev18 §3's precise `pipeline.ts`/router attribution (above).
- **I-4. Commit (or precisely cite) the referenced drafts** (`true-facts`, `protected-categories`)
  so reviewers can locate the material the guard and P7 depend on.
- **I-5. Add an explicit test for the "disguised continuation" clause** of F3 ("a genuinely
  different exchange must not provide a disguised continuation with a fresh allowance") — it is a
  subtle requirement that acceptance 25 should name directly, alongside no-reset / stale-parents /
  concurrent-siblings / duplicate-requests.

## Unresolved questions (rev18's own open items, plus mine)

- The Luminary→Architect isolation **mechanism** choice (separate bounded-evidence context vs.
  originating-role-receives-own-return) — rev18 §3 / "Still open".
- Acknowledge's required/optional shape when no aim is established — rev18 §4.2.
- P7 placement, categories, wording — out of scope for approval; its own frozen-build gate if
  adopted.
- The `/ask` parser change needed to preserve exact original content — P6.
- (mine) The counting-authority relationship (I-2) and the writer-call ceiling value (I-1).

## Assessment (finding, not approval)

rev18 is a **materially stronger and internally consistent** revision than rev17. It correctly
reconciles every rev17 conflict Lumin raised (F3 fresh-count, F2b consumption, per-direction
isolation), it does not contradict any settled decision, and **every structural claim it makes
about the code checks out against main** (verified by inspection and a 226/226 gateway run). It
is close to an executable blueprint.

What still stands between it and "a builder could implement without guessing a contract" is a
small set of **named-but-unresolved decisions**: the Luminary→Architect isolation mechanism, the
Acknowledge shape, the explicit total writer-call ceiling (I-1), the single counting authority
after wiring (I-2), and the absent true-facts/P7 drafts (Q4-b, I-4). None of these is a
contradiction; each is a contract a builder would otherwise have to guess. I recommend they be
settled (and the STP S10 wording aligned) before implementation of P5/P6 begins.

Per the Architect direction: this independent review does not approve rev18 as complete or
integrated. Material changes made in response to it return for review of the resulting revision.
I created no adversarial/jailbreak payload corpus, and I reached these conclusions from my own
evidence, not by relaying Verus's or Lumin's.

— Libra
