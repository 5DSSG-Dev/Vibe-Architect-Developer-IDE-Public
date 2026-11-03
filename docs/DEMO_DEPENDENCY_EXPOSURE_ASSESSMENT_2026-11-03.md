# Demo dependency exposure assessment and prepared repair — 2026-11-03

## Decision

Do not require Entra provisioning or a rushed MSAL/Vite major migration merely to run the local static demo. The evidence supports **not currently exercised** for the reviewed MSAL auth-code and Vite/esbuild development-server features on port3012. It does not support calling the dependencies fixed, every exploit disproved, or an exception approved.

Before a local-only demo exception is eligible, apply the prepared loopback/static-profile hardening and the compatible UI dependency repair in the actual UI branch, then rebuild/retest/restart that owned server. The live process currently listens on `::` (all IPv6 interfaces); no firewall/LAN reachability claim is inferred from binding alone. Do not tunnel/publicly expose this local-demo profile.

## Exact target and fresh evidence

- User UI target: `http://localhost:3012`.
- Listener owner: PID46972; inspected command line names `node --import tsx tmp/codex-launch-new-app-gateway.cjs`. The script changes to `G:/AEGIS_DEVELOPMENT_REPOS/vibe-core-configurator-preview`, setsdevelopment/static-preview/local-session flags and imports that worktree's server/index.ts. The live process’s inherited environment was not independently dumped, and exact loaded module bytes are not proven by inspecting files after startup.
- Fresh live main bundle observed: `/assets/index-CsKSGBec.js`. Earlier bundles in prior reports are historical and not the current UI artifact.
- Both inspected installations contain MSAL5.5.0,Vite5.4.21,esbuild0.21.5 on disk. This is a fresh observation, not an assertion that long-running processes reloaded those bytes. Prior governance receipts named a different installed MSAL version; they must not substitute for this assessment.
- Root audit reports3entries. The separate UI worktree audit reports9entries, including a critical proxy-addr entry and additional compatible fixes. Earlier root repairs were not assumed to propagate across worktrees.
- On3012: root200; authlogin503; authcallback401; adminoperations401. `/@vite/client`, a harmless nonexistent `/@fs/` canary, `/esbuild`, and harmless `/__open-in-editor` request all404. No `Access-Control-Allow-Origin` header returned for the untrusted-origin probes. No model request was made. These are harmless feature/exposure checks, not exploit attempts against secrets or the shell.

## Advisory applicability

| Dependency / advisory | Required feature or condition | Demo evidence and classification |
|---|---|---|
| MSAL GHSA-xcx6-jx8p-x3h5 | Authorization-code flow; fixed in7.1.0+ | Login503andcallback401; source refuses authorization without config. No Entra tenant configured. **Installed vulnerability remains; reviewed flow not currently exercised.** Do not enable Entra under this disposition. |
| esbuild GHSA-67mh-4wv8-2f99 | esbuild serve HTTP feature with permissive CORS; fixed in0.25.0+ | Demo is static Express output; `/esbuild`404and no permissive CORS observed. **Installed version remains affected; standalone serve feature not evidenced as active on3012.** A Node esbuild binary used for compilation is not by itself an HTTP serve endpoint. |
| Vite path traversal / fs allow/deny / middleware advisories | Active Vite development middleware and its source/optimizer routes | Static main bundle, no Vite client, tested devroutes404; source static-preview passes `vite:null`. **No active dev-middleware path shown on3012.** Do not re-enable it or use Vite preview/dev as a substitute. |
| Vite launch-editor advisories (including Windows UNC, escaping and editor arguments) | Reachable launch-editor middleware processing attacker-supplied paths | Harmless editor endpoint404; no editor, shell, UNC or real-file exploit was attempted. **Feature not evidenced as active on3012.** Loopback alone would not cure a reachable malicious-website-to-localhost editor endpoint; keeping the endpoint absent matters. |

Primary advisory references:

- [MSAL maintained advisory](https://github.com/AzureAD/microsoft-authentication-library-for-js/security/advisories/GHSA-xcx6-jx8p-x3h5)
- [esbuild maintained advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)
- [Vite optimized-map advisory](https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9)
- [Vite middleware advisory](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw)
- [Vite Windows deny advisory](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff)
- [launch-editor maintained security advisory index](https://github.com/vitejs/launch-editor/security)

The esbuild CORS advisory is not used as a blanket explanation for every Vite vulnerability. Each Vite advisory remains in the saved audit receipt; non-Windows-only conditions are not asserted applicable to this Windows demo.

## Concrete prepared repair

Two reviewable patches are private in this assessment directory, not applied to the separate UI branch:

1. `local-static-demo-hardening.patch` targets **only server/index.ts** at the original source SHA in candidate-manifest.json. It identifies existing local static-demo mode, refuses accidental Entra configuration in that mode and binds that mode explicitly to127.0.0.1. Other modes retain their existing listener semantics. Existing admin denial and local session/origin/provider-key handling are retained.
2. `compatible-ui-lock-repair.patch` targets **only package-lock.json**, generated by `npm audit fix --package-lock-only --ignore-scripts` in an isolated copy. It changes no package.json range. The resulting audit falls from9entries (1critical/5high/3moderate) to3(0critical/2high/1moderate), retaining MSAL/Vite/esbuild. Exact version changes are in compatible-lock-changes.json. This is a prepared lockfile, not proof that the installed or running server has been repaired.

Apply only if originalIndexSha256/originalLockSha256 still match. The rollout work is: apply those exact changes to the named UI branch; install the resulting lock under the normal approved build process; run its actual gateway/app tests and production build; verify the mandatory governance integration separately; restart only the owned demo service; confirm loopback binding, static routes, Entra-disabled guards, local-session origin handling and the new served artifact digest. Do not report the prior unmodified process as repaired.

The pipeline integration gap on the UI branch remains a separate governance finding; this network/dependency patch does not add PTAG or certify its model routing.

## Verification performed on the candidate

- Candidate entire server entrypoint typechecked through the actual UI tsconfig.server.json using a compiler-host overlay:0diagnostics, no target source edits.
- Executed the exact proposed listener and guard statements with the actual UI createGateway in an isolated loopback fixture; confirmed127.0.0.1binding and rejection of Entra-configured demo mode before listen.
- Seven static/auth/dev-tool/admin route checks passed. Cross-origin local-session bootstrap403; same-origin204; auth-code calls0andprovidercalls0. Temporary fixture server closed.
- Lock-candidate audit produced3remaining entries without modifying package.json. The whole repaired dependency graph has **not** been installed/full-suite tested in the UI worktree; that remains required before applying/running it.
- UI source and lock hashes remained equal to their pre-assessment digests. The live service was not stopped or restarted.
- Initial private harness failures were harness setup only: .ts needed ESM .mts, and a fixed3012test origin did not match an ephemeral port. The corrected fixture used its actual bound origin and passed. These do not imply a product security failure.

## Proposed bounded exception — not accepted or active

If the two repairs and rollout tests pass, the remaining MSAL/Vite/esbuild findings can be presented for an Architect decision limited to **this on-machine static demo session**. Conditions: built files only; loopback only; Entra disabled; no Vite/editor/esbuild serve endpoint; no public tunnel or remote audience access to the service; existing origin/key/governance controls retained. Expires at demo completion, before enabling Entra/dev middleware/non-loopback access, or on any relevant source/config/lock change, whichever occurs first. Recheck the manifest and exposure probes at that point. Full dependency migrations remain recorded for later development/production.

No exception has been approved by writing this proposal. The live all-interface binding means the proposed local-only exception conditions are not yet satisfied.


## Implementation supersession
The user approved the plan. The prepared patches are now applied and the owned3012process was replaced and verified loopback-only. See [completion evidence](DEMO_SECURITY_REPAIR_COMPLETION_2026-11-03.md). Prior unapplied/unrestarted statements describe the assessment checkpoint; they are not current rollout status. Remaining audit findings stay recorded.
