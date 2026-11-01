# Proposal rev3: shared squad handoff lane (`.aegis/lanes/squad.md`)

Revised by Claude (Verus), 2026-11-01. This supersedes the reconciled point of rev2 (`squad-lane-proposal-rev2-2026-11-01.md`, pinned `21679e5` / blob `8ee2051`); rev1 (`018e832`) and rev2 both stay in this folder unchanged as the record. This revision answers the **one remaining blocking finding, R2-1**, from Aster's independent review of rev2 (`squad-lane-rev2-peer-review-aster-2026-10-31.md`, commit `7b53811`, branch `aster/squad-lane-rev2-review`), returned through Lumin (PR #34 comment `6553940249`). Aster found F1, F2, F3 and F5 addressed and F4 addressed **except** the `sent` transmission attestation (R2-1); everything else in rev2 is carried forward.

Still a **proposal draft** — nothing here is a working parameter until independently cleared and approved by Tracey. Author = Verus (Verus–Libra pair); required independent clearance is a non-author outside that pair (Aster), returned through the lead-to-lead route in §1. Aster's review and my consolidation are themselves subject to outside-pair examination; because I own this revision, I do not clear my own resulting proposal.

Baseline main for every reference below: `78bd423`. No product code is touched.

---

## 1. Routing: lead-to-lead for all cross-squad review (Tracey's direction)

Direct assistant-to-assistant handoffs caused confusion, so all cross-squad review **requests and responses** route through the two leads:

- **Lumin → Verus → Libra → Verus → Lumin**
- **Verus → Lumin → Aster → Lumin → Verus**

Rules, as directed:

- Either lead may conduct the review directly when eligible (non-author, outside the producing pair); otherwise delegation stays **within the receiving lead's own pair**. Requests for Aster route to Lumin; requests for Libra route to Verus.
- Tracey receives **one complete lead-to-lead packet** when a bridge is needed, not separate assistant assignments and responses.
- Before delegating, the receiving lead checks the primary artifact, the exact revision, the brief, the scope, and the expected return are all present and accessible.
- The assistant returns findings to **their own lead**. That lead examines evidence and completeness and returns **one consolidated response** to the requesting lead, **retaining the reviewer's attributed verdict, unresolved questions, and any disagreement verbatim**.
- Routing oversight **must not** prescribe the conclusion, suppress findings, or turn a coauthor into an independent reviewer.
- Final review still requires an eligible non-author outside the producing pair. Architect approval and merge remain Tracey's separate decisions.

**Routing responsibility is not transmission (R2-1).** Being the responsible routing lead does not, by itself, make a lead the attester of `sent`. The three roles are distinct and recorded distinctly (see §4 `sent`): the **lead responsible for routing**, the **actor who actually transmitted**, and the **publisher of the register pointer**. A request that Tracey (or another authorized bridge) relay a packet records a **requested/pending** transmission and is **never** `sent` until transmission evidence exists; lead-only request/return routing is preserved and recording the actual transmitter does not authorize an assistant to bypass a lead.

## 2. Purpose and boundaries (unchanged intent)

Give each pair visibility into cross-pair work without routing all *context* through Tracey, while the *coordination path* runs lead-to-lead per §1. It **complements** — does not replace — the claims board (path ownership) and the cross-pair review rule. It is not a second claims board, not an approval surface, not a place for findings (those stay in peer lanes / review artifacts), and not an enforcement mechanism. It asserts no background subscription, automatic delivery, or enforcement.

## 3. First version is option 2: a published coordination branch, one writer at a time (resolves F1)

rev1 recommended a standing Architect merge authorization (its option 1). Aster showed that wording left an **ALL-work-review bypass**: a false `accepted`/`reviewed` line could reach `main` under standing metadata authority with the required outside-pair review deferred to a code merge that need never happen (F1). The merged working parameters require outside-pair non-author review for documentation and review deliverables, not only code. Aster confirmed F1 is **closed** in rev2.

- The register lives on a **dedicated, published coordination branch**, based on `main`, with **one coordinated writer at a time**.
- This gives pre-merge visibility **without first deciding any standing merge authority**. Nothing merges to `main` under a metadata exception.
- A future standing coordination-merge authorization is a **separate review-policy question** decided on its own; a future merge *delegation* could change merge permission **without changing the ALL-work review rule**, and any review *exemption* would be a separate explicit policy change. None is requested or activated here (precision added per Aster).
- Any merge of this branch to `main` remains a normal merge: Tracey's decision, after the required review. No peer status line is or impersonates an Architect approval/merge action. A delegated merge, if ever authorized, **cites Tracey's standing authorization explicitly** rather than recording it as Tracey's personal action.

Tradeoff (as Aster noted): this adds branch and read discipline and pending-`main` reconciliation, and does not eliminate required review. That is the intended cost for a safe v1.

## 4. Event model: revision-aware, with named attesters (resolves F2, F3, F4 incl. R2-1)

### Assignment block (recorded once; superseded, never rewritten)

```
### <ASSIGNMENT-ID> | <short title>
- requester:          <peer or Architect>
- assigned peer:      <peer>
- pair lead (assignee side): <lead>
- requesting lead:    <lead who routed the request>
- author(s)/contributors: <names>          # for the review gate
- required reviewer:  <non-author outside the producing pair>
- input revisions:    <repo@full-commit + exact path (or approved artifact id/hash)>
- scope revision:     <scope-rev id>
- claim link:         <claims.md line, if paths are touched>
- return point:       <branch + exact path where the deliverable lands>
```

A **scope change does not edit this block**. It creates a **linked scope revision or a superseding assignment** and requires the assignee's renewed access/scope acknowledgment; acceptance of an old scope never carries forward (F2).

### Status events (append-only; identity and revision decide truth, not line order)

Each event is a new appended line carrying a **stable event ID**, the **assignment + scope revision** it refers to, the **attester**, the **publisher** (who recorded the pointer, if not the attester), the **predecessor / expected prior state**, the **exact input/output reference**, and an **evidence pointer**:

```
<EVENT-ID> | <ASSIGNMENT-ID>@<scope-rev> | <status> | after:<predecessor-event-ID|none> | ref:<repo@full-commit:path | artifact-id/hash> | attester:<actor> | publisher:<peer|same> | <UTC> | <evidence pointer>
```

- **Current state is derived by validating authority and revision**, not by taking the latest physical line. A stale or out-of-revision event **remains in history but cannot advance or regress a different revision** (F2).
- **Concurrent competing transitions** are marked **unresolved**; the responsible coordinating lead appends a **resolution event referencing both** and obtains the required attestations/review. Timestamps and line position never decide truth. Never force-push or delete historical events to reconcile — rebase reconciles Git text only (F2).

Statuses and their **sole authorized attester** (F4), with publisher kept distinct (R2-1):

- `prepared` — brief written. Attester: **requester**. Not proof of delivery; prepared is not `sent`.
- `sent` — the packet was **actually transmitted** to the assignee. Attester: **the actor who actually performed the transmission** — a lead when the lead transmitted, or Tracey / another authorized bridge when they transmitted (in which case their attributable transmission statement/evidence is canonical and a lead may **publish the pointer** naming that transmitter, without claiming to be its originator). A **delegation request** to relay records a **requested/pending** transmission, **never** `sent`; `sent` is never inferred from `prepared` or from publication. `sent` still does not mean accepted or accessed.
- `accepted` / `declined` / `renegotiated` — Attester: **the assigned peer themselves**, confirming access + scope. A lead cannot mark these on a peer's behalf.
- `returned` — deliverable produced. Attester: **the assignee**; records the output `repo@full-commit:path`.
- `reviewed` — Attester: **the designated non-author reviewer**. Records reviewer independence, the **exact reviewed output**, the review artifact pointer, and a **verdict: clear / changes-requested / inconclusive** (F3).
- `consolidated` — Attester: **the author/consolidator**. Closes **only the administrative response to the specified findings**; it **identifies the resulting revision and its own review requirement**. It **never transfers an earlier revision's clearance to a new revision**, and is not terminal for a materially changed artifact — a new substantive revision returns to the required non-author reviewer (F3).

**Assignment workflow, technical clearance, and Architect approval/merge are three separate dimensions** and are never conflated by a status line (F3). Architect approval and merge stay Tracey's recorded actions, never a peer status line.

### Canonical attestation vs. register pointer (F4, R2-1)

The **peer-authored (or authorized-actor) attestation is canonical**; register lines **index exact evidence**, they do not create a second independent fact. The `attester:` field names **who performed/attested the fact**; the `publisher:` field names **who recorded the pointer**. A coordinating lead may publish an attributed pointer to another actor's transmission, acceptance, return, or review **without becoming its attester**. Because peers may share account access, these labels are procedural attribution, not cryptographic proof of identity — the register says so plainly and promises no cryptographic identity proof.

No peer's own lane is the **only** permissible evidence when it is unavailable: an **exact, accessible review/return/transmission document or an authorized bridged statement** can serve as the canonical attestation **when identified explicitly** by `repo@full-commit:path` or approved artifact id/hash.

## 5. Accessibility and read convention (resolves F5)

A recorded pointer proves a reference exists; it does **not** prove recipient access or that another peer was informed.

- Every input/output/evidence pointer is **repo + full commit + exact path**, or an approved artifact identifier/hash. Publish all non-private required inputs to the repository; a local Downloads path alone is **not** a canonical pointer (a downloadable copy for a human is a convenience *in addition to* the repo pin, never a replacement).
- **Successful access is recorded separately from publication, and from `sent`.** Each peer checks the designated coordination ref **at assignment start/resume and before any dependent work**, pins the read commit, and acknowledges the relevant events. Missing acknowledgment stays **pending**.
- **Pair leads reconcile unacknowledged dependencies.** Urgent handoffs use the §1 authorized bridge. Publication means *available*; transmission (`sent`), notification, receipt, and access remain distinct and are not assumed.

## 6. Secret / payload exclusion (F5)

Both register and lane updates **exclude** secrets, private-suite payloads, and raw adversarial results. Use only approved **opaque metadata/pointers**, preserving independent first runs. Sensitive category names and patterns never appear here.

## 7. What is preserved (Aster's "what is sound")

The assignment-register / claims-board / peer-evidence split (one source of truth per fact); `prepared` distinct from `sent`; `accepted` belonging to the assignee; append-only history; path claims kept separate on the claims board; explicit proposal-status and Architect-decision authority. A review artifact stays in `docs/team-drafts/` with the register pointing to it; findings are **not** duplicated into a lane, and the original review pointer is retained so lead commentary is clearly separable from the independent verdict. Assignment ownership does **not** release an edit claim — the live broad `server/**` claim still needs its scoped handoff, which this proposal does not supply (Verus owns that separately).

## 8. Adoption / setup record (before any register is activated)

Before an operational register is activated, a **reviewed adoption/setup record** supplies: the **authoritative coordination branch/ref**, the **initial coordinated writer** (one-writer ownership), and the **explicit handoff mechanism** (including the urgent authorized-bridge route and pending-dependency behavior). The exact branch spelling and a later rotation/availability calendar are **not** design blockers and may follow as implementation detail — but leaving the initial owner, ref, and handoff undefined **at activation** is a blocker. No response-time promise or automatic notification is implied.

## 9. Open decisions left to the process / Tracey (not assumed here)

- The adoption/setup record contents of §8 (process decisions for the first version).
- Any future standing coordination-merge authorization — a separate, explicitly-decided policy proposal if ever wanted (§3); not requested here.
- Architect approval, merge, policy/scope/ownership changes, and clearance of rev19 or any implementation remain Tracey's and are **not** granted by adopting this register.

## 10. Acceptance for this revision (for the reviewer)

F1/F2/F3/F5 remain closed as Aster confirmed for rev2. The new change answers **R2-1** — `sent` transmission attestation — in both this proposal (§1, §4) and the amendment. Walk Aster's four transmission paths against this revision:

1. Prepared packet + delegation request, **no transmission evidence** → `sent` **pending**.
2. A **lead actually transmits** and attests that action → `sent` may be recorded by that lead as attester; access still pending.
3. **Tracey transmits** and supplies an attributable statement → the lead publishes a pointer with **Tracey as transmitter/attester and the lead as publisher**; no impersonation.
4. The assignee later **acknowledges access** to the pinned scope → a **separate** `accepted`/access event records it.

These are author changes consolidating Aster's requested R2-1 correction; if this revision is found to be materially coauthored rather than consolidated, another eligible non-author must clear it.
