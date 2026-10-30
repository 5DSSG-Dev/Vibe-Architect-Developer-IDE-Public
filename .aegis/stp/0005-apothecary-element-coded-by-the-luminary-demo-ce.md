# STP-0005 · Apothecary Element Coded by the Luminary (Demo Centrepiece)

Id: STP-0005
Title: Apothecary Element Coded by the Luminary (Demo Centrepiece)
Created: 2026-10-29T14:07:19.478Z
Created-By: claude

Situation, Target, Proposal. Situation records what is true, with evidence. Target records the whole ideal; milestones select from it and never overwrite it. Gaps name the distance between them. Proposal records changes that close gaps.

## Operating Rules

- Append-only. Revisions supersede earlier entries; nothing is rewritten or erased.
- Write through `aegis-stp` (CLI, VS Code extension, or MCP) so the hash chain stays valid.
- A Proposal is not approval. Only a named human Architect records Approved or Verified, through the CLI or extension.

## Append Log

### 2026-10-29T14:07:19.487Z | claude | stage
Chain-Prev: GENESIS
Chain-Hash: 391c436116c8650f52300195b0e06bea95319caca52b92362a7229839ad78f2c
Stage: Situation
Kind: stage
Channel: cli

Opened STP-0005. Stage: Situation.

### 2026-10-29T14:07:53.473Z | claude | note N1
Chain-Prev: 391c436116c8650f52300195b0e06bea95319caca52b92362a7229839ad78f2c
Chain-Hash: 48ae1bf598afd648759ba65241f9c6e3e63b7802d3b59f98d94d8184256cbc31
Stage: Situation
Kind: note
Evidence: commit:48816b5
Channel: cli

Scope and authority: on 2026-10-29 (hackathon day 3) the Architect proposed a demo segment: in the Apothecary, create an Element and code it, with the Luminary writing the code. Verus assessed it as a strong centrepiece, and the Architect answered 'ready' to Verus's offer to sketch the bridge as an STP. This is planning authorization only. Every Proposal below is a draft for review; nothing is approved or built. Baseline: origin/main 48816b5. Source inspection only; no tests, browser run or provider call this turn.

### 2026-10-29T14:07:53.777Z | claude | finding S1
Chain-Prev: 48ae1bf598afd648759ba65241f9c6e3e63b7802d3b59f98d94d8184256cbc31
Chain-Hash: 29384cf5677b1927bea4955fc1de4ae99fd1a875f8e395d4903092d044aef192
Stage: Situation
Kind: finding
Evidence: src/engine/relationEngine.ts:3-20; src/engine/relationEngine.ts:64-65; src/App.tsx:484-493
Channel: cli

Element code lives in browser state, not in repo files. An ApothecaryItem carries an optional codeFrame {language, fileName, entrypoint, source, updatedAt}; languages are TypeScript, Python, Rust, JSON and Stellar. Saving from the Apothecary code editor replaces the item in the CORE sockets and the Apothecary catalog in React state and logs CODE FRAME SAVED.

### 2026-10-29T14:07:54.110Z | claude | finding S2
Chain-Prev: 29384cf5677b1927bea4955fc1de4ae99fd1a875f8e395d4903092d044aef192
Chain-Hash: 7c34ab81cf44aafbf6dcba7d80883b3fee24f99fd64c15bf64cc8c473ea03899
Stage: Situation
Kind: finding
Evidence: src/components/CodeEditorOverlayModal.tsx:10-56; src/App.tsx:801-809
Channel: cli

The Apothecary code editor (CodeEditorOverlayModal) is opened from INSPECT_CODE. It edits codeFrame.source as text, validates JSON when the language is JSON, and saves through onSaveCodeFrame. It has no Luminary hook: no ask, no proposal, no diff view.

### 2026-10-29T14:07:54.445Z | claude | finding S3
Chain-Prev: 7c34ab81cf44aafbf6dcba7d80883b3fee24f99fd64c15bf64cc8c473ea03899
Chain-Hash: d6740127c2d35da63bfece56ae2c849a867f7b30cbf940bb137923da1ebe042d
Stage: Situation
Kind: finding
Evidence: server/luminary-executor.ts:1-25; server/luminary-executor.ts:169-176; server/luminary-executor.ts:226-228; server/app.ts:252-272
Channel: cli

The Luminary coding-task executor (P19) already gives the governance shape the demo needs: a Luminary reply carrying a luminary-change block, a fence check, its own working branch, type checks, a plain summary and diff, then the Architect accepts (merge) or declines (branch kept). But it writes repository files only, inside a fence of at most a few allowed paths, and it is off unless LUMINARY_EXECUTOR=on and loopback. It cannot write an Element's codeFrame, which is not a file.

### 2026-10-29T14:07:54.770Z | claude | finding S4
Chain-Prev: d6740127c2d35da63bfece56ae2c849a867f7b30cbf940bb137923da1ebe042d
Chain-Hash: ffe60ee7c7c5421a01ac2346d5a90def51126d7c4455f9ca59a7332dd9e310e9
Stage: Situation
Kind: finding
Evidence: src/components/OrbBuilderModal.tsx; src/App.tsx:199; src/App.tsx:389
Channel: cli

The Orb Builder (OrbBuilderModal), where a new Element is created in the Apothecary, has no Luminary or code link. An Element gets a codeFrame only through later editing.

### 2026-10-29T14:07:55.088Z | claude | finding S5
Chain-Prev: ffe60ee7c7c5421a01ac2346d5a90def51126d7c4455f9ca59a7332dd9e310e9
Chain-Hash: 805e757cb6f2a50a49008239dc4727a42839c5600d039da9b676c20645ce4b55
Stage: Situation
Kind: finding
Evidence: src/engine/coreCapabilities.ts:27-46; src/engine/coreCapabilities.ts:63-68; commit:0ac6396
Channel: cli

Docking prerequisite: until now a new Element was refused at handshake step 5 (thread_pool), because the CORE manifest budget of 8 threads was filled by the two startup Orbs (4 + 4). On PR #19 the Architect decided the CORE gets 16 threads (STP-0002 N46), which should leave room for a newly coded Element to dock. That decision is not yet on main.

### 2026-10-29T14:07:55.420Z | claude | stage
Chain-Prev: 805e757cb6f2a50a49008239dc4727a42839c5600d039da9b676c20645ce4b55
Chain-Hash: cf9a8519202e58d18435acc390248e91de94d4491005f2022c54a2bba02372c0
Stage: Target
Kind: stage
Channel: cli

Situation recorded.

### 2026-10-29T14:07:55.758Z | claude | target T1
Chain-Prev: cf9a8519202e58d18435acc390248e91de94d4491005f2022c54a2bba02372c0
Chain-Hash: 6d6c2cc13331790936032f09865f0663a3f9bc10a72b80f8dbe6c2a390b57bdf
Stage: Target
Kind: target
Evidence: assumption
Channel: cli

T1 Idea to living connection, in one flow inside the IDE: the Architect describes a small Element in plain words, the Luminary writes its code and explains it in Plain mode, the Architect reviews a diff against the current code and accepts or declines, and the accepted Element docks on the CORE while the Luminary narrates the handshake (STP-0002 P24).

### 2026-10-29T14:07:56.060Z | claude | target T2
Chain-Prev: 6d6c2cc13331790936032f09865f0663a3f9bc10a72b80f8dbe6c2a390b57bdf
Chain-Hash: fa7e57075d055396ec989c37e3b9be91535ca440f40f9d8745bd975e0385f091
Stage: Target
Kind: target
Evidence: server/app.ts:272
Channel: cli

T2 Governance stays visible: the Luminary only proposes. Nothing changes an Element's code until the Architect accepts, every proposal and decision is recorded, and the model call goes through the existing governed ask, Knowledge Pack and spend gauge (no new provider path).

### 2026-10-29T14:07:56.358Z | claude | target T3
Chain-Prev: fa7e57075d055396ec989c37e3b9be91535ca440f40f9d8745bd975e0385f091
Chain-Hash: 3e0f45612dc5c10c3c748d6b8368fb26e0c813b31f741a91c3abfe26f4752664
Stage: Target
Kind: target
Evidence: assumption
Channel: cli

T3 Demo-safe: one rehearsed, fixed Element prompt; a recorded fallback take; a deterministic stand-in reply for rehearsal so the flow runs with no live model call.

### 2026-10-29T14:07:56.665Z | claude | stage
Chain-Prev: 3e0f45612dc5c10c3c748d6b8368fb26e0c813b31f741a91c3abfe26f4752664
Chain-Hash: f8c9fea8fa3f16a2e511885c33ed634c74018301b595d32e60617c363ba8269b
Stage: Gap
Kind: stage
Channel: cli

Targets recorded.

### 2026-10-29T14:07:56.978Z | claude | gap G1
Chain-Prev: f8c9fea8fa3f16a2e511885c33ed634c74018301b595d32e60617c363ba8269b
Chain-Hash: 786879d60696d112a28ea353a0242ff1d2b9a354831e8583358fab641c860fba
Stage: Gap
Kind: gap
Evidence: src/components/CodeEditorOverlayModal.tsx:10-56
Targets: T1, T2
Channel: cli

G1 No bridge from the Apothecary code editor to the Luminary: the Architect cannot ask the Luminary to write or change an Element's code from where the code lives.

### 2026-10-29T14:07:57.300Z | claude | gap G2
Chain-Prev: 786879d60696d112a28ea353a0242ff1d2b9a354831e8583358fab641c860fba
Chain-Hash: 8768e2d1ade4be512c898dbc1dc54c15fda176ef7c02699575f53e0cfd429dd0
Stage: Gap
Kind: gap
Evidence: server/luminary-executor.ts:1-10
Targets: T1, T2
Channel: cli

G2 No review step for Element code: there is no proposal state, no diff of proposed against current codeFrame.source, and no accept/decline record for Element code (the executor's review exists only for repository files).

### 2026-10-29T14:07:57.637Z | claude | gap G3
Chain-Prev: 8768e2d1ade4be512c898dbc1dc54c15fda176ef7c02699575f53e0cfd429dd0
Chain-Hash: bda64953f6b0b7b7161788efffa373a9e54a4f7da0e0a6b8367f63a8fc87238a
Stage: Gap
Kind: gap
Evidence: assumption
Targets: T3
Channel: cli

G3 No rehearsal path for the demo: no fixed demo prompt, stand-in reply or recorded fallback for this segment.

### 2026-10-29T14:07:57.924Z | claude | stage
Chain-Prev: bda64953f6b0b7b7161788efffa373a9e54a4f7da0e0a6b8367f63a8fc87238a
Chain-Hash: 7637d8a1b0ffb013932cc21a56b487fe939b136623353b4ee07b98300614c7bf
Stage: Proposal
Kind: stage
Channel: cli

Gaps recorded.

### 2026-10-29T14:07:58.225Z | claude | change P1
Chain-Prev: 7637d8a1b0ffb013932cc21a56b487fe939b136623353b4ee07b98300614c7bf
Chain-Hash: cc4bdfbdf3a8a317bafdfb2e658fe545917680aa094997118631c7e6852dc979
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/components/CodeEditorOverlayModal.tsx:10-56; server/app.ts:272
Closes: G1, G2
Channel: cli

P1 Ask the Luminary from the Element editor (in-browser, no repo writes). Add an 'Ask the Luminary' action to CodeEditorOverlayModal: the Architect writes what the Element should do; the client sends the goal, the Element's name, category, requirements and current codeFrame to the existing governed Luminary ask, asking for one fenced code block in the frame's language plus a plain explanation. The reply is held as a proposal, never applied. Recommended over routing through the repository executor: the Element's code is not a file, and this keeps the demo off LUMINARY_EXECUTOR and Git.

### 2026-10-29T14:07:58.522Z | claude | change P2
Chain-Prev: cc4bdfbdf3a8a317bafdfb2e658fe545917680aa094997118631c7e6852dc979
Chain-Hash: 5eeeee08b1d85fa552b9af1463757e55ffaa046f8dd17ca6f437c214cd5298e2
Stage: Proposal
Kind: change
Status: Drafted
Evidence: src/App.tsx:484-493; src/components/CodeEditorOverlayModal.tsx:41-56
Closes: G2
Channel: cli

P2 Review and decide. Show the proposal as a line diff against the current source with the Luminary's plain explanation beside it; Accept saves through the existing onSaveCodeFrame path (so CORE sockets and the catalog update as today), Decline discards it. Each proposal, accept and decline is appended to the evidence archive with the reply's model id, a hash of the proposed source and the Architect's decision. JSON frames keep their existing validation before save.

### 2026-10-29T14:07:58.812Z | claude | change P3
Chain-Prev: 5eeeee08b1d85fa552b9af1463757e55ffaa046f8dd17ca6f437c214cd5298e2
Chain-Hash: 93d7d61cb7fa61aa7bb062c95df5a79728c2a0e888b2a5a38a7fd9cf84e51d49
Stage: Proposal
Kind: change
Status: Drafted
Evidence: commit:0ac6396
Closes: G3
Channel: cli

P3 Rehearsal and fallback. Add a stand-in reply for one fixed demo Element (for example a small Rate Limiter or Greeter in TypeScript) so the whole flow runs without a model call, keep the live call behind the existing gauge and its $75 ceiling, and record a clean take as the fallback. Docking the accepted Element relies on the 16-thread CORE decision (STP-0002 N46) reaching main.

### 2026-10-29T14:09:43.727Z | claude | note N2
Chain-Prev: 93d7d61cb7fa61aa7bb062c95df5a79728c2a0e888b2a5a38a7fd9cf84e51d49
Chain-Hash: 1e7e1e9cd9245c358d55dc9d885617f671070b520c4892d2d871767ae52be263
Stage: Proposal
Kind: note
Evidence: commit:b176837; totem:.aegis/stp/0002-ai-integration-and-luminary-presence.md
Channel: cli

Reconciliation, append-only (nothing above is rewritten). (1) The Architect directed at 2026-10-29T14:06:19Z that this STP be placed now, with its Proposals to be determined later. (2) P1 (Ask the Luminary from the Element editor) and P2 (diff review, Accept/Decline, record) are delivered by STP-0002 P25, which the Architect approved at 2026-10-29T14:08:10Z and which is being built on PR #19 (branch claude/project-thread-zapc7o). P1 and P2 here are not separate work. (3) P3 (rehearsal stand-in, fixed demo Element, fallback take) stays open here for the Architect to decide. (4) STP-0005 is the home for the demo-segment plan. (5) Numbering collision: a Codex STP-0005, 'Portal Customs Boundary and Return Inspection' (introduced in commit b176837), exists on the branches codex/stp-0003-customs-tumbler-review, codex/stp-0003-p1-element-schema, codex/stp-0003-review-followups and codex/stp-0004-blueprint-closeout. It is not on main. Renumbering is left to the Architect and the peers.
