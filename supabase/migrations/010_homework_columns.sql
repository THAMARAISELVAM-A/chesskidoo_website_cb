-- Migration 010 — Homework assignment authoring columns
--
-- The homework UI (lms/js/homework.js) and the Edge API write coach_id,
-- created_by and present_student_ids on homework_assignments, but migration
-- 006 created the table without them. PostgREST returns PGRST204 ("Could not
-- find the 'coach_id' column") for every insert/update carrying them, which
-- silently sent every assignment save through fallback paths (or to the
-- localStorage cache only). Idempotent here; safe to re-run.

ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS coach_id TEXT;
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS present_student_ids JSONB;

CREATE INDEX IF NOT EXISTS idx_homework_assignments_coach
  ON public.homework_assignments (coach_id);

notify pgrst, 'reload schema';
