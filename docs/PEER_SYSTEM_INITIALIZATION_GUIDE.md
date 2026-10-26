# Peer System Initialization Guide

Created: 2026-10-25 by Verus (CyberPeer Coordinator) at the Architect's direction.
Status: Shared instructions for all four Peers. Read it in full before you touch your System.

Companion documents:
- Team, Systems and lanes: `docs/TEAM_SYSTEMS_AND_LANES.md`
- Repo orientation: `ROOT_TOTEM.md`
- Claims board: `.aegis/claims.md`
- STP records: `.aegis/stp/`

---

## 1. Why we are doing this (read this first)

The hackathon repo must be **highly informational and streamlined**: every capability, route, mode, flag and feature is written down somewhere a peer can find it. The danger we are removing is a **hidden feature** — something real in the code that no document describes — because a hidden feature lets the project **drift for days before anyone catches it.** The Architect has lost weeks to exactly this. We do not let it happen here.

So the job of initialization is not to build. It is to **make your System fully legible**: to say, with evidence, what it *is* right now, and what it is *meant to be*. Building comes after, against a map everyone can see.

**The current and the ideal matter more than the proposal.** A proposal can change; a false or missing picture of the current state is what costs weeks. Spend your care there.

---

## 2. The map we are making (the STP shape)

Each thing in your System that needs to be altered or built gets an STP entry with three parts:

- **Situation (the IS-ness)** — what is *actually true now*, each claim tied to evidence (`path:line`, a test, a command output). Includes what works, what is partial, what is dead, and anything undocumented you found. No guessing; if you are unsure, mark it a Shortfall and say so.
- **Target (the Ideal)** — the *whole* ideal of what this section will include when it is right. Describe it fully, even the parts no milestone will reach this week. Milestones select from the Target; they never shrink it.
- **Proposal (the How)** — the changes that close the gap between Situation and Target. Lighter than the other two. One Proposal is not approval; only the Architect approves.

Write Situation and Target so well that a peer who has never seen your code could tell, from your STP alone, what exists and what should.

---

## 3. Before you start (read order)

0. `docs/IDE_ORIENTATION.md` — know the whole IDE first: its structure, operation, Elements, and the Luminary's role. No peer works on a part without understanding the product it belongs to.
1. `ROOT_TOTEM.md` — repo-wide orientation and the append-only rule.
2. Every folder `TOTEM.md` inside your owned paths (section 7). **Most are 14-line scaffolds right now** — that thinness is itself a finding; filling them is part of your job.
3. Your lane: `.aegis/lanes/<you>.md`.
4. `.aegis/claims.md` — what other peers hold open.
5. `docs/TEAM_SYSTEMS_AND_LANES.md` — your System, owned paths, and the claim rule.
6. Your System's STP in `.aegis/stp/` if one exists already.

Then verify what you read against the live source and tests before you rely on it (AGENTS.md rule). A Totem that disagrees with the code is a finding, not a fact.

---

## 4. Phase 1 — Audit your System into its Totems

Walk every owned path. For each file or feature, record in the relevant folder `TOTEM.md`:

- **What it is** — its function in plain, function-named language (the Library Orb holds documents), with `path:line` evidence.
- **State** — working / partial / dead / undocumented.
- **Connections** — what it imports, what imports it, what route or mode reaches it.
- **Anything hidden** — a capability, route, env var, feature flag, mode, or dependency that no document currently mentions. Surface it explicitly. This is the whole point.

Definition of done for Phase 1: **no capability in your System exists only in the code.** Every one appears in a folder Totem or an STP Situation. If it is not written down, it does not count as known — surface it or it is a drift risk.

---

## 5. Phase 2 — Map the work into an STP

For your System, open or continue your STP (section 7) and record, per area that needs change or build:

- a **Situation** finding (IS, evidence-cited),
- a **Target** entry (the Ideal for that area),
- the **Gaps** between them,
- a **Proposal** (the How), marked Drafted/Presented — never self-approved.

Write STPs through the `aegis-stp` tool (CLI, VS Code extension, or MCP) so the hash chain stays valid. **If you cannot run the tooling, draft the entries in plain text in your lane and hand them to a peer or the Architect to write in, recording you as the author** (the charter's rule for Peer D applies to anyone tool-blocked).

Order within your System: Situation and Target for the whole System first, then Gaps, then Proposals. Breadth of the map before depth of any one fix.

---

## 6. Claims and lane discipline (every turn)

- **Claim before you edit** any file outside your owned paths or any shared file: append a CLAIM line to `.aegis/claims.md`, commit and push it, then work; append RELEASE when done. Owned paths need no claim from their owner.
- **Work on your own branch/worktree**, named `<peer>/<stp-number>-<slug>`.
- **After every turn, append to your lane**: what you did, what is uncertain, how you verified. Never rewrite or delete history — corrections are new entries (append-only).
- Record provider/model actions, tests and tool results only with evidence present; distinguish observed fact from assumption from Shortfall.

---

## 7. Your assignment (per Peer)

Owned paths and System summaries are the charter's; this adds the **starting-state notes from the coordinator's audit (2026-10-25)** so you know where the gaps already are.

### Peer A — Verus — System 1: POD Contracts and Connection — STP-0003
Owned: `src/engine/connectionRuntime.ts`, `contractStore.ts`, `capabilityRegistry.ts`, `resourceAllocator.ts`; `src/contracts/` (new); `ORBS/`; `docs/CORE_CONNECTION_STANDARD.md`, `docs/CORE_ELEMENT_CATALOG.md`.
Starting-state notes: STP-0003 is substantial (Situation S1–S9, Target T1–T8 drafted). The four disagreeing Element-type lists (relationEngine `CategoryType`, three `SceneEntityKind`, admin `ComponentKind`, Totem `TotemKind`) are the headline Situation to pin precisely. `ORBS/` folder Totems are scaffolds.

### Peer B — Claude Code 2 — System 2: Luminary and Project Creation — STP-0002
Owned: `src/components/LuminaryHost.tsx`, `Wayfinder.tsx`, `RightPanel.tsx`, `WorkRequestPanel.tsx`, `BuiltInBrowserModal.tsx`; new start-menu/project-creation components; `server/` (model gateway); `docs/VIBE_LUMINARY_*`.
Starting-state notes: STP-0002 is the most developed (Situation S1–S11, Target, decisions D1–D4, Proposals P1–P11, milestone M2). **`server/` has no `TOTEM.md` — create one** as your first Phase-1 act; the gateway is otherwise undocumented at the folder level. Record your chosen name in your lane's first entry.

### Peer C — Codex — System 3: 3D Elements and the Aether — new STP
Owned: `src/three/`, `src/components/ThreeCanvas.tsx`, `EnvironmentView.tsx`; `public/assets/models/` and any model-optimization script under `scripts/`.
Starting-state notes: `src/three/TOTEM.md` is a 14-line scaffold; the ThreeRuntime adoption history lives in `totems/shards/totems.codex.jsonl`. The 131 `.glb` models and the 33 rigged ones are the core Situation to inventory (counts, sizes, which are rigged). No System-3 STP exists yet — plant one.

### Peer D — ChatGPT Work — System 4: Governance, Documentation and Assurance — new STP
Owned: `docs/` (except files owned above); `README.md`.
Starting-state notes: `docs/TOTEM.md` (48 lines) is the richest folder Totem. Your System includes the orientation page, the function-name glossary, hackathon readiness (Official Rules, Cloudflare reachability), and independent review — **no peer verifies its own work.** If you cannot run repo CLI tooling, draft and hand off (section 5). Plant a System-4 STP.

---

## 8. Coordinator notes (current, repo-wide)

- **Scope decision in force:** only the Stellar coding-language subsystem is being extracted to the external Stellar folder; **AEGIS governance stays in full** — it is the product's core and AI-safety layer. Do not treat `.aegis`, `totems`, or governance code as removable.
- **Folder Totems are mostly thin scaffolds** (14 lines) today. Filling the ones in your owned paths is a first-class part of initialization, not optional cleanup.
- **The DataQuad is used every turn** by peers who have one (begin + commit) — it is how the next instance inherits continuity. Not optional.
- Base is green as of 2026-10-25: typecheck clean, 380/380 tests pass on `main`.

## 9. Definition of done for initialization

Your System is initialized when:
1. Every capability, route, mode, env var and flag in your owned paths appears in a folder Totem or an STP Situation — nothing lives only in the code.
2. Your folder Totems are filled (no bare scaffolds in your paths), current with the source.
3. Your STP carries a Situation (IS, evidence-cited) and a Target (the Ideal) for your whole System, Gaps named, and Proposals drafted for the Architect.
4. Your lane records the audit and how you verified it.

When all four Systems reach this, the repo is legible end to end — and a hidden feature has nowhere left to hide.
