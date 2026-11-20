-- 008_student_status_history.sql
-- Implements time-based student Active/Inactive status tracking.
--
-- Business logic:
--   A student's status must be evaluated PER MONTH, not by a single
--   "current status" column. When a student is marked Inactive, fee
--   generation stops from that effective month; when re-activated, fees
--   resume from the new effective month. Historical fee records are
--   NEVER deleted or backfilled.
--
-- HOW TO APPLY: open the Supabase dashboard -> SQL Editor -> paste this file -> Run.
-- (Safe to re-run: IF NOT EXISTS / OR REPLACE style.)

create extension if not exists pgcrypto;

-- ── Student status timeline ───────────────────────────────────────────────────
create table if not exists public.student_status_history (
  id            uuid primary key default gen_random_uuid(),
  student_id    text not null,
  status        text not null check (status in ('active', 'inactive')),
  effective_month text not null,              -- e.g. '2024-08'
  changed_at    timestamptz not null default now(),
  changed_by    text,
  note          text
);

create index if not exists idx_ssh_student on public.student_status_history(student_id);
create index if not exists idx_ssh_effective on public.student_status_history(effective_month);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.student_status_history enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'student_status_history' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.student_status_history
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.student_status_history to anon, authenticated;

-- Ask PostgREST to reload its schema cache so the new table is visible
-- immediately (otherwise it can take up to a few minutes).
notify pgrst, 'reload schema';