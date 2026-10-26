# AEGIS Tumbler Continuity Interface Standard v0.1

**Status:** Formulated architecture standard  
**Scope:** Continuity Capsule security, reopening, revision, release, and recovery  
**Authority relation:** Conductor authorizes; Dispatch routes; Satellites coordinate; Actuators act  
**Foundational maxim:** A validated condition is evidence of alignment. It is never authority to mutate.

---

## 1. Purpose

This standard defines how an AEGIS application preserves a lawful and verifiable path from a compiled Runtime Artifact back to its editable relational architecture.

Every compiled AEGIS application is linked to four distinct artifacts:

1. **Runtime Artifact** — the executable application.
2. **Continuity Capsule** — the editable relational graph, source or immutable source references, Relation Contracts, Intent, provenance, Companion continuity, toolchain description, and workspace state.
3. **Build Attestation** — the signed binding between a specific Runtime Artifact, Continuity Capsule, source state, and build environment.
4. **State Export** — sanitized and approved operational evidence returned from runtime for future consideration.

The **AEGIS Tumbler Lock** protects the authority to inspect protected authoring material, rehydrate an editable workspace, propose or perform revision, and admit a new release. It does not prevent an intact, signed Runtime Artifact from performing its already-authorized ordinary function.

> **The Runtime may continue to serve. The editable identity remains sealed until the required dimensions align and continuity is established.**

---

## 2. Architectural Distinctions

### 2.1 Tumbler

The Tumbler evaluates a declared set of multidimensional conditions for a specific requested crossing. It answers:

> **Are the required dimensions presently in resonance for this requested operation?**

The Tumbler does not decide whether a revision is wise, does not authorize work, and does not modify any artifact.

### 2.2 Arbiter Continuity Chain

The Arbiter evaluates succession. It answers:

> **Does this validated state legitimately follow the preceding recognized state?**

The Arbiter correlates hashes, signatures, identities, Time, predecessor references, Relation Contracts, revocation state, and lineage evidence. It returns a continuity determination, never a mutation command.

### 2.3 Customs

Customs governs the crossing of artifacts and evidence between security domains. It validates the declared manifest, sanitizes allowable projections, records the crossing, and refuses undeclared or out-of-resonance material.

### 2.4 Tumbler Generator

A Tumbler Generator creates a narrowly scoped validation challenge or grant for one declared relation, operation, subject, target, environment, and time window. It cannot create authority broader than the signed Relation Contract from which it is derived.

### 2.5 Authority holders and participants

| Participant | May do | May not do |
|---|---|---|
| Companion | Witness, suggest, compare, explain, form an Offering | Unlock, dispatch, mutate, admit, or treat silence as consent |
| Annex | Detect Shortfall, preserve evidence, contain, open a Recovery Request | Change code, weaken contracts, admit repair, declare its own success |
| Tumbler | Evaluate dimensional alignment | Grant purpose, authorize mutation, change policy |
| Arbiter | Determine continuity status | Repair lineage, waive missing proof, mutate artifacts |
| Customs | Admit, reject, quarantine, and record declared crossings | Originate Intent or transform evidence into authority |
| Conductor | Consider Intent and evidence; authorize or decline bounded work | Perform the operational work directly |
| Dispatch | Materialize the authorized route and relay changing execution state | Originate purpose or expand scope |
| Satellite | Coordinate a bounded phase and summon its Actuators | Exceed the Work Request or admit its own result |
| Actuator | Perform the specifically authorized action | Self-authorize, broaden scope, or bypass verification |

---

## 3. Invariants

The following invariants are structural and non-configurable:

1. **No capability without a signed Relation Contract.**
2. **Validation is not authorization.** A Tumbler `ALIGNED` result alone enables no mutation.
3. **Continuity is not permission.** An Arbiter `CONTINUOUS` result proves lineage but does not authorize an operation.
4. **No authority by aggregation.** Combining individually insufficient grants never creates sufficient authority.
5. **No silent downgrade.** Missing, stale, unavailable, ambiguous, or unverifiable dimensions do not pass.
6. **No self-admission.** A Constructor, Test, or Verify participant cannot admit the artifact it produced or assessed.
7. **No production editing.** A deployed Runtime Artifact is never directly converted into a writable authoring workspace.
8. **No evidence mutation.** Runtime evidence enters through Customs as an immutable State Export or a derived sanitized projection.
9. **No scope inheritance beyond contract.** A Satellite or Actuator receives only the capabilities necessary for its bounded phase.
10. **No credential or private witness leakage.** Prompts, completions, unrestricted witness state, secrets, and credentials are excluded from portable capsules and Admin projections.
11. **Every attempt produces provenance.** Success, failure, timeout, refusal, quarantine, recovery, and revocation are recorded.
12. **Every admitted revision is reversible.** The preceding known-good runtime, capsule, attestation, and continuity head remain recoverable.

---

## 4. Tumbler Dimensions

A Tumbler Policy selects the dimensions required by the requested operation. The canonical dimension vocabulary is:

| Dimension | Question answered | Representative evidence |
|---|---|---|
| Identity | Who or what is participating? | ElementRef, human identity, workload identity, signature key ID |
| Relation | Does an active Relation Contract permit this crossing? | contract ID, parties, capability exchange, invariants |
| Intent | What declared purpose is being served? | Intent ID, Work Request ID, requested operation and scope |
| Authority | Who authorized this exact operation? | Conductor authorization, Dispatch route binding |
| Artifact | Are the runtime, capsule, source, and dependencies the declared objects? | content hashes, manifest roots, dependency lock hashes |
| State | Is the requested transition valid from the present state? | lifecycle state, predecessor state, known-good marker |
| Time | Is the evidence fresh and ordered? | issued-at, not-before, expiry, monotonic event, T-Witness |
| Environment | Is execution occurring in the declared substrate and containment? | environment attestation, toolchain, policy profile |
| Integrity | Have signatures, checksums, and Negative Space remained intact? | signature verification, invariant report, revocation check |
| Provenance | Can the chain from origin to current object be reconstructed? | predecessor links, build attestation, ledger references |

An implementation may introduce additional dimensions through a versioned policy extension. It cannot remove a dimension required by the governing operation profile or redefine a canonical dimension to weaken it.

### 4.1 Three-ring evaluation model

Where AEGIS represents the Tumbler as three rings, the rings are interpreted as coordinated evaluation groups rather than three passwords:

1. **Ring One — Identity and Relation**  
   Establishes the participating subjects, signed Relation Contract, declared capabilities, and permitted boundary crossing.

2. **Ring Two — Artifact and Continuity**  
   Establishes the exact artifacts, state, predecessor, Time, integrity, and provenance chain.

3. **Ring Three — Present Dispatch Context**  
   Binds the validation to current Intent, Conductor authorization, Dispatch route, target environment, operation scope, freshness window, and nonce.

Ring Three is intentionally dynamic. Dispatch may rotate its value as the authorized route advances and relays the new state to Customs, the Satellite Host, the Conductor, and the QuarterMaster. Rotation changes the present execution binding; it does not rewrite Rings One or Two.

All required rings must independently align. Partial alignment cannot be combined into a grant.

---

## 5. Operation Profiles

| Profile | Required result | Effect |
|---|---|---|
| `RUN_SIGNED` | Runtime signature and allowed environment align | Ordinary runtime starts; capsule stays sealed |
| `INSPECT_PUBLIC` | Public manifest integrity aligns | Non-sensitive descriptor and build identity may be viewed |
| `INSPECT_PROTECTED` | Identity, Relation, Artifact, Time, Integrity align | Authorized protected material may be viewed read-only |
| `REHYDRATE_WITNESS` | Tumbler aligned + Arbiter continuous | Clean read-only workspace opens; Companion starts in Witness mode |
| `ENTER_EDIT` | Rehydration proof + Conductor-authorized Intent + Dispatch route | Writable branch is created in containment |
| `IMPORT_STATE_EXPORT` | Export manifest, source runtime, sanitation policy, and continuity align | Evidence is admitted as evidence; authoring state is unchanged |
| `DISPATCH_REVISION` | Active Work Request, route, capability, target, and current Ring Three align | Bounded Satellites and Actuators may act within scope |
| `VERIFY_CANDIDATE` | Candidate identity, test plan, verifier separation, and predecessor bind align | Independent verification may execute; no admission occurs |
| `ADMIT_RELEASE` | Verify evidence, Conductor admission decision, release route, rollback anchor, and all hashes align | Dispatch may seal and publish the new release |
| `RECOVER_CONTINUITY` | Recovery case, quorum/policy proof, immutable evidence, and new lineage branch align | A new continuity branch may be proposed; old history is never overwritten |

No profile inherits the mutation rights of another. In particular, `REHYDRATE_WITNESS` does not imply `ENTER_EDIT`, and `VERIFY_CANDIDATE` does not imply `ADMIT_RELEASE`.

---

## 6. Canonical Lifecycle

### 6.1 Seal and compile

1. Conductor accepts declared build Intent.
2. Dispatch creates the bounded build route.
3. Satellites and Actuators construct and test the candidate in containment.
4. VERIFY independently assesses the candidate.
5. Conductor reviews the complete evidence and authorizes or declines admission.
6. Dispatch seals the Continuity Capsule.
7. The build process produces the Runtime Artifact and Build Attestation.
8. Arbiter records the new continuity head as the successor to the prior admitted state.
9. Customs admits only the declared release artifacts to the release boundary.

### 6.2 Launch

1. The runtime reads its minimal AEGIS Launch Descriptor.
2. `RUN_SIGNED` validates runtime identity, signature, revocation state, and allowed environment.
3. If aligned, the runtime operates without opening the Continuity Capsule.
4. If out of resonance, the runtime follows the declared fail-closed or bounded-degraded policy and emits evidence.

### 6.3 Reopen in AEGIS

1. The IDE reads the Launch Descriptor and locates the embedded manifest, sidecar capsule, or signed registry reference.
2. Customs receives the proposed capsule crossing manifest.
3. The Tumbler evaluates `REHYDRATE_WITNESS`.
4. Arbiter verifies that capsule, runtime, attestation, predecessor, and environment belong to a legitimate continuity chain.
5. The IDE creates a new isolated workspace; it never edits the deployed runtime.
6. The relational graph and visual IDE state are rehydrated read-only.
7. The Companion Presence Daemon awakens in Witness mode.
8. Writable editing begins only through a separate `ENTER_EDIT` evaluation tied to explicit Intent and Conductor authorization.

### 6.4 Revise

1. A Vibe Architect forms Intent, possibly from a Companion Offering or Annex Recovery Request.
2. Conductor considers purpose, evidence, scope, relations, reversibility, and Negative Space.
3. If authorized, Dispatch creates a Work Request and rotates Ring Three for the route.
4. Dispatch summons the necessary Satellites to coordinate PROBE, SEEK, ASSESS, ARCHITECT, CONSTRUCT, TEST, and VERIFY.
5. Each Satellite summons its own purpose-bound Actuators.
6. Each boundary crossing is checked by Customs and bound to the current Tumbler state.
7. Any out-of-resonance state pauses or terminates the affected route according to policy; it never expands authority.

### 6.5 Verify and admit

1. VERIFY operates from evidence and predeclared acceptance criteria independent of CONSTRUCT.
2. Its determination, test evidence, Shortfall resolution evidence, contract checks, and residual risks return to Conductor.
3. Conductor authorizes admission, requests further bounded work, or declines.
4. Dispatch alone routes an authorized admission.
5. The new capsule, runtime, attestation, rollback anchor, and continuity head are sealed atomically or the admission fails.

### 6.6 Recover continuity

Continuity recovery never fabricates a missing past. When the current head cannot be validated:

1. Tumbler returns `OUT_OF_RESONANCE` or `INDETERMINATE`.
2. Customs quarantines affected artifacts and preserves the attempted crossing.
3. Annex may form a Recovery Request from observed evidence.
4. Conductor may authorize a recovery investigation through Dispatch.
5. PROBE through VERIFY determines the last independently provable state and the nature of the discontinuity.
6. If recovery is justified, a new signed branch references the last provable ancestor, the discontinuity evidence, the recovery decision, and the new candidate.
7. The original chain remains immutable and visible.

---

## 7. State Models

### 7.1 Tumbler evaluation states

```text
UNINITIALIZED
  -> CHALLENGE_ISSUED
  -> EVALUATING
  -> ALIGNED | OUT_OF_RESONANCE | INDETERMINATE | EXPIRED | REVOKED
```

- `ALIGNED` is scoped to one operation, target, relation, subject set, environment, and time window.
- `OUT_OF_RESONANCE` means one or more required dimensions conflict.
- `INDETERMINATE` means required evidence is absent, unavailable, or cannot be reliably interpreted.
- `EXPIRED` means the freshness window ended before use or completion.
- `REVOKED` means a previously valid credential, contract, route, artifact, or policy is no longer recognized.

All non-`ALIGNED` terminal states deny the requested crossing.

### 7.2 Arbiter continuity states

```text
UNEXAMINED
  -> TRACING
  -> CONTINUOUS | DISCONTINUOUS | FORKED | INDETERMINATE
```

- `CONTINUOUS` proves legitimate succession for the declared chain.
- `DISCONTINUOUS` identifies a broken or contradictory predecessor relation.
- `FORKED` identifies multiple valid descendants requiring an explicit branch decision; it does not silently choose one.
- `INDETERMINATE` identifies insufficient proof.

Only `CONTINUOUS`, or an explicitly authorized and independently verified recovery branch, can support a writable editing or admission profile.

---

## 8. Interface Contracts

```ts
type TumblerResult =
  | "ALIGNED"
  | "OUT_OF_RESONANCE"
  | "INDETERMINATE"
  | "EXPIRED"
  | "REVOKED";

interface TumblerChallenge {
  challengeId: string;
  policyId: string;
  policyVersion: string;
  operationProfile: string;
  subjects: ElementRef[];
  relationContractId: string;
  intentId?: string;
  workRequestId?: string;
  dispatchRouteId?: string;
  target: { artifactId: string; artifactHash: string };
  environmentId: string;
  predecessorContinuityId?: string;
  issuedAt: string;
  notBefore: string;
  expiresAt: string;
  nonce: string;
  requiredDimensions: string[];
}

interface DimensionEvidence {
  dimension: string;
  evidenceType: string;
  evidenceRef: string;
  evidenceHash: string;
  observedAt: string;
  signer?: string;
}

interface TumblerEvaluation {
  evaluationId: string;
  challengeId: string;
  result: TumblerResult;
  ringResults: Array<{
    ring: 1 | 2 | 3;
    result: TumblerResult;
    evidenceRefs: string[];
    reasonCodes: string[];
  }>;
  evaluatedAt: string;
  expiresAt: string;
  policyHash: string;
  evidenceRootHash: string;
  signature: string;
}

interface ContinuityClaim {
  continuityId: string;
  applicationId: string;
  releaseId: string;
  runtimeHash: string;
  capsuleHash: string;
  buildAttestationHash: string;
  sourceRevision: string;
  predecessorContinuityId?: string;
  relationContractManifestHash: string;
  toolchainManifestHash: string;
  stateExportRootHash?: string;
  createdAt: string;
}

interface ArbiterDetermination {
  determinationId: string;
  claimId: string;
  state: "CONTINUOUS" | "DISCONTINUOUS" | "FORKED" | "INDETERMINATE";
  lastProvenContinuityId?: string;
  branchIds?: string[];
  evidenceRefs: string[];
  reasonCodes: string[];
  determinedAt: string;
  signature: string;
}

interface DispatchBinding {
  dispatchRouteId: string;
  workRequestId: string;
  conductorAuthorizationId: string;
  allowedCapabilities: string[];
  allowedTargets: string[];
  allowedActuators: string[];
  containmentProfile: string;
  ringThreeEpoch: number;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}
```

Identifiers and signed bodies are immutable. Any semantic change creates a new identifier and predecessor relation.

---

## 9. Failure, Retry, Rotation, and Revocation

### 9.1 Failure behavior

- A failed dimension ends the current evaluation.
- Failure does not reveal secret comparison values.
- The response exposes stable reason codes and safe remediation guidance, not credentials or protected evidence.
- Mutation-capable routes pause or terminate. Ordinary runtime behavior follows its separately declared operational policy.

### 9.2 Retry

- There is no retry within the same challenge.
- A retry creates a new challenge ID, nonce, timestamps, and ledger event.
- Policy may impose bounded attempt rates and cooling periods.
- Repeated failures become observable Shortfall evidence; they do not justify weaker validation.

### 9.3 Timeout

- Expiration during a crossing prevents admission of the crossing.
- Long-running authorized work uses short-lived rotated Dispatch bindings without changing the original Work Request scope.
- A route that cannot refresh Ring Three pauses safely.

### 9.4 Rotation

- Keys, contracts, policies, and Dispatch bindings rotate through explicit successor records.
- Dispatch rotates Ring Three as route state changes and relays the epoch to Customs, Satellite Host, Conductor, and QuarterMaster.
- Rotation never changes an artifact hash or continuity record in place.

### 9.5 Revocation

- Revocation is append-only evidence referencing the revoked object and effective Time.
- A revoked object cannot validate a new operation.
- Previously admitted historical evidence remains readable as history and is marked revoked from the effective Time forward.

### 9.6 Emergency access

There is no universal emergency key. Recovery uses a separately declared, strongly bounded recovery policy with independent evidence, limited capability, containment, complete audit, explicit Conductor authorization, and post-event VERIFY. Recovery cannot erase or reinterpret the discontinuity that necessitated it.

---

## 10. Relation to Existing Connection Standards

The Tumbler Lock extends rather than replaces the CORE Relation Contract model.

- **Umbilical:** Tumbler validation may be required when crossing the CORE boundary; the existing nine-step handshake and Negative Space verification remain intact.
- **Tether:** A Satellite inherits no capability beyond its Host Orb's active contract. A Dispatch binding may further narrow its work.
- **Mesh:** Mesh remains a non-hierarchical shared-service relation. A Tumbler cannot turn Mesh into authority aggregation.
- **Portal:** Cross-CORE or external exchange passes through a declared Portal. The Tender establishes and stewards the relation, manifests the Wormhole, performs the handshake, and docks with the external resource.
- **Courier:** Once a Tender is docked, it summons its own Courier Actuators to perform authorized external actions.
- **Customs return:** Returns from external resources pass through Customs before re-entering the Portal. A separately governed dedicated tunnel may use its declared tunnel contract instead.
- **Dedicated tunnel:** For a dedicated SSH tunnel, the Tender provides the external resource access to a scoped Tumbler Generator so Courier identity and current Dispatch binding can be validated without sharing a universal secret.

The connection lifecycle remains `PROPOSED -> HANDSHAKING -> ACTIVE -> DEGRADED/SUSPENDED -> SEVERED`. Tumbler outcomes inform whether a crossing may occur; they do not silently rewrite a Relation Contract lifecycle state.

---

## 11. Evidence and Administrative Projection

Every evaluation emits an immutable event containing:

- evaluation and challenge identifiers;
- requested operation profile;
- subject and target references;
- Relation Contract, Intent, Work Request, and Dispatch route references where applicable;
- ring and dimension outcomes;
- policy version and hash;
- evidence root hash;
- timestamps, expiry, and Ring Three epoch;
- result and safe reason codes;
- Arbiter determination reference where continuity was evaluated;
- Customs crossing or quarantine record;
- signer and signature.

The Service Admin interface remains observation-only. It may display a sanitized Tumbler/continuity projection, trace it through Time, pause or replay the view, and inspect evidence references. It cannot open the IDE, unlock a capsule, rotate a grant, attach or detach Elements, retry an operation, mutate trust, or authorize work.

Concept-art labels and visual states are presentation aids, not operational authority. The canonical event and contract records remain the source of truth.

---

## 12. Minimum Acceptance Tests

An implementation is not conformant until it proves at least the following:

1. A valid signed runtime launches while its Continuity Capsule remains sealed.
2. A modified runtime fails `RUN_SIGNED` without exposing capsule contents.
3. A valid capsule paired with the wrong runtime returns `OUT_OF_RESONANCE`.
4. Correct hashes with a broken predecessor return `DISCONTINUOUS`.
5. Two valid descendants return `FORKED`; Arbiter does not choose silently.
6. `REHYDRATE_WITNESS` produces a read-only isolated workspace.
7. Companion proactivity produces an Offering but cannot create `ENTER_EDIT` authority.
8. Annex can open a Recovery Request but cannot alter code or continuity records.
9. Tumbler `ALIGNED` without Conductor authorization and Dispatch binding cannot mutate.
10. An expired Ring Three pauses an active mutation route.
11. Dispatch rotation is accepted only by the declared Customs, Host, Conductor, and QuarterMaster relation set.
12. A Satellite or Actuator cannot use capabilities outside its Work Request.
13. CONSTRUCT cannot admit its own candidate.
14. VERIFY cannot mutate or release the candidate.
15. An imported State Export changes no canonical authoring state.
16. Admin receives only the allowlisted sanitized projection.
17. A revoked key, contract, route, or artifact cannot validate a new operation.
18. Recovery creates a new branch from the last provable state and preserves the discontinuity.
19. Release admission atomically binds runtime, capsule, attestation, rollback anchor, and continuity head.
20. Failure, timeout, retry, revocation, quarantine, recovery, and success each leave complete provenance.

---

## 13. Supersession and Open Canon Questions

### 13.1 Superseded implementation assumption

The earlier Implementation Plan description of a **Build Master** that directly writes, tests, validates, and registers Elements is superseded as an authority model.

Its useful pipeline responsibilities are redistributed:

- the **Architectural Companion** actively participates through Offerings;
- the **Vibe Architect** forms or receives Intent;
- the **Conductor** considers and authorizes bounded work;
- **Dispatch** routes the work;
- purpose-bound **Satellites** coordinate phases;
- **Actuators** perform authorized actions;
- **VERIFY** remains independent;
- admission returns to **Conductor through Dispatch**.

### 13.2 Questions awaiting canonical confirmation

This v0.1 intentionally leaves the following as declared questions rather than inventing logic:

1. The canonical names of each underlying multidimensional Tumbler dimension, if they differ from the vocabulary in Section 4.
2. Whether Ring One and Ring Two have fixed canonical membership or are policy-selected groups.
3. The exact QuarterMaster responsibility in distributing, retaining, and retiring Ring Three epochs.
4. The authorized human participation or multi-party recovery pattern for a lost identity key.
5. Whether Arbiter is a Satellite, an instrument hosted by a Satellite, or a separately classified Assurance Element.
6. Whether Customs owns quarantine storage or routes quarantined evidence to an Annex-controlled store.
7. The canonical schema and signing algorithm suite for v1.0.

Until resolved, implementations fail closed on these questions and may prototype only in containment.

---

## 14. Canonical Statement

> **The AEGIS Tumbler Lock establishes multidimensional alignment for a declared crossing, while the Arbiter establishes whether the resulting state belongs to a legitimate continuity chain. Neither creates authority. The Conductor alone authorizes bounded revision, Dispatch alone materializes its route, Satellites coordinate the phases, Actuators perform the actions, Customs governs every crossing, and independently verified evidence returns for accountable admission.**

> **An AEGIS application may be reopened because its editable identity survives compilation; it may be revised because that identity is cryptographically continuous; and it remains sovereign because no validation mechanism possesses the authority to change what it protects.**
