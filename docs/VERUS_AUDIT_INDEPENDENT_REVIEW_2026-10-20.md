# Independent review of Verus repository audit — 2026-10-20

Verdict: Request changes to the audit wording; retain the confirmed product findings. This is an independent source review of the headline findings, with fresh build/test checks, not a certification or exhaustive security audit.

## Audit provenance and current context

Found Verus's final site-map/audit in C:/Users/TraceyPrutch/.claude/projects/g--AEGIS-DEVELOPMENT-REPOS-AEGIS-VIBE-ARCHITECT-DEVELOPERS-KIT/5a845f13-bd2e-4dd9-9b92-db37e86b3094.jsonl, assistant text beginning 'AEGIS Vibe Architect Developers Kit: site map and audit'. It was not saved as a repository report. Four subagent reports are alongside that session. Audit and current source share HEAD 714920c, branch totem/ide-c-0012-threeruntime-adoption-scope. main...HEAD is 3/1. Current worktree has untracked Totem scaffolding and historical evidence; do not repeat the audit's earlier clean-tree description as current status.

Read ROOT_TOTEM.md, relevant folder Totems, totems/README.md and both IDE shard lanes. New folder Totems are scaffolds. Claude through IDE-TOTEM-C-0013 and Codex through IDE-TOTEM-CODEX-0002 carry substantive history. Runtime adoption is partially implemented behind a default-off flag; the Codex P2-start record supersedes treating Claude's deferred plan as wholly unstarted. Totems remain passive evidence.

## Prioritized confirmed defects

1. HIGH: Misleading signed export. src/components/DeployModeView.tsx:22-28 emits a Math.random string in signature, while lines 50 and 77 advertise signed production export. This supplies no cryptographic authenticity. Line 57 claims 100% compliance regardless of passedChecks. Present truthful unsigned export or implement separately authorized real signing; derive compliance from evidence.
2. HIGH: Custom Orb handshake blocked. src/components/OrbBuilderModal.tsx:29 defaults new items to Formulas; setCategory is never called. buildConfiguredItem preserves that category. src/engine/relationEngine.ts:112 accepts only Orbs, and App.tsx applies the guard to attachment. Preserve the guard and correct builder taxonomy. Language/GPU are omitted and only the first selected satellite class is retained.
3. MEDIUM: Production startup instructions are incomplete. server/index.ts:27-29 supplies no bridge; server/stellar-capability-runtime.ts:41-47 refuses configured capability issuance without an injected bridge; server/config.ts requires that configuration in production/LAB. server/README.md tells production callers to set environment variables but provides no composition host. This is intentional fail-closed behavior plus missing operational integration/documentation, not a reason to bypass the bridge requirement. npm start alone does not select production; qualify the audit claim with NODE_ENV=production or LAB.
4. MEDIUM: Additional export freshness concern. DeployModeView initializes auditResult from manifest once and refreshes only on button click, while export serializes the current manifest. A manifest prop change while mounted can pair old audit evidence with new content. Bind audit to exported manifest/hash or recompute before export. Source-derived; not browser-reproduced in this review.

## Disposition of remaining Verus claims

- Finding 3: Supported in inspected components. Footer name edits only local state; browser navigation buttons lack handlers; fixed percentage/status text exists. Treat these as incomplete/mock UI rather than operational telemetry.
- Finding 4: Version difference confirmed, broken decoder NOT established. public/basis/PROVENANCE.json deliberately pins 0.184.0 and explains closure-based CSP changes relative to installed 0.168.0. Gateway tests verify provenance and CSP properties. A representative KTX2 browser decode test would establish runtime compatibility; matching package versions alone is not a fix.
- Finding 5: External-path prerequisites confirmed in stellar-authority-conformance.ts and stellar-language-completeness.ts. Both default paths are absent on this host. These are separate script suites, not evidence that the root app/gateway suites fail. Shell-glob portability is a concern, not a reproduced failure here.
- Findings 6-7: Archive/binary inventory is a preservation/planning issue, not deletion authorization. Branch divergence independently confirmed. Do not merge or remove files based solely on this audit.
- Finding 8: Correct the assertion that Stellar specs exist only in snapshots: tracked docs/STELLAR_WINDOWS_X64_V0_1_LANGUAGE_CONTRACT.md and 15 other STELLAR_WINDOWS* documents exist outside them. Canonical authority still requires evidence. The 70% duplication estimate was not independently recomputed; even byte duplication does not establish that append-only release/rejection evidence is disposable.
- Finding 9: Six stale linked worktrees are reported prunable, but not all point at the old G: root: two point into Temp. The main worktree correctly points at the current repository. Repair/prune was not performed; neither is an automatic blanket remedy.
- Finding 10: Operating Standards versions 0.3 root versus 0.1 docs confirmed. Conflicting copies need authority reconciliation, not an assumed newer-file winner. LDE duplicate content exists; full semantic comparison remains outside these spot checks.
- Finding 11: Orphan/dead-code inventory not exhaustively re-proven. Test-only modules and node:crypto imports are not by themselves browser defects unless reachable in the browser bundle. Compiler/capability contracts can intentionally precede integration. Preserve planned seams until owners and references are checked.
- Finding 12: Confirmed README omits new route families/roles, .env.example omits STELLAR_STARTER_COMPILER, and PROBE.agent.md lacks the opening frontmatter delimiter. Naming cleanup is lower priority.
- Finding 13: A 'no secrets found' scan is bounded evidence, not proof of absence. Git lists 16 PEM paths named as public review keys; this review does not certify all tracked/history content secret-free.
- Finding 14: Starter's 1 MiB parser runs before authentication (app.ts:108 versus :224); bounded unauthenticated parsing exposure is real, not an auth bypass. Compiler selection is configured by absolute path; starter verifies generated executable evidence hash, which is distinct from pinning compiler identity. Prioritize by exposure and deployment model. Distributed login limiting still requires shared enforcement; no multi-instance abuse test was run.

## Fresh verification

- tsc --noEmit: PASS.
- npm run test:app: 164 pass, 0 fail.
- npm run test:gateway with inherited NODE_ENV=production: 75 pass, 1 fail, 1 skip; missing React Refresh preamble assertion at server/app.test.ts:217.
- Same gateway suite with process-local NODE_ENV=test: 76 pass, 0 fail, 1 skip. This identifies an environment-sensitive test setup, not a proven app boot defect.
- npm run build: PASS; main JS chunk about 1.22 MB minified, with Vite size warning.
- The skipped native-compiler integration test is not native execution readiness evidence. Separate script suites and Windows native conformance were not run.

No source fixes, commits, pushes, service activation, trust changes, worktree cleanup, or external writes performed. Review artifacts and append-only Totem notes only; build regenerated ignored output. Lumin begin/health/query succeeded; query assembled context and RLS executed with failure_is_data=false. Four-role daemon operational status was not independently checked and is not claimed.
