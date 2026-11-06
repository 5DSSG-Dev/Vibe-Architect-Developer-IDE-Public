# Welcome gateway repair and publication — 2026-11-06

Scope: repair the findings reported in Aster's review of 0efdd82. Publication authorized by Tracey. This follow-up uses supplemental independent source review; it is not represented as Aster's re-review.

- F1: exact Atlas document framing exception now includes welcome.html. Other routes retain DENY/frame-ancestors none.
- F2: welcome GLTF parsing selects TextureLoader using the existing StrictCspGltfLoader pattern. Embedded images use the existing img-src blob policy; connect-src is unchanged.
- F3/F4: each canvas owns one cancellable animation schedule. Visibility, context loss, model readiness, disposal, and changing reduced-motion preferences govern scheduling. Context restoration reconciles rather than starting another loop. Browser-cached restoration reloads disposed GPU resources.
- README purpose and supported demo scope reconciled with current recorded engineering, removing obsolete statements that executable generation is entirely future work.

Validation: full npm run build passed (existing large-chunk warning). Actual compiled gateway on isolated loopback port3194; real Chrome1440x900. Fourteen assertions passed, covering narrow framing, actual IDE iframe, canonical model resource and visibly textured figure, no texture/CSP errors, dynamic reduced-motion stop/resume, repeated visibility reconciliation, actual WEBGL_lose_context loss/restoration, still-mode restoration, iframe Back navigation, purpose reader, and interview draft preservation. Two live canvases own exactly two RAF callbacks in normal motion and zero in reduced motion or while both contexts are lost.

No model calls were needed or made for these rendering checks. The isolated gateway intentionally had no inference configuration; its local-session503 is retained as expected, not a passed live authentication check. No existing demo process was restarted. Private screenshots, trace, runner, and receipt: C:/AEGIS_IDE_AUDIT/lumin-welcome-publication-20261106/.

Harness corrections before the successful receipt: module-local variables are not accessible through frame.evaluate, so model-resource/CSP checks plus visual screenshot inspection replaced that invalid probe; frame.goBack is not a Playwright API, so actual iframe history.back was used. Initial broad console assertion included the expected unconfigured local-session503; final assertion excludes only that endpoint's503 and retains it in the receipt. These were runner failures, not hidden application passes.

Remaining qualifications: Tracey's final visual acceptance remains pending; environment backgrounds remain black and unchanged; no image-entry generation support or new live image-interview result; no ten-build counter. Canvas entry previously passed Aster's unchanged10-check verifier; prior failed automation remains historical. Production CSP excludes inline scripts, including the welcome importmap/module; this development-gateway verification does not establish production deployment readiness. No global CSP relaxation, dependency install, or deployment.

## Publication integrity qualification

The legacy-isolation verifier was attempted without AEGIS_TOTEM_CLI and correctly refused to start. A subsequent invocation reached its protected-file checks and failed `Protected Atlas record changed`: the normalized Atlas Totem is5719 bytes versus the frozen3602-byte exact record. The original protected prefix remains intact; the later Verus checkpoint and this turn appended continuity entries. This is a newly exposed incompatibility between the old exact-file freeze and newer append-only Atlas work, not a passing isolation check. Baseline, original snapshot, and historical entries remain unchanged. Resolution requires an explicit reviewed successor policy; no baseline refresh or retrospective certification was performed in this publication. The scoped welcome runtime checks and this integrity failure are separate dispositions.
