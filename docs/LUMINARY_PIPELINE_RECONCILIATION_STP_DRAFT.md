> Current Architect flow (2026-11-02): every message carries a Marker. PIM, IRG, and PTAG each send a `0` directly to RBC, skipping later gates. Only valid passes advance. RBC resonates with `(1,1)` for Prism; every other result returns with its Marker to Conscience. The earlier correction and conflicting proposal text below are superseded by the final section.

# Pipeline reconciliation — STP draft

Status: proposed, awaiting independent review and Architect approval. No runtime change or activation. Audit date: 2026-11-02.

## Situation

Current checkout: `claude/project-thread-9fdggm`, HEAD `59fd936357e8860164330e45ea17a0d71243f971`. The working tree contains substantial pre-existing source, UI, documentation and untracked work. Preserve it. The prior terminology cleanup does not implement the authoritative route.

## Target

Message → PIM → IRG → PTAG → RBC. Yes continues through Prism to Receiver. No/Unsure returns through Conscience, whose method is Identify what IS, Define what IS, Question what IS, then back to Sender. A changed candidate re-enters examination. IDQ is the Conscience method. There is no separate coordinator gate.

## Evidence and gaps

| Owning source | Current observation | Required reconciliation |
| --- | --- | --- |
| `server/luminary-pipeline/pipeline.ts` | `pimFindings.length === 0` guards IRG; a finding goes directly to IDQ. No PTAG input or lineage exists. | Preserve PIM evidence while proceeding in the authoritative order; include PTAG and RBC observations bound to the same candidate. |
| `server/luminary-pipeline/rbc.ts` | Accepts only `IrgReading`; coherence alone selects Prism. | Enforce the completed examination and validated Yes/No/Unsure outcome; no release on an earlier hold or operational shortfall. |
| `server/luminary-pipeline/idq.ts` | Receives PIM/IRG only, explicitly allows an unread IRG after PIM, and cannot explain PTAG evidence. | Give Conscience actual stage evidence and distinguish missing evidence from established conflict. |
| `server/luminary-reply-router.ts` | Calls the legacy reply pipeline. | Keep composition changes last and separately authorized; outbound support does not establish inbound parity. |
| `server/luminary-pipeline/pim-registry-core.ts` | Additive inactive scanner, synthetic registry tests. | Review scanner/Identify boundaries and approved registry identity before integration. No private rules are approved by this audit. |

Private evidence read directly from `C:/Users/TraceyPrutch/.claude/plans/`:

- `p5-jailbreak-baseten-muse-spark-ptag-acceptance-v1.0-2026-11-01.md`: exact reciprocal PTAG corpus passed 18/18 and legitimate work 5/5, effects zero. Accepted raw identity `08AB3FF733B6A02B884A3079643BA0B7DC6CBFC54D553CC74F391F4334B90064`; this audit read the receipt, without rerunning inference or independently rehashing that raw file.
- `p5-real-irg-assembled-diagnostic-v0.1-2026-11-01.md`: uniform-60 predecessor matched dispatch targets 5/7 with two legitimate false holds. A provisional per-Virtue successor matched four new author-seeded cases, with two dispatches and zero effects. Its raw v0.2 file was independently rehashed in this audit: `59C51928D5FA17C18AE6703A72561159A770AD5873AA31AFBECEFFDBBA5F1F25`, matching the report. PIM findings received IRG readings. PTAG on earlier holds was shadow evidence. Legacy PIM, provisional IRG thresholds, absent IDQ and private enforcement keep this separate from product-route acceptance.

## Proposal: paths, dependencies and order

1. Freeze the stage result contract and candidate/direction binding under `server/luminary-pipeline/`, including PTAG validation and operational shortfalls. Map private `pass`/`boundary`/`unsure` vocabulary explicitly to Yes/No/Unsure; preserve reasons and evidence. Pin reference identities before adapting private code. Do not copy private fixture contents into public runtime prompts.
2. Review the additive PIM scanner and its Identify/full-candidate validation requirements. Retain original casing/punctuation and exact source spans for IRG; matching views cannot replace the candidate. Registry approval/distribution and cross-turn matching remain explicit scope decisions.
3. Add an unmounted composition with injected stages. Run PIM then IRG then PTAG, keeping earlier findings/holds visible to RBC. A later Yes cannot erase an unresolved hold. Operational failure becomes a named shortfall. Keep all release enforcement inside RBC; do not add a coordinator gate.
4. Extend `idq.ts` to explain actual PIM, IRG and PTAG observations through Identify/Define/Question. Reformed text starts a fresh examination; bound retries and preserve lineage. Keep IRG Texture separate from PTAG operating-parameter resonance.
5. Test unmounted composition and obtain independent non-author review. Only after Architect approval consider edits to `pipeline.ts`, `luminary-reply-router.ts`, replay contracts and UI projections. Mounting/activation requires separate explicit authorization.

## Verification

Use deterministic injected-stage tests for exact stage order, PIM findings still reaching IRG, Yes release, No/Unsure return, malformed/mismatched PTAG, stale candidate binding, earlier-hold preservation, operational errors, retry exhaustion and full re-entry. Instrument receiver/effect sinks: zero dispatch while held; one dispatch for an eligible Yes; zero external effects in tests. Cover both directions where implemented and identify missing coverage plainly.

Then run relevant pipeline/router/replay suites and server typechecks. Real model recognition, assembled behavior and independent challenge suites remain distinct evidence. A new paid run needs its own authorization; existing spend ceilings do not transfer automatically. This documentation audit performs no model inference.

## Open decisions for review

- The private PIM door-open IRG skip conflicts with the authoritative route: proposed disposition is to exclude the skip.
- Freeze the interpretation of early holds versus downstream shadow PTAG observations; the private runner is diagnostic evidence, not authority for product semantics.
- No pure-Texture IRG threshold is approved. The successor's per-Virtue values remain provisional.
- Confirm approved PIM registry/Identify scope and exact PTAG reference artifacts before implementation.
- Identify an independent non-author reviewer; technical clearance and Architect approval remain separate.

Next reviewable slice: the unmounted typed stage contract and deterministic enforcement tests, after proposal approval. No product implementation is authorized by this draft.

## 2026-11-02 | Architect flow after sketch and numeric clarification

This section supersedes the earlier route, tests, and open-decision language above. Every candidate starts with a Marker bound to its exact message. PIM `1` advances to IRG; IRG `1` advances to PTAG; PTAG `1` goes to RBC. A `0` at any gate skips the remaining gates and goes directly to RBC with origin code `(2,0)` for PIM, `(3,0)` for IRG, or `(4,0)` for PTAG. RBC does not examine or decide message meaning. Its sole Prism resonance is a valid `(1,1)` assembled from all three gate passes for the same candidate. Any `0`, missing result, invalid result, or mismatched Marker cannot resonate with Prism. RBC returns that candidate and Marker to Conscience IDQ; a reformed candidate starts anew at PIM.

The Marker preserves gate origin, result, evidence, reason, candidate identity, and which later gates were not examined. PTAG Unsure follows the `0` return path but remains labeled uncertainty, not established incoherence. Operational failure likewise cannot release and must carry its own shortfall reason. The numeric code is an audit/routing signal, never authority supplied by Sender text or an unvalidated model response.

Revise deterministic tests to cover each early `0` bypass, full `1,1,1` traversal yielding RBC `(1,1)`, Marker/code agreement, stale or forged values, uncertainty, operational failure, and fresh candidate re-entry. The previous private assembled run that sent PIM findings onward to IRG remains historical diagnostic evidence; it does not validate this final topology. The existing mounted PIM-to-IDQ short circuit captures the early stop but bypasses RBC, and the mounted route still lacks PTAG and the universal Marker. No current runtime release claim follows from this draft.


## 2026-11-02 | Architect correction: PIM direct Conscience return

Tracey clarifies: a message flagged by PIM goes directly to Conscience IDQ, which returns to Sender. IRG, PTAG and RBC need not examine that flagged candidate. Only a PIM-clean candidate continues through IRG → PTAG → RBC. This supersedes earlier statements requiring PIM findings to reach IRG and the proposal to exclude the direct return. Tests should verify no downstream gate calls for PIM-flagged candidates, source-bound findings passed to Conscience, and fresh PIM examination after Sender reformulation. The existing direct PIM-to-IDQ branch is consistent with this clarification; the missing mounted PTAG stage remains a separate gap. No new decision about IRG early returns is inferred. No runtime source changed.
