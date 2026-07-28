/* assets/js/landing-fx.js ---------------------------------------------------
   ChessKidoo — tasteful landing-page polish that layers ON TOP of the existing
   GSAP/AOS motion without fighting it:
     • slim scroll-progress bar
     • count-up animation for the hero stat numbers
     • soft cursor "spotlight" glow in the hero (desktop only)
     • subtle 3D tilt + shine on the landing cards (desktop only)
   All effects respect prefers-reduced-motion and only attach on the public
   landing page. Pure additive — self-injects its CSS, no markup changes needed.
   --------------------------------------------------------------- */
(function () {
  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const canHover = mq('(hover: hover) and (pointer: fine)');

  function injectCSS() {
    if (document.getElementById('ck-landingfx-css')) return;
    const css = `
      .ck-scroll-progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:99999;
        background:linear-gradient(90deg,#f59e0b,#fbbf24,#14b8a6);
        box-shadow:0 0 10px rgba(245,158,11,.6);transition:width .08s linear;pointer-events:none;}
      .hero{position:relative;}
      .ck-hero-glow{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0;
        transition:opacity .45s ease;
        background:radial-gradient(300px circle at var(--x,50%) var(--y,50%),
          rgba(245,158,11,.16), rgba(20,184,166,.06) 45%, transparent 70%);}
      /* no always-on transform transition → never fights GSAP's scroll reveal */
      .ck-tilt{will-change:transform;transform-style:preserve-3d;position:relative;}
      /* ── Mobile / touch ── */
      a,button,.feat-card,.level-card,.price-card,.coach-card-premium,.cj-explore-btn,.hero-btn-demo,.btn-primary{-webkit-tap-highlight-color:transparent;}
      .ck-ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.45);
        transform:scale(0);animation:ckRipple .6s ease-out forwards;pointer-events:none;z-index:6;}
      @keyframes ckRipple{to{transform:scale(2.3);opacity:0;}}
      /* gap-fill fade-up on scroll (only on elements not already animated) */
      .ck-reveal{opacity:0;transform:translateY(22px);
        transition:opacity .6s ease, transform .6s cubic-bezier(.2,.7,.3,1);}
      .ck-reveal.ck-revealed{opacity:1;transform:none;}
      .ck-tilt::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;
        transition:opacity .25s ease;
        background:radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,.18), transparent 60%);}
      .ck-tilt:hover::after{opacity:1;}
      @media (prefers-reduced-motion: no-preference){ html{scroll-behavior:smooth;} }
    `;
    const s = document.createElement('style');
    s.id = 'ck-landingfx-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── 1) Scroll progress bar ──
  function scrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'ck-scroll-progress';
    document.body.appendChild(bar);
    const update = () => {
      const d = document.documentElement;
      const max = d.scrollHeight - d.clientHeight;
      bar.style.width = (max > 0 ? Math.min(100, Math.max(0, (d.scrollTop / max) * 100)) : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ── 2) Count-up on the hero stat numbers (parses "200+", "4.9★", etc.) ──
  function countUp() {
    const els = Array.from(document.querySelectorAll('.hero-stat-num'));
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const m = (el.textContent || '').trim().match(/^([\d.,]+)(.*)$/);
        if (!m) return;
        const target = parseFloat(m[1].replace(/,/g, ''));
        const suffix = m[2] || '';
        if (isNaN(target)) return;
        const dec = m[1].indexOf('.') >= 0 ? 1 : 0;

        // Pin the box to the width of the FINAL value before counting starts.
        // The element still holds that value here, so this measurement is exact.
        // Without it, "8+" -> "12+" -> "200+" each reflow the flex row and the
        // whole stat strip visibly jitters sideways for the entire animation.
        const w = el.getBoundingClientRect().width;
        if (w) { el.style.minWidth = Math.ceil(w) + 'px'; el.style.display = 'inline-block'; }

        const dur = 1600, t0 = performance.now();
        const fmt = (n) => (dec ? n.toFixed(1) : Math.round(n).toLocaleString()) + suffix;
        const tick = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          const v = target * (1 - Math.pow(1 - t, 3)); // easeOutCubic
          el.textContent = fmt(v);
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = fmt(target);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  // ── 3) Soft spotlight in the hero ──
  //    Desktop: follows the cursor.
  //    Touch: no cursor exists, so the glow drifts on its own instead of being
  //    absent entirely — phones were missing this ambience completely.
  function heroSpotlight() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const glow = document.createElement('div');
    glow.className = 'ck-hero-glow';
    hero.insertBefore(glow, hero.firstChild);

    if (canHover) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        glow.style.setProperty('--x', (e.clientX - r.left) + 'px');
        glow.style.setProperty('--y', (e.clientY - r.top) + 'px');
        glow.style.opacity = '1';
      });
      hero.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
      return;
    }

    if (reduce) return;
    // Slow lissajous drift — ambient, never distracting, and it parks itself
    // when the hero scrolls out of view so it costs nothing off-screen.
    glow.style.opacity = '0.85';
    let raf = 0;
    let running = true;
    const t0 = performance.now();
    const tick = (now) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      const r = hero.getBoundingClientRect();
      glow.style.setProperty('--x', (50 + Math.sin(t * 0.34) * 26) + '%');
      glow.style.setProperty('--y', (50 + Math.cos(t * 0.23) * 22) + '%');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          running = e.isIntersecting;
          if (running) raf = requestAnimationFrame(tick);
          else cancelAnimationFrame(raf);
        });
      }, { threshold: 0.01 }).observe(hero);
    }
  }

  // ── 4) 3D tilt + shine on landing cards ──
  function cardTilt() {
    if (!canHover) return;
    const sel = '.feat-card, .level-card, .coach-card-premium, .price-card, .review-card, .achievement-card, .cert-card';
    document.querySelectorAll(sel).forEach((card) => {
      card.classList.add('ck-tilt');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = 'transform 0s';                 // follow the cursor instantly
        card.style.transform = `perspective(820px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('pointerleave', () => {
        card.style.transition = 'transform .35s cubic-bezier(.2,.7,.3,1)'; // smooth settle back
        card.style.transform = '';
      });
    });
  }

  // ── 5) Gap-fill fade-up on scroll for content AOS/GSAP don't already animate.
  //    Runs AFTER GSAP has claimed its elements (they get .visible), and only
  //    hides BELOW-the-fold elements → no flash on what's already on screen.
  function autoReveal() {
    if (!('IntersectionObserver' in window)) return;
    const root = document.getElementById('landing-page') || document.querySelector('.hero')?.closest('section')?.parentElement || document.body;
    const cand = (root || document).querySelectorAll(
      '.hero img, .hero-stats, .cj-step, .feat-card, .level-card, .price-card, ' +
      '.coach-card-premium, .review-card, .cert-card, .achievement-card, ' +
      'section img, blockquote, .lead, .eyebrow'
    );
    const targets = [];
    const vh = window.innerHeight || document.documentElement.clientHeight;
    cand.forEach((el) => {
      // Skip anything already handled by AOS or GSAP (or already processed).
      if (el.hasAttribute('data-aos') || el.dataset.ckReveal) return;
      if (el.classList.contains('visible') || el.classList.contains('aos-animate')) return;
      if (el.closest('[data-aos]') || el.closest('.visible')) return;  // inside an AOS/GSAP block
      // Only hide what's below the fold, so on-screen content never flashes.
      if (el.getBoundingClientRect().top <= vh * 0.92) return;
      el.dataset.ckReveal = '1';
      el.classList.add('ck-reveal');
      targets.push(el);
    });
    if (!targets.length) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('ck-revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
    // Fail-safe: never leave anything hidden.
    setTimeout(() => targets.forEach((el) => el.classList.add('ck-revealed')), 6000);
  }

  const isTouch = () => mq('(pointer: coarse)') || ('ontouchstart' in window);

  // ── 5) Touch-native richness: tap ripple on buttons + press-scale on cards ──
  function mobileFX() {
    // Material-style ripple on the main tappable buttons.
    const rippleSel = '.hero-btn-demo, .btn-primary, .cj-explore-btn, .nav-cta, .hero-cta, .p-btn';
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;                 // touch/pen only
      const el = e.target.closest && e.target.closest(rippleSel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';
      const size = Math.max(r.width, r.height);
      const sp = document.createElement('span');
      sp.className = 'ck-ripple';
      sp.style.width = sp.style.height = size + 'px';
      sp.style.left = (e.clientX - r.left - size / 2) + 'px';
      sp.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(sp);
      setTimeout(() => sp.remove(), 620);
    }, { passive: true });

    // Tactile press-scale on cards (released on lift, scroll, or cancel).
    const pressSel = '.feat-card, .level-card, .price-card, .coach-card-premium, .review-card, .cert-card';
    let pressed = null;
    document.addEventListener('touchstart', (e) => {
      const el = e.target.closest && e.target.closest(pressSel);
      if (!el) return;
      pressed = el;
      el.style.transition = 'transform .12s ease';
      el.style.transform = 'scale(.97)';
    }, { passive: true });
    const release = () => { if (pressed) { pressed.style.transform = ''; pressed = null; } };
    ['touchend', 'touchcancel', 'touchmove'].forEach((ev) =>
      document.addEventListener(ev, release, { passive: true }));
  }

  // ── Student Journey: draw the gold rail once the path scrolls into view ──
  // Adds .cj-inview, which is what starts the cjRailDraw keyframes in style.css.
  // Safe to run under reduced motion: the CSS there shows the rail already full.
  function journeyRail() {
    const wrap = document.querySelector('.chess-journey-wrap');
    if (!wrap) return;
    if (!('IntersectionObserver' in window)) { wrap.classList.add('cj-inview'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('cj-inview');
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    io.observe(wrap);
  }

  function init() {
    // Only on the public landing page.
    if (!document.querySelector('.hero') && !document.getElementById('landing-page')) return;
    injectCSS();
    scrollProgress();        // useful regardless of motion preference
    journeyRail();           // ditto — CSS handles the reduced-motion case
    if (reduce) return;      // skip the motion-heavy extras for reduced-motion users
    countUp();
    if (isTouch()) {
      mobileFX();            // touch-native richness (ripple + press)
    } else {
      heroSpotlight();
      setTimeout(cardTilt, 1200);  // delay so GSAP claims the cards first
    }
    // Fade-up-on-scroll gap-filler (mobile + desktop). MUST run after GSAP
    // (which inits on `load` and marks its elements .visible) so we never
    // double-animate the same element.
    const runReveal = () => setTimeout(autoReveal, 600);
    if (document.readyState === 'complete') runReveal();
    else window.addEventListener('load', runReveal);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
