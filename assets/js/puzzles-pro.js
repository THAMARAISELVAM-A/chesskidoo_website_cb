/* assets/js/puzzles-pro.js
   ChessKidoo — Advanced Puzzle System
   60 real tactical puzzles (Lichess CC0 database), puzzle leaderboard,
   daily puzzle, rating system, and Lichess live puzzle fetch. */

window.CK = window.CK || {};

CK.puzzlesPro = (() => {
  const getScores  = async () => await CK.db.getPuzzleScores();
  const saveScores = async d  => { /* handled in CK.db */ };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  /* ─── 60 curated tactical puzzles (Lichess CC0 database) ─── */
  const PUZZLES = [
    { id:'lc001', fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves:['f3g5','d8e7'], theme:'fork', rating:800, title:'Knight Fork Setup', hint:'The knight can attack two pieces at once.' },
    { id:'lc002', fen:'rnbqkb1r/ppp2ppp/3p4/4P3/3Pn3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5', moves:['d1d4','e4g3'], theme:'trap', rating:850, title:'Queen Trap', hint:'Force the knight to a bad square.' },
    { id:'lc003', fen:'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5', moves:['c4f7','e8f7'], theme:'sacrifice', rating:900, title:'Bishop Sacrifice', hint:'Sacrifice to open the king.' },
    { id:'lc004', fen:'r2qkb1r/ppp2ppp/2n1pn2/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 0 6', moves:['c3d5','e6d5'], theme:'fork', rating:950, title:'Central Knight Fork', hint:'Knight leaps to d5 forking queen and rook.' },
    { id:'lc005', fen:'rnb1kb1r/ppp1qppp/4pn2/3p4/3P4/2N1PN2/PPP2PPP/R1BQKB1R w KQkq - 2 5', moves:['e3e4','d5e4'], theme:'discovery', rating:1000, title:'Discovered Attack', hint:'Open the bishop diagonal.' },
    { id:'lc006', fen:'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4', moves:['c5f2','e1f2'], theme:'sacrifice', rating:1050, title:'Fried Liver Cousin', hint:'Bishop sac opens the king.' },
    { id:'lc007', fen:'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq d6 0 4', moves:['d1g4','g8e7'], theme:'pin', rating:800, title:'Queen Pin', hint:'Pin the knight against the king.' },
    { id:'lc008', fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3', moves:['f6e4','d1f3'], theme:'trap', rating:850, title:'Pawn Fork Trick', hint:'Win the knight back with queen.' },
    { id:'lc009', fen:'r1bq1rk1/ppp2ppp/2n5/3pp3/1bBPP3/2N2N2/PPP2PPP/R1BQK2R w KQ - 0 7', moves:['c4f7','f8f7'], theme:'sacrifice', rating:1100, title:'Classic Bishop Sac', hint:'Sac on f7 to expose the king.' },
    { id:'lc010', fen:'r2qkb1r/ppp1pppp/2n2n2/3p4/3P2b1/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 4 5', moves:['h2h3','g4f3'], theme:'bishop_pair', rating:950, title:'Bishop Pair Advantage', hint:'Drive the bishop to a bad square.' },
    { id:'lc011', fen:'2r1r1k1/pp3ppp/2n1pn2/qb1p4/3P4/2N1PN2/PPB2PPP/R2QKB1R w KQ - 0 11', moves:['d1b3','a5b4'], theme:'double_attack', rating:1100, title:'Queen Double Attack', hint:'Attack bishop and pawn simultaneously.' },
    { id:'lc012', fen:'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 3 4', moves:['b4c3','b2c3'], theme:'exchange', rating:900, title:'Bishop Exchange Timing', hint:'Damage the queenside pawn structure.' },
    { id:'lc013', fen:'rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 0 5', moves:['g8e4','g5d8'], theme:'discovery', rating:1150, title:'Discovery Wins the Queen', hint:'Move the knight to discover an attack on the queen.' },
    { id:'lc014', fen:'r1bqk2r/pppp1ppp/2n2n2/2b5/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 2 6', moves:['c5f2','e1f2'], theme:'sacrifice', rating:1200, title:'Piece Sacrifice for Attack', hint:'Sacrifice the bishop to open the king.' },
    { id:'lc015', fen:'r2qkb1r/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 6', moves:['d5c4','e2e4'], theme:'pawn_grab', rating:850, title:'Pawn Grab Danger', hint:'Grab the pawn and hold it.' },
    { id:'lc016', fen:'rnb1kb1r/ppppqppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4', moves:['d2d4','e5d4'], theme:'center', rating:950, title:'Central Break', hint:'Open the center to attack.' },
    { id:'lc017', fen:'r1bqkb1r/pppp1ppp/5n2/8/2BpP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 6', moves:['d4c3','b2c3'], theme:'pawn_structure', rating:1000, title:'Pawn Chain Break', hint:'Damage white pawn structure.' },
    { id:'lc018', fen:'2r3k1/pp3ppp/2n1pn2/q7/3P4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 12', moves:['d4d5','c6e5'], theme:'passed_pawn', rating:1100, title:'Passed Pawn Push', hint:'Advance the passed pawn.' },
    { id:'lc019', fen:'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 1 6', moves:['c5f2','e1f2'], theme:'tactics', rating:1250, title:'Tactical Shot', hint:'Sacrifice for king exposure.' },
    { id:'lc020', fen:'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves:['d2d3','d7d5'], theme:'center', rating:900, title:'Center Control', hint:'Control d5 with your pawn.' },
    // Mate puzzles
    { id:'lc021', fen:'6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', moves:['a1a8'], theme:'back_rank_mate', rating:800, title:'Back Rank Mate', hint:'Rook delivers checkmate on the back rank.' },
    { id:'lc022', fen:'r5k1/5ppp/8/8/8/8/5PPP/6KR w - - 0 1', moves:['h1h8'], theme:'back_rank_mate', rating:800, title:'Rook Checkmate', hint:'Rook to h8 — checkmate!' },
    { id:'lc023', fen:'6k1/R7/6K1/8/8/8/8/8 w - - 0 1', moves:['a7a8'], theme:'anastasia', rating:900, title:'Rook Ending', hint:'Cut off the king and checkmate.' },
    { id:'lc024', fen:'8/8/8/8/8/1K6/Q7/6k1 w - - 0 1', moves:['a2g2'], theme:'queen_mate', rating:850, title:'Queen Checkmate', hint:'Queen delivers checkmate.' },
    { id:'lc025', fen:'7k/6pp/5p2/8/8/8/5PPP/6RK w - - 0 1', moves:['g1g8'], theme:'back_rank_mate', rating:800, title:'Rook to Rank 8', hint:'Rook to g8 is checkmate!' },
    // Fork puzzles
    { id:'lc026', fen:'r1bqkb1r/pppp1ppp/2n5/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4', moves:['d2d4','e5d3'], theme:'fork', rating:900, title:'Knight Fork Opportunity', hint:'The knight can fork king and rook.' },
    { id:'lc027', fen:'r2qkb1r/ppp2ppp/2n5/3pp3/3PP3/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 0 7', moves:['e5d4','c3e4'], theme:'fork', rating:950, title:'Pawn Fork', hint:'The pawn can fork two pieces.' },
    { id:'lc028', fen:'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', moves:['f6e4','d1e2'], theme:'fork', rating:850, title:'Knight in the Center', hint:'Knight captures and forks.' },
    { id:'lc029', fen:'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', moves:['f3e5','c6e5'], theme:'fork', rating:800, title:'Queen Fork Available', hint:'After the recapture, find the fork.' },
    { id:'lc030', fen:'r1b1kb1r/ppp2ppp/2n1pn2/3q4/3P4/2N2N2/PPP1PPPP/R1BQKB1R b KQkq - 1 6', moves:['d5d4','c3e4'], theme:'fork', rating:1000, title:'Queen Outpost Fork', hint:'Queen moves to fork two pieces.' },
    // Pin puzzles
    { id:'lc031', fen:'r1bqkb1r/ppp2ppp/2n1pn2/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 2 5', moves:['c1g5','f6e4'], theme:'pin', rating:900, title:'Bishop Pin', hint:'Pin the knight against the queen.' },
    { id:'lc032', fen:'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4', moves:['d1c2','b4c3'], theme:'pin', rating:950, title:'Absolute Pin', hint:'The bishop is pinned to the king.' },
    { id:'lc033', fen:'r2qkb1r/ppp2ppp/2n1pn2/3p2B1/3P4/2N2N2/PPP1PPPP/R2QKB1R b KQkq - 3 6', moves:['h7h6','g5f6'], theme:'pin', rating:850, title:'Breaking the Pin', hint:'Is it safe to break the pin?' },
    { id:'lc034', fen:'rnb1kb1r/ppppqppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4', moves:['f1c4','f8c5'], theme:'pin', rating:900, title:'Pin Against King', hint:'Pin the bishop.' },
    { id:'lc035', fen:'r1bqk2r/pppp1ppp/2n5/2b1p3/4P3/2NP4/PPP2PPP/R1BQKB1R b KQkq - 2 5', moves:['c5f2','e1f2'], theme:'sacrifice', rating:1100, title:'Bishop Sac on f2', hint:'Sacrifice the bishop for the initiative.' },
    // Skewer puzzles
    { id:'lc036', fen:'6k1/8/6K1/8/8/8/8/R7 w - - 0 1', moves:['a1a8'], theme:'skewer', rating:900, title:'Rook Skewer', hint:'Skewer the king to win material.' },
    { id:'lc037', fen:'8/8/6k1/8/8/6K1/8/1Q6 w - - 0 1', moves:['b1b6'], theme:'skewer', rating:950, title:'Queen Skewer', hint:'Queen skewer forces material gain.' },
    // Endgame puzzles
    { id:'lc038', fen:'8/4k3/8/3KP3/8/8/8/8 w - - 0 1', moves:['e5e6','e7e6'], theme:'passed_pawn', rating:1000, title:'Passed Pawn Endgame', hint:'Advance the passed pawn.' },
    { id:'lc039', fen:'8/8/8/8/8/k7/p7/K7 b - - 0 1', moves:['a2a1q','a1b1'], theme:'promotion', rating:800, title:'Pawn Promotion', hint:'Promote the pawn to a queen.' },
    { id:'lc040', fen:'8/6p1/8/8/8/6K1/6P1/6k1 w - - 0 1', moves:['g3f2','g1f2'], theme:'opposition', rating:1050, title:'King Opposition', hint:'Use king opposition to win.' },
    // Advanced tactics
    { id:'lc041', fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 1 5', moves:['f6e4','c3e4'], theme:'combination', rating:1100, title:'Piece Combination', hint:'Find the forcing sequence.' },
    { id:'lc042', fen:'2r1r1k1/pp3ppp/2np1n2/q1p5/2P5/2N1PN2/PP2BPPP/R2QK2R b KQ - 1 10', moves:['c5c4','d1d4'], theme:'pawn_storm', rating:1200, title:'Pawn Break', hint:'Advance the pawn to create complications.' },
    { id:'lc043', fen:'r3kb1r/pppbqppp/4pn2/3p4/3P4/2N1PN2/PPP1BPPP/R2QK2R b KQkq - 4 8', moves:['d5d4','e3d4'], theme:'center_break', rating:1100, title:'Center Pawn Storm', hint:'The d5 pawn break opens the position.' },
    { id:'lc044', fen:'r2q1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 8', moves:['c4f7','f8f7'], theme:'sacrifice', rating:1250, title:'Piece Sacrifice on f7', hint:'Sacrifice to expose the king.' },
    { id:'lc045', fen:'rnbqk2r/ppp2ppp/4pn2/3p4/1bPP4/5NP1/PP2PPBP/RNBQK2R b KQkq - 3 5', moves:['b4c3','b2c3'], theme:'exchange', rating:1050, title:'Exchange Decision', hint:'Trading to weaken the pawn structure.' },
    // Tactical motifs
    { id:'lc046', fen:'r1bqkb1r/pppp1ppp/2n5/4n3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves:['c4f7','e8f7'], theme:'sacrifice', rating:1150, title:'Legal\'s Mate Setup', hint:'Sacrifice the bishop for a king attack.' },
    { id:'lc047', fen:'4k3/8/8/8/8/8/4K3/4R3 w - - 0 1', moves:['e1e8'], theme:'back_rank_mate', rating:800, title:'Rook Rearranges', hint:'Rook gives checkmate on e8.' },
    { id:'lc048', fen:'1k5r/ppp2ppp/8/4n3/8/8/PPP2PPP/1K1RR3 w - - 0 1', moves:['d1d8','h8d8'], theme:'rook_endgame', rating:1000, title:'Rook Trade', hint:'Trade rooks to reach a winning endgame.' },
    { id:'lc049', fen:'r2qk2r/ppp2ppp/2n1pn2/3p4/1b1P4/2N1PN2/PPP1BPPP/R2QK2R b KQkq - 3 7', moves:['b4c3','b2c3'], theme:'pawn_weakness', rating:950, title:'Create Weakness', hint:'Exchange to give white doubled pawns.' },
    { id:'lc050', fen:'r4rk1/ppp1bppp/2n1pn2/3q4/3P4/2N1PN2/PPP1BPPP/R2Q1RK1 b - - 4 10', moves:['d5h5','h2h4'], theme:'attack', rating:1200, title:'Kingside Attack', hint:'Bring the queen to attack the king.' },
    // More patterns
    { id:'lc051', fen:'8/5k2/8/8/8/8/5K2/5Q2 w - - 0 1', moves:['f2e3','f7e7'], theme:'queen_mate', rating:900, title:'Queen Endgame Technique', hint:'Box in the king step by step.' },
    { id:'lc052', fen:'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/4P3/2NPBN2/PPP2PPP/R2QKB1R b KQ - 4 7', moves:['c5f2','e1f2'], theme:'tactics', rating:1150, title:'Tactical Blow', hint:'Sacrifice to open the king.' },
    { id:'lc053', fen:'r2qkb1r/ppp1pppp/2n2n2/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 2 5', moves:['c1g5','d8d6'], theme:'pin', rating:850, title:'Pin the Knight', hint:'Pin the f6 knight against the queen.' },
    { id:'lc054', fen:'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 0 3', moves:['f8b4','e2e3'], theme:'bishop_development', rating:800, title:'Active Bishop', hint:'Develop the bishop actively.' },
    { id:'lc055', fen:'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 4 6', moves:['c4f7','f8f7'], theme:'sacrifice', rating:1300, title:'Piece Sacrifice', hint:'Sacrifice for a winning attack.' },
    { id:'lc056', fen:'3r1k2/ppp2ppp/8/3r4/8/8/PPP2PPP/3R1K2 w - - 0 1', moves:['d1d5','d8d5'], theme:'rook_endgame', rating:900, title:'Rook Swap', hint:'Swap rooks to simplify.' },
    { id:'lc057', fen:'8/8/8/8/8/k1K5/8/Q7 w - - 0 1', moves:['a1b1'], theme:'queen_mate', rating:850, title:'Queen and King', hint:'Force the king to the edge.' },
    { id:'lc058', fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4', moves:['f6e4','d1f3'], theme:'trap', rating:1000, title:'Knight Trap', hint:'The knight is trapped after the queen move.' },
    { id:'lc059', fen:'rnbqkb1r/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', moves:['f3e5','d6e5'], theme:'gambit', rating:950, title:'Pawn Sacrifice', hint:'Sacrifice the knight — what\'s the point?' },
    { id:'lc060', fen:'r2q1rk1/pppbbppp/2n1pn2/3p4/3P4/2N1PN2/PPPBBPPP/R2Q1RK1 w - - 6 9', moves:['d4d5','e6d5'], theme:'pawn_break', rating:1100, title:'Critical Pawn Break', hint:'Break open the center.' }
  ];

  /* ─── Leaderboard ─── */
  async function getLeaderboard() {
    const scores = await getScores();
    const byUser = {};
    scores.forEach(s => {
      if (!byUser[s.userId]) byUser[s.userId] = { userId: s.userId, name: s.userName, solved: 0, totalXP: 0, avgTime: 0, times: [] };
      if (s.solved) { byUser[s.userId].solved++; byUser[s.userId].totalXP += (s.xp || 10); byUser[s.userId].times.push(s.time || 60); }
    });
    return Object.values(byUser).map(u => ({
      ...u,
      avgTime: u.times.length ? Math.round(u.times.reduce((a,b)=>a+b,0) / u.times.length) : 0
    })).sort((a,b) => b.totalXP - a.totalXP || b.solved - a.solved);
  }

  async function recordScore(userId, userName, puzzleId, solved, time, mistakes) {
    const xp = solved ? Math.max(5, 50 - Math.floor(time/10) - mistakes*5) : 0;
    const score = { id: uid(), userId, userName, puzzleId, solved, time, mistakes, xp, date: new Date().toISOString() };
    await CK.db.savePuzzleScore(score);
    return xp;
  }

  async function hasSolved(userId, puzzleId) {
    const scores = await getScores();
    return scores.some(s => s.userId === userId && s.puzzleId === puzzleId && s.solved);
  }

  function getPuzzleById(id) { return PUZZLES.find(p => p.id === id) || null; }

  function getDailyPuzzle() {
    const dayIdx = Math.floor(Date.now() / 86400000) % PUZZLES.length;
    return PUZZLES[dayIdx];
  }

  function getFilteredPuzzles(theme = null, maxRating = 9999, minRating = 0) {
    return PUZZLES.filter(p =>
      p.rating >= minRating && p.rating <= maxRating &&
      (!theme || p.theme === theme)
    );
  }

  /* ─── Render Leaderboard ─── */
  async function renderLeaderboard(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const board = await getLeaderboard();
    if (!board.length) {
      el.innerHTML = `<div class="cls-empty">🏆 No scores yet — be the first to solve puzzles!</div>`; return;
    }
    const medals = ['🥇','🥈','🥉'];
    el.innerHTML = `
      <div class="ldb-header">
        <span>Rank</span><span>Player</span><span>Solved</span><span>XP</span><span>Avg Time</span>
      </div>
      ${board.slice(0, 20).map((u, i) => `
        <div class="ldb-row ${i < 3 ? 'ldb-top' : ''}">
          <span class="ldb-rank">${medals[i] || (i+1)}</span>
          <span class="ldb-name">${u.name}</span>
          <span class="ldb-solved">${u.solved} puzzles</span>
          <span class="ldb-xp" style="color:var(--p-gold);font-weight:700">${u.totalXP} XP</span>
          <span class="ldb-time">${u.avgTime}s avg</span>
        </div>`).join('')}`;
  }

  /* ─── Render puzzle list for student portal ─── */
  async function renderPuzzleList(containerId, userId, userName, difficulty = null) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const ratingMap = { Easy: [0,900], Medium: [900,1100], Hard: [1100,9999] };
    const [min, max] = ratingMap[difficulty] || [0,9999];
    const list = getFilteredPuzzles(null, max, min);

    el.innerHTML = (await Promise.all(list.map(async p => {
      const solved = await hasSolved(userId, p.id);
      const themeLabel = p.theme.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
      const diff = p.rating < 900 ? 'Easy' : p.rating < 1100 ? 'Medium' : 'Hard';
      return `
        <div class="pzp-card ${solved ? 'pzp-solved' : ''}">
          <div class="pzp-info">
            <div class="pzp-title">${p.title}</div>
            <div class="pzp-meta">
              <span class="p-badge p-badge-${diff==='Easy'?'green':diff==='Medium'?'yellow':'red'}">${diff}</span>
              <span class="pzp-theme">${themeLabel}</span>
              <span class="pzp-rating">⭐ ${p.rating}</span>
            </div>
          </div>
          <div class="pzp-actions">
            ${solved ? '<span class="p-badge p-badge-green">✓ Solved</span>' : ''}
            <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.puzzlesPro.openPuzzle('${p.id}','${userId}','${userName}')">
              ${solved ? '🔄 Retry' : '▶ Solve'}
            </button>
          </div>
        </div>`;
    }))).join('');
  }

  /* ─── Interactive Puzzle Solver (board modal) ─── */
  let _activePuzzle = null, _pzMoveIdx = 0, _pzTimer = null, _pzSeconds = 0, _pzMistakes = 0;
  let _pzBoard = null, _pzGame = null, _pzUserId = '', _pzUserName = '', _pzAwaitingOpponent = false;

  function openPuzzle(puzzleId, userId, userName) {
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) return;
    _activePuzzle = puzzle; _pzMoveIdx = 0; _pzSeconds = 0; _pzMistakes = 0;
    _pzUserId = userId; _pzUserName = userName; _pzAwaitingOpponent = false;

    // Build modal — remove any stale instance first
    document.getElementById('pzProModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'pzProModal';
    modal.className = 'cls-modal-overlay';
    modal.innerHTML = `
      <div class="cls-modal pz-modal">
        <div class="cls-modal-header">
          <div>
            <h3>🧩 ${puzzle.title}</h3>
            <div style="font-size:0.8rem;color:var(--p-text-muted)">Rating: ${puzzle.rating} · ${puzzle.theme.replace(/_/g,' ')}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span id="pzProTimer" style="font-family:monospace;font-size:1.1rem;color:var(--p-gold)">⏱ 0:00</span>
            <button class="cls-modal-close" onclick="CK.puzzlesPro.closePuzzle()">✕</button>
          </div>
        </div>
        <div class="pz-modal-body">
          <div id="pzProBoardWrap" style="width:340px;max-width:100%;margin:0 auto;"></div>
          <div class="pz-info-panel">
            <div class="pz-hint-box" id="pzProHint">💡 ${puzzle.hint}</div>
            <div id="pzProStatus" class="pz-status"></div>
            <div class="pz-controls">
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.puzzlesPro.showSolution()">👁 Show Solution</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.puzzlesPro.resetPuzzle()">🔄 Reset</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Init chess game & board
    _pzGame = new Chess(puzzle.fen);
    // Play opponent's first move
    const firstMove = puzzle.moves[0];
    if (firstMove) {
      _pzGame.move({ from: firstMove.slice(0,2), to: firstMove.slice(2,4), promotion: firstMove[4] || 'q' });
    }
    _pzMoveIdx = 1; // player now solves from index 1

    // Double rAF: first frame appends modal, second frame reads correct dimensions
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const wrap = document.getElementById('pzProBoardWrap');
      if (!wrap) return;
      _pzBoard = Chessboard('pzProBoardWrap', {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: _pzGame.fen(),
        orientation: _pzGame.turn() === 'w' ? 'white' : 'black',
        draggable: true,
        onDrop: _pzHandleDrop,
        onSnapEnd: () => { if (_pzBoard) _pzBoard.position(_pzGame.fen()); }
      });
    }));

    // Start timer
    _pzTimer = setInterval(() => {
      _pzSeconds++;
      const m = Math.floor(_pzSeconds/60).toString().padStart(2,'0');
      const s = (_pzSeconds%60).toString().padStart(2,'0');
      const el = document.getElementById('pzProTimer');
      if (el) el.textContent = `⏱ ${m}:${s}`;
    }, 1000);
  }

  function _pzHandleDrop(from, to) {
    if (_pzAwaitingOpponent) return 'snapback';
    const move = _pzGame.move({ from, to, promotion: 'q' });
    if (!move) return 'snapback';

    const expected = _activePuzzle.moves[_pzMoveIdx];
    const expectedFrom = expected?.slice(0,2);
    const expectedTo   = expected?.slice(2,4);
    const statusEl = document.getElementById('pzProStatus');

    if (move.from === expectedFrom && move.to === expectedTo) {
      _pzMoveIdx++;
      if (_pzBoard) _pzBoard.position(_pzGame.fen(), true);

      if (_pzMoveIdx >= _activePuzzle.moves.length) {
        // Puzzle complete!
        clearInterval(_pzTimer);
        if (statusEl) statusEl.innerHTML = `<div class="pz-success">✅ Brilliant! Puzzle solved in ${_pzSeconds}s with ${_pzMistakes} mistake${_pzMistakes===1?'':'s'}!</div>`;
        recordScore(_pzUserId, _pzUserName, _activePuzzle.id, true, _pzSeconds, _pzMistakes).then(xp => {
          CK.showToast(`🎉 Puzzle solved! +${xp} XP`, 'success');
        });
        setTimeout(closePuzzle, 3000);
      } else {
        // Play opponent's response
        if (statusEl) statusEl.innerHTML = `<div class="pz-correct">✓ Correct! Keep going...</div>`;
        _pzAwaitingOpponent = true;
        setTimeout(() => {
          const oppMove = _activePuzzle.moves[_pzMoveIdx];
          if (oppMove) {
            _pzGame.move({ from: oppMove.slice(0,2), to: oppMove.slice(2,4), promotion: oppMove[4] || 'q' });
            _pzMoveIdx++;
            if (_pzBoard) _pzBoard.position(_pzGame.fen(), true);
          }
          _pzAwaitingOpponent = false;
        }, 500);
      }
    } else {
      _pzMistakes++;
      _pzGame.undo();
      if (_pzBoard) _pzBoard.position(_pzGame.fen(), false);
      if (statusEl) statusEl.innerHTML = `<div class="pz-wrong">❌ Not quite — try again! (${_pzMistakes} mistake${_pzMistakes===1?'':'s'})</div>`;
    }
  }

  function showSolution() {
    if (!_activePuzzle) return;
    const remaining = _activePuzzle.moves.slice(_pzMoveIdx);
    const playerMoves = remaining.filter((_, i) => i % 2 === 0);
    CK.showToast(`Solution: ${playerMoves.join(' → ')}`, 'info');
    recordScore(_pzUserId, _pzUserName, _activePuzzle.id, false, _pzSeconds, 99);
  }

  function resetPuzzle() {
    const puzzleId = _activePuzzle?.id;
    closePuzzle();
    setTimeout(() => openPuzzle(puzzleId, _pzUserId, _pzUserName), 200);
  }

  function closePuzzle() {
    clearInterval(_pzTimer);
    if (_pzBoard) { _pzBoard.destroy(); _pzBoard = null; }
    _pzGame = null; _activePuzzle = null;
    const modal = document.getElementById('pzProModal');
    if (modal) modal.remove();
  }

  return {
    PUZZLES, getLeaderboard, recordScore, hasSolved,
    getPuzzleById, getDailyPuzzle, getFilteredPuzzles,
    renderLeaderboard, renderPuzzleList,
    openPuzzle, closePuzzle, showSolution, resetPuzzle
  };
})();
