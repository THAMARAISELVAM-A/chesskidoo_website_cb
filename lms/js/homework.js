(function () {
  const $ = (id) => document.getElementById(id);
  let homeworkSelectedIds = new Set();
  let homeworkCalendarMonth = new Date();
  let editingHomeworkFiles = [];
  let editingHomeworkRemovedIds = new Set();
  let editingHomeworkNewFiles = [];

  function studentName(student) {
    return window.getStudentName ? window.getStudentName(student) : (student && (student.name || student.full_name || student.id)) || 'Student';
  }

  function batchName(batch) {
    return (batch && (batch.name || batch.id)) || 'Batch';
  }

  function escapeValue(value) {
    return window.escapeHtml ? window.escapeHtml(value) : String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function getRole() {
    // Auth lives in sessionStorage (see auth.js) — this used to read
    // localStorage, which nothing writes, so isAdminUser() was always false
    // and admins were blocked from their own bulk edit/delete actions.
    if (window.role) return String(window.role).toLowerCase();
    try {
      const auth = JSON.parse(sessionStorage.getItem('chesskidoo_auth') || sessionStorage.getItem('twoknights_auth') || '{}');
      return (auth.role || '').toLowerCase();
    } catch {
      return '';
    }
  }

  function isAdminUser() {
    const role = getRole();
    return role === 'admin' || role === 'master';
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function safeUrl(url) {
    if (!url) return '#';
    const str = String(url).trim();
    if (!str) return '#';
    if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(str)) {
      return escapeValue(str);
    }
    if (/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(str)) {
      return 'https://' + escapeValue(str);
    }
    return '#';
  }

  function linkifyText(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      result += escapeValue(text.slice(lastIndex, match.index));
      const url = match[0];
      const href = url.startsWith('www.') ? 'https://' + url : url;
      result += `<a href="${safeUrl(href)}" target="_blank" rel="noopener" style="color:var(--gold); text-decoration:underline;">${escapeValue(url)}</a>`;
      lastIndex = urlRegex.lastIndex;
    }
    result += escapeValue(text.slice(lastIndex));
    return result;
  }

  function extractReferenceLinks(description) {
    if (!description) return [];
    const lines = description.split('\n');
    const links = [];
    let collecting = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('reference links:')) {
        collecting = true;
        continue;
      }
      if (collecting) {
        if (trimmed.startsWith('- ')) {
          const url = trimmed.slice(2).trim();
          if (url) links.push(url);
        } else if (trimmed === '') {
          continue;
        } else {
          break;
        }
      }
    }
    return links;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function parseDateKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function getBatchStudentIds(batch, students = []) {
    const ids = new Set();
    if (batch) {
      const rawIds = Array.isArray(batch.student_ids) 
        ? batch.student_ids 
        : (window.parseStudentIds ? window.parseStudentIds(batch.student_ids) : []);
      rawIds.forEach((id) => ids.add(String(id)));
    }
    students.forEach((student) => {
      if (student && batch) {
        if (student.batch_id && String(student.batch_id) === String(batch.id)) ids.add(String(student.id));
        if (student.batch && (String(student.batch) === String(batch.name) || String(student.batch) === String(batch.batch_name) || String(student.batch) === String(batch.id))) {
          ids.add(String(student.id));
        }
      }
    });
    return Array.from(ids);
  }

  function assignmentAppliesToStudent(assignment, studentId, students = []) {
    if (!assignment || !studentId) return false;
    const sid = String(studentId);
    const targetType = (assignment.target_type || 'all').toLowerCase();

    let presentIds = assignment.present_student_ids;
    if (typeof presentIds === 'string') {
      try {
        presentIds = JSON.parse(presentIds);
      } catch (_) {}
    }
    if (Array.isArray(presentIds) && presentIds.length) {
      return presentIds.some((id) => String(id) === sid);
    }

    if (targetType === 'all' || !assignment.target_type) return true;

    if (targetType === 'student') {
      const assignedStudentId = String(assignment.student_id || assignment.target_value || assignment.target_id || '');
      return assignedStudentId === sid;
    }

    if (targetType === 'batch') {
      const assignedBatchId = String(assignment.batch_id || assignment.target_value || assignment.target_id || '');
      const assignedBatchName = String(assignment.batch_name || assignment.target_value || '');
      const student = (students || []).find((item) => String(item.id) === sid);
      
      if (student) {
        if (student.batch_id && (String(student.batch_id) === assignedBatchId || String(student.batch_id) === assignedBatchName)) return true;
        if (student.batch && (String(student.batch) === assignedBatchId || String(student.batch) === assignedBatchName)) return true;
      }

      const batches = window.allBatches || [];
      const batch = (assignment && assignment._batch) || batches.find(b => String(b.id) === assignedBatchId || String(b.name) === assignedBatchId || String(b.name) === assignedBatchName || String(b.batch_name) === assignedBatchName);
      if (batch) {
        return getBatchStudentIds(batch, students).includes(sid);
      }
    }
    return false;
  }

  function isStudentEligibleForHomework(assignment, studentId) {
    if (!assignment || !studentId) return false;
    const sid = String(studentId);
    const dueDate = assignment.due_date;
    if (!dueDate) return true;

    const attList = window.allAttendance || [];
    const dayRecord = attList.find(a => {
      const recordStudentId = String(a.student_id || a.studentId || '');
      return recordStudentId === sid && a.date === dueDate;
    });

    if (!dayRecord) return true;

    const status = (dayRecord.status || '').toLowerCase();
    if (status === 'no class') return false;
    return status === 'present' || status === 'late';
  }

  function assignmentAppliesToBatch(assignment, batchId, students = [], batches = []) {
    if (!assignment || !batchId) return false;
    const bid = String(batchId);
    const targetType = (assignment.target_type || 'all').toLowerCase();
    if (targetType === 'all' || !assignment.target_type) return true;
    if (targetType === 'batch') {
      const assignedBatchId = String(assignment.batch_id || assignment.target_value || assignment.target_id || '');
      const assignedBatchName = String(assignment.batch_name || assignment.target_value || '');
      return assignedBatchId === bid || assignedBatchName === bid;
    }
    if (targetType === 'student') {
      const assignedStudentId = String(assignment.student_id || assignment.target_value || assignment.target_id || '');
      const direct = students.some((student) => String(student.id) === assignedStudentId && (String(student.batch_id) === bid || String(student.batch) === bid));
      if (direct) return true;
      return batches.some((batch) => (String(batch.id) === bid || String(batch.name) === bid) && getBatchStudentIds(batch, students).includes(assignedStudentId));
    }
    return false;
  }

  function formatDate(value) {
    if (!value) return 'No due date';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return escapeValue(value);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function sortHomework(items) {
    return [...(items || [])].sort((a, b) => {
      const aDue = a.due_date || '9999-12-31';
      const bDue = b.due_date || '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }

  function statusBadge(status) {
    const normalized = (status || 'active').toLowerCase();
    const style = normalized === 'completed' ? 'badge-success' : normalized === 'archived' ? 'badge-outline' : 'badge-level';
    return `<span class="badge ${style}">${escapeValue(status || 'Active')}</span>`;
  }

  function submissionStatusBadge(status) {
    const normalized = (status || 'not_submitted').toLowerCase();
    const style = normalized === 'approved' ? 'badge-success' : normalized === 'needs_revision' ? 'badge-danger' : normalized === 'closed' ? 'badge-outline' : 'badge-level';
    const label = normalized === 'not_submitted' ? 'Not submitted' : normalized;
    return `<span class="badge ${style}">${escapeValue(label)}</span>`;
  }

  function submissionActionLabel(status) {
    const normalized = (status || 'not_submitted').toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'closed') return 'Closed';
    if (normalized === 'needs_revision') return 'Resubmit';
    return 'Submit';
  }

  function assigneeKey(assignment) {
    if (assignment.target_type === 'student') return `student:${assignment.student_id}`;
    if (assignment.target_type === 'batch') return `batch:${assignment.batch_id}`;
    return 'all:all';
  }

  function assigneeLabel(assignment) {
    // Fall back to resolving the name from the loaded rosters — the API only
    // sends student_name/batch_name on some responses, and a bare "Student" /
    // "Batch" label tells a parent or coach nothing about who it is for.
    if (assignment.target_type === 'student') {
      if (assignment.student_name || assignment.recipient_label) return assignment.student_name || assignment.recipient_label;
      const s = (window.allStudents || []).find((item) => String(item.id) === String(assignment.student_id));
      return s ? studentName(s) : 'Student';
    }
    if (assignment.target_type === 'batch') {
      if (assignment.batch_name || assignment.recipient_label) return assignment.batch_name || assignment.recipient_label;
      const b = (window.allBatches || []).find((item) => String(item.id) === String(assignment.batch_id));
      return b ? batchName(b) : 'Batch';
    }
    return 'All Students';
  }

  function coachNameForHomework(assignment) {
    if (!assignment.created_by) return 'Unknown';
    const coaches = window.allCoaches || [];
    const coach = coaches.find(c => 
      String(c.id) === String(assignment.created_by) || 
      String(c.name).toLowerCase() === String(assignment.created_by).toLowerCase()
    );
    return coach ? (coach.name || coach.full_name || 'Unknown') : (assignment.created_by || 'Unknown');
  }

  // recipient_count is computed server-side; when it is absent (cached rows,
  // older responses) derive it locally instead of rendering a misleading 0.
  function recipientCount(assignment) {
    if (typeof assignment.recipient_count === 'number') return assignment.recipient_count;
    let presentIds = assignment.present_student_ids;
    if (typeof presentIds === 'string') {
      try { presentIds = JSON.parse(presentIds); } catch (_) {}
    }
    if (Array.isArray(presentIds) && presentIds.length) return presentIds.length;
    const students = window.allStudents || [];
    if (assignment.target_type === 'student') return 1;
    if (assignment.target_type === 'batch') {
      const b = (window.allBatches || []).find((item) => String(item.id) === String(assignment.batch_id));
      return b ? getBatchStudentIds(b, students).length : 0;
    }
    return students.filter((s) => (s.status || 'active').toLowerCase() === 'active').length || students.length;
  }

   function getFilteredHomework() {
    const month = $('homework-month-filter') ? $('homework-month-filter').value : monthKey(homeworkCalendarMonth);
    const assignee = $('homework-assignee-filter') ? $('homework-assignee-filter').value : '';
    const status = $('homework-status-filter') ? $('homework-status-filter').value : '';
    const [year, monthNumber] = (month || monthKey(homeworkCalendarMonth)).split('-').map(Number);
    const query = ($('homework-search') ? $('homework-search').value : '').toLowerCase().trim();
    const coachSelect = $('homework-coach-filter');
    let selectedCoachId = '';
    if (coachSelect) {
      selectedCoachId = coachSelect.value;
      const coaches = window.allCoaches || [];
      coachSelect.innerHTML = '<option value="">All Coaches</option>' + coaches
        .map(c => `<option value="${escapeValue(c.id)}" ${selectedCoachId === c.id ? 'selected' : ''}>Coach: ${escapeValue(c.name || c.full_name || 'Coach #' + c.id)}</option>`)
        .join('');
      if (selectedCoachId) coachSelect.value = selectedCoachId;
    }

    const coachFilter = getCoachFilterPredicate();
    const myStudents = coachFilter ? (window.allStudents || []).filter(s => coachFilter(s)) : null;
    const coachStudentIds = myStudents ? new Set(myStudents.map(s => String(s.id))) : null;
    const coachId = window.role === 'coach' ? (window.currentCoachId || window.userId) : null;
    const coachBatchIds = coachId ? new Set((window.allBatches || []).filter(b => window.ckSameCoach ? window.ckSameCoach(b.coach_id, coachId) : String(b.coach_id) === String(coachId)).map(b => String(b.id))) : null;

    return sortHomework((window.allHomework || []).filter((assignment) => {
      if (status && assignment.status !== status) return false;
      if (assignee && assigneeKey(assignment) !== assignee) return false;
      if (query) {
        const hay = (
          (assignment.title || '') + ' ' +
          (assignment.description || '') + ' ' +
          (Array.isArray(assignment.attachment_urls) ? assignment.attachment_urls.join(' ') : '') + ' ' +
          (coachNameForHomework(assignment) || '') + ' ' +
          (assigneeLabel(assignment) || '')
        ).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      // Filter by selected coach
      if (selectedCoachId) {
        const assignmentCoachId = assignment.created_by || assignment.coach_id || '';
        if (String(assignmentCoachId) !== String(selectedCoachId)) return false;
      }
      if (coachStudentIds || coachBatchIds) {
        const appliesToStudent = assignment.target_type === 'student' && coachStudentIds && coachStudentIds.has(String(assignment.student_id));
        const appliesToBatch = assignment.target_type === 'batch' && coachBatchIds && coachBatchIds.has(String(assignment.batch_id));
        const appliesToAll = assignment.target_type === 'all';
        if (!appliesToStudent && !appliesToBatch && !appliesToAll) return false;
      }
      if (!month) return true;
      if (!assignment.due_date) {
        // If there's a search query or assignee/status filter or we are in list view, include no-due-date assignments
        return !!(query || assignee || status || !month);
      }
      const date = parseDateKey(assignment.due_date);
      return !!date && date.getFullYear() === year && date.getMonth() === monthNumber - 1;
    }));
  }

let homeworkSubmissionCache = [];
  window.homeworkSubmissionCache = homeworkSubmissionCache;  // Expose globally for coach dashboard

  async function loadHomeworkSubmissions(forceRefresh = false) {
    if (!forceRefresh && homeworkSubmissionCache.length) return homeworkSubmissionCache;
    let fetched = [];

    // 1. Try Edge API
    try {
      const res = await window.apiCall('/api/homework?view=submissions', { silent: true });
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        fetched = data.data || data || [];
      }
    } catch (_) {}

    // 2. Try Supabase direct
    if (!fetched.length && window.supabaseClient) {
      try {
        const { data: sbSubs } = await window.supabaseClient
          .from('homework_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });
        if (sbSubs && sbSubs.length) fetched = sbSubs;
      } catch (_) {}
    }

    // 3. Merge with localStorage cache
    try {
      const localSubs = JSON.parse(localStorage.getItem('ck_homework_submissions') || '[]');
      const map = new Map();
      fetched.forEach(s => { if (s && s.id) map.set(String(s.id), s); });
      localSubs.forEach(s => {
        if (s && s.id) {
          if (!map.has(String(s.id))) map.set(String(s.id), s);
          else map.set(String(s.id), { ...s, ...map.get(String(s.id)) });
        }
      });
      homeworkSubmissionCache = Array.from(map.values());
    } catch (e) {
      homeworkSubmissionCache = fetched;
    }

    window.homeworkSubmissionCache = homeworkSubmissionCache;
    if (homeworkSubmissionCache.length) {
      try {
        localStorage.setItem('ck_homework_submissions', JSON.stringify(homeworkSubmissionCache));
      } catch (_) {}
    }

    repaintSubmissionViews();
    return homeworkSubmissionCache;
  }

  // Both the admin review list and the coach submissions table read the same
  // cache, so any refresh (success or failure) has to repaint whichever is open.
  function repaintSubmissionViews() {
    const activePage = document.querySelector('.page.active')?.id;
    if (activePage === 'page-homework') renderHomeworkSubmissionReview();
    if (window.renderCoachSubmissions) {
      try {
        window.renderCoachSubmissions(
          document.getElementById('coach-hw-search')?.value || '',
          window.coachSubPage || 1,
        );
      } catch (e) { /* coach view not mounted */ }
    }
  }

  function getCoachFilterPredicate() {
    const role = window.role || (window.currentUser && window.currentUser.role);
    const isCoach = role === 'coach';
    if (!isCoach) return null;

    const currentCoachId = window.currentCoachId || window.userId || (window.currentUser && window.currentUser.id);
    const coaches = window.allCoaches || [];
    const currentCoachObj = coaches.find(c =>
      String(c.id).toLowerCase() === String(currentCoachId).toLowerCase() ||
      (c.email && c.email.toLowerCase() === String(currentCoachId).toLowerCase()) ||
      (c.name && c.name.toLowerCase() === String(currentCoachId).toLowerCase())
    );
    const cId = currentCoachId ? String(currentCoachId).toLowerCase() : '';
    const cProfId = currentCoachObj ? String(currentCoachObj.id).toLowerCase() : '';
    const cName = currentCoachObj ? (currentCoachObj.name || currentCoachObj.full_name || '').toLowerCase() : '';

    return function(entity) {
      if (!entity) return false;
      const eCoach = entity.coach_id || entity.coach || entity.assigned_coach;
      if (window.ckSameCoach && window.ckSameCoach(eCoach, currentCoachId)) return true;
      const eName = String(entity.name || entity.full_name || '').toLowerCase();
      const ecStr = String(eCoach || '').toLowerCase();
      const matchesId = (cId && ecStr.includes(cId)) || (cProfId && ecStr.includes(cProfId));
      const matchesName = cName && (ecStr.includes(cName) || eName.includes(cName));
      return matchesId || matchesName;
    };
  }

  function populateHomeworkSelectors() {
    const targetSelect = $('hw-target-type');
    const studentSelect = $('hw-student-select');
    const batchSelect = $('hw-batch-select');
    const assigneeSelect = $('homework-assignee-filter');

    if (targetSelect && !targetSelect.options.length) {
      targetSelect.innerHTML = `
        <option value="batch">Batch (A–Z)</option>
        <option value="student">Individual Student</option>
        <option value="all">All Active Students</option>
      `;
    }

    const coachFilter = getCoachFilterPredicate();

    if (studentSelect) {
      const studs = coachFilter
        ? (window.allStudents || []).filter(s => coachFilter(s))
        : (window.allStudents || []);
      const options = '<option value="">Select Student</option>' + studs
        .filter((student) => (student.status || 'active') !== 'archived')
        .sort((a, b) => studentName(a).localeCompare(studentName(b)))
        .map((student) => `<option value="${student.id}">${escapeValue(studentName(student))}</option>`)
        .join('');
      studentSelect.innerHTML = options;
      const progressStudentSelect = $('hw-progress-student');
      if (progressStudentSelect) {
        progressStudentSelect.innerHTML = options;
      }
    }

    if (batchSelect) {
      const batches = coachFilter
        ? (window.allBatches || []).filter(b => coachFilter(b))
        : (window.allBatches || []);
      batchSelect.innerHTML = '<option value="">Select Batch</option>' + batches
        .filter((batch) => (batch.status || 'active') !== 'archived')
        .sort((a, b) => batchName(a).localeCompare(batchName(b)))
        .map((batch) => `<option value="${batch.id}">${escapeValue(batchName(batch))}</option>`)
        .join('');
    }

    if (assigneeSelect) {
      const current = assigneeSelect.value;
      const options = new Map([
        ['', 'All Assignees'],
        ['all:all', 'All Students']
      ]);
      const students = coachFilter ? (window.allStudents || []).filter(s => coachFilter(s)) : (window.allStudents || []);
      const batches = coachFilter ? (window.allBatches || []).filter(b => coachFilter(b)) : (window.allBatches || []);
      batches.filter((batch) => (batch.status || 'active') !== 'archived').forEach((batch) => options.set(`batch:${batch.id}`, batchName(batch)));
      students.filter((student) => (student.status || 'active') !== 'archived').forEach((student) => options.set(`student:${student.id}`, studentName(student)));
      (window.allHomework || []).forEach((assignment) => {
        const key = assigneeKey(assignment);
        if (!options.has(key)) options.set(key, assigneeLabel(assignment));
      });
      assigneeSelect.innerHTML = Array.from(options.entries())
        .sort((a, b) => {
          const aIsBatch = a[0].startsWith('batch:');
          const bIsBatch = b[0].startsWith('batch:');
          if (aIsBatch && !bIsBatch) return -1;
          if (!aIsBatch && bIsBatch) return 1;
          return a[1].localeCompare(b[1]);
        })
        .map(([value, label]) => `<option value="${escapeValue(value)}">${escapeValue(label)}</option>`)
        .join('');
      if (Array.from(options.keys()).includes(current)) assigneeSelect.value = current;
    }
  }

  function updateHomeworkTargetFields() {
    const targetType = $('hw-target-type') ? $('hw-target-type').value : 'student';
    if ($('hw-student-field')) $('hw-student-field').style.display = targetType === 'student' ? '' : 'none';
    if ($('hw-batch-field')) $('hw-batch-field').style.display = targetType === 'batch' ? '' : 'none';
  }

  function openHomeworkAssignmentModal(targetType = 'student', targetId = '') {
    populateHomeworkSelectors();
    if ($('hw-target-type')) $('hw-target-type').value = targetType || 'student';
    updateHomeworkTargetFields();
    if ($('hw-student-select')) $('hw-student-select').value = targetType === 'student' ? targetId || '' : '';
    if ($('hw-batch-select')) $('hw-batch-select').value = targetType === 'batch' ? targetId || '' : '';
    if ($('hw-title')) $('hw-title').value = '';
    if ($('hw-description')) $('hw-description').value = '';
    if ($('hw-due-date')) $('hw-due-date').value = '';
    if ($('hw-file-input')) $('hw-file-input').value = '';
    if ($('hw-file-preview')) $('hw-file-preview').innerHTML = '';
    setupHomeworkFileDropzone();
    if ($('hw-past-search')) $('hw-past-search').value = '';
    updatePastHomeworkHistory();
    window.openModal && window.openModal('homework-assignment-modal');
  }

  function updatePastHomeworkHistory() {
    const targetType = $('hw-target-type') ? $('hw-target-type').value : 'student';
    const studentId = $('hw-student-select') ? $('hw-student-select').value : '';
    const batchId = $('hw-batch-select') ? $('hw-batch-select').value : '';
    const historySection = $('hw-past-history-section');
    const pastList = $('hw-past-list');

    if (!historySection || !pastList) return;

    let showHistory = false;
    let filtered = [];

    if (targetType === 'student' && studentId) {
      filtered = (window.allHomework || []).filter(h => assignmentAppliesToStudent(h, studentId, window.allStudents || []));
      showHistory = true;
    } else if (targetType === 'batch' && batchId) {
      filtered = (window.allHomework || []).filter(h => assignmentAppliesToBatch(h, batchId, window.allStudents || [], window.allBatches || []));
      showHistory = true;
    } else if (targetType === 'all') {
      filtered = (window.allHomework || []).filter(h => h.target_type === 'all');
      showHistory = true;
    }

    if (!showHistory) {
      historySection.style.display = 'none';
      return;
    }

    historySection.style.display = '';
    window.currentFilteredPastHomework = filtered;
    filterPastHomeworkList();
  }

  function filterPastHomeworkList() {
    const pastList = $('hw-past-list');
    if (!pastList) return;

    const query = ($('hw-past-search') ? $('hw-past-search').value : '').toLowerCase().trim();
    const items = window.currentFilteredPastHomework || [];

    const filteredItems = items.filter(h => {
      const title = (h.title || '').toLowerCase();
      const desc = (h.description || '').toLowerCase();
      const files = Array.isArray(h.attachment_urls) ? h.attachment_urls.join(' ').toLowerCase() : '';
      return title.includes(query) || desc.includes(query) || files.includes(query);
    });

    if (filteredItems.length === 0) {
      pastList.innerHTML = '<div style="color:var(--ivory-dim); font-size:11px; padding:4px;">No past homework found matching your query.</div>';
      return;
    }

    pastList.innerHTML = filteredItems.map(h => {
      const due = h.due_date ? formatDate(h.due_date) : 'No due date';
      return `
        <div style="background:var(--bg3); padding:8px; border-radius:4px; border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; color:var(--ivory);">
            <span>${escapeValue(h.title || 'Untitled')}</span>
            <span style="font-size:10px; color:var(--gold); font-weight:normal;">Due: ${due}</span>
          </div>
          <div style="font-size:11px; color:var(--ivory2); margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">
            ${escapeValue(h.description || 'No description')}
          </div>
        </div>
      `;
    }).join('');
  }


  // ── Homework Attachment File Capacity & Validation Limits ──
  const MAX_HW_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per file limit
  const MAX_HW_FILE_COUNT = 5;               // Max 5 files per upload batch
  const MAX_HW_BATCH_SIZE = 30 * 1024 * 1024;// Max 30 MB total per upload batch

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function validateHomeworkFiles(fileList) {
    if (!fileList || !fileList.length) return { valid: true, files: [] };

    const files = Array.from(fileList);
    if (files.length > MAX_HW_FILE_COUNT) {
      if (window.toast) window.toast(`⚠️ Maximum ${MAX_HW_FILE_COUNT} files allowed per upload. You selected ${files.length} files.`, 'error');
      return { valid: false, error: `Maximum ${MAX_HW_FILE_COUNT} files allowed.` };
    }

    let totalSize = 0;
    for (const f of files) {
      if (f.size > MAX_HW_FILE_SIZE) {
        if (window.toast) window.toast(`⚠️ File "${f.name}" (${formatBytes(f.size)}) exceeds maximum 15 MB limit. Please compress or select a smaller file.`, 'error');
        return { valid: false, error: `File "${f.name}" exceeds 15 MB limit.` };
      }
      totalSize += f.size;
    }

    if (totalSize > MAX_HW_BATCH_SIZE) {
      if (window.toast) window.toast(`⚠️ Total upload size (${formatBytes(totalSize)}) exceeds maximum 30 MB batch limit.`, 'error');
      return { valid: false, error: `Total upload size exceeds 30 MB.` };
    }

    return { valid: true, files, totalSize };
  }

  window.handleHomeworkFileSelectPreview = function (inputEl, previewElId) {
    const previewEl = document.getElementById(previewElId);
    if (!previewEl) return;
    if (!inputEl || !inputEl.files || !inputEl.files.length) {
      previewEl.innerHTML = '';
      return;
    }

    const files = Array.from(inputEl.files);
    const val = validateHomeworkFiles(files);

    let html = `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">`;
    files.forEach(f => {
      const isOversized = f.size > MAX_HW_FILE_SIZE;
      const isImg = isImageFile(f);
      const icon = isImg ? '🖼️' : (f.name.endsWith('.pgn') ? '♟️' : (f.name.endsWith('.pdf') ? '📄' : '📎'));
      html += `
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px; border-radius:4px; background:${isOversized ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isOversized ? 'var(--danger)' : 'var(--border)'}; color:${isOversized ? '#f87171' : 'var(--ivory)'};">
          <span>${icon} ${escapeValue(f.name)} (${formatBytes(f.size)})</span>
          ${isOversized ? '<strong>⚠️ TOO LARGE</strong>' : ''}
        </span>
      `;
    });
    html += `</div>`;

    if (!val.valid) {
      html += `<div style="font-size:11px; color:#f87171; font-weight:700; margin-top:4px;">❌ ${escapeValue(val.error)}</div>`;
    }

    previewEl.innerHTML = html;
  };

  function setupHomeworkFileDropzone() {
    const input = $('hw-file-input');
    const dropzone = $('hw-file-drop');
    if (!input || !dropzone || dropzone.dataset.bound === 'true') return;

    const applyFiles = (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      window.handleHomeworkFileSelectPreview(input, 'hw-file-preview');
    };

    input.addEventListener('change', () => window.handleHomeworkFileSelectPreview(input, 'hw-file-preview'));
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });
    dropzone.addEventListener('drop', event => applyFiles(event.dataTransfer.files));
    dropzone.dataset.bound = 'true';
  }

  function isImageFile(file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext);
  }

  async function uploadHomeworkFile(file) {
    if (!file) return null;

    const isImg = isImageFile(file);

    // ROUTE 1: IMAGES ONLY -> Route to ImgBB (saves Supabase Storage quota)
    if (isImg) {
      try {
        if (typeof window.uploadToImgbb === 'function') {
          const imgbbUrl = await window.uploadToImgbb(file);
          if (imgbbUrl) return imgbbUrl;
        }
      } catch (err) {
        console.warn('[Homework] ImgBB upload failed for image, trying fallback:', err);
      }
    }

    // ROUTE 2: DOCUMENTS & FILES -> Route to Supabase Storage bucket 'documents' or 'homework_attachments'
    try {
      if (window.supabaseClient && window.supabaseClient.storage) {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const filePath = `hw_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        let uploadRes = await window.supabaseClient.storage
          .from('documents')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        let bucketName = 'documents';
        if (uploadRes.error) {
          uploadRes = await window.supabaseClient.storage
            .from('homework_attachments')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
          bucketName = 'homework_attachments';
        }

        if (!uploadRes.error && uploadRes.data) {
          const { data: pubUrlData } = window.supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(uploadRes.data.path || filePath);
          if (pubUrlData?.publicUrl) return pubUrlData.publicUrl;
        }
      }
    } catch (sbErr) {
      console.warn('[Homework] Supabase storage upload failed:', sbErr);
    }

    // ROUTE 3: Fallback via /api/upload or Data URL
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });

      const base64 = dataUrl.split(',')[1];
      const res = await window.apiCall('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ 
          image: base64,
          filename: file?.name || `file.${file?.type?.split('/')[1] || 'bin'}`
        })
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        const url = data?.data?.url || data?.url;
        if (url) return url;
      }

      if (file.size < 5 * 1024 * 1024) {
        return dataUrl;
      }
    } catch (e) {
      console.error('[Homework] File upload fallback error:', e);
    }
    return null;
  }

  function generateUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function saveHomeworkAssignment(options = {}) {
    const quiet = options.suppressUi === true;
    const targetType = options.targetType || ($('hw-target-type') ? $('hw-target-type').value : 'student');
    const title = options.title || ($('hw-title') ? $('hw-title').value.trim() : '');
    const description = options.description || ($('hw-description') ? $('hw-description').value.trim() : '');
    const dueDate = options.dueDate || ($('hw-due-date') ? $('hw-due-date').value : '');
    const studentId = options.studentId || ($('hw-student-select') ? $('hw-student-select').value : '');
    const batchId = options.batchId || ($('hw-batch-select') ? $('hw-batch-select').value : '');
    const presentStudentIds = options.presentStudentIds || [];
    const fileInput = $('hw-file-input');

    if (!title) {
      if (!quiet && window.toast) window.toast('Homework title is required', 'error');
      return { success: false, error: 'Homework title is required' };
    }
    if (targetType === 'student' && !studentId) {
      if (!quiet && window.toast) window.toast('Select a student', 'error');
      return { success: false, error: 'Select a student' };
    }
    if (targetType === 'batch' && !batchId) {
      if (!quiet && window.toast) window.toast('Select a batch', 'error');
      return { success: false, error: 'Select a batch' };
    }

    let attachmentUrls = [];
    if (options.files && options.files.length > 0) {
      if (options.files[0] instanceof File) {
        try {
          const uploadPromises = Array.from(options.files).map((f) => uploadHomeworkFile(f));
          const uploaded = await Promise.all(uploadPromises);
          attachmentUrls = uploaded.filter((url) => url !== null);
        } catch (e) {
          console.warn('[Homework] File upload warning:', e);
        }
      } else {
        attachmentUrls = options.files;
      }
    } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
      try {
        const uploadPromises = Array.from(fileInput.files).map((f) => uploadHomeworkFile(f));
        const uploaded = await Promise.all(uploadPromises);
        attachmentUrls = uploaded.filter((url) => url !== null);
      } catch (e) {
        console.warn('[Homework] File upload warning:', e);
      }
    }

    if (options.requireFiles === true && attachmentUrls.length === 0) {
      if (!quiet && window.toast) window.toast('The PDF upload failed. Please select the PDF again.', 'error');
      return { success: false, error: 'The PDF upload failed' };
    }

    const hwId = generateUuid();
    const files = attachmentUrls.length > 0 ? attachmentUrls : [];
    const coachId = options.coachId || window.currentCoachId || window.userId || (window.currentUser && window.currentUser.id) || null;

    const payload = {
      id: hwId,
      target_type: targetType,
      title,
      description,
      due_date: dueDate || null,
      student_id: targetType === 'student' ? studentId : null,
      batch_id: targetType === 'batch' ? batchId : null,
      coach_id: coachId,
      created_by: coachId,
      attachment_urls: files,
      questions_files: files,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      present_student_ids: presentStudentIds.length ? presentStudentIds : null
    };

    let saved = false;

    // Route 1: Try direct Supabase client insertion first
    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient
          .from('homework_assignments')
          .insert({
            id: payload.id,
            target_type: payload.target_type,
            title: payload.title,
            description: payload.description,
            due_date: payload.due_date,
            student_id: payload.student_id,
            batch_id: payload.batch_id,
            coach_id: payload.coach_id,
            created_by: payload.created_by,
            questions_files: payload.questions_files,
            status: payload.status,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
            present_student_ids: payload.present_student_ids
          })
          .select()
          .single();

        if (!error && data) {
          saved = true;
        } else if (error) {
          // Try fallback table 'homework'
          const { error: altErr } = await window.supabaseClient
            .from('homework')
            .insert(payload);
          if (!altErr) saved = true;
        }
      }
    } catch (sbErr) {
      console.warn('[Homework] Direct Supabase insert failed, attempting apiCall fallback:', sbErr);
    }

    // Route 2: Try apiCall fallback if direct Supabase insert did not complete
    if (!saved) {
      try {
        const res = await window.apiCall('/api/homework', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          saved = true;
        }
      } catch (apiErr) {
        console.warn('[Homework] apiCall POST failed:', apiErr);
      }
    }

    if (!saved) {
      if (!quiet && window.toast) window.toast('Failed to save homework assignment. Please try again.', 'error');
      return { success: false, error: 'Failed to save homework assignment' };
    }

    // Update local storage persistence
    try {
      const stored = JSON.parse(localStorage.getItem('ck_homework_assignments') || '[]');
      const fIdx = stored.findIndex(h => String(h.id) === String(payload.id));
      if (fIdx !== -1) stored[fIdx] = payload;
      else stored.unshift(payload);
      localStorage.setItem('ck_homework_assignments', JSON.stringify(stored));
    } catch (e) {}

    // Update memory state & UI
    if (!window.allHomework) window.allHomework = [];
    const idx = window.allHomework.findIndex(h => String(h.id) === String(payload.id));
    if (idx !== -1) window.allHomework[idx] = payload;
    else window.allHomework.unshift(payload);

    const targetLabel = targetType === 'student'
      ? `Student: ${(window.allStudents || []).find(s => String(s.id) === String(studentId))?.name || 'Student #' + studentId}`
      : targetType === 'batch'
        ? `Batch: ${(window.allBatches || []).find(b => String(b.id) === String(batchId))?.name || 'Batch #' + batchId}`
        : 'All Active Students';
    if (!quiet && window.toast) window.toast(`✅ Homework "${title}" assigned successfully to ${targetLabel}!`, 'success');
    if (!quiet) window.closeModals && window.closeModals();

    if (!quiet) {
      if (window.loadHomeworkData) await window.loadHomeworkData(true).catch(() => {});
      else if (window.loadAllData) await window.loadAllData(true).catch(() => {});
      refreshHomeworkViews();
    }
    return { success: true, assignment: payload };
  }

  async function updateHomeworkStatus(id, status) {
    try {
      const res = await window.apiCall(`/api/homework?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      if (window.toast) window.toast(`Homework marked as ${status}`, 'success');
      if (window.loadHomeworkData) await window.loadHomeworkData(true);
      else if (window.loadAllData) await window.loadAllData(true);
      refreshHomeworkViews();
    } catch (error) {
      if (window.toast) window.toast(`Failed to update homework: ${error.message}`, 'error');
    }
  }

  function refreshHomeworkViews() {
    if (window.renderHomeworkPage) window.renderHomeworkPage();
    if (window.renderChildHomework) window.renderChildHomework();
    if (window.renderCoachHomework) window.renderCoachHomework();
    if (window.renderCoachAssignments) window.renderCoachAssignments(window.coachAssignPage || 1);
  }

  async function applyBulkHomeworkStatus() {
    if (!isAdminUser()) return window.toast ? window.toast('Only administrators can bulk edit homework.', 'error') : null;
    const ids = Array.from(homeworkSelectedIds);
    const status = $('homework-bulk-status') ? $('homework-bulk-status').value : 'active';
    if (!ids.length) return window.toast ? window.toast('Select at least one homework assignment.', 'error') : null;

    try {
      const res = await window.apiCall('/api/homework', {
        method: 'PATCH',
        body: JSON.stringify({ ids, status })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      if (window.toast) window.toast(`Updated ${ids.length} homework assignments`, 'success');
      homeworkSelectedIds.clear();
      if (window.loadHomeworkData) await window.loadHomeworkData(true);
      else if (window.loadAllData) await window.loadAllData(true);
      refreshHomeworkViews();
    } catch (error) {
      if (window.toast) window.toast(`Bulk update failed: ${error.message}`, 'error');
    }
  }

  function canEditOrDeleteHomework() {
    const role = (window.role || window.userRole || 'student').toLowerCase();
    return role === 'admin' || role === 'master' || role === 'coach' || typeof isAdminUser === 'function' && isAdminUser();
  }

  async function deleteHomeworkAssignment(id) {
    if (!canEditOrDeleteHomework()) return window.toast ? window.toast('Only coaches and administrators can delete homework.', 'error') : null;
    const role = (window.role || window.userRole || 'student').toLowerCase();
    if (role === 'coach') {
      const hw = (window.allHomework || []).find(h => String(h.id) === String(id));
      const cId = window.currentCoachId || window.userId;
      if (hw && cId && window.ckSameCoach) {
        const myBatchIds = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, cId)).map(b => String(b.id));
        const myStudentIds = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, cId)).map(s => String(s.id));
        const isOwner = (hw.target_type === 'all' && hw.created_by && window.ckSameCoach(hw.created_by, cId))
          || (hw.target_type === 'batch' && myBatchIds.includes(String(hw.batch_id)))
          || (hw.target_type === 'student' && myStudentIds.includes(String(hw.student_id)));
        if (!isOwner) return window.toast ? window.toast('You can only delete your own assignments.', 'error') : null;
      }
    }
    if (!window.confirm('Delete this homework assignment? This cannot be undone.')) return;

    let deleted = false;

    // Route 1: API call to Supabase Edge Function
    try {
      const res = await window.apiCall(`/api/homework?id=${encodeURIComponent(id)}`, { method: 'DELETE', silent: true });
      if (res && res.ok) {
        deleted = true;
      } else {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Delete failed with status ${res.status}`);
      }
    } catch (apiErr) {
      console.warn('[Homework] apiCall DELETE error:', apiErr);
    }

    // Route 2: Direct Supabase client delete (fallback)
    if (!deleted && window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        const { error } = await window.supabaseClient
          .from('homework_assignments')
          .delete()
          .eq('id', id);
        if (!error) {
          deleted = true;
        }
      } catch (e) {
        console.warn('[Homework] Direct Supabase delete error:', e);
      }
    }

    if (!deleted) {
      return window.toast ? window.toast('Failed to delete homework. Please try again.', 'error') : null;
    }

    // Update local storage persistence & memory state
    try {
      const stored = JSON.parse(localStorage.getItem('ck_homework_assignments') || '[]');
      const filtered = stored.filter(h => String(h.id) !== String(id));
      localStorage.setItem('ck_homework_assignments', JSON.stringify(filtered));
    } catch (e) {}

    homeworkSelectedIds.delete(id);
    window.allHomework = (window.allHomework || []).filter(h => String(h.id) !== String(id));

    if (typeof dataCache !== 'undefined') {
      dataCache.homework = (dataCache.homework || []).filter(h => String(h.id) !== String(id));
      dataCache.timestamp = Date.now();
    }

    if (window.toast) window.toast('Homework assignment deleted successfully', 'success');
    if (window.loadHomeworkData) await window.loadHomeworkData(true).catch(() => {});
    else if (window.loadAllData) await window.loadAllData(true).catch(() => {});
    refreshHomeworkViews();
    if (window.renderCoachAssignments) window.renderCoachAssignments(window.coachAssignPage || 1);
  }

  window.editHomeworkAssignment = function (id) {
    if (!canEditOrDeleteHomework()) return window.toast ? window.toast('Only coaches and administrators can edit homework.', 'error') : null;
    const hw = (window.allHomework || []).find(h => String(h.id) === String(id));
    if (!hw) return;

    // Check if coach is the owner of the homework
    const role = (window.role || window.userRole || 'student').toLowerCase();
    if (role === 'coach') {
      const cId = window.currentCoachId || window.userId;
      if (hw && cId && window.ckSameCoach) {
        const myBatchIds = (window.allBatches || []).filter(b => window.ckSameCoach(b.coach_id, cId)).map(b => String(b.id));
        const myStudentIds = (window.allStudents || []).filter(s => window.ckSameCoach(s.coach_id, cId)).map(s => String(s.id));
        const isOwner = (hw.target_type === 'all' && hw.created_by && window.ckSameCoach(hw.created_by, cId))
          || (hw.target_type === 'batch' && myBatchIds.includes(String(hw.batch_id)))
          || (hw.target_type === 'student' && myStudentIds.includes(String(hw.student_id)));
        if (!isOwner) return window.toast ? window.toast('You can only edit your own assignments.', 'error') : null;
      }
    }

    // Store current editing ID
    window.currentEditingHomeworkId = id;

    // Populate modal fields
    const titleEl = document.getElementById('homework-edit-title');
    const descEl = document.getElementById('homework-edit-description');
    const dueDateEl = document.getElementById('homework-edit-due-date');
    const modalTitle = document.getElementById('homework-edit-modal-title');
    const targetInfoEl = document.getElementById('homework-edit-target-info');
    const statusBadgeEl = document.getElementById('homework-edit-status-badge');
    const filesWrapEl = document.getElementById('homework-edit-files-wrap');
    const filesListEl = document.getElementById('homework-edit-files-list');

    if (titleEl) titleEl.value = hw.title || '';
    if (descEl) descEl.value = hw.description || '';
    if (dueDateEl) dueDateEl.value = hw.due_date || '';
    if (modalTitle) modalTitle.textContent = 'Edit Homework';

    if (targetInfoEl) {
      const targetTxt = typeof assigneeLabel === 'function' ? assigneeLabel(hw) : (hw.target_type === 'all' ? 'All Students' : hw.target_type === 'batch' ? 'Batch' : 'Student');
      targetInfoEl.textContent = `Target: ${targetTxt}`;
    }
    if (statusBadgeEl) {
      const st = (hw.status || 'active').toLowerCase();
      statusBadgeEl.textContent = st.charAt(0).toUpperCase() + st.slice(1);
      statusBadgeEl.className = st === 'completed' ? 'badge badge-success' : st === 'archived' ? 'badge badge-grey' : 'badge badge-warning';
    }

    const files = (Array.isArray(hw.questions_files) && hw.questions_files.length ? hw.questions_files : (Array.isArray(hw.attachment_urls) ? hw.attachment_urls : []));
    editingHomeworkFiles = Array.isArray(files) ? [...files] : [];
    editingHomeworkRemovedIds = new Set();
    editingHomeworkNewFiles = [];
    if (filesWrapEl && filesListEl) {
      if (editingHomeworkFiles.length > 0) {
        filesWrapEl.style.display = 'block';
        renderEditFileList();
      } else {
        filesWrapEl.style.display = 'none';
        filesListEl.innerHTML = '';
      }
    }

    const fileInput = document.getElementById('homework-edit-file-input');
    if (fileInput) {
      fileInput.value = '';
      fileInput.onchange = () => {
        if (!fileInput.files || !fileInput.files.length) return;
        Array.from(fileInput.files).forEach((f) => editingHomeworkNewFiles.push(f));
        fileInput.value = '';
        renderEditFileList();
      };
    }

    // Set up save button handler
    const saveBtn = document.getElementById('homework-edit-save-btn');
    if (saveBtn) {
      // Remove old event listeners by cloning
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', () => {
        saveHomeworkEdit(id);
      });
    }

    // Open modal
    if (typeof window.openModal === 'function') {
      window.openModal('homework-edit-modal');
    } else {
      const modal = document.getElementById('homework-edit-modal');
      if (modal) modal.classList.add('open');
    }
  };

  function renderEditFileList() {
    const filesListEl = document.getElementById('homework-edit-files-list');
    if (!filesListEl) return;
    const kept = editingHomeworkFiles.filter((f, idx) => {
      const key = typeof f === 'string' ? f : (f.url || f.name || String(idx));
      return !editingHomeworkRemovedIds.has(key);
    });
    if (!kept.length && !editingHomeworkNewFiles.length) {
      filesListEl.innerHTML = '';
      return;
    }
    filesListEl.innerHTML = kept.map((f, i) => {
      const url = typeof f === 'string' ? f : (f.url || '');
      const name = typeof f === 'string' ? (f.split('/').pop() || `Attachment ${i + 1}`) : (f.name || `Attachment ${i + 1}`);
      const key = typeof f === 'string' ? f : (f.url || f.name || String(i));
      return `<div style="display:flex; align-items:center; gap:6px; background:var(--bg2); padding:4px 8px; border-radius:4px;">
        <span>📎</span>
        <a href="${escapeValue(url)}" target="_blank" rel="noopener" style="color:var(--gold); text-decoration:none; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:480px;">${escapeValue(name)}</a>
        <button type="button" onclick="removeEditHomeworkFile('${escapeValue(key).replace(/'/g, "\\'")}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:12px;">✕</button>
      </div>`;
    }).join('');
  }

  window.removeEditHomeworkFile = function (key) {
    editingHomeworkRemovedIds.add(key);
    renderEditFileList();
  };

  async function saveHomeworkEdit(id) {
    const hw = (window.allHomework || []).find(h => String(h.id) === String(id));
    if (!hw) return;

    const titleEl = document.getElementById('homework-edit-title');
    const descEl = document.getElementById('homework-edit-description');
    const dueDateEl = document.getElementById('homework-edit-due-date');

    const newTitle = titleEl ? titleEl.value.trim() : '';
    const newDesc = descEl ? descEl.value.trim() : '';
    const newDueDate = dueDateEl ? dueDateEl.value : '';

    if (!newTitle) {
      return window.toast ? window.toast('Title is required.', 'error') : null;
    }

    let newFiles = [...editingHomeworkFiles];
    const kept = newFiles.filter((f, idx) => {
      const key = typeof f === 'string' ? f : (f.url || f.name || String(idx));
      return !editingHomeworkRemovedIds.has(key);
    });
    let uploadedUrls = [];
    if (editingHomeworkNewFiles.length) {
      try {
        const uploadPromises = Array.from(editingHomeworkNewFiles).map((f) => uploadHomeworkFile(f));
        const uploaded = await Promise.all(uploadPromises);
        uploadedUrls = uploaded.filter((url) => url !== null);
      } catch (e) {
        console.warn('[Homework] File upload warning:', e);
      }
    }
    const finalFiles = [...kept, ...uploadedUrls];

    const updatedPayload = {
      ...hw,
      title: newTitle,
      description: newDesc,
      due_date: newDueDate || hw.due_date,
      updated_at: new Date().toISOString(),
      attachment_urls: finalFiles,
      questions_files: finalFiles
    };

    let updated = false;

    // Route 1: API call to Supabase Edge Function
    try {
      const res = await window.apiCall(`/api/homework?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: updatedPayload.title,
          description: updatedPayload.description,
          due_date: updatedPayload.due_date,
          updated_at: updatedPayload.updated_at,
          attachment_urls: updatedPayload.attachment_urls,
          questions_files: updatedPayload.questions_files
        }),
        silent: true
      });
      if (res && res.ok) {
        updated = true;
      } else {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Update failed with status ${res.status}`);
      }
    } catch (apiErr) {
      console.warn('[Homework] apiCall PATCH error:', apiErr);
    }

    // Route 2: Direct Supabase update (fallback)
    if (!updated && window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        const { error } = await window.supabaseClient
          .from('homework_assignments')
          .update({
            title: updatedPayload.title,
            description: updatedPayload.description,
            due_date: updatedPayload.due_date,
            updated_at: updatedPayload.updated_at,
            attachment_urls: updatedPayload.attachment_urls,
            questions_files: updatedPayload.questions_files
          })
          .eq('id', id);
        if (!error) {
          updated = true;
        }
      } catch (e) {
        console.warn('[Homework] Direct Supabase update error:', e);
      }
    }

    if (!updated) {
      return window.toast ? window.toast('Failed to update homework. Please try again.', 'error') : null;
    }

    // Update local storage persistence & memory state
    try {
      const stored = JSON.parse(localStorage.getItem('ck_homework_assignments') || '[]');
      const fIdx = stored.findIndex(h => String(h.id) === String(id));
      if (fIdx !== -1) stored[fIdx] = updatedPayload;
      localStorage.setItem('ck_homework_assignments', JSON.stringify(stored));
    } catch (e) {}

    const idx = (window.allHomework || []).findIndex(h => String(h.id) === String(id));
    if (idx !== -1) window.allHomework[idx] = updatedPayload;

    if (typeof dataCache !== 'undefined') {
      const cacheIdx = (dataCache.homework || []).findIndex(h => String(h.id) === String(id));
      if (cacheIdx !== -1) dataCache.homework[cacheIdx] = updatedPayload;
      dataCache.timestamp = Date.now();
    }

    if (window.toast) window.toast('Homework updated successfully', 'success');
    if (typeof window.closeModal === 'function') window.closeModal('homework-edit-modal');
    if (window.loadHomeworkData) await window.loadHomeworkData(true).catch(() => {});
    else if (window.loadAllData) await window.loadAllData(true).catch(() => {});
    refreshHomeworkViews();
    if (window.renderCoachAssignments) window.renderCoachAssignments(window.coachAssignPage || 1);
  };

  async function submitHomeworkForChild(assignmentId) {
    const assignment = (window.allHomework || []).find((item) => String(item.id) === String(assignmentId));
    if (!assignment) return window.toast ? window.toast('Homework assignment not found.', 'error') : null;
    const text = $(`homework-submission-text-${assignment.id}`)?.value.trim() || '';
    const url = $(`homework-submission-url-${assignment.id}`)?.value.trim() || '';
    const fileInput = $(`homework-submission-files-${assignment.id}`);

    if (!text && !url && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
      return window.toast ? window.toast('Add homework text, a submission link, or upload files.', 'error') : null;
    }

    let uploadedUrls = [];
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      try {
        const uploadPromises = Array.from(fileInput.files).map(f => uploadHomeworkFile(f));
        const uploaded = await Promise.all(uploadPromises);
        uploadedUrls = uploaded.filter(u => u !== null);
        if (uploadedUrls.length === 0 && fileInput.files.length > 0) {
          return window.toast ? window.toast('File upload failed - please try again', 'error') : null;
        }
      } catch (e) {
        return window.toast ? window.toast(`File upload failed: ${e.message}`, 'error') : null;
      }
    }

    // Determine target student ID from active student context or session
    let curStudent = (typeof resolveCurrentStudent === 'function') ? resolveCurrentStudent() : (window.currentStudent || null);
    let studentId = curStudent?.id || window.currentStudentId || window.studentId;
    if (!studentId) {
      try {
        const authObj = JSON.parse(sessionStorage.getItem('chesskidoo_auth') || sessionStorage.getItem('twoknights_auth') || localStorage.getItem('chesskidoo_auth') || localStorage.getItem('twoknights_auth') || '{}');
        studentId = authObj.studentId || authObj.user;
      } catch (e) {}
    }

    let studentObj = curStudent || (window.allStudents || []).find(s => String(s.id) === String(studentId));
    let sName = studentObj ? (window.getStudentName ? window.getStudentName(studentObj) : (studentObj.name || studentObj.full_name)) : null;

    const subPayload = {
      assignment_id: assignment.id,
      student_id: studentId || null,
      student_name: sName,
      submission_text: text,
      submission_url: url,
      file_urls: uploadedUrls.length > 0 ? uploadedUrls : null
    };

    let submitted = false;
    try {
      const res = await window.apiCall('/api/homework?action=submit', {
        method: 'POST',
        headers: studentId ? { 'x-portal-student-id': String(studentId) } : {},
        body: JSON.stringify(subPayload)
      });
      if (res && res.ok) {
        submitted = true;
      }
    } catch (apiErr) {
      console.warn('[Homework] apiCall submit failed, trying direct Supabase fallback:', apiErr);
    }

    if (!submitted && window.supabaseClient) {
      try {
        const { error: sbErr } = await window.supabaseClient
          .from('homework_submissions')
          .upsert(
            {
              assignment_id: subPayload.assignment_id,
              student_id: subPayload.student_id,
              submission_text: subPayload.submission_text || '',
              submission_url: subPayload.submission_url || '',
              file_urls: subPayload.file_urls,
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'assignment_id,student_id' }
          );
        if (!sbErr) submitted = true;
      } catch (e) {}
    }

    // Always persist submission locally
    try {
      const storedSubs = JSON.parse(localStorage.getItem('ck_homework_submissions') || '[]');
      const existingIdx = storedSubs.findIndex(s => String(s.assignment_id) === String(subPayload.assignment_id) && String(s.student_id) === String(subPayload.student_id));
      const subRecord = {
        id: subPayload.id || `sub_${Date.now()}`,
        assignment_id: subPayload.assignment_id,
        student_id: subPayload.student_id,
        student_name: subPayload.student_name,
        submission_text: subPayload.submission_text || '',
        submission_url: subPayload.submission_url || '',
        file_urls: subPayload.file_urls,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (existingIdx !== -1) storedSubs[existingIdx] = { ...storedSubs[existingIdx], ...subRecord };
      else storedSubs.unshift(subRecord);
      localStorage.setItem('ck_homework_submissions', JSON.stringify(storedSubs));
      submitted = true;
    } catch (e) {}

    if (submitted) {
      if (window.toast) window.toast('Homework submitted successfully!', 'success');
      if ($(`homework-submission-files-${assignment.id}`)) $(`homework-submission-files-${assignment.id}`).value = '';
      if ($(`homework-submission-text-${assignment.id}`)) $(`homework-submission-text-${assignment.id}`).value = '';
      if ($(`homework-submission-url-${assignment.id}`)) $(`homework-submission-url-${assignment.id}`).value = '';
      await loadHomeworkSubmissions(true);
      if (window.loadHomeworkData) await window.loadHomeworkData(true);
      else if (window.loadAllData) await window.loadAllData(true);
      refreshHomeworkViews();
    } else {
      if (window.toast) window.toast('Failed to submit homework. Please check your connection and try again.', 'error');
    }
  }

  async function reviewHomeworkSubmission(submissionId, status, customFeedback, customScore) {
    let feedback = customFeedback !== undefined ? customFeedback : ($(`homework-feedback-${submissionId}`)?.value.trim() || '');
    let score = customScore !== undefined ? customScore : ($(`homework-score-${submissionId}`)?.value.trim() || '');

    // If neither DOM element exists and no feedback provided, offer a prompt on 'needs_revision' or 'approved'
    if (customFeedback === undefined && !$(`homework-feedback-${submissionId}`)) {
      if (status === 'needs_revision') {
        const promptFb = prompt('Enter revision notes / feedback for the student:');
        if (promptFb === null) return; // User cancelled
        feedback = promptFb.trim();
      } else if (status === 'approved') {
        const promptScore = prompt('Optional: Enter score or grade for this submission (leave empty to skip):');
        if (promptScore !== null && promptScore.trim()) {
          score = promptScore.trim();
        }
      }
    }

    let reviewed = false;
    try {
      const res = await window.apiCall(`/api/homework?action=review&id=${encodeURIComponent(submissionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, feedback, score })
      });
      if (res && res.ok) {
        reviewed = true;
      }
    } catch (apiErr) {
      console.warn('[Homework] apiCall review failed, trying direct Supabase fallback:', apiErr);
    }

    if (!reviewed && window.supabaseClient) {
      try {
        const { error: sbErr } = await window.supabaseClient
          .from('homework_submissions')
          .update({
            status,
            feedback: feedback || null,
            score: score || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
        if (!sbErr) reviewed = true;
      } catch (e) {}
    }

    // Always update local storage
    try {
      const storedSubs = JSON.parse(localStorage.getItem('ck_homework_submissions') || '[]');
      const subIdx = storedSubs.findIndex(s => String(s.id) === String(submissionId));
      if (subIdx !== -1) {
        storedSubs[subIdx].status = status;
        storedSubs[subIdx].feedback = feedback || storedSubs[subIdx].feedback;
        storedSubs[subIdx].score = score || storedSubs[subIdx].score;
        storedSubs[subIdx].reviewed_at = new Date().toISOString();
        localStorage.setItem('ck_homework_submissions', JSON.stringify(storedSubs));
      }
      reviewed = true;
    } catch (e) {}

    if (reviewed) {
      if (window.toast) window.toast(`Submission marked as ${status.replace(/_/g, ' ')}!`, 'success');
      
      // Update local submission cache
      if (homeworkSubmissionCache && homeworkSubmissionCache.length) {
        const sub = homeworkSubmissionCache.find(s => String(s.id) === String(submissionId));
        if (sub) {
          sub.status = status;
          if (feedback) sub.feedback = feedback;
          if (score) sub.score = score;
          sub.reviewed_at = new Date().toISOString();
        }
      }

      await loadHomeworkSubmissions(true);
      if (window.loadHomeworkData) await window.loadHomeworkData(true);
      refreshHomeworkViews();
    } else {
      if (window.toast) window.toast('Failed to review homework. Please try again.', 'error');
    }
  }

  function renderChildSubmissionPanel(assignment) {
    const submission = assignment.student_submission || null;
    const status = submission?.status || 'not_submitted';
    const feedback = submission?.feedback || '';
    const score = submission?.score !== null && submission?.score !== undefined ? ` · <strong>Score:</strong> ${escapeValue(submission.score)}` : '';
    const canSubmit = !isAdminUser() && ['active', 'completed'].includes(assignment.status) && !['approved', 'closed'].includes(status);
    const currentText = submission?.submission_text || '';
    const currentUrl = submission?.submission_url || '';
    const fileUrls = submission?.file_urls || [];

    const filesHtml = Array.isArray(fileUrls) && fileUrls.length > 0 
      ? `<div style="margin-top:6px;font-size:12px;color:var(--gold);">
          <strong>Attachments:</strong><br>
          ${fileUrls.map((url, i) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener" style="display:block;margin-top:4px;">📎 File ${i + 1}</a>`).join('')}
        </div>` 
      : '';

    return `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
        <strong style="font-size:12px;color:var(--gold);">Submission:</strong>
        ${submissionStatusBadge(status)}
        ${submission?.submitted_at ? `<span style="font-size:12px;color:var(--ivory-dim);">Submitted ${escapeValue(formatDate(submission.submitted_at.slice(0, 10)))}</span>` : ''}
        ${score}
      </div>
      ${feedback ? `<div style="margin:8px 0;padding:10px;background:rgba(218,163,62,0.06);border:1px solid rgba(218,163,62,0.25);border-radius:8px;font-size:12px;color:var(--ivory);white-space:pre-wrap;">${escapeValue(feedback)}</div>` : ''}
      ${currentText ? `<div style="font-size:12px;color:var(--ivory-dim);line-height:1.55;white-space:pre-wrap;">${escapeValue(currentText)}</div>` : ''}
      ${currentUrl ? `<div style="margin-top:6px;font-size:12px;color:var(--gold);"><a href="${safeUrl(currentUrl)}" target="_blank" rel="noopener">Open submission link</a></div>` : ''}
      ${filesHtml}
      ${canSubmit ? `<div style="display:grid;gap:8px;margin-top:12px;">
        <textarea id="homework-submission-text-${assignment.id}" class="input-field" placeholder="Type your completed homework response or practice notes..." style="min-height:90px;">${escapeValue(currentText)}</textarea>
        <input id="homework-submission-url-${assignment.id}" class="input-field" placeholder="Optional submission link (Google Drive, Dropbox, etc.)" value="${escapeValue(currentUrl)}">
        <button type="button" class="btn btn-outline-grey btn-sm homework-attach-toggle" onclick="toggleHomeworkSubmissionUpload('${assignment.id}')">📎 Attach Solution Files</button>
        <div id="homework-submission-upload-${assignment.id}" style="display:none;">
          <div style="font-size:11px; font-weight:700; color:var(--gold); margin-top:4px;">Attach Solution Files <span style="font-size:10px; font-weight:normal; color:var(--ivory-dim);">(Max 5 files, up to 15 MB each: .pgn, .pdf, .png, .jpg)</span></div>
          <div class="upload-zone homework-submission-dropzone" id="homework-submission-drop-${assignment.id}">
            <span>Drop solution files here</span>
            <label class="btn btn-outline-grey btn-sm homework-submission-picker" for="homework-submission-files-${assignment.id}">Choose Files</label>
            <input type="file" id="homework-submission-files-${assignment.id}" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.pgn,.txt,.md,.zip" multiple onchange="window.handleHomeworkFileSelectPreview(this, 'homework-submission-preview-${assignment.id}')">
          </div>
          <div id="homework-submission-preview-${assignment.id}" style="margin-top:6px; display:flex; flex-wrap:wrap; gap:8px;"></div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="submitHomeworkForChild('${assignment.id}')">${submissionActionLabel(status)}</button>
      </div>` : ''}
    </div>`;
  }

  window.toggleHomeworkSubmissionUpload = function (assignmentId) {
    const panel = $(`homework-submission-upload-${assignmentId}`);
    if (!panel) return;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) setupHomeworkSubmissionDropzone(assignmentId);
  };

  function setupHomeworkSubmissionDropzone(assignmentId) {
    const input = $(`homework-submission-files-${assignmentId}`);
    const dropzone = $(`homework-submission-drop-${assignmentId}`);
    if (!input || !dropzone || dropzone.dataset.bound === 'true') return;

    const applyFiles = (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      if (files.length > 5) {
        window.toast?.('Maximum 5 solution files can be uploaded.', 'error');
        return;
      }
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      window.handleHomeworkFileSelectPreview(input, `homework-submission-preview-${assignmentId}`);
    };

    ['dragenter', 'dragover'].forEach(eventName => dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach(eventName => dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.remove('drag-over');
    }));
    dropzone.addEventListener('drop', event => applyFiles(event.dataTransfer.files));
    dropzone.dataset.bound = 'true';
  }

  function renderHomeworkCard(assignment, options = {}) {
    const showActions = options.showActions !== false;
    const selectable = !!options.selectable;
    const selected = homeworkSelectedIds.has(assignment.id);
    const dueClass = assignment.due_date && new Date(`${assignment.due_date}T23:59:59`) < new Date() && assignment.status !== 'completed' ? 'var(--danger)' : 'var(--ivory-dim)';
    const checkbox = selectable ? `<input type="checkbox" data-homework-id="${assignment.id}" ${selected ? 'checked' : ''} onchange="toggleHomeworkSelection('${assignment.id}', this.checked)" style="accent-color:var(--gold);">` : '';
    const coachName = coachNameForHomework(assignment);

    let presentStudentsHtml = '';
    {
      let presentIds = assignment.present_student_ids;
      if (typeof presentIds === 'string') {
        try { presentIds = JSON.parse(presentIds); } catch (_) {}
      }
      if (Array.isArray(presentIds) && presentIds.length) {
        const names = presentIds
          .map((id) => {
            const s = (window.allStudents || []).find((st) => String(st.id) === String(id));
            return s ? (window.getStudentName ? window.getStudentName(s) : (s.name || s.full_name || 'Student')) : null;
          })
          .filter(Boolean);
        if (names.length) {
          presentStudentsHtml = `<div style="font-size:12px; color:var(--ivory-dim); line-height:1.6; margin-top:4px;"><strong>Assigned to:</strong> ${names.join(', ')}</div>`;
        }
      }
    }

    return `<div class="card" style="padding:16px; border-left: 4px solid ${assignment.status === 'completed' ? 'var(--emerald)' : 'var(--gold)'};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; align-items:flex-start; min-width:0;">
          ${checkbox}
          <div style="min-width:0;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
              <h4 style="margin:0; color:var(--ivory); font-family:var(--font-head); font-size:15px; overflow-wrap:anywhere;">${escapeValue(assignment.title || 'Untitled Homework')}</h4>
              ${statusBadge(assignment.status)}
            </div>
            <div style="font-size:12px; color:${dueClass}; line-height:1.6;">
              <strong>Due:</strong> ${formatDate(assignment.due_date)} · <strong>Coach:</strong> ${escapeValue(coachName)} · <strong>Assignee:</strong> ${escapeValue(assigneeLabel(assignment))} · <strong>Recipients:</strong> ${recipientCount(assignment)}
            </div>
            ${presentStudentsHtml}
          </div>
        </div>
        ${showActions ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-outline-grey btn-sm" onclick="editHomeworkAssignment('${assignment.id}')">✏️ Edit</button>
          ${assignment.status !== 'completed' ? `<button class="btn btn-outline-grey btn-sm" onclick="updateHomeworkStatus('${assignment.id}', 'completed')">Mark Done</button>` : ''}
          ${assignment.status !== 'archived' ? `<button class="btn btn-outline-grey btn-sm" onclick="updateHomeworkStatus('${assignment.id}', 'archived')">Archive</button>` : ''}
          <button class="btn btn-outline-danger btn-sm" onclick="deleteHomeworkAssignment('${assignment.id}')">🗑️ Delete</button>
        </div>` : ''}
      </div>
      ${(() => {
        const rawDesc = assignment.description || '';
        const refLinks = extractReferenceLinks(rawDesc);
        const cleanDesc = rawDesc.replace(/\n?Reference Links:\n(?:- .+\n?)+/g, '').trim();
        const hasRefLinks = refLinks.length > 0;
        return `
          ${cleanDesc ? `<div style="margin-top:12px; color:var(--ivory-dim); font-size:13px; line-height:1.65; white-space:pre-wrap;">${linkifyText(cleanDesc)}</div>` : '<div style="margin-top:12px;color:var(--ivory-dim);font-size:13px;">No detailed instructions provided.</div>'}
          ${hasRefLinks ? `
            <div style="margin-top:14px; padding:10px 12px; background:rgba(59,130,246,0.04); border:1px solid rgba(59,130,246,0.2); border-radius:8px;">
              <strong style="font-size:12px; color:#60a5fa; display:flex; align-items:center; gap:4px;">🔗 Reference Links (${refLinks.length}):</strong>
              <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                ${refLinks.map((url, i) => {
                  let name = `Reference ${i + 1}`;
                  if (typeof url === 'string' && url.startsWith('http')) {
                    const part = url.split('/').pop().split('?')[0];
                    if (part && part.length < 35) name = decodeURIComponent(part);
                  }
                  return `<a href="${safeUrl(url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; color:#60a5fa; border-color:rgba(59,130,246,0.3); text-decoration:none;">🔗 ${escapeValue(name)}</a>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
        `;
      })()}
      ${(() => {
        let files = [];
        const parseList = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              const p = JSON.parse(val);
              if (Array.isArray(p)) return p;
            } catch (_) {}
            return [val];
          }
          return [];
        };
        files.push(...parseList(assignment.attachment_urls));
        files.push(...parseList(assignment.questions_files));
        files = Array.from(new Set(files.filter(Boolean)));
        if (!files.length) return '';
        return `
          <div style="margin-top:14px; padding:10px 12px; background:rgba(218,163,62,0.04); border:1px solid rgba(218,163,62,0.2); border-radius:8px;">
            <strong style="font-size:12px; color:var(--gold); display:flex; align-items:center; gap:4px;">📂 Study Materials & Attachments (${files.length}):</strong>
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
              ${files.map((url, i) => {
                let name = `Material ${i + 1}`;
                if (typeof url === 'string' && url.startsWith('http')) {
                  const part = url.split('/').pop().split('?')[0];
                  if (part && part.length < 35) name = decodeURIComponent(part);
                } else if (typeof url === 'string' && url.startsWith('data:image')) {
                  name = `Image Attachment ${i + 1}`;
                }
                return `<a href="${safeUrl(url)}" target="_blank" rel="noopener" class="btn btn-outline-grey btn-sm" style="font-size:11px; padding:4px 10px; color:var(--gold); border-color:rgba(218,163,62,0.3); text-decoration:none;">📎 ${escapeValue(name)}</a>`;
              }).join('')}
            </div>
          </div>
        `;
      })()}
      ${!isAdminUser() ? renderChildSubmissionPanel(assignment) : ''}
    </div>`;
  }

  function removeHomeworkSelection(id) {
    homeworkSelectedIds.delete(id);
    renderSelectedHomeworkList();
    renderHomeworkCalendar();
  }

  function renderSelectedHomeworkList() {
    const list = $('homework-selected-list');
    const count = $('homework-selection-count');
    if (count) count.textContent = `${homeworkSelectedIds.size} selected`;
    if (!list) return;

    const selected = Array.from(homeworkSelectedIds).map((id) => (window.allHomework || []).find((item) => String(item.id) === String(id))).filter(Boolean);
    if (!selected.length) {
      list.innerHTML = '<div style="color:var(--ivory-dim);font-size:12px;">No assignments selected.</div>';
      return;
    }

    list.innerHTML = selected.map((item) => `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;font-size:12px;">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeValue(item.title)}</span>
      <button class="btn btn-outline-grey btn-sm" onclick="removeHomeworkSelection('${item.id}')">Remove</button>
    </div>`).join('');
  }

  function toggleHomeworkSelection(id, checked) {
    if (checked) homeworkSelectedIds.add(id);
    else homeworkSelectedIds.delete(id);
    renderSelectedHomeworkList();
  }

  function selectFilteredHomework() {
    if (!isAdminUser()) return window.toast ? window.toast('Only administrators can select homework for batch editing.', 'error') : null;
    getFilteredHomework().forEach((assignment) => homeworkSelectedIds.add(assignment.id));
    renderSelectedHomeworkList();
    renderHomeworkCalendar();
  }

  function clearHomeworkSelection() {
    homeworkSelectedIds.clear();
    renderSelectedHomeworkList();
    renderHomeworkCalendar();
  }

  function renderHomeworkCalendarGrid(items, gridId = 'homework-calendar-grid', monthValue = '') {
    const grid = $(gridId);
    if (!grid) return;
    const month = monthValue || ($('homework-month-filter') ? $('homework-month-filter').value : monthKey(homeworkCalendarMonth));
    const [year, monthNumber] = (month || monthKey(homeworkCalendarMonth)).split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const offset = first.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDate = new Map();
    items.forEach((assignment) => {
      if (!assignment.due_date) return;
      if (!byDate.has(assignment.due_date)) byDate.set(assignment.due_date, []);
      byDate.get(assignment.due_date).push(assignment);
    });

    let html = dayNames.map((name) => `<div style="text-align:center;font-size:11px;color:var(--gold);font-weight:700;padding:6px;">${name}</div>`).join('');
    for (let i = 0; i < offset; i += 1) {
      html += `<div style="min-height:120px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,0.02);"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${pad(monthNumber)}-${pad(day)}`;
      const dayItems = byDate.get(key) || [];
      html += `<div style="min-height:120px;border:1px solid var(--border);border-radius:10px;background:${dayItems.length ? 'rgba(218,163,62,0.06)' : 'rgba(255,255,255,0.02)'};padding:6px;">
        <div style="display:flex;justify-content:space-between;gap:4px;align-items:center;margin-bottom:4px;">
          <strong style="font-size:12px;color:var(--ivory);">${day}</strong>
          ${dayItems.length ? `<span class="badge badge-level" style="font-size:9px;padding:2px 6px;">${dayItems.length}</span>` : ''}
        </div>
        <div style="display:grid;gap:3px;">
          ${dayItems.slice(0, 3).map((item) => {
            const coachName = coachNameForHomework(item);
            const assignee = assigneeLabel(item);
            return `<div title="${escapeValue(item.title)} | Coach: ${escapeValue(coachName)} | ${escapeValue(assignee)}" style="font-size:9px;color:var(--ivory-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:3px 4px;background:rgba(0,0,0,0.2);border-radius:4px;">
              <div style="color:var(--gold);font-weight:600;">${escapeValue(item.title)}</div>
              <div style="color:var(--ivory3);font-size:8px;">👤 ${escapeValue(coachName)} · ${escapeValue(assignee)}</div>
            </div>`;
          }).join('')}
          ${dayItems.length > 3 ? `<div style="font-size:9px;color:var(--gold);text-align:center;">+${dayItems.length - 3} more</div>` : ''}
        </div>
      </div>`;
    }

    grid.innerHTML = html;
  }

  function renderHomeworkCalendarList(items, listId = 'homework-calendar-list') {
    const list = $(listId);
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No homework matches the selected filters.</p></div>';
      return;
    }

    const grouped = new Map();
    items.forEach((assignment) => {
      const key = assignment.due_date || 'no-date';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(assignment);
    });

    const title = (key) => key === 'no-date' ? 'No due date' : formatDate(key);
    list.innerHTML = Array.from(grouped.entries()).map(([key, group]) => `<div>
      <div style="display:flex;align-items:center;gap:8px;margin:12px 0 6px;color:var(--gold);font-weight:700;font-size:13px;">
        <span>${title(key)}</span>
        <span class="badge badge-level">${group.length}</span>
      </div>
      ${sortHomework(group).map((item) => renderHomeworkCard(item, { selectable: isAdminUser() })).join('')}
    </div>`).join('');
  }

  function renderHomeworkCalendar() {
    const month = $('homework-month-filter');
    if (month && !month.value) month.value = monthKey(homeworkCalendarMonth);
    const items = getFilteredHomework();
    renderHomeworkCalendarGrid(items);
    renderHomeworkCalendarList(items);
    renderSelectedHomeworkList();
    // Update view visibility based on current view mode
    const grid = $('homework-calendar-grid');
    const list = $('homework-calendar-list');
    if (grid && list) {
      const viewMode = window.homeworkViewMode || 'calendar';
      if (viewMode === 'calendar') {
        grid.style.display = 'grid';
        list.style.display = 'none';
      } else {
        grid.style.display = 'none';
        list.style.display = 'grid';
      }
    }
  }

  function renderHomeworkCalendarForTarget(items, config) {
    const month = $(config.monthId);
    if (month && !month.value) month.value = monthKey(new Date());
    const monthValue = month ? month.value : monthKey(new Date());
    renderHomeworkCalendarGrid(items, config.gridId, monthValue);
    renderHomeworkCalendarList(items, config.listId);
    const grid = $(config.gridId);
    const list = $(config.listId);
    const viewMode = config.viewMode || 'calendar';
    if (grid) grid.style.display = viewMode === 'calendar' ? 'grid' : 'none';
    if (list) list.style.display = viewMode === 'list' ? 'grid' : 'none';
    const calendarButton = $(config.calendarButtonId);
    const listButton = $(config.listButtonId);
    if (calendarButton) {
      calendarButton.style.background = viewMode === 'calendar' ? 'var(--gold)' : 'transparent';
      calendarButton.style.color = viewMode === 'calendar' ? '#111' : 'var(--ivory)';
    }
    if (listButton) {
      listButton.style.background = viewMode === 'list' ? 'var(--gold)' : 'transparent';
      listButton.style.color = viewMode === 'list' ? '#111' : 'var(--ivory)';
    }
  }

  window.renderCoachAttendanceHomeworkCalendar = function () {
    const coachId = window.currentCoachId || window.userId;
    const coachBatches = (window.allBatches || []).filter(batch =>
      window.ckSameCoach ? window.ckSameCoach(batch.coach_id, coachId) : String(batch.coach_id) === String(coachId)
    );
    const batchIds = new Set(coachBatches.map(batch => String(batch.id)));
    const studentIds = new Set();
    coachBatches.forEach(batch => getBatchStudentIds(batch, window.allStudents || []).forEach(id => studentIds.add(String(id))));
    (window.allStudents || []).forEach(student => {
      if (window.ckSameCoach && window.ckSameCoach(student.coach_id, coachId)) studentIds.add(String(student.id));
    });

    const monthInput = $('coach-attendance-homework-month');
    const monthValue = monthInput && monthInput.value ? monthInput.value : monthKey(new Date());
    if (monthInput && !monthInput.value) monthInput.value = monthValue;
    const [year, monthNumber] = monthValue.split('-').map(Number);
    const items = sortHomework((window.allHomework || []).filter(assignment => {
      const targetType = String(assignment.target_type || '').toLowerCase();
      const appliesToStudent = targetType === 'student' && studentIds.has(String(assignment.student_id));
      const appliesToBatch = targetType === 'batch' && batchIds.has(String(assignment.batch_id));
      if (!appliesToStudent && !appliesToBatch) return false;
      if (!assignment.due_date) return true;
      const due = parseDateKey(assignment.due_date);
      return !!due && due.getFullYear() === year && due.getMonth() === monthNumber - 1;
    }));
    renderHomeworkCalendarForTarget(items, {
      monthId: 'coach-attendance-homework-month',
      gridId: 'coach-attendance-homework-grid',
      listId: 'coach-attendance-homework-list',
      calendarButtonId: 'coach-attendance-homework-calendar',
      listButtonId: 'coach-attendance-homework-list-view',
      viewMode: window.coachAttendanceHomeworkView || 'calendar'
    });
  };

  window.setCoachAttendanceHomeworkView = function (mode) {
    window.coachAttendanceHomeworkView = mode === 'list' ? 'list' : 'calendar';
    window.renderCoachAttendanceHomeworkCalendar?.();
  };

  window.setHomeworkView = function (mode) {
    window.homeworkViewMode = mode;
    const grid = $('homework-calendar-grid');
    const list = $('homework-calendar-list');
    const calBtn = $('hw-view-calendar');
    const listBtn = $('hw-view-list');
    if (mode === 'calendar') {
      if (grid) grid.style.display = 'grid';
      if (list) list.style.display = 'none';
      if (calBtn) calBtn.style.background = 'var(--gold)';
      if (calBtn) calBtn.style.color = '#111';
      if (listBtn) listBtn.style.background = 'transparent';
      if (listBtn) listBtn.style.color = 'var(--ivory)';
    } else {
      if (grid) grid.style.display = 'none';
      if (list) list.style.display = 'grid';
      if (calBtn) calBtn.style.background = 'transparent';
      if (calBtn) calBtn.style.color = 'var(--ivory)';
      if (listBtn) listBtn.style.background = 'var(--gold)';
      if (listBtn) listBtn.style.color = '#111';
    }
  };

  function renderAdminHomeworkSummary() {
    const container = $('admin-homework-summary');
    if (!container) return;
    const items = sortHomework(window.allHomework || []);
    if (!items.length) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No homework assigned yet.</p></div>';
      return;
    }
    container.innerHTML = items.slice(0, 6).map((item) => renderHomeworkCard(item)).join('');
  }

  function populateHomeworkSubmissionFilters() {
    const assignmentSelect = $('homework-submission-assignment-filter');
    const batchSelect = $('homework-submission-batch-filter');
    const studentSelect = $('homework-submission-student-filter');
    if (!assignmentSelect || !studentSelect) return;

    const assignmentCurrent = assignmentSelect.value;
    const batchCurrent = batchSelect ? batchSelect.value : '';
    const studentCurrent = studentSelect.value;
    assignmentSelect.innerHTML = '<option value="">All Assignments</option>' + (window.allHomework || [])
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
      .map((assignment) => `<option value="${assignment.id}">${escapeValue(assignment.title || 'Untitled Homework')}</option>`)
      .join('');
    if (batchSelect) {
      const batches = (window.allBatches || [])
        .filter((batch) => (batch.status || 'active') !== 'archived')
        .sort((a, b) => batchName(a).localeCompare(batchName(b)));
      batchSelect.innerHTML = '<option value="">All Batches</option>' + batches
        .map((batch) => `<option value="${batch.id}">${escapeValue(batchName(batch))}</option>`)
        .join('');
    }
    const coachFilter = getCoachFilterPredicate();
    const studs = coachFilter
      ? (window.allStudents || []).filter(s => coachFilter(s))
      : (window.allStudents || []);
    studentSelect.innerHTML = '<option value="">All Students</option>' + studs
      .filter((student) => (student.status || 'active') !== 'archived')
      .sort((a, b) => studentName(a).localeCompare(studentName(b)))
      .map((student) => `<option value="${student.id}">${escapeValue(studentName(student))}</option>`)
      .join('');
    if ([...assignmentSelect.options].some((option) => option.value === assignmentCurrent)) assignmentSelect.value = assignmentCurrent;
    if (batchSelect && [...batchSelect.options].some((option) => option.value === batchCurrent)) batchSelect.value = batchCurrent;
    if ([...studentSelect.options].some((option) => option.value === studentCurrent)) studentSelect.value = studentCurrent;
  }

  function getFilteredHomeworkSubmissions() {
    const assignmentId = $('homework-submission-assignment-filter') ? $('homework-submission-assignment-filter').value : '';
    const batchId = $('homework-submission-batch-filter') ? $('homework-submission-batch-filter').value : '';
    const studentId = $('homework-submission-student-filter') ? $('homework-submission-student-filter').value : '';
    const status = $('homework-submission-status-filter') ? $('homework-submission-status-filter').value : '';
    const coachFilter = getCoachFilterPredicate();
    const myStudents = coachFilter ? (window.allStudents || []).filter(s => coachFilter(s)) : (window.allStudents || []);
    const coachStudentIds = coachFilter ? new Set(myStudents.map(s => String(s.id))) : null;
    
    let batchStudentIds = null;
    if (batchId) {
      const bObj = (window.allBatches || []).find(b => String(b.id) === String(batchId));
      batchStudentIds = new Set(getBatchStudentIds(bObj, window.allStudents || []));
    }

    return (homeworkSubmissionCache || []).filter((submission) => {
      if (coachStudentIds && !coachStudentIds.has(String(submission.student_id))) return false;
      if (assignmentId && String(submission.assignment_id) !== assignmentId) return false;
      if (batchId && (!batchStudentIds || !batchStudentIds.has(String(submission.student_id)))) return false;
      if (studentId && String(submission.student_id) !== studentId) return false;
      if (status && String(submission.status) !== status) return false;
      return true;
    });
  }

  function renderHomeworkSubmissionReview() {
    const list = $('homework-submission-review-list');
    if (!list) return;
    populateHomeworkSubmissionFilters();
    const items = getFilteredHomeworkSubmissions();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No submissions match the selected filters.</p></div>';
      return;
    }

    list.innerHTML = items.map((submission) => {
      const assignment = (window.allHomework || []).find((item) => String(item.id) === String(submission.assignment_id));
      const student = (window.allStudents || []).find((item) => String(item.id) === String(submission.student_id));
      const title = assignment?.title || 'Untitled Homework';
      const name = studentName(student);
      const feedback = submission.feedback || '';
      const score = submission.score !== null && submission.score !== undefined ? escapeValue(submission.score) : '';
      const submittedAt = submission.submitted_at ? escapeValue(formatDate(String(submission.submitted_at).slice(0, 10))) : 'Not submitted';
      return `<div class="card" style="padding:14px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
              <h4 style="margin:0;color:var(--ivory);font-family:var(--font-head);font-size:14px;">${escapeValue(title)}</h4>
              ${submissionStatusBadge(submission.status)}
            </div>
            <div style="font-size:12px;color:var(--ivory-dim);line-height:1.6;">
              <strong>Student:</strong> ${escapeValue(name)} · <strong>Submitted:</strong> ${submittedAt} ${score ? `· <strong>Score:</strong> ${score}` : ''}
            </div>
          </div>
        </div>
        ${submission.submission_text ? `<div style="margin-top:10px;padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--ivory);line-height:1.55;white-space:pre-wrap;">${escapeValue(submission.submission_text)}</div>` : ''}
        ${submission.submission_url ? `<div style="margin-top:6px;font-size:12px;color:var(--gold);"><a href="${safeUrl(submission.submission_url)}" target="_blank" rel="noopener">Open submission link</a></div>` : ''}
        ${Array.isArray(submission.file_urls) && submission.file_urls.length > 0 ? `<div style="margin-top:6px;font-size:12px;color:var(--gold);"><strong>Attachments:</strong> ${submission.file_urls.map((url, i) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener" style="display:block;margin-top:4px;">📎 File ${i + 1}</a>`).join('')}</div>` : ''}
        ${feedback ? `<div style="margin-top:10px;padding:10px;background:rgba(218,163,62,0.06);border:1px solid rgba(218,163,62,0.25);border-radius:8px;font-size:12px;color:var(--ivory);white-space:pre-wrap;">${escapeValue(feedback)}</div>` : ''}
        <div style="display:grid;gap:8px;margin-top:12px;">
          <textarea id="homework-feedback-${submission.id}" class="input-field" placeholder="Teacher feedback or revision instructions..." style="min-height:70px;">${escapeValue(feedback)}</textarea>
          <input id="homework-score-${submission.id}" class="input-field" placeholder="Optional score" value="${score}">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-gold btn-sm" onclick="reviewHomeworkSubmission('${submission.id}', 'approved')">Approve</button>
            <button class="btn btn-outline-grey btn-sm" onclick="reviewHomeworkSubmission('${submission.id}', 'needs_revision')">Request Revision</button>
            <button class="btn btn-outline-grey btn-sm" onclick="reviewHomeworkSubmission('${submission.id}', 'closed')">Close</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function renderAdminHomeworkBatchPreview() {
    populateHomeworkSelectors();
    const batchSelect = $('homework-batch-preview');
    const list = $('homework-batch-preview-list');
    if (!batchSelect || !list) return;
    if (!batchSelect.options.length) {
      const batches = (window.allBatches || []).filter((b) => (b.status || 'active') !== 'archived').sort((a, b) => batchName(a).localeCompare(batchName(b)));
      batchSelect.innerHTML = '<option value="">Select a batch</option>' + batches.map((b) => `<option value="${b.id}">${escapeValue(batchName(b))}</option>`).join('');
    }
    const batchId = batchSelect.value;
    if (!batchId) {
      list.innerHTML = '<div class="loading-state"><span class="spinner"></span> Select a batch to preview homework</div>';
      return;
    }
    const batch = (window.allBatches || []).find((item) => String(item.id) === String(batchId));
    const items = sortHomework((window.allHomework || []).filter((assignment) => assignmentAppliesToBatch(assignment, batchId, window.allStudents || [], window.allBatches || [])));
    list.innerHTML = items.length
      ? items.map((item) => renderHomeworkCard(item)).join('')
      : `<div class="empty-state"><span class="empty-icon">📝</span><p>No homework assigned to ${escapeValue(batchName(batch))}.</p></div>`;
  }

  function renderHomeworkPage() {
    populateHomeworkSelectors();
    updateHomeworkTargetFields();
    const month = $('homework-month-filter');
    if (month && !month.value) month.value = monthKey(homeworkCalendarMonth);
    renderHomeworkCalendar();
    renderAdminHomeworkSummary();
    renderAdminHomeworkBatchPreview();
    renderHomeworkSubmissionReview();
    loadHomeworkSubmissions();
  }

  function resolveCurrentStudent() {
    if (window.currentStudent && window.currentStudent.id) return window.currentStudent;
    try {
      const auth = JSON.parse(sessionStorage.getItem('chesskidoo_auth') || sessionStorage.getItem('twoknights_auth') || localStorage.getItem('chesskidoo_auth') || localStorage.getItem('twoknights_auth') || '{}');
      const students = window.allStudents || [];
      if (auth.studentId && students.length) {
        const found = students.find(s => String(s.id) === String(auth.studentId));
        if (found) {
          window.currentStudent = found;
          return found;
        }
      }
      if (auth.user && students.length) {
        const userNorm = String(auth.user).toLowerCase().trim();
        const found = students.find(s => 
          (s.email && s.email.toLowerCase().trim() === userNorm) ||
          (s.name && s.name.toLowerCase().trim() === userNorm) ||
          (s.phone && s.phone.trim() === userNorm)
        );
        if (found) {
          window.currentStudent = found;
          return found;
        }
      }
    } catch (_) {}
    return window.currentStudent || null;
  }

  function renderChildHomework() {
    const list = $('child-homework-list');
    const student = resolveCurrentStudent();
    if (!list) return;
    if (!student) {
      list.innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading student context...</div>';
      return;
    }

    const homeworkList = window.allHomework || [];
    if (homeworkList.length === 0 && window.loadHomeworkData && !window._hwLoading) {
      window._hwLoading = true;
      window.loadHomeworkData(true).then(() => {
        window._hwLoading = false;
        renderChildHomework();
      }).catch(() => {
        window._hwLoading = false;
      });
    }

    const items = sortHomework(homeworkList.filter((assignment) => {
      if (!assignmentAppliesToStudent(assignment, student.id, window.allStudents || [])) return false;
      return isStudentEligibleForHomework(assignment, student.id);
    }));
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No homework assigned right now.</p></div>';
      return;
    }

    list.innerHTML = items.map((item) => renderHomeworkCard(item, { showActions: false })).join('');
  }

  function renderStudentHomeworkProgress() {
    const list = $('hw-progress-list');
    const studentId = $('hw-progress-student')?.value;
    const searchTopic = ($('hw-progress-topic-search')?.value || '').toLowerCase().trim();

    if (!list) return;

    if (!studentId) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">👤</span><p>Select a student to view progress.</p></div>';
      return;
    }

    const studentAssignments = sortHomework((window.allHomework || []).filter((assignment) => {
      if (!assignmentAppliesToStudent(assignment, studentId, window.allStudents || [])) return false;
      return isStudentEligibleForHomework(assignment, studentId);
    }));

    if (!studentAssignments.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No homework assigned to this student.</p></div>';
      return;
    }

    // Filter by topic keyword
    const filteredAssignments = studentAssignments.filter(a => {
      if (!searchTopic) return true;
      const title = (a.title || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      const files = Array.isArray(a.attachment_urls) ? a.attachment_urls.join(' ').toLowerCase() : '';
      return title.includes(searchTopic) || desc.includes(searchTopic) || files.includes(searchTopic);
    });

    if (!filteredAssignments.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>No matching topics found.</p></div>';
      return;
    }

    let html = `
      <div style="box-shadow: var(--shadow); border-radius: 10px; overflow-x: auto; border: 1px solid var(--border);">
        <table style="width:100%; border-collapse:collapse; background:var(--surface); text-align:left;">
          <thead>
            <tr style="background:var(--bg3); border-bottom:1px solid var(--border);">
              <th style="padding:10px 14px; font-weight:600; color:var(--ivory-dim); font-size:12px;">Topic / Title</th>
              <th style="padding:10px 14px; font-weight:600; color:var(--ivory-dim); font-size:12px;">Due Date</th>
              <th style="padding:10px 14px; font-weight:600; color:var(--ivory-dim); font-size:12px;">Status</th>
              <th style="padding:10px 14px; font-weight:600; color:var(--ivory-dim); font-size:12px;">Score</th>
              <th style="padding:10px 14px; font-weight:600; color:var(--ivory-dim); font-size:12px;">Submitted At</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredAssignments.forEach(assignment => {
      // Find submission in cache or assignment.student_submission
      let submission = assignment.student_submission;
      if (!submission && homeworkSubmissionCache.length > 0) {
        submission = homeworkSubmissionCache.find(sub => 
          String(sub.assignment_id) === String(assignment.id) && 
          String(sub.student_id) === String(studentId)
        );
      }

      const status = submission?.status || 'not_submitted';
      const score = submission?.score !== null && submission?.score !== undefined ? escapeValue(submission.score) : '—';
      const submittedAt = submission?.submitted_at ? escapeValue(formatDate(submission.submitted_at.slice(0, 10))) : '—';

      html += `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 14px; color:var(--ivory); font-weight:500;">${escapeValue(assignment.title || 'Untitled')}</td>
          <td style="padding:10px 14px; color:var(--ivory2); font-size:12px;">${formatDate(assignment.due_date)}</td>
          <td style="padding:10px 14px;">${submissionStatusBadge(status)}</td>
          <td style="padding:10px 14px; color:var(--ivory2); font-size:12px;">${score}</td>
          <td style="padding:10px 14px; color:var(--ivory-dim); font-size:12px;">${submittedAt}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    list.innerHTML = html;
  }

  window.assignmentAppliesToStudent = assignmentAppliesToStudent;
  window.assignmentAppliesToBatch = assignmentAppliesToBatch;
  window.isStudentEligibleForHomework = isStudentEligibleForHomework;
  window.updateHomeworkTargetFields = updateHomeworkTargetFields;
  window.openHomeworkAssignmentModal = openHomeworkAssignmentModal;
  window.updatePastHomeworkHistory = updatePastHomeworkHistory;
  window.filterPastHomeworkList = filterPastHomeworkList;
  window.saveHomeworkAssignment = saveHomeworkAssignment;
  window.updateHomeworkStatus = updateHomeworkStatus;
  window.applyBulkHomeworkStatus = applyBulkHomeworkStatus;
  window.selectFilteredHomework = selectFilteredHomework;
  window.clearHomeworkSelection = clearHomeworkSelection;
  window.removeHomeworkSelection = removeHomeworkSelection;
  window.toggleHomeworkSelection = toggleHomeworkSelection;
  window.deleteHomeworkAssignment = deleteHomeworkAssignment;
  window.submitHomeworkForChild = submitHomeworkForChild;
  window.reviewHomeworkSubmission = reviewHomeworkSubmission;
  window.loadHomeworkSubmissions = loadHomeworkSubmissions;
  window.renderHomeworkSubmissionReview = renderHomeworkSubmissionReview;
  window.renderHomeworkCalendar = renderHomeworkCalendar;
  window.renderHomeworkPage = renderHomeworkPage;
  window.renderAdminHomeworkBatchPreview = renderAdminHomeworkBatchPreview;
  window.renderChildHomework = renderChildHomework;
  window.renderStudentHomeworkProgress = renderStudentHomeworkProgress;
  window.saveHomeworkEdit = saveHomeworkEdit;
  window.setHomeworkView = setHomeworkView;
})();
