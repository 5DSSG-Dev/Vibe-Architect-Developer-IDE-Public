# Clean Dependency Audit — two-task handoff

Date: 2026-11-03. This is an assignment packet; it is not evidence that Aster has received or accepted it.

## Task A — Aster: Vite and esbuild

Target first: G:/AEGIS_DEVELOPMENT_REPOS/vibe-core-configurator-preview, branch codex/guided-new-app-20261102. Preserve its unmerged UI, server/index.ts loopback/static-demo/Entra guard, and independent node_modules directory. Inspect live branch/HEAD and package/lock hashes before editing. The server currently runs on port3012; do not interrupt it during candidate preparation.

Own the Vite/esbuild build-tool migration, including @vitejs/plugin-react and build/config compatibility. Current Vite5.4.21/esbuild0.21.5 are affected. The prior audit proposed Vite8.3.5; reverify the fixed supported version and Node/plugin requirements. Do not use an aggregate audit fix --force or modify MSAL/authentication code as part of this task.

Prepare in an isolated candidate with a real node_modules directory. Validate the actual UI gateway/application tests, full production build, browser render, static asset routes, same-origin session bootstrap, cross-origin denial, admin denial and loopback-only static serving. The existing MSAL finding is expected to remain until Task B is integrated. Deliver exact source/config/package delta, lockfile, installed versions, audit JSON, test/build logs, served artifact hashes and rollback instructions.

If repository-wide clean audits are requested, apply the same reviewed Vite/esbuild migration separately to the governance checkout and aether-realm; do not claim those packages clean from the UI audit alone. Shield and automation were previously clean; verify rather than upgrading them gratuitously.

## Task B — Codex: MSAL

Own @azure/msal-node upgrade to a fixed7.x version and any required server/entra-auth.ts API compatibility changes. Start with pinned7.1.2, rechecking the maintained advisory and package metadata. Entra remains disabled/outside demo scope; no tenant, secret, certificate or account provisioning. Validate the real library API, adapter request construction, state/nonce/tenant/audience/role checks, session rotation/logout and configuration/denial behavior without contacting Microsoft or enabling authentication.

Prepare isolated candidate and source/package delta. Successful Task B removes MSAL's advisory; Vite/esbuild are expected to remain until Task A is integrated. Deliver exact dependency range/version, any adapter/test diff, audit evidence and test/typecheck results. Preserve the demo's local static profile.

## Shared-file rule and integration order

Both tasks affect package.json/package-lock.json. They must NOT concurrently edit the active UI worktree's package files or dependency directory.

1. Aster owns the first Vite/esbuild candidate and its package/lock files.
2. Codex develops MSAL in C:/Users/TraceyPrutch/.claude/plans/p5-msal-migration-2026-11-03 and delivers a dependency/adapter delta, not an instruction to overwrite Aster's lockfile.
3. After Aster's candidate is ready, apply Codex's MSAL package change to that exact candidate and regenerate its combined lockfile once. Rebase any adapter change by inspected content; do not copy an old full lockfile over it.
4. Run combined install, full tests/build, fresh full audit (including dev dependencies), and live smoke. A clean audit requires zero entries; hiding dev dependencies or disabling features is not a clean audit.
5. Replace only the verified owned demo process after combined validation, preserving127.0.0.1 binding, rollback artifacts and current source/build identity. No public deployment, commit, push or merge follows from this task split.

## Final acceptance

Task A: no Vite/esbuild-related entries in the scoped audit; tested compatible build and serving behavior. Task B: no MSAL entry; real-library adapter compatibility and denial/session tests pass. Combined completion: same exact candidate/lock passes all tests/build and reports zero known vulnerabilities in a fresh full audit, with separate audit receipts for each additional subproject claimed clean. Formal production authentication acceptance remains outside the demo.

## Codex candidate result

MSAL 7.1.2 isolated candidate is ready at C:/Users/TraceyPrutch/.claude/plans/p5-msal-migration-2026-11-03. Focused authentication/session/config checks: 31 passed. Final full suite: 704 passed, zero failed or skipped. Server typecheck and production build passed. Audit now contains only Vite and esbuild. No Microsoft/provider requests or Entra provisioning occurred.

Integration inputs: msal-package.patch, server/entra-auth-migration.test.ts, and separate identity-prerequisite.patch. The prerequisite backports the governance branch's deterministic identity continuity hash: the UI's Date.now-based identifier caused one initial full-suite failure. With the separate correction, the full suite passed. Preserve this distinction when reviewing the MSAL change.

Evidence: delivery-receipt.json, migration-manifest.json, msal-validation.log, msal-typecheck.log, msal-full-tests-after-prerequisite.log and msal-final-build.log in that directory. The isolated copy contains minimal build support assets, not the complete demo media set; final combined browser/static-asset acceptance must use the actual UI assets. Active UI package and lock hashes remain unchanged from the source manifest. Candidate readiness is not combined audit closure or live rollout.
