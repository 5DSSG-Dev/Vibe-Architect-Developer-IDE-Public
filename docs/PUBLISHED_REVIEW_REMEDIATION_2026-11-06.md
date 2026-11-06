# Published IDE review remediation — 2026-11-06

Candidate based on published313c38f, addressing Aster's R1–R7 review of3fa4862. Existing welcome, governance, artifact verification and navigation behavior are preserved. Evidence is private at C:/AEGIS_IDE_AUDIT/lumin-review-remediation-20261106/. No existing demo runtime was restarted; isolated3195 only. This report does not claim Aster has independently accepted this new candidate.

## Repairs

| Finding | Change | Verification |
| --- | --- | --- |
| R1 recovery | Persist request/context admission before ask; completed receipt hash binds all metadata/gates to the append-only completion note. Recover verifies identity and disk bytes, reserves before awaits, preserves existing ownership, and checks open state before registration. Unknown409 has a distinct error code, preserves browser pending identity, and blocks new-ID redispatch of the unresolved context. | Actual Meta generation followed by isolated gateway restart; completed receipt restored without inference; concurrent recovery; interrupted live generation/restart remains unknown; same-context newUUID rejected; actual receipt-metadata tampering rejected and original bytes restored. |
| R2 exclusions | Local explicit exclusions do not trigger unsupported-feature rejection. Ambiguous or affirmative matches still reject; later positive requests remain visible. | Seven pure source-profile probes from an actual retained workspace, two maintained pure-function regression tests, and a live Meta/Qwen generation with purpose ending No search. |
| R3 record failures | Pre-dispatch record failures and post-provider failures use different messages. Post-provider failures withhold delivery while reporting possible provider usage. | Actual live Meta reply and live governance gauge, followed by a real filesystem obstruction before reply-record append; record_error explicitly reports model invocation and possible usage. No fake model response. |
| R4 reservation | Launch checks and acquires the same synchronous reservation used for generation/restore/audit. Recovery also reserves before filesystem work. | Launch of the retained live-generated app rejected during a second actual live generation; no preview started. |
| R5 HTTP teardown | Preview startup, error cleanup, stop, close and gateway shutdown use bounded HTTP lifecycle helpers. Preview close failures propagate AggregateError instead of being swallowed. | Actual generated app build/launch then incomplete HTTP socket; stop closed it in6ms. Maintained lifecycle verifier passed12listeners/fourchildprocesses, all exited0 and ports rebound. |
| R6 desktop layout | Purpose and interview panels use separated desktop columns while preserving content and input behavior. | Real Chrome at1024x768,1280x900,1440x900; bounding boxes do not overlap; screenshots retained. |
| R7 iframe Escape | Bind/remove a same-origin document key listener as the iframe document changes. An open reader consumes the first Escape; the next closes the outer Atlas. | Real Chrome focused welcome link Escape closes outer modal and retains draft; reader Escape then outer Escape both pass. |

## Scope and evidence qualifications

- Durable completed-receipt recovery applies to fresh generations using the new admission/receipt-hash format. Old retained re-audits and CORE restoration retain their distinct existing evidence paths; no retroactive certification or invented writer admission.
- For admitted work lacking complete evidence, unknown is intentionally conservative. It does not assert a paid provider request necessarily completed, and does not unlock automatic regeneration. Inspect retained evidence before an operator decides what to do next.
- Exclusion recognition handles explicit local negative clauses, not unrestricted natural-language semantics. Ambiguous requests can still require clarification.
- The first live attempt used configured Baseten and returned HTTP400 because its model version was deactivated. Its admission and response remain retained. Meta was then selected only in the isolated test process using existing credentials. Shared provider configurations were not changed.
- R3 deliberately introduced a real obstruction in a private test record after a real provider result. Original record directory and evidence were preserved; no public or shared record was modified.
- R7 binds the active iframe document every100ms while open, cleaning up on close/navigation. Verification allowed200ms after focus for document binding; it does not certify an instantaneous key before binding. Initial onLoad-only repair failed and was replaced; failed runner output remains part of the session record.
- Earlier harness attempts referenced a frontend-only emitted JS path that does not exist and initially used Python's platform-default decoder; corrected to explicit UTF-8 and direct source-profile/actual-browser checks. These are harness shortfalls, not application acceptance evidence.
- Baseline Atlas exact-length integrity mismatch, production welcome inline-script CSP compatibility, image-entry generation, and final Architect visual acceptance remain separate open items. No dependencies installed, production deployed, or shared runtime switched.


## Independent acceptance received

Aster's independent report `ASTER_B1C05EE3_REMEDIATION_REVIEW.md` accepts all seven scoped repairs at b1c05ee3734a6178c9a98d170cef190ac1e8f1b7. Lumin read the actual report and rechecked author manifest4614fde8ad35ef25a0344d828d0ec814dd03b60dbcd853f0ce1a2ac9ebd0bcfc. Independent checks include build, two pure regression tests,12actualHTTPlisteners/fourchildren, fresh Chrome at four desktop widths, iframe/book Escape, and retained live receipt recovery without another model call. The full disposition is appended to the acceptance matrix.

A supplemental complete evidence inventory was added outside Git and anchored to that original manifest, addressing the review's inventory recommendation without rewriting prior evidence. Production CSP, unsupported capabilities/disclosure/authentication qualifications, Atlas successor policy and Architect visual acceptance remain open; this is not exhaustive product certification.
