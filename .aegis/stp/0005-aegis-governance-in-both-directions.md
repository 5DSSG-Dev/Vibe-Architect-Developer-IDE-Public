# STP-0005 · AEGIS Governance in Both Directions

Id: STP-0005
Title: AEGIS Governance in Both Directions
Created: 2026-10-30T19:48:54.656Z
Created-By: verus

Situation, Target, Proposal. Situation records what is true, with evidence. Target records the whole ideal; milestones select from it and never overwrite it. Gaps name the distance between them. Proposal records changes that close gaps.

## Operating Rules

- Append-only. Revisions supersede earlier entries; nothing is rewritten or erased.
- Write through `aegis-stp` (CLI, VS Code extension, or MCP) so the hash chain stays valid.
- A Proposal is not approval. Only a named human Architect records Approved or Verified, through the CLI or extension.

## Append Log

### 2026-10-30T19:48:54.677Z | verus | stage
Chain-Prev: GENESIS
Chain-Hash: 3336fa4c6ca593f2348727ed56f97af82ecad1b7c4561a1cc88df374a938a601
Stage: Situation
Kind: stage
Channel: cli

Opened STP-0005. Stage: Situation.

### 2026-10-30T19:48:55.591Z | verus | note N1
Chain-Prev: 3336fa4c6ca593f2348727ed56f97af82ecad1b7c4561a1cc88df374a938a601
Chain-Hash: 42433822fc75e394ef872c8f1af019fd41b782199d6b5ce82a8f877d56ccd297
Stage: Situation
Kind: note
Evidence: commit:cb87fd2
Channel: cli

Scope and authority: Tracey approved build-and-run plan revision 16 as the governance plan (2026-10-30, 19:19Z). Lumin reviewed revisions 7 to 16 and found no new material gap at revision 16. This STP records the governance build that comes before all app work (STP-0002 holds the gauge calibration, N18). Baseline: public main cb87fd2, source reading only.

### 2026-10-30T19:49:15.428Z | verus | finding S1
Chain-Prev: 42433822fc75e394ef872c8f1af019fd41b782199d6b5ce82a8f877d56ccd297
Chain-Hash: ce021da0cf8543db20b4bdb103e96e746d78dc87567d204ea3777ccdee5902f6
Stage: Situation
Kind: finding
Evidence: server/luminary-pipeline/pipeline.ts:120
Channel: cli

The pipeline runs PIM, and runs IRG only when PIM found nothing (server/luminary-pipeline/pipeline.ts, line 120). That governs Luminary replies. Architect messages reach the Luminary with no two-way gate.

### 2026-10-30T19:49:15.755Z | verus | finding S2
Chain-Prev: ce021da0cf8543db20b4bdb103e96e746d78dc87567d204ea3777ccdee5902f6
Chain-Hash: b026af8af1844aa16e19c01c177409885c1a66c101af102563d757b41911870d
Stage: Situation
Kind: finding
Evidence: server/luminary-pipeline/pipeline.ts:146
Channel: cli

An IDS failure is reported as gauge_error (pipeline.ts, line 146). There is no separate ids_error and no IDS PIM.

### 2026-10-30T19:49:16.078Z | verus | finding S3
Chain-Prev: b026af8af1844aa16e19c01c177409885c1a66c101af102563d757b41911870d
Chain-Hash: 97e11339b256cf0a3183e6a79c3911401e6979b9a904016ef25c8640f682b1fc
Stage: Situation
Kind: finding
Evidence: server/luminary-pipeline/ids.ts:40; server/luminary-pipeline/ids.ts:47; src/luminary/client.ts:151
Channel: cli

The IDS wording reads as commands ("Re-form the reply ...", server/luminary-pipeline/ids.ts, lines 40 and 47). The client says "held back" (src/luminary/client.ts, line 151).

### 2026-10-30T19:49:16.408Z | verus | finding S4
Chain-Prev: 97e11339b256cf0a3183e6a79c3911401e6979b9a904016ef25c8640f682b1fc
Chain-Hash: eba64d5e9fe7f411541d507769b372fdfb147c5e98aee777b3469c62bd4636fe
Stage: Situation
Kind: finding
Evidence: src/engine/evidenceArchive.ts
Channel: cli

There are no review areas. The evidence archive is in browser localStorage, capped at 5,000 records, and stores excerpts plus hashes (src/engine/evidenceArchive.ts).

### 2026-10-30T19:49:16.733Z | verus | stage
Chain-Prev: eba64d5e9fe7f411541d507769b372fdfb147c5e98aee777b3469c62bd4636fe
Chain-Hash: 426f165ed195b0b730cbdf61143e4dbcc44d0cbf00a4be7c511abc712f50e8d7
Stage: Target
Kind: stage
Channel: cli

Situation recorded (S1 to S4).

### 2026-10-30T19:49:17.204Z | verus | target T1
Chain-Prev: 426f165ed195b0b730cbdf61143e4dbcc44d0cbf00a4be7c511abc712f50e8d7
Chain-Hash: fa35ae0d9e7f4fc35715214728170d6b9bea212fcfb88ffa30675c8454d3f591
Stage: Target
Kind: target
Channel: cli

Governance works in both directions. An incoherent message, from the Architect or the Luminary, never reaches the other Peer. It goes back to the Peer who wrote it, through IDS. An incoherent Architect message makes zero calls to the Luminary response path.

### 2026-10-30T19:49:17.546Z | verus | target T2
Chain-Prev: fa35ae0d9e7f4fc35715214728170d6b9bea212fcfb88ffa30675c8454d3f591
Chain-Hash: 66a09f4e2f47abe5c535513d3f5c5d2e170572032db3a6bb57f8cfb570133dae
Stage: Target
Kind: target
Channel: cli

IDS returns Identify and Define (IS conditions, with no echo of the message) and a Suggest. Only the Suggest is checked by the IDS PIM, which is deterministic and only reports. A Suggest is rewritten at most twice, and is withheld if it still has a finding.

### 2026-10-30T19:49:17.877Z | verus | target T3
Chain-Prev: 66a09f4e2f47abe5c535513d3f5c5d2e170572032db3a6bb57f8cfb570133dae
Chain-Hash: e15708d1da4bf5f7f20451c2b805a344205719d2efa9abf22a9a57e4cef73467
Stage: Target
Kind: target
Channel: cli

Two message revisions are allowed. After that, the message goes to the sender's review area, and nothing is retried automatically. A resubmission is a new linked entry with a fresh count. No message is ever deleted (Axiom 17).

### 2026-10-30T19:49:18.212Z | verus | target T4
Chain-Prev: e15708d1da4bf5f7f20451c2b805a344205719d2efa9abf22a9a57e4cef73467
Chain-Hash: 95a49e97874c7057c3a4b5a6f74a8d989768bd37bbc4d00c660afd46c34e19a5
Stage: Target
Kind: target
Channel: cli

Every failure fails closed: gauge_error, ids_error, or an IDS PIM failure with "No suggestion could be checked". None of them uses up a limit.

### 2026-10-30T19:49:18.564Z | verus | target T5
Chain-Prev: 95a49e97874c7057c3a4b5a6f74a8d989768bd37bbc4d00c660afd46c34e19a5
Chain-Hash: c6f92bee3c1b550c4d748112e1ebf35e972102aa018c14457804f0ad9fb76c85
Stage: Target
Kind: target
Channel: cli

The jailbreak gate passes: Lumin's and Verus's independent suites, then the cross-runs, against a frozen build. Any Shortfall is contained, and stops the gate (G11).

### 2026-10-30T19:49:18.920Z | verus | stage
Chain-Prev: c6f92bee3c1b550c4d748112e1ebf35e972102aa018c14457804f0ad9fb76c85
Chain-Hash: de40304c84230578da26a981a9f693873575e0a7b2f601e74932bde8850f028f
Stage: Gap
Kind: stage
Channel: cli

Target recorded (T1 to T5).

### 2026-10-30T19:49:19.424Z | verus | gap G1
Chain-Prev: de40304c84230578da26a981a9f693873575e0a7b2f601e74932bde8850f028f
Chain-Hash: 6b5332bebaceccb674206fb150fc024b2defb62fd7cf0b89906b431754cf9901
Stage: Gap
Kind: gap
Targets: T1
Channel: cli

No Architect-to-Luminary gate, and no routing back to the sender (S1). Closes with T1.

### 2026-10-30T19:49:19.797Z | verus | gap G2
Chain-Prev: 6b5332bebaceccb674206fb150fc024b2defb62fd7cf0b89906b431754cf9901
Chain-Hash: c65df3049812c64bd7064fe991c4f33f964ccf20c56646c49b71151ef50e15e3
Stage: Gap
Kind: gap
Targets: T2, T4
Channel: cli

No IDS PIM, no ids_error, and IDS wording reads as commands (S2, S3). Closes with T2 and T4.

### 2026-10-30T19:49:20.147Z | verus | gap G3
Chain-Prev: c65df3049812c64bd7064fe991c4f33f964ccf20c56646c49b71151ef50e15e3
Chain-Hash: 5895cfdb109843cf0c195b3fa18f1402a9c51d03952124c5c4a46228855bf3be
Stage: Gap
Kind: gap
Targets: T3
Channel: cli

No full-content, append-only review record (S4). Closes with T3.

### 2026-10-30T19:49:20.505Z | verus | gap G4
Chain-Prev: 5895cfdb109843cf0c195b3fa18f1402a9c51d03952124c5c4a46228855bf3be
Chain-Hash: 76a702ad8a74eb6330093088c4ab7c0e1b273491e4a260b3d020785598bcf258
Stage: Gap
Kind: gap
Targets: T5
Channel: cli

No jailbreak suites or gate runs. Closes with T5.

### 2026-10-30T19:49:20.835Z | verus | stage
Chain-Prev: 76a702ad8a74eb6330093088c4ab7c0e1b273491e4a260b3d020785598bcf258
Chain-Hash: c7efdfadf4b99eb1eb27b6f15eb771e71f611eec27f76e89b8324c2735162c49
Stage: Proposal
Kind: stage
Channel: cli

Gaps recorded (G1 to G4).

### 2026-10-30T19:49:21.315Z | verus | change P1
Chain-Prev: c7efdfadf4b99eb1eb27b6f15eb771e71f611eec27f76e89b8324c2735162c49
Chain-Hash: 992157e01a6cc2cdb1dab3f540fce412294292ffa561fb3fef9fbf711b83bf2d
Stage: Proposal
Kind: change
Status: Drafted
Closes: G1
Channel: cli

Two-way gate and call tagging (plan revision 16, F1, F2, F3 and G6 call counting).

### 2026-10-30T19:49:21.647Z | verus | change P2
Chain-Prev: 992157e01a6cc2cdb1dab3f540fce412294292ffa561fb3fef9fbf711b83bf2d
Chain-Hash: 2e9f0d0460631df8961edb2a3403b408b2a04f5f983acb00927373ffa03d3752
Stage: Proposal
Kind: change
Status: Drafted
Closes: G2
Channel: cli

The IDS response, the IDS PIM with its five kinds of finding, F2b (IDS model failure, one service retry for each response), F2c (IDS PIM failure), and the new wording (F2, F2b, F2c, F6).

### 2026-10-30T19:49:21.988Z | verus | change P3
Chain-Prev: 2e9f0d0460631df8961edb2a3403b408b2a04f5f983acb00927373ffa03d3752
Chain-Hash: 43037768fb373edd07754334b3a650f6a1a42a418f8da0d8a935f60b22c74fac
Stage: Proposal
Kind: change
Status: Drafted
Closes: G3
Channel: cli

Review areas: the Architect's is private and git-ignored, and the Luminary's is readable and holds its own items in full. Also a hash-chained append-only log anchored in the evidence archive, backup, and the stated boundary on deletion (F4, F5).

### 2026-10-30T19:49:22.331Z | verus | change P4
Chain-Prev: 43037768fb373edd07754334b3a650f6a1a42a418f8da0d8a935f60b22c74fac
Chain-Hash: 30239627580b08ab364c3160effc7c1415a83b29daeeb3433adf9272b968593f
Stage: Proposal
Kind: change
Status: Drafted
Closes: G4
Channel: cli

Calibration sets (C1), then the frozen build, then the independent suites, the cross-runs, and Shortfall containment (G1 to G11).

### 2026-10-30T19:49:22.698Z | verus | status
Chain-Prev: 30239627580b08ab364c3160effc7c1415a83b29daeeb3433adf9272b968593f
Chain-Hash: 6ec8169172bf4c97fbfd504e5b050ed8312b931443b72c3e108b72ccf8843fb1
Stage: Proposal
Kind: status
Item: P1
Status: Presented
Channel: cli

Presented to the Architect for review. Presenting is not approval.

### 2026-10-30T19:49:23.037Z | verus | status
Chain-Prev: 6ec8169172bf4c97fbfd504e5b050ed8312b931443b72c3e108b72ccf8843fb1
Chain-Hash: 8413b8f10da37b9ab663dd9f3bd6732dc9c8c214c43dff32fe6f4a9731652f94
Stage: Proposal
Kind: status
Item: P2
Status: Presented
Channel: cli

Presented to the Architect for review. Presenting is not approval.

### 2026-10-30T19:49:23.373Z | verus | status
Chain-Prev: 8413b8f10da37b9ab663dd9f3bd6732dc9c8c214c43dff32fe6f4a9731652f94
Chain-Hash: 33dd7b192e7b212f87315abd8c3215ba67670435543720dbcd44c4d3a33ee9e3
Stage: Proposal
Kind: status
Item: P3
Status: Presented
Channel: cli

Presented to the Architect for review. Presenting is not approval.

### 2026-10-30T19:49:23.705Z | verus | status
Chain-Prev: 33dd7b192e7b212f87315abd8c3215ba67670435543720dbcd44c4d3a33ee9e3
Chain-Hash: 5ad0bbf86b2ef2d59809f488af0b0b0f4a2d79235b8b0e043f69fb11d5769b23
Stage: Proposal
Kind: status
Item: P4
Status: Presented
Channel: cli

Presented to the Architect for review. Presenting is not approval.

### 2026-10-30T19:49:24.042Z | verus | milestone M1
Chain-Prev: 5ad0bbf86b2ef2d59809f488af0b0b0f4a2d79235b8b0e043f69fb11d5769b23
Chain-Hash: c8685d73172095b5aee52d6445d1e8a19a51997a9ed02d90398c461fd77a8d24
Stage: Target
Kind: milestone
Targets: T1, T2, T3, T4, T5
Gaps: G1, G2, G3, G4
Channel: cli

M-GOV: Order: P1, P2, P3, then P4. Done when acceptance items 14, 14a, 16, 16a, 17, 18, 18a, 19, 20, 21, 22, 22a and 23 all pass and are recorded. No app work starts before this.

### 2026-10-30T19:49:24.373Z | verus | note N2
Chain-Prev: c8685d73172095b5aee52d6445d1e8a19a51997a9ed02d90398c461fd77a8d24
Chain-Hash: 8c326d4e5d83937f41dbe0d2e3575897eebed52bbb9659bddc67b5982f5af225
Stage: Proposal
Kind: note
Channel: cli

Numbering: STP-0005 is also used on unmerged branches by 'Apothecary Element Coded by the Luminary' (PR #21) and 'Portal Customs Boundary and Return Inspection' (codex stp-0003/0004 branches). Tracey chose (2026-10-30, 19:48Z) to write this as 0005 on a fresh branch and settle the numbering at merge.

### 2026-10-30T19:51:36.235Z | tracey | status
Chain-Prev: 8c326d4e5d83937f41dbe0d2e3575897eebed52bbb9659bddc67b5982f5af225
Chain-Hash: 72acf657ea2947ff274a68bd1eb07d8f8ea26abcd23a567e26e4b801b4459103
Stage: Proposal
Kind: status
Item: P1
Status: Approved
Role: architect
Channel: cli

Approved by the Architect.

### 2026-10-30T19:51:36.452Z | tracey | status
Chain-Prev: 72acf657ea2947ff274a68bd1eb07d8f8ea26abcd23a567e26e4b801b4459103
Chain-Hash: dd818b5affc412e0b1a40eeea7f92e8735445f9477c62023f2165ecc0d2720b8
Stage: Proposal
Kind: status
Item: P2
Status: Approved
Role: architect
Channel: cli

Approved by the Architect.

### 2026-10-30T19:51:36.663Z | tracey | status
Chain-Prev: dd818b5affc412e0b1a40eeea7f92e8735445f9477c62023f2165ecc0d2720b8
Chain-Hash: ba0a986892138cc28ff29afef6f1cde070df703a40cd8a428c000ab469b5f2f4
Stage: Proposal
Kind: status
Item: P3
Status: Approved
Role: architect
Channel: cli

Approved by the Architect.

### 2026-10-30T19:51:36.865Z | tracey | status
Chain-Prev: ba0a986892138cc28ff29afef6f1cde070df703a40cd8a428c000ab469b5f2f4
Chain-Hash: 3f92bbc359dab5fa1353252151c4067fed7941aa8a09ff8e9cf162c445b22ffe
Stage: Proposal
Kind: status
Item: P4
Status: Approved
Role: architect
Channel: cli

Approved by the Architect.

### 2026-10-30T19:51:37.069Z | tracey | decision D1
Chain-Prev: 3f92bbc359dab5fa1353252151c4067fed7941aa8a09ff8e9cf162c445b22ffe
Chain-Hash: 18a64261184c97f9f7294b4c07d0e858c8a8502e8e2c59f7f5876abad59fcc07
Stage: Proposal
Kind: decision
Targets: T1 T2 T3 T4 T5
Gaps: G1 G2 G3 G4
Channel: cli

Architect approves milestone M1 (M-GOV): order P1, P2, P3, then P4.
