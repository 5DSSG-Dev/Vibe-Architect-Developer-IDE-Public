# Folder Totem: src/components

## Append Log

### 2026-10-30 | Codex | Retire unsupported modes
- Removed `SimulateModeView` and `DeployModeView`; the Header no longer presents dead-end mode tabs. Saved legacy mode values are ignored by App and the workspace opens normally.
- The remaining CORE export is a workspace JSON download, now labeled `Export workspace`. Resource/status labels no longer imply live CPU telemetry or a running simulation.
- M5 remains a future feature; no runtime scenario testing or deployment is claimed.

### 2026-10-30 | Codex | Verification and review publication
- Supersedes the pending-check note above: production build and `git diff --check` pass; existing Vite large-chunk warning remains. Tests were not run.
- Browser confirmed the removed modes and plain workspace export on a fresh Vite instance at port 3016 because 3015 had no listener; the temporary server was stopped.
- Commit `9b5fa25` is included in open PR #25: https://github.com/5DSSG-Dev/Vibe-Architect-Developer-IDE-Public/pull/25. STP-0004 remains at Proposal with no M5 completion.


## 2026-11-02 | Codex | Isolated workspace UI changes
- Requested by Tracey: Inspector Deck opens from bottom bar; connected Orbs stay docked and ignore legacy transform overrides; Luminary is slightly larger/up-left with a Click to talk button. Reconciled backdrop engagement area and conversation placement.
- Extracted only nine UI source files from the public checkout after verified pending-change backups. Shared peer history and pipeline/admin work excluded. Prior preview production build and focused tests passed; isolated combined build is checked next. Browser gesture/visual verification remains outstanding.


## 2026-11-02 | Codex | Isolated App menu
- Requested seven App actions replace the unused Build app window. New/Open/Recent/Close/Export/Delete/Close IDE preserve complete workspace snapshots, including saved app source. Delete asks confirmation and blocked browser-tab closure provides manual-close guidance. Export/import uses .vibe-app.json.
- Included App menu, persistence helper and lifecycle tests only. Unused builder modal, preview server, peer claims, unrelated branding and shared historical notes excluded. Five lifecycle tests passed in preview; isolated combined build is checked next.


## 2026-11-02 | Codex | Isolated verification complete
- Supersedes pending-check notes above: combined isolated UI/App-menu production build passes, including client/server TypeScript and Vite; focused lifecycle and spatial-state tests pass 23/23; git diff --check passes. Existing Vite chunk-size warning remains. No browser visual/gesture verification.
- Both active checkouts retained their source files, branches and indexes; Lumin continues work in the public checkout. Pending files were backed up with byte verification before isolation. Two scoped local commits contain UI and App menu only, with temporary assets and peer pipeline/admin changes excluded. No push or merge performed.


## 2026-11-02 | Codex | CORE Configurator review preview
- Added app details persisted inside CORE manifest, app-type crystal defaults and selectable isolated GLB preview. Removed CyberPeer daemon controls from this modal and clarified resource budget wording.
- Prepared on isolated current-main worktree for Architect visual review. Existing active checkout untouched.


## 2026-11-02 | Codex | Crystal picker feedback
- Added visual thumbnail choices in expandable crystal picker. Seed preview uses shared workspace loader with Meshopt/KTX2 support and shared cache ownership; preview no longer disposes cached assets.
- Retains separate scene, environment and renderer cleanup. Browser interaction review remains pending.


## 2026-11-02 | Codex | CORE footer Luminary
- Docked the Luminary trigger in the CORE modal footer, centered beside Done. Suppressed floating paused trigger only while CORE modal is open; shared conversation state and workspace placement preserved.


## 2026-11-02 | Codex | Guided New App demo
- New App preserves the departing snapshot and creates a unique vacant draft CORE without starter contracts or CyberPeer daemons. First launch without saved workspace enters the same draft conversation; existing workspaces are preserved.
- Added live-gateway app planning conversation, bounded catalog-only proposal validation, explicit Architect acceptance, runtime Orb handshakes, requested Satellite/Actuator hierarchy, and rollback on connection/evidence failure. No model call occurs until Send. Rehearsal is rejected for this planning flow.
- The creation bubble enlarges and the 3D Luminary eases to 1.4x at the same screen anchor while assembly is hidden. Selected crystal updates the workspace CORE. Optional loopback-only preview gateway proxy keeps provider credentials server-side.
- Production build and 356 app tests passed before final added empty-child regression. Desktop Commander has stopped responding; Windows application, browser interaction and live-provider validation remain pending. This creates starting architecture, not working app code or production acceptance.

## 2026-11-02 | Codex | Guided creation verification
- Final production build passes, including TypeScript checks. Full app suite: 358 passed, zero failed/skipped. Rejects uncontracted model-only Orbs before proposal acceptance; explicit empty child lists stay empty. No provider calls or browser visual tests performed. Desktop Commander remains unresponsive; preview application pending.


## 2026-11-02 | Codex | Local preview gateway session
- Explicit opt-in development-only loopback session authenticates same-origin local preview without exposing demo/provider keys. Existing public header authentication unchanged. Provider type now has machine-readable status separate from display name.
- Windows build and ten local-session/access tests pass; real HTTP session204/status200/cross-origin403 verified. Baseten live source and gauge configured; no model inference requested.


## 2026-11-02 | Codex | Planning conversation readability
- New replies align their beginning within the conversation scroller. Text selection is enabled inside the frame; Copy conversation includes greeting, turns and available architecture proposals, with manual-copy fallback.
- Follow-up requests carry the previous structured proposal, including pre-update in-memory proposal state. React hook order retained and gateway not restarted during application. Visual/browser behavior remains for Architect verification.


## 2026-11-02 | Codex | Suggestion shelf and Element-screen Luminary
- New App composer keeps up to three model suggestions below input. Choice clicks send directly, preserve unsent draft, retain unused choices and replace selected slot after successful response. Failed calls retain choices and proposal; no filler suggestions are invented. Prompt history retains initial requirements and latest architecture without resending every old proposal.
- Orb/Satellite/Actuator EnvironmentView now creates the shared Luminary Presence, follows the same screen anchor, supports avatar click/hover and disposes owned resources. Async model completion is guarded after unmount.
- Thirteen focused creation/suggestion/anchor/cache-ownership checks pass. Windows build checked; browser visual and live suggestion-click confirmation remain with Architect. Saved app data was not cleared.


## 2026-11-02 | Codex | Compact composer and immediate request echo
- Send appends the Architect request before awaiting authentication/model calls and clears submitted input immediately. New typing is not erased on reply; failed/stopped requests remain visible with status.
- Moved Copy conversation beside Send. Replaced three tall suggestion cards with a single-line native dropdown, retaining direct submission and replacement behavior. Prompt requests short user-facing feature ideas without Element IDs. Current proposal is preserved correctly in copy/history while a request is pending.
- Build verification checked separately. No gateway restart or provider request for this UI update; active conversation can finish before manual reload.


## 2026-11-02 | Codex | Centered planning window and addition summary
- Centered New App panel horizontally with responsive viewport width. Successful suggestion requests returning a revised proposal appear in an additions summary after app details and immediately before the acceptance controls.
- A suggestion response that asks questions without returning a proposal does not mark the suggestion completed or consume its shelf choice. No saved app data or gateway configuration changed.


## 2026-11-02 | Codex | Explain architecture gaps
- Renamed remaining capability section to What the app still needs, with explicit distinction from Architect instructions and an Explain remaining work action that sends the listed gaps for explanation without silently adding features.
- Planning prompt now requires impact and supported next steps for essential unresolved requirements, proactive explanation in the reply, and separation of unrequested enhancements into suggestions (e.g. rich-text editing versus requested plain notes). Acceptance remains architecture-only.


## 2026-11-02 | Codex | Suggestion presentation and completion scroll
- Suggestions remain in structured conversation data and Copy conversation but are no longer appended as duplicate Suggestion lines in the visible Luminary reply. Planning instructions also ask the model not to repeat them in message.
- A successful selected-suggestion response with a revised proposal scrolls the transcript to the bottom so the included addition and acceptance controls are visible. Ordinary requests/replies retain beginning-of-message scroll; errors and clarification-only replies do not trigger completion scroll.
- Earlier remote application was blocked by approval-review usage exhaustion; resumed after access returned. Local production build passed; Windows build checked separately. No live inference or workspace storage changes.


## 2026-11-02 | Aster | Workspace ToDo and Apothecary handoff
- Architect approved the interview -> accepted architecture -> Workspace reveal -> optional Apothecary journey. Implementation is local and uncommitted on codex/guided-new-app-20261102 (base79c1443).
- Accepted proposals preserve agreed work, full interview and architecture in CoreManifest.appBuildPlan. App-local ToDo items flag Luminary through its existing selection chip; current Element context is retained. Apothecary entry preserves the selected pending task. No automatic model request or execution.
- Workspace reveal precedes a nonmodal one-second invitation. Not yet retains exploration; ToDo offers Continue to Apothecary. Checkboxes require explicit Architect verification evidence; opening editors never completes work. Full decisions remain inspectable. Imported metadata is validated; corrupt restored ToDo metadata displays a warning without discarding the Workspace.
- Fresh verification: focused23/23, application406/406, production build and git diff --check pass. Existing large-bundle warning remains. Full npm test stopped at unchanged server/luminary-p19.test.ts:65 (259/260 gateway pass; extra replySourceKind field). Earlier app suite also reproduced the previously recorded intermittent identity.test.ts:443 deterministic-rebuild failure; final app rerun passed406. Neither server nor identity source was changed.
- Supplemental independent GPT reviewer found four issues plus final-decision truncation; all repaired with regressions and re-reviewed with no remaining substantive findings. This does not satisfy the named final Verus/Libra outside-pair gate. Browser visual, keyboard interaction and live interview behavior remain unverified. No provider calls, gateway restart, commit, push, merge or deployment.
- Return point: final outside-pair review and local browser rehearsal on a newly accepted proposal; older already-accepted apps are preserved and are not retroactively assigned invented work.


## 2026-11-02 | Lumen | Build & Preview
- New ApplicationProduction is keyed by CORE identity; proposes definitions through existing governed gateway, exposes source/ownership review, explicit launch, execution output and sandboxed Preview/Stop. Receipt pointers persist with the app. Review binds to exact receipt/digest/context; delayed restore cannot supersede a later action. Request/evidence recovery and building/unknown status guards preserve active controls. Automated runtime checks pass; browser/live-provider rehearsal and final Verus/Libra review remain pending. Existing running gateway still needs source reload; see chatgpt-work lane.


## 2026-11-03 | Lumen | Application Terminal launch controls
- Build & Preview now shows a keyboard Terminal for a generated receipt. Fixed commands help/files/status/start/stop/clear use existing production status and governed launch/stop actions; arbitrary shell input is not executed. Start requires the same exact source/context review and saved evidence as the launch button. Generated test/build output and preview appear in this panel. Browser interaction remains to be rehearsed.


## 2026-11-03 | Lumen | Guided ToDo and Apothecary entry
- AppBuildJourney now constrains its ToDo panel to viewport height/width, wraps long tokens, and shows compact task summaries with full detail on demand. Selecting a task visibly opens a short build guide and attaches its complete accepted context to Luminary. Entering Apothecary opens the guide with the next unfinished item. Guide text is deterministic local UI guidance, not a model reply or completion claim.

## 2026-11-03 | Lumen | Sequential interview choice
- AppCreationConversation presents and sends one current decision; the Luminary follows with the next needed decision or proposal.

## 2026-11-03 | Lumen | Batched interview form
- AppCreationConversation shows separate question boxes, accepts one selected or custom answer per box, and sends the complete batch together.


## 2026-11-03 | Codex | Save/restore the reviewed CORE program
- ApplicationProduction adds explicit Save reviewed app to CORE and Restore saved CORE app. Restore resets review/evidence readiness and reuses existing explicit Launch/Stop/Terminal controls; no automatic model call or run. Browser verified forms/navigation, stop, restart/restore/fresh-review/relaunch and failed quota save with zero provider calls. Desktop1100x900/mobile390x844 fit; expected missing-receipt409 documented.
- Independent review pending; no active gateway/route activation. Exact evidence and profile limits: docs/ACCEPTED_CORE_RUNTIME_2026-11-03.md.

## 2026-11-03 | codex | Peer2 five-gate remediation candidate (not published)
- Architect authorized assertionrepairs, actualInterviewClient ingestion, ToDoID→realAST gate, fullbundle secondarymodel audit and dynamicdependencyresolution. Historicalgeneratedsuite repaired inisolatedproposalcommit26c8f36:28/28pass, originaldf8 failures preserved. No UIlayout/class changes; functionalclient acceptance carries source-derivedinterviewIDs and explicitpinneddependency into existingCOREproductionpath.
- Added AST/exportnode binding with runtime-onlydynamicimport/manifest checks; isolatednpmignore-scripts install+lock+test/build; localindependent fullbundle auditor hash/ID/model gates before receipt/preview; savedCORE carriesdependencylock and restores revalidate. Liveproductionmount always configures assemblygate; no numericgovernance substitution.
- Candidateprecheck729tests0fail0skip/buildpass; gate regressions cover omissions/comments/invalidsyntax/stalehash/samewriter/dependencyimport-in-test-only/auth/origin and gateordering. Actualinterview/dependency/auditor liveverification stillpending; no updatedreceipt pushed. Existing UIlayoutwork preserved locally.

## 2026-11-03 | codex | Six UI fixes retained locally
- Lowered keyboard navigation banner; renamed APP to MENU; local-session-aware Luminary connection reports Active/Standby; anchored Command Console above footer with 12px clearance; New App Luminary trigger focuses actual interview input. ToDo selection opens coding mode with full task/context.
- Exact requirement ID/text, AST binding, artifact hash, independent audit pass and successful build/tests gate automatic completion; mismatch/failed/partial cases covered. Live existing audited nine-requirement receipt restored all nine checked states; selecting task enabled coding mode and real local status Active DESIGN. New App trigger focus verified at390x700 without horizontal overflow.
- Full731tests passed (288 gateway/443 app), final TypeScript/build/diff checks passed. Existing Vite chunk warning remains. No new model calls, server restart, commit, push or merge; UI changes remain local per bundling request.

## 2026-11-04 | Lumin | Workspace UI follow-up candidate
- Localcodex/q4-ui-followup-20261104 separatesconstructionToDosfrominterviewledger;positionsToDobesideCabinetwide/stackednarrowwithviewportscrollbound;measuresfooterforConsole/dropdownclearance;persistsLuminarylabelthroughconversationandCabinetinteraction. Realbrowser1440/1100/390boundsandtaskcontextpassed;full734tests/buildpassed. Published8f771ceunchanged;notcommitted/pushed.

## 2026-11-04 | Lumin | CORE selector and Console placement
- ArchitectannotatedscreenshotrequestsleftCOREselectorandrestoredConsoleposition. Selectorleft12;Consolecenteredattachedfooterupperedge. Actualbrowsergeometryverified;no publishedcandidatechange.

## 2026-11-04 | Lumin | Selector rail clearance
- Supersedesleft12placement:COREselectorstarts16pxrightof1inElementsrail(left112px),widthboundedwithinremainingWorkspace. ActualbrowserCORElabelunobscuredhit-testpassed;Consolepositionunchanged. No publication.

## 2026-11-04 | Lumin | Bottom bar Build Preview
- BuildPreviewtriggernowrendersinfooterhostnexttoApothecary/Inspectorwithmatchingbuttonclasses/icon;existingproductiondialogandclosefocusretained. Browsermatchingheight/dialog/focus/one-triggerpass;buildpass. Localonly.

## 2026-11-04 | Lumin | Footer batch live3012
- TerminalCommandConsoleentryopens/focusesexistingApplicationTerminalevenbeforegeneration;helpworks/startstopremainfenced. COREcrystalrightclickopensCoreMatrix;Orbcontextstillinspects;duplicateP0selectorremoved;knowncorruptseparatorsfixed. Real3012browserchecks/full734tests/buildpass. VibeAtlasexcludedbyArchitect. Singlelocalcommit/no push or merge.
