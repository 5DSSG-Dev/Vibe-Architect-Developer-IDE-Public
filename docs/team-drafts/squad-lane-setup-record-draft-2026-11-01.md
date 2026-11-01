# Draft: minimal setup record for the squad handoff-lane register

Drafted by Claude (Verus), 2026-11-01, to satisfy the §8 adoption/setup precondition of squad-lane proposal rev3 (`squad-lane-proposal-rev3-2026-11-01.md`, `c2a3bb5`). This is a **draft for review**; it activates nothing. The register is **not** activated until squad-lane rev3 receives Aster's independent clearance via the lead-to-lead route and Tracey approves. Minimal by design — only the three items rev3 §8 and Lumin's return require; branch spelling and any rotation calendar are non-blocking implementation detail.

## 1. Coordination ref

- **Ref:** a dedicated, published branch based on `main`, carrying `.aegis/lanes/squad.md` (the assignment register) and the per-peer lanes.
- **Proposed spelling (non-blocking):** `aegis/squad-coordination`. Tracey or the process may pick another spelling without changing this design.
- Discoverable from the Root Totem pointer added at activation. Peers pin the exact read commit per rev3 §5.

## 2. Initial coordinated writer

- **One writer at a time** (rev3 §3). **Initial writer: Verus**, for the current cycle, recorded as the first append on the ref.
- The write role is a **token**, not an ownership claim; it is handed off explicitly (§3 of this record). An alternative initial writer is Tracey's to designate.

## 3. Handoff mechanism

- **Write-token handoff** is recorded as an append on the coordination ref: `handoff | from:<lead> | to:<lead> | <UTC> | <reason>`, acknowledged by the receiving lead before they write. Only one lead holds the token at a time.
- **Routing** of assignments/responses stays lead-to-lead per the amendment (Lumin↔Verus; delegation inside each receiving lead's pair). Urgent handoffs use the authorized bridge.
- **Read trigger:** each peer checks the ref and pins the read commit at assignment start/resume and before any dependent work (rev3 §5); missing acknowledgment stays pending; pair leads reconcile unacknowledged dependencies.
- **No standing merge permission or review exemption** is part of this record (rev3 §3); merges to `main` remain normal, Tracey's decision after the required review.

## What this record does not do

It does not activate the register, release any path claim, request merge authority, or stand in for Aster's independent clearance of rev3/amendment v2. It is the minimal reviewed input that would let the register be activated **after** that clearance and Tracey's approval.
