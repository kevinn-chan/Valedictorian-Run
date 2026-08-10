# Roadmap "Now" Tier — Items 1–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 5 highest-impact improvements from the session-10 roadmap: dark mode, review summary, swipe-to-grade, landing page polish, and global keyboard shortcuts.

**Architecture:** Each item is an independent task touching its own files (minimal overlap). Dark mode is the foundation — it changes the CSS token system — so it runs first. The remaining 4 are independent and can execute in any order. All changes are CSS-first with minimal new components.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 (CSS-first config, `@import "tailwindcss"`), TypeScript, Lucide icons.

## Global Constraints

- **Authorship:** every commit authored solely by `kevinn-chan <chankangle.kevin@gmail.com>`. Zero `Co-Authored-By` headers, zero mentions of Claude as author. Verify: `git log -1 --format='%B' | grep -ci 'co-authored\|claude'` → 0.
- **No new dependencies** unless absolutely unavoidable. CSS/Tailwind preferred.
- **Tailwind v4** — no `tailwind.config.ts`. Config is CSS-first in `globals.css` via `@theme inline` and `@custom-variant`. Check `postcss.config.mjs` (`@tailwindcss/postcss` plugin).
- **Next.js 16** has breaking changes vs training data. Check `node_modules/next/dist/docs/` before using unfamiliar APIs.
- **Build gate:** `tsc --noEmit` and `npm run build` must both pass after every task.
- **HANDOFF.md is untracked** — never `git add` it.
- **Ponytail mode:** shortest working diff. No unrequested abstractions.
- **Semantic colors preserved:** red (Again/destructive), amber (warning), green (Easy/positive), orange (streak flame) must NOT change for dark mode — they encode meaning, not brand.
- **`prefers-reduced-motion`** is already respected globally in `globals.css` — new animations must use CSS transitions/keyframes (not JS timers) so the existing `reduce` media query covers them.

---

### Task 1: Dark Mode

**Files:**
- Modify: `src/app/globals.css` (add `.dark` token set, change `@custom-variant dark`)
- Modify: `src/app/layout.tsx` (add theme script to prevent FOUC)
- Create: `src/components/theme-toggle.tsx` (client component — toggle button)
- Modify: `src/components/sidebar.tsx` (add theme toggle to sidebar + mobile bar)
- Modify: `src/app/(app)/landing.tsx` (convert hardcoded indigo/white to CSS vars)
- Modify: `src/app/(app)/landing-demos.tsx` (convert hardcoded colors to CSS vars)

**Interfaces:**
- Produces: `ThemeToggle` React client component (no props), `toggleTheme()` internal function.
- Produces: CSS custom properties under `.dark` class on `<html>`, readable by all components.

**Context for the implementer:**

The app currently has `@custom-variant dark (&:is(.dark *));` which was set up to BLOCK dark mode — `.dark` is never rendered, so `dark:` utilities are dead. We need to:
1. Change the variant so `.dark` on `<html>` enables it
2. Add a `.dark` token set with dark palette values
3. Add a toggle that sets/reads `localStorage` + toggles the `.dark` class
4. Add a blocking `<script>` in `<html>` to read localStorage before paint (prevents FOUC)
5. Convert the landing page's ~26 hardcoded `bg-white`/`text-indigo-*`/`border-indigo-*` references to use CSS custom properties or dark-mode-aware equivalents

The landing page (`landing.tsx`) is a **server component** rendered inside the `(app)` layout. It renders when the user is NOT signed in (see `page.tsx:13` — `if (!auth?.claims) return <Landing />`). The landing uses hardcoded Tailwind indigo scale colors (e.g. `bg-indigo-600`, `text-indigo-950`, `border-indigo-100`, `bg-white`) instead of the app's CSS token system. These need to be converted to use the token system (`bg-card`, `text-foreground`, `border-border`, etc.) or given `dark:` overrides.

The `landing-demos.tsx` has the same issue — `FlipCard` and `MiniQuiz` use hardcoded `bg-white`, `text-indigo-*`, `border-indigo-200` etc.

**Current `:root` tokens** (in `globals.css`):
- `--background: #f7f8ff` (light lavender)
- `--foreground: #1e1b4b` (indigo-950)
- `--card: #ffffff`
- `--primary: #4f46e5` (indigo-600)
- `--secondary: #e0e7ff` (indigo-100)
- `--muted: #eef2ff`
- `--border: #dcdefa`
- Plus sidebar-specific tokens

**Dark palette** should be the periwinkle's dark counterpart — deep indigo backgrounds, light text, muted borders. Reference the artifact roadmap's dark palette for the periwinkle scheme:
- `--background: ~#0f0e1a` (very dark indigo)
- `--foreground: ~#e8e5f5` (light lavender text)
- `--card: ~#1a1830` (dark card surface)
- `--primary: ~#818cf8` (indigo-400 — brighter for dark bg contrast)
- `--secondary: ~#252240` (dark indigo surface)
- `--muted: ~#1e1b35`
- `--border: ~#2e2a48`
- Etc. Tune for WCAG AA contrast (4.5:1 text, 3:1 UI elements).

- [ ] **Step 1: Add dark token set to globals.css**

In `src/app/globals.css`, change the `@custom-variant dark` line and add a `.dark` block:

```css
/* Replace this line: */
@custom-variant dark (&:is(.dark *));

/* With: */
@custom-variant dark (&:where(.dark, .dark *));
```

Then add after the `:root { ... }` block:

```css
.dark {
  color-scheme: dark;
  --shadow-soft: 0 10px 36px -14px oklch(0.2 0.08 280 / 0.4);
  --shadow-soft-hover: 0 16px 44px -14px oklch(0.2 0.08 280 / 0.5);
  --background: #0f0e1a;
  --foreground: #e8e5f5;
  --card: #1a1830;
  --card-foreground: #e8e5f5;
  --popover: #1a1830;
  --popover-foreground: #e8e5f5;
  --primary: #818cf8;
  --primary-foreground: #0f0e1a;
  --secondary: #252240;
  --secondary-foreground: #c4b5fd;
  --muted: #1e1b35;
  --muted-foreground: #9992b3;
  --accent: #252240;
  --accent-foreground: #c4b5fd;
  --destructive: #ef4444;
  --border: #2e2a48;
  --input: #2e2a48;
  --ring: #818cf8;
  --sidebar: #161428;
  --sidebar-foreground: #e8e5f5;
  --sidebar-primary: #818cf8;
  --sidebar-primary-foreground: #0f0e1a;
  --sidebar-accent: #252240;
  --sidebar-accent-foreground: #c4b5fd;
  --sidebar-border: #2e2a48;
  --sidebar-ring: #818cf8;
}
```

Also update `::selection` to work in dark mode:

```css
/* Change the existing ::selection rule to: */
::selection {
  background: oklch(0.54 0.17 280 / 0.18);
}
.dark ::selection {
  background: oklch(0.54 0.17 280 / 0.30);
}
```

- [ ] **Step 2: Create the theme toggle component**

Create `src/components/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      <span className="min-w-0 flex-1 truncate">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
```

- [ ] **Step 3: Add FOUC-prevention script to root layout**

In `src/app/layout.tsx`, add a blocking inline script inside `<html>` before `<body>`. This reads `localStorage` before first paint:

```tsx
<html
  lang="en"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
  suppressHydrationWarning
>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
      }}
    />
  </head>
  <body className="min-h-full flex flex-col">{children}</body>
</html>
```

Note: `suppressHydrationWarning` on `<html>` is needed because the script may add the `dark` class before React hydrates, causing a mismatch.

- [ ] **Step 4: Add theme toggle to sidebar and mobile bar**

In `src/components/sidebar.tsx`:

Import `ThemeToggle`:
```tsx
import { ThemeToggle } from "./theme-toggle";
```

In the `Sidebar` component, add `<ThemeToggle />` inside the bottom `<div>` before `ProfileSwitcher`:
```tsx
<div className="space-y-1 border-t border-sidebar-border p-3">
  <ThemeToggle />
  <ProfileSwitcher ... />
  ...
</div>
```

In the `MobileBar` component, add a compact theme toggle button in the header's right-side `<div>`, before the `ProfileSwitcher`. Import and use a minimal inline version — or reuse `ThemeToggle` with the same styling as the existing mobile buttons:

```tsx
{/* inside the <div className="flex items-center gap-1"> in MobileBar */}
<ThemeToggle />
```

But `ThemeToggle` uses the sidebar styling. For mobile, the component should render with appropriate mobile styling. The simplest approach: make `ThemeToggle` accept an optional `compact` prop:

```tsx
export function ThemeToggle({ compact }: { compact?: boolean }) {
  // ... same state/effect/toggle logic ...

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    );
  }

  return ( /* existing full-width version */ );
}
```

Then in `MobileBar`:
```tsx
<ThemeToggle compact />
```

- [ ] **Step 5: Convert landing page hardcoded colors**

In `src/app/(app)/landing.tsx`, replace hardcoded Tailwind color classes with token-based equivalents. Key mappings:

| Hardcoded | Token replacement |
|-----------|-------------------|
| `bg-[#F7F8FF]` | `bg-background` |
| `bg-white` | `bg-card` |
| `text-indigo-950` | `text-foreground` |
| `text-indigo-900/70` | `text-muted-foreground` |
| `text-indigo-600` | `text-primary` |
| `bg-indigo-600` | `bg-primary` |
| `text-white` (on indigo bg) | `text-primary-foreground` |
| `border-indigo-100` | `border-border` |
| `border-indigo-200` | `border-border` |
| `bg-indigo-100` | `bg-secondary` |
| `text-indigo-500` | `text-muted-foreground` |
| `bg-indigo-200/50` (hero blob) | `bg-primary/15` |
| `bg-amber-200/40` (hero blob) | keep as-is (decorative) |
| `hover:bg-indigo-700` | `hover:bg-primary/90` |
| `border-indigo-400` | `border-primary/50` |
| `text-indigo-700` | `text-primary` |
| `bg-green-100` (checkmarks) | keep as-is (semantic) |
| `text-green-700` (checkmarks) | keep as-is (semantic) |
| `text-indigo-300` (icons) | `text-muted-foreground` |

Also update the gradient CTA section: `from-indigo-600 to-indigo-500` → `from-primary to-primary/90`. The white text on the gradient → `text-primary-foreground`.

The hero `shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)]` → use `shadow-[var(--shadow-soft)]` or keep but add a dark variant. Since it's only on one element, using the CSS var shadow is simpler.

The `style={{}}` attribute for `@keyframes vr-drift` can stay — it's a motion keyframe, color-independent.

Do the same conversion for `landing-demos.tsx`:
- `bg-white` → `bg-card`
- `border-indigo-200` → `border-border`
- `text-indigo-950` → `text-foreground`
- `text-indigo-500` → `text-muted-foreground`
- `bg-indigo-600` (flipped card back) → `bg-primary`
- `text-indigo-200` → `text-primary-foreground/70`
- `text-indigo-900/80` → `text-foreground/80`
- `bg-indigo-100` → `bg-secondary`
- `text-indigo-700` → `text-primary`
- `border-indigo-100` → `border-border`
- `border-indigo-400` → `border-primary/50`
- `text-indigo-300` → `text-muted-foreground`
- `bg-green-50`, `text-green-800`, `border-green-500` → keep as-is (semantic correct/wrong)
- `bg-red-50`, `text-red-700`, `border-red-400` → keep as-is (semantic)

**Shadows in landing:** The landing cards use hardcoded `shadow-[0_10px_36px_-14px_rgba(67,56,202,0.2)]` in several places. Replace with `style={{ boxShadow: "var(--shadow-soft)" }}` to match the rest of the app (already uses this pattern — see `page.tsx:194`).

- [ ] **Step 6: Verify build and test in browser**

```bash
cd ~/Projects/study-sessions
npx tsc --noEmit
npm run build
```

Start the dev server, test:
1. Landing page renders in light mode (default)
2. Click theme toggle → page goes dark, all text readable, no white-on-white or black-on-black
3. Refresh → dark mode persists (localStorage)
4. Sign in → dashboard dark mode works, sidebar dark, cards dark
5. Review page → grade buttons (red/green) still have correct semantic colors
6. Toggle back to light → everything returns to the periwinkle palette
7. Set OS to dark mode, clear localStorage → app defaults to dark on fresh load
8. Mobile viewport (375px) → theme toggle visible in mobile header, functional

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/theme-toggle.tsx src/components/sidebar.tsx src/app/\(app\)/landing.tsx src/app/\(app\)/landing-demos.tsx
git commit -m "Dark mode with periwinkle dark palette, toggle in sidebar, OS preference default"
```

Verify: `git log -1 --format='%B' | grep -ci 'co-authored\|claude'` → 0.

---

### Task 2: Review Session Summary + Streak Celebration

**Files:**
- Modify: `src/app/(app)/sessions/[id]/review/review-client.tsx` (add summary state, render summary card, track grade breakdown)

**Interfaces:**
- Consumes: existing `ReviewClient` component, existing `grade()` callback, existing streak data from dashboard
- Produces: enhanced completion screen within `ReviewClient` (no new exports)

**Context for the implementer:**

When `queue` empties (`!card` at line 125), the current code shows a simple "N cards reviewed" with a green checkmark. Replace that with a summary card showing:
- Cards reviewed count
- Grade breakdown (Again / Good / Easy counts)
- Session duration (track start time in a ref)
- A small celebration animation for streak milestones

The streak data isn't currently available in `ReviewClient` — it would require a new prop or an API call. **Ponytail decision:** don't fetch streak data. The summary shows what happened in THIS review session (grade breakdown, count, time). Adding streak would require threading data from the dashboard or a new API endpoint — skip it, add when streak celebration is specifically requested as a standalone feature.

- [ ] **Step 1: Add grade tracking and timer state**

At the top of `ReviewClient`, add:

```tsx
const [grades, setGrades] = useState({ again: 0, good: 0, easy: 0 });
const startTime = useRef(Date.now());
```

In the `grade` callback, after `setReviewed((n) => n + 1)`, add:

```tsx
setGrades((prev) => ({ ...prev, [g]: prev[g] + 1 }));
```

In the `undo` callback, after `setReviewed((n) => Math.max(0, n - 1))`, add:

```tsx
setGrades((prev) => ({ ...prev, [lastGraded.grade]: Math.max(0, prev[lastGraded.grade] - 1) }));
```

(Access `lastGraded.grade` before the `setLastGraded(null)` call — move that line after the grades update, or capture the value first.)

- [ ] **Step 2: Replace the completion screen**

Replace the `if (!card)` block (lines 125–144) with:

```tsx
if (!card) {
  const elapsed = Math.round((Date.now() - startTime.current) / 60000);
  const total = grades.again + grades.good + grades.easy;
  return (
    <div className="mt-12 flex flex-col items-center text-center animate-slide-up">
      <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
        <CheckCircle2 className="size-8 text-green-600" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        {total ? "Session complete" : "Nothing due"}
      </h2>
      {total > 0 && (
        <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-red-500/10 px-3 py-2.5">
            <p className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">{grades.again}</p>
            <p className="text-xs text-muted-foreground">Again</p>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2.5">
            <p className="text-lg font-semibold tabular-nums text-primary">{grades.good}</p>
            <p className="text-xs text-muted-foreground">Good</p>
          </div>
          <div className="rounded-xl bg-green-500/10 px-3 py-2.5">
            <p className="text-lg font-semibold tabular-nums text-green-700 dark:text-green-400">{grades.easy}</p>
            <p className="text-xs text-muted-foreground">Easy</p>
          </div>
        </div>
      )}
      {total > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {total} card{total === 1 ? "" : "s"} in {elapsed < 1 ? "under a minute" : `${elapsed} min`}
        </p>
      )}
      <Link
        href={sessionId ? `/sessions/${sessionId}` : "/"}
        className="btn-squish mt-8 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        {sessionId ? "← Back to session" : "← Home"}
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Verify build and test**

```bash
npx tsc --noEmit
npm run build
```

Test in browser:
1. Start a review session with at least 3 cards
2. Grade some Again, some Good, some Easy
3. When queue empties → summary card shows with correct breakdown
4. Time display is reasonable
5. Undo during the session correctly decrements the grade count
6. If entering review with 0 due cards → shows "Nothing due" (no breakdown)

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/sessions/\[id\]/review/review-client.tsx
git commit -m "Review session summary: grade breakdown and time on completion"
```

---

### Task 3: Swipe to Grade on Mobile

**Files:**
- Modify: `src/app/(app)/sessions/[id]/review/review-client.tsx` (add pointer-capture swipe detection)

**Interfaces:**
- Consumes: existing `grade()` callback, existing `flipped` state
- Produces: swipe gesture handling within the flashcard button (no new exports)

**Context for the implementer:**

The flashcard is a `<button>` element (line 167). We need swipe detection on it:
- Swipe left → `grade("again")`
- Swipe right → `grade("good")`
- Tap (no significant movement) → `setFlipped(f => !f)` (already handled by `onClick`)

Only activate swipe when `flipped === true` (you swipe to grade after seeing the answer). When `flipped === false`, tap flips the card — swipe should do nothing.

Use pointer events with `setPointerCapture` for reliable touch tracking. A swipe is detected when the horizontal distance exceeds a threshold (e.g. 60px) and the horizontal distance is greater than the vertical (to avoid interfering with scrolling).

Add a visual hint: a colored directional indicator during swipe (red tint for left, primary tint for right) via a `transform: translateX` on the card.

- [ ] **Step 1: Add swipe state and handlers**

Add state for tracking the swipe:

```tsx
const [swipeX, setSwipeX] = useState(0);
const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
```

Add the pointer event handlers inside the component:

```tsx
const SWIPE_THRESHOLD = 60;

function onPointerDown(e: React.PointerEvent) {
  if (!flipped) return;
  pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: React.PointerEvent) {
  if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
  const dx = e.clientX - pointerStart.current.x;
  const dy = e.clientY - pointerStart.current.y;
  // Only track horizontal swipes
  if (Math.abs(dx) > Math.abs(dy)) {
    setSwipeX(dx);
  }
}

function onPointerUp(e: React.PointerEvent) {
  if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
  const dx = e.clientX - pointerStart.current.x;
  const dy = e.clientY - pointerStart.current.y;
  pointerStart.current = null;
  setSwipeX(0);

  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    e.preventDefault();
    // Prevent the onClick from also firing
    e.stopPropagation();
    grade(dx < 0 ? "again" : "good");
  }
}

function onPointerCancel() {
  pointerStart.current = null;
  setSwipeX(0);
}
```

- [ ] **Step 2: Attach handlers to the flashcard button**

On the `<button>` element (the flashcard), add the pointer handlers and a transform style for the swipe visual:

```tsx
<button
  onClick={() => setFlipped((f) => !f)}
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerCancel}
  aria-expanded={flipped}
  className="..."
  style={{
    boxShadow: "var(--shadow-soft)",
    transform: swipeX ? `translateX(${swipeX}px) rotate(${swipeX * 0.05}deg)` : undefined,
    transition: swipeX ? "none" : "transform 300ms ease-out",
  }}
>
```

Important: the `onClick` handler must not fire after a swipe. The `stopPropagation()` in `onPointerUp` should prevent this, but if it doesn't, add a ref flag:

```tsx
const swipedRef = useRef(false);

// In onPointerUp, before calling grade:
swipedRef.current = true;

// In onClick wrapper:
onClick={() => {
  if (swipedRef.current) { swipedRef.current = false; return; }
  setFlipped((f) => !f);
}}
```

- [ ] **Step 3: Add swipe direction hint**

Add a visual overlay on the card that shows the direction during an active swipe:

```tsx
{/* Inside the <button>, at the top, before other content */}
{swipeX !== 0 && (
  <div
    className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity ${
      swipeX < -SWIPE_THRESHOLD / 2
        ? "bg-red-500/10"
        : swipeX > SWIPE_THRESHOLD / 2
          ? "bg-primary/10"
          : ""
    }`}
  />
)}
```

Also add a mobile-only hint below the card when flipped and no swipe yet:

Below the grade buttons block (the `{flipped ? (...) : (...)}` ternary), add:

```tsx
{flipped && (
  <p className="mt-2 text-center text-xs text-muted-foreground lg:hidden">
    swipe left = again · swipe right = good
  </p>
)}
```

- [ ] **Step 4: Verify build and test**

```bash
npx tsc --noEmit
npm run build
```

Test in browser at 375px mobile viewport:
1. Flip a card (tap)
2. Swipe right → grades "good", advances to next card
3. Swipe left → grades "again", card goes to back of queue
4. Short tap on flipped card → should NOT trigger swipe (just flip back if no grade buttons were clicked)
5. Vertical scroll → should NOT trigger swipe
6. Desktop mouse → buttons still work, swipe not interfering
7. Swipe shows colored tint during drag

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/sessions/\[id\]/review/review-client.tsx
git commit -m "Swipe to grade on mobile: left=again, right=good with visual feedback"
```

---

### Task 4: Landing Page Polish + Social Proof

**Files:**
- Modify: `src/app/(app)/landing.tsx` (add RAG-is-dead section, usage stats, stronger CTA)

**Interfaces:**
- Consumes: nothing new (static content)
- Produces: enhanced landing page sections (no new exports)

**Context for the implementer:**

The landing page currently has: header → hero → "Three steps" → interactive demos → "By exam day" objectives → CTA. It ends cleanly but could be stronger. The roadmap asks for:

1. A visible "RAG is dead" positioning statement — this is the LinkedIn hook, the technical thesis that makes this project interesting to engineers, not just students
2. Usage stats styled as testimonial/social-proof cards
3. A stronger bottom CTA

Do NOT add a real screenshot/mockup image — we'd need to generate one and serve it. Instead, add a "Why this works" technical credibility section with the RAG-is-dead thesis, and a stats row.

- [ ] **Step 1: Add a "Why this works" technical section**

After the interactive demo section and before the "By exam day" objectives, add a new section:

```tsx
{/* Technical thesis — the LinkedIn hook */}
<section className="mx-auto w-full max-w-5xl px-6 pb-20">
  <div className="rounded-3xl border border-border bg-card p-8 sm:p-10" style={{ boxShadow: "var(--shadow-soft)" }}>
    <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-primary">
      The thesis
    </p>
    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
      RAG is dead — compile instead
    </h2>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
      Most study tools retrieve chunks at query time, hoping the right fragment lands
      in context. We compile the entire corpus at ingest — every page becomes structured
      knowledge, every claim stamped to its source. Zero retrieval latency. Zero
      relevance tuning. Zero drift.
    </p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-secondary/50 p-5">
        <p className="text-2xl font-semibold tabular-nums text-foreground">0</p>
        <p className="mt-1 text-sm text-muted-foreground">vector databases</p>
      </div>
      <div className="rounded-2xl bg-secondary/50 p-5">
        <p className="text-2xl font-semibold tabular-nums text-foreground">100%</p>
        <p className="mt-1 text-sm text-muted-foreground">of the corpus in context</p>
      </div>
      <div className="rounded-2xl bg-secondary/50 p-5">
        <p className="text-2xl font-semibold tabular-nums text-foreground">$0</p>
        <p className="mt-1 text-sm text-muted-foreground">monthly running cost</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Strengthen the bottom CTA**

The existing CTA section is fine structurally. Update the copy to land harder and reference the thesis. Replace the existing CTA section:

```tsx
<section className="mx-auto w-full max-w-5xl px-6 pb-24">
  <div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/90 px-8 py-14 text-center shadow-[0_20px_60px_-20px_rgba(79,70,229,0.55)] dark:shadow-[0_20px_60px_-20px_rgba(129,140,248,0.3)]">
    <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground">
      Ready to run for valedictorian?
    </h2>
    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
      Two seats, zero subscriptions, zero vector databases. Your materials
      stay yours — they just learn to fight back.
    </p>
    <Link
      href="/login"
      className="mt-7 inline-block rounded-2xl bg-card px-7 py-3.5 text-base font-semibold text-primary transition hover:-translate-y-0.5 active:scale-95"
    >
      Pick your profile →
    </Link>
  </div>
</section>
```

- [ ] **Step 3: Verify build and test**

```bash
npx tsc --noEmit
npm run build
```

Test in browser:
1. Landing page loads with the new "RAG is dead" section
2. Stats cards render correctly (0, 100%, $0)
3. CTA section updated copy visible
4. Dark mode → all new sections render correctly with dark palette
5. Mobile 375px → sections stack properly, no overflow

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/landing.tsx
git commit -m "Landing page: add RAG-is-dead thesis section and strengthen CTA"
```

---

### Task 5: Keyboard Shortcuts Everywhere

**Files:**
- Create: `src/components/shortcut-overlay.tsx` (client component — cheat sheet modal)
- Create: `src/components/global-keys.tsx` (client component — global keyboard listener)
- Modify: `src/app/(app)/layout.tsx` (mount GlobalKeys)

**Interfaces:**
- Consumes: Next.js `useRouter()` for navigation, `usePathname()` for context
- Produces: `GlobalKeys` component (mounted once in layout), `ShortcutOverlay` component (rendered by GlobalKeys)

**Context for the implementer:**

The review page already handles `1/2/3/u/space` in its own `useEffect` keydown listener. The global shortcuts should NOT conflict:
- `/` → focus the search input (navigate to `/search` if not there, or focus the existing `input[name="q"]`)
- `g d` → go to dashboard (`/`)
- `g r` → go to review (`/review`)
- `?` → toggle shortcut cheat sheet overlay

The `g` prefix creates a two-key chord: press `g`, then within 500ms press the second key. If 500ms pass without a second key, reset.

The global listener should NOT fire when the user is typing in an input, textarea, or contenteditable element.

The search page's input is a server-rendered `<input name="q">` inside a `<form action="/search">`. The dashboard page (`page.tsx:129`) also has a search input. For `/` shortcut: if already on a page with a `[name="q"]` input, focus it; otherwise navigate to `/search`.

- [ ] **Step 1: Create the shortcut overlay component**

Create `src/components/shortcut-overlay.tsx`:

```tsx
"use client";

const SHORTCUTS = [
  { keys: ["Space"], desc: "Flip flashcard" },
  { keys: ["1"], desc: "Grade Again" },
  { keys: ["2"], desc: "Grade Good" },
  { keys: ["3"], desc: "Grade Easy" },
  { keys: ["u"], desc: "Undo last grade" },
  { keys: ["/"], desc: "Focus search" },
  { keys: ["g", "d"], desc: "Go to dashboard" },
  { keys: ["g", "r"], desc: "Go to review" },
  { keys: ["?"], desc: "Show this help" },
];

export function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg animate-slide-up"
        style={{ boxShadow: "var(--shadow-soft)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary">
            Esc
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.desc}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border bg-secondary px-2 py-0.5 font-sans text-xs font-medium"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the global keys component**

Create `src/components/global-keys.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShortcutOverlay } from "./shortcut-overlay";

export function GlobalKeys() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((s) => !s);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (input) {
          input.focus();
        } else {
          router.push("/search");
        }
        return;
      }

      if (e.key === "g" && !pendingG.current) {
        pendingG.current = true;
        clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          pendingG.current = false;
        }, 500);
        return;
      }

      if (pendingG.current) {
        pendingG.current = false;
        clearTimeout(gTimer.current);
        if (e.key === "d") {
          router.push("/");
        } else if (e.key === "r") {
          router.push("/review");
        }
      }
    },
    [router, showHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!showHelp) return null;
  return <ShortcutOverlay onClose={() => setShowHelp(false)} />;
}
```

- [ ] **Step 3: Mount GlobalKeys in the app layout**

In `src/app/(app)/layout.tsx`, import and render `GlobalKeys`:

```tsx
import { GlobalKeys } from "@/components/global-keys";
```

Add `<GlobalKeys />` inside the returned JSX, just before or after the `<Sidebar>`:

```tsx
return (
  <div className="flex min-h-dvh">
    <GlobalKeys />
    <Sidebar ... />
    ...
  </div>
);
```

Note: `GlobalKeys` is a client component rendered inside a server component layout — this is fine in Next.js App Router, it creates a client boundary only for itself.

- [ ] **Step 4: Verify build and test**

```bash
npx tsc --noEmit
npm run build
```

Test in browser:
1. Press `?` → overlay appears with all shortcuts listed
2. Press `Esc` or click outside → overlay closes
3. Press `/` on dashboard → search input focuses
4. Press `/` on any other page → navigates to `/search`
5. Press `g` then `d` within 500ms → navigates to dashboard
6. Press `g` then `r` → navigates to review
7. Press `g`, wait 1 second, press `d` → nothing happens (chord expired)
8. Type in a search input → shortcuts don't fire (input guard working)
9. Review page → `1/2/3/u/space` still work as before (no conflict)

- [ ] **Step 5: Commit**

```bash
git add src/components/shortcut-overlay.tsx src/components/global-keys.tsx src/app/\(app\)/layout.tsx
git commit -m "Global keyboard shortcuts: / for search, g+d/g+r navigation, ? cheat sheet"
```

---

## Post-Completion Checklist

- [ ] All 5 commits pass `tsc --noEmit` and `npm run build`
- [ ] All commits authored solely by `kevinn-chan`
- [ ] Dark mode works on landing, dashboard, review, wiki, analytics
- [ ] Review summary shows correct grade breakdown after completing a queue
- [ ] Swipe-to-grade works on mobile, doesn't break desktop mouse/keyboard
- [ ] Landing page "RAG is dead" section renders in both themes
- [ ] Keyboard shortcuts work from any page, don't fire in inputs
- [ ] HANDOFF.md NOT committed
