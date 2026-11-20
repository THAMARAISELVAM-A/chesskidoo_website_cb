-- Migration 012 — Financial reporting & payment integrity fixes
--
-- Issues fixed:
--  1. `payments` table may not exist or may be missing `applied_month` column.
--  2. No unique constraint on (student_id, applied_month) — the "one payment
--     per student per month" rule was enforced only in frontend code.
--  3. Backfill applied_month from payment_date for existing rows.
--
-- HOW TO APPLY: open Supabase dashboard -> SQL Editor -> paste -> Run.
-- (Safe to re-run: IF NOT EXISTS / OR REPLACE style.)

create extension if not exists pgcrypto;

-- 1. Create payments table if it doesn't exist
create table if not exists public.payments (
  id              text primary key default gen_random_uuid()::text,
  student_id      text not null,
  amount          numeric not null default 0,
  status          text not null default 'pending',
  payment_method  text,
  description     text,
  transaction_id  text,
  applied_month   text,
  payment_date    timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. Add applied_month if missing (for existing tables)
alter table public.payments
  add column if not exists applied_month text;

-- 3. Add updated_at if missing
alter table public.payments
  add column if not exists updated_at timestamptz default now();

-- 4. Index for applied_month lookups
create index if not exists idx_payments_student_month
  on public.payments (student_id, applied_month);

-- 5. Unique constraint: one payment per student per month
--    Partial index allows NULL applied_month (legacy rows).
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'payments'
      and indexname = 'uniq_payments_student_month'
  ) then
    create unique index uniq_payments_student_month
      on public.payments (student_id, applied_month)
      where applied_month is not null;
  end if;
end $$;

-- 6. Backfill applied_month from payment_date for existing rows
update public.payments
set applied_month = to_char(payment_date, 'YYYY-MM')
where applied_month is null
  and payment_date is not null;

-- 7. RLS (matches portal model)
alter table public.payments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'payments' and policyname = 'portal_all_access') then
    create policy portal_all_access on public.payments
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.payments to anon, authenticated;

-- 8. Auto-update updated_at
create or replace function public.set_payments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_payments_updated_at();

-- Ask PostgREST to reload schema cache
notify pgrst, 'reload schema';
