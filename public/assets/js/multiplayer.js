/* assets/js/multiplayer.js
   ChessKidoo — Real-Time Matchmaking and Multiplayer WebSockets */

window.CK = window.CK || {};

CK.multiplayer = (() => {
  const supabaseClient = window.supabaseClient;
  let _sub = null;
  let _activeGameId = null;
  let _myColor = null; // 'w' or 'b'

  async function startMatchmaking() {
    if (!window.supabaseClient) {
      CK.showToast('Database offline. Cannot connect to matchmaking servers.', 'error');
      return;
    }
    const me = CK.currentUser || { id: 'anon-' + Date.now(), full_name: 'Guest Player' };

    CK.showToast('🔍 Searching for an opponent...', 'info');

    try {
      // 1. Look for a waiting game
      const { data: waiting } = await supabaseClient
        .from('multiplayer_games')
        .select('*')
        .eq('status', 'waiting')
        .neq('white_id', me.id)
        .limit(1)
        .single();

      if (waiting) {
        // Join as black
        const { error } = await supabaseClient.from('multiplayer_games')
          .update({ black_id: me.id, black_name: me.full_name, status: 'active' })
          .eq('id', waiting.id);
        
        if (!error) {
          _activeGameId = waiting.id;
          _myColor = 'b';
          CK.showToast('⚔️ Opponent found! Joining as Black.', 'success');
          _launchGame(waiting.fen);
          return;
        }
      }

      // 2. Create new game as white
      const newId = 'game_' + Date.now();
      const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const { error: insertErr } = await supabaseClient.from('multiplayer_games')
        .insert({
          id: newId,
          white_id: me.id,
          white_name: me.full_name,
          fen: initialFen,
          pgn: '',
          status: 'waiting'
        });
      
      if (!insertErr) {
        _activeGameId = newId;
        _myColor = 'w';
        CK.showToast('Host created. Waiting for opponent...', 'info');
        _launchGame(initialFen);
      }

    } catch (e) {
      console.error(e);
      CK.showToast('Matchmaking error', 'error');
    }
  }

  function _launchGame(fen) {
    // Navigate to the PGN lab implicitly
    if (CK.student && CK.student.nav) CK.student.nav('lab');
    
    // Configure the engine-play to use multiplayer
    if (CK.enginePlay) {
      CK.enginePlay.startMultiplayerSession(_activeGameId, _myColor, fen);
    }

    // Subscribe to game changes
    if (_sub) supabaseClient.removeChannel(_sub);
    _sub = supabaseClient.channel('public:multiplayer_games:id=eq.' + _activeGameId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'multiplayer_games', filter: `id=eq.${_activeGameId}` }, (payload) => {
        const d = payload.new;
        if (d.status === 'active' && _myColor === 'w' && d.black_name) {
          CK.showToast(`⚔️ ${d.black_name} has joined! You are White.`, 'success');
        }
        if (CK.enginePlay && CK.enginePlay.onMultiplayerUpdate) {
          CK.enginePlay.onMultiplayerUpdate(d.fen, d.pgn);
        }
      }).subscribe();
  }

  async function pushMove(fen, pgn) {
    if (!_activeGameId || !window.supabaseClient) return;
    await supabaseClient.from('multiplayer_games')
      .update({ fen, pgn })
      .eq('id', _activeGameId);
  }

  function endSession() {
    if (_sub) {
      supabaseClient.removeChannel(_sub);
      _sub = null;
    }
    _activeGameId = null;
    _myColor = null;
  }

  return {
    startMatchmaking,
    pushMove,
    endSession,
    get activeGameId() { return _activeGameId; },
    get myColor() { return _myColor; }
  };
})();
