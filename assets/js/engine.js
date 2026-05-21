/* assets/js/engine.js
   Real Stockfish analysis via Lichess Cloud Evaluation API
   Zero server cost · No WASM download · Instant depth-20+ analysis */

window.CK = window.CK || {};

CK.engine = (() => {
  const _cache = new Map();
  const _inFlight = new Set();
  const MAX_CACHE = 300;

  async function evaluate(fen) {
    if (!fen || fen === 'start') return null;
    if (_cache.has(fen)) return _cache.get(fen);
    if (_inFlight.has(fen)) return null;
    _inFlight.add(fen);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(
        `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (!r.ok) return null;
      const data = await r.json();
      const pv = data.pvs && data.pvs[0];
      if (!pv) return null;
      const result = {
        cp:    pv.cp   ?? null,
        mate:  pv.mate ?? null,
        depth: data.depth  || 0,
        knodes: data.knodes || 0,
        pv:    pv.moves || ''
      };
      if (_cache.size >= MAX_CACHE) _cache.delete(_cache.keys().next().value);
      _cache.set(fen, result);
      return result;
    } catch (e) {
      return null;
    } finally {
      _inFlight.delete(fen);
    }
  }

  function formatScore(cp, mate) {
    if (mate !== null) return mate > 0 ? `#${mate}` : `#-${Math.abs(mate)}`;
    if (cp === null) return '±0.00';
    return (cp >= 0 ? '+' : '') + (cp / 100).toFixed(2);
  }

  // Map centipawns → 0-100 bar percent
  function cpToBar(cp, mate) {
    if (mate !== null) return mate > 0 ? 97 : 3;
    if (cp === null) return 50;
    const pct = 50 + (cp / 600) * 44;
    return Math.min(97, Math.max(3, pct));
  }

  function cpColor(cp, mate) {
    const v = mate !== null ? (mate > 0 ? 9999 : -9999) : (cp || 0);
    return v > 80 ? 'var(--p-teal)' : v < -80 ? '#ef4444' : 'var(--p-blue)';
  }

  // Push real eval onto the PGN lab UI elements
  function applyToUI(result) {
    if (!result) return;
    const score  = formatScore(result.cp, result.mate);
    const bar    = cpToBar(result.cp, result.mate);
    const color  = cpColor(result.cp, result.mate);
    const tip    = `Stockfish depth ${result.depth} · ${Math.round(result.knodes / 1000)}Mn nodes`;

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
    // Small engine badge on explanation
    document.querySelectorAll('.labCoachExplanation').forEach(el => {
      const badge = el.querySelector('.engine-badge');
      if (!badge) {
        const b = document.createElement('span');
        b.className = 'engine-badge';
        b.style.cssText = 'display:inline-block;margin-left:8px;font-size:.68rem;background:rgba(20,184,166,.18);color:var(--p-teal);padding:2px 7px;border-radius:20px;vertical-align:middle;';
        b.textContent = `⚡ Stockfish d${result.depth}`;
        el.appendChild(b);
      } else {
        badge.textContent = `⚡ Stockfish d${result.depth}`;
      }
    });
  }

  return { evaluate, formatScore, cpToBar, cpColor, applyToUI };
})();
