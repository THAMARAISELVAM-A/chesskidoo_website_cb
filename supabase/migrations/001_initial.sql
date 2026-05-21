-- Migration 001 — Initial schema
-- This is the source-of-truth DDL. supabase_setup.sql at root is the legacy
-- equivalent; keep in sync when adding columns.
--
-- Run in Supabase SQL Editor or via `supabase db push` (local dev).

-- ── profiles (replaces "users" to match Supabase Auth convention) ─────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  userid      TEXT,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('admin','coach','student','parent')),
  phone       TEXT,
  city        TEXT,
  level       TEXT DEFAULT 'Beginner',
  rating      INTEGER DEFAULT 800,
  coach       TEXT,
  batch       TEXT,
  session     TEXT,
  schedule    TEXT,
  fee         TEXT,
  status      TEXT DEFAULT 'Pending',
  due_date    TEXT,
  join_date   DATE DEFAULT CURRENT_DATE,
  age         INTEGER,
  grade       TEXT,
  puzzle      INTEGER DEFAULT 0,
  game        INTEGER DEFAULT 0,
  star        INTEGER DEFAULT 0,
  photo       TEXT,
  certificate TEXT,
  last_note   TEXT,
  child_email TEXT,
  timetable   TEXT,
  fide_rating TEXT,
  availability TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Keep existing "users" table as alias until full migration is done
-- (no action needed here — db.js maps to whichever exists)

-- ── Auto-update updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coach ON public.profiles(coach);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_attendance_userid  ON public.attendance(userid);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_classid ON public.attendance("classId");
CREATE INDEX IF NOT EXISTS idx_attendance_coachid ON public.attendance("coachId");
CREATE INDEX IF NOT EXISTS idx_meetings_date     ON public.meetings(date);
CREATE INDEX IF NOT EXISTS idx_reports_student   ON public.monthly_reports("studentId");
CREATE INDEX IF NOT EXISTS idx_reports_month     ON public.monthly_reports(month, year);
