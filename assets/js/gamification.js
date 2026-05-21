/* assets/js/gamification.js ------------------------------------------------
   ChessKidoo RPG Rank Progression & XP System
   Pawn → Knight → Bishop → Rook → Queen → Grandmaster
   XP from puzzles, games, attendance, tournaments, streaks.
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.rpg = (() => {
  const RPG = {};
  const XP_KEY = 'ck_xp_logs';
  const BADGES_KEY = 'ck_badges';

  /* ─── Rank Tiers ─── */
  const RANKS = [
    { name: 'Pawn',         minXP: 0,     icon: '♟', color: '#9ca3af', title: 'Beginner Pawn' },
    { name: 'Knight',       minXP: 500,   icon: '♞', color: '#60a5fa', title: 'Rising Knight' },
    { name: 'Bishop',       minXP: 1500,  icon: '♝', color: '#a78bfa', title: 'Strategic Bishop' },
    { name: 'Rook',         minXP: 3500,  icon: '♜', color: '#f59e0b', title: 'Powerful Rook' },
    { name: 'Queen',        minXP: 7000,  icon: '♛', color: '#ec4899', title: 'Mighty Queen' },
    { name: 'King',         minXP: 12000, icon: '♚', color: '#ef4444', title: 'Royal King' },
    { name: 'Grandmaster',  minXP: 20000, icon: '👑', color: '#fbbf24', title: 'Chess Grandmaster' }
  ];

  /* ─── XP Awards Table ─── */
  const XP_AWARDS = {
    puzzle_solved:       15,
    puzzle_streak_5:     50,
    puzzle_streak_10:    120,
    game_played:         20,
    game_won:            40,
    game_perfect:        100,   // zero blunders
    attendance_present:  10,
    attendance_streak_7: 80,
    tournament_played:   50,
    tournament_top3:     200,
    tournament_winner:   500,
    daily_goal_complete: 30,
    opening_mastered:    60,
    lesson_completed:    25,
    homework_submitted:  20,
    homework_perfect:    50,
    first_login_today:   5,
    rating_milestone:    150,   // every +100 ELO
    review_received:     10,
    certificate_earned:  300
  };

  /* ─── Badges ─── */
  const ALL_BADGES = {
    first_win:        { name: 'First Victory',     icon: '🏆', desc: 'Win your first game', condition: s => s.wins >= 1 },
    puzzle_master:    { name: 'Puzzle Master',      icon: '🧩', desc: 'Solve 50 puzzles', condition: s => s.puzzles >= 50 },
    puzzle_legend:    { name: 'Puzzle Legend',      icon: '💎', desc: 'Solve 200 puzzles', condition: s => s.puzzles >= 200 },
    streak_fire:      { name: 'On Fire',            icon: '🔥', desc: '7-day login streak', condition: s => s.streak >= 7 },
    streak_blaze:     { name: 'Blazing Streak',     icon: '☄️', desc: '30-day login streak', condition: s => s.streak >= 30 },
    attendance_star:  { name: 'Attendance Star',    icon: '⭐', desc: '90%+ attendance rate', condition: s => s.attendanceRate >= 90 },
    sharp_eye:        { name: 'Sharp Eye',          icon: '🎯', desc: '80%+ accuracy in 5 games', condition: s => s.avgAccuracy >= 80 },
    tournament_hero:  { name: 'Tournament Hero',    icon: '🛡️', desc: 'Play in 3 tournaments', condition: s => s.tournaments >= 3 },
    elo_1000:         { name: 'Breaking 1000',      icon: '📈', desc: 'Reach ELO 1000', condition: s => s.elo >= 1000 },
    elo_1200:         { name: 'Rising Star',        icon: '🌟', desc: 'Reach ELO 1200', condition: s => s.elo >= 1200 },
    elo_1400:         { name: 'Club Player',        icon: '🏅', desc: 'Reach ELO 1400', condition: s => s.elo >= 1400 },
    elo_1600:         { name: 'Strong Player',      icon: '💪', desc: 'Reach ELO 1600', condition: s => s.elo >= 1600 },
    elo_1800:         { name: 'Expert',              icon: '🎖️', desc: 'Reach ELO 1800', condition: s => s.elo >= 1800 },
    speed_demon:      { name: 'Speed Demon',        icon: '⚡', desc: 'Win a game in under 10 moves', condition: s => s.speedWins >= 1 },
    endgame_wizard:   { name: 'Endgame Wizard',     icon: '🧙', desc: 'Win 10 endgames', condition: s => s.endgameWins >= 10 },
    social_butterfly: { name: 'Social Butterfly',   icon: '🦋', desc: 'Play 5 different opponents', condition: s => s.uniqueOpponents >= 5 },
    homework_king:    { name: 'Homework King',      icon: '📚', desc: 'Submit 20 assignments', condition: s => s.homeworks >= 20 },
    early_bird:       { name: 'Early Bird',         icon: '🐦', desc: 'Login before 7 AM', condition: s => s.earlyLogins >= 1 },
    night_owl:        { name: 'Night Owl',          icon: '🦉', desc: 'Solve puzzles after 10 PM', condition: s => s.nightPuzzles >= 1 },
    perfect_week:     { name: 'Perfect Week',       icon: '💯', desc: 'Complete all daily goals for 7 days', condition: s => s.perfectWeeks >= 1 }
  };

  /* ─── Storage Helpers ─── */
  const getXPLogs = () => { try { return JSON.parse(localStorage.getItem(XP_KEY) || '[]'); } catch(e) { return []; } };
  const saveXPLogs = (logs) => localStorage.setItem(XP_KEY, JSON.stringify(logs.slice(-500)));
  const getBadges = (userId) => { try { return JSON.parse(localStorage.getItem(`${BADGES_KEY}_${userId}`) || '[]'); } catch(e) { return []; } };
  const saveBadges = (userId, badges) => localStorage.setItem(`${BADGES_KEY}_${userId}`, JSON.stringify(badges));

  /* ─── Core: Award XP ─── */
  RPG.awardXP = (userId, action, meta = {}) => {
    const amount = XP_AWARDS[action] || 0;
    if (amount <= 0) return 0;

    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId,
      action,
      xp: amount,
      meta,
      date: new Date().toISOString()
    };

    const logs = getXPLogs();
    logs.push(log);
    saveXPLogs(logs);

    // Update cached total
    const totalKey = `ck_xp_total_${userId}`;
    const currentTotal = parseInt(localStorage.getItem(totalKey) || '0');
    const newTotal = currentTotal + amount;
    localStorage.setItem(totalKey, String(newTotal));

    // Check for rank-up
    const oldRank = RPG.getRankForXP(currentTotal);
    const newRank = RPG.getRankForXP(newTotal);
    if (newRank.name !== oldRank.name && CK.notifs) {
      CK.notifs.push('achievement',
        `Rank Up! You are now a ${newRank.icon} ${newRank.name}!`,
        `Congratulations! You've earned ${newTotal} XP and reached the ${newRank.title} rank!`,
        userId, 'student'
      );
      if (CK.showToast) CK.showToast(`🎉 RANK UP! You are now a ${newRank.icon} ${newRank.name}!`, 'success');
    }

    return amount;
  };

  /* ─── Get Total XP ─── */
  RPG.getTotalXP = (userId) => {
    const cached = localStorage.getItem(`ck_xp_total_${userId}`);
    if (cached !== null) return parseInt(cached);
    // Recalculate from logs
    const logs = getXPLogs().filter(l => l.userId === userId);
    const total = logs.reduce((sum, l) => sum + (l.xp || 0), 0);
    localStorage.setItem(`ck_xp_total_${userId}`, String(total));
    return total;
  };

  /* ─── Get XP History ─── */
  RPG.getXPHistory = (userId, limit = 50) => {
    return getXPLogs().filter(l => l.userId === userId).slice(-limit).reverse();
  };

  /* ─── Rank Calculations ─── */
  RPG.getRankForXP = (xp) => {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (xp >= r.minXP) rank = r;
    }
    return rank;
  };

  RPG.getCurrentRank = (userId) => {
    return RPG.getRankForXP(RPG.getTotalXP(userId));
  };

  RPG.getNextRank = (userId) => {
    const xp = RPG.getTotalXP(userId);
    const current = RPG.getRankForXP(xp);
    const idx = RANKS.findIndex(r => r.name === current.name);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  };

  RPG.getProgress = (userId) => {
    const xp = RPG.getTotalXP(userId);
    const current = RPG.getRankForXP(xp);
    const next = RPG.getNextRank(userId);
    if (!next) return { current, next: null, percent: 100, xpInRank: 0, xpNeeded: 0 };
    const xpInRank = xp - current.minXP;
    const xpNeeded = next.minXP - current.minXP;
    return {
      current,
      next,
      percent: Math.min(100, Math.round((xpInRank / xpNeeded) * 100)),
      xpInRank,
      xpNeeded,
      totalXP: xp
    };
  };

  RPG.RANKS = RANKS;
  RPG.XP_AWARDS = XP_AWARDS;

  /* ─── Badge System ─── */
  RPG.checkBadges = async (userId) => {
    const earned = getBadges(userId);
    const earnedIds = new Set(earned.map(b => b.id));

    // Gather stats
    const profile = await CK.db.getProfile(userId);
    const xpLogs = getXPLogs().filter(l => l.userId === userId);
    const puzzleLogs = xpLogs.filter(l => l.action.startsWith('puzzle'));
    const gameLogs = xpLogs.filter(l => l.action.startsWith('game'));
    const hwLogs = xpLogs.filter(l => l.action.startsWith('homework'));

    const stats = {
      wins: gameLogs.filter(l => l.action === 'game_won' || l.action === 'game_perfect').length,
      puzzles: parseInt(profile?.puzzle || 0) + puzzleLogs.length,
      streak: parseInt(profile?.streak || 0),
      attendanceRate: parseInt(profile?.attendance_rate || 0),
      avgAccuracy: parseInt(profile?.avg_accuracy || 0),
      tournaments: parseInt(profile?.tournament_count || 0),
      elo: parseInt(profile?.rating || 800),
      speedWins: gameLogs.filter(l => l.action === 'game_won' && l.meta?.moves < 10).length,
      endgameWins: gameLogs.filter(l => l.meta?.endgame).length,
      uniqueOpponents: new Set(gameLogs.map(l => l.meta?.opponent).filter(Boolean)).size,
      homeworks: hwLogs.length,
      earlyLogins: xpLogs.filter(l => l.action === 'first_login_today' && new Date(l.date).getHours() < 7).length,
      nightPuzzles: puzzleLogs.filter(l => new Date(l.date).getHours() >= 22).length,
      perfectWeeks: parseInt(profile?.perfect_weeks || 0)
    };

    const newBadges = [];
    for (const [id, badge] of Object.entries(ALL_BADGES)) {
      if (!earnedIds.has(id) && badge.condition(stats)) {
        const b = { id, name: badge.name, icon: badge.icon, desc: badge.desc, date: new Date().toISOString() };
        earned.push(b);
        newBadges.push(b);
        if (CK.notifs) {
          CK.notifs.push('achievement', `Badge Earned: ${badge.icon} ${badge.name}`, badge.desc, userId, 'student');
        }
      }
    }
    saveBadges(userId, earned);
    return { all: earned, newBadges };
  };

  RPG.getBadges = (userId) => getBadges(userId);
  RPG.ALL_BADGES = ALL_BADGES;

  /* ─── Leaderboard ─── */
  RPG.getLeaderboard = async (limit = 20) => {
    const students = await CK.db.getProfiles('student');
    return students.map(s => ({
      id: s.id,
      name: s.full_name,
      xp: RPG.getTotalXP(s.id),
      rank: RPG.getCurrentRank(s.id),
      elo: parseInt(s.rating || 800),
      badges: getBadges(s.id).length
    })).sort((a, b) => b.xp - a.xp).slice(0, limit);
  };

  /* ─── Render: Rank Card ─── */
  RPG.renderRankCard = (containerId, userId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const p = RPG.getProgress(userId);
    const badges = getBadges(userId);
    const _e = CK.esc || (s => s);

    el.innerHTML = `
      <div class="rpg-rank-card" style="background:linear-gradient(135deg, ${p.current.color}22, ${p.current.color}08); border:1px solid ${p.current.color}44; border-radius:16px; padding:24px;">
        <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
          <div style="font-size:3rem; width:64px; height:64px; display:flex; align-items:center; justify-content:center; background:${p.current.color}22; border-radius:50%; border:2px solid ${p.current.color};">${p.current.icon}</div>
          <div>
            <div style="font-size:1.3rem; font-weight:800; color:${p.current.color};">${_e(p.current.title)}</div>
            <div style="font-size:0.85rem; opacity:0.7;">${p.totalXP.toLocaleString()} XP Total</div>
          </div>
        </div>
        ${p.next ? `
          <div style="margin-bottom:8px; display:flex; justify-content:space-between; font-size:0.8rem; opacity:0.7;">
            <span>${_e(p.current.name)}</span>
            <span>${_e(p.next.name)} (${p.next.minXP.toLocaleString()} XP)</span>
          </div>
          <div style="background:rgba(255,255,255,0.1); border-radius:8px; height:12px; overflow:hidden; position:relative;">
            <div style="height:100%; width:${p.percent}%; background:linear-gradient(90deg, ${p.current.color}, ${p.next.color}); border-radius:8px; transition:width 0.8s ease;"></div>
          </div>
          <div style="text-align:center; font-size:0.75rem; opacity:0.6; margin-top:4px;">${p.xpInRank} / ${p.xpNeeded} XP to next rank</div>
        ` : '<div style="text-align:center; font-size:0.9rem; color:#fbbf24; font-weight:700; margin-top:8px;">MAX RANK ACHIEVED!</div>'}
        <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:16px;">
          ${badges.slice(0, 12).map(b => `<span title="${_e(b.name)}: ${_e(b.desc)}" style="font-size:1.4rem; cursor:help;">${b.icon}</span>`).join('')}
          ${badges.length > 12 ? `<span style="font-size:0.8rem; opacity:0.5;">+${badges.length - 12} more</span>` : ''}
        </div>
      </div>`;
  };

  /* ─── Render: XP Activity Feed ─── */
  RPG.renderXPFeed = (containerId, userId, limit = 10) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const history = RPG.getXPHistory(userId, limit);
    const _e = CK.esc || (s => s);
    if (!history.length) { el.innerHTML = '<div style="text-align:center;opacity:0.5;padding:20px;">No XP activity yet. Start playing!</div>'; return; }
    el.innerHTML = history.map(h => {
      const label = (h.action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div><span style="font-weight:600;">${_e(label)}</span><span style="font-size:0.75rem; opacity:0.4; margin-left:8px;">${new Date(h.date).toLocaleDateString()}</span></div>
        <span style="color:#22c55e; font-weight:700;">+${h.xp} XP</span>
      </div>`;
    }).join('');
  };

  /* ─── Render: Full Leaderboard ─── */
  RPG.renderLeaderboard = async (containerId, limit = 20) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const board = await RPG.getLeaderboard(limit);
    const _e = CK.esc || (s => s);
    const medals = ['🥇', '🥈', '🥉'];
    el.innerHTML = `<table class="p-table" style="width:100%">
      <thead><tr><th>#</th><th>Student</th><th>Rank</th><th>XP</th><th>ELO</th><th>Badges</th></tr></thead>
      <tbody>${board.map((s, i) => `
        <tr>
          <td style="font-weight:800; font-size:1.1rem;">${medals[i] || (i + 1)}</td>
          <td style="font-weight:600;">${_e(s.name)}</td>
          <td><span style="color:${s.rank.color};">${s.rank.icon} ${_e(s.rank.name)}</span></td>
          <td style="color:#22c55e; font-weight:700;">${s.xp.toLocaleString()}</td>
          <td>${s.elo}</td>
          <td>${s.badges}</td>
        </tr>`).join('')}
      </tbody></table>`;
  };

  /* ─── Render: All Badges Grid ─── */
  RPG.renderBadgeGrid = (containerId, userId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const earned = new Set(getBadges(userId).map(b => b.id));
    const _e = CK.esc || (s => s);
    el.innerHTML = Object.entries(ALL_BADGES).map(([id, badge]) => {
      const has = earned.has(id);
      return `<div style="display:inline-flex; flex-direction:column; align-items:center; width:90px; padding:12px 6px; border-radius:12px; background:${has ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${has ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}; text-align:center; ${has ? '' : 'opacity:0.4; filter:grayscale(1);'}">
        <div style="font-size:2rem; margin-bottom:4px;">${badge.icon}</div>
        <div style="font-size:0.7rem; font-weight:600; line-height:1.2;">${_e(badge.name)}</div>
      </div>`;
    }).join('');
  };

  return RPG;
})();
