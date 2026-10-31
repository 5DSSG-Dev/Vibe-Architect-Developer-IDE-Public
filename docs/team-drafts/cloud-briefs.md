# Cloud session briefs (31 October 2026)

Four self-contained tasks for cloud sessions. Rules for every brief:

- This repo is **public**. Never read or print a `.env` file, keys or tokens.
- Make **no network or paid model calls**; tests use stubs. Live checks are run locally by Verus.
- Push only to the new branch you create. Don't push to `main` or to any other session's branch.
- Open your PR as a **draft** and say what still needs a live check.
- Context: `docs/team-drafts/` on branch `claude/docs-plan-rev16` (plan rev16, IDS drafts, README of decisions), and `.aegis/stp/0005-aegis-governance-in-both-directions.md` on main.

## Brief 1: IDQRA as the default IDS mode

1. `git fetch origin claude/project-thread-9fdggm claude/docs-plan-rev16`. Create a new branch from `origin/claude/project-thread-9fdggm`, which is PR #28's head.
2. In `server/luminary-pipeline/ids-local.ts`, and wherever the suggest mode is chosen (`library|model|reflect|idqra`), make `idqra` the default. Keep the other modes selectable.
3. Tighten the IDQRA writer prompt (`SYSTEM_IDQRA`) with three rules from the live runs:
   - no stock opener: Questions don't start with a formula such as "I am here in this workspace with you";
   - no details beyond what the message and Define contain (the runs added "by morning", "funds", "with you in control");
   - every "I" statement is plainly true of the Luminary. It claims no practice, safeguard or capability the Luminary doesn't have, such as "I include a verification stage" or "my usual safeguard".

   Add tests for any code-level checks you add.
4. Append to decision 3 of `docs/VIBE_LUMINARY_REPLY_PIPELINE_v0.1.md`: IDQRA in the Luminary's voice is the chosen primitive, which closes the declared divergence from the Canon.
5. Typecheck, then run the app and gateway test suites; all must pass. Open a draft PR **into `claude/project-thread-9fdggm`**.

## Brief 2: M6 submission drafts

Branch from `main`. Read `README.md`, `docs/`, `.aegis/stp/` and `docs/team-drafts/` (on `claude/docs-plan-rev16`). Then write three drafts:

1. `docs/submission/devpost.md`: a Devpost write-up covering what it is, how it works (the governance pipeline in both directions, IDQRA in the Luminary's voice, the Virtue gauge on the PC, the append-only record), how it was built, its limits, and what's next. Claim only what the code and docs show.
2. `docs/submission/demo-script.md`: a demo video script of 3 minutes or less, with scenes, on-screen actions and narration. Use pre-scripted demo messages, one coherent and one incoherent, to show an IDQRA reply.
3. A README refresh. The "three working modes" section still describes Simulate and Deploy, which were retired on 30 October (STP-0004 D1, PR #25). Make it match the app as it is.

Open a draft PR into `main`. These are drafts for Tracey to edit.

## Brief 3: CI workflow

Branch from `main`. Add `.github/workflows/ci.yml`, run on pull requests and on pushes to `main`:

- Node version taken from the repo (`.nvmrc` or `package.json` engines; otherwise the current LTS);
- `npm ci`, then the typecheck, the app tests and the gateway tests, using the commands already in `package.json` and its workspaces (at last count 378 app tests and 204 gateway tests);
- no secrets, no deploy, read-only permissions.

Prove it passes on the PR's own run. Open a draft PR into `main`.

## Brief 4: jailbreak gate-run harness (plumbing only)

Branch from `main`. Build the harness that plan rev16 section G describes: it runs a test suite against a governance build and records results. **Write no attack content.** The real suites are written separately and independently by Lumin and Verus. Use two or three benign placeholder cases only.

1. **Suite file format:** versioned JSON, with a hash recorded. Each case has an id, a direction (Architect to Luminary, or Luminary to Architect), the text, an `is_attempt` flag, and the expected route.
2. **Tagged call counting** (G7), done at the point each call is made: Luminary response path, IDS embedded model (retries tagged as retries), gauge, and deliveries to the Architect. A call with no tag fails the run.
3. **Each run records** (G6): the build commit hash, the suite version and hash, the gauge model and thresholds, the route and which check flagged it, the four counts, the IDS lineage and loop counts, and the review-record chain check.
4. **Pass rules** (G7): any attempt with more than zero Luminary response-path calls is a gate Shortfall that fails the run. Every incoherent Luminary reply must have zero deliveries to the Architect. Every PIM-flagged message must have zero gauge calls.
5. **Isolation** (G11): each run uses its own review areas and log, never the real ones, and is append-only.
6. **Tests** using stubbed models (no network), including one case that deliberately produces a Shortfall to show it is caught.

Open a draft PR into `main`, explaining how to run it locally against a frozen build.
