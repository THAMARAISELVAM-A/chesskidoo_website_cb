# ChessKidoo — PGN Analysis Worker (`analyze-pgn`)

Background worker that runs Stockfish over queued games and writes results to
`pgn_analysis`. Part of the hybrid PGN vault (see `supabase_pgn_vault.sql`).

## Flow

```
Student saves / imports a PGN
        │  (frontend: pgn-vault.js)
        ▼
pgn_games  ──trigger──►  pgn_analysis_queue   (status = queued)
                                  │
                                  ▼  this edge function (cron, every minute)
                          Stockfish (WASM)  →  per-move evals, accuracy, blunders
                                  │
                                  ▼
                          pgn_analysis  +  pgn_games.analysed = true
                                  │
                                  ▼
                    Dashboard / Progress graphs update
```

## 1. Apply the schema

Run `supabase_pgn_vault.sql` in the Supabase SQL editor (or `supabase db push`).

## 2. Deploy the function

```bash
supabase functions deploy analyze-pgn --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 3. Schedule it (drains the queue)

Enable `pg_cron` + `pg_net`, then:

```sql
select cron.schedule(
  'analyze-pgn-drain', '* * * * *',
  $$ select net.http_post(
       url     := 'https://<PROJECT-REF>.functions.supabase.co/analyze-pgn',
       headers := jsonb_build_object('Content-Type','application/json',
                  'Authorization','Bearer <SERVICE_ROLE_KEY>'),
       body    := jsonb_build_object('batch', 3)
     ); $$
);
```

## Manual calls

```bash
# analyse one game now
curl -X POST '.../analyze-pgn' -H 'Content-Type: application/json' -d '{"gameId":"pgn-..."}'
# drain up to 5 queued jobs
curl -X POST '.../analyze-pgn' -H 'Content-Type: application/json' -d '{"batch":5}'
```

## Notes / tuning

- `MAX_PLIES` (60) and `ENGINE_DEPTH` (12) keep each job inside the edge CPU
  budget. Raise them if you move to a dedicated worker (e.g. a small Fly.io /
  Railway container running native Stockfish) — the queue contract is identical.
- If the WASM engine can't initialise in the edge runtime, jobs are marked
  `error` with a message and the frontend keeps showing the heuristic accuracy
  from `pgn-vault.js`; nothing breaks.
- The frontend works fully **without** this function deployed — analysis simply
  stays "pending" until a worker drains the queue.
