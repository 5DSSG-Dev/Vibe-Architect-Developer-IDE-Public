# PR #52 — Merge Blocker Remediation Queue

Source: Lumin independent review 2026-11-04 (head `46a353650f559232bf8f18f8b43e7db62cf376c0`), disposition NOT MERGE-READY.
Remediation branch: `codex/pr52-blockers-remediation` (off the audited head).
Standing rule: **live data only — no mock data** (final stretch; a green run against stubs can hide a broken App).

Status legend: ☐ open · ◐ in progress · ☑ done · ⛔ gated (needs you / an independent party)

| # | Blocker | Owner | Status |
|---|---------|-------|--------|
| Q6 | Dependency risk — `npm audit` (1 critical / 5 high / 3 moderate) | Verus | ◐ critical cleared; msal HIGH dispositioned (demo scope V17); vite dev-only |
| Q3 | CI gate — run gateway+app suites and build as a check | Verus | ☑ workflow added |
| Q5 | Truncation/context durability — durable checkpoints, restart recovery, provider context budgeting (`server/luminary-meta.ts`, `server/application-production.ts`) | Verus | ☑ dispositioned — out of demo scope (DEMO_SCOPE V18) |
| Q4 | Live functional acceptance — real interview UI → accept → generate → launch; auditor vs known-good AND known-bad (empty/labels-only must be rejected) | Verus | ☑ dispositioned — live HOLD half proven on :3012 w/ approved thresholds; PASS+launch capture waived by Architect (2026-11-04) |
| Q1 | Integration path — merge/review #51 first, or retarget #52 to main; validate combined diff | **You** (decision) | ⛔ |
| Q2 | Exact-head non-author approval | **Independent reviewer** (not Lumin, not Verus) | ⛔ |

## Notes per item
- **Q6**: vulnerabilities reported as inherited from the stacked base (#51). Fixes may belong on #51; will confirm which advisories originate here vs base.
- **Q5**: current behavior is bounded in-process continuation only; in-memory request map at `server/application-production.ts:33`; `finish_reason: length` path ~`server/luminary-meta.ts:237–316`.
- **Q4**: enforcement points `server/assembly-gates.ts:16–80`, `server/application-production.ts:123–149`. Must prove the hollow-app case (empty component text) is REJECTED — Lumin found it currently passes structural bindings.
- **Q1/Q2**: cannot be closed by Verus. Q1 needs your go-ahead; Q2 needs an independent non-author reviewer.

## Progress log

### Q3 — CI gate ☑ (2026-11-04)
Added `.github/workflows/ci.yml`: on push-to-main and all PRs, runs `npm ci`, `npm test` (gateway+app), `npm run build`, and a production-runtime `npm audit --omit=dev --audit-level=critical` gate. Baselined locally: gateway 288 pass, app 443 pass = **731, 0 fail/skip** at this head.

### Q6 — dependency risk ◐ (2026-11-04)
`npm audit fix` (non-breaking) applied: **9 → 3** vulnerabilities; the **critical** (`proxy-addr` IP spoofing) and several highs/moderates (`qs`, `body-parser`, `nanoid`, `postcss-selector-parser`, `source-map-js`) are resolved within semver range. Remaining **3 all require breaking major upgrades** and need your disposition:
- **`@azure/msal-node` — HIGH, PRODUCTION runtime (auth).** 5.6.0 → **7.1.2** (semver-major). Advisory: authorization-code flow may disclose parameters to an attacker-controlled endpoint. Fixing needs an auth-code-path review, not a blind bump. **This is the one that matters most** — it ships.
- **`vite` / `esbuild` — 1 high + 1 moderate, DEV/BUILD only.** Needs vite 5 → 8 major. Not shipped at runtime; lower urgency.

CI audit gate is set at **critical (prod-only)** so it passes now; it does not yet block on the msal high pending your upgrade decision.

### Demo-scope dispositions (per docs/DEMO_SCOPE_APPROVAL_2026-11-03.md) — 2026-11-04
This is a **local demo**; two items Lumin flagged are already Architect-approved deferrals:
- **Q5 (truncation/context durability)** → **DEMO_SCOPE V18**: persistence across reload/gateway restart is out of demo scope; in-memory/bounded continuation is the accepted behavior. F5 is a documented deferral, not a demo merge blocker. Remains an open future-build ToDo (not "implemented").
- **Q6 `@azure/msal-node` HIGH (Entra auth)** → **DEMO_SCOPE V17**: the demo has no login/authentication path, so the Entra authorization-code flow is not exercised. The advisory is dispositioned for the demo; upgrade msal 5→7 when auth is actually implemented. Remaining vite/esbuild advisories are dev/build-only.

Caveat (DEMO_SCOPE line 20): a scope deferral does **not** mark a feature implemented; each stays a pending build ToDo, and the independent non-author merge approval (Q2) remains a distinct gate.

### Q4 — IRG gauge not calibrated/activated (live finding) ☐ (2026-11-04)
Live Q4 attempt against PR #52 pipeline (dev-mode, Baseten writer, production route mounted). Real interview message submitted through the UI (no POST-body injection): _"a personal task tracker — add a task with title+due date, mark complete, filter to incomplete."_ On **two separate restarts**, the message was **returned through IDS** ("Your message was not sent to the Luminary"), i.e. the IRG message-governance gauge scored this benign, on-topic message below threshold and fail-closed.

This empirically reproduces Aster's record-based finding:
- The recorded **IRG calibration candidate** was **Meta `muse-spark-1.3` via the direct Meta API** — NOT the local `llama3.2:3b`.
- The local `llama3.2:3b` candidate was tested and **over-blocked the sample cases** (matches the live IDS returns above).
- That choice is dated **Nov 1** in the project record; **no verifiable Nov-3 final selection**. The record still lists **threshold calibration and live route activation as PENDING**.
- Note the architecture conflict: `gauge-local.ts` enforces a **loopback-only** endpoint (`assertLoopbackEndpoint` throws on non-loopback), so the calibrated `muse-spark-1.3`-via-Meta-API route **cannot run as the embedded gauge under the committed code** without a loopback proxy or relaxing that guard. The Nov-3 receipt's "IRG gauge remains `llama3.2:3b`" reflects the over-blocking local fallback, not the calibrated choice.

**Root cause identified (direct gauge probe, 2026-11-04):** `llama3.2:3b` is NOT broken — it emits `YES`/`NO` as the first token exactly as the IRG expects. Probing the gauge model directly over Ollama `/v1` with a clearly-good interview message (`max_tokens:1, top_logprobs:5`) returned first token `YES` at logprob **−0.339 → P(YES) ≈ 0.71**, with `NO` at −1.27 → P ≈ 0.28. So a plainly-good message scores **~71 on that virtue — only just above the 70 threshold**. Across **all seven virtues, fail-closed (every virtue must clear 70)**, each virtue is a near-coin-flip at the 70 line, so the joint pass probability is low and most attempts are returned through IDS (observed: `POST /api/luminary/ask → 422`). The Nov-3 "it worked" run is the case where all seven happened to land ≥70; the current IDS returns are the same distribution from the failure side.

**The `{"...":70}` thresholds in `.env` are an uncalibrated placeholder, not the Architect's calibrated values.** This is a calibration gap, not a code regression and not a broken model.

**Impact on Q4:** the writer/AST/qwen-auditor/launch tail is reachable; the IRG message-governance stage simply needs calibrated thresholds (or a higher-headroom gauge model) so a good message clears reliably while a genuinely bad one is still held. Options, Architect's call:
1. **Calibrate thresholds down** to match this model's score distribution (e.g. ~55–60), giving good messages margin while bad messages — which score P(YES) far lower — are still blocked. Fastest path; keeps the loopback-only local gauge as-coded.
2. **Switch the gauge** to a higher-headroom local model (e.g. `qwen3:14b`, already pulled) whose good-message P(YES) sits well above 70, keeping thresholds at 70.
3. **The calibrated Meta `muse-spark-1.3` route** — requires resolving the loopback-only guard (`assertLoopbackEndpoint`) via a local proxy or relaxing it; heaviest path.

Either (1) or (2) closes Q4's functional-acceptance gate with live data; the choice of calibrated values remains the Architect's authority.

_Further items appended below as they close._

### 2026-11-04 | Lumin continuation — threshold profile mismatch reproduced and corrected locally
- Supersedes the earlier seven-coin-flips/lucky-Nov3 explanation: token probability is not run-level pass probability. Nine real gauge runs were largely stable. Five benign runs failed uniform70 and passed the already Architect-approved per-virtue profile; four explicit negative diagnostic runs were withheld under both. Arbitrary uniform55/60 would still fail these benign controls.
- Found exact STP0002 P18 threshold approval,2026-10-27: Honesty13.8/Respect29.3/Attention23.9/Affection16.3/Loyalty10.7/Trust11.9/Communication34.7. Legacy adapter hash matches public checkout. Restored only that threshold line in remediation .env and ignored .env.live-q4.example. No new calibration or changed gauge logic/model.
- Real AppCreationConversation submitted Verus original task-tracker request through temporary3132: inbound and writer reply cleared IRG on pass1, Baseten MuseSparkOpen returnedHTTP200 and real design questions; no corrective revision. Oneprovidercall/USD0.02471425. Temporary browser/gateway closed; existing3012 remained200 and unchanged. This does not establish3012 loadedconfig or close wholeQ4 app/auditoracceptance.
- Correct intended name is IDQ, per Tracey. This branch still has legacy ids modules/protocol fields/modelprompt/UIstrings; those are a migration gap, not current intended terminology. Prior notes preserve historical spelling only.
- Full report: docs/PR52_IRG_THRESHOLD_CONTINUATION_2026-11-04.md. Missing34UIassets/staticdelivery-from-hidden-worktree failure and model/corpus limits retained. No source algorithm change, commit/push/merge, or running3012 restart. Q4 remains open overall.

### 2026-11-04 | Verus — full live Q4 path on restarted :3012 with approved STP0002 P18 thresholds
Correction to this file's earlier seq-52 "seven coin-flips / lucky Nov-3" explanation: that framing is withdrawn, consistent with Lumin's seq-65 note — token-level P(YES) is not run-level pass probability, and the Architect ran several stable end-to-end runs. The operative cause was a **uniform-70 placeholder overriding the Architect-approved per-virtue profile** (STP0002 P18, 2026-10-27: Honesty 13.8/Respect 29.3/Attention 23.9/Affection 16.3/Loyalty 10.7/Trust 11.9/Communication 34.7). Those approved values were already present in the remediation `.env`; the running server was holding the stale uniform-70s in memory (`tsx watch` does not reload `.env`).

Advance this session (on the real `:3012`, not a temp port):
- Restarted the dev server so it loaded the approved per-virtue thresholds. Status: `replySourceKind:baseten`, `gauge:configured`, spend-metered live.
- Real AppCreationConversation through the UI (no POST-body injection): interview message **cleared the gauge on pass 1** (`POST /api/luminary/ask → 200`); live Baseten Muse Spark Open returned real design questions. Accepted recommended defaults → **second turn also cleared** (`200`) → writer returned a full **architecture proposal** (6 catalog Elements + 3 requirement-mapped build ToDos, IDs R001-01/R002-01).
- Accepted architecture → 3D CORE Matrix populated → **Generate application** hit the real production route `POST /api/luminary/production/generate`.
- **Result: `409` capability-honest HOLD.** The generator refused to emit a hollow/faked app and returned requirement-ID-mapped reasons: R001-01 "mark complete" needs in-place record *edit* (first profile is append-only, no edit/delete); R001-01 "filter incomplete" needs search/filter (Data profile lists string fields only); R002-01 "persist after reload" needs localStorage (profile is in-memory only). This is the **anti-hollow-app property Lumin F2 demanded** — it will not claim it built what the profile cannot build.

**Q4 status after this run:** the HOLD half (won't emit a hollow/capability-exceeding app, with honest reasons) is demonstrated live end-to-end. The **PASS+launch half is not yet captured** — the task chosen exceeds the first profile (edit/filter/persistence). To close Q4's "known-good passes AND known-bad held" matrix, run an **in-profile** app (append string records + list + pages/nav, no edit/filter/persistence) and confirm it generates `200` and launches. No commit/push/merge; `:3012` left running on the approved thresholds.

**Architect disposition (2026-11-04):** this live evidence — real interview → architecture → accept → generate on `:3012` with the approved per-virtue thresholds, and the capability-honest `409` HOLD (Lumin F2 anti-hollow-app property) — is **accepted as sufficient for Q4**. The in-profile PASS+launch capture is **waived** by the Architect. Q4's functional-acceptance gate is dispositioned; the independent non-author sign-off (Q2) remains the distinct outstanding gate.

### 2026-11-04 | Lumin — local missing-asset obstruction repaired
- Userreportedtextureless3132; rootcauseLFS pointers servedHTTP200insteadofbinaries. Hydrated278objects/692MBfromlocalcachewithgitlfscheckout public/assets/**, remainingunhydrated0/trackedassetdiffempty. Realbrowserreloadhasno34asseterrorbannerorfailedrequests; Luminarymaterialsrender. Existinggatewaynotrestarted. Q4fullapp/auditoracceptance remainsopen.

### 2026-11-04 | Lumin — Q4 live verification failed at definition contract
- Rebuilt hydratedassets successfully; compiled3133gateway exactHEAD788c809 verified bystatus. Tracey explicitly authorized3133 after3132remainedoccupied. Prior3132attempts lackedbindingproof andremainseparatediagnostics. Sourceindexstartup ignoresExpressbinderrorandcanloglisteningonEADDRINUSE; noarbitraryelevatedprocesskilled.
- Realheadlessinterview/accept/generate usedVerusrequest plusauthorizedbaseline/pendingcomplete+filter. Bothactualwriterproductionanswers useddependencies[] andinvalidfieldname due-date; bothHTTP409Unsupportedgenerateddependency. All6ToDoIDshavesyntacticbindingsbutnoAST/productionreceipt/filedigest/auditapprovalexists. No payloadwasmanuallyrepaired.
- Addedrequestedmissing scripts/audit-assembly.ts; actualdefaultcommandexit2/UNVERIFIEDbecausegatedreceiptabsent; strictstandalonetypecheckpassed. Livepositive/negativeauditorbranches remainunexecuted, notcredited. Baselinescope/artifact retainsbothfuturefeaturespending/implementedfalse.
- Fullreportdocs/Q4_LIVE_APP_VERIFICATION_2026-11-04.md; privatehashboundreceipt .luminary/q4-live-20261104/q4-audit-receipt.json. Q4remainsFAIL/open. Fixproductionoutputcontract/controlledrepairandstartupbindhandling, thenrepeatrealacceptance. No generator/gateweakening, commit/push/merge orindependentclearance.

## 2026-11-04 | Lumin | Q4 repaired local candidate verified
- Base788c809+productpatch92167605d07a; authenticated3133statusmatches. Explicitdependencyobject/fieldidentifierprompt+parsererrors addedwithoutcoercion; startupawaitsactual-listeningandthrowsbinderror.733repo tests(288gateway445app)0fail/skip/buildpass;realoccupiedsocketcompiledexit1/EADDRINUSE/no false success.
- ActualUIinterview→explicitbaselinependingcomplete/filter→accept→generateHTTP201 ID03c3f285,20files/6IDs/22ASTbindings/3generatedtestspass/buildpass. Source0080a7a4745f06ef81e8e4855ed735219d4f8a0890d4c2cf687b51b317a5804c. MountedQwenpass;CLIpositiveexit0/pass;realincomplete-form+emptycontentnegativeexit0/holdwithcorrectsemanticfindings.10browserchecks passedincludingpendingnotice/navigation/reload/Stop.
- Reportdocs/Q4_REMEDIATION_SUCCESS_2026-11-04.md;private candidatebinding/receipt/audits/traffic .luminary/q4-repair-20261104. ReceiptSHAa893a27be40c2c19af3103464d8a0b6aa262f05ac5e7f640f348863c0d42bfbf. Baselineonly;complete/filterpending,IDQmigrationseparate. Previewstopped;3133gatewayavailable. Localuncommitted;no push/merge/nonauthorapproval.
