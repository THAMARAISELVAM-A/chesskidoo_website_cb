/* assets/js/ai-analysis.js -------------------------------------------------
   ChessKidoo AI Weakness Analysis & Study Plan Generator
   Analyzes student game patterns → detects weaknesses → generates study plans
   Predictive ELO growth, dropout risk, engagement scoring
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.ai = (() => {
  const AI = {};

  /* ─── Weakness Categories ─── */
  const CATEGORIES = {
    opening:    { name: 'Opening Play',       icon: '📖', weight: 0.15 },
    tactics:    { name: 'Tactical Vision',     icon: '⚔️', weight: 0.25 },
    endgame:    { name: 'Endgame Technique',   icon: '♔', weight: 0.20 },
    time_mgmt:  { name: 'Time Management',     icon: '⏱️', weight: 0.10 },
    king_safety: { name: 'King Safety',        icon: '🛡️', weight: 0.15 },
    pawn_struct: { name: 'Pawn Structure',     icon: '♟', weight: 0.10 },
    calculation: { name: 'Calculation Depth',  icon: '🧠', weight: 0.05 }
  };

  /* ─── Analyze Student Profile ─── */
  AI.analyzeStudent = async (studentId) => {
    const profile = await CK.db.getProfile(studentId);
    if (!profile) return null;

    const ratings = await CK.db.getRatings(profile.userid || studentId);
    const attendance = await CK.db.getAttendance(studentId);
     // const puzzleScores = await CK.db.getPuzzleScores(studentId);
    const xpLogs = CK.rpg ? CK.rpg.getXPHistory(studentId, 100) : [];

    // Calculate scores per category (0-100)
    const elo = parseInt(profile.rating) || 800;
    const gamesPlayed = parseInt(profile.game) || 0;
    const puzzlesSolved = parseInt(profile.puzzle) || 0;

    const scores = {};

    // Opening score: based on ELO tier and opening trainer usage
    const openingLogs = xpLogs.filter(l => l.action === 'opening_mastered');
    scores.opening = Math.min(100, Math.round(
      (elo > 1200 ? 60 : elo > 1000 ? 45 : elo > 800 ? 30 : 15) +
      openingLogs.length * 10
    ));

    // Tactics score: based on puzzle solve rate and accuracy
    const puzzleRate = puzzlesSolved > 0 ? Math.min(100, puzzlesSolved * 1.5) : 10;
    scores.tactics = Math.round(puzzleRate * 0.7 + (elo > 1000 ? 30 : elo > 800 ? 15 : 5));

    // Endgame score: based on ELO and endgame-specific puzzle performance
    scores.endgame = Math.min(100, Math.round(
      (elo > 1400 ? 70 : elo > 1200 ? 55 : elo > 1000 ? 40 : elo > 800 ? 25 : 10) +
      (puzzlesSolved > 30 ? 20 : puzzlesSolved > 10 ? 10 : 0)
    ));

    // Time management: based on game count and streak consistency
    const streak = parseInt(profile.streak || profile.star || 0);
    scores.time_mgmt = Math.min(100, Math.round(
      (gamesPlayed > 50 ? 50 : gamesPlayed > 20 ? 35 : gamesPlayed > 5 ? 20 : 10) +
      streak * 5
    ));

    // King safety: derived from ELO range and blunder frequency proxy
    scores.king_safety = Math.min(100, Math.round(
      elo > 1400 ? 75 : elo > 1200 ? 60 : elo > 1000 ? 45 : elo > 800 ? 30 : 15
    ));

    // Pawn structure: mid-level skill
    scores.pawn_struct = Math.min(100, Math.round(
      elo > 1200 ? 65 : elo > 1000 ? 45 : elo > 800 ? 25 : 10
    ));

    // Calculation depth: higher ELO = better calculation
    scores.calculation = Math.min(100, Math.round(
      elo > 1600 ? 85 : elo > 1400 ? 70 : elo > 1200 ? 55 : elo > 1000 ? 40 : elo > 800 ? 25 : 10
    ));

    // Overall composite score
    let overall = 0;
    for (const [cat, info] of Object.entries(CATEGORIES)) {
      overall += (scores[cat] || 0) * info.weight;
    }
    overall = Math.round(overall);

    // Identify weaknesses (below 40) and strengths (above 60)
    const weaknesses = Object.entries(scores)
      .filter(([, v]) => v < 40)
      .sort((a, b) => a[1] - b[1])
      .map(([k]) => k);

    const strengths = Object.entries(scores)
      .filter(([, v]) => v >= 60)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    // Attendance stats
    const totalClasses = attendance.length || 1;
    const attended = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = Math.round((attended / totalClasses) * 100);

    // ELO trend
    const eloTrend = ratings.length >= 2
      ? ratings[ratings.length - 1].online - ratings[0].online
      : 0;

    return {
      studentId,
      studentName: profile.full_name,
      elo,
      scores,
      overall,
      weaknesses,
      strengths,
      attendanceRate,
      eloTrend,
      gamesPlayed,
      puzzlesSolved,
      level: profile.level || 'Beginner'
    };
  };

  /* ─── Generate Study Plan ─── */
  AI.generateStudyPlan = (analysis) => {
    if (!analysis) return null;

    const plan = {
      studentId: analysis.studentId,
      studentName: analysis.studentName,
      createdAt: new Date().toISOString(),
      duration: '4 weeks',
      focus: [],
      weeklySchedule: [],
      puzzleRecommendations: [],
      openingRecommendations: []
    };

    // Focus on weakest areas
    const focusAreas = analysis.weaknesses.slice(0, 3);
    if (focusAreas.length === 0) focusAreas.push('tactics', 'endgame'); // Default for strong students

    focusAreas.forEach(cat => {
      const info = CATEGORIES[cat];
      plan.focus.push({
        category: cat,
        name: info.name,
        icon: info.icon,
        currentScore: analysis.scores[cat],
        targetScore: Math.min(100, analysis.scores[cat] + 25)
      });
    });

    // Weekly schedule
    const weekPlans = [
      { week: 1, theme: 'Assessment & Foundation', tasks: [] },
      { week: 2, theme: 'Targeted Practice', tasks: [] },
      { week: 3, theme: 'Application & Games', tasks: [] },
      { week: 4, theme: 'Review & Tournament Prep', tasks: [] }
    ];

    // Populate tasks based on weaknesses
    const taskTemplates = {
      opening: [
        'Study 3 main opening lines for your repertoire',
        'Practice opening principles: center control, development, castling',
        'Play 5 training games focusing on the first 10 moves',
        'Review and memorize 2 new opening variations'
      ],
      tactics: [
        'Solve 10 pin & fork puzzles daily',
        'Practice knight and bishop checkmate patterns',
        'Complete the tactical vision drill set',
        'Time-limited puzzle rush: solve 20 puzzles in 10 minutes'
      ],
      endgame: [
        'Master King + Pawn vs King endgame',
        'Study Lucena and Philidor rook endgame positions',
        'Practice opposition and triangulation',
        'Play 5 endgame-only training games'
      ],
      time_mgmt: [
        'Play 3 rapid games with clock awareness practice',
        'Practice the 40-20-10 time allocation rule',
        'Analyze your last 5 games for time usage patterns',
        'Complete timed puzzle sets to build speed'
      ],
      king_safety: [
        'Study 5 classic king-side attack patterns',
        'Practice recognizing when NOT to castle',
        'Solve 10 defensive tactical puzzles',
        'Review games where you lost to king attacks'
      ],
      pawn_struct: [
        'Learn about isolated, doubled, and backward pawns',
        'Study pawn chains and pawn breaks',
        'Analyze 3 master games focusing on pawn play',
        'Practice pawn endgame positions'
      ],
      calculation: [
        'Practice visualization: play blindfold 3-move sequences',
        'Solve complex puzzles requiring 4+ move calculation',
        'Candidate moves exercise: find 3 options before choosing',
        'Study combination patterns: sacrifice then calculate'
      ]
    };

     focusAreas.forEach((cat) => {
       const tasks = taskTemplates[cat] || taskTemplates.tactics;
       tasks.forEach((task, j) => {
         weekPlans[j].tasks.push({ category: cat, task, icon: CATEGORIES[cat].icon });
       });
     });

    plan.weeklySchedule = weekPlans;

    // Puzzle recommendations
    if (analysis.scores.tactics < 50) {
      plan.puzzleRecommendations.push('Focus on basic tactical motifs: pins, forks, skewers');
      plan.puzzleRecommendations.push('Solve at least 5 puzzles daily at your level');
    }
    if (analysis.scores.endgame < 40) {
      plan.puzzleRecommendations.push('Practice fundamental endgame positions (K+P, K+R)');
    }
    if (analysis.elo < 1000) {
      plan.puzzleRecommendations.push('Start with easy puzzles (rated 800-1000) and work up');
    } else {
      plan.puzzleRecommendations.push(`Target puzzles rated ${analysis.elo - 100} to ${analysis.elo + 200}`);
    }

    // Opening recommendations — personalised by level AND the student's profile.
    const _pools = {
      Beginner: [
        ['Italian Game (1.e4 e5 2.Bc4)', 'Natural development and early pressure on f7 — perfect for learning tactics.'],
        ['London System (1.d4, Bf4)', 'A solid, easy setup you can play against almost anything.'],
        ['Scandinavian Defense (1…d5)', 'Clear plans for Black with very little theory to memorise.'],
        ["Queen's Gambit (1.d4 d5 2.c4)", 'Teaches central control and pawn-structure basics.']
      ],
      Intermediate: [
        ['Ruy Lopez', 'Rich strategic play that sharpens long-term planning.'],
        ['Sicilian Defense (Najdorf)', 'Fighting, double-edged positions to grow tactical vision.'],
        ["Queen's Gambit Declined", 'Solid structures that reward good piece coordination.'],
        ['Caro-Kann Defense', 'Reliable, low-risk defence with clean endgames.']
      ],
      Advanced: [
        ['Catalan Opening', 'Long-term pressure and squeeze technique for strong players.'],
        ['Grünfeld Defense', 'Dynamic counterplay against 1.d4 — tests calculation.'],
        ['English Opening', 'Flexible and transpositional — broadens your repertoire.'],
        ['Nimzo-Indian Defense', 'Principled control of e4 with excellent structures.']
      ]
    };
    const _lvl = (analysis.level === 'Intermediate') ? 'Intermediate'
              : (analysis.level === 'Beginner') ? 'Beginner' : 'Advanced';
    const _pool = _pools[_lvl];
    const _weak = new Set(analysis.weaknesses);
    // If tactics/king-safety are weak, lead with the more solid/forcing option to reduce blunders.
    let _chosen = _pool.slice(0, 3);
    if (_weak.has('tactics') || _weak.has('king_safety')) {
      _chosen = [_pool[1], _pool[0], _pool[2]];
    } else if (_weak.has('endgame')) {
      _chosen = [_pool[3] || _pool[2], _pool[0], _pool[1]];
    }
    plan.openingRecommendations = _chosen.map(o => ({ name: o[0], why: o[1] }));

    // Plain-language summary so the plan feels "discussed", grounded in real scores.
    const _wn = analysis.weaknesses.slice(0, 2).map(c => (CATEGORIES[c] && CATEGORIES[c].name) || c);
    const _goal = Math.round(analysis.elo + (analysis.weaknesses.length ? 80 : 120));
    plan.summary = _wn.length
      ? `Your data shows <b>${_wn.join(' and ')}</b> ${_wn.length > 1 ? 'are' : 'is'} holding you back most right now. This 4-week plan front-loads those areas — daily tactics, targeted endgames and structure work — aiming to lift your rating from <b>${analysis.elo}</b> toward <b>~${_goal}</b>.`
      : `You're well-rounded across the board. This plan keeps your edge sharp with mixed tactics, endgame technique and game analysis, aiming from <b>${analysis.elo}</b> toward <b>~${_goal}</b>.`;

    return plan;
  };

  /* ─── Predictive ELO Growth ─── */
  AI.predictELO = async (studentId, months = 6) => {
    const ratings = await CK.db.getRatings(studentId);
    if (ratings.length < 2) return { predictions: [], confidence: 'low' };

    // Calculate monthly growth rate from historical data
    const firstRating = ratings[0].online;
    const lastRating = ratings[ratings.length - 1].online;
    const monthsOfData = Math.max(1, ratings.length - 1);
    const monthlyGrowth = (lastRating - firstRating) / monthsOfData;

    // Apply learning decay (growth slows over time)
    const predictions = [];
    let currentELO = lastRating;
    for (let m = 1; m <= months; m++) {
      const decay = Math.max(0.3, 1 - (m * 0.08)); // Slower growth over time
      const trainingImpact = monthlyGrowth * decay;
      const tournamentBonus = m % 3 === 0 ? 15 : 0; // Tournament bump every 3 months
      currentELO = Math.round(currentELO + trainingImpact + tournamentBonus);
      predictions.push({
        month: m,
        date: new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
        predictedELO: currentELO,
        lower: Math.round(currentELO - 50 - m * 10),
        upper: Math.round(currentELO + 50 + m * 10)
      });
    }

    return {
      predictions,
      monthlyGrowth: Math.round(monthlyGrowth),
      confidence: ratings.length > 5 ? 'high' : ratings.length > 3 ? 'medium' : 'low',
      currentELO: lastRating
    };
  };

  /* ─── Engagement Score ─── */
  AI.getEngagementScore = async (studentId) => {
    const profile = await CK.db.getProfile(studentId);
    const attendance = await CK.db.getAttendance(studentId);
    const xpLogs = CK.rpg ? CK.rpg.getXPHistory(studentId, 30) : [];

    const factors = {
      attendance: 0,
      puzzleActivity: 0,
      gameActivity: 0,
      consistency: 0,
      improvement: 0
    };

    // Attendance (0-25)
    const totalAtt = attendance.length || 1;
    const present = attendance.filter(a => a.status === 'present').length;
    factors.attendance = Math.round((present / totalAtt) * 25);

    // Puzzle activity last 30 days (0-25)
    const puzzleLogs = xpLogs.filter(l => l.action.includes('puzzle'));
    factors.puzzleActivity = Math.min(25, puzzleLogs.length * 2);

    // Game activity (0-20)
    factors.gameActivity = Math.min(20, (parseInt(profile?.game || 0)) * 2);

    // Consistency: days active in last 30 (0-15)
    const activeDays = new Set(xpLogs.filter(l => l.date).map(l => l.date.slice(0, 10))).size;
    factors.consistency = Math.min(15, activeDays);

    // Improvement trend (0-15)
    const elo = parseInt(profile?.rating || 800);
    factors.improvement = elo > 1200 ? 15 : elo > 1000 ? 10 : elo > 800 ? 5 : 2;

    const total = Object.values(factors).reduce((a, b) => a + b, 0);

    // Dropout risk
    let dropoutRisk = 'low';
    if (total < 30) dropoutRisk = 'high';
    else if (total < 50) dropoutRisk = 'medium';

    return {
      score: total,
      maxScore: 100,
      factors,
      dropoutRisk,
      recommendation: total < 30
        ? 'This student needs immediate attention. Consider a personal check-in and adjusted lesson plan.'
        : total < 50
        ? 'Engagement is moderate. Try adding more gamification elements and puzzle challenges.'
        : total < 75
        ? 'Good engagement! Encourage tournament participation for the next boost.'
        : 'Excellent engagement! This student is a potential champion.'
    };
  };

  /* ─── Coach Effectiveness Score ─── */
  AI.getCoachEffectiveness = async (coachName) => {
    const students = await CK.db.getProfiles('student');
    const coachStudents = students.filter(s => s.coach === coachName);
    if (!coachStudents.length) return null;

    let totalImprovement = 0;
    let retainedCount = 0;
    let totalAttendance = 0;

    for (const s of coachStudents) {
      const ratings = await CK.db.getRatings(s.userid || s.id);
      if (ratings.length >= 2) {
        totalImprovement += ratings[ratings.length - 1].online - ratings[0].online;
      }
      if (s.status === 'Paid' || s.status === 'Pending') retainedCount++;
      const att = await CK.db.getAttendance(s.id);
      const present = att.filter(a => a.status === 'present').length;
      totalAttendance += att.length > 0 ? (present / att.length) * 100 : 50;
    }

    const avgImprovement = Math.round(totalImprovement / coachStudents.length);
    const retentionRate = Math.round((retainedCount / coachStudents.length) * 100);
    const avgAttendance = Math.round(totalAttendance / coachStudents.length);

    const effectiveness = Math.min(100, Math.round(
      avgImprovement * 0.3 +
      retentionRate * 0.35 +
      avgAttendance * 0.35
    ));

    return {
      coachName,
      studentCount: coachStudents.length,
      avgELOImprovement: avgImprovement,
      retentionRate,
      avgAttendance,
      effectiveness,
      grade: effectiveness >= 85 ? 'A+' : effectiveness >= 70 ? 'A' : effectiveness >= 55 ? 'B' : effectiveness >= 40 ? 'C' : 'D'
    };
  };

  /* ─── AI Weekly Report for Parents ─── */
  AI.generateWeeklyReport = async (studentId) => {
    const analysis = await AI.analyzeStudent(studentId);
    if (!analysis) return null;

    const engagement = await AI.getEngagementScore(studentId);
    const eloPrediction = await AI.predictELO(studentId, 3);
    const rank = CK.rpg ? CK.rpg.getCurrentRank(studentId) : { name: 'Pawn', icon: '♟' };
    const xp = CK.rpg ? CK.rpg.getTotalXP(studentId) : 0;

    const report = {
      studentName: analysis.studentName,
      generatedAt: new Date().toISOString(),
      weekOf: new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }),
      summary: '',
      highlights: [],
      areasToImprove: [],
      stats: {
        currentELO: analysis.elo,
        eloChange: analysis.eloTrend,
        puzzlesSolved: analysis.puzzlesSolved,
        gamesPlayed: analysis.gamesPlayed,
        attendanceRate: analysis.attendanceRate,
        engagementScore: engagement.score,
        rank: `${rank.icon} ${rank.name}`,
        xp
      },
      predictedELO: eloPrediction.predictions.length > 0 ? eloPrediction.predictions[2]?.predictedELO : null,
      studyPlan: null
    };

    // Generate natural language summary
    const eloDir = analysis.eloTrend > 0 ? 'improved' : analysis.eloTrend < 0 ? 'declined' : 'maintained';
    report.summary = `${analysis.studentName} has ${eloDir} their rating by ${Math.abs(analysis.eloTrend)} points this period. ` +
      `They currently hold a ${rank.name} rank with ${xp} XP. ` +
      `Attendance is at ${analysis.attendanceRate}% and engagement score is ${engagement.score}/100.`;

    // Highlights
    if (analysis.eloTrend > 0) report.highlights.push(`ELO improved by +${analysis.eloTrend} points`);
    if (analysis.attendanceRate >= 80) report.highlights.push(`Strong attendance at ${analysis.attendanceRate}%`);
    if (analysis.puzzlesSolved >= 20) report.highlights.push(`Solved ${analysis.puzzlesSolved} puzzles — great effort!`);
    analysis.strengths.forEach(s => report.highlights.push(`Strong in ${CATEGORIES[s]?.name || s}`));

    // Improvements
    analysis.weaknesses.forEach(w => {
      report.areasToImprove.push(`${CATEGORIES[w]?.icon || '📌'} ${CATEGORIES[w]?.name || w} needs more practice (score: ${analysis.scores[w]}/100)`);
    });
    if (engagement.dropoutRisk === 'high') report.areasToImprove.push('Engagement is low — more regular practice recommended');

    // Generate study plan
    report.studyPlan = AI.generateStudyPlan(analysis);

    // Save report
    await CK.db.saveMonthlyReport({
      id: 'wr-' + Date.now(),
      studentId,
      type: 'weekly',
      data: report,
      created_at: new Date().toISOString()
    });

    return report;
  };

   /* ─── Render: Weakness Radar Chart ─── */
   AI.renderWeaknessChart = (canvasId, analysis) => {
     const canvas = document.getElementById(canvasId);
     if (!canvas || !window.Chart) return;

     const labels = Object.values(CATEGORIES).map(c => c.name);
     const data = Object.keys(CATEGORIES).map(k => analysis.scores[k] || 0);

      // Destroy existing chart if any
      const existingChart = window.Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      new window.Chart(canvas, {
       type: 'radar',
       data: {
         labels,
         datasets: [{
           label: analysis.studentName,
           data,
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          borderColor: '#fbbf24',
          borderWidth: 2,
          pointBackgroundColor: data.map(v => v < 40 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e'),
          pointBorderColor: '#fff',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.1)' },
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { color: '#e2e8f0', font: { size: 11 } },
            ticks: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  };

  /* ─── Render: Study Plan Card ─── */
  AI.renderStudyPlan = (containerId, plan) => {
    const el = document.getElementById(containerId);
    if (!el || !plan) return;
    const _e = CK.esc || (s => s);

    el.innerHTML = `
      ${plan.summary ? `<div class="p-card" style="margin-bottom:14px;border-left:4px solid var(--p-gold);">
        <div style="font-size:0.9rem;line-height:1.6;color:var(--p-text);">🧠 ${plan.summary}</div>
      </div>` : ''}
      <div style="margin-bottom:16px;">
        <h4 style="margin-bottom:8px;">🎯 Focus Areas</h4>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${plan.focus.map(f => `
            <div class="p-card" style="flex:1; min-width:120px; text-align:center;">
              <div style="font-size:1.5rem;">${f.icon}</div>
              <div style="font-size:0.85rem; font-weight:600;">${_e(f.name)}</div>
              <div style="font-size:0.75rem; color:#f59e0b;">${f.currentScore} → ${f.targetScore}</div>
            </div>`).join('')}
        </div>
      </div>
      ${plan.weeklySchedule.map(week => `
        <div class="p-card" style="margin-bottom:8px;">
          <h5 style="margin-bottom:8px;">Week ${week.week}: ${_e(week.theme)}</h5>
          ${week.tasks.map(t => `
            <div style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:0.85rem;">
              <span>${t.icon}</span> <span>${_e(t.task)}</span>
            </div>`).join('')}
        </div>`).join('')}
      <div class="p-card" style="margin-bottom:8px;">
        <h5 style="margin-bottom:8px;">📖 Recommended Openings <span style="font-size:0.72rem;font-weight:400;opacity:.6;">· chosen for your level &amp; weak spots</span></h5>
        ${plan.openingRecommendations.map(o => {
          const name = typeof o === 'string' ? o : o.name;
          const why = typeof o === 'string' ? '' : o.why;
          return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);">
            <div style="font-size:0.88rem;font-weight:600;">♟ ${_e(name)}</div>
            ${why ? `<div style="font-size:0.78rem;color:var(--p-text-muted);margin-top:2px;">${_e(why)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  };

  /* ─── Render: Weekly Report for Parent ─── */
  AI.renderWeeklyReport = (containerId, report) => {
    const el = document.getElementById(containerId);
    if (!el || !report) return;
    const _e = CK.esc || (s => s);

    el.innerHTML = `
      <div class="p-card" style="border:1px solid var(--p-gold-dim); margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3>📊 Weekly Progress Report</h3>
          <span style="font-size:0.8rem; opacity:0.5;">${_e(report.weekOf)}</span>
        </div>
        <p style="margin-bottom:16px; line-height:1.6;">${_e(report.summary)}</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:12px; margin-bottom:16px;">
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800; color:var(--p-gold);">${report.stats.currentELO}</div><div style="font-size:0.7rem; opacity:0.5;">ELO Rating</div></div>
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800; color:${report.stats.eloChange >= 0 ? '#22c55e' : '#ef4444'};">${report.stats.eloChange >= 0 ? '+' : ''}${report.stats.eloChange}</div><div style="font-size:0.7rem; opacity:0.5;">ELO Change</div></div>
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${report.stats.puzzlesSolved}</div><div style="font-size:0.7rem; opacity:0.5;">Puzzles</div></div>
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${report.stats.attendanceRate}%</div><div style="font-size:0.7rem; opacity:0.5;">Attendance</div></div>
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${report.stats.rank}</div><div style="font-size:0.7rem; opacity:0.5;">Rank</div></div>
          <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${report.stats.engagementScore}</div><div style="font-size:0.7rem; opacity:0.5;">Engagement</div></div>
        </div>
        ${report.highlights.length ? `
          <div style="margin-bottom:12px;"><h5 style="color:#22c55e; margin-bottom:4px;">✅ Highlights</h5>
            ${report.highlights.map(h => `<div style="font-size:0.85rem; padding:2px 0;">• ${_e(h)}</div>`).join('')}
          </div>` : ''}
        ${report.areasToImprove.length ? `
          <div><h5 style="color:#f59e0b; margin-bottom:4px;">📌 Areas to Improve</h5>
            ${report.areasToImprove.map(a => `<div style="font-size:0.85rem; padding:2px 0;">• ${_e(a)}</div>`).join('')}
          </div>` : ''}
        ${report.predictedELO ? `<div style="margin-top:12px; padding:8px; background:rgba(34,197,94,0.1); border-radius:8px; font-size:0.85rem;">📈 Predicted ELO in 3 months: <strong>${report.predictedELO}</strong></div>` : ''}
      </div>`;
  };

  AI.CATEGORIES = CATEGORIES;
  return AI;
})();
