# Vibe Architect Build Team: Systems and Lanes

Created: 2026-10-24 by Verus (Claude Code) at the Architect's direction.
Status: Draft for the Architect's approval. Nothing here is binding until the Architect accepts it.

## The team

| Role | Who | Lane file |
|---|---|---|
| Architect | Tracey Prutch | (approves, verifies, decides) |
| Peer A | Claude Code, account 1 (Verus) | `.aegis/lanes/verus.md` |
| Peer B | Claude Code, account 2 | `.aegis/lanes/claude-2.md` |
| Peer C | Codex | `.aegis/lanes/codex.md` (existing) |
| Peer D | ChatGPT Work | `.aegis/lanes/chatgpt-work.md` |

Peer B and Peer D may take their own names; record the name in their lane's first entry.

## Guiding principle

Every screen is understandable to someone who has never coded, and nothing blocks someone who has. Objects are named by what they do (the Library Orb holds documents). Every system below is checked against this.

## The four Systems

The Systems follow the Architect's seven review sections (ROOT_TOTEM.md, 2026-10-20). Section 1, UI Flow and Design, is largely complete under STP-0001 and has no dedicated peer; changes to it go through the claim rule below.

### System 1. POD Contracts and Connection (Peer A, Verus)

Review section 5, POD Architecture Engineering. This is the foundation the other systems build on.

- One published schema for every Element type, replacing the four lists that disagree today (relationEngine `CategoryType`, three `SceneEntityKind`, admin `ComponentKind`, Totem `TotemKind`).
- The Umbilical standards (Pulse, Record, Archive, Interface, Conduit), each sized by function: bandwidth, flow, reach, health signals.
- The Orb manifest: function name, Umbilical standard, capabilities, resource needs.
- The handshake asking "Umbilical spec, please" at step 3, and bandwidth added to the CORE budget.
- Later: the Annex and QuarterMaster recovery chain (QuarterMaster, Orchestrator, Tumbler, Dispatch, Probe, Triage Actuator).

Owned paths:
- `src/engine/connectionRuntime.ts`, `contractStore.ts`, `capabilityRegistry.ts`, `resourceAllocator.ts`
- `src/contracts/` (new: schema, Umbilical standards, Orb manifest)
- `ORBS/`
- `docs/CORE_CONNECTION_STANDARD.md`, `docs/CORE_ELEMENT_CATALOG.md`

STP: STP-0003 · Pod Contracts and Umbilical Standards (Peer A plants it).

### System 2. Luminary and Project Creation (Peer B, Claude Code 2)

Review sections 6 (AI Integration and Luminary Presence) and 3 (UX Operability).

- The start menu: Open existing project / Start new.
- The Luminary's scripted new-project flow: app type, CORE crystal, starter Orbs connected and activated, more Orbs, Portals (API key entry, signup links in the built-in browser), name and save, arrive in the Aether. Each script step carries a Totem note that it needs Voice when live.
- API keys stored in the OS keychain, never in the project file.
- Continues the hackathon milestone M2 in STP-0002.

Owned paths:
- `src/components/LuminaryHost.tsx`, `Wayfinder.tsx`, `RightPanel.tsx`, `WorkRequestPanel.tsx`, `BuiltInBrowserModal.tsx`
- New start-menu and project-creation components
- `server/` (model gateway)
- `docs/VIBE_LUMINARY_*`

STP: continues STP-0002; plants a new STP for the start menu and project-creation flow. Peer A recorded STP-0002 so far; Peer B appends a note taking it over.

### System 3. 3D Elements and the Aether (Peer C, Codex)

Review section 2, 3D Element Setup and Function. Codex already carries the ThreeRuntime adoption history.

- Optimize the 131 `.glb` models into `public/assets/models/optimized/`. Originals untouched. No triangle reduction on the 33 rigged models.
- A CORE crystal per app type, Umbilical visuals per standard (thicker for Conduit, the broken model for a failed handshake), Portal and Core objects in the scene.
- Wire the Actuator figures (Scouts, Makers, Builders, Assessors, Examiners) and their rigs.

Owned paths:
- `src/three/`, `src/components/ThreeCanvas.tsx`, `EnvironmentView.tsx`
- `public/assets/models/` and any model-optimization script under `scripts/`

STP: Peer C plants one for 3D Elements and the Aether.

### System 4. Governance, Documentation and Assurance (Peer D, ChatGPT Work)

Review sections 4 (Documentation) and 7 (Governance and Alignment).

- One orientation page: the structure (CORE, Orchestrator, Dispatcher Orb, Satellites, Actuators, Annex, QuarterMaster), which document is current for each topic, and which files are duplicates, evidence or scratch.
- The Annex recovery procedure map, step by step, for Peer A to build from.
- Function-name glossary (Library Orb, Memory Orb, and so on) used by every system.
- Hackathon readiness: Official Rules check (model requirement, pre-existing code), deploy reachability on Cloudflare Pages.
- Independent review: checks other peers' work against their STP Target, not against their own reports. No peer verifies its own work.

Owned paths:
- `docs/` except the files owned above
- `README.md`

STP: Peer D plants one for Governance and Documentation.

If ChatGPT Work cannot run the repo's CLI tools locally, Peer D drafts and another peer or the Architect writes the entries through `aegis-stp`, recording Peer D as the author.

## Shared files (claim required, short holds)

`src/App.tsx`, `src/engine/relationEngine.ts`, `package.json`, `package-lock.json`, `src/index.css`, `ROOT_TOTEM.md`, `.gitattributes`.

`relationEngine.ts` holds both the type definitions (System 1) and the catalog (System 2 and 3 consumers). System 1 leads changes to its types once `src/contracts/` exists.

## How each peer works

The full initialization procedure — audit your System into its folder Totems, then map Situation (IS), Target (Ideal), Gaps and Proposal into your STP — is in `docs/PEER_SYSTEM_INITIALIZATION_GUIDE.md`. Read it before your first edits. The steps below are the short form.

1. Read `ROOT_TOTEM.md`, the folder `TOTEM.md`, your lane, and `.aegis/claims.md`.
2. Plant your STP for your System with `aegis-stp new "<title>"`: Situation (what is true now, with evidence), Target (what it will be), Gaps, and Proposals (how it gets there). The Architect approves before execution.
3. Work on your own branch and worktree, named `<peer>/<stp-number>-<slug>`.
4. Claim before you edit (below).
5. After each turn, append to your lane: work done, uncertainty, verification.

## Claims: no one codes on top of another peer

`.aegis/claims.md` is the shared marker board. It is append-only.

Before editing any file outside your owned paths, or any shared file:
1. Read `.aegis/claims.md`. If an open CLAIM covers your path (no matching RELEASE), do not edit it. Write to the claimant's lane and wait, or ask the Architect.
2. Append a CLAIM line, commit it, and push it before you start editing.
3. Append a RELEASE line when your change merges or you abandon it.

Line format:

```
CLAIM   | <utc> | <peer> | <paths> | <STP ref> | <branch> | <expected release>
RELEASE | <utc> | <peer> | <paths> | <STP ref> | <merged | abandoned | handed to <peer>>
```

A claim older than 24 hours with no lane activity can be released only by the Architect.

Owned paths need no claim for their owner. Another peer working in someone else's owned paths must claim them and tell the owner in the owner's lane.

## Order of work

1. System 1 publishes the schema and Umbilical standards first. Systems 2 and 3 read from it rather than inventing their own types.
2. Systems 2 and 3 build against it in parallel.
3. System 4 reviews each system against its STP Target as work lands.

Hackathon timing: the Meta hackathon runs Oct 26 to Nov 4. STP-0002 finding S11 notes that the rules on pre-existing code are unpublished. System 4 checks the Official Rules before any peer treats pre-Monday code as part of the entry.
