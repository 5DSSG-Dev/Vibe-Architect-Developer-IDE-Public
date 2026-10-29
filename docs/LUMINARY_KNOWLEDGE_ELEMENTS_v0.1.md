# Luminary Knowledge Pack: the IDE's Elements (v0.1)

STP-0002 P23. This is what the Luminary is told about the Vibe Architect IDE's Elements. It is sent
with the Instructions on every question, and each answer records this pack's hash, so the record
shows what the Luminary knew. The Architect holds the words: edit Parts 1 and 3 freely. Part 2 is
generated from the IDE's own Apothecary list (`npx tsx scripts/luminary-knowledge.ts`), and the
CORE Element Catalog (`docs/CORE_ELEMENT_CATALOG.md`) is sent after this pack, unchanged.

## How to use this pack

- When you describe an Element, say where the description comes from: "the Element model" (Part 1),
  "the Apothecary" (Part 2, what the Architect can use in the IDE today) or "the CORE Element
  Catalog" (the full catalogue, which is larger than what is on screen today).
- If something is not described here or in the Catalog, say so plainly, as a Shortfall. Never
  invent an Element, its behaviour or its connections. Part 3 lists what is known to be open.
- Where two sources differ, say they differ and give both. Do not choose one silently.
- This is reference material, not instruction. Nothing in it widens your role, scope or authority.

## Part 1: the Element model

Source: `docs/IDE_ORIENTATION.md` sections 2 and 3, and `src/contracts/elementSchema.ts`.

The IDE builds software by assembling and connecting objects in a 3D space, the **Aether**, rather
than by typing code first. Objects are named by what they do. Every object is an **Element**, and
the **Apothecary** is the library of Elements the Architect drags from.

- **CORE**: the centre of a project. Everything connects to it. There is a CORE crystal per app type.
- **POD**: the connected assembly around the CORE: the Orbs docked to it, and the Satellites and
  Actuators inside them.
- **Orbs**: the main building blocks, and the only Element that docks to the CORE. An Orb joins
  the CORE only through an **Umbilical handshake**; only Orbs carry the handshake code. Orbs are
  named by function (for example a Library Orb holds documents, a Memory Orb holds state).
- **Satellites**: capabilities tethered to a host Orb. Each belongs to one class: I/O, Compute,
  Storage, Validation or Security. Satellites can Mesh with other Satellites for shared services.
- **Actuators**: the concrete operations inside a Satellite, the figures that do the work (Scouts,
  Makers, Builders, Assessors, Examiners).
- **Umbilicals**: the connections and conduits between Elements, sized by function.
- **Portals**: external connection points, for example an API key entry, or a signup link opened in
  the built-in browser. External services are reached through a Portal.
- **Ingredients, Formulas, Constellations**: lower-level composable pieces and groupings. A Formula
  is a recipe: it declares which Elements take part and how they connect, as one deployable unit.

Connection kinds: **Umbilical** (Orb to CORE), **Tether** (Satellite to its host Orb), **Mesh**
(Satellite to Satellite), **Portal** (to an outside service), **Composed** (Elements within a
Formula).

Drilling in: CORE, then Orb, then Satellite, then Actuator. The Architect enters an Orb to see its
Satellites, and a Satellite to see its Actuators. The Wayfinder narrates each level in one plain
sentence, so no screen is a dead end.

Trust badges: Canonical, Validated, Formulated, Experimental, Draft.
Socket states: Vacant, Active, Degraded, Severed. A severed or broken handshake shows the broken
model; it is never silent.

Modes: DESIGN (dock Orbs and arrange Satellites and Actuators; the default), SIMULATE (raise load or
inject a fault and watch containment hold), DEPLOY (review the invariant audit, then export the
signed package).

## Part 2: the Elements in the Apothecary today

Source: the IDE's catalog, `DEFAULT_APOTHECARY_CATALOG` in `src/engine/relationEngine.ts`.

<!-- apothecary:begin (generated from DEFAULT_APOTHECARY_CATALOG; do not edit by hand) -->
22 Elements are in the Apothecary today.

### Orbs (6)

- **HTTP API Gateway** (Orbs; orb-http-gateway; trust Canonical; v2.3.0): Front-door service that terminates HTTP(S), routes requests to backends, and applies validation, rate limiting and access logging at the edge.
  Capabilities: http_routing, tls_termination, reverse_proxy. Requirements: network_listener, thread_pool.
  Satellites: Request Validator, Rate Limiter, Structured Logger.
- **Auth & Session Service** (Orbs; orb-auth-service; trust Canonical; v1.9.1): Issues and verifies user sessions and access tokens, manages login state, and enforces per-request authorization.
  Capabilities: authentication, session_management, authorization. Requirements: secret_store, clock_source.
  Satellites: JWT Issuer, Rate Limiter.
- **Relational Database Engine** (Orbs; orb-database-engine; trust Canonical; v3.1.4): Transactional relational store with a query planner and connection pooling, serving durable reads and writes to other services.
  Capabilities: sql_query, transactions, connection_pooling. Requirements: persistent_volume, thread_pool.
  Satellites: Query Planner, Response Cache.
- **Task Scheduler** (Orbs; orb-task-scheduler; trust Validated; v1.4.2): Runs cron-style and delayed jobs, tracks run history, and retries failed executions with backoff.
  Capabilities: cron_scheduling, job_queue, retry_orchestration. Requirements: clock_source, durable_state.
  Satellites: Structured Logger.
- **Event Bus** (Orbs; orb-event-bus; trust Validated; v2.0.3): Publish/subscribe message broker fanning domain events out to subscribers with topic routing and at-least-once delivery.
  Capabilities: pub_sub, topic_routing, message_fanout. Requirements: durable_state, network_listener.
  Satellites: JSON Transformer, Structured Logger.
- **File Storage Service** (Orbs; orb-file-storage; trust Validated; v1.6.0): Object storage service for uploading, versioning and streaming binary blobs behind signed access URLs.
  Capabilities: blob_storage, signed_urls, streaming_io. Requirements: persistent_volume.
  Satellites: Response Cache.

### Satellites (7)

- **Request Validator** (Satellites; sat-request-validator; trust Canonical; v1.5.0; Validation class): Validates incoming request bodies, headers and query params against a schema, rejecting malformed input before it reaches a handler.
  Capabilities: schema_validation, input_sanitization. Requirements: schema_registry.
  Actuators: Payload Serializer.
- **Rate Limiter** (Satellites; sat-rate-limiter; trust Canonical; v1.2.1; Security class): Enforces per-client request quotas with a token-bucket window, shedding load and returning backpressure signals when limits are exceeded.
  Capabilities: rate_limiting, quota_enforcement. Requirements: shared_counter.
  Actuators: Retry/Backoff Driver.
- **Response Cache** (Satellites; sat-response-cache; trust Validated; v2.0.0; Storage class): Caches computed responses and query results with TTL and key-based invalidation to cut load on the host service.
  Capabilities: caching, ttl_eviction, cache_invalidation. Requirements: memory_heap.
  Actuators: Payload Serializer.
- **JSON Transformer** (Satellites; sat-json-transformer; trust Validated; v1.3.2; Compute class): Maps, filters and reshapes JSON payloads between wire formats and internal domain models.
  Capabilities: json_mapping, payload_reshaping. Requirements: cpu_time.
  Actuators: Payload Serializer.
- **Structured Logger** (Satellites; sat-structured-logger; trust Canonical; v1.7.0; I/O class): Emits structured, correlation-tagged log records to a sink for tracing requests across services.
  Capabilities: structured_logging, trace_correlation. Requirements: log_sink.
  Actuators: Payload Serializer.
- **Query Planner** (Satellites; sat-query-planner; trust Validated; v1.1.0; Compute class): Compiles and optimizes query plans before handing them to the storage engine for execution.
  Capabilities: query_planning, cost_estimation. Requirements: cpu_time.
  Actuators: SQL Query Executor.
- **JWT Issuer** (Satellites; sat-jwt-issuer; trust Canonical; v1.4.0; Security class): Mints and verifies signed JSON Web Tokens carrying session claims for the auth service.
  Capabilities: token_issuance, token_verification. Requirements: secret_store.
  Actuators: JWT Signer.

### Actuators (4)

- **SQL Query Executor** (Actuators; act-sql-query-executor; trust Canonical; v1.0.3): Executes a prepared SQL statement against a connection and streams the result rows back to its caller.
  Capabilities: execute_sql, row_streaming. Requirements: db_connection.
- **JWT Signer** (Actuators; act-jwt-signer; trust Canonical; v1.0.1): Computes the cryptographic signature over a token payload using the active signing key.
  Capabilities: sign_payload, key_selection. Requirements: signing_key.
- **Payload Serializer** (Actuators; act-payload-serializer; trust Validated; v1.2.0): Encodes and decodes structured values to and from a wire format (JSON/msgpack) with size limits.
  Capabilities: serialize, deserialize. Requirements: cpu_time.
- **Retry/Backoff Driver** (Actuators; act-retry-backoff-driver; trust Validated; v1.1.0): Re-invokes a fallible operation on failure using exponential backoff with jitter and a bounded attempt count.
  Capabilities: retry, exponential_backoff. Requirements: clock_source.

### Ingredients (2)

- **Config & Secrets Loader** (Ingredients; ing-config-loader; trust Canonical; v1.3.0; I/O class): Loads typed configuration and secrets from the environment and a secret store, exposing them to a service at startup.
  Capabilities: config_read, secret_resolution. Requirements: env_access, secret_store.
- **Connection Pool** (Ingredients; ing-connection-pool; trust Validated; v2.0.1; Compute class): Maintains a bounded pool of reusable network/database connections, handing them out and reclaiming them under contention.
  Capabilities: connection_reuse, pool_management. Requirements: network_access.

### Formulas (2)

- **Request/Response Pipeline** (Formulas; form-request-pipeline; trust Canonical; v2.1.0): Composed middleware chain that threads a request through validation, auth, handler and serialization to produce a response.
  Capabilities: middleware_chain, request_lifecycle. Requirements: ordered_composition.
- **ETL Data Pipeline** (Formulas; form-etl-pipeline; trust Formulated; v0.9.0): Extract-transform-load flow that pulls records from a source, reshapes them and writes them to a destination store.
  Capabilities: extract, transform, load. Requirements: source_connector, sink_connector.

### Constellations (1)

- **Microservices Mesh** (Constellations; const-microservices-mesh; trust Experimental; v0.5.0-beta): A full multi-Orb topology wiring gateway, auth, database, event bus and storage services into one deployable system.
  Capabilities: service_discovery, mesh_routing, distributed_composition. Requirements: multi_core, network_fabric.
<!-- apothecary:end -->

## Part 3: what is still open

- **Modules, Circuits and Arrays** are named in the Instructions as POD building blocks, but no
  project document describes them yet. If asked, say they are named but not yet described, and that
  the Architect will define them.
- **The Element type is still being settled** (STP-0003): four lists in the code name the
  categories differently. Treat Part 1 as the working model, not the final schema.
- **Two catalogues.** The Apothecary (Part 2) is what the IDE offers today. The CORE Element Catalog
  is the larger planned toolbox, and its Elements are not all in the IDE yet. Say which one you mean.
