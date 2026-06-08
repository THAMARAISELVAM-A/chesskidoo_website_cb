/* assets/js/matrix.js --------------------------------------------------
   Dynamic Master Schedule Matrix
------------------------------------------------------------------------ */
(function() {
  'use strict';
  
  window.CK = window.CK || {};
  CK.matrix = CK.matrix || {};

  // Coach color mapping based on the original HTML classes
  const coachColors = {
    'ROHITH SELVARAJ': 'var(--p-rose)',
    'RANJITH': 'var(--p-teal)',
    'GYANASURYA': 'var(--p-gold)',
    'ARIVUSELVAM': 'var(--p-blue)',
    'YOGESH': 'var(--p-purple)',
    'SUDHIN': '#f59e0b',
    'VASANTH KUMAR': '#10b981',
    'VISHNU': '#3b82f6'
  };

  function getCoachColor(coachName) {
    // try to match by partial name if exact match fails
    if (coachColors[coachName]) return coachColors[coachName];
    const upperName = coachName.toUpperCase();
    for (const key of Object.keys(coachColors)) {
      if (upperName.includes(key)) return coachColors[key];
    }
    return 'var(--p-gold-dim)';
  }

  CK.matrix.render = async function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch data
    const coaches = (await CK.db.getProfiles('coach')) || [];
    let batches = [];
    if (CK.db.getBatches) {
      batches = await CK.db.getBatches();
    } else {
      batches = JSON.parse(localStorage.getItem('ck_db_batches') || '[]');
    }

    // --- Dynamic Sync: Map live students to their assigned batches ---
    const allStudents = (await CK.db.getProfiles('student')) || [];
    batches.forEach(b => {
      const enrolled = allStudents.filter(s => s.batch === b.batchName);
      b.students = enrolled.map(s => s.full_name);
    });
    // -----------------------------------------------------------------
    
    const userRole = CK.currentUser ? CK.currentUser.role : 'student';
    const userName = CK.currentUser ? CK.currentUser.full_name : '';

    let studentBatches = [];
    if (userRole === 'student') {
       studentBatches = batches.filter(b => b.students && b.students.some(s => s.toLowerCase() === userName.toLowerCase()));
    }

    let displayCoaches = coaches;
    if (userRole === 'coach') {
      displayCoaches = coaches.filter(c => c.full_name && c.full_name.toLowerCase() === userName.toLowerCase());
      if (displayCoaches.length === 0) displayCoaches = [{ full_name: userName, level: 'Coach' }];
    }

    // Group batches by days combination
    const dayGroups = {};
    batches.forEach(b => {
      if (!b.days || b.days.length === 0) return;
      const dayStr = b.days.join(', ');
      if (!dayGroups[dayStr]) dayGroups[dayStr] = [];
      dayGroups[dayStr].push(b);
    });

    let html = `
      <div class="mm-wrapper" style="font-family: var(--font-display); background-color: var(--p-surface1); color: #ffffff; padding:16px; border-radius:var(--p-radius); overflow-x:auto;">
        <table class="mm-table" style="width: 100%; border-collapse: separate; border-spacing: 4px; text-align: center; min-width: 800px;">
          <thead>
            <tr>
              <th style="padding: 16px 12px; background: rgba(0,0,0,0.4); border-radius: 8px; color: var(--p-text-muted); font-weight: 600; font-size: 0.9rem;">Days / Time</th>
    `;

    displayCoaches.forEach(c => {
      html += `<th style="padding: 16px 12px; background: rgba(0,0,0,0.4); border-radius: 8px; color: var(--p-text); font-weight: 600; font-size: 0.95rem;">${CK.esc(c.full_name)} <br><small style="color: var(--p-gold); font-size: 0.75rem; font-weight: normal; margin-top: 4px; display: inline-block;">(${CK.esc(c.level || 'Coach')})</small></th>`;
    });

    html += `</tr></thead><tbody>`;

    // Ensure some day groups exist even if empty, or just render the ones that exist.
    // Order them roughly Mon-Sun if possible.
    const orderedDayStrs = Object.keys(dayGroups).sort((a,b) => {
       const daysOrder = { 'Mon':1, 'Tue':2, 'Wed':3, 'Thu':4, 'Fri':5, 'Sat':6, 'Sun':7 };
       const aFirst = a.split(',')[0].trim();
       const bFirst = b.split(',')[0].trim();
       return (daysOrder[aFirst]||99) - (daysOrder[bFirst]||99);
    });

    orderedDayStrs.forEach(dayStr => {
      const dayBatches = dayGroups[dayStr];
      html += `<tr>
        <td style="padding: 16px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-weight: 600; font-size: 0.9rem; color: var(--p-gold-dim); vertical-align: middle;">${CK.esc(dayStr)}</td>
      `;

      displayCoaches.forEach(c => {
        const coachBatches = dayBatches.filter(b => b.coach && b.coach.toLowerCase() === c.full_name.toLowerCase());
        html += `<td style="padding: 12px; background: rgba(255,255,255,0.015); border-radius: 8px; vertical-align: top;">`;
        
        if (coachBatches.length > 0) {
          coachBatches.forEach(b => {
            const isHighlighted = userRole === 'student' && studentBatches.some(sb => sb.id === b.id);
            const opacity = (userRole === 'student' && !isHighlighted && studentBatches.length > 0) ? '0.2' : '1';
            const cursor = (userRole === 'admin' || (userRole === 'coach' && c.full_name && c.full_name.toLowerCase() === userName.toLowerCase()) || isHighlighted) ? 'pointer' : 'default';
            const color = getCoachColor(c.full_name);

            const clickAction = isHighlighted ? `CK.matrix.joinClass('${b.id}')` : `if('${cursor}'==='pointer') CK.matrix.editBatch('${b.id}')`;

            html += `
              <div onclick="${clickAction}" 
                   style="background: ${color}; opacity: ${opacity}; color: #fff; padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: ${cursor}; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-size: 0.85rem; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                   onmouseover="if('${cursor}'==='pointer') { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'; }"
                   onmouseout="if('${cursor}'==='pointer') { this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; }">
                <div style="font-weight: 700; margin-bottom: 4px; font-size: 0.9rem;">${CK.esc(b.time || '')}</div>
                <div style="opacity: 0.95; font-size: 0.8rem; margin-bottom: 6px;">${CK.esc(b.batchName ? b.batchName.split(' ').slice(2).join(' ') : 'Batch')}</div>
                <div style="font-size: 0.75rem; opacity: 0.8; font-weight: 600; background: rgba(0,0,0,0.15); padding: 2px 6px; border-radius: 4px; display: inline-block;">👤 ${b.students ? b.students.length : 0} Students</div>
              </div>
            `;
          });
        } else {
          html += `<div style="opacity: 0.15; font-size: 1.2rem; margin: 16px 0;">-</div>`;
        }
        
        // Add new batch button for Admin or Coach
        if (userRole === 'admin' || (userRole === 'coach' && c.full_name && c.full_name.toLowerCase() === userName.toLowerCase())) {
          html += `
            <div onclick="CK.matrix.addBatch('${CK.esc(c.full_name)}', '${CK.esc(dayStr)}')" 
                 style="border: 1px dashed var(--p-border); background: rgba(255,255,255,0.02); opacity: 0.5; padding: 6px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-top: 8px; transition: opacity 0.2s;"
                 onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">
              + Add Slot
            </div>
          `;
        }

        html += `</td>`;
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  };

  CK.matrix.joinClass = async function(batchId) {
    let batches = [];
    if (CK.db.getBatches) batches = await CK.db.getBatches();
    else batches = JSON.parse(localStorage.getItem('ck_db_batches') || '[]');
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const allMeetings = CK.schedulePro ? await CK.schedulePro.get() : JSON.parse(localStorage.getItem('ck_meetings') || '[]');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMeeting = allMeetings.find(m => m.batch === batch.batchName && m.date === todayStr);

    if (todayMeeting && todayMeeting.link) {
      window.open(todayMeeting.link, '_blank');
    } else {
      CK.showToast('No active meeting link for today yet. It will be generated before class.', 'info');
    }
  };

  CK.matrix.editBatch = async function(batchId) {
    const userRole = CK.currentUser ? CK.currentUser.role : 'student';
    if (userRole === 'student') return;

    let batches = [];
    if (CK.db.getBatches) batches = await CK.db.getBatches();
    else batches = JSON.parse(localStorage.getItem('ck_db_batches') || '[]');
    
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    if (userRole === 'coach' && CK.currentUser && CK.currentUser.full_name && batch.coach && CK.currentUser.full_name.toLowerCase() !== batch.coach.toLowerCase()) return;

    const action = await CK.prompt(`Editing: ${batch.batchName}\n\nType 'time' to edit time, 'students' to manage students, or 'delete' to remove:`, 'time');
    
    if (action === 'time') {
      const newTime = await CK.prompt(`Enter new time for ${batch.batchName}:`, batch.time);
      if (newTime) {
        batch.time = newTime;
        await saveBatchData(batch);
        CK.showToast('Batch time updated', 'success');
        CK.matrix.render('master-schedule-matrix');
      }
    } else if (action === 'students') {
      const studs = await CK.prompt(`Edit students (comma separated):`, (batch.students || []).join(', '));
      if (studs !== null) {
        batch.students = studs.split(',').map(s => s.trim()).filter(s => s);
        await saveBatchData(batch);
        CK.showToast('Batch students updated', 'success');
        CK.matrix.render('master-schedule-matrix');
      }
    } else if (action === 'delete') {
      if (await CK.confirm(`Delete ${batch.batchName}?`)) {
        await deleteBatchData(batchId);
        CK.showToast('Batch deleted', 'success');
        CK.matrix.render('master-schedule-matrix');
      }
    }
  };

  CK.matrix.addBatch = async function(coachName, dayStr) {
    const time = await CK.prompt(`Enter time slot for ${coachName} on ${dayStr} (e.g. 5:00 PM - 6:00 PM):`);
    if (!time) return;

    const batchName = await CK.prompt(`Enter batch name (e.g. Batch 5):`);
    if (!batchName) return;

    const newBatch = {
      id: 'b-' + Date.now(),
      coach: coachName,
      batchName: `${coachName} ${batchName} ${time}`,
      time: time,
      days: dayStr.split(',').map(s => s.trim()),
      students: []
    };

    await saveBatchData(newBatch);
    CK.showToast('Batch added', 'success');
    CK.matrix.render('master-schedule-matrix');
  };

  async function saveBatchData(batch) {
    if (CK.db.saveBatch) {
      await CK.db.saveBatch(batch);
    } else {
      const batches = JSON.parse(localStorage.getItem('ck_db_batches') || '[]');
      const idx = batches.findIndex(b => b.id === batch.id);
      if (idx >= 0) batches[idx] = batch;
      else batches.push(batch);
      localStorage.setItem('ck_db_batches', JSON.stringify(batches));
    }
  }

  async function deleteBatchData(batchId) {
    if (CK.db.deleteBatch) {
      await CK.db.deleteBatch(batchId);
    } else {
      let batches = JSON.parse(localStorage.getItem('ck_db_batches') || '[]');
      batches = batches.filter(b => b.id !== batchId);
      localStorage.setItem('ck_db_batches', JSON.stringify(batches));
    }
  }

})();
