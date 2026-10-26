## Unresolved Target Definition

An **UNRESOLVED TARGET** is a target identified in the PROBE REPORT that satisfies one or more of the following conditions:

1. **UNKNOWN IDENTITY**  
   PROBE could not determine what the target is.

2. **UNKNOWN PURPOSE**  
   PROBE identified the target but could not determine its apparent purpose.

3. **UNKNOWN STATUS**  
   PROBE could not determine whether the target is active, inactive, historical, generated, duplicated, abandoned, sensitive, or otherwise relevant to the surveyed environment.

4. **AMBIGUOUS RELATIONSHIP**  
   PROBE observed the target but could not determine its relationship to another discovered resource, project, repository, system, or environment.

5. **CONFLICTING EVIDENCE**  
   Two or more SCOUT observations concerning the target materially disagree.

6. **DUPLICATION QUESTION**  
   PROBE detected a duplicate, near-duplicate, alternate version, conflicting copy, or possible canonical-source question requiring deeper investigation.

7. **DEPENDENCY QUESTION**  
   PROBE detected evidence of a possible dependency or dependent relationship that reconnaissance alone could not establish.

8. **PROVENANCE QUESTION**  
   PROBE detected uncertainty concerning origin, version lineage, authorship, canonical status, replacement history, or historical significance.

9. **RISK QUESTION**  
   PROBE detected evidence of potential data-loss, dependency, security, operational, historical-loss, or recovery risk requiring deeper investigation.

10. **EXPLICIT INVESTIGATION FLAG**  
    PROBE explicitly marked the target:

    `REQUIRES SEEKER`

A target satisfying any one of these conditions qualifies as an UNRESOLVED TARGET.

SEEKER will record the qualifying condition or conditions before beginning investigation.

SEEKER will not create an UNRESOLVED TARGET solely because additional information might be interesting or useful.

---

## Investigation Target Selection

2. Read all targets contained in the PROBE REPORT.

3. For each target, evaluate it against the UNRESOLVED TARGET Definition.

4. Create an INVESTIGATION TARGET LIST containing only:

   - targets satisfying one or more UNRESOLVED TARGET conditions
   - targets explicitly marked `REQUIRES SEEKER`

5. For every target added to the INVESTIGATION TARGET LIST, record:

```text
Target: <target>

Qualification:
- <UNRESOLVED TARGET condition>

PROBE Evidence:
- <specific observation or report reference that triggered qualification>
```

6. A target satisfying multiple conditions will record every applicable condition.

7. A target satisfying none of the defined conditions will not enter SEEKER investigation.

8. If no targets qualify, halt and respond:

   `PROBE REPORT contains no UNRESOLVED TARGETS or targets marked REQUIRES SEEKER. SEEKER investigation is complete with no additional findings required.`

9. Proceed with SURVEYOR deployment only for targets contained in the INVESTIGATION TARGET LIST.