# Vibe Architect — D01–D14 Implementation and QA Follow-up
Date: 2026-11-03
Branch: `codex/accepted-core-runtime-20261103`
Status language: Closed = tested within stated scope; Partial = implementation exists but complete requested browser/semantic coverage absent; Deferred = expressly excluded by demo scope; Open = unverified or missing.

## Requirement / defect → Element → implementation → test → result

| ID | Requirement / defect | Element / implementation | Test / evidence | Result |
| --- | --- | --- | --- | --- |
| V04 | 9+ turn cumulative retention | Luminary interview / `creationLedger.ts`, `AppCreationConversation.tsx` | `creationLedger.test.ts` 12-turn fixture, final synthetic proposal assertions | Partial: deterministic regression PASS; live semantic-model completeness not proven |
| V10/D02 | Create Satellite/Actuator, parent map, unique ID and typed contract | OrbBuilder, catalog, `relationEngine.ts`, `App.tsx` | `review-d02-d03-browser-results.json`, `review-authored-hierarchy-results.json`, `appFiles.identity-authoring.test.ts` | Closed for authored data and catalog hierarchy; live CORE reintegration excluded under V13 |
| V10/D03 | Honor runtime language; refuse unsupported | Builder → `createDefaultElementCodeFrame` | Browser-authored Rust Satellite/Python Actuator; unit asserts TS/Rust/Python and rejects PyTorch/Stellar | Closed for supported Python, Rust, TypeScript, JSON templates; does not claim PyTorch native runtime |
| Identity | Time-independent continuity identity | `identity/kernel.ts` | Previously added clock-advance identity test; full app test suite | Closed |
| V13 | Automatic reintegration | Apothecary/Workspace | `DEMO_SCOPE_APPROVAL_2026-11-03.md` | Deferred; attachment remains explicit |
| V16 | CRUD/search in generated app | Generator | Scope record | Deferred |
| V17 | Authentication in isolated demo | Generator | Scope record | Not Applicable |
| V18 | Persistent entered note data | Generator | Scope record | Deferred |
| D01 | Duplicate production widgets after revisit | `App.tsx` uses distinct stable `production:` and `journey:` keys | Isolated browser fixture did not find duplicate control; exact resume/reload regression needs full replay | Partial |
| D04 | Field and icon control names | Builder, Element Properties, Code Editor | Builder field-name probe PASS and WCAG axe scan PASS after fix | Closed for builder; other screens remain in-scope QA |
| D05 | Luminary visible-name mismatch | `LuminaryHost.tsx` | Accessible name aligned with displayed 'Luminary'; complete assistive-tech traversal pending | Partial |
| D06 | 4.5:1 contrast | Builder, Code Editor, Element Properties | Builder axe WCAG2A/AA/2.1AA zero violations after text token adjustments | Partial; editor and all-state human contrast review outstanding |
| D07 | Keyboard equivalent for 3D content | `App.tsx` semantic Enter/Inspect navigation list | Source + build verified; keyboard-only end-to-end navigation not yet exercised | Partial |
| D08 | Closed console inert | Footer | `review-d01-d14-results.json`: collapsed menu inert PASS | Closed (bounded) |
| D09 | Cabinet close focus return | Footer/LeftDrawer | Browser focus back to Apothecary trigger PASS | Closed (bounded) |
| D10 | Footer rename synchronized to manifest | Footer/App persistence | Browser rename then saved Workspace manifest PASS | Closed (bounded) |
| D11 | Footer responsive overlap | Footer | Four viewport checks 390/768/1100/1440: no document horizontal overflow and no measured footer-control collision after second patch | Closed for checked breakpoints; other UI layout states still need inspection |
| D12 | Floating guidance alignment | AppBuildJourney | Increased top clearance and bounded max height; no complete overlap map or keyboard review | Partial |
| D13 | Modal inert background/companion | Dialog / App Luminary wrapper | Browser confirmed Luminary inert during builder modal; modal focus exercised | Partial; multi-modal and assistive-tech coverage outstanding |
| D14 | Open/Reopen vs Clone semantics | AppMenu/appFiles | Six unit tests include unique Recent identity and draft clone; browser menu shows explicit actions | Closed for unconnected drafts/reopen; accepted-app clone intentionally refused |

## Browser evidence scope and limitations
All browser evidence is from isolated, scripted, zero-provider localhost fixture. No production account, active demo, or Architect's workspace was edited. Actual imported code is deliberately not executed by AppMenu; integrity of language/source/IDs/relationships/contracts is tested, not equivalence of active service execution. Unsupported PyTorch authoring is displayed as disabled; no covert TypeScript substitution.

Source-bound receipt will identify the final code commit and include clean install/test/build receipts. Historical failed probes, including overlapping 768px footer and an initially missing socket selector label, remain as shortfall evidence rather than being rewritten as successes. Passing retests have separate receipts.

## Remaining release gates
Full UI traversal of V05/V06 3D navigation and resume, V09 Luminary context, V12 connected Element editing with revisions, imported Element runtime execution if promised, all-state contrast and keyboard audit (V20–V22), V04 live-model semantic retention, independent peer review, and Architect final walkthrough (V24). No Annex work added.
