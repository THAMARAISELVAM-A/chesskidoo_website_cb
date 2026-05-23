-- =============================================================================
-- ChessKidoo — Production Launch Reset Script (v2 Fixed Schema)
-- =============================================================================
-- WHAT THIS DOES:
--   Wipes all existing tables (removes all testing data, dummy data, etc.)
--   and sets up a 100% clean, fresh start. It also automatically inserts 
--   your Admin account and all Coach accounts so they are ready on Day 1.
-- =============================================================================

-- 1. Wipe all data completely (CASCADE removes rows safely)
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.document CASCADE;
TRUNCATE TABLE public.attendance CASCADE;
TRUNCATE TABLE public.ratings CASCADE;
TRUNCATE TABLE public."tourRatings" CASCADE;
TRUNCATE TABLE public.resources CASCADE;
TRUNCATE TABLE public.meetings CASCADE;
TRUNCATE TABLE public.leads CASCADE;
TRUNCATE TABLE public.coach_notes CASCADE;
TRUNCATE TABLE public.credentials CASCADE;
TRUNCATE TABLE public.batch_links CASCADE;
TRUNCATE TABLE public.classes CASCADE;
TRUNCATE TABLE public.monthly_reports CASCADE;
TRUNCATE TABLE public.puzzle_scores CASCADE;
TRUNCATE TABLE public.coach_attendance CASCADE;
TRUNCATE TABLE public.assignments CASCADE;
TRUNCATE TABLE public.hw_submissions CASCADE;
TRUNCATE TABLE public.feedback CASCADE;
TRUNCATE TABLE public.broadcasts CASCADE;

-- 2. Add the missing coach-specific columns to the users table just in case
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batches TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specialty TEXT;

-- 3. Insert the Academy Admin Account
INSERT INTO public.users (id, email, full_name, role, userid, phone_number, city)
VALUES ('a007b0b0-9b30-478f-a147-1af18dff20ce', 'admin@gmail.com', 'Academy Admin', 'admin', 'admin', '+91 90258 46663', 'Chennai');

-- 4. Insert Coach Accounts (using the specialty column instead of overriding puzzle)
INSERT INTO public.users (id, full_name, email, role, phone_number, level, batches, timetable, revenue, classes, star, specialty) VALUES
('c1', 'ARIVUSELVAM', 'arivuselvam@gmail.com', 'coach', '+91 98400 11223', 'Advanced', 'Group 17:00, WEEKEND', 'Mon-Thu 5PM, Sat 10AM', '₹18,400', 18, 5, 'Endgames Specialist'),
('c2', 'GYANASURYA', 'gyanasurya@gmail.com', 'coach', '+91 98400 22334', 'Intermediate', 'WEEKDAY, WEEKEND', 'Tue-Fri 6PM, Sun 4PM', '₹15,000', 22, 4, 'Tactics Specialist'),
('c3', 'VISHNU', 'vishnu@gmail.com', 'coach', '+91 98400 33445', 'Advanced', 'FRI& SAT, Fri & Sat', 'Fri-Sat 4PM-8PM', '₹24,500', 20, 5, 'Calculation Expert'),
('c4', 'HARIS', 'haris@gmail.com', 'coach', '+91 98400 44556', 'Beginner', 'Weekend, MORNING & EVENING', 'Sat-Sun 9AM & 5PM', '₹11,200', 16, 4, 'Junior Trainer'),
('c5', 'YOGESH', 'yogesh@gmail.com', 'coach', '+91 98400 55667', 'Beginner', 'WEEKEND - SUNDAY&MONDAY, Evening', 'Sun-Mon 5PM', '₹12,800', 19, 4, 'Fundamentals Coach'),
('c6', 'SUDHIN', 'sudhin@gmail.com', 'coach', '+91 98400 66778', 'Beginner', 'Evening 17:00, Group', 'Mon-Wed 5PM', '₹9,600', 14, 4, 'Pawn Structures'),
('c7', 'RANJITH', 'ranjith@gmail.com', 'coach', '+91 98400 77889', 'Advanced', 'Weekend, Group 17:00', 'Thu-Sun 5PM', '₹21,000', 25, 5, 'Positional Master'),
('c8', 'ROHITH SELVARAJ', 'rohith@gmail.com', 'coach', '+91 98400 88990', 'Beginner', 'Group 17:00, MORNING & EVENING', 'Mon-Fri 5PM', '₹13,700', 21, 4, 'Tactical Trainer');
