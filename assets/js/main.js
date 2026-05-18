/* assets/js/main.js -------------------------------------------------------
   Core UI, Router, Modals, Toast, Bot, Chessboard — ChessKidoo
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  /* ─── SPA Router ─── */
  CK.showPage = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    navLinks.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeNav();
      });
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeNav();
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

  // Alias navigate to handle both section scrolling (landing) and page routing
  CK.navigate = (section) => {
    // Route to arena page first (before landing section check)
    if (section === 'arena') {
      console.log('Main: Navigating to arena page');
      CK.showPage('arena-page');
      console.log('Main: Arena page shown, initializing...');
      setTimeout(() => {
        console.log('Main: Checking if CK.arena exists:', !!CK.arena);
        if (CK.arena) {
          console.log('Main: Calling arena.init()');
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
        // populate per-card best scores
        const gameMap = { puzzle: 'puzzle', gm: 'gm', memory: 'memory', timing: 'timing', opening: 'opening', queenquest: 'queenquest', quiz: 'quiz' };
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
  CK.openModal = (id) => {
    const m = document.getElementById(id);
    if (m) {
      m.classList.add('active');
      m.classList.add('open'); // For new portals
      m.style.display = 'flex';
      if (m.classList.contains('p-modal-overlay')) m.style.display = 'grid';
    }
  };

  CK.closeModal = (id) => {
    if (id) {
      const m = document.getElementById(id);
      if (m) {
        m.classList.remove('active');
        m.classList.remove('open');
        m.style.display = 'none';
      }
    } else {
      document.querySelectorAll('.modal-overlay, .p-modal-overlay').forEach(m => {
        m.classList.remove('active');
        m.classList.remove('open');
        m.style.display = 'none';
      });
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

    const replies = {
      fee: "Our fees range from ₹800 to ₹5,200/month depending on the session type. Group sessions start at ₹800! 💰",
      schedule: "We offer WEEKDAY (17:00) and WEEKEND sessions. Group and 1-on-1 options available! 📅",
      coach: "We have 8 FIDE-certified coaches: Ranjith, Vishnu, Rohith Selvaraj, Gyansurya, Saran, Yogesh, Haris, and Arivuselvam! ♞",
      beginner: "Beginners start with piece movements, basic tactics, and fun puzzles. Your child will love it! 🎯",
      demo: "Click 'Book Free Demo' in the menu to schedule a free trial class with one of our expert coaches! 🎉",
      default: "Great question! Our FIDE-certified coaches are here to guide you. Want to book a free demo class? 🏆"
    };

    const key = Object.keys(replies).find(k => msg.toLowerCase().includes(k)) || 'default';
    setTimeout(() => {
      msgs.innerHTML += `<div class="bot-msg bot-msg--bot">${replies[key]}</div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }, 800);
  };

  CK.handleDemoSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const name = form.fullName.value;
    const phone = form.phone.value;
    const age = form.age.value;
    const city = form.city.value || 'Not specified';

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

  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    const progress = document.getElementById('scrollProgress');
    if (progress) {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      progress.style.width = pct + '%';
    }
    updateActiveNav();
  });

  // Run once on load
  window.addEventListener('load', updateActiveNav);

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


    // Restore session — re-validate via Supabase, fall back to cached profile if offline
    (async () => {
      if (window.supabaseClient) {
        try {
          const { data: { session } } = await window.supabaseClient.auth.getSession();
          if (session?.user) {
            const cached = localStorage.getItem('ck_user');
            if (cached) {
              try { CK.currentUser = JSON.parse(cached); } catch(e) { localStorage.removeItem('ck_user'); }
            }
          } else {
            localStorage.removeItem('ck_user');
            CK.currentUser = null;
          }
        } catch(e) {
          const cached = localStorage.getItem('ck_user');
          if (cached) {
            try { CK.currentUser = JSON.parse(cached); } catch(e2) { localStorage.removeItem('ck_user'); }
          }
        }
      } else {
        const cached = localStorage.getItem('ck_user');
        if (cached) {
          try { CK.currentUser = JSON.parse(cached); } catch(e) { localStorage.removeItem('ck_user'); }
        }
      }
    })();
    
    // ALWAYS start on landing page as requested by user
    CK.showPage('landing-page');

    // Counter animations (supports both integers and float decimals)
    document.querySelectorAll('.hero-stat-num').forEach(el => {
      const text = el.textContent;
      const hasDecimal = text.includes('.');
      
      if (hasDecimal) {
        const numPart = parseFloat(text.replace(/[^\d.]/g, ''));
        if (isNaN(numPart)) return;
        let count = 0.0;
        const suffix = text.replace(/[\d.]/g, '');
        const step = numPart / 12;
        const timer = setInterval(() => {
          count = Math.min(count + step, numPart);
          el.textContent = count.toFixed(1) + suffix;
          if (count >= numPart) {
            el.textContent = numPart.toFixed(1) + suffix;
            clearInterval(timer);
          }
        }, 25);
      } else {
        const target = parseInt(text.replace(/\D/g,''), 10);
        if (isNaN(target)) return;
        let count = 0;
        const suffix = text.replace(/[0-9]/g,'');
        const step = Math.ceil(target / 12);
        const timer = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = count + suffix;
          if (count >= target) {
            el.textContent = target + suffix;
            clearInterval(timer);
          }
        }, 25);
      }
    });
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

  // Vault Board — renders a simple chess board in the coach session triple-pane
  CK.renderVaultBoard = () => {
    const container = document.getElementById('coachVaultBoard');
    if (!container) return;
    if (container.dataset.init) return;
    container.dataset.init = '1';

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
        const bg = light ? '#ffffff' : '#4a7c40';
        html += `<div style="width:44px;height:44px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;user-select:none;" title="${String.fromCharCode(97+c)}${8-r}">${piece}</div>`;
      });
    });
    html += '</div>';
    container.innerHTML = html;
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

    initBoard(containerId) {
      this._activeBoardId = containerId;
      this._mode = 'analysis';
      this._guessFrom = null;
      this._sparGame = null;
      if (this.board) { this.board.destroy(); this.board = null; }
      this.game = new Chess();
      this.board = Chessboard(containerId, {
        pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
        position: 'start',
        orientation: this.orientation
      });
      this.history = [];
      this.currentMove = 0;
      this.annotations = {};
      this._resetModeBtns();
      this.renderMoveList();
      this.updateAnalysis(this.game.fen(), null);
      setTimeout(() => { if (this.board) this.board.resize(); }, 80);
    },

    loadPreset(pgnText, boardId) {
      const isCoach = (boardId || this._activeBoardId || '').startsWith('coach');
      const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
      const targetBoard = boardId || (isCoach ? 'coachLabBoard' : 'studentLabBoard');
      const pgnInput = document.getElementById(inputId);
      if (pgnInput) pgnInput.value = pgnText.trim();
      this.analyzePgn(pgnText.trim(), targetBoard);
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

      if (!this.game) this.game = new Chess();
      const success = this.game.load_pgn(pgnText);
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
      this.board = Chessboard(boardId, {
        pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
        position: this.game.fen(),
        orientation: this.orientation
      });
      this.renderMoveList();
      this.updateAnalysis(this.game.fen(), this.history[this.history.length - 1] || null);
      setTimeout(() => { if (this.board) this.board.resize(); }, 80);
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

      const activeEl = container.querySelector('.lab-move-san.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this._updateMoveCounter();
    },

    _updateMoveCounter() {
      document.querySelectorAll('.labMoveCounter').forEach(el => {
        el.textContent = this.history.length
          ? `Move ${this.currentMove} / ${this.history.length}`
          : 'No game loaded';
      });
    },

    goToMove(idx) {
      this.currentMove = Math.max(0, Math.min(idx, this.history.length));
      this._applyAndRefresh();
    },

    flip() {
      this.orientation = this.orientation === 'white' ? 'black' : 'white';
      if (this.board) this.board.orientation(this.orientation);
    },

    first() { this.currentMove = 0; this._applyAndRefresh(); },
    prev()  { if (this.currentMove > 0) { this.currentMove--; this._applyAndRefresh(); } },
    next()  { if (this.currentMove < this.history.length) { this.currentMove++; this._applyAndRefresh(); } },
    last()  { this.currentMove = this.history.length; this._applyAndRefresh(); },

    _applyAndRefresh() {
      if (this._mode !== 'analysis') {
        this._mode = 'analysis';
        this._resetModeBtns();
        const ba = document.getElementById('labModeAnalysis');
        if (ba) ba.classList.add('active');
        this._setBanner(null, '');
        if (this.board) { this.board.destroy(); this.board = null; }
        this.board = Chessboard(this._activeBoardId, {
          pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
          position: 'start',
          orientation: this.orientation
        });
      }
      const g = new Chess();
      for (let i = 0; i < this.currentMove; i++) g.move(this.history[i]);
      if (this.board) this.board.position(g.fen(), false);
      this.renderMoveList();
      this.updateAnalysis(g.fen(), this.history[this.currentMove - 1] || null);
    },

    updateAnalysis(fen, lastMoveObj) {
      let score, barPct, explanation;

      if (!this.history.length || this.currentMove === 0) {
        score = '+0.3'; barPct = 53;
        explanation = 'Starting position. White holds the slight first-move initiative. Classical options: <b>1. e4</b> (Open Game), <b>1. d4</b> (Queen\'s Pawn), <b>1. Nf3</b> (Réti), <b>1. c4</b> (English). Fight for the center from move one.';
      } else if (lastMoveObj) {
        const san = lastMoveObj.san;
        const isW = lastMoveObj.color === 'w';
        const side = isW ? 'White' : 'Black';

        if (san.includes('#')) {
          score = isW ? 'M0' : '-M0'; barPct = isW ? 100 : 0;
          explanation = `<b>Checkmate!</b> ${side} delivers the final decisive blow with <b>${san}</b>. The king has no legal escape — a perfect tactical finish. Game over.`;
        } else if (san.startsWith('O-O-O')) {
          score = isW ? '+0.5' : '-0.5'; barPct = isW ? 55 : 45;
          explanation = `<b>Queenside castling!</b> ${side} connects the rooks and shelters the king behind the queenside pawns. Prepares a central or kingside pawn storm while activating the a-file rook.`;
        } else if (san.startsWith('O-O')) {
          score = isW ? '+0.4' : '-0.4'; barPct = isW ? 54 : 46;
          explanation = `<b>Kingside castling!</b> ${side} tucks the king to safety and activates the h-file rook. A critical milestone — now focus on piece coordination and opening the center.`;
        } else if (san.includes('x') && san.includes('+')) {
          score = isW ? '+3.2' : '-3.2'; barPct = isW ? 78 : 22;
          explanation = `<b>Capture with check: ${san}!</b> ${side} wins material AND forces the king to react — a devastating combination of tempo and material gain. The opponent's position crumbles under dual pressure.`;
        } else if (san.includes('+')) {
          score = isW ? '+1.8' : '-1.8'; barPct = isW ? 66 : 34;
          explanation = `<b>Check: ${san}.</b> The king is forced to respond, burning a critical tempo. ${side} maintains the initiative and keeps the pressure on. Watch for follow-up forcing sequences.`;
        } else if (san.includes('=')) {
          score = isW ? '+2.5' : '-2.5'; barPct = isW ? 72 : 28;
          const promoteTo = san.slice(-1);
          const pieceNames = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
          explanation = `<b>Pawn promotion!</b> ${side} promotes to a <b>${pieceNames[promoteTo] || promoteTo}</b> — a monumental game-changing moment. The passed pawn finally reaches its destination and transforms into a powerful piece.`;
        } else if (san.startsWith('R') && san.includes('x')) {
          score = isW ? '+1.4' : '-1.4'; barPct = isW ? 63 : 37;
          explanation = `<b>Rook captures: ${san}.</b> ${side} eliminates a key defender or winning material with the rook. Rooks thrive on open files and the 7th rank — this exchange may open critical lines for future pressure.`;
        } else if (san.startsWith('Q') && san.includes('x')) {
          score = isW ? '+2.0' : '-2.0'; barPct = isW ? 68 : 32;
          explanation = `<b>Queen captures: ${san}.</b> ${side} snaps off material with the queen. A powerful forcing move — but be mindful of exposing the queen to counterattack after the exchange.`;
        } else if (san.includes('x')) {
          const p = san[0];
          const names = { N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King' };
          const pname = names[p] || 'Pawn';
          score = isW ? '+1.2' : '-1.2'; barPct = isW ? 62 : 38;
          explanation = `<b>${pname} captures: ${san}.</b> ${side} wins material or opens attacking lines. Evaluate the resulting pawn structure — captures often define the strategic landscape for the next 10-15 moves.`;
        } else if (san.startsWith('N')) {
          score = isW ? '+0.6' : '-0.5'; barPct = isW ? 56 : 46;
          explanation = `<b>Knight maneuver: ${san}.</b> Knights shine in closed positions and on strong outpost squares. ${side} improves piece activity, potentially eyeing a fork or central outpost. Remember: knights need at least 2 moves to switch flanks.`;
        } else if (san.startsWith('B')) {
          score = isW ? '+0.5' : '-0.4'; barPct = isW ? 55 : 47;
          explanation = `<b>Bishop development: ${san}.</b> The bishop opens a powerful diagonal for long-range pressure. ${side} eyes pawn weaknesses and king safety. Bishops reach their full potential in open positions with clear diagonals.`;
        } else if (san.startsWith('Q')) {
          score = isW ? '+0.7' : '-0.6'; barPct = isW ? 57 : 45;
          explanation = `<b>Queen move: ${san}.</b> The queen centralizes or creates threats. Beware — early queen development can invite tempo-gaining attacks. ${side} must ensure the queen has a safe retreat square after this move.`;
        } else if (san.startsWith('R')) {
          score = isW ? '+0.8' : '-0.7'; barPct = isW ? 58 : 44;
          explanation = `<b>Rook activation: ${san}.</b> ${side} improves the rook's placement. Rooks belong on open files and the 7th rank — they need open lines to unleash their full power in the middlegame and endgame.`;
        } else if (san.startsWith('K')) {
          score = isW ? '+0.2' : '-0.2'; barPct = isW ? 52 : 48;
          explanation = `<b>King move: ${san}.</b> In the endgame, the king becomes a powerful attacking piece. ${side} activates the king to support pawn promotion or control key squares. King activity is often the deciding factor in technical endgames.`;
        } else if (['e4','e5','d4','d5','c4','c5','f4','f5'].includes(san)) {
          score = isW ? '+0.3' : '-0.2'; barPct = isW ? 53 : 49;
          explanation = `<b>Central pawn: ${san}.</b> Fighting for the critical central squares (e4, e5, d4, d5) is a fundamental chess principle. This move opens diagonals for the bishops and claims territory in the heart of the board. A strong foundation for piece development.`;
        } else {
          score = isW ? '+0.4' : '-0.3'; barPct = isW ? 54 : 48;
          explanation = `<b>Positional move: ${san}.</b> ${side} improves piece harmony, prepares the next strategic plan, and maintains solid pawn structure. Good chess is often about these subtle improvements that accumulate over many moves.`;
        }
      } else {
        score = '+0.2'; barPct = 52;
        explanation = 'Equal position. Both sides have symmetrical development and pawn structure. The key battlegrounds are center control and king safety — subtle improvements will decide this game.';
      }

      const isNeg = score.startsWith('-');
      const barColor = score.startsWith('+') && parseFloat(score) > 0.5
        ? 'var(--p-teal)' : isNeg ? '#ef4444' : 'var(--p-blue)';

      document.querySelectorAll('.labEvalText').forEach(el => el.textContent = score);
      document.querySelectorAll('.labEvalBarFill').forEach(el => {
        el.style.width = barPct + '%';
        el.style.backgroundColor = barColor;
        el.style.transition = 'width 0.45s cubic-bezier(.4,0,.2,1), background-color 0.3s';
      });
      document.querySelectorAll('.labVBarFill').forEach(el => {
        el.style.height = barPct + '%';
        el.style.transition = 'height 0.5s cubic-bezier(.4,0,.2,1)';
      });
      document.querySelectorAll('.labCoachExplanation').forEach(el => {
        el.innerHTML = `💡 <strong>Analysis:</strong> ${explanation}`;
      });
      this._updateMoveCounter();

      // Real engine evaluation — async overlay from Lichess Cloud Analysis
      if (fen && window.CK && CK.engine) {
        document.querySelectorAll('.labEvalText').forEach(el => el.style.opacity = '0.5');
        CK.engine.evaluate(fen).then(result => {
          if (result) CK.engine.applyToUI(result);
          else document.querySelectorAll('.labEvalText').forEach(el => el.style.opacity = '1');
        });
      }
    },

    _resetModeBtns() {
      ['labModeAnalysis','labModeGuess','labModeSpar','labModePlay'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.classList.remove('active','active-guess','active-spar'); }
      });
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
      this.board = Chessboard(this._activeBoardId, {
        pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
        position: g.fen(),
        orientation: this.orientation
      });
      this.renderMoveList();
      this.updateAnalysis(g.fen(), this.history[this.currentMove - 1] || null);
    },

    _initGuessMode() {
      const g = new Chess();
      if (this.board) { this.board.destroy(); this.board = null; }
      this.board = Chessboard(this._activeBoardId, {
        pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
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
          this._setBanner(`✓ <strong>${expected.san}</strong> — now guess ${next.color === 'w' ? 'White' : 'Black'}\'s next move!`, 'guess');
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
        pieceTheme: 'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
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
        CK.engine.evaluate(fen).then(result => {
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
          const moves = this._sparGame.moves({ verbose: true });
          if (moves.length) {
            const m = moves[Math.floor(Math.random() * moves.length)];
            const move = this._sparGame.move(m);
            if (move && this.board) this.board.position(this._sparGame.fen(), true);
            if (!_checkGameOver()) this._setBanner(`🤖 <strong>Bot played:</strong> ${move ? move.san : '?'}. Your turn!`, 'spar');
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

    broadcastCoach() {
      const fen = this._sparGame?.fen() || this.game?.fen() || 'start';
      const pgn = this.game ? this.game.pgn() : '';
      const broadcast = { fen, pgn, coach: CK.currentUser?.full_name || 'Coach', ts: Date.now() };
      localStorage.setItem('ck_coach_broadcast', JSON.stringify(broadcast));
      if (window.supabaseClient) {
        try { window.supabaseClient.from('broadcasts').upsert({ id: 'coach_board', ...broadcast }); } catch(e) {}
      }
      const active = Object.values(JSON.parse(localStorage.getItem('ck_live_presence') || '{}')).filter(u => u.role === 'student' && Date.now() - u.lastSeen < 300000).length;
      CK.showToast(`📢 Position broadcasted to ${active} active student${active !== 1 ? 's' : ''}!`, 'success');
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
        const isCoach = (boardId || '').startsWith('coach');
        const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
        const input = document.getElementById(inputId);
        if (input) input.value = pgnText.trim();
        this.analyzePgn(pgnText.trim(), boardId || 'studentLabBoard');
        CK.showToast(`📁 "${file.name}" loaded — ${pgnText.match(/\d+\./g)?.length || '?'} moves`, 'success');
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

  CK.openVaultSession = (title, coach) => {
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
    const modal = document.getElementById('vaultModal');
    if (modal) modal.style.display = 'none';
  };

})();