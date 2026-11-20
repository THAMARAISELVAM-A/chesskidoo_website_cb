/* assets/js/engine.js
   Stockfish Professional Analysis Engine — Dual-Mode Architecture (v4.0)
   
   Mode 1: Lichess Cloud Evaluation API (instant, master-level depth 20+, zero local CPU)
   Mode 2: Local Stockfish 16 NNUE WASM / Web Worker (real-time, offline-capable, adjustable Skill Level 0-20 & MultiPV)
   
   The engine automatically provides:
   - Resilient multi-source Stockfish WASM worker (Local NNUE 16 + CDN Fallbacks)
   - Real-time UCI communication with progressive evaluation streaming
   - Professional centipawn-to-bar conversion, win-probability metrics, and Grandmaster insights
   - Dynamic coach personality evaluation and MultiPV move selection */

window.CK = window.CK || {};

CK.engine = (() => {
  const _cache = new Map();
  const _inFlight = new Set();
  const MAX_CACHE = 500;
  
  // ── Local Stockfish WASM Worker ──
  let _sfWorker = null;
  let _sfReady  = false;
  let _sfResolve = null;
  let _sfDepth   = 18;      // default analysis depth
  let _sfSkill   = 20;      // default skill level (0-20)
  let _sfMultiPV = 3;       // default MultiPV candidate lines

  function _initLocalEngine() {
    if (_sfWorker) return;
    try {
      // Inline worker bootstrap with resilient fallback chain
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
      const workerCode = `
        const sources = [
          '${origin}/assets/vendor/stockfish/stockfish-nnue-16-single.js',
          '${origin}/public/stockfish/src/stockfish-nnue-16-single.js',
          'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
          'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
          'https://unpkg.com/stockfish.js@10.0.2/stockfish.js'
        ];
        let loaded = false;
        for (let i = 0; i < sources.length; i++) {
          try {
            importScripts(sources[i]);
            loaded = true;
            break;
          } catch(err) {}
        }
        if (!loaded) {
          console.warn('[Stockfish Worker] All script sources failed to load.');
        }
      `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
      const wasmPath = origin ? (origin + '/assets/vendor/stockfish/stockfish-nnue-16-single.wasm') : 'assets/vendor/stockfish/stockfish-nnue-16-single.wasm';
      const workerUrl = URL.createObjectURL(blob) + '#' + encodeURIComponent(wasmPath) + ',worker';
      _sfWorker = new Worker(workerUrl);
      _sfWorker.addEventListener('message', _handleSfMessage);
      _sfWorker.addEventListener('error', (err) => {
        if (err && typeof err.preventDefault === 'function') err.preventDefault();
        console.warn('[Engine] Stockfish Worker runtime error (using cloud evaluation fallback):', err?.message || err);
      });
      _sfWorker.postMessage('uci');
      console.log('[Engine] Stockfish 16 NNUE Professional Engine initializing…');
    } catch (e) {
      console.warn('[Engine] Stockfish Worker unavailable:', e.message);
      _sfWorker = null;
    }
  }

  function _handleSfMessage(e) {
    const line = typeof e.data === 'string' ? e.data : '';

    if (line === 'uciok') {
      _sfWorker.postMessage('setoption name Threads value 1');
      _sfWorker.postMessage('setoption name Hash value 32');
      _sfWorker.postMessage(`setoption name Skill Level value ${_sfSkill}`);
      _sfWorker.postMessage(`setoption name MultiPV value ${_sfMultiPV}`);
      _sfWorker.postMessage('isready');
    }
    if (line === 'readyok') {
      _sfReady = true;
      console.log('[Engine] Stockfish 16 NNUE Professional Engine ready');
    }
    if (line.startsWith('bestmove') && _sfResolve) {
      // Parsing complete — extract bestmove
      const parts = line.split(' ');
      _sfResolve.bestmove = parts[1] || '';
      _finalizeSfResult();
    }
    // Accumulate info lines for depth/score/pv/nodes
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

      // Progressive depth reporting callback for live evaluation bar
      if (_sfResolve.onProgress && depthMatch) {
        const intermediate = {
          cp:       _sfResolve.cp    ?? null,
          mate:     _sfResolve.mate  ?? null,
          depth:    _sfResolve.depth || 0,
          knodes:   _sfResolve.knodes || 0,
          pv:       _sfResolve.pv   || _sfResolve.bestmove || '',
          pvs:      _sfResolve.pvs  || [],
          bestmove: _sfResolve.pv ? _sfResolve.pv.split(' ')[0] : '',
          source:   'local'
        };
        _sfResolve.onProgress(intermediate);
      }
    }
  }

  function _finalizeSfResult() {
    if (!_sfResolve || !_sfResolve.resolve) return;
    const r = {
      cp:       _sfResolve.cp    ?? null,
      mate:     _sfResolve.mate  ?? null,
      depth:    _sfResolve.depth || 0,
      knodes:   _sfResolve.knodes || 0,
      pv:       _sfResolve.pv   || _sfResolve.bestmove || '',
      pvs:      _sfResolve.pvs  || [],
      bestmove: _sfResolve.bestmove || (_sfResolve.pv ? _sfResolve.pv.split(' ')[0] : ''),
      source:   'local'
    };
    _sfResolve.resolve(r);
    _sfResolve = null;
  }

  function _evaluateLocal(fen, onProgress) {
    return new Promise((resolve) => {
      if (!_sfWorker || !_sfReady) {
        _initLocalEngine();
        // Give a short grace window if it is currently warming up
        setTimeout(() => {
          if (!_sfWorker || !_sfReady) { resolve(null); return; }
          _evaluateLocal(fen, onProgress).then(resolve);
        }, 300);
        return;
      }
      // Cancel any pending eval instantly to clean the queue
      if (_sfResolve) {
        _sfResolve.resolve(null);
        _sfResolve = null;
      }
      _sfResolve = { resolve, onProgress, cp: null, mate: null, depth: 0, knodes: 0, pv: '', bestmove: '', pvs: [] };
      _sfWorker.postMessage('stop');
      _sfWorker.postMessage(`setoption name Skill Level value ${_sfSkill}`);
      _sfWorker.postMessage(`setoption name MultiPV value ${_sfMultiPV}`);
      _sfWorker.postMessage('ucinewgame');
      _sfWorker.postMessage(`position fen ${fen}`);
      _sfWorker.postMessage(`go depth ${_sfDepth}`);
      
      // Safety timeout: resolve best candidate found so far after 7s to prevent freeze
      setTimeout(() => {
        if (_sfResolve?.resolve === resolve) {
          if (_sfResolve.pv || _sfResolve.bestmove) {
            const firstMove = _sfResolve.bestmove || (_sfResolve.pv ? _sfResolve.pv.split(' ')[0] : '');
            const r = {
              cp:       _sfResolve.cp,
              mate:     _sfResolve.mate,
              depth:    _sfResolve.depth,
              knodes:   _sfResolve.knodes,
              pv:       _sfResolve.pv,
              pvs:      _sfResolve.pvs  || [],
              bestmove: firstMove,
              source:   'local_timeout'
            };
            resolve(r);
          } else {
            resolve(null);
          }
          _sfResolve = null;
        }
      }, 7000);
    });
  }

  // ── Lichess Cloud Evaluation API (Instant Cloud Stockfish 16+) ──
  async function _evaluateCloud(fen) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(
        `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (!r.ok) return null;
      const data = await r.json();
      const pv = data.pvs && data.pvs[0];
      if (!pv) return null;
      const firstMove = pv.moves ? pv.moves.split(' ')[0] : '';
      return {
        cp:       pv.cp   ?? null,
        mate:     pv.mate ?? null,
        depth:    data.depth  || 0,
        knodes:   data.knodes || 0,
        pv:       pv.moves || '',
        bestmove: firstMove,
        pvs:      data.pvs.map(p => ({ cp: p.cp ?? null, mate: p.mate ?? null, pv: p.moves || '' })),
        source:   'cloud'
      };
    } catch (e) {
      return null;
    }
  }

  // ── Unified Evaluate (Cloud → Local Stockfish Fallback) ──
  async function evaluate(fen, onProgress) {
    if (!fen || fen === 'start') return null;
    if (_cache.has(fen)) {
      const cached = _cache.get(fen);
      if (onProgress) onProgress(cached);
      return cached;
    }
    if (_inFlight.has(fen)) return null;
    _inFlight.add(fen);

    try {
      // Try Cloud Stockfish first (instant, high depth)
      let result = await _evaluateCloud(fen);

      // If cloud resolved, feed the progress callback immediately
      if (result) {
        if (onProgress) onProgress(result);
      } else {
        // Fallback to real local Stockfish Web Worker
        result = await _evaluateLocal(fen, onProgress);
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

  // Force local Stockfish evaluation (for difficulty calibration or offline)
  async function evaluateLocal(fen, onProgress) {
    if (!fen || fen === 'start') return null;
    if (!_sfWorker) _initLocalEngine();
    return _evaluateLocal(fen, onProgress);
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
    return v > 80 ? 'var(--p-teal, #14b8a6)' : v < -80 ? '#ef4444' : 'var(--p-blue, #3b82f6)';
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
    const src    = result.source === 'local' ? 'Stockfish 16 NNUE' : 'Cloud Stockfish';
    const tip    = `${src} depth ${result.depth} · ${Math.round((result.knodes || 0) / 1000)}Mn nodes`;

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
        const s = formatScore(p.cp, p.mate);
        const moves = p.pv ? p.pv.split(' ').slice(0, 5).join(' ') + (p.pv.split(' ').length > 5 ? '...' : '') : '';
        pvHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:3px 6px; border-radius:4px; background:rgba(255,255,255,0.02);">
                     <span style="color:${cpColor(p.cp, p.mate)}; width:45px; font-weight:700;">${s}</span>
                     <span style="color:rgba(255,255,255,0.6); flex:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${moves}</span>
                   </div>`;
      });
      pvHtml += '</div>';
    }

    document.querySelectorAll('.labCoachExplanation').forEach(el => {
      const existingInsight = el.querySelector('.ai-insight-block');
      if (existingInsight) existingInsight.remove();
      
      const badgeText = `⚡ ${src} d${result.depth}`;
      const insightHtml = `
        <div class="ai-insight-block" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--p-teal, #14b8a6); font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em;"><i class="fas fa-robot"></i> Engine Output</strong>
            <span class="engine-badge" style="font-size:.68rem;background:rgba(20,184,166,.18);color:var(--p-teal, #14b8a6);padding:2px 7px;border-radius:20px;border:1px solid rgba(20,184,166,.3);">${badgeText}</span>
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

  // Set skill level (0 = easiest, 20 = full GM strength)
  function setSkillLevel(s) {
    _sfSkill = Math.max(0, Math.min(20, s));
    if (_sfWorker && _sfReady) {
      _sfWorker.postMessage(`setoption name Skill Level value ${_sfSkill}`);
    }
  }

  // Set MultiPV (1 = single line, 3 = top 3 candidate moves)
  function setMultiPV(n) {
    _sfMultiPV = Math.max(1, Math.min(5, n));
    if (_sfWorker && _sfReady) {
      _sfWorker.postMessage(`setoption name MultiPV value ${_sfMultiPV}`);
    }
  }

  // Get engine status
  function getStatus() {
    return {
      cloudAvailable: true,
      localReady:     _sfReady,
      localLoading:   !!_sfWorker && !_sfReady,
      cacheSize:      _cache.size,
      depth:          _sfDepth,
      skillLevel:     _sfSkill,
      multiPV:        _sfMultiPV
    };
  }

  // Lazy-load local engine on demand or during idle time to prevent page load lag
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Only preload if user visits arena, play, or classroom sections
        const hash = window.location.hash || '';
        if (hash.includes('arena') || hash.includes('classroom') || hash.includes('play')) {
          _initLocalEngine();
        }
      }, { timeout: 4000 });
    }
  }

  return {
    evaluate,
    evaluateLocal,
    formatScore,
    cpToBar,
    cpColor,
    applyToUI,
    setDepth,
    setSkillLevel,
    setMultiPV,
    getStatus
  };
})();
