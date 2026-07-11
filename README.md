# ChessKidoo Academy

Online management platform for ChessKidoo — INDIA's premier chess academy.
Three portals: Admin, Coach, Student/Parent. Built with Vite + Supabase.

## Stack

- **Frontend**: Vite (multi-page), vanilla JS modules, CSS custom properties
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Auth**: Supabase Auth (email/password) with row-level security
- **Deploy**: Vercel (static) + Supabase (backend)

## Quick start

```bash
cp .env.example .env.local   # fill in your Supabase credentials
npm install
npm run dev                  # http://localhost:5173
```

## Environment variables

See `.env.example`. All client-side vars are prefixed `VITE_`.
Server-side secrets (Resend API key, service role key) live only in
Supabase Edge Function secrets — never in `.env.local` or source code.

## Database setup

1. Create a Supabase project at https://supabase.com
2. Run `supabase_setup.sql` in the SQL Editor to create all tables
3. Run `supabase/rls.sql` to enable row-level security on every table
4. Verify: every table in Table Editor → RLS should show **RLS enabled**
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`

## Project structure

```
src/
  lib/          Core utilities (auth, db, router, toast, sanitize)
  pages/        One folder per portal (admin, student, coach, arena, landing)
  components/   Reusable UI components
  styles/       CSS design tokens + per-page stylesheets
  i18n/         Translation files (en, ta)
supabase/
  migrations/   SQL DDL migrations (source of truth)
  rls.sql       Row-level security policies
  functions/    Edge Functions (send-demo-email, etc.)
assets/         Legacy static JS/CSS (being migrated to src/)
public/         Static files served as-is (images, favicon)
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview production build locally
npm run lint     # ESLint
npm run format   # Prettier
```

## Portals

| Portal  | Route      | Guard         |
|---------|------------|---------------|
| Admin   | /admin     | role: admin   |
| Coach   | /coach     | role: coach   |
| Student | /student   | role: student |
| Arena   | /arena     | authenticated |
| Landing | /          | public        |
| Login   | /login     | public        |

## Edge Functions

`supabase/functions/send-demo-email/` — handles demo booking form submissions.
Replaces the client-side EmailJS integration (keys stayed server-side).

Deploy: `supabase functions deploy send-demo-email`
Secrets: `supabase secrets set RESEND_API_KEY=re_... ACADEMY_EMAIL=...`
