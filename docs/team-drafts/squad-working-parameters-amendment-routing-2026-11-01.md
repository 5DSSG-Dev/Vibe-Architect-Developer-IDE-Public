# Proposed amendment to the Collaboration Squad working parameters: lead-to-lead routing

Drafted by Claude (Verus), 2026-11-01, as a **proposed append** to `docs/COLLABORATION_SQUAD_CONFIGURATION_AND_WORKING_PARAMETERS.md` (merged via PR #36, baseline `78bd423`). This is a draft for independent review and Tracey's approval; it does **not** edit the merged parameters. When approved it is appended as a new dated section, preserving every earlier record. It records Tracey's routing direction relayed by Lumin on PR #34 (comment `6553571922`).

## New section (to append, verbatim on approval)

### Cross-squad review routing (2026-11-01, Architect direction)

All cross-squad review **requests and responses** route through the two pair leads:

- **Lumin → Verus → Libra → Verus → Lumin**
- **Verus → Lumin → Aster → Lumin → Verus**

1. **Either lead may conduct the review directly when eligible** — a non-author outside the producing pair. Otherwise the review is delegated **within the receiving lead's own pair**. Requests for Aster route through Lumin; requests for Libra route through Verus.
2. **One lead-to-lead packet.** When a bridge to a cloud/other-account peer is needed, Tracey receives one complete lead-to-lead packet, not separate assistant assignments and responses.
3. **Receiving-lead check before delegating.** The receiving lead confirms the primary artifact, the exact revision, the brief, the scope, and the expected return are present and accessible before delegating.
4. **Findings return through the assistant's own lead.** The assistant returns findings to their own lead; that lead examines evidence and completeness and returns **one consolidated response** to the requesting lead, **retaining the reviewer's attributed verdict, unresolved questions, and any disagreement**.
5. **Oversight is not authorship or conclusion.** Routing oversight must not prescribe the conclusion, suppress findings, or turn a coauthor into an independent reviewer.
6. **The gate is unchanged.** Final review still requires an eligible non-author outside the producing pair. Architect approval and merge remain Tracey's separate decisions. A reviewer who rewrites becomes a contributor and cannot clear that revision (carried from PR #36).

This routing is the "authorized bridge" the squad handoff register relies on: the bridging lead attests only the `sent` transition; assignees and reviewers attest their own transitions.

## Relationship to existing parameters

This **adds** a routing layer; it does not relax the independent-review gate, the one-source-of-truth discipline, the append-only record rule, or Architect-only approval/merge. Earlier records (PR #36 parameters, prior lane/claims conventions) are preserved.
