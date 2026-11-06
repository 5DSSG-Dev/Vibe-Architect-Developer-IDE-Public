# Combined Q4 UI and Luminary candidate — November 5, 2026

Status: implemented and engineering-validated candidate; independent review and Architect acceptance remain separate. No existing demo runtime was switched.

## Source lineage and scope

The branch `codex/current-ui-integration-20261105` starts at the preserved Q4 commit `bf5868fb6e2214f275ee913b63fe73fdd0fa57ef`. Only the intended six-file `3e5f47d8bb6e70796a00529704cb2beec76a3e37` milestone delta was reconciled onto it. Four product files merged automatically. Two Totem conflicts were resolved by retaining complete Q4 history and appending the exact milestone additions. Published preservation branches were not rebased or overwritten.

Additional candidate changes: presence-lifecycle regression; current-source/runtime map and preservation summary; a four-class Header spacing correction discovered by desktop rendering; append-only continuity. No generation, acceptance, authentication, provider, or governance logic was changed by this reconciliation.

The split Build/Preview component, AppBuildJourney header portal, session engine, production recovery engine, and reasoning transport were checked against Q4 Git blobs and remain unchanged. The interview component retains its Q4 control flow and receives only milestone presentation changes. Header changes are the separately recorded spacing correction.

## Verification

- Full combined suite under `NODE_ENV=test`: 291 gateway + 461 app = 752 passed, zero failed/skipped.
- After the Header class correction: all 461 app tests passed again; complete TypeScript/server/Vite build passed. Gateway source was unchanged. Existing bundle-size warning remains.
- Isolated built preview on loopback 3145, separate browser context, explicit intercepted presentation fixtures, zero provider calls: named interview reply rendered; interview survived reload; Restart archived the conversation; Restore previous interview restored it; header ToDo rendered in the banner; general-host reply rendered as a named bubble.
- Header geometric checks at desktop widths 1024, 1280, 1440 and 1920: no branding/ToDo/resource-group overlap and no horizontal document overflow. Desktop is the priority; no new mobile gate.
- An initial exact-text browser locator timed out because the role label and message share a wrapper. Inspection showed the preserved text still present; the corrected region-text assertion and actual restart/restore actions passed. No source was changed to satisfy that locator.
- Initial preview API 404s and intentionally unavailable fixture backend routes are retained as diagnostics, not live failures or provider successes. The preview has no real backend. This packet does not validate live generation, launch, a new independent model audit or a production runtime.

Private logs, source-hash checkpoints and screenshots live in the current Codex visualization session's `reconciliation/` directory. No fixture-generated app or conversation is published as real execution evidence.

## Preservation and recovery

The preservation ledger covers both Git families and retains unresolved private/runtime/ignored material explicitly. No folder is cleared for removal. See `WORKTREE_PRESERVATION_SUMMARY_2026-11-05.md`.

`BASE-full` stores pinned Q4 source bytes for all owned rollback paths, including Header; new candidate-only paths are represented as absent. `FINAL` stores the complete validated candidate bytes. Original `BASE` and `CANDIDATE` snapshots remain immutable historical checkpoints; use the complete baseline/final pair for current rollback.

The external `Restore-Checkpoint.ps1` previews by default, applies only named source/document paths, and refuses changes since the latest checkpoint. Append-only lane/Totem histories and all unrelated/runtime/private files are outside rollback ownership. Reversible operations were exercised on scratch files, not by disrupting a live checkout. The original Q4 and bubble commits remain independently recoverable.

## Next disposition

Linq reviews the pinned candidate diff independently, distinguishing source inspection from these engineering receipts. The source/runtime map proposes an obvious engineering location and a separately built physical no-HMR demo artifact with explicit source/artifact/process binding. Existing demo gateways, environment, generated apps and private state were not replaced. Historical cleanup and demo activation require their own concrete, evidence-backed disposition; candidate publication alone does not perform them.
