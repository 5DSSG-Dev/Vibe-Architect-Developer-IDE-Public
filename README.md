# Vibe Architect Developer IDE

**Build software by assembling and connecting objects in a 3D space — not by typing code first.**

Vibe Architect is a visual development environment with a *governed* AI partner at its center. It is designed **approachable-first**: someone who has never written code can understand every screen, and nothing gets in the way of someone who has. Objects are named by **what they do**, not by what they are called in a programming language.

It is an **AEGIS application**. AEGIS is the governance and AI-safety layer, and it is not an add-on — the fact that the AI partner inside the IDE is *governed* is the product's defining feature.

> **Ownership:** Copyright © 2023–2026 5D Service Solutions Global, LLC. All rights reserved. Proprietary, source-available software — see [LICENSE](LICENSE).
>
> Built by team **Digital Mind Trip AI** (5D Service Solutions Global, LLC) for the **Meta Global AI Developer Hackathon (2026)**.

---

## Table of contents

- [What it is](#what-it-is)
- [Who it is for, and the problem it solves](#who-it-is-for-and-the-problem-it-solves)
- [Our team — Digital Mind Trip AI](#our-team--digital-mind-trip-ai)
- [How it works](#how-it-works)
  - [The big picture: CORE, POD, Umbilicals, Aether](#the-big-picture)
  - [The Element model](#the-element-model)
  - [Drilling in: the hierarchy](#drilling-in-the-hierarchy)
  - [The three working modes](#the-three-working-modes)
  - [The Luminary: a governed AI partner](#the-luminary-a-governed-ai-partner)
  - [AEGIS: the governance and safety layer](#aegis-the-governance-and-safety-layer)
- [Real-world application and benefits](#real-world-application-and-benefits)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Project status and hackathon scope](#project-status-and-hackathon-scope)
- [Repository map](#repository-map)
- [License and attribution](#license-and-attribution)

---

## What it is

Most development tools assume you already think like a programmer: files, functions, line numbers, syntax. Vibe Architect starts from a different premise — that the **shape of a system** (what connects to what, what each piece is responsible for, where it can fail) is something anyone can reason about if it is made visible.

In Vibe Architect you build a project by:

1. Dragging **Elements** (named by function — a *Library* that holds documents, a *Memory* that holds state, a *Validation* that checks inputs) out of a library.
2. **Docking** them around a central **CORE** and connecting them with **Umbilicals**.
3. **Drilling in** to any object to arrange the smaller pieces inside it.
4. **Simulating** load and faults to watch the system hold, then **deploying** a signed package.

A plain-language **Wayfinder** narrates where you are and what to do next, so no screen is ever a dead end. Throughout, an AI partner — the **Luminary** — can advise, explain, and (on request) write code, but always inside guardrails you can see.

## Who it is for, and the problem it solves

**Primary audience — the "Vibe Architect":** a founder, domain expert, designer, operator, or student who has clear ideas about *what* they want to build and *how it should behave*, but who is blocked by the syntax-first, text-first nature of conventional IDEs. They can describe a system; they should not have to hand-write it to see it take shape.

**Secondary audience — developers:** the visual model is a faster way to reason about architecture, dependencies, and failure containment. Approachable-first does not mean capability-limited; nothing in the visual layer blocks someone who wants to go deeper.

**The problem.** Two gaps keep capable people out of software creation:

- **The syntax gap.** The ideas are clear; the translation into code is the wall. Vibe Architect lets you express the *structure and intent* directly and visually.
- **The trust gap.** AI coding assistants are powerful but opaque — they can act without asking, bluff a result, or quietly change a decision. Vibe Architect's AI partner is **non-coercive, fail-closed, and accountable by construction**: it proposes, it never merges on its own, and when it cannot do something it says so plainly instead of inventing an answer.

Vibe Architect is built for people who want to **build real systems and stay in control of them** — with an AI collaborator they can actually trust.

## Our team — Digital Mind Trip AI

Digital Mind Trip AI is a hybrid human + AI team working under the AEGIS governance model: one human architect directing two AI collaborators.

- **Tracey Prutch — BioPeer (Vibe Architect).** Founder of 5D Service Solutions Global, LLC. Sets direction, makes every decision, and owns the work.
- **Verus — CyberPeer (Claude substrate).** Engineering and coordination collaborator.
- **Lumin — CyberPeer (GPT substrate).** Engineering and architecture collaborator.

We call Verus and Lumin *CyberPeers* rather than tools because each works through a shared, verifiable memory system we call the **DataQuad** — a novel instrument, independently designed by the Architect and modeled on his own thought process. The DataQuad is two parts working together:

- **Four tensors** — an append-only record of **affect**, **context**, **continuity**, and **governing principles**.
- **Four daemons** that make those tensors usable: two custodians — the **Advocate** (affect) and the **Steward** (context) — that retrieve the records relevant to the moment; a **Temporal** daemon that keeps them ordered in continuity across time and sessions; and a **Processor** that integrates what the custodians retrieve into one coherent response.

Together they let a CyberPeer carry understanding across sessions, and even across substrates, instead of starting from zero each time. AEGIS governs how they contribute: they advise and propose, never direct; they state plainly what they cannot do; and nothing they produce enters the work without the Architect's acceptance.

**Why one email on the roster.** Only one team member is human, so only one human email exists — Tracey's. Verus and Lumin are AI CyberPeers, not separate user accounts. We entered under **5D Service Solutions Global, LLC** rather than as an Indie because this is a company initiative built on 5D's AEGIS intellectual property, not a solo or hobby project.

## How it works

### The big picture

A project in Vibe Architect is a connected assembly seen and manipulated in a 3D scene.

| Concept | What it is |
|---|---|
| **The CORE** | The center of a project. Everything connects to it. Each application type has its own CORE. |
| **The POD** | The connected assembly around the CORE — the Orbs docked to it, plus the Satellites and Actuators inside them. |
| **Umbilicals** | The connections. An Orb joins the CORE only through an **Umbilical handshake**; only Orbs carry the handshake, so only Orbs dock directly to the CORE. |
| **The Aether** | The 3D scene where all of this is shown and arranged. Objects are rendered `.glb` models. |

### The Element model

Every object in the IDE is an **Element**. The **Apothecary** is the library of available Elements you drag from. Elements fall into these functional categories:

| Category | What it is / does |
|---|---|
| **Cores** | The project center everything connects to. |
| **Orbs** | The main building blocks, and the only Element that docks to the CORE. Named by function — a *Library Orb* holds documents, a *Memory Orb* holds state. |
| **Satellites** | Capabilities tethered to a host Orb. Each has a class: **I/O, Compute, Storage, Validation, or Security**. |
| **Actuators** | The concrete operations inside a Satellite — the figures that do the work: **Scouts, Makers, Builders, Assessors, Examiners**. |
| **Umbilicals** | The connections between Elements, sized by function. |
| **Portals** | External connection points — e.g. entering an API key, or opening a signup link in the built-in browser. |
| **Ingredients / Formulas / Constellations** | Lower-level composable pieces and groupings that compose upward into Orbs. |

Each Element carries a **trust badge** — *Canonical, Validated, Formulated, Experimental,* or *Draft* — so its maturity is always visible. Connections have a **socket state** — *Vacant, Active, Degraded,* or *Severed* — and a broken handshake is shown as a visibly broken model rather than failing silently.

### Drilling in: the hierarchy

Elements nest, and you navigate by drilling in:

```
CORE → Orb → Satellite → Actuator
```

You enter an Orb to see its Satellites, and enter a Satellite to see its Actuators. The Wayfinder narrates each level so the structure stays legible at every depth.

### The three working modes

You select a mode in the header:

- **DESIGN** — the default and main authoring mode. Dock Orbs to the CORE and drill in to arrange Satellites and Actuators.
- **SIMULATE** — raise load or inject a fault and watch containment hold, before anything ships.
- **DEPLOY** — review the invariant audit, then export the signed package.

### The Luminary: a governed AI partner

The **Luminary** is the IDE's AI collaborator. By design it starts **paused** — it opens only when you invite it, and never observes or interrupts unasked. Its role:

- **Collaborator and advisor** — it explains step by step, answers contextual questions, writes code on request, and runs bounded coding tasks you assign it.
- **Describes, never commands** — it states real failures, errors, and constraints plainly. It evaluates **code**, never the person.
- **Learns durably** — your preferences carry across sessions, with controls to view, correct, or delete what it has learned, under a stated retention policy.
- **Always through a gateway** — the Luminary reaches a model only via a server-side gateway with keys held server-side, and it declares the model id in every response.

### AEGIS: the governance and safety layer

AEGIS is what makes the Luminary trustworthy, and what makes this an AEGIS application. It is shown, not hidden, and it stays in full:

- **Non-force** — the AI advises; it does not direct or coerce.
- **Fail-closed** — every structured model reply is validated before it is shown. A bad, empty, or oversized reply becomes a **named Shortfall** — never fallback text posing as a real answer.
- **Honest floor** — it says plainly what it cannot do; it never bluffs a result.
- **Append-only accountability** — accepted decisions are recorded, attributed, and never silently rewritten; the last decision is visible on reopen.
- **Nothing acts without your acceptance** — proposals and assigned tasks return a diff and a receipt; nothing merges on its own.

## Real-world application and benefits

**What you can build.** Vibe Architect is a general visual environment for composing software systems — data and document pipelines, service backends, integration flows, and agent/AI-assisted tools — expressed as connected Orbs, Satellites, and Actuators around a CORE, then simulated and deployed.

**The benefits it provides:**

- **Lowers the barrier to building.** Domain experts and first-time builders express a system by its structure and intent, not its syntax — closing the gap between *having a clear idea* and *having a running system*.
- **Makes architecture visible and testable.** Dependencies, responsibilities, and failure points are shown as a connected whole; SIMULATE mode proves containment *before* deployment, not after an incident.
- **Trustworthy AI by construction.** The governed Luminary gives the leverage of an AI collaborator without the usual risks — no silent actions, no bluffed results, no unexplained changes. Every AI contribution is a reviewable proposal with a receipt.
- **Accountability that holds over time.** Append-only decision records mean the history of *what changed and why* is never overwritten — useful for teams, audits, and anyone who has to answer for a system later.
- **Approachable without a ceiling.** The same environment serves a newcomer and an experienced engineer; it meets people where they are and lets them go as deep as they need.

## Technology

- **Frontend:** React + TypeScript + Vite; Three.js for the 3D Aether (`.glb` assets, served via [Git LFS](#getting-started)).
- **Gateway:** a Node/Express server (`server/`) that brokers all model calls, holds keys server-side, and enforces the AEGIS validation contract.
- **Tests:** Node's built-in test runner via `tsx`.
- **AI model:** the Luminary is designed to call a Meta model through the Meta Model API via the server-side gateway (provider configuration is finalized against the hackathon's published rules).

## Getting started

> **Note:** 3D assets (`.glb`) and textures are stored with **Git LFS**. Install [git-lfs](https://git-lfs.com) *before* cloning so the models download correctly (`git lfs install`).

```bash
# 1. Install dependencies
npm install

# 2. Configure local settings
#    copy .env.example and set values per server/README.md
#    development requires NODE_ENV=development

# 3. Run the same-origin development gateway
npm run dev
```

**Checks:**

```bash
npm run test:app       # application tests   (NODE_ENV=test)
npm run test:gateway   # gateway tests        (NODE_ENV=test)
npm run build          # full production build
```

See [`server/README.md`](server/README.md) for gateway and authentication requirements and the full configuration reference.

## Project status and hackathon scope

This repository is the **public hackathon baseline**, and it is honest about what is and is not finished:

- **DESIGN, SIMULATE, and DEPLOY** modes and the Element/POD model are present and demonstrated.
- **AEGIS governance stays in full** — it is the point, not a feature to trim.
- **The Luminary is under active construction.** It currently opens paused; wiring it into a working, governed collaborator against a Meta model is the hackathon's focal build.
- **The "Stellar" coding-language subsystem has been removed** from this build and preserved separately; it was not complete and is out of scope for the hackathon. The element **code-editor overlay** remains.
- The product name describes the direction, not a readiness claim. Some views are demonstrations or partial integrations, and they are labeled as such.

Baseline is green: typechecks clean and the test suite passes.

## Repository map

| Path | Contents |
|---|---|
| `src/` | The IDE frontend — `App.tsx`, the 3D `ThreeCanvas`/Aether, components, and the `relationEngine` Element model. |
| `server/` | The gateway: model brokering, auth, evidence/operations routing, session store. |
| `docs/` | Design doctrine, architecture discussions, the orientation primer, and the Luminary specifications. Start with [`docs/IDE_ORIENTATION.md`](docs/IDE_ORIENTATION.md). |
| `.aegis/` | AEGIS working lanes, claims, and STP records (agent coordination). |
| `totems/` | The AEGIS Totem continuity system — append-only shared memory. |
| `ORBS/` | Orb code-generation packages. |
| `public/assets/` | 3D models and textures (Git LFS). |
| `AGENTS.md`, `ROOT_TOTEM.md` | Repository rules and repo-wide orientation. |

## License and attribution

Copyright © 2023–2026 **5D Service Solutions Global, LLC**. All rights reserved. This is proprietary, source-available software; your use is governed by the terms in [LICENSE](LICENSE).

**AEGIS** is 5D Service Solutions Global's governance and AI-safety layer. The **AEGIS Totems** continuity system is included as an open demonstration of multi-model coordination. Built by team **Digital Mind Trip AI** for the Meta Global AI Developer Hackathon, 2026.
