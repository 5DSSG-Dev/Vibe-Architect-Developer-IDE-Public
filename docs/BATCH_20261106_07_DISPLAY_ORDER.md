# Batch 20261106-07: display order and independent audit precision

Implementation record, 2026-11-06. Acceptance outcomes are appended below after live execution.

Source: Vibe-Architect-Developer-IDE-current, codex/current-ui-integration-20261105, base 1f364bea51250795e137e911d17989b9a2f0abd2 plus the preserved uncommitted Batch04/05/06 fixes and this batch. No commit or push.

## Changes

- ApplicationObjectData exposes optional typed displayOrder: insertion-order or newest-first. Stored records remain append-only in insertion order. Explicit newest-first renders a reversed copy, preserving stored state. Invalid display-order values reject. Writer instructions describe this supported chronology and leave other sorting requirements in gaps.
- Definitions omitting displayOrder reproduce exact legacy source bytes, preserving saved CORE source digests. Actual historical Meta, Baseten and earlier audited bundles, plus the fresh ordered bundle, were byte-compared with the final generator.
- Explicit-order generated apps receive a maintained per-model two-record display-order/nonmutation check. Actual browser verification remains necessary to validate page-to-renderer wiring.
- The independent Qwen contract requires one named check per accepted requirement: explicit satisfied/defect/unverified status, source evidence, expected display order and actual two-save sequence. The host derives coverage and pass/hold from those explicit independent assessments; positive explanations cannot populate a free-standing blocking-findings list. Ordering language cannot be classified as absent by the output schema. Contradictory, incomplete or unverified traces remain held. No manual state override or omitted audit gate.
- Auditor requests enable reasoning and streamed NDJSON to avoid Node's non-streaming response-header timeout. Entire source remains supplied; no clipping. Overall deadline remains 480 seconds, response budget 1 MiB, context 65536, output ceiling 8192. Model identity, completion and hash checks remain enforced.
- An unmounted production namespace returns JSON application_production_unavailable with admitted:false. The client confirms non-admission only for that structured response to POST /generate. Unknown/proxy/recovery responses retain uncertainty.
- Retained re-audit reserves synchronously. Existing registered receipts are repeatable only for identical project/context. Durable recovery requires matching recorded audit/AST/verification and completion evidence, exact context and actual source hashes. Incomplete or conflicting evidence stops before another audit expense. Original held source is read from disk and checked against its recorded artifact rather than regenerated under a newer template.

## Preserved failed attempts and boundaries

The first prompt-only ordering refinement incorrectly passed both old bundles. A reasoning/trace revision hit Node's response-header timeout. Streamed array-trace audits correctly held both old bundles, but the fresh compliant bundle was refused because its response declared pass while listing positive findings and misclassified ordering as not specified. Those exact requests, responses, review records and source are preserved. The named per-requirement schema addresses those observed structural inconsistencies without regenerating the fresh writer output.

A first browser interview attempt stopped with gauge timeout; no accepted synthetic workspace was substituted. Verus subsequently reported overlapping live operations around 11:50–12:11 UTC and paused shared inference. Overlap is a possible contributor, not a confirmed diagnosis. Subsequent inference is sequential. The fresh generation uses the unchanged accepted context from Verus's retained case, not a new interview; no full-interview success is claimed here.

The unavailable-route browser check copies an actual earlier live accepted workspace to an isolated origin solely to exercise real non-admission handling; no provider reply or application response is mocked. Receipt-recovery diagnostics intentionally establish zero additional model expense against genuine historical evidence. Full pre-existing mock/rehearsal suites were not used as live product acceptance.

Evidence and checkpoints: C:/AEGIS_IDE_AUDIT/lumin-batch07-20261106. BEFORE and SOURCE_FINAL contain six scoped source paths; undo-source.py verifies current hashes before any --apply rollback. Earlier dirty work and append-only histories remain preserved. attempts 1–4 retain the audit progression, fresh retains the generated app and subsequent gated audit/launch evidence. Existing Batch06 runtimes and counterexamples remain separate.

Open historical diagnostics, including Totem draft results, governance/gateway anomalies, prior copy gaps, broader requirement coverage, untested providers/profiles and human walkthrough readiness, are not closed by this bounded batch. Qwen audit latency remains a product concern; bounded counterexamples and a positive case do not establish general auditor reliability.


## Final acceptance — 2026-11-06

Lumin implementation and bounded live verification COMPLETE; Aster independent integration review remains pending.

Final auditor configuration supersedes the intermediate reasoning-enabled record above: think=false, mandatory named per-requirement checks and explicit ordering traces, streamed transport, num_predict=4096, num_ctx=65536, 480-second overall deadline and 1 MiB response limit. Extended internal reasoning under the keyed contract reached its deadline (attempt-4), retained as inconclusive. Final attempt-5 uses the same general contract for both negative controls and the unchanged fresh bundle, with no per-app expected answer, ID allowlist or manual state override.

- Meta app-XVs4Rd: actual Qwen HOLD for R001-02; 111964 ms.
- Baseten app-T4JEAl: actual Qwen HOLD for R001-02; 103071 ms.
- One fresh live Meta writer generation: 8c3ed413-7b87-489d-be35-31dcc1da6c77, app-OemX7T, muse-spark-1.3. Original inconsistent audit refusal is preserved. No writer regeneration and no source changes to this app.
- Final live retained re-audit: Qwen PASS, both R001-01/R001-02 covered, no findings; actual R001-02 trace SECOND,FIRST; 118835 ms, 21486 prompt / 399 output tokens. Artifact 00b9c46407655d7fb3136e052cc5d34371a3e6c622f56d9d2e0034ea8a28aba2; requirements afcfc2552c2f63b8e8a18e51425361b77d6644819a329ead4618bba301eb469d. System SHA-256 408699458f4921938c4fd70e149bcea3df4747f7c827056147d5bf87123c50c9 matches both final controls.
- Actual generated tests 5/5 and build pass; engineer source review then normal gated launch. Real Chrome browser checks 5/5: initially empty text form, first save, second-before-first, third-before-second-before-first, reload clears. No interception or simulated replies. Screenshot visually inspected. Preview stopped normally.
- Actual completed receipt recovery returns the same request/digest with no additional model call. Concurrent recovery, context conflict and incomplete record/provenance rejection checks pass. These filesystem/receipt diagnostics are explicitly not fresh inference acceptance.
- Structured unavailable JSON and actual browser recovery UX pass on final compiled code in a temporary live-provider-configured gateway; that temporary server is stopped. Existing generic/proxy 404 responses remain uncertain.
- Final isolated compiled gateway is available on 127.0.0.1:3161, PID37212, runtime revision 1f364bea51250795e137e911d17989b9a2f0abd2-lumin-batch07-meta, using final-reaudit-governance. Complete 479-artifact inventory is pinned. Earlier 3150/3151 gateways still return HTTP200 and were not restarted by this batch. No kernel socket-to-PID proof is claimed beyond observed process startup/config and HTTP revision binding.

Historical false PASS/HOLD and timeout evidence is retained in attempts 1–5, fresh/generation-response.json, the original governance-meta record and copied final-reaudit-governance. Verus's addendum independently browser-confirmed the original oldest-first failures; it supersedes the earlier lack of browser evidence for those cases without rewriting that record.

This is bounded acceptance of insertion chronology and this retained request, not arbitrary sorting or general auditor reliability. Audit latency is still approximately 103–119 seconds for these final cases. Prior open diagnostics and human walkthrough remain open. No commits, pushes, package publications or global dependency changes. Normal isolated generated-project dependency resolution/test/build remains part of the gate.
