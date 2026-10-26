# AEGIS Totem–Tumbler Crossing Seam Standard v0.1

**Status:** Formulated companion standard
**Scope:** How a passive Totem continuity record binds Tumbler / Arbiter / Customs evidence at a security-domain crossing, without either layer lending the other authority.
**Depends on:**
- Totem Communications Pipeline Standard (development continuity layer; append-only, non-force)
- AEGIS Tumbler Continuity Interface Standard v0.1 (crossing / alignment layer)
**Foundational maxim (inherited, unchanged):** A validated condition is evidence of alignment. It is never authority to mutate. A Totem illuminates; it never executes.

---

## 1. Purpose

The two continuity systems answer different questions and must remain separate components with separate data, failure domains, and authority (Totem Standard §3.2):

- The **Totem pipeline** is the development continuity *communication* layer. It records what was observed, changed, verified, proposed, acknowledged, and left open, and binds each named artifact's SHA-256.
- The **Tumbler / Arbiter / Customs** system is the *crossing and alignment* layer. The Tumbler evaluates multidimensional resonance for a declared crossing; the Arbiter determines whether the resulting state legitimately follows its predecessor; Customs governs the actual crossing of artifacts and evidence between security domains.

This standard defines the single seam where they meet: **when a development event is also a domain crossing, the Totem records that a Customs-governed, Tumbler-validated, Arbiter-continuous crossing occurred, by binding the crossing's immutable evidence — and nothing more.**

It defines a *record binding*, not a new capability. It introduces no new authority, no new gate, and no schema change to either parent standard.

---

## 2. Where the seam applies, and where it does not

### 2.1 Intra-domain continuity does not use the seam

Ordinary in-repo continuity between cooperating writers stays entirely on the Totem pipeline's own integrity model: hash-bound referents verified against present bytes by `verify_totems.py` (`HOLDS` / `RETIRED` / `DRIFT`). Within a single trust domain this correspondence check is sufficient and appropriate. Routing ordinary Totem continuity through the Tumbler would couple the development journal to the authority system and risk the journal becoming something that gates. It will not be done.

### 2.2 Cross-domain transfer uses the seam

The seam applies only where evidence or an artifact crosses a security-domain boundary. Representative crossings:

- a runtime **State Export** returning into the development continuity layer;
- a **release artifact** admitted to a release boundary;
- a **peer→peer handoff** that crosses a trust boundary rather than staying between cooperating in-domain lanes;
- an **external exchange** through a Portal / Tender / Courier and its Customs return.

At each of these, the crossing is performed by Customs under a Tumbler evaluation and an Arbiter determination — exactly as the Tumbler Standard already specifies. The Totem's role is solely to *record* that this happened.

---

## 3. Invariants of the seam

1. **The Totem records; it never performs.** Binding Tumbler evidence into a Totem does not cause, re-authorize, extend, or replay any crossing (Totem Standard §2.7; Tumbler Standard Invariant 2).
2. **Continuity recorded is not permission granted.** A bound Arbiter `CONTINUOUS` determination proves lineage in the record; it authorizes no operation (Tumbler Standard Invariant 3).
3. **No authority flows across the layer boundary.** A `HOLDS` verifier result on a crossing-Totem confers nothing on the runtime or authority layer, and no runtime authority derives from the presence of the record (Totem Standard §3.2).
4. **Freshness is not resurrected.** A Tumbler `ALIGNED` result is scoped and expiring. A Totem records a *past* evaluation and can never widen its freshness window; a later crossing requires a new challenge (Tumbler Standard §7.1, §9.2).
5. **No secret or private witness is bound.** A crossing-Totem binds only sanitized, allowlisted evidence — never credentials, prompts, completions, unrestricted witness state, or comparison secrets (Tumbler Standard Invariants 10, §9.1; Totem Standard §2.10).
6. **Binding is by hash, in-contract.** Tumbler evidence is bound through the Totem's existing hash-bound `files` referent mechanism. No new record field is created on either side.

---

## 4. Binding contract

The Tumbler already emits an immutable evaluation event for every evaluation (Tumbler Standard §11), and the Arbiter and Customs each emit immutable determinations / crossing records. Each is persisted as an artifact with a stable repository-relative (or declared) path and a SHA-256.

A **crossing-Totem** is an ordinary Totem record whose `files` list binds those immutable events alongside the crossed artifact(s):

| Bound referent | Source | What it proves in the record |
| --- | --- | --- |
| Tumbler evaluation event | `TumblerEvaluation` (`evaluationId`, `result`, `policyHash`, `evidenceRootHash`, ring results, `signature`) | Which declared crossing was evaluated, under which policy, with what result. |
| Arbiter determination | `ArbiterDetermination` (`determinationId`, `state`, `lastProvenContinuityId`, `signature`) | Whether the resulting state is `CONTINUOUS`, `FORKED`, or otherwise. |
| Continuity claim | `ContinuityClaim` (`continuityId`, `predecessorContinuityId`, artifact hashes) | The predecessor-linked lineage of the crossed state. |
| Customs crossing / quarantine record | Customs event (§2.3, §11) | That the crossing was admitted, quarantined, or refused, and recorded. |
| Crossed artifact(s) | The State Export, release object, or transferred evidence | The object whose crossing is being recorded. |

Field discipline for the crossing-Totem:

- `summary` — states the crossing, the operation profile evaluated, the result, and the explicit boundary (what the record does **not** claim).
- `files[]` — the referents above, each `{path, sha256, state}` per the Totem contract.
- `trust_state` — `verified` only when the bound evidence verifies as `HOLDS`, the Tumbler result was `ALIGNED`, and the Arbiter determination was `CONTINUOUS` (or an explicitly authorized, independently verified recovery branch). Otherwise `provisional` or `draft`.
- `advances` — affected Orbs and declared state advancement **with no implied authority** (Totem contract, unchanged).
- `next_gated_step` — names the next consent boundary. The Totem does not open it.

Because the binding is by hash, `verify_totems.py` reports `DRIFT` if any bound Tumbler/Arbiter/Customs event or crossed artifact changes after the fact — giving the crossing record the same tamper-evidence as any source referent, with no new tooling.

---

## 5. What a crossing-Totem will not claim

Mirroring the Totem communication-class negative column and the Tumbler invariants, a crossing-Totem will not claim:

- that the crossing may be repeated because the record exists (no re-authorization);
- that a bound `ALIGNED` / `CONTINUOUS` result is still valid now (freshness expires);
- that the development layer has any say over runtime authority (layer separation);
- coverage of any dimension the governing operation profile did not require;
- completion, release, certification, or deployment readiness beyond the evidenced scope (Totem Standard §13).

---

## 6. Open questions (fail closed)

Until resolved, implementations fail closed and may prototype only in containment (consistent with Tumbler Standard §13.2):

1. **Signing suite.** The canonical schema and signature algorithm suite for the Tumbler/Arbiter events is a declared-open v1.0 question (Tumbler §13.2 #7). This seam defines *which* signed events a Totem binds; it does not select the algorithm. Cross-domain secure transfer therefore remains containment-only until the suite is pinned.
2. **Dedicated class vs. reuse.** Whether a crossing warrants a dedicated communication class, or is adequately recorded as an Implementation or Verification record binding the events above, is left open. This standard requires only the binding, not a new class.
3. **Arbiter classification.** Who signs the Arbiter determination a Totem binds depends on whether the Arbiter is a Satellite, a hosted instrument, or a separate Assurance Element (Tumbler §13.2 #5). The binding is stable regardless; the signer identity is not yet canonical.

---

## 7. Canonical statement

> A crossing-Totem is a passive record that binds, by hash, the immutable Tumbler evaluation, Arbiter determination, and Customs crossing that governed a security-domain crossing. It proves that the crossing was aligned, continuous, and admitted — and it proves nothing more. The Tumbler still evaluates, the Arbiter still determines succession, Customs still governs the crossing, the Conductor alone authorizes, and the Totem, as always, only illuminates.
