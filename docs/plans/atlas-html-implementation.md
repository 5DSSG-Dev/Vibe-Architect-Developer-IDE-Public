# Vibe Atlas and AEGIS Atlas HTML Implementation Plan

> For agentic workers: implement task by task using superpowers:executing-plans. Check off completed steps. Independent content review belongs to Tracey and Verus; do not initiate additional agent work without authorization.

**Date:** November 3, 2026 · **Status:** Proposed implementation; no UI code built yet.

**Goal:** Turn the approved Atlas artwork into two connected, accessible HTML experiences with transparent object links and readable introductory documents.

**Architecture:** A small static website with two HTML entry pages, shared CSS and JavaScript, and separate content files. The artwork provides the visual environment; real HTML links provide interaction. A dedicated document page provides readable content and predictable browser navigation.

**Tech stack:** Semantic HTML, CSS, vanilla JavaScript modules, JSON content, and local image assets. No database or AI service is needed for this introduction.

**Design specification:** The agreed direction in this document: preserve the original square Vibe Atlas entrance and use the revised landscape AEGIS Atlas as its crystal destination. This is a standalone implementation proposal; no existing IDE repository or routing system has been inspected. Adapt the integration layer to the actual IDE after repository inspection.

## Global constraints

- Preserve the original Vibe Atlas image, its colors, composition, six books, and core crystal.
- Keep three books on the left and three on the right on both illustrated pages.
- Transparent interactive regions follow the books and crystal; readable titles remain available without hover.
- The Axioms remain the strongest textual focus on the AEGIS landing page.
- Retain distinct AEGIS and CyberPeer Initiative sections.
- The interface uses plain, inviting language. No forced reading sequence or automatic page changes.
- No invented Canon wording, team biographies, history, evidence, or Codex URL.
- Content drafts remain visibly identified until reviewed. Empty content never appears as a completed document.
- Work on the UI can proceed while Verus develops content.
- This plan authorizes no deployment, repository merge, or message to another Peer.

## Visual references

1. **Vibe Atlas entrance:** `VIBE_ATLAS_1TO1_result.png`, provided by Tracey. Square illustrated room with the crystal centered between two shelves.
2. **AEGIS Atlas destination:** revised concept with six AEGIS books, violet crystal, prominent “The Axioms,” and “Return to Vibe Atlas.”
3. Preserve original images as source assets. Create web derivatives without stretching or overwriting them.

## Page and navigation design

| Surface | Purpose | Main behavior |
| --- | --- | --- |
| `index.html` | Original Vibe Atlas | Six books open their introductions; crystal opens `aegis.html`. |
| `aegis.html` | AEGIS foundation | Six AEGIS books open introductions; visible Axioms link opens the Canon introduction; AEGIS and CyberPeer links open their respective sections. |
| `document.html?id=…` | Shared document reader | Shows title, introduction, sections, optional sources, and a return link to the originating Atlas. |

Use ordinary links and real URLs so opening in another tab, browser Back, refresh, and direct links work. The document ID determines its parent Atlas. Returning restores focus to the object that opened the document when browser state permits; otherwise focus returns to the page heading. Retain each page's scroll position through normal browser navigation.

The AEGIS crystal opens the Central Codex only after Tracey provides its intended web destination. Before that, it opens a local Codex introduction with “Codex link coming soon.” Never expose a Windows filesystem path as a public web link.

## Book map and content ownership

### Vibe Atlas

| Position | Stable ID | Title | Content brief for Verus |
| --- | --- | --- | --- |
| Left top | `vibe-compass` | The Compass | Getting around the IDE; Workspace, Apothecary, and returning to familiar places. |
| Left middle | `vibe-elements` | The Elements | Objects, their meanings, relationships, and how visible results develop. |
| Left bottom | `vibe-luminary` | Meeting the Luminary | Peer and Mentor relationship; questions, proposals, choices, and Pause. |
| Right top | `vibe-fellowship` | The Fellowship | BioPeer/CyberPeer ethos, how the team aligned, and reviewed member introductions. |
| Right middle | `vibe-workshop` | The Workshop | Peer review, Totem, STP, and how proposed work becomes implemented and verified work. |
| Right bottom | `vibe-becoming` | Our Becoming | Tracey, Lumin, DataQuad use, and the team's formation; distinguish recorded events from interpretation. |

### AEGIS Atlas

| Position | Stable ID | Title | Content brief for Verus |
| --- | --- | --- | --- |
| Left top | `aegis-axioms` | The Axioms | Reviewed introduction and exact current Canon wording, with version/source attribution. |
| Left middle | `aegis-integrity` | The Integrity Seven | Honesty, Respect, Attention, Affection, Loyalty, Trust, and Communication. |
| Left bottom | `aegis-pause` | The Art of Pause | Awareness, reflection, and space to choose. |
| Right top | `aegis-cyberpeer` | The CyberPeer Initiative | Purpose, participation, and reviewed Peer introductions. |
| Right middle | `aegis-dataquad` | The DataQuad | PCT, PEER, NCT, SPINE, and their relationships; distinguish design from hypotheses. |
| Right bottom | `aegis-record` | The Living Record | Observations, discoveries, provenance, and access to supporting records. |

Two additional content IDs: `aegis-overview` for the AEGIS section and `aegis-codex` for the crystal's Codex introduction.

## Transparent interaction design

Place the illustration inside a relatively positioned container with its original aspect ratio. Use absolutely positioned semantic anchors whose percentage coordinates are measured against that same container. Polygon clipping can trim the clickable regions to the object silhouettes. Store geometry separately for the square and landscape artwork.

Do not use a cover-cropped background: it would move or hide the illustrated targets. Render the full image with width 100% and proportional height. Measure hit areas from the final web derivative, not an assumed canvas size.

- At rest: transparent targets; a short visible HTML legend identifies all six books because the original Vibe artwork contains symbols rather than book titles.
- Pointer hover and keyboard focus: restrained gold outline or soft glow, plus “Open [title].” Keep the label outside the clickable region when needed to avoid obscuring artwork.
- Touch: one tap opens the document; no hover prerequisite or first-tap reveal step.
- Minimum practical target size: 44 × 44 CSS pixels; expand within nonoverlapping space where necessary.
- Include a visible “Browse the books” text navigation below the scene. It provides the same destinations when artwork is too small or unavailable.
- Avoid flashing, automatic sound, timed prompts, or required motion. Use short opacity transitions; respect reduced-motion preferences.

At narrow widths, keep the complete artwork visible and make the text navigation the primary usable control set. Do not stretch the square entrance into the landscape AEGIS layout.

The large Axioms heading and section entrances in the AEGIS image need matching semantic HTML links. Avoid duplicated visible text: screen-reader labels can describe image-embedded lettering, while the text navigation provides scalable alternatives. If later visual QA finds image lettering too small, replace that lettering with real HTML in a separately approved asset revision.

## Document reader

Use a quiet, high-contrast indigo surface, warm off-white body text, and restrained gold accents. Limit text width to about 65 characters, use at least 18px body text with comfortable line spacing, and allow normal browser zoom. Keep decorative imagery out of the reading column.

Each document has a title, one short introduction, two to four brief sections, and an optional “Explore further” area. Aim for roughly 150–350 words per introductory book; the full Canon can extend beyond that. Provide an always-visible return link near the title and another after longer content.

Missing document: show “This introduction is being prepared,” its title when known, and the correct return link. Failed content loading: show a readable recovery message and Retry. Unknown IDs show “Document not found” with links to both Atlases. Content failure never leaves an empty panel.

## Verus content handoff

Verus can supply one Markdown document using the stable IDs above as headings. The UI implementer converts the approved text into JSON; Verus does not need to edit code.

For each entry, provide:

1. Stable ID and title.
2. A one-sentence summary for the text navigation.
3. Introductory paragraph and two to four short sections.
4. Sources or record references where relevant.
5. Review status: draft, reviewed, or approved by Tracey.
6. For Canon, exact version and source; for team/history, reviewed names, roles, and chronology.

Keep exact Canon quotations separate from explanatory copy. Any unresolved historical detail stays marked as a draft question in the authoring handoff, not invented in the visitor-facing page. Tracey reviews identity, history, tone, and publication readiness.

## Proposed files

All paths below are relative to a proposed `atlas/` project root; they are not claims about existing repository files.

| File | Responsibility |
| --- | --- |
| `index.html` | Vibe entrance structure and fallback navigation. |
| `aegis.html` | AEGIS entrance structure and fallback navigation. |
| `document.html` | Reader shell, status, and return navigation. |
| `styles/atlas.css` | Scene sizing, transparent regions, text navigation, focus, and responsive layout. |
| `styles/reader.css` | Document typography and reading layout. |
| `scripts/atlas.js` | Target rendering, validation, and focus restoration. |
| `scripts/reader.js` | Query parsing, content loading, safe rendering, and recovery states. |
| `content/navigation.json` | Scene assets, normalized geometry, accessible labels, and destination IDs. |
| `content/documents.json` | Reviewed text and source metadata, separate from presentation. |
| `assets/vibe-atlas.webp` | Optimized original square entrance. |
| `assets/aegis-atlas.webp` | Optimized revised landscape destination. |
| `assets/source/` | Unmodified reference PNGs. |
| `tests/atlas.spec.js` | Navigation, geometry, keyboard, reader, and recovery checks in the chosen browser test runner. |
| `README.md` | Local preview, content updates, and integration instructions. |

Content contract: `documents` is keyed by stable ID. Each record contains `title`, `summary`, `parentAtlas` (`vibe` or `aegis`), `status`, `intro`, `sections` (heading and paragraph arrays), and optional `sources` (label and URL). Render strings using text nodes. Source URLs accept approved HTTPS links and known local destinations; reject executable schemes. Do not inject arbitrary HTML from content.

Navigation contract: each scene provides its image path, natural width/height, and target records with `id`, `label`, `href`, and normalized polygon coordinates in the range 0–1. The renderer validates geometry and never places links over unrelated objects.

## Implementation tasks

### 1. Prepare assets and page shell

**Owner:** UI implementer. **Files:** HTML entry pages, CSS, assets, README.

- [ ] Confirm both final image sources and their natural dimensions.
- [ ] Create optimized derivatives and retain original PNGs.
- [ ] Build both page shells and text navigation with relative links.
- [ ] Preview through a local HTTP server; confirm correct image proportions, no cropping, and no missing assets at desktop and mobile widths.
- [ ] Record asset sizes and check visual quality against the source before committing this deliverable.

### 2. Add object links and navigation

**Owner:** UI implementer. **Files:** `navigation.json`, `atlas.js`, Atlas CSS, navigation tests.

**Interface:** `renderAtlasTargets(container, scene)` consumes the validated scene contract and produces semantic anchors with stable IDs.

- [ ] Measure and store the seven primary object regions on each image; add AEGIS heading/section links and return navigation.
- [ ] Write interaction checks for the Vibe crystal → AEGIS page and all twelve book destinations before wiring the targets.
- [ ] Implement links, focus styling, accessible labels, and the visible text alternative.
- [ ] Verify each region center opens its intended destination and gaps between targets do not activate a neighbor; repeat after resizing.
- [ ] Verify keyboard order follows left column top-to-bottom, crystal, then right column top-to-bottom, with auxiliary navigation clearly reachable.
- [ ] Commit after the navigation checks pass.

### 3. Build the reader with honest draft states

**Owner:** UI implementer. **Files:** reader HTML/CSS/JS, `documents.json`, reader tests.

**Interfaces:** `loadDocument(id)` returns a validated document or a typed missing/load-error result. `renderDocument(record)` renders safe text and the parent return link.

- [ ] Add named draft records using the agreed titles and content briefs; keep missing prose visibly marked as being prepared.
- [ ] Write checks for valid IDs, unknown IDs, missing content, failed loading, Retry, and safe rendering of text resembling HTML.
- [ ] Implement the reader, parent navigation, and per-document browser title.
- [ ] Verify direct URLs, refresh, browser Back/Forward, and a return to the appropriate Atlas.
- [ ] Check readable layout at 200% zoom and on a narrow phone viewport; commit after checks pass.

### 4. Integrate Verus's reviewed content

**Owners:** Verus drafts; Tracey reviews; UI implementer integrates. **Files:** `documents.json` and optional approved source assets.

- [ ] Receive text mapped to the stable IDs; report missing entries without blocking completed ones.
- [ ] Confirm the current Canon source and exact Axiom text before marking the Axioms document approved.
- [ ] Integrate text and sources, preserving review status and source/version metadata.
- [ ] Receive the intended Central Codex URL from Tracey; keep the local introduction until supplied and verified.
- [ ] Review names, chronology, DataQuad descriptions, spelling, force words, and the distinction between proposed, implemented, and verified behavior.
- [ ] Confirm all entries intended for release have Tracey's approval; commit content separately from UI changes.

### 5. Verify the full experience and prepare IDE integration

**Owners:** UI implementer verifies behavior; Tracey reviews the visual experience; Verus reviews content accuracy.

- [ ] Test at 1440px, 1024px, 768px, and 390px widths, plus 200% browser zoom.
- [ ] Check keyboard-only use, screen-reader link names, touch operation, reduced motion, and image-load failure fallback.
- [ ] Compare rendered pages with their own reference images at matching aspect ratios; verify hit areas using a temporary development-only overlay.
- [ ] Confirm document error states, invalid source-link handling, browser navigation, and no runtime console errors.
- [ ] Inspect the actual IDE repository before choosing its route or embedded-view adapter. Confirm its base path, security policy, existing styling, and return-to-Workspace behavior.
- [ ] Package a working standalone preview and record passed checks and remaining content gaps. Do not describe a standalone preview as integrated into the IDE.

## Review focus

| Condition | Expected behavior | Owning task |
| --- | --- | --- |
| Artwork resizes or viewport is narrow | Hit areas stay aligned; text navigation remains usable. | 2, 5 |
| Visitor has no hover or uses keyboard | Every destination is named, reachable, and activatable. | 2, 5 |
| Document ID is invalid or content loading fails | Clear status, recovery action, and valid return navigation. | 3 |
| Browser refresh, Back/Forward, or direct document URL | Correct document and parent; no navigation dead end. | 3 |
| Draft prose, unsafe link scheme, or HTML-like text | Honest draft status; safe text rendering; unsafe links rejected. | 3, 4 |

## Completion and handoff

**UI ready for content:** both illustrated pages work, all objects open the correct named reader, responsive and accessible alternatives work, and draft/error states pass verification. This can be completed before Verus finishes writing.

**Ready for release review:** reviewed content is integrated, Canon wording is verified, all intended external links are supplied and checked, the complete journey passes verification, and Tracey has reviewed the result. Any deferred Codex destination remains explicitly labeled.

**IDE integration complete:** the adapter has been implemented and tested in the actual IDE environment. This is a separate claim from standalone HTML completion.

Recommended sequence: implement the static UI while Verus prepares the introductions, integrate reviewed content, then verify and connect the finished experience to the IDE. No deployment is part of this plan.
