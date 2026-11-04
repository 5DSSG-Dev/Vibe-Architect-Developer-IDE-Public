# Luminary full-scope base build mandate

Authority: Architect instruction supplied 2026-11-03, “AEGIS Pipeline Engineering Mandate: Full-Scope Luminary Base Build.”

The completed interview establishes the application's complete functional scope. The initial base build implements every agreed ToDo item as working UI and system behavior, including its dependencies. Empty shells, disconnected fragments, missing-dependency stubs and routine per-component approval stops do not satisfy this mandate. Stop for user input only when critical missing or strictly ambiguous information prevents execution. Continue independent work while the missing information is resolved.

The purpose is to honor creative intent and preserve executive function and momentum for neurodivergent creators. The first application presented for interaction must reflect the complete agreed concept. Progress updates can illuminate ongoing work without demanding decisions about routine implementation steps.

## Required application lifecycle

User Interview -> ToDo List & Feature Spec Generation -> Continuous Luminary Base Build (all ToDo items; missing-data exception) -> Dual-Model AEGIS Governance Audit (non-self-checking alignment) -> Live Interactive Base Application.

Internal implementation may be sequenced across files, tools and model calls. Continuous execution means that this sequencing does not impose artificial user confirmation checkpoints or discard remaining requirements. Preserve the complete specification and build state across continuations. A model response limit must trigger internal continuation or an accurately reported capability shortfall, never a false completion claim.

## Acceptance evidence

1. Every agreed requirement has a stable identifier and maps to concrete UI/system components, dependencies and an observable acceptance check. The complete list reaches the builder without silent clipping or subset selection.
2. Every mapped feature works in the generated application. Exercise user journeys, persistence and integrations required by the actual specification. Placeholder success, timed simulation and fabricated provider receipts do not count.
3. Routine generation, local checks and repair continue without per-file or per-component permission questions. A clarification names the missing fact and the exact requirements it blocks.
4. All necessary files and dependencies are present, with no unresolved imports. Resource limits preserve the full workload through continuation rather than shrink its scope.
5. Independent governance audit uses the dual-model, non-self-checking arrangement and records the exact artifact revision/digest, model identities, findings and disposition. Generator self-checks remain useful engineering evidence but cannot stand in for that audit.
6. The interactive application corresponds to the audited artifact. A changed artifact requires refreshed audit evidence. A failed check or unavailable required capability remains explicit and cannot be labelled complete.

The application lifecycle above preserves the established message pipeline: Message -> PIM -> IRG -> PTAG -> RBC; Yes through Prism to Receiver, No/Unsure through Conscience IDQ to Sender. It introduces no separate message-routing authority.

## Integration verified in this checkout

- `server/index.ts` reads `docs/VIBE_LUMINARY_INSTRUCTIONS_v0.1.md` at startup for the configured live Meta/Baseten reply model. `systemPromptWithKnowledge()` in `server/luminary-knowledge.ts` includes those instructions in the system message. The verbatim supplied system directive is appended to that instruction document, followed by completion/evidence rules.
- This is a startup-loaded prompt change. Existing processes have not been restarted, and a different worktree or initialization path must be verified separately.
- The inspected bounded coding path is not a complete base-build orchestrator: `src/luminary/blocks.ts` limits a change to eight files and 16,384 bytes per file; `server/luminary-executor.ts` limits allowed files to eight and excludes package manifests/dependency writes; `server/luminary-task-router.ts` limits task context to 24,000 bytes. Those limits can prevent full-spec ingestion or complete dependency delivery for larger applications.
- No runtime mechanism establishing complete requirement coverage, automatic multi-response build continuation or exact-artifact final application audit was added by this prompt-policy change. No full-scope generated application or dual-model base-build audit was executed this turn.

These gaps require an integrated builder that carries the entire specification, preserves continuation state, produces complete artifacts/dependencies and binds functional and independent governance evidence to delivery. Raising reply limits alone does not satisfy the mandate. Existing execution fences must be replaced through a deliberately scoped base-build implementation rather than bypassed by model instructions.

## 2026-11-03 runtime orchestration implementation

The preceding gap inventory describes the prompt-only revision. The following implementation supersedes that inventory for the three runtime constraints, without claiming a complete generated application or final application audit.

- `POST /api/luminary/tasks` accepts `baseBuild: true` with the complete goal/specification in `goal` and labelled `context`, and the full file list in `allowedFiles`. A caller must select this base-build mode explicitly. Normal bounded tasks retain their existing eight-file limit and 24KB context allowance.
- Base-build mode accepts up to 128 scoped files and 512KiB of labelled context. The request body is bounded at 1MiB. The runner carries the complete specification and previous generated files into each sequential page of up to eight files, without returning control between pages. Every page passes the existing bidirectional governance path. Missing, duplicate or unexpected files, a changed model or a governance shortfall prevent proposal creation. One final isolated executor proposal contains all pages.
- The base-build bidirectional wrapper allows 1MiB prompts and 256KiB replies, while ordinary messages retain 32KiB ceilings. The parser retains its 16KiB per-file limit. Independent governance policy limits and provider context limits remain authoritative and can return a named shortfall; the wrapper cannot silently bypass them or clip the specification.
- The live provider driver defaults `auto_resume_on_max_tokens` to true. A provider `finish_reason: length` triggers another internally metered call carrying the conversation and a precise continuation request. Only the concatenated result reaches downstream reply governance. Every call retains spend reservation, cancellation and timeout handling. Exhausting the default 16-call continuation budget, no progress, abnormal termination or a model switch returns an error rather than partial output. Strict JSON governance-model requests reject truncation instead of continuing malformed gate output.
- Explicitly scoped `package.json` files can be read and updated in base-build mode. Only registry dependency/devDependency additions with explicit numeric versions are accepted; existing entries, scripts and other metadata must remain unchanged. Lock files, secrets, Git internals, installed dependencies and symlink escapes remain excluded. This permission does not install packages or run generated lifecycle scripts. Functional dependency installation/lock generation needs its own isolated execution capability; manifest editing alone is not dependency verification.
- This run implements runtime batching, transport continuation and manifest permission. It does not add a client interview-to-base-build caller, semantic ToDo acceptance runner, durable crash-resume job store, automatic dependency installation or final assembled-artifact dual-model audit. Page/file coverage cannot establish that every functional requirement works.

Validation includes an HTTP fixture carrying a 40KB specification through four governed pages into one 26-file proposal, manifest append/rejection cases, missing-page and governance-hold cases, provider truncation/concatenation and continuation exhaustion. Fixtures use synthetic governance and fake provider transport; no paid model call or live full-application audit is implied.

Runtime discovery found no active server process rooted at this public checkout. Three discovered server processes were rooted at `G:/AEGIS_DEVELOPMENT_REPOS/vibe-accepted-core-runtime`, with no listening ports when inspected. They were not restarted or modified as a substitute deployment target.

## 2026-11-03 accepted-core deployment integration

The Architect selected `G:/AEGIS_DEVELOPMENT_REPOS/vibe-accepted-core-runtime`, based on PR52 head430861f, as the live target. This target uses its existing review-record/governed-turn implementation. The port adapts base-build batches to `createGovernedAsk` with the same gauge and record, preserving ordinary routes. It does not install the source branch's bidirectional/numeric pipeline or claim PTAG activation. The target's 256KiB base-build reply ceiling is passed through its existing governed reply options.

The source branch67d26bd was published separately; the integrated PR52 revision carries the mandate, prompts and adapted runtime together. Target verification: gateway280 + app441 =721pass, zero failures/skips; production build passed. No paid provider calls were made. Compiled startup now resolves prompt/knowledge documents from the workspace and exposes the loaded instructions SHA256 plus deployment revision in authenticated status. The server binds to127.0.0.1. Existing unrelated fixtures and their model/browser receipts are not new-revision live evidence.
