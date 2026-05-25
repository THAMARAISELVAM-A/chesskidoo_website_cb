-- 003_portal_persistence_fixes.sql
-- Fixes for portal data NOT persisting to the DB (saves were silently failing
-- and only writing to localStorage). Applied to project bqlnsununvsyksvhczrm.
--
-- Root causes:
--  1. users.id was uuid, but the app generates string ids (coach-<ts>,
--     student-<ts>, par-<ts>, user-<ts>). All other tables reference users by
--     TEXT, so the uuid PK only rejected upserts. -> make users.id text.
--  2. Coach save wrote columns that did not exist (address/availability/bio) and
--     stored a TEXT specialization in the INTEGER `puzzle` column. -> add the
--     missing text columns; app now writes `specialization`.
--  3. attendance.id was bigint-identity but saveAttendance assigns string ids
--     ('att-<ts>') and also sends coachName (no such column). -> id to text +
--     add coachName.

-- 1. users.id -> text
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;

-- 2. coach/profile columns the forms write
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specialization text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batches text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fide_rating text;

-- 3. attendance id -> text + coachName
ALTER TABLE public.attendance ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE public.attendance ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "coachName" text;
