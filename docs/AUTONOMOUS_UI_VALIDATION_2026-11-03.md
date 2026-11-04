# Autonomous Vibe Architect validation — 2026-11-03

Scope: isolated development gateway at http://127.0.0.1:3012, branch codex/guided-new-app-20261102. Synthetic private-note requests only. No Architect workspace was accepted or modified during the live probes.

## Executed evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Gateway session/status | PASS: local session 204, Baseten live source, gauge configured | Authenticated local status probe |
| Ambiguous live interview | PASS: 8 questions and 8 matching choices, parsed; 21.5 seconds | output/qa-live-interview.mjs |
| Detailed live interview | PASS: 8 questions and 8 choices, parsed; 38.3 seconds | output/qa-live-interview.mjs |
| Multi-turn live interview after repair | PASS: 3 material questions then accepted parser proposal with five explicit construction gaps; 22.4 + 35.8 seconds | output/qa-multiturn-final.log |
| Gateway regression | PASS 272/272 | output/qa-regression-tests.log |
| Client/engine regression | PASS 423/423 | output/qa-regression-tests.log |
| Production IDE build | PASS TypeScript and Vite | output/qa-regression-build.log |
| Generated fixture | PASS 3/3 project tests and its Vite build; separate preview HTTP 200, asset HTTP 200, Stop closes preview, tamper/unknown request guards pass in gateway suite | output/production-runtime-test-ju0bEf/app-SpL1VO, server/application-production.test.ts |
| Stress generation | PASS 199 objects, 1,000 initial records, 209 files, deterministic output, empty records, invalid-reference refusal and Vite build | output/qa-generator-stress.mjs; output/qa-stress-app-OfBXQ6 |
| App snapshots | PASS identity, ToDo, catalog and receipt save/reopen/import tests within client suite | src/utils/appFiles.test.ts, src/engine/appBuildPlan.test.ts |

## Live findings and repair

1. A live reply occasionally placed question text in objects rather than strings. The original parser rejected it with “invalid or oversized text field.” The parser now accepts bounded `question`, `text`, or `prompt` properties while rejecting unknown objects; the prompt explicitly requests strings. Regression covers both accepted and rejected forms.
2. The first eight-question interview led to another eight mostly optional questions. The prompt now asks only material Architect choices, uses sensible defaults for minor implementation details, and presents a proposal after the answered batch unless an essential blocker remains. The fresh live two-turn probe reached a proposal.
3. The resulting proposal preserves the synthetic note requirements as pending work. It does not claim that the generated application implements edit/delete/search or persistence.

## Lifecycle coverage and remaining shortfalls

| Phases | Status and reason |
| --- | --- |
| 1–2 New app and interview | Live gateway/model/parser exercised for ambiguous and detailed requests; two-turn proposal reached. Actual browser creation controls unavailable to this session. |
| 3 Requirements capture | Transcript/ToDo snapshot tests pass. No automated semantic assertion that every live requirement survives a long interview; the UI sends first plus last eight turns after the ninth, which can omit an earlier middle requirement from the model prompt. |
| 4 Workspace generation | Blank identity, contract handshake, app build plan, export/reopen tests pass. Actual browser acceptance and rendered workspace were not exercised. |
| 5–6 Discovery/gap analysis | Catalog ID and hierarchy validation pass; live proposal names selected Elements and missing work. Similarity/reuse quality has no executable oracle or traceable test for every catalog item. |
| 7–8 Apothecary creation/modification | ToDo focus and selection context tests pass. Creation and editing exist as UI flows, but no end-to-end browser test verifies metadata, serialization, version/dependency preservation, or automatic return integration. |
| 9–10 Code generation/app behavior | Deterministic template, generated tests/build/preview pass. Current generator supports pages, text, forms, in-memory append/view records, hash navigation and read-only API GET. It does not implement edit/delete/search/authentication/persistent storage. Those requirements remain explicit gaps, not verified behaviors. |
| 11–12 Accessibility/responsive | Static labels and viewport classes inspected. Keyboard/focus, contrast, clipping and overlap at mobile/tablet/desktop sizes require the unavailable local browser surface. No visual pass is claimed. |
| 13 Regression | Fresh full suites and build pass after repair. |
| 14 Stress | Large definition and empty/invalid data pass deterministic generation/build. Runtime interaction under 1,000 records was not browser exercised. |
| 15 Traceability | The sample note request maps to proposed Orbs/ToDo gaps and proposed verification steps, but no implemented edit/delete/search handlers or corresponding functional tests exist. A complete Requirement → Element → Implementation → Test chain is not yet available. |

## Missing artifacts and risks

No user-generated project accepted from the live interview, no browser screenshots or keyboard/responsive traces, and no per-Element creation/export/import evidence. Production receipts are gateway-session scoped; saved pointers alone do not recover a project after gateway restart. The synthetic generated fixture is an executable slice, not proof that the full requested note app works.

Executable checks within the available CLI/gateway surface were exhausted for this pass. Browser-only work is blocked because the available browser surface has no tab connected to the user's local 3012 host. Actual Apothecary creation and a complete feature implementation are required before the remaining end-to-end claims can pass.
