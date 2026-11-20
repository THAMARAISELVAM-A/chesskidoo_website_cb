-- Migration 009 — Attendance notes + correction-safe uniqueness helpers
--
-- Problem 1: The admin/coach attendance stores per-student Classwork / Homework
--   / General notes (CW:/HW:/GENERAL: format via formatAttendanceNotesForSave)
--   but the `attendance` table never had a notes column, so the Edge API
--   dropped them on every save. After a reload the notes were gone server-side;
--   they only survived inside this browser's localStorage cache.
--
-- Problem 2: The attendance Edge API POST was insert-only and the table has no
--   (date, "studentId") unique constraint (the legacy one is (userid, date)),
--   so every re-marked day appended a second row. Rendering picked whichever
--   duplicate came first, letting stale statuses win after a correction.
--
-- This migration adds the missing column and a helper index. Existing
-- duplicates (if any) are cleaned up conservatively: within one
-- ("studentId", date) group the newest row wins, older ones are removed.

-- ── 1. Missing notes column ───────────────────────────────────────────────────
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── 2. Index for the per-day lookups the API now performs ────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_date_student
  ON public.attendance (date, "studentId");

-- ── 3. Clean up duplicate (studentId, date) rows produced by insert-only saves
--    Newest row wins (by markedAt, then created_at, then id). Run only when
--    markedAt/created_at exist on the live table; guarded with to_regclass so
--    the migration never fails on a schema that drifted.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT 1
    FROM public.attendance a
    JOIN public.attendance b
      ON a.date = b.date
     AND COALESCE(a."studentId", '') = COALESCE(b."studentId", '')
     AND a.id <> b.id
  ) d;
  IF dup_count > 0 THEN
    DELETE FROM public.attendance a
    USING public.attendance b
    WHERE a.date = b.date
      AND COALESCE(a."studentId", '') = COALESCE(b."studentId", '')
      AND a.id <> b.id
      AND (
        COALESCE(b."markedAt", b.created_at, to_timestamp(0))
          > COALESCE(a."markedAt", a.created_at, to_timestamp(0))
        OR (
          COALESCE(b."markedAt", b.created_at, to_timestamp(0))
            = COALESCE(a."markedAt", a.created_at, to_timestamp(0))
          AND b.id > a.id
        )
      );
  END IF;
END $$;
