/* assets/js/animations.js --------------------------------------------------
   Premium motion controller — scroll-progress bar + reveal observer for the
   data-anim / data-stagger system (independent of the legacy .reveal observer).
   --------------------------------------------------------------------------- */
(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Scroll progress bar ── */
  function mountProgressBar() {
    if (document.getElementById('scroll-progress')) return;
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const height = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = Math.min(100, (scrolled / height) * 100) + '%';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ── Reveal observer (data-anim / data-stagger) ── */
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  function scan(root) {
    root = root || document;
    const els = root.querySelectorAll('[data-anim], [data-stagger]');
    els.forEach(el => {
      if (!io || reduce) { el.classList.add('in-view'); return; }
      io.observe(el);
    });
  }

  /* ── Hero title: wrap each letter so they bounce in like chess pieces ── */
  function animateHeroLetters() {
    if (reduce) return;
    const title = document.querySelector('.hero-title');
    if (!title || title.dataset.lettered) return;
    title.dataset.lettered = '1';
    let i = 0;
    const wrapText = (node) => {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        if (ch === ' ' || ch === '\n') { frag.appendChild(document.createTextNode(ch === '\n' ? '' : ' ')); continue; }
        const span = document.createElement('span');
        span.className = 'hero-char';
        span.style.setProperty('--i', i++);
        span.textContent = ch;
        frag.appendChild(span);
      }
      node.replaceWith(frag);
    };
    const walk = (el) => {
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === 3) wrapText(node);            // text node → per-letter spans
        else if (node.nodeName === 'BR') { /* keep line breaks */ }
        else if (node.nodeType === 1) walk(node);           // <em> etc → recurse (keeps the element)
      });
    };
    walk(title);
  }

  /* ── SPA page-transition wrapper ──
     Smoothly fades the current page out, then fades the next one in via the
     .ck-fade-out / .ck-fade-in classes (defined in animations.css).
     Wraps CK.showPage so EVERY page change (landing -> portal, portal -> arena,
     login -> dashboard, etc.) gets the same polished transition. */
  function installPageTransitions() {
    if (!window.CK || typeof window.CK.showPage !== 'function' || window.CK.__pageTransitionsInstalled) return;
    if (reduce) { window.CK.__pageTransitionsInstalled = true; return; } // honor reduced motion
    const _origShowPage = window.CK.showPage;
    window.CK.showPage = function (id) {
      const current = document.querySelector('.page.active');
      const target = document.getElementById(id);
      if (!current || !target || current === target) return _origShowPage(id);
      current.classList.add('ck-fade-out');
      setTimeout(() => {
        current.classList.remove('ck-fade-out');
        _origShowPage(id);
        target.classList.add('ck-fade-in');
        setTimeout(() => target.classList.remove('ck-fade-in'), 450);
      }, 200);
    };
    window.CK.__pageTransitionsInstalled = true;
  }

  function init() {
    if (!reduce) mountProgressBar();
    scan(document);
    // Hero headline animation is owned by gsap-effects.js (pieces slide → words
    // fly in from alternating sides). Only fall back to the CSS letter-bounce if
    // GSAP isn't available.
    setTimeout(() => { if (!window.gsap) animateHeroLetters(); }, 600);
    // Install SPA fade transitions once CK.showPage exists (main.js loads later)
    let tries = 0;
    const installTimer = setInterval(() => {
      installPageTransitions();
      if (window.CK && window.CK.__pageTransitionsInstalled) clearInterval(installTimer);
      if (++tries > 40) clearInterval(installTimer);            // give up after 4s
    }, 100);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  // Expose so dynamically-rendered sections can re-trigger reveals.
  window.CK = window.CK || {};
  window.CK.scanAnimations = scan;
})();
