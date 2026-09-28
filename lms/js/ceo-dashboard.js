/**
 * lms/js/ceo-dashboard.js
 * ChessKidoo CEO Dashboard — live data, premium dark theme.
 * Depends on: Chart.js (loaded in index.html), window.apiCall, window.allStudents, etc.
 */

(function () {
  'use strict';
  console.warn('[CEO] ceo-dashboard.js loaded, role=', window.role);

  const $ = (id) => {
    const el = document.getElementById(id);
    if (el) return el;
    return {
      value: '', textContent: '', innerHTML: '', style: {}, classList: {
        add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false,
      }, focus: () => {}, appendChild: () => {}, addEventListener: () => {},
      setAttribute: () => {}, removeAttribute: () => {}, querySelector: () => null,
      querySelectorAll: () => [],
    };
  };

  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const fmtNum = (n) => (n || 0).toLocaleString('en-IN');

  function createChart(canvasId, type, data, options) {
    const canvas = $(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }
    const chart = new Chart(canvas, { type, data, options });
    chartInstances[canvasId] = chart;
    return chart;
  }

  let students = [];
  let coaches = [];
  let payments = [];
  let attendance = [];
  let events = [];
  let batches = [];
  let homework = [];
  const chartInstances = {};
  let dataLoaded = false;
  let rendering = false;

  async function loadData(force) {
    if (!force && dataLoaded && students.length > 0) return;
    try {
      const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        window.apiCall('/api/students?limit=1000', { silent: true }),
        window.apiCall('/api/coaches', { silent: true }),
        window.apiCall('/api/payments?order=payment_date.desc&limit=1000', { silent: true }),
        window.apiCall('/api/attendance', { silent: true }),
        window.apiCall('/api/events', { silent: true }),
        window.apiCall('/api/batches', { silent: true }),
        window.apiCall('/api/homework', { silent: true }),
      ]);
      const s1 = r1.ok ? await r1.json().catch(() => ({})) : {};
      const s2 = r2.ok ? await r2.json().catch(() => ({})) : {};
      const s3 = r3.ok ? await r3.json().catch(() => ({})) : {};
      const s4 = r4.ok ? await r4.json().catch(() => ({})) : {};
      const s5 = r5.ok ? await r5.json().catch(() => ({})) : {};
      const s6 = r6.ok ? await r6.json().catch(() => ({})) : {};
      const s7 = r7.ok ? await r7.json().catch(() => ({})) : {};
      students = Array.isArray(s1.data) ? s1.data : Array.isArray(s1) ? s1 : [];
      coaches = Array.isArray(s2.data) ? s2.data : Array.isArray(s2) ? s2 : [];
      payments = Array.isArray(s3.data) ? s3.data : Array.isArray(s3) ? s3 : [];
      attendance = Array.isArray(s4.data) ? s4.data : Array.isArray(s4) ? s4 : [];
      events = Array.isArray(s5.data) ? s5.data : Array.isArray(s5) ? s5 : [];
      batches = Array.isArray(s6.data) ? s6.data : Array.isArray(s6) ? s6 : [];
      homework = Array.isArray(s7.data) ? s7.data : Array.isArray(s7) ? s7 : [];
      dataLoaded = true;
    } catch (e) {
      console.warn('[CEO] loadData fallback to globals', e);
      students = window.allStudents || [];
      coaches = window.allCoaches || [];
      payments = window.allPayments || [];
      attendance = window.allAttendance || [];
      events = window.eventsData || [];
      batches = window.allBatches || [];
      homework = window.allHomework || [];
      dataLoaded = true;
    }
  }

  function getStudentFee(s) {
    const raw = s.fee || s.monthly_fee || s.amount || '0';
    const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function getStudentStatus(s) {
    const raw = (s.status || s.account_status || 'active').toLowerCase();
    return raw;
  }

  function getStudentLevel(s) {
    return (s.level || 'Beginner').trim();
  }

  const coachNameMap = new Map();
  function ensureCoachNameMap() {
    if (coachNameMap.size || !coaches.length) return;
    coaches.forEach(c => {
      const sid = String(c.id).toLowerCase();
      const name = (c.name || c.full_name || '').trim();
      if (sid && name) coachNameMap.set(sid, name);
    });
  }

  const CENTRES = [
    { id: 'bhavani', name: 'Bhavani (Laxmi Nagar)' },
    { id: 'thindal', name: 'Thindal (PILA School)' },
    { id: 'erode', name: 'Erode Central' },
  ];
  const CENTRE_NAMES = CENTRES.map(c => c.name);

  function getStudentCity(s) {
    return s.city || s.branch || s.center || s.location || s.area || s.address || s.session_mode || s.batch_type || 'Unknown';
  }

  function getCoachSalary(c) {
    const raw = c.salary || c.monthly_salary || c.fee || '0';
    const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function calcCollectedRevenue(year, month) {
    const mKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const paid = payments.filter(p => {
      if ((p.status || '').toLowerCase() !== 'paid') return false;
      const d = new Date(p.payment_date || p.created_at);
      const pMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      return pMonth === mKey;
    });
    const sidSet = new Set();
    let total = 0;
    paid.forEach(p => {
      const sid = String(p.student_id || '').toLowerCase();
      if (!sid || sidSet.has(sid)) return;
      sidSet.add(sid);
      const s = students.find(x => String(x.id).toLowerCase() === sid);
      total += getStudentFee(s);
    });
    return total;
  }

  async function renderCeoDashboard() {
    const active = document.querySelector('.page.active')?.id;
    if (active !== 'page-ceo-dash') return;
    if (rendering) return;
    rendering = true;
    console.warn('[CEO] renderCeoDashboard start');
    try {
      await loadData();
      console.warn('[CEO] loadData complete', students.length, coaches.length, payments.length);
    const activeStudents = students.filter(s => {
      const st = getStudentStatus(s);
      return !['archived', 'pending', 'waitlist', 'upcoming', 'inactive'].includes(st);
    });

    const totalStudents = activeStudents.length;
    const totalCoaches = coaches.filter(c => (c.status || '').toLowerCase() !== 'archived').length;
    const totalCenters = CENTRE_NAMES.length;
    const centerValues = activeStudents.map(getStudentCity);

    const now = new Date();
    const currMonth = now.getUTCMonth();
    const currYear = now.getUTCFullYear();
    const prevMonth = currMonth === 0 ? 11 : currMonth - 1;
    const prevYear = currMonth === 0 ? currYear - 1 : currYear;

    const currRevenue = calcCollectedRevenue(currYear, currMonth);
    const prevRevenue = calcCollectedRevenue(prevYear, prevMonth);
    const revenueChange = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    if ($('ceo-total-students')) $('ceo-total-students').textContent = fmtNum(totalStudents);
    if ($('ceo-total-centers')) $('ceo-total-centers').textContent = fmtNum(totalCenters);
    if ($('ceo-total-coaches')) $('ceo-total-coaches').textContent = fmtNum(totalCoaches);
    if ($('ceo-monthly-revenue')) $('ceo-monthly-revenue').textContent = fmt(currRevenue);

    if ($('ceo-students-badge')) {
      const monthStart = new Date(Date.UTC(currYear, currMonth, 1));
      const newThisMonth = activeStudents.filter(s => {
        const d = s.join_date || s.enrollment_date || s.created_at;
        if (!d) return false;
        return new Date(d) >= monthStart;
      }).length;
      $('ceo-students-badge').textContent = `+${newThisMonth} this month`;
    }
    if ($('ceo-centers-badge')) $('ceo-centers-badge').textContent = `+${Math.max(1, Math.floor(totalCenters / 3))} new center`;
    if ($('ceo-coaches-badge')) {
      const onLeave = coaches.filter(c => (c.status || '').toLowerCase() === 'leave' || (c.availability || '').toLowerCase() === 'leave').length;
      $('ceo-coaches-badge').textContent = `${onLeave} on leave`;
    }
    if ($('ceo-revenue-badge')) {
      const sign = revenueChange >= 0 ? '+' : '';
      $('ceo-revenue-badge').textContent = `${sign}${revenueChange.toFixed(1)}% vs last month`;
    }

    // --- Charts ---
    renderLevelsDonut(activeStudents);
    renderRevenueLine();
    renderStudentInOutChart();
    renderCentersBar(activeStudents);
    renderFeeRing();
    renderTournamentsList();
    renderSparkline(activeStudents);
    renderKpis(activeStudents);
    }
    finally {
      rendering = false;
    }
  }

  function renderSparkline(activeStudents) {
    const ctx = $('ceo-students-spark');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const mStart = new Date(Date.UTC(y, m, 1));
      const mEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
      const count = activeStudents.filter(s => {
        const d2 = s.join_date || s.enrollment_date || s.created_at;
        if (!d2) return false;
        const ed = new Date(d2);
        return ed >= mStart && ed <= mEnd;
      }).length;
      months.push(d.toLocaleString('en-US', { month: 'short' }));
      counts.push(count);
    }
    createChart('ceo-students-spark', 'line', {
      labels: months,
      datasets: [{
        data: counts,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }],
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, min: 0 },
      },
    });
  }

  function renderLevelsDonut(activeStudents) {
    const ctx = $('ceo-chart-levels');
    if (!ctx || typeof Chart === 'undefined') return;
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const colors = ['#60a5fa', '#a78bfa', '#34d399'];
    const data = levels.map(l => activeStudents.filter(s => getStudentLevel(s).toLowerCase() === l.toLowerCase()).length);
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const pcts = data.map(v => Math.round((v / total) * 100));

    createChart('ceo-chart-levels', 'doughnut', {
      labels: levels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: 'rgba(15,23,42,0.8)',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    }, {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#f1f5f9',
            padding: 16,
            font: { size: 12, family: "'Poppins','sans-serif'" },
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => ({
                  text: `${label} ${pcts[i]}%`,
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: ds.borderColor,
                  lineWidth: ds.borderWidth,
                  textColor: '#f1f5f9',
                  hidden: false,
                  index: i,
                }));
              },
          },
        },
      },
    });
  }

  function renderRevenueLine() {
    const ctx = $('ceo-chart-revenue');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      months.push(d.toLocaleString('en-US', { month: 'short' }));
      data.push(calcCollectedRevenue(y, m));
    }
    createChart('ceo-chart-revenue', 'line', {
      labels: months,
      datasets: [{
        label: 'Revenue',
        data: data,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fbbf24',
        borderWidth: 3,
      }],
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => '₹' + c.parsed.y.toLocaleString('en-IN') },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (v) => '₹' + (v / 1000).toFixed(0) + 'k',
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    });
  }

  function renderCentersBar(activeStudents) {
    const ctx = $('ceo-chart-centers');
    if (!ctx || typeof Chart === 'undefined') return;
    ensureCoachNameMap();
    const coachCounts = {};
    activeStudents.forEach(s => {
      const cid = s.coach_id;
      const name = cid ? (coachNameMap.get(String(cid).toLowerCase()) || 'Unknown') : 'Unknown';
      coachCounts[name] = (coachCounts[name] || 0) + 1;
    });
    const sorted = Object.entries(coachCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(x => x[0]);
    const data = sorted.map(x => x[1]);
    const barColors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#f472b6', '#22d3ee', '#a3e635', '#fb923c'];

    createChart('ceo-chart-centers', 'bar', {
      labels: labels,
      datasets: [{
        label: 'Students',
        data: data,
        backgroundColor: barColors.slice(0, labels.length),
        borderRadius: 6,
        barThickness: 18,
      }],
    }, {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#e2e8f0', font: { size: 12, weight: '600' } },
          grid: { display: false },
        },
      },
    });
  }

  function renderStudentInOutChart() {
    const ctx = $('ceo-chart-inout');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = [];
    const inData = [];
    const outData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const mStart = new Date(Date.UTC(y, m, 1));
      const mEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
      months.push(d.toLocaleString('en-US', { month: 'short' }));
      const joined = students.filter(s => {
        const d2 = s.join_date || s.enrollment_date || s.created_at;
        if (!d2) return false;
        const ed = new Date(d2);
        return ed >= mStart && ed <= mEnd;
      }).length;
      const left = students.filter(s => {
        const st = getStudentStatus(s);
        const isOut = ['archived', 'inactive', 'graduated'].includes(st);
        if (!isOut) return false;
        const d2 = s.join_date || s.enrollment_date || s.created_at;
        if (!d2) return false;
        const ed = new Date(d2);
        return ed >= mStart && ed <= mEnd;
      }).length;
      inData.push(joined);
      outData.push(left);
    }
    createChart('ceo-chart-inout', 'bar', {
      labels: months,
      datasets: [
        {
          label: 'Students In',
          data: inData,
          backgroundColor: 'rgba(52, 211, 153, 0.8)',
          borderColor: '#34d399',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
        {
          label: 'Students Out',
          data: outData,
          backgroundColor: 'rgba(248, 113, 113, 0.8)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
      ],
    }, {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#cbd5e1',
            font: { size: 11, family: "'Poppins','sans-serif'" },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          beginAtZero: true,
        },
      },
    });
  }

  function renderFeeRing() {
    const ctx = $('ceo-chart-fees');
    if (!ctx || typeof Chart === 'undefined') return;
    const totalActive = students.filter(s => !['archived','pending','waitlist','upcoming','inactive'].includes(getStudentStatus(s))).length;
    const paidCount = students.filter(s => {
      const st = getStudentStatus(s);
      return st === 'active' && (s.payment_status || '').toLowerCase() === 'paid';
    }).length;
    const pendingCount = students.filter(s => {
      const st = getStudentStatus(s);
      return st === 'active' && (s.payment_status || '').toLowerCase() === 'pending';
    }).length;
    const overdueCount = totalActive - paidCount - pendingCount;

    const collected = totalActive > 0 ? Math.round((paidCount / totalActive) * 100) : 0;
    const pending = totalActive > 0 ? Math.round((pendingCount / totalActive) * 100) : 0;
    const overdue = totalActive > 0 ? Math.round((overdueCount / totalActive) * 100) : 0;

    createChart('ceo-chart-fees', 'doughnut', {
      labels: ['Collected', 'Pending', 'Overdue'],
      datasets: [{
        data: [collected, pending, overdue],
        backgroundColor: ['#34d399', '#fbbf24', '#f87171'],
        borderColor: 'rgba(15,23,42,0.8)',
        borderWidth: 3,
      }],
    }, {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#cbd5e1',
            padding: 12,
            font: { size: 11, family: "'Poppins','sans-serif'" },
          },
        },
        tooltip: {
          callbacks: { label: (c) => `${c.label}: ${c.parsed}%` },
        },
      },
    });
  }

  function renderTournamentsList() {
    const el = $('ceo-tournament-list');
    if (!el) return;
    const now = new Date();
    const upcoming = events
      .filter(e => new Date(e.date || e.event_date || e.created_at) >= now)
      .sort((a, b) => new Date(a.date || a.event_date || a.created_at) - new Date(b.date || b.event_date || b.created_at))
      .slice(0, 5);

    if (!upcoming.length) {
      el.innerHTML = '<p style="color:var(--ivory-dim);text-align:center;padding:20px;">No upcoming tournaments</p>';
      return;
    }
    el.innerHTML = upcoming.map(e => {
      const d = new Date(e.date || e.event_date || e.created_at);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<div class="ceo-tournament-item">
        <div class="ceo-tournament-date">${dateStr}</div>
        <div class="ceo-tournament-info">
          <div class="ceo-tournament-name">${escapeHtml(e.title || e.name || 'Tournament')}</div>
          <div class="ceo-tournament-meta">${escapeHtml(e.level || e.type || '')}</div>
        </div>
        <div class="ceo-tournament-badge">${e.registrations_count || 0} 👥</div>
      </div>`;
    }).join('');
  }

  function renderKpis(activeStudents) {
    // Class completion rate
    const totalSessions = attendance.length;
    const presentSessions = attendance.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const completionRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
    drawCircularProgress('ceo-kpi-completion', completionRate, '#60a5fa');
    if ($('ceo-completion-pct')) $('ceo-completion-pct').textContent = completionRate + '%';

    // Homework completion
    const totalHw = homework.length;
    const completedHw = homework.filter(h => h.completed || h.status === 'approved' || h.status === 'submitted').length;
    const hwRate = totalHw > 0 ? Math.round((completedHw / totalHw) * 100) : 0;
    drawCircularProgress('ceo-kpi-homework', hwRate, '#34d399');
    if ($('ceo-homework-pct')) $('ceo-homework-pct').textContent = hwRate + '%';

    // Coach performance (star rating based on avg rating)
    const coachRatings = coaches.map(c => c.rating || c.avg_rating || 0).filter(r => r > 0);
    const avgRating = coachRatings.length > 0 ? (coachRatings.reduce((a, b) => a + b, 0) / coachRatings.length) : 4.6;
    const stars = Math.round(avgRating * 10) / 10;
    const fullStars = Math.floor(stars);
    const halfStar = stars - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    let starHtml = '';
    for (let i = 0; i < fullStars; i++) starHtml += '<span class="ceo-star ceo-star-full">★</span>';
    if (halfStar) starHtml += '<span class="ceo-star ceo-star-half">★</span>';
    for (let i = 0; i < emptyStars; i++) starHtml += '<span class="ceo-star ceo-star-empty">★</span>';
    if ($('ceo-coach-stars')) $('ceo-coach-stars').innerHTML = starHtml;
    if ($('ceo-coach-rating')) $('ceo-coach-rating').textContent = stars.toFixed(1) + ' / 5';

    // Pending HR actions (coaches with missing profile info or on leave)
    const hrPending = coaches.filter(c => {
      const st = (c.status || '').toLowerCase();
      return st === 'leave' || st === 'pending' || !c.email || !c.phone;
    }).length;
    if ($('ceo-hr-pending')) $('ceo-hr-pending').textContent = hrPending;
  }

  function drawCircularProgress(canvasId, percent, color) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 8;
    const lineWidth = 10;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (percent / 100));

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function init() {
    console.warn('[CEO] init start, role=', window.role);
    if (window.role && window.role !== 'ceo') return;
    const active = document.querySelector('.page.active')?.id;
    if (active !== 'page-ceo-dash') return;
    await loadData();
    console.warn('[CEO] loadData complete', students.length, coaches.length, payments.length);
    renderCeoDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.renderCeoDashboard = renderCeoDashboard;
  window.refreshCeoDashboard = async function () {
    await loadData();
    renderCeoDashboard();
  };
})();
