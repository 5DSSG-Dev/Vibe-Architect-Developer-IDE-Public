# Vibe Architect Developer IDE

**Vibe Architect** is the AEGIS relational development environment. The Vibe Luminary is the planned AI engineering and learning presence, replacing the unworked Buildmaster product concept.

The repository is being reviewed section by section for the hackathon. Existing views include demonstrations and incomplete integrations; the product name is not a readiness claim.

**Ownership:** Copyright Â© 2023-2026 5D Service Solutions Global, LLC. All rights reserved. This is proprietary software; see [LICENSE](LICENSE).

## Start here

- Read [ROOT_TOTEM.md](ROOT_TOTEM.md), then the nearest Folder Totem and your own agent lane before working.
- Follow [the Luminary inclusion review](docs/VIBE_LUMINARY_INCLUSION_REVIEW_2026-10-20.md) for the seven review sections and unresolved architecture choices.
- See [server setup and configuration](server/README.md) for gateway/authentication requirements. Production additionally requires the explicitly injected Stellar bridge; the standalone entry point does not supply it.
- Use `npm install`, then `npm run dev` for the same-origin development gateway. Development requires `NODE_ENV=development`; configure local settings according to the server documentation and `.env.example`.
- Checks: `npm run test:app`, `npm run test:gateway` with `NODE_ENV=test`, and `npm run build`. Native/compiler and external-service readiness are separate checks.

## Naming and continuity

Product: **Vibe Architect Developer IDE**. Short name: **Vibe Architect**. npm package: `vibe-architect-developer-ide`. Repository naming target: `Vibe-Architect-Developer-IDE`.

Earlier names include AEGIS Vibe Architect Developers Kit and AEGIS Vibe Architect 4D IDE. Historical Totems, hash-bound evidence, archive paths and established browser storage keys retain their original identifiers. Existing source filenames remain valid reference paths.

## STP and Totem

STP means **Situation, Target, Proposal**: establish a neutral Situation, describe the Architect's ideal Target, and use the illuminated gap to shape the Proposal. STP is being designed separately with Verus as an installable extension.

Architect direction is to integrate STP through **its own Totem lane**, alongside other writer-owned lanes. Current local planning lane: `.aegis/lanes/stp.md`. Its presence records the integration direction; it is not an implemented extension, automated synchronization service, or authorization to execute proposals. Extension lane schema and automated writes remain to be designed with Verus. Each writer preserves ownership and appends rather than rewriting prior records.
## Rename status — 2026-10-20

The remote repository is now https://github.com/thelight1122/Vibe-Architect-Developer-IDE and local origin uses that URL. Branding and package metadata are updated locally; these edits have not been committed or pushed.

Windows blocked renaming the open checkout because another process is using it. The current folder remains `G:\AEGIS_DEVELOPMENT_REPOS\AEGIS_VIBE_ARCHITECT_DEVELOPERS_KIT`. After closing workspace terminals, previews and editor/peer sessions holding that folder, run this in a separate PowerShell window:

```powershell
Set-Location -LiteralPath 'G:\AEGIS_DEVELOPMENT_REPOS'
if (Test-Path -LiteralPath 'G:\AEGIS_DEVELOPMENT_REPOS\Vibe-Architect-Developer-IDE') {
    throw 'Destination exists; inspect it before moving anything.'
}
Move-Item -LiteralPath 'G:\AEGIS_DEVELOPMENT_REPOS\AEGIS_VIBE_ARCHITECT_DEVELOPERS_KIT' -Destination 'G:\AEGIS_DEVELOPMENT_REPOS\Vibe-Architect-Developer-IDE' -ErrorAction Stop
```

Then reopen the new folder in VS Code and point any external shortcuts/workspace entries to it. Review stale linked-worktree registrations separately; the product rename did not repair or prune them.


### Rename completion — 2026-10-20

The Architect completed the local folder move. Git top-level and origin were verified at `G:\AEGIS_DEVELOPMENT_REPOS\Vibe-Architect-Developer-IDE`. The earlier blocked-move instructions above are historical and no longer pending. Local rename edits remain uncommitted.

