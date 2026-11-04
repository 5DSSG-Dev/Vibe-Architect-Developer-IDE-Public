# Demo Capture — Mini Scripts (record one scene at a time)
*Each scene is a single short take. Freeze the watched files first (no peer pushing to the branch your :3012 runs). If a take refreshes mid-way, just re-roll that one card. Grounded in the real IDE: the footer **Build & Preview** panel, the guided **New App** conversation, the in-panel **Terminal**, and the **Vibe Atlas** button.*

**Before you roll:** clean screen (no dev console/overlays), app at :3012, window at a fixed size, cursor movements slow and deliberate. Record a beat of stillness at the start and end of every take so cuts have handles.

---

## Scene 1 — The idle Workspace (3–5s)
- **On screen at start:** CORE crystal centered, Luminary present, nothing else moving.
- **Action:** none — just a slow, still hold. Optionally one gentle mouse drift.
- **Capture:** the calm, inhabited space. This is the "you live here" establishing shot.
- **VO/caption:** *"This is Vibe Architect. You don't write code — you have a conversation."*

## Scene 2 — Speak the idea (8–12s)
- **On screen at start:** the New App / planning conversation open, input focused.
- **Action:** type one plain-language idea, unhurried, e.g. **"A simple notes app where I can add a note and see my list."** Press Send.
- **Capture:** the typing, and the Luminary beginning to reply. Stop the take as the reply lands.
- **VO/caption:** *"You describe it in plain words."*

## Scene 3 — Accept the architecture → Elements appear (8–12s)
- **On screen at start:** the Luminary's proposed architecture + the acceptance controls.
- **Action:** read for a beat, then click **Accept** (architecture-only). Watch the Elements dock around the CORE.
- **Capture:** the moment Elements appear/assemble around the CORE — the "it's taking shape" beat.
- **VO/caption:** *"You accept the design — and watch it take shape."*

## Scene 4 — Generate the real app (10–15s)
- **On screen at start:** footer **Build & Preview** panel open (Play icon, bottom bar).
- **Action:** click **Generate application**. Let the status move (`Waiting for the gateway…` → `generated`). Then open **Generated source and ownership** and click through one or two files in the **File** dropdown so real generated code is on screen.
- **Capture:** the status reaching *generated* and real source in the file viewer. This proves it's actual working software, not a mockup.
- **VO/caption:** *"Then it becomes real — working software, not a picture of one."*

## Scene 5 — The honest refusal (the differentiator) (8–12s)
*Pick whichever is easiest to trigger on the day — both are genuine fail-closed behavior:*
- **Option A (review gate, always reproducible, no model):** with a generated app present but the **"I reviewed this generated app…"** box UNchecked, click **Launch reviewed application** (or type `start` in the Terminal). It refuses: *"Review the current source and save its evidence before starting."*
- **Option B (unsupported-scope gate):** on an app whose accepted purpose asks for **search** or **rich text**, open Build & Preview — it declines plainly and offers *"Generate supported text-and-list baseline"* instead of faking the feature.
- **Capture:** the refusal text on screen. Hold on it — this is the whole thesis.
- **VO/caption:** *"And when something isn't really done, it says so. It refuses to fake its own success."*

## Scene 6 — Review, then launch; the app does a real thing (12–18s)
- **On screen at start:** generated app, source reviewed.
- **Action:** check **"I reviewed this generated app against the agreed requirements."** → click **Launch reviewed application**. Wait for the Terminal to show `npm test` / build lines, then the **Application Preview** iframe appears. In the preview, **add a note** and watch it appear in the list.
- **Capture:** the tests/build output scrolling, then the live preview performing one real action (note saved → shows in list).
- **VO/caption:** *"It runs its own tests and builds before it ever says it's ready — then it actually works."*

## Scene 7 — The Terminal (optional, 6–10s)
- **On screen at start:** Build & Preview panel, Terminal visible.
- **Action:** type **`help`** (shows the command list), then **`status`** (shows state + preview URL), then **`files`** (lists the generated files).
- **Capture:** a real governed terminal responding — depth/credibility.
- **VO/caption:** *"Everything it does, it shows."*

## Scene 8 — The Vibe Atlas flourish (5–8s)
- **On screen at start:** bottom bar.
- **Action:** click **Vibe Atlas** (centered in the bottom bar). Let it open; glide across a room (Explore / Building the Vibe / AEGIS).
- **Capture:** the illustrated world opening — "there's a whole philosophy behind this."
- **VO/caption:** *"And beneath all of it, a world — and a way of working built on honesty."*

---

### Pairing to the edit
Scenes 1–4 → the build-live body. Scene 5 → the honest-rejection beat (your scoring moment). Scene 6 → proof it works. Scene 7 → optional depth insert. Scene 8 → the closing flourish before the cinematic end card. The **Llama-conscience** beat is carried by VO + the honest-refusal footage (Scene 5) — only show a governance gauge on screen if it genuinely renders one; don't stage UI that isn't real.

### Capture hygiene
- One scene = one file. Name takes `s1_idle_01`, `s5_refusal_02`, etc.
- Get 2–3 takes of Scenes 4, 5 and 6 (the important ones).
- Leave 1–2s of stillness head and tail on every take.
