// supabase/functions/analyze-pgn/index.ts
// -----------------------------------------------------------------------------
// ChessKidoo — Background PGN analysis worker (Stockfish queue consumer)
//
// Consumes rows from `pgn_analysis_queue`, runs Stockfish (WASM) over each
// position of the game, classifies moves (inaccuracy / mistake / blunder),
// computes a Lichess-style accuracy score, and writes the result into
// `pgn_analysis` + flips `pgn_games.analysed = true`.
//
// Invocation:
//   POST { "gameId": "pgn-..." }   → analyse one specific game now
//   POST { "batch": 3 }            → drain up to N queued jobs (default 3)
//   (no body / GET)                → drain the default batch
//
// Recommended: trigger every minute with pg_cron + pg_net, or a Supabase
// scheduled function, so analyses run without blocking the website.
//
// Env (auto-present in Supabase Edge runtime):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy analyze-pgn --no-verify-jwt
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Chess } from "https://esm.sh/chess.js@1.0.0-beta.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Keep within the edge CPU budget: cap plies analysed and engine depth.
const MAX_PLIES = 60;
const ENGINE_DEPTH = 12;
const DEFAULT_BATCH = 3;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Stockfish (WASM) UCI wrapper ────────────────────────────────────────────
let _engine: any = null;
let _engineFailed = false;

async function getEngine(): Promise<any | null> {
  if (_engine) return _engine;
  if (_engineFailed) return null;
  try {
    const mod = await import("https://esm.sh/stockfish@16.0.0");
    const factory = (mod as any).default ?? (mod as any);
    const sf = typeof factory === "function" ? await factory() : factory;

    const listeners: ((line: string) => void)[] = [];
    if (typeof sf.addMessageListener === "function") {
      sf.addMessageListener((l: string) => listeners.forEach((fn) => fn(l)));
    } else {
      sf.onmessage = (e: any) => {
        const l = typeof e === "string" ? e : e?.data;
        if (l != null) listeners.forEach((fn) => fn(String(l)));
      };
    }
    const post = (cmd: string) => sf.postMessage(cmd);
    const onLine = (fn: (line: string) => void) => listeners.push(fn);
    const offLine = (fn: (line: string) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };

    _engine = { post, onLine, offLine };
    post("uci");
    post("isready");
    post("setoption name Threads value 1");
    post("setoption name Hash value 16");
    return _engine;
  } catch (err) {
    console.error("[analyze-pgn] Stockfish init failed:", err);
    _engineFailed = true;
    return null;
  }
}

// Evaluate one FEN. Returns centipawns from side-to-move's perspective.
function evalFen(engine: any, fen: string, depth = ENGINE_DEPTH): Promise<{ cp: number; mate: number | null; best: string }> {
  return new Promise((resolve) => {
    let cp = 0, mate: number | null = null, best = "";
    const handler = (line: string) => {
      if (line.startsWith("info") && line.includes(" score ")) {
        const cpM = line.match(/score cp (-?\d+)/);
        const mtM = line.match(/score mate (-?\d+)/);
        if (cpM) { cp = parseInt(cpM[1], 10); mate = null; }
        if (mtM) { mate = parseInt(mtM[1], 10); cp = mate > 0 ? 100000 : -100000; }
      } else if (line.startsWith("bestmove")) {
        best = line.split(" ")[1] || "";
        engine.offLine(handler);
        resolve({ cp, mate, best });
      }
    };
    engine.onLine(handler);
    engine.post("position fen " + fen);
    engine.post("go depth " + depth);
  });
}

// Lichess-style: win% from centipawns (side to move).
function winPct(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
// Lichess accuracy from a win%-before / win%-after drop.
function moveAccuracy(before: number, after: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * (before - after)) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

async function analyseGame(job: { game_id: string; pgn: string; user_id?: string; depth?: number }) {
  const chess = new Chess();
  try {
    chess.loadPgn(job.pgn, { sloppy: true } as any);
  } catch {
    chess.loadPgn(job.pgn);
  }
  const history = chess.history({ verbose: true });
  const plies = Math.min(history.length, MAX_PLIES);

  // Rebuild FEN list (position BEFORE each move).
  const replay = new Chess();
  const fens: string[] = [];
  const sans: string[] = [];
  for (let i = 0; i < plies; i++) {
    fens.push(replay.fen());
    sans.push(history[i].san);
    replay.move(history[i]);
  }
  fens.push(replay.fen()); // final

  const engine = await getEngine();
  const moves: any[] = [];
  let whiteLossSum = 0, whiteCount = 0, blackLossSum = 0, blackCount = 0;
  let blunders = 0, mistakes = 0, inaccuracies = 0;

  if (engine) {
    let prevWin: number | null = null; // win% (white POV) of position before the move
    for (let i = 0; i <= plies; i++) {
      const ev = await evalFen(engine, fens[i], job.depth || ENGINE_DEPTH);
      const sideToMove = fens[i].split(" ")[1]; // 'w' | 'b'
      const cpWhite = sideToMove === "w" ? ev.cp : -ev.cp;
      const wWhite = winPct(cpWhite);

      if (i > 0 && prevWin !== null) {
        const moverIsWhite = (i - 1) % 2 === 0;
        // win% for the mover, before vs after
        const before = moverIsWhite ? prevWin : 100 - prevWin;
        const after = moverIsWhite ? wWhite : 100 - wWhite;
        const acc = moveAccuracy(before, after);
        const drop = Math.max(0, before - after);
        let judgement = "ok";
        if (drop >= 20) { judgement = "blunder"; blunders++; }
        else if (drop >= 10) { judgement = "mistake"; mistakes++; }
        else if (drop >= 5) { judgement = "inaccuracy"; inaccuracies++; }
        moves.push({ ply: i, san: sans[i - 1], eval_cp: cpWhite, judgement, accuracy: Math.round(acc) });
        if (moverIsWhite) { whiteLossSum += drop; whiteCount++; }
        else { blackLossSum += drop; blackCount++; }
      }
      prevWin = wWhite;
    }
  }

  const avg = (s: number, n: number) => (n ? s / n : 0);
  const accFromLoss = (loss: number) => Math.max(0, Math.min(100, 100 - loss * 1.8));
  const whiteAcc = Math.round(accFromLoss(avg(whiteLossSum, whiteCount)));
  const blackAcc = Math.round(accFromLoss(avg(blackLossSum, blackCount)));

  const summary = {
    engine: engine ? "stockfish-16-wasm" : "unavailable",
    depth: job.depth || ENGINE_DEPTH,
    white_accuracy: whiteAcc,
    black_accuracy: blackAcc,
    blunders, mistakes, inaccuracies,
    final_eval_cp: moves.length ? moves[moves.length - 1].eval_cp : 0,
    analysed_plies: plies,
  };

  await admin.from("pgn_analysis").upsert({
    game_id: job.game_id,
    user_id: job.user_id ?? null,
    engine: summary.engine,
    depth: summary.depth,
    summary,
    moves,
    status: engine ? "done" : "error",
  }, { onConflict: "game_id" });

  await admin.from("pgn_games").update({
    analysed: true,
    accuracy: whiteAcc, // overall hint; per-color lives in pgn_analysis
  }).eq("id", job.game_id);

  return summary;
}

async function processJob(jobRow: any) {
  await admin.from("pgn_analysis_queue")
    .update({ status: "processing", started_at: new Date().toISOString(), attempts: (jobRow.attempts || 0) + 1 })
    .eq("id", jobRow.id);
  try {
    const summary = await analyseGame(jobRow);
    await admin.from("pgn_analysis_queue")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", jobRow.id);
    return { id: jobRow.game_id, ok: true, summary };
  } catch (err) {
    await admin.from("pgn_analysis_queue")
      .update({ status: "error", error: String(err), finished_at: new Date().toISOString() })
      .eq("id", jobRow.id);
    return { id: jobRow.game_id, ok: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const results: any[] = [];

  // Mode 1: analyse a specific game immediately.
  if (body.gameId) {
    const { data: g } = await admin.from("pgn_games").select("id,user_id,pgn").eq("id", body.gameId).single();
    if (!g) return new Response(JSON.stringify({ error: "game not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    results.push(await processJob({ id: -1, game_id: g.id, user_id: g.user_id, pgn: g.pgn, depth: ENGINE_DEPTH, attempts: 0 }));
    return new Response(JSON.stringify({ results }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Mode 2: drain the queue.
  const batch = Math.max(1, Math.min(10, body.batch || DEFAULT_BATCH));
  const { data: jobs } = await admin
    .from("pgn_analysis_queue")
    .select("*")
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("requested_at", { ascending: true })
    .limit(batch);

  for (const job of jobs || []) {
    results.push(await processJob(job));
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
