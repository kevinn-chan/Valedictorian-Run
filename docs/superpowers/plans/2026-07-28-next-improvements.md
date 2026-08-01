# Valedictorian Run — Next Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the top 3 improvements from the HANDOFF.md "What to improve" list — occlusion-safe recompile, live re-tag validation, and occlusion UX dedupe — then regression-test every change live via claude-in-chrome.

**Architecture:** All changes stay within the existing zero-cost, no-migration architecture (Supabase Postgres + RLS, Gemini free tier, Vercel). Figures stabilise across recompile by preserving row IDs (UPDATE vs delete+reinsert). Re-tag is validated end-to-end by actually recompiling a file. Dedupe is a client-side guard on the Suggest button.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Vercel AI SDK v7 · Gemini

**HARD RULES (from HANDOFF.md — never break):**
- Every commit authored solely by `kevinn-chan <chankangle.kevin@gmail.com>`. **No `Co-Authored-By`, no Claude as author/contributor.**
- HANDOFF.md is untracked — never `git add` it.
- Check Next.js docs in `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Every new addition or feature must be checked by a regression test using claude-in-chrome on the live site.

---

## Task 1: Occlusion-safe recompile — stabilise figure row IDs across recompile

The #1 gap: `ingestFigures` deletes+reinserts figure rows on recompile, changing their UUIDs. Occlusion cards reference the old `figureId` → broken images. Fix: UPDATE existing rows by `(file_id, page)` instead of delete+reinsert, so the row ID (and any occlusion cards pointing at it) survives.

**Files:**
- Modify: `src/lib/ingest.ts:267-333` (`ingestFigures`)
- Test: `src/lib/ingest.check.ts` (add a self-check for the figure-stable path)

- [ ] **Step 1: Read the current `ingestFigures` function**

Understand the flow: it deletes all `figures` rows for `file_id`, removes their storage objects, rasterises new pages, uploads, and inserts fresh rows. The fix: instead of delete-all + insert-all, match new figures to existing rows by `(file_id, page)`. Existing rows get UPDATEd (preserving `id`); genuinely new pages get INSERT; pages no longer flagged get DELETE.

- [ ] **Step 2: Write the self-check in `ingest.check.ts`**

Add a test that simulates the figure-stable logic:
```ts
// Figure-stable recompile: existing figure row IDs survive when the same page
// is re-flagged. New pages get new rows; removed pages get deleted.
function checkFigureStable() {
  const existing = [
    { id: "fig-1", page: 3, storage_path: "sess/fig_abc_p3.webp" },
    { id: "fig-2", page: 8, storage_path: "sess/fig_abc_p8.webp" },
  ];
  const newPages = [3, 10]; // page 3 survives, page 8 removed, page 10 added

  const { toUpdate, toInsert, toDelete } = diffFigures(existing, newPages);

  assert(toUpdate.length === 1 && toUpdate[0].id === "fig-1", "page 3 row survives");
  assert(toInsert.length === 1 && toInsert[0] === 10, "page 10 is new");
  assert(toDelete.length === 1 && toDelete[0].id === "fig-2", "page 8 removed");
  console.log("  ✓ figure-stable recompile");
}
```

- [ ] **Step 3: Run the check to verify it fails**

Run: `cd ~/Projects/study-sessions && node src/lib/ingest.check.ts`
Expected: FAIL — `diffFigures` doesn't exist yet.

- [ ] **Step 4: Implement `diffFigures` and refactor `ingestFigures`**

Export `diffFigures` from `ingest.ts` (pure function, testable):
```ts
export function diffFigures(
  existing: { id: string; page: number; storage_path: string }[],
  newPages: number[]
): {
  toUpdate: { id: string; page: number; storage_path: string }[];
  toInsert: number[];
  toDelete: { id: string; page: number; storage_path: string }[];
} {
  const newSet = new Set(newPages);
  const existByPage = new Map(existing.map((e) => [e.page, e]));
  return {
    toUpdate: existing.filter((e) => newSet.has(e.page)),
    toInsert: newPages.filter((p) => !existByPage.has(p)),
    toDelete: existing.filter((e) => !newSet.has(e.page)),
  };
}
```

Then refactor `ingestFigures` to:
1. Fetch existing figure rows for `file_id` (with `id, page, storage_path`).
2. Call `diffFigures(existing, distinctPages)`.
3. DELETE + remove storage for `toDelete` rows only.
4. Rasterise ALL `distinctPages` (same as before).
5. For `toUpdate` pages: UPDATE the existing row (caption, topic_slug, kind, width, height, storage_path) and overwrite the storage object (`upsert: true`).
6. For `toInsert` pages: INSERT new rows (new UUIDs auto-assigned).

- [ ] **Step 5: Run the check to verify it passes**

Run: `cd ~/Projects/study-sessions && node src/lib/ingest.check.ts`
Expected: PASS — all checks including the new `checkFigureStable`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ingest.ts src/lib/ingest.check.ts
git commit -m "Stabilise figure row IDs across recompile so occlusion cards survive"
```

---

## Task 2: Deduplicate vision auto-suggest (prevent double-click duplicates)

The HANDOFF notes: "No dedupe. Suggest appends to whatever boxes are already drawn; clicking twice doubles the list." Fix: guard the client so Suggest clears previous suggestions before appending, or skip if boxes already exist with a confirm.

**Files:**
- Modify: `src/app/(app)/sessions/[id]/occlude/occlude-client.tsx` (the Editor component's Suggest handler)

- [ ] **Step 1: Read the current Suggest handler in occlude-client.tsx**

Find the `✨ Suggest regions` button's onClick. It calls `POST /api/occlude/[sessionId]/suggest`, gets back `{ regions }`, and appends them to the drawn-boxes state.

- [ ] **Step 2: Add dedupe guard**

Before appending suggestions, filter out any region whose label already exists in the current boxes (case-insensitive match). This is idempotent — clicking Suggest twice produces the same result as clicking once.

```ts
// Inside the suggest handler, after receiving suggestedRegions:
const existingLabels = new Set(regions.map((r) => r.label.toLowerCase()));
const fresh = suggestedRegions.filter(
  (r: Region) => !existingLabels.has(r.label.toLowerCase())
);
setRegions((prev) => [...prev, ...fresh]);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/sessions/[id]/occlude/occlude-client.tsx
git commit -m "Deduplicate vision auto-suggest so repeated clicks don't double boxes"
```

---

## Task 3: Live-recompile validation of the re-tag (promote from what-if to proven)

The re-tag logic (`pickTopicSlug` + `retagCards`) has been self-checked and what-if-proven but never run via an actual recompile on the live site. This task validates it end-to-end: recompile a file in the **Introduction to R** session (which has 29 orphaned cards) and confirm cards keep their SRS state AND land on the right topics (0 Ungrouped after).

**This is a manual validation task, not a code change.** It exercises the code from Tasks 1 + existing re-tag in production.

**Files:**
- Read: `scripts/recompile-co.mjs` (recompile script — works for any file, not just CO)
- Read: `scripts/verify-roadmap.mjs` (read-only checker)

- [ ] **Step 1: Identify the Introduction to R file ID(s)**

```bash
cd ~/Projects/study-sessions
node -e "
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('files').select('id, name').eq('session_id', '20d0849c-80ca-432b-82e1-56fe964e5cec');
  console.log(data);
" 2>/dev/null
```

- [ ] **Step 2: Check pre-recompile state — count orphaned cards**

```bash
node scripts/verify-roadmap.mjs
```

Expect: 29 orphaned cards in Introduction to R (the known state from HANDOFF).

- [ ] **Step 3: Recompile one Introduction to R file**

Use the recompile script (costs one Gemini call):
```bash
node scripts/recompile-co.mjs <fileId>
```

- [ ] **Step 4: Verify post-recompile — 0 orphaned cards, SRS preserved**

```bash
node scripts/verify-roadmap.mjs
```

Expect: 0 orphaned cards (all 29 re-tagged to new topics). Verify that existing SRS fields (`reps`, `ease`, `interval_days`) are unchanged — the re-tag only UPDATEs `topic_slug`.

- [ ] **Step 5: Verify figure IDs survived (Task 1's fix)**

Check that the Introduction to R figures (3 figures: p.7, p.8, p.55) still have the same row IDs as before the recompile. Any occlusion cards on those figures should still resolve.

---

## Task 4: Full regression test via claude-in-chrome (live site)

Every change must be verified live. This is the regression pass — drive the real browser, logged in as Kevin, on https://valedictorian-run.vercel.app.

**Files:** None (verification only)

- [ ] **Step 1: Push all commits and wait for Vercel deploy**

```bash
git push origin main
```

Wait for deploy (can lag a few minutes — don't declare it broken from a short poll).

- [ ] **Step 2: Log in as Kevin via claude-in-chrome**

Two-step login: enter the shared password (see `.env.local` / your password manager — never
commit it, this repo is public) → pick Kevin profile.

- [ ] **Step 3: Regression checklist (all via claude-in-chrome)**

Test each and record PASS/FAIL:

1. **Home page** — sessions list renders, due-today banner present (or absent if 0 due), search box works
2. **Cross-session search** — search for "vector" → hits under Introduction to R with highlighted terms
3. **Session page** — all tabs visible (Wiki, Review, Teach, Quiz, Chat, Progress, Image occlusion)
4. **Flashcard review** — flip a card, grade it, `/api/review` returns 200
5. **Due-today queue** (`/review`) — shows cross-session cards, grades work
6. **Image occlusion editor** — pick a figure, draw a box, label it (don't save unless wanted)
7. **Vision auto-suggest dedupe** — click ✨ Suggest → boxes appear; click again → NO duplicates added
8. **Progress/analytics** — Introduction to R shows topics with cards (0 Ungrouped if re-tag ran)
9. **Wiki** — corpus index, topic page, Concise/Full toggle, figures render
10. **Chat** — ask a question, get a cited answer
11. **Recompile** — if not done in Task 3 live, recompile a throwaway file and confirm figure IDs stable

- [ ] **Step 4: Test Tina login + RLS isolation**

Sign out → log in as Tina → confirm she sees her own sessions only (or none). Direct-load a Kevin session URL → expect 404/notFound.

- [ ] **Step 5: Test /demo**

Navigate to `/demo` → read-only wiki, cited chat, figures, "View the code" → correct OSS repo link.

---

## Scope notes

**Skipped (YAGNI for now — add when needed):**
- Search ranking (`ts_rank` RPC/migration) — fine at 2 users, a handful of sessions
- Occlusion UX polish (save-as-you-draw, move/resize handles) — manual draw works, auto-suggest covers most cases
- Daily streak/goal — nice-to-have, no user request yet
- One-click profile switch — two-step login works, only 2 users
- Syncing to the OSS repo — do after all changes land, with a secret sweep

**The plan covers the 3 highest-value improvements from the HANDOFF "What to improve" list.** Everything else is optional polish.
