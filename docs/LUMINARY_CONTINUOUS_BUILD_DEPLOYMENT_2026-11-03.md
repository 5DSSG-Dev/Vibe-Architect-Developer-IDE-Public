# Continuous-build runtime deployment receipt

Architect-authorized local deployment, 2026-11-03 America/Phoenix.

- Runtime checkout: `G:/AEGIS_DEVELOPMENT_REPOS/vibe-accepted-core-runtime`.
- Executable source revision: `cbb228bbd57289d27b6af1fe3c8c91a32b95148d`, integrated on target parent430861f and published to PR52 (`codex/guided-new-app-20261102`). Source implementation67d26bd was also pushed to `codex/governance-lane-closure-20261103`.
- Replacement process: PID52312, compiled `dist-server/server/index.js`; base URL `http://localhost:3102`. Duplicate source-server/watch entrypoints in this exact checkout were stopped; unrelated historical QA fixture processes were preserved. The existing Baseten/gauge configuration and credentials were retained without printing credentials. Coding tasks were enabled for this authorized local deployment.
- Loaded instructions SHA256: `afb399dacdff0e449bafd1bb5e8ff099692c3fb2d9d00362b64aeb921898689b`. Authenticated status returned that exact hash and the source revision above. Compiled startup uses workspace-root prompt/knowledge paths; listener source explicitly binds127.0.0.1.
- Live smoke passed: root200; authenticated status200; anonymous status denied; executor ledger chain valid; baseBuild `.env` request rejected422 before model invocation; source-server entrypoints remaining0; loopback TCP connected and duplicate bind rejected10048. Windows psutil/netstat did not enumerate a LISTEN row, so process/socket enumeration is not the sole availability evidence.
- Local gauge `/v1/models` responded200 and included configured `llama3.2:3b`. This is availability evidence, not a new governance inference/audit.
- Provider request/spend counters unchanged during smoke; zero provider calls this turn.
- Target verification: gateway280/app441 =721passed, zero failures/skips. Full production build passed with existing large-chunk warning. Tests use fake provider/synthetic governance where declared. Runtime integration preserved this branch's existing review-record gate; no bidirectional/numeric/PTAG upgrade was substituted.

Private raw receipt: `.luminary/deployment/1793767986-receipt.json`; private startup log: `.luminary/deployment/1793767900-server.log`. These paths contain host-specific operational evidence and are not published.

The following documentation-only commit records this receipt; executable source remains the revision above. Earlier PR52 provider/browser receipts and clearance remain evidence for their named older revisions, not renewed clearance for this change. Peer2's independent audit is pending. The API's opt-in baseBuild batches are available, but the prior declared gaps (interview client invocation, automatic package installation, semantic ToDo verification, durable crash resume and final assembled-app audit) remain explicit; this deployment does not implement them.
