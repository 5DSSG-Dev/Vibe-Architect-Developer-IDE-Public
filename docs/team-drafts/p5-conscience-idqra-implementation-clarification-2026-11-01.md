# P5 Conscience/IDQRA — implementation clarification (additive to v0.2)

**Layers on:** `p5-conscience-idqra-contract-v0.2-2026-11-01.md` (`6fe1573`). **Answers:** Lumin's re-check, PR #34 comment `6555684850`. **Scope:** additive code-facing detail only — it does not reopen settled v0.2 wording and proposes no new process. Still contract/packet; **no product code written** (bounded coding authorization is Tracey's, still open — see §E). Grounded against current source at `6fe1573`.

---

## A. Reflect: distinct raw-draft vs trusted-public types (answers item 1)

Two types, one trust boundary. The writer never produces public text.

- **`ReflectDraftItem`** (raw writer output, **untrusted**): `{ factId: string, slots: Record<string,string> }`. The writer supplies only a `factId` and slot fillers — **no free text**. Rules, all fail closed to `conscience_error`:
  - `factId` must be a member of the first-slice fact table (below); unknown → ineligible/reject.
  - Every key in `slots` must be a declared slot of that `factId`'s template; any **unknown key → reject** (no silent drop).
  - Each slot value is length-bounded and control-char-free.
  - Bounded item count: at most `MAX_REFLECT_ITEMS` draft items per envelope (first slice: small fixed N); over → reject.
- **`ReflectItem`** (trusted public, inside `IDQRAEnvelopeV1`): `{ factId: string, modality: Modality, text: string }`. `text` is produced **only** by the trusted renderer from the fixed template for `factId` with validated slot substitution. The writer cannot write `text`.
- **Renderer:** `renderReflect(factId, slots) -> ReflectItem | reject`. `text` = `template[factId]` with named-slot substitution; no prose-matching anywhere — eligibility is **table membership + modality gate**, never a semantic scan.
- **Fixed fact-template map (first slice):** a small static table `factId -> { modality, template, slots[] }`. The first slice ships only the handful of v4 facts the demo needs; each row names its modality, its template string with named placeholders, and its declared slots. (Concrete rows to be filled from the approved v4 list at code time, one row per cited fact.)

**Modality / class eligibility across the approved v4 classes.** v0.2 listed `stable | intended | event`; the approved v4 set also carries **role/authority** and **conditional-capability** classes. The addendum extends `Modality` to `"stable" | "intended" | "conditional" | "role" | "event"` and gates each:

| class | render rule | eligibility |
|---|---|---|
| stable | stated plainly | always (table member) |
| intended | only as "is designed to…" | always |
| conditional | template **must bind the condition clause**; never rendered as unconditional/stable | ineligible unless the condition's predicate holds for this context |
| role / authority | rendered as a role statement, **not** a capability claim | always |
| event | see §B | **ineligible unless qualifying evidence already present** |

A conditional capability is never promoted to a bare stable assertion — the condition travels in the template or the item is omitted.

## B. TF-10 event evidence — non-circular first-slice behavior (answers item 2)

TF-10-style event claims ("this message was returned…") depend on the P6 admission/result binding, which is created **around** the P5 result — so citing it from inside P5 is circular. First-slice rule:

- If qualifying event evidence is **not already present** at envelope-construction time, the event-class template is **ineligible** (omitted). Full stop.
- The writer may **not** self-attest an event, and P5 does **not** require, wait on, or fabricate a receipt for a body it has not yet produced. **No new event-resume scheme** in this slice.
- **Structural guarantee (not a scan):** because the public envelope is built **only** from `factId -> template`, there is no free-text path by which an unsupported first-person claim can leave the typed construction/validation boundary. The guarantee is structural (no free text in → none out), not a pattern scan — matching Lumin's point that scanning alone cannot establish a universal semantic guarantee.

## C. Source ownership / compatibility (answers item 3) — grounded at `6fe1573`

Each current consumer of `IdsObservation` / `composeRevisionPrompt` / `ids_error`, who edits it, and what keeps it compiling. First slice is **additive**: `ids_error` kept as a deprecated alias of `conscience_error` until every consumer migrates; `ids.ts` is not deleted in the first slice.

| file | current use | editor | compatibility action |
|---|---|---|---|
| `server/luminary-pipeline/ids.ts` | defines `IdsObservation` (L22), `validateObservation` (L92), `composeRevisionPrompt` (L222), `runIds`, `IdsResult`/`RunIdsOptions` | **P5 (Verus lane)** | add `idqra.ts` beside it (new IDQRA types, `runIdqra`, `composeReformPrompt`, envelope builder + `validateIdqra`); `ids.ts` stays until migration |
| `server/luminary-pipeline/pipeline.ts` | imports `runIds` + IDS types (L17); `Reform` (L40); LineageEntry `ids`/`ids_error` (L60-61); `runReplyPipeline` calls `runIds` (L145) | **P5** | `runReplyPipeline` calls `runIdqra`; a shim maps IDQRA→existing LineageEntry/observation shape; `conscience_error` canonical, `ids_error` alias |
| `server/luminary-pipeline/architect-gate.ts` | inbound gate; `runIds`, `IdsObservation`, builds observation (L50), `ids_error` lineage (L82) | **P5 (gate logic only)** | swaps to `runIdqra`/IDQRA observation. **Not the route** — the `/ask`+`/tasks` route wiring stays **Lumin's P6 single-editor task**; different files, no overlap |
| `server/luminary-reply-router.ts` | outbound reply route; `composeRevisionPrompt`, `IdsObservation` (L23), `ids_error` status map (L90/190/255), reform callback (L303) | **P5** | reform via `composeReformPrompt(IDQRA)`; keep HTTP mapping; add `conscience_error`. This is the **outbound** router, distinct from P6's inbound admission |
| `server/governance-record/review.ts` | `ReviewRecord.observation?: IdsObservation` (L39); `ArchitectState`/`LuminaryState` include `ids_error` (L26/L44) | **shared — needs 2-line coordination** | P5 adds `conscienceObservation?: IDQRAEnvelopeV1` **additively** and the `conscience_error` state alias; existing `observation?` retained. P6 only populates the admission linkage it already owns. Single-editor-per-field; flagged below |
| `src/luminary/client.ts` | UI stage/state unions include `ids_error` (L18/L49); message map (L238) | **P5 / UI** | add `conscience_error` to unions + a human-readable string; keep `ids_error` until the server stops emitting it |
| `scripts/ids-live-check.ts` | dev script; `runIds`/`IdsObservation` | **P5** | add an `idqra-live-check` or update; non-blocking |
| tests: `ids.test.ts`, `stages.test.ts`, `pipeline.test.ts`, `luminary-reply-router.test.ts`, `client.test.ts` | exercise IDS | **P5** | first slice **adds** IDQRA tests; existing IDS tests stay green until IDS removal |

**The one shared file is `review.ts`.** To avoid a double-editor collision with P6: P5 adds the `conscienceObservation?` field + `conscience_error` alias; P6 continues to own the admission/result linkage it writes. That split is the explicit compatibility seam.

## D. §2/§8 — response-generations vs Conscience-observations (answers item 3 tail)

The Luminary's **response-model generations** (the reply being governed) are separate from the **Conscience's IDQRA observations**. The bounded-feedback contract: the Luminary's role receives the Conscience's bounded feedback — **including the Question field** — to re-form its reply. Nothing in §2/§8 excludes the Question from that bounded feedback; the earlier "model never sees the flagged message or the Question" refers to the Luminary's **response model** not re-reading flagged content, not to the role-level re-form loop. This removes any implied Q-field exclusion that would contradict the intended bounded-feedback contract (Tracey decision 1).

## E. Pending Architect decisions (stated plainly, per the re-check)

1. **Luminary→Architect isolation — DECIDED (yes).** Runtime: Architect sees only the final accepted reply. Plus a **later-reviewable** incoherence flag for the Architect = a bounded is-statement ("reply re-formed N times for coherence") + a pointer into the existing append-only review log (Axiom 17), in the readable review area — never the raw withheld observation or the Question. [folds into the contract next revision]
2. **Acknowledge with no stated aim — DECIDED (yes):** name only what was expressed; invent no motive.
3. **OPEN — bounded coding authorization:** Tracey's go to begin the first P5 code slice. Until then this stays contract/packet only.

## F. Scope guards

- **P6 route integration is Lumin's single-editor task.** Libra is **examining** the current P6 artifact (not drafting) — no duplicate P6 code or drafts originate from the P5 lane.
- Aster's offline harness review is separately routed and may be short/payload-free.
- **No new tests were run** for this document-only return. The 42-test green at the rename head covers current IDS/rename, **not** future IDQRA.
- **P7** (protected-operation boundary) remains a separate contract; its patterns are not in this doc.
