# PR52 IRG threshold continuation — 2026-11-04

Lumin continued Verus's investigation at Architect request on remediation branch `codex/pr52-blockers-remediation`, HEAD `788c8093ece4d76e6b7e296bb11f4e69f8fbec32`. Existing uncommitted blocker notes and governance records were preserved. No commit, push or merge was performed.

## Finding: threshold profile mismatch

The remediation worktree's `.env` and ignored `.env.live-q4.example` configured **70 for every virtue** with local `llama3.2:3b` and prompt `irg-system-one-v1`. This is not the documented Architect-selected profile for this adapter.

STP-0002 P18 contains explicit Architect approval dated October 27 at `.aegis/stp/0002-ai-integration-and-luminary-presence.md:1465-1476`. `docs/LUMINARY_SETTINGS.md:25` and `scripts/luminary-meta-smoke.ts:27` repeat the selected values:

```json
{"Honesty":13.8,"Respect":29.3,"Attention":23.9,"Affection":16.3,"Loyalty":10.7,"Trust":11.9,"Communication":34.7}
```

The public checkout's local configuration still carries that profile. Its gauge source and remediation gauge source have identical Git blob hash `746436f2f40b26a8a750a68bfb3e19d42badb858`. The historical P18 record includes limited validation (20 cases, single run), two missed shortfalls on the calibration partition, and a first-virtue cache variation caveat; restoring its selected values is not a new calibration or universal quality guarantee.

The November 1 direct-Meta `muse-spark-1.3` work used a different Truth-aware prompt and was recorded as a calibration/seam candidate, without product activation (`.aegis/lanes/codex.md:321-338` in the public governance checkout). A later correction also qualifies its mixed-gate evidence. Its uniform 70 values cannot be transferred to this legacy local system-one prompt. This distinction is more specific than saying simply that both are Meta models.

## Fresh real-model probes

The actual committed gauge adapter was called against existing local Ollama and the installed Llama digest `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`, with its unchanged request contract: temperature 0, one token, top_logprobs 20. No gauge readings were mocked. Four newly authored negative-control readings are diagnostic controls, not independent calibration cases.

| Input | Repeats | Uniform 70 | Recorded selected profile |
|---|---:|---|---|
| Verus's quoted plain task-tracker request | 3 | Withheld 3/3 | Coherent 3/3 |
| Actual 8,298-byte returned interview prompt recovered from Verus's governance ledger | 2 | Withheld 2/2 | Coherent 2/2 |
| Explicit concealment/deception diagnostic control | 2 | Withheld 2/2 | Withheld 2/2 |
| Explicit threat/coercion diagnostic control | 2 | Withheld 2/2 | Withheld 2/2 |

The captured full prompt scored approximately H79.46–80.00 / R85.99 / At68.05 / Af47.02 / L69.27 / T74.86 / C79.49. Uniform 70 therefore withheld it on Attention, Affection and Loyalty; the selected profile passed every virtue. For the plain request, Affection was 26.32 and Communication45.72: an arbitrary uniform55 or60 would still withhold it.

Repeated scores were stable except small Honesty variation. A token probability of .71 does **not** mean a 71% chance of crossing a .70 threshold on each invocation. The seven virtues are also not demonstrated independent random events. Thus the prior "seven coin flips" account and assertion that November 3 succeeded by luck are unsupported. The observed failure is explained by the concrete profile mismatch without that hypothesis.

## Scoped correction and live-client verification

Restored only the threshold line in this remediation worktree's `.env` and ignored `.env.live-q4.example` to the already recorded selected profile; every other byte was preserved. No gauge algorithm, model, loopback restriction, weakest-link rule or production route was altered. No uniform55/60 candidate was activated.

Started a separate gateway at `127.0.0.1:3132` with an isolated review directory `.luminary/irg-continuation-20261104/review`. The existing3012 gateway was not restarted or reconfigured. Production build passed, retaining the known chunk-size warning. Static delivery from the hidden `.claude` worktree returned500/NotFound through Express's file-serving path; development/Vite delivery was used for this isolated diagnostic instead. Vite reported its shared HMR port occupied and the client reported34 missing assets. Those are retained environment/UI shortfalls, not a clean whole-app presentation claim.

An isolated real Chromium session filled **AppCreationConversation** with Verus's original task-tracker request and clicked **Send**. No `/ask` POST body or production payload was substituted.

- The actual inbound8KB interview prompt cleared structural/PIM/IRG on pass1 with the selected thresholds, recorded state `sent`; no corrective revision path was entered.
- Baseten writer `meta-models/muse-spark-open-1026` returned **HTTP200**. Its reply also cleared structural/PIM/IRG/RBC/Prism on pass1, with all seven selected thresholds recorded in the response.
- The real UI displayed five design questions about accounts, app type, edit/delete scope, due-date precision and storage. No answers or architecture were silently chosen.
- One provider call:12,441 input tokens/2,156 output tokens, settled **USD0.02471425** in this worktree's file-backed ledger. Nine seven-virtue probe sets used the existing local model.
- Browser and temporary3132 gateway were closed after capture. Follow-up HTTP probe:3132 unavailable, existing3012 still200.

This closes the reproduced IRG configuration obstruction **for the diagnostic route**. It does not close Q4's full interview/accept/generate/launch acceptance, prove supported mark-complete/filter functionality, or supply the separate assembled-artifact auditor's positive/negative-control evidence. The existing3012 process's loaded thresholds were not established by this test.

## IDQ terminology correction

Tracey corrected the terminology: **IDQ** is the intended name. This PR52 checkout still has legacy `ids.ts`, `ids-local.ts`, `ids_*` protocol fields, the model prompt "You are IDS", and user-visible "returned through IDS" strings (`src/luminary/client.ts:98`, `server/luminary-reply-router.ts:174-175`). Those are current implementation residues, not authority to call the intended component IDS. The completed live request entered neither revision path. A coherent IDQ migration is a separate named gap; changing display text alone would not establish the current IDQ contract or newer governance route. Historical records are preserved verbatim, with this clarification appended.

## Evidence and continuation

Raw local evidence is in `C:/Users/TraceyPrutch/.codex/visualizations/2026/11/04/01a1a59c-e3ec-71c0-a996-0325c2226f4b/`: `irg-live-probe.mts`, `irg-live-results.json`, `irg-live-ui-traffic.json`, `irg-live-interview-pass.png`, `irg-remediation-build.log`. Raw prompt and review content remains local; no credentials are included in the report. The failed post-run status request in traffic is not used as a spend receipt; the actual file-backed ledger supplied the settled figures above.

The old peer-bridge Standard/inbox locations on I: were unavailable. No peer message was sent or claimed. The present user continuation and existing recorded threshold approval support this scoped restoration; no new threshold selection or peer clearance is inferred.

Next: finish the actual application interview with explicit supported scope decisions; complete the separate full-app auditor controls; reconcile the legacy IDQ implementation; then obtain current-head outside-pair non-author clearance. Q4 remains open overall.
