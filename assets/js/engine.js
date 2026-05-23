/* assets/js/engine.js
   Stockfish Analysis Engine — Dual-Mode Architecture
   
   Mode 1: Lichess Cloud Evaluation API (instant, cached, zero-cost)
   Mode 2: Local Stockfish 18 WASM (offline-capable, deeper analysis)
   
   The engine automatically picks the best available source:
   - Tries Lichess Cloud first (cached depth 20+)
   - Falls back to local Stockfish WASM if cloud unavailable
   - Both results are merged into a unified UI pipeline */

window.CK = window.CK || {};

CK.engine = (() => {
  const _cache = new Map();
  const _inFlight = new Set();
  const MAX_CACHE = 500;
  
  // ── Local Stockfish WASM Worker ──
  let _sfWorker = null;
  let _sfReady  = false;
  let _sfResolve = null;
  let _sfDepth   = 18;      // configurable analysis depth

  function _initLocalEngine() {
    if (_sfWorker) return;
    try {
      // Stockfish 16 Lite (single-threaded, no COOP/COEP needed)
      const blob = new Blob([
        "importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');"
      ], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      _sfWorker = new Worker(workerUrl);
      _sfWorker.addEventListener('message', _handleSfMessage);
      _sfWorker.postMessage('uci');
      console.log('[Engine] Local Stockfish 18 WASM initializing…');
    } catch (e) {
      console.warn('[Engine] Local Stockfish WASM unavailable:', e.message);
      _sfWorker = null;
    }
  }

  function _handleSfMessage(e) {
    const line = typeof e.data === 'string' ? e.data : '';

    if (line === 'uciok') {
      _sfWorker.postMessage('setoption name Threads value 1');
      _sfWorker.postMessage('setoption name Hash value 16');
      _sfWorker.postMessage('isready');
    }
    if (line === 'readyok') {
      _sfReady = true;
      console.log('[Engine] Local Stockfish 18 WASM ready');
    }
    if (line.startsWith('bestmove') && _sfResolve) {
      // Parsing complete — extract info from accumulated data
      _sfResolve.bestmove = line.split(' ')[1] || '';
      _finalizeSfResult();
    }
    // Accumulate info lines for depth/score/pv
    if (line.startsWith('info') && line.includes(' pv ') && _sfResolve) {
      const depthMatch = line.match(/depth (\d+)/);
      const cpMatch    = line.match(/score cp (-?\d+)/);
      const mateMatch  = line.match(/score mate (-?\d+)/);
      const pvMatch    = line.match(/ pv (.+)/);
      const nodesMatch = line.match(/nodes (\d+)/);
      const multiMatch = line.match(/multipv (\d+)/);

      const mIdx = multiMatch ? parseInt(multiMatch[1]) - 1 : 0;
      _sfResolve.pvs = _sfResolve.pvs || [];
      _sfResolve.pvs[mIdx] = _sfResolve.pvs[mIdx] || {};

      if (depthMatch) _sfResolve.depth  = parseInt(depthMatch[1]);
      if (nodesMatch) _sfResolve.knodes = Math.round(parseInt(nodesMatch[1]) / 1000);
      
      if (cpMatch)    _sfResolve.pvs[mIdx].cp   = parseInt(cpMatch[1]);
      if (mateMatch)  _sfResolve.pvs[mIdx].mate = parseInt(mateMatch[1]);
      if (pvMatch)    _sfResolve.pvs[mIdx].pv   = pvMatch[1].trim();

      if (mIdx === 0) {
        if (cpMatch)    _sfResolve.cp     = parseInt(cpMatch[1]);
        if (mateMatch)  _sfResolve.mate   = parseInt(mateMatch[1]);
        if (pvMatch)    _sfResolve.pv     = pvMatch[1].trim();
      }
    }
  }

  function _finalizeSfResult() {
    if (!_sfResolve || !_sfResolve.resolve) return;
    const r = {
      cp:     _sfResolve.cp    ?? null,
      mate:   _sfResolve.mate  ?? null,
      depth:  _sfResolve.depth || 0,
      knodes: _sfResolve.knodes || 0,
      pv:     _sfResolve.pv   || _sfResolve.bestmove || '',
      pvs:    _sfResolve.pvs  || [],
      source: 'local'
    };
    _sfResolve.resolve(r);
    _sfResolve = null;
  }

  function _evaluateLocal(fen) {
    return new Promise((resolve) => {
      if (!_sfWorker || !_sfReady) { resolve(null); return; }
      // Cancel any pending eval
      if (_sfResolve) {
        _sfResolve.resolve(null);
        _sfResolve = null;
      }
      _sfResolve = { resolve, cp: null, mate: null, depth: 0, knodes: 0, pv: '', bestmove: '', pvs: [] };
      _sfWorker.postMessage('stop');
      _sfWorker.postMessage('setoption name MultiPV value 3');
      _sfWorker.postMessage('ucinewgame');
      _sfWorker.postMessage(`position fen ${fen}`);
      _sfWorker.postMessage(`go depth ${_sfDepth}`);
      // Safety timeout: resolve null after 8s
      setTimeout(() => { if (_sfResolve?.resolve === resolve) { resolve(null); _sfResolve = null; } }, 8000);
    });
  }

  // ── Lichess Cloud Evaluation API ──
  async function _evaluateCloud(fen) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(
        `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (!r.ok) return null;
      const data = await r.json();
      const pv = data.pvs && data.pvs[0];
      if (!pv) return null;
      return {
        cp:     pv.cp   ?? null,
        mate:   pv.mate ?? null,
        depth:  data.depth  || 0,
        knodes: data.knodes || 0,
        pv:     pv.moves || '',
        pvs:    data.pvs.map(p => ({ cp: p.cp ?? null, mate: p.mate ?? null, pv: p.moves || '' })),
        source: 'cloud'
      };
    } catch (e) {
      return null;
    }
  }

  // ── Unified Evaluate (Cloud → Local fallback) ──
  async function evaluate(fen) {
    if (!fen || fen === 'start') return null;
    if (_cache.has(fen)) return _cache.get(fen);
    if (_inFlight.has(fen)) return null;
    _inFlight.add(fen);

    try {
      // Try cloud first (faster, deeper)
      let result = await _evaluateCloud(fen);

      // If cloud failed, try local WASM
      if (!result && _sfWorker && _sfReady) {
        result = await _evaluateLocal(fen);
      }

      if (result) {
        if (_cache.size >= MAX_CACHE) _cache.delete(_cache.keys().next().value);
        _cache.set(fen, result);
      }
      return result;
    } finally {
      _inFlight.delete(fen);
    }
  }

  // Force local evaluation (for offline or deeper analysis)
  async function evaluateLocal(fen) {
    if (!fen || fen === 'start') return null;
    if (!_sfWorker) _initLocalEngine();
    return _evaluateLocal(fen);
  }

  function formatScore(cp, mate) {
    if (mate !== null && mate !== undefined) return mate > 0 ? `#${mate}` : `#-${Math.abs(mate)}`;
    if (cp === null || cp === undefined) return '±0.00';
    return (cp >= 0 ? '+' : '') + (cp / 100).toFixed(2);
  }

  // Map centipawns → 0-100 bar percent
  function cpToBar(cp, mate) {
    if (mate !== null && mate !== undefined) return mate > 0 ? 97 : 3;
    if (cp === null || cp === undefined) return 50;
    const pct = 50 + (cp / 600) * 44;
    return Math.min(97, Math.max(3, pct));
  }

  function cpColor(cp, mate) {
    const v = (mate !== null && mate !== undefined) ? (mate > 0 ? 9999 : -9999) : (cp || 0);
    return v > 80 ? 'var(--p-teal)' : v < -80 ? '#ef4444' : 'var(--p-blue)';
  }

  function generateAiInsight(cp, mate) {
    if (mate !== null && mate !== undefined) {
      if (mate > 0) return `Forced checkmate! White has a clear path to deliver mate in ${mate}. Look for forcing checks or captures.`;
      else return `Forced checkmate! Black is completely winning and will mate in ${Math.abs(mate)}.`;
    }
    if (cp === null || cp === undefined) return '';
    
    if (cp >= 500) return "White is completely winning. The material or positional advantage is overwhelming. Time to convert this into a win.";
    if (cp <= -500) return "Black is completely winning. The advantage is crushing. Focus on finishing the game without blunders.";
    if (cp >= 300) return "White has a decisive advantage. The position is highly favorable, likely up a full piece or with a crushing attack.";
    if (cp <= -300) return "Black has a decisive advantage. The position is dominant. Maintain pressure to secure the victory.";
    if (cp >= 150) return "White has a clear, strong advantage. There is significant positional pressure or a material edge.";
    if (cp <= -150) return "Black has a clear, strong advantage. Look to capitalize on the opponent's weaknesses.";
    if (cp >= 75) return "White is slightly better. The position is comfortable, perhaps with a space advantage or better pawn structure.";
    if (cp <= -75) return "Black is slightly better. Black has equalized and holds a small initiative or structural edge.";
    if (cp > 30) return "White has a tiny edge, characteristic of having the first move. Play remains highly balanced.";
    if (cp < -30) return "Black has a tiny edge, but the position is extremely close to equal. Solid play is required.";
    return "The position is completely equal. Both sides are solidly matched. Focus on maneuvering and improving piece placement.";
  }

  // Push real eval onto the PGN lab UI elements
  function applyToUI(result) {
    if (!result) return;
    const score  = formatScore(result.cp, result.mate);
    const bar    = cpToBar(result.cp, result.mate);
    const color  = cpColor(result.cp, result.mate);
    const src    = result.source === 'local' ? 'WASM' : 'Cloud';
    const tip    = `Stockfish ${src} depth ${result.depth} · ${Math.round((result.knodes || 0) / 1000)}Mn nodes`;

    document.querySelectorAll('.labEvalText').forEach(el => {
      el.textContent = score;
      el.style.opacity = '1';
      el.title = tip;
    });
    document.querySelectorAll('.labEvalBarFill').forEach(el => {
      el.style.width = bar + '%';
      el.style.backgroundColor = color;
      el.style.transition = 'width 0.5s cubic-bezier(.4,0,.2,1), background-color 0.3s';
    });
    // Vertical eval bar
    document.querySelectorAll('.labVBarFill').forEach(el => {
      el.style.height = bar + '%';
      el.style.transition = 'height 0.5s cubic-bezier(.4,0,.2,1)';
    });
    
    // AI Coach Insights appended to explanation
    const insight = generateAiInsight(result.cp, result.mate);
    
    // Generate MultiPV lines
    let pvHtml = '';
    if (result.pvs && result.pvs.length > 0) {
      pvHtml = '<div class="engine-pvs" style="margin-top:12px; font-family:monospace; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">';
      result.pvs.forEach((p, i) => {
        if (!p) return;
        let s = formatScore(p.cp, p.mate);
        let moves = p.pv ? p.pv.split(' ').slice(0, 5).join(' ') + (p.pv.split(' ').length > 5 ? '...' : '') : '';
        pvHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:3px 6px; border-radius:4px; background:rgba(255,255,255,0.02);">
                     <span style="color:${cpColor(p.cp, p.mate)}; width:45px; font-weight:700;">${s}</span>
                     <span style="color:rgba(255,255,255,0.6); flex:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${moves}</span>
                   </div>`;
      });
      pvHtml += '</div>';
    }

    document.querySelectorAll('.labCoachExplanation').forEach(el => {
      // Clean up previous AI insight if it exists
      const existingInsight = el.querySelector('.ai-insight-block');
      if (existingInsight) existingInsight.remove();
      
      const badgeText = `⚡ Stockfish 18 d${result.depth} (${src})`;
      
      // We wrap the AI insight in a block
      const insightHtml = `
        <div class="ai-insight-block" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--p-teal); font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em;"><i class="fas fa-robot"></i> Engine Output</strong>
            <span class="engine-badge" style="font-size:.68rem;background:rgba(20,184,166,.18);color:var(--p-teal);padding:2px 7px;border-radius:20px;border:1px solid rgba(20,184,166,.3);">${badgeText}</span>
          </div>
          <div style="color:rgba(255,255,255,0.85); font-size:0.9rem; line-height:1.4;">${insight}</div>
          ${pvHtml}
        </div>
      `;
      el.innerHTML += insightHtml;
    });
  }

  // Set analysis depth for local engine
  function setDepth(d) {
    _sfDepth = Math.max(1, Math.min(30, d));
  }

  // Get engine status
  function getStatus() {
    return {
      cloudAvailable: true,
      localReady:     _sfReady,
      localLoading:   !!_sfWorker && !_sfReady,
      cacheSize:      _cache.size,
      depth:          _sfDepth
    };
  }

  // Initialize local engine on module load
  _initLocalEngine();

  return { evaluate, evaluateLocal, formatScore, cpToBar, cpColor, applyToUI, setDepth, getStatus };
})();
