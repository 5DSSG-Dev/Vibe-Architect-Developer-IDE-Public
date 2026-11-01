# Proposed amendment v2 to the Collaboration Squad working parameters: lead-to-lead routing

Drafted by Claude (Verus), 2026-11-01, as a **proposed append** to `docs/COLLABORATION_SQUAD_CONFIGURATION_AND_WORKING_PARAMETERS.md` (merged via PR #36, baseline `78bd423`). This supersedes v1 of the amendment (`squad-working-parameters-amendment-routing-2026-11-01.md`, pinned `21679e5`), which stays in this folder unchanged. The only change from v1 is R2-1 (transmission attestation), per Aster's rev2 review (`7b53811`) returned through Lumin — plus restoring "verbatim" to the retention rule for parity with the proposal.

This is a draft for independent review and Tracey's approval; it does **not** edit the merged parameters. When approved it is appended as a new dated section, preserving every earlier record.

## New section (to append, verbatim on approval)

### Cross-squad review routing (2026-11-01, Architect direction)

All cross-squad review **requests and responses** route through the two pair leads:

- **Lumin → Verus → Libra → Verus → Lumin**
- **Verus → Lumin → Aster → Lumin → Verus**

1. **Either lead may conduct the review directly when eligible** — a non-author outside the producing pair. Otherwise the review is delegated **within the receiving lead's own pair**. Requests for Aster route through Lumin; requests for Libra route through Verus.
2. **One lead-to-lead packet.** When a bridge to a cloud/other-account peer is needed, Tracey receives one complete lead-to-lead packet, not separate assistant assignments and responses.
3. **Receiving-lead check before delegating.** The receiving lead confirms the primary artifact, the exact revision, the brief, the scope, and the expected return are present and accessible before delegating.
4. **Findings return through the assistant's own lead.** The assistant returns findings to their own lead; that lead examines evidence and completeness and returns **one consolidated response** to the requesting lead, **retaining the reviewer's attributed verdict, unresolved questions, and any disagreement verbatim**, with the original review pointer kept so lead commentary is separable from the independent verdict.
5. **Oversight is not authorship or conclusion.** Routing oversight must not prescribe the conclusion, suppress findings, or turn a coauthor into an independent reviewer.
6. **The gate is unchanged.** Final review still requires an eligible non-author outside the producing pair. Architect approval and merge remain Tracey's separate decisions. A reviewer who rewrites becomes a contributor and cannot clear that revision (carried from PR #36).
7. **Routing responsibility is not transmission (R2-1).** Being the responsible routing lead does not by itself make a lead the attester of a `sent`/transmission event. Three roles are recorded distinctly: the **lead responsible for routing**, the **actor who actually transmitted**, and the **publisher of the register pointer**. A lead may attest a transmission the lead actually performed; where Tracey or another authorized bridge transmitted, that actor's attributable statement/evidence is canonical and a lead may publish its pointer while naming the actual transmitter/attester. A request that an authorized bridge relay a packet is **requested/pending** until transmission evidence exists — it is never recorded as `sent`, and `sent` is never inferred from a prepared brief or from publication. Recording the actual transmitter does **not** authorize an assistant to bypass a lead for request/return routing.

This makes the routing lead the responsible coordinator, not an automatic attester: the squad handoff register's `sent` event belongs to whoever actually transmitted.

## Relationship to existing parameters

This **adds** a routing layer; it does not relax the independent-review gate, the one-source-of-truth discipline, the append-only record rule, or Architect-only approval/merge. Earlier records (PR #36 parameters, prior lane/claims conventions, amendment v1) are preserved.
