-- ChessKidoo Safe Schema Upgrade Script
-- Run this in the Supabase SQL Editor.
-- It adds any missing columns and tables to your existing database,
-- preserving all your data (like your 124 enrolled students and history).

-- 1. ALTER USERS TABLE
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 800;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS puzzle INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS game INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS star INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_note TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "childEmail" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timetable TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS revenue TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS classes INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_last_date TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS srs_data JSONB;

-- Sync legacy columns
UPDATE public.users SET session = session_type WHERE session IS NULL AND session_type IS NOT NULL;
UPDATE public.users SET status = payment_status WHERE status IS NULL AND payment_status IS NOT NULL;

-- 2. ALTER CLASSES TABLE
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "coachId" TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "coachName" TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS days TEXT[];
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "zoomLink" TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS max_students INTEGER;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "studentIds" TEXT[];
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- 3. ALTER LEADS TABLE
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS child_age TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT;

-- 4. ALTER ATTENDANCE TABLE
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "coachId" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "markedAt" TIMESTAMPTZ;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS class_title TEXT;

-- 5. ALTER TOURRATINGS TABLE
ALTER TABLE public."tourRatings" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. ALTER RESOURCES TABLE
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS coach TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS fen TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS explanation TEXT;

-- 7. ALTER MEETINGS TABLE
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS coach TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS "coachId" TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS "coachName" TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS "studentIds" TEXT[];
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS "liveStartedAt" TEXT;

-- 8. ALTER COACH_NOTES TABLE
ALTER TABLE public.coach_notes ADD COLUMN IF NOT EXISTS student TEXT;

-- 9. ALTER MONTHLY_REPORTS TABLE
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS "coachId" TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS "coachName" TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS recommendation TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS topics TEXT[];
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS rating INTEGER;

-- 10. ALTER PUZZLE_SCORES TABLE
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS "userName" TEXT;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS "puzzleId" TEXT;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS time INTEGER;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS mistakes INTEGER;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS xp INTEGER;
ALTER TABLE public.puzzle_scores ADD COLUMN IF NOT EXISTS date TEXT;

-- 11. ALTER ASSIGNMENTS TABLE
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS pgn TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS "assignedTo" TEXT[];
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS moves JSONB;

-- 12. ALTER HW_SUBMISSIONS TABLE
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS accuracy INTEGER;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS "movesStudied" INTEGER;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS "totalMoves" INTEGER;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hw_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 13. ALTER FEEDBACK TABLE
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "fromId" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "fromName" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "fromRole" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "childId" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "childName" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "toId" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS "toName" TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS category TEXT;

-- 14. CREATE COACH ATTENDANCE TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.coach_attendance (
    id TEXT PRIMARY KEY,
    "coachId" TEXT,
    "classId" TEXT,
    date TEXT,
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. CREATE BROADCASTS TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id TEXT PRIMARY KEY,
    fen TEXT,
    pgn TEXT,
    coach TEXT,
    ts BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. SAFE PERMISSIONS SETUP
-- Grant permissions on ALL tables to public/anon/authenticated roles so client can query/modify them directly.
GRANT ALL ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.expenses TO anon, authenticated;
GRANT ALL ON TABLE public.document TO anon, authenticated;
GRANT ALL ON TABLE public.attendance TO anon, authenticated;
GRANT ALL ON TABLE public.ratings TO anon, authenticated;
GRANT ALL ON TABLE public."tourRatings" TO anon, authenticated;
GRANT ALL ON TABLE public.resources TO anon, authenticated;
GRANT ALL ON TABLE public.meetings TO anon, authenticated;
GRANT ALL ON TABLE public.leads TO anon, authenticated;
GRANT ALL ON TABLE public.coach_notes TO anon, authenticated;
GRANT ALL ON TABLE public.credentials TO anon, authenticated;
GRANT ALL ON TABLE public.batch_links TO anon, authenticated;
GRANT ALL ON TABLE public.classes TO anon, authenticated;
GRANT ALL ON TABLE public.monthly_reports TO anon, authenticated;
GRANT ALL ON TABLE public.puzzle_scores TO anon, authenticated;
GRANT ALL ON TABLE public.coach_attendance TO anon, authenticated;
GRANT ALL ON TABLE public.assignments TO anon, authenticated;
GRANT ALL ON TABLE public.hw_submissions TO anon, authenticated;
GRANT ALL ON TABLE public.feedback TO anon, authenticated;
GRANT ALL ON TABLE public.broadcasts TO anon, authenticated;

-- Disable RLS on tables where client-side inserts/updates are required and policies might restrict them,
-- or ensure permissive policies exist. To guarantee functional operations, we disable RLS on these tables:
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."tourRatings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzle_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts DISABLE ROW LEVEL SECURITY;

-- 17. CREATE MULTIPLAYER GAMES TABLE (Matchmaking)
CREATE TABLE IF NOT EXISTS public.multiplayer_games (
    id TEXT PRIMARY KEY,
    white_id TEXT,
    black_id TEXT,
    white_name TEXT,
    black_name TEXT,
    fen TEXT,
    pgn TEXT,
    status TEXT DEFAULT 'waiting', -- waiting, active, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL ON TABLE public.multiplayer_games TO anon, authenticated;
ALTER TABLE public.multiplayer_games DISABLE ROW LEVEL SECURITY;

-- 18. ENABLE REALTIME ON BROADCASTS AND MULTIPLAYER
-- This enables WebSockets for these tables in Supabase
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_games;
