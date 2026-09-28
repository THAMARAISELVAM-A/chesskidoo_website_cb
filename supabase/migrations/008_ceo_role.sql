-- Migration 008 — CEO role support
-- Adds 'ceo' to the allowed roles and seeds a demo CEO account.

-- ── profiles table ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','coach','student','parent','ceo','master'));

-- ── Seed CEO user into public.users ───────────────────────────────────────────
INSERT INTO public.users
  (id, userid, email, full_name, role, level, rating, coach, batch, session, schedule, fee, status, due_date, join_date, phone_number, city)
VALUES
  ('ceo-001', 'ceo', 'ceo@chesskidoo.com', 'Chief Executive Officer', 'ceo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', '+919999999999', 'Erode')
ON CONFLICT (id) DO NOTHING;

-- ── Seed CEO credentials (password: ceo123) ───────────────────────────────────
INSERT INTO public.credentials (email, password)
VALUES ('ceo@chesskidoo.com', 'ceo123')
ON CONFLICT (email) DO NOTHING;
