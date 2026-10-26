# Archive

Retired trees kept for reference. Nothing here is built, imported or deployed.

- `apps-ide-src-2026-10-20/`: the earlier duplicate of the IDE UI, moved from `apps/ide/src` on 2026-10-20 under STP-0001 proposal P6, with the Architect's confirmation. Every file in it has a newer counterpart in the root `src/`, which is the only canonical UI tree. Restore with `git mv archive/apps-ide-src-2026-10-20 apps/ide/src` if ever needed.

## 2026-10-24 Housekeeping (low-risk group)

Moved here by Verus at the Architect's direction (docs/HOUSEKEEPING_LEDGER.md):
- `root-misc-2026-10-24/grok_logs.csv` (H5): a Grok log export from the top level.
- `components-2026-10-24/AlchemistReliquary.tsx` (H21): unused; the app uses `AlchemistReliquaryModal.tsx`.
- `apps-2026-10-24/` (H26): the emptied `apps/` folder and its Totems; its code was archived on 2026-10-20.

## 2026-10-24 root tidy (housekeeping/root-tidy)
- `root-docs-2026-10-24/`: the older copy of each document that had two. Living Development Environment Spec: the root copy (626 lines) was archived and the docs/ copy (1,155 lines) kept. Operating Standards: the docs/ copy (v0.1) was archived and the root copy (v0.3) moved to docs/.
- `scripts-2026-10-24/`: one-off Stellar build and verify scripts that had been left in the root.
- Six `.obj` compiler output files were deleted from the root and are now ignored.
