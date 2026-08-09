# Study Intelligence — Design Spec

**Date:** 2026-08-09
**Scope:** 4 features that surface insights from data the app already collects.
**Migration required:** Yes — one new table (`mastery_snapshots`), human-run in Supabase SQL editor.

---

## 1. Leech Detection

Cards with `lapses >= 4` are flagged as leeches — cards the student keeps forgetting, signalling the card itself is probably bad (too broad, ambiguous, or testing low-value knowledge).

**Threshold:** `LEECH_THRESHOLD = 4` in `src/lib/srs.ts`. Hardcoded constant; change the number if 4 proves wrong.

**Surfaces:**

- **During review** — a small red "Leech" badge on the card (near the topic name / page ref) when `card.lapses >= LEECH_THRESHOLD`. Subtle, not disruptive.
- **Analytics page** — new "Leeches" section below the topic mastery table. Lists all cards with `lapses >= LEECH_THRESHOLD` for that session, sorted by lapses descending. Shows: card front text (truncated), topic name, lapse count. Each row links to the wiki topic for context.

**No action buttons.** This is informational — the student decides whether to rephrase, split, or just keep hammering. Suspend/rephrase can be added later if leeches prove to be a real friction point.

**Files:**
- `src/lib/srs.ts` — add `export const LEECH_THRESHOLD = 4` and `export const isLeech = (card: { lapses: number }) => card.lapses >= LEECH_THRESHOLD`
- `src/app/(app)/sessions/[id]/review/review-client.tsx` — red badge on card when leech
- `src/app/(app)/sessions/[id]/analytics/page.tsx` — new leeches section at the bottom

---

## 2. Review Heatmap (replaces streak card)

A GitHub-style contribution heatmap showing review activity over the last 12 weeks. Replaces the current streak card on the dashboard right rail — streak count and daily goal are embedded in the heatmap card header.

**Data source:** `reviews.reviewed_at` — already fetched on the dashboard for the streak calculation.

**Layout:**
```
┌─────────────────────────────────────────┐
│  🔥 4-day streak          3/10 today    │
│                                         │
│  ░░░░░░░░░░░░  (12 weeks of cells)      │
│  ░░█░░░░░░░░░  Mon                      │
│  ░░░░░░░░░░░░  ...                      │
│  ░░░░░░░░░█░█  Sun                      │
│                                         │
│  □ 0  ░ 1-4  ▒ 5-9  █ 10+              │
└─────────────────────────────────────────┘
```

**Spec:**
- 7 rows (Mon–Sun) × 12 columns (weeks). Pure CSS grid, no SVG, no library.
- 4 intensity levels: 0, 1–4, 5–9, 10+. CSS custom properties for fill colors (dark mode automatic via token system).
- Streak count + flame icon top-left, today's `N/DAILY_GOAL` top-right.
- Daily goal progress bar is dropped — the heatmap cell for today already shows threshold visually.
- `DAILY_GOAL = 10` constant stays in `page.tsx` (already exists).

**Files:**
- `src/components/ui-kit.tsx` — add `ReviewHeatmap` component. Props: `reviews: { reviewed_at: string }[]`, `dailyGoal: number`. Pure presentational.
- `src/app/(app)/page.tsx` — replace the streak card block (~lines 305–341) with `<ReviewHeatmap>`. Pass the reviews data already fetched.

---

## 3. Smart Review Order

Sort the due-card queue so cards from weakest topics come first. Currently the queue is in insertion/database order.

**Algorithm:**
1. Compute per-topic mastery % (reuse existing `topicMastery` from `analytics.ts`).
2. Sort due cards: lowest topic mastery % first.
3. Tie-break within same topic: higher lapses first (hardest cards first).
4. Ungrouped cards (no topic match) go last.

**Sort happens server-side** before passing to `ReviewClient`. No changes to the client component's queue management.

**Data needed:** The cross-session review page (`/review/page.tsx`) currently only fetches due cards. Smart ordering needs all cards + topics to compute per-topic mastery. Add two parallel queries: `cards.select("session_id, topic_slug, reps")` (all cards, not just due) and `wiki_pages.select("slug, title, session_id").eq("kind", "topic")`. The per-session review page (`/sessions/[id]/review/page.tsx`) likely needs the same additions — check what it currently fetches.

**Files:**
- `src/lib/analytics.ts` — export `sortByWeakness(dueCards, allCards, topics)`. Returns due cards sorted. Reuses `topicMastery` internally.
- `src/app/(app)/review/page.tsx` — add allCards + topics queries, call `sortByWeakness` before passing to `ReviewClient`
- `src/app/(app)/sessions/[id]/review/page.tsx` — same

**Not doing:** Interleaving (mixing easy topics between hard ones). Start with worst-first; upgrade to interleaving only if worst-first causes review fatigue.

---

## 4. Mastery Trend

A sparkline on the dashboard's "Overall mastery" card showing mastery % over the last 14 days.

**Requires migration.** No way to derive historical mastery from current card state — a daily snapshot is the honest approach.

### Migration SQL (run in Supabase SQL editor)

```sql
create table mastery_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  snapshot_date date not null default current_date,
  total_cards int not null,
  mastered_cards int not null,
  unique (user_id, snapshot_date)
);

alter table mastery_snapshots enable row level security;

create policy "Users can manage own snapshots"
  on mastery_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Snapshot writer

New route `POST /api/snapshot`:
1. Get authenticated user ID.
2. Count total cards and mastered cards (`reps >= 2`) for that user.
3. Upsert into `mastery_snapshots` with today's date.
4. Return 200. Idempotent — multiple calls per day just overwrite.

Called fire-and-forget on dashboard load. No cron, no background job. The dashboard already does a full page load on every visit (server component); a client-side `fetch('/api/snapshot', { method: 'POST' })` piggybacks on that.

### Display

Reuse the `Sparkline` component from `src/app/(app)/sessions/[id]/analytics/page.tsx`. Extract it to `src/components/ui-kit.tsx` if not already exported (it's currently a file-local function).

Show last 14 days below the mastery ring. If fewer than 2 data points, hide the sparkline (just show the ring as today — it will populate over the next few days of use).

**Files:**
- `src/app/api/snapshot/route.ts` — new, ~25 lines
- `src/components/ui-kit.tsx` — extract `Sparkline` here from analytics page
- `src/app/(app)/sessions/[id]/analytics/page.tsx` — import `Sparkline` from ui-kit instead of local definition
- `src/app/(app)/page.tsx` — fetch snapshots, render sparkline in mastery card, add fire-and-forget snapshot call (tiny client component or `<script>`)

---

## Task Dependencies

```
1. Leech Detection     — independent
2. Review Heatmap      — independent
3. Smart Review Order  — independent
4. Mastery Trend       — independent (but migration must run before deploy)
```

All four are independent — no shared state, minimal file overlap. Can be implemented in any order or parallelized across agents. The only cross-task file is `ui-kit.tsx` (heatmap component + sparkline extraction), which is additive (append-only, no conflicts).

**Recommended order:** 1 → 3 → 2 → 4. Leech detection and smart order are the smallest diffs. Heatmap is medium. Mastery trend has the migration dependency, so run the SQL first and implement last.

---

## Global Constraints

- All commits authored solely by `kevinn-chan <chankangle.kevin@gmail.com>`. No Co-Authored-By.
- HANDOFF.md is untracked — never `git add` it.
- Next.js 16 — check `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Tailwind v4 CSS-first config — no `tailwind.config.ts`.
- `tsc --noEmit` and `npm run build` must pass after every task.
- Semantic colors preserved (red/amber/green encode meaning, not brand).
- Dark mode: use CSS custom properties, not hardcoded colors.
