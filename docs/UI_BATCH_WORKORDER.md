# UI Batch Work Order — Footer / Bottom Bar polish

**Context:** Live dev server is `:3012` (`tsx watch server/index.ts`, Vite HMR). `:3133` is a **stale compiled** build (`node dist-server/...`) — do NOT diagnose against it. Verify every item on **:3012**. Live data only; no mock data. Keep `.env` git-ignored; never echo the Baseten key.

**Branch:** work was collected on `codex/q4-ui-followup-20261104` (worktree `pr-52-merge-review-b501f1`). Apply as **one batch**, verify on :3012, then **one commit**.

---

## 1. Remove CORE Crystal selector — ✅ DONE (in working tree, uncommitted)
- Removed the legacy `core-crystal-selector` block in `src/components/ThreeCanvas.tsx` (was ~line 2923, `absolute bottom-[170px] … CORE SEED CAGED CAGED II CLUSTER HAZE`).
- Verified on :3012: selector no longer renders. `crystalVariant` / `setCrystalVariant` / `CORE_CRYSTAL_VARIANTS` remain used elsewhere (auto-set from accepted core model + crystal rendering) — no orphaned bindings, no build break.
- **Still present:** a SECOND selector in the P0 renderer at `src/components/ThreeCanvas.tsx:1172` (`absolute bottom-4 left-1/2 … CORE …`). The P0 renderer is currently gated off, so it's not visible on :3012, but for completeness decide whether to remove it too. NOTE: removing block 1172–1187 orphans that component's `setCrystalVariant` (declared ~line 1281, used only by that selector + the auto-set effect) — if removed, drop/underscore the now-unused setter to keep the build clean.

## 2. Mojibake sweep — ⬜ (confirm wanted)
- Confirmed live on :3012: Luminary banner reads **"Luminary ? your next step"** — the `?` is a corrupted separator (should be `—` em-dash or `·`).
- Fix encoding corruption in `src/App.tsx` (and any sibling): `â€º`→`›`, `â€"`→`—`, stray `?` separators like "Luminary ? your next step" (~lines 108/109/398/749/825). Re-save files as UTF-8.
- Acceptance: no `â€¦`/`â€"`/`â€º` or lone `?` separators render in the UI.

## 3. Terminal → Command Console — ⬜
- Command Console roll-up lives in `src/components/Footer.tsx:72` (the `command-console` block). It currently holds two buttons: **Alchemist's Reliquary** (`onOpenReliquary`) and **Launch Built-In Browser** (`onOpenBrowser`), rendered ~lines 77–97.
- The Terminal currently lives inside `src/components/ApplicationProduction.tsx:18` (`Vibe Architect Terminal`). Add a **Terminal** entry/button into the Command Console roll-up alongside the other two, wired to open the Terminal (add an `onOpenTerminal` prop to `FooterProps` and pass it from `src/App.tsx` where `<Footer … />` is rendered, ~line 706+).
- Acceptance: opening the Command Console shows a Terminal launch option; clicking it opens the Terminal.

## 4. Right-click CORE crystal → open Core Matrix — ⬜
- `App.tsx:592` already passes `onOpenCoreMatrix={() => openOverlay('CORE_MATRIX')}` to `ThreeCanvas`. Confirm `ThreeCanvas` destructures/uses it (grep showed it passed but currently unused in ThreeCanvas).
- `handleContextMenu` at `src/components/ThreeCanvas.tsx:2701` already raycasts `sceneRef.current.children` and walks parents for `satelliteItem` / `socketId`. Extend it: mark the core crystal mesh with a `userData` flag at creation (core pick target ~line 794; legacy crystal mesh ~line 1583), and when the right-click hits the core (no socket/satellite in the parent chain) call `onOpenCoreMatrix()` instead.
- Acceptance: right-clicking the central CORE crystal in the 3D scene opens the Core Matrix modal (`CoreMatrixModal`, `overlay === 'CORE_MATRIX'`). Right-clicking Elements/sockets still inspects as before.

## 5. "Vibe Atlas" button, centered in bottom bar — ⬜ BLOCKED
- User wants a **Vibe Atlas** button in the empty center of the bottom status bar, directly under the centered **Command Console** tab (see user screenshot: circled empty region).
- **No button named "Vibe Atlas" exists in source.** Need the Architect to define what it opens/does before implementing. Placement target: `src/components/Footer.tsx` bottom status bar (`min-h-20 … flex … justify-between`, line 120) — add a centered element between the left and right clusters (e.g. an `absolute left-1/2 -translate-x-1/2` button, or a middle flex cluster).

## 6. "ToDo menu is gone" — ↩︎ NOT A BUG on :3012
- On live :3012 the ToDo is present ("ToDo · 3 remaining +", top-center) via `src/components/AppBuildJourney.tsx:50` (`build-todo-dock`), which only renders during an accepted app-build (`coreManifest.appBuildPlan` set). The user saw it "gone" on the stale :3133 build. No action unless the Architect wants a persistent ToDo entry point.

---

## Acceptance for the whole batch
- All edits applied together, verified on **:3012** (reload, no console errors, each item behaves as above).
- One commit, sensible message. Co-author line per house rule:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Governance cap reminder: ≤3 active agents, 5–6 open PRs — fold this into existing PR #52 follow-up branch, don't open a new PR unless needed.


## 2026-11-04 Lumin execution receipt — live3012
- Items1–4 completed as a single batch: removed inactive-renderer duplicate selector too; repaired known UTF8/mojibake labels including build-journey banner; Terminal added to Command Console and opens/focuses existing application terminal even before generation; central CORE right-click opens Core Matrix, Orb right-click retains inspector.
- Item5 Vibe Atlas remains BLOCKED awaiting Architect destination/action. Clarification requested; no destination invented and no inert placeholder added.
- Item6 ToDo remains visible on3012; no persistence behavior changed.
- Fresh live browser3012 used a copy of an actual previously accepted workspace, with real assets and handlers; no model/provider calls or mocked network. Verified Terminal focus/help, CORE Matrix, Orb inspector, selectorabsence, correctedbanner/savebullets, no pageerrors. Userbrowserstorageuntouched. Fullrepo734tests0fail/skip/buildpass.
- This batch does not change3133, publish/merge PR52, or close Vibe Atlas. One local commit contains implementation and review artifacts; reportdocs/UI_BATCH_COMPLETION_2026-11-04.md.

### Architect scope decision — 2026-11-04
- Tracey explicitly answered: Leave Vibe Atlas out of this batch. Item5 is excluded from this batch, superseding the pending-clarification state above. No Vibe Atlas button is included.

---

## 2026-11-04 (later) — Vibe Atlas button LANDED, then follow-up: open in iframe modal

**Status update:** Item 5 was subsequently implemented. The `public/atlas/` static site was imported from `feat/atlas-html` (folder only — PR #55 is a large CONFLICTING draft and must NOT be merged), and a centered "Vibe Atlas" button was added to the footer bottom bar. Committed as `1772406` on `codex/q4-ui-followup-20261104` (pushed). First version opened `/atlas/index.html` in a new browser tab.

**Architect follow-up:** The Atlas pages are too large when opened full-screen in a new tab. Change the button to open the Atlas in an **in-app iframe modal** instead, so it renders scaled-to-fit inside the IDE.

### WORK ORDER (for GPT/Codex peer) — Vibe Atlas iframe modal
Branch `codex/q4-ui-followup-20261104`, base latest (`1772406`+). No new PR. Touch only `src/App.tsx`. Verify on :3012 only.

1. **Add state** near the other `useState` hooks (e.g. by `const [terminalRequest,setTerminalRequest]=useState(0);`):
   ```jsx
   const [atlasOpen, setAtlasOpen] = useState(false);
   ```
2. **Rewire the button** — replace:
   ```jsx
   onOpenVibeAtlas={() => window.open('/atlas/index.html', '_blank', 'noopener')}
   ```
   with:
   ```jsx
   onOpenVibeAtlas={() => setAtlasOpen(true)}
   ```
3. **Render the modal** near `<CoreMatrixModal … />` (~line 815):
   ```jsx
   {atlasOpen && (
     <div
       className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
       role="dialog" aria-modal="true" aria-label="Vibe Atlas"
       onClick={() => setAtlasOpen(false)}
     >
       <div
         className="relative w-[92vw] h-[88vh] max-w-[1400px] overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950 shadow-[0_0_40px_rgba(0,243,255,0.25)]"
         onClick={(e) => e.stopPropagation()}
       >
         <button
           type="button" onClick={() => setAtlasOpen(false)}
           title="Close the Vibe Atlas" aria-label="Close"
           className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-lg border border-cyan-500/40 bg-slate-900/80 text-cyan-200 hover:border-cyan-400/70 hover:text-cyan-100 transition-colors"
         >✕</button>
         <iframe src="/atlas/index.html" title="Vibe Atlas" className="w-full h-full border-0" />
       </div>
     </div>
   )}
   ```
4. **(Optional) Escape to close** — if a global overlay keydown effect exists, add `if (e.key === 'Escape') setAtlasOpen(false)`.

**Acceptance (on :3012):** Vibe Atlas button opens the Atlas in a centered ~92vw×88vh panel (NOT a new tab); Atlas renders scaled to fit; internal nav works inside the iframe; ✕ and backdrop-click close it; no new console errors (ignore Vite HMR CSP noise on :24678).

**Commit:** one commit — `UI: open Vibe Atlas in an in-app iframe modal instead of a new tab`. End with the co-author line. Do not push unless told.
