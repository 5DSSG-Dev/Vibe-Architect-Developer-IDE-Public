# Folder Totem: src/engine

## Append Log

### 2026-10-30 | Codex | Retire demo-only engines
- Removed `simulationEngine.ts`, which produced preset/random telemetry and log claims without running target operations, and `auditEngine.ts`, whose checks primarily read declarations or unconditionally passed.
- No current source imports these engines. Umbilical runtime validation and contract checks remain in `connectionRuntime.ts`; this removal does not affect those connection-time checks.
- A future M5 scenario runner/audit still requires separately approved design and evidence-backed implementation.

### 2026-10-30 | Codex | Verification and review publication
- Supersedes the pending-check note above: `npm run build` passed, including TypeScript checks; existing Vite large-chunk warning remains. No tests were run.
- Commit `9b5fa25` is part of open PR #25: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25.


## 2026-11-02 | Codex | CORE Configurator review preview
- Added app details persisted inside CORE manifest, app-type crystal defaults and selectable isolated GLB preview. Removed CyberPeer daemon controls from this modal and clarified resource budget wording.
- Prepared on isolated current-main worktree for Architect visual review. Existing active checkout untouched.


## 2026-11-02 | Codex | Guided New App demo
- New App preserves the departing snapshot and creates a unique vacant draft CORE without starter contracts or CyberPeer daemons. First launch without saved workspace enters the same draft conversation; existing workspaces are preserved.
- Added live-gateway app planning conversation, bounded catalog-only proposal validation, explicit Architect acceptance, runtime Orb handshakes, requested Satellite/Actuator hierarchy, and rollback on connection/evidence failure. No model call occurs until Send. Rehearsal is rejected for this planning flow.
- The creation bubble enlarges and the 3D Luminary eases to 1.4x at the same screen anchor while assembly is hidden. Selected crystal updates the workspace CORE. Optional loopback-only preview gateway proxy keeps provider credentials server-side.
- Production build and 356 app tests passed before final added empty-child regression. Desktop Commander has stopped responding; Windows application, browser interaction and live-provider validation remain pending. This creates starting architecture, not working app code or production acceptance.

## 2026-11-02 | Codex | Guided creation verification
- Final production build passes, including TypeScript checks. Full app suite: 358 passed, zero failed/skipped. Rejects uncontracted model-only Orbs before proposal acceptance; explicit empty child lists stay empty. No provider calls or browser visual tests performed. Desktop Commander remains unresponsive; preview application pending.


## 2026-11-02 | Codex | Suggestion shelf and Element-screen Luminary
- New App composer keeps up to three model suggestions below input. Choice clicks send directly, preserve unsent draft, retain unused choices and replace selected slot after successful response. Failed calls retain choices and proposal; no filler suggestions are invented. Prompt history retains initial requirements and latest architecture without resending every old proposal.
- Orb/Satellite/Actuator EnvironmentView now creates the shared Luminary Presence, follows the same screen anchor, supports avatar click/hover and disposes owned resources. Async model completion is guarded after unmount.
- Thirteen focused creation/suggestion/anchor/cache-ownership checks pass. Windows build checked; browser visual and live suggestion-click confirmation remain with Architect. Saved app data was not cleared.


## 2026-11-02 | Aster | Workspace ToDo and Apothecary handoff
- Architect approved the interview -> accepted architecture -> Workspace reveal -> optional Apothecary journey. Implementation is local and uncommitted on codex/guided-new-app-20261102 (base79c1443).
- Accepted proposals preserve agreed work, full interview and architecture in CoreManifest.appBuildPlan. App-local ToDo items flag Luminary through its existing selection chip; current Element context is retained. Apothecary entry preserves the selected pending task. No automatic model request or execution.
- Workspace reveal precedes a nonmodal one-second invitation. Not yet retains exploration; ToDo offers Continue to Apothecary. Checkboxes require explicit Architect verification evidence; opening editors never completes work. Full decisions remain inspectable. Imported metadata is validated; corrupt restored ToDo metadata displays a warning without discarding the Workspace.
- Fresh verification: focused23/23, application406/406, production build and git diff --check pass. Existing large-bundle warning remains. Full npm test stopped at unchanged server/luminary-p19.test.ts:65 (259/260 gateway pass; extra replySourceKind field). Earlier app suite also reproduced the previously recorded intermittent identity.test.ts:443 deterministic-rebuild failure; final app rerun passed406. Neither server nor identity source was changed.
- Supplemental independent GPT reviewer found four issues plus final-decision truncation; all repaired with regressions and re-reviewed with no remaining substantive findings. This does not satisfy the named final Verus/Libra outside-pair gate. Browser visual, keyboard interaction and live interview behavior remain unverified. No provider calls, gateway restart, commit, push, merge or deployment.
- Return point: final outside-pair review and local browser rehearsal on a newly accepted proposal; older already-accepted apps are preserved and are not retroactively assigned invented work.


## 2026-11-02 | Lumen | Application production: first executable generator slice
- Architect directed Finalization Mode and then said to begin. Added only src/engine/applicationGenerator.ts, its tests, docs/APPLICATION_PRODUCTION_PLAN.md and output verification/demo artifacts; existing uncommitted UI/ToDo/source work preserved. Current branch codex/guided-new-app-20261102.
- Explicit version-1 Page/Component/Form/Data/Navigation/API definitions generate complete React/Vite projects with per-object modules, package dev/build/test scripts and generated behavior tests. Forms append records in memory; routes use hash navigation; API service profile is GET JSON only. No inferred behavior from catalog names, authored-source execution, model calls or governance approval.
- Fresh checks: generator7/7; final app413/413; client typecheck0; IDE production build0 (existing large-chunk warning); generated demo tests4/4, Vite build0 and dev HTTP200 for HTML/main/page/form/model. Clean npm install and interactive browser behavior remain unverified; verification reused ancestor installed dependencies. First app run reproduced the historical identity.test.ts deterministic-rebuild issue; final413 run passed. Full npm test stops at existing server/luminary-p19.test.ts:65 status payload mismatch: extra replySourceKind (259/260 gateway pass).
- Reproduction: node --import tsx output/verify-application-generation.mjs. Successful demo output/generated-app-oaepbo. Initial harness close failed during optimizer shutdown after successful HTTP checks; final harness waits for request idle and retains an event-loop handle through close, exiting0. Generated vite config isolates CSS from ancestor PostCSS configuration.
- Remaining: bind accepted CORE/Elements to explicit production definitions, governance review/approved-generation identity, project materialization and process ownership, terminal, unified preview, existing Totem/STP extension integration. Generator is not yet called by the IDE UI; no end-to-end demo readiness claim. No commit/push/merge/deployment or gateway restart.

## 2026-11-02 | Lumen | CORE to governed generation and local launch
- Architect explicitly requested continuation. Added production context/binding validation and production client-state guards; Build & Preview component mounts once per CORE and saves a receipt pointer in CoreManifest. Existing guided creation/ToDo changes preserved. Existing Element code frames are review context only, not compiled by this profile.
- New server/application-production.ts reuses createGovernedAsk and the existing private ReviewRecord. Each definition object binds to an actual CORE/connected Element. Essential unsupported requirements become a named shortfall. Immutable generated source/digest and context fingerprint precede launch; private record notes precede execution and preview delivery. Closed/unwritable records block progress. No governance/admission/P5/P6 implementation was replaced.
- Development + explicit local-session + live source + record are prerequisites. Existing demo authentication/IP limiter applies before strict socket-loopback, proxy-header refusal and exact Origin/Host check. No client filenames/commands/source are executed; only deterministic template outputs run. Tests use a small child Node process without provider environment. Vite builds ignore config/env/public files and inherit no ancestor CSS config. Preview is static-only on a separate loopback origin and unguessable path, embedded with scripts/forms sandbox; no gateway/provider keys are exposed.
- Launch is explicit after exact receipt/source/context review and browser evidence save. Building/running/unknown outcomes keep original controls and block replacement. Same request ID and context produce one in-session generation; authenticated recovery does not repeat model calls. Browser preserves request ID before sending and preserves a successful receipt before supplementary evidence writes; evidence-save retry is available. Shutdown/Stop close owned preview servers. Across gateway restarts, old receipts are retained as history but must be regenerated; no durable exactly-once or admission claim.
- Supplemental independent reviewer found lost generation receipt/evidence failure, stale restoration approval, auth/throttle request-ID loss and lost-launch preview orphaning. Repaired with receipt-specific review keys, restore epoch, request recovery, separate evidence readiness, terminal-error classification and bounded status polling/manual refresh. Reviewer source recheck closed those findings. This is not the named final Verus/Libra cross-pair review.
- Fresh final verification: focused18/18 (11 runtime/gateway integration +4 context +3 client state), complete application421/421, production build0 including client/server TypeScript and emitted server runtime import smoke. Real generated tests/build/static HTTP assets, duplicate launch, Stop, tampered source, unreviewed public-file refusal, opaque preview path, cached request recovery and authentication exercised. Full npm test:270/271 gateway pass; only inherited server/luminary-p19.test.ts:65 status equality fails (extra replySourceKind). No test expectation silently changed.
- Runtime activation remains pending: existing http://127.0.0.1:3012 local-session endpoint returns204, but new production recovery route returns404. Preview checkout has no .env or saved launch configuration; responding service ownership was not verified with socket inventory, so it was not terminated/restarted. Reload the original configured development gateway with this updated source, then reload the IDE. Browser controls/iframe behavior and live-provider generation remain unverified; tests used a fixture reply source through real governance. Clean npm install, arbitrary terminal/Node/Python execution, persistent app data and Totem/STP extension activation remain pending. No commit/push/merge/deployment/provider call.


## 2026-11-03 | Lumen | Explicit interview choices
- Creation answers may include bounded decisionChoices tied exactly to unresolved questions, with 2–4 options and an optional recommendation. Legacy question-only replies remain readable. The prompt asks for concrete options, leaves unanswered questions open, and does not treat a vague endorsement as answers to separate decisions. Accepted proposal still requires no open questions. Focused tests cover valid, missing, and mismatched choices.

## 2026-11-03 | Lumen | One decision per turn
- App creation prompt sequences essential questions; parser limits open questions to one. Focused regression covers grouped response refusal.

## 2026-11-03 | Lumen | Batched decisions
- App creation now accepts up to eight open questions with matched choices; the prompt asks all known essential design decisions together to reduce provider round trips.

## 2026-11-03 | Lumen | Live interview resilience
- Parser accepts bounded question objects with question/text/prompt strings after live Baseten shape drift; prompt requires strings and limits questions to material decisions, defaulting optional details. Two-turn live synthetic note interview reached a proposal. Tests and build pass.


## 2026-11-03 | Codex | CORE-owned executable program continuity
- coreApplication.ts validates and fingerprints a complete deterministic production definition, ownership and accepted context; save/restore requires accepted state and matching successful Orb/socket contracts. CoreManifest.application retains it through app snapshots. Existing code frames remain non-executable context.
- Request-specific proposal evidence preserves generation and restore histories as separate immutable entries. Focused21 checks include source/context/binding tampering, quota/reopen, no-model runtime restore, evidence conflict regression and real generated build/preview. Full app final427pass/1unchanged identity determinism failure; gateway274pass/buildpass. See docs/ACCEPTED_CORE_RUNTIME_2026-11-03.md. Uncommitted/independent review pending; active demo unchanged.

## 2026-11-03 | codex | Peer2 five-gate remediation candidate (not published)
- Architect authorized assertionrepairs, actualInterviewClient ingestion, ToDoID→realAST gate, fullbundle secondarymodel audit and dynamicdependencyresolution. Historicalgeneratedsuite repaired inisolatedproposalcommit26c8f36:28/28pass, originaldf8 failures preserved. No UIlayout/class changes; functionalclient acceptance carries source-derivedinterviewIDs and explicitpinneddependency into existingCOREproductionpath.
- Added AST/exportnode binding with runtime-onlydynamicimport/manifest checks; isolatednpmignore-scripts install+lock+test/build; localindependent fullbundle auditor hash/ID/model gates before receipt/preview; savedCORE carriesdependencylock and restores revalidate. Liveproductionmount always configures assemblygate; no numericgovernance substitution.
- Candidateprecheck729tests0fail0skip/buildpass; gate regressions cover omissions/comments/invalidsyntax/stalehash/samewriter/dependencyimport-in-test-only/auth/origin and gateordering. Actualinterview/dependency/auditor liveverification stillpending; no updatedreceipt pushed. Existing UIlayoutwork preserved locally.

## 2026-11-03 | codex | Retained false assembly approval and content remediation
- Secondactualclientrun emitted27filebundle after730repo tests/4generatedtests/build and independentllama3.2:3b pass (72,274inputbytes/24,752prompttokens193.734s). BrowserverifiedrealtrimmedTitle→slugifydynamicimport→hello-peer-two, but onboardingcomponents containedonlylabels, missingrequestedusefulinstructions. This is retainedasfalseapproval, notclosure; preview stopped and receiptpushheld.
- Productionpromptnowexplicitlypreservesfullrequestedexplanatorycontent. Auditorreceives focusedactualASTsourceperrequirement plusentirebundle, explicitheadings-only incompleteness check; schema constrainsidentityfields/allowedIDs, neverdecision. Rejectedmodeldecisions/findings retainedprivately, stillno emittedreceipt. Focused19checks/buildpass; originalbadartifactwillbe a live negativecontrol beforeupdatedclientrun.
- Countqualification: prior phrase Prelive2730 meant pre-live attempt2 with730tests, not2,730tests. Source/generation failures and latency remainevidence; no layoutadjustment/sourceCSSchange or remote receiptpush.

## 2026-11-03 | codex | Six UI fixes retained locally
- Lowered keyboard navigation banner; renamed APP to MENU; local-session-aware Luminary connection reports Active/Standby; anchored Command Console above footer with 12px clearance; New App Luminary trigger focuses actual interview input. ToDo selection opens coding mode with full task/context.
- Exact requirement ID/text, AST binding, artifact hash, independent audit pass and successful build/tests gate automatic completion; mismatch/failed/partial cases covered. Live existing audited nine-requirement receipt restored all nine checked states; selecting task enabled coding mode and real local status Active DESIGN. New App trigger focus verified at390x700 without horizontal overflow.
- Full731tests passed (288 gateway/443 app), final TypeScript/build/diff checks passed. Existing Vite chunk warning remains. No new model calls, server restart, commit, push or merge; UI changes remain local per bundling request.

## 2026-11-04 | Lumin | Q4 repaired local candidate verified
- Base788c809+productpatch92167605d07a; authenticated3133statusmatches. Explicitdependencyobject/fieldidentifierprompt+parsererrors addedwithoutcoercion; startupawaitsactual-listeningandthrowsbinderror.733repo tests(288gateway445app)0fail/skip/buildpass;realoccupiedsocketcompiledexit1/EADDRINUSE/no false success.
- ActualUIinterview→explicitbaselinependingcomplete/filter→accept→generateHTTP201 ID03c3f285,20files/6IDs/22ASTbindings/3generatedtestspass/buildpass. Source0080a7a4745f06ef81e8e4855ed735219d4f8a0890d4c2cf687b51b317a5804c. MountedQwenpass;CLIpositiveexit0/pass;realincomplete-form+emptycontentnegativeexit0/holdwithcorrectsemanticfindings.10browserchecks passedincludingpendingnotice/navigation/reload/Stop.
- Reportdocs/Q4_REMEDIATION_SUCCESS_2026-11-04.md;private candidatebinding/receipt/audits/traffic .luminary/q4-repair-20261104. ReceiptSHAa893a27be40c2c19af3103464d8a0b6aa262f05ac5e7f640f348863c0d42bfbf. Baselineonly;complete/filterpending,IDQmigrationseparate. Previewstopped;3133gatewayavailable. Localuncommitted;no push/merge/nonauthorapproval.
