# AEGIS Claims Board

Shared marker board so no peer codes on top of another. Append-only: never edit or delete a line.
Rules and line format: docs/TEAM_SYSTEMS_AND_LANES.md, section "Claims".

```
CLAIM   | <utc> | <peer> | <paths> | <STP ref> | <branch> | <expected release>
RELEASE | <utc> | <peer> | <paths> | <STP ref> | <merged | abandoned | handed to <peer>>
```

## Log

CLAIM   | 2026-10-24T23:06:10Z | verus | docs/HOUSEKEEPING_LEDGER.md (new file in S4 docs area) | none (Architect request) | stp/0002-ai-integration-and-luminary-presence | on commit
RELEASE | 2026-10-24T23:06:11Z | verus | docs/HOUSEKEEPING_LEDGER.md | none | merged on branch; handed to chatgpt-work (S4) for upkeep
CLAIM   | 2026-10-24T23:07:25Z | verus | native.zip, ORBS.zip, grok_logs.csv, .hintrc, public/assets/models/prismatic-aegis-emblem-optimized (1).glb, src/components/ApothecaryDrawer.tsx, src/components/AlchemistReliquary.tsx, src/utils/threeUtils.ts, src/components/aether-realm.code-workspace, apps/, .playwright-cli/, .playwright-mcp/, output/playwright/*.pid, .gitignore | Housekeeping Ledger H1,H2,H5,H7,H16,H20-H23,H26-H28 | housekeeping/low-risk-group | on commit
RELEASE | 2026-10-24T23:09:29Z | verus | low-risk group paths (see CLAIM above) | Housekeeping Ledger | merged on housekeeping/low-risk-group
CLAIM   | 2026-10-26T16:24:19Z | verus | native/stellar/**, src/stellar/**, server/stellar-*, scripts/stellar-*, docs/STELLAR_*, src/components/{StellarWorkbench,StellarNativeStarter,CodeModeView}.tsx, App.tsx+CodeEditorOverlayModal+BuiltInBrowserModal (rewire) | Hackathon public-repo prep (remove unfinished Stellar) | stellar-extraction/public-prep | on commit
RELEASE | 2026-10-26T16:33:03Z | verus | stellar extraction paths (see CLAIM above) | Hackathon public-repo prep | committed e4f7bb4 on stellar-extraction/public-prep; build+tests green
CLAIM   | 2026-10-27T20:51:51Z | codex | .aegis/stp/0003-pod-contracts-and-umbilical-standards.md, .aegis/stp/0005-portal-customs-boundary-and-return-inspection.md | STP-0003 P20/P21 and STP-0005 N2 review follow-ups | codex/stp-0003-review-followups | on commit
