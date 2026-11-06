# Security guidance

Vibe Architect is a source-available hackathon demo. This document gives reviewers project-specific security guidance; it does not certify production readiness. See [the acceptance matrix](docs/IDE_PRODUCT_ACCEPTANCE_MATRIX_2026-11-06.md) and revision-bound reports for demonstrated behavior and remaining limits.

## Reporting a concern

Do not post credentials, private conversations, personal data, working exploits, or confidential audit records in public issues or pull requests. Redact examples and use an isolated workspace you own.

A dedicated private reporting channel is not yet configured. GitHub private vulnerability reporting was disabled when checked on 2026-11-06. For a sensitive finding, first ask the maintainer for a private reporting channel using a public issue containing no vulnerability details. This document does not establish a response-time commitment.

## Assets and trust boundaries

### Credentials and gateway admission

Provider API keys, IDE demo keys, session cookies, identity certificates, and private governance records belong outside the public repository. Do not expose them in browser bundles, URLs, screenshots, logs, generated projects, or review comments. Masking an input does not make a secret safe to publish.

Preserve authentication and role checks on gateway routes. A provider key and an IDE gateway demo key have different purposes. The development-only local-session mechanism requires explicit configuration, loopback access, matching host/origin checks, and an opaque HttpOnly cookie; it must not become a production authentication bypass. Keep authorization failures distinct from model or generation failures.

### Browser policy and model assets

Preserve default frame denial, same-origin controls, and narrow route exceptions for the Atlas. Do not enable framing for the entire application to fix a single embedded document. Preserve CSP and avoid broad script/connect permissions to accommodate assets. Embedded GLB textures should follow the existing strict-CSP loader pattern and scoped image policy.

Validate behavior through the actual gateway: a Vite/static preview does not establish CSP or authentication compatibility. Production inline-script compatibility remains a documented limitation of the welcome repair, not a cleared deployment gate.

### Generated artifacts and execution

Treat model output, imported workspace files, retained bundles, request bodies, and filesystem paths as untrusted input. Preserve schema, capability, path-containment, artifact/context digest, and independent audit checks before build or launch. Code represented in an Element is not authority to execute it.

Build and launch must stay within the admitted project's output root and intended loopback exposure. Check resolved paths and symlinks before filesystem operations. Avoid shell interpolation of untrusted data; dependencies, child processes, sockets, and cleanup need explicit ownership. Never let a failed or interrupted audit promote an artifact to an accepted state.

### Data, retries, and governance

Preserve accepted requirements and governance gates on both inbound and outbound AI interactions. A model's claim of compliance is not an independent audit receipt. Missing clearance, conflicting artifact identity, and unknown dispatch outcomes must remain explicit failures or holds.

Retries and recovery must preserve operation identity and avoid duplicate admissions or releasing another operation's reservation. Keep private evidence outside public assets and repository history. Preserve historical snapshots and append-only records; investigate integrity failures without silently refreshing their baseline.

The current generated-app profile uses in-memory records that clear on reload. Saving the IDE workspace does not preserve those records. Image uploads, accounts, and persistent storage are unsupported; do not present the demo as providing those security or durability properties.

## Verification boundaries

Security review should report a concrete trigger, affected boundary, consequence, and supporting evidence. Distinguish verified behavior from suspected risks and unsupported features. Model-dependent acceptance uses live providers; do not bypass authentication, enable production capabilities, install dependencies, publish, or deploy merely to obtain a passing review.
