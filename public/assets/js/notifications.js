/* assets/js/notifications.js
   ChessKidoo — In-App Notification System
   Real-time bell notifications for Students, Coaches, Admins, Parents.
   Storage: ck_notifications (localStorage). No backend required.  */

window.CK = window.CK || {};

CK.notifs = (() => {
  const KEY = 'ck_notifications';
  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now  = () => new Date().toISOString();

  /* ── Types ── */
  const TYPES = {
    class_reminder:  { icon: '📅', color: 'var(--p-teal)',  label: 'Class Reminder' },
    new_assignment:  { icon: '📝', color: 'var(--p-blue)',  label: 'New Assignment' },
    attendance_alert:{ icon: '⚠️', color: '#f59e0b',        label: 'Attendance Alert' },
    fee_due:         { icon: '💳', color: 'var(--p-danger)', label: 'Fee Due' },
    report_ready:    { icon: '📊', color: 'var(--p-gold)',   label: 'Report Ready' },
    achievement:     { icon: '🏆', color: 'var(--p-gold)',   label: 'Achievement' },
    puzzle_streak:   { icon: '🔥', color: '#f97316',        label: 'Puzzle Streak' },
    new_report:      { icon: '📋', color: 'var(--p-blue)',  label: 'Monthly Report' },
    cert_earned:     { icon: '🎓', color: 'var(--p-gold)',  label: 'Certificate Earned' },
    xp_earned:       { icon: '⚡', color: '#a78bfa',        label: 'XP Earned' },
    rank_up:         { icon: '⚔️', color: 'var(--p-gold)',   label: 'Rank Up!' },
    badge_earned:    { icon: '🎖️', color: '#f59e0b',        label: 'Badge Earned' },
    tournament:      { icon: '🏅', color: 'var(--p-teal)',  label: 'Tournament' },
    ai_report:       { icon: '🧠', color: '#8b5cf6',        label: 'AI Report' },
    study_plan:      { icon: '📋', color: 'var(--p-blue)',  label: 'Study Plan' },
    fair_play:       { icon: '🛡️', color: '#22c55e',        label: 'Fair Play' },
    general:         { icon: '📢', color: 'rgba(255,255,255,.5)', label: 'Notice' },
  };

  /* ── Storage ── */
  const getAll  = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) { return []; } };
  const saveAll = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch(e) {} };

  /* ── Push a notification ── */
  function push(type, title, body, targetId = null, targetRole = null) {
    if (!title || !body) return;
    const effectiveType = TYPES[type] ? type : 'general';
    const all = getAll();
    all.unshift({
      id: uid(), type: effectiveType, title, body,
      targetId, targetRole,
      read: false, date: now()
    });
    saveAll(all.slice(0, 200));          // cap at 200
    _refreshBells();
  }

  /* ── Get notifications for a user/role ── */
  function getFor(userId, role) {
    return getAll().filter(n =>
      (!n.targetId   || n.targetId   === userId) &&
      (!n.targetRole || n.targetRole === role)
    );
  }

  function getUnread(userId, role) {
    return getFor(userId, role).filter(n => !n.read).length;
  }

  function markRead(id) {
    const all = getAll();
    const n = all.find(x => x.id === id);
    if (n) { n.read = true; saveAll(all); }
    _refreshBells();
  }

  function markAllRead(userId, role) {
    const all = getAll();
    all.forEach(n => {
      if ((!n.targetId || n.targetId === userId) &&
          (!n.targetRole || n.targetRole === role)) n.read = true;
    });
    saveAll(all);
    _refreshBells();
  }

  /* ── Render notification panel ── */
  function renderPanel(containerId, userId, role) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const items = getFor(userId, role);
    if (!items.length) {
      el.innerHTML = `<div class="notif-empty">🔕 No notifications yet.<br><span>They'll appear here when classes are scheduled, reports are ready, or achievements are earned.</span></div>`;
      return;
    }
    const unread = items.filter(n => !n.read).length;
    el.innerHTML = `
      <div class="notif-panel-header">
        <span>${unread > 0 ? `<b>${unread} unread</b>` : 'All caught up!'}</span>
        <button class="p-btn p-btn-ghost p-btn-sm" data-uid="${userId}" data-role="${role}" data-cid="${containerId}" onclick="CK.notifs.markAllRead(this.dataset.uid,this.dataset.role); CK.notifs.renderPanel(this.dataset.cid,this.dataset.uid,this.dataset.role)">Mark all read</button>
      </div>
      ${items.map(n => {
        const t = TYPES[n.type] || TYPES.general;
        const age = _timeAgo(n.date);
        const _esc = CK.esc || (s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
        return `
          <div class="notif-item${n.read ? '' : ' notif-unread'}" data-nid="${_esc(String(n.id))}" onclick="CK.notifs.markRead(this.dataset.nid); this.classList.remove('notif-unread')">
            <div class="notif-icon" style="color:${t.color}">${t.icon}</div>
            <div class="notif-body">
              <div class="notif-title">${_esc(n.title)}</div>
              <div class="notif-text">${_esc(n.body)}</div>
              <div class="notif-age">${age}</div>
            </div>
            ${!n.read ? '<div class="notif-dot"></div>' : ''}
          </div>`;
      }).join('')}`;
  }

  /* ── Bell badge refresh ── */
  function _refreshBells() {
    const user = CK.currentUser;
    if (!user) return;
    const count = getUnread(user.id, user.role);
    document.querySelectorAll('.notif-bell-badge').forEach(b => {
      b.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ── Toggle notification drawer ── */
  function toggleDrawer(role) {
    const drawer   = document.getElementById('notifDrawer');
    const backdrop = document.getElementById('notifBackdrop');
    if (!drawer) return;
    const open = drawer.classList.toggle('notif-open');
    if (backdrop) backdrop.style.display = open ? 'block' : 'none';
    if (open) {
      const user = CK.currentUser || {};
      renderPanel('notifPanelBody', user.id, user.role || role);
    }
  }

  /* ── Auto-generate system notifications on login ── */
  async function generateSystemNotifs(user) {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];

    // Don't spam — only once per day per user
    const todayKey = `ck_notifs_generated_${user.id}_${todayStr}`;
    if (localStorage.getItem(todayKey)) { _refreshBells(); return; }
    localStorage.setItem(todayKey, '1');

    const role = user.role;
    const _db = (typeof CK !== 'undefined') ? CK.db : null;
    const meetings = _db ? (await _db.getMeetings().catch(() => [])) : JSON.parse(localStorage.getItem('ck_meetings') || '[]');
    const reports  = JSON.parse(localStorage.getItem('ck_monthly_reports') || '[]');
    const classes  = _db?.getClasses ? (await _db.getClasses().catch(() => [])) : JSON.parse(localStorage.getItem('ck_classes') || '[]');

    if (role === 'student' || role === 'parent') {
      // Fee reminder (if no paid status)
      if (user.status !== 'Paid') {
        push('fee_due', 'Fee Payment Due', 'Your monthly fee is pending. Please pay via the Fee Gateway to avoid a late charge.', user.id, role);
      }

      // Class reminder — find next class in next 24h
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const upcoming = meetings.filter(m => m.date >= todayStr && m.date <= tomorrow && (m.batch === user.batch || !m.batch));
      if (upcoming.length) {
        const m = upcoming[0];
        push('class_reminder', `Class Tomorrow: ${m.title || m.type}`, `${m.date} at ${m.time}. Join link ready in My Schedule.`, user.id, role);
      }

      // New report
      const myReports = reports.filter(r => r.studentId === user.id && r.month === new Date().getMonth() + 1);
      if (myReports.length) {
        push('new_report', 'Monthly Report Available', `Your coach has published your report for ${new Date().toLocaleString('en-US',{month:'long'})}. Check My Progress.`, user.id, role);
      }

      // Puzzle streak nudge — only fire if user solved at least one puzzle today
      const scores = JSON.parse(localStorage.getItem('ck_puzzle_scores') || '[]').filter(s => s.userId === user.id);
      const todayScores = scores.filter(s => s.date?.startsWith(todayStr));
      if (todayScores.length > 0 && scores.length % 10 === 0) {
        push('puzzle_streak', `🔥 ${scores.length} Puzzles Solved!`, 'You\'re on fire! Keep solving to climb the leaderboard.', user.id, role);
      }
    }

    if (role === 'coach') {
      // Remind coach to take attendance
      const todayClasses = classes.filter(c => c.coachId === user.id);
      if (todayClasses.length) {
        push('class_reminder', 'Classes Scheduled Today', `You have ${todayClasses.length} class(es) today. Remember to mark attendance in the Attendance panel.`, user.id, role);
      }
      // Remind about pending reports
      const allStudents = _db ? (await _db.getProfiles('student').catch(() => [])) : JSON.parse(localStorage.getItem('ck_db_users') || '[]').filter(u => u.role === 'student');
      const students = allStudents.filter(u => u.coach && u.coach === user.full_name);
      const thisMonth = new Date().getMonth() + 1;
      const thisYear  = new Date().getFullYear();
      const doneReports = reports.filter(r => r.coachId === user.id && r.month === thisMonth && r.year === thisYear);
      const pending = students.length - doneReports.length;
      if (pending > 0) {
        push('new_report', `${pending} Reports Pending`, `${pending} student${pending > 1 ? 's' : ''} still need${pending === 1 ? 's' : ''} a monthly report this month.`, user.id, role);
      }
    }

    if (role === 'admin') {
      const students = _db ? (await _db.getProfiles('student').catch(() => [])) : JSON.parse(localStorage.getItem('ck_db_users') || '[]').filter(u => u.role === 'student');
      const unpaid = students.filter(s => s.status !== 'Paid');
      if (unpaid.length) {
        push('fee_due', `${unpaid.length} Students Unpaid`, `${unpaid.length} student${unpaid.length > 1 ? 's' : ''} ha${unpaid.length === 1 ? 's' : 've'} not paid this month. Check Expenditure panel.`, user.id, role);
      }

      const feedback = JSON.parse(localStorage.getItem('ck_feedback') || '[]').filter(f => !f.replied);
      if (feedback.length) {
        push('general', `${feedback.length} Feedback Awaiting Reply`, 'Parents and students have shared feedback. Reply from the Feedback panel.', user.id, role);
      }
    }

    _refreshBells();
  }

  /* ── Helpers ── */
  function _timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  /* ── Init (call after login) ── */
  function init(user) {
    if (!user) return;
    // Request browser push permission on first login (non-blocking)
    setTimeout(() => requestBrowserPermission(), 3000);
    generateSystemNotifs(user);
    _refreshBells();
  }

  /* ── Email Notification via EmailJS ── */
  async function sendEmail(toEmail, subject, bodyHtml) {
    if (!toEmail || !subject) return false;
    // Requires EmailJS SDK loaded and configured
    if (typeof window.emailjs === 'undefined') {
      console.warn('EmailJS SDK not loaded — skipping email notification');
      return false;
    }
    try {
      const cfg = window.APP_CONFIG || {};
      const serviceId  = cfg.EMAILJS_SERVICE  || localStorage.getItem('ck_emailjs_service')  || 'service_chesskidoo';
      const templateId = cfg.EMAILJS_TEMPLATE || localStorage.getItem('ck_emailjs_template') || 'template_notification';
      await window.emailjs.send(serviceId, templateId, {
        to_email: toEmail,
        subject: subject,
        message: bodyHtml
      });
      return true;
    } catch (e) {
      console.warn('EmailJS send failed:', e);
      return false;
    }
  }

  /* ── Push + Email combined ── */
  async function pushMultiChannel(type, title, body, opts = {}) {
    // In-app notification
    push(type, title, body, opts.targetId || null, opts.targetRole || null);

    // Email notification (if email provided)
    if (opts.email) {
      await sendEmail(opts.email, `[ChessKidoo] ${title}`, body);
    }

    // Browser push notification (if permission granted)
    if (opts.browserPush && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const t = TYPES[type] || TYPES.general;
        new Notification(title, { body, icon: '/assets/img/logo.png', badge: t.icon });
      } catch(e) {}
    }
  }

  /* ── Request browser notification permission ── */
  function requestBrowserPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  return {
    push, pushMultiChannel, sendEmail,
    getFor, getUnread, markRead, markAllRead,
    renderPanel, toggleDrawer, init,
    requestBrowserPermission,
    TYPES,
    refresh: _refreshBells
  };
})();
