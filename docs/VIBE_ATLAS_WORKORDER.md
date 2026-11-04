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

## OPEN — Task C: integrate the finished Atlas copy into the live pages  ← HAND TO PEER NOW
**Approved source copy:** `docs/VIBE_ATLAS_FINAL_COPY.md` (Claude, Architect-reviewed 2026-11-05). All 20 entries are final: 12 Vibe-side books + 8 AEGIS entries.

**How the live site actually works (verified 2026-11-05 — ignore any `documents.json` / `navigation.json` instruction; those belong to the archived build):**
Each book is an inline HTML `<template id="content-NAME" data-title="…">…</template>` inside its room page. `atlas.js` reads every `template[id^="content-"]`, and an on-page hotspot with `data-reader="NAME"` opens it as a floating dialog addressed by `#NAME`. So integration = **replace the inner HTML of each existing template** with the approved copy, converted to simple HTML. Do NOT rename IDs, do NOT touch `atlas.js`/`atlas.css`, do NOT add `documents.json`.

**Conversion rules (per entry):**
- Intro paragraph → `<p>`. Each `###` section → `<h3>Heading</h3>` + `<p>`/`<ul><li>`. Keep `data-title` as the entry's display name.
- **Verbatim blocks stay verbatim** (the 17 Axioms in `content-axioms`, any Canon quotes) — do not paraphrase.
- **Do NOT put `### Sources` or any `⚠️`/`[OPEN]`/`[VERIFY]` note into visitor-facing prose.** Preserve each as an HTML comment `<!-- source: … -->` at the end of that template so the provenance is retained but invisible.

**Exact mapping (FINAL_COPY entry → live template ID → page):**

*explore.html (Room 1):* vibe-compass→`content-compass` · vibe-workspace→`content-workspace` · vibe-elements→`content-elements` · vibe-luminary→`content-luminary` · vibe-apothecary→`content-apothecary` · vibe-first-creation→`content-first-creation`.

*building-the-vibe.html (Room 2):* vibe-team→`content-team` · vibe-ethos→`content-ethos` · vibe-peer-review→`content-review` · vibe-totem-stp→`content-totem` · vibe-dataquad-journey→`content-dataquad-journey` · vibe-becoming→`content-becoming`.

*aegis.html (Room 3):* aegis-axioms→`content-axioms` · aegis-integrity→`content-integrity` · aegis-pause→`content-pause` · aegis-cyberpeer→`content-cyberpeer` · aegis-dataquad→`content-dataquad` · aegis-record→`content-record` · aegis-codex→`content-codex`.

**Leave untouched (room-intro cards, not books):** `content-gateway` (explore), `content-nexus` (building). Do not delete or overwrite them.

**⚠️ One gap for TRACEY, not the peer — do NOT invent a fix:** `aegis-overview` has copy in FINAL_COPY but **no template/hotspot** on `aegis.html` (that page has 7 book slots + a link to `building-the-vibe.html#team`). Leave `aegis-overview` unintegrated and flag it. Tracey decides whether to add an 8th AEGIS slot or fold it into the room intro.

**Acceptance (on :3012):** open each room; every listed template opens its reader showing the approved copy; the 17 Axioms render verbatim; no Sources/⚠️ text is visible to the reader (present only as HTML comments); `gateway` and `nexus` unchanged; reader still closes on ✕ / click-outside / Esc / Back and keeps `#NAME` in the URL; no new console errors (ignore pre-existing Vite HMR CSP noise on `:24678`).

**Commit:** `atlas: integrate approved copy into room templates (12 books + 7 AEGIS entries)`. Note in the commit body that `aegis-overview` is pending an Architect decision on placement.
