-- SQL SCRIPT TO UPDATE ALL CREDENTIALS AND EMAILS
-- Run this in your Supabase SQL Editor

-- 1. UPDATE COACHES
-- Set coach email to lower(replace(full_name, ' ', '')) || '@coach.com'
UPDATE public.users 
SET email = lower(regexp_replace(full_name, '\s+', '', 'g')) || '@coach.com'
WHERE role = 'coach';

-- Insert coach credentials (Password: 12345678)
INSERT INTO public.credentials (email, password)
SELECT email, 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f' 
FROM public.users WHERE role = 'coach'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 2. UPDATE STUDENTS
-- We will extract the first name (before space or dash) to keep emails clean,
-- otherwise emails like "praveen-parentsname@student.com" are too messy.
-- Let's just use a simplified version of their full name.
UPDATE public.users 
SET email = lower(regexp_replace(split_part(full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || '@student.com'
WHERE role = 'student';

-- Ensure no duplicates caused by split_part (if two students have the same first name, this would clash)
-- Using their unique id (e.g. student-seed-0) is safer, but the user requested "student name". 
-- To prevent duplicates and keep it clean, we'll append their user id number to the name.
UPDATE public.users
SET email = lower(regexp_replace(split_part(full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || replace(userid, 's', '') || '@student.com'
WHERE role = 'student';

-- Insert student credentials (Password: 123456)
INSERT INTO public.credentials (email, password)
SELECT email, '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
FROM public.users WHERE role = 'student'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 3. PARENT CREDENTIALS
-- We will insert parent credentials into the credentials table so they can log in.
-- Parent email = studentname.parent@mail.com
-- Password: 123456
INSERT INTO public.credentials (email, password)
SELECT 
  lower(regexp_replace(split_part(full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || replace(userid, 's', '') || '.parent@mail.com', 
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
FROM public.users WHERE role = 'student'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- Link the parent email in the users table so the portal knows who the parent is.
UPDATE public.users
SET "childEmail" = lower(regexp_replace(split_part(full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || replace(userid, 's', '') || '.parent@mail.com'
WHERE role = 'student';

-- Note on Admin: 
-- Admin email remains admin@gmail.com with password admin123 (from previous setup).
