# Atlas

Branch: `feat/atlas-html`.

The Vibe Atlas: a static HTML introduction with illustrated rooms and transparent hotspots.

- `index.html` is the entrance (the square Vibe Atlas). Its crystal opens the AEGIS Atlas; its books open Explore and Building the Vibe.
- `aegis.html`, `explore.html`, `building-the-vibe.html` are the three rooms. Each book opens in an in-room reader; a book is linkable as `room.html#book-id`.
- `atlas.css` and `atlas.js` are shared by all four pages. The Atlas keeps no visitor record.
- Book text lives in each page's `<template id="content-…">` blocks. Content drafts: `content/VERUS_CONTENT_HANDOFF.md`.
- `_archive/ui-build-2026-11-03/` holds the earlier UI build, kept for reference.

## View locally

From `public/`, run `python -m http.server 8765`, then open http://127.0.0.1:8765/atlas/index.html. Inside the IDE dev server, Vite serves it at `/atlas/index.html`.

Plan: `../../docs/plans/atlas-html-implementation.md`
