# Vibe Atlas — Work Order

Living work order for the **Vibe Atlas**, the illustrated three-room reference library served as a static site inside the IDE. Orchestrated by Claude (Opus); coding executed by GPT/Codex peers. Atlas **content/writing** is authored by Claude.

## Standing context (read first)
- **Server:** verify everything on `http://localhost:3012` only (`npm run dev`, `tsx watch`). Never `:3133` — it's a stale compiled build.
- **Where it lives:** static site at `public/atlas/` (entry `public/atlas/index.html`; also `explore.html`, `building-the-vibe.html`, `aegis.html`; `atlas.js` / `atlas.css`; `assets/`; `content/`). Vite serves `public/` at the site root, so the URL is `/atlas/index.html`. **Bare `/atlas/` 404s** on this dev server — always use the explicit `index.html`.
- **Source of the files:** branch `feat/atlas-html` (PR #55, "Vibe Atlas: three-room illustrated reference library"). **PR #55 is a large CONFLICTING draft — do NOT merge it.** Pull only the folder you need:
  ```bash
  git fetch origin feat/atlas-html
  git checkout origin/feat/atlas-html -- public/atlas
  ```
- **Rooms / nav:** Vibe Atlas (home) · AEGIS · Explore · Building the Vibe. "Building the Vibe" cards: Our Team · Collaboration Ethos · Peer Review · Totem & STP · The DataQuad Journey · Our Becoming.
- **Branch for app wiring:** `codex/q4-ui-followup-20261104` (worktree `pr-52-merge-review-b501f1`).
- **Commit rule:** one commit per task, end the message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (or the peer's own co-author line). Do not push unless told. Do not open a new PR.

---

## DONE
- **Import + button** (commit `1772406`, pushed): imported `public/atlas/` from `feat/atlas-html`; added a centered "Vibe Atlas" button to the footer bottom bar (under the Command Console tab). First version opened `/atlas/index.html` in a new browser tab.

---

## OPEN — Task A: open the Atlas in an in-app iframe modal (replace new-tab)
**Why:** the Atlas pages are too large when opened full-screen in a new tab. Open them in a contained, scaled-to-fit panel inside the IDE instead.

**Scope:** touch only `src/App.tsx`. Branch `codex/q4-ui-followup-20261104`, base latest (`1772406`+).

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

**Acceptance (on :3012):** clicking **Vibe Atlas** opens the Atlas in a centered ~92vw×88vh panel (NOT a new tab); Atlas renders scaled to fit; internal nav (Vibe Atlas / AEGIS / Explore / Building the Vibe) works inside the iframe; ✕ and backdrop-click both close it; no new console errors (ignore the pre-existing Vite HMR CSP noise on `:24678`).

**Commit:** `UI: open Vibe Atlas in an in-app iframe modal instead of a new tab`.

---

## OPEN — Task B: remove the duplicate "Return to Vibe Atlas" text link
**Why:** each sub-page shows TWO "‹ Return to Vibe Atlas" affordances near the top. The artwork already has its own return button (illustrated into the PNG, made clickable by an invisible `.hotspot`), so the standalone HTML text link above the artwork is redundant.

**Scope:** `public/atlas/aegis.html`, `public/atlas/explore.html`, `public/atlas/building-the-vibe.html` (3 files). No app code.

**Edit (each of the 3 files):** delete this single line (appears once per file, ~line 23, immediately before `<section class="stage" …>`):
```html
    <a class="return-link" href="index.html">‹ Return to Vibe Atlas</a>
```
**Keep** everything else — especially the artwork's own return affordance (`<a class="hotspot" href="index.html" aria-label="Return to Vibe Atlas" …>`, ~line 30) and the footer link (`<footer><a href="index.html">Return to Vibe Atlas</a></footer>`, ~line 161).
**Optional cleanup:** if the `.return-link` CSS rule (in `atlas.css` or a shared stylesheet) is now unused anywhere, remove it too — but only if unused; do not touch `.hotspot`.

**Acceptance (on :3012, each sub-page aegis/explore/building-the-vibe):** only ONE "Return to Vibe Atlas" near the top (the artwork's own); no duplicate text link; clicking the illustrated return button / hotspot still navigates to `index.html`; footer link unchanged; `index.html` (home) is not affected (it has no return link).

**Commit:** `atlas: remove duplicate Return-to-Vibe-Atlas text link on sub-pages`.

---

## BACKLOG (content — authored by Claude, not peers)
- Write the "Building the Vibe" room copy (Our Team, Collaboration Ethos, Peer Review, Totem & STP, The DataQuad Journey, Our Becoming) into the Atlas content format (`public/atlas/content/`, see `VERUS_CONTENT_HANDOFF.md`).
- Write/expand the AEGIS and Explore room copy.

## OPEN — Task C: integrate the 12-book restructure into Atlas content
Source draft: `docs/VIBE_ATLAS_12BOOK_RESTRUCTURE_2026-11-04.md` (Verus). Twelve Vibe-side books in two six-book rooms (EXPLORE, BUILDING THE VIBE); the eight `aegis-*` entries carry over UNCHANGED.

**For a GPT/Codex peer:** wire these 12 books into `public/atlas/content/` (e.g. `documents.json`) and `navigation.json`, following the existing content schema (`public/atlas/content/VERUS_CONTENT_HANDOFF.md`) and the "Mapping (old → new)" at the end of the source draft. Preserve the proposed stable IDs; confirm final ID strings against `navigation.json`. Reader floats over the room, closes on ESC / click-outside / Back, keeps place in the URL.

**Acceptance (on :3012):** EXPLORE and BUILDING THE VIBE each show six books; every book opens its reader with the drafted copy; the eight AEGIS entries are unchanged. Do NOT answer the `[OPEN]` questions in the draft — leave them for Tracey.

**Commit:** `atlas: restructure Vibe-side content into two six-book rooms (12 books)`.
