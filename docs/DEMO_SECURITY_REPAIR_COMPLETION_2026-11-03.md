# Demo security repair completion — 2026-11-03

The Architect approved the prepared plan. It is implemented in the actual UI worktree, `G:/AEGIS_DEVELOPMENT_REPOS/vibe-core-configurator-preview`, branch `codex/guided-new-app-20261102`, base HEAD `ac03d4f07427dfb6e5907b0490422405c36137df`. The two tracked implementation files remain uncommitted; unrelated UI/output work was preserved.

## Applied repair

- `server/index.ts`: the existing development/local-session/static-preview profile now binds explicitly to **127.0.0.1** and refuses Entra configuration in that mode. Other server modes retain their existing listen behavior.
- `package-lock.json`: the prepared compatible dependency update was installed. `package.json` ranges were not changed and no forced major upgrade or lifecycle scripts were used.
- UI dependencies now reside in a real worktree-local `node_modules` directory. The pre-existing directory was a junction to the governance checkout. The initial install encountered a locked esbuild executable after following that junction; only the verified junction was removed, the UI installed independently, and the governance dependency tree was restored and validated. No recursive deletion of the shared target was performed.
- Verified old PID46972 was the named demo launcher/listener before stopping it. Replacement PID36332 serves3012 on **127.0.0.1 only**, with the same owned launcher. No other existing gateway was restarted.

## Verification

| Check | Result |
|---|---|
| Actual UI gateway tests |272passed,0failed,0skipped |
| Actual UI application tests |423passed,0failed,0skipped |
| Actual UI production build |Passed; existing bundle-size warning retained |
| UI audit |9entries→3; critical finding cleared; remaining2high/1moderate are MSAL/Vite/esbuild |
| Governance checkout after shared-directory recovery |678passed,0failed,0skipped with isolatedRedis/privateartifacts; npm dependency inventory exit0 |
| Source/lock application |Exact approved candidate hashes; package.json unchanged |
| Live page and localhost access |200, built bundle `/assets/index-8dE2X_2X.js` |
| Live Entra login/callback |503/401; no configured flow |
| Vite client/filesystem, editor and esbuild endpoints |404 on harmless canary checks |
| Protected admin operations without authorization |401 |
| Local session |Same-origin204/status200; cross-origin403 |
| Browser |Root rendered;0JavaScript errors; existing missing-thumbnail warning; App form and library visible;0inline script elements |
| Model/provider calls requested by this repair validation |0 |

The isolated candidate guard/listener checks also passed. Temporary test servers and Redis containers were closed/removed. Full receipt, installed versions, source/lock/bundle digests, install incident logs and test/build/audit logs are retained privately in `demo-security-assessment/implementation/`.

## Remaining findings and exact scope

The three dependency audit entries remain **Failed**; their major migrations remain **Deferred**. This implementation does not make the audit clean. For the approved **local, on-machine, built-files, Entra-disabled demo profile**, the assessed vulnerable features are not shown active by the checked source and live endpoints. The loopback/static-profile mitigation is now applied rather than merely proposed.

This disposition ends at demo completion or before Entra, Vite/editor/esbuild serve features, non-loopback/public tunnelling, or relevant source/config/dependency changes. Revalidate the exact build and exposure checks at any such change. No public/LAN/production access is cleared by this report.

The UI branch's mandatory PIM/IRG/PTAG/RBC integration remains a separate finding. This repair neither adds PTAG to that branch nor certifies its conversation route. The pointer-overlay and thumbnail findings are also not silently closed by a security-only repair.

## Rollback package

Private `implementation/before-index.ts`, `before-package-lock.json` and `before-package.json` preserve the original bytes. For an authorized rollback, verify the currently owned listener, stop only that demo process, restore the two original tracked files, install their matching dependencies into the **independent UI directory**, rebuild and rerun the relevant checks, then restart the owned launcher and verify its binding. Do not recreate the shared dependency junction. Restoring the old index also restores broad listening behavior, so rollback is not a security-equivalent approved demo configuration.

No commit, push, merge, public deployment, trust mutation or Entra provisioning was performed.
