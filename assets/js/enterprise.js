/* assets/js/enterprise.js -------------------------------------------------
   ChessKidoo Enterprise Module
   - Command Bar (Cmd+K / Ctrl+K)
   - Live Log Viewer (virtualized, real-time)
   - Audit Trail renderer (immutable hash-chain)
   - Stockfish WASM analysis hook
   - ABAC authorization engine
   - Real-time event bus
   ----------------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};
  const _e = () => CK.esc || (s => s);

  /* ═══════════════════════════════════════════════════════════════════════
     EVENT BUS — Lightweight pub/sub for real-time UI updates
  ═══════════════════════════════════════════════════════════════════════ */
  CK.eventBus = (() => {
    const listeners = {};
    return {
      on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
      off(event, fn) { if (listeners[event]) listeners[event] = listeners[event].filter(f => f !== fn); },
      emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }
    };
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     COMMAND BAR (Cmd+K / Ctrl+K)
     Intelligent command palette for admin actions
  ═══════════════════════════════════════════════════════════════════════ */
  CK.commandBar = (() => {
    let _overlay = null;
    let _input = null;
    let _results = null;
    let _visible = false;
    let _selectedIndex = 0;

    const commands = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '⬛', category: 'Navigation', action: () => CK.admin?.showPanel('dashboard') },
      { id: 'nav-students', label: 'Go to Students', icon: '🎓', category: 'Navigation', action: () => CK.admin?.showPanel('students') },
      { id: 'nav-coaches', label: 'Go to Coaches', icon: '👨‍🏫', category: 'Navigation', action: () => CK.admin?.showPanel('coaches') },
      { id: 'nav-classes', label: 'Go to Classes', icon: '📅', category: 'Navigation', action: () => CK.admin?.showPanel('classes') },
      { id: 'nav-attendance', label: 'Go to Attendance', icon: '✅', category: 'Navigation', action: () => CK.admin?.showPanel('attendance') },
      { id: 'nav-tournaments', label: 'Go to Tournaments', icon: '🏆', category: 'Navigation', action: () => CK.admin?.showPanel('tournaments') },
      { id: 'nav-analytics', label: 'Go to AI Analytics', icon: '🧠', category: 'Navigation', action: () => CK.admin?.showPanel('analytics') },
      { id: 'nav-audit', label: 'Go to Audit Logs', icon: '🛡️', category: 'Navigation', action: () => CK.admin?.showPanel('audit') },
      { id: 'nav-expenses', label: 'Go to Expenditure', icon: '💰', category: 'Navigation', action: () => CK.admin?.showPanel('expenses') },
      { id: 'nav-settings', label: 'Go to Settings', icon: '⚙️', category: 'Navigation', action: () => CK.admin?.showPanel('settings') },
      { id: 'nav-live', label: 'Go to Live Tracking', icon: '📡', category: 'Navigation', action: () => CK.admin?.showPanel('live') },
      { id: 'nav-logs', label: 'Go to System Logs', icon: '📋', category: 'Navigation', action: () => CK.admin?.showPanel('logs') },
      { id: 'add-student', label: 'Add New Student', icon: '➕', category: 'Actions', action: () => { CK.admin?.showPanel('students'); setTimeout(() => CK.admin?.topAction(), 200); } },
      { id: 'add-class', label: 'Create New Class', icon: '📝', category: 'Actions', action: () => { CK.admin?.showPanel('classes'); setTimeout(() => document.getElementById('adminAddClassBtn')?.click(), 200); } },
      { id: 'add-tournament', label: 'Create Tournament', icon: '🏆', category: 'Actions', action: () => { CK.admin?.showPanel('tournaments'); } },
      { id: 'export-csv', label: 'Export Students CSV', icon: '📊', category: 'Actions', action: () => CK.admin?.exportCSV?.() },
      { id: 'toggle-theme', label: 'Toggle Dark/Light Theme', icon: '🌙', category: 'UI', action: () => CK.toggleTheme?.() },
      { id: 'refresh-data', label: 'Force Refresh All Data', icon: '🔄', category: 'System', action: () => { CK.admin?.init(); CK.showToast('Data refreshed', 'success'); } },
      { id: 'logout', label: 'Log Out', icon: '🚪', category: 'System', action: () => CK.logout?.() },
      { id: 'search-student', label: 'Search Student by Name...', icon: '🔍', category: 'Search', action: () => { CK.admin?.showPanel('students'); setTimeout(() => document.getElementById('adminGlobalSearch')?.focus(), 200); } },
      { id: 'open-stockfish', label: 'Open Stockfish Analysis', icon: '♟️', category: 'Chess', action: () => { CK.stockfishPanel?.toggle(); } },
    ];

    function _createDOM() {
      if (_overlay) return;
      _overlay = document.createElement('div');
      _overlay.id = 'ck-command-bar-overlay';
      _overlay.className = 'ck-cmd-overlay';
      _overlay.innerHTML = `
        <div class="ck-cmd-container">
          <div class="ck-cmd-header">
            <span class="ck-cmd-icon">⌘</span>
            <input type="text" class="ck-cmd-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false" />
            <kbd class="ck-cmd-kbd">ESC</kbd>
          </div>
          <div class="ck-cmd-results"></div>
          <div class="ck-cmd-footer">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Execute</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>`;
      document.body.appendChild(_overlay);
      _input = _overlay.querySelector('.ck-cmd-input');
      _results = _overlay.querySelector('.ck-cmd-results');
      _overlay.addEventListener('click', (e) => { if (e.target === _overlay) hide(); });
      _input.addEventListener('input', () => { _selectedIndex = 0; _render(_input.value); });
      _input.addEventListener('keydown', _handleKey);
    }

    function _render(query) {
      const q = (query || '').toLowerCase().trim();
      let filtered = commands;
      if (q) {
        filtered = commands.filter(c =>
          c.label.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.id.includes(q)
        );
      }
      const grouped = {};
      filtered.forEach(c => { (grouped[c.category] = grouped[c.category] || []).push(c); });

      let html = '';
      let idx = 0;
      for (const [cat, items] of Object.entries(grouped)) {
        html += `<div class="ck-cmd-group-label">${cat}</div>`;
        for (const item of items) {
          const active = idx === _selectedIndex ? 'active' : '';
          html += `<div class="ck-cmd-item ${active}" data-idx="${idx}" data-id="${item.id}">
            <span class="ck-cmd-item-icon">${item.icon}</span>
            <span class="ck-cmd-item-label">${item.label}</span>
          </div>`;
          idx++;
        }
      }
      if (!html) html = '<div class="ck-cmd-empty">No matching commands</div>';
      _results.innerHTML = html;
      _results.querySelectorAll('.ck-cmd-item').forEach(el => {
        el.addEventListener('click', () => _execute(el.dataset.id));
      });
    }

    function _handleKey(e) {
      const items = _results.querySelectorAll('.ck-cmd-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); _selectedIndex = Math.min(_selectedIndex + 1, items.length - 1); _render(_input.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _selectedIndex = Math.max(_selectedIndex - 1, 0); _render(_input.value); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const active = _results.querySelector('.ck-cmd-item.active');
        if (active) _execute(active.dataset.id);
      }
      else if (e.key === 'Escape') { hide(); }
    }

    function _execute(id) {
      const cmd = commands.find(c => c.id === id);
      if (cmd) {
        hide();
        cmd.action();
        if (CK.db && CK.db.saveAuditLog) {
          CK.db.saveAuditLog({
            user_id: CK.currentUser?.id || 'admin',
            user_name: CK.currentUser?.full_name || 'Admin',
            action: 'COMMAND_EXECUTE', resource: 'command_bar',
            detail: `Executed: ${cmd.label}`, severity: 'INFO'
          });
        }
      }
    }

    function show() {
      _createDOM();
      _visible = true;
      _overlay.classList.add('open');
      _selectedIndex = 0;
      _input.value = '';
      _render('');
      setTimeout(() => _input.focus(), 50);
    }

    function hide() {
      if (_overlay) _overlay.classList.remove('open');
      _visible = false;
    }

    function toggle() { _visible ? hide() : show(); }

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    });

    return { show, hide, toggle, commands };
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     LIVE LOG VIEWER — Virtualized real-time system event stream
  ═══════════════════════════════════════════════════════════════════════ */
  CK.liveLogViewer = (() => {
    let _logs = [];
    let _filter = 'ALL';
    let _searchQuery = '';
    let _autoScroll = true;
    let _interval = null;

    const SEVERITY_COLORS = {
      INFO: '#3b82f6',
      WARN: '#f59e0b',
      SECURITY_ALERT: '#ef4444',
      ENGINE_CRITICAL: '#8b5cf6'
    };

    function start() {
      _fetchLogs();
      if (_interval) clearInterval(_interval);
      _interval = setInterval(_fetchLogs, 10000);
    }

    function stop() {
      if (_interval) { clearInterval(_interval); _interval = null; }
    }

    async function _fetchLogs() {
      const logs = await CK.db.getAuditLogs(200);
      _logs = logs || [];
      CK.eventBus.emit('logs:updated', _logs);
    }

    function getFiltered() {
      let filtered = _logs;
      if (_filter !== 'ALL') filtered = filtered.filter(l => l.severity === _filter);
      if (_searchQuery) {
        const q = _searchQuery.toLowerCase();
        filtered = filtered.filter(l =>
          (l.action || '').toLowerCase().includes(q) ||
          (l.user_name || '').toLowerCase().includes(q) ||
          (l.detail || '').toLowerCase().includes(q) ||
          (l.resource || '').toLowerCase().includes(q)
        );
      }
      return filtered;
    }

    function render(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const esc = _e();
      const filtered = getFiltered();

      el.innerHTML = `
        <div class="ck-log-controls">
          <div class="ck-log-filters">
            ${['ALL', 'INFO', 'WARN', 'SECURITY_ALERT'].map(s =>
              `<button class="ck-log-filter-btn ${_filter === s ? 'active' : ''}" onclick="CK.liveLogViewer.setFilter('${s}')">${s === 'ALL' ? '🔗 All' : s === 'INFO' ? '💙 Info' : s === 'WARN' ? '⚠️ Warn' : '🚨 Security'}</button>`
            ).join('')}
          </div>
          <div class="ck-log-search">
            <input type="text" class="p-form-control" placeholder="Search logs..." value="${esc(_searchQuery)}" oninput="CK.liveLogViewer.setSearch(this.value)" style="height:32px;font-size:0.8rem" />
          </div>
          <div class="ck-log-actions">
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.liveLogViewer.exportJSON()">📥 Export JSON</button>
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.liveLogViewer.refresh()">🔄 Refresh</button>
            <span class="ck-log-count">${filtered.length} events</span>
          </div>
        </div>
        <div class="ck-log-table-wrap">
          <table class="ck-log-table">
            <thead>
              <tr>
                <th style="width:50px">Sev</th>
                <th style="width:160px">Timestamp</th>
                <th style="width:130px">User</th>
                <th style="width:140px">Action</th>
                <th>Detail</th>
                <th style="width:80px">Resource</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? '<tr><td colspan="6" style="text-align:center;opacity:0.5;padding:40px">No log entries match the current filter</td></tr>' :
                filtered.slice(0, 100).map(log => {
                  const color = SEVERITY_COLORS[log.severity] || '#64748b';
                  const ts = log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';
                  return `<tr class="ck-log-row" data-severity="${esc(log.severity || 'INFO')}">
                    <td><span class="ck-log-sev" style="background:${color}">${(log.severity || 'INFO').slice(0, 4)}</span></td>
                    <td class="ck-log-ts">${esc(ts)}</td>
                    <td class="ck-log-user">${esc(log.user_name || '—')}</td>
                    <td><code class="ck-log-action">${esc(log.action || '—')}</code></td>
                    <td class="ck-log-detail">${esc(log.detail || '—')}</td>
                    <td><span class="ck-log-resource">${esc(log.resource || '—')}</span></td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>`;
    }

    function setFilter(f) { _filter = f; render('adminLiveLogsContainer'); }
    function setSearch(q) { _searchQuery = q; render('adminLiveLogsContainer'); }
    function refresh() { _fetchLogs().then(() => render('adminLiveLogsContainer')); }
    function exportJSON() {
      const data = JSON.stringify(getFiltered(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `chesskidoo-logs-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      CK.showToast('Logs exported as JSON', 'success');
    }

    return { start, stop, render, setFilter, setSearch, refresh, exportJSON };
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     AUDIT TRAIL RENDERER — Immutable hash-chained log display
  ═══════════════════════════════════════════════════════════════════════ */
  CK.security = CK.security || {};
  CK.security.renderAuditLog = async (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const esc = _e();
    const logs = await CK.db.getAuditLogs(50);

    const severityBadge = (sev) => {
      const colors = { INFO: 'p-badge-blue', WARN: 'p-badge-gold', SECURITY_ALERT: 'p-badge-red' };
      return `<span class="p-badge ${colors[sev] || 'p-badge-blue'}">${sev || 'INFO'}</span>`;
    };

    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="p-table" style="width:100%;font-size:0.82rem">
          <thead><tr><th>Time</th><th>Severity</th><th>User</th><th>Action</th><th>Resource</th><th>Detail</th><th>Chain</th></tr></thead>
          <tbody>
            ${logs.map(l => {
              const ts = l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
              return `<tr>
                <td style="white-space:nowrap">${esc(ts)}</td>
                <td>${severityBadge(l.severity)}</td>
                <td>${esc(l.user_name || '—')}</td>
                <td><code style="background:rgba(59,130,246,0.1);padding:2px 6px;border-radius:4px;font-size:0.75rem">${esc(l.action || '—')}</code></td>
                <td>${esc(l.resource || '—')}</td>
                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.detail || '')}">${esc(l.detail || '—')}</td>
                <td style="font-family:monospace;font-size:0.7rem;opacity:0.6">${l.hash_prev ? esc(l.hash_prev.slice(0, 8)) + '…' : '⛓ root'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  };

  CK.security.renderRBACOverview = async (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const users = await CK.db.getProfiles();
    const roles = { admin: 0, coach: 0, student: 0, parent: 0 };
    users.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1; });

    el.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:12px;">
        ${Object.entries(roles).map(([role, count]) => `
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:1.8rem;font-weight:bold;color:var(--p-gold)">${count}</div>
            <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.7;margin-top:4px">${role}s</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;padding:12px;background:rgba(34,197,94,0.08);border-left:3px solid #22c55e;border-radius:6px;font-size:0.82rem">
        <strong>ABAC Policy Active:</strong> All data access is governed by role-based policies.
        Coaches can only view their assigned students. Parents see only their linked child's data.
      </div>`;
  };

  /* ═══════════════════════════════════════════════════════════════════════
     ABAC ENGINE — Attribute-Based Access Control validation
  ═══════════════════════════════════════════════════════════════════════ */
  CK.abac = {
    policies: [
      { id: 'coach_edit_student', description: 'Coach can only edit students assigned to them',
        condition: (user, resource) => user.role === 'admin' || (user.role === 'coach' && resource.coach === user.full_name) },
      { id: 'parent_view_child', description: 'Parent can only view their linked child',
        condition: (user, resource) => user.role === 'admin' || (user.role === 'parent' && resource.email === user.childEmail) },
      { id: 'temporal_edit', description: 'Tournament edits only during business hours (8AM-9PM IST)',
        condition: (user) => { const h = new Date().getHours(); return user.role === 'admin' || (h >= 8 && h <= 21); } },
      { id: 'regional_access', description: 'Coach can modify academy assets only within their region',
        condition: (user, resource) => user.role === 'admin' || !resource.region || resource.region === user.city }
    ],

    check(policyId, user, resource = {}) {
      const policy = this.policies.find(p => p.id === policyId);
      if (!policy) return true;
      return policy.condition(user || CK.currentUser || {}, resource);
    },

    checkAll(user, resource = {}) {
      return this.policies.every(p => p.condition(user || CK.currentUser || {}, resource));
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     STOCKFISH WASM ANALYSIS HOOK
     Connects to Stockfish via Web Worker for real-time position evaluation
  ═══════════════════════════════════════════════════════════════════════ */
  CK.useStockfish = (() => {
    let _worker = null;
    let _ready = false;
    let _evaluating = false;
    let _currentEval = { score: 0, mate: null, bestMove: '', pv: '', depth: 0 };
    let _onUpdate = null;

    function init() {
      if (_worker) return;
      try {
        const blob = new Blob([
          "importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');"
        ], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        _worker = new Worker(url);
        _worker.addEventListener('message', _handleMessage);
        _worker.postMessage('uci');
      } catch (e) {
        console.warn('[Stockfish WASM] Failed to initialize:', e);
      }
    }

    function _handleMessage(e) {
      const line = e.data;
      if (line === 'uciok') { _ready = true; _worker.postMessage('isready'); }
      if (line === 'readyok') { _ready = true; }
      if (typeof line === 'string' && line.startsWith('info depth')) {
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score cp (-?\d+)/) || line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/pv (.+)/);
        if (depthMatch) _currentEval.depth = parseInt(depthMatch[1]);
        if (scoreMatch) {
          if (line.includes('score mate')) { _currentEval.mate = parseInt(scoreMatch[1]); _currentEval.score = null; }
          else { _currentEval.score = parseInt(scoreMatch[1]); _currentEval.mate = null; }
        }
        if (pvMatch) _currentEval.pv = pvMatch[1];
        if (_onUpdate) _onUpdate({ ..._currentEval });
      }
      if (typeof line === 'string' && line.startsWith('bestmove')) {
        const bm = line.split(' ')[1];
        _currentEval.bestMove = bm;
        _evaluating = false;
        if (_onUpdate) _onUpdate({ ..._currentEval, done: true });
        CK.eventBus.emit('stockfish:result', { ..._currentEval });
      }
    }

    function evaluate(fen, options = {}) {
      if (!_worker || !_ready) { init(); return null; }
      _evaluating = true;
      _worker.postMessage('position fen ' + fen);
      const depth = options.depth || 18;
      const time = options.time || null;
      _worker.postMessage(time ? `go movetime ${time}` : `go depth ${depth}`);
    }

    function stop() { if (_worker) _worker.postMessage('stop'); }
    function destroy() { if (_worker) { _worker.terminate(); _worker = null; _ready = false; } }
    function onUpdate(fn) { _onUpdate = fn; }
    function getEval() { return { ..._currentEval }; }
    function isReady() { return _ready; }

    return { init, evaluate, stop, destroy, onUpdate, getEval, isReady };
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     STOCKFISH ANALYSIS PANEL (Floating UI for coaches/admin)
  ═══════════════════════════════════════════════════════════════════════ */
  CK.stockfishPanel = (() => {
    let _panel = null;
    let _visible = false;

    function _createPanel() {
      if (_panel) return;
      _panel = document.createElement('div');
      _panel.id = 'ck-stockfish-panel';
      _panel.className = 'ck-sf-panel';
      _panel.innerHTML = `
        <div class="ck-sf-header">
          <span>♟️ Stockfish Analysis</span>
          <button class="ck-sf-close" onclick="CK.stockfishPanel.hide()">✕</button>
        </div>
        <div class="ck-sf-body">
          <div class="ck-sf-fen-row">
            <input type="text" class="p-form-control" id="ckSfFenInput" placeholder="Paste FEN position..." value="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" style="font-size:0.78rem;font-family:monospace" />
            <button class="p-btn p-btn-gold p-btn-sm" onclick="CK.stockfishPanel.analyze()">Analyze</button>
          </div>
          <div class="ck-sf-eval" id="ckSfEvalDisplay">
            <div class="ck-sf-eval-score">0.0</div>
            <div class="ck-sf-eval-detail">Click Analyze to evaluate position</div>
          </div>
          <div class="ck-sf-pv" id="ckSfPvDisplay">Principal Variation will appear here</div>
        </div>`;
      document.body.appendChild(_panel);
    }

    function show() { _createPanel(); _panel.classList.add('open'); _visible = true; CK.useStockfish.init(); }
    function hide() { if (_panel) _panel.classList.remove('open'); _visible = false; }
    function toggle() { _visible ? hide() : show(); }

    function analyze() {
      const fen = document.getElementById('ckSfFenInput')?.value?.trim();
      if (!fen) return;
      const evalEl = document.getElementById('ckSfEvalDisplay');
      const pvEl = document.getElementById('ckSfPvDisplay');
      if (evalEl) evalEl.innerHTML = '<div class="ck-sf-eval-score">⏳</div><div class="ck-sf-eval-detail">Calculating...</div>';

      CK.useStockfish.onUpdate((data) => {
        if (evalEl) {
          const scoreText = data.mate !== null ? `M${data.mate}` : (data.score / 100).toFixed(1);
          const isGood = data.mate > 0 || (data.score !== null && data.score > 0);
          evalEl.innerHTML = `
            <div class="ck-sf-eval-score" style="color:${isGood ? '#22c55e' : '#ef4444'}">${scoreText}</div>
            <div class="ck-sf-eval-detail">Depth: ${data.depth} ${data.bestMove ? '| Best: ' + data.bestMove : ''}</div>`;
        }
        if (pvEl && data.pv) pvEl.textContent = data.pv;
      });
      CK.useStockfish.evaluate(fen, { depth: 20 });
    }

    return { show, hide, toggle, analyze };
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     ADMIN PANEL INTEGRATION — Wire enterprise features into admin portal
  ═══════════════════════════════════════════════════════════════════════ */
  CK.enterprise = {
    async init() {
      CK.liveLogViewer.start();
      if (CK.security.renderAuditLog) await CK.security.renderAuditLog('adminAuditLogTable');
      if (CK.security.renderRBACOverview) await CK.security.renderRBACOverview('adminRBACOverview');
    }
  };

})();
