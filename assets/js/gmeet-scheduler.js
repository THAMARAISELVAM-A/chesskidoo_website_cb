/* assets/js/gmeet-scheduler.js ----------------------------------------------
   ChessKidoo — Automatic Google Meet scheduler

   Makes class scheduling hands-off: every upcoming class/session gets a Google
   Meet link automatically (no manual "Generate" click), links are created
   server-side via the secure `create-meet` edge function (so the service-account
   key never ships to the browser), and they sync live over Supabase Realtime so
   students see the join link the moment a coach schedules a class.

   Public:
     CK.gmeetScheduler.ensureLinks()      → fill links for upcoming meetings
     CK.gmeetScheduler.createMeet()       → create one Meet link (secure first)
     CK.gmeetScheduler.autoSchedule(m)    → ensure a single meeting has a link
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.gmeetScheduler = (() => {
  let _ran = false;        // ensure once per session
  let _rtSubbed = false;

  function _fallbackLink() {
    const c = 'abcdefghijklmnopqrstuvwxyz';
    const r = n => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
  }
  function _valid(link) {
    return /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(link || '');
  }
  function _today() { return new Date().toISOString().slice(0, 10); }

  // Create one Meet link — secure server-side first, then legacy client, then fallback.
  async function createMeet() {
    // 1) Secure: Supabase edge function holds the SA key in env (recommended).
    try {
      if (window.supabaseClient && window.supabaseClient.functions) {
        const { data, error } = await window.supabaseClient.functions.invoke('create-meet', { body: {} });
        const uri = data && (data.meetingUri || data.uri || data.link);
        if (!error && uri && _valid(uri)) return uri;
      }
    } catch (e) { /* function not deployed yet → fall through */ }
    // 2) Legacy in-browser gmeet (itself falls back to a generated link).
    try {
      if (window.CK && CK.gmeet && CK.gmeet.createMeetSpace) {
        const uri = await CK.gmeet.createMeetSpace();
        if (uri) return uri;
      }
    } catch (e) {}
    // 3) Deterministic placeholder so a join link always exists.
    return _fallbackLink();
  }

  // Ensure a single meeting object has a valid link (used before save).
  async function autoSchedule(meeting) {
    if (!meeting) return meeting;
    if (!_valid(meeting.link)) meeting.link = await createMeet();
    return meeting;
  }

  // Fill links for every upcoming one-off meeting that doesn't have one yet.
  async function ensureLinks(force) {
    if (_ran && !force) return;
    _ran = true;
    let created = 0;
    created += await _ensureMeetingLinks();
    created += await ensureClassLinks();   // ← schedule-driven (recurring classes)
    if (created) {
      if (CK.showToast) CK.showToast(`🔗 Auto-scheduled Google Meet for ${created} session${created > 1 ? 's' : ''}.`, 'success');
      _refreshViews();
    }
  }

  async function _ensureMeetingLinks() {
    if (!(window.CK && CK.db && CK.db.getMeetings && CK.db.saveMeeting)) return 0;
    let meetings = [];
    try { meetings = (await CK.db.getMeetings()) || []; } catch (e) { return 0; }
    const upcoming = meetings.filter(m => (m.date || '') >= _today() && !_valid(m.link));
    let created = 0;
    for (const m of upcoming) {
      try { m.link = await createMeet(); await CK.db.saveMeeting(m); created++; } catch (e) {}
    }
    return created;
  }

  // SCHEDULE-DRIVEN: every active recurring class gets a permanent Meet room.
  // Driven by the coach's real timetable (the `classes` table: days + time).
  async function ensureClassLinks() {
    if (!(window.CK && CK.db && CK.db.getClasses && CK.db.saveClass)) return 0;
    let classes = [];
    try { classes = (await CK.db.getClasses()) || []; } catch (e) { return 0; }
    // only active classes that don't already have any link set
    const need = classes.filter(c => (c.active !== false) && !String(c.zoomLink || '').trim());
    let created = 0;
    for (const c of need) {
      try { c.zoomLink = await createMeet(); await CK.db.saveClass(c); created++; } catch (e) {}
    }
    return created;
  }

  // Best-effort re-render of whichever schedule view is on screen.
  function _refreshViews() {
    try {
      if (!window.CK || !CK.schedulePro) return;
      const prof = (CK.student && CK.student.userProfile) || CK.currentUser || {};
      if (document.getElementById('studentScheduleList') && CK.schedulePro.renderStudentSchedule)
        CK.schedulePro.renderStudentSchedule('studentScheduleList', prof);
      const coachHost = document.getElementById('coachScheduleContainer') || document.getElementById('coachSchedulePane');
      if (coachHost && CK.coach && CK.coach.renderSchedulePro) CK.coach.renderSchedulePro();
    } catch (e) {}
  }

  function _subscribeRealtime() {
    if (_rtSubbed) return;
    if (!window.supabaseClient || !window.supabaseClient.channel) { setTimeout(_subscribeRealtime, 1500); return; }
    _rtSubbed = true;
    try {
      window.supabaseClient.channel('ck_meetings_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => _refreshViews())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'classes' }, () => {
          // a new class was scheduled → give it a Meet room, then refresh
          ensureClassLinks().then(n => { if (n) _refreshViews(); });
        })
        .subscribe();
    } catch (e) {}
  }

  // Kick off automatically once the app + Supabase are ready.
  function _boot() {
    _subscribeRealtime();
    // small delay so auth/profile + supabaseClient are settled
    setTimeout(() => { ensureLinks().catch(() => {}); }, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();

  return { ensureLinks, ensureClassLinks, createMeet, autoSchedule };
})();
