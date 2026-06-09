-- SQL SEED SCRIPT FOR INSTITUTE CLASSES & SCHEDULE
-- Copy and paste this into the Supabase SQL Editor and click "Run".

INSERT INTO public.classes (
  id, "coachId", "coachName", title, level, batch, days, time, duration, "zoomLink", "studentIds"
) VALUES
  -- ROHITH (Coach ID: c0c0c0c0-0000-4000-8000-000000000008)
  ('class-rohith-b1', 'c0c0c0c0-0000-4000-8000-000000000008', 'ROHITH SELVARAJ', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Tuesday', 'Wednesday', 'Friday'], '5:00 AM', 40, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-30']),
  ('class-rohith-b2', 'c0c0c0c0-0000-4000-8000-000000000008', 'ROHITH SELVARAJ', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Wednesday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-4']),

  -- RANJITH (Coach ID: c0c0c0c0-0000-4000-8000-000000000007)
  ('class-ranjith-b1', 'c0c0c0c0-0000-4000-8000-000000000007', 'RANJITH', 'Batch 1', 'Advanced', 'Batch 1', ARRAY['Wednesday', 'Friday'], '2:45 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-39']),
  ('class-ranjith-b2', 'c0c0c0c0-0000-4000-8000-000000000007', 'RANJITH', 'Batch 2', 'Advanced', 'Batch 2', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-40', 'student-seed-19', 'student-seed-37']),

  -- GYANA SURIYA (Coach ID: c0c0c0c0-0000-4000-8000-000000000002)
  ('class-gyana-b1', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Wednesday', 'Friday'], '5:40 AM', 40, 'https://meet.google.com/beg-inner-room', ARRAY[]::TEXT[]), -- Ekash
  ('class-gyana-b2', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Wednesday', 'Friday'], '7:00 AM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-29']),
  ('class-gyana-b3', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 3', 'Beginner', 'Batch 3', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-27', 'student-seed-47', 'student-seed-28', 'student-seed-26']),

  -- ARIVUSELVAM (Coach ID: c0c0c0c0-0000-4000-8000-000000000001)
  ('class-arivu-b1', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 1', 'Advanced', 'Batch 1', ARRAY['Monday', 'Thursday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-8', 'student-seed-11']),
  ('class-arivu-b2', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 2', 'Advanced', 'Batch 2', ARRAY['Monday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-45', 'student-seed-31', 'student-seed-25']),
  ('class-arivu-b3', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 3', 'Advanced', 'Batch 3', ARRAY['Monday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-20', 'student-seed-24']),
  ('class-arivu-b4', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 4', 'Advanced', 'Batch 4', ARRAY['Tuesday', 'Friday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-34', 'student-seed-23']),

  -- YOGESH (Coach ID: c0c0c0c0-0000-4000-8000-000000000005)
  ('class-yogesh-b1', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Thursday', 'Friday'], '6:00 AM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-44']),
  ('class-yogesh-b2', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Saturday', 'Sunday'], '6:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-16', 'student-seed-6']),
  ('class-yogesh-b3', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 3', 'Beginner', 'Batch 3', ARRAY['Saturday', 'Sunday'], '7:30 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-22', 'student-seed-42', 'student-seed-18']),

  -- SUDHIN (Coach ID: c0c0c0c0-0000-4000-8000-000000000006)
  ('class-sudhin-b1', 'c0c0c0c0-0000-4000-8000-000000000006', 'SUDHIN', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-17', 'student-seed-18', 'student-seed-5']),

  -- VASANTH KUMAR (No direct matching coach in users schema? Assuming c0c0c0c0...00009 or similar. We will insert him first or use random ID if missing, but we'll leave coachId null if he's not in the db.)
  ('class-vasanth-b1', NULL, 'VASANTH KUMAR', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Monday', 'Wednesday'], '7:00 PM', 40, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-3']),

  -- VISHNU (Coach ID: c0c0c0c0-0000-4000-8000-000000000003)
  ('class-vishnu-b1', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 1', 'Intermediate', 'Batch 1', ARRAY['Wednesday', 'Thursday'], '6:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-10']),
  ('class-vishnu-b2', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 2', 'Intermediate', 'Batch 2', ARRAY['Wednesday', 'Thursday'], '7:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-9']),
  ('class-vishnu-b3', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 3', 'Intermediate', 'Batch 3', ARRAY['Friday', 'Saturday'], '7:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-35'])

ON CONFLICT (id) DO UPDATE SET 
  "coachId" = EXCLUDED."coachId",
  "coachName" = EXCLUDED."coachName",
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  batch = EXCLUDED.batch,
  days = EXCLUDED.days,
  time = EXCLUDED.time,
  duration = EXCLUDED.duration,
  "zoomLink" = EXCLUDED."zoomLink",
  "studentIds" = EXCLUDED."studentIds";
