-- =============================================================================
-- ChessKidoo — Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor after creating tables via supabase_setup.sql.
--
-- STRATEGY
-- ---------
-- Admin  → full read/write on all tables
-- Coach  → read own profile + their assigned students; write attendance/notes/reports
-- Student→ read own profile; write own game log / puzzle scores
-- Parent → read own profile + linked child's profile + child's reports/attendance
-- Anon   → read nothing (all RLS enabled, no anon policies unless explicitly listed)
-- =============================================================================

-- Helpers: extract role from the JWT custom claim stored in app_metadata
-- (Supabase sets auth.uid() automatically)
CREATE OR REPLACE FUNCTION public.current_role_claim()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_role_claim() = 'admin';
$$;

-- =============================================================================
-- TABLE: users (profiles)
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY "admin_all_users"
  ON public.users FOR ALL
  USING      (is_admin())
  WITH CHECK (is_admin());

-- Users can read their own profile
CREATE POLICY "self_read_users"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own non-sensitive fields (no role change!)
CREATE POLICY "self_update_users"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (
    auth.uid()::text = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid()::text)
  );

-- Coaches can read profiles of students assigned to them
CREATE POLICY "coach_read_students"
  ON public.users FOR SELECT
  USING (
    current_role_claim() = 'coach'
    AND role = 'student'
    AND coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );

-- Parents can read their linked child's profile
CREATE POLICY "parent_read_child"
  ON public.users FOR SELECT
  USING (
    current_role_claim() = 'parent'
    AND email = (
      SELECT "childEmail" FROM public.users WHERE id = auth.uid()::text LIMIT 1
    )
  );

-- =============================================================================
-- TABLE: attendance
-- =============================================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_attendance"
  ON public.attendance FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Students read their own attendance
CREATE POLICY "self_read_attendance"
  ON public.attendance FOR SELECT
  USING (userid = auth.uid()::text);

-- Coaches read/write attendance for their students
CREATE POLICY "coach_rw_attendance"
  ON public.attendance FOR ALL
  USING (
    current_role_claim() = 'coach'
    AND userid IN (
      SELECT id FROM public.users
      WHERE coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1)
    )
  )
  WITH CHECK (
    current_role_claim() = 'coach'
  );

-- Parents read their child's attendance
CREATE POLICY "parent_read_attendance"
  ON public.attendance FOR SELECT
  USING (
    userid = (
      SELECT id FROM public.users
      WHERE email = (SELECT "childEmail" FROM public.users WHERE id = auth.uid()::text LIMIT 1)
      LIMIT 1
    )
  );

-- =============================================================================
-- TABLE: coach_notes
-- =============================================================================
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_notes"
  ON public.coach_notes FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Coaches can read/write notes they authored
CREATE POLICY "coach_own_notes"
  ON public.coach_notes FOR ALL
  USING      (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1));

-- Students read notes about themselves
CREATE POLICY "student_read_own_notes"
  ON public.coach_notes FOR SELECT
  USING (
    student = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1)
    OR student = auth.uid()::text
  );

-- =============================================================================
-- TABLE: monthly_reports
-- =============================================================================
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_reports"
  ON public.monthly_reports FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_own_reports"
  ON public.monthly_reports FOR ALL
  USING      ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);

CREATE POLICY "student_read_own_reports"
  ON public.monthly_reports FOR SELECT
  USING ("studentId" = auth.uid()::text);

CREATE POLICY "parent_read_child_reports"
  ON public.monthly_reports FOR SELECT
  USING (
    "studentId" = (
      SELECT id FROM public.users
      WHERE email = (SELECT "childEmail" FROM public.users WHERE id = auth.uid()::text LIMIT 1)
      LIMIT 1
    )
  );

-- =============================================================================
-- TABLE: meetings
-- =============================================================================
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_meetings"
  ON public.meetings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Coaches read/write their own meetings
CREATE POLICY "coach_own_meetings"
  ON public.meetings FOR ALL
  USING      ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);

-- Students and parents can read meetings they're enrolled in
CREATE POLICY "student_read_meetings"
  ON public.meetings FOR SELECT
  USING (auth.uid()::text = ANY("studentIds"));

-- =============================================================================
-- TABLE: resources (homework, class notes)
-- =============================================================================
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_resources"
  ON public.resources FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Coaches manage their own resources
CREATE POLICY "coach_own_resources"
  ON public.resources FOR ALL
  USING      (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1));

-- Students and parents read resources matching their batch/level
CREATE POLICY "student_read_resources"
  ON public.resources FOR SELECT
  USING (
    batch = (SELECT batch FROM public.users WHERE id = auth.uid()::text LIMIT 1)
    OR level = (SELECT level FROM public.users WHERE id = auth.uid()::text LIMIT 1)
    OR batch IS NULL
  );

-- =============================================================================
-- TABLE: expenses  (admin-only)
-- =============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_expenses"
  ON public.expenses FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
-- TABLE: leads  (demo booking submissions)
-- =============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_leads"
  ON public.leads FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Anyone can INSERT a lead (the demo-booking form is public)
CREATE POLICY "anon_insert_leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- TABLE: feedback
-- =============================================================================
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_feedback"
  ON public.feedback FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Users read their own feedback
CREATE POLICY "self_read_feedback"
  ON public.feedback FOR SELECT
  USING ("fromId" = auth.uid()::text);

-- Users can submit feedback
CREATE POLICY "auth_insert_feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- TABLE: ratings
-- =============================================================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_ratings"
  ON public.ratings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_write_ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (current_role_claim() IN ('coach', 'admin'));

CREATE POLICY "self_read_ratings"
  ON public.ratings FOR SELECT
  USING (user_id = auth.uid()::text);

-- =============================================================================
-- TABLE: puzzle_scores
-- =============================================================================
ALTER TABLE public.puzzle_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_puzzle_scores"
  ON public.puzzle_scores FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Students can write their own scores
CREATE POLICY "self_rw_puzzle_scores"
  ON public.puzzle_scores FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Everyone can read the leaderboard (scores are not sensitive)
CREATE POLICY "public_read_puzzle_scores"
  ON public.puzzle_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- TABLE: classes
-- =============================================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_classes"
  ON public.classes FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_own_classes"
  ON public.classes FOR ALL
  USING      ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);

CREATE POLICY "student_read_classes"
  ON public.classes FOR SELECT
  USING (auth.uid()::text = ANY("studentIds"));

-- =============================================================================
-- TABLE: coach_attendance
-- =============================================================================
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_coach_attendance"
  ON public.coach_attendance FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_own_attendance"
  ON public.coach_attendance FOR ALL
  USING      ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);

-- =============================================================================
-- TABLE: assignments
-- =============================================================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_assignments"
  ON public.assignments FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_own_assignments"
  ON public.assignments FOR ALL
  USING      (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (coach = (SELECT full_name FROM public.users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "student_read_assignments"
  ON public.assignments FOR SELECT
  USING (
    array_position("assignedTo", 'all') IS NOT NULL
    OR array_position("assignedTo", (SELECT batch FROM public.users WHERE id = auth.uid()::text LIMIT 1)) IS NOT NULL
  );

-- =============================================================================
-- TABLE: hw_submissions
-- =============================================================================
ALTER TABLE public.hw_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_hw"
  ON public.hw_submissions FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "student_own_hw"
  ON public.hw_submissions FOR ALL
  USING      (student_id = auth.uid()::text)
  WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "coach_read_hw"
  ON public.hw_submissions FOR SELECT
  USING (current_role_claim() = 'coach');

-- =============================================================================
-- TABLE: credentials  (admin-only — stores custom passwords for portal access)
-- =============================================================================
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_credentials"
  ON public.credentials FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
-- TABLE: batch_links
-- =============================================================================
ALTER TABLE public.batch_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_batch_links"
  ON public.batch_links FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Authenticated users (students) can read batch links
CREATE POLICY "auth_read_batch_links"
  ON public.batch_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- TABLE: document
-- =============================================================================
ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_documents"
  ON public.document FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coach_rw_documents"
  ON public.document FOR ALL
  USING      (current_role_claim() = 'coach')
  WITH CHECK (current_role_claim() = 'coach');

CREATE POLICY "student_read_documents"
  ON public.document FOR SELECT
  USING (
    batch = (SELECT batch FROM public.users WHERE id = auth.uid()::text LIMIT 1)
    OR level = (SELECT level FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );

-- =============================================================================
-- TABLE: tourRatings
-- =============================================================================
ALTER TABLE public."tourRatings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_tourratings"
  ON public."tourRatings" FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "self_read_tourratings"
  ON public."tourRatings" FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "coach_write_tourratings"
  ON public."tourRatings" FOR INSERT
  WITH CHECK (current_role_claim() IN ('coach', 'admin'));

-- =============================================================================
-- NOTE: After running this file, verify each table in the Supabase Dashboard
-- under Table Editor → RLS. Every table should show "RLS enabled".
-- Test with a fresh anon session — SELECT * on any table should return 0 rows.
-- =============================================================================
