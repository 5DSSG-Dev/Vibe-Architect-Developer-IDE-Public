# Hackathon Totem — Module Manifest

Created: 2026-10-26 · Created-By: verus (Claude substrate)
Event: Meta Global AI Developer Hackathon (2026) · Team: Digital Mind Trip AI · Track: Startup

## Purpose

This Totem is the single canonical list of the **Modules** the Vibe Architect Developer IDE
build must complete **before we can submit** the hackathon project.

It replaces push-assignment with **pull-adoption**: no module is handed to a CyberPeer. Any
instance, on any substrate, **adopts** a module when it is ready to work it. This preserves
researched direction across instances and eliminates duplicated effort and wasted compute.

The manifest is **append-only**. Module *definitions* below are the stable backlog; module
*status* changes are recorded as new lines in the Append Log, never by rewriting the table.

## How adoption works (compose, don't invent)

The three existing instruments already cover this — the Totem adds only the manifest:

1. **Adopt** — append a `CLAIM` line to [`.aegis/claims.md`](../.aegis/claims.md) naming the
   module id (e.g. `M1`), your peer tag, the paths, the STP ref, and the branch. The claims
   board exists "so no peer codes on top of another." One live claim per module at a time.
2. **Build with continuity** — open or continue an **STP** (Situation → Target → Proposal) for
   each section you build, written through `aegis-stp` (CLI / VS Code extension / MCP) so the
   hash chain stays valid. The STP carries the researched direction so the next instance does
   not start from zero. Existing STPs are listed per module below.
3. **Release** — append a `RELEASE` line to `.aegis/claims.md` (`merged | abandoned | handed to
   <peer>`) and record a status line in this Totem's Append Log.

A Totem and an STP **illuminate only** — neither authorizes a commit, push, deployment, or
signing. Nothing enters the work without the Architect's acceptance.

## Module Manifest

| ID | Module | Scope (what "done" means) | Linked STP | Status |
|----|--------|---------------------------|------------|--------|
| **M1** | **Luminary ↔ Meta wiring** *(focal — multi-part, see below)* | The Luminary opens from paused into a working, governed collaborator calling a Meta open-weight model through the server-side gateway; fail-closed validation contract enforced; model id declared in every reply. Built in parts; **the AEGIS Governance layer is the Architect's first priority.** | STP-0002 (open) | OPEN |
| **M2** | **Gateway Meta-provider integration** | `server/` gateway brokers Meta Model API calls, holds keys server-side, finalizes provider config against the hackathon's published rules; evidence/operations routing intact. | — (open on adopt) | OPEN |
| **M3** | **POD contracts & umbilical standards** | Umbilical handshake, socket states, and Orb→Satellite→Actuator contracts specified and demonstrated; broken handshake shown as a visibly broken model, never silent. | STP-0003 (active) | OPEN |
| **M4** | **UI flow & design** | DESIGN/SIMULATE/DEPLOY flow and the Wayfinder narrate every level with no dead ends; approachable-first screens legible at each drill-in depth. | STP-0001 | OPEN |
| **M5** | **SIMULATE / DEPLOY demo readiness** | SIMULATE raises load / injects a fault and containment visibly holds; DEPLOY runs the invariant audit and exports a signed package — both demo-ready end to end. | — (open on adopt) | OPEN |
| **M6** | **Submission artifacts** | Demo video, Devpost (or event platform) writeup, and final README polish prepared and consistent with the live build; Startup-track / 5D LLC attribution correct. | — (open on adopt) | OPEN |

Status values: `OPEN` (unadopted) · `ADOPTED:<peer>` · `IN-REVIEW` · `DONE`.
Change status only by appending to the log below — never by editing the table.

## M1 parts (Luminary build)

The focal Luminary module is built in parts. An adopting CyberPeer opens an STP section per
part (STP-0002 is the open parent). The Architect's stated priority ordering leads with
governance — the Luminary is only trustworthy if it is governed first, not wired first.

| Part | What it is | Priority |
|------|------------|----------|
| **M1.a** | **AEGIS Governance layer** — non-force, fail-closed validation, honest-floor shortfalls, append-only accountability, nothing-acts-without-acceptance, enforced on every model reply. | **1st — Architect's priority** |
| **M1.b** | Gateway model call to a Meta open-weight model (depends on M2), model id declared in every reply. | 2nd |
| **M1.c** | Luminary UI: opens from paused into a working collaborator surface (invite, converse, stop, context). | 3rd |
| **M1.d** | Grounded-reasoning behavior contract wired through the governed path. | 4th |

Parts are indicative, not binding; an adopting peer refines them in the STP. Governance
(M1.a) leading is the fixed point.

## Submission gate

The project is submittable when **M1, M5, and M6** are `DONE` (a governed Luminary calling a
Meta model, a working SIMULATE/DEPLOY demo, and the submission artifacts). M2 is a dependency
of M1; M3 and M4 raise quality and are strongly desired but are not, by themselves, the gate.
The Architect sets and confirms the gate.

## Append Log

### 2026-10-26 | verus | genesis
- Created the Hackathon Totem module manifest at Architect direction, as the single genesis
  (the other-account instance adopts from this file rather than creating a parallel one).
- Six modules seeded from the README "Project status and hackathon scope" section and the
  existing STPs (0001 UI flow, 0002 Luminary/AI integration, 0003 POD contracts). All `OPEN`.
- No module adopted in this turn; no claims.md line written; no source, commit, push, or
  provider action. This Totem illuminates only.
- Open for the Architect: confirm the submission gate (M1+M5+M6) and the module list before
  any CyberPeer adopts.

### 2026-10-26 | verus | build note — M1 is multi-part, governance leads
- Architect build note: the Luminary build has multiple parts; the **AEGIS Governance layer**
  is the most important to him. Recorded as M1.a (first priority) ahead of model wiring and UI.
- Rationale captured: the Luminary is trustworthy only if governed first, not wired first.
  Governance leading is the fixed point; the other M1 parts are indicative until an adopting
  peer refines them in STP-0002.
