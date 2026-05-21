-- ============================================================================
-- ChessKidoo Full Platform — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ─── USERS TABLE (already exists — ensure all columns) ─────────────────────
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS rating INT DEFAULT 800;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS coach TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS fee TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS puzzle INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS game INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS star INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS certificate TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_note TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS srs_data TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS streak INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS rank_name TEXT DEFAULT 'Pawn';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS childEmail TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS parentEmail TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avg_accuracy INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS tournament_count INT DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS attendance_rate INT DEFAULT 0;

-- ─── EXPENSES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  date TEXT,
  category TEXT,
  description TEXT,
  amount TEXT,
  mode TEXT,
  bill TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTS TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT,
  name TEXT,
  level TEXT,
  coach TEXT,
  batch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  userid TEXT,
  date TEXT,
  status TEXT DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RATINGS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  online INT DEFAULT 800,
  international INT DEFAULT 0,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TOURNAMENT RATINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tourRatings" (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  result TEXT,
  change TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RESOURCES TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  batch TEXT,
  type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEETINGS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  coach TEXT,
  date TEXT,
  time TEXT,
  type TEXT,
  level TEXT,
  batch TEXT,
  students INT DEFAULT 0,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLASSES TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT,
  coach TEXT,
  level TEXT,
  schedule TEXT,
  students TEXT[], -- array of student IDs
  room_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MONTHLY REPORTS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_reports (
  id TEXT PRIMARY KEY,
  "studentId" TEXT,
  type TEXT DEFAULT 'monthly',
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PUZZLE SCORES TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS puzzle_scores (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  puzzle_id TEXT,
  correct BOOLEAN,
  time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COACH ATTENDANCE TABLE ────────────────────────────────────��───────────
CREATE TABLE IF NOT EXISTS coach_attendance (
  id TEXT PRIMARY KEY,
  "coachId" TEXT,
  date TEXT,
  status TEXT DEFAULT 'present',
  hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSIGNMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  coach TEXT,
  batch TEXT,
  due_date TEXT,
  type TEXT DEFAULT 'homework',
  pgn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOMEWORK SUBMISSIONS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hw_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT,
  student_id TEXT,
  answer TEXT,
  pgn TEXT,
  grade TEXT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FEEDBACK TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  student_id TEXT,
  type TEXT,
  message TEXT,
  rating INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COACH NOTES TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_notes (
  id BIGSERIAL PRIMARY KEY,
  student TEXT,
  coach TEXT,
  text TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CREDENTIALS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credentials (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL
);

-- ─── BATCH LINKS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_links (
  batch_level TEXT PRIMARY KEY,
  link TEXT
);

-- ─── LEADS TABLE (Demo Bookings) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT,
  parent_name TEXT,
  child_age TEXT,
  city TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLES FOR ADVANCED FEATURES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── XP LOGS (Gamification) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user ON xp_logs(user_id);

-- ─── BADGES TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);

-- ──��� TOURNAMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT DEFAULT 'swiss',
  rounds INT DEFAULT 5,
  time_control TEXT DEFAULT '10+0',
  status TEXT DEFAULT 'registration',
  current_round INT DEFAULT 0,
  max_players INT DEFAULT 64,
  description TEXT,
  players JSONB DEFAULT '[]',
  pairings JSONB DEFAULT '[]',
  standings JSONB DEFAULT '[]',
  tiebreaks TEXT[] DEFAULT ARRAY['buchholz','sonneborn','directEncounter'],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- ─── STUDY PLANS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_study_plans_student ON study_plans(student_id);

-- ─── AI ANALYSIS RESULTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_analysis (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  engagement_score INT,
  dropout_risk TEXT,
  predicted_elo INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_student ON ai_analysis(student_id);

-- ─── AUDIT LOGS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(timestamp DESC);

-- ─── GAME REPORTS (Anti-Cheat) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_reports (
  id TEXT PRIMARY KEY,
  game_id TEXT,
  player_id TEXT NOT NULL,
  fair_play_score INT DEFAULT 100,
  tab_switches INT DEFAULT 0,
  move_times JSONB DEFAULT '[]',
  flags JSONB DEFAULT '[]',
  verdict TEXT DEFAULT 'clean',
  fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_reports_player ON game_reports(player_id);

-- ─── WEEKLY REPORTS (AI-Generated for Parents) ─────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  week_of TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_student ON weekly_reports(student_id);

-- ─── COACH EFFECTIVENESS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_effectiveness (
  id BIGSERIAL PRIMARY KEY,
  coach_name TEXT NOT NULL,
  student_count INT DEFAULT 0,
  avg_elo_improvement INT DEFAULT 0,
  retention_rate INT DEFAULT 0,
  avg_attendance INT DEFAULT 0,
  effectiveness_score INT DEFAULT 0,
  grade TEXT DEFAULT 'B',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT,
  title TEXT,
  body TEXT,
  target_id TEXT,
  target_role TEXT,
  read BOOLEAN DEFAULT FALSE,
  channel TEXT DEFAULT 'app',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY IF NOT EXISTS "admin_all" ON users FOR ALL USING (auth.uid() = 'a007b0b0-9b30-478f-a147-1af18dff20ce');

-- Users can read their own profile
CREATE POLICY IF NOT EXISTS "users_read_own" ON users FOR SELECT USING (auth.uid()::text = id);

-- Anyone authenticated can read tournament data
CREATE POLICY IF NOT EXISTS "tournaments_read" ON tournaments FOR SELECT USING (true);

-- Anon key can read public data (for offline/demo mode)
CREATE POLICY IF NOT EXISTS "anon_read_users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_attendance" ON attendance FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_ratings" ON ratings FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Your ChessKidoo database is ready.
-- ═══════════════════════════════════════════════════════════════════════════
