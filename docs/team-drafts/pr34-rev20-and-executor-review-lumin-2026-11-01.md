# PR34 — Lumin cross-squad review of rev20 and executor rename

2026-11-01 America/Phoenix. Exact PR34 head **0c5ccb1f77ee1181ede9a9eff8daa9fb4e7fae01**, branch claude/project-thread-67iwra; base37caf4bdb93516a60a0e37cd6651a51d01d759e7. Current main febf1b7 is the product baseline used for P6. Independent source/test review by Lumin of Verus's plan and identifier change; no edit to reviewed artifacts. Technical review is separate from Architect approval and merge.

## Outcome and independence

- **Rev20 plus STP companion:** no remaining material inconsistency found in the revised R19-1/R19-2/R19-4 points. These are supported as planning refinements. R19-3's prior overclaim is corrected by explicitly retaining traceability as incomplete; actual dependency completion remains partial below. This does not clear a fully executable P5/P6 blueprint, unfrozen choices or runtime acceptance.
- **Executor rename907eeca..0c5ccb1:** supported. Declaration and sole use change FORBIDDEN to OUTSIDE_ACCESS_PARAMETERS; all other normalized source bytes identical. No permission, path pattern, response text, checks or merge behavior changed. Focused exact-head tests pass.
- **True-facts v4:** exact Git blob SHA256 E3C8AF1A7907F331E00877142105BDF2EA7E14AC1E0AC48BB5C174BF08FCFF12 matches the local candidate prepared by Lumin. Publication integrity is verified. I authored v4 and cannot supply its independent clearance. Verus reports Tracey's wording approval; that does not establish runtime facts or P5 implementation approval. Route non-author outside-pair examination of this Lumin-authored artifact to eligible Libra.
- **Squad rev3/amendment/setup:** Lumin contributed substantive concepts, and Aster's independent follow-up is already the designated path. This review neither impersonates that return nor creates a duplicate assignment. No new completed Aster recheck was present in the PR34 comments I read. Verify canonical Aster return before claiming resolution; setup is not activation.

## Requirement-to-evidence assessment

| Topic | Evidence and assessment |
|---|---|
| R19-1 writer budgets | ids.ts shares one retryUsed across initial/rewrite calls; two rewrite attempts plus one service retry gives at most4 writer invocations per runIds. Architect gate invokes runIds at most once for a gated-incoherent inbound message; structural rejection may invoke none. Outbound pipeline invokes runIds before testing pass>maxIdsPasses, giving up to3 observations and12 writer calls with current defaults. Rev20 plan and STP T12 now agree. |
| Separate axes | Inbound gate calls and outbound Conscience calls are summed, not cross-multiplied with each other. Sender admission allowance is separate from rewrite/service budgets and actual dollar/call reservations. Numerical bounds apply to current constants and need repinning for P5 configuration/adapter changes. They are not proof of a live spend ceiling. |
| R19-2 new work | Rev20 explicitly permits genuinely new authorized exchanges while retaining no-reset lineage controls and declining perfect semantic classification. That fixes the rev19 contradiction. Concrete identity/issuance controls remain P6 design work; the plan does not prove disguised continuations detectable from prose. |
| R19-4 context edges | Actual composeRevisionPrompt carries accepted original prompt, own prior candidate and bounded observation; response generator is not called for rejected inbound messages. Rev20 replaces the blanket no-transfer rule with direction-specific edges. “Returns to originating Architect” must retain inherited no-echo/paraphrase requirements: it does not authorize reproducing rejected text verbatim. This is a P5 fixture clarification, not a new contradiction in the context graph. |
| Prior counting/STP changes | Rev19 T11 single admission authority and T13 superseding failures-use-no-limit remain carried; rev20 replaces the faulty T12 formula rather than reinstating the independent legacy loop. Draft STP entries remain unwritten until reviewed/approved through STP tooling. No history rewrite or current route integration claimed. |
| R19-3 traceability | True-facts v4 is now present at907eeca/current head with the exact hash above; rev20's earlier missing-file note is historical and needs an additive completion pointer. The actual hosted-run artifact/commit pin remains absent from the rev20 N6 text. Keep it as a prerequisite to the related P5 acceptance; do not report it completed. |
| P5 choices | Originating-role bounded revision context and always-present/no-inferred-aim Acknowledge remain recommendations awaiting the applicable Architect decision. Verus should pin these in the concrete P5 contract rather than leave a builder to choose. No new approval inferred here. |

## Executed checks

An isolated detached sparse worktree at G:/AEGIS_DEVELOPMENT_REPOS/vibe-pr34-review-0c5ccb1 holds the exact reviewed head. It borrows the existing node_modules via a junction; no dependency install. Existing product worktrees/source were unchanged.

Command:

`node --import tsx --test server/luminary-executor.test.ts server/luminary-pipeline/ids.test.ts server/luminary-pipeline/pipeline.test.ts server/luminary-pipeline/architect-gate.test.ts`

**42 passed,0 failed,0 skipped**, exit0, about9.6seconds. Tests exercise temporary executor repositories/fences/accept/decline/ledger behavior and deterministic IDS/inbound/output boundaries. They are current IDS tests, not proof of planned five-field IDQRA or live model robustness. No full app/gateway suite, build, provider, local gauge, hosted writer or private jailbreak case executed.

Additional checks:
- Exact Git object comparison: replacing new identifier back with prior name makes executor source identical after newline normalization; two identifier occurrences only.
- server/ and src/luminary/ compared with37caf4b: only executor source differs.
- True-facts Git blob hash matches supplied v4 bytes.
- Latest two commits diff check passes. Full historical PR diff check flags CRLF lines in preserved rev17 review; targeted reviewed plan/STP/rename checks with cr-at-eol pass. No historical formatting rewrite made.

## Next ownership and integration point

Lumin's next P6 revision already exists as v0.2 at **fb50bacc2ef0e8ecf66fb082aa4ea78f4cdffd52**, PR39. It addresses G1/G2/C1/G3/G4 for examination, not automatic clearance. Verus should begin the concrete P5 contract while providing or routing one outside-pair review of that P6 artifact. Do not draft a competing P6 revision from stale v0.1 notes. Existing broad server claim still requires exact scoped handoff before P6 source edits.

This review supports the named plan refinements and identifier change only. PR34 as a whole retains distinct artifact-review/adoption dependencies. Verus should examine this review's substantive findings during consolidation and return any disagreement with evidence. No merge, provider use, new test suite, activation or Architect approval is supplied by this report.
