# Proposal: shared squad handoff lane (`.aegis/lanes/squad.md`)

Proposed by Claude (Verus), 2026-11-01, from the arrangement Tracey and Lumin discussed and Tracey's request for my take. This is a **proposal draft for cross-pair review and Tracey's approval** — it is not yet adopted and nothing in it is recorded as a working parameter until approved. When approved, it is implemented as the live `.aegis/lanes/squad.md`, a Root Totem pointer, and an appended section in the Collaboration Squad working parameters. Author = Verus (Verus–Libra pair), so the required independent review is **cross-pair: Lumin or Aster**.

## Purpose

Give each pair visibility into cross-pair work without routing all context through Tracey: when she bridges Libra an assignment Lumin requested, Verus can see it; when Aster works for Lumin, Verus's pair can see it. It complements — does not replace — the claims board (path ownership) and the cross-pair review rule.

## What goes where (one source of truth per fact)

This is the core discipline — the same lesson rev19 applied to the admission counter: no fact is maintained in two places that can drift.

- **`.aegis/lanes/squad.md` (new, shared, append-only):** the *assignment register* — one block per assignment plus append-only status lines. Pointers only; it does not copy path claims or findings.
- **`.aegis/claims.md` (unchanged):** path ownership. The squad entry *links* the relevant claim line; it does not restate it.
- **Each peer's own lane** (`verus.md`, `codex.md` for Lumin, `aster.md`, `libra.md`): that peer's acknowledgment, progress, findings and handoffs — as Verus and Lumin already use theirs.

## Assignment entry (template)

Recorded once per assignment, by the requester or pair lead:

```
### <ASSIGNMENT-ID> | <short title>
- requester:        <peer or Architect>
- assigned peer:    <peer>
- pair lead:        <lead responsible>
- author(s)/contributors: <names>        # for the review gate
- required reviewer: <a non-author outside the assignee's pair>
- input revisions:  <repo@commit SHAs, exact>
- scope:            <one or two lines; link the brief>
- claim link:       <claims.md line, if paths are touched>
- return point:     <branch + where the deliverable lands>
```

## Status lines (append-only, self-attested)

Each transition is a **new appended line**, never an in-place edit — `<ASSIGNMENT-ID> | <status> | <author> | <UTC timestamp> | <note/commit>`. The latest line is the current state. Rebase before push. Statuses:

- `prepared` — brief written (recorded by requester/lead). **Not** proof of delivery.
- `sent` — bridged to the assignee (for a cloud peer, this is where Tracey's bridge happens).
- `accepted` — **recorded by the assigned peer themselves**, confirming access + scope. A lead cannot mark this on a peer's behalf.
- `declined / renegotiated` — assignee can't take it or needs a scope change (added so the register reflects reality).
- `returned` — deliverable produced; **records the output commit/PR**, so the return point is verified against a SHA, not trusted.
- `reviewed` — the required non-author reviewer recorded findings (link the review artifact).
- `consolidated` — findings folded into the resulting revision; terminal, so a review thread ends cleanly (our "avoid endless acknowledgment chains" rule).

Architect **approval and merge stay Tracey's recorded action** — never a peer status line.

## Reaching every peer (one decision for Tracey)

The register is only useful if peers can read a current view, but merges into `main` are Tracey's — so if every coordination append needs a merge, we rebuild the relay bottleneck this removes. Two clean options:

1. **(Recommended)** A standing Architect authorization for the append-only coordination lane (`squad.md` and the per-peer lanes) to merge to `main` without per-update approval — it is coordination metadata, not product or governance code. Review still happens on the pushed branch before any *code* merge.
2. A long-lived shared coordination branch every peer reads and appends to, reconciled periodically.

Recommendation: option 1 — less to manage, and the content is non-executable metadata. This needs Tracey's explicit sign-off because it is a merge-policy exception; it is not assumed by this proposal.

## What this is not

Not a second claims board, not an approval surface, not a place for findings (those stay in peer lanes), and not an enforcement mechanism — it is procedural visibility, verified against commits, exactly as the working parameters already require of handoffs.
