# Vibe Architect Developer IDE — Orientation Primer

Created: 2026-10-25 by Verus (CyberPeer Coordinator) at the Architect's direction.
Audience: every Peer, before working on any System. Read this to know the whole before you touch your part.
Owner going forward: Peer D (System 4) — this is the first version of the orientation page; refine it there.
Evidence base: `src/engine/relationEngine.ts`, `src/utils/wayfinder.ts`, `src/components/`, `src/App.tsx`, STP-0002, the Luminary drafts. Verify against source before relying on any line (AGENTS.md rule).

---

## 1. What the IDE is

The Vibe Architect Developer IDE is a visual development environment where software is built by **assembling and connecting objects in a 3D space**, not by typing code first. It is designed **approachable-first**: someone who has never coded can understand every screen, and nothing blocks someone who has. Objects are named by **what they do**.

It is an **AEGIS app**: AEGIS is its governance and AI-safety layer, not an add-on. The AI partner inside it (the Luminary) is *governed* — that governance is the product's defining feature.

## 2. The big picture (architecture)

- **The CORE** — the center of a project. Everything connects to it. There is a CORE crystal per app type.
- **The POD** — the connected assembly around the CORE: the Orbs docked to it and the Satellites and Actuators inside them.
- **Umbilicals** — the connections. An Orb joins the CORE only through an **Umbilical handshake**; only Orbs carry the handshake code, so only Orbs dock to the CORE. (Umbilical standards are System 1's STP-0003 work.)
- **The Aether** — the 3D scene (`ThreeCanvas`) where all of this is seen and manipulated. Models are `.glb` objects (System 3).

## 3. The Element model (the "elements")

Every object is an **Element** (`ApothecaryItem` in `relationEngine.ts`). The **Apothecary** is the library of available Elements the user drags from.

**Categories** (`CategoryType`) and their plain-language function:

| Category | What it is / does |
|---|---|
| **Cores** | The project center everything connects to. |
| **Orbs** | The main building blocks; the only Element that docks to the CORE. A "Library Orb" holds documents, a "Memory Orb" holds state, etc. — named by function. |
| **Satellites** | Capabilities tethered to a host Orb. Class (`SatelliteClass`): I/O, Compute, Storage, Validation, Security. |
| **Actuators** | The concrete operations inside a Satellite (the figures that do the work — Scouts, Makers, Builders, Assessors, Examiners). |
| **Umbilicals** | The connections/conduits between Elements, sized by function. |
| **Portals** | External connection points (e.g. an API key entry, a signup link opened in the built-in browser). |
| **Ingredients / Formulas / Constellations** | Lower-level composable pieces and groupings that compose up into Orbs. |

**Hierarchy / drill-down:** `CORE → Orb → Satellite → Actuator`. You enter an Orb to see its Satellites, enter a Satellite to see its Actuators. `getElementChildren` walks this; the Wayfinder narrates it so no screen is a dead end.

**Trust badges** (`TrustBadgeType`): Canonical, Validated, Formulated, Experimental, Draft.
**Socket states** (`SocketState`): Vacant, Active, Degraded, Severed. A severed/broken handshake shows the broken model.

> Note (System 1, STP-0003): the Element type is currently defined by **four lists that disagree** (`CategoryType`, three `SceneEntityKind`, admin `ComponentKind`, Totem `TotemKind`). One published schema replaces them. Treat the table above as the working model, not the final schema.

## 4. How you operate it (modes + UI)

**Modes** (`IdeMode`, selected in the `Header`):
- **DESIGN** — the default. Dock Orbs to the CORE and drill in to arrange Satellites and Actuators. This is the main authoring mode.
- **SIMULATE** — raise load or inject a fault and watch containment hold (`SimulateModeView`).
- **DEPLOY** — review the invariant audit, then export the signed package (`DeployModeView`).
- **CODE** — a Stellar program editor (`CodeModeView` → `StellarWorkbench`). **Being removed for the hackathon** (see §7).

**Main UI pieces** (`src/components/`):
- `Header` — mode switch and title.
- `ThreeCanvas` / `EnvironmentView` — the Aether (3D scene) and the current drill-down level.
- `Wayfinder` — one plain sentence: where you are, what to do next.
- `RightPanel` / `LeftDrawer` — the Apothecary library and element details.
- `LuminaryHost` — the AI partner surface (see §5).
- Modals: `HandshakeModal`, `OrbBuilderModal`, `CoreMatrixModal`, `EditObjectModal`, `ViewContentsModal`, `BuiltInBrowserModal`, `CodeEditorOverlayModal` (the element code editor — stays, minus its Stellar branch).

## 5. The Luminary and its role

The **Luminary** is the IDE's AI partner (`LuminaryHost`, mounted app-level). Today it starts **paused** and opens only when the Architect invites it; its Full Form is currently static text stating no provider is connected. STP-0002 (System 2) builds it into a working, governed collaborator. Its agreed role (decision D4):

- **Collaborator and advisor** — it instructs step by step, writes code on prompt, and runs bounded coding tasks the Architect assigns.
- **Steward's voice** — descriptive and non-commanding; it states real failures, errors and constraints plainly, and it evaluates **code**, never the Architect.
- **Paused = at rest** — no unsolicited observation or offers in the demo.
- **Learns durably** — preferences carry across sessions, with view / correct / delete controls and a stated retention policy.
- **Educates** — contextual Q&A plus one Guided Session.
- Calls a model only through a server-side gateway (`server/`), keys server-side, declared model id in every response. Demo provider: **Muse Spark via the Meta Model API** (provisional until the hackathon rules publish).

## 6. AEGIS — the governance / AI-safety layer

What makes the Luminary trustworthy, and the IDE an AEGIS app:
- **Non-force** — it advises, it does not direct or coerce.
- **Fail-closed** — structured model replies are validated before display; a bad/empty/oversized reply becomes a **named Shortfall**, never fallback text posing as an answer.
- **Honest floor** — it says plainly what it cannot do; it never bluffs a result.
- **Append-only accountability** — accepted decisions are recorded, attributed, and never silently rewritten; the last decision shows on reopen.
- **Nothing acts without the Architect's acceptance** — proposals and assigned tasks return a diff + receipt; nothing merges on its own.

This layer is **core and stays in full** — it is shown, not hidden.

## 7. Hackathon deltas (so no one is surprised)

- **Stellar** (the coding-language subsystem) and **CODE mode** are being removed for the hackathon build and preserved in the external Stellar folder. The element **code editor overlay** stays (minus its Stellar branch). DESIGN / SIMULATE / DEPLOY remain.
- **AEGIS governance stays in full.**
- Base is green as of 2026-10-25: typecheck clean, 380/380 tests pass.

## 8. Read next

- Your initialization procedure: `docs/PEER_SYSTEM_INITIALIZATION_GUIDE.md`
- Team, Systems, lanes, claims: `docs/TEAM_SYSTEMS_AND_LANES.md`
- Repo orientation and rules: `ROOT_TOTEM.md`, `AGENTS.md`
- Luminary detail: `docs/VIBE_LUMINARY_*`, STP-0002 (`.aegis/stp/0002-*`)
- Your System's STP in `.aegis/stp/`
