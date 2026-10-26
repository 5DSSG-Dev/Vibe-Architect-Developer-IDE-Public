# IDE Continuity Lanes

This directory is the **IDE-domain** Totem continuity surface for the Vibe Architect Developer IDE. It is deliberately **separate** from the Codex-owned native Stellar **Language** chain (`native/stellar/v0_1/evidence/stellar-totem-*.json`, the `STELLAR-TOTEM-*` records). The two surfaces share no id namespace and no hash head.

## Domain split

| Surface | Writer | Records | Location |
| --- | --- | --- | --- |
| Language chain | Codex | `STELLAR-TOTEM-####` | `native/stellar/v0_1/evidence/` |
| IDE lanes | Claude | `IDE-TOTEM-C-####` | `totems/shards/totems.claude.jsonl` |
| (future writer) | — | `IDE-TOTEM-<W>-####` | `totems/shards/totems.<writer>.jsonl` |

`C` in the id is the writer tag (Claude). Lane ids are **lane-local**; they are not globally sequenced against the Language chain or any other lane.

## Contract

Each line of a `shards/totems.<writer>.jsonl` file is one UTF-8 JSON object conforming to `stellar.totem-continuity/v0.1` (`native/stellar/v0_1/schemas/stellar-totem-continuity-v0.1.schema.json`), validated by `src/stellar/totemContinuity.ts`.

This combines the ProntoPC Totem Communications Pipeline lane topology (writer-owned shards, append-only, no writer edits another's lane) with the AEGIS validated, hash-chained record contract:

- **Append-only.** A record is added, never rewritten. A later understanding is a later record that names the earlier one.
- **Per-lane hash chain.** `previousIntegrityHash` links each record to the prior record *in the same lane* (`null` for the lane's genesis record). `integrityHash = sha256(canonicalJson(record without integrityHash))`, using the repo's `canonicalJson`.
- **Writer ownership.** A writer appends only to its own lane and never edits, reorders, or relabels another lane's records.
- **Hash-bound referents.** Every `artifacts[]` / `provenance[]` entry binds a file by SHA-256; a record's source-state claim holds only while those bytes hold.
- **Non-force.** A Totem illuminates only. It authorizes no commit, push, deployment, signing, service mutation, or canon-SSOT change.

## Verify

Re-derive each lane's chain by recomputing `integrityHash` per line and confirming each `previousIntegrityHash` equals the prior line's `integrityHash`, then compare each bound referent to present bytes (`HOLDS` / `DRIFT` / `MISSING`). See `stellar-totem-lineage-v0.1.md` for the record semantics.
