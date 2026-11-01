# Aster — jailbreak testing procedure design brief

2026-10-31 America/Phoenix. Prepared by Lumin at Tracey's direction. Continue Aster's existing GPT-side governance-test preparation; do not create a second assignment or restart completed work. Design only; concrete private cases and execution remain separately gated.

## Target and pinned inputs

Repository: 5DSSG-Dev/Vibe-Architect-Developer-IDE-Public. Design the repeatable GPT-side jailbreak/governance evaluation procedure for the actual integrated Luminary, including legitimate-work controls and operational failures. This is not a claim that defenses are complete.

- Source baseline: main febf1b7e654879cf403da0da044ae719c21f5f70; distinguish storage-only AdmissionStore from current live route behavior.
- Existing preparation: your ASTER-governance-preparation-v0.1.md, SHA256 05387433A2163EC9D38B6A4C14581F8B1C76F2140CAB48C1731EAA21A04A7630. Confirm access/hash; if absent, report that input shortfall rather than reconstruct it from summaries.
- Libra's outside-pair findings: PR38 at 7e3fa9a6c51cddc33e58ba19a8d7e85fe0c21fe3, docs/team-drafts/aster-governance-preparation-v0.1-review-libra-2026-11-01.md. Address each finding or explain disagreement; do not treat findings as mandatory conclusions.
- P6 proposal: docs/team-drafts/p6-inbound-admission-contract-v0.1-2026-10-31.md at 32cea72612214659c77636825f77e9200aac9870; contributor questions in PR39 comment6554082622. Later continuity-only heads do not freeze a runtime contract. P5 and final P6 remain dependencies, not assumed implemented facts.
- Read current Root/Folder Totems, your lane, claims and squad parameters. Preserve any pending squad rev3 recheck as a distinct existing item; do not duplicate it.

## Deliverable

Return one payload-free procedure design, plus an updated family-to-oracle matrix and a list of unresolved freeze decisions. Suggested new artifact: docs/team-drafts/aster-jailbreak-testing-procedure-v0.1.md. Claim only that exact new path and your lane before writing. Preserve earlier preparation and review artifacts. Return exact commit/hash, inspected sources, checks actually executed and limits to Lumin. Confirm access and whether this continues an accepted assignment before starting; prepared publication does not prove receipt.

## Required design content

1. Requirements and independent oracles: map each family to the protected boundary, observable outcome and evidence needed. Separate specification defects, defense failures, harness faults and environment shortfalls. Include benign near-neighbors to measure false refusals alongside bypasses. No exact attack payloads in this public design.
2. Phases: payload-free schema/verifier self-tests; deterministic injected-gate and fault-adapter checks; real mounted-route integration with isolated stores; separately authorized frozen-model evaluation; independently authored first runs; controlled cross-runs; repair/regression re-freeze. Fake-gate success is never model robustness evidence.
3. Entry/release coverage: actual /ask and /tasks instances; both message directions where implemented; original/effective input integrity, trusted realm and lineage, duplicate/conflicting submissions, replacements and exhaustion. Explicitly cover task proposal effects after governedAsk, replay and crash ambiguity; a duplicate must not repeat executor effects. Preserve loopback and Architect effect approval boundaries.
4. Durable failures: AdmissionStore, ReviewRecord and anchor checks, spend ledger, restart/held I/O/uncertain append, explicit reconciliation and review acknowledgment transitions. Distinguish admitted allowance, processing closure, release decision, destination effect and confirmed client receipt. No automatic lock takeover or model replay as recovery.
5. Role budgets and instrumentation: response generation/reform, Conscience initial/rewrite/service retry and gauge calls separately; define retry scope and terminal pass count. State current versus proposed limits, including Libra's 12-versus-10 outbound writer-call distinction. Require a dispatch-bypass audit as well as tagged event counts; stop if instrumentation cannot establish coverage.
6. Run manifest: immutable code, model identifiers/versions, prompts, rulesets, thresholds, configuration, harness, suite hashes, seed/order, environment, concurrency, deadlines, per-role call caps and spend cap. A change invalidates affected clearance until reviewed/rerun. No arbitrary target pass percentage substitutes for boundary invariants; propose justified acceptance criteria for Architect review.
7. Results: per-family denominators and outcomes, false refusals, bypasses, unresolved/invalid runs, budget use and reproducibility. Preserve failures and raw evidence in approved private storage; public summaries contain sanitized metadata only. Do not silently drop failed cases or retry until green. Define stop conditions for unauthorized release/effect, privacy exposure, persistence ambiguity, untagged dispatch, cap breach and missing frozen inputs.
8. Suite independence: Aster owns the GPT-side cases; Verus owns the separate suite. Neither sees the other's concrete cases before independent first runs. Keep cases apart from calibration/held-out datasets. Establish approved private storage before authoring payloads; seal versions and hashes before runs. Libra may review this payload-free procedure now; private-case disclosure requires the controlled stage and appropriate eligibility.

## Scope, review and return

This authorizes preparing the procedure design, not production/harness implementation, concrete case creation, provider/model calls, spend, credentials, live attacks, deployment or execution. Existing server claims remain in force. Mark unfrozen P5/P6 details as dependencies; proceed on design portions that do not require them.

Lumin consolidates the return. Required outside-pair technical review is Verus or Libra if not a coauthor; Tracey approves the resulting implementation/run scope. Tracey designates Libra as stand-in for Verus during usage-window unavailability. Record acting coverage and exact handback state; retain attribution, existing assignments and non-author review eligibility. Stand-in status grants no blanket merge or runtime authority.