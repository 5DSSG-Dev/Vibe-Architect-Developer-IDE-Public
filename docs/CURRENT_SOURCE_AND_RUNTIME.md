# Current engineering candidate and runtime map

Status: combined engineering candidate; not Architect-accepted or demo-activated.

## Source of this candidate

- Engineering worktree: `G:/AEGIS_DEVELOPMENT_REPOS/Vibe-Architect-Developer-IDE-current`.
- Branch: `codex/current-ui-integration-20261105`.
- Required ancestor: `bf5868fb6e2214f275ee913b63fe73fdd0fa57ef` on `codex/q4-ui-followup-20261104`.
- Scoped incoming milestone: `3e5f47d8bb6e70796a00529704cb2beec76a3e37` on `codex/luminary-polish-20261105`.
- Identify the exact candidate with `git rev-parse HEAD`; folder names and ports alone do not establish a revision.

The six-file speech-bubble delta was applied by three-way reconciliation onto the preserved Q4 source. The only conflicts were append-only Totems: the Q4 bytes were preserved and the milestone additions appended. Interview session/restart/restore behavior, header ToDo portal, split preview layout, capability preflight and reasoning-budget repair remain part of the source. A regression checks the added presence notification lifecycle.

A separate desktop check found the inherited header ToDo overflowing its available width at 1280px. Four presentation-class adjustments reserve its width, defer the optional branding badge/subtitle to wide desktop, and show the resource card from 1280px upward. Desktop widths 1024, 1280, 1440 and 1920 were checked for header overlap/overflow. This is an explicit correction beyond the incoming milestone; it does not move the ToDo out of the header or alter resource calculations.

## Locations that must not be mistaken for this source

| Location | Role and limitation |
| --- | --- |
| `Vibe-Architect-Developer-IDE-public` | Git common repository and an older governance worktree; not the current UI source |
| `.claude/worktrees/pr-52-merge-review-b501f1` | Preserved Q4 source at `bf5868f`; private generated records may remain there |
| `.claude/worktrees/ide-completion-552eb7` | Older demo checkout with the separate bubble milestone; lacks the complete Q4 follow-up layer |
| `vibe-luminary-polish-20261105` | Separate older-baseline bubble worktree, with local-only development topology configuration |
| `vibe-demo-frozen-20261104` | Junction to the editable Q4 worktree; not a frozen independent copy |
| `vibe-demo-runtime-20261104` | Physical compiled runtime copy; not a Git checkout or automatically the active demo |

## Proposed operating arrangement

Use this worktree for the reconciled engineering candidate, with one writer per overlapping batch. Keep the already-published Q4 and bubble references unchanged. Historical worktrees are retained until their individual preservation/disposition entries are reviewed.

Promote an exact reviewed source revision to a separately built, physical demo artifact directory with a manifest containing source SHA, dirty-state status, dependency-lock hash and artifact hashes. Serve compiled assets without HMR. Runtime configuration and any local/private state need separate reconciliation; do not copy credentials or generated conversation records into Git. The runtime receipt should identify the actual process, endpoint, artifact and source revision together. This is a proposal, not an instruction to restart or replace an existing gateway.

Linq independently reviews pinned source/diffs and identifies direct inspection versus Lumin execution receipts. The Architect decides acceptance and demo activation. A passing build or matching folder name is not activation evidence.

## Validation and recovery

Use established `NODE_ENV=test npm test` and `npm run build`, plus meaningful focused or desktop checks as warranted. Report actual results; no invented test-count target or implicit live-provider validation. Desktop is the demo priority.

The base commit and both incoming preservation refs remain intact. Private evidence under the current Codex visualization session's `reconciliation/` directory includes the per-checkout preservation ledger and scoped backups. Credential-shaped paths, ignored/generated runtime contents and oversized untracked data are recorded as unresolved, not declared backed up. No directory is cleared for removal by this map.

Each candidate checkpoint records source hashes and a scoped patch. Undo must act only on a clean candidate checkout or refuse divergent later edits; never reset an unrelated worktree or erase append-only records. No old checkout, branch, runtime, link or dependency directory is removed as part of candidate reconciliation.
