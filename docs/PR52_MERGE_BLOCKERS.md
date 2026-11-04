# PR #52 — Merge Blocker Remediation Queue

Source: Lumin independent review 2026-11-04 (head `46a353650f559232bf8f18f8b43e7db62cf376c0`), disposition NOT MERGE-READY.
Remediation branch: `codex/pr52-blockers-remediation` (off the audited head).
Standing rule: **live data only — no mock data** (final stretch; a green run against stubs can hide a broken App).

Status legend: ☐ open · ◐ in progress · ☑ done · ⛔ gated (needs you / an independent party)

| # | Blocker | Owner | Status |
|---|---------|-------|--------|
| Q6 | Dependency risk — `npm audit` (1 critical / 5 high / 3 moderate) | Verus | ◐ critical cleared; 3 left need breaking majors |
| Q3 | CI gate — run gateway+app suites and build as a check | Verus | ☑ workflow added |
| Q5 | Truncation/context durability — durable checkpoints, restart recovery, provider context budgeting (`server/luminary-meta.ts`, `server/application-production.ts`) | Verus | ☐ |
| Q4 | Live functional acceptance — real interview UI → accept → generate → launch; auditor vs known-good AND known-bad (empty/labels-only must be rejected) | Verus | ☐ |
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

_Further items appended below as they close._
