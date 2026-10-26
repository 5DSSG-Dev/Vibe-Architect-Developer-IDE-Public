## SURVEYOR Deployment Contract

SEEKER determines SURVEYOR deployment using the rules below.

SURVEYOR applicability is determined by the target's observed characteristics and evidence. Do not deploy or omit a SURVEYOR based solely on subjective judgment.

### Mandatory SURVEYORS

The following SURVEYORS are deployed for every investigated target.

#### CONTEXT SURVEYOR — ALWAYS DEPLOY

Deploy for every target.

Determines:

- what the target is
- its apparent purpose
- the project or system it belongs to
- its current role
- its surrounding operational or historical context

No target may bypass CONTEXT SURVEYOR.

#### RELATIONSHIP SURVEYOR — ALWAYS DEPLOY

Deploy for every target.

Determines:

- resources associated with the target
- references to and from the target
- membership in larger functional groups
- canonical or derived relationships
- relationships identified during PROBE reconnaissance

A relationship may be organizational, semantic, historical, structural, or technical.

No target may bypass RELATIONSHIP SURVEYOR.

---

### Conditional SURVEYORS

Conditional SURVEYORS are deployed only when the applicability conditions below are satisfied.

SEEKER must record whether each conditional SURVEYOR was:

`DEPLOYED`

or

`NOT APPLICABLE`

When marked `NOT APPLICABLE`, SEEKER must identify the rule that caused the exclusion.

---

### SEMANTIC SURVEYOR

Deploy when understanding the target's content or meaning contributes materially to determining its purpose, significance, relationships, or differentiation from similar targets.

DEPLOY for:

- prose documents
- Markdown
- source code
- scripts
- configuration files
- structured data containing meaningful content
- documentation
- specifications
- prompts
- schemas
- notebooks
- UI definitions
- named visual or 3D assets whose identity or function cannot be established from metadata alone
- collections containing potentially related conceptual material
- targets with ambiguous names
- targets involved in similarity or near-duplication findings

DO NOT DEPLOY when:

- the target contains no meaningful content requiring interpretation
- identity and purpose are completely established by metadata and structural evidence
- the target is a binary/generated artifact whose internal semantic analysis provides no useful information

Examples:

`AEGIS_ARCHITECTURE.md`
→ DEPLOY

`server.ts`
→ DEPLOY

`config.json`
→ DEPLOY

`pod-core-v3.glb`
→ DEPLOY when its role or relationship to other assets requires interpretation.

`node_modules/.cache/generated.bin`
→ NOT APPLICABLE when confirmed to be regenerable cache data.

---

### DEPENDENCY SURVEYOR

Deploy when the target may participate in a technical, runtime, build, configuration, infrastructure, package, or execution dependency.

DEPLOY for:

- source code
- scripts
- packages
- modules
- libraries
- configuration
- build artifacts when their origin or consumers matter
- executables
- services
- databases
- infrastructure definitions
- deployment resources
- containers
- virtual machines
- package manifests
- repositories
- applications
- plugins
- extensions
- API integrations

ALSO DEPLOY when another SURVEYOR discovers evidence that the target is referenced by or required by another operational resource.

DO NOT DEPLOY for:

- standalone prose documents
- ordinary images
- standalone video or audio
- historical records
- archival material

unless evidence indicates that another system operationally depends upon them.

Example:

`package.json`
→ DEPLOY

`server.ts`
→ DEPLOY

`Dockerfile`
→ DEPLOY

`AEGIS_HISTORY.md`
→ NOT APPLICABLE unless another process consumes it.

---

### PROVENANCE SURVEYOR

Deploy whenever origin, authority, uniqueness, version lineage, or historical relationship could affect assessment.

DEPLOY when any of the following exists:

- duplicate findings
- near-duplicate findings
- multiple versions
- filenames containing version indicators
- filenames containing terms such as:
  - old
  - backup
  - copy
  - final
  - archive
  - original
  - revised
  - previous
  - legacy
- ambiguous origin
- uncertain authorship
- uncertain canonical status
- conflicting copies
- migration history
- historical significance
- replacement indicators
- resources existing in multiple project locations
- resources that may be irreplaceable
- resources whose creation lineage affects their significance

ALSO DEPLOY when CONTEXT, RELATIONSHIP, or SEMANTIC SURVEYOR cannot confidently identify which instance is authoritative.

DO NOT DEPLOY when:

- origin is established
- canonical status is established
- no meaningful version or duplication question exists
- historical lineage cannot materially affect assessment

Example:

`AEGIS-Core-FINAL-v2.md`
→ DEPLOY

`AEGIS-Core-FINAL-v2-copy.md`
→ DEPLOY

Two visually similar POD assets in separate project directories
→ DEPLOY

A current generated build artifact with confirmed source and reproducible build process
→ NOT APPLICABLE

---

## Escalation Rule

Conditional SURVEYOR deployment is dynamic.

A SURVEYOR that begins as `NOT APPLICABLE` must be deployed if evidence discovered during investigation satisfies its applicability conditions.

Example:

A standalone image initially requires:

CONTEXT  
RELATIONSHIP  
SEMANTIC

During RELATIONSHIP analysis, the image is discovered to be loaded directly by an active application.

DEPENDENCY SURVEYOR then becomes applicable and must be deployed.

---

## Deployment Record

Every SEEKER target must contain a SURVEYOR Deployment Record:

Target: `<target>`

CONTEXT SURVEYOR: `DEPLOYED`

RELATIONSHIP SURVEYOR: `DEPLOYED`

SEMANTIC SURVEYOR: `DEPLOYED | NOT APPLICABLE`

Reason: `<applicability rule or evidence>`

DEPENDENCY SURVEYOR: `DEPLOYED | NOT APPLICABLE`

Reason: `<applicability rule or evidence>`

PROVENANCE SURVEYOR: `DEPLOYED | NOT APPLICABLE`

Reason: `<applicability rule or evidence>`

This Deployment Record becomes part of the SEEKER DOSSIER and accompanies the target into ASSESSOR INPUT.

SEEKER must not silently omit a SURVEYOR.