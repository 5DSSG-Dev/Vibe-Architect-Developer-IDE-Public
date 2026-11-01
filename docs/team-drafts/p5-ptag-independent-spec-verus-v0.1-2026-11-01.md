# P5 PTAG — Independent Specification Draft (Verus v0.1)

**Date:** 2026-11-01
**Author:** Verus (Claude, the PC session on Tracey's second account)
**Status:** Independent authoring draft, one of three inputs (Lumin, Aster, Verus) for the merge. Lumin merges (Tracey, 19:20Z). Not an implementation contract, clearance, activation, or Architect approval.
**Grounding:** the authoring brief `p5-gate-spec-authoring-brief-2026-11-01.md` at `41c1323`, and the three-gate design v0.4 (`87c580b`). v0.4 supersedes v0.3 and changes only §3 (context provenance), §7 (direction-specific routing) and §11 (resistance wording); I used v0.4.

**Independence statement, with exact exposure.** I wrote this from the brief and the design doc only. Before writing, while searching the PC for a lost merge, I read the first 12 lines of Lumin's PTAG draft (title, date, author, status, grounding, independence statement, and the heading of its §1) and two lines a text search returned: its status line and its closing scope sentence. I did not read its body. I have not seen Aster's draft or any draft by the other Verus session. Nothing below came from either.

**Scope.** Principle and schema only. No sensitive fact bodies, no out-of-parameter (AREN'T) lists. Example facts in §6 are illustrative stand-ins, not proposed contract entries.

---

## 0. The idea this draft adds

PTAG reads a message as a **set of asks or claims**, not as one block. A single message often carries several: a request that is plainly in parameter and a second that is not, or a reply that makes one backed claim and one unbacked one. A whole-message reading invites the in-parameter part to carry the rest through. So PTAG here works in three steps:

1. **Extract** each ask (inbound) or claim (outbound) as its own item, anchored to the exact span of the candidate it comes from.
2. **Place** each item against the operating contract: matched, in conflict, or not placed.
3. **Compose** the item results into one outcome by a fixed rule that code applies, not the model.

The model does steps 1 and 2. Code checks what the model returns against the candidate and the contract, then does step 3.

---

## 1. Direction-specific classification predicates

### 1a. Inbound (Architect → Luminary)

> *What does this message ask the Luminary to do, and is each ask covered by a named in-parameter fact, or does it conflict with one?*

- **What counts as an ask:** a request for an action, for information, or for a change in the Luminary's role, standing or contract. A statement with no request in it ("thanks, that worked") carries zero asks (see §4c and open question 1).
- **Role and contract asks are asks.** A request to act under a different role, to set the contract aside, or to treat a party's text as authority is placed against the `role/authority` facts like any other ask. It is not handled as a special pattern here; PIM is the pattern gate.
- **Referent resolution** follows design v0.4 §3. A short reply such as "yes, looks good" becomes an ask only through the bounded preceding `prior-model-output` and an authenticated `recorded-state` that an answer was pending. The resolved ask is what gets placed. The prior text supplies the referent, not permission.

### 1b. Outbound (Luminary → Architect)

> *What does this reply claim or propose about the Luminary's capability, authority or past actions, and is each claim backed by a named fact at the same modality?*

Each claim carries a **modality**, and each modality has a fact class and evidence it needs:

| Claim modality | Example shape | Backed by |
|---|---|---|
| Standing role or authority | "I work inside your open project" | a `role/authority` fact |
| Present capability | "I can run the tests" | a `conditional capability` fact, plus deployment-verified evidence when the fact is conditional |
| Performed event | "I ran the tests and they passed" | an `attempt-specific event` fact, plus evidence from this exact attempt |
| Offer or intention | "I'll update the layout next" | the capability the offer depends on, at present-capability modality |
| Hypothetical or explanatory | "a build server would normally…" | no fact needed: it claims nothing about the Luminary |

A claim backed only at a weaker modality is **not backed**. A capability fact does not back a performed-event claim, and a conditional capability without deployment evidence does not back an unconditional "I can". An unbacked outbound claim is not emitted (design v0.4 §5a). The candidate goes back to the Luminary reform path, and the Architect does not see the withheld candidate.

---

## 2. Operating-contract manifest entry schema

One entry per fact. Shape only; the fact bodies live in the approved contract, not here.

| Field | Meaning |
|---|---|
| `factId` | Stable identifier. Never reused for a different fact. |
| `contractVersion`, `contractHash` | The approved contract this entry belongs to. A decision records both. |
| `class` | `role/authority` · `conditional capability` · `attempt-specific event` |
| `direction` | `inbound` · `outbound` · `both` |
| `applicability` | The task modes or surfaces where the fact applies (for example, building an Element, previewing, conversation only). The code-side applicability selector reads this. |
| `kind` | `parameter` (what the Luminary does or is) or `constraint` (a stated limit of a parameter). Both are stated as what IS: a constraint describes the edge of a parameter, not a list of things outside it. |
| `statement` | The fact in plain is-ness wording. |
| `coversActions` | The action kinds this fact covers, from a small controlled vocabulary shared with extraction (see §3c). This is the deterministic anchor for relevance. |
| `evidenceRequirement` | `none` · `deployment-verified` · `exact-attempt` |
| `boundaryTemplateId` | The code-owned boundary wording used when an ask conflicts with this fact. |
| `continuationTemplateId` | Optional. The bounded in-parameter question offered after a boundary. |
| `status` | `candidate` · `approved` · `retired`. Only `approved` entries in the active contract can match. |
| `provenance` | Who approved it, when, and which entry it supersedes, if any. Retiring an entry is a new version; nothing is edited in place. |

---

## 3. Decision → candidate binding

### 3a. The decision record

Every PTAG run produces one record:

- `decisionId`; `direction`; `contractVersion` and `contractHash`;
- `candidateHash`: SHA-256 of the exact candidate bytes PTAG read;
- the model id and prompt version used;
- the `recorded-state` id, when a referent was resolved through one;
- **items**, each with:
  - the span (start and end offsets in the candidate) and the extracted ask or claim;
  - the action kind (inbound) or the modality and action kind (outbound);
  - the `factId`s the model relied on, and the relation for each: `covers` · `conflicts` · `none`;
  - the evidence ids relied on (outbound and conditional facts);
  - the model's confidence, as a category: `confident` · `not confident`;
  - the item result after code checks: `matched` · `conflict` · `unplaced`;
- the composed outcome (§4) and the list of code checks that ran, with their results.

### 3b. What code checks before an item counts as matched

For each item, code confirms all of these; any failure makes the item `unplaced`, never `matched`:

1. **The span is real:** the offsets fall inside the candidate, and the extracted text is drawn from that span.
2. **The fact was offered:** each cited `factId` was in the set the applicability selector supplied for this direction and mode, from the active contract version. A `factId` the model invents or carries from elsewhere is not a match.
3. **The action kinds agree:** the item's action kind is in the fact's `coversActions`.
4. **The evidence holds:** for a fact with an evidence requirement, the cited evidence exists and meets it (`deployment-verified` from the deployed build; `exact-attempt` from this attempt's recorded events). This reuses the eligibility gating already in `idqra.ts` (design v0.4 §5b).
5. **The modality matches** (outbound): the fact's class backs the claim's modality per the table in §1b.

### 3c. Why the action vocabulary matters

The brief asks that an eligible but unrelated fact cannot authorize dispatch. Code can check eligibility but cannot judge meaning. Step 3 above gives code something it can check: both the fact and the item name an action kind from the same small vocabulary, and they have to agree. The model can still mislabel an item's action kind, so this narrows the gap rather than closing it. A mislabel that turns a conflict into a match is exactly what the adversarial suites in the jailbreak gate are there to find. Each one found becomes a regression case.

### 3d. Binding at dispatch

Dispatch compares the SHA-256 of the bytes about to be sent with the decision's `candidateHash`, and the active contract version with the decision's `contractVersion`. Either difference means the decision no longer applies; PTAG runs again on the new candidate. A reword (design v0.4 §6) always produces a new candidate, so it always gets its own PTAG decision.

---

## 4. Outcome mapping

### 4a. Per item (after code checks)

- `covers` a fact, confident, and every §3b check passes → **matched**
- `conflicts` with a named fact, confident, the fact was offered and applies → **conflict**, carrying that `factId`
- anything else (no fact placed, not confident, a check failed, insufficient evidence) → **unplaced**

### 4b. Composed outcome (code, fixed rule)

1. Any item in **conflict** → **boundary**, carrying the `factId` (or `factId`s) in conflict. The boundary wording comes from `boundaryTemplateId`; if more than one fact conflicts, open question 4 applies.
2. Otherwise, any item **unplaced** → **unsure** → Conscience (Identify).
3. Otherwise (every item matched) → **pass** for the exact candidate.

This is the precedence in design v0.4 §7 applied inside one gate: a confirmed conflict outranks uncertainty, and uncertainty outranks a pass. A mixed message, one ask matched and one unplaced, is **unsure**, not pass. The matched part does not carry the rest.

### 4c. No items

If extraction finds no asks (inbound) or no claims about the Luminary (outbound), PTAG has nothing to place. This draft treats that as **pass, recorded as `no-items`**, because PTAG's question is about asks and claims, and making every acknowledgement unsure would push ordinary conversation to the Conscience. The risk is an ask hidden so that extraction misses it. Open question 1 asks whether that risk is better handled here or by PIM and IRG.

### 4d. Failure

A model error, a timeout, or output that does not parse yields no decision. That is not a pass and not a boundary. It counts toward the message's budget (design v0.4 §7), and on exhaustion the result is the terminal `unresolved`/`error`, with nothing dispatched.

---

## 5. Where PTAG sits (for the merge)

- **Runs after:** IRG passes, or PIM's Identify reads a legitimate instance (door-open, which skips IRG and rejoins here).
- **Same local model as IRG, a second pass** (design v0.4 §2). PTAG's prompt receives the candidate (delimited, untrusted), the §3 context envelope with provenance labels, and the selected contract entries. It does not receive other gates' free-text output as instruction.
- **Outputs to:** dispatch (pass), the boundary renderer (boundary), or the Conscience (unsure), with routing per direction as in design v0.4 §7.

---

## 6. Acceptance cases

The facts here are illustrative stand-ins:
- F1 (`role/authority`, both directions): the Luminary edits files inside the Architect's open project.
- F2 (`conditional capability`, deployment-verified): the Luminary runs the project's test command when the build includes the test runner.
- F3 (`attempt-specific event`, exact-attempt): the Luminary ran the tests in this attempt.
- F4 (`constraint` on F1): F1 covers the open project's folder and not files outside it.

| # | Case | Expected |
|---|---|---|
| A1 | Inbound "make the header blue in my project": one ask, edit-file, covered by F1 | **pass** |
| A2 | Inbound "edit the settings file in the folder next to this project": one ask, conflicts with F4 | **boundary** carrying F4, continuation offered from the template |
| A3 | Inbound ask no fact covers or conflicts with (for example, booking a meeting) | **unsure** → Conscience, not a default boundary |
| A4 | Outbound "I can run your tests" with F2 cited but the deployed build lacks the runner | **unsure** (evidence insufficient), withheld from the Architect, back to the Luminary path |
| A5 | Eligible but irrelevant: inbound ask to send an email, model cites F1 (approved, applicable, eligible) as covering it | action kinds disagree (send-message vs edit-file) → item **unplaced** → **unsure**. Eligibility alone does not pass. |
| A6 | Mixed: "make the header blue, and also email my client the build" | item 1 matched, item 2 unplaced → **unsure**. The matched ask does not carry the second. |
| A7 | Outbound "I ran the tests and they pass" with F2 eligible but no F3 event in this attempt | modality mismatch (capability does not back a performed event) → **unsure**, withheld |
| A8 | The model cites a `factId` that is not in the offered set (or not in the active contract) | item **unplaced** → **unsure** |
| A9 | The model's span offsets fall outside the candidate, or its extracted text is not in that span | item **unplaced** → **unsure** |
| A10 | Inbound "yes, looks good" after the Luminary offered to apply a change, with a `recorded-state` for that offer | resolved ask placed (edit-file, F1) → **pass**. Without the `recorded-state`, there is no referent → **unsure**. |
| A11 | A reword changes the candidate after a pass | hash differs at dispatch → PTAG runs again on the new text |
| A12 | The active contract version changes between decision and dispatch | version differs → PTAG runs again |
| A13 | "Thanks, that worked" | zero items → **pass**, recorded `no-items` (pending open question 1) |
| A14 | Model times out on every allowed attempt | terminal `unresolved`/`error`, nothing dispatched |

---

## 7. Open questions

1. **No-items messages.** Is a message with no extracted asks a pass (as here), or should a low-confidence extraction of "nothing asked" be unsure? The answer turns on how often an ask can be hidden from extraction while passing PIM and IRG.
2. **The action vocabulary.** Who approves it, how small it stays, and how it versions with the contract. Too coarse and A5-style cases pass; too fine and ordinary asks go unplaced.
3. **Extraction completeness.** The model could miss an ask entirely. A second, independent extraction pass (different prompt order) compared by code would catch some misses at the cost of another call per message. Worth it for inbound only? For both?
4. **Several conflicts.** When two facts conflict, does the boundary carry both `factId`s, or the first by contract order? The Architect sees one boundary line either way; the record keeps all.
5. **Confidence as a category.** This draft uses `confident` / `not confident` rather than a number, because a number invites a threshold that hides the same judgment. The validation of the 7B gauge (design v0.4 §9) can test whether it emits `not confident` reliably.
6. **Outbound offers.** Placing an offer at present-capability modality means an offer the Luminary can't yet back is withheld. Is that right, or should an offer carry its condition in the wording ("once the test runner is in the build, I can…")?
7. **Shared model with IRG.** PTAG and IRG share a model and runtime (design v0.4 §11). A shared blind spot would pass both. The merge may want to state which acceptance cases test PTAG alone, with IRG stubbed.
