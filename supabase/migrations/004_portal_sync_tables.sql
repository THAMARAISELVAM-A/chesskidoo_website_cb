-- 004_portal_sync_tables.sql
-- Creates the three optional cross-device sync tables the LMS portal
-- (public/lms) expects on project vseombfkrvpffnpgbsnk. Without them the
-- portal silently falls back to localStorage (per-device only).
--
-- HOW TO APPLY: open the Supabase dashboard for project vseombfkrvpffnpgbsnk
-- -> SQL Editor -> paste this whole file -> Run.
-- (Safe to re-run: everything is IF NOT EXISTS / OR REPLACE style.)

create extension if not exists pgcrypto;

-- ── Admin/coach/student to-do lists (public/lms/js/productivity.js) ──────────
create table if not exists public.productivity_tasks (
  id         uuid primary key default gen_random_uuid(),
  text       text not null default '',
  priority   text,
  completed  boolean not null default false,
  -- students.id values are uuids but coach ids are text ('c_yogesh'), and the
  -- admin list uses NULL — keep this as text so every caller works.
  student_id text,
  created_at timestamptz not null default now()
);

-- ── Sticky notes, one row per owner (upsert on student_id) ───────────────────
create table if not exists public.productivity_notes (
  id         uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  notes      text not null default '',
  updated_at timestamptz not null default now()
);

-- ── Scheduled meetings widget ────────────────────────────────────────────────
create table if not exists public.scheduled_meetings (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  platform   text,
  "time"     timestamptz,
  link       text,
  attendee   text,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The LMS talks to PostgREST with the anon key + its own signed-token auth
-- layer (same model as the existing students/coaches tables on this project),
-- so the policies mirror that: anon may read/write.
alter table public.productivity_tasks  enable row level security;
alter table public.productivity_notes  enable row level security;
alter table public.scheduled_meetings  enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'productivity_tasks' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.productivity_tasks
      for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'productivity_notes' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.productivity_notes
      for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'scheduled_meetings' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.scheduled_meetings
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.productivity_tasks  to anon, authenticated;
grant select, insert, update, delete on public.productivity_notes  to anon, authenticated;
grant select, insert, update, delete on public.scheduled_meetings  to anon, authenticated;

-- Ask PostgREST to reload its schema cache so the new tables are visible
-- immediately (otherwise it can take up to a few minutes).
notify pgrst, 'reload schema';
