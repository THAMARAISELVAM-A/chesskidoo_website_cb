-- Migration 013 — Students table (if missing)
--
-- The students Edge API and LMS frontend expect a `students` table, but no
-- migration in 001-011 creates it. This migration creates it with all columns
-- the app reads/writes, plus the students_decrypted view for PII.
--
-- HOW TO APPLY: open Supabase dashboard -> SQL Editor -> paste -> Run.
-- (Safe to re-run: IF NOT EXISTS / OR REPLACE style.)

create extension if not exists pgcrypto;

-- 1. Create students table if it doesn't exist
create table if not exists public.students (
  id                text primary key default gen_random_uuid()::text,
  full_name         text not null default '',
  email             text,
  phone             text,
  city              text,
  level             text default 'Beginner',
  rating            integer default 800,
  coach             text,
  coach_id          text,
  batch             text,
  batch_id          text,
  session           text,
  schedule          text,
  fee               text,
  monthly_fee       numeric default 0,
  status            text default 'Pending',
  payment_status    text default 'Pending',
  due_date          text,
  join_date         date default current_date,
  enrollment_date   date,
  age               integer,
  grade             text,
  photo             text,
  notes             text,
  days              text,
  payment_method    text,
  last_txn_id       text,
  paid_date         text,
  pay_method        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2. Create students_decrypted view (passthrough if no encryption)
--    The edge function uses this view to "automatically decrypt PII".
--    If you have pgcrypto encryption, replace with actual decrypt logic.
create or replace view public.students_decrypted as
select * from public.students;

-- 3. Indexes
create index if not exists idx_students_coach on public.students(coach_id);
create index if not exists idx_students_status on public.students(status);
create index if not exists idx_students_batch on public.students(batch_id);

-- 4. RLS
alter table public.students enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'students' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.students
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.students to anon, authenticated;
grant select on public.students_decrypted to anon, authenticated;

-- 5. Auto-update updated_at
create or replace function public.set_students_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
  before update on public.students
  for each row execute procedure public.set_students_updated_at();

-- Ask PostgREST to reload schema cache
notify pgrst, 'reload schema';
