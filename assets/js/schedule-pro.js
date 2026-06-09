/* assets/js/schedule-pro.js
   ChessKidoo — Rebuilt Advanced Schedule & Meeting Management
   Includes Google Calendar style views and the Coach Master Schedule Matrix. */

window.CK = window.CK || {};

// Dynamically load Google Meet API Wrapper
if (!document.querySelector('script[src="assets/js/gmeet-api.js"]')) {
  const script = document.createElement('script');
  script.src = 'assets/js/gmeet-api.js';
  document.head.appendChild(script);
}

CK.schedulePro = (() => {
  const MEETINGS_KEY = 'ck_meetings';
  const TIMETABLE_KEY = 'ck_timetable_matrix';
  const get = async () => await CK.db.getMeetings();
  const today = () => new Date().toISOString().split('T')[0];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  // Fallback initial roster matching the user's HTML matrix exactly
  const INITIAL_TIMETABLE = [
    {
      coach: "Rohith",
      role: "Beginner",
      rowClass: "row-rohith",
      bgClass: "bg-rohith",
      slots: {
        Tue: [{ batch: "Batch 1", time: "5:00 AM - 5:40 AM", student: "Sreelaxmi", link: "", topic: "Basic Checkmates", duration: 40 }],
        Wed: [
          { batch: "Batch 1", time: "5:00 AM - 5:40 AM", student: "Sreelaxmi", link: "", topic: "Basic Checkmates", duration: 40 },
          { batch: "Batch 2", time: "8:00 PM - 9:00 PM", student: "Samiksha", link: "", topic: "Opening Principles", duration: 60 }
        ],
        Thu: [{ batch: "Batch 2", time: "8:00 PM - 9:00 PM", student: "Samiksha", link: "", topic: "Opening Principles", duration: 60 }],
        Sat: [{ batch: "Batch 1", time: "5:00 AM - 5:40 AM", student: "Sreelaxmi", link: "", topic: "Basic Checkmates", duration: 40 }]
      }
    },
    {
      coach: "Ranjith",
      role: "Advanced",
      rowClass: "row-ranjith",
      bgClass: "bg-ranjith",
      slots: {
        Wed: [{ batch: "Batch 1", time: "2:45 PM - 3:45 PM", student: "Sakthi, Sathya", link: "", topic: "Sicilian Defense Studies", duration: 60 }],
        Fri: [{ batch: "Batch 1", time: "2:45 PM - 3:45 PM", student: "Sakthi, Sathya", link: "", topic: "Sicilian Defense Studies", duration: 60 }],
        Sat: [{ batch: "Batch 2", time: "7:00 PM - 8:00 PM", student: "Riyas, Susil, Varun", link: "", topic: "Tactics Workshop", duration: 60 }],
        Sun: [{ batch: "Batch 2", time: "7:00 PM - 8:00 PM", student: "Riyas, Susil, Varun", link: "", topic: "Tactics Workshop", duration: 60 }]
      }
    },
    {
      coach: "Gyana Suriya",
      role: "Beginner",
      rowClass: "row-gyana",
      bgClass: "bg-gyana",
      slots: {
        Wed: [
          { batch: "Batch 1", time: "5:40 AM - 6:20 AM", student: "Ekash", link: "", topic: "Forks and Pins", duration: 40 },
          { batch: "Batch 2", time: "7:00 AM - 8:00 AM", student: "Nigunan, [Slot Available]", link: "", topic: "Mating Patterns", duration: 60 }
        ],
        Fri: [
          { batch: "Batch 1", time: "5:40 AM - 6:20 AM", student: "Ekash", link: "", topic: "Forks and Pins", duration: 40 },
          { batch: "Batch 2", time: "7:00 AM - 8:00 AM", student: "Nigunan, [Slot Available]", link: "", topic: "Mating Patterns", duration: 60 }
        ],
        Sat: [{ batch: "Batch 3", time: "7:00 PM - 8:00 PM", student: "Aara, Anush, Rakshitha, Shervin", link: "", topic: "Introduction to Pieces", duration: 60 }],
        Sun: [{ batch: "Batch 3", time: "7:00 PM - 8:00 PM", student: "Aara, Anush, Rakshitha, Shervin", link: "", topic: "Introduction to Pieces", duration: 60 }]
      }
    },
    {
      coach: "Arivuselvam",
      role: "Advanced",
      rowClass: "row-arivu",
      bgClass: "bg-arivu",
      slots: {
        Mon: [
          { batch: "Batch 1", time: "7:00 PM - 8:00 PM", student: "Eduveer, Yugan", link: "", topic: "Advanced Endgames", duration: 60 },
          { batch: "Batch 2", time: "8:00 PM - 9:00 PM", student: "Aarunya, Magathi, Pranav", link: "", topic: "Middle Game Calculation", duration: 60 },
          { batch: "Batch 3", time: "8:00 PM - 9:00 PM", student: "Aatish, Uttsan", link: "", topic: "Pawn Structure Analysis", duration: 60 }
        ],
        Tue: [{ batch: "Batch 4", time: "7:00 PM - 8:00 PM", student: "Mukilan, Sachin", link: "", topic: "Karpov Games Review", duration: 60 }],
        Wed: [
          { batch: "Batch 1", time: "7:00 PM - 8:00 PM", student: "Eduveer, Yugan", link: "", topic: "Advanced Endgames", duration: 60 },
          { batch: "Batch 2", time: "8:00 PM - 9:00 PM", student: "Aarunya, Magathi, Pranav", link: "", topic: "Middle Game Calculation", duration: 60 },
          { batch: "Batch 3", time: "8:00 PM - 9:00 PM", student: "Aatish, Uttsan", link: "", topic: "Pawn Structure Analysis", duration: 60 }
        ],
        Thu: [{ batch: "Batch 4", time: "7:00 PM - 8:00 PM", student: "Mukilan, Sachin", link: "", topic: "Karpov Games Review", duration: 60 }]
      }
    },
    {
      coach: "Yogesh",
      role: "Beginner",
      rowClass: "row-yogesh",
      bgClass: "bg-yogesh",
      slots: {
        Thu: [{ batch: "Batch 1", time: "6:00 AM - 7:00 AM", student: "Jeevan", link: "", topic: "Board Vision drills", duration: 60 }],
        Fri: [{ batch: "Batch 1", time: "6:00 AM - 7:00 AM", student: "Jeevan", link: "", topic: "Board Vision drills", duration: 60 }],
        Sat: [
          { batch: "Batch 2", time: "6:00 PM - 7:00 PM", student: "Sai, Venkatesh Son", link: "", topic: "Rules Recap", duration: 60 },
          { batch: "Batch 3", time: "7:30 PM - 8:30 PM", student: "Athvik, Mohammad Rayan, Pranesh", link: "", topic: "Basic Openings", duration: 60 }
        ],
        Sun: [
          { batch: "Batch 2", time: "6:00 PM - 7:00 PM", student: "Sai, Venkatesh Son", link: "", topic: "Rules Recap", duration: 60 },
          { batch: "Batch 3", time: "7:30 PM - 8:30 PM", student: "Athvik, Mohammad Rayan, Pranesh", link: "", topic: "Basic Openings", duration: 60 }
        ]
      }
    },
    {
      coach: "Sudhin",
      role: "Beginner",
      rowClass: "row-sudhin",
      bgClass: "bg-sudhin",
      slots: {
        Sat: [{ batch: "Batch 1", time: "7:00 PM - 8:00 PM", student: "Aakif, Pranish, Venkatesh Daughter", link: "", topic: "Interactive Play", duration: 60 }],
        Sun: [{ batch: "Batch 1", time: "7:00 PM - 8:00 PM", student: "Aakif, Pranish, Venkatesh Daughter", link: "", topic: "Interactive Play", duration: 60 }]
      }
    },
    {
      coach: "Vasanth Kumar",
      role: "Beginner",
      rowClass: "row-vasanth",
      bgClass: "bg-vasanth",
      slots: {
        Mon: [{ batch: "Batch 1", time: "7:00 PM - 7:40 PM", student: "Aaradhya", link: "", topic: "Castling & En Passant", duration: 40 }],
        Wed: [{ batch: "Batch 1", time: "7:00 PM - 7:40 PM", student: "Aaradhya", link: "", topic: "Castling & En Passant", duration: 40 }]
      }
    },
    {
      coach: "Vishnu",
      role: "Intermediate",
      rowClass: "row-vishnu",
      bgClass: "bg-vishnu",
      slots: {
        Wed: [
          { batch: "Batch 1", time: "6:00 PM - 7:00 PM", student: "Abinitha", link: "", topic: "Pawn Endgames", duration: 60 },
          { batch: "Batch 2", time: "7:00 PM - 8:00 PM", student: "Yogesh", link: "", topic: "Tactical Motifs", duration: 60 }
        ],
        Thu: [
          { batch: "Batch 1", time: "6:00 PM - 7:00 PM", student: "Abinitha", link: "", topic: "Pawn Endgames", duration: 60 },
          { batch: "Batch 2", time: "7:00 PM - 8:00 PM", student: "Yogesh", link: "", topic: "Tactical Motifs", duration: 60 }
        ],
        Fri: [{ batch: "Batch 3", time: "7:00 PM - 8:00 PM", student: "Akmal, Anfal, Buvargan...", link: "", topic: "Rook Endgames", duration: 60 }],
        Sat: [{ batch: "Batch 3", time: "7:00 PM - 8:00 PM", student: "Akmal, Anfal, Buvargan...", link: "", topic: "Rook Endgames", duration: 60 }]
      }
    }
  ];

  // ─── Timetable Persistence Helpers ───
  const getTimetable = async () => {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('timetable_matrix').select('*');
        if (!error && data && data.length > 0) {
          // parse slots
          const parsed = data.map(item => ({
            coach: item.coach,
            role: item.role,
            rowClass: item.row_class,
            bgClass: item.bg_class,
            slots: typeof item.slots === 'string' ? JSON.parse(item.slots) : item.slots
          }));
          localStorage.setItem(TIMETABLE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      } catch(e) {}
    }
    const local = localStorage.getItem(TIMETABLE_KEY);
    if (local) return JSON.parse(local);
    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(INITIAL_TIMETABLE));
    return INITIAL_TIMETABLE;
  };

  const saveTimetable = async (data) => {
    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(data));
    if (window.supabaseClient) {
      try {
        // Upsert row by row
        for (const row of data) {
          await window.supabaseClient.from('timetable_matrix').upsert({
            coach: row.coach,
            role: row.role,
            row_class: row.rowClass,
            bg_class: row.bgClass,
            slots: JSON.stringify(row.slots)
          });
        }
      } catch(e) {}
    }
  };

  // Matrix CSS injected globally
  const injectMatrixCSS = () => {
    if (document.getElementById('matrix-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'matrix-custom-styles';
    style.innerHTML = `
      .matrix-wrapper {
        background-color: #141722;
        color: #ffffff;
        padding: 16px;
        border-radius: 8px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        box-shadow: 0 4px 24px rgba(0,0,0,0.35);
        overflow-x: auto;
      }
      .matrix-header {
        text-align: center;
        margin-bottom: 12px;
      }
      .matrix-header h1 {
        margin: 0;
        font-size: 16pt;
        font-weight: 500;
        color: #ffffff;
      }
      .matrix-header .subtitle {
        font-size: 9pt;
        color: #8a90a6;
        margin-top: 2px;
      }
      .matrix-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 4px;
        table-layout: fixed;
        min-width: 900px;
      }
      .matrix-table th {
        background-color: #1c2030;
        color: #a4b0cb;
        font-weight: 600;
        padding: 8px;
        text-align: center;
        text-transform: uppercase;
        border-radius: 4px;
        font-size: 8pt;
      }
      .matrix-table th.coach-header {
        width: 12%;
      }
      .matrix-table td {
        padding: 4px;
        vertical-align: middle;
        text-align: center;
        background-color: #1a1e2e;
        border-radius: 4px;
        height: 70px;
        transition: background-color 0.2s;
      }
      .matrix-table td.coach-cell {
        font-weight: bold;
        font-size: 8.5pt;
        text-align: center;
        padding: 6px;
        line-height: 1.3;
      }
      .row-rohith { border-left: 4px solid #3b5998; }
      .row-ranjith { border-left: 4px solid #27ae60; }
      .row-gyana { border-left: 4px solid #8e44ad; }
      .row-arivu { border-left: 4px solid #d35400; }
      .row-yogesh { border-left: 4px solid #2ecc71; }
      .row-sudhin { border-left: 4px solid #f39c12; }
      .row-vasanth { border-left: 4px solid #16a085; }
      .row-vishnu { border-left: 4px solid #7f8c8d; }
      .empty-cell {
        color: #2c3242;
        font-size: 11pt;
      }
      .matrix-block {
        display: block;
        padding: 4px 6px;
        margin: 2px 0;
        border-radius: 4px;
        color: #ffffff;
        font-weight: 600;
        line-height: 1.2;
        font-size: 7pt;
        cursor: pointer;
        position: relative;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .matrix-block:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      .bg-rohith { background-color: #3b5998; }
      .bg-ranjith { background-color: #27ae60; }
      .bg-gyana { background-color: #8e44ad; }
      .bg-arivu { background-color: #d35400; }
      .bg-yogesh { background-color: #2ecc71; }
      .bg-sudhin { background-color: #f39c12; }
      .bg-vasanth { background-color: #16a085; }
      .bg-vishnu { background-color: #7f8c8d; }
      .time-text {
        display: block;
        font-size: 6.2pt;
        opacity: 0.85;
        margin-top: 2px;
        font-weight: normal;
      }
      .student-text {
        display: block;
        font-size: 6.5pt;
        font-style: italic;
        opacity: 0.95;
        font-weight: normal;
        margin-top: 2px;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        padding-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .matrix-footer {
        text-align: center;
        margin-top: 8px;
        font-size: 7.5pt;
        color: #4f5d75;
      }
      /* Visual Calendar CSS */
      .cal-tab-btn {
        padding: 6px 14px;
        font-size: 0.82rem;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: var(--p-text-muted);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .cal-tab-btn.active {
        background: var(--p-gold);
        color: #000;
        font-weight: bold;
        border-color: var(--p-gold);
      }
      .calendar-grid-monthly {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
        margin-top: 12px;
      }
      .calendar-day-header {
        text-align: center;
        font-weight: bold;
        padding: 8px;
        background: var(--p-surface3);
        border-radius: 4px;
        font-size: 0.8rem;
        color: var(--p-text-muted);
      }
      .calendar-day-cell {
        background: var(--p-surface1);
        border-radius: 6px;
        min-height: 90px;
        padding: 6px;
        border: 1px solid rgba(255,255,255,0.03);
        position: relative;
      }
      .calendar-day-cell.today {
        border-color: var(--p-gold);
        background: rgba(220,163,62,0.04);
      }
      .calendar-day-num {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--p-text-muted);
        margin-bottom: 4px;
      }
      .calendar-event {
        font-size: 0.68rem;
        padding: 2px 4px;
        border-radius: 3px;
        margin-bottom: 2px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  };

  // ─── Modal slot editor ───
  const openMatrixSlotEditor = (row, day, index, data, onSave) => {
    const slot = row.slots[day][index];
    const modal = document.createElement('div');
    modal.className = 'p-modal-overlay open';
    modal.innerHTML = `
      <div class="p-modal" style="max-width: 440px;">
        <div class="p-modal-header">
          <div class="p-modal-title">✏️ Edit Timetable Slot (${row.coach} - ${day})</div>
          <button class="p-modal-close" onclick="this.closest('.p-modal-overlay').remove()">✕</button>
        </div>
        <div class="p-modal-body">
          <div class="p-form-group">
            <label class="p-form-label">Batch / Label</label>
            <input class="p-form-control" id="ms_batch" value="${slot.batch}">
          </div>
          <div class="p-form-group">
            <label class="p-form-label">Time Range</label>
            <input class="p-form-control" id="ms_time" value="${slot.time}">
          </div>
          <div class="p-form-group">
            <label class="p-form-label">Topic / Subject</label>
            <input class="p-form-control" id="ms_topic" value="${slot.topic || ''}" placeholder="e.g. Opening Basics">
          </div>
          <div class="p-form-group">
            <label class="p-form-label">Duration (minutes)</label>
            <input class="p-form-control" type="number" id="ms_duration" value="${slot.duration || 60}">
          </div>
          <div class="p-form-group">
            <label class="p-form-label">GMeet Class Link</label>
            <input class="p-form-control" id="ms_link" value="${slot.link || ''}" placeholder="https://meet.google.com/xxx-xxxx-xxx">
          </div>
          <div class="p-form-group">
            <label class="p-form-label">Students Assigned (comma separated)</label>
            <textarea class="p-form-control" id="ms_student" rows="2">${slot.student}</textarea>
          </div>
        </div>
        <div class="p-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="this.closest('.p-modal-overlay').remove()">Cancel</button>
          <button class="p-btn p-btn-blue" id="ms_save">💾 Save Updates</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#ms_save').onclick = async () => {
      slot.batch = modal.querySelector('#ms_batch').value.trim();
      slot.time = modal.querySelector('#ms_time').value.trim();
      slot.topic = modal.querySelector('#ms_topic').value.trim();
      slot.duration = parseInt(modal.querySelector('#ms_duration').value || 60);
      slot.link = modal.querySelector('#ms_link').value.trim();
      slot.student = modal.querySelector('#ms_student').value.trim();

      onSave();
      modal.remove();
    };
  };

  // ─── Rendering Core Coach Matrix HTML ───
  const renderTimetableMatrixHTML = (data, userRole, userName) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    let rowsHtml = '';
    data.forEach(row => {
      const isMyRow = (userRole === 'coach' && userName && row.coach.toLowerCase().includes(userName.toLowerCase())) || userRole === 'admin';
      const cellEditableAttr = isMyRow ? 'style="cursor:pointer;"' : '';
      
      let dayCols = '';
      days.forEach(day => {
        const slots = row.slots[day] || [];
        if (slots.length === 0) {
          dayCols += `<td class="empty-cell">&mdash;</td>`;
        } else {
          let blocksHtml = '';
          slots.forEach((s, idx) => {
            const clickHandler = isMyRow ? `onclick="window.CK.schedulePro.editMatrixSlot('${row.coach}', '${day}', ${idx})"` : '';
            blocksHtml += `
              <div class="matrix-block ${row.bgClass}" ${clickHandler} title="Click to Edit (Coach/Admin Only)\nTopic: ${s.topic || 'None'}\nLink: ${s.link || 'None'}">
                ${s.batch}
                <span class="time-text">${s.time}</span>
                <span class="student-text">${s.student}</span>
              </div>
            `;
          });
          dayCols += `<td>${blocksHtml}</td>`;
        }
      });

      rowsHtml += `
        <tr>
          <td class="coach-cell ${row.rowClass}">${row.coach}<br><span style="font-size:6pt; font-weight:normal; color:#8a90a6;">${row.role}</span></td>
          ${dayCols}
        </tr>
      `;
    });

    return `
      <div class="matrix-wrapper">
        <div class="matrix-header">
          <h1>Chess Academy &mdash; Coach Master Schedule Matrix</h1>
          <div class="subtitle">Complete Unified Rosters with Strict Chronological Sequencing</div>
        </div>
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="coach-header">Coach</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
              <th>Sun</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="matrix-footer">
          Chess Academy Master Matrix &bull; Sync Status: Verified Secure
        </div>
      </div>
    `;
  };

  // ─── Visual Calendar Grid renderer ───
  const renderVisualCalendarHTML = (meetings, matrixSlots) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    // Build days of the current week (Sunday to Saturday)
    const currentDayIdx = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayIdx);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d);
    }

    let headers = daysOfWeek.map((day, i) => {
      const dt = weekDates[i];
      const isToday = dt.toDateString() === now.toDateString();
      const style = isToday ? 'background:var(--p-gold); color:#000; font-weight:700;' : '';
      return `<div class="calendar-day-header" style="${style}">${day} ${dt.getDate()}</div>`;
    }).join('');

    let cells = weekDates.map((dt, i) => {
      const dayLabel = daysOfWeek[i]; // Sun, Mon, etc.
      const dateStr = dt.toISOString().split('T')[0];
      const isToday = dt.toDateString() === now.toDateString();
      const cellClass = `calendar-day-cell ${isToday ? 'today' : ''}`;

      // Filter meetings for this date
      const dMeetings = meetings.filter(m => m.date === dateStr);
      // Filter matrix recurring slots for this day of the week
      const dMatrix = matrixSlots[dayLabel] || [];

      let eventsHtml = '';
      
      // Render recurring matrix classes
      dMatrix.forEach(s => {
        eventsHtml += `
          <div class="calendar-event" style="background:#00c9a7; border-left:3.5px solid rgba(255,255,255,0.4);" title="Batch: ${s.batch}\nTime: ${s.time}\nStudents: ${s.student}">
            🔄 ${s.time.split(' - ')[0]} ${s.batch}
          </div>
        `;
      });

      // Render one-off meetings
      dMeetings.forEach(m => {
        const bg = m.status === 'rescheduled' ? '#f59e0b' : '#3b82f6';
        eventsHtml += `
          <div class="calendar-event" style="background:${bg}; border-left:3.5px solid rgba(255,255,255,0.4);" title="Title: ${m.title}\nTime: ${m.time}\nType: ${m.type}">
            📅 ${m.time} ${m.title}
          </div>
        `;
      });

      return `
        <div class="${cellClass}">
          <div class="calendar-day-num">${dt.getDate()}</div>
          <div style="display:flex; flex-direction:column; overflow-y:auto; max-height:80px;">
            ${eventsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="background:var(--p-surface); border:1px solid var(--p-border); border-radius:12px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:1.05rem;">📅 Visual Weekly Calendar</h3>
          <span style="font-size:0.78rem; opacity:0.6;">Week of ${weekDates[0].toLocaleDateString()} - ${weekDates[6].toLocaleDateString()}</span>
        </div>
        <div class="calendar-grid-monthly">
          ${headers}
          ${cells}
        </div>
      </div>
    `;
  };

  // ─── Render Student schedule cards: Today, Missed, Upcoming ───
  const renderStudentScheduleListHTML = (meetings, matrixSlots, profile) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayLabel = days[now.getDay()];
    const studentName = profile?.full_name || '';

    // Extract student's matrix slots (classes containing student's name)
    const myMatrixClasses = [];
    Object.entries(matrixSlots).forEach(([day, slots]) => {
      slots.forEach(s => {
        if (s.student.toLowerCase().includes(studentName.toLowerCase())) {
          myMatrixClasses.push({ day, ...s });
        }
      });
    });

    // Today's classes: one-off meetings today + recurring matrix classes today
    const todayMeetings = meetings.filter(m => m.date === todayStr);
    const todayMatrix = myMatrixClasses.filter(c => c.day === currentDayLabel);

    // Upcoming classes
    const upcomingMeetings = meetings.filter(m => m.date > todayStr).slice(0, 5);
    const upcomingMatrix = myMatrixClasses.filter(c => c.day !== currentDayLabel);

    // Missed classes: meetings past and unchecked
    const missedMeetings = meetings.filter(m => m.date < todayStr && m.status !== 'Completed').slice(0, 5);

    let html = '';

    // 1. TODAY'S CLASSES
    html += `<div class="sched-section-title" style="color:var(--p-teal); border-bottom-color:var(--p-teal);">🔴 Today's Classes</div>`;
    if (todayMeetings.length === 0 && todayMatrix.length === 0) {
      html += `<div class="cls-empty">No classes scheduled for today. Enjoy your day off! ♟️</div>`;
    } else {
      todayMatrix.forEach(c => {
        html += `
          <div class="sched-card" style="border-left:4px solid var(--p-teal);">
            <div class="sched-card-body">
              <div class="sched-title">🔄 Recurring Class: ${c.batch} <span style="font-size:11px; color:var(--p-gold); margin-left:8px;">${c.time}</span></div>
              <div class="sched-meta">Topic: ${c.topic || 'General Strategy'} · Duration: ${c.duration} mins</div>
              ${c.link ? `<a href="${c.link}" target="_blank" class="sched-join-btn">▶ Join Classroom</a>` : `<button class="p-btn p-btn-ghost p-btn-sm" style="margin-top:8px; opacity:0.6;" disabled>Meet Link Pending</button>`}
            </div>
          </div>`;
      });
      todayMeetings.forEach(m => {
        html += `
          <div class="sched-card" style="border-left:4px solid var(--p-blue);">
            <div class="sched-card-body">
              <div class="sched-title">📅 Extra Class: ${m.title} <span style="font-size:11px; color:var(--p-gold); margin-left:8px;">${m.time}</span></div>
              <div class="sched-meta">Coach: ${m.coachName} · Duration: ${m.duration} mins</div>
              ${m.notes ? `<div class="sched-notes">📝 ${m.notes}</div>` : ''}
              ${m.link ? `<a href="${m.link}" target="_blank" class="sched-join-btn">▶ Join Meeting</a>` : ''}
            </div>
          </div>`;
      });
    }

    // 2. UPCOMING CLASSES
    html += `<div class="sched-section-title" style="margin-top:24px; color:var(--p-blue); border-bottom-color:var(--p-blue);">📅 Upcoming Classes (This Week)</div>`;
    if (upcomingMeetings.length === 0 && upcomingMatrix.length === 0) {
      html += `<div class="cls-empty">No upcoming scheduled classes.</div>`;
    } else {
      upcomingMatrix.forEach(c => {
        html += `
          <div class="sched-card" style="border-left:4px solid var(--p-border); opacity:0.8;">
            <div class="sched-card-body">
              <div class="sched-title">🔄 ${c.day} Class: ${c.batch} <span style="font-size:11px; color:var(--p-gold); margin-left:8px;">${c.time}</span></div>
              <div class="sched-meta">Topic: ${c.topic || 'General Strategy'} · Duration: ${c.duration} mins</div>
            </div>
          </div>`;
      });
      upcomingMeetings.forEach(m => {
        html += `
          <div class="sched-card" style="border-left:4px solid var(--p-border); opacity:0.8;">
            <div class="sched-card-body">
              <div class="sched-title">📅 ${m.date} Class: ${m.title} <span style="font-size:11px; color:var(--p-gold); margin-left:8px;">${m.time}</span></div>
              <div class="sched-meta">Coach: ${m.coachName}</div>
            </div>
          </div>`;
      });
    }

    // 3. MISSED CLASSES
    if (missedMeetings.length > 0) {
      html += `<div class="sched-section-title" style="margin-top:24px; color:#ef4444; border-bottom-color:#ef4444;">⏮ Missed Classes</div>`;
      missedMeetings.forEach(m => {
        html += `
          <div class="sched-card" style="border-left:4px solid #ef4444; opacity:0.8;">
            <div class="sched-card-body">
              <div class="sched-title">⚠️ Missed Session: ${m.title}</div>
              <div class="sched-meta">Date: ${m.date} @ ${m.time} · Coach: ${m.coachName}</div>
              <div style="font-size:11px; color:rgba(255,77,79,0.7); margin-top:4px;">Please reach out to your coach to schedule a makeup class.</div>
            </div>
          </div>`;
      });
    }

    return html;
  };

  // ─── ADMIN — RENDER PORTAL VIEW ───
  async function renderAdminSchedule(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    injectMatrixCSS();

    const data = await getTimetable();
    const meetings = await get();
    
    // Group slots by day for calendar
    const matrixSlotsByDay = {};
    data.forEach(row => {
      Object.entries(row.slots).forEach(([day, slots]) => {
        matrixSlotsByDay[day] = matrixSlotsByDay[day] || [];
        slots.forEach(s => {
          matrixSlotsByDay[day].push({ coach: row.coach, ...s });
        });
      });
    });

    el.innerHTML = `
      <div style="display:flex; gap:10px; margin-bottom:18px;">
        <button class="cal-tab-btn active" id="btn-admin-matrix" onclick="window.CK.schedulePro.setTab('matrix')">🗺️ Timetable Matrix</button>
        <button class="cal-tab-btn" id="btn-admin-calendar" onclick="window.CK.schedulePro.setTab('calendar')">📅 Weekly Calendar</button>
        <button class="cal-tab-btn" id="btn-admin-meetings" onclick="window.CK.schedulePro.setTab('meetings')">🔄 All Meetings</button>
      </div>

      <div class="admin-sched-tab-content" id="adm-content-matrix">
        ${renderTimetableMatrixHTML(data, 'admin', '')}
      </div>
      <div class="admin-sched-tab-content" id="adm-content-calendar" style="display:none;">
        ${renderVisualCalendarHTML(meetings, matrixSlotsByDay)}
      </div>
      <div class="admin-sched-tab-content" id="adm-content-meetings" style="display:none;">
        <div class="p-card" style="padding:16px;">
          <h4 style="margin-bottom:12px; color:var(--p-gold);">Meetings Registry</h4>
          <table class="p-table" style="width:100%">
            <thead><tr><th>Title</th><th>Coach</th><th>Batch</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              ${meetings.length > 0 ? meetings.map(m => `<tr>
                <td style="font-weight:600">${m.title}</td>
                <td>${m.coachName}</td>
                <td>${m.batch}</td>
                <td>${m.date}</td>
                <td>${m.time}</td>
                <td><span class="p-badge p-badge-blue">${m.status || 'Scheduled'}</span></td>
              </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; opacity:0.5; padding:16px;">No meetings registered.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Cache the loaded data on window for the click editor
    window._timetableMatrixData = data;
  }

  // ─── COACH — RENDER PORTAL VIEW ───
  async function renderCoachSchedule(containerId, coachId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    injectMatrixCSS();

    const data = await getTimetable();
    const meetings = await get();
    
    // Find coach name from credentials
    const coachName = CK.currentUser?.full_name || 'Coach';
    
    // Filter meetings
    const myMeetings = meetings.filter(m => m.coachId === coachId || (m.coachName && m.coachName.toLowerCase().includes(coachName.toLowerCase())));

    // Group slots by day
    const matrixSlotsByDay = {};
    data.forEach(row => {
      if (row.coach.toLowerCase().includes(coachName.toLowerCase())) {
        Object.entries(row.slots).forEach(([day, slots]) => {
          matrixSlotsByDay[day] = matrixSlotsByDay[day] || [];
          slots.forEach(s => {
            matrixSlotsByDay[day].push({ coach: row.coach, ...s });
          });
        });
      }
    });

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <div style="display:flex; gap:10px;">
          <button class="cal-tab-btn active" id="btn-coach-matrix" onclick="window.CK.schedulePro.setTab('matrix')">🗺️ My Timetable Matrix</button>
          <button class="cal-tab-btn" id="btn-coach-calendar" onclick="window.CK.schedulePro.setTab('calendar')">📅 Weekly Calendar</button>
          <button class="cal-tab-btn" id="btn-coach-meetings" onclick="window.CK.schedulePro.setTab('meetings')">➕ Extra Sessions</button>
        </div>
        <button class="p-btn p-btn-gold p-btn-sm" onclick="window.CK.schedulePro.coachAddMeeting('${coachId}', '${coachName}', '${containerId}')">+ Schedule Meeting</button>
      </div>

      <div class="coach-sched-tab-content" id="adm-content-matrix">
        ${renderTimetableMatrixHTML(data, 'coach', coachName)}
      </div>
      <div class="coach-sched-tab-content" id="adm-content-calendar" style="display:none;">
        ${renderVisualCalendarHTML(myMeetings, matrixSlotsByDay)}
      </div>
      <div class="coach-sched-tab-content" id="adm-content-meetings" style="display:none;">
        <div class="p-card" style="padding:16px;">
          <h4 style="margin-bottom:12px; color:var(--p-primary);">Scheduled Extra Classes</h4>
          <div style="display:grid; gap:10px;">
            ${myMeetings.length > 0 ? myMeetings.map(m => `
              <div class="sched-card">
                <div class="sched-card-body">
                  <div class="sched-title">📅 ${m.title} <span class="p-badge p-badge-blue" style="margin-left:8px;">${m.time}</span></div>
                  <div class="sched-meta">Date: ${m.date} · Batch: ${m.batch} · Duration: ${m.duration} mins</div>
                  ${m.link ? `<a href="${m.link}" target="_blank" class="sched-join-btn">▶ Start Meeting</a>` : ''}
                </div>
                <div class="sched-card-actions" style="margin-left:auto; display:flex; align-items:center; gap:8px;">
                  <button class="p-btn p-btn-ghost p-btn-sm" onclick="window.CK.schedulePro.editMeeting('${m.id}','${containerId}')">✏️</button>
                  <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" onclick="window.CK.schedulePro.deleteMeeting('${m.id}','${coachId}','${containerId}')">🗑️</button>
                </div>
              </div>
            `).join('') : '<div class="cls-empty">No extra sessions scheduled yet.</div>'}
          </div>
        </div>
      </div>
    `;

    window._timetableMatrixData = data;
    window._timetableCoachName = coachName;
  }

  // ─── STUDENT — RENDER PORTAL VIEW ───
  async function renderStudentSchedule(containerId, profile) {
    const el = document.getElementById(containerId);
    if (!el) return;
    injectMatrixCSS();

    const data = await getTimetable();
    const meetings = await get();

    const studentName = profile?.full_name || CK.currentUser?.full_name || '';

    // Filter student's personal meetings
    const myMeetings = meetings.filter(m => 
      m.studentIds?.includes(profile?.id) || 
      (profile?.batch && m.batch?.toLowerCase().includes(profile.batch.toLowerCase()))
    );

    // Filter student's matrix slots
    const myMatrixSlotsByDay = {};
    data.forEach(row => {
      Object.entries(row.slots).forEach(([day, slots]) => {
        slots.forEach(s => {
          if (s.student.toLowerCase().includes(studentName.toLowerCase())) {
            myMatrixSlotsByDay[day] = myMatrixSlotsByDay[day] || [];
            myMatrixSlotsByDay[day].push({ coach: row.coach, ...s });
          }
        });
      });
    });

    el.innerHTML = `
      <div style="display:flex; gap:10px; margin-bottom:18px;">
        <button class="cal-tab-btn active" id="btn-student-list" onclick="window.CK.schedulePro.setTab('list')">📋 My Schedule List</button>
        <button class="cal-tab-btn" id="btn-student-calendar" onclick="window.CK.schedulePro.setTab('calendar')">📅 Weekly Calendar</button>
        <button class="cal-tab-btn" id="btn-student-matrix" onclick="window.CK.schedulePro.setTab('matrix')">🗺️ Full Academy Timetable</button>
      </div>

      <div class="student-sched-tab-content" id="adm-content-list">
        ${renderStudentScheduleListHTML(myMeetings, myMatrixSlotsByDay, profile)}
      </div>
      <div class="student-sched-tab-content" id="adm-content-calendar" style="display:none;">
        ${renderVisualCalendarHTML(myMeetings, myMatrixSlotsByDay)}
      </div>
      <div class="student-sched-tab-content" id="adm-content-matrix" style="display:none;">
        ${renderTimetableMatrixHTML(data, 'student', '')}
      </div>
    `;

    window._timetableMatrixData = data;
  }

  // Set active tab inside schedule panels
  window.CK.schedulePro = window.CK.schedulePro || {};
  window.CK.schedulePro.setTab = (tabName) => {
    // Hide all tab content blocks
    document.querySelectorAll('.admin-sched-tab-content, .coach-sched-tab-content, .student-sched-tab-content').forEach(el => {
      el.style.display = 'none';
    });

    // Remove active style from buttons
    document.querySelectorAll('.cal-tab-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected content block
    const target = document.getElementById(`adm-content-${tabName}`);
    if (target) target.style.display = 'block';

    // Highlight active buttons
    const activeBtn = document.getElementById(`btn-admin-${tabName}`) || document.getElementById(`btn-coach-${tabName}`) || document.getElementById(`btn-student-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
  };

  // Expose Slot Click Trigger for editing
  window.CK.schedulePro.editMatrixSlot = (coachName, day, index) => {
    const data = window._timetableMatrixData;
    if (!data) return;

    const row = data.find(r => r.coach === coachName);
    if (!row) return;

    const userRole = CK.currentUser?.role || 'student';
    const userName = CK.currentUser?.full_name || '';

    // Coaches can only edit their own row
    if (userRole === 'coach' && !coachName.toLowerCase().includes(userName.toLowerCase())) {
      if (window.toast) window.toast("Error: You can only edit your own timetable slots.", "error");
      return;
    }

    openMatrixSlotEditor(row, day, index, data, async () => {
      await saveTimetable(data);
      if (window.toast) window.toast("Timetable updated successfully!", "success");
      
      // Re-render
      if (userRole === 'admin') {
        renderAdminSchedule('adminAllSchedule');
      } else if (userRole === 'coach') {
        renderCoachSchedule('coachSchedList', CK.currentUser?.id);
      }
    });
  };

  // Expose extra meeting schedulers
  window.CK.schedulePro.coachAddMeeting = (coachId, coachName, containerId) => {
    openMeetingModal(null, coachId, async (data) => {
      const baseMeeting = { coachId, coachName, ...data, studentIds: [] };
      let count = 1;
      if (data.recurrence === 'weekly_4') count = 4;
      if (data.recurrence === 'weekly_8') count = 8;
      
      const dt = new Date(data.date);
      for (let i = 0; i < count; i++) {
        const m = { ...baseMeeting, id: uid() };
        if (i > 0) {
          dt.setDate(dt.getDate() + 7);
          m.date = dt.toISOString().split('T')[0];
        }
        await CK.db.saveMeeting(m);
      }
      
      if (window.toast) window.toast(count > 1 ? `${count} recurring meetings scheduled!` : `Meeting "${baseMeeting.title}" scheduled!`, 'success');
      renderCoachSchedule(containerId, coachId);
    });
  };

  async function editMeeting(meetingId, containerId = 'coachSchedList') {
    const all = await get();
    const m = all.find(x => x.id === meetingId);
    if (!m) return;
    openMeetingModal(m, m.coachId, async (data) => {
      Object.assign(m, data);
      await CK.db.saveMeeting(m);
      if (window.toast) window.toast('Meeting updated!', 'success');
      renderCoachSchedule(containerId, m.coachId);
    });
  }

  async function deleteMeeting(meetingId, coachId, containerId = 'coachSchedList') {
    if (!await CK.confirm('Delete this meeting?')) return;
    await CK.db.deleteMeeting(meetingId);
    if (window.toast) window.toast('Meeting deleted.', 'success');
    renderCoachSchedule(containerId, coachId);
  }

  function openMeetingModal(existing, coachId, onSave) {
    const modal = document.createElement('div');
    modal.className = 'cls-modal-overlay open';
    modal.innerHTML = `
      <div class="cls-modal">
        <div class="cls-modal-header">
          <h3>${existing ? '✏️ Edit Meeting' : '➕ Schedule New Meeting'}</h3>
          <button class="cls-modal-close" onclick="this.closest('.p-modal-overlay').remove()">✕</button>
        </div>
        <div class="cls-modal-body">
          <div class="cls-form-row"><label>Title</label><input class="p-input" id="mm_title" value="${existing?.title || ''}" placeholder="e.g. Tactics Workshop"></div>
          <div class="cls-form-2col">
            <div class="cls-form-row">
              <label>Type</label>
              <select class="p-input" id="mm_type">
                ${['class','oneOnOne','tournament','review'].map(t=>`<option value="${t}" ${existing?.type===t?'selected':''}>${{class:'Group Class',oneOnOne:'1-on-1 Session',tournament:'Tournament Prep',review:'Game Review'}[t]}</option>`).join('')}
              </select>
            </div>
            <div class="cls-form-row">
              <label>Recurrence</label>
              <select class="p-input" id="mm_recurrence" ${existing ? 'disabled' : ''}>
                <option value="none">One-time only</option>
                <option value="weekly_4">Weekly (4 weeks)</option>
                <option value="weekly_8">Weekly (8 weeks)</option>
              </select>
            </div>
          </div>
          <div class="cls-form-row"><label>Batch / Students</label><input class="p-input" id="mm_batch" value="${existing?.batch || ''}" placeholder="e.g. Weekend, Group 17:00"></div>
          <div class="cls-form-2col">
            <div class="cls-form-row"><label>Date</label><input class="p-input" type="date" id="mm_date" value="${existing?.date || today()}"></div>
            <div class="cls-form-row"><label>Time</label><input class="p-input" type="time" id="mm_time" value="${existing?.time || '17:00'}"></div>
          </div>
          <div class="cls-form-row"><label>Duration (min)</label><input class="p-input" type="number" id="mm_dur" value="${existing?.duration || 60}" min="15" max="180"></div>
          <div class="cls-form-row">
            <label>Class Link</label>
            <div style="display:flex; gap:8px;">
              <input class="p-input" id="mm_link" value="${existing?.link || ''}" placeholder="https://meet.google.com/xxx" style="flex:1;">
              <button class="p-btn p-btn-ghost" id="mm_gen_link" style="padding:0 12px; white-space:nowrap;" type="button">🪄 Generate</button>
            </div>
          </div>
          <div class="cls-form-row"><label>Notes for Students</label><textarea class="p-input" id="mm_notes" rows="2" placeholder="Pre-class preparation, topics to review...">${existing?.notes || ''}</textarea></div>
        </div>
        <div class="cls-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="this.closest('.cls-modal-overlay').remove()">Cancel</button>
          <button class="p-btn p-btn-blue" id="mm_save">💾 Save Meeting</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#mm_gen_link').onclick = async (e) => {
      e.preventDefault();
      const btn = e.target;
      btn.textContent = '⏳...';
      btn.disabled = true;
      try {
        const link = (CK.gmeetScheduler && CK.gmeetScheduler.createMeet)
          ? await CK.gmeetScheduler.createMeet()
          : (CK.gmeet && CK.gmeet.createMeetSpace) ? await CK.gmeet.createMeetSpace() : `https://meet.google.com/mock-${uid()}`;
        modal.querySelector('#mm_link').value = link;
        btn.textContent = '✅ Generated';
      } catch (err) {
        btn.textContent = '❌ Failed';
      }
      setTimeout(() => { btn.disabled = false; btn.textContent = '🪄 Generate'; }, 2000);
    };

    modal.querySelector('#mm_save').onclick = () => {
      onSave({
        title:      modal.querySelector('#mm_title').value.trim(),
        type:       modal.querySelector('#mm_type').value,
        recurrence: modal.querySelector('#mm_recurrence').value,
        batch:      modal.querySelector('#mm_batch').value.trim(),
        date:       modal.querySelector('#mm_date').value,
        time:       modal.querySelector('#mm_time').value,
        duration:   parseInt(modal.querySelector('#mm_dur').value),
        link:       modal.querySelector('#mm_link').value.trim(),
        notes:      modal.querySelector('#mm_notes').value.trim()
      });
      modal.remove();
    };
  }

  async function upcomingCount(studentProfile) {
    const coachName = studentProfile?.coach || '';
    const batch = studentProfile?.batch || '';
    const all = await get();
    return all.filter(m =>
      m.date >= today() &&
      (m.coachName === coachName || (batch && m.batch?.toLowerCase().includes(batch.toLowerCase())))
    ).length;
  }

  return {
    get, renderCoachSchedule, renderStudentSchedule, renderAdminSchedule, upcomingCount,
    editMeeting, deleteMeeting
  };
})();
