# Design pass — anti-AI-slop

Branch `design-pass-anti-slop`, six commits off `main` (`e0490db`).
Tools: Impeccable 3.9.1 (`audit`, `critique` ×2 targets, bundled detector), Humanizer 3.0.0, puppeteer-core.

**Headline:** the landing page read as AI-generated; the app UI did not. That split drove every decision here. The app's design system is genuinely good — named utilities, semantic shadow tokens, a global focus ring, a global reduced-motion reset — and the landing page used almost none of it.

---

## 1. Before / after

Full-page captures, both themes, 1440px and 375px, in `docs/design-pass/`.

| | Before | After |
|---|---|---|
| Landing, dark, 1440 | `before/1440-landing-dark.png` | `after/1440-landing-dark.png` |
| Landing, light, 1440 | `before/1440-landing.png` | `after/1440-landing.png` |
| Landing, dark, 375 | `before/375-landing-dark.png` | `after/375-landing-dark.png` |
| Study view `/demo`, dark | `before/1440-demo-dark.png` | `after/1440-demo-dark.png` |
| Digest `/demo/[slug]`, dark | `before/1440-demo-wiki-dark.png` | `after/1440-demo-wiki-dark.png` |
| Login, dark | `before/1440-login-dark.png` | `after/1440-login-dark.png` |

Same set exists at 375 and in light for every screen.

**Caveat on the baseline.** The light `before/` captures are the true pre-pass state. The dark `before/*-dark.png` were taken *after* the accessibility commit, because I only discovered partway through that the app defaults to dark and that my capture harness was rendering light. The accessibility commit changed no layout, type, spacing or colour token, so they are a faithful visual baseline for the visual pass — but they are not byte-zero, and I would rather say so than let you assume otherwise.

### Measured, across 4 pages × 2 themes × 2 widths

| Metric | Before | After |
|---|---|---|
| WCAG contrast failures (rendered) | 4 | **0** |
| Standalone targets under 24×24 (WCAG 2.5.8) | 2 distinct | **0** |
| Unintended overflow | 1 | **0** |
| Distinct border-radius, landing | 8 | **4** |
| Distinct border-radius, `/demo` | 6 | **4** |
| Detector findings, rendered landing | 15 | **0** |
| Heading-level skips | 0 | 0 |
| Horizontal page scroll at 375 | none | none |

Remaining flagged-but-exempt: 30 sub-24px hits, all `(p. N)` citation links inline in sentences (2.5.8 has an explicit inline exception); 94 overflow hits, all one `truncate` component doing deliberate ellipsis.

---

## 2. Every finding

### Fixed

| Finding | Where | Commit |
|---|---|---|
| 29 semantic colour call sites had no `dark:` variant — 2.57–3.57:1 against `--card` where 4.5:1 is required, in the core study loop, in the theme the app defaults to | `review-client`, `uploader`, `file-list`, `analytics`, `teach-client`, `quiz-client`, `compile-button`, `cards-button`, `plan-form`, `study-plan-form` | `f421590` |
| Flip-card caption 3.90:1 / 3.95:1 at 12px | `landing-demos.tsx:35` | `f421590` |
| Flip card's `aria-label` overrode its contents, so screen readers heard "Reveal answer" and never the question or answer | `landing-demos.tsx:12` | `f421590` |
| Quiz answer hidden with `opacity-0` alone — present in the a11y tree and findable with Cmd-F before answering | `landing-demos.tsx:90` | `f421590` |
| Brand link (124×20) and back link (113×18) below the 24×24 AA minimum, standalone, no inline exception | `demo/page.tsx`, `demo/[slug]/page.tsx` | `f421590` |
| Second `<h1>` — `MarkdownView` only overrode `a`, so compiled `# ` headings rendered an h1 inside a page that had one | `markdown-view.tsx:83` | `f421590` |
| Unbreakable filename overran the digest title by 14px at 375 | `demo/[slug]/page.tsx:59` | `f421590` |
| Amber hero blob had no dark variant — composited to a murky olive smear behind both CTAs at 375 | `landing.tsx:84` | `99c14cb` |
| Remaining blob clipped into a hard-edged rectangle by `overflow-hidden` — a blur rendered as a box | `landing.tsx:80` | `99c14cb` |
| `stroke="#a5b4fc"` hardcoded: 1.88:1 on light (invisible), 9.59:1 on dark (brighter than the word it underlines) | `landing.tsx:105` | `99c14cb` |
| Every mid-level `h2` at 24px under a 48px h1 over 14–16px body — a 2× jump with nothing between | `landing.tsx` ×4 | `257746b` |
| Stat numbers at `text-2xl`, identical to the h2 100px above them | `landing.tsx:210` | `257746b` |
| Five of six sections centred — one axis for the whole scroll | `landing.tsx` | `257746b` |
| Constant `pb-20` everywhere, measured `[80,80,80,80,80,96]` | `landing.tsx` | `257746b` |
| `--shadow-soft` was a *dark* shadow in both themes, so depth painted nothing on dark; cards separated only by a 1.11:1 surface step and a 1.27:1 border | `globals.css:108` | `318f17d` |
| `--radius-3xl` undefined, so `rounded-3xl` fell to Tailwind's 24px while `rounded-2xl` was 21.6px; `card-soft`/`card-tint` hardcoded a third value | `globals.css` | `318f17d` |
| Em-dash as the universal connector — 15 in the landing's body text, same shape through empty states, subtitles, errors, loading copy | 20 files | `59f083d`, `e1c2c5f` |
| Demo chat invented a cause for every failure ("The demo is popular right now") | `demo-chat.tsx:83` | `e1c2c5f` |
| File-list delete invisible to keyboard focus — `opacity-0` suppresses the global focus ring too | `file-list.tsx:88` | `e1c2c5f` |

### Deferred — real, deliberately not done

| Finding | Why deferred |
|---|---|
| **Geist is the typeface.** The detector's `overused-font` rule, and the single strongest remaining tell: it is what `create-next-app` scaffolds, and this deploys on Vercel. | Typeface is brand identity with a page-wide blast radius. Your call, not a pass-level cleanup. Recommendation below. |
| **The `0 / 100% / $0` stat trio.** Impeccable's hero-metric template verbatim, nested inside a card (two explicit bans), contradicting `PRODUCT.md`'s own anti-reference "Corporate SaaS dashboard: hero metrics". | The copy can survive as running text or label:value pairs on a baseline; the tile component cannot. That is a structural change and you asked me to preserve structure. Numbers dropped to `text-lg` so they stop competing with the heading. |
| **Quiz locks permanently on a wrong answer** (`landing-demos.tsx:71`). Hands a stressed student a miniature of the exam they fear, then bolts the door — inside the section meant to build confidence. | One line, but it changes product behaviour, not presentation. |
| **Exam countdown turns red at 7 days** (`exam-countdown.tsx:74`). `PRODUCT.md:57-58` bans "urgency mechanics" and "red badges screaming for attention". | Whether proximity should be signalled at all is a product call. Note: the accessibility commit gave that red a `dark:` variant, so it is now *more* legible in dark than before. |
| **Ingest/compile wait has no progress signal.** `uploader.tsx:67` documents runs up to 300s; the user-facing state is a disabled label plus a 4s-polled chip. The first value moment of the product has the thinnest feedback in it. | Additive feature work, not a design pass. |
| **Wiki index is an unfiltered wall** — 67 items on the live demo sample, no search or grouping. | Needs a filter control; additive. |
| **Review grade POST has no `res.ok` check or catch** (`review-client.tsx:91`). A failed save is silent and permanent; local and server state diverge. | A correctness bug, and you scoped me out of data fetching. **Flagging loudly — this is the most-clicked control in the product.** |
| **Three consecutive 3-across card grids** on the landing. | Removing the repetition means restructuring three sections. |
| **CTA slab is the brightest object on the dark page**, and its button is dark-on-light while every other primary is light-on-dark. | Worth doing; needs a colour decision from you about how loud the close should be. |
| 14 pre-existing `react-hooks` lint errors | Verified identical on `main`. Not mine, not UI. |

### Rejected — detector findings that were false positives

| Finding | Disqualifying evidence |
|---|---|
| `bounce-easing` ×3 | `animate-bounce` appears 0× in `src/` and 0× in every rendered HTML dump. It exists only because `@import "tw-animate-css"` ships the utility and its keyframes into the bundle. Dead library CSS. |
| `numbered-section-markers` | "10, 11, 12" are page-range citations (`p. 12 – 17`). 50 en-dash page ranges in the file; zero `01/02/03` display markers. The product's provenance feature, pattern-matched as scaffolding. |
| `overused-font` ×8 (Geist Mono) | Declared via `next/font/google` and exposed as `--font-mono`, but applied to **zero** elements on the page. A real finding for Geist Sans; noise for Mono. Worth deleting the unused download on its own merits. |
| 7 sub-24px "touch targets" per wiki page | The `(p. N)` links sit inside sentences with real text nodes either side. WCAG 2.5.8 exempts inline targets. |
| A 1.06:1 "white on white" heading, plus five 1.41:1 failures | My own harness bug, not the product's. See §5. |

---

## 3. Check by hand before shipping

1. **Sign in and walk the authenticated screens in dark.** I could not reach them — sign-in is magic-link only, so no session is obtainable without sending mail and reading the inbox. Every authenticated finding here is source-derived. The dark-variant colour work in `f421590` touches 32 call sites across review, upload, analytics, teach, quiz and plan; the ratios are measured from tokens, but nobody has *looked* at those screens.
2. **The review grade buttons specifically** — they changed colour and border in dark, and they are the control you touch most.
3. **File list, keyboard only.** Tab to a row's delete button and confirm it is now visible on focus.
4. **The digest page heading order.** Markdown headings shifted down one level; the size classes shifted with them so it should look identical. Confirm on a digest with deep nesting (h4/h5 now land where h3/h4 did).
5. **Both themes on a real phone.** I tested at 375 in a headless viewport, which is not the same as a device.
6. `.shots.mjs` in the repo root still signs in by clicking a profile button — that predates the magic-link migration and no longer works. It will mislead the next person.

---

## 4. What still reads as AI-generated

The honest list. This pass moved the landing page from "obviously generated" to "competently built", not to "distinctive".

1. **The typeface.** Geist on a Vercel deploy is the single loudest remaining signal, and nothing else on the page compensates — the only imagery is one blurred circle. Whatever else you do, changing this buys the most. A display serif for headings against a neutral sans for body (Instrument Serif, Newsreader or Fraunces over Inter or the system stack) would move it furthest, because it introduces a contrast axis the page currently has none of. Staying all-sans is fine too; almost anything but Geist.
2. **The composition is still one idea repeated.** Three consecutive three-across card rows, each card an icon-in-a-rounded-square above a heading above two lines of body. I left-aligned it and gave it a type step, so it is no longer *flat*, but the underlying rhythm is unchanged. Real art direction means some sections not being a card grid.
3. **The stat trio is still the hero-metric template**, and it is still addressed to an engineer evaluating architecture ("0 vector databases", "$0 monthly running cost") at the exact scroll position where a student decides whether to commit. `PRODUCT.md` says the only audience is two stressed students.
4. **The close still shouts.** A full-width bright slab after ~4300px of near-black, on a product whose third design principle is "calm under pressure, no urgency mechanics". It is the loudest moment on the page and it is the last thing you see.
5. **The hero still has no image.** One CSS circle behind centred text is the text-only-plus-decoration pattern. The product's own best asset — real compiled output from a real deck — appears once, in the demo section, and that section is the only part of the page a generator could not have produced.
6. **The page still doesn't use its own design system.** I fixed the radius ramp and the shadows, but `section-gap` is still used by no file in the project, and the landing still hand-rolls `hover:-translate-y-0.5 active:scale-95` where `btn-squish` exists. The landing and the app still read as cousins.
7. **Two stale comments now describe a world that doesn't exist**: `globals.css:6-8` says the app is "committed-light" and `.dark` is "never rendered" (`layout.tsx:35` adds it); `ui-kit.tsx:491` says two users share one password (magic links replaced that). Both will mislead whoever edits next — that is how I lost an hour on the default theme.

---

## 5. What went wrong in this pass

Reported because you asked for it.

- **My contrast probe produced five confident, wrong failures.** It parsed `getComputedStyle().color` with a regex; modern engines return `oklab(0.999994 … / 0.7)`, which the regex read as `rgb(1, 0, 0)`. It also ignored `background-image`, so gradient-backed sections resolved to the page background and invented a 1.06:1 "white on white" heading. Caught by hand-checking one value. Rewritten to resolve every colour through a 1×1 canvas, which composites any colour space and alpha correctly.
- **My audit harness never tested light mode.** It set `localStorage.theme` *after* navigating, so each page loaded in the previous iteration's theme, and headless Chrome defaulted to dark. Fixed with `evaluateOnNewDocument` plus an assertion that the painted theme matches the requested one. Every number in this report comes from the corrected run.
- **I overwrote a tracked file.** `.claude/launch.json` already existed with a working entry; I created one over it with a shell heredoc without checking, then `rm`'d it when the harness rejected my config name. Restored with `git checkout --`.
- **I edited files while a review agent was reading them.** The first study-view critique flagged the churn and then died on a rate limit. Relaunched; afterwards I held edits to files outside the running agent's scope.
- **The 21st.dev MCP was not connected** — no tools resolved. Nothing needed it: the audit found no component that was structurally weak rather than badly styled. Had one turned up, I would have hand-written it, per your instruction.
- **One critique ran on Sonnet, not Opus**, after the Opus session limit was hit.
