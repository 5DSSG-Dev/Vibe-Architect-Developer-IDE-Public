# Vibe Luminary — Presence and Roles v0.1

Status: **PROPOSED (STP-0002 P19, Presented). Nothing is built until the Architect approves.**
Architect: Tracey Prutch · Drafted by: Claude (cloud thread), for Lumin to review at code level.
Builds on, does not replace: Behavior Contract v0.1, Operating Instructions v0.1 (P15), decision D4,
the Companion row of the Tumbler Continuity Interface Standard v0.1 §2.5, and proposals P3, P4, P5 and P6
(approved 2026-10-24, not yet built).

---

## 1. Why now, before the Meta model

The Meta model plugs into one place in the gateway (the reply source). Everything the Architect and the
judges actually see, the Luminary's panel, how it talks, what it offers, what it refuses, does not depend on
which model answers. So the Luminary's presence and roles are built and tested now with a stand-in, and the
Meta model is a swap at the end. A one- or two-reply Meta smoke test can be run earlier, only with the
Architect's go-ahead, to surface integration surprises.

## 2. One Luminary, five ways of helping

The Luminary is one role (D4.4). It is a Companion: it may witness, suggest, compare, explain, and form an
Offering. It may not unlock, dispatch, change anything, admit anything, or treat silence as a yes.

| Way of helping | What the Architect sees | What it never does |
|---|---|---|
| **At rest** | The golden core in the corner. It never raises itself. | Observe or send anything (D4.2). |
| **Explainer** | Answers questions about what is on screen, in the current mode (Design, Code, Simulate, Deploy). | Judge the Architect. |
| **Coding partner** | Produces code for the Architect, the way Verus and Lumin do: small snippets in the conversation, and whole assigned changes made on its own working branch, with the checks run and a plain summary of what changed. | Merge its own work. The Architect reviews and accepts before anything joins the project. |
| **Offering** | A proposal card ("I can draft this Orb design note") with Accept and Decline. On Accept, the IDE's existing Work Request makes it and shows a receipt. | Run the work itself. If the card is left alone, it is a no. |
| **Guide** | One guided session (later; can wait). | Act with authority. |

How the Luminary produces code (the Architect, 2026-10-28: "The Luminary also will produce code, just like
you and Lumin do for me"). This brings the assigned-coding-task proposal (P9) into this plan:

1. The Architect asks for a change, in plain words.
2. The Luminary writes the code on its own working branch, inside the files the task allows, never on the
   main project.
3. The IDE runs the project's checks on that branch.
4. The Architect sees a plain summary, what changed and whether the checks passed, with the full diff
   available.
5. The Architect accepts or declines. Only an accepted change joins the project. A change left alone is a no.

The Luminary does the writing. The IDE's executor holds the branch and runs the checks, and the Architect
holds the merge, so the Luminary still never admits its own work. Durable learning (P11) can wait.

**What keeps code safe** (agreed by the Architect, 2026-10-28). Only two things carry authority: the
**Architect's approval** and the **append-only ledger** that records it. Everything else is evidence that
helps the Architect decide:

- **The fence.** The Luminary writes only on its own working branch, inside the task's allowed files.
- **The checks.** The IDE's tests and type checks read the code. The gauge reads only the Luminary's words
  (explanations and summaries), never the code itself.
- **Plain-words evidence.** Before approving, the Architect sees what changed and what the checks found,
  in plain words.
- **The record.** Every request, result, accept and decline is appended to the ledger, using the IDE's
  existing Work Request ledger. Nothing in it is rewritten.

**Explanation level** (asked for by the Architect, 2026-10-28). The Architect chooses how much the
Luminary explains its code, to match their own skill level, and can change it at any time from the panel:

- **Plain:** what the change does and why, in everyday words, with no code shown unless asked.
- **Guided:** the plain account plus the key parts of the code, each explained.
- **Technical:** the full code and diff, with engineering detail.

It starts at Plain. The Luminary never nudges the setting up or down, and the setting changes only how
much is explained, never what is checked or what needs approval. Until durable learning (P11) arrives,
the setting is remembered on this computer only.

## 3. Presence in the IDE (the Full Form)

The existing corner icon and panel (`src/components/LuminaryHost.tsx`) grow into the conversation P3 described:

- **Header:** the name, which model is answering ("Rehearsal stand-in" now, the Meta model later), and Pause.
- **Status line:** resting, thinking, answering, stopped, unavailable.
- **Conversation:** the Architect's messages and the Luminary's replies. Each reply that passed the gauge
  shows a small "checked" mark; a reply that was revised after an IDS pass says so.
- **Context chips (P4):** only what the Architect adds (the selected element, a pasted snippet). Before
  sending, the panel shows exactly what will go and its size. Nothing is attached automatically.
- **Stop:** ends an answer mid-way.
- **Shortfall cards (P5):** when something fails (no model, gauge unavailable, too long, withheld after IDS),
  the panel says so in plain words. No fallback text ever poses as an answer.
- **Offering cards (P6):** Accept or Decline, then the Work Request receipt.

## 4. The stand-in

A **rehearsal reply source** in the gateway, switched on by one setting. It returns short, scripted replies
that exercise each role (an explanation, a code snippet, an Offering, a Shortfall). Every reply is labelled
with the model id `rehearsal-stand-in`, and the panel shows a "Rehearsal" badge, so it can never be mistaken
for a real model. It passes through the same governance gate and reply pipeline as the real model will.

The gauge is not faked. On the Architect's PC the real embedded gauge reads every stand-in reply. Where no
gauge is running (the cloud), each reply is withheld as "gauge unavailable", which is itself a useful test of
the Shortfall card.

## 5. Build order (each step tested before the next)

1. Gateway: the rehearsal reply source, and a reply shape that can carry an Offering.
2. Panel: conversation, status line, Stop, Shortfall cards.
3. Context chips.
4. Offering cards wired to the existing Work Request and its receipt.
5. Code production: the working-branch executor, checks, the summary and diff view, the explanation
   level setting, Accept and Decline, each recorded in the ledger.
6. End-to-end check: typecheck, all tests, build, and the IDE run in a browser with screenshots, with no errors.

## 6. What this does not do

- It does not call a Meta model or spend credits.
- It does not change the governance gate, the reply pipeline, or the gauge.
- It gives the Luminary no way to merge into the project on its own.

---

*DRAFT v0.1 for Architect review. The Architect holds the words.*
