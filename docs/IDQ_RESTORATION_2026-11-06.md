# Current IDE Conscience IDQ restoration — November 6, 2026

Tracey identified that the current IDE candidate still used IDS despite the earlier accepted IDQ migration. The preserved governance commit `ff2228b` is not an ancestor of the current candidate's starting revision `495cb4ead5e8f0c7b6930260b8b1fa23bfa8a819`. The current mounted path therefore required a substantive repair.

## Restored contract

The active inbound Architect gate, outbound reply pipeline, local Conscience writer, call tags, response types, client rendering, and visualization now use **Identify, Define, Question**. The writer requests open questions rather than suggestions. Payload validation rejects the old Suggest shape and statements masquerading as questions. Define is assembled from the actual recorded PIM findings or IRG readings, following the preserved IDQ approach; model-generated diagnoses or calibration explanations cannot substitute for recorded conditions.

The current bounded retries, command-posture screen, timeout behavior, withholding, append-only review records, revision limits, generation recovery, and UI improvements are retained. No gauge thresholds, assembly-auditor gate, provider credentials, or accepted app requirements changed. Historical review evidence is untouched; the client displays old Suggest records explicitly as historical rather than silently calling them IDQ.

## Evidence and scope

- Pure contract checks first failed against IDS, then passed after repair. Current checks cover the question schema, recorded Define, sender reform prompt, client rendering, historical-record preservation and projection contracts.
- Production build passed. Atlas integrity policy revision 3 passes over 37 protected files.
- Real `llama3.2:3b` inference exercised inbound and outbound PIM-held messages. Both returned checked questions through `idq`; the inbound PIM hold skipped IRG; the outbound negative control remained withheld as `incoherent_after_idq`. These are real local-model checks, not a fresh Meta generation or a complete product-acceptance run.
- Private evidence: `C:/AEGIS_IDE_AUDIT/lumin-idq-restoration-20261106/`. Original source bytes and earlier live result are preserved there, alongside final `live-idq.json` and build logs.

## Remaining acceptance boundary

This correction restores the active IDQ behavior. It does **not** establish that the separately preserved numeric Marker/PTAG/private-governance route is mounted in the current runtime. That missing integration remains an explicit governance finding. The earlier successful Meta/Qwen app journey was on the legacy path and cannot certify the locked full governance architecture. A fresh current-candidate journey and Aster's independent review remain required. Publication stays held; no complete-app or full-governance acceptance is claimed.
