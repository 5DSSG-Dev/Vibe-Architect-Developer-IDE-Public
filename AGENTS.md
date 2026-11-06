# AEGIS Totem Instructions

This repository uses AEGIS Totems as its append-only continuity and coordination system.

## Before Each Coding Turn

1. Read `ROOT_TOTEM.md`.
2. Read the nearest folder `TOTEM.md` before editing files in that folder.
3. Read the relevant agent lane for active work, handoffs, and model-to-model messages.
4. Verify Totem context against the current source and tests before relying on it.

## After Each Coding Turn

Append a concise update to the relevant agent lane describing work, uncertainty, and verification. Append verified durable reference updates to the relevant Folder Totem. Never rewrite or delete historical Totem or lane entries.


## Code Review Rules

Review the exact proposed revision and applicable source, not just prior receipts. Report actionable defects with file/line, trigger, consequence, and evidence; distinguish confirmed failures from hypotheses and untested behavior. Prioritize security, incorrect generated behavior, lost work, and duplicate operations over cosmetic changes. Read SECURITY.md for trust boundaries.

### Accepted requirements and generated-app gates

- Preserve accepted requirements through planning, generation, audit, and recovery. Unsupported features must stay visible and require an explicit Architect choice before scope is reduced; a text-only fallback must not silently replace an image requirement.
- Do not admit generation, build, or launch by bypassing governance, independent assembly audit, requirement bindings, or artifact/context verification. Missing or contradictory evidence must not become a passing receipt. Re-audits must evaluate the retained artifact against its original accepted context.

### Recovery, state, and resource ownership

- A retry or reload must not silently repeat an admitted model request or replace a retained bundle. Preserve request identity and report unknown outcomes explicitly. Acquire operation reservations before asynchronous work and release only the reservation the operation owns.
- Navigation and overlays must preserve unsent interview text and accepted workspace state. Keep generated-app in-memory records distinct from saved IDE workspace data. Animation, socket, child-process, and temporary-directory ownership must survive failure and teardown without duplicate schedules or unintended cross-workspace changes.

### Evidence, continuity, and audience

- Model-dependent acceptance checks use live providers; mocked responses, builds, and static review do not establish live integration success. Real rendering/file/socket checks need no inference. Keep evidence tied to its revision and preserve failed runs and open findings.
- Preserve historical Totem/lane content and pinned integrity snapshots. Do not silently update a failing baseline or relabel historical failures as repaired. Document and review any proposed successor policy separately.
- The IDE's primary purpose is opening development to noncoding Architects, with particular attention to neurodivergent thinkers; AEGIS is a close second. Flag broken starting actions or misleading capability claims. Do not treat personal style preferences as correctness defects.
