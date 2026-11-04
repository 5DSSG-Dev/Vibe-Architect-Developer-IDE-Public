# Vibe Architect — Demo Scope Disposition Record
Date: 2026-11-03
Authority: Architect's explicit directive to formalize recommended dispositions in this review mission.
Applies to: accepted CORE runtime demo candidate; final commit/hash and PR must be supplied by integration receipt.

## Approved demo dispositions
| ID | Disposition | Scope decision | User-facing presentation |
| --- | --- | --- | --- |
| V13 | Deferred | Automatic attachment/wiring of newly authored Apothecary assets is out of demo scope. Explicit guided/manual attachment remains available; ToDo remains open until verified. | "Return to Workspace and attach the Element explicitly; creation does not attach it automatically." |
| V16 | Deferred | Generated edit/delete/search controls and handlers are out of demo scope. Supported generated notes profile is append/view only. | "Edit, delete and search are pending build tasks." |
| V17 | Not Applicable | Demo's isolated private-note scenario has no login, authentication, or multi-user permissions promise. | "No login in this demo; not evidence of generated authentication." |
| V18 | Deferred | Persisting notes/records after reload or gateway restart is out of demo scope. Persisted CORE program and review evidence are distinct and remain in scope. | "Notes are in memory for this demo and reset when the generated app reloads." |
| V07 | Deferred | Exhaustive semantic similarity/reuse accuracy for every catalog candidate excluded from this demo's acceptance claim, not claimed passed. Exact catalog-ID integrity and selected hierarchy validation remain in scope. | "Catalog recommendations require Architect review." |
| V08 | Deferred | Exhaustive semantic requirement-to-gap identification accuracy excluded from this demo's acceptance claim, not claimed passed. Named gaps/ToDo capture and no false implementation claims remain in scope. | "Review the proposed gaps and approve or amend before acceptance." |

## Demo remains in scope
New App isolation; question/decision batching; retry and continuity; accepted proposal/Orb handshake; 3D Workspace navigation and reload; Todo/Apothecary guidance and supported Element creation/editing; application snapshot export/import; governed generation; review/start/stop; generated form/list/hash navigation; keyboard/accessibility and responsive UI; requirements traceability; clean build and regression checks.

## Interpretation
Approved scope deferral does not close an unimplemented feature, validate its behavior, or authorize a hidden change in the Architect's request. If a user requests a deferred capability, list it as a pending build ToDo and do not mark it implemented. No Annex feature is added to the demo. The final subjective walkthrough and independent merge approval remain distinct gates.
