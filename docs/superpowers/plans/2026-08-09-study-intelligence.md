# Study Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 features that surface study insights from data the app already collects: leech detection, review heatmap, smart review order, and mastery trend sparkline.

**Architecture:** All features read existing data (cards, reviews, wiki_pages) with one exception: mastery trend requires a new `mastery_snapshots` table (migration provided, human-run). No new dependencies. All UI uses CSS custom properties (dark mode automatic). Features are independent — no shared state, minimal file overlap.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 (CSS-first config, `@import "tailwindcss"`), TypeScript, Supabase, Lucide icons.

## Global Constraints

- Every commit authored solely by `kevinn-chan <chankangle.kevin@gmail.com>`. No `Co-Authored-By`.
- HANDOFF.md is untracked — never `git add` it.
- Next.js 16 has breaking changes vs training data. Check `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Tailwind v4 CSS-first config — no `tailwind.config.ts`. Config is in `globals.css` via `@theme inline` and `@custom-variant`.
- `tsc --noEmit` and `npm run build` must both pass after every task.
- Semantic colors preserved: red (Again/destructive), amber (warning), green (Easy/positive), orange (streak flame) encode meaning, not brand.
- Dark mode: use CSS custom properties from the token system, not hardcoded colors.
- `prefers-reduced-motion` is already respected globally in `globals.css` — new animations must use CSS transitions/keyframes.

---

### Task 1: Leech Detection

**Files:**
- Modify: `src/lib/srs.ts` (add constant + helper)
- Modify: `src/app/(app)/sessions/[id]/review/review-client.tsx` (add badge)
- Modify: `src/app/(app)/sessions/[id]/analytics/page.tsx` (add leeches section + expand card query)

**Interfaces:**
- Produces: `LEECH_THRESHOLD` (number constant = 4), `isLeech(card: { lapses: number }): boolean` from `@/lib/srs`
- Consumes: `Card` interface in `review-client.tsx` already has `lapses: number`

**Context for the implementer:**

The SRS module is at `src/lib/srs.ts` (39 lines). It exports `Grade`, `SrsState`, and `schedule()`. The `LEECH_THRESHOLD` constant and `isLeech` helper go here.

The `ReviewClient` component at `src/app/(app)/sessions/[id]/review/review-client.tsx` renders the current card. The card's `front` text is at ~line 250 (`<p className="text-lg leading-relaxed">{card.front}</p>`). Below the front text and before the answer section, the page reference is shown when flipped (~line 297–300). The leech badge should appear near the topic/source ref area, visible on both sides of the card.

The analytics page at `src/app/(app)/sessions/[id]/analytics/page.tsx` currently selects `"topic_slug, reps, lapses, ease, due_at"` from cards (line 55). The leech section needs `front` added to this select. The section goes after the topic mastery list (after line 160's closing `</section>`) and before the closing `</div>` of the main column.

- [ ] **Step 1: Add leech constant and helper to srs.ts**

Open `src/lib/srs.ts` and append after the closing `}` of the `schedule` function:

```ts
export const LEECH_THRESHOLD = 4;

export const isLeech = (card: { lapses: number }) =>
  card.lapses >= LEECH_THRESHOLD;
```

- [ ] **Step 2: Add leech badge to review card**

Open `src/app/(app)/sessions/[id]/review/review-client.tsx`.

Add to imports (line 6):
```ts
import { schedule, type Grade, isLeech } from "@/lib/srs";
```

Find the card's front text display (~line 250):
```tsx
<p className="text-lg leading-relaxed">{card.front}</p>
```

Insert immediately **before** this line:
```tsx
{isLeech(card) && (
  <span className="mb-2 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
    Leech · {card.lapses} lapses
  </span>
)}
```

- [ ] **Step 3: Add `front` to analytics page card query**

Open `src/app/(app)/sessions/[id]/analytics/page.tsx`.

Change line 55 from:
```ts
.select("topic_slug, reps, lapses, ease, due_at")
```
to:
```ts
.select("front, topic_slug, reps, lapses, ease, due_at")
```

- [ ] **Step 4: Add leeches section to analytics page**

In the same file, add the import at the top:
```ts
import { topicMastery, rankByWeakness, examTrend, UNGROUPED_SLUG } from "@/lib/analytics";
import { LEECH_THRESHOLD } from "@/lib/srs";
```
(Note: the first import already exists — just add the second line.)

After the topic mastery `</section>` (after line 160), add:
```tsx
{(() => {
  const leeches = (cards ?? [])
    .filter((c) => c.lapses >= LEECH_THRESHOLD)
    .sort((a, b) => b.lapses - a.lapses);
  if (!leeches.length) return null;
  const topicMap = new Map((topics ?? []).map((t) => [t.slug, t.title]));
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
        Leeches — {leeches.length} card{leeches.length === 1 ? "" : "s"} you keep forgetting
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cards with {LEECH_THRESHOLD}+ lapses. Consider rephrasing, splitting, or asking whether you really need this fact.
      </p>
      <ul className="mt-4 space-y-1">
        {leeches.map((c, i) => (
          <li key={i} className="rounded-xl px-4 py-3 transition-colors hover:bg-red-500/5">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm">
                {(c as { front?: string }).front ?? "—"}
              </span>
              <span className="shrink-0 rounded-full bg-red-500/12 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                {c.lapses} lapses
              </span>
            </div>
            {c.topic_slug && topicMap.has(c.topic_slug) && (
              <Link
                href={`/sessions/${id}/wiki/${c.topic_slug}`}
                prefetch={false}
                className="mt-1 text-xs text-muted-foreground hover:text-primary"
              >
                {topicMap.get(c.topic_slug)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
})()}
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd ~/Projects/study-sessions && npx tsc --noEmit && npm run build
```
Expected: Both pass with zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/srs.ts src/app/\(app\)/sessions/\[id\]/review/review-client.tsx src/app/\(app\)/sessions/\[id\]/analytics/page.tsx
git commit -m "Leech detection: badge on review cards + leeches section in analytics"
```

---

### Task 2: Smart Review Order

**Files:**
- Modify: `src/lib/analytics.ts` (add `sortByWeakness` function)
- Modify: `src/app/(app)/review/page.tsx` (add queries + sort)
- Modify: `src/app/(app)/sessions/[id]/review/page.tsx` (add queries + sort)

**Interfaces:**
- Produces: `sortByWeakness(dueCards, allCards, topics): Card[]` from `@/lib/analytics`
- Consumes: `topicMastery` and `TopicRef` from `@/lib/analytics` (already exported)

**Context for the implementer:**

`src/lib/analytics.ts` exports `topicMastery(cards, topics)` which returns `TopicMastery[]` with `masteryPct` per topic. The new `sortByWeakness` reuses this to rank due cards.

The cross-session review page (`src/app/(app)/review/page.tsx`, 47 lines) currently only fetches due cards. It needs two additional parallel queries for all cards and topics to compute mastery.

The per-session review page (`src/app/(app)/sessions/[id]/review/page.tsx`, 41 lines) also only fetches due cards for that session. Same additions needed, scoped to `session_id`.

Both pages pass cards to `ReviewClient` — the sort is applied before that handoff. `ReviewClient` itself is unchanged.

- [ ] **Step 1: Add `sortByWeakness` to analytics.ts**

Open `src/lib/analytics.ts` and append at the end:

```ts
// Sort due cards: weakest-topic cards first, then highest-lapse within topic.
// Ungrouped cards (no topic match) go last.
export function sortByWeakness<
  T extends { topic_slug: string | null; lapses: number },
>(dueCards: T[], allCards: CardStat[], topics: TopicRef[]): T[] {
  const rows = topicMastery(allCards, topics);
  const pctMap = new Map(rows.map((r) => [r.slug, r.masteryPct]));
  return [...dueCards].sort((a, b) => {
    const pa = pctMap.get(a.topic_slug ?? "") ?? 1;
    const pb = pctMap.get(b.topic_slug ?? "") ?? 1;
    return pa - pb || b.lapses - a.lapses;
  });
}
```

The generic `<T>` lets both review pages pass their own card shape (they differ slightly — the cross-session page has `session_title`).

- [ ] **Step 2: Update cross-session review page**

Open `src/app/(app)/review/page.tsx`. Replace the entire file with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ReviewClient } from "@/app/(app)/sessions/[id]/review/review-client";
import { sortByWeakness } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DueTodayPage() {
  const supabase = await createClient();

  const [{ data: due }, { data: allCards }, { data: topics }] =
    await Promise.all([
      supabase
        .from("cards")
        .select(
          "id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses, sessions(title)"
        )
        .lte("due_at", new Date().toISOString())
        .order("due_at")
        .limit(100),
      supabase.from("cards").select("topic_slug, reps, lapses, ease, due_at"),
      supabase
        .from("wiki_pages")
        .select("slug, title")
        .eq("kind", "topic"),
    ]);

  const cards = sortByWeakness(
    (due ?? []).map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      topic_slug: c.topic_slug,
      source_ref: c.source_ref as { page?: number } | null,
      interval_days: c.interval_days,
      ease: c.ease,
      reps: c.reps,
      lapses: c.lapses,
      session_title:
        (c.sessions as unknown as { title: string } | null)?.title ?? null,
    })),
    allCards ?? [],
    topics ?? []
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back="/"
        backLabel="Dashboard"
        title="Due today"
        description="Every card due across your sessions, in one queue."
      />
      <ReviewClient cards={cards} />
    </main>
  );
}
```

- [ ] **Step 3: Update per-session review page**

Open `src/app/(app)/sessions/[id]/review/page.tsx`. Replace the entire file with:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ReviewClient } from "./review-client";
import { sortByWeakness } from "@/lib/analytics";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: due }, { data: allCards }, { data: topics }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, title")
        .eq("id", id)
        .single(),
      supabase
        .from("cards")
        .select("id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses")
        .eq("session_id", id)
        .lte("due_at", new Date().toISOString())
        .order("due_at")
        .limit(50),
      supabase
        .from("cards")
        .select("topic_slug, reps, lapses, ease, due_at")
        .eq("session_id", id),
      supabase
        .from("wiki_pages")
        .select("slug, title")
        .eq("session_id", id)
        .eq("kind", "topic"),
    ]);
  if (!session) notFound();

  const cards = sortByWeakness(due ?? [], allCards ?? [], topics ?? []);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Review"
        description="Grade yourself honestly — the schedule does the rest."
      />
      <ReviewClient sessionId={id} cards={cards} />
    </main>
  );
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
cd ~/Projects/study-sessions && npx tsc --noEmit && npm run build
```
Expected: Both pass with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/app/\(app\)/review/page.tsx src/app/\(app\)/sessions/\[id\]/review/page.tsx
git commit -m "Smart review order: weakest-topic cards first in review queue"
```

---

### Task 3: Review Heatmap (replaces streak card)

**Files:**
- Modify: `src/components/ui-kit.tsx` (add `ReviewHeatmap` component)
- Modify: `src/app/(app)/page.tsx` (replace streak card with heatmap)

**Interfaces:**
- Produces: `ReviewHeatmap` component from `@/components/ui-kit`. Props: `reviews: { reviewed_at: string }[]`, `streak: number`, `todayCount: number`, `dailyGoal: number`
- Consumes: `reviews` data already fetched in `page.tsx`

**Context for the implementer:**

The dashboard (`src/app/(app)/page.tsx`, 409 lines) has a right-rail `<aside>` starting ~line 270. The streak card occupies ~lines 305–341: a `<div>` with flame icon, streak number, daily goal progress bar. This entire block gets replaced with `<ReviewHeatmap>`.

The streak calculation (~lines 52–68) stays — it computes `streak` and `todayCount` which the heatmap header needs.

`ui-kit.tsx` (262 lines) exports `ProgressRing`, `ProgressBar`, `StatTile`, `CardCover`, `PageHeader`, `Panel`. Add `ReviewHeatmap` at the end.

The heatmap is pure CSS grid. 7 rows × 12 columns = 84 cells, one per day for the last 12 weeks. Each cell is a small square whose background intensity reflects how many reviews happened that day.

- [ ] **Step 1: Add ReviewHeatmap to ui-kit.tsx**

Open `src/components/ui-kit.tsx` and append before the final closing (after line 262):

```tsx
/** GitHub-style review activity heatmap — 12 weeks of daily review counts. */
export function ReviewHeatmap({
  reviews,
  streak,
  todayCount,
  dailyGoal,
}: {
  reviews: { reviewed_at: string }[];
  streak: number;
  todayCount: number;
  dailyGoal: number;
}) {
  // Count reviews per day (YYYY-MM-DD in local tz)
  const countByDay = new Map<string, number>();
  for (const r of reviews) {
    const day = new Date(r.reviewed_at).toLocaleDateString("en-CA");
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }

  // Build 84-day grid ending today, aligned to weeks (Mon start)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = (today.getDay() + 6) % 7; // 0=Mon
  const startOffset = todayDay + 7 * 11; // go back to Monday of 12 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - startOffset);

  const cells: { date: string; count: number }[] = [];
  const d = new Date(start);
  for (let i = 0; i < 84; i++) {
    const key = d.toLocaleDateString("en-CA");
    cells.push({ date: key, count: countByDay.get(key) ?? 0 });
    d.setDate(d.getDate() + 1);
  }

  const level = (n: number) =>
    n === 0 ? 0 : n < 5 ? 1 : n < 10 ? 2 : 3;

  return (
    <div
      className="rounded-2xl border bg-card p-5"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`}
          >
            🔥
          </span>
          <span className="text-sm font-semibold">
            {streak} day{streak === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {todayCount}/{dailyGoal} today
        </span>
      </div>
      <div
        className="mt-4 grid gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date}: ${c.count} review${c.count === 1 ? "" : "s"}`}
            className="aspect-square rounded-[3px]"
            style={{
              backgroundColor: [
                "var(--secondary)",
                "color-mix(in oklch, var(--primary) 30%, transparent)",
                "color-mix(in oklch, var(--primary) 60%, transparent)",
                "var(--primary)",
              ][level(c.count)],
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((l) => (
          <div
            key={l}
            className="size-2.5 rounded-[2px]"
            style={{
              backgroundColor: [
                "var(--secondary)",
                "color-mix(in oklch, var(--primary) 30%, transparent)",
                "color-mix(in oklch, var(--primary) 60%, transparent)",
                "var(--primary)",
              ][l],
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace streak card in dashboard**

Open `src/app/(app)/page.tsx`. Add `ReviewHeatmap` to the import from ui-kit (line 8):

```ts
import { CardCover, ProgressBar, ProgressRing, ReviewHeatmap, StatTile } from "@/components/ui-kit";
```

Find the streak card block (~lines 305–341). It starts with:
```tsx
<div
  className="rounded-2xl border bg-card p-5"
  style={{ boxShadow: "var(--shadow-soft)" }}
>
  <div className="flex items-center justify-between">
    <h2 className="text-sm font-semibold">Daily streak</h2>
```

And ends with the closing `</div>` that matches it (~line 341).

Replace that entire block with:
```tsx
<ReviewHeatmap
  reviews={reviews ?? []}
  streak={streak}
  todayCount={todayCount}
  dailyGoal={DAILY_GOAL}
/>
```

The `Flame` and `Target` imports from lucide-react (line 2) can be removed if they're now unused — check with `tsc`. The `ProgressBar` import may also become unused if the only remaining usage was the streak card's daily goal bar — verify before removing.

- [ ] **Step 3: Verify build**

Run:
```bash
cd ~/Projects/study-sessions && npx tsc --noEmit && npm run build
```
Expected: Both pass. If unused imports cause errors, remove them.

- [ ] **Step 4: Verify in browser**

Run:
```bash
cd ~/Projects/study-sessions && npm run dev
```

Open the dashboard in a browser (sign in required). Verify:
- Heatmap renders in the right rail where the streak card was
- Streak count and today's goal show in the header
- Cells show intensity (may be all empty if no recent reviews — that's correct)
- Dark mode: toggle theme, verify heatmap colors adapt
- Mobile (375px): verify heatmap doesn't overflow

- [ ] **Step 5: Commit**

```bash
git add src/components/ui-kit.tsx src/app/\(app\)/page.tsx
git commit -m "Review heatmap: 12-week activity grid replaces streak card on dashboard"
```

---

### Task 4: Mastery Trend Sparkline

**Files:**
- Modify: `src/components/ui-kit.tsx` (extract `Sparkline` from analytics page)
- Modify: `src/app/(app)/sessions/[id]/analytics/page.tsx` (import `Sparkline` from ui-kit)
- Create: `src/app/api/snapshot/route.ts` (snapshot writer)
- Create: `src/components/snapshot-trigger.tsx` (fire-and-forget client component)
- Modify: `src/app/(app)/page.tsx` (fetch snapshots, render sparkline, mount trigger)

**Interfaces:**
- Produces: `Sparkline` component from `@/components/ui-kit`. Props: `pts: { pct: number }[]`, plus optional `className`
- Produces: `POST /api/snapshot` — upserts today's mastery snapshot, returns `{ ok: true }`
- Produces: `SnapshotTrigger` client component from `@/components/snapshot-trigger`. No props. Fires POST on mount.
- Consumes: `mastery_snapshots` table (migration must be run first)

**Context for the implementer:**

The `Sparkline` component is currently a file-local function in `src/app/(app)/sessions/[id]/analytics/page.tsx` (lines 17–39). It renders an SVG area chart. Extract it to `ui-kit.tsx` so both the analytics page and dashboard can use it.

The migration SQL (provided in the design spec at `docs/superpowers/specs/2026-08-09-study-intelligence-design.md`) must be run by the human in Supabase SQL editor **before** this task is deployed. The implementer should verify the table exists before testing.

The snapshot trigger is a tiny client component because server components can't fire side-effect fetches. It runs `fetch('/api/snapshot', { method: 'POST' })` once on mount and ignores the result.

**IMPORTANT:** Before writing any API route, read `node_modules/next/dist/docs/01-app/03-api-reference/05-next-config-js/serverExternalPackages.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/` for current Next.js 16 route handler patterns.

- [ ] **Step 1: Extract Sparkline to ui-kit.tsx**

Open `src/components/ui-kit.tsx` and add before the `ReviewHeatmap` component (or at the end, order doesn't matter):

```tsx
/** Micro area chart for trends. Used for exam accuracy and mastery trends. */
export function Sparkline({
  pts,
  className = "",
}: {
  pts: { pct: number }[];
  className?: string;
}) {
  if (pts.length < 2) return null;
  const w = 320,
    h = 80,
    pad = 8;
  const xs = pts.map((_, i) =>
    pts.length > 1 ? pad + (i * (w - 2 * pad)) / (pts.length - 1) : w / 2
  );
  const ys = pts.map((p) => h - pad - p.pct * (h - 2 * pad));
  const line = xs
    .map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${h} L${xs[0].toFixed(1)} ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-20 w-full max-w-[320px] ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r="3"
          fill="var(--primary)"
          stroke="var(--card)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Update analytics page to import shared Sparkline**

Open `src/app/(app)/sessions/[id]/analytics/page.tsx`.

Remove the local `Sparkline` function (lines 17–39).

Update the import from ui-kit (line 6):
```ts
import { PageHeader, ProgressRing, Sparkline, StatTile } from "@/components/ui-kit";
```

- [ ] **Step 3: Verify analytics page still builds**

Run:
```bash
cd ~/Projects/study-sessions && npx tsc --noEmit
```
Expected: PASS. The analytics page's `<Sparkline pts={trend.pts} />` call (line 209) matches the extracted component's interface.

- [ ] **Step 4: Create snapshot API route**

Create `src/app/api/snapshot/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { count: total } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true });

  const { count: mastered } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .gte("reps", 2);

  await supabase.from("mastery_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: new Date().toLocaleDateString("en-CA"),
      total_cards: total ?? 0,
      mastered_cards: mastered ?? 0,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create snapshot trigger client component**

Create `src/components/snapshot-trigger.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function SnapshotTrigger() {
  useEffect(() => {
    fetch("/api/snapshot", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
```

- [ ] **Step 6: Add sparkline and trigger to dashboard**

Open `src/app/(app)/page.tsx`.

Add imports:
```ts
import { CardCover, ProgressBar, ProgressRing, ReviewHeatmap, Sparkline, StatTile } from "@/components/ui-kit";
import { SnapshotTrigger } from "@/components/snapshot-trigger";
```

In the `Promise.all` data-fetching block (starts ~line 19), add one more query:
```ts
supabase
  .from("mastery_snapshots")
  .select("snapshot_date, total_cards, mastered_cards")
  .eq("user_id", auth.claims.sub as string)
  .order("snapshot_date", { ascending: true })
  .limit(14),
```

Destructure the result alongside the existing ones (add `{ data: snapshots }` to the destructuring array).

In the JSX, find the "Overall mastery" card (~line 274). Inside, after the `</ProgressRing>` closing tag and the motivational `<p>` (~line 293), insert:

```tsx
{(() => {
  const pts = (snapshots ?? []).map((s) => ({
    pct: s.total_cards ? s.mastered_cards / s.total_cards : 0,
  }));
  return pts.length >= 2 ? (
    <Sparkline pts={pts} className="mx-auto mt-4" />
  ) : null;
})()}
```

At the very end of the `<main>` JSX (before the closing `</main>` tag), add:
```tsx
<SnapshotTrigger />
```

- [ ] **Step 7: Verify build**

Run:
```bash
cd ~/Projects/study-sessions && npx tsc --noEmit && npm run build
```
Expected: Both pass. If the `mastery_snapshots` table migration hasn't been run yet, the build will still pass (Supabase client doesn't type-check table names at build time) but runtime queries will 404. The migration must be run before deploying.

- [ ] **Step 8: Verify in browser**

Run:
```bash
cd ~/Projects/study-sessions && npm run dev
```

Open the dashboard. Verify:
- No console errors from the snapshot fetch (Network tab: POST `/api/snapshot` → 200)
- If migration was run: sparkline appears below the mastery ring after a page reload (first load creates the first snapshot; second load has 1 point → hidden; subsequent days populate)
- If migration NOT run: POST returns an error but the page still renders fine (fire-and-forget)
- Dark mode: sparkline uses `var(--primary)` colors, adapts automatically

- [ ] **Step 9: Commit**

```bash
git add src/components/ui-kit.tsx src/components/snapshot-trigger.tsx src/app/api/snapshot/route.ts src/app/\(app\)/page.tsx src/app/\(app\)/sessions/\[id\]/analytics/page.tsx
git commit -m "Mastery trend: daily snapshot + sparkline on dashboard mastery card"
```

---

## Post-Completion Checklist

After all 4 tasks are done:

- [ ] Run full build: `npx tsc --noEmit && npm run build`
- [ ] Run dev server and verify all 4 features visually (sign in required)
- [ ] Check dark mode for all new UI elements
- [ ] Check mobile (375px) for heatmap overflow
- [ ] Verify `mastery_snapshots` migration was run (POST `/api/snapshot` returns 200)
- [ ] Verify no console errors on dashboard, analytics, and review pages
