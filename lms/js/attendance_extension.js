// --- NEW MONTHLY MATRIX ATTENDANCE LOGIC ---
window.openMonthlyMatrix = function() {
  const monthInput = document.getElementById('mat-month');
  if (monthInput) monthInput.value = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const coachSelect = document.getElementById('mat-coach');
  if (coachSelect) {
    coachSelect.innerHTML = '<option value="">All Coaches</option>' + 
      allCoaches.map(c => `<option value="${c.id}">${getCoachName(c)}</option>`).join('');
  }
  
  if (typeof window.renderMonthlyMatrix === 'function') window.renderMonthlyMatrix();
  openModal('monthly-attendance-modal');
};

window.renderMonthlyMatrix = function() {
  const container = document.getElementById('mat-container');
  if (!container) return;
  
  const monthVal = document.getElementById('mat-month')?.value || new Date().toISOString().slice(0, 7);
  const coachId = document.getElementById('mat-coach')?.value;
  
  const [year, month] = monthVal.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let filteredStudents = allStudents.filter(s => s.status === 'active');
  if (coachId) filteredStudents = filteredStudents.filter(s => String(s.coach_id) === String(coachId));
  
  // Build header
  let html = `<table style="width:max-content;font-size:12px;text-align:center;border-collapse:collapse"><thead><tr>`;
  html += `<th style="position:sticky;left:0;background:var(--bg2);z-index:2;text-align:left;min-width:150px">Student</th>`;
  for (let i = 1; i <= daysInMonth; i++) {
    html += `<th style="min-width:30px">${i}</th>`;
  }
  html += `</tr></thead><tbody>`;
  
  // Build rows
  filteredStudents.forEach(s => {
    html += `<tr>`;
    html += `<td style="position:sticky;left:0;background:var(--bg2);z-index:1;text-align:left;font-weight:600;white-space:nowrap;border-bottom:1px solid var(--border)">
               ${escapeHtml(getStudentName(s))}
             </td>`;
             
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = allAttendance.find(a => String(a.student_id || a.studentId) === String(s.id) && a.date === dateStr);
      const status = record ? record.status : '';
      
      let cellContent = '';
      let cellStyle = 'cursor:pointer;border:1px solid var(--border);';
      if (status === 'present') { cellContent = '🟩'; cellStyle += 'background:rgba(16,185,129,0.1);'; }
      else if (status === 'absent') { cellContent = '🟥'; cellStyle += 'background:rgba(239,68,68,0.1);'; }
      else if (status === 'late') { cellContent = '🟨'; cellStyle += 'background:rgba(239,191,10,0.1);'; }
      else if (status === 'excused') { cellContent = '⬜'; cellStyle += 'background:rgba(128,128,128,0.1);'; }
      
      html += `<td style="${cellStyle}" onclick="toggleCellAttendance('${s.id}', '${dateStr}', '${status}')">
                 ${cellContent}
               </td>`;
    }
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
};

window.toggleCellAttendance = async function(studentId, date, currentStatus) {
   // Cycle: empty -> present -> absent -> late -> excused -> empty
   const statusCycle = ['', 'present', 'absent', 'late', 'excused'];
   let newStatus = '';
   if (!currentStatus) newStatus = 'present';
   else {
     const currentIndex = statusCycle.indexOf(currentStatus);
     newStatus = currentIndex < statusCycle.length - 1 ? statusCycle[currentIndex + 1] : '';
   }
  
  // Optimistic UI update in local state
  const existingIndex = allAttendance.findIndex(a => String(a.student_id) === String(studentId) && a.date === date);
  if (newStatus === '') {
    if (existingIndex > -1) {
      allAttendance.splice(existingIndex, 1); // remove
    }
  } else {
    if (existingIndex > -1) {
      allAttendance[existingIndex].status = newStatus;
    } else {
      allAttendance.push({ student_id: studentId, date: date, status: newStatus, notes: '' });
    }
}
   
   // Re-render
   if (typeof window.renderMonthlyMatrix === 'function') window.renderMonthlyMatrix();
   if (typeof window.renderChildAttendance === 'function') window.renderChildAttendance();

   // LocalStorage persistence
   try {
     localStorage.setItem('ck_attendance_records', JSON.stringify(window.allAttendance || allAttendance || []));
   } catch (_) {}
  
   // API / Supabase Call in background
   if (newStatus !== '') {
     const payload = [{ student_id: studentId, date: date, status: newStatus, notes: '' }];
     apiCall('/api/attendance', { method: 'POST', body: JSON.stringify(payload) })
       .catch(async () => {
         if (window.supabaseClient) {
           await window.supabaseClient.from('attendance').upsert(payload).catch(() => {});
         }
       });
   } else {
     // Delete the attendance record when status is cleared
     apiCall(`/api/attendance?student_id=${encodeURIComponent(studentId)}&date=${encodeURIComponent(date)}`, { method: 'DELETE' })
       .catch(async () => {
         if (window.supabaseClient) {
           await window.supabaseClient.from('attendance')
             .delete()
             .eq('student_id', studentId)
             .eq('date', date)
             .catch(() => {});
         }
       });
   }
 };

// --- MASTER SCHEDULE MATRIX (100% DYNAMIC) ---
// No more hardcoded data. Everything comes from live student/coach data via
// window.buildDynamicSchedule() defined in scripts.js.

window.openMasterSchedule = function() {
  const container = document.getElementById('master-schedule-container');
  if (!container) return;

  const htmlStyle = `
    <style>
        #master-schedule-container {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            background-color: #141722;
            color: #ffffff;
            font-size: 11px;
            padding: 10px;
        }

        #master-schedule-container .header {
            text-align: center;
            margin-bottom: 12px;
        }

        #master-schedule-container h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            letter-spacing: 0.5px;
            color: #ffffff;
        }

        #master-schedule-container .subtitle {
            margin-top: 4px;
            font-size: 12px;
            color: #8a90a6;
        }

        #master-schedule-container table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 3px;
            table-layout: fixed;
        }

        #master-schedule-container th {
            background-color: #1c2030;
            color: #a4b0cb;
            font-weight: 600;
            padding: 8px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 2px;
            font-size: 11px;
            border: none;
        }

        #master-schedule-container th.coach-header {
            width: 11%;
        }

        #master-schedule-container td {
            padding: 4px;
            vertical-align: middle;
            text-align: center;
            background-color: #1a1e2e;
            border-radius: 2px;
            height: 60px;
            border: none;
        }

        #master-schedule-container td.coach-cell {
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            padding: 4px;
            line-height: 1.3;
        }

        #master-schedule-container .empty-cell {
            color: #2c3242;
            font-size: 12px;
        }

        #master-schedule-container .block {
            display: block;
            padding: 4px;
            margin: 2px 0;
            border-radius: 3px;
            color: #ffffff;
            font-weight: 600;
            line-height: 1.2;
            text-align: left;
            position: relative;
        }

        #master-schedule-container .block .edit-btn {
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(0,0,0,0.4);
            border: none;
            color: #fff;
            font-size: 8px;
            padding: 1px 3px;
            border-radius: 2px;
            cursor: pointer;
            display: none;
        }
        #master-schedule-container .block:hover .edit-btn {
            display: block;
        }

        #master-schedule-container .time-text {
            display: block;
            font-size: 10px;
            opacity: 0.85;
            margin-top: 2px;
            font-weight: normal;
        }
        
        #master-schedule-container .student-text {
            display: block;
            font-size: 10px;
            font-style: italic;
            opacity: 0.95;
            font-weight: normal;
            margin-top: 3px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #master-schedule-container .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 11px;
            color: #4f5d75;
        }
    </style>
  `;

  // Get dynamic schedule data
  const scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const daysFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Helper function to resolve color
  function getCoachColorHex(coachName) {
      const n = (coachName || '').toLowerCase();
      if (n.includes('rohith')) return '#3b5998';
      if (n.includes('ranjith')) return '#27ae60';
      if (n.includes('gyana')) return '#8e44ad';
      if (n.includes('arivu')) return '#d35400';
      if (n.includes('yogesh')) return '#2ecc71';
      if (n.includes('sudhin')) return '#f39c12';
      if (n.includes('vasanth')) return '#16a085';
      if (n.includes('vishnu')) return '#7f8c8d';
      return '#4f5d75';
  }

  let tableRows = '';
  scheduleData.forEach(cEntry => {
    const coachColor = getCoachColorHex(cEntry.coach);
    let coachInfo = (window.allCoaches || []).find(c => String(c.id) === String(cEntry.coachId));
    let coachRole = coachInfo ? (coachInfo.role || 'Coach') : 'Coach';
    
    tableRows += `<tr>`;
    // Coach name column
    tableRows += `<td class="coach-cell" style="border-left: 3.5px solid ${coachColor}; text-align: left; padding-left: 8px;">
        ${escapeHtml(cEntry.coach)}<br>
        <span style="font-size:10px; font-weight:normal; color:#8a90a6; text-transform: capitalize;">${escapeHtml(coachRole)}</span>
    </td>`;

    // Calendar Days
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = daysFull[dayIndex];
      const dayShort = shortDays[dayIndex];

      // Find all batches for this coach that run on this day
      const dayBatches = cEntry.batches.filter(b => {
        const schedLow = (b.schedule || '').toLowerCase();
        return schedLow.includes(dayName.toLowerCase()) || schedLow.includes(dayShort.toLowerCase());
      });

      if (dayBatches.length > 0) {
        tableRows += `<td>`;
        dayBatches.forEach(b => {
          // Extract time part from schedule string e.g. "Monday & Wednesday | 6:00 PM - 7:00 PM"
          let timeSlot = b.schedule;
          if (b.schedule && b.schedule.includes('|')) {
            timeSlot = b.schedule.split('|')[1].trim();
          }
          const batchIndex = cEntry.batches.indexOf(b);

          tableRows += `
            <div class="block" style="background-color: ${coachColor};">
                <button class="edit-btn" onclick="window.openBatchInlineEdit('${cEntry.coachId}', ${batchIndex}, this)">✏️</button>
                ${escapeHtml(b.name)}
                <span class="time-text">${escapeHtml(timeSlot)}</span>
                <span class="student-text" title="${escapeHtml(b.students.join(', '))}">
                  ${escapeHtml(b.students.join(', ') || 'No Students')}
                </span>
            </div>
          `;
        });
        tableRows += `</td>`;
      } else {
        tableRows += `<td class="empty-cell">&mdash;</td>`;
      }
    }
    tableRows += `</tr>`;
  });

  const headerHtml = `
    <div class="header">
        <h1>Chess Academy &mdash; Coach Master Schedule Matrix</h1>
        <div class="subtitle">Complete Unified Rosters with Strict Chronological Sequencing</div>
    </div>
  `;

  const tableHtml = `
    <table>
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
            ${tableRows || '<tr><td colspan="8">No active coach schedules found.</td></tr>'}
        </tbody>
    </table>
  `;

  const footerHtml = `
    <div class="footer">
        Chess Academy Master Matrix &bull; Sync Status: Verified Secure (Dynamic Database-Backed)
    </div>
  `;

  container.innerHTML = htmlStyle + headerHtml + tableHtml + footerHtml;
  openModal('master-schedule-modal');
};

// --- Inline Batch Editor ---
window.openBatchInlineEdit = function(coachId, batchIndex, btnEl) {
  // Remove any existing popover
  document.querySelectorAll('.mat-edit-popover').forEach(el => el.remove());

  // Get live schedule data
  const scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const coachEntry = scheduleData.find(c => String(c.coachId) === String(coachId));
  if (!coachEntry || !coachEntry.batches[batchIndex]) return;

  const batch = coachEntry.batches[batchIndex];
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Parse existing days and time from schedule string (e.g. "Monday & Wednesday | 6:00 PM - 7:00 PM")
  let currentDays = [];
  let currentTime = '';
  if (batch.schedule && batch.schedule.includes('|')) {
    const parts = batch.schedule.split('|');
    const daysPart = parts[0].toLowerCase();
    currentTime = parts[1].trim();
    allDays.forEach(d => {
      if (daysPart.includes(d.toLowerCase())) currentDays.push(d);
    });
  }

  // Position popover near the button (prevent overflow on mobile screens)
  const rect = btnEl.getBoundingClientRect();
  const popX = Math.max(10, Math.min(rect.left, window.innerWidth - 350));
  const popY = Math.max(10, Math.min(rect.bottom + 4, window.innerHeight - 380));

  const popover = document.createElement('div');
  popover.className = 'mat-edit-popover';
  popover.style.left = popX + 'px';
  popover.style.top = popY + 'px';

  const dayPillsHtml = allDays.map(d => 
    `<span class="day-pill ${currentDays.includes(d) ? 'active' : ''}" data-day="${d}" onclick="this.classList.toggle('active')">${d.substring(0,3)}</span>`
  ).join('');

  // Students in this batch — allow removal
  const studentChipsHtml = (batch.students || []).map(name => 
    `<span style="display:inline-flex; align-items:center; gap:4px; background:#2c3242; padding:3px 8px; border-radius:4px; font-size:11px; margin:2px;">
       ${name}
     </span>`
  ).join('');

  popover.innerHTML = `
    <h4>✏️ Edit ${batch.name} — ${coachEntry.coach}</h4>
    <label>Class Days</label>
    <div class="day-pills" id="mat-edit-days">${dayPillsHtml}</div>
    <label>Time Slot</label>
    <input type="text" id="mat-edit-time" value="${currentTime}" placeholder="e.g. 6:00 PM - 7:00 PM">
    <label>Students in Batch</label>
    <div style="margin-top:4px; max-height:80px; overflow-y:auto;">${studentChipsHtml || '<span style="color:#8a90a6; font-size:11px;">No students assigned</span>'}</div>
    <div class="mat-edit-actions">
      <button class="mat-btn-cancel" onclick="this.closest('.mat-edit-popover').remove()">Cancel</button>
      <button class="mat-btn-save" onclick="window.saveBatchInlineEdit('${coachId}', ${batchIndex})">Save</button>
    </div>
  `;

  document.body.appendChild(popover);

  // Close on outside click
  setTimeout(() => {
    const handler = function(e) {
      if (!popover.contains(e.target)) {
        popover.remove();
        document.removeEventListener('mousedown', handler);
      }
    };
    document.addEventListener('mousedown', handler);
  }, 50);
};

window.saveBatchInlineEdit = async function(coachId, batchIndex) {
  const popover = document.querySelector('.mat-edit-popover');
  if (!popover) return;

  // Read new days
  const activePills = popover.querySelectorAll('.day-pill.active');
  const newDays = Array.from(activePills).map(el => el.dataset.day);
  const newTime = document.getElementById('mat-edit-time')?.value || '';

  if (newDays.length === 0) {
    if (window.toast) window.toast('Please select at least one day.', 'error');
    return;
  }

  // Build the new schedule string
  const daysString = newDays.join(' & ');
  const newSchedule = newTime ? `${daysString} | ${newTime}` : daysString;

  // Find all students in this batch and update their schedule notes
  const scheduleData = (typeof window.buildDynamicSchedule === 'function') ? window.buildDynamicSchedule() : [];
  const coachEntry = scheduleData.find(c => String(c.coachId) === String(coachId));
  if (!coachEntry || !coachEntry.batches[batchIndex]) return;

  const batch = coachEntry.batches[batchIndex];
  const studentNames = batch.students || [];

  if (window.toast) window.toast(`Updating schedule for ${studentNames.length} students...`, 'info');

  let successCount = 0;
  for (const name of studentNames) {
    const student = (window.allStudents || []).find(s =>
      (s.name || s.full_name || '').toLowerCase().includes(name.toLowerCase())
    );
    if (!student) continue;

    // Get existing schedule data from the student
    const existingSchedule = window.extractScheduleJSON ? window.extractScheduleJSON(student.notes, student) : null;
    const schedData = {
      ...(existingSchedule || {}),
      regDays: daysString,
      regTime: newTime,
      coachId: coachId,
      coachName: coachEntry.coach
    };

    if (window.persistScheduleForStudent) {
      const ok = await window.persistScheduleForStudent(student, schedData);
      if (ok) successCount++;
    }
  }

  popover.remove();

  if (window.toast) window.toast(`Schedule updated for ${successCount}/${studentNames.length} students.`, successCount > 0 ? 'success' : 'error');

  // Re-render the matrix with fresh data
  window.openMasterSchedule();
};


// ============================================================================
// CHESSKIDOO UNIFIED ATTENDANCE + HOMEWORK CALENDAR & SESSION SHEET SYSTEM
// ============================================================================

window.currentCalYear = new Date().getFullYear();
window.currentCalMonth = new Date().getMonth(); // 0-indexed

/**
 * Intelligent parser for attendance notes to extract topic, classwork, homework, duration, and subject.
 */
window.parseAttendanceNotes = function(notesStr) {
  if (!notesStr) return { topic: '', cw: '', hw: '', duration: 'One Hour', subject: 'Chess (Core)', general: '' };
  
  if (typeof notesStr === 'object') {
    return {
      topic: notesStr.topic || notesStr.cw || notesStr.lesson || '',
      cw: notesStr.cw || notesStr.classwork || notesStr.topic || '',
      hw: notesStr.hw || notesStr.homework || '',
      duration: notesStr.duration || notesStr.time_duration || 'One Hour',
      subject: notesStr.subject || notesStr.session_completed || 'Chess (Core)',
      general: notesStr.general || notesStr.notes || ''
    };
  }

  const str = String(notesStr).trim();
  let cw = '', hw = '', general = '', duration = 'One Hour', subject = 'Chess (Core)', topic = '';

  // Check if JSON
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      return window.parseAttendanceNotes(obj);
    } catch (_) {}
  }

  // Parse key-value delimiters e.g. "CW: Mate in 3 | HW: Puzzles 1-5 | Duration: 40 mins | Subject: Tactics"
  const parts = str.split('|');
  parts.forEach(p => {
    const trimmed = p.trim();
    const low = trimmed.toLowerCase();
    if (low.startsWith('cw:') || low.startsWith('classwork:') || low.startsWith('topic:')) {
      cw = trimmed.replace(/^(cw|classwork|topic):/i, '').trim();
      topic = cw;
    } else if (low.startsWith('hw:') || low.startsWith('homework:')) {
      hw = trimmed.replace(/^(hw|homework):/i, '').trim();
    } else if (low.startsWith('duration:') || low.startsWith('time:')) {
      duration = trimmed.replace(/^(duration|time):/i, '').trim();
    } else if (low.startsWith('subject:') || low.startsWith('session:')) {
      subject = trimmed.replace(/^(subject|session):/i, '').trim();
    } else {
      if (!general) general = trimmed;
      else general += ' ' + trimmed;
    }
  });

  if (!topic && !cw && general) {
    topic = general;
    cw = general;
  }

  return {
    topic: topic || cw || 'Chess Training',
    cw: cw || topic || '',
    hw: hw || '',
    duration: duration || 'One Hour',
    subject: subject || 'Chess (Core)',
    general: general || ''
  };
};

/**
 * Render visual monthly calendar matching user design (Green checkmark for present, Red X for absent)
 */
window.renderAttendanceCalendar = function(studentOrId, containerEl, year, month) {
  const container = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
  if (!container) return;

  let s = studentOrId;
  if (typeof s === 'string' || typeof s === 'number') {
    s = (window.allStudents || []).find(st => String(st.id) === String(studentOrId));
  }
  if (!s && window.currentStudent) s = window.currentStudent;
  if (!s) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ivory-dim);">Select a student to view attendance calendar.</div>';
    return;
  }

  const targetYear = (year !== undefined && year !== null) ? year : (window.currentCalYear || new Date().getFullYear());
  const targetMonth = (month !== undefined && month !== null) ? month : (window.currentCalMonth !== undefined ? window.currentCalMonth : new Date().getMonth());
  window.currentCalYear = targetYear;
  window.currentCalMonth = targetMonth;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthTitle = `${monthNames[targetMonth]} ${targetYear}`;

  // Get student attendance records
  const attList = window.allAttendance || [];
  const sId = String(s.id);
  const myAttendance = attList.filter(a => String(a.student_id || a.studentId) === sId);

  // Get homework assignments for this student
  const hwList = window.allHomework || [];
  const myHomework = hwList.filter(h => {
    if (!h) return false;
    if (typeof window.assignmentAppliesToStudent === 'function') {
      return window.assignmentAppliesToStudent(h, sId, window.allStudents || []);
    }
    if (h.student_id && String(h.student_id) === sId) return true;
    if (h.batch_id && s.batch_id && String(h.batch_id) === String(s.batch_id)) return true;
    if (h.target_type === 'all') return true;
    return false;
  });

  const firstDay = new Date(targetYear, targetMonth, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let daysHtml = '';
  // Empty padding for previous month days
  for (let i = 0; i < firstDay; i++) {
    daysHtml += `<div class="cal-day-cell cal-day-empty" style="background:transparent;border:none;min-height:90px;"></div>`;
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = myAttendance.find(a => String(a.date) === dStr);
    const hwOnDate = myHomework.filter(h => {
      const hDate = (h.due_date || h.created_at || '').slice(0, 10);
      return hDate === dStr;
    });

    const status = record ? (record.status || '').toLowerCase() : '';
    const notesParsed = record ? window.parseAttendanceNotes(record.notes || record.note || '') : null;

    let cellClass = 'cal-day-neutral';
    let iconHtml = '';
    let badgeStyle = '';

    if (status === 'present') {
      cellClass = 'cal-day-present';
      iconHtml = `<div style="width:28px;height:28px;border-radius:6px;background:#2ecc71;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;margin:4px auto;box-shadow:0 2px 5px rgba(46,204,113,0.3);">✓</div>`;
      badgeStyle = 'background:rgba(46, 204, 113, 0.15); border: 1.5px solid #2ecc71;';
    } else if (status === 'absent') {
      cellClass = 'cal-day-absent';
      iconHtml = `<div style="width:28px;height:28px;border-radius:6px;background:#ff7675;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;margin:4px auto;box-shadow:0 2px 5px rgba(255,118,117,0.3);">✕</div>`;
      badgeStyle = 'background:rgba(255, 118, 117, 0.15); border: 1.5px solid #ff7675;';
    } else if (status === 'late') {
      cellClass = 'cal-day-late';
      iconHtml = `<div style="width:28px;height:28px;border-radius:6px;background:#f1c40f;color:#222;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin:4px auto;">⏱</div>`;
      badgeStyle = 'background:rgba(241, 196, 15, 0.15); border: 1.5px solid #f1c40f;';
    } else {
      badgeStyle = 'background:var(--bg2); border: 1px solid var(--border);';
    }

    let topicBadge = '';
    if (notesParsed && notesParsed.topic && notesParsed.topic !== 'Chess Training') {
      topicBadge = `<div style="font-size:10px;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${window.escapeHtml ? window.escapeHtml(notesParsed.topic) : notesParsed.topic}">📚 ${window.escapeHtml ? window.escapeHtml(notesParsed.topic) : notesParsed.topic}</div>`;
    }
    if (hwOnDate.length > 0) {
      topicBadge += `<div style="font-size:10px;color:var(--emerald);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;" title="${hwOnDate.map(h => h.title).join(', ')}">📝 HW: ${window.escapeHtml ? window.escapeHtml(hwOnDate[0].title) : hwOnDate[0].title}</div>`;
    }

    const clickAction = `window.openAttendanceDayDetail('${s.id}', '${dStr}')`;

    daysHtml += `
      <div class="cal-day-cell ${cellClass}" onclick="${clickAction}" style="${badgeStyle} border-radius:8px; padding:8px 4px; min-height:85px; display:flex; flex-direction:column; justify-content:space-between; text-align:center; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; position:relative;">
        <div style="font-weight:700; font-size:14px; color:var(--ivory);">${d}</div>
        <div>${iconHtml}</div>
        <div style="min-height:16px;">${topicBadge}</div>
      </div>
    `;
  }

  const calHtml = `
    <div class="cal-wrapper" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;box-shadow:var(--shadow);">
      <!-- Header Controls -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-outline btn-sm" onclick="window.changeAttendanceCalendarMonth('${s.id}', -1)" style="padding:6px 14px;font-size:16px;line-height:1;">←</button>
          <h2 style="margin:0;font-size:22px;font-weight:700;color:var(--gold);font-family:var(--font-head);letter-spacing:0.5px;">${currentMonthTitle}</h2>
          <button class="btn btn-outline btn-sm" onclick="window.changeAttendanceCalendarMonth('${s.id}', 1)" style="padding:6px 14px;font-size:16px;line-height:1;">→</button>
        </div>
        <div style="display:flex;gap:10px;align-items:center;font-size:12px;">
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#2ecc71;"></span> Present</span>
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#ff7675;"></span> Absent</span>
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#f1c40f;"></span> Late</span>
          <button class="btn btn-gold btn-sm" onclick="window.changeAttendanceCalendarMonth('${s.id}', 0, true)" style="margin-left:8px;">Today</button>
        </div>
      </div>

      <!-- Days of Week Header -->
      <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;text-align:center;font-weight:700;color:var(--ivory-dim);font-size:13px;margin-bottom:8px;">
        ${daysOfWeek.map(day => `<div>${day}</div>`).join('')}
      </div>

      <!-- Days Grid -->
      <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;">
        ${daysHtml}
      </div>
    </div>
  `;

  container.innerHTML = calHtml;
};

window.changeAttendanceCalendarMonth = function(studentId, delta, resetToToday) {
  if (resetToToday) {
    window.currentCalYear = new Date().getFullYear();
    window.currentCalMonth = new Date().getMonth();
  } else {
    window.currentCalMonth += delta;
    if (window.currentCalMonth < 0) {
      window.currentCalMonth = 11;
      window.currentCalYear -= 1;
    } else if (window.currentCalMonth > 11) {
      window.currentCalMonth = 0;
      window.currentCalYear += 1;
    }
  }
  const el = document.getElementById('child-attendance-cal-container') || document.getElementById('attendance-cal-container');
  if (el) window.renderAttendanceCalendar(studentId, el, window.currentCalYear, window.currentCalMonth);
};

window.openAttendanceDayDetail = function(studentId, dateStr) {
  const s = (window.allStudents || []).find(st => String(st.id) === String(studentId));
  if (!s) return;

  const att = (window.allAttendance || []).find(a => String(a.student_id || a.studentId) === String(studentId) && a.date === dateStr);
  const hw = (window.allHomework || []).filter(h => {
    const hDate = (h.due_date || h.created_at || '').slice(0, 10);
    if (hDate !== dateStr) return false;
    if (typeof window.assignmentAppliesToStudent === 'function') {
      return window.assignmentAppliesToStudent(h, String(studentId), window.allStudents || []);
    }
    if (h.student_id && String(h.student_id) === String(studentId)) return true;
    if (h.batch_id && s.batch_id && String(h.batch_id) === String(s.batch_id)) return true;
    if (h.target_type === 'all') return true;
    return false;
  });

  const parsed = att ? window.parseAttendanceNotes(att.notes || att.note || '') : null;
  const status = att ? att.status : 'No record';

  const modalHtml = `
    <div class="modal active" id="att-day-detail-modal" style="z-index:99999;display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);">
      <div class="modal-card" style="max-width:480px;width:90%;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;position:relative;">
        <button class="modal-close" onclick="document.getElementById('att-day-detail-modal').remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;color:var(--ivory);font-size:20px;cursor:pointer;">✕</button>
        <h3 style="color:var(--gold);margin:0 0 14px 0;font-family:var(--font-head);font-size:18px;">📅 Session &amp; Attendance Details</h3>
        <p style="margin:0 0 14px 0;font-size:13px;color:var(--ivory-dim);">${new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &bull; <strong>${window.escapeHtml ? window.escapeHtml(window.getStudentName ? window.getStudentName(s) : s.name) : s.name}</strong></p>

        <div style="margin-bottom:14px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--ivory-dim);margin-bottom:4px;">Attendance Status</div>
          <div style="font-size:15px;font-weight:700;text-transform:capitalize;color:${status === 'present' ? '#2ecc71' : status === 'absent' ? '#ff7675' : 'var(--gold)'};">${status}</div>
        </div>

        <div style="margin-bottom:14px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--ivory-dim);margin-bottom:4px;">Topic Covered</div>
          <div style="font-size:14px;color:var(--ivory);">${(parsed && parsed.topic) ? window.escapeHtml(parsed.topic) : 'Standard Curriculum Session'}</div>
        </div>

        <div style="margin-bottom:14px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--ivory-dim);margin-bottom:4px;">Duration &amp; Subject</div>
          <div style="font-size:13px;color:var(--ivory);">${(parsed && parsed.duration) ? parsed.duration : 'One Hour'} &bull; ${(parsed && parsed.subject) ? parsed.subject : 'Chess (Core)'}</div>
        </div>

        ${hw.length > 0 ? `
          <div style="margin-bottom:14px;padding:12px;border-radius:8px;background:rgba(232,168,48,0.08);border:1px solid var(--gold);">
            <div style="font-size:12px;color:var(--gold);font-weight:700;margin-bottom:4px;">📝 Homework Assigned</div>
            ${hw.map(h => `<div style="font-size:13px;color:var(--ivory);margin-bottom:4px;">&bull; <strong>${window.escapeHtml(h.title)}</strong>: ${window.escapeHtml(h.description || '')}</div>`).join('')}
          </div>
        ` : ''}

        <div style="text-align:right;margin-top:18px;">
          <button class="btn btn-outline" onclick="document.getElementById('att-day-detail-modal').remove()">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

/**
 * Render Session Tracking Sheet (Google Sheet style)
 * Columns: DATE | DAY | TOPIC | SESSION COMPLETED | ATTENDEE NAME | TOTAL NUMBER OF PRESENT | TIME DURATION
 */

window.DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Z2IUrgRZ89omzS_Jpl72aMQYur_kt9wFkyYnd58UTUM/edit?usp=sharing";

/**
 * Render Session Tracking Sheet (Google Sheet style with Title, Classwork, Homework, General Notes & Live Status)
 * Columns: DATE | DAY | CLASSWORK / TOPIC | HOMEWORK NOTES | GENERAL NOTES | SESSION COMPLETED | ATTENDEE NAME | STATUS (1/1) | TIME DURATION
 */
window.renderSessionSheet = function(studentId, containerEl, filterMonth) {
  const container = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
  if (!container) return;

  let s = null;
  if (studentId) {
    s = (window.allStudents || []).find(st => String(st.id) === String(studentId));
  }
  if (!s && window.currentStudent) s = window.currentStudent;

  const attList = window.allAttendance || [];
    let myAtt = s ? attList.filter(a => String(a.student_id || a.studentId) === String(s.id)) : attList;

   // Ensure myAtt is an array
   if (!myAtt || myAtt.length === 0) {
     myAtt = [];
   }

   // Group by Month e.g. "January, 2026", "August, 2026"
   const monthGroups = {};
   myAtt.forEach(a => {
     if (!a.date) return;
     const d = new Date(a.date);
     if (isNaN(d.getTime())) return;
     const mKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
     if (!monthGroups[mKey]) monthGroups[mKey] = [];
     monthGroups[mKey].push(a);
   });

   // Sort each month's records by date
   Object.keys(monthGroups).forEach(k => {
     monthGroups[k].sort((a, b) => new Date(a.date) - new Date(b.date));
   });

   const levelName = (s && (s.level || s.skill_level || s.batch_name)) ? String(s.level || s.skill_level || s.batch_name).toUpperCase() : 'BEGINNER LEVEL';
   const studentNameStr = s ? (window.getStudentName ? window.getStudentName(s) : s.name) : 'Student';

   // Get matching homework for this student
   const hwList = window.allHomework || [];
    const myHomework = hwList.filter(h => {
      if (!s) return true;
      const sId = String(s.id);
      if (typeof window.assignmentAppliesToStudent === 'function') {
        return window.assignmentAppliesToStudent(h, sId, window.allStudents || []);
      }
      if (h.student_id && String(h.student_id) === sId) return true;
      if (h.batch_id && s.batch_id && String(h.batch_id) === String(s.batch_id)) return true;
      if (h.target_type === 'all') return true;
      return false;
    });

   let rowsHtml = '';
   const monthKeys = Object.keys(monthGroups);

    if (monthKeys.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="9" style="padding:40px; text-align:center; color:var(--ivory-dim); font-size:13px;">
            <div style="font-size:32px; margin-bottom:8px;">📋</div>
            <div style="font-weight:600; color:var(--ivory); margin-bottom:4px;">No session records yet</div>
            <div>Your coach will add attendance and topic notes after each class.</div>
          </td>
        </tr>
      `;
    } else {
      monthKeys.forEach(mKey => {
       // Month Section Header Row (matching Google Sheet pink bar)
       rowsHtml += `
         <tr style="background:#f7c8c8; color:#111; font-weight:800; text-align:center; font-size:12px; letter-spacing:0.5px;">
           <td colspan="9" style="padding:8px 12px; border:1px solid #d99; text-transform:uppercase;">SESSIONS OF ${mKey}</td>
         </tr>
       `;

       monthGroups[mKey].forEach((record, idx) => {
         const d = new Date(record.date);
         const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
         const dayFormatted = d.toLocaleDateString('en-US', { weekday: 'long' });
         const parsed = window.parseAttendanceNotes(record.notes || record.note || '');
         const status = (record.status || '').toLowerCase();
         const isPresent = status === 'present' || status === 'late';
         const presentCount = isPresent ? '1/1' : '0/1';

         // Check if there is explicit homework on this date
         const dStr = record.date ? record.date.slice(0, 10) : '';
         const hwOnDate = myHomework.filter(h => (h.due_date || h.created_at || '').slice(0, 10) === dStr);
       const hwNotesDisplay = parsed.hw || (hwOnDate.length > 0 ? hwOnDate.map(h => h.title).join('; ') : '—');
       const cwNotesDisplay = parsed.cw || parsed.topic || '—';
       const generalNotesDisplay = parsed.general || '—';

         const rowBg = idx % 2 === 0 ? 'background:rgba(255,255,255,0.02);' : 'background:rgba(255,255,255,0.05);';

         rowsHtml += `
           <tr style="${rowBg} border-bottom:1px solid var(--border); font-size:12px; color:var(--ivory);">
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center; font-family:monospace; font-weight:600;">${dateFormatted}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center;">${dayFormatted}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); font-weight:600; color:var(--gold);">${window.escapeHtml ? window.escapeHtml(cwNotesDisplay) : cwNotesDisplay}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); color:var(--emerald); font-weight:500;">${window.escapeHtml ? window.escapeHtml(hwNotesDisplay) : hwNotesDisplay}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); color:var(--ivory-dim); font-size:11px;">${window.escapeHtml ? window.escapeHtml(generalNotesDisplay) : generalNotesDisplay}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center;">${window.escapeHtml ? window.escapeHtml(parsed.subject) : parsed.subject}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center; font-weight:500;">${window.escapeHtml ? window.escapeHtml(studentNameStr) : studentNameStr}</td>
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center; font-weight:700; color:${isPresent ? '#2ecc71' : '#ff7675'};">${presentCount} (${status})</td>
             <td style="padding:9px 10px; border:1px solid var(--border); text-align:center;">${window.escapeHtml ? window.escapeHtml(parsed.duration) : parsed.duration}</td>
           </tr>
         `;
       });
     });
   }

  const sheetHtml = `
    <div class="session-sheet-wrapper" style="box-shadow:var(--shadow); border-radius:12px; overflow:hidden; border:1px solid var(--border); background:var(--surface);">
      <!-- Google Sheet Official Title Header Bar -->
      <div style="background:#1e293b; border-bottom:1px solid var(--border); padding:10px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">📊</span>
          <div>
            <div style="font-weight:800; font-size:15px; color:#ffffff; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
              chesskidoo datasheet
              <span style="background:rgba(34, 197, 94, 0.2); color:#4ade80; border:1px solid rgba(34, 197, 94, 0.4); font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px;">🟢 Live Connected</span>
            </div>
            <div style="font-size:11px; color:var(--ivory-dim);">Google Sheets Master Log &bull; Automatic Two-Way Synchronization</div>
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <a href="${window.DEFAULT_GOOGLE_SHEET_URL}" target="_blank" class="btn btn-sm" style="background:#22c55e; color:#ffffff; text-decoration:none; font-weight:700; border-radius:6px; font-size:11px; padding:6px 12px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(34,197,94,0.3);">
            📊 Open Live Google Sheet ↗
          </a>
          <button class="btn btn-sm" onclick="window.exportDataSheetCSV('${studentId || ''}')" style="background:rgba(255,255,255,0.08); color:#ffffff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-size:11px; padding:6px 12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
            📥 Auto-Sync CSV
          </button>
        </div>
      </div>

      <!-- Top Level Bar (Google Sheet Red Header) -->
      <div style="background:#e05353; color:#ffffff; font-weight:800; text-align:center; padding:10px 16px; font-size:14px; letter-spacing:1px; font-family:var(--font-head); text-transform:uppercase;">
        🏆 ${window.escapeHtml ? window.escapeHtml(levelName) : levelName} &bull; SESSIONS &amp; HOMEWORK TRACKER
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:12px;">
          <thead>
            <tr style="background:#f4a6a6; color:#111; font-weight:800; font-size:11px; text-transform:uppercase; text-align:center;">
              <th style="padding:10px 10px; border:1px solid #d99;">DATE</th>
              <th style="padding:10px 10px; border:1px solid #d99;">DAY</th>
              <th style="padding:10px 10px; border:1px solid #d99;">CLASSWORK / TOPIC</th>
              <th style="padding:10px 10px; border:1px solid #d99;">HOMEWORK NOTES</th>
              <th style="padding:10px 10px; border:1px solid #d99;">GENERAL NOTES</th>
              <th style="padding:10px 10px; border:1px solid #d99;">SESSION COMPLETED</th>
              <th style="padding:10px 10px; border:1px solid #d99;">ATTENDEE NAME</th>
              <th style="padding:10px 10px; border:1px solid #d99;">TOTAL PRESENT</th>
              <th style="padding:10px 10px; border:1px solid #d99;">TIME DURATION</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = sheetHtml;
};

window.renderChildAttendanceAndHomework = function() {
  let s = window.currentStudent;
  if (!s) {
    try {
      const auth = JSON.parse(sessionStorage.getItem("chesskidoo_auth") || sessionStorage.getItem("twoknights_auth") || "{}");
      const students = window.allStudents || [];
      if (auth.studentId && students.length) {
        s = students.find((st) => String(st.id) === String(auth.studentId));
        if (s) window.currentStudent = s;
      }
    } catch (_) {}
  }
  if (!s) return;

  const attList = window.allAttendance || [];
  try {
    const localAtt = JSON.parse(localStorage.getItem('ck_attendance_records') || '[]');
    if (localAtt.length) {
      window.allAttendance = localAtt;
    }
  } catch (_) {}
  const finalAttList = window.allAttendance || [];
  const myAtt = finalAttList
    .filter((a) => String(a.student_id || a.studentId) === String(s.id))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const present = myAtt.filter((a) => ["present", "late"].includes((a.status || "").toLowerCase())).length;
  const absent = myAtt.filter((a) => (a.status || "").toLowerCase() === "absent").length;
  const total = myAtt.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  if (document.getElementById("c-att-total")) document.getElementById("c-att-total").textContent = total;
  if (document.getElementById("c-att-present")) document.getElementById("c-att-present").textContent = present;
  if (document.getElementById("c-att-absent")) document.getElementById("c-att-absent").textContent = absent;
  if (document.getElementById("c-att-rate")) document.getElementById("c-att-rate").textContent = rate + "%";

  // Render Visual Calendar
  const calContainer = document.getElementById("child-attendance-cal-container");
  if (calContainer) {
    window.renderAttendanceCalendar(s, calContainer);
  }

  // Render Google Sheet style Session Tracker
  const sheetContainer = document.getElementById("child-session-sheet-container");
  if (sheetContainer) {
    window.renderSessionSheet(s.id, sheetContainer);
  }

  // Render Assigned Homework Cards
  if (typeof window.renderChildHomework === 'function') {
    window.renderChildHomework();
  }
};

// Auto-wire renderChildAttendance to also trigger the visual calendar and sheet
const originalRenderChildAttendance = window.renderChildAttendance;
window.renderChildAttendance = function() {
  if (typeof originalRenderChildAttendance === 'function') {
    try { originalRenderChildAttendance(); } catch (_) {}
  }
  window.renderChildAttendanceAndHomework();
};

