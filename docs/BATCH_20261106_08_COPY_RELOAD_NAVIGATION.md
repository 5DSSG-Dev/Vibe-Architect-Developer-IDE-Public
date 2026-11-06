# Batch 20261106-08: generated copy, dispatch-aware reload and canvas navigation

2026-11-06, America/Phoenix. Lumin implementation and bounded verification complete; independent Aster review pending.

Source: G:/AEGIS_DEVELOPMENT_REPOS/Vibe-Architect-Developer-IDE-current; branch codex/current-ui-integration-20261105; base1f364bea51250795e137e911d17989b9a2f0abd2 plus preserved uncommitted prior batches and this batch. No commits, pushes or dependency updates. No human walkthrough was requested or performed. P23/P24 remain separately routed follow-up work, not closed here.

## NEW-COPY

The fixed generator already labels the form button Save. The observed contradiction came from model-authored explanatory Component text. The writer contract now explicitly names the rendered Save label and instructs all authored button instructions to use it. Historical source is not silently rewritten and saved CORE digests are not migrated.

Fresh live Baseten generation used the unchanged accepted Batch06 context (including the original generic submit-button wording): fabba58d-48e2-43d6-9ff5-4fa28bd8cf45, app-E6mDy3, writer meta-models/muse-spark-open-1026. Artifact defe80319ff0cfe5c145936b60861bafb91ba0fa509f9598ae3e685127fa9992. Requirements1896f86703672468f53f6053380a5deb9f2f03b7ec3549e6ba7503ac99148ea0. Actual Qwen3.5:4b PASS, all accepted IDs covered, no findings;125428ms. Actual generated tests5/build passed. Engineer review then normal gated launch and real browser2/2: Save renders without contradictory instruction, and Save submits actual entered values to the list. Preview stopped. This sample included a title Component and no extra instructional prose; it demonstrates absence of the mismatch, not a proof that every future model-authored sentence will comply. Original Batch06 mismatch remains historical evidence.

## P09

Interview turns now carry a request UUID and prepared/dispatched/completed markers. The browser synchronously saves pending state before its first async boundary and saves the dispatch-attempt marker immediately before ask. Storage failure stops sending with a clear message. Reload converts pending to stopped without sending; existing version1 sessions without new metadata remain supported. Dispatched denotes the browser's attempt, not proof of model execution.

The client sends the UUID to the authenticated ask route. Gateway admission writes a planning_dispatch note with request ID and prompt SHA-256, then performs the unchanged governed ask. Same ID and same prompt/link share one promise/result; conflicting reuse returns409. The bounded256-ID cache never evicts admitted IDs to silently replay them. After restart, a matching durable admission note returns409 request_outcome_unknown, without another model call; this does not fabricate a durable response cache or claim recovery of a lost reply. The existing governed response/shortfall gates remain intact.

Actual live Meta browser checks passed before and after the initial restart-guard change. Reload after POST preserved the request ID/stopped conversation and generated no automatic second ask. Explicit same-ID HTTP recovery returned the original live200 result; changed content returned409 request_id_conflict. Both UUIDs occur exactly once in actual append-only planning_dispatch records with matching prompt hashes:
-3f601a8c-4b5a-442d-a4e2-e5ed9011c7b4
-1801ad20-234f-4191-91e2-7dfeeb64a3c7

An immediate real browser reload before ask dispatch preserved prepared/stopped state and sent0asks. Actual restart replay of the earlier admitted UUID returned409 request_outcome_unknown with unchanged provider count/spend. These expected no-dispatch checks use live configured gateways without model mocks; no model call is expected when the guard works. The old aggregate5vs4 result remains unexplained historical evidence; it is not relabeled a proven duplicate or given an invented cause.

Maintained browser command: scripts/verify-interview-reload.mjs. Set PLAYWRIGHT_MODULE to an available Playwright module, IDE_TEST_ORIGIN to an isolated live configured gateway, IDE_TEST_OUTPUT to a private evidence directory. It performs a real live interview request and a same-ID recovery; reserve the inference window first. No dependency install is performed by the script.

## P12

Maintained browser command: scripts/verify-ide-navigation.mjs. It additionally requires IDE_TEST_STORAGE pointing to actual saved browser storage from a live accepted workspace. This run used the unchanged Batch06 accepted workspace mapped to the isolated origin, not a seeded synthetic app or simulated model response. Its retained old review anchors can produce an expected integrity warning against a different private runtime record; the check does not acknowledge, bypass or claim governance repair from that warning.

Actual final Chrome checks10/10 passed:
1.CORE canvas Orb click enters its environment.
2.Active child canvas click enters JSON Transformer Satellite.
3.Satellite child click enters Payload Serializer Actuator.
4.Back returns to the same Satellite.
5.Reload retains the navigation path as an explicit resume choice.
6.Resume restores the same Satellite path.
7.Back returns to the parent Orb without changing socket bindings/selection state.
8.Back returns to CORE with accepted architecture intact.
9.Actual zoom changes the view, then the saved camera control restores the projected Orb position within tolerance.
10.Frame leaves architecture intact and a live rendered canvas available.

The new all-tier check revealed a genuine defect: a visible child overlapping Luminary's screen position was captured by Luminary's broad pick proxy. EnvironmentView now resolves actual Element geometry before that proxy. A matching real click failed before the fix and passed afterward. Luminary remains selectable where no Element geometry is hit. This is a narrow hit-priority correction, not a scene redesign.

Preserved harness failures: the first child locator selected a hidden underlying scene label; a later run exposed the actual proxy collision; another harness waited for Restore3DView without context loss. Restore3DView is only present after a WebGL loss and was correctly removed from the normal-navigation acceptance check. WebGL context-loss recovery itself was not exercised or claimed.

## Evidence, runtime and remaining boundaries

Raw evidence: C:/AEGIS_IDE_AUDIT/lumin-batch08-20261106. BEFORE/SOURCE_FINAL and guarded undo-source.py isolate six modified source files and two new maintained browser scripts. Earlier dirty work and append-only records remain. Prior Batch07 files and diagnostics are not overwritten.

Final isolated compiled runtimes: Meta3171 PID18152 and Baseten3170 PID43872, both HTTP200 with live provider/gauge configuration;479 exact compiled artifacts pinned. Existing3150/3151/3161 were not restarted. Batch08 preview stopped. Process/config/HTTP bindings are recorded; no independent kernel socket/PID proof claimed.

No broad mocked regression suite was used as live acceptance. TypeScript/full build passed with existing Vite chunk warning, scoped diff check passed; actual generated tests/build and browser/live-provider records supply product evidence. No claim of arbitrary app/provider/model reliability or exhaustive diagnosis closure. Batch07 independent integration review, P23 historical Totem findings, P24 gateway process anomaly, audit latency and prior diagnostics remain visible. Aster's Batch08 independent review remains pending.
