# Repository guide

Start with the [project overview](../README.md). For local setup, model-provider configuration, and authentication, use the [gateway guide](../server/README.md).

## Find your next step

| Need | Start here |
|---|---|
| Understand the workspace and Element hierarchy | [IDE orientation](IDE_ORIENTATION.md) |
| Find modules and acceptance targets | [Hackathon Totem](../totems/HACKATHON_TOTEM.md) |
| Read decisions and proposals | [STP records](../.aegis/stp/) |
| Coordinate engineering work | [Claims](../.aegis/claims.md) and [peer lanes](../.aegis/lanes/) |
| Understand current repository continuity | [Root Totem](../ROOT_TOTEM.md) and nearest folder Totem |
| Understand Element connections | [CORE connection standard](CORE_CONNECTION_STANDARD.md) |
| Find Element descriptions | [Element catalog](CORE_ELEMENT_CATALOG.md) and [Luminary Knowledge Pack](LUMINARY_KNOWLEDGE_ELEMENTS_v0.1.md) |
| Review governance storage integration limits | [Durable admission notes](../server/governance-record/ADMISSION.md) |
| Review cleanup decisions | [Housekeeping ledger](HOUSEKEEPING_LEDGER.md) |
| Find preserved older material | [Archive guide](../archive/README.md) |

## Read records in context

STP approvals and later appended decisions determine implementation scope. A draft proposal or older design document is not proof of current behavior. Check its revision, later decisions, source, and validation evidence. Historical Totems, lanes, and hash-bound records stay append-only.

The frontend entry point is `src/main.tsx`; the gateway entry point is `server/index.ts`. Archived application trees are historical references. General application CORE/Orb/Satellite architecture is separate from the development team's DataQuad infrastructure.

## Branch lifecycle

Keep branches with open PRs, dependent work, unique commits, or attached worktrees. Delete completed remote branches only after checking their exact heads are ancestors of `main`, no open PR uses them, and no worktree is attached. A merged PR remains available for review after its branch is deleted.

Unmerged or divergent branches require inspection before retirement. Preserve valuable experiments with an explicit reference and outcome record. Do not delete a branch merely because it is old. Keep automatic deletion disabled while shared and dependent branches remain in use.
