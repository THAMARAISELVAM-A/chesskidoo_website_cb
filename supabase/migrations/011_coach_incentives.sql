-- Migration 011 — Durable coach incentive storage
--
-- Coach salary records and special incentives/bonuses were kept ONLY in the
-- browser's localStorage (`chesskidoo_coach_payroll`, `chesskidoo_coach_bonuses`).
-- Incentives are real money liabilities for the academy, so they now persist in
-- Supabase and are merged back on load (id-keyed union with the local cache).
-- Idempotent; safe to re-run.

CREATE TABLE IF NOT EXISTS public.coach_incentives (
  id          TEXT PRIMARY KEY,
  coach_id    TEXT NOT NULL,
  coach_name  TEXT,
  month       TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  category    TEXT,
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'Included in Salary',
  date        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_incentives_coach_month
  ON public.coach_incentives (coach_id, month);
CREATE INDEX IF NOT EXISTS idx_coach_incentives_month
  ON public.coach_incentives (month);

ALTER TABLE public.coach_incentives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_incentives'
      AND policyname = 'portal_all_access'
  ) THEN
    CREATE POLICY portal_all_access ON public.coach_incentives
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_incentives TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
