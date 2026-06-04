/* assets/js/gsap-effects.js -------------------------------------------------
   Premium GSAP motion layer (loaded after gsap + ScrollTrigger).
   - Hero entrance: chess pieces slide in from the left, then the headline words
     fly in from alternating sides and settle with a bounce.
   - Hero floating-piece parallax + gentle float (after the entrance).
   - 3D tilt on the hero board panel; magnetic CTAs; CTA pulse-glow.
   - ScrollTrigger reveals on EVERY landing section (heads + card grids + faq).
   Degrades gracefully if GSAP failed; respects prefers-reduced-motion.
   --------------------------------------------------------------------------- */
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Remove old reveal markers so the legacy observers don't fight GSAP. */
  function claim(el) {
    if (!el) return;
    el.classList.remove('reveal');
    el.classList.add('visible');
    el.removeAttribute('data-stagger');
    el.removeAttribute('data-anim');
  }

  /* Wrap the hero headline into per-word spans (keeps <br> and <em>). */
  function wrapWords(title) {
    if (!title || title.dataset.worded) return [];
    title.dataset.worded = '1';
    const words = [];
    const wrapText = (node, isEm) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (part === '' || /^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const span = document.createElement('span');
        span.className = 'hero-word' + (isEm ? ' hero-word-em' : '');
        span.textContent = part;
        words.push(span);
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    };
    const walk = (el, isEm) => {
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === 3) wrapText(node, isEm);
        else if (node.nodeName === 'BR') { /* keep line breaks */ }
        else if (node.nodeType === 1) walk(node, isEm || node.nodeName === 'EM');
      });
    };
    walk(title, false);
    return words;
  }

  function init() {
    if (reduce || typeof window.gsap === 'undefined') return;
    if (window.__ckGsapInit) return;             // never run twice
    window.__ckGsapInit = true;
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    /* ─────────── HERO ENTRANCE ─────────── */
    const pieces = gsap.utils.toArray('.hero-floating-piece');
    const title = document.querySelector('.hero-title');
    if (title) title.style.animation = 'none';      // kill the CSS block entrance
    const words = wrapWords(title);

    // 1. Chess pieces slide in from the left FIRST.
    if (pieces.length) {
      gsap.fromTo(pieces,
        { x: -260, opacity: 0, rotation: -12 },
        { x: 0, opacity: 0.9, rotation: 0, duration: 0.9, ease: 'power3.out', stagger: 0.13 });
    }
    // 2. THEN the words fly in from alternating sides and fall into place.
    if (words.length) {
      gsap.fromTo(words,
        { opacity: 0, y: -60, x: (i) => (i % 2 ? 130 : -130), rotation: (i) => (i % 2 ? 9 : -9) },
        { opacity: 1, y: 0, x: 0, rotation: 0, duration: 0.75, ease: 'back.out(1.7)', stagger: 0.12, delay: 0.65 });
    }
    // 3. After the entrance settles, start a CONTINUOUS bounce-back-and-forth on
    //    each title word + the gentle float on the pieces. Each word bobs on its
    //    own offset rhythm so the headline feels alive.
    gsap.delayedCall(2.0, () => {
      // Per-word vertical bounce (slight horizontal sway for personality)
      words.forEach((el, i) => {
        gsap.to(el, {
          y: '-=10',
          x: (i % 2 ? 4 : -4),
          rotation: (i % 2 ? 1.5 : -1.5),
          duration: 1.6 + (i % 3) * 0.25,         // varied tempo per word
          delay: i * 0.08,                         // staggered start
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        });
      });
      // Pieces float
      pieces.forEach((el, i) => {
        gsap.to(el, {
          y: `+=${18 + i * 6}`, x: `+=${(i % 2 ? 1 : -1) * (10 + i * 3)}`,
          rotation: (i % 2 ? 1 : -1) * 6, duration: 3.4 + i * 0.6,
          ease: 'sine.inOut', yoyo: true, repeat: -1
        });
      });
    });

    /* Mouse parallax on the floating pieces */
    const hero = document.querySelector('.hero');
    if (hero && pieces.length) {
      hero.addEventListener('mousemove', (e) => {
        const cx = (e.clientX / window.innerWidth - 0.5);
        const cy = (e.clientY / window.innerHeight - 0.5);
        pieces.forEach((el, i) => {
          gsap.to(el, { x: cx * (i + 1) * 14, y: cy * (i + 1) * 10, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
        });
      });
    }

    /* 3D board tilt removed — the hero board panel contains interactive controls
       ("Check Ur Level", move nav), and tilting it on mousemove shifted the
       buttons under the cursor, making them hard to click. */

    /* ─────────── Magnetic CTAs + pulse ─────────── */
    document.querySelectorAll('.hero-btn-demo, .btn-primary, .hero-cta').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' }));
    });
    const cta = document.querySelector('.hero-btn-demo');
    if (cta) gsap.to(cta, { boxShadow: '0 8px 30px rgba(217,119,6,0.55), 0 0 0 6px rgba(217,119,6,0.08)', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* ─────────── SCROLL REVEALS on every section ─────────── */
    const claimed = [];
    if (window.ScrollTrigger) {
      const ST = window.ScrollTrigger;
      // Section headers rise + fade
      gsap.utils.toArray('.section-head').forEach((head) => {
        claim(head); claimed.push(head);
        gsap.fromTo(head, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: head, start: 'top 88%', once: true } });
      });
      // Card grids — staggered pop-in with a soft overshoot
      const gridSelectors = ['.feat-grid', '.coach-grid', '.achievements-grid', '.pricing-grid',
        '.reviews-grid', '.skills-grid', '.why-grid', '.levels-grid', '.level-cards',
        '.curriculum-grid', '.showcase-gallery-container', '.cert-grid', '.about-cert-grid'];
      gridSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((grid) => {
          claim(grid);
          const kids = Array.from(grid.children);
          kids.forEach((k) => { claim(k); claimed.push(k); });
          gsap.fromTo(kids, { opacity: 0, y: 56, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.3)', stagger: 0.08,
              scrollTrigger: { trigger: grid, start: 'top 88%', once: true } });
        });
      });
      // FAQ items slide in from the left
      gsap.utils.toArray('.faq-item').forEach((item) => {
        claim(item); claimed.push(item);
        gsap.fromTo(item, { opacity: 0, x: -34 }, { opacity: 1, x: 0, duration: 0.55, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 92%', once: true } });
      });
      // Final CTA band — zoom in
      document.querySelectorAll('.final-cta, .cta-band, #cta').forEach((band) => {
        claimed.push(band);
        gsap.fromTo(band, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)',
          scrollTrigger: { trigger: band, start: 'top 90%', once: true } });
      });
      // Recalculate trigger positions once fonts/images settle.
      setTimeout(() => ST.refresh(), 400);
      window.addEventListener('load', () => ST.refresh());
      // FAIL-SAFE: nothing should ever stay invisible. If a claimed element is
      // still hidden after 5s (trigger never fired), force it visible.
      setTimeout(() => {
        claimed.forEach((el) => {
          if (el && parseFloat(getComputedStyle(el).opacity) < 0.1) {
            gsap.to(el, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.4, overwrite: true });
          }
        });
      }, 5000);
    }
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
