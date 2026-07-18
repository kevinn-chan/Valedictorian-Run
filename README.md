# Valedictorian Run

A private, two-user study app: drop a course's files (lecture PDFs, notes, cheatsheets) into a
**session**, and it compiles them into a topic wiki, summaries, a learning plan, spaced-repetition
cue cards, and a Q&A chat that answers only from your materials — with page citations.

Docs: [PLAN.md](PLAN.md) (architecture + phases) · [PLATFORM-FACTS.md](PLATFORM-FACTS.md)
(verified platform limits) · [PRODUCT.md](PRODUCT.md) (design context).

Stack: Next.js 16 (App Router) on Vercel Hobby · Supabase Free (Postgres + Auth + Storage) ·
Gemini API free tier via the Vercel AI SDK (OpenAI Tier 3 as break-glass). Runs at $0/month.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in values (see One-time setup)
npm run dev                  # http://localhost:3000
```

## One-time cloud setup (~15 minutes)

1. **Supabase** — create a project at supabase.com (free tier):
   - SQL Editor → paste and run `supabase/migrations/0001_init.sql`
     (creates tables, RLS, the email allowlist + signup trigger, and the `session-files` bucket).
   - Auth → Email Templates → **Magic Link**: change the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
     (required by the server-side auth flow).
   - Auth → URL Configuration → set Site URL to the deployed domain (and add
     `http://localhost:3000` to redirect URLs for local dev).
   - Project Settings → API → copy URL, anon key, service-role key into env vars.
   - To allow the second user later: `insert into allowed_emails values ('their@email');`
     and add them to `ALLOWED_EMAILS`.
2. **Gemini key** — aistudio.google.com → Get API key → `GOOGLE_GENERATIVE_AI_API_KEY`.
3. **Vercel** — `npx vercel` (link project) → add all env vars from `.env.example` →
   `npx vercel --prod`. The daily keepalive cron in `vercel.json` registers on deploy
   (Settings → Cron Jobs to confirm) and prevents Supabase's 7-day inactivity pause.

## Phase 1 verification checklist (run after cloud setup)

- [ ] Sign in with an allowlisted email via magic link on the deployed URL
- [ ] A non-allowlisted email is rejected (signup trigger raises)
- [ ] RLS probe: second user cannot select another user's rows
- [ ] Vercel → Cron Jobs shows a successful `/api/keepalive` run
