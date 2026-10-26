# AEGIS Vibe Architect Developer Lab — Scope and Authority Registry

**Registry ID:** `AEGIS-VADL-SCOPE-AUTHORITY-001`  
**Status:** Living, append-only reconciliation record  
**Opened:** 2026-08-14  
**Scope:** `G:\AEGIS_VIBE_ARCHITECT_DEVELOPERS_KIT`

This registry records which supplied sources govern each part of the expanded
Developer Lab, how overlapping language is reconciled, and what is or is not
implemented. It is a navigation and reconciliation layer. It does not replace
the named Canon, doctrine, standard, or source document.

Documentation, catalog registration, concept art, and visual presence are not
evidence of executable implementation. A capability becomes implemented only
after its runtime behavior, contracts, evidence, tests, and required human gates
have been demonstrated on the actual execution path.

---

## 1. Architectural vocabulary and boundary

The canonical immediate-boundary chain for the Developer Lab is:

```text
Conductor → Orb → Satellite → Actuator
```

Results and evidence return through the same immediate boundaries:

```text
Actuator → Satellite → Orb → Conductor
```

Each relation is local and contractual. Access, authority, capability, or
permission does not cascade across the chain merely because an upstream
relation exists.

The exact interaction terms are:

- Create a **Work Request**.
- **Employ an Actuator** to perform one bounded function.

`prompt`, `command`, `job`, `mission`, and similar terms may describe source
material or an implementation detail, but they do not replace **Work Request**.
Likewise, an Actuator is **Employed**; it is not treated as an independently
commanded intelligence.

### Dispatcher reconciliation

**Dispatcher** is retained as an **Orb role**. It maintains the continuity of a
Work Request, selects the appropriate Satellite, and receives the Satellite's
returned evidence. It is not a fifth structural tier and it does not directly
Employ or micromanage an Actuator. A Satellite selects and Employs the bounded
Actuator for its own domain.

**Dispatch** in the Living Software Doctrine is a routing function. Within this
Lab, that function can be fulfilled by a Dispatcher Orb without changing the
canonical structural chain. The exact placement of the Doctrine's
**QuarterMaster** inside an implemented Annex remains an open design decision;
its documented custodial responsibility is preserved without silently merging
it into the Dispatcher role.

---

## 2. Authority order by domain

Authority is domain-specific. A higher entry governs conflicts only within the
domain named in the table.

| Order | Domain | Authority | Registration decision |
|---:|---|---|---|
| 1 | Stellar glyph identity, count, composition, encoding, and provenance | `STELLAR_SCRIPT_GLYPH_CODEX.md` | **Tier-1 glyph authority.** Its canonical count is 34 and its append-only Revelation Record is preserved. |
| 2 | Stellar glyph/environment boundary | `STELLAR_GLYPH_ENVIRONMENT_SEAM.md` | Companion reconciliation authority. It relates glyph identity to the Living Architecture without allowing morphology to silently determine Action. |
| 3 | Living Software, continuity, custodial behavior, and one mutation path | `AEGIS_LIVING_SOFTWARE_DOCTRINE.md` at `origin/main` commit `41f6ed69176619a36813dc63655e18ca8733b9da` | Foundational doctrine. Registered as expanded scope; not yet merged into this checkout or implemented by registration. |
| 4 | Minimum Sufficient Intelligence and escalation mathematics | `AEGIS_PROGRESSIVE_REASONING_MATHEMATICS.md` at `origin/main` commit `52bdfb8afca0d3b28f28d26043329e051121e78a` | Foundational mathematical model. Registered as expanded scope; thresholds remain implementation parameters unless separately approved. |
| 5 | CORE connection contracts | `CORE_CONNECTION_STANDARD.md` | Current runtime-contract baseline. It requires reconciliation to the immediate-boundary chain before being treated as complete production implementation. |
| 6 | Element inventory | `CORE_ELEMENT_CATALOG.md` | Catalog authority for the existing 76-Element manifest. Catalog presence does not establish executable capability. |
| 7 | Actuator classifications and operational boundaries | `AEGIS_VIBE_ARCHITECT_IDE_ACTUIATORS.md` | Design/specification source for PROBE, SEEKER, ASSESSOR, ARCHITECT, and CONSTRUCTOR. It is subordinate to the chain and vocabulary in §1 where language conflicts. |
| 8 | Annex organization and embodied Actuator direction | `THE_ANNEX_SYSTEM.md` | Design source. Dispatcher is reconciled as an Orb role. Conversational proposals in the document remain proposals until accepted into a contract or implementation specification. |
| 9 | Global visual language and asset production | `AEGIS GLOBAL ART & IMAGE SPECIFICATION.md` | Foundational visual specification. It governs visual identity, not runtime behavior or authority. |
| 10 | Digital Aether world and travel concept | `ADDENDUM_TRAVELING_THE_DIGITAL_AETHER.odt` | Environment/world specification. It does not make the present `Aether` lighting/background implementation a Digital Aether runtime. |
| 11 | Audio briefing | `AEGIS_and_the_Relational_AI_Architecture.m4a` | Explanatory context only. It is not textual Canon and does not override the registered written authorities. |

### Superseded and retired Stellar sources

- `STELLAR_GLYPH_CANON.md` is a **superseded development draft**. It remains
  preserved as provenance; where it differs from the Tier-1 Glyph Codex, the
  Glyph Codex governs.
- `NEW_STELLAR_FONT_DEFINITIONS.md` is a 31-glyph derived definition set. Its
  authored tensor/purity values are not geometry-derived measurements. It is
  **retired as an implementation source**.
- `AEGIS_NEW_STELLAR_SCRIPT.md` is an early derived ontology draft. Its direct
  primitive-to-opcode mapping is **retired for implementation**; it remains
  preserved as development provenance.
- The two retired sources are not deleted, rewritten, or used to regenerate the
  authoritative glyph set. New Stellar implementation work begins from the
  Tier-1 Glyph Codex and the registered seam.

---

## 3. Expanded scope and implementation status

| Capability area | Registered scope | Status on 2026-08-14 | Evidence required before “implemented” |
|---|---|---|---|
| Existing 3D Developer Lab | Direct manipulation, CORE visualization, catalog, source-code frames, connection visualization | **Functional prototype / partial foundation** | Current runtime verification for the affected path and production acceptance gates |
| Connection Runtime | Contracted immediate-boundary relations, lifecycle, heartbeat, resource release, evidence | **Executable local foundation with local evidence archive and protected Redis evidence service** | Authenticated workspace synchronization, durable heartbeat/severance streams, lifecycle soak, deployment, and production review |
| Build Master and 76 Elements | Production-grade executable Element toolchain | **Planned; catalog is not implementation** | Real Element execution, tests proving function, contract validation, and catalog registration from verified artifacts |
| Actuators | PROBE, SEEKER, ASSESSOR, ARCHITECT, CONSTRUCTOR plus explicitly authorized extensions | **One bounded Docs Builder vertical slice implemented locally; broader guild remains specification/design** | Production identity/authorization, persistent evidence, isolation trials, and implementation of each additional Actuator |
| Annex / Custodial Runtime | Observation, Shortfall handling, continuity, diagnosis, recovery proposal, independent QA | **Doctrine/design only** | Isolated custodial runtime, case ledger, one mutation path, continuity demonstration, independent restoration verification |
| Stellar | Tier-1 34-glyph identity, composition, PUA/font path, deliberate semantic mapping | **Canon established; Lab integration not implemented** | Registry/compiler/runtime seam, validated font assets, round-trip encoding, append-only provenance, visual and executable QA |
| Digital Aether | Relational navigation by permission, memory, computational proximity, gates, currents, and changing topology | **World/visual specification only** | Executable topology model, navigation contracts, state/evidence model, performance and interaction QA |
| Living Software | Continuity Under Shortfall, custodial recovery, one mutation path, learning/evolution proposals | **Upstream doctrine; not merged or implemented in this checkout** | Merged authority, contracts, isolated failure trial, ledgers, operator communication, recovery and rollback evidence |
| Progressive Reasoning | Minimum Sufficient Intelligence, evidence-supported confidence, bounded escalation | **Upstream mathematical model; not merged or implemented in this checkout** | Approved parameters, deterministic evaluation, anti-loop behavior, escalation packets, cost/evidence telemetry, human gates |

The audio briefing, visual assets, manifests, and source documents support the
direction of the expanded Lab. None of them independently satisfy the evidence
column above.

---

## 4. Source integrity register

Hashes are lowercase SHA-256 over the exact file bytes observed on 2026-08-14.
External source and repository-copy rows with the same hash were byte-identical
at registration time.

| Source | Bytes | SHA-256 / immutable locator | Authority note |
|---|---:|---|---|
| `CORE_ELEMENT_CATALOG.md` | 19,286 | `04b5cf0bb2acb4e5a62c4165f10afb3e422c4cc3549c2a50a625696241717701` | 76-Element manifest |
| `CORE_CONNECTION_STANDARD.md` | 16,261 | `9c931abc46f1ed99158c948feb0db1972e3767e21bc61ac49d2c62de9cf60682` | Current contract baseline |
| `docs/AEGIS GLOBAL ART & IMAGE SPECIFICATION.md` | 20,181 | `0e4ceb6d81cea950089a4a136a5d5f046304cde231b5e1340e36a69e5fcbc4e8` | Visual authority |
| `docs/STELLAR_SCRIPT_GLYPH_CODEX.md` | 30,535 | `0e4b282281d3cc6adb9c12763abfd70e3e608082db75c78bb7fdb0546ac6fb69` | Tier-1 glyph authority |
| `docs/STELLAR_GLYPH_ENVIRONMENT_SEAM.md` | 7,028 | `fe1f4d11dbe44bcf47f98cfa9b04725cce0ed2f9cef4b9c1bc733ff169bd28ab` | Companion seam |
| `docs/STELLAR_GLYPH_CANON.md` | 36,437 | `e409fc90e7032d9a7f27f0ec45847b5e259a23e8e777f44dfca5211a41c6934d` | Superseded development draft |
| `docs/AEGIS_VIBE_ARCHITECT_IDE_ACTUIATORS.md` | 41,225 | `1ec139a70dfe3c4cbb7999ba265bdc0d2cdda78ce9353204e11b433e0333f8ad` | Actuator design/specification source; filename retained as supplied |
| `docs/THE_ANNEX_SYSTEM.md` | 92,102 | `a43dbead497f6ca2049fa59e2b72e337c0f1cfe4a7961aba7d9578c3a07f8c9c` | Byte-identical to `G:\AEGIS_STELLAR_SCRIPT\THE_ANNEX_SYSTEM.md` |
| `docs/NEW_STELLAR_FONT_DEFINITIONS.md` | 13,047 | `a459e677dd93bf9a907215256ceed047d7d56e77017c222e8ec63c577c980644` | Byte-identical to external source; retired for implementation |
| `docs/AEGIS_NEW_STELLAR_SCRIPT.md` | 5,988 | `ed048585e5073106e33ac368464fa41e7e3ab0613815992eb3390819417e1e0c` | Byte-identical to external source; retired for implementation |
| `docs/ADDENDUM_TRAVELING_THE_DIGITAL_AETHER.odt` | 42,724 | `6a8389c133f0229b797b914b99275bd25a047097a43be7ea87224cedfd1081fc` | Digital Aether environment/world source |
| `C:\Users\TraceyPrutch\Downloads\AEGIS_and_the_Relational_AI_Architecture.m4a` | 39,914,599 | `08e4fbfef6e0df9130b9c41d2e36df72b43ee755a1af8c33db50f5109c6e7ee7` | Explanatory audio context; external file |
| `AEGIS_LIVING_SOFTWARE_DOCTRINE.md` at `origin/main` | — | Git blob `543b8a3b074e656856863083c4f4a38c2df1c9ae`; commit `41f6ed69176619a36813dc63655e18ca8733b9da` | Foundational doctrine; upstream, not present at current `HEAD` |
| `AEGIS_PROGRESSIVE_REASONING_MATHEMATICS.md` at `origin/main` | — | Git blob `e4b2c2e68ff5e5feb936659d506bf14b11904a60`; commit `52bdfb8afca0d3b28f28d26043329e051121e78a` | Foundational model; upstream, not present at current `HEAD` |
| `IMPLEMENTATION_PLAN.md` before this reconciliation | 21,072 | `e8b3cae5f5ed44be90cb781e009077cc096cde3f3192c529ddd2999bf7e7382a` | Preserved baseline hash; the plan is updated by this decision |
| `IMPLEMENTATION_PLAN.md` after this reconciliation | 29,298 | `f6c0c43cffba114b65241ef55640a233d52d500ceecaaf3d61f48ed3856ec6aa` | Registered expanded-scope plan |
| `IMPLEMENTATION_PLAN.md` after local foundation checkpoint | 30,627 | `8d5a0c91e03673e2d19408e2a272b568c8d5605838f9414b87826aef67da80ea` | Current plan after recording Connection Runtime and Docs Builder vertical-slice status |
| `IMPLEMENTATION_PLAN.md` after local acceptance evidence | 31,096 | `beff64616b2dbf0b3a6942396a59ae405e0ed586f8fb5c1e5d3c7825c8dd51ab` | Current plan after appending 91-test, production-build, and rendered-browser evidence |
| `public/basis/basis_transcoder.js` | 57,443 | `9100e72356386a2c8ac04ac8e574080bbe7598ce46cc10fac62482520b5f755b` | Served CSP-safe derivative of pinned official Three.js 0.184.0 wrapper |
| `public/basis/basis_transcoder.wasm` | 527,333 | `6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a` | Byte-identical official Three.js 0.184.0 Basis WASM |
| `public/basis/PROVENANCE.json` | 1,383 | `97f93618022bd8dae058a9ece59ae0b8421f36c02a1a5472f42649430b9273a9` | Upstream package/integrity and derivative hash record |
| `scripts/patch_basis_transcoder_csp.mjs` | 6,160 | `75429fc0ddd88de7c2ff577a5be36680a212d362306d41d0b4dd3588fcf6dacd` | Deterministic closure-based Embind patch; reproduces served wrapper hash |
| `server/evidence-store.ts` | 26,086 | `bedfb2c94f37ea943c7f35ac77148cbda0821b6188fa4d392ec8406e9ef3910b` | Protected evidence service storage, integrity, and replay foundation |
| `server/evidence-router.ts` | 3,677 | `5dfe00310850cebf125f969ae8fdd06b653d3a9d912e7dacff846ddc906ec5dc` | Admin-role and same-origin-CSRF evidence routes |
| `src/engine/evidenceArchive.ts` | 6,452 | `ff8130b580098872e58eda9c749a22d53292d26badd260b0a8443e8cbf626749` | Bounded sanitized local evidence archive |
| `IMPLEMENTATION_PLAN.md` after evidence/KTX2 acceptance | 32,048 | `ed4ca6582d7ae7020999eb4263cec64a03108840f385c9069d65104e59cade6b` | Current Gate 7 plan after durable evidence and strict-CSP KTX2 implementation |

---

## 5. Reconciliation and decision ledger (append-only)

Entries are appended in date order. A later entry may clarify or supersede a
decision, but prior entries remain visible.

### 2026-08-14 — Expanded scope registered

- Registered Annex, Actuators, Stellar, Digital Aether, Living Software, and
  Progressive Reasoning as explicit Developer Lab scope.
- Recorded implementation state independently from document presence.
- Preserved source hashes and upstream Git locators before plan changes.

### 2026-08-14 — Immediate-boundary architecture reconciled

- Registered `Conductor → Orb → Satellite → Actuator` as the canonical chain.
- Registered **Work Request** and **Employ an Actuator** as exact architectural
  primitives.
- Retained Dispatcher as an Orb role and Dispatch as a routing function.
- Recorded that permission and capability do not cascade across boundaries.

### 2026-08-14 — Stellar source authority reconciled

- Registered `STELLAR_SCRIPT_GLYPH_CODEX.md` as Tier-1 glyph authority.
- Registered `STELLAR_GLYPH_CANON.md` as a superseded development draft.
- Retired the 31-glyph definitions and early direct opcode ontology as
  implementation sources while preserving both as provenance.

### 2026-08-14 — Open decisions preserved

- The precise implemented relation between QuarterMaster and Dispatcher Orb is
  unresolved.
- The mapping from Stellar glyph identity to executable semantic behavior is a
  designed seam and remains subject to explicit approval and evidence.
- Production thresholds for Progressive Reasoning are not set by illustrative
  values in the mathematical source.
- No deployment, live mutation, autonomous recovery, or runtime authorization
  is granted by this documentation registration.

### 2026-08-14 — Local runtime foundation and first Actuator slice recorded

- Replaced the UI's guaranteed handshake animation and illustrative checksum
  generation with the failure-capable Connection Runtime and canonical SHA-256
  contract evidence.
- Added all five negative-space invariants, explicit CORE capability/resource
  envelopes, atomic allocation rollback, heartbeat state transitions, mutual-
  consent graceful severance, and capability cleanup.
- Added a bounded in-memory Markdown Docs Builder Actuator with an immutable
  permission envelope and a hash-chained Work Request ledger covering the
  forward execution chain, stand-down, independent assurance, and the reverse
  evidence path to the Conductor.
- Self-hosted the Draco decoder and removed plain `unsafe-eval` from the Lab's
  Content Security Policy. Strict-CSP KTX2 browser acceptance remains open.
- This checkpoint is local implementation evidence only. It does not authorize
  deployment, external writes, or expansion to the remaining Actuator guild.

### 2026-08-14 — Local acceptance evidence appended

- The combined gateway and application suite passed 91 of 91 tests; all three
  TypeScript stages and the Vite production build passed.
- Rendered-browser QA completed the 11-stage Work Request evidence chain and a
  nine-step Umbilical handshake whose displayed checksum was a signed,
  lowercase 64-hex SHA-256 digest.
- No fatal browser exception, failed request, or 404 remained. Initial hot-
  reload cache messages resolved into successful GLTF loads; the multiple-
  Three.js-instance warning remains a follow-up item.
- Browser acceptance did not exercise the KTX2 generated-function path, so
  strict-CSP KTX2 acceptance remains explicitly open.

### 2026-08-14 — Append-only evidence boundary implemented

- Added a bounded local evidence archive that verifies its complete hash chain
  on read and startup replay. Relation Contracts persist only after explicit
  Commit; Work Requests persist sanitized receipts after ledger verification.
- Raw Work Request intent, document purpose/body, and artifact content are not
  written into the evidence archive.
- Added a protected gateway evidence service with Entra-role and same-origin
  CSRF boundaries, exact source validation, semantic Work Request stage
  transitions, independent per-stream integrity chains, replay, idempotency,
  conflict refusal, and bounded development capacity.
- Production now refuses absent or in-memory evidence storage. The shipped
  durable provider uses atomic Redis append and does not silently fall back.
- The unauthenticated design workspace does not write through the protected
  boundary. Authenticated synchronization remains an explicit future gate.

### 2026-08-14 — Strict-CSP KTX2 path accepted locally

- Registered a pinned official Three.js 0.184.0 Basis source and deterministic
  closure-based Embind patch with file hashes and reproducible derivation.
- Embedded KTX2 bufferViews now parse in memory; ordinary embedded textures use
  the image-loading path. Neither path requires `connect-src blob:`.
- Fresh gateway browser evidence loaded all exercised KTX2-backed canonical
  models with no EvalError, plain `unsafe-eval`, CSP violation, decoder warning,
  or HTTP 404. The policy retains only `wasm-unsafe-eval` for WebAssembly.
- This is local browser acceptance, not deployment authorization.
