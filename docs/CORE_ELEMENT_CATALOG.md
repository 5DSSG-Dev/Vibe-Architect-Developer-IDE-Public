# CORE Element Catalog v1.0

## Centrally Organized Relational Emergence — Full Toolbox Manifest

Every Element listed here implements the CORE Connection Standard. Orbs dock
via Umbilical. Satellites tether via Tether. Formulas compose multiple Elements
into a single deployable unit. External Connectors are Portal destinations
reached through the CORE boundary.

---

## 1. ORBS (20)

Orbs are the primary capability units. Each docks to a CORE Umbilical socket
and carries a distinct, self-contained function.

### Development & Code

| #  | ID         | Name                        | Description | Primary Capability | Memory | Threads |
|----|------------|-----------------------------|-------------|-------------------|--------|---------|
| 1  | orb-codegen | Code Generation Engine      | Generates source code from intent descriptions, templates, and relational context. Supports multiple languages and frameworks. | `code_generation` | 512 MB | 4 |
| 2  | orb-refactor | Refactoring Loom            | Analyzes code structure and applies transformation patterns — rename, extract, inline, restructure — while preserving relational contracts. | `code_refactoring` | 384 MB | 2 |
| 3  | orb-ast | Abstract Syntax Weaver       | Parses source into AST, enables structural queries and transformations. The foundation other code Orbs build on. | `ast_parse`, `ast_transform` | 256 MB | 2 |
| 4  | orb-debug | Fault Trace Navigator        | Traces execution paths, identifies fault origins, maps error propagation through relational chains. | `fault_trace`, `stack_analysis` | 384 MB | 2 |
| 5  | orb-testgen | Test Synthesis Engine       | Generates test cases from contracts, interfaces, and invariant declarations. Produces unit, integration, and property-based tests. | `test_generation`, `invariant_test` | 512 MB | 4 |

### Data & Knowledge

| #  | ID         | Name                        | Description | Primary Capability | Memory | Threads |
|----|------------|-----------------------------|-------------|-------------------|--------|---------|
| 6  | orb-schema | Schema Crystallizer          | Defines, validates, and migrates data schemas. Tracks schema evolution across versions without breaking contracts. | `schema_define`, `schema_migrate` | 256 MB | 1 |
| 7  | orb-query | Relational Query Engine       | Constructs and optimizes queries across structured and graph-based data sources. | `query_build`, `query_optimize` | 384 MB | 2 |
| 8  | orb-index | Knowledge Indexer             | Builds and maintains search indices over project artifacts — code, docs, contracts, telemetry logs. | `index_build`, `semantic_search` | 512 MB | 2 |
| 9  | orb-transform | Data Transform Pipeline    | Applies ETL-style transformations: map, filter, aggregate, join, reshape. Operates on streaming or batch data. | `data_transform`, `stream_process` | 384 MB | 4 |
| 10 | orb-embed | Embedding Lattice             | Generates vector embeddings for code, text, and structural elements. Feeds semantic search and similarity analysis. | `embedding_generate`, `similarity_score` | 768 MB | 4 |

### Infrastructure & Operations

| #  | ID         | Name                        | Description | Primary Capability | Memory | Threads |
|----|------------|-----------------------------|-------------|-------------------|--------|---------|
| 11 | orb-deploy | Deployment Conductor         | Orchestrates build, package, and deployment pipelines. Manages environment configs and rollback states. | `deploy_orchestrate`, `rollback` | 384 MB | 2 |
| 12 | orb-monitor | Telemetry Witness            | Observes runtime behavior without interfering. Collects metrics, traces, and logs. Never modifies the system it watches. | `telemetry_collect`, `trace_observe` | 256 MB | 1 |
| 13 | orb-env | Environment Crystallizer      | Manages environment variables, secrets references, and configuration state across dev/staging/prod. Never stores secrets directly — holds references only. | `env_manage`, `config_resolve` | 128 MB | 1 |
| 14 | orb-container | Container Forge             | Builds, manages, and orchestrates container images and runtimes. Dockerfile generation, compose orchestration, registry interaction. | `container_build`, `container_orchestrate` | 512 MB | 4 |

### Communication & Integration

| #  | ID         | Name                        | Description | Primary Capability | Memory | Threads |
|----|------------|-----------------------------|-------------|-------------------|--------|---------|
| 15 | orb-api | API Boundary Engine            | Generates, validates, and documents API surfaces — REST, GraphQL, gRPC. Enforces contract-first design. | `api_generate`, `api_validate` | 384 MB | 2 |
| 16 | orb-webhook | Event Relay Conduit          | Manages inbound and outbound webhook registrations, payload validation, retry logic, and dead-letter handling. | `webhook_manage`, `event_relay` | 256 MB | 2 |
| 17 | orb-auth | Identity & Access Lattice      | Handles authentication flows, token lifecycle, permission models, and role-based access patterns. Never stores credentials directly. | `auth_flow`, `permission_model` | 384 MB | 2 |

### AI & Reasoning

| #  | ID         | Name                        | Description | Primary Capability | Memory | Threads |
|----|------------|-----------------------------|-------------|-------------------|--------|---------|
| 18 | orb-intent | Intent Synthesis Engine      | Interprets natural language intent and maps it to CORE operations, Element selections, and connection plans. | `intent_parse`, `action_plan` | 768 MB | 4 |
| 19 | orb-review | Code Review Arbiter           | Performs multi-dimensional code review: correctness, security, style, performance. Returns findings, never verdicts. | `code_review`, `finding_report` | 512 MB | 4 |
| 20 | orb-doc | Documentation Weaver           | Generates and maintains documentation from code, contracts, and architectural relations. Keeps docs in sync with reality. | `doc_generate`, `doc_sync` | 256 MB | 2 |

---

## 2. SATELLITES (30)

Satellites tether to Host Orbs and provide specialized sub-capabilities. Each
belongs to one of five classes. Satellites can Mesh with other Satellites for
shared services.

### I/O Class (6)

| #  | ID          | Name                       | Description | Mesh Services Offered |
|----|-------------|----------------------------|-------------|-----------------------|
| 1  | sat-stdin   | Standard Input Receiver     | Captures and buffers user input streams — keyboard, clipboard, file drops. | `input_stream` |
| 2  | sat-stdout  | Standard Output Emitter     | Formats and delivers output — terminal, UI panel, file write, notification. | `output_stream` |
| 3  | sat-fileio  | File System Relay           | Reads, writes, watches, and diffs files on the local filesystem. Handles encoding detection and line-ending normalization. | `file_read`, `file_write`, `file_watch` |
| 4  | sat-netio   | Network I/O Conduit         | HTTP/HTTPS client, WebSocket connections, Server-Sent Events. Raw network transport layer. | `http_request`, `ws_connect`, `sse_listen` |
| 5  | sat-clipboard | Clipboard Bridge          | Reads from and writes to the system clipboard. Handles text, rich text, images, and file references. | `clipboard_read`, `clipboard_write` |
| 6  | sat-terminal | Terminal Emitter           | Spawns and manages shell processes, captures stdout/stderr, sends stdin. | `shell_spawn`, `shell_io` |

### Compute Class (6)

| #  | ID           | Name                      | Description | Mesh Services Offered |
|----|--------------|---------------------------|-------------|-----------------------|
| 7  | sat-parse    | Syntax Parser Satellite    | Language-aware parsing: tokenizer, lexer, tree-sitter integration. Feeds AST data to host Orbs. | `token_stream`, `parse_tree` |
| 8  | sat-lint     | Lint Evaluator             | Runs linting rules against source, reports violations with fix suggestions. Configurable rule sets. | `lint_report`, `autofix_suggest` |
| 9  | sat-format   | Code Formatter             | Applies formatting rules — Prettier, Black, rustfmt, gofmt — without changing semantics. | `format_apply` |
| 10 | sat-compile  | Compilation Worker         | Invokes language compilers/transpilers. TypeScript, Rust, Go, C++. Returns diagnostics. | `compile_invoke`, `diagnostic_stream` |
| 11 | sat-minify   | Asset Minifier             | Minifies JS, CSS, HTML, SVG. Tree-shakes dead code. Produces source maps. | `minify_apply`, `sourcemap_generate` |
| 12 | sat-bundle   | Module Bundler             | Resolves module graphs, bundles assets, handles code splitting and lazy loading. | `bundle_build`, `chunk_split` |

### Storage Class (6)

| #  | ID           | Name                      | Description | Mesh Services Offered |
|----|--------------|---------------------------|-------------|-----------------------|
| 13 | sat-git      | Git State Satellite        | Reads git state: status, diff, log, blame, branches, stash. No destructive operations — read and stage only. | `git_status`, `git_diff`, `git_log` |
| 14 | sat-cache    | Ephemeral Cache Layer      | In-memory key-value cache with TTL. Shared across meshed Satellites. | `cache_get`, `cache_set`, `cache_invalidate` |
| 15 | sat-snapshot | State Snapshot Keeper      | Captures and restores point-in-time snapshots of Element state. Enables undo/redo across operations. | `snapshot_save`, `snapshot_restore` |
| 16 | sat-log      | Structured Log Sink        | Receives, indexes, and queries structured log entries. Retains within session only — nothing persists. | `log_append`, `log_query` |
| 17 | sat-artifact | Build Artifact Store       | Manages build outputs — binaries, bundles, images, test reports. Tracks provenance. | `artifact_store`, `artifact_retrieve` |
| 18 | sat-queue    | Message Queue Satellite    | FIFO and priority message queue for inter-Satellite async communication. | `queue_enqueue`, `queue_dequeue`, `queue_peek` |

### Validation Class (6)

| #  | ID           | Name                      | Description | Mesh Services Offered |
|----|--------------|---------------------------|-------------|-----------------------|
| 19 | sat-typecheck | Type Checker Satellite   | Runs type checking across TypeScript, Python (mypy), Rust, Go. Returns typed diagnostics. | `typecheck_run`, `type_diagnostic` |
| 20 | sat-test     | Test Runner Satellite      | Executes test suites — Jest, pytest, cargo test, go test. Streams results in real time. | `test_run`, `test_result_stream` |
| 21 | sat-schema-v | Schema Validator           | Validates data against JSON Schema, OpenAPI specs, Protobuf definitions, database schemas. | `schema_validate`, `schema_diff` |
| 22 | sat-contract | Contract Verifier          | Verifies that CORE Relation Contracts are correctly implemented and invariants hold at runtime. | `contract_verify`, `invariant_audit` |
| 23 | sat-coverage | Coverage Analyst           | Computes code coverage from test runs. Maps covered/uncovered paths. Identifies dead code. | `coverage_compute`, `dead_code_detect` |
| 24 | sat-regression | Regression Detector      | Compares current test results against baseline. Flags regressions with bisect guidance. | `regression_detect`, `bisect_suggest` |

### Security Class (6)

| #  | ID           | Name                      | Description | Mesh Services Offered |
|----|--------------|---------------------------|-------------|-----------------------|
| 25 | sat-scan     | Vulnerability Scanner      | Scans dependencies and code for known CVEs, OWASP patterns, and insecure configurations. | `vuln_scan`, `cve_report` |
| 26 | sat-secrets  | Secret Leak Detector       | Scans staged files, diffs, and outputs for accidentally exposed secrets — API keys, tokens, credentials. | `secret_scan`, `leak_alert` |
| 27 | sat-sandbox  | Containment Boundary Guard | Enforces sandboxing constraints on child processes. Prevents privilege escalation. | `sandbox_enforce`, `permission_check` |
| 28 | sat-audit    | Access Audit Trail         | Records what accessed what, when, through which contract. Immutable within session. | `audit_record`, `audit_query` |
| 29 | sat-cors     | CORS & Policy Enforcer     | Validates and generates CORS headers, CSP policies, and HTTPS enforcement rules. | `cors_validate`, `csp_generate` |
| 30 | sat-checksum | Integrity Verifier         | Computes and validates checksums for contracts, artifacts, and data transfers. Detects tampering. | `checksum_compute`, `integrity_verify` |

---

## 3. FORMULAS (12)

Formulas are composed relational patterns that bind multiple Orbs and Satellites
into a single deployable unit. A Formula is a recipe — it declares which
Elements participate and how they connect.

| #  | ID           | Name                         | Composition | Purpose |
|----|--------------|------------------------------|-------------|---------|
| 1  | frm-fullstack | Full-Stack Scaffold         | `orb-codegen` + `orb-api` + `orb-schema` + `sat-typecheck` + `sat-test` | Generates a complete full-stack application scaffold with typed API, schema, and tests. |
| 2  | frm-cicd     | CI/CD Pipeline Formula       | `orb-deploy` + `orb-container` + `sat-compile` + `sat-test` + `sat-artifact` + `sat-scan` | End-to-end continuous integration and deployment pipeline with security scanning. |
| 3  | frm-review   | Comprehensive Review Formula | `orb-review` + `orb-ast` + `sat-lint` + `sat-typecheck` + `sat-coverage` + `sat-secrets` + `sat-scan` | Multi-dimensional code review: style, correctness, coverage, security, secrets. |
| 4  | frm-tdd      | Test-Driven Dev Formula      | `orb-testgen` + `orb-codegen` + `sat-test` + `sat-coverage` + `sat-regression` | Write tests first, generate implementation to satisfy them, verify coverage and regressions. |
| 5  | frm-api-first | API-First Design Formula    | `orb-api` + `orb-schema` + `orb-doc` + `sat-schema-v` + `sat-typecheck` | Design the API surface and schema first, generate code and docs from the contract. |
| 6  | frm-debug    | Deep Fault Analysis Formula  | `orb-debug` + `orb-monitor` + `sat-log` + `sat-git` + `sat-snapshot` + `sat-regression` | Trace fault to origin, correlate with git history, compare against last known good state. |
| 7  | frm-migrate  | Data Migration Formula       | `orb-schema` + `orb-query` + `orb-transform` + `sat-schema-v` + `sat-snapshot` + `sat-checksum` | Safe schema migration with validation, rollback snapshots, and integrity verification. |
| 8  | frm-doc-sync | Living Documentation Formula | `orb-doc` + `orb-ast` + `orb-api` + `sat-git` + `sat-contract` | Generates documentation that stays in sync with code, API surfaces, and contracts automatically. |
| 9  | frm-secure   | Security Hardening Formula   | `orb-auth` + `orb-api` + `sat-scan` + `sat-secrets` + `sat-cors` + `sat-sandbox` + `sat-audit` | Full security pass: auth flows, vulnerability scan, secret detection, CORS, CSP, audit trail. |
| 10 | frm-refactor | Safe Refactoring Formula     | `orb-refactor` + `orb-ast` + `sat-typecheck` + `sat-test` + `sat-coverage` + `sat-regression` | Refactor with full safety net: type checks, tests, coverage, and regression detection at every step. |
| 11 | frm-onboard  | Project Onboarding Formula   | `orb-index` + `orb-doc` + `orb-intent` + `sat-git` + `sat-log` | Indexes a new project, generates overview documentation, and enables intent-based navigation. |
| 12 | frm-embed-search | Semantic Search Formula   | `orb-embed` + `orb-index` + `orb-query` + `sat-cache` + `sat-fileio` | Builds vector embeddings, indexes the codebase, enables natural language code search. |

---

## 4. EXTERNAL CONNECTORS (14)

External Connectors are Portal destinations. Each represents a real service
outside the CORE boundary, reached through a Portal and its Tender conduit.

Portal connections enforce the same NegativeSpaceInvariants as any other
contract. The connector handles protocol translation between the external
service's API and the CORE's internal relational protocol.

| #  | ID            | Name                    | Service | Capabilities Bridged | Auth Method |
|----|---------------|-------------------------|---------|----------------------|-------------|
| 1  | ext-github    | GitHub Gateway           | GitHub API v4 (GraphQL) + v3 (REST) | Repos, PRs, issues, actions, code search, reviews, releases | OAuth App / PAT |
| 2  | ext-gdocs     | Google Docs Bridge       | Google Docs API + Drive API | Document read/write, collaborative editing, export, folder management | OAuth 2.0 |
| 3  | ext-claude    | Claude Code Relay        | Claude API (Messages, Tool Use, Agents) | Intent synthesis, code generation, review, multi-agent orchestration | API Key |
| 4  | ext-slack     | Slack Conduit            | Slack Web API + Events API | Channel messaging, thread replies, file sharing, status updates, notifications | Bot Token |
| 5  | ext-linear    | Linear Project Bridge    | Linear GraphQL API | Issues, projects, cycles, labels, team sync, status tracking | API Key |
| 6  | ext-figma     | Figma Design Relay       | Figma REST API + Plugin API | Design read, component inspection, design tokens, code connect mappings | OAuth 2.0 |
| 7  | ext-supabase  | Supabase Data Gateway    | Supabase REST + Realtime + Auth | Database CRUD, realtime subscriptions, auth management, storage, edge functions | API Key |
| 8  | ext-vercel    | Vercel Deploy Conduit    | Vercel API | Project deployment, environment management, domain config, build logs, serverless functions | Token |
| 9  | ext-npm       | npm Registry Bridge      | npm Registry API | Package search, publish, version management, dependency resolution, audit | Auth Token |
| 10 | ext-docker    | Docker Hub Gateway       | Docker Hub API + Registry API v2 | Image push/pull, tag management, build triggers, vulnerability scanning | Token |
| 11 | ext-notion    | Notion Knowledge Bridge  | Notion API | Page/database read/write, block manipulation, search, template management | Integration Token |
| 12 | ext-gsheets   | Google Sheets Relay      | Google Sheets API | Spreadsheet read/write, formula evaluation, chart data, structured data import/export | OAuth 2.0 |
| 13 | ext-sentry    | Sentry Error Relay       | Sentry API | Error tracking, issue management, release tracking, performance monitoring, alert config | DSN + Auth Token |
| 14 | ext-azure     | Azure Cloud Gateway      | Azure Resource Manager + various service APIs | Resource provisioning, deployment, monitoring, storage, compute, AI services | Service Principal |

---

## 5. ELEMENT COUNT SUMMARY

| Category            | Count | Connection Type |
|---------------------|-------|-----------------|
| Orbs                | 20    | Umbilical       |
| Satellites          | 30    | Tether + Mesh   |
| Formulas            | 12    | Composed        |
| External Connectors | 14    | Portal          |
| **Total Elements**  | **76**|                 |

The CORE has 8 Umbilical sockets. With Formulas composing multiple Elements,
and Satellites tethering to docked Orbs, the full toolbox can operate through
those 8 sockets. Mesh connections between Satellites create the emergent
service fabric.
