-- Migration 002 — Linked accounts (Lichess/FIDE) + payment tracking
-- Run in Supabase SQL Editor or via `supabase db push`

-- ── Add Lichess / FIDE columns to public.users ────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lichess_username TEXT,
  ADD COLUMN IF NOT EXISTS lichess_games    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lichess_blitz    INTEGER,
  ADD COLUMN IF NOT EXISTS lichess_bullet   INTEGER,
  ADD COLUMN IF NOT EXISTS lichess_title    TEXT,
  ADD COLUMN IF NOT EXISTS fide_id          TEXT,
  ADD COLUMN IF NOT EXISTS fide_rating      TEXT,
  ADD COLUMN IF NOT EXISTS fide_rapid       TEXT,
  ADD COLUMN IF NOT EXISTS fide_blitz       TEXT,
  ADD COLUMN IF NOT EXISTS fide_title       TEXT,
  ADD COLUMN IF NOT EXISTS fide_federation  TEXT;

-- ── Add payment tracking columns ─────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_txn_id  TEXT,
  ADD COLUMN IF NOT EXISTS paid_date    TEXT,
  ADD COLUMN IF NOT EXISTS pay_method   TEXT;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_lichess ON public.users(lichess_username);
CREATE INDEX IF NOT EXISTS idx_users_fide    ON public.users(fide_id);

-- ── Same columns on profiles table (new-schema path) ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lichess_username TEXT,
  ADD COLUMN IF NOT EXISTS lichess_games    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lichess_blitz    INTEGER,
  ADD COLUMN IF NOT EXISTS lichess_bullet   INTEGER,
  ADD COLUMN IF NOT EXISTS lichess_title    TEXT,
  ADD COLUMN IF NOT EXISTS fide_id          TEXT,
  ADD COLUMN IF NOT EXISTS fide_rating      TEXT,
  ADD COLUMN IF NOT EXISTS fide_rapid       TEXT,
  ADD COLUMN IF NOT EXISTS fide_blitz       TEXT,
  ADD COLUMN IF NOT EXISTS fide_title       TEXT,
  ADD COLUMN IF NOT EXISTS fide_federation  TEXT,
  ADD COLUMN IF NOT EXISTS last_txn_id      TEXT,
  ADD COLUMN IF NOT EXISTS paid_date        TEXT,
  ADD COLUMN IF NOT EXISTS pay_method       TEXT;

-- ── Seed demo students into public.users ─────────────────────────────────────
-- These records use fixed IDs so they survive re-runs (ON CONFLICT DO NOTHING).
-- To create real logins: Supabase Dashboard → Authentication → Users → Invite
-- Then UPDATE public.users SET id = '<auth-user-uuid>' WHERE email = '<email>'

INSERT INTO public.users
  (id, email, full_name, role, level, rating, coach, batch, session, schedule, fee, status, due_date, join_date)
VALUES
  ('s1',  'aadhavan@chesskidoo.com', 'AADHAVAN - SINGAPORE', 'student', 'Beginner',     850, 'ARIVUSELVAM',  'Evening',  'Group', '17:00',           '2200',  'Paid',    '04-May-2026', '2026-04-20'),
  ('s2',  'aarav@chesskidoo.com',    'AARA V',               'student', 'Beginner',     800, 'GYANASURYA',   'Weekend',  'Group', 'WEEKEND',         '1800',  'Paid',    '14-May-2026', '2026-04-24'),
  ('s3',  'anfal@chesskidoo.com',    'ANFAL',                'student', 'Intermediate', 800, 'VISHNU',       'Evening',  'Group', 'FRI & SAT',       '3300',  'Paid',    '20-May-2026', '2026-04-24'),
  ('s4',  'anushya@chesskidoo.com',  'ANUSHYA',              'student', 'Beginner',     800, 'ARIVUSELVAM',  'Evening',  'Group', '17:00',           '1800',  'Pending', '18-May-2026', '2026-04-23'),
  ('s5',  'anyush@chesskidoo.com',   'ANYUSH',               'student', 'Intermediate', 800, 'GYANASURYA',   'Evening',  'Group', '17:00',           '1000',  'Pending', '18-May-2026', '2026-04-23'),
  ('s6',  'arunya@chesskidoo.com',   'ARUNYA',               'student', 'Beginner',     800, 'HARIS',        'Weekend',  'Group', 'Weekend',         '2400',  'Pending', '24-May-2026', '2026-04-24'),
  ('s7',  'athivik@chesskidoo.com',  'ATHIVIK',              'student', 'Beginner',     800, 'YOGESH',       'Weekend',  'Group', 'WEEKEND SUN&MON', '2500',  'Paid',    '12-May-2026', '2026-04-24'),
  ('s8',  'atish@chesskidoo.com',    'ATISH VIDUN',          'student', 'Beginner',     800, 'ARIVUSELVAM',  'Weekend',  'Group', 'WEEKEND',         '3200',  'Paid',    '04-May-2026', '2026-04-24'),
  ('s9',  'balaji@chesskidoo.com',   'BALAJI GANESH',        'student', 'Beginner',     800, 'GYANASURYA',   'Weekday',  'Group', 'WEEKDAY',         '5200',  'Paid',    '05-May-2026', '2026-02-21'),
  ('s10', 'faithma@chesskidoo.com',  'Faithma',              'student', 'Beginner',     800, 'YOGESH',       'Evening',  'Group', '17:00',           '1200',  'Pending', '14-May-2026', '2026-04-14'),
  ('s11', 'jayaraj@chesskidoo.com',  'JAYARAJ',              'student', 'Beginner',     1000,'VISHNU',       'Evening',  'Group', 'Fri & Sat',       '2500',  'Pending', '20-May-2026', '2026-03-07'),
  ('adm', 'admin@chesskidoo.com',    'Academy Admin',        'admin',   NULL,           NULL, NULL,          NULL,       NULL,    NULL,              NULL,    NULL,      NULL,          NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Coaches ───────────────────────────────────────────────────────────────────
INSERT INTO public.users
  (id, email, full_name, role, coach, timetable, created_at)
VALUES
  ('c1', 'arivuselvam@chesskidoo.com', 'ARIVUSELVAM', 'coach', 'ARIVUSELVAM', 'Mon-Sat 17:00', NOW()),
  ('c2', 'vishnu@chesskidoo.com',      'VISHNU',       'coach', 'VISHNU',       'Fri-Sat',      NOW()),
  ('c3', 'gyanasurya@chesskidoo.com',  'GYANASURYA',   'coach', 'GYANASURYA',   'Weekend',      NOW()),
  ('c4', 'yogesh@chesskidoo.com',      'YOGESH',       'coach', 'YOGESH',       'Weekend',      NOW()),
  ('c5', 'haris@chesskidoo.com',       'HARIS',        'coach', 'HARIS',        'Weekend',      NOW())
ON CONFLICT (id) DO NOTHING;
