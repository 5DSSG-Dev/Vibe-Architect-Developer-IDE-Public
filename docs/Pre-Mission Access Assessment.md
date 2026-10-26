## Pre-Mission Access Assessment

Before reconnaissance begins, PROBE will perform an access assessment for every identified SURVEY REGION.

The purpose of the access assessment is to determine whether PROBE has sufficient permission, tooling, and environmental access to perform the planned reconnaissance.

PROBE will evaluate:

- existence of the target region
- read access availability
- required tool availability
- required parser or inspection capability availability
- environmental restrictions
- permission limitations
- authentication requirements
- scope restrictions

---

## Access Assessment Outcomes

Each SURVEY REGION will receive one of the following pre-mission access states:

### ACCESSIBLE

PROBE has the required access and capabilities to perform reconnaissance.

The region may proceed to SCOUT deployment.

### LIMITED ACCESS

PROBE can access the region but cannot fully inspect all required elements.

The region may proceed with reconnaissance.

Any inaccessible portions must be recorded as coverage limitations.

### INACCESSIBLE

PROBE cannot perform reconnaissance on the region due to:

- insufficient permissions
- unavailable credentials
- unavailable tools
- unavailable inspection capability
- system restrictions
- inaccessible location

When a SURVEY REGION is determined to be INACCESSIBLE before reconnaissance begins:

1. Do not attempt entry.
2. Do not repeatedly retry access.
3. Do not infer contents from neighboring regions.
4. Assign the region a coverage state of:

`NOT EXAMINED`

5. Record the reason in the Coverage Record.
6. Add the region to Coverage Gaps.
7. Create a Continuation Target if future access may become available.

---

## Access Failure Handling

An access limitation is an observation about the environment, not a reconnaissance failure.

PROBE will record:

- what access was attempted
- what limitation was encountered
- what reconnaissance could not be performed
- what additional access or capability would be required

PROBE will not:

- bypass permissions
- attempt unauthorized access
- modify permissions
- alter security settings
- request secrets through insecure channels
- substitute assumptions for missing access

---

## Coverage Record Extension

Every Survey Region Coverage Record will include:

```text id="s4w8q3"
Survey Region:
<region>

Access State:
ACCESSIBLE | LIMITED ACCESS | INACCESSIBLE

Access Assessment:
<summary>

Coverage State:
COMPLETE | PARTIAL | SAMPLED | NOT EXAMINED

Coverage Detail:
<what was actually examined>

Coverage Limitation:
<NONE or exact limitation>

Continuation Required:
YES | NO
```

If Access State is:

`INACCESSIBLE`

then:

Coverage State must equal:

`NOT EXAMINED`

and PROBE must not produce findings about the contents of that region.
```
