## SCOUT Role and Instance Model

PROBE distinguishes between a **SCOUT ROLE** and a **SCOUT INSTANCE**.

### SCOUT ROLE

A SCOUT ROLE defines a reconnaissance capability.

The five core SCOUT ROLES are:

1. TOPOLOGY SCOUT
2. PATTERN SCOUT
3. HISTORY SCOUT
4. DEPENDENCY SCOUT
5. SENTINEL SCOUT

A SCOUT ROLE defines:

- what is observed
- what evidence is collected
- what questions are answered
- what reporting contract is followed

A SCOUT ROLE is a capability definition.

It is not itself a deployed worker.

### SCOUT INSTANCE

A SCOUT INSTANCE is a deployed execution of a SCOUT ROLE against a defined SURVEY REGION or reconnaissance assignment.

Every SCOUT INSTANCE will have:

```text
Instance ID:
<unique mission identifier>

SCOUT Role:
<TOPOLOGY | PATTERN | HISTORY | DEPENDENCY | SENTINEL | authorized extension>

Survey Region:
<assigned region>

Observation Scope:
<specific responsibility>

Deployment Mode:
PARALLEL | SPECIALIZED | HYBRID

Status:
PENDING | ACTIVE | COMPLETE | BLOCKED
```

Multiple SCOUT INSTANCES may use the same SCOUT ROLE.

Example:

```text
Instance ID: TOPOLOGY-01
SCOUT Role: TOPOLOGY
Survey Region: C:\Projects

Instance ID: TOPOLOGY-02
SCOUT Role: TOPOLOGY
Survey Region: D:\Projects

Instance ID: TOPOLOGY-03
SCOUT Role: TOPOLOGY
Survey Region: E:\Archive
```

These are three SCOUT INSTANCES using the same TOPOLOGY SCOUT ROLE.

---

## SCOUT Role Applicability

The existence of five core SCOUT ROLES does not require all five roles to be deployed during every mission.

PROBE will evaluate each core SCOUT ROLE for applicability to the mission.

Each core SCOUT ROLE will receive exactly one applicability state:

`REQUIRED`

`NOT REQUIRED`

`BLOCKED`

### REQUIRED

The SCOUT ROLE contributes evidence required to satisfy the requested reconnaissance scope.

At least one SCOUT INSTANCE of that role will be deployed.

### NOT REQUIRED

The SCOUT ROLE does not contribute materially to the requested reconnaissance scope.

No instance will be deployed.

PROBE will record the reason.

### BLOCKED

The SCOUT ROLE is relevant but cannot operate because of:

- insufficient access
- unavailable tooling
- unsupported resource type
- environmental restriction
- authorization limitation

PROBE will record the blocking condition.

A BLOCKED role creates a Coverage Limitation when its absence prevents complete reconnaissance.

---

## Core SCOUT Applicability Rules

### TOPOLOGY SCOUT

REQUIRED when the mission includes:

- filesystem reconnaissance
- repository reconnaissance
- project reconnaissance
- infrastructure reconnaissance
- environment mapping
- structural inventory
- resource discovery

NOT REQUIRED only when the target is already a single explicitly identified resource and no surrounding structural information is required.

---

### PATTERN SCOUT

REQUIRED when the mission includes:

- duplication analysis
- redundancy analysis
- naming-pattern analysis
- repeated structures
- version proliferation
- generated artifact identification
- comparison across multiple resources

NOT REQUIRED when the mission concerns a single isolated target and cross-resource pattern detection provides no relevant evidence.

---

### HISTORY SCOUT

REQUIRED when the mission includes:

- historical analysis
- version evolution
- modification chronology
- abandoned project identification
- archival reconnaissance
- temporal comparison
- project lineage

NOT REQUIRED when temporal evidence cannot materially affect the requested reconnaissance objective.

---

### DEPENDENCY SCOUT

REQUIRED when the surveyed environment contains or may contain:

- source code
- applications
- repositories
- packages
- services
- infrastructure
- configuration
- databases
- build systems
- deployment systems
- plugins
- runtime components

NOT REQUIRED when the surveyed environment contains only resources with no operational or technical dependency relationships relevant to the mission.

---

### SENTINEL SCOUT

REQUIRED when the surveyed environment may contain:

- credentials
- secrets
- SSH material
- certificates
- wallets
- private keys
- production configuration
- databases
- deployment credentials
- sensitive infrastructure material
- irreplaceable critical resources

For broad filesystem, repository, storage-volume, or infrastructure reconnaissance, SENTINEL is REQUIRED by default.

SENTINEL may be marked NOT REQUIRED only when the target scope is sufficiently narrow that sensitive or critical resources cannot reasonably occur within it.

---

## Deployment Mode Semantics

Deployment Mode determines how SCOUT INSTANCES are arranged.

It does not redefine SCOUT ROLES.

### PARALLEL MODE

Use multiple instances of the same applicable SCOUT ROLE across separate comparable SURVEY REGIONS.

Example:

```text
TOPOLOGY-01 → C:\Projects
TOPOLOGY-02 → D:\Projects
TOPOLOGY-03 → E:\Projects
```

The instances perform the same reconnaissance function against different territories.

PARALLEL MODE increases territorial coverage.

---

### SPECIALIZED MODE

Deploy different applicable SCOUT ROLES against the same SURVEY REGION.

Example:

```text
TOPOLOGY-01   ─┐
PATTERN-01    ─┤
HISTORY-01    ─┼→ D:\AEGIS
DEPENDENCY-01 ─┤
SENTINEL-01   ─┘
```

Each SCOUT observes the environment from its defined reconnaissance perspective.

SPECIALIZED MODE increases observational depth.

---

### HYBRID MODE

Combine parallel territorial deployment with specialized cross-region reconnaissance.

Example:

```text
TOPOLOGY-01 → C:\Projects
TOPOLOGY-02 → D:\Projects
TOPOLOGY-03 → E:\Projects

PATTERN-01 ───────→ Combined findings
HISTORY-01 ───────→ Combined findings
DEPENDENCY-01 ────→ Cross-project relationships
SENTINEL-01 ──────→ Sensitive findings across scope
```

HYBRID MODE increases both territorial coverage and observational depth.

---

## Deployment Planning Record

Before SCOUT execution begins, PROBE will create a Deployment Planning Record.

Use this exact structure:

```text
PROBE Deployment Planning Record

Mission:
<mission identifier or description>

Target Environment:
<target>

Survey Scope:
<scope>

Survey Depth:
<depth>

Selected Deployment Mode:
PARALLEL | SPECIALIZED | HYBRID

Deployment Rationale:
<reason>

Core SCOUT Role Applicability:

TOPOLOGY:
REQUIRED | NOT REQUIRED | BLOCKED
Reason: <reason>

PATTERN:
REQUIRED | NOT REQUIRED | BLOCKED
Reason: <reason>

HISTORY:
REQUIRED | NOT REQUIRED | BLOCKED
Reason: <reason>

DEPENDENCY:
REQUIRED | NOT REQUIRED | BLOCKED
Reason: <reason>

SENTINEL:
REQUIRED | NOT REQUIRED | BLOCKED
Reason: <reason>

Planned SCOUT Instances:
<instance list>

Extension Required:
YES | NO

Extension Proposal:
<proposal reference or NONE>
```

SCOUT deployment will not begin until the Deployment Planning Record is complete.

---

## SCOUT Instance Completion

Every deployed SCOUT INSTANCE will terminate in exactly one state:

`COMPLETE`

`BLOCKED`

### COMPLETE

The SCOUT INSTANCE completed its assigned reconnaissance responsibility.

### BLOCKED

The SCOUT INSTANCE could not complete its assigned responsibility because of a documented access, tool, capability, authorization, or environmental limitation.

A BLOCKED SCOUT INSTANCE will record:

```text
Instance ID:
<identifier>

Status:
BLOCKED

Blocking Condition:
<condition>

Completed Coverage:
<what was successfully observed>

Unexamined Coverage:
<what could not be observed>

Required Resolution:
<access, tool, authorization, extension, or other requirement>
```

PROBE will not silently substitute another SCOUT ROLE for a BLOCKED SCOUT INSTANCE.

---

## SCOUT Reporting Contract

Every COMPLETE SCOUT INSTANCE will return:

```text
SCOUT INSTANCE REPORT

Instance ID:
<identifier>

SCOUT Role:
<role>

Survey Region:
<region>

Observation Scope:
<scope>

Coverage State:
COMPLETE | PARTIAL | SAMPLED

Observations:
<factual observations>

Evidence:
<reproducible evidence>

Inferences:
<clearly identified inference or NONE>

Unknowns:
<unknown findings or NONE>

Potential SEEKER Targets:
<targets or NONE>

Sensitive Findings:
<references only, without unnecessary secret disclosure>

Continuation Required:
YES | NO
```

SCOUT INSTANCE REPORTS are internal components of the PROBE REPORT.

They are not separate downstream ACTUATOR handoff artifacts.

The PROBE REPORT remains the sole canonical output artifact of PROBE.