# Team drafts (governance and IDS)

Working drafts that lived only in a local Downloads folder, committed so that every session, local or cloud, can read them. They are records of where the design stood, not approved decisions. The approved decisions are in `.aegis/stp/` (STP-0005 for governance).

| File | What it is |
|---|---|
| `build-and-run-plan-rev16-2026-10-30.md` | The one operative governance plan (sections F, C1, G, acceptance items and build order). Section G is the independent jailbreak gate. |
| `ids-writer-options-for-lumin-2026-10-31.md` | The IDS writer options (hosted Meta writer, larger local model, frame with a slot, library) put to Lumin. |
| `ids-suggest-library-draft-2026-10-31.md` | The draft library of approved Suggest lines. |
| `ids-meta-writer-run-2026-10-31.md` | The first live results of the hosted IDS writer (commit e56fcaf). |

## Decided since these drafts (Tracey, 31 October, UTC)

- The IDS writer is the hosted Meta model; the Virtue gauge stays local on llama3.2:3b.
- After live trials of IDS, IDR and IDQRA, IDQRA (Identify, Define, Question, Reflect, Acknowledge) in the Luminary's own first-person voice gave the best results (da0b847 on PR #28). Every "I" statement it makes must be plainly true (02:00Z).
- The Conscience is stateless: each message is read on its own, in the present. The revision count and the append-only lineage are kept outside it (02:08Z).
- Still open: whether the two-revision limit stays, and where the protected-operation boundary check sits.
