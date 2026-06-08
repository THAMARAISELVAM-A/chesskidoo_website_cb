/* assets/js/schedule-matrix.js
   ChessKidoo — Dynamic Coach × Day Schedule Matrix.
   Renders the weekly roster grid (the "Master Schedule Matrix" design) from LIVE
   class/batch data instead of hardcoded rows. Used by:
     • Admin   → full matrix (all coaches), editable
     • Coach   → own row, editable (click a batch to edit, "+" to add)
     • Student → their coach(es) row(s), read-only
     • Parent  → child's coach(es) row(s), read-only
*/
window.CK = window.CK || {};
CK.scheduleMatrix = (() => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Stable per-coach colour palette (from the provided master-matrix design).
  const PALETTE = ['#3b5998', '#27ae60', '#8e44ad', '#d35400', '#2ecc71', '#f39c12',
                   '#16a085', '#7f8c8d', '#2980b9', '#c0392b', '#9b59b6', '#e67e22'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function colorFor(id) {
    let h = 0; const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  // Parse a time string to minutes-since-midnight. Handles "17:00" (24h) AND
  // "8:00 PM" / "5:00 AM" (12h with meridiem) — the data uses both forms.
  function parseMinutes(t) {
    const s = String(t || '').trim();
    const m = s.match(/(\d{1,2}):?(\d{2})?/); if (!m) return null;
    let h = +m[1]; const mn = +(m[2] || 0); const ap = s.match(/([ap])\.?\s*m/i);
    if (ap) { const pm = /p/i.test(ap[1]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return h * 60 + mn;
  }
  function fmt(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60; const ap = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
  }
  function to12(t) { const m = parseMinutes(t); return m == null ? String(t || '') : fmt(m); }
  function endTime(t, dur) { const s = parseMinutes(t); return s == null ? '' : fmt(s + (+dur || 60)); }
  function timeRange(c) { const s = to12(c.time); const e = endTime(c.time, c.duration); return e ? `${s} - ${e}` : s; }
  // Day match is tolerant of "Mon" vs "Monday" (data uses full names in places).
  function classOnDay(c, shortDay) {
    const want = shortDay.slice(0, 3).toLowerCase();
    return (c.days || []).some(d => String(d).slice(0, 3).toLowerCase() === want);
  }

  let _last = null;

  async function render(containerId, opts = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    _last = { containerId, opts };
    el.innerHTML = '<div style="text-align:center;opacity:.45;padding:24px;">Loading schedule…</div>';

    const [classes, students, coaches] = await Promise.all([
      CK.db.getClasses().catch(() => []),
      CK.db.getProfiles('student').catch(() => []),
      CK.db.getProfiles('coach').catch(() => [])
    ]);
    const sName = {};
    (students || []).forEach(s => { sName[s.id] = s.full_name || s.name || 'Student'; });
    const profById = {}, profByName = {};
    (coaches || []).forEach(c => { profById[c.id] = c; profByName[String(c.full_name || c.name || '').toLowerCase()] = c; });

    // Group classes by coach (robust to coachId seed mismatches — classes can
    // carry a different id form than the coach profile, but the name matches).
    const groups = new Map();
    (classes || []).forEach(c => {
      const key = String(c.coachId || '') + '|' + String(c.coachName || '');
      if (!groups.has(key)) groups.set(key, { id: c.coachId, name: c.coachName, classes: [] });
      groups.get(key).classes.push(c);
    });
    let rows = [...groups.values()];

    // Filter to the requested coach(es)
    if (opts.coachId || opts.coachName) {
      const wantId = opts.coachId ? String(opts.coachId) : null;
      const wantName = String(opts.coachName || (profById[opts.coachId] && (profById[opts.coachId].full_name || profById[opts.coachId].name)) || '').toLowerCase();
      rows = rows.filter(r => (wantId && String(r.id) === wantId) || (wantName && String(r.name || '').toLowerCase() === wantName));
      if (!rows.length) rows = [{ id: opts.coachId, name: opts.coachName || (profById[opts.coachId] && profById[opts.coachId].full_name) || 'Coach', classes: [] }];
    } else if (opts.coachIds && opts.coachIds.length) {
      const set = new Set(opts.coachIds.map(String));
      const names = new Set(opts.coachIds.map(id => String((profById[id] && (profById[id].full_name || profById[id].name)) || '').toLowerCase()).filter(Boolean));
      rows = rows.filter(r => set.has(String(r.id)) || names.has(String(r.name || '').toLowerCase()));
    }
    // Enrich each row with profile level / canonical name
    rows.forEach(r => {
      const p = profById[r.id] || profByName[String(r.name || '').toLowerCase()];
      r.level = (p && p.level) || (r.classes[0] && r.classes[0].level) || '';
      r.name = (p && (p.full_name || p.name)) || r.name || 'Coach';
      r.colorKey = r.id || r.name;
    });
    if (!rows.length && !opts.coachId && !opts.coachIds) {
      rows = (coaches || []).map(c => ({ id: c.id, name: c.full_name || c.name, level: c.level, colorKey: c.id, classes: [] }));
    }
    const editable = !!opts.editable;

    const head = `<tr><th class="smx-coach-h">Coach</th>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr>`;
    const body = rows.map(coach => {
      const color = colorFor(coach.colorKey || coach.id || coach.name);
      const coachClasses = coach.classes || [];
      const cells = DAYS.map(day => {
        const dayClasses = coachClasses
          .filter(c => classOnDay(c, day))
          .sort((a, b) => String(a.time).localeCompare(String(b.time)));
        if (!dayClasses.length) {
          return `<td class="smx-empty">${editable
            ? `<button class="smx-add" title="Add a class on ${day}" onclick="CK.scheduleMatrix._add('${esc(coach.id || '')}','${esc(coach.name || '')}','${day}')">+</button>`
            : '—'}</td>`;
        }
        return `<td>${dayClasses.map(c => {
          const studs = (c.studentIds || []).map(id => sName[id]).filter(Boolean);
          const label = c.batch ? (/^\d+$/.test(String(c.batch)) ? 'Batch ' + c.batch : c.batch) : (c.title || 'Class');
          const studTxt = studs.length ? studs.join(', ') : '[No students]';
          const click = editable ? ` onclick="CK.scheduleMatrix._edit('${esc(c.id)}')" style="background:${color};cursor:pointer;"` : ` style="background:${color}"`;
          return `<div class="smx-block"${click}>
            <span class="smx-batch">${esc(label)}</span>
            <span class="smx-time">${esc(timeRange(c))}</span>
            <span class="smx-studs" title="${esc(studs.join(', '))}">${esc(studTxt)}</span>
          </div>`;
        }).join('')}</td>`;
      }).join('');
      const lvl = coach.level || (coachClasses[0] && coachClasses[0].level) || '';
      return `<tr>
        <td class="smx-coach" style="border-left:3.5px solid ${color}">${esc(coach.name || 'Coach')}${lvl ? `<span class="smx-coach-lvl">${esc(lvl)}</span>` : ''}</td>
        ${cells}
      </tr>`;
    }).join('');

    const titleBar = opts.title
      ? `<div class="smx-head"><h3>${esc(opts.title)}</h3>${opts.subtitle ? `<div class="smx-sub">${esc(opts.subtitle)}</div>` : ''}</div>`
      : '';
    el.innerHTML = `${titleBar}<div class="smx-wrap"><table class="smx-table"><thead>${head}</thead><tbody>${body || `<tr><td colspan="8" style="text-align:center;opacity:.5;padding:20px;">No classes scheduled yet.</td></tr>`}</tbody></table></div>`;
  }

  function _refresh() { if (_last) render(_last.containerId, _last.opts); }

  function _edit(classId) {
    if (!(CK.classSystem && CK.classSystem.openClassModal)) return;
    CK.db.getClasses().then(list => {
      const c = (list || []).find(x => String(x.id) === String(classId));
      if (!c) return;
      CK.classSystem.openClassModal(c, async (updated) => {
        Object.assign(c, updated);
        await CK.db.saveClass(c);
        CK.showToast && CK.showToast('Class updated!', 'success');
        _refresh();
      });
    });
  }
  function _add(coachId, coachName, day) {
    if (!(CK.classSystem && CK.classSystem.openClassModal)) return;
    CK.classSystem.openClassModal(null, async (data) => {
      const d = Object.assign({}, data);
      if (day && (!d.days || !d.days.length)) d.days = [day];
      await CK.classSystem.createClass(d, coachId, coachName);
      _refresh();
    });
  }

  /* Resolve the coach(es) that teach a given student (for student/parent views). */
  async function coachesForStudent(studentId) {
    const classes = await CK.db.getClasses().catch(() => []);
    const ids = [...new Set((classes || []).filter(c => (c.studentIds || []).includes(studentId)).map(c => c.coachId))];
    return ids;
  }

  return { render, _refresh, _edit, _add, colorFor, coachesForStudent, DAYS };
})();
