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

Follow **[SETUP.md](SETUP.md)** — a click-by-click guide (Supabase → Gemini key → Vercel)
with a checkpoint after every step. No custom SMTP and no email-template editing needed:
the app handles Supabase's default magic-link emails.

To allow the second user later: run `insert into allowed_emails values ('their@email');`
in the Supabase SQL Editor and add the address to `ALLOWED_EMAILS` (locally and on Vercel).

## Phase 1 verification checklist (run after cloud setup)

- [ ] Sign in with an allowlisted email via magic link on the deployed URL
- [ ] A non-allowlisted email is rejected (signup trigger raises)
- [ ] RLS probe: second user cannot select another user's rows
- [ ] Vercel → Cron Jobs shows a successful `/api/keepalive` run
