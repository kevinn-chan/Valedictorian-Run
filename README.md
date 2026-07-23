# Valedictorian Run

A private, two-user study app: drop a course's files (lecture PDFs, notes, cheatsheets) into a
**session**, and it compiles them into a topic wiki, spaced-repetition flashcards, mock exams,
teach-back grading, a day-by-day learning plan, and a Q&A chat that answers only from your
materials — **every answer cited to its source page**.

No vector database. It's a working take on Karpathy's "RAG is dead": **compile-on-ingest +
full-context + a lexical fallback**, not chunk → embed → vector top-k.

Stack: Next.js 16 (App Router) on Vercel Hobby · TypeScript · Tailwind v4 · Supabase Free
(Postgres + RLS + Storage + Auth) · Vercel AI SDK · Gemini free tier (OpenAI Tier 3 as
break-glass) · `mupdf` + `sharp` for figure rasterization. Runs at **$0/month**.

Docs: [PLAN.md](PLAN.md) (architecture + phases) · [PLATFORM-FACTS.md](PLATFORM-FACTS.md)
(verified free-tier limits) · [PRODUCT.md](PRODUCT.md) (design context) ·
[SETUP.md](SETUP.md) (click-by-click cloud setup).

## Features

- **Sessions** — one per course; each holds the full compiled corpus.
- **Compile-on-ingest** — an LLM reads each file once → page-cited chunks + a topic wiki + a file digest.
- **Visual-aware ingest** — figures are rasterized (`mupdf` → `sharp` → WebP), stored, and linked to their topic; the chat can *read* a diagram and answer from it, still cited.
- **Corpus wiki** — browsable topics with a concise/full toggle and page citations throughout.
- **Learning plan** — a grounded, regenerable day-by-day plan built only from your corpus.
- **Flashcards** — auto-generated, SM-2-lite spaced repetition with keyboard grading.
- **Due-today queue** — one cross-session review of every card due now, graded in place.
- **Teach-back** — explain a topic from memory; graded strictly against your materials, page-cited.
- **Mock exams** — fresh 10-question papers, each answer cited; attempt history persists.
- **Grounded chat** — corpus-only answers; refuses ("that isn't in your materials") instead of hallucinating.
- **Progress** — per-topic mastery from your review history, plus mock-exam accuracy over time.
- **Manage** — per-file recompile, rename, delete-with-confirm.
- **Auth** — a single shared password → pick a profile (two-step). RLS keeps each user's data isolated.
- **`/demo`** — a public, read-only sample course (no sign-in).

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in values (see SETUP.md)
npm run dev                  # http://localhost:3000
```

Runnable self-checks (no framework): `node src/lib/analytics.check.ts`, `node src/lib/figures.check.ts`.

## Cloud setup

Follow **[SETUP.md](SETUP.md)** — a click-by-click guide (Supabase → Gemini key → Vercel) with a
checkpoint after every step. Sign-in is a single shared password that then lets you pick a
profile; built for a small, trusted group, not open public signup. Run the migrations in
`supabase/migrations/` (including `0003_figures.sql` for the figure pipeline) in the Supabase
SQL editor.

To add the second user: run `insert into allowed_emails values ('their@email');` in the Supabase
SQL Editor and add the address to `ALLOWED_EMAILS` and `PROFILES` (locally and on Vercel).
