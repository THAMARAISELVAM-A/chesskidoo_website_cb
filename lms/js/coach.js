// Coach dashboard logic
// Load coach-specific data and populate dashboard

/* Roster coach ids come in three shapes — dashed UUID, the same UUID with
   dashes stripped, and legacy "c_name" slugs. Compare them leniently so a
   formatting difference alone never hides a student from their own coach.
   Genuinely different identities (a slug vs a UUID) still will not match;
   those need the roster normalising, and are surfaced to the coach instead
   of the student silently vanishing from the attendance sheet. */
window.ckSameCoach = function (a, b) {
  if (a == null || b == null) return false;
  const norm = (v) => String(v).trim().toLowerCase().replace(/-/g, '');
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const coaches = window.allCoaches || [];
  const ca = coaches.find(c => norm(c.id) === na || norm(c.email) === na || norm(c.name) === na);
  const cb = coaches.find(c => norm(c.id) === nb || norm(c.email) === nb || norm(c.name) === nb);

  if (ca && cb) return norm(ca.id) === norm(cb.id);
  if (ca && (norm(ca.id) === nb || norm(ca.email) === nb || norm(ca.name) === nb)) return true;
  if (cb && (norm(cb.id) === na || norm(cb.email) === na || norm(cb.name) === na)) return true;

  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  // Navigation to coach dashboard is handled via setPage('coach-dash') in scripts.js
});

window.renderCoachDashboard = function() {
  if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;

  let coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();

  if (!coachId && window.allCoaches && window.allCoaches.length > 0) {
    const auth = sessionStorage.getItem("chesskidoo_auth") || sessionStorage.getItem("twoknights_auth");
    if (auth) {
      try {
        const data = JSON.parse(auth);
        const userName = (data.user || '').toLowerCase();
        const coach = window.allCoaches.find(c =>
          String(c.email || '').toLowerCase() === userName ||
          String(c.name || '').toLowerCase() === userName
        );
        if (coach && coach.id) {
          coachId = String(coach.id);
          window.currentCoachId = coachId;
          window.userId = coachId;
        }
      } catch (e) {
        console.warn('[Coach] Dashboard fallback coach lookup failed:', e);
      }
    }
  }

  if (!coachId) {
    setTimeout(() => { if (window.renderCoachDashboard) window.renderCoachDashboard(); }, 1000);
    return;
  }

  const coach = (window.allCoaches || []).find(c => String(c.id) === String(coachId));
  if (coach && coach.name) {
    const nameEl = document.getElementById('coach-dash-name');
    if (nameEl) nameEl.textContent = coach.name.split(' ')[0];
  }

  const myStudents = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, coachId));
  const myBatches = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, coachId));

  const statStudents = document.getElementById('coach-stat-students');
  const statBatches = document.getElementById('coach-stat-batches');
  const statSessions = document.getElementById('coach-stat-sessions');
  const statHw = document.getElementById('coach-stat-hw');

  if (statStudents) statStudents.textContent = myStudents.length;
  if (statBatches) statBatches.textContent = myBatches.length;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const upcomingSessions = (window.allAttendance || []).filter(a => {
    const attDate = new Date(a.date);
    return attDate >= today && attDate <= nextWeek && myStudents.some(s => String(s.id) === String(a.student_id));
  });
  if (statSessions) statSessions.textContent = upcomingSessions.length;

  const pendingHw = (window.homeworkSubmissionCache || [])
    .filter(s => s.status === 'submitted' && myStudents.some(st => String(st.id) === String(s.student_id)));
  if (statHw) statHw.textContent = pendingHw.length;
};

function getCurrentCoachIdFromStorage() {
  try {
    if (window.currentCoachId) return window.currentCoachId;
    if (window.userId) return window.userId;
    
    const auth = sessionStorage.getItem("chesskidoo_auth") || sessionStorage.getItem("twoknights_auth");
    if (auth) {
      const data = JSON.parse(auth);
      if (data.coachId) return data.coachId;
      if (data.coach_id) return data.coach_id;
      const user = data.user || '';
      const coach = (window.allCoaches || []).find(c => 
        String(c.email || '').toLowerCase() === String(user).toLowerCase() ||
        String(c.name || '').toLowerCase() === String(user).toLowerCase()
      );
      if (coach && coach.id) return coach.id;
    }
  } catch (e) {
    console.warn('[Coach] Failed to get coach ID from storage:', e);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    const dash = document.getElementById('page-coach-dash');
    const stud = document.getElementById('page-stud');
    if (dash && dash.classList.contains('active') && window.renderCoachDashboard) {
      window.renderCoachDashboard();
    }
    if (stud && stud.classList.contains('active') && window.renderStudents) {
      window.renderStudents();
    }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});

  window.renderCoachStudents = function () {
    if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;

    const tbody = document.getElementById('coach-students-tbody');
    if (!tbody) return;

    const myStudents = (window.allStudents || [])
      .filter(s => window.ckSameCoach(s.coach_id, coachId))
      .sort((a, b) => (window.getStudentName ? window.getStudentName(a) : a.name).localeCompare(window.getStudentName ? window.getStudentName(b) : b.name));

    if (myStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="coach-loading-cell">No students assigned yet.</td></tr>';
      return;
    }

    tbody.innerHTML = myStudents.map((s, idx) => {
      const name = window.getStudentName ? window.getStudentName(s) : s.name;
      const phone = window.getStudentPhone ? window.getStudentPhone(s) : (s.phone || '—');
      return `
        <tr>
          <td style="color:var(--ivory-dim)">${idx + 1}</td>
          <td style="font-weight:500; color:var(--ivory)">${window.escapeHtml ? window.escapeHtml(name) : name}</td>
          <td style="font-family:monospace; font-size:12px;">${phone}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="if(window.viewStudent)window.viewStudent('${s.id}')">View</button>
            <button class="btn btn-gold btn-sm" onclick="if(window.openStudentSkillBreakdown)window.openStudentSkillBreakdown('${s.id}')">📊 Skills</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  window.openStudentSkillBreakdown = function(studentId) {
    const s = (window.allStudents || []).find((x) => String(x.id) === String(studentId));
    if (!s) {
      toast('Student not found', 'error');
      return;
    }
    if (typeof window.setCurrentStudent === 'function') {
      window.setCurrentStudent(s);
    }
    if (typeof window.openStudentEditPortalModal === 'function') {
      window.openStudentEditPortalModal();
    }
  };

  window.renderCoachBatches = function () {
    if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;

    const grid = document.getElementById('coach-batches-grid');
    if (!grid) return;

    const searchTerm = (document.getElementById('coach-batch-search-input')?.value || '').toLowerCase();
    const myBatches = (window.allBatches || [])
      .filter(b => window.ckSameCoach(b.coach_id, coachId))
      .filter(b => !searchTerm || (b.name || '').toLowerCase().includes(searchTerm))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (myBatches.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--ivory-dim);">No batches found.</div>';
      return;
    }

    grid.innerHTML = myBatches.map(b => {
      const days = b.days || b.schedule_days || 'TBD';
      const time = b.time_slot || b.time || 'TBD';
      const studentCount = Array.isArray(b.student_ids) ? b.student_ids.length : 0;
      const link = window.getBatchMeetLink ? window.getBatchMeetLink(b) : '';
      const esc = window.escapeHtml || function(x){return x};

      return `
        <div class="card" style="padding: 24px; position: relative; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h3 style="color: var(--gold); font-size: 18px; margin: 0 0 6px 0; max-width: 85%;">${esc(b.name)}</h3>
            <span class="badge badge-info">${esc(b.level || 'Beginner')}</span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="ico" style="opacity: 0.6">🕒</span>
              <span style="color: var(--ivory-dim)">${esc(days)} • ${esc(time)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="ico" style="opacity: 0.6">👥</span>
              <span style="color: var(--ivory-dim)">${studentCount} Students enrolled</span>
            </div>
            ${link ? `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="ico" style="opacity: 0.6">🎥</span>
              <a href="${esc(link)}" target="_blank" rel="noopener" style="color: var(--gold); text-decoration: none; font-size: 13px;">Join Class</a>
            </div>
            ` : ''}
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="window.openViewBatchModal('${b.id}')">👥 View</button>
            <button class="btn btn-outline btn-sm" onclick="window.openCoachCreateBatchModal('${b.id}')">✏️ Edit</button>
            ${link ? `
              <button class="btn btn-outline btn-sm" onclick="window.coachShareBatchLink('${b.id}')" title="Share class link with students via WhatsApp">📲 Share</button>
              <button class="btn btn-outline btn-sm" onclick="window.coachSetBatchLink('${b.id}')">✏️ Link</button>
              <button class="btn btn-outline btn-sm" onclick="window.coachDeleteBatchLink('${b.id}')">🗑️</button>
            ` : `
              <button class="btn btn-outline btn-sm" onclick="window.coachSetBatchLink('${b.id}')">🔗 Set Link</button>
            `}
          </div>
        </div>
      `;
    }).join('');
  };

  // ── Batch class-link helpers (Google Meet sharing) ────────────────────────
  window.getBatchMeetLink = function (batch) {
    if (!batch) return '';
    if (batch.meet_link) return String(batch.meet_link);
    const m = String(batch.notes || '').match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : '';
  };

  window.coachDeleteBatchLink = async function (batchId) {
    const batch = (window.allBatches || []).find(b => String(b.id) === String(batchId));
    if (!batch) return;
    if (!confirm(`Delete meeting link for batch "${batch.name || 'this batch'}"?`)) return;

    const otherNotes = String(batch.notes || '').replace(/https?:\/\/[^\s"'<>]+/g, '').replace(/\s{2,}/g, ' ').trim();
    try {
      const res = await window.apiCall(`/api/batches?id=${batchId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes: otherNotes, meet_link: '' }),
      });
      if (res.ok) {
        batch.notes = otherNotes;
        batch.meet_link = '';
        if (window.toast) window.toast('Meeting link deleted', 'info');
        if (typeof window.renderCoachBatches === 'function') window.renderCoachBatches();
        if (window.currentStudent && typeof window.renderChildSchedule === 'function') {
          window.renderChildSchedule(window.currentStudent);
        }
      }
    } catch (e) {
      if (window.toast) window.toast('Error deleting meeting link: ' + e.message, 'error');
    }
  };

  window.coachSetBatchLink = async function (batchId) {
    const batch = (window.allBatches || []).find(b => String(b.id) === String(batchId));
    if (!batch) return;
    const current = window.getBatchMeetLink(batch);
    const input = prompt(
      'Paste the Google Meet / Zoom link for "' + (batch.name || 'this batch') + '":\n(e.g. https://meet.google.com/abc-defg-hij)',
      current || 'https://meet.google.com/'
    );
    if (input === null) return; // cancelled
    const link = input.trim();
    if (link && !/^https:\/\/[^\s]+$/i.test(link)) {
      if (window.toast) window.toast('That does not look like a valid https:// link.', 'error');
      return;
    }
    // Preserve any non-URL note text; replace/append only the URL portion.
    const otherNotes = String(batch.notes || '').replace(/https?:\/\/[^\s"'<>]+/g, '').replace(/\s{2,}/g, ' ').trim();
    const newNotes = link ? (otherNotes ? otherNotes + ' ' + link : link) : otherNotes;
    try {
      const res = await window.apiCall(`/api/batches?id=${batchId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes: newNotes, meet_link: link }),
      });
      if (res.ok) {
        batch.notes = newNotes;
        batch.meet_link = link;
        if (window.toast) window.toast(link ? 'Class link saved! Students can now see the Join Class button.' : 'Class link removed.', 'success');
        if (typeof window.renderCoachBatches === 'function') window.renderCoachBatches();
        if (window.currentStudent && typeof window.renderChildSchedule === 'function') {
          window.renderChildSchedule(window.currentStudent);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (window.toast) window.toast('Failed to save link: ' + (err.error || 'unknown error'), 'error');
      }
    } catch (e) {
      if (window.toast) window.toast('Network error: ' + e.message, 'error');
    }
  };

  /* Resolve a student's WhatsApp number. Prefers the shared international
     formatter when scripts.js has loaded it, else falls back to digits with a
     91 default for local 10-digit numbers. */
  function waNumber(student) {
    const raw = String(student.parent_phone || student.phone || '').trim();
    if (!raw) return '';
    if (window.getFullInternationalPhoneDigits) {
      try {
        const d = window.getFullInternationalPhoneDigits(raw, student.country_code || 'IN');
        if (d) return String(d).replace(/\D/g, '');
      } catch (e) { /* fall through to the local heuristic */ }
    }
    const digits = raw.replace(/\D/g, '');
    return digits.length === 10 ? '91' + digits : digits;
  }

  function batchShareMessage(batch, link) {
    const days = batch.days || batch.schedule_days || 'as scheduled';
    const time = batch.time_slot || batch.time || '';
    return (
      `\u265F\uFE0F *ChessKidoo Academy \u2014 Online Class*\n\n` +
      `Batch: ${batch.name || ''}\n` +
      `Schedule: ${days}${time ? ' \u2022 ' + time : ''}\n\n` +
      `\u{1F3A5} Join your class here:\n${link}\n\n` +
      `Please join 5 minutes early. See you on the board!`
    );
  }

  /* Previously this opened a bare wa.me/?text= share with NO recipient, so the
     coach had to hand-pick every parent and the batch's own students were never
     actually targeted. Resolve them from batch.student_ids instead and offer a
     direct send per student, keeping the recipient-less share as a fallback. */
  window.coachShareBatchLink = function (batchId) {
    const batch = (window.allBatches || []).find(b => String(b.id) === String(batchId));
    if (!batch) return;
    const link = window.getBatchMeetLink(batch);
    if (!link) {
      if (window.toast) window.toast('Set a class link first.', 'info');
      return;
    }
    const msg = batchShareMessage(batch, link);
    if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(() => {});

    const ids = Array.isArray(batch.student_ids) ? batch.student_ids.map(String) : [];
    const recipients = (window.allStudents || [])
      .filter(s => ids.includes(String(s.id)))
      .map(s => ({
        name: window.getStudentName ? window.getStudentName(s) : (s.full_name || s.name || 'Student'),
        wa: waNumber(s)
      }));
    const reachable = recipients.filter(r => r.wa);

    if (!reachable.length) {
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      if (window.toast) {
        window.toast(recipients.length
          ? 'No phone numbers on this batch\u2019s students \u2014 opened a blank WhatsApp share instead.'
          : 'No students assigned to this batch \u2014 opened a blank WhatsApp share instead.', 'warning');
      }
      return;
    }

    const esc = (v) => (window.escapeHtml ? window.escapeHtml(v) : String(v));
    const rows = reachable.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border)">
        <span style="color:var(--ivory);font-size:13px">${esc(r.name)}</span>
        <a class="btn btn-gold btn-sm" style="text-decoration:none;white-space:nowrap"
           href="https://wa.me/${esc(r.wa)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Send</a>
      </div>`).join('');
    const missing = recipients.length - reachable.length;

    const ov = document.createElement('div');
    ov.className = 'ck-share-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = `
      <div style="background:var(--bg2,#151d2b);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;max-height:80vh;overflow:auto;padding:18px">
        <div style="font-weight:700;color:var(--ivory);margin-bottom:4px">Share class link</div>
        <div style="font-size:12px;color:var(--ivory-dim);margin-bottom:12px">
          ${esc(batch.name || 'Batch')} \u2022 ${reachable.length} student(s)${missing ? ` \u2022 ${missing} without a phone number` : ''}
        </div>
        ${rows}
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-outline btn-sm" style="flex:1" data-ck-copy>Copy message</button>
          <button class="btn btn-outline btn-sm" style="flex:1" data-ck-close>Close</button>
        </div>
      </div>`;
    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target.hasAttribute('data-ck-close')) { ov.remove(); return; }
      if (e.target.hasAttribute('data-ck-copy')) {
        if (navigator.clipboard) navigator.clipboard.writeText(msg);
        if (window.toast) window.toast('Message copied.', 'success');
      }
    });
    document.body.appendChild(ov);
  };

  window.renderCoachSchedule = function (filterDay = 'all') {
    const container = document.getElementById('coach-schedule-content');
    if (!container) return;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      container.innerHTML = '<div class="coach-loading-cell">Unable to load schedule. Coach ID not found.</div>';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => window.ckSameCoach ? window.ckSameCoach(s.coach_id, coachId) : String(s.coach_id) === String(coachId));
    const myBatches = (window.allBatches || []).filter(b => (window.ckSameCoach ? window.ckSameCoach(b.coach_id, coachId) : String(b.coach_id) === String(coachId)) && b.status !== 'archived');

    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const SHORT_DAYS = { 'mon': 'Monday', 'monday': 'Monday', 'tue': 'Tuesday', 'tuesday': 'Tuesday', 'wed': 'Wednesday', 'wednesday': 'Wednesday', 'thu': 'Thursday', 'thursday': 'Thursday', 'fri': 'Friday', 'friday': 'Friday', 'sat': 'Saturday', 'saturday': 'Saturday', 'sun': 'Sunday', 'sunday': 'Sunday' };

    // Aggregate sessions by day
    const scheduleByDay = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    // 1. Process Batch schedules
    myBatches.forEach(b => {
      const daysStr = (b.days || b.schedule || '').toLowerCase();
      const timeStr = b.time_slot || (b.schedule && b.schedule.includes('|') ? b.schedule.split('|')[1].trim() : '5:00 PM - 6:00 PM');
      
      // Find students in this batch
      const bStudentIds = Array.isArray(b.student_ids) ? b.student_ids.map(String) : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
      const enrolledStudents = myStudents.filter(st => bStudentIds.includes(String(st.id)) || (st.batch_id && String(st.batch_id) === String(b.id)) || (st.batch && String(st.batch) === String(b.name)));

      DAYS_ORDER.forEach(dayName => {
        const dLow = dayName.toLowerCase();
        if (daysStr.includes(dLow) || daysStr.includes(dLow.slice(0, 3))) {
          scheduleByDay[dayName].push({
            type: 'batch',
            batchId: b.id,
            title: b.name || 'Group Batch',
            time: timeStr,
            meetLink: b.meet_link || 'https://meet.google.com/new',
            students: enrolledStudents
          });
        }
      });
    });

    // 2. Process 1-on-1 / custom individual student schedules not tied to batches
    myStudents.forEach(st => {
      const hasBatch = st.batch_id || st.batch;
      const stSchedule = (st.regDays || st.schedule || st.session_day || '').toLowerCase();
      const stTime = st.regTime || st.session_time || '6:00 PM - 7:00 PM';

      if (!hasBatch && stSchedule) {
        DAYS_ORDER.forEach(dayName => {
          const dLow = dayName.toLowerCase();
          if (stSchedule.includes(dLow) || stSchedule.includes(dLow.slice(0, 3))) {
            scheduleByDay[dayName].push({
              type: 'individual',
              studentId: st.id,
              title: `1-on-1: ${window.getStudentName ? window.getStudentName(st) : (st.name || 'Student')}`,
              time: stTime,
              meetLink: st.meet_link || 'https://meet.google.com/new',
              students: [st]
            });
          }
        });
      }
    });

    // Compute stats
    let totalWeeklySessions = 0;
    DAYS_ORDER.forEach(d => { totalWeeklySessions += scheduleByDay[d].length; });

    let filterPillsHtml = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
        <button class="btn ${filterDay === 'all' ? 'btn-gold' : 'btn-outline-grey'} btn-sm" onclick="window.renderCoachSchedule('all')">
          📅 All Days (${totalWeeklySessions})
        </button>
        ${DAYS_ORDER.map(d => `
          <button class="btn ${filterDay === d ? 'btn-gold' : 'btn-outline-grey'} btn-sm" onclick="window.renderCoachSchedule('${d}')">
            ${d.slice(0, 3)} (${scheduleByDay[d].length})
          </button>
        `).join('')}
      </div>
    `;

    const daysToRender = filterDay === 'all' ? DAYS_ORDER : [filterDay];
    let scheduleGridHtml = '';

    daysToRender.forEach(dayName => {
      const sessions = scheduleByDay[dayName];
      if (filterDay === 'all' && sessions.length === 0) return;

      scheduleGridHtml += `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:18px; box-shadow:0 4px 16px rgba(0,0,0,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:18px;">🗓️</span>
              <h3 style="font-size:16px; font-weight:700; color:var(--gold); margin:0;">${dayName}</h3>
            </div>
            <span style="background:rgba(218,163,62,0.15); color:var(--gold); font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px;">
              ${sessions.length} Session${sessions.length === 1 ? '' : 's'}
            </span>
          </div>
      `;

      if (sessions.length === 0) {
        scheduleGridHtml += `<div style="color:var(--ivory-dim); font-size:13px; padding:12px 0; text-align:center;">No sessions scheduled for ${dayName}.</div>`;
      } else {
        scheduleGridHtml += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">` + sessions.map(sess => `
          <div style="background:var(--bg2); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-weight:700; color:var(--ivory); font-size:15px;">${window.escapeHtml ? window.escapeHtml(sess.title) : sess.title}</span>
                <span style="background:rgba(59,130,246,0.15); color:#60a5fa; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; font-family:var(--font-mono); white-space:nowrap;">
                  ⏰ ${window.escapeHtml ? window.escapeHtml(sess.time) : sess.time}
                </span>
              </div>
              <div style="font-size:12px; color:var(--ivory-dim); line-height:1.5;">
                <strong style="color:var(--ivory);">${sess.students.length} Student${sess.students.length === 1 ? '' : 's'}:</strong>
                ${sess.students.length ? sess.students.map(s => `<span style="display:inline-block; background:rgba(255,255,255,0.04); padding:1px 6px; border-radius:4px; margin:2px 2px 0 0; font-size:11px;">👤 ${window.escapeHtml ? window.escapeHtml(window.getStudentName ? window.getStudentName(s) : (s.name || 'Student')) : (s.name || 'Student')}</span>`).join('') : '<span style="font-style:italic;">No students assigned yet</span>'}
              </div>
            </div>
            <div style="display:flex; gap:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
              <a href="${sess.meetLink}" target="_blank" class="btn btn-gold btn-sm" style="flex:1; text-align:center; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-size:12px;">
                📹 Join Class
              </a>
              ${sess.type === 'batch' ? `
                <button class="btn btn-outline btn-sm" onclick="window.openCoachCreateBatchModal('${sess.batchId}')" style="font-size:12px;" title="Edit batch schedule">
                  ✏️
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="window.deleteCoachBatch('${sess.batchId}')" style="font-size:12px;" title="Delete batch">
                  🗑️
                </button>
              ` : `
                <button class="btn btn-outline-grey btn-sm" onclick="if(window.renderCoachAttendanceMarking){ window.renderCoachAttendanceMarking(); if(window.showPage) window.showPage('page-coach-attendance'); }" style="font-size:12px;">
                  📋 Attendance
                </button>
              `}
            </div>
          </div>
        `).join('') + `</div>`;
      }

      scheduleGridHtml += `</div>`;
    });

    if (!scheduleGridHtml) {
      scheduleGridHtml = '<div class="empty-state" style="padding:40px; text-align:center;"><span class="empty-icon" style="font-size:36px;">📅</span><p style="color:var(--ivory-dim); margin-top:8px;">No active classes scheduled. When you are assigned batches or students, your weekly timetable appears here automatically.</p></div>';
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:14px; flex:1;">
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:11px; color:var(--ivory-dim); text-transform:uppercase;">Active Batches</div>
            <div style="font-size:24px; font-weight:800; color:var(--gold); margin-top:4px;">${myBatches.length}</div>
          </div>
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:11px; color:var(--ivory-dim); text-transform:uppercase;">Enrolled Students</div>
            <div style="font-size:24px; font-weight:800; color:var(--blue); margin-top:4px;">${myStudents.length}</div>
          </div>
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;">
            <div style="font-size:11px; color:var(--ivory-dim); text-transform:uppercase;">Weekly Sessions</div>
            <div style="font-size:24px; font-weight:800; color:#10b981; margin-top:4px;">${totalWeeklySessions}</div>
          </div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="window.openCoachCreateBatchModal()" style="white-space:nowrap;">
          ➕ Add Batch
        </button>
      </div>
      ${filterPillsHtml}
      ${scheduleGridHtml}
    `;
  };

  window.renderCoachEvents = function () {
    const container = document.getElementById('coach-events-content');
    if (!container) return;

    if (!window.eventsData || window.eventsData.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No events scheduled.</div>';
      return;
    }

    const visibleEvents = window.eventsData.filter(e => {
      return e.status !== 'archived' && e.archived !== true;
    });

    if (visibleEvents.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No upcoming events.</div>';
      return;
    }

    container.innerHTML = visibleEvents.map(e => {
      const evDate = new Date(e.date || e.event_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const isPast = evDate < now;
      const statusClass = isPast ? 'badge badge-info' : 'badge badge-success';
      const statusText = isPast ? 'Completed' : 'Upcoming';
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : 'TBD';
      const location = e.location || 'TBD';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-weight:600; color:var(--ivory);">${window.escapeHtml ? window.escapeHtml(e.title) : e.title}</div>
            <div style="font-size:12px; color:var(--ivory-dim); margin-top:2px;">${dateStr} · ${window.escapeHtml ? window.escapeHtml(location) : location}</div>
          </div>
          <span class="${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  };

  window.renderCoachAttendance = function () {
    const container = document.getElementById('coach-attendance-content');
    if (!container) return;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      container.innerHTML = '<div class="coach-loading-cell">Unable to load attendance. Coach ID not found.</div>';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, coachId));
    const myStudentIds = myStudents.map(s => String(s.id));

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 30); // Show last 30 days instead of 14

    const recent = (window.allAttendance || [])
      .filter(a => myStudentIds.includes(String(a.studentId || a.student_id)))
      .filter(a => {
        const d = new Date(a.date);
        return d >= weekAgo && d <= today;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const presentCount = recent.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const absentCount = recent.filter(a => (a.status || '').toLowerCase() === 'absent').length;

    if (recent.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No attendance records found. <button class="btn btn-outline-grey btn-sm" onclick="refreshCoachAttendance()">Refresh</button></div>';
      return;
    }

    container.innerHTML = '<div class="coach-attendance-summary" style="margin-bottom:14px;"><div class="coach-attendance-item present"><span class="attendance-count">' + presentCount + '</span><span class="attendance-label">Present</span></div><div class="coach-attendance-item absent"><span class="attendance-count">' + absentCount + '</span><span class="attendance-label">Absent</span></div></div><div class="coach-table-wrap"><table class="coach-mini-table"><thead><tr><th>Date</th><th>Student</th><th>Status</th><th>Marked By</th></tr></thead><tbody>' + recent.map(a => {
      const student = myStudents.find(s => String(s.id) === String(a.studentId || a.student_id));
      const name = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : 'Unknown';
      const sc = (a.status || '').toLowerCase() === 'present' ? 'badge badge-success' : (a.status || '').toLowerCase() === 'absent' ? 'badge badge-danger' : 'badge badge-level';
      const markedBy = a.coachName || a.coach_name || a.coachId || a.coach_id || 'Unknown';
      return '<tr><td style="color:var(--ivory-dim)">' + (a.date ? new Date(a.date).toLocaleDateString() : 'TBD') + '</td><td style="color:var(--ivory)">' + (window.escapeHtml ? window.escapeHtml(name) : name) + '</td><td><span class="' + sc + '">' + (a.status || '—') + '</span></td><td style="color:var(--ivory-dim);font-size:11px;">' + (window.escapeHtml ? window.escapeHtml(markedBy) : markedBy) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  };

  window.refreshCoachAttendance = async function() {
    try {
      const res = await apiCall('/api/attendance');
      if (res.ok) {
        const d = await res.json();
        window.allAttendance = d.data || d;
        renderCoachAttendance();
      }
    } catch (e) {
      console.warn('Failed to refresh attendance:', e);
    }
  };

  window.renderCoachAttendanceMarking = function () {
    const container = document.getElementById('coach-att-marking-body');
    const summary = document.getElementById('coach-attendance-summary');

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      if (container) container.innerHTML = '<tr><td colspan="3" class="coach-loading-cell">Coach ID not found.</td></tr>';
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isCoach = (window.role || '').toLowerCase() === 'coach';
    const dateEl = document.getElementById('coach-att-date');
    if (dateEl) {
      if (isCoach) {
        dateEl.value = today;
        dateEl.min = today;
        dateEl.max = today;
        dateEl.title = 'Coaches can mark attendance for today only. Past or future dates must be entered by an Admin.';
      } else if (!dateEl.value) {
        dateEl.value = today;
      }
    }
    const date = isCoach ? today : (dateEl ? (dateEl.value || today) : today);

    const myBatches = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, coachId));
    const myBatchStudentIds = new Set();
    myBatches.forEach(b => {
      const rawIds = Array.isArray(b.student_ids) ? b.student_ids.map(String) : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
      rawIds.forEach(id => myBatchStudentIds.add(String(id)));
    });

    const batchSelect = document.getElementById('coach-att-batch-filter');
    if (batchSelect) {
      const prevBatch = batchSelect.value;
      batchSelect.innerHTML = '<option value="">All Batches</option>' + myBatches.map(b => 
        `<option value="${b.id}">${window.escapeHtml ? window.escapeHtml(b.name) : b.name}</option>`
      ).join('');
      if (prevBatch && myBatches.some(b => String(b.id) === String(prevBatch))) {
        batchSelect.value = prevBatch;
      }
    }
    const selectedBatchId = batchSelect ? batchSelect.value : '';

    if (!container) {
      if (typeof window.renderCoachAttendanceHomeworkCalendar === 'function') {
        window.renderCoachAttendanceHomeworkCalendar();
      }
      return;
    }

    let myStudents = (window.allStudents || []).filter(s => {
      if (window.ckSameCoach(s.coach_id, coachId)) return true;
      if (myBatchStudentIds.has(String(s.id))) return true;
      if (s.batch_id && myBatches.some(b => String(b.id) === String(s.batch_id))) return true;
      if (s.batch && myBatches.some(b => String(b.name) === String(s.batch) || String(b.batch_name) === String(s.batch))) return true;
      return false;
    });

    if (selectedBatchId) {
      const selBatch = myBatches.find(b => String(b.id) === String(selectedBatchId));
      const rawIds = Array.isArray(selBatch?.student_ids) ? selBatch.student_ids.map(String) : (window.parseStudentIds ? window.parseStudentIds(selBatch?.student_ids) : []);
      myStudents = myStudents.filter(s => 
        rawIds.includes(String(s.id)) || (selBatch && ((s.batch_id && String(s.batch_id) === String(selBatch.id)) || (s.batch && (String(s.batch) === String(selBatch.name) || String(s.batch) === String(selBatch.batch_name)))))
      );
    }

    myStudents.sort((a, b) => (window.getStudentName ? window.getStudentName(a) : (a.name || '')).localeCompare(window.getStudentName ? window.getStudentName(b) : (b.name || '')));

    if (myStudents.length === 0) {
      container.innerHTML = '<tr><td colspan="3" class="coach-loading-cell">No students match the selected batch/date.</td></tr>';
      if (summary) summary.innerHTML = '';
      return;
    }

    const myIds = new Set(myStudents.map(s => String(s.id)));
    const dayRecords = (window.allAttendance || [])
      .filter(a => a.date === date && myIds.has(String(a.studentId || a.student_id)));

    container.innerHTML = myStudents.map(s => {
      const existing = dayRecords.find(a => String(a.studentId || a.student_id) === String(s.id));
      const parsed = existing ? parseAttendanceNotes(existing.notes || '') : { cw: '', hw: '', general: '' };
      const status = existing ? (existing.status || '') : '';
      const name = window.getStudentName ? window.getStudentName(s) : s.name;
      return '<tr>' +
        '<td style="font-weight:500; color:var(--ivory)">' + (window.escapeHtml ? window.escapeHtml(name) : name) + '</td>' +
        '<td><select class="att-status" data-sid="' + s.id + '" onchange="updateCoachAttStats()"><option value="" ' + (!status ? 'selected' : '') + '>-- Select --</option><option value="present" ' + (status === 'present' ? 'selected' : '') + '>✅ Present</option><option value="absent" ' + (status === 'absent' ? 'selected' : '') + '>❌ Absent</option><option value="late" ' + (status === 'late' ? 'selected' : '') + '>⏰ Late</option><option value="excused" ' + (status === 'excused' ? 'selected' : '') + '>📋 Excused</option></select></td>' +
        '<td><div style="display:flex; flex-direction:column; gap:8px;"><textarea class="att-cw" data-sid="' + s.id + '" placeholder="Classwork notes..." style="font-size:12px; width:100%; min-height:50px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.cw) : parsed.cw) + '</textarea><textarea class="att-hw" data-sid="' + s.id + '" placeholder="Homework notes..." style="font-size:12px; width:100%; min-height:50px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.hw) : parsed.hw) + '</textarea><textarea class="att-notes" data-sid="' + s.id + '" placeholder="General note..." style="font-size:12px; width:100%; min-height:40px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.general) : parsed.general) + '</textarea></div></td>' +
        '</tr>';
    }).join('');

    updateCoachAttStats();
    if (typeof window.renderCoachAttendanceHomeworkCalendar === 'function') {
      window.renderCoachAttendanceHomeworkCalendar();
    }
  };

  window.updateCoachAttStats = function () {
    const summary = document.getElementById('coach-attendance-summary');
    if (!summary) return;
    const selects = document.querySelectorAll('#coach-att-marking-body .att-status');
    const tally = { present: 0, absent: 0, late: 0, excused: 0 };
    selects.forEach((sel) => {
      const v = (sel.value || '').toLowerCase();
      if (v && Object.prototype.hasOwnProperty.call(tally, v)) tally[v] += 1;
    });
    const unmarked = selects.length - (tally.present + tally.absent + tally.late + tally.excused);
    const item = (cls, count, label) =>
      '<div class="coach-attendance-item ' + cls + '">' +
        '<span class="attendance-count">' + count + '</span>' +
        '<span class="attendance-label">' + label + '</span>' +
      '</div>';
    summary.innerHTML =
      '<div class="coach-attendance-summary">' +
        item('present', tally.present, 'Present') +
        item('absent', tally.absent, 'Absent') +
        item('late', tally.late, 'Late') +
        item('excused', tally.excused, 'Excused') +
        item('pending', unmarked < 0 ? 0 : unmarked, 'Unmarked') +
      '</div>';
  };

  window.parseAttendanceNotes = function(raw) {
    let cw = '', hw = '', general = '', understanding = '';
    if (!raw) return { cw, hw, general, understanding };
    const lines = String(raw).split('\n');
    let mode = 'general';
    for (const line of lines) {
      if (line.startsWith('CW:')) {
        mode = 'cw';
        const val = line.slice(3);
        cw += (cw ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('HW:')) {
        mode = 'hw';
        const val = line.slice(3);
        hw += (hw ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('UNDERSTANDING:')) {
        mode = 'understanding';
        const val = line.slice(14);
        understanding += (understanding ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('GENERAL:')) {
        mode = 'general';
        const val = line.slice(8);
        general += (general ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('---')) {
        mode = 'general';
        continue;
      }
      if (mode === 'cw') cw += (cw ? '\n' : '') + line;
      else if (mode === 'hw') hw += (hw ? '\n' : '') + line;
      else if (mode === 'understanding') understanding += (understanding ? '\n' : '') + line;
      else general += (general ? '\n' : '') + line;
    }
    return { cw, hw, general, understanding };
  };

  window.formatAttendanceNotesForSave = function(cw, hw, general, understanding) {
    const parts = [];
    if (cw && cw.trim()) parts.push('CW:' + cw.trim());
    if (hw && hw.trim()) parts.push('HW:' + hw.trim());
    if (understanding && understanding.trim()) parts.push('UNDERSTANDING:' + understanding.trim());
    if (general && general.trim()) parts.push('GENERAL:' + general.trim());
    return parts.join('\n');
  };

  window.saveCoachAttendance = async function () {
    const today = new Date().toISOString().split('T')[0];
    const isCoach = (window.role || '').toLowerCase() === 'coach';
    const dateEl = document.getElementById('coach-att-date');
    let date = dateEl ? (dateEl.value || today) : today;
    if (isCoach) {
      date = today;
    }
    if (!date) {
      toast('Please select a date', 'error');
      return;
    }
    if (isCoach && date !== today) {
      toast('Coaches can only mark attendance for today (' + today + '). Past or future attendance must be updated by an Admin.', 'error');
      return;
    }

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }

    const myBatches = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, coachId));
    const myBatchStudentIds = new Set();
    myBatches.forEach(b => {
      const rawIds = Array.isArray(b.student_ids) ? b.student_ids.map(String) : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
      rawIds.forEach(id => myBatchStudentIds.add(String(id)));
    });

    const isMyStudent = (student) => {
      if (!student) return false;
      if (window.ckSameCoach(student.coach_id, coachId)) return true;
      if (myBatchStudentIds.has(String(student.id))) return true;
      if (student.batch_id && myBatches.some(b => String(b.id) === String(student.batch_id))) return true;
      if (student.batch && myBatches.some(b => String(b.name) === String(student.batch) || String(b.batch_name) === String(student.batch))) return true;
      return false;
    };

    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    const skipped = [];
    const records = Array.from(rows)
      .map((row) => {
        const select = row.querySelector('.att-status');
        const notesInput = row.querySelector('.att-notes');
        const cwInput = row.querySelector('.att-cw');
        const hwInput = row.querySelector('.att-hw');
        if (!select || !select.value) return null;
        const studentId = select.dataset.sid;
        const student = (window.allStudents || []).find((s) => String(s.id) === String(studentId));
        if (!student) return null;
        if (!isMyStudent(student)) { skipped.push(student.full_name || student.name || studentId); return null; }
        const cw = cwInput ? cwInput.value : '';
        const hw = hwInput ? hwInput.value : '';
        const general = notesInput ? notesInput.value : '';
        return {
          student_id: studentId,
          studentId: studentId,
          status: select.value,
          date: date,
          notes: window.formatAttendanceNotesForSave ? window.formatAttendanceNotesForSave(cw, hw, general) : general,
        };
      })
      .filter((r) => r !== null);

    if (records.length === 0) {
      toast(
        skipped.length
          ? `No attendance saved — ${skipped.length} student(s) are not linked to your coach ID or batches.`
          : 'No attendance marked',
        'error'
      );
      if (skipped.length) console.warn('[Attendance] coach_id mismatch for:', skipped);
      return;
    }
    if (skipped.length) {
      toast(`${skipped.length} student(s) skipped — not linked to your coach ID`, 'warning');
      console.warn('[Attendance] coach_id mismatch for:', skipped);
    }

    // Always update local storage cache immediately
    try {
      const storedAtt = JSON.parse(localStorage.getItem('ck_attendance_records') || '[]');
      records.forEach(rec => {
        const idx = storedAtt.findIndex(a => String(a.studentId || a.student_id) === String(rec.studentId || rec.student_id) && a.date === rec.date);
        if (idx !== -1) storedAtt[idx] = { ...storedAtt[idx], ...rec };
        else storedAtt.unshift(rec);
      });
      localStorage.setItem('ck_attendance_records', JSON.stringify(storedAtt));
    } catch (e) {}

    // Optimistically update in-memory attendance list
    if (!window.allAttendance) window.allAttendance = [];
    records.forEach((rec) => {
      const idx = window.allAttendance.findIndex(
        (a) => String(a.studentId || a.student_id) === String(rec.studentId || rec.student_id) && a.date === rec.date
      );
      if (idx !== -1) {
        window.allAttendance[idx] = { ...window.allAttendance[idx], ...rec };
      } else {
        window.allAttendance.unshift(rec);
      }
    });

    try {
      let saved = false;
      const res = await apiCall('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(records),
      });
      if (res && res.ok) {
        saved = true;
      } else if (window.supabaseClient) {
        // Fallback: Use Supabase client directly with insert (not upsert)
        const { error: sbErr } = await window.supabaseClient
          .from('attendance')
          .insert(records);
        if (!sbErr) {
          saved = true;
        } else {
          console.warn('[Attendance] Supabase insert failed:', sbErr.message);
        }
      }

      toast('Attendance saved for ' + records.length + ' students!', 'success');

      if (typeof window.loadAllData === 'function') {
        window.loadAllData(true);
      }

      if ((window.currentStudent || window.studentId) && typeof window.renderChildAttendance === 'function') {
        window.renderChildAttendance();
      }

      renderCoachAttendanceMarking();
      setTimeout(renderCoachDashboard, 100);
    } catch (e) {
      console.warn('[Attendance] API call failed, trying Supabase direct:', e);
      if (window.supabaseClient) {
        try {
          const { error: sbErr } = await window.supabaseClient
            .from('attendance')
            .insert(records);
          if (!sbErr) {
            toast('Attendance saved for ' + records.length + ' students!', 'success');
            if (typeof window.loadAllData === 'function') window.loadAllData(true);
            renderCoachAttendanceMarking();
            return;
          } else {
            console.warn('[Attendance] Supabase insert failed:', sbErr.message);
          }
        } catch (sbEx) {
          console.warn('[Attendance] Supabase exception:', sbEx);
        }
      }
      toast('Attendance saved locally for ' + records.length + ' students.', 'info');
      renderCoachAttendanceMarking();
    }
  };

  window.markAllCoachPresent = function () {
    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select) select.value = 'present';
    });
    updateCoachAttStats();
  };

  window.markAllCoachAbsent = function () {
    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select) select.value = 'absent';
    });
    updateCoachAttStats();
  };

  window.clearAllCoachAttendance = function () {
    if (!window.confirm('Clear all attendance for today? This will delete all attendance records for this date.')) return;

    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('coach-att-date');
    const date = dateEl ? (dateEl.value || today) : today;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }

    // Get all student IDs from the table
    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    const studentIds = [];
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select && select.dataset.sid) {
        studentIds.push(select.dataset.sid);
      }
    });

    if (studentIds.length === 0) {
      if (window.toast) window.toast('No students to clear', 'info');
      return;
    }

    // Delete attendance records from local state
    const myStudentIds = new Set(studentIds);
    window.allAttendance = (window.allAttendance || []).filter(a => {
      const isMyStudent = myStudentIds.has(String(a.studentId || a.student_id));
      const isMyDate = a.date === date;
      return !(isMyStudent && isMyDate);
    });

    // Update local storage
    try {
      localStorage.setItem('ck_attendance_records', JSON.stringify(window.allAttendance || []));
    } catch (_) {}

    // Clear UI fields
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select) select.value = '';
      const cw = row.querySelector('.att-cw');
      if (cw) cw.value = '';
      const hw = row.querySelector('.att-hw');
      if (hw) hw.value = '';
      const notes = row.querySelector('.att-notes');
      if (notes) notes.value = '';
    });

    updateCoachAttStats();

    // Delete from database
    const deletePromises = studentIds.map(studentId => {
      return window.apiCall(`/api/attendance?student_id=${encodeURIComponent(studentId)}&date=${encodeURIComponent(date)}`, { method: 'DELETE', silent: true })
        .catch(async () => {
          if (window.supabaseClient) {
            await window.supabaseClient.from('attendance')
              .delete()
              .eq('student_id', studentId)
              .eq('date', date)
              .catch(() => {});
          }
        });
    });

    Promise.all(deletePromises).then(() => {
      if (window.toast) window.toast('All attendance cleared and saved', 'success');
    }).catch(() => {
      if (window.toast) window.toast('Attendance cleared locally, but failed to sync with server', 'warning');
    });
  };

  window.openCoachHomeworkModal = function () {
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }
    if (typeof openHomeworkAssignmentModal === 'function') {
      openHomeworkAssignmentModal('all', '');
    }
  };

  window.openCoachEventModal = function () {
    if (typeof openEventModal === 'function') {
      openEventModal();
    }
  };

  window.renderCoachHomework = function (query) {
    const q = query || '';
    if (window.coachHomeworkTab === 'assignments') {
      switchCoachHomeworkTab('assignments');
      renderCoachAssignments(1);
    } else {
      switchCoachHomeworkTab('submissions');
      renderCoachSubmissions(q, 1);
    }
  };

  window.coachHomeworkTab = 'assignments';
  window.coachAssignPage = 1;
  window.coachSubPage = 1;
  window.coachAssignPageSize = 8;
  window.coachSubPageSize = 8;

  window.switchCoachHomeworkTab = function (tab) {
    window.coachHomeworkTab = tab;
    const assignTab = document.getElementById('coach-hw-assign');
    const subTab = document.getElementById('coach-hw-submissions');
    const assignBtn = document.getElementById('btn-coach-hw-assign');
    const subBtn = document.getElementById('btn-coach-hw-sub');
    if (!assignTab || !subTab || !assignBtn || !subBtn) return;

    if (tab === 'assignments') {
      assignTab.style.display = 'block';
      subTab.style.display = 'none';
      assignBtn.classList.add('active');
      subBtn.classList.remove('active');
      renderCoachAssignments(1);
    } else {
      assignTab.style.display = 'none';
      subTab.style.display = 'block';
      assignBtn.classList.remove('active');
      subBtn.classList.add('active');
      const q = document.getElementById('coach-hw-search')?.value || '';
      renderCoachSubmissions(q, 1);
    }
  };

  window.renderCoachAssignments = function (page) {
    const tbody = document.getElementById('coach-assignments-tbody');
    const pagination = document.getElementById('coach-assign-pagination');
    if (!tbody) return;

    page = Number(page) || 1;
    window.coachAssignPage = page;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">Coach ID not found.</td></tr>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, coachId));
    const myStudentIds = myStudents.map(s => String(s.id));
    const myBatchIds = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, coachId)).map(b => String(b.id));

    const assignments = (window.allHomework || [])
      .filter(h => {
        if (h.target_type === 'student') return myStudentIds.includes(String(h.student_id));
        if (h.target_type === 'batch') return myBatchIds.includes(String(h.batch_id));
        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalPages = Math.max(1, Math.ceil(assignments.length / window.coachAssignPageSize));
    const start = (page - 1) * window.coachAssignPageSize;
    const pageItems = assignments.slice(start, start + window.coachAssignPageSize);

    if (assignments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No assignments found.</td></tr>';
    } else if (pageItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No assignments on this page.</td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(h => {
        const studentTarget = h.target_type === 'student'
          ? myStudents.find(s => String(s.id) === String(h.student_id))
          : null;
        const batchTarget = h.target_type === 'batch'
          ? (window.allBatches || []).find(b => String(b.id) === String(h.batch_id))
          : null;
        const target = studentTarget
          ? (window.getStudentName ? window.getStudentName(studentTarget) : studentTarget.name)
          : batchTarget?.name
          ? batchTarget.name
          : h.target_type === 'all'
          ? 'All Students'
          : 'Batch';
        const due = h.due_date ? new Date(h.due_date).toLocaleDateString() : 'No due date';
        const status = h.status ? h.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Active';
        const statusClass = h.status === 'completed' ? 'badge badge-success' : h.status === 'archived' ? 'badge badge-grey' : 'badge badge-warning';
        const canArchive = h.status !== 'archived';
        const canDone = h.status !== 'completed';
        const canDelete = h.status !== 'archived';
        return `<tr>
          <td style="font-weight:500; color:var(--ivory); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(h.title || '') : (h.title || '')}">${window.escapeHtml ? window.escapeHtml(h.title || '') : (h.title || '')}</td>
          <td style="font-size:12px; color:var(--ivory-dim);">${window.escapeHtml ? window.escapeHtml(target) : target}</td>
          <td style="font-size:12px; color:var(--ivory-dim);">${due}</td>
          <td><span class="${statusClass}">${status}</span></td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-outline-primary btn-sm" onclick="window.editHomeworkAssignment('${h.id}')" title="Edit">✏️ Edit</button>
            ${canDone ? `<button class="btn btn-outline-grey btn-sm" onclick="window.updateHomeworkStatus('${h.id}', 'completed')">✔ Done</button>` : ''}
            ${canArchive ? `<button class="btn btn-outline-grey btn-sm" onclick="window.updateHomeworkStatus('${h.id}', 'archived')">🗑 Archive</button>` : ''}
            ${canDelete ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteCoachHomeworkAssignment('${h.id}')">Delete</button>` : ''}
          </td>
        </tr>`;
      }).join('');
    }

    if (pagination) {
      let html = `<span style="font-size:12px; color:var(--ivory-dim);">Page ${page} / ${totalPages}</span>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="renderCoachAssignments(${page - 1})">Prev</button>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="renderCoachAssignments(${page + 1})">Next</button>`;
      pagination.innerHTML = html;
    }
  };

  window.renderCoachSubmissions = function (query, page) {
    const tbody = document.getElementById('coach-submissions-tbody');
    const pagination = document.getElementById('coach-sub-pagination');
    const countEl = document.getElementById('coach-sub-count');
    if (!tbody) return;

    page = Number(page) || 1;
    window.coachSubPage = page;
    const q = (query || '').trim().toLowerCase();

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">Coach ID not found.</td></tr>';
      if (pagination) pagination.innerHTML = '';
      if (countEl) countEl.textContent = '';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, coachId));
    const myStudentIds = myStudents.map(s => String(s.id));
    let submissions = (window.homeworkSubmissionCache || [])
      .filter(s => myStudentIds.includes(String(s.student_id)))
      .sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

    if (q) {
      submissions = submissions.filter(s => {
        const student = myStudents.find(x => String(x.id) === String(s.student_id));
        const studentName = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : '';
        const assignment = (window.allHomework || []).find(h => String(h.id) === String(s.assignment_id));
        const title = assignment ? assignment.title : '';
        const textMatch = (s.submission_text || '').toLowerCase().includes(q);
        const urlMatch = (s.submission_url || '').toLowerCase().includes(q);
        const fileMatch = (Array.isArray(s.file_urls) ? s.file_urls.join(' ') : '').toLowerCase().includes(q);
        const studentMatch = studentName.toLowerCase().includes(q);
        const titleMatch = title.toLowerCase().includes(q);
        const statusMatch = (s.status || '').toLowerCase().includes(q);
        return textMatch || urlMatch || fileMatch || studentMatch || titleMatch || statusMatch;
      });
    }

    const statusFilter = document.getElementById('coach-hw-sub-status')?.value || '';
    if (statusFilter) {
      submissions = submissions.filter(s => (s.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    const totalPages = Math.max(1, Math.ceil(submissions.length / window.coachSubPageSize));
    const start = (page - 1) * window.coachSubPageSize;
    const pageItems = submissions.slice(start, start + window.coachSubPageSize);

    if (submissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No matching submissions found.</td></tr>';
    } else if (pageItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No submissions on this page.</td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(s => {
        const assignment = (window.allHomework || []).find(h => String(h.id) === String(s.assignment_id));
        const student = myStudents.find(x => String(x.id) === String(s.student_id));
        const studentName = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : "Unknown";
        const title = assignment ? assignment.title : "Untitled Assignment";
        const submittedDate = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "Today";
        const status = s.status || 'submitted';
        const statusClass = status === 'approved' ? 'badge badge-success' : status === 'needs_revision' ? 'badge badge-danger' : status === 'closed' ? 'badge badge-grey' : 'badge badge-warning';
        return `<tr>
          <td style="color:var(--ivory); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(studentName) : studentName}">${window.escapeHtml ? window.escapeHtml(studentName) : studentName}</td>
          <td style="font-size:12px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(title) : title}">${window.escapeHtml ? window.escapeHtml(title) : title}</td>
          <td style="font-size:11px; color:var(--ivory-dim); white-space:nowrap;">${submittedDate}</td>
          <td><span class="${statusClass}">${status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'approved')">✔ Approve</button>
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'needs_revision')">✎ Revision</button>
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'closed')">✕ Close</button>
          </td>
        </tr>`;
      }).join('');
    }

    if (countEl) countEl.textContent = submissions.length ? `Showing ${submissions.length} submission(s)` : '';
    if (pagination) {
      let html = `<span style="font-size:12px; color:var(--ivory-dim);">Page ${page} / ${totalPages}</span>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="renderCoachSubmissions(document.getElementById('coach-hw-search')?.value || '', ${page - 1}); document.getElementById('coach-hw-sub-status')?.value && (document.getElementById('coach-hw-sub-status').value = '${statusFilter}');">Prev</button>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="renderCoachSubmissions(document.getElementById('coach-hw-search')?.value || '', ${page + 1}); document.getElementById('coach-hw-sub-status')?.value && (document.getElementById('coach-hw-sub-status').value = '${statusFilter}');">Next</button>`;
      pagination.innerHTML = html;
    }
  };

  window.deleteCoachHomeworkAssignment = async function (id) {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }
    const assignment = (window.allHomework || []).find(h => String(h.id) === String(id));
    if (!assignment) {
      toast('Assignment not found', 'error');
      return;
    }
    const myBatchIds = (window.allBatches || []).filter(b => window.ckSameCoach ? window.ckSameCoach(b.coach_id, coachId) : String(b.coach_id) === String(coachId)).map(b => String(b.id));
    const myStudentIds = (window.allStudents || []).filter(s => window.ckSameCoach ? window.ckSameCoach(s.coach_id, coachId) : String(s.coach_id) === String(coachId)).map(s => String(s.id));
    const isOwner = assignment.target_type === 'all'
      || (assignment.created_by && window.ckSameCoach ? window.ckSameCoach(assignment.created_by, coachId) : String(assignment.created_by) === String(coachId))
      || (assignment.coach_id && window.ckSameCoach ? window.ckSameCoach(assignment.coach_id, coachId) : String(assignment.coach_id) === String(coachId))
      || (assignment.target_type === 'batch' && myBatchIds.includes(String(assignment.batch_id)))
      || (assignment.target_type === 'student' && myStudentIds.includes(String(assignment.student_id)));
    if (!isOwner) {
      toast('You can only delete your own assignments.', 'error');
      return;
    }

    let deleted = false;
    try {
      const res = await apiCall(`/api/homework?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res && res.ok) {
        deleted = true;
      }
    } catch (apiErr) {
      console.warn('[Coach Homework] apiCall delete error:', apiErr);
    }

    // Direct Supabase fallback
    if (!deleted && window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        const { error } = await window.supabaseClient.from('homework_assignments').delete().eq('id', id);
        if (!error) deleted = true;
      } catch (sbErr) {
        console.warn('[Coach Homework] Direct Supabase delete error:', sbErr);
      }
    }

    if (!deleted) {
      toast('Delete failed. Please try again.', 'error');
      return;
    }

    toast('Assignment deleted', 'success');
    window.allHomework = (window.allHomework || []).filter(h => String(h.id) !== String(id));
    try {
      const stored = JSON.parse(localStorage.getItem('ck_homework_assignments') || '[]');
      const filtered = stored.filter(h => String(h.id) !== String(id));
      localStorage.setItem('ck_homework_assignments', JSON.stringify(filtered));
    } catch (e) {}

    if (window.loadHomeworkData) await window.loadHomeworkData(true).catch(() => {});
    renderCoachAssignments(window.coachAssignPage || 1);
    if (typeof window.refreshHomeworkViews === 'function') window.refreshHomeworkViews();
  };

if (typeof window.setPage === 'function') {
  const origSetPage = window.setPage;
  window.setPage = function(p, btn) {
    origSetPage(p, btn);
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-studypgn') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
} else {
  window.setPage = function(p, btn) {
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-studypgn') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
}

  // ── Coach Batch CRUD ──────────────────────────────────────────────────────
  window.openCoachCreateBatchModal = function (id = null) {
    if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }

    $('eb-id').value = id || '';

    const coachSel = $('eb-coach');
    if (coachSel) {
      const coachName = (window.allCoaches || []).find(c => String(c.id) === String(coachId))?.name || 'Me';
      coachSel.innerHTML = `<option value="${coachId}">${window.escapeHtml ? window.escapeHtml(coachName) : coachName}</option>`;
      coachSel.style.display = 'none';
    }

    const editingBatch = id ? (window.allBatches || []).find((x) => String(x.id) === String(id)) : null;
    const myStudentIds = new Set((window.allStudents || [])
      .filter(s => window.ckSameCoach(s.coach_id, coachId))
      .map(s => String(s.id)));

    const otherAssignedIds = new Set(
      (window.allBatches || [])
        .filter((b) => !editingBatch || String(b.id) !== String(editingBatch.id))
        .flatMap((b) => (Array.isArray(b.student_ids) ? b.student_ids.map(String) : []))
        .filter((sid) => sid)
    );

    const candidateStudents = (window.allStudents || [])
      .filter((s) => {
        if (s.status === 'archived') return false;
        if (!myStudentIds.has(String(s.id))) return false;
        if (!editingBatch) return !otherAssignedIds.has(String(s.id));
        return true;
      })
      .sort((a, b) => (window.getStudentName ? window.getStudentName(a) : a.name).localeCompare(window.getStudentName ? window.getStudentName(b) : b.name));

    let existingStudentIds = [];
    if (editingBatch) {
      $('eb-name').value = editingBatch.name || '';
      $('eb-level').value = editingBatch.level || 'Beginner';
      $('eb-status').value = editingBatch.status || 'active';
      $('eb-days').value = editingBatch.days || '';
      $('eb-time').value = editingBatch.time_slot || '';
      $('eb-notes').value = editingBatch.notes || '';
      if ($('eb-chessable')) $('eb-chessable').value = editingBatch.chessable_url || '';
      $('eb-modal-title').textContent = 'Edit Batch';
      existingStudentIds = Array.isArray(editingBatch.student_ids) ? editingBatch.student_ids.map(String) : [];
    } else {
      $('eb-name').value = '';
      $('eb-level').value = 'Beginner';
      $('eb-status').value = 'active';
      $('eb-days').value = '';
      $('eb-time').value = '';
      $('eb-notes').value = '';
      if ($('eb-chessable')) $('eb-chessable').value = '';
      $('eb-modal-title').textContent = 'Create New Batch';
    }

    const stList = $('eb-student-list');
    stList.innerHTML = candidateStudents
      .map((s) => {
        const isChecked = existingStudentIds.includes(String(s.id)) ? 'checked' : '';
        const displayName = window.getStudentName ? window.getStudentName(s) : s.name;
        return `
          <label style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer">
            <input type="checkbox" class="batch-st-cb" value="${s.id}" ${isChecked} onchange="window.updateBatchStudentCount()">
            <span>${window.escapeHtml ? window.escapeHtml(displayName) : displayName} <span style="opacity:0.5;font-size:10px">(${s.level || 'Beginner'})</span></span>
          </label>
        `;
      })
      .join('');

    window.updateBatchStudentCount();
    openModal('edit-batch-modal');
  };

  window.deleteCoachBatch = async function (id) {
    if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }
    const batch = (window.allBatches || []).find((b) => String(b.id) === String(id));
    if (!batch || !window.ckSameCoach(batch.coach_id, coachId)) {
      toast('Access denied: You can only delete your own batches.', 'error');
      return;
    }
    if (!confirm(`Delete batch "${batch.name || 'this batch'}"? This cannot be undone.`)) return;

    try {
      let saved = false;
      const res = await window.apiCall(`/api/batches?id=${id}`, { method: 'DELETE' });
      if (res && res.ok) {
        saved = true;
      } else if (window.supabaseClient) {
        const { error: sbErr } = await window.supabaseClient
          .from('batches')
          .delete()
          .eq('id', id);
        if (!sbErr) saved = true;
      }

      if (saved) {
        toast('Batch deleted', 'success');
        window.allBatches = (window.allBatches || []).filter((b) => String(b.id) !== String(id));
        if (typeof window.loadAllData === 'function') window.loadAllData(true);
        window.renderCoachBatches();
        window.renderCoachDashboard();
      } else {
        toast('Delete failed', 'error');
      }
    } catch (e) {
      toast('Error: ' + (e.message || 'connection error'), 'error');
    }
  };

  // ── Coach Study Lab Renderer ──────────────────────────────────────────────
  window.renderCoachStudyLab = function () {
    if (window.role !== 'coach' && !window.__adminImpersonatingCoach) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;

    const repertoireKey = 'ck_coach_repertoire_' + coachId;
    let repertoire = [];
    try {
      repertoire = JSON.parse(localStorage.getItem(repertoireKey) || '[]');
    } catch (e) {}

    const container = document.getElementById('coach-studypgn-subview-custom');
    if (!container) return;

    const fenInput = document.getElementById('custom-fen-input');
    const saveBtn = document.getElementById('btn-save-coach-repertoire');
    const listContainer = document.getElementById('coach-repertoire-list');

    if (saveBtn) {
      saveBtn.onclick = () => {
        const fen = fenInput ? fenInput.value : '';
        if (!fen) {
          toast('Please set up a position on the board first', 'warning');
          return;
        }
        const title = prompt('Enter a title for this repertoire position:');
        if (!title) return;
        repertoire.push({ id: Date.now().toString(), title: title, fen: fen, coach_id: coachId });
        try {
          localStorage.setItem(repertoireKey, JSON.stringify(repertoire));
        } catch (e) {}
        toast('Position saved to Coach Repertoire!', 'success');
        window.renderCoachStudyLab();
      };
    }

    if (listContainer) {
      listContainer.innerHTML = repertoire.length === 0
        ? '<div style="color:var(--ivory-dim); font-size:12px;">No saved repertoire positions yet.</div>'
        : repertoire.map((r, idx) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border);">
            <div>
              <div style="font-weight:600; color:var(--ivory); font-size:13px;">${window.escapeHtml ? window.escapeHtml(r.title) : r.title}</div>
              <div style="font-size:11px; color:var(--ivory-dim); font-family:monospace;">${window.escapeHtml ? window.escapeHtml(r.fen) : r.fen}</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="window.StudyPGN.loadFenToCustomBoard('${r.fen.replace(/'/g, "\\'")}')">Load</button>
              <button class="btn btn-outline-danger btn-sm" onclick="window.deleteCoachRepertoireItem('${r.id}')">Delete</button>
            </div>
          </div>
        `).join('');
    }
  };

  window.deleteCoachRepertoireItem = function (itemId) {
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;
    const repertoireKey = 'ck_coach_repertoire_' + coachId;
    let repertoire = [];
    try {
      repertoire = JSON.parse(localStorage.getItem(repertoireKey) || '[]');
    } catch (e) {}
    repertoire = repertoire.filter(r => String(r.id) !== String(itemId));
    try {
      localStorage.setItem(repertoireKey, JSON.stringify(repertoire));
    } catch (e) {}
    toast('Repertoire item deleted', 'info');
    window.renderCoachStudyLab();
  };

  // ── Navigation hook ────────────────────────────────────────────────────────
if (typeof window.setPage === 'function') {
  const origSetPage = window.setPage;
  window.setPage = function(p, btn) {
    origSetPage(p, btn);
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-studypgn') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
} else {
  window.setPage = function(p, btn) {
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-studypgn') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
}


// ============================================================================
// COACH SESSIONS & DATA SHEET MODAL (Google Sheet Tracker)
// ============================================================================

window.openCoachDataSheetModal = function(coachId, batchId, studentId) {
  const cId = coachId || window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
  
  // Remove any existing modal
  const old = document.getElementById('coach-datasheet-modal');
  if (old) old.remove();

  const coaches = window.allCoaches || [];
  const batches = (window.allBatches || []).filter(b => !cId || window.ckSameCoach(b.coach_id, cId));
  const students = (window.allStudents || []).filter(s => !cId || window.ckSameCoach(s.coach_id, cId));

  const modalHtml = `
    <div class="modal active" id="coach-datasheet-modal" style="z-index:9999;display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);padding:16px;">
      <div class="modal-card" style="max-width:1100px;width:100%;max-height:92vh;display:flex;flex-direction:column;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
        
        <!-- Header & Close -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
          <div>
            <h2 style="margin:0;color:var(--gold);font-family:var(--font-head);font-size:22px;display:flex;align-items:center;gap:8px;">
              <span>📊</span> Coach Attendance &amp; Lesson Data Sheet
            </h2>
            <p style="margin:4px 0 0 0;color:var(--ivory-dim);font-size:12px;">Comprehensive multi-batch attendance and curriculum tracking sheet</p>
          </div>
          <button onclick="document.getElementById('coach-datasheet-modal').remove()" style="background:none;border:none;color:var(--ivory);font-size:24px;cursor:pointer;">✕</button>
        </div>

        <!-- Filter Controls Bar -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;background:var(--bg3);padding:10px 14px;border-radius:8px;border:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:12px;color:var(--ivory-dim);margin:0;">Coach:</label>
            <select id="cd-coach-select" style="background:var(--bg2);color:var(--ivory);border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:12px;" onchange="window.filterCoachDataSheet()">
              <option value="">All Coaches</option>
              ${coaches.map(c => `<option value="${c.id}" ${String(c.id) === String(cId) ? 'selected' : ''}>${window.escapeHtml ? window.escapeHtml(c.name) : c.name}</option>`).join('')}
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:12px;color:var(--ivory-dim);margin:0;">Student:</label>
            <select id="cd-student-select" style="background:var(--bg2);color:var(--ivory);border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:12px;" onchange="window.filterCoachDataSheet()">
              <option value="">All Students</option>
              ${students.map(st => `<option value="${st.id}" ${String(st.id) === String(studentId) ? 'selected' : ''}>${window.escapeHtml ? window.escapeHtml(window.getStudentName ? window.getStudentName(st) : st.name) : st.name}</option>`).join('')}
            </select>
          </div>

          <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
            <a href="https://docs.google.com/spreadsheets/d/1Z2IUrgRZ89omzS_Jpl72aMQYur_kt9wFkyYnd58UTUM/edit?usp=sharing" target="_blank" class="btn btn-sm" style="background:#ffffff; color:#0f172a; text-decoration:none; font-weight:700; border-radius:6px; font-size:11px; padding:5px 12px; display:inline-flex; align-items:center; gap:4px;">
              📊 Live Google Sheet ↗
            </a>
            <button class="btn btn-outline btn-sm" onclick="window.exportDataSheetCSV()">📥 Export CSV</button>
            <button class="btn btn-gold btn-sm" onclick="window.print()">🖨️ Print</button>
          </div>
        </div>

        <!-- Sheet Container (Scrollable) -->
        <div id="coach-datasheet-content" style="flex:1;overflow-y:auto;min-height:350px;">
          <!-- Rendered by window.filterCoachDataSheet -->
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  window.filterCoachDataSheet();
};

window.filterCoachDataSheet = function() {
  const coachId = document.getElementById('cd-coach-select')?.value;
  const studentId = document.getElementById('cd-student-select')?.value;
  const container = document.getElementById('coach-datasheet-content');
  if (!container) return;

  if (studentId) {
    window.renderSessionSheet(studentId, container);
  } else {
    // Show all students for this coach
    const students = (window.allStudents || []).filter(s => !coachId || window.ckSameCoach(s.coach_id, coachId));
    if (students.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ivory-dim);">No students assigned to this coach.</div>';
      return;
    }
    // Render first student or consolidated list
    window.renderSessionSheet(students[0].id, container);
  }
};

window.exportDataSheetCSV = function(targetStudentId) {
  const studentId = targetStudentId || document.getElementById('cd-student-select')?.value;
  const s = (window.allStudents || []).find(st => String(st.id) === String(studentId)) || window.currentStudent || (window.allStudents || [])[0];
  if (!s) return;

  const attList = (window.allAttendance || []).filter(a => String(a.student_id || a.studentId) === String(s.id));
  const hwList = window.allHomework || [];
  let csv = "DATE,DAY,CLASSWORK / TOPIC,HOMEWORK NOTES,GENERAL NOTES,SESSION COMPLETED,ATTENDEE NAME,TOTAL PRESENT,TIME DURATION\n";

  attList.forEach(rec => {
    const d = new Date(rec.date);
    const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'long' });
    const p = window.parseAttendanceNotes ? window.parseAttendanceNotes(rec.notes || rec.note || '') : { topic: 'Chess Training', cw: 'Chess Training', hw: '', general: '', subject: 'Chess (Core)', duration: 'One Hour' };
    const sName = window.getStudentName ? window.getStudentName(s) : s.name;
    const isPres = (rec.status || '').toLowerCase() === 'present' ? '1/1' : '0/1';
    
    // Check matching homework on date
    const dIso = rec.date ? rec.date.slice(0, 10) : '';
    const hwOnDate = hwList.filter(h => (h.due_date || h.created_at || '').slice(0, 10) === dIso);
    const hwDisplay = p.hw || (hwOnDate.length > 0 ? hwOnDate.map(h => h.title).join('; ') : 'None');

    csv += `"${dStr}","${dayStr}","${p.cw || p.topic}","${hwDisplay}","${p.general || 'Class completed'}","${p.subject}","${sName}","${isPres}","${p.duration}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chesskidoo_attendance_homework_${(s.name || 'student').toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (window.toast) window.toast('📊 Sheet exported! Ready to import/upload into Google Sheets.', 'success');
};
