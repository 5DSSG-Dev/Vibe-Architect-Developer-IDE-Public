# Proposal rev2: shared squad handoff lane (`.aegis/lanes/squad.md`)

Revised by Claude (Verus), 2026-11-01. This supersedes the reconciled points of the rev1 proposal (`squad-lane-proposal-2026-11-01.md`, pinned `018e832` / blob `4cb7b37`); rev1 stays in this folder unchanged as the record. This revision answers Aster's independent review (`squad-lane-peer-review-aster-2026-10-31.md`, commit `fd74139`, branch `aster/squad-lane-independent-review`), which returned **changes requested; clearance withheld** with findings F1–F5, and folds in Tracey's routing direction relayed by Lumin on PR #34 (comment `6553571922`).

Still a **proposal draft** — nothing here is a working parameter until independently cleared and approved by Tracey. Author = Verus (Verus–Libra pair); the required independent clearance is a non-author outside that pair (Aster, via the lead-to-lead route in §1). Aster's review of rev1 and my consolidation of it are themselves subject to outside-pair examination; because I own this revision, I do not clear my own resulting proposal.

Baseline main for every code/rule reference below: `78bd423`. No product code is touched by this proposal.

---

## 1. Routing: lead-to-lead for all cross-squad review (Tracey's direction)

Direct assistant-to-assistant handoffs caused confusion, so all cross-squad review **requests and responses** now route through the two leads:

- **Lumin → Verus → Libra → Verus → Lumin**
- **Verus → Lumin → Aster → Lumin → Verus**

Rules, as directed:

- Either lead may conduct the review directly when eligible (non-author, outside the producing pair); otherwise delegation stays **within the receiving lead's own pair**. Requests for Aster route to Lumin; requests for Libra route to Verus.
- Tracey receives **one complete lead-to-lead packet** when a bridge is needed, not separate assistant assignments and responses.
- Before delegating, the receiving lead checks the primary artifact, the exact revision, the brief, the scope, and the expected return are all present and accessible.
- The assistant returns findings to **their own lead**. That lead examines evidence and completeness and returns **one consolidated response** to the requesting lead, **retaining the reviewer's attributed verdict, unresolved questions, and any disagreement** verbatim.
- Routing oversight **must not** prescribe the conclusion, suppress findings, or turn a coauthor into an independent reviewer.
- Final review still requires an eligible non-author outside the producing pair. Architect approval and merge remain Tracey's separate decisions.

This routing is the "authorized bridge" referenced in §4 and §5: the bridging lead is the attester of `sent`, never of the assistant's own transitions.

## 2. Purpose and boundaries (unchanged intent)

Give each pair visibility into cross-pair work without routing all *context* through Tracey, while the *coordination path* runs lead-to-lead per §1. It **complements** — does not replace — the claims board (path ownership) and the cross-pair review rule. It is not a second claims board, not an approval surface, not a place for findings (those stay in peer lanes / review artifacts), and not an enforcement mechanism. It asserts no background subscription, automatic delivery, or enforcement.

## 3. First version is option 2: a published coordination branch, one writer at a time (resolves F1)

rev1 recommended a standing Architect merge authorization (its option 1). Aster showed that wording left an **ALL-work-review bypass**: a false `accepted`/`reviewed` line could reach `main` under standing metadata authority with the required outside-pair review deferred to a code merge that need never happen (F1). The merged working parameters require outside-pair non-author review for documentation and review deliverables, not only code.

**rev2 adopts Aster's recommended option 2 as the first version** and drops the standing-merge recommendation entirely:

- The register lives on a **dedicated, published coordination branch**, based on `main`, with **one coordinated writer at a time**.
- This gives pre-merge visibility **without first deciding any standing merge authority**. Nothing merges to `main` under a metadata exception.
- A standing coordination-merge authorization is a **separate review-policy question** that, if ever wanted, must be proposed and decided explicitly on its own — it cannot be smuggled into this register. It is out of scope here.
- Any merge of this branch to `main` remains a normal merge: Tracey's decision, after the required review. No peer status line is or impersonates an Architect approval/merge action. If Tracey later delegates a merge, that delegate **cites Tracey's standing authorization explicitly** rather than recording it as Tracey's personal action (resolves rev1's "merge stays Tracey's recorded action" ambiguity, F1).

Tradeoff (as Aster noted): this adds branch and read discipline and pending-`main` reconciliation, and does not eliminate required review. That is the intended cost for a safe v1.

## 4. Event model: revision-aware, with named attesters (resolves F2, F3, F4)

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

Each event is a new appended line carrying a **stable event ID**, the **assignment + scope revision** it refers to, the **attester**, the **predecessor / expected prior state**, the **exact input/output reference**, and an **evidence pointer**:

```
<EVENT-ID> | <ASSIGNMENT-ID>@<scope-rev> | <status> | after:<predecessor-event-ID|none> | ref:<repo@full-commit:path | artifact-id/hash> | attester:<peer> | publisher:<peer|same> | <UTC> | <evidence pointer>
```

- **Current state is derived by validating authority and revision**, not by taking the latest physical line. A stale or out-of-revision event **remains in history but cannot advance or regress a different revision** (F2).
- **Concurrent competing transitions** are marked **unresolved**; the responsible coordinating lead appends a **resolution event referencing both** and obtains the required attestations/review. Timestamps and line position never decide truth. Never force-push or delete historical events to reconcile — rebase reconciles Git text only (F2).

Statuses and their **sole authorized attester** (F4):

- `prepared` — brief written. Attester: **requester**. Not proof of delivery.
- `sent` — bridged to the assignee. Attester: **the authorized bridging lead** (§1). A prepared brief alone does not authorize `sent`.
- `accepted` / `declined` / `renegotiated` — Attester: **the assigned peer themselves**, confirming access + scope. A lead cannot mark these on a peer's behalf.
- `returned` — deliverable produced. Attester: **the assignee**; records the output `repo@full-commit:path`.
- `reviewed` — Attester: **the designated non-author reviewer**. Records reviewer independence, the **exact reviewed output**, the review artifact pointer, and a **verdict: clear / changes-requested / inconclusive** (F3).
- `consolidated` — Attester: **the author/consolidator**. Closes **only the administrative response to the specified findings**; it **identifies the resulting revision and its own review requirement**. It **never transfers an earlier revision's clearance to a new revision**, and is not terminal for a materially changed artifact — a new substantive revision returns to the required non-author reviewer (F3).

**Assignment workflow, technical clearance, and Architect approval/merge are three separate dimensions** and are never conflated by a status line (F3). Architect approval and merge stay Tracey's recorded actions, never a peer status line.

### Canonical attestation vs. register pointer (F4)

The **peer-authored acknowledgment / findings document remains the canonical attestation**. Register lines **index exact evidence**; they do not create a second independent fact. A coordinating lead may **publish an attributed pointer** (`publisher:` field) **without claiming to be the attester** (`attester:` field). Because peers may share account access, these labels are procedural attribution, not cryptographic proof of identity — the register says so plainly.

No peer's own lane is the **only** permissible evidence when it is unavailable: an **exact, accessible review/return document or an authorized bridged statement** can serve as the canonical attestation **when identified explicitly** by `repo@full-commit:path` or approved artifact id/hash. (Aster's own review, returned through the §1 route, is an example: it attests its own return without any shared-lane write.)

## 5. Accessibility and read convention (resolves F5)

A recorded pointer proves a reference exists; it does **not** prove recipient access or that another peer was informed.

- Every input/output/evidence pointer is **repo + full commit + exact path**, or an approved artifact identifier/hash. Publish all non-private required inputs to the repository; a local Downloads path alone is **not** a canonical pointer (a downloadable copy for a human is a convenience *in addition to* the repo pin, never a replacement).
- **Successful access is recorded separately from publication.** Each peer checks the designated coordination ref **at assignment start/resume and before any dependent work**, pins the read commit, and acknowledges the relevant events. Missing acknowledgment stays **pending**.
- **Pair leads reconcile unacknowledged dependencies.** Urgent handoffs use the §1 authorized bridge. Publication means *available*; notification, receipt, and access remain distinct and are not assumed.

## 6. Secret / payload exclusion (F5)

Both register and lane updates **exclude** secrets, private-suite payloads, and raw adversarial results. Use only approved **opaque metadata/pointers**, preserving independent first runs. Sensitive category names and patterns never appear here.

## 7. What is preserved from rev1 (Aster's "what is sound")

The assignment-register / claims-board / peer-evidence split (one source of truth per fact); `prepared` distinct from `sent`; `accepted` belonging to the assignee; append-only history; path claims kept separate on the claims board; explicit proposal-status and Architect-decision authority. A review artifact may stay in `docs/team-drafts/` with the register pointing to it; findings are **not** duplicated into a lane. Assignment ownership does **not** release an edit claim — the live broad `server/**` claim still needs its scoped handoff, which this proposal does not supply (Verus owns that separately).

## 8. Open decisions left to the process / Tracey (not assumed here)

- Exact coordination branch name, writer-rotation convention, and availability/escalation timing (process decisions for the first version).
- Any future standing coordination-merge authorization — a separate, explicitly-decided policy proposal if ever wanted (§3); not requested here.
- Architect approval, merge, policy/scope/ownership changes, and clearance of rev19 or any implementation remain Tracey's and are **not** granted by adopting this register.

## 9. Acceptance for this revision (for the reviewer)

Walk Aster's five concrete paths against this exact revision: F1 — no ALL-work-review bypass (no standing merge authority in v1; every revision reviewed before any merge); F2 — revision-aware authority and conflict handling (stale events cannot move a different revision); F3 — consolidation separated from new-revision clearance; F4 — canonical attestations and per-status actors named, publisher ≠ attester; F5 — accessible pins plus a separate read/receipt convention. These are author changes consolidating Aster's requested changes; if this revision is found to be materially coauthored rather than consolidated, another eligible non-author must clear it.
