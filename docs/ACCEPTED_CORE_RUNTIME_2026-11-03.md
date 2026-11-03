# Accepted architecture to saved CORE application

## Situation and target

PR #52 is open at `ac03d4f07427dfb6e5907b0490422405c36137df`, stacked on the CORE Configurator branch. Its current source already contains the New App interview, explicit architecture acceptance, catalog/hierarchy validation, Orb handshakes with rollback, the application definition generator, and a governed local build/preview runtime. Its original PR description predates the generation work.

The missing continuity boundary was between generated application and CORE: `CoreManifest.applicationProduction` retained only a gateway-session receipt pointer. A gateway restart lost the in-memory receipt and required another generation even though the Architect had already reviewed the program.

The bounded target is an accepted Web App architecture with a reviewable program owned by CORE, a working local preview, and save/reopen without repeating model inference. This implementation is in `G:/AEGIS_DEVELOPMENT_REPOS/vibe-accepted-core-runtime`, branch `codex/accepted-core-runtime-20261103`, based on the exact PR head. The dirty public/governance checkout and existing preview worktree remain intact. The separately published demo-security repair has not been removed or replaced; this patch does not change that repair's files.

## Implementation and dependencies

1. `src/engine/coreApplication.ts` defines a data-only, versioned CORE program containing the production definition, object ownership bindings, exact accepted context, original generation identity and source/context digests. Saving requires explicit accepted state and matching successful Orb/socket contracts. The deterministic generator recomputes the source digest; no arbitrary source or Element code frame is executed.
2. `CoreManifest.application` holds the complete program. App import validates its shape and definitions. `saveCoreProgram` writes the current Workspace before React adopts the saved program, preserving the prior program on quota/write failure. Existing app export, archive, close and reopen retain this field.
3. Build & Preview offers **Save reviewed app to CORE** only for the current reviewed receipt with saved evidence. **Restore saved CORE app** reconstructs source without a model call and resets review. The Architect then reviews and explicitly launches through the existing controls or Terminal.
4. `ProductionRuntime.restoreCore` validates source/context hashes and requires the original `application_generated` note with the exact generation, digest, context and ownership bindings in the current private review record. A fresh/unrelated/closed record cannot authorize restoration. Restoration appends a note before registering the receipt; write failures leave no launchable receipt. Duplicate restoration reuses the same materialization.
5. The restore handler lives under the existing local production router and retains its authentication, limiter, development/local-session mounting condition, loopback/proxy-header and exact-origin checks. Launch still uses the existing record-open check, immutable-source checks, generated behavior tests, fixed Vite build and separate sandboxed static preview. No active gateway has been restarted or updated.

Restored materializations use separate browser evidence IDs based on their request identity. This fixes the browser-discovered collision between original generation evidence (with delivery anchors) and a restored receipt, without rewriting either entry.

## Verification

- All 21 focused CORE/production/client-state tests passed, including a real generated-app test/build/HTTP preview after runtime restart, no-model restore, original-record matching, changed source/context/bindings, closed/unrelated records, restoration-note failure, app export/reopen, quota failure and append-only evidence identity.
- Full gateway suite: 274 passed, zero failed/skipped.
- Final full app suite: 428 tests, 427 passed, one failed, zero skipped. The failure is `src/identity/identity.test.ts:443`, deterministic rebuild from identical inputs. `src/identity` is byte-identical to PR head; `kernel.ts:90` still uses `Date.now()` for its continuity ID. The earlier app run passed all 427 tests before the final evidence regression was added. The failing final receipt is retained; the full suite is not reported green.
- Production build passed, including client/server TypeScript and emitted server build. Existing large-bundle warning remains. Dependencies were reused through a local node_modules junction; no install or lockfile change occurred. Clean installation was not tested.
- Playwright exercised the actual ApplicationProduction component, saveCoreProgram helper, production router/runtime and generated React app in an isolated fixture at `127.0.0.1:5173/__core-flow`. The initial definition came from a scripted source through the existing governed-ask test adapter. No provider calls or credentials were used. Acceptance/handshake was exercised by the real engine fixture; the full live interview and 3D Workspace acceptance UI were not browser exercised in this turn.
- Browser flow: source review → failed quota save preserves old program → successful CORE save → explicit launch → add note → navigate to About and back with records retained → Stop removes iframe → runtime restart and page reload → named missing-receipt shortfall → restore CORE → launch disabled until fresh review → launch → add note. Metrics remained one scripted definition call and zero provider calls; restore repeated neither.
- Desktop 1100×900 and mobile 390×844 screenshots were captured; no page overflow or framework overlay was observed. The expected 409 for the missing pre-restart receipt is the sole browser error-level network entry in the final flow; it clears through explicit restore. No application runtime exception was observed.
- Temporary fixture gateway, Vite server and previews were stopped. Raw logs, fixture harness and screenshots remain under `C:/Users/TraceyPrutch/.codex/visualizations/2026/11/03/01a1a1be-97aa-75b3-a7cc-78022e891d58/`.

## Boundaries and open work

- The executable profile remains pages, text, forms, in-memory append/view records, hash navigation and generated GET API service modules. It does not add persistent app data, edit/delete/search/authentication, arbitrary code execution or external services. Generated API modules do not supply a backend. Unsupported essential requirements remain named generation shortfalls.
- Saving/reopening preserves the program, not records entered during a run. Restoration requires the original private review record and a compatible deterministic generator; it deliberately refuses a mismatched digest or missing record rather than generating silently.
- Existing Element code frames remain context for generation; this change does not compile them or claim each catalog Element's advertised behavior has been implemented. Build ToDo verification remains explicit Architect evidence and is not auto-completed by save/launch.
- Independent non-author review outside the author assistance pair remains pending. This implementation is local/uncommitted and is not Architect acceptance, merge clearance, deployment approval or production-readiness evidence.
- No commit, push, merge, provider call, active-route activation, demo restart or unrelated source/dependency change was performed.

To inspect the patch, open this worktree and run `git diff` plus inspect the new `src/engine/coreApplication.ts` and `.test.ts`. Reproduce the focused checks with `node --import tsx --test src/engine/coreApplication.test.ts src/engine/productionClientState.test.ts server/application-production.test.ts`. The active demo remains unchanged.
