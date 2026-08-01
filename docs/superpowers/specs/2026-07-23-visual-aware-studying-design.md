# Visual-aware studying — design

**Date:** 2026-07-23
**Status:** Approved, Phase 1 in build
**Author:** kevinn-chan

## Problem

Ingest sends the PDF to Gemini and asks it to *describe* diagrams in `[brackets]`,
so anatomy diagrams (Tina — medicine) and graphs/figures (Kevin — math/CS) are
collapsed into text and the actual visuals are lost. Nothing visual is stored, so
the wiki, chat, and any viewer are all text-only.

## Goal

Capture the figures that matter during ingest and store them, then surface them in
the study surfaces. One foundation unlocks four use cases the user selected:

1. Inline figures in the wiki (P1)
2. Clickable citation → source page (already works: citations open `/api/file/[id]#page=N`)
3. AI that can *see* diagrams (P2 — vision chat)
4. Image-occlusion flashcards (P3)

## Architecture (chosen: rasterize figure-pages at ingest)

Gemini already receives the whole PDF at compile time. Extend the compile to also
return which pages carry a real figure; rasterize just those pages server-side with
`mupdf` (pure wasm — runs on Vercel serverless, validated locally: 56-page PDF, a
page rasterized in ~120ms), compress to WebP with `sharp` (already installed, ~34KB
/page), store, and link to session/file/page/topic. Text-only pages cost nothing.

Rejected: client-side rasterize-every-page (heavy client, React-19 upload issues,
all-pages storage); store-nothing (no inline figures, no occlusion path).

## Phase 1 (build now)

### Data — `supabase/migrations/0003_figures.sql`
`figures(id, file_id→files, session_id→sessions [both cascade], page int,
storage_path text, caption text, topic_slug text null, kind text null,
width int, height int, created_at)`. RLS mirrors `chunks` via `owns_session`.

### Storage
Reuse the private `session-files` bucket, **flat under the session prefix**:
`{sessionId}/fig_{fileTag}_p{page}.webp`. This inherits the existing
`deleteSession` cleanup (lists `{id}/`, removes all) for free.

### Ingest (`src/lib/ingest.ts` + `src/lib/figures.ts`)
- Add `figures[]` to `CompileSchema`: `{ page, caption, topic_slug?, kind? }`,
  described as "pages with a real figure/diagram/graph worth keeping — skip logos
  and text-only pages."
- `src/lib/figures.ts`: `rasterizePages(pdfBytes, pages[])` → `{page, webp, width, height}[]`
  using mupdf + sharp (scale ~2, max width 1200, WebP q72).
- In `ingestFile`, after the text insert: idempotently drop this file's old figure
  rows + storage objects, rasterize the distinct figure pages, upload, insert rows.
  Resolve `topic_slug` to the full wiki slug (`{fileTag}-{topicSlug}`), falling back
  to the topic whose `pages[]` contains the figure page.
- The whole figure step is wrapped in try/catch: figures are an enhancement and must
  never fail the text compile.

### Serving — `src/app/api/figure/[id]/route.ts`
Mirror `/api/file`: fetch the figure via the user's RLS client (auth check) → sign
its `storage_path` with the service role → redirect. Demo fallback: if no user row
and the figure's `session_id === DEMO_SESSION_ID`, serve via service role so `/demo`
figures render for anonymous visitors.

### Inline wiki figures (`.../wiki/[slug]/page.tsx`)
Third parallel query: `figures where session_id=id and topic_slug=slug`. Render a
"Figures from the source" strip below the markdown — `<img src=/api/figure/{id}>`
with `caption` as alt, wrapped in a link to the full image. Same on the file-digest
page keyed by file.

### Cleanup / test
- Re-ingest replaces a file's figures (rows + storage); session delete already
  removes them via the flat prefix.
- One runnable check: figure-page collection + topic-slug resolution on a fixture.
- Re-ingest the demo "Introduction to R" session so `/demo` shows its plots.

## Deferred (with reason)
- **Separate source-viewer route + transcript fallback** — citations already open the
  source PDF at the page. Add only if the raw-PDF link proves inadequate (e.g. mobile).
- **P2 vision chat** — attach the retrieved pages' figure images to the Gemini call
  (Flash is multimodal), capped ~4–6 images/turn.
- **P3 occlusion flashcards** — Gemini returns label bounding boxes on anatomy figures
  → occlusion review UI.

## Risks
- `mupdf` on Vercel (validated locally; pure wasm). `puppeteer-core` is already a dep
  as a fallback rasterizer if needed.
- Storage stays well within Supabase's 1 GB free tier (figures-only + WebP).
