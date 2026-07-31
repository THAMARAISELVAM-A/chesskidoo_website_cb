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

  /* Remove old reveal markers so the legacy observers don't fight GSAP.
     Also strip data-aos: GSAP is taking over this element's reveal, so AOS
     must NOT also animate it (was double-animating → flicker/jank). */
  function claim(el) {
    if (!el) return;
    el.classList.remove('reveal');
    el.classList.add('visible');
    el.removeAttribute('data-stagger');
    el.removeAttribute('data-anim');
    if (el.hasAttribute('data-aos')) {
      el.removeAttribute('data-aos');
      el.classList.add('aos-animate');   // ensure it's visible if AOS already hid it
    }
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
    // Touch / hover handler — each word FLIES OUT and returns to its place.
    // Alternating direction per word, with a slight spin; uses an elastic return
    // so it lands with a satisfying spring. Re-armable: triggers again next time.
    // Stores the running bounce tween so we can pause it during the fly, then
    // restart it (a fresh yoyo from the rest position) when the word lands.
    words.forEach((el, i) => {
      const dir = i % 2 ? 1 : -1;
      let flying = false;
      const fly = () => {
        if (flying) return;
        flying = true;
        // Pause the idle bounce so it doesn't fight the fly tween.
        if (el._bounceTween) el._bounceTween.pause();
        const tl = gsap.timeline({ onComplete: () => {
          flying = false;
          // Re-arm the idle bounce from the rest position.
          if (el._bounceTween) { el._bounceTween.restart(true); }
        }});
        tl.to(el, {
          x: dir * 90, y: -54, rotation: dir * 18, scale: 1.18,
          duration: 0.38, ease: 'power2.out', overwrite: 'auto'
        }).to(el, {
          x: 0, y: 0, rotation: 0, scale: 1,
          duration: 0.85, ease: 'elastic.out(1, 0.45)'
        });
      };
      el.addEventListener('mouseenter', fly);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); fly(); }, { passive: false });
      el.addEventListener('click', fly);
    });

    // 3. After the entrance settles, start a CONTINUOUS bounce-back-and-forth on
    //    each title word + the gentle float on the pieces. Each word bobs on its
    //    own offset rhythm so the headline feels alive.
    gsap.delayedCall(2.0, () => {
      // Per-word vertical bounce (slight horizontal sway for personality).
      // Save the tween on the element so the click/hover fly handler can pause
      // it during the fly and restart it cleanly when the word lands.
      words.forEach((el, i) => {
        el._bounceTween = gsap.to(el, {
          y: -10,
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

    /* ─────────── ACHIEVEMENT NUMBERS — count up on reveal ───────────
       The achievement cards ("12+ Championships", "200+ Active Students",
       "4.9/5 Rating") had static numbers. Wrap the leading number token and
       count it up when the card enters the viewport — mirrors the hero-stats
       counter so the whole page shares one motion language.
       Uses IntersectionObserver (not ScrollTrigger) because this SPA scrolls an
       inner element, so window-based ScrollTrigger positions don't fire here —
       IO matches the existing, reliable hero-stats counter. init() already
       bailed on prefers-reduced-motion, so this only runs when motion is on. */
    (function achievementCounters() {
      const cards = gsap.utils.toArray('.achievement-card h3');
      if (!cards.length || !('IntersectionObserver' in window)) return;
      const wrap = (h3) => {
        if (h3.dataset.counted) return null;
        // Leading number (12, 200, 4.9) + its glued glyph (+, /5) + the rest.
        const m = h3.textContent.match(/^\s*(\d+(?:\.\d+)?)(\S*)([\s\S]*)$/);
        if (!m) return null;
        h3.dataset.counted = '1';
        const isDecimal = m[1].indexOf('.') !== -1;
        const span = document.createElement('span');
        span.textContent = isDecimal ? '0.0' : '0';
        h3.textContent = '';
        h3.appendChild(span);
        h3.appendChild(document.createTextNode((m[2] || '') + (m[3] || '')));
        return { span, target: parseFloat(m[1]), isDecimal };
      };
      const run = (c) => gsap.to({ v: 0 }, {
        v: c.target, duration: 1.6, ease: 'power2.out',
        onUpdate() { c.span.textContent = c.isDecimal ? this.targets()[0].v.toFixed(1) : Math.floor(this.targets()[0].v); },
        onComplete() { c.span.textContent = c.isDecimal ? c.target.toFixed(1) : c.target; }
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const c = e.target._ckCount;
          if (c) run(c);
          io.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      cards.forEach((h3) => { const c = wrap(h3); if (c) { h3._ckCount = c; io.observe(h3); } });
    })();

    /* ══════════════════════════════════════════════════════════════════════
       MODERN MOTION LAYER
       Scroll-linked, GPU-cheap effects layered on top of the reveals above.
       Every block is independently guarded so one missing element or plugin
       can never stop the rest of the page from animating.
       ══════════════════════════════════════════════════════════════════════ */
    const ST = window.ScrollTrigger;

    /* ─── 1. Section headings: word-by-word rise with a blur-in ───
       Replaces the flat fade on .section-head h2 with a staggered word
       cascade — the single biggest "modern site" tell, and it reads as
       intentional typography rather than a generic fade. */
    if (ST) {
      gsap.utils.toArray('.section-head h2, .section-head h3').forEach((heading) => {
        if (heading.dataset.ckWords) return;
        // Only split plain-text headings — bail on nested markup so we never
        // destroy links, <em>, or translation spans.
        if (heading.children.length || !heading.textContent.trim()) return;
        heading.dataset.ckWords = '1';
        const parts = heading.textContent.trim().split(/\s+/);
        heading.textContent = '';
        const spans = parts.map((word, i) => {
          const s = document.createElement('span');
          s.textContent = word;
          s.style.display = 'inline-block';
          s.style.willChange = 'transform, opacity, filter';
          heading.appendChild(s);
          if (i < parts.length - 1) heading.appendChild(document.createTextNode(' '));
          return s;
        });
        gsap.fromTo(spans,
          { opacity: 0, yPercent: 110, filter: 'blur(8px)' },
          { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.75, ease: 'power3.out', stagger: 0.05,
            scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
            onComplete() { spans.forEach((s) => { s.style.willChange = 'auto'; s.style.filter = ''; }); } });
      });
    }

    /* ─── 2. Cinematic mask wipe on section imagery ───
       Images uncover behind a clip-path instead of just fading, and drift
       slightly as they settle. Skips tiny/decorative images and logos. */
    if (ST) {
      gsap.utils.toArray('section img').forEach((img) => {
        const r = img.getBoundingClientRect();
        const w = r.width || img.width || 0;
        const h = r.height || img.height || 0;
        if (w < 150 || h < 110) return;                 // icons, flags, avatars
        if (/logo|icon|favicon/i.test(img.src || '')) return;
        if (img.closest('.hero')) return;               // hero has its own entrance
        claim(img);
        gsap.fromTo(img,
          { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.12 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.1, ease: 'power3.out',
            scrollTrigger: { trigger: img, start: 'top 88%', once: true } });
      });
    }

    /* ─── 3. Depth parallax (scrubbed) on section banners ───
       A slow counter-scroll on large banner art gives the page real depth.
       `scrub` ties it to scroll position, so it never animates on its own. */
    if (ST) {
      gsap.utils.toArray('.curr-banner img, .about-img img, .showcase-gallery-container img').forEach((img) => {
        gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none',
          scrollTrigger: { trigger: img.parentElement || img, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      });
    }

    /* ─── 4. Card spotlight + depth ───
       Desktop drives the highlight from the cursor. Touch devices have no
       cursor, so they previously got NONE of this — the page felt flat on a
       phone compared with a laptop. There, the same spotlight and a matching
       tilt are driven by the card's position in the viewport instead, so
       mobile gets equivalent richness from scrolling. */
    const CARD_SEL = '.feat-card, .review-card, .achievement-card, .level-card, .price-card, .coach-card-premium, .cert-card';
    const cards = document.querySelectorAll(CARD_SEL);
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (finePointer) {
      cards.forEach((card) => {
        card.classList.add('ck-spotlight');
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--ck-mx', ((e.clientX - r.left) / r.width * 100) + '%');
          card.style.setProperty('--ck-my', ((e.clientY - r.top) / r.height * 100) + '%');
          card.style.setProperty('--ck-spot', '1');
        });
        card.addEventListener('pointerleave', () => card.style.setProperty('--ck-spot', '0'));
      });
    } else if (ST) {
      // ── Touch parity ──
      // As a card travels through the viewport its highlight sweeps top→bottom
      // and it tilts a few degrees, mirroring the desktop hover feel.
      cards.forEach((card) => {
        card.classList.add('ck-spotlight');
        card.style.setProperty('--ck-mx', '50%');
        ST.create({
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const p = self.progress;                       // 0 → 1 across the viewport
            card.style.setProperty('--ck-my', (100 - p * 100).toFixed(1) + '%');
            // Strongest while the card is centred, fading at both edges.
            card.style.setProperty('--ck-spot', (1 - Math.abs(p - 0.5) * 2).toFixed(2));
          },
        });
        gsap.fromTo(card,
          { rotateX: 6, y: 18 },
          { rotateX: 0, y: 0, ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'center 62%', scrub: 0.6 } });
      });
      // Tap feedback so touching a card feels as responsive as hovering one.
      cards.forEach((card) => {
        card.addEventListener('touchstart', () => gsap.to(card, { scale: 0.985, duration: 0.16, ease: 'power2.out' }), { passive: true });
        const release = () => gsap.to(card, { scale: 1, duration: 0.34, ease: 'back.out(2)' });
        card.addEventListener('touchend', release, { passive: true });
        card.addEventListener('touchcancel', release, { passive: true });
      });
    }

    /* ─── 5. Scroll-velocity skew ───
       The page's card grids lean very slightly into fast scrolling and settle
       when it stops. Clamped hard (±5deg) so it reads as momentum, not glitch. */
    if (ST) {
      const skewTargets = gsap.utils.toArray('.feat-grid, .reviews-grid, .achievements-grid, .levels-grid');
      if (skewTargets.length) {
        const clamp = gsap.utils.clamp(-5, 5);
        let proxy = { skew: 0 };
        ST.create({
          onUpdate: (self) => {
            const v = clamp(self.getVelocity() / -260);
            if (Math.abs(v) > Math.abs(proxy.skew)) {
              proxy.skew = v;
              gsap.to(proxy, { skew: 0, duration: 0.85, ease: 'power3.out', overwrite: true,
                onUpdate: () => gsap.set(skewTargets, { skewY: proxy.skew, transformOrigin: 'center center' }) });
            }
          },
        });
      }
    }

    /* ─── 6. Footer centre/country chips cascade ───
       The new "Our Centres & Global Reach" band gets the same motion language
       as the rest of the page instead of appearing all at once. */
    if (ST) {
      const chips = gsap.utils.toArray('.footer-country-chip');
      if (chips.length) {
        gsap.fromTo(chips, { opacity: 0, scale: 0.8, y: 12 },
          { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2)', stagger: 0.04,
            scrollTrigger: { trigger: chips[0].parentElement, start: 'top 92%', once: true } });
      }
      gsap.utils.toArray('.footer-centres-list > div').forEach((row, i) => {
        gsap.fromTo(row, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', delay: i * 0.08,
          scrollTrigger: { trigger: row, start: 'top 94%', once: true } });
      });
    }

    /* Positions shift once every effect above has mounted. */
    if (ST) ST.refresh();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
