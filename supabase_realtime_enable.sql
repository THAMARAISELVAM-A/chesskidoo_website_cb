-- ============================================================================
--  ChessKidoo — Enable Supabase Realtime on the live-sync tables
--  Run once in the Supabase SQL editor. Safe to re-run.
--
--  Powers: live homework delivery (coach → student), instant submission
--  grading, live-class broadcasts, and puzzle progress sync.
-- ============================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'assignments',
    'hw_submissions',
    'broadcasts',
    'puzzle_scores',
    'puzzle_assignments',
    'meetings',
    'multiplayer_games',
    'pgn_games',
    'pgn_analysis'
  ] LOOP
    -- add the table to the realtime publication if it exists and isn't already in it
    IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = t)
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
              WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t)
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Make UPDATE/DELETE payloads include the full old row (so the client can
-- reconcile changes reliably).
ALTER TABLE public.assignments    REPLICA IDENTITY FULL;
ALTER TABLE public.hw_submissions REPLICA IDENTITY FULL;
