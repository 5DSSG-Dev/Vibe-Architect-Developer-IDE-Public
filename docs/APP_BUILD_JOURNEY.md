# Workspace ToDo and Apothecary handoff

Approved design: resolve known design decisions in the interview, preserve agreed implementation work in an app-local ToDo list, reveal connected Workspace objects after acceptance, then offer Apothecary entry or exploration. Clicking pending work flags Luminary with the accepted design and interview context. Do not equate architecture acceptance or editing with app completion.

Approach: extend the existing CoreManifest snapshot and Luminary selection chip; reuse the Apothecary drawer. Avoid a second storage system or changes to the claimed LuminaryHost/governance pipeline.

Plan: (1) regression checks for accepted work persistence and independent app lists; (2) typed build plan, explicit Architect verification evidence and reopening; (3) accessible Workspace list and nonmodal invitation after reveal; (4) acceptance wiring and interview guidance; (5) focused/full tests, build, diff inspection and outside-pair review handoff.

Completion records are explicitly Architect-verified, not automated execution proof. Opening Apothecary or saving an Element never checks off a task. Model calls still require Send. No commit, push, merge or deployment. Final Verus/Libra independent review remains pending.

## Checked handoff
- Implemented app-local persistence, verified-completion UI, contextual Luminary focus and optional Apothecary entry.
- Focused23/23, app406/406, production build and diff checks pass. Full test command has one unchanged gateway status assertion failure; identity deterministic-rebuild test was intermittent earlier and passed in the final406 run.
- Supplemental independent review completed with its findings repaired. Required final Verus/Libra review, visual/keyboard browser checks and live-provider interview rehearsal remain pending. No commit, push, merge or deployment.
