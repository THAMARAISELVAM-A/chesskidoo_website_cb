-- ==========================================
-- MASTER SEED SCRIPT (STUDENTS, SCHEDULE, CREDENTIALS)
-- Clear the SQL Editor completely before pasting this.
-- ==========================================

-- 1. INSERT STUDENTS (With @gmail.com emails for students and parents)
INSERT INTO public.users (id, userid, email, "childEmail", full_name, role, phone_number, level, rating, join_date, due_date, fee, payment_status, batch, timetable, coach, status) VALUES
  ('student-seed-0', 's1000', 'praveen@gmail.com', 'praveen.parent@gmail.com', 'PRAVEEN - PARENTS NAME', 'student', '9840514302', 'Beginner', 800, '2026-06-07', '2026-06-07', '2000', 'Pending', 'Group', '17:00', 'YOGESH', 'Active'),
  ('student-seed-1', 's1001', 'poornima@gmail.com', 'poornima.parent@gmail.com', 'POORNIMA - PARENTS', 'student', '9626846669', 'Beginner', 800, '2026-06-07', '2026-07-07', '1900', 'Pending', 'Group', '17:00', 'YOGESH', 'Active'),
  ('student-seed-2', 's1002', 'rohith@gmail.com', 'rohith.parent@gmail.com', 'Rohith Expenditure chess Academy', 'student', '6385688722', 'Beginner', 800, '2026-06-01', '2026-07-07', '1000', 'Pending', 'Group', '17:00', 'VISHNU', 'Active'),
  ('student-seed-3', 's1003', 'aradhya@gmail.com', 'aradhya.parent@gmail.com', 'Aradhya', 'student', '741872621', 'Beginner', 800, '2026-06-01', '2026-06-28', '2900', 'Pending', 'Group', '17:00', 'VASANTH KUMAR', 'Active'),
  ('student-seed-4', 's1004', 'samiksha@gmail.com', 'samiksha.parent@gmail.com', 'SAMIKSHA', 'student', '9003457873', 'Beginner', 800, '2026-05-29', '2026-06-29', '4800', 'Paid', 'Group', '17:00', 'ROHITH SELVARAJ', 'Active'),
  ('student-seed-5', 's1005', 'venkatesh.daughter@gmail.com', 'venkatesh.daughter.parent@gmail.com', 'VENKATESH LAXMINAGAR -daughter', 'student', '9686103333', 'Beginner', 800, '2026-06-01', '2026-06-29', '1800', 'Pending', 'Group', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-6', 's1006', 'venkatesh.son@gmail.com', 'venkatesh.son.parent@gmail.com', 'VENKATESH LAXMINAGAR -SON', 'student', '9686103333', 'Beginner', 800, '2026-06-01', '2026-06-30', '1798', 'Pending', 'Group', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-7', 's1007', 'ilambharathi@gmail.com', 'ilambharathi.parent@gmail.com', 'ILAM BHARATHI', 'student', '9629673733', 'Beginner', 800, '2026-06-10', '2026-06-10', '1600', 'Pending', 'Group', '17:00', 'RANJITH', 'Active'),
  ('student-seed-8', 's1008', 'yadhuiver@gmail.com', 'yadhuiver.parent@gmail.com', 'YADHUIVER', 'student', '9551118111', 'Beginner', 800, '2026-06-03', '2026-06-03', '2700', 'Paid', 'Group', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-9', 's1009', 'yogesh.student@gmail.com', 'yogesh.student.parent@gmail.com', 'YOGESH', 'student', '9344097252', 'Beginner', 800, '2026-06-03', '2026-06-03', '2700', 'Due', 'Group', '17:00', 'VISHNU', 'Active'),
  ('student-seed-10', 's1010', 'abinitha@gmail.com', 'abinitha.parent@gmail.com', 'ABINITHA', 'student', '9952209603', 'Beginner', 800, '2026-06-01', '2026-06-29', '2600', 'Pending', 'Group', '17:00', 'VISHNU', 'Active'),
  ('student-seed-11', 's1011', 'yuvan@gmail.com', 'yuvan.parent@gmail.com', 'YUVAN', 'student', '9789107123', 'Beginner', 800, '2026-06-01', '2026-06-03', '2800', 'Due', 'Group', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-12', 's1012', 'banupriya@gmail.com', 'banupriya.parent@gmail.com', 'Banu priya --offline academy', 'student', '9080578952', 'Beginner', 800, '2026-05-18', '2026-06-18', '1000', 'Pending', 'Group', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-13', 's1013', 'saranya@gmail.com', 'saranya.parent@gmail.com', 'Saranya --offline academy', 'student', '8220165338', 'Beginner', 800, '2026-05-18', '2026-06-20', '1270', 'Pending', 'Weekend', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-14', 's1014', 'prajesh@gmail.com', 'prajesh.parent@gmail.com', 'Prajesh --offline academy', 'student', '9442628925', 'Beginner', 800, '2026-05-18', '2026-06-19', '1270', 'Pending', 'Group', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-15', 's1015', 'mansa@gmail.com', 'mansa.parent@gmail.com', 'Mansa --offline academy', 'student', '8667593451', 'Beginner', 800, '2026-05-18', '2026-06-17', '1270', 'Pending', 'Group', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-16', 's1016', 'sai@gmail.com', 'sai.parent@gmail.com', 'SAI', 'student', '9789012394', 'Beginner', 800, '2026-05-07', '2026-06-07', '1600', 'Pending', 'Group', '17:00', 'YOGESH', 'Active'),
  ('student-seed-17', 's1017', 'mohammed.atifk@gmail.com', 'mohammed.atifk.parent@gmail.com', 'MOHAMMED ATIFK', 'student', '9566439055', 'Beginner', 800, '2026-04-20', '2026-06-20', '1700', 'Pending', 'Weekend', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-18', 's1018', 'pranish@gmail.com', 'pranish.parent@gmail.com', 'PRANISH P', 'student', '9942827234', 'Beginner', 800, '2026-04-27', '2026-06-04', '1500', 'Paid', 'Weekend', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-19', 's1019', 'susin@gmail.com', 'susin.parent@gmail.com', 'SUSIN', 'student', '8667258857', 'Advanced', 800, '2026-04-08', '2026-06-08', '1800', 'Paid', 'Weekend', '17:00', 'RANJITH', 'Active'),
  ('student-seed-20', 's1020', 'atish@gmail.com', 'atish.parent@gmail.com', 'ATISH VIDUN', 'student', '9677751414', 'Beginner', 800, '2026-04-24', '2026-06-04', '3200', 'Pending', 'Single', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-21', 's1021', 'balaji@gmail.com', 'balaji.parent@gmail.com', 'BALAJI GANESH', 'student', '7324276741', 'Beginner', 800, '2026-02-21', '2026-06-06', '5200', 'Paid', 'Weekday', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-22', 's1022', 'athivik@gmail.com', 'athivik.parent@gmail.com', 'ATHIVIK', 'student', '8608969999', 'Beginner', 800, '2026-04-24', '2026-06-14', '2500', 'Pending', 'Weekend', '17:00', 'YOGESH', 'Active'),
  ('student-seed-23', 's1023', 'sachin@gmail.com', 'sachin.parent@gmail.com', 'SACHIN', 'student', '9944227799', 'Advanced', 800, '2026-04-24', '2026-06-04', '3000', 'Pending', 'Single', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-24', 's1024', 'uttasan@gmail.com', 'uttasan.parent@gmail.com', 'UTTASAN', 'student', '8870897095', 'Advanced', 800, '2026-04-24', '2026-06-04', '3000', 'Paid', 'Single', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-25', 's1025', 'prnavav@gmail.com', 'prnavav.parent@gmail.com', 'PRNAVAV', 'student', '9843431086', 'Beginner', 800, '2026-04-08', '2026-06-08', '2200', 'Pending', 'Weekend', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-26', 's1026', 'shrevin@gmail.com', 'shrevin.parent@gmail.com', 'SHREVIN', 'student', '7899295230', 'Beginner', 800, '2026-03-13', '2026-06-25', '1800', 'Pending', 'Weekend', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-27', 's1027', 'aara@gmail.com', 'aara.parent@gmail.com', 'AARA V', 'student', '9786767007', 'Beginner', 800, '2026-04-24', '2026-06-04', '1800', 'Paid', 'Weekend', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-28', 's1028', 'rakistha@gmail.com', 'rakistha.parent@gmail.com', 'RAKISTHA', 'student', '9789779973', 'Beginner', 800, '2026-04-24', '2026-06-27', '800', 'Pending', 'Weekend', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-29', 's1029', 'nigunan@gmail.com', 'nigunan.parent@gmail.com', 'NIGUNAN', 'student', '9952178004', 'Beginner', 800, '2026-04-10', '2026-06-10', '2400', 'Pending', 'Weekday', '17:00', 'GYANASURYA', 'Active'),
  ('student-seed-30', 's1030', 'sreelaxmi@gmail.com', 'sreelaxmi.parent@gmail.com', 'SREELAXMI', 'student', '9952178004', 'Beginner', 800, '2026-04-24', '2026-06-04', '5000', 'Paid', 'Morning & Evening', '17:00', 'ROHITH SELVARAJ', 'Active'),
  ('student-seed-31', 's1031', 'magathi@gmail.com', 'magathi.parent@gmail.com', 'MAGATHI', 'student', '9843431086', 'Beginner', 800, '2026-04-08', '2026-06-08', '2200', 'Pending', 'Weekend', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-32', 's1032', 'krishna@gmail.com', 'krishna.parent@gmail.com', 'KRISHNA', 'student', '8300854984', 'Intermediate', 800, '2026-04-24', '2026-06-21', '750', 'Pending', 'Morning & Evening', '17:00', 'VISHNU', 'Active'),
  ('student-seed-33', 's1033', 'velava@gmail.com', 'velava.parent@gmail.com', 'VELAVA', 'student', '9025589784', 'Intermediate', 800, '2026-04-24', '2026-06-25', '1800', 'Overdue', 'Fri & Sat', '17:00', 'VISHNU', 'Active'),
  ('student-seed-34', 's1034', 'mukilan@gmail.com', 'mukilan.parent@gmail.com', 'MUKILAN', 'student', '8300074400', 'Advanced', 800, '2026-04-24', '2026-06-04', '2600', 'Pending', 'Fri & Sat', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-35', 's1035', 'anfal@gmail.com', 'anfal.parent@gmail.com', 'ANFAL', 'student', '8870846140', 'Intermediate', 800, '2026-04-24', '2026-06-22', '3300', 'Overdue', 'Fri & Sat', '17:00', 'VISHNU', 'Active'),
  ('student-seed-36', 's1036', 'anukshaa@gmail.com', 'anukshaa.parent@gmail.com', 'ANUKSHAA', 'student', '6374838638', 'Beginner', 800, '2026-04-23', '2026-06-23', '1800', 'Pending', 'Weekend', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-37', 's1037', 'varun@gmail.com', 'varun.parent@gmail.com', 'VARUN', 'student', '9677499903', 'Beginner', 1400, '2026-03-15', '2026-06-15', '1600', 'Pending', 'Weekend', '17:00', 'RANJITH', 'Active'),
  ('student-seed-38', 's1038', 'sakunthala@gmail.com', 'sakunthala.parent@gmail.com', 'SAKUNTHALA', 'student', '9150417754', 'Beginner', 800, '2026-04-15', '2026-06-04', '1700', 'Not Enrolled', 'Weekend', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-39', 's1039', 'sakthi@gmail.com', 'sakthi.parent@gmail.com', 'SAKTHI - SATHYA -SANKARLINGAM', 'student', '426045111', 'Elite', 799, '2026-04-15', '2026-06-04', '7000', 'Pending', 'Single', '17:00', 'RANJITH', 'Active'),
  ('student-seed-40', 's1040', 'riyas@gmail.com', 'riyas.parent@gmail.com', 'RIYAS', 'student', '9677499903', 'Beginner', 1400, '2026-03-15', '2026-06-15', '1600', 'Pending', 'Weekend', '17:00', 'RANJITH', 'Active'),
  ('student-seed-41', 's1041', 'poonthalir@gmail.com', 'poonthalir.parent@gmail.com', 'POONTHALIR', 'student', '9952484616', 'Beginner', 1000, '2026-03-22', '2026-06-21', '900', 'Pending', 'Morning & Evening', '17:00', 'VISHNU', 'Active'),
  ('student-seed-42', 's1042', 'mohammed.rayan@gmail.com', 'mohammed.rayan.parent@gmail.com', 'MOHAMMED RAYAN', 'student', '9566439055', 'Beginner', 800, '2026-04-13', '2026-06-20', '1700', 'Pending', 'Weekend', '17:00', 'YOGESH', 'Active'),
  ('student-seed-43', 's1043', 'jayaraj@gmail.com', 'jayaraj.parent@gmail.com', 'JAYARAJ', 'student', '8682837002', 'Beginner', 1000, '2026-03-07', '2026-06-20', '2500', 'Pending', 'Fri & Sat', '17:00', 'VISHNU', 'Active'),
  ('student-seed-44', 's1044', 'jeevan@gmail.com', 'jeevan.parent@gmail.com', 'JEEVAN BASIC', 'student', '4086792841', 'Beginner', 800, '2026-03-15', '2026-06-24', '3300', 'Pending', 'Weekday', '17:00', 'SUDHIN', 'Active'),
  ('student-seed-45', 's1045', 'arunya@gmail.com', 'arunya.parent@gmail.com', 'ARUNYA', 'student', '9042040150', 'Beginner', 800, '2026-04-24', '2026-06-24', '2400', 'Pending', 'Weekend', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-46', 's1046', 'aadhavan@gmail.com', 'aadhavan.parent@gmail.com', 'AADHAVAN - SINGAPORE', 'student', '86501029', 'Beginner', 850, '2026-04-20', '2026-06-04', '2200', 'Paid', 'Weekday', '17:00', 'ARIVUSELVAM', 'Active'),
  ('student-seed-47', 's1047', 'anush@gmail.com', 'anush.parent@gmail.com', 'ANUSH', 'student', '6374838638', 'Intermediate', 800, '2026-04-23', '2026-06-23', '1000', 'Pending', 'Weekend', '17:00', 'GYANASURYA', 'Active')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  level = EXCLUDED.level,
  rating = EXCLUDED.rating,
  join_date = EXCLUDED.join_date,
  due_date = EXCLUDED.due_date,
  fee = EXCLUDED.fee,
  payment_status = EXCLUDED.payment_status,
  batch = EXCLUDED.batch,
  timetable = EXCLUDED.timetable,
  coach = EXCLUDED.coach,
  status = EXCLUDED.status,
  email = EXCLUDED.email,
  "childEmail" = EXCLUDED."childEmail";

-- 2. UPDATE COACH EMAILS
UPDATE public.users 
SET email = lower(regexp_replace(full_name, '\s+', '', 'g')) || '@gmail.com'
WHERE role = 'coach';

-- 3. INSERT CREDENTIALS FOR STUDENTS (Password: 123456)
-- (We use IS NOT NULL to avoid the 'null value violates not-null constraint' error from pre-existing demo users)
INSERT INTO public.credentials (email, password)
SELECT email, '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
FROM public.users WHERE role = 'student' AND email IS NOT NULL
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 4. INSERT CREDENTIALS FOR PARENTS (Password: 123456)
INSERT INTO public.credentials (email, password)
SELECT "childEmail", '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
FROM public.users WHERE role = 'student' AND "childEmail" IS NOT NULL
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 5. INSERT CREDENTIALS FOR COACHES (Password: 12345678)
INSERT INTO public.credentials (email, password)
SELECT email, 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f' 
FROM public.users WHERE role = 'coach' AND email IS NOT NULL
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 6. INSERT CLASSES & SCHEDULE
INSERT INTO public.classes (
  id, "coachId", "coachName", title, level, batch, days, time, duration, "zoomLink", "studentIds"
) VALUES
  ('class-rohith-b1', 'c0c0c0c0-0000-4000-8000-000000000008', 'ROHITH SELVARAJ', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Tuesday', 'Wednesday', 'Friday'], '5:00 AM', 40, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-30']),
  ('class-rohith-b2', 'c0c0c0c0-0000-4000-8000-000000000008', 'ROHITH SELVARAJ', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Wednesday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-4']),
  ('class-ranjith-b1', 'c0c0c0c0-0000-4000-8000-000000000007', 'RANJITH', 'Batch 1', 'Advanced', 'Batch 1', ARRAY['Wednesday', 'Friday'], '2:45 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-39']),
  ('class-ranjith-b2', 'c0c0c0c0-0000-4000-8000-000000000007', 'RANJITH', 'Batch 2', 'Advanced', 'Batch 2', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-40', 'student-seed-19', 'student-seed-37']),
  ('class-gyana-b1', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Wednesday', 'Friday'], '5:40 AM', 40, 'https://meet.google.com/beg-inner-room', ARRAY[]::TEXT[]),
  ('class-gyana-b2', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Wednesday', 'Friday'], '7:00 AM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-29']),
  ('class-gyana-b3', 'c0c0c0c0-0000-4000-8000-000000000002', 'GYANASURYA', 'Batch 3', 'Beginner', 'Batch 3', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-27', 'student-seed-47', 'student-seed-28', 'student-seed-26']),
  ('class-arivu-b1', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 1', 'Advanced', 'Batch 1', ARRAY['Monday', 'Thursday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-8', 'student-seed-11']),
  ('class-arivu-b2', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 2', 'Advanced', 'Batch 2', ARRAY['Monday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-45', 'student-seed-31', 'student-seed-25']),
  ('class-arivu-b3', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 3', 'Advanced', 'Batch 3', ARRAY['Monday', 'Thursday'], '8:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-20', 'student-seed-24']),
  ('class-arivu-b4', 'c0c0c0c0-0000-4000-8000-000000000001', 'ARIVUSELVAM', 'Batch 4', 'Advanced', 'Batch 4', ARRAY['Tuesday', 'Friday'], '7:00 PM', 60, 'https://meet.google.com/adv-endgames-xyz', ARRAY['student-seed-34', 'student-seed-23']),
  ('class-yogesh-b1', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Thursday', 'Friday'], '6:00 AM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-44']),
  ('class-yogesh-b2', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 2', 'Beginner', 'Batch 2', ARRAY['Saturday', 'Sunday'], '6:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-16', 'student-seed-6']),
  ('class-yogesh-b3', 'c0c0c0c0-0000-4000-8000-000000000005', 'YOGESH', 'Batch 3', 'Beginner', 'Batch 3', ARRAY['Saturday', 'Sunday'], '7:30 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-22', 'student-seed-42', 'student-seed-0']),
  ('class-sudhin-b1', 'c0c0c0c0-0000-4000-8000-000000000006', 'SUDHIN', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Saturday', 'Sunday'], '7:00 PM', 60, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-17', 'student-seed-18', 'student-seed-5']),
  ('class-vasanth-b1', 'c0c0c0c0-0000-4000-8000-000000000009', 'VASANTH KUMAR', 'Batch 1', 'Beginner', 'Batch 1', ARRAY['Monday', 'Wednesday'], '7:00 PM', 40, 'https://meet.google.com/beg-inner-room', ARRAY['student-seed-3']),
  ('class-vishnu-b1', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 1', 'Intermediate', 'Batch 1', ARRAY['Wednesday', 'Thursday'], '6:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-10']),
  ('class-vishnu-b2', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 2', 'Intermediate', 'Batch 2', ARRAY['Wednesday', 'Thursday'], '7:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-9']),
  ('class-vishnu-b3', 'c0c0c0c0-0000-4000-8000-000000000003', 'VISHNU', 'Batch 3', 'Intermediate', 'Batch 3', ARRAY['Friday', 'Saturday'], '7:00 PM', 60, 'https://meet.google.com/int-strategy-abc', ARRAY['student-seed-35', 'student-seed-32', 'student-seed-33', 'student-seed-43', 'student-seed-41'])
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
