# Worktree preservation ledger summary — November 5, 2026

This is an engineering inspection receipt, not independent review or permission to remove a checkout.

The initial audit found 28 top-level Vibe-named folders and 27 registered public-repository worktrees, plus three registered checkouts in the older repository family. The isolated combined-candidate worktree adds one registered public checkout: the preservation capture therefore covers 31 registered checkouts across both families. These are different scopes and times, not contradictory counts.

The private ledger contains exact original paths, repository families/common Git directories, HEAD/branch, pending staged/unstaged/untracked states, ignored-path inventory, local-only commit discovery, link targets, backup locations, hashes and unresolved items. Original checkouts were read with `GIT_OPTIONAL_LOCKS=0`; no resets, stash operations, removals or index changes were made there by the preservation script.

## Capture result

- 31 registered checkouts inventoried; 22 had pending status entries at capture time, including continuity, generated records and the in-progress candidate.
- 173 eligible files copied to private evidence with SHA-256 hashes; staged and unstaged binary-capable patches retained where applicable.
- The two known generated-app local-only commits `df8f5eb` and `26c8f36` are preserved in a verified incremental bundle. The bundle requires its Git prerequisites; it is not claimed to be a standalone full repository archive.
- Credential-shaped paths were not read or copied. Ignored/generated/private runtime contents, links and oversized files were recorded as retained in their original locations rather than declared archived.
- 24 checkouts have unresolved preservation items, mostly ignored/private inventory. The older repository family's local-only-commit queries also failed with `fatal: bad object TOTEM.md`; its reachability needs separate diagnosis before any archival decision.
- Zero original folders, worktrees, refs, runtimes, generated applications or dependency targets removed.

## Important distinctions

The six dependency-only remnants contain `node_modules` junctions into other checkouts. `vibe-demo-frozen-20261104` is a junction to editable Q4 source, while `vibe-demo-runtime-20261104` is a physical compiled runtime copy. Names cannot establish independence or archival safety.

Pending historical work includes the staged repository-cleanup proposal, JavaScript preview, numeric-governance work, P5 screen/response files, old repository UI/3D work and continuity-only changes. Backup does not establish whether work is superseded, correct, approved, or safe to publish. Each disposition remains `retain pending reconciliation`, owner unconfirmed where not established; every `removal_cleared` value is false.

## Recovery evidence location and limits

Private evidence is under the current Codex visualization session's `reconciliation/preservation/` directory. The ledger and each checkout's manifest identify backup files/patches and their hashes. No private source snapshots or generated conversations are uploaded as part of this public summary.

Before removing any original: resolve its ledger items, assign an owner/disposition, verify recoverability including needed Git/LFS objects and relevant untracked/private state, and obtain the applicable removal authorization. A remote branch, patch or clean Git status alone is insufficient. This batch establishes preservation evidence and a combined product candidate; it does not complete historical cleanup.
