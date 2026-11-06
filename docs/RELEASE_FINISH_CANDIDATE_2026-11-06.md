# Release-finish candidate — 2026-11-06

Baseline: 9b1c988d86600521148a79f6703c6ef951e498d5. Candidate remains uncommitted and unreviewed.

Atlas welcome now uses an external ES module and relative vendored imports. The actual gateway applies strict script-src to its narrow Atlas document exception in development as well as production, retaining same-origin framing and existing texture policy. No unsafe inline script allowance was introduced.

Generation identity is retained in browser localStorage before dispatch, including request UUID, context SHA-256 and serialized writer-prompt SHA-256. Conflicting retained identities are refused. Existing server pre-admission evidence now also retains promptHash. Authenticated read-only evidence inspection distinguishes registered, completion-recorded, unknown, and absent-in-this-record without replaying a model request or declaring an absent record safe to retry. Receipt adoption clears only matching durable metadata. Inspection shares cancellation/busy ownership with other panel operations.

Gateway startup registers listener ownership/error handling before listening. Existing native-fetch provider transport retains pooled connections, timeouts and sanitized errors; external provider availability is not guaranteed. Previously observed Baseten deactivation remains open.

## Verification

- Full npm run build passed (existing large bundle warning).
- Actual isolated gateway Chrome CSP/welcome checks: 14 passed, including textured GLB, dynamic reduced motion, visibility/context restoration and draft preservation.
- Actual Chrome storage and retained-record inspection checks: 7 passed, including conflicting identity refusal and authenticated/unauthenticated access boundaries. These are storage/HTTP checks, not live model tests.
- Actual loopback occupied-port rejection and rebind check passed.
- Maintained lifecycle verifier: 12 listeners across 4 child processes passed; close/rebind 1–6 ms; all owned children exited zero.
- Earlier browser HTTP harness attempt omitted same-origin request context and received 401; corrected harness uses browser same-origin fetch. Failure evidence is not a model or product-success receipt.

Private evidence: C:/AEGIS_IDE_AUDIT/lumin-release-finish-20261106. Original retained evidence was copied for inspection, not modified.

## Pending gates

No current-batch model dispatch has occurred. Linq's exclusive inference window is requested, not acknowledged. Fresh Meta/Baseten/Qwen outcomes and client/server prompt-hash matching require that window. Verus's reviewed disclosure copy and successor-policy candidate have not been received. Aster's exact-candidate review, final integration matrix and publication remain pending. No dependency installation, shared runtime restart, provider activation, commit or push occurred in this candidate preparation. Cross-gateway/global exactly-once behavior is not claimed.
