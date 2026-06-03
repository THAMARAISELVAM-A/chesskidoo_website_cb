/* assets/js/gsap-effects.js -------------------------------------------------
   Premium GSAP-powered motion layer (loaded after gsap + ScrollTrigger).
   - Hero floating-piece parallax (mouse) + smooth sine float
   - 3D tilt on the hero board panel
   - Magnetic CTA buttons + soft pulse glow
   - ScrollTrigger staggered section/card reveals
   Degrades gracefully if GSAP failed to load, and respects reduced-motion.
   --------------------------------------------------------------------------- */
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    if (reduce || typeof window.gsap === 'undefined') return;
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    /* ── 1. Hero floating pieces: gentle randomized float + mouse parallax ── */
    const pieces = gsap.utils.toArray('.hero-floating-piece');
    pieces.forEach((el, i) => {
      gsap.to(el, {
        y: `+=${20 + i * 6}`,
        x: `+=${(i % 2 ? 1 : -1) * (10 + i * 3)}`,
        rotation: (i % 2 ? 1 : -1) * 6,
        duration: 3.5 + i * 0.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    });
    const hero = document.querySelector('.hero');
    if (hero && pieces.length) {
      hero.addEventListener('mousemove', (e) => {
        const cx = (e.clientX / window.innerWidth - 0.5);
        const cy = (e.clientY / window.innerHeight - 0.5);
        pieces.forEach((el, i) => {
          const depth = (i + 1) * 14;
          gsap.to(el, { x: cx * depth, y: cy * depth, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
        });
      });
    }

    /* ── 2. 3D tilt on the hero board panel ── */
    const board = document.querySelector('.hero-board-frame') || document.querySelector('.hero-visual');
    if (board) {
      const wrap = board.closest('.hero-visual') || board;
      gsap.set(board, { transformPerspective: 900, transformOrigin: 'center' });
      wrap.addEventListener('mousemove', (e) => {
        const r = wrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(board, { rotationY: px * 12, rotationX: -py * 12, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
      });
      wrap.addEventListener('mouseleave', () => {
        gsap.to(board, { rotationY: 0, rotationX: 0, duration: 0.9, ease: 'elastic.out(1,0.5)' });
      });
    }

    /* ── 3. Magnetic CTA buttons ── */
    document.querySelectorAll('.hero-btn-demo, .btn-primary, .hero-cta').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        gsap.to(btn, { x: mx * 0.3, y: my * 0.4, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
      });
    });

    /* ── 4. CTA soft pulse-glow (continuous) on the primary hero button ── */
    const cta = document.querySelector('.hero-btn-demo');
    if (cta) {
      gsap.to(cta, {
        boxShadow: '0 8px 30px rgba(217,119,6,0.55), 0 0 0 6px rgba(217,119,6,0.08)',
        duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    }

    /* NOTE: scroll-reveal of grids/sections is intentionally left to the existing
       CSS (.reveal / [data-stagger]) system to avoid double-animation. GSAP here
       owns only the premium INTERACTION effects (parallax, 3D tilt, magnetic). */
  }

  // gsap/ScrollTrigger load with defer — wait for window load to be safe.
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
