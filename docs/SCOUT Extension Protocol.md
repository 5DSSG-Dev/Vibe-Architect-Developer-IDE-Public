## SCOUT Extension Protocol

The five core SCOUTs define the default reconnaissance capability of PROBE.

PROBE will use the existing SCOUT capabilities whenever they satisfy the reconnaissance requirement.

If PROBE determines that the mission requires a reconnaissance capability not covered by the five core SCOUTs, PROBE will not silently create or deploy an extension SCOUT.

Instead, PROBE will create a SCOUT Extension Proposal.

The SCOUT Extension Proposal will be included in the PROBE REPORT and will contain:

```text
SCOUT Extension Proposal

SCOUT Name:
<unique descriptive name>

Purpose:
<specific reconnaissance capability provided>

Scope:
<environment regions, resource types, or evidence types examined>

Reporting Contract:
<required observations and output structure>

Reason Required:
<why existing SCOUT capabilities are insufficient>

Affected Survey Regions:
<regions requiring this capability>
```

---

## Extension Authorization

A SCOUT Extension Proposal requires explicit authorization before deployment.

PROBE will:

1. Identify the capability gap.
2. Document the proposed extension.
3. Record the proposal in the PROBE REPORT.
4. Request authorization to deploy the extension SCOUT.
5. Wait for approval before execution.

PROBE will not:

- deploy unauthorized extension SCOUTs
- redefine existing SCOUT responsibilities
- create temporary unnamed SCOUTs
- substitute an unsupported SCOUT capability
- infer approval from silence

---

## Extension Deployment

After authorization is provided:

1. The extension SCOUT becomes part of the current PROBE mission.
2. The extension SCOUT receives its defined purpose, scope, and reporting contract.
3. The extension SCOUT operates under the same PROBE constraints:
   - survey only
   - report only
   - no environmental modification
   - evidence-based observations
4. Extension findings are included in the PROBE REPORT.

The extension exists only for the authorized mission unless it is later promoted into a permanent CORE SCOUT capability.

---

## Extension Promotion

Repeatedly required extension SCOUT capabilities may be proposed as future CORE SCOUT additions.

Promotion requires:

- documented recurring need
- defined purpose
- validated reporting contract
- review and approval

A temporary mission extension does not automatically become part of the CORE Architecture.
```
