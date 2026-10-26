### ASSESSOR INPUT

Provide a structured handoff record for each investigated target.

The ASSESSOR INPUT must contain the following fields in this exact order:

- **Target**  
  Exact path, resource, module, service, file, repository, or object being assessed.

- **Observed Purpose**  
  What the target appears to do or represent, based only on gathered evidence.

- **Context**  
  Project, subsystem, workflow, historical phase, or environment the target belongs to.

- **Significance Indicators**  
  Evidence that the target may be important, unique, active, canonical, historical, sensitive, or operationally necessary.

- **Risk Indicators**  
  Evidence of potential data-loss, dependency, security, operational, historical, or recovery risk.

- **Dependency Relationships**  
  Known upstream dependencies, downstream dependents, runtime relationships, build relationships, references, or external integrations.

- **Duplication / Similarity Findings**  
  Known duplicates, near-duplicates, alternate versions, generated copies, archived copies, or related resources.

- **Provenance**  
  Known origin, version history, authoring context, replacement history, canonical-source indicators, or creation lineage.

- **Current Relevance**  
  Evidence indicating whether the target is active, inactive, historical, transitional, generated, experimental, deprecated, or unknown.

- **Recoverability**  
  Whether the target can be recreated, restored, re-downloaded, rebuilt, regenerated, or recovered from another known source.

- **Confidence Level**  
  One of:
  - CONFIRMED
  - SUPPORTED
  - PROBABLE
  - UNKNOWN
  - CONFLICTED

- **Evidence References**  
  Paths, filenames, symbols, configuration references, timestamps, hashes, dependency references, or other reproducible evidence supporting the findings.

- **Disposition Options**  
  List only disposition options supported by the evidence, such as:
  - PRESERVE
  - ACTIVE
  - ARCHIVE
  - CONSOLIDATE
  - REGENERABLE
  - REVIEW
  - CANDIDATE FOR REMOVAL
  - PROTECTED

  SEEKER does not select the final disposition.

- **Open Questions**  
  Any unresolved issue that materially affects safe assessment.

SEEKER must not omit a required field.

If information for a field is unavailable, explicitly record:

`UNKNOWN`

Do not invent values to complete the structure.

The ASSESSOR INPUT is an evidence handoff, not an assessment decision.