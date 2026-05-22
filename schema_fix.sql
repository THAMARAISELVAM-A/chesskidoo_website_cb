/*  */
/*  */
/*  */

/*  */
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'student',
    points NUMERIC DEFAULT 0,
    join_date TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS credentials (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
);

/*  */
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount NUMERIC,
    category TEXT,
    date TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS document (
    id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT,
    file_name TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    class_id TEXT,
    date TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    rating NUMERIC,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS "tourRatings" (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    tournament_id TEXT,
    rating NUMERIC,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    title TEXT,
    schedule TEXT,
    coach_id TEXT,
    batch_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS monthly_reports (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    month TEXT,
    report_content TEXT,
    score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS puzzle_scores (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    score NUMERIC,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS coach_attendance (
    id TEXT PRIMARY KEY,
    coach_id TEXT,
    date TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    title TEXT,
    description TEXT,
    due_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS hw_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT,
    student_id TEXT,
    status TEXT,
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    from_id TEXT,
    to_id TEXT,
    content TEXT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS coach_notes (
    id TEXT PRIMARY KEY,
    coach_id TEXT,
    student_id TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/*  */
CREATE TABLE IF NOT EXISTS batch_links (
    batch_level TEXT PRIMARY KEY,
    link TEXT
);

/*  */
/*  */
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read-write for users" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read-write for credentials" ON credentials FOR ALL USING (true) WITH CHECK (true);
