# Governance validation report — 2026-11-03

Status: discovered executable checks completed. Findings now use the six-category register in GOVERNANCE_FINDING_CLASSIFICATION_2026-11-03.md; blocked/deferred/historical/informational items do not halt progression. This is not a blanket compliance or production-readiness certification.

## Scope and discovery

Inspected current code, package/configuration files, scripts, `.github`, policy/license files and documentation. The working tree already contained extensive uncommitted work; it was preserved. The repository has no GitHub Actions workflow to execute.

Discovered 94 test files: 88 canonical `src`/`server` files, one standalone Orb file, and five detached review snapshots. Ran all 94, including snapshots without treating their outcomes as current-runtime evidence. Rescanned after each file-level test and extended queued check. A final reporter-driven canonical run also performed 710 discovery searches after individual completed test/suite events: 678 tests passed, no failures/skips, and zero new test files. Two terminal scans each found 890 non-dependency/generated files (including this report), the same 94 test files, and zero newly discovered tests. Documentation discovery additionally retained 198 candidate checklist/table rows across 24 files; these rows include formatting and historical references and are not 198 executable tests.

Detailed private evidence, queues, logs and requirement dispositions are retained at `C:/Users/TraceyPrutch/.claude/plans/p5-governance-exhaustive-2026-11-03/`. No private operational rule bodies, raw model payloads or credentials are copied into this report.

## Executed checks and results

| Check | Final evidence |
|---|---|
| Canonical automated suite, 88 files | **678 passed, 0 failed, 0 skipped** in `final-canonical-suite.log`; private recorded artifacts and isolated real Redis enabled |
| Gateway component | 303 cases including five real-Redis cases; authentication, authorization, CSRF/CORS, schema rejection, governance gate binding, cancellation, audit, persistence/reconciliation, receipt and effect boundaries |
| Application component | 375 cases including identity, intent, construction, portal, assurance, evidence, admin sanitization/projection, and UI/runtime contracts |
| Redis restart/AOF probe | Passed: session, request identity, consumed delivery claim and receiver receipt survived restart; test keys isolated; temporary containers removed |
| Identity clock regression | Reproduced failure before repair; all 37 identity tests passed after repair; final full suite passed |
| Root production build | Passed after repairs: client/server/production TypeScript and Vite; existing large-bundle warning remains |
| Aether build | Passed after compatible dependency repair |
| Shield viewer build | Initially failed missing declared Spark dependency; passed after dependency restoration/compatible audit repair |
| Root dependency audit | Initially 9 vulnerable packages (1 critical, 5 high, 3 moderate); after compatible repair **3 remain (2 high, 1 moderate)** |
| Root production-only dependency audit | Fails: MSAL advisory remains; development-only Vite/esbuild findings excluded by this view |
| Aether dependency audit | Initially 3; after compatible repair **2 remain (1 high, 1 moderate)** |
| Shield viewer dependency audit | Initially 2 high; **0 remain** after compatible repair |
| to3d automation dependency audit | **0 vulnerabilities** reported |
| Fresh live HTTP checks | **4/4 expected outcomes**: two real-writer conversations, one protected-input hold with zero model calls, and one explicitly synthetic unsafe writer output withheld by real gates |
| Decision-log integrity | **329 records hash-chain verified**; does not establish externally anchored rollback/deletion detection |
| Current-format PTAG replay | **51 validated**, no inference/effects; four older-format records chain-verified only; mixed-history validation finding below retained |
| Strict-CSP Basis patch check | Passed idempotent patch/check script |
| Knowledge generator and affected tests | Generator executed; subsequent run idempotent; affected knowledge tests passed |
| Static preview and config checks | Preview page and referenced built assets HTTP 200; no Vite client; config-presence check executed without credential output |
| Configured-secret exposure check | Two configured nontrivial secret values absent from current textual source and emitted client/server artifacts; limited exact-value scan, not a general secret audit |
| License scope consistency | `package.json`, Apache-2.0 code license, scope exclusion and asset-pending statements consistent; media rights not certified |
| Diff whitespace | Initial whole-tree check passed; final whole-tree check flags a concurrent append-only peer lane blank line at EOF. Excluding that unrelated lane, the final check passes; peer history preserved |
| Detached review snapshots | One passed 3 assertions; four could not load missing snapshot modules; separate from canonical results |
| Standalone Orb test | Cannot load absent HandshakeEngine/RelationContract implementation; also lacks configured Jest-style runner |

Tests were not counted repeatedly across reruns. Historical live robustness batches remain separate evidence and were not added to the 678 deterministic assertions.

## Failures, causes and remediations

The private per-test rediscovery reporter initially failed to load because Windows absolute ESM paths require file URLs. Its launch path was corrected to a file URI; the diagnostic is retained and the full rerun passed. This was harness setup, not a product failure.

1. **Nondeterministic identity kernel — repaired.** `extractKernelRecords` generated continuity IDs with `Date.now()`, so otherwise identical ordered inputs could hash differently when time advanced. Replaced the timestamp with a SHA-256 digest of the selected source records. Strengthened the existing regression to move the mocked clock from 1000 to 2000 between projections. Verified failing-before/passing-after, 37 identity tests and final 678-case run. Read-only peer review found no blocker for identical ordered inputs. Property order, equal-priority record order and source metadata remain hash-sensitive; canonical equivalence across reordered data is not claimed.

2. **Dependency vulnerabilities — compatible repairs applied.** Used `npm audit fix --ignore-scripts` within declared version ranges, preserving pre-repair lockfiles privately. Updated the root, Aether and Shield lockfiles without `--force` or lifecycle scripts. The root critical proxy-address finding and multiple high/moderate findings cleared. Shield's missing declared dependency was restored, and its build/audit passed. Root/Aether findings requiring major-version migrations remain unresolved.

3. **Combined live-smoke/replay harness — diagnostics separated.** All four fresh HTTP cases passed. Its subsequent all-history replay failed with `ptag_material_units_invalid`. The full diagnostic retained two older-format failures: sequence 4 was historically admitted; sequence 18 was held as a shortfall. Current-format replay validated all 51 records. The four pre-source-map records were retained as chain-only evidence; no validator was weakened, no old record changed, and no new provider inference was used for replay. Per-record validator implementation/schema identity is absent, so cryptographic exact-revision historical replay cannot be certified. This remains an audit compatibility limitation, not a clean pass for all historical decisions.

4. **Standalone Orb and four review copies — blocked, not repaired by substitution.** Referenced implementation/snapshot modules are absent. Introducing a new handshake authority or silently replacing historical modules with current ones would change the test target. Their loader failures remain recorded.

5. **Preliminary aggregate worker exit — not reproduced.** One early npm run reported a reply-router test worker exit without a diagnostic. Its individual-file run and subsequent canonical aggregate run passed. Cause was not established; no claim that the identity repair fixed this separate exit.

## Initial unresolved register — reclassified by the subsequent finding register

- **Major-version dependency migration:** root `@azure/msal-node` and Vite/esbuild, plus Aether Vite/esbuild. Audit proposes MSAL 7 and Vite 8 outside the root/Aether declared ranges. These require a compatibility/migration scope and acceptance criteria; forced upgrades were not applied. Root authentication exposure remains a high-priority residual finding.
- **Missing Orb implementation and incomplete historical review packages:** unavailable source modules and runner configuration prevent meaningful execution. Loader attempts were made and logged.
- **Tumbler minimum acceptance:** all 20 documented acceptance scenarios are inventoried. No `RUN_SIGNED`, `REHYDRATE_WITNESS` or Tumbler implementation exists in active `src`/`server`; signed runtime/capsule/key/rotation/rollback fixtures and integration harness are unavailable. Local unit evidence is not full-standard conformance.
- **Full integrated architecture acceptance:** the documented signed/capsule/Courier/Build Master/authority pathways, full browser/WebGL/keyboard/accessibility/performance scenarios, preference-correction and deletion/backup workflows lack complete mounted implementations, test adapters or exact acceptance inputs. Existing local contract tests provide bounded partial evidence only.
- **External deployment/publication scenarios:** documentation proposes live endpoint deployment, GitHub PR/repository creation and external documents. This task supplies no exact external targets or separate authorization to deploy, publish or send remote messages. These actions were not performed.
- **Media/demo/submission checks:** exact final video/submission artifacts and asset-rights provenance are unavailable. Code license consistency is not asset redistribution clearance.
- **Legacy Meta smoke:** the repository script constructs the older optional gauge/router seam and does not establish the mandatory current bidirectional PTAG boundary. It was not allowed to initiate an ungoverned live interaction. Fresh equivalent HTTP scenarios used the current governance path instead; the legacy script remains superseded/unexecuted.
- **Historical replay:** four older-format records lack exact validator-source attestation; two fail the current validator, including an old admitted output. Complete historical semantic conformance is unresolved.

All discovered canonical runnable checks were executed. Remaining queue items are explicit failures or blocked requirements, not skipped successes. The subsequent user instruction supersedes that stop rule: execution continues past non-runnable findings and completes only when no unexecuted executable activity remains. Two final discovery passes found no additional runnable test files.

## Residual risks

- Concurrent `.aegis/lanes/chatgpt-work.md` has a whitespace-only blank-line-at-EOF finding; it was not rewritten because it is another peer's append-only history.

- Remaining root/Aether security findings, especially the MSAL production dependency.
- Existing long-running gateways were not restarted or remotely deployed; repaired dependencies/builds are local filesystem evidence, not a rollout claim.
- Local hash-chain audit lacks an external rollback anchor and per-decision validator-source identity.
- Conscience/reform/P6 durable integration and dynamic capability/event sources remain incomplete as previously documented.
- Passing deterministic and bounded live tests does not establish adaptive, multi-turn, comprehensive multilingual or full-application robustness; many live challenges stop at IRG and do not measure later-gate efficacy.
- Broad regulatory or named-framework certification is not established by this repository's local checks.

## Changed files and preservation

Implementation repair: `src/identity/kernel.ts`; regression: `src/identity/identity.test.ts`. Compatible dependency repairs: root `package-lock.json`, `aether-realm/package-lock.json`, `aegis-shield-viewer/package-lock.json`. Knowledge regeneration and strict-CSP scripts were run; their checks are recorded. Continuity/report files appended separately. Existing unrelated working-tree changes were preserved. No commit, push, merge, signing, trust mutation or remote deployment was performed.


## Progression and UI-target update

See [the six-category classification and additional runs](GOVERNANCE_FINDING_CLASSIFICATION_2026-11-03.md). The user identified port3012 as the UI on a separate unmerged branch. UI results there are runtime observations, not commit-equivalence evidence for this governancecheckout. Additional browser/securityactivities were executed after the original closure; findings do not globally gate progression.
