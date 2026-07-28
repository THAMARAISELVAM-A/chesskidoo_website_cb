/* assets/js/main.js -------------------------------------------------------
   Core UI, Router, Modals, Toast, Bot, Chessboard — ChessKidoo
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  /* 💎 Premium Confirm Dialog */
  CK.confirm = function(message) {
    return new Promise((resolve) => {
      const _e = CK.esc || (s => s);
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.style.zIndex = '99999';
      modal.innerHTML = `
        <div class="p-modal" style="max-width:380px; text-align:center;">
          <div style="font-size:3rem; margin-bottom:10px;">⚠️</div>
          <div class="p-modal-title" style="margin-bottom:12px; font-size:1.2rem;">Confirm Action</div>
          <div class="p-modal-body" style="font-size:0.95rem; color:var(--p-text-muted); margin-bottom:24px; white-space:pre-wrap;">${_e(message)}</div>
          <div style="display:flex; gap:12px; justify-content:center;">
            <button class="p-btn p-btn-ghost" id="ck-confirm-cancel">Cancel</button>
            <button class="p-btn p-btn-blue" id="ck-confirm-ok" style="background:var(--p-danger); box-shadow:0 8px 20px rgba(255,77,79,0.3);">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const cleanup = (result) => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
        resolve(result);
      };

      modal.querySelector('#ck-confirm-cancel').onclick = () => cleanup(false);
      modal.querySelector('#ck-confirm-ok').onclick = () => cleanup(true);
      modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
    });
  };

  /* 💎 Premium Prompt Dialog */
  CK.prompt = function(message, defaultValue = '', type = 'text') {
    return new Promise((resolve) => {
      const _e = CK.esc || (s => s);
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.style.zIndex = '99999';
      modal.innerHTML = `
        <div class="p-modal" style="max-width:400px;">
          <div class="p-modal-title" style="margin-bottom:12px; font-size:1.1rem; border-bottom:1px solid var(--p-border); padding-bottom:8px;">Input Required</div>
          <div class="p-modal-body" style="font-size:0.95rem; color:var(--p-text-muted); margin-bottom:16px;">${_e(message)}</div>
          <input type="${type}" id="ck-prompt-input" class="p-form-control" style="width:100%; margin-bottom:24px; padding:10px; border-radius:6px;" value="${_e(defaultValue)}">
          <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button class="p-btn p-btn-ghost" id="ck-prompt-cancel">Cancel</button>
            <button class="p-btn p-btn-blue" id="ck-prompt-ok">Submit</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      const input = modal.querySelector('#ck-prompt-input');
      input.focus();
      if(type !== 'number') input.select();

      const cleanup = (result) => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
        resolve(result);
      };

      modal.querySelector('#ck-prompt-cancel').onclick = () => cleanup(null);
      modal.querySelector('#ck-prompt-ok').onclick = () => cleanup(input.value);
      input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') cleanup(input.value);
        if(e.key === 'Escape') cleanup(null);
      });
      modal.onclick = (e) => { if (e.target === modal) cleanup(null); };
    });
  };

  /* 💎 Premium Alert Dialog */
  CK.alert = function(message, title = 'Alert') {
    return new Promise((resolve) => {
      const _e = CK.esc || (s => s);
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.style.zIndex = '99999';
      modal.innerHTML = `
        <div class="p-modal" style="max-width:380px; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:10px;">ℹ️</div>
          <div class="p-modal-title" style="margin-bottom:12px; font-size:1.2rem;">${_e(title)}</div>
          <div class="p-modal-body" style="font-size:0.95rem; color:var(--p-text-muted); margin-bottom:24px; white-space:pre-wrap;">${_e(message)}</div>
          <div style="display:flex; justify-content:center;">
            <button class="p-btn p-btn-blue" id="ck-alert-ok" style="min-width:120px;">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const cleanup = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
        resolve(true);
      };

      const okBtn = modal.querySelector('#ck-alert-ok');
      okBtn.onclick = () => cleanup();
      okBtn.focus();
      modal.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === 'Escape') cleanup(); });
      modal.onclick = (e) => { if (e.target === modal) cleanup(); };
    });
  };

  /* ─── SPA Router ─── */
  CK.showPage = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    // Toggle global site header visibility
    const header = document.getElementById('header');
    if (header) {
      if (id === 'landing-page') {
        header.classList.remove('header-hidden');
      } else {
        header.classList.add('header-hidden');
      }
    }

    // Close portal drawer and restore body scroll on every page transition
    if (typeof CK.togglePortalNav === 'function') CK.togglePortalNav(false);
  };

  // Mobile Menu Logic
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if (mobileBtn && navLinks) {
    const closeNav = () => {
      navLinks.classList.remove('open');
      mobileBtn.classList.remove('active');
      document.body.classList.remove('nav-open');
    };
    mobileBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      mobileBtn.classList.toggle('active');
      document.body.classList.toggle('nav-open', isOpen);
    });
    // Must match the drawer breakpoint in style.css — the nav collapses into
    // the hamburger at 1100px, so a smaller value here would leave the drawer
    // stuck open after tapping a link between 769px and 1100px.
    const DRAWER_MAX = 1100;
    navLinks.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= DRAWER_MAX) closeNav();
      });
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > DRAWER_MAX) closeNav();
    });
  }

  // ── Portal Hamburger Drawer (mobile ≤600px) ──────────────────────────
  CK.togglePortalNav = (forceOpen) => {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const sidebar = activePage.querySelector('.p-sidebar');
    const overlay = activePage.querySelector('.p-drawer-overlay');
    const btn     = activePage.querySelector('.p-hamburger-btn');
    if (!sidebar) return;
    const isOpen = forceOpen !== undefined ? forceOpen : !sidebar.classList.contains('p-drawer-open');
    sidebar.classList.toggle('p-drawer-open', isOpen);
    if (overlay) overlay.classList.toggle('open', isOpen);
    if (btn)     btn.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  // Close portal drawer whenever any p-nav-item is clicked on mobile
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.p-nav-item');
    if (item && window.innerWidth <= 600) {
      setTimeout(() => CK.togglePortalNav(false), 80);
    }
  });

// Safe navigation wrapper - prevents errors when portal objects aren't initialized
   CK.safeNav = (portal, method, ...args) => {
     if (portal && typeof portal[method] === 'function') {
       portal[method](...args);
     } else {
       window.location.href = '/lms/';
     }
   };

   CK.navigate = (section) => {
    // Route to arena page first (before landing section check)
    if (section === 'arena') {
      CK.showPage('arena-page');
      setTimeout(() => {
        if (CK.arena) {
          CK.arena.init();
        } else {
          console.error('Main: CK.arena is not defined!');
        }
      }, 100);
      return;
    }

    // Route to more games page
    if (section === 'more-games') {
      CK.showPage('more-games-page');
      setTimeout(() => {
        CK.initGameParticles();
        if (CK.arcade && CK.arcade.renderScoreBadges) CK.arcade.renderScoreBadges();
        // populate per-card best scores (covers all 10 mini-games)
        const gameMap = {
          puzzle:      'puzzle',
          gm:          'gm',
          memory:      'memory',
          timing:      'timing',       // Knight's Star Catcher
          opening:     'opening',      // Pawn Storm Dodge (legacy save key)
          queenquest:  'queenquest',
          quiz:        'quiz',
          coordinates: 'coordinates',
          recall:      'recall',
          escape:      'escape',       // 10th game: King's Escape
        };
        const scores = JSON.parse(localStorage.getItem('ck_game_scores') || '{}');
        Object.entries(gameMap).forEach(([key, id]) => {
          const el = document.getElementById(`score-display-${key}`);
          if (el) el.textContent = scores[id] || '—';
        });
      }, 100);
      return;
    }

    const landingSections = ['home', 'features', 'levels', 'coaches', 'achievements', 'about', 'reviews', 'why-choose', 'pricing', 'faq'];
    const isLandingSection = landingSections.includes(section);
    
    if (isLandingSection) {
      const landingPage = document.getElementById('landing-page');
      if (!landingPage.classList.contains('active')) {
        CK.showPage('landing-page');
      }
      
      // Delay slightly if we just switched pages to ensure DOM is ready for scroll
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    // Route to a specific page (like login-page)
    if (section === 'login' && CK.currentUser) {
      const role = (CK.currentUser.role || '').toLowerCase();
      CK.showPage(`${role}-page`);
      setTimeout(() => {
        if (role === 'admin'   && CK.admin)   CK.admin.init();
        if (role === 'student' && CK.student) CK.student.init();
        if (role === 'coach'   && CK.coach)   CK.coach.init();
        if (role === 'parent'  && CK.parents) CK.parents.init();
      }, 50);
      return;
    }
    
    CK.showPage(section + '-page');
  };

  /* ─── Modal System ─── */
  let _modalPreviousFocus = null;
  const _focusableSelectors = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  CK.openModal = (id) => {
    const m = document.getElementById(id);
    if (!m) return;
    _modalPreviousFocus = document.activeElement;
    m.classList.add('active', 'open');
    m.style.display = m.classList.contains('p-modal-overlay') ? 'grid' : 'flex';
    m.removeAttribute('aria-hidden');
    document.body.setAttribute('aria-hidden', 'true');
    // Focus first focusable element inside modal
    requestAnimationFrame(() => {
      const first = m.querySelector(_focusableSelectors);
      if (first) first.focus();
    });
    // Trap focus inside modal
    m._trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [...m.querySelectorAll(_focusableSelectors)];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    m.addEventListener('keydown', m._trapFocus);
  };

  CK.closeModal = (id) => {
    const closeOne = (m) => {
      m.classList.remove('active', 'open');
      m.style.display = 'none';
      m.setAttribute('aria-hidden', 'true');
      if (m._trapFocus) { m.removeEventListener('keydown', m._trapFocus); m._trapFocus = null; }
    };
    if (id) {
      const m = document.getElementById(id);
      if (m) closeOne(m);
    } else {
      document.querySelectorAll('.modal-overlay, .p-modal-overlay').forEach(closeOne);
    }
    document.body.removeAttribute('aria-hidden');
    if (_modalPreviousFocus && typeof _modalPreviousFocus.focus === 'function') {
      _modalPreviousFocus.focus();
      _modalPreviousFocus = null;
    }
  };

  CK.openDemoModal = () => CK.openModal('contactModal');

  // Close modal on overlay click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) CK.closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') CK.closeModal();
  });

  /* ─── Toast Notification ─── */
  CK.showToast = (msg, type = 'info') => {
    let toast = document.getElementById('ck-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ck-toast';
      toast.className = 'p-toast';
      document.body.appendChild(toast);
    }
    
    // Status icons
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const _e = CK.esc || (s => s);
    toast.innerHTML = `<span>${icons[type] || '♟'}</span> <span>${_e(String(msg))}</span>`;
    
    // Apply status class
    toast.className = `p-toast show ${type}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  };

  /* ─── Theme switching (portal dark/light mode) ───────────────────────
     Theme is stored in localStorage under 'ck_portal_theme' as either
     'light' or 'dark' (default = dark). Applied via [data-theme] on <html>
     so CSS variables defined under :root[data-theme="light"] take over. */
  CK.applyTheme = (theme) => {
    const t = theme === 'light' ? 'light' : 'dark';
    if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // Update every visible toggle's aria-label so screen readers stay in sync
    document.querySelectorAll('.p-theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      btn.setAttribute('title', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    });
  };
  CK.toggleTheme = () => {
    const cur = localStorage.getItem('ck_portal_theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('ck_portal_theme', next); } catch (e) {}
    CK.applyTheme(next);
    if (typeof CK.showToast === 'function') {
      CK.showToast(next === 'light' ? '☀️ Light theme enabled' : '🌙 Dark theme enabled', 'info');
    }
  };
  // Apply persisted theme as early as possible (before paint when script defers)
  try {
    const saved = localStorage.getItem('ck_portal_theme');
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {}

  /* ─── Help & Support overlay ─── */
  CK.showHelp = (role = 'student') => {
    const tips = {
      admin: [
        ['📡 Live Tracking', 'See which coaches and students are active in real time.'],
        ['🎓 Students & Coaches', 'Enroll, edit and manage everyone from one place.'],
        ['🔑 Access Management', 'Set individual login credentials for each user.'],
        ['📊 Reports & Analytics', 'Track attendance, revenue and engagement trends.'],
      ],
      coach: [
        ['📡 Live Session', 'Run a synced board with your students in real time.'],
        ['🎓 My Students', 'View progress, ratings and game history per student.'],
        ['✅ Attendance', 'Mark attendance for each class quickly.'],
        ['🧩 Assign Puzzles', 'Push tactics puzzles to your students.'],
      ],
      student: [
        ['📡 Join Class', 'Hop into your live session when class is on.'],
        ['🧩 My Puzzles', 'Solve daily tactics to climb your rating.'],
        ['🔬 PGN Lab', 'Analyse games with the built-in engine.'],
        ['💳 Fee Payment', 'Pay securely via UPI / Google Pay.'],
      ],
      parent: [
        ['📈 Progress', "Track your child's rating and learning trends."],
        ['✅ Attendance', 'See class attendance at a glance.'],
        ['💳 Fee Payment', 'Pay class fees securely online.'],
        ['💬 Feedback', 'Message the academy directly.'],
      ],
    };
    const list = (tips[role] || tips.student)
      .map(([t, d]) => `<div class="ck-help-item"><div class="ck-help-item-t">${t}</div><div class="ck-help-item-d">${d}</div></div>`)
      .join('');
    let ov = document.getElementById('ck-help-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'ck-help-overlay';
    ov.className = 'ck-help-overlay';
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `
      <div class="ck-help-card" role="dialog" aria-label="Help and support">
        <button class="ck-help-close" aria-label="Close" onclick="document.getElementById('ck-help-overlay').remove()">✕</button>
        <div class="ck-help-head">
          <div class="ck-help-icon">♟</div>
          <div>
            <h3>Help &amp; Support</h3>
            <p>Quick guide to your ChessKidoo portal</p>
          </div>
        </div>
        <div class="ck-help-list">${list}</div>
        <div class="ck-help-contact">
          <a href="https://wa.me/919025846663" target="_blank" rel="noopener" class="ck-help-btn ck-help-btn-wa">💬 WhatsApp Support</a>
          <a href="mailto:Chesskidoo37@gmail.com" class="ck-help-btn ck-help-btn-mail">✉️ Email Us</a>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  /* ─── Game Particles Animation ─── */
  CK.initGameParticles = () => {
    const container = document.getElementById('game-particles');
    if (!container) return;
    container.innerHTML = '';
    
    const colors = ['#f59e0b', '#8b5cf6', '#059669', '#dc2626', '#06b6d4'];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'game-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.setProperty('--tx', `${Math.random() * 200 - 100}px`);
      particle.style.setProperty('--ty', `${Math.random() * 200 - 100}px`);
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.animationDuration = `${10 + Math.random() * 8}s`;
      particle.style.background = colors[i % colors.length];
      particle.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;
      container.appendChild(particle);
    }
  };

  /* ─── AI Bot ─── */
  CK.toggleBot = () => {
    const win = document.getElementById('bot-window');
    if (!win) return;
    const isOpen = win.style.display === 'flex';
    win.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      const msgs = document.getElementById('bot-messages');
      if (msgs && !msgs.innerHTML.trim()) {
        msgs.innerHTML = `<div class="bot-msg bot-msg--bot">♘ Hi! I'm ChessKidoo AI. Ask me anything about chess, classes, or the academy!</div>`;
      }
    }
  };

  CK.sendBotMessage = () => {
    const input = document.getElementById('bot-input-field');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    const msgs = document.getElementById('bot-messages');
    if (!msgs) return;
    const _e = CK.esc || (s => s);
    msgs.innerHTML += `<div class="bot-msg bot-msg--user">${_e(msg)}</div>`;
    input.value = '';
    msgs.scrollTop = msgs.scrollHeight;

    const replies = [
      { keys: ['fee', 'price', 'cost', 'how much'],     text: "Our fees range from ₹800 to ₹5,200/month depending on the session type. Group sessions start at ₹800! 💰" },
      { keys: ['schedule', 'timing', 'when', 'time'],    text: "We offer WEEKDAY (17:00) and WEEKEND sessions. Group and 1-on-1 options available! 📅" },
      { keys: ['coach', 'teacher', 'instructor'],         text: "We have 8 FIDE-certified coaches: Ranjith, Vishnu, Rohith Selvaraj, Gyansurya, Saran, Yogesh, Haris, and Arivuselvam! ♞" },
      { keys: ['beginner', 'start', 'new to chess'],      text: "Beginners start with piece movements, basic tactics, and fun puzzles. Your child will love it! 🎯" },
      { keys: ['demo', 'trial', 'free class', 'try'],     text: "Click 'Book Free Demo' in the menu to schedule a free trial class with one of our expert coaches! 🎉" },
      { keys: ['rating', 'elo', 'level'],                 text: "Our students progress through ELO milestones: 800 → 1000 → 1200 → 1400 → 1600 → 1800+. Track your progress in the Student Portal! 📈" },
      { keys: ['tournament', 'compete', 'championship'],  text: "We organize monthly tournaments and prepare students for FIDE-rated events. Check the Tournaments section! 🏆" },
      { keys: ['puzzle', 'tactic', 'practice'],            text: "Practice puzzles daily to sharpen your tactics! Our portal has 60+ curated puzzles with spaced repetition. 🧩" },
      { keys: ['opening', 'sicilian', 'gambit'],           text: "We teach all major openings: Italian, Sicilian, French, Caro-Kann, Queen's Gambit, and more. Use the Opening Trainer! 📖" },
      { keys: ['endgame', 'rook ending', 'king pawn'],     text: "Endgame mastery is crucial! We cover K+P, Rook endgames, Lucena, Philidor defense, and opposition. ♔" },
      { keys: ['arena', 'play ai', 'computer', 'stockfish'], text: "The Chess Arena uses Stockfish — one of the strongest engines in the world — with 4 difficulty levels! ⚡" },
      { keys: ['age', 'old', 'young', 'child'],            text: "We teach children ages 5-17. Our curriculum adapts to each age group and skill level. 👶" },
      { keys: ['online', 'remote', 'google meet'],         text: "All classes are held online via Google Meet. Students can join from anywhere in the world! 🌍" },
      { keys: ['certificate', 'cert'],                     text: "Students earn certificates upon completing each level. Download yours from the Student Portal! 🎓" },
      { keys: ['parent', 'mom', 'dad', 'guardian'],        text: "Parents can track their child's progress, attendance, and reports through the Parent Portal. 👨‍👩‍👧" },
      { keys: ['attendance'],                              text: "Attendance is tracked automatically. View the calendar in your portal to see your record. 📅" },
      { keys: ['whatsapp', 'contact', 'phone', 'call'],    text: "WhatsApp: +91 90258 46663 | Email: chesskidoo37@gmail.com | We respond within 24 hours! 📩" },
      { keys: ['hello', 'hi', 'hey', 'hola'],              text: "Hello! Welcome to ChessKidoo. Ask me about classes, coaches, fees, or anything chess-related! ♟" },
      { keys: ['thank', 'thanks', 'thx'],                  text: "You're welcome! Feel free to ask anything else about chess or our academy. 🙏" },
      { keys: ['bye', 'goodbye', 'see you'],               text: "Goodbye! Keep playing chess and improving. See you at ChessKidoo! ♔" },
      { keys: ['pay', 'razorpay', 'upi', 'payment'],       text: "We accept UPI (Google Pay, PhonePe, Paytm) and cards via Razorpay. Pay from the Fee Gateway in your portal! 💳" },
      { keys: ['report', 'progress'],                      text: "Your coach submits monthly progress reports covering tactics, endgame, openings, and sportsmanship. Check Reports in your portal! 📊" },
      { keys: ['game', 'play'],                            text: "Play against our AI in the Arena, or try fun mini-games like Memory Chess, Speed Moves, and Puzzle Rush! 🎮" },
      { keys: ['login', 'sign in', 'account'],             text: "Click 'Login' in the top menu. Your credentials are set by the academy admin. Contact us if you need access! 🔑" },
    ];

    const lower = msg.toLowerCase();
    const match = replies.find(r => r.keys.some(k => lower.includes(k)));
    const reply = match ? match.text : "Great question! Our FIDE-certified coaches are here to guide you. Want to book a free demo class? 🏆";
    setTimeout(() => {
      msgs.innerHTML += `<div class="bot-msg bot-msg--bot">${reply}</div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }, 600 + Math.random() * 400);
  };

  CK.handleDemoSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const name = form.fullName.value;
    const dial = form.dialCode ? form.dialCode.value : '';
    const phone = (window.CK && CK.intl) ? CK.intl.fullPhone(dial, form.phone.value) : form.phone.value;
    const age = form.age.value;
    const country = form.country ? form.country.value : '';
    const cityRaw = form.city.value || '';
    const city = [cityRaw, country].filter(Boolean).join(', ') || 'Not specified';

    btn.textContent = 'Booking...';
    btn.disabled = true;
    try {
      if (window.supabaseClient) {
        try {
          const { error } = await window.supabaseClient.from('leads').insert({
            name,
            phone,
            parent_name: name,
            child_age: age,
            city,
            status: 'new',
            created_at: new Date().toISOString()
          });
          if (error) console.error('Supabase save error:', error);
        } catch (supaErr) {
          console.error('Supabase connection error:', supaErr);
        }
      }

      // WhatsApp Message Text
      const msg = `Hello ChessKidoo! ♟️\n\nI'd like to book a FREE Demo Class.\n\n👤 *Name:* ${name}\n📞 *Phone:* ${phone}\n👶 *Child Age:* ${age}\n📍 *City:* ${city}\n\nPlease confirm my slot!`;
      const waUrl = `https://wa.me/919025846663?text=${encodeURIComponent(msg)}`;

      // Email Pre-filled Data
      const emailSubject = `New Demo Class Booking - ${name}`;
      const emailBody = `Hello ChessKidoo Team,\n\nI'd like to book a FREE Demo Class for my child.\n\n👤 Parent Name: ${name}\n📞 Phone/WhatsApp: ${phone}\n👶 Child's Age: ${age}\n📍 City: ${city}\n\nPlease reach out to me to schedule our slot!\n\nBest regards,\n${name}`;
      const mailtoUrl = `mailto:Chesskidoo37@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      CK.showToast('🎉 Directing to WhatsApp and Email Client...', 'success');

      setTimeout(() => {
        // Open WhatsApp redirection in a new window
        window.open(waUrl, '_blank');
        // Trigger mail client launch
        window.location.href = mailtoUrl;

        CK.closeModal();
        form.reset();
      }, 1500);

    } catch (err) {
      CK.showToast('Failed to prepare booking. Please WhatsApp us directly!', 'error');
    } finally {
      btn.textContent = 'Confirm Booking';
      btn.disabled = false;
    }
  };

  CK.togglePassword = (id) => {
    const input = document.querySelector(`#${id} input[name="password"]`) || document.querySelector(`input[name="${id}"]`);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

  /* ─── Guess Grandmaster Mini Game ─── */
  const GMs = [
    { name: 'Magnus Carlsen', clues: ['World Champion 2013-2023', 'From Norway', 'Peak rating 2882', 'Author of "Play 1.e4"'], icon: '♔' },
    { name: 'Garry Kasparov', clues: ['Youngest World Champion (1985)', 'Played Deep Blue', 'Russian Grandmaster', 'FIDE rating 2851'], icon: '♛' },
    { name: 'Bobby Fischer', clues: ['American legend', 'Won 1972 World Championship', 'Chess prodigy', 'Beat Spassky in Reykjavik'], icon: '♚' },
  ];
  let gmIdx = 0, clueShown = 0;

  CK.startGMGame = () => {
    gmIdx = Math.floor(Math.random() * GMs.length);
    clueShown = 0;
    renderGMGame();
    CK.openModal('gameModal');
  };

  CK.nextGMGame = () => {
    if (clueShown < GMs[gmIdx].clues.length - 1) { clueShown++; renderGMGame(); }
    else { CK.showToast(`It was ${GMs[gmIdx].name}!`, 'success'); CK.closeModal(); }
  };

  function renderGMGame() {
    const gm = GMs[gmIdx];
    const el = document.getElementById('game-content');
    if (!el) return;
    el.innerHTML = `
      <div style="text-align:center; padding:20px 0;">
        <div style="font-size:4rem; margin-bottom:20px;">${gm.icon}</div>
        <h4 style="margin-bottom:20px; opacity:0.6;">Clue ${clueShown + 1} of ${gm.clues.length}</h4>
        <div style="background:var(--cream); padding:20px; border-radius:12px; font-size:1.2rem; font-weight:700;">
          "${gm.clues[clueShown]}"
        </div>
        <p style="margin-top:20px; opacity:0.5; font-size:0.85rem;">Click "Next Game" for the next clue or reveal!</p>
      </div>
    `;
  }

  /* ─── Scroll Effects + Active Nav Highlighting ─── */
  const header = document.getElementById('header');
  const sections = ['home', 'features', 'levels', 'coaches', 'achievements', 'about', 'reviews', 'why-choose', 'pricing', 'faq'];
  const navLinkEls = document.querySelectorAll('.nav-link[data-section]');

  function updateActiveNav() {
    const scrollY = window.scrollY + 120;
    let current = 'home';
    sections.forEach(sec => {
      const el = document.getElementById(sec);
      if (el && el.offsetTop <= scrollY) current = sec;
    });
    navLinkEls.forEach(link => {
      link.classList.toggle('active', link.dataset.section === current);
    });
  }

  let _scrollRaf = null;
  window.addEventListener('scroll', () => {
    if (_scrollRaf) return;
    _scrollRaf = requestAnimationFrame(() => {
      _scrollRaf = null;
      if (header) header.classList.toggle('scrolled', window.scrollY > 50);
      const progress = document.getElementById('scrollProgress');
      if (progress) {
        const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        progress.style.width = pct + '%';
      }
      updateActiveNav();
    });
  }, { passive: true });

  // Run once on load
  window.addEventListener('load', updateActiveNav);

  /* ─── Offline Indicator ─── */
  const _offlineBanner = document.getElementById('offlineBanner');
  const _setOfflineUI = (isOffline) => {
    if (_offlineBanner) _offlineBanner.style.display = isOffline ? 'block' : 'none';
  };
  window.addEventListener('offline', () => { _setOfflineUI(true); CK.showToast('You are offline. Some features may be limited.', 'warning'); });
  window.addEventListener('online',  () => { _setOfflineUI(false); CK.showToast('Back online!', 'success'); });
  _setOfflineUI(!navigator.onLine);

  /* ─── Global Error Handler ─── */
  window.addEventListener('error', (e) => {
    console.error('[ChessKidoo] Uncaught error:', e.message, e.filename, e.lineno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[ChessKidoo] Unhandled promise rejection:', e.reason);
  });

  /* ─── Intersection Observer (Reveal Animations) ─── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });

  /* ─── Init on DOMContentLoaded ─── */
  window.addEventListener('DOMContentLoaded', () => {
    // Hide preloader immediately
    const preloader = document.getElementById('preloader');
    if (preloader) {
      setTimeout(() => {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
        setTimeout(() => preloader.remove(), 600);
      }, 800);
    }

    // Observe reveal elements
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


    // Restore session — trust the cached profile.
    // The app supports TWO login paths: Supabase Auth AND the per-user
    // credentials table. Credential-login users (admin, coaches, students)
    // have NO Supabase Auth session, so we must NOT clear ck_user just
    // because auth.getSession() is empty — that would log them out on every
    // refresh. A cached ck_user means "logged in"; logout() clears it.
    (async () => {
      let restoredUser = null;

      const cached = localStorage.getItem('ck_user');
      if (cached) {
        try {
          restoredUser = JSON.parse(cached);
          CK.currentUser = restoredUser;
        } catch (e) {
          localStorage.removeItem('ck_user');
          restoredUser = null;
        }
      }

      if (restoredUser?.role) {
        const role = restoredUser.role.toLowerCase();
        CK.showPage(`${role}-page`);
        setTimeout(() => {
          if (role === 'admin'   && CK.admin)   CK.admin.init();
          if (role === 'student' && CK.student) CK.student.init();
          if (role === 'coach'   && CK.coach)   CK.coach.init();
          if (role === 'parent'  && CK.parents) CK.parents.init();
        }, 50);
      } else {
        // Check for OAuth callback (returning from Google login)
        if (CK._handleAuthCallback) {
          await CK._handleAuthCallback();
        }
        if (!CK.currentUser) CK.showPage('landing-page');
      }
    })();
  });

  CK.toggleFaq = (button) => {
    const item = button.closest('.faq-item');
    const content = item.querySelector('.faq-content');
    const isActive = item.classList.contains('active');

    // Smooth accordion behavior: collapse all other open items
    document.querySelectorAll('.faq-item').forEach(el => {
      if (el !== item) {
        el.classList.remove('active');
        const fc = el.querySelector('.faq-content');
        if (fc) fc.style.maxHeight = null;
      }
    });

    if (isActive) {
      item.classList.remove('active');
      content.style.maxHeight = null;
    } else {
      item.classList.add('active');
      content.style.maxHeight = content.scrollHeight + "px";
    }
  };

  // True 3D Mouse Tilt and Refractive Shine Effect for Curriculum Level Cards
  const initLevelCards3D = () => {
    const cards = document.querySelectorAll('.level-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // Mouse X position within the card
        const y = e.clientY - rect.top;  // Mouse Y position within the card
        
        const width = rect.width;
        const height = rect.height;
        
        // Calculate smooth rotation angles (-12deg to 12deg)
        const rotateX = -12 * ((y - height / 2) / (height / 2));
        const rotateY = 12 * ((x - width / 2) / (width / 2));
        
        card.style.transform = `translateY(-14px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Reflective light source coordinates mapped to CSS custom variables
        const pctX = (x / width) * 100;
        const pctY = (y / height) * 100;
        card.style.setProperty('--mouse-x', `${pctX}%`);
        card.style.setProperty('--mouse-y', `${pctY}%`);
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '10%');
      });
    });
  };

  /* ─── Language Translation ─── */
  CK.currentLanguage = localStorage.getItem('ck_language') || 'en';
  
  CK.translations = {
    en: {
      home: 'Home', features: 'Features', curriculum: 'Curriculum', coaches: 'Coaches',
      achievements: 'Achievements', pricing: 'Pricing', faq: 'Faq', login: 'Log In',
      translate: 'Translate',
      hero_title: 'Where kids<br>learn to<br><em>think two</em><br><em>moves</em><br>ahead.',
      hero_badge: "India's #1 Student Tracking System",
      hero_stat_students: 'Active Students',
      hero_stat_coaches: 'FIDE Coaches',
      hero_stat_championships: 'Championships',
      hero_stat_rating: 'Parent Rating',
      features_title: 'Everything Your Child Needs to Excel',
      features_lead: 'One-stop solution for kids learning chess - tracking, coaching, tournaments and more.',
      feature_tracking: 'Smart Student Tracking',
      feature_tracking_desc: 'Manage profiles, game history, and ratings for every student in one clean dashboard.',
      feature_progress: 'Progress Analytics',
      feature_progress_desc: 'Visual insights into each student\'s performance trends and learning velocity over time.',
      feature_tournament: 'Tournament Ready',
      feature_tournament_desc: 'Manage tournaments, match pairings, and leaderboards with professional efficiency.',
      feature_coaches: 'Certified Coaches',
      feature_coaches_desc: 'Learn from professionals trained under FIDE\'s rigorous global standards.',
      feature_curriculum: 'Advanced Curriculum',
      feature_curriculum_desc: 'Openings, middlegame tactics, endgames, and mental prep - all on one platform.',
      feature_feedback: 'Personalized Feedback',
      feature_feedback_desc: 'Every game is reviewed and discussed with the coach for continuous improvement.',
      feature_bilingual: 'Bilingual Support',
      feature_bilingual_desc: 'Clear communication for students and parents in English & Tamil.',
      levels_title: 'Three Levels – One Journey',
      levels_lead: 'Progress from total beginner to tournament-ready competitor with our structured curriculum.',
      level_beginner: 'Beginner Level',
      level_beginner_desc: 'Ideal for students new to chess. Focuses on basic moves, opening principles, and board control fundamentals.',
      level_intermediate: 'Intermediate Level',
      level_intermediate_desc: 'Designed for players with a solid foundation. Develops tactical awareness, middle-game strategy, and endgame mastery.',
      level_advanced: 'Advanced Level',
      level_advanced_desc: 'For competitive players targeting tournaments. Deep analysis, advanced openings, and psychological gameplay mastery.',
      coaches_title: 'Meet the Minds Behind the Moves',
      coaches_lead: '8+ FIDE-certified coaches with international ratings and state-championship experience.',
      achievements_title: 'Milestones & Accolades',
      achievements_lead: 'Recognizing the excellence of our students, coaches, and institution.',
      achievement_championships: '12+ Championships',
      achievement_championships_desc: 'Students and teams winning state and national level tournaments.',
      achievement_students: '200+ Active Students',
      achievement_students_desc: 'Young chess enthusiasts actively learning and competing.',
      achievement_rating: '4.9/5 Rating',
      achievement_rating_desc: 'Highest parent satisfaction rating among chess academies.',
      about_title: 'Global Certifications',
      reviews_title: 'Real Stories, Real Results',
      reviews_lead: 'From families across India who chose ChessKidoo for their children.',
      pricing_title: 'Simple, Affordable Plans',
      pricing_lead: 'No hidden fees. Every plan includes a free demo class to start.',
      faq_title: 'Frequently Asked Questions',
      faq_lead: 'Everything parents want to know before booking a demo class.',
      faq_q1: 'What is the minimum age to join ChessKidoo?',
      faq_a1: 'We welcome young minds starting from age 5 and up. Our coaches specialize in teaching early learners with playful, interactive, and gamified methods that make learning chess an absolute joy!',
      faq_q2: 'Are the classes online or offline?',
      faq_a2: 'All our classes are held online via premium, high-definition Google Meet sessions. Every session is highly interactive and live with FIDE-certified coaches, combined with automated game reviews on our custom student portal.',
      faq_q3: 'Does my child need prior chess knowledge?',
      faq_a3: 'Not at all! Our Beginner level starts from absolute scratch, covering how the pieces move, simple piece captures, and essential fundamentals. We build their knowledge step-by-step up to advanced tactics.',
      faq_q4: 'How does the free demo class work?',
      faq_a4: 'The free demo is a private 45-minute live interactive session with a senior FIDE-certified coach. The coach assesses your child\'s current logical thinking, maps their skill level, and guides them through their first mini-game.',
      faq_q5: 'Will my child be prepared for FIDE-rated tournaments?',
      faq_a5: 'Yes, absolutely! Our Advanced and elite coaching modules are specifically tailored around state, national, and FIDE-rated tournament schedules, covering advanced chess psychology, professional opening theory, and end-game mastery.',
      faq_q6: 'Can I track my child\'s progress?',
      faq_a6: 'Yes! Parents get access to our real-time Student Portal. Here, you can monitor classroom attendance, homework completion grades, tournament standings, FIDE rating progression charts, and direct coach feedback notes.',
      faq_q7: 'Can I change or cancel my plan?',
      faq_a7: 'Our learning plans are highly flexible. You can upgrade, downgrade, or suspend your child\'s subscription plan at any time without any hidden cancellation fees or long-term commitments.',
      cta_title: 'Your child\'s first move<br>starts with a free class.',
      cta_lead: 'Join 200+ students and families who chose ChessKidoo. No experience needed – just curiosity.',
      footer_about: 'India\'s #1 FIDE-certified chess academy for students aged 6-18. Building champions, one move at a time.',
      footer_learn: 'LEARN',
      footer_features: 'Features',
      footer_curriculum: 'Curriculum',
      footer_pricing: 'Pricing',
      footer_coaches: 'Our Coaches',
      footer_company: 'COMPANY',
      footer_about_us: 'About Us',
      footer_reviews: 'Reviews',
      footer_faq: 'FAQ',
      footer_contact: 'CONTACT',
      footer_copyright: '© 2026 ChessKidoo, Inc. All rights reserved. - FIDE Certified - ISO 9001:2015 - AICF Affiliate'
    },
ta: {
      home: 'மும்முறை', features: 'விரும்பிய', curriculum: 'கற்றல் திட்டம்', coaches: 'கோச்ச்கள்',
      achievements: 'சிறப்பு', pricing: 'விலை', faq: 'கேல்வி', login: 'பயனர் உள்நுழைய',
      translate: 'மொழி',
      hero_title: 'பள்ளத்தின் இரண்டு பக்கெல்லாம் யோசிக்க கல்வி',
      hero_badge: "இந்தியாவின் #1 மாணவர் கண்காணிப்பச் சிறப்பு",
      hero_stat_students: 'பயன்பாட்டில் மாணவர்',
      hero_stat_coaches: 'FIDE கோச்ச்கள்',
      hero_stat_championships: 'போட்டிகள்',
      hero_stat_rating: 'பெற்றோர் மதிப்பு',
      features_title: 'உங்கள் குழந்தைக்கு அனைத்தும் தேவை',
      features_lead: 'மாணவர் கணக்கு, பயிற்சி, போட்டிகள் உட்பட ஒரே இடம்',
      feature_tracking: 'ஸ்மார்ட் மாணவர் கணக்கு',
      feature_tracking_desc: 'ஒவ்வொரு மாணவருக்கும் பூர்த்தி டாஷ்போர்டு.',
      feature_progress: 'பரவலான பட்சப் பார்வை',
      feature_progress_desc: 'ஒவ்வொரு மாணவரின் செயற்பாட்டு பட்சப் பார்வை.',
      feature_tournament: 'போட்டியான திட்டம்',
      feature_tournament_desc: 'போட்டிகள், பிளேயர் பெருக்கிகள், லீடர்போர்டு.',
      feature_coaches: 'சான்றிதழ் கோச்ச்கள்',
      feature_coaches_desc: 'FIDE அங்கம் கொண்ட தெரிவு.',
      feature_curriculum: 'மேம்பட்சி கற்றல்',
      feature_curriculum_desc: 'புதழைகள், மத்திய பாயிற்றல், எண்ட்ஜேம், மன தூண்டுதல்.',
      feature_feedback: 'தனிப்பட்ச பின்னோத்தல்',
      feature_feedback_desc: 'ஒவ்வொரு பாட்டின் மறுபார்வை மற்றும் பேச்சு.',
      feature_bilingual: 'இருமொழி ஆதரவு',
      feature_bilingual_desc: 'இஂகிலிசி மற்றும் தமிழில் தெளிவான கம்பூடனி.',
      levels_title: 'மூண் நிலைகள் – ஒரே பயணம்',
      levels_lead: 'பத்திரமான கற்றல் திட்டம்.',
      level_beginner: 'பிள்ளைவாள் நிலை',
      level_beginner_desc: 'மாணவர் முதல் முறையாக வகைக்கப்பட்டவர்களுக்கு ஏற்ப.',
      level_intermediate: 'இடையிடை நிலை',
      level_intermediate_desc: 'தெரிந்த அடிப்படையில் பயிற்சிகள்.',
      level_advanced: 'மேம்பட்சி நிலை',
      level_advanced_desc: 'போட்டியான மாணவர்களுக்கு.',
      coaches_title: 'மனதை பிடித்த மனிதர்கள்',
      coaches_lead: '8+ FIDE-certified கோச்ச்கள்.',
      achievements_title: 'சிறப்பு நினைவுகள்',
      achievements_lead: 'எங்கள் மாணவர்கள், கோச்ச்கள் மற்றும் நிறுமம்.',
      achievement_championships: '12+ போட்டிகள்',
      achievement_championships_desc: 'மாணவர்களும் குழுவின் போட்டிகள்.',
      achievement_students: '200+ பயன்பாட்டில் மாணவர்',
      achievement_students_desc: 'யுவா மற்றும் போட்டியான மாணவர்கள்.',
      achievement_rating: '4.9/5 மதிப்பு',
      achievement_rating_desc: 'மிகப் பிடியான மாணவர் திருப்தி.',
      about_title: 'உலகளவில் தெரிவு',
      reviews_title: 'உண்மை கதைகள், உண்மை முடிவுகள்',
      reviews_lead: 'இந்தியாவின் பல்வேறு இடங்களிலிருந்து.',
      pricing_title: 'シンプルで அம்சுப் பதிவு',
      pricing_lead: 'மறைவான கட்டணம். இரவான தொடக்கம்.',
      faq_title: 'கேல்வி பெரும்பால் கேட்கப்படும் கேள்விகள்',
      faq_lead: 'பொறியியல் முன் பதிவு முன் பெரும்பால் தேவை.',
      faq_q1: 'சிறப்பு வயது இலாஹா?',
      faq_a1: '5 வயதிற்கு முக்கியம்!',
      faq_q2: 'பதிவு அல்லது ஆஃப்லைன்?',
      faq_a2: 'Google Meet மூலம் ஆனலாக.',
      faq_q3: 'குழந்தைக்கு முந்தைய வகை தேவையில்லை?',
      faq_a3: 'இல்லை! பிள்ளைவாள் நிலை.',
      faq_q4: 'முதல் பதிவு எவ்வளவு?',
      faq_a4: '45 மணிக்கு முன் தொடக்கம்.',
      faq_q5: 'வெனும் போட்டியில் தயாரி?',
      faq_a5: 'அதே மாதிரி!',
      faq_q6: 'குழந்தை பயண்பாட்டை கணக்கில் எடுக்கலாமா?',
      faq_a6: 'அம்மா!',
      faq_q7: 'பதிவு மாற்றலாமா?',
      faq_a7: 'உன்னை!',
      cta_title: 'உங்கள் குழந்தையின் முதல் பக்கம்',
      cta_lead: '200+ மாணவர்களும் குடும்பங்களும்.',
      footer_about: 'இந்தியாவின் #1 FIDE-certified மாணவர் அகாடமி.',
      footer_learn: 'கற்றல்',
      footer_features: 'விரும்பிய',
      footer_curriculum: 'கற்றல்',
      footer_pricing: 'விலை',
      footer_coaches: 'கோச்ச்கள்',
      footer_company: 'கம்பனி',
      footer_about_us: 'எங்களை',
      footer_reviews: 'விமர்சனங்கள்',
      footer_faq: 'கேல்வி',
      footer_contact: 'தொடர்பு',
      footer_copyright: '© 2026 ChessKidoo, Inc. உரிமைகள் செல்வாக்கப்படுத்தப்பட்டுள்ளன.'
    }
  };

  CK.toggleLanguage = () => {
    CK.currentLanguage = CK.currentLanguage === 'en' ? 'ta' : 'en';
    localStorage.setItem('ck_language', CK.currentLanguage);
    CK.applyTranslations();
    const icon = document.getElementById('langIcon');
    if (icon) icon.textContent = CK.currentLanguage === 'en' ? 'EN' : 'தமிழ்';
  };

  CK.applyTranslations = () => {
    const t = CK.translations[CK.currentLanguage];
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      if (t[key]) {
        if (t[key].includes('<br>')) {
          el.innerHTML = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });
    const langIcon = document.getElementById('langIcon');
    if (langIcon) {
      langIcon.textContent = CK.currentLanguage === 'en' ? 'EN' : 'தமிழ்';
    }
  };

  CK.currentLanguage = localStorage.getItem('ck_language') || 'en';
  CK.applyTranslations();

  // Batch Manager is defined in db.js with full Supabase support — do not redefine here.

  // Vault Board — renders an interactive chess board in the coach session panel
  CK.renderVaultBoard = () => {
    const container = document.getElementById('coachVaultBoard');
    if (!container) return;
    if (container.dataset.init) return;

    if (window.Chessboard) {
      container.innerHTML = '<div id="coachInteractiveVaultBoard" style="width:360px; max-width:100%; border-radius:8px; overflow:hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.35);"></div>';
      const board = Chessboard('coachInteractiveVaultBoard', {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: 'start',
        draggable: true
      });
      container.dataset.init = '1';
      CK.coachVaultBoardInstance = board;
      setTimeout(() => { board.resize(); }, 150);
    } else {
      const startPos = [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖']
      ];

      let html = '<div style="display:inline-grid;grid-template-columns:repeat(8,44px);grid-template-rows:repeat(8,44px);border:2px solid var(--p-gold-dim);border-radius:4px;overflow:hidden;">';
      startPos.forEach((row, r) => {
        row.forEach((piece, c) => {
          const light = (r + c) % 2 === 0;
          const bg = light ? '#f0d9b5' : '#b58863';
          html += `<div style="width:44px;height:44px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;user-select:none;" title="${String.fromCharCode(97+c)}${8-r}">${piece}</div>`;
        });
      });
      html += '</div>';
      container.innerHTML = html;
      container.dataset.init = '1';
    }
  };

  // Run on page load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initLevelCards3D();
  } else {
    document.addEventListener('DOMContentLoaded', initLevelCards3D);
  }

  // Unified PGN & Stockfish Analysis Lab — v3.0
  CK.lab = {
    board: null,
    game: null,
    history: [],
    currentMove: 0,
    orientation: 'white',
    annotations: {},
    _activeBoardId: 'studentLabBoard',
    _mode: 'analysis',
    _guessFrom: null,
    _sparGame: null,
    _sparMoveIdx: 0,
    _sparFollowing: true,

    /* chessboard.js sizes itself from the container width at creation time.
       When the Lab panel is still hidden/transitioning, that width is 0, so the
       board renders at 0px and the PGN Studio looks broken/unusable. Retry the
       resize on each animation frame until the container actually has a width. */
    _resizeBoardWhenReady(attempts) {
      attempts = attempts || 0;
      if (!this.board) return;
      const el = document.getElementById(this._activeBoardId);
      const w = el ? el.getBoundingClientRect().width : 0;
      if (w > 20) {
        try { this.board.resize(); } catch (e) {}
        // one more on the next frame in case fonts/scrollbars shift layout
        requestAnimationFrame(() => { try { if (this.board) this.board.resize(); } catch (e) {} });
      } else if (attempts < 60) {
        requestAnimationFrame(() => this._resizeBoardWhenReady(attempts + 1));
      }
    },

    /* Shared free-style analysis drop handler — used by both the initial board
       (initBoard) and after a PGN is loaded (analyzePgn) so the Lab board is a
       fully playable free-style board from the moment it opens. Makes any legal
       move from the current position, extends the line, and re-runs analysis. */
    _analysisOnDrop(source, target) {
      const self = this;
      if (self._mode !== 'analysis') return 'snapback';
      const temp = new Chess();
      for (let i = 0; i < self.currentMove; i++) temp.move(self.history[i]);
      // Auto-queen only when a pawn actually reaches the last rank; otherwise the
      // promotion flag is harmless. Detect promotion to optionally ask the user.
      const movingPiece = temp.get(source);
      const isPromotion = movingPiece && movingPiece.type === 'p' &&
        ((movingPiece.color === 'w' && target[1] === '8') || (movingPiece.color === 'b' && target[1] === '1'));
      let promo = 'q';
      if (isPromotion && typeof self._askPromotion === 'function') {
        promo = self._askPromotion() || 'q';
      }
      const move = temp.move({ from: source, to: target, promotion: promo });
      if (move) {
        self.history = self.history.slice(0, self.currentMove);
        self.history.push(move);
        self.currentMove++;
        self.renderMoveList();
        self.updateAnalysis(temp.fen(), move);
        // Ensure board syncs perfectly (castling, en passant, promotion)
        window.setTimeout(() => { if (self.board) self.board.position(temp.fen(), false); }, 10);
      } else {
        return 'snapback';
      }
    },

    initBoard(containerId) {
      this._activeBoardId = containerId;
      this._mode = 'analysis';
      this._guessFrom = null;
      this._sparGame = null;
      if (this.board) { this.board.destroy(); this.board = null; }
      this.game = new Chess();
      this.history = [];
      this.currentMove = 0;
      this.annotations = {};
      const self = this;
      this.board = Chessboard(containerId, {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: 'start',
        orientation: this.orientation,
        // Free-style: pieces are draggable from the start position.
        draggable: true,
        onDrop: (source, target) => self._analysisOnDrop(source, target)
      });
      this._resetModeBtns();
      this.renderMoveList();
      this.updateAnalysis(this.game.fen(), null);
      this._resizeBoardWhenReady();
    },

    loadPreset(pgnText, boardId) {
      const isCoach = (boardId || this._activeBoardId || '').startsWith('coach');
      const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
      const targetBoard = boardId || (isCoach ? 'coachLabBoard' : 'studentLabBoard');
      const pgnInput = document.getElementById(inputId);
      if (pgnInput) pgnInput.value = pgnText.trim();
      this.analyzePgn(pgnText.trim(), targetBoard);
    },

    /* Toggle the PGN Library browser panel and render the curated game cards
       into it. Wired to the "📚 PGN Library" button in both the student and
       coach Lab. Was referenced in HTML but never implemented → dead button. */
    openPgnLibraryBrowser(boardId) {
      const isCoach = (boardId || this._activeBoardId || '').startsWith('coach');
      const browserId = isCoach ? 'coachPgnLibraryBrowser' : 'studentPgnLibraryBrowser';
      const el = document.getElementById(browserId);
      if (!el) { CK.showToast('PGN library panel not found.', 'error'); return; }
      const isHidden = el.style.display === 'none' || !el.style.display;
      if (isHidden) {
        el.style.display = 'block';
        if (window.CK && CK.pgnLibrary && CK.pgnLibrary.renderCards) {
          CK.pgnLibrary.renderCards(browserId, boardId);
        } else {
          el.innerHTML = '<div style="padding:20px;text-align:center;opacity:.6;">PGN library is loading…</div>';
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.style.display = 'none';
      }
    },

    loadRandomPuzzle(boardId) {
      if (window.CK && CK.puzzlesPro && CK.puzzlesPro.PUZZLES) {
        const puzzles = CK.puzzlesPro.PUZZLES;
        const p = puzzles[Math.floor(Math.random() * puzzles.length)];
        const g = new Chess(p.fen);
        for (const m of p.moves) {
          g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] || 'q' });
        }
        const pgnText = `[FEN "${p.fen}"]\n\n${g.pgn()}`;
        const isCoach = (boardId || this._activeBoardId || '').startsWith('coach');
        const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
        const pgnInput = document.getElementById(inputId);
        if (pgnInput) pgnInput.value = pgnText.trim();
        this.analyzePgn(pgnText.trim(), boardId);
        CK.showToast(`Loaded Puzzle: ${p.title} (${p.rating})`, 'success');
      } else {
        CK.showToast('Puzzle database not available.', 'error');
      }
    },

    analyzePgn(pgnText, boardId) {
      this._activeBoardId = boardId;
      this._mode = 'analysis';
      this._guessFrom = null;
      this._sparGame = null;
      this._resetModeBtns();
      const ba = document.getElementById('labModeAnalysis');
      if (ba) ba.classList.add('active');
      this._setBanner(null, '');

      // Pre-process and clean the PGN to handle CRLF line endings
      let cleanPgn = (pgnText || '').trim();
      cleanPgn = cleanPgn.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      if (!this.game) this.game = new Chess();
      let success = this.game.load_pgn(cleanPgn);
      if (!success) {
        // Fallback 1: Strip comments and RAVs
        let stripped = cleanPgn.replace(/;.*$/gm, '').replace(/\{[^}]*\}/g, '');
        let prevLen;
        do {
          prevLen = stripped.length;
          stripped = stripped.replace(/\([^()]*\)/g, '');
        } while (stripped.length < prevLen);
        
        // Ensure empty line between headers and moves
        const headerEnd = stripped.lastIndexOf(']');
        if (headerEnd !== -1) {
          const headers = stripped.slice(0, headerEnd + 1);
          const moves = stripped.slice(headerEnd + 1).trim();
          stripped = headers + '\n\n' + moves;
        }

        success = this.game.load_pgn(stripped.trim());
        if (!success && headerEnd !== -1) {
          // Fallback 2: Try moves only (completely strip headers)
          const movesOnly = stripped.slice(headerEnd + 1).trim();
          success = this.game.load_pgn(movesOnly);
        }
      }

      if (!success) {
        CK.showToast('Invalid PGN format — check the notation and try again.', 'warning');
        this.game.reset();
      } else {
        CK.showToast('PGN loaded! Stockfish engine is analyzing…', 'success');
      }
      this.history = this.game.history({ verbose: true });
      this.currentMove = this.history.length;
      this.annotations = {};
      this._autoAnnotate();

      if (this.board) { this.board.destroy(); this.board = null; }
      
      const self = this;
      this.board = Chessboard(boardId, {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: this.game.fen(),
        orientation: this.orientation,
        draggable: true,
        onDrop: (source, target) => self._analysisOnDrop(source, target)
      });
      this.renderMoveList();
      this.updateAnalysis(this.game.fen(), this.history[this.history.length - 1] || null);
      this._resizeBoardWhenReady();
    },

    _autoAnnotate() {
      const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      this.history.forEach((mv, i) => {
        const san = mv.san;
        if (san.includes('#')) { this.annotations[i] = '!!'; }
        else if (mv.captured) {
          const gain = (VAL[mv.captured] || 0) - (VAL[mv.piece] || 0);
          if (gain >= 2) this.annotations[i] = '!!';
          else if (gain >= 1) this.annotations[i] = '!';
          else if (gain <= -2) this.annotations[i] = '??';
          else if (gain <= -1) this.annotations[i] = '?';
        } else if (san.includes('+') && !san.includes('x')) {
          this.annotations[i] = '!';
        } else if (mv.flags && mv.flags.includes('e')) {
          this.annotations[i] = '!';
        }
      });
    },

    renderMoveList() {
      const isCoach = this._activeBoardId && this._activeBoardId.startsWith('coach');
      const containerId = isCoach ? 'coachLabMoveList' : 'studentLabMoveList';
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!this.history.length) {
        container.innerHTML = '<div class="lab-ml-empty">Load a PGN to see the move list</div>';
        this._updateMoveCounter();
        return;
      }

      let html = '';
      for (let i = 0; i < this.history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const wMv = this.history[i];
        const bMv = this.history[i + 1];
        const wAnnot = this.annotations[i] ? `<span class="lab-annot">${this.annotations[i]}</span>` : '';
        const bAnnot = bMv && this.annotations[i + 1] ? `<span class="lab-annot">${this.annotations[i + 1]}</span>` : '';
        const wActive = this.currentMove === i + 1 ? ' active' : '';
        const bActive = bMv && this.currentMove === i + 2 ? ' active' : '';

        html += `<div class="lab-move-row">
          <span class="lab-move-num">${moveNum}.</span>
          <span class="lab-move-san${wActive}" onclick="CK.lab.goToMove(${i + 1})">${wMv.san}${wAnnot}</span>
          ${bMv
            ? `<span class="lab-move-san${bActive}" onclick="CK.lab.goToMove(${i + 2})">${bMv.san}${bAnnot}</span>`
            : '<span class="lab-move-san"></span>'}
        </div>`;
      }
      container.innerHTML = html;

      // Fix: scroll ONLY the move container, avoiding body scrolling/jumping
      const activeEl = container.querySelector('.lab-move-san.active');
      if (activeEl) {
        const row = activeEl.closest('.lab-move-row');
        if (row) {
          const containerHeight = container.clientHeight;
          const rowTop = row.offsetTop;
          const rowHeight = row.offsetHeight;
          container.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
        }
      }
      this._updateMoveCounter();
    },

    _updateMoveCounter() {
      document.querySelectorAll('.labMoveCounter').forEach(el => {
        el.textContent = this.history.length
          ? `Move ${this.currentMove} / ${this.history.length}`
          : 'No game loaded';
      });
    },

    autoplayInterval: null,
    autoplaySpeed: 3000,
    isAutoplayActive: false,

    toggleAutoplay() {
      if (this.isAutoplayActive) {
        this.stopAutoplay();
      } else {
        this.startAutoplay();
      }
    },

    startAutoplay() {
      if (!this.history || !this.history.length) {
        CK.showToast('No game loaded to autoplay.', 'warning');
        return;
      }
      if (this.currentMove >= this.history.length) {
        this.currentMove = 0;
        this._applyAndRefresh();
      }
      this.isAutoplayActive = true;
      this._updateAutoplayUI();
      
      this.autoplayInterval = setInterval(() => {
        if (this.currentMove < this.history.length) {
          this.next(true);
        } else {
          this.stopAutoplay();
          CK.showToast('Autoplay finished.', 'info');
        }
      }, this.autoplaySpeed);
    },

    stopAutoplay() {
      if (this.autoplayInterval) {
        clearInterval(this.autoplayInterval);
        this.autoplayInterval = null;
      }
      this.isAutoplayActive = false;
      this._updateAutoplayUI();
    },

    setAutoplaySpeed(ms) {
      this.autoplaySpeed = parseInt(ms) || 3000;
      if (this.isAutoplayActive) {
        this.stopAutoplay();
        this.startAutoplay();
      }
    },

    _updateAutoplayUI() {
      document.querySelectorAll('.lab-autoplay-btn').forEach(btn => {
        if (this.isAutoplayActive) {
          btn.innerHTML = '⏸️ Pause';
          btn.classList.add('active');
        } else {
          btn.innerHTML = '▶️ Play';
          btn.classList.remove('active');
        }
      });
    },

    goToMove(idx) {
      this.stopAutoplay();
      this.currentMove = Math.max(0, Math.min(idx, this.history.length));
      this._applyAndRefresh();
    },

    flip() {
      this.orientation = this.orientation === 'white' ? 'black' : 'white';
      if (this.board) this.board.orientation(this.orientation);
    },

    first() { this.stopAutoplay(); this.currentMove = 0; this._applyAndRefresh(); },
    prev()  { this.stopAutoplay(); if (this.currentMove > 0) { this.currentMove--; this._applyAndRefresh(); } },
    next(fromAuto)  { if (!fromAuto) this.stopAutoplay(); if (this.currentMove < this.history.length) { this.currentMove++; this._applyAndRefresh(); } },
    last()  { this.stopAutoplay(); this.currentMove = this.history.length; this._applyAndRefresh(); },

    _applyAndRefresh() {
      if (this._mode !== 'analysis') {
        this._mode = 'analysis';
        this._resetModeBtns();
        const ba = document.getElementById('labModeAnalysis');
        if (ba) ba.classList.add('active');
        this._setBanner(null, '');
        if (this.board) { this.board.destroy(); this.board = null; }
        const self = this;
        this.board = Chessboard(this._activeBoardId, {
          pieceTheme: function (piece) {
            return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
          },
          position: 'start',
          orientation: this.orientation,
          draggable: true,
          onDrop: (source, target) => {
            if (self._mode !== 'analysis') return 'snapback';
            const temp = new Chess();
            for(let i=0; i<self.currentMove; i++) temp.move(self.history[i]);
            const move = temp.move({from: source, to: target, promotion: 'q'});
            if(move) {
               self.history = self.history.slice(0, self.currentMove);
               self.history.push(move);
               self.currentMove++;
               self.renderMoveList();
               self.updateAnalysis(temp.fen(), move);
               // Ensure board syncs perfectly (castling, en passant, promotion)
               window.setTimeout(() => { if (self.board) self.board.position(temp.fen(), false); }, 10);

            } else {
               return 'snapback';
            }
          }
        });
      }
      const g = new Chess();
      for (let i = 0; i < this.currentMove; i++) g.move(this.history[i]);
      if (this.board) this.board.position(g.fen(), false);
      this.renderMoveList();
      this.updateAnalysis(g.fen(), this.history[this.currentMove - 1] || null);
    },

    updateAnalysis(fen, lastMoveObj) {
      this._updateMoveCounter();
      // Highlight the move just played on the analysis board (teal "Last move")
      if (window.CK && CK.boardFx) {
        if (lastMoveObj && lastMoveObj.from) {
          CK.boardFx.highlightLastMove(this._activeBoardId, lastMoveObj.from, lastMoveObj.to, { variant: 'review', san: lastMoveObj.san });
        } else {
          CK.boardFx.clear(this._activeBoardId);
        }
      }
      // Real engine evaluation — async overlay from Lichess Cloud Analysis & Stockfish WASM
      if (fen && window.CK && CK.engine) {
        document.querySelectorAll('.labEvalText').forEach(el => {
          el.textContent = '...';
          el.style.opacity = '0.5';
        });
        CK.engine.evaluate(fen)
          .then(result => {
            if (result && this.game && this.game.fen() === fen) {
              CK.engine.applyToUI(result);
            } else if (!result) {
              document.querySelectorAll('.labEvalText').forEach(el => el.style.opacity = '1');
            }
          })
          .catch(() => document.querySelectorAll('.labEvalText').forEach(el => el.style.opacity = '1'));
      }
    },

    _resetModeBtns() {
      ['labModeAnalysis','labModeGuess','labModeSpar','labModePlay','labModeLichess'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.classList.remove('active','active-guess','active-spar'); }
      });
      // Restore main lab grid; hide Lichess panel
      const grid = document.getElementById('studentLabMainGrid');
      if (grid) grid.style.display = '';
      const lp = document.getElementById('labLichessPanel');
      if (lp) lp.style.display = 'none';
    },

    _setBanner(text, type) {
      const banner = document.getElementById('labModeBanner');
      if (!banner) return;
      if (!text) { banner.style.display = 'none'; return; }
      banner.style.display = 'block';
      banner.className = `lab-mode-banner lab-mode-banner-${type}`;
      banner.innerHTML = text;
    },

    setMode(mode) {
      this._mode = mode;
      this._resetModeBtns();
      if (mode === 'guess') {
        const b = document.getElementById('labModeGuess');
        if (b) { b.classList.add('active-guess'); }
        if (!this.history.length) {
          CK.showToast('Load a PGN first, then enter Guess mode!', 'warning');
          this._mode = 'analysis';
          const ba = document.getElementById('labModeAnalysis');
          if (ba) ba.classList.add('active');
          this._setBanner(null, '');
          return;
        }
        this.currentMove = 0;
        this._guessFrom = null;
        this._initGuessMode();
        this._setBanner('🎯 <strong>Guess the Move!</strong> Click a piece, then its destination. Match the GM moves!', 'guess');
      } else if (mode === 'spar') {
        const b = document.getElementById('labModeSpar');
        if (b) { b.classList.add('active-spar'); }
        if (!this.history.length) {
          CK.showToast('Load a PGN first, then enter Sparring mode!', 'warning');
          this._mode = 'analysis';
          const ba = document.getElementById('labModeAnalysis');
          if (ba) ba.classList.add('active');
          this._setBanner(null, '');
          return;
        }
        this._initSparMode();
        this._setBanner('🤖 <strong>Sparring Bot:</strong> You play White. Bot follows the PGN as Black. Drag pieces to make your move!', 'spar');
      } else if (mode === 'play') {
        const b = document.getElementById('labModePlay');
        if (b) b.classList.add('active');
        this._initPlayMode();
        this._setBanner('♟ <strong>Play vs Computer:</strong> Choose your difficulty and start playing! The engine adapts to your level.', 'spar');
      } else if (mode === 'lichess') {
        const b = document.getElementById('labModeLichess');
        if (b) b.classList.add('active');
        const grid = document.getElementById('studentLabMainGrid');
        if (grid) grid.style.display = 'none';
        const lp = document.getElementById('labLichessPanel');
        if (lp) lp.style.display = 'block';
        this._setBanner('🌐 <strong>Lichess Viewer:</strong> Paste a game, study, or puzzle URL and click Embed.', 'analysis');
      } else {
        const b = document.getElementById('labModeAnalysis');
        if (b) b.classList.add('active');
        this._initAnalysisMode();
        this._setBanner(null, '');
      }
    },

    /* ─── Play vs Computer mode ─── */
    _pvDifficulty: 'Intermediate',
    _pvPlayerColor: 'white',

    _initPlayMode() {
      this._mode = 'play';
      const pvPanel = document.getElementById('labPvCPanel') || document.getElementById('coachLabPvCPanel');
      if (pvPanel) pvPanel.style.display = 'block';
      // Don't auto-start; user clicks Start Game to choose time control + difficulty first
    },

    startPlayVsComputer(difficulty, color, timeControl) {
      this._pvDifficulty  = difficulty   || this._pvDifficulty;
      this._pvPlayerColor = color        || this._pvPlayerColor;
      this._pvTimeControl = timeControl  || this._pvTimeControl || 'unlimited';
      if (CK.enginePlay) {
        CK.enginePlay.initPlayVsComputer(
          'pvBoard',
          'pvStatus',
          this._pvDifficulty,
          this._pvPlayerColor,
          this._pvTimeControl
        );
      }
    },

    _initAnalysisMode() {
      const g = new Chess();
      for (let i = 0; i < this.currentMove; i++) g.move(this.history[i]);
      if (this.board) { this.board.destroy(); this.board = null; }
      const self = this;
      this.board = Chessboard(this._activeBoardId, {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: g.fen(),
        orientation: this.orientation,
        draggable: true,
        onDrop: (source, target) => {
          if (self._mode !== 'analysis') return 'snapback';
          const temp = new Chess();
          for(let i=0; i<self.currentMove; i++) temp.move(self.history[i]);
          const move = temp.move({from: source, to: target, promotion: 'q'});
          if(move) {
             self.history = self.history.slice(0, self.currentMove);
             self.history.push(move);
             self.currentMove++;
             self.renderMoveList();
             self.updateAnalysis(temp.fen(), move);
          } else {
             return 'snapback';
          }
        }
      });
      this.renderMoveList();
      this.updateAnalysis(g.fen(), this.history[this.currentMove - 1] || null);
    },

    _initGuessMode() {
      const g = new Chess();
      if (this.board) { this.board.destroy(); this.board = null; }
      this.board = Chessboard(this._activeBoardId, {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: g.fen(),
        orientation: 'white',
        draggable: false,
        onSquareClick: (sq, piece) => this._handleGuessClick(sq, piece)
      });
      this.currentMove = 0;
      this.renderMoveList();
      this.updateAnalysis(g.fen(), null);
    },

    _handleGuessClick(square, piece) {
      if (this._mode !== 'guess') return;
      if (this.currentMove >= this.history.length) {
        CK.showToast('End of game — all moves guessed!', 'info');
        return;
      }
      const expected = this.history[this.currentMove];
      const boardEl = document.getElementById(this._activeBoardId);

      if (!this._guessFrom) {
        if (!piece) return;
        if (piece[0] !== expected.color) {
          CK.showToast(`It's ${expected.color === 'w' ? 'White' : 'Black'}'s turn!`, 'warning');
          return;
        }
        this._guessFrom = square;
        boardEl?.querySelector(`.square-${square}`)?.classList.add('lab-guess-highlight');
        return;
      }

      const from = this._guessFrom;
      this._guessFrom = null;
      boardEl?.querySelectorAll('.lab-guess-highlight,.lab-guess-hint').forEach(el => {
        el.classList.remove('lab-guess-highlight','lab-guess-hint');
      });

      if (from === square) return;

      if (from === expected.from && square === expected.to) {
        this.currentMove++;
        const g2 = new Chess();
        for (let i = 0; i < this.currentMove; i++) g2.move(this.history[i]);
        if (this.board) this.board.position(g2.fen(), true);
        this.renderMoveList();
        this.updateAnalysis(g2.fen(), expected);
        CK.showToast(`✓ Correct! ${expected.san}`, 'success');
        if (this.currentMove >= this.history.length) {
          this._setBanner('🏆 <strong>Brilliant!</strong> You guessed all moves in this game!', 'guess');
        } else {
          const next = this.history[this.currentMove];
          this._setBanner(`✓ <strong>${expected.san}</strong> — now guess ${next.color === 'w' ? 'White' : 'Black'}'s next move!`, 'guess');
        }
      } else {
        CK.showToast('✗ Not quite — try again!', 'warning');
        this._guessFrom = null;
        this._setBanner(`✗ <strong>Wrong square!</strong> Think about piece activity and threats. Hint: the piece starts on <code>${expected.from}</code>.`, 'guess');
        setTimeout(() => {
          if (this._mode === 'guess') {
            this._setBanner('🎯 <strong>Guess the Move!</strong> Click a piece, then its destination.', 'guess');
          }
        }, 2500);
      }
    },

    _initSparMode() {
      this._sparGame = new Chess();
      this._sparMoveIdx = 0;
      this._sparFollowing = true;
      if (this.board) { this.board.destroy(); this.board = null; }
      const self = this;
      this.board = Chessboard(this._activeBoardId, {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position: 'start',
        orientation: 'white',
        draggable: true,
        onDrop: (from, to) => self._handleSparDrop(from, to),
        onSnapEnd: () => { if (self.board && self._sparGame) self.board.position(self._sparGame.fen()); }
      });
    },

    _handleSparDrop(from, to) {
      if (this._mode !== 'spar' || !this._sparGame) return 'snapback';
      if (this._sparGame.turn() !== 'w') return 'snapback';

      const move = this._sparGame.move({ from, to, promotion: 'q' });
      if (!move) return 'snapback';

      const expected = this.history[this._sparMoveIdx];
      const followedPgn = this._sparFollowing && expected && from === expected.from && to === expected.to;
      this._sparMoveIdx++;
      if (!followedPgn) this._sparFollowing = false;

      this.updateAnalysis(this._sparGame.fen(), move);
      if (followedPgn) {
        CK.showToast(`Following game: ${move.san}`, 'info');
      } else {
        CK.showToast(`Deviation! ${move.san} — bot improvising…`, 'info');
      }

      if (!this._sparGame.game_over()) {
        setTimeout(() => this._sparBotMove(), 600);
      } else {
        const result = this._sparGame.in_checkmate() ? '🏆 Checkmate!' : '½–½ Draw!';
        this._setBanner(`${result} <strong>Game over.</strong>`, 'spar');
      }
    },

    _sparBotMove() {
      if (!this._sparGame || this._sparGame.game_over()) return;
      const expected = this.history[this._sparMoveIdx];
      const _checkGameOver = () => {
        if (!this._sparGame.game_over()) return false;
        const result = this._sparGame.in_checkmate() ? '🏆 Checkmate!' : '½–½ Draw!';
        this._setBanner(`${result} <strong>Game over.</strong>`, 'spar');
        return true;
      };
      if (this._sparFollowing && expected && this._sparMoveIdx < this.history.length) {
        const move = this._sparGame.move(expected.san);
        if (move) {
          this._sparMoveIdx++;
          if (this.board) this.board.position(this._sparGame.fen(), true);
          if (!_checkGameOver()) this._setBanner(`🤖 <strong>Bot played:</strong> ${move.san}. Your turn (White)!`, 'spar');
          this.updateAnalysis(this._sparGame.fen(), move);
          return;
        }
      }
      const fen = this._sparGame.fen();
      if (window.CK && CK.engine) {
        CK.engine.evaluate(fen)
          .then(result => {
            if (!this._sparGame || this._sparGame.game_over()) return;
            if (result && result.pv) {
              const uci = result.pv.split(' ')[0];
              const move = this._sparGame.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' });
              if (move) {
                if (this.board) this.board.position(this._sparGame.fen(), true);
                if (!_checkGameOver()) this._setBanner(`🤖 <strong>Bot played:</strong> ${move.san} (Stockfish d${result.depth}). Your turn!`, 'spar');
                this.updateAnalysis(this._sparGame.fen(), move);
                return;
              }
            }
            // Fall back to random move when engine result unusable
            if (!this._sparGame || this._sparGame.game_over()) return;
            const moves = this._sparGame.moves({ verbose: true });
            if (moves.length) {
              const m = moves[Math.floor(Math.random() * moves.length)];
              const move = this._sparGame.move(m);
              if (move && this.board) this.board.position(this._sparGame.fen(), true);
              if (!_checkGameOver()) this._setBanner(`🤖 <strong>Bot played:</strong> ${move ? move.san : '?'}. Your turn!`, 'spar');
            }
          })
          .catch(() => {
            // Engine unavailable — fall back to random move
            if (!this._sparGame || this._sparGame.game_over()) return;
            const moves = this._sparGame.moves({ verbose: true });
            if (moves.length) {
              const m = moves[Math.floor(Math.random() * moves.length)];
              const move = this._sparGame.move(m);
              if (move && this.board) this.board.position(this._sparGame.fen(), true);
              if (!_checkGameOver()) this._setBanner('🤖 <strong>Bot played</strong> (random). Your turn!', 'spar');
            }
          });
      }
    },

    importUrl() {
      this._importUrlFor('labUrlInput', this._activeBoardId || 'studentLabBoard');
    },

    _importUrlFor(inputId, boardId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const url = input.value.trim();
      if (!url) { CK.showToast('Paste a Lichess game URL first', 'warning'); return; }
      const m = url.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
      if (!m) {
        CK.showToast('Only Lichess URLs supported (e.g. lichess.org/abcd1234)', 'warning');
        return;
      }
      CK.showToast('Fetching game from Lichess…', 'info');
      const isCoach = boardId && boardId.startsWith('coach');
      const pgn2Id = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
      fetch(`https://lichess.org/game/export/${m[1]}?moves=true&clocks=false&evals=false&opening=false`, {
        headers: { Accept: 'application/x-chess-pgn' }
      })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(pgn => {
        const ta = document.getElementById(pgn2Id);
        if (ta) ta.value = pgn.trim();
        this.analyzePgn(pgn.trim(), boardId);
        input.value = '';
        CK.showToast('Game imported from Lichess!', 'success');
      })
      .catch(() => CK.showToast('Could not fetch game. Paste the PGN directly.', 'error'));
    },

    importLichessUser(inputId, boardId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const username = input.value.trim();
      if (!username) { CK.showToast('Enter a Lichess username', 'warning'); return; }
      CK.showToast(`Fetching latest game for ${username}…`, 'info');
      // Fetch the 1 most recent game for the user
      fetch(`https://lichess.org/api/games/user/${username}?max=1&moves=true&clocks=false&evals=false&opening=false`, {
        headers: { Accept: 'application/x-chess-pgn' }
      })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(pgn => {
        if (!pgn || !pgn.trim()) {
           CK.showToast(`No recent games found for ${username}`, 'warning');
           return;
        }
        const isCoach = boardId && boardId.startsWith('coach');
        const pgn2Id = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
        const ta = document.getElementById(pgn2Id);
        if (ta) ta.value = pgn.trim();
        this.analyzePgn(pgn.trim(), boardId);
        input.value = '';
        CK.showToast('Latest game imported from Lichess!', 'success');
      })
      .catch(() => CK.showToast(`Could not fetch games for ${username}.`, 'error'));
    },

    async broadcastCoach() {
      const fen = this._sparGame?.fen() || this.game?.fen() || 'start';
      const pgn = this.game ? this.game.pgn() : '';
      const broadcast = { fen, pgn, coach: CK.currentUser?.full_name || 'Coach', ts: Date.now() };
      localStorage.setItem('ck_coach_broadcast', JSON.stringify(broadcast));
      if (window.supabaseClient) {
        try { await window.supabaseClient.from('broadcasts').upsert({ id: 'coach_board', ...broadcast }); } catch(e) {}
      }
      const active = Object.values(JSON.parse(localStorage.getItem('ck_live_presence') || '{}')).filter(u => u.role === 'student' && Date.now() - u.lastSeen < 300000).length;
      CK.showToast(`📢 Position broadcasted to ${active} active student${active !== 1 ? 's' : ''}!`, 'success');
    },

    _followSubscription: null,
    toggleFollowCoach() {
      const btn = document.getElementById('studentFollowCoachBtn');
      const dot = btn?.querySelector('.live-dot');
      const isFollowing = !!this._followSubscription;

      if (isFollowing) {
        if (window.supabaseClient && typeof window.supabaseClient.removeChannel === 'function') {
          window.supabaseClient.removeChannel(this._followSubscription);
        }
        this._followSubscription = null;
        if (btn) {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }
        if (dot) dot.style.display = 'none';
        CK.showToast('📡 Unfollowed coach board.', 'info');
      } else {
        if (!window.supabaseClient || typeof window.supabaseClient.channel !== 'function') {
          CK.showToast('Real-time database connection not available.', 'error');
          return;
        }

        CK.showToast('📡 Syncing with Coach board live...', 'success');
        if (btn) {
          btn.style.background = 'rgba(34,197,94,0.15)';
          btn.style.borderColor = '#22c55e';
          btn.style.color = '#22c55e';
        }
        if (dot) dot.style.display = 'inline-block';

        // Load the initial coach board state first
        window.supabaseClient.from('broadcasts').select('*').eq('id', 'coach_board').maybeSingle().then(res => {
          if (res.data && res.data.pgn) {
            this.analyzePgn(res.data.pgn, 'studentLabBoard');
          }
        });

        // Listen for realtime updates
        this._followSubscription = window.supabaseClient.channel('public:broadcasts_coach')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts', filter: "id=eq.coach_board" }, (payload) => {
            if (payload.new && payload.new.pgn) {
              this.analyzePgn(payload.new.pgn, 'studentLabBoard');
            }
          })
          .subscribe();
      }
    },

    lichessEmbed(inputId, frameId) {
      const raw = (typeof inputId === 'string' && inputId.startsWith('http'))
        ? inputId
        : document.getElementById(inputId)?.value?.trim();
      if (!raw) { CK.showToast('Enter a Lichess URL', 'warning'); return; }

      let embedUrl = null;
      // Study with chapter: lichess.org/study/{id}/{chapterId}
      const sc = raw.match(/lichess\.org\/study\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/);
      // Study without chapter: lichess.org/study/{id}
      const s  = raw.match(/lichess\.org\/study\/([a-zA-Z0-9]+)/);
      // Game: lichess.org/{8-char-id}
      const g  = raw.match(/lichess\.org\/(?:embed\/game\/)?([a-zA-Z0-9]{8})(?:[^a-zA-Z0-9]|$)/);

      if (sc)     embedUrl = `https://lichess.org/study/embed/${sc[1]}/${sc[2]}?bg=dark&theme=brown`;
      else if (s) embedUrl = `https://lichess.org/study/embed/${s[1]}?bg=dark&theme=brown`;
      else if (g) embedUrl = `https://lichess.org/embed/game/${g[1]}?bg=dark&theme=brown`;

      if (!embedUrl) {
        CK.showToast('Unrecognised URL. Supported: lichess.org/abcd1234 (game) or lichess.org/study/… (study).', 'error');
        return;
      }
      const frame = document.getElementById(frameId);
      if (!frame) return;
      frame.innerHTML = `<iframe src="${embedUrl}" style="width:100%;height:600px;border:0;border-radius:10px;display:block;" allowfullscreen loading="lazy"></iframe>`;
      // Show wrapper card for coach lab
      if (frameId === 'coachLichessEmbedFrame') {
        const card = document.getElementById('coachLichessEmbedCard');
        if (card) card.style.display = 'block';
      }
    },

    lichessMyGames(frameId) {
      const username = CK.student?.userProfile?.lichess_username;
      if (!username) {
        CK.showToast('Link your Lichess account first — go to Linked Accounts.', 'warning');
        return;
      }
      const frame = document.getElementById(frameId);
      if (!frame) return;
      frame.innerHTML = `<iframe src="https://lichess.org/@/${encodeURIComponent(username)}/tv?bg=dark" style="width:100%;height:600px;border:0;border-radius:10px;display:block;" allowfullscreen loading="lazy"></iframe>`;
    },

    _uploadedGames: [],
    _filteredGames: [],

    parseMultiPgn(pgnText) {
      const games = [];
      const content = pgnText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      // Split by tags matching [Event "..."
      const rawGames = content.split(/(?=\[Event\s)/i);
      
      rawGames.forEach((rawGame, index) => {
        if (!rawGame.trim()) return;
        
        const headers = {};
        const headerRegex = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
        let match;
        while ((match = headerRegex.exec(rawGame)) !== null) {
          headers[match[1]] = match[2];
        }
        
        // Move-text = everything after the last header line; count full moves
        const moveText = rawGame.replace(/\[[^\]]*\]\s*/g, '').trim();
        const moveCount = (moveText.match(/\d+\./g) || []).length;

        const game = {
          id: 'uploaded_' + index + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          title: headers.Event || 'Game ' + (games.length + 1),
          white: headers.White || 'Unknown White',
          black: headers.Black || 'Unknown Black',
          whiteElo: headers.WhiteElo || '',
          blackElo: headers.BlackElo || '',
          year: headers.Date ? headers.Date.split('.')[0] : (headers.UTCDate ? headers.UTCDate.split('.')[0] : '?'),
          date: headers.Date || headers.UTCDate || '',
          site: headers.Site || '',
          round: headers.Round || '',
          eco: headers.ECO || '',
          opening: headers.Opening || '',
          timeControl: headers.TimeControl || '',
          termination: headers.Termination || '',
          result: headers.Result || '*',
          moves: moveCount,
          pgn: rawGame.trim()
        };
        games.push(game);
      });
      return games;
    },

    renderPgnDbExplorer(boardId) {
      const isCoach = (boardId || '').startsWith('coach');
      const explorerId = isCoach ? 'coachPgnDbExplorer' : 'studentPgnDbExplorer';
      const explorer = document.getElementById(explorerId);
      if (!explorer) return;

      if (!this._uploadedGames.length) {
        explorer.style.display = 'none';
        return;
      }

      explorer.style.display = 'block';
      explorer.innerHTML = `
        <div class="lab-db-header">
          <span class="lab-db-title">📁 PGN Database (${this._uploadedGames.length} games)</span>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.lab.clearUploadedGames('${boardId}')" style="font-size: 0.65rem; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.15);">Clear</button>
        </div>
        <input type="text" class="lab-db-search" placeholder="Search by player, event, year..." oninput="CK.lab.filterUploadedGames(this.value, '${boardId}')" />
        <div class="lab-db-list">
          ${this._renderGameListItems(this._filteredGames, boardId)}
        </div>
      `;
    },

    _renderGameListItems(gamesList, boardId) {
      if (!gamesList.length) {
        return '<div style="color:var(--p-text-muted);font-size:0.75rem;text-align:center;padding:10px;">No games match search</div>';
      }
      const esc = (CK.esc || (s => s));
      const showGames = gamesList.slice(0, 100);
      const row = (label, val) => val ? `<div class="lab-db-detail-row"><span>${label}</span><span>${esc(String(val))}</span></div>` : '';
      return showGames.map(g => {
        const wElo = g.whiteElo ? ` (${esc(g.whiteElo)})` : '';
        const bElo = g.blackElo ? ` (${esc(g.blackElo)})` : '';
        return `
        <div class="lab-db-item-wrap" data-gid="${esc(g.id)}">
          <div class="lab-db-item">
            <button class="lab-db-expand" aria-label="Toggle details" onclick="CK.lab.toggleGameDetails('${esc(g.id)}')">▸</button>
            <div class="lab-db-item-info" onclick="CK.lab.loadUploadedGame('${esc(g.id)}', '${esc(boardId)}')" style="cursor:pointer;flex:1;min-width:0;">
              <div class="lab-db-item-players">${esc(g.white)}${wElo} vs ${esc(g.black)}${bElo}</div>
              <div class="lab-db-item-details">${esc(g.title)} · ${esc(g.year)} · ${esc(g.result)}${g.moves ? ' · ' + g.moves + ' moves' : ''}</div>
            </div>
            <button class="lab-db-item-btn" onclick="CK.lab.loadUploadedGame('${esc(g.id)}', '${esc(boardId)}')">Load</button>
          </div>
          <div class="lab-db-details" id="lab-db-details-${esc(g.id)}" style="display:none;">
            ${row('Event', g.title)}
            ${row('Site', g.site)}
            ${row('Date', g.date)}
            ${row('Round', g.round)}
            ${row('Opening', g.opening || g.eco)}
            ${row('ECO', g.eco)}
            ${row('Time control', g.timeControl)}
            ${row('Result', g.result)}
            ${row('Moves', g.moves)}
            ${row('Termination', g.termination)}
          </div>
        </div>`;
      }).join('');
    },

    /* Expand/collapse the full PGN header details for a game in the DB explorer. */
    toggleGameDetails(gid) {
      const panel = document.getElementById('lab-db-details-' + gid);
      const wrap = document.querySelector(`.lab-db-item-wrap[data-gid="${gid}"]`);
      if (!panel) return;
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      const btn = wrap ? wrap.querySelector('.lab-db-expand') : null;
      if (btn) btn.textContent = open ? '▸' : '▾';
    },

    filterUploadedGames(query, boardId) {
      const q = query.toLowerCase().trim();
      if (!q) {
        this._filteredGames = [...this._uploadedGames];
      } else {
        this._filteredGames = this._uploadedGames.filter(g => 
          g.white.toLowerCase().includes(q) ||
          g.black.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q) ||
          g.year.toString().includes(q)
        );
      }
      const isCoach = (boardId || '').startsWith('coach');
      const explorerId = isCoach ? 'coachPgnDbExplorer' : 'studentPgnDbExplorer';
      const listEl = document.querySelector(`#${explorerId} .lab-db-list`);
      if (listEl) {
        listEl.innerHTML = this._renderGameListItems(this._filteredGames, boardId);
      }
    },

    loadUploadedGame(gameId, boardId) {
      const g = this._uploadedGames.find(x => x.id === gameId);
      if (!g) return;
      const isCoach = (boardId || '').startsWith('coach');
      const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
      const input = document.getElementById(inputId);
      if (input) input.value = g.pgn;
      this.analyzePgn(g.pgn, boardId);
      CK.showToast(`Loaded: ${g.white} vs ${g.black}`, 'success');
    },

    clearUploadedGames(boardId) {
      this._uploadedGames = [];
      this._filteredGames = [];
      this.renderPgnDbExplorer(boardId);
    },

    handleFileUpload(event, boardId) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'pgn' && ext !== 'txt') {
        CK.showToast('Please upload a .pgn or .txt file.', 'warning');
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const pgnText = e.target.result;
        const parsedGames = this.parseMultiPgn(pgnText);
        if (parsedGames.length > 1) {
          this._uploadedGames = parsedGames;
          this._filteredGames = [...parsedGames];
          this.renderPgnDbExplorer(boardId);
          this.loadUploadedGame(parsedGames[0].id, boardId);
          CK.showToast(`📁 "${file.name}" loaded: ${parsedGames.length} games found in database!`, 'success');
        } else {
          this._uploadedGames = [];
          this._filteredGames = [];
          this.renderPgnDbExplorer(boardId);
          const isCoach = (boardId || '').startsWith('coach');
          const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
          const input = document.getElementById(inputId);
          if (input) input.value = pgnText.trim();
          this.analyzePgn(pgnText.trim(), boardId || 'studentLabBoard');
          CK.showToast(`📁 "${file.name}" loaded — ${pgnText.match(/\d+\./g)?.length || '?'} moves`, 'success');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  /* ─── Vault Modal Functions ─── */
  CK._vaultPieces = [
    'r','n','b','q','k','b','n','r',
    'p','p','p','p','p','p','p','p',
    '','','','','','','','',
    '','','','','','','','',
    '','','','P','','','','',
    '','','N','','','','','',
    'P','P','P','','','P','P','P',
    'R','','B','Q','K','B','N','R'
  ];

  CK._renderVaultGrid = (pieces) => {
    const grid = document.getElementById('vaultSquaresGrid');
    if (!grid) return;
    const pieceGlyphs = {
      'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟',
      'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'
    };
    grid.innerHTML = pieces.map((p, idx) => {
      const row = Math.floor(idx / 8);
      const col = idx % 8;
      const light = (row + col) % 2 === 0;
      const bg = light ? '#ffffff' : '#4a7c40';
      const glyph = pieceGlyphs[p] || '';
      const color = p && p === p.toUpperCase() ? '#fff' : '#1a1a1a';
      return `<div style="background:${bg};display:flex;align-items:center;justify-content:center;font-size:clamp(14px,3vw,22px);color:${color};text-shadow:0 1px 3px rgba(0,0,0,0.5);">${glyph}</div>`;
    }).join('');
  };

  CK.openVaultSession = (title, coach, videoUrl = '') => {
    const titleEl = document.getElementById('vaultModalTitle');
    const coachEl = document.getElementById('vaultModalCoach');
    if (titleEl) titleEl.textContent = title || 'Class Replay';
    if (coachEl) coachEl.textContent = `Coach: ${coach || '—'}`;
    const tsEl = document.getElementById('vaultVideoTimestamp');
    if (tsEl) tsEl.textContent = '00:00 / 45:20';
    const badgeEl = document.getElementById('vaultMoveBadge');
    if (badgeEl) badgeEl.textContent = 'Starting Position';
    const noteEl = document.getElementById('vaultHumanAnalysis');
    if (noteEl) noteEl.innerHTML = '💡 <strong>GM Coach Note:</strong> Study the opening phase — piece development and center control are the foundation of every great game.';
    CK._renderVaultGrid(CK._vaultPieces);

    const videoSim = document.getElementById('vaultVideoSim');
    if (videoSim) {
      if (videoUrl) {
        videoSim.innerHTML = `
          <video id="vaultRealVideo" controls autoplay style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
            <source src="${videoUrl}" type="video/webm">
            Your browser does not support the video tag.
          </video>
        `;
      } else {
        videoSim.innerHTML = `
          <div style="font-size: 4rem; margin-bottom: 12px;">📽️</div>
          <div>Playing Masterclass Video Stream...</div>
          <div id="vaultVideoTimestamp"
            style="color: #d4af37; font-weight: bold; margin-top: 8px; font-size: 1.4rem;">02:15 / 45:20</div>
        `;
      }
    }

    const modal = document.getElementById('vaultModal');
    if (modal) modal.style.display = 'flex';
  };

  CK.seekVaultMove = (timestamp, move, explanation) => {
    const tsEl = document.getElementById('vaultVideoTimestamp');
    if (tsEl) tsEl.textContent = `${timestamp} / 45:20`;
    const badgeEl = document.getElementById('vaultMoveBadge');
    if (badgeEl) badgeEl.textContent = `Move: ${move}`;
    const noteEl = document.getElementById('vaultHumanAnalysis');
    if (noteEl) noteEl.innerHTML = `💡 <strong>GM Coach Note:</strong> ${explanation}`;
    // Shift the board slightly to simulate move playback
    const grid = document.getElementById('vaultSquaresGrid');
    if (grid) {
      grid.style.opacity = '0.6';
      grid.style.transition = 'opacity 0.2s';
      setTimeout(() => {
        grid.style.opacity = '1';
      }, 250);
    }
    CK.showToast(`Seeking to ${timestamp} — ${move}`, 'info');
  };

  CK.closeVaultModal = () => {
    const video = document.getElementById('vaultRealVideo');
    if (video) {
      try { video.pause(); } catch(e){}
    }
    const modal = document.getElementById('vaultModal');
    if (modal) modal.style.display = 'none';
  };

  /* ─── Global Keyboard Shortcuts ─── */
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs/textareas
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Ctrl/Cmd + K — Quick search / navigate
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Focus admin search if on admin page, else show toast hint
      const searchEl = document.getElementById('adminGlobalSearch');
      if (searchEl && document.getElementById('admin-page')?.classList.contains('active')) {
        searchEl.focus();
      } else {
        CK.showToast('Ctrl+K: Quick Search (available in Admin portal)', 'info');
      }
    }

    // Escape — Close modals/drawers
    if (e.key === 'Escape') {
      CK.closeModal();
      if (CK.closeCurriculum) CK.closeCurriculum();
      if (CK.closePolicies) CK.closePolicies();
      const drawer = document.getElementById('notifDrawer');
      if (drawer?.classList.contains('notif-open')) CK.notifs?.toggleDrawer();
    }

    // Alt+H — Go to home/dashboard
    if (e.altKey && e.key === 'h') {
      e.preventDefault();
      const user = CK.currentUser;
      if (user) {
        const role = user.role.toLowerCase();
        if (role === 'admin' && CK.admin)     CK.admin.showPanel('dashboard');
        if (role === 'student' && CK.student) CK.student.nav('home');
        if (role === 'coach' && CK.coach)     CK.coach.nav('home');
      } else {
        CK.showPage('landing-page');
      }
    }

    // Alt+N — Toggle notifications
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      if (CK.notifs) CK.notifs.toggleDrawer();
    }

    // Alt+A — Quick navigate to Arena
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
      CK.navigate('arena');
    }
  });

  /* ─── Performance: Lazy-load images with IntersectionObserver ─── */
  const lazyImgObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        lazyImgObs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('img[data-src]').forEach(img => lazyImgObs.observe(img));

  window.addEventListener('resize', () => {
    if (window.CK && CK.lab && CK.lab.board) {
      CK.lab.board.resize();
    }
  });

})();
  /* ─── Curriculum Portal ─── */
  CK.openCurriculum = (targetId) => {
    const modal = document.getElementById('curriculumModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // If a specific section was clicked, scroll to it smoothly
      if (targetId) {
        setTimeout(() => {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief highlight flash
            targetEl.style.transition = 'box-shadow 0.5s, transform 0.5s';
            targetEl.style.boxShadow = '0 0 30px var(--amber)';
            targetEl.style.transform = 'scale(1.02)';
            setTimeout(() => {
              targetEl.style.boxShadow = 'none';
              targetEl.style.transform = 'scale(1)';
            }, 1000);
          }
        }, 100);
      }
    }
  };

  CK.closeCurriculum = () => {
    const modal = document.getElementById('curriculumModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  /* ─── Academy Policies Portal (same shell/behaviour as the curriculum) ─── */
  CK.openPolicies = (targetId) => {
    const modal = document.getElementById('policiesModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.style.transition = 'box-shadow 0.5s';
          el.style.boxShadow = '0 0 30px rgba(232,160,32,0.45)';
          setTimeout(() => { el.style.boxShadow = 'none'; }, 1200);
        }
      }, 100);
    }
  };

  CK.closePolicies = () => {
    const modal = document.getElementById('policiesModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
