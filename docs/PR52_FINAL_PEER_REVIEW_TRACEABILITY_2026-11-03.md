# PR #52 — Final Peer Review Traceability and Source-Bound Closure
Date: 2026-11-03
Review candidate CODE SHA: `cf2574c78104224dac44703942eb363a6fcfbdd9`
Integration target: `codex/core-configurator-20261102`
GitHub PR head: `codex/guided-new-app-20261102`
Worktree: `codex/accepted-core-runtime-20261103`

## Evidence interpretation
This document maps the complete agreed demo scope. The `peer-review/qa-current-*` files are previously executed isolated scripted fixture receipts, with source labels indicating the earlier `09b85a8` code and subsequent adjustments; they are **not silently re-labeled** as executions of a later commit. New `connectedElementEdit.test.ts` and `keyboard-guide-retest.json` cover the new changes. The clean installation and full suite receipt binds the code to the SHA above. An artifact's existence does not mean a fully independent review passed.

**Disposition definitions:** Closed (behavior exercised for bounded scope); Partial (an in-scope evidence requirement remains); Deferred (approved demo exclusion, not a passing test); Not applicable (outside accepted demo); Human gate (Architect acceptance).

| ID | Requirement | Element | Implementation | Test / behavioral receipt | Result |
| --- | --- | --- | --- | --- | --- |
| V01 | Isolated New App vacant CORE | App menu/CORE | `AppMenu.tsx`, `appCreation.ts`, `appFiles.ts` | `peer-review/qa-current-new-app-isolation.json` | Closed (scripted fixture) |
| V02 | Multiple choices and custom text batched | Luminary interview | `AppCreationConversation.tsx`, `appCreation.ts` | `peer-review/qa-current-workflow-results.json`; `final-review-browser-current.json` | Closed (fixture) |
| V03 | Malformed, oversized, HTTP and abort recovery preserves draft | Luminary interview/gateway | `AppCreationConversation.tsx`, `luminary/client.ts` | `peer-review/qa-current-workflow-results.json`: four fault classes and retries | Closed (bounded scripted injection) |
| V04 | 9+ turn requirement retention | Luminary state ledger | `creationLedger.ts`, `appCreation.ts` | `creationLedger.test.ts`; `peer-review/qa-current-ledger.json`; no live-model semantic result | Partial |
| V05 | Accepted CORE and hierarchy | CORE/Orbs/Satellites/Actuators | `appCreation.ts`, `App.tsx` | `peer-review/qa-current-workflow-results.json`, `qa-current-connected-children.json` | Closed for scripted accepted hierarchy |
| V06 | Drill-down/reload/resume | Workspace/Wayfinder | `App.tsx`, `EnvironmentView.tsx`, `navigationSnapshot.ts` | `peer-review/qa-current-resume.json`; `qa-current-connected-children.json` | Closed (bounded fixture) |
| V07 | Catalog similarity/oracle | Luminary/Catalog | `appCreation.ts` | Demo scope record | Deferred |
| V08 | Exhaustive semantic gap detection | Luminary/ToDo | `appBuildPlan.ts` | Demo scope record | Deferred |
| V09 | ToDo → Apothecary with full context | ToDo/Luminary/Apothecary | `AppBuildJourney.tsx`, `App.tsx`, `LuminaryHost.tsx` | `peer-review/qa-current-todo-context.json` captures proposal, interview, selected task and unchanged contracts; `final-review-browser-current.json` verifies guide | Closed for fixture payload |
| V10 | Author and persist three Element types | Apothecary Builder | `OrbBuilderModal.tsx`, `relationEngine.ts`, `App.tsx` | `review-d02-d03-browser-results.json`, `review-authored-hierarchy-results.json` | Closed (authored data) |
| V11 | Export/import/reload identity and contract | AppMenu/Snapshot | `AppMenu.tsx`, `appFiles.ts` | `review-authored-hierarchy-results.json`, `review-v11-v22-results.json` | Closed for data, not imported runtime execution |
| V12 | Connected child edit/reopen, version and relationship preservation | Editor/CORE/Hierarchy | `EditObjectModal.tsx`, `App.tsx`, `connectedElementEdit.ts` | `peer-review/qa-current-connected-edit.json`; `connectedElementEdit.test.ts` tests persistence and rejects version/topology drift | Closed for property/code-frame identity, structural and version policy; semantic code behavior unproven |
| V13 | Auto reintegration | Apothecary | Explicit handoff | `DEMO_SCOPE_APPROVAL_2026-11-03.md` | Deferred |
| V14 | Governed generation/Terminal/Preview | Production | `ApplicationProduction.tsx`, `server/application-production.ts` | `application-production.test.ts`; `peer-review/qa-current-production-audit.json` | Closed (bounded fixture) |
| V15 | Form/list/navigation generated app | Generator | `applicationGenerator.ts` | Existing generator and browser receipts in closure matrix | Closed (bounded) |
| V16 | CRUD/search generated app | Generator | Not promised | Scope record | Deferred |
| V17 | Authentication for no-login demo | Generated app | Not promised | Scope record | Not applicable |
| V18 | Durable entered notes | Generated app | CORE program persistence distinct from note storage | Scope record | Deferred |
| V19 | 1,000-record interaction | Generated app | `applicationGenerator.ts` | Historical fixture receipt referenced in closure matrix | Closed (bounded) |
| V20 | Keyboard traversal/focus/3D equivalent | Workspace/Dialogs/Footer | `App.tsx`, `AppBuildJourney.tsx`, `Dialog.tsx`, `Footer.tsx` | `peer-review/qa-current-keyboard-modal.json`; `keyboard-guide-retest.json` | Partial: tested modal and 3D route; exhaustive keyboard-only path across all panels not proven |
| V21 | WCAG labels, contrast, Terminal/Preview/translucency | All UI | Builder/Editor/Luminary styles | `peer-review/qa-current-*-audit.json`; current Workspace axe no confirmed violations but contrast calculations incomplete | **Partial:** translucent/gradient contrast incomplete, not a WCAG clearance |
| V22 | Mobile/tablet/desktop 390/768/1100/1440 reachability | All UI | Footer/Builder/Guide/Production | `review-mobile-v2-results.json`, `peer-review/qa-current-*-audit.json`, `v12-final-ui-qa.json` | **Partial:** full four-target reachability and overlapping states not conclusively cleared |
| V23 | Complete source/element/code/test/result mapping | Release evidence | This matrix, source and checks | Every row mapped; incomplete rows explicitly identified, receipts have source labels | Closed as **inventory**, Partial as **complete acceptance evidence** |
| V24 | Final Architect walkthrough | Human | Not automated | Architect acceptance pending | Human gate |

## Connected Element version policy (V12)
Ordinary properties and code-frame edits retain `id`, tier category, `version`, `parentElementId`, child-id lists, `authoringContract`, Umbilical contract references and profile IDs. The editor refuses an attempted implicit change to any of these; such changes require a separate reviewed migration. A connected CORE socket must continue to hold an Orb; editor edits also compare the actual attached runtime Element version, category, parent and authoring contract against the catalog to refuse drift. Existing handshake record and resolved profile version are preserved across property edits and save/reopen. This is a **compatibility policy**, not an assertion that arbitrary edited code keeps semantic behavior or satisfies a runtime contract.

## Release gate and outstanding independent review
The test/build receipt and merge-tree check belong to the pinned code SHA above; see `evidence/2026-11-03/peer-review-release-gates.json`. Full test and build checks are not substituted by old screenshots. Historical fixture captures from earlier source revisions are labeled as such.

**Remaining objective gaps:** V04 live-provider semantic final proposal, V20 exhaustive keyboard traversal, V21 computed contrast on translucent/gradient and Terminal/Preview edge states, V22 comprehensive all-screen/guide hit-target reachability. V11 runtime execution equivalence remains outside the proven export/import data contract and must not be advertised. Independent peer review and final V24 Architect walkthrough remain pending.

Approved demo deferrals V13/V16/V18, V17 not applicable, V07/V08 exhaustive semantic scope, and Annex exclusion are unchanged. Do not infer implementation from deferral.

**Review recommendation:** Independent reviewers can examine the committed candidate and its bounded evidence. **Do not label all objective QA Closed or Merge Ready** while the Partial rows above remain.
