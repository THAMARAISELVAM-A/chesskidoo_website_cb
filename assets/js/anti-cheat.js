/* assets/js/anti-cheat.js --------------------------------------------------
   ChessKidoo Anti-Cheat & Security System
   Tab monitoring, move-time analysis, device fingerprinting,
   session recording, audit logs, fair-play detection
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.security = (() => {
  const SEC = {};
  const AUDIT_KEY = 'ck_audit_logs';
  const SESSION_KEY = 'ck_session_log';
  const FINGERPRINT_KEY = 'ck_device_fp';
  let _monitoringActive = false;
  let _tabSwitchCount = 0;
  let _moveTimes = [];
  let _suspiciousFlags = [];
  let _sessionStart = null;

  /* ─── Audit Log ─── */
  SEC.audit = (action, details = {}, userId = null) => {
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      action,
      details,
      userId: userId || CK.currentUser?.id || 'anonymous',
      userName: CK.currentUser?.full_name || 'Unknown',
      timestamp: new Date().toISOString(),
      ip: 'client',
      userAgent: navigator.userAgent.slice(0, 100)
    };
    const logs = SEC.getAuditLogs();
    logs.unshift(log);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 1000)));
    return log;
  };

  SEC.getAuditLogs = (limit = 200) => {
    try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]').slice(0, limit); }
    catch(e) { return []; }
  };

  SEC.getAuditLogsFiltered = (filters = {}) => {
    let logs = SEC.getAuditLogs(500);
    if (filters.action) logs = logs.filter(l => l.action.includes(filters.action));
    if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters.from) logs = logs.filter(l => l.timestamp >= filters.from);
    if (filters.to) logs = logs.filter(l => l.timestamp <= filters.to);
    return logs;
  };

  /* ─── Device Fingerprint ─── */
  SEC.getFingerprint = () => {
    const cached = localStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('ChessKidoo FP', 2, 2);
    const canvasData = canvas.toDataURL().slice(-50);

    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      canvasData
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      const chr = fp.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    const fingerprint = 'fp-' + Math.abs(hash).toString(36);
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  };

  /* ─── Game Monitoring (Anti-Cheat) ─── */
  SEC.startGameMonitoring = (gameId) => {
    _monitoringActive = true;
    _tabSwitchCount = 0;
    _moveTimes = [];
    _suspiciousFlags = [];
    _sessionStart = Date.now();

    SEC.audit('game_start', { gameId, fingerprint: SEC.getFingerprint() });

    // Monitor tab visibility changes
    document.addEventListener('visibilitychange', _onVisibilityChange);

    // Monitor window focus/blur
    window.addEventListener('blur', _onWindowBlur);
    window.addEventListener('focus', _onWindowFocus);

    // Record session start
    const session = { gameId, start: _sessionStart, tabSwitches: 0, moveTimes: [], flags: [] };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  SEC.stopGameMonitoring = (gameId) => {
    _monitoringActive = false;
    document.removeEventListener('visibilitychange', _onVisibilityChange);
    window.removeEventListener('blur', _onWindowBlur);
    window.removeEventListener('focus', _onWindowFocus);

    const report = {
      gameId,
      duration: Date.now() - (_sessionStart || Date.now()),
      tabSwitches: _tabSwitchCount,
      moveTimes: [..._moveTimes],
      flags: [..._suspiciousFlags],
      fairPlayScore: _calculateFairPlayScore(),
      fingerprint: SEC.getFingerprint()
    };

    SEC.audit('game_end', report);
    return report;
  };

  SEC.recordMove = (moveNotation, thinkTime) => {
    if (!_monitoringActive) return;
    _moveTimes.push({ move: moveNotation, time: thinkTime, timestamp: Date.now() });

    // Check for suspicious patterns
    if (thinkTime < 500 && _moveTimes.length > 5) {
      // Very fast moves in complex positions may indicate engine use
      const recentFastMoves = _moveTimes.slice(-5).filter(m => m.time < 800);
      if (recentFastMoves.length >= 4) {
        _suspiciousFlags.push({ type: 'rapid_moves', severity: 'medium', time: Date.now(), detail: 'Multiple moves under 800ms' });
      }
    }

    // Perfectly consistent timing (bot-like)
    if (_moveTimes.length >= 8) {
      const recent = _moveTimes.slice(-8).map(m => m.time);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / recent.length;
      if (variance < 100000 && avg > 1000 && avg < 3000) {
        _suspiciousFlags.push({ type: 'consistent_timing', severity: 'high', time: Date.now(), detail: `Variance: ${Math.round(variance)}, Avg: ${Math.round(avg)}ms` });
      }
    }
  };

  function _onVisibilityChange() {
    if (!_monitoringActive) return;
    if (document.hidden) {
      _tabSwitchCount++;
      _suspiciousFlags.push({ type: 'tab_switch', severity: _tabSwitchCount > 3 ? 'high' : 'low', time: Date.now() });
      // Update session
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      session.tabSwitches = _tabSwitchCount;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  function _onWindowBlur() {
    if (!_monitoringActive) return;
    // Window lost focus
  }

  function _onWindowFocus() {
    if (!_monitoringActive) return;
    // Window regained focus
  }

  function _calculateFairPlayScore() {
    let score = 100;

    // Deduct for tab switches
    score -= Math.min(30, _tabSwitchCount * 5);

    // Deduct for suspicious flags
    _suspiciousFlags.forEach(f => {
      if (f.severity === 'high') score -= 15;
      else if (f.severity === 'medium') score -= 8;
      else score -= 3;
    });

    return Math.max(0, Math.min(100, score));
  }

  /* ─── Fair Play Assessment ─── */
  SEC.assessFairPlay = (gameReport) => {
    if (!gameReport) return { verdict: 'clean', confidence: 'low' };

    const score = gameReport.fairPlayScore;
    let verdict, confidence;

    if (score >= 85) { verdict = 'clean'; confidence = 'high'; }
    else if (score >= 65) { verdict = 'clean'; confidence = 'medium'; }
    else if (score >= 40) { verdict = 'suspicious'; confidence = 'medium'; }
    else { verdict = 'flagged'; confidence = 'high'; }

    return {
      verdict,
      confidence,
      score,
      details: {
        tabSwitches: gameReport.tabSwitches,
        flagCount: gameReport.flags.length,
        avgMoveTime: gameReport.moveTimes.length > 0
          ? Math.round(gameReport.moveTimes.reduce((a, m) => a + m.time, 0) / gameReport.moveTimes.length)
          : 0
      }
    };
  };

  /* ─── Session Management ─── */
  SEC.initSession = () => {
    const fp = SEC.getFingerprint();
    SEC.audit('session_start', { fingerprint: fp, platform: navigator.platform });

    // Detect multiple tabs (same user)
    const channelKey = 'ck_tab_channel';
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelKey) : null;
    if (bc) {
      bc.postMessage({ type: 'tab_open', fp, time: Date.now() });
      bc.onmessage = (e) => {
        if (e.data.type === 'tab_open' && e.data.time > Date.now() - 1000) {
          // Another tab opened — not necessarily suspicious but log it
          SEC.audit('multi_tab_detected', { fingerprint: fp });
        }
      };
    }
  };

  /* ─── Role-Based Access Control ─── */
  SEC.RBAC = {
    permissions: {
      admin:   ['read_all', 'write_all', 'delete_all', 'manage_users', 'manage_finances', 'manage_tournaments', 'view_audit', 'manage_access'],
      coach:   ['read_students', 'write_notes', 'manage_classes', 'mark_attendance', 'view_own_data', 'assign_homework'],
      student: ['read_own', 'submit_homework', 'play_games', 'view_puzzles', 'view_schedule'],
      parent:  ['read_child', 'view_reports', 'submit_feedback', 'view_schedule', 'make_payments']
    },

    hasPermission(role, permission) {
      const rolePerms = this.permissions[role] || [];
      return rolePerms.includes(permission) || rolePerms.includes('read_all') || rolePerms.includes('write_all');
    },

    checkAccess(requiredPermission) {
      const user = CK.currentUser;
      if (!user) return false;
      const role = (user.role || 'student').toLowerCase();
      if (!this.hasPermission(role, requiredPermission)) {
        SEC.audit('access_denied', { required: requiredPermission, role });
        return false;
      }
      return true;
    }
  };

  /* ─── Render: Audit Log Table ─── */
  SEC.renderAuditLog = (containerId, filters = {}) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const logs = SEC.getAuditLogsFiltered(filters);
    const _e = CK.esc || (s => s);

    const actionColors = {
      login: '#22c55e', logout: '#9ca3af', game_start: '#3b82f6', game_end: '#3b82f6',
      access_denied: '#ef4444', session_start: '#06b6d4', multi_tab_detected: '#f59e0b'
    };

    el.innerHTML = `
      <div style="margin-bottom:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <input class="p-input" placeholder="Filter by action..." style="max-width:200px;" oninput="CK.security.renderAuditLog('${containerId}', {action: this.value})">
        <span style="font-size:0.8rem; opacity:0.5; align-self:center;">${logs.length} entries</span>
      </div>
      <div style="max-height:400px; overflow-y:auto;">
        <table class="p-table" style="width:100%; font-size:0.8rem;">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>${logs.slice(0, 100).map(l => `
            <tr>
              <td style="white-space:nowrap;">${new Date(l.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</td>
              <td>${_e(l.userName)}</td>
              <td><span style="color:${actionColors[l.action] || '#e2e8f0'}; font-weight:600;">${_e(l.action)}</span></td>
              <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${_e(JSON.stringify(l.details).slice(0, 80))}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  /* ─── Render: Fair Play Report ─── */
  SEC.renderFairPlayBadge = (containerId, gameReport) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const assessment = SEC.assessFairPlay(gameReport);
    const colors = { clean: '#22c55e', suspicious: '#f59e0b', flagged: '#ef4444' };
    const icons = { clean: '✅', suspicious: '⚠️', flagged: '🚫' };

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:${colors[assessment.verdict]}22; border:1px solid ${colors[assessment.verdict]}44;">
        <span style="font-size:1.3rem;">${icons[assessment.verdict]}</span>
        <div>
          <div style="font-weight:700; color:${colors[assessment.verdict]};">Fair Play: ${assessment.verdict.toUpperCase()}</div>
          <div style="font-size:0.75rem; opacity:0.6;">Score: ${assessment.score}/100 · Confidence: ${assessment.confidence}</div>
        </div>
      </div>`;
  };

  // Auto-init session tracking
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    SEC.initSession();
  } else {
    document.addEventListener('DOMContentLoaded', () => SEC.initSession());
  }

  return SEC;
})();
