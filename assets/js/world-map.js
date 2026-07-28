/* assets/js/world-map.js -----------------------------------------------------
   "The World of ChessKidoo" — an animated reach map with two views:

     • Global Reach  — dot-grid world map, with arcs flying out from the Erode
                       head office to every country we teach into.
     • Offline Centres — the same map zoomed all the way down to the Erode
                       district, showing the three in-person centres, the
                       distances between them, and 10/25 km range rings.

   Switching views tweens the projection (centre + scale), so the zoom from
   "whole planet" to "one district" is one continuous move rather than a cut.

   The dot grid is rasterised per-frame from the coastline rings in
   world-geo.js rather than baked at one resolution — that is what keeps the
   dots evenly spaced on screen at every zoom level.

   Layers, all sharing one projection:
     <canvas> dot grid + glow      (painted here)
     <svg>    arcs, rings, connectors
     <div>    pins — real <button>s, so they are hoverable and focusable

   Degrades to a static, fully-drawn map under prefers-reduced-motion.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  const root = document.getElementById('ck-world');
  if (!root || !window.CK_WORLD_GEO) return;

  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Data ───────────────────────────────────────────────────────────── */

  // Erode head office — origin for every arc.
  const HOME = { lon: 77.7172, lat: 11.3410 };

  const COUNTRIES = [
    { id: 'in', name: 'India',          city: 'Erode · Tamil Nadu', lon: 77.72,  lat: 11.34,  home: true,
      note: 'Head office plus three offline centres — online classes nationwide.' },
    { id: 'us', name: 'United States',  city: 'New York',           lon: -74.00, lat: 40.71,
      note: 'Our furthest classroom — 13,500 km from Erode, on an early-morning IST slot.' },
    { id: 'ca', name: 'Canada',         city: 'Toronto',            lon: -79.38, lat: 43.65,
      note: 'Weekend batches timed for Ontario and British Columbia families.' },
    { id: 'sg', name: 'Singapore',      city: 'Singapore',          lon: 103.82, lat: 1.35,
      note: 'Evening SGT batches for students in the city-state.' },
    { id: 'my', name: 'Malaysia',       city: 'Kuala Lumpur',       lon: 101.69, lat: 3.14,
      note: 'Shared timetable with our Singapore batches.' },
    { id: 'au', name: 'Australia',      city: 'Sydney',             lon: 151.21, lat: -33.87,
      note: 'Early-morning AEST classes before the school run.' },
  ];

  const CENTRES = [
    { id: 'bhavani',    name: 'Bhavani',       tag: 'Head Office', lon: 77.6817, lat: 11.4453,
      addr: 'K K Nagar, Kalingarayanpalayam, Erode 638316',
      note: 'Head office — in-person coaching, admissions and academy operations.' },
    { id: 'erode',      name: 'Erode Central', tag: 'Centre',      lon: 77.7172, lat: 11.3410,
      addr: 'Erode, Tamil Nadu',
      note: 'In-person coaching and weekend batches.' },
    { id: 'perundurai', name: 'Perundurai',    tag: 'Centre',      lon: 77.5878, lat: 11.2758,
      addr: 'Perundurai, Tamil Nadu',
      note: 'In-person coaching and school programmes.' },
  ];

  // Drawn between centres in the zoomed view, labelled with real distances.
  const LINKS = [['bhavani', 'erode'], ['erode', 'perundurai'], ['bhavani', 'perundurai']];

  /* ── Geometry helpers ───────────────────────────────────────────────── */

  const GEO = window.CK_WORLD_GEO;

  // Precompute bounding boxes so the point-in-polygon test can bail early —
  // this is the difference between a ~5ms and a ~60ms rasterise.
  const prep = (rings) => rings.map((ring) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of ring) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { ring, x0, y0, x1, y1 };
  });
  const LAND = prep(GEO.land);
  const SEA = prep(GEO.sea);

  function inRing(ring, x, y) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function hit(list, lon, lat) {
    for (const p of list) {
      if (lon < p.x0 || lon > p.x1 || lat < p.y0 || lat > p.y1) continue;
      if (inRing(p.ring, lon, lat)) return true;
    }
    return false;
  }
  const isLand = (lon, lat) => hit(LAND, lon, lat) && !hit(SEA, lon, lat);

  // Great-circle distance, used for the centre-to-centre labels.
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* ── DOM ────────────────────────────────────────────────────────────── */

  const stage  = root.querySelector('.ckw-stage');
  const canvas = root.querySelector('.ckw-canvas');
  const svg    = root.querySelector('.ckw-arcs');
  const pinBox = root.querySelector('.ckw-pins');
  const panel  = root.querySelector('.ckw-panel');
  const badge  = root.querySelector('.ckw-badge');
  const tabs   = [...root.querySelectorAll('.ckw-tab')];
  const ctx    = canvas.getContext('2d');
  const SVGNS  = 'http://www.w3.org/2000/svg';

  let W = 0, H = 0;
  const state = {
    view: 'global',
    proj: null,        // { lon, lat, scale }  — scale is px per degree
    tween: null,       // { from, to, t0, dur }
    arcT: reduce ? 1 : 0,
    arcT0: 0,          // timestamp the arc flight started
    arcsRunning: false,
    active: null,
    pins: new Map(),
  };

  /* ── Projection (equirectangular, centre + scale) ───────────────────── */

  const GLOBAL_SPAN_LON = 350, GLOBAL_SPAN_LAT = 132;
  // A touch wider than the centres' actual 0.17° spread, so the three pins and
  // their range rings sit comfortably inside the frame rather than at its edge.
  const CENTRES_SPAN_LAT = 0.44;
  const ARC_DURATION = 1900;   // ms for every arc to finish flying

  function fitGlobal()  {
    // Fill the width rather than min()-fitting both axes: the stage is always
    // wider than it is tall, so a min() fit would letterbox the map into a
    // thin band with dead space above and below.
    return { lon: 8, lat: 12, scale: W / GLOBAL_SPAN_LON };
  }
  function fitCentres() {
    return { lon: 77.6623, lat: 11.3606, scale: H / CENTRES_SPAN_LAT };
  }
  const targetProj = () => (state.view === 'global' ? fitGlobal() : fitCentres());

  const px = (lon, p) => W / 2 + (lon - p.lon) * p.scale;
  const py = (lat, p) => H / 2 - (lat - p.lat) * p.scale;

  /* ── Canvas: dot grid + glow ────────────────────────────────────────── */

  function drawDots(coarse) {
    const p = state.proj;
    // Spacing is in screen space, so the grid stays even at every zoom level.
    // Tighten it on narrow stages or the continents lose their shape.
    const fine = Math.max(4.5, Math.min(7.5, W / 130));
    const step = coarse ? fine * 1.7 : fine;
    const r = Math.max(1.1, step * 0.21);
    ctx.clearRect(0, 0, W, H);

    // In the district view we are entirely inland, so the dot field would be a
    // flat wash — drop it back and let the rings and pins carry the picture.
    const zoomed = p.scale > 40;
    ctx.fillStyle = zoomed ? 'rgba(232,160,32,0.16)' : 'rgba(158,182,210,0.55)';

    ctx.beginPath();
    for (let y = step / 2; y < H; y += step) {
      const lat = p.lat + (H / 2 - y) / p.scale;
      if (lat > 89 || lat < -89) continue;
      for (let x = step / 2; x < W; x += step) {
        const lon = p.lon + (x - W / 2) / p.scale;
        if (lon < -180 || lon > 180) continue;
        if (!isLand(lon, lat)) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // Warm halo under each marker.
    const marks = state.view === 'global' ? COUNTRIES : CENTRES;
    for (const m of marks) {
      const x = px(m.lon, p), y = py(m.lat, p);
      if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
      // Scale the halo with the stage, or it swamps the map on small screens.
      const rad = Math.max(18, W * (m.home || m.tag === 'Head Office' ? 0.055 : 0.036));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(245,200,66,0.24)');
      g.addColorStop(1, 'rgba(245,200,66,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }

  /* ── SVG: arcs (global) / rings + connectors (centres) ──────────────── */

  function arcPath(a, b, p) {
    const x1 = px(a.lon, p), y1 = py(a.lat, p);
    const x2 = px(b.lon, p), y2 = py(b.lat, p);
    // Bow the curve perpendicular to the chord, always lifting "upward".
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const lift = Math.min(len * 0.22, 120);
    return `M${x1},${y1} Q${mx - (dy / len) * lift},${my + (dx / len) * lift} ${x2},${y2}`;
  }

  function buildGlobalSVG() {
    svg.textContent = '';
    const p = state.proj;
    for (const c of COUNTRIES) {
      if (c.home) continue;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('class', 'ckw-arc');
      path.setAttribute('d', arcPath(HOME, c, p));
      path.dataset.id = c.id;
      svg.appendChild(path);

      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('class', 'ckw-spark');
      dot.setAttribute('r', '3');
      dot.dataset.id = c.id;
      svg.appendChild(dot);
    }
  }

  function buildCentresSVG() {
    svg.textContent = '';
    const p = state.proj;
    const hq = CENTRES[0];
    const cx = px(hq.lon, p), cy = py(hq.lat, p);

    // 10 km and 25 km range rings around the head office.
    for (const d of [10, 25]) {
      const rp = (d / 111.32) * p.scale;      // deg per km at this latitude ≈ 1/111.32
      const ring = document.createElementNS(SVGNS, 'circle');
      ring.setAttribute('class', 'ckw-ring');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
      ring.setAttribute('r', rp);
      svg.appendChild(ring);

      const lbl = document.createElementNS(SVGNS, 'text');
      lbl.setAttribute('class', 'ckw-ring-label');
      lbl.setAttribute('x', cx); lbl.setAttribute('y', cy - rp - 6);
      lbl.textContent = d + ' km';
      svg.appendChild(lbl);
    }

    const by = (id) => CENTRES.find((c) => c.id === id);
    for (const [a, b] of LINKS) {
      const A = by(a), B = by(b);
      const x1 = px(A.lon, p), y1 = py(A.lat, p);
      const x2 = px(B.lon, p), y2 = py(B.lat, p);
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('class', 'ckw-link');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      svg.appendChild(line);

      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('class', 'ckw-link-label');
      t.setAttribute('x', (x1 + x2) / 2); t.setAttribute('y', (y1 + y2) / 2 - 5);
      t.textContent = km(A, B).toFixed(1) + ' km';
      svg.appendChild(t);
    }
  }

  function updateArcProgress() {
    const arcs = svg.querySelectorAll('.ckw-arc');
    const n = arcs.length || 1;
    arcs.forEach((path, i) => {
      const L = path.getTotalLength();
      // Stagger: each arc occupies a window of the overall 0..1 progress.
      const startAt = (i / n) * 0.55;
      const t = Math.max(0, Math.min(1, (state.arcT - startAt) / 0.45));
      path.style.strokeDasharray = L;
      path.style.strokeDashoffset = L * (1 - t);

      const spark = svg.querySelector(`.ckw-spark[data-id="${path.dataset.id}"]`);
      if (spark) {
        if (t <= 0 || t >= 1) { spark.style.opacity = 0; }
        else {
          const pt = path.getPointAtLength(L * t);
          spark.setAttribute('cx', pt.x); spark.setAttribute('cy', pt.y);
          spark.style.opacity = 1;
        }
      }
    });
  }

  /* ── Pins ───────────────────────────────────────────────────────────── */

  function buildPins() {
    pinBox.textContent = '';
    state.pins.clear();
    const list = state.view === 'global' ? COUNTRIES : CENTRES;
    for (const m of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ckw-pin' + ((m.home || m.tag === 'Head Office') ? ' is-home' : '');
      b.innerHTML =
        '<span class="ckw-pin-dot" aria-hidden="true"></span>' +
        '<span class="ckw-pin-label">' + (m.flag ? m.flag + ' ' : '') + m.name + '</span>';
      b.setAttribute('aria-label', m.name + ' — ' + (m.city || m.addr || ''));
      const show = () => setActive(m.id);
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('click', show);
      pinBox.appendChild(b);
      state.pins.set(m.id, b);
    }
    placePins();
  }

  function placePins() {
    const p = state.proj;
    const list = state.view === 'global' ? COUNTRIES : CENTRES;
    for (const m of list) {
      const el = state.pins.get(m.id);
      if (!el) continue;
      const x = px(m.lon, p), y = py(m.lat, p);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.visibility = (x < -60 || x > W + 60 || y < -40 || y > H + 40) ? 'hidden' : 'visible';
    }
  }

  /* ── Detail panel ───────────────────────────────────────────────────── */

  function setActive(id) {
    state.active = id;
    for (const [key, el] of state.pins) el.classList.toggle('is-active', key === id);
    const list = state.view === 'global' ? COUNTRIES : CENTRES;
    const m = list.find((x) => x.id === id);
    if (m) renderPanel(m);
  }

  function renderPanel(m) {
    const isCentre = !!m.addr;
    panel.innerHTML =
      '<div class="ckw-panel-eyebrow">' +
        (isCentre ? (m.tag === 'Head Office' ? '★ Head Office' : '🏫 Offline Centre')
                  : (m.home ? '★ Home Base' : '🌐 Live Online Classes')) +
      '</div>' +
      '<h3 class="ckw-panel-title">' + (m.flag ? m.flag + ' ' : '') + m.name + '</h3>' +
      '<div class="ckw-panel-meta">' + (m.addr || m.city) + '</div>' +
      '<p class="ckw-panel-note">' + m.note + '</p>' +
      // India and the head office are the origin, so a distance chip there
      // would just read "0 km from Erode".
      (m.home
        ? '<div class="ckw-panel-dist">Head office &middot; 3 offline centres</div>'
        : isCentre
          ? '<div class="ckw-panel-dist">' +
              (m.tag === 'Head Office'
                ? 'Head office &middot; Erode district'
                : km(m, CENTRES[0]).toFixed(1) + ' km from the head office') +
            '</div>'
          : '<div class="ckw-panel-dist">' +
              Math.round(km(m, HOME)).toLocaleString('en-IN') + ' km from Erode</div>') +
      '<button class="ckw-panel-cta" onclick="CK.openDemoModal()">Book a Free Demo</button>';
  }

  function defaultPanel() {
    setActive(state.view === 'global' ? 'in' : 'bhavani');
  }

  /* ── View switching + render loop ───────────────────────────────────── */

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function setView(view) {
    if (view === state.view) return;
    state.view = view;
    tabs.forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    root.classList.toggle('is-centres', view === 'centres');
    badge.textContent = view === 'global'
      ? '6 countries · live online classes'
      : 'Erode District · Tamil Nadu';

    defaultPanel();       // update the copy immediately, don't wait for the zoom

    const to = targetProj();
    if (reduce) { state.proj = to; rebuild(); return; }
    state.tween = { from: { ...state.proj }, to, t0: performance.now(), dur: 1150 };
    // Arcs only belong to the global view; restart them when we come back.
    if (view === 'global') { state.arcT = 0; state.arcT0 = 0; state.arcsRunning = true; }
    schedule();
  }

  function rebuild() {
    if (state.view === 'global') buildGlobalSVG(); else buildCentresSVG();
    buildPins();
    drawDots(false);
    if (state.view === 'global') updateArcProgress();
    defaultPanel();
  }

  let rafId = 0;
  // Single entry point, so the arc animation and a view tween starting at the
  // same moment share one rAF chain instead of racing two.
  function schedule() { if (!rafId) rafId = requestAnimationFrame(tick); }

  function tick(now) {
    rafId = 0;
    let more = false;

    if (state.tween) {
      const { from, to, t0, dur } = state.tween;
      const raw = Math.min(1, (now - t0) / dur);
      const t = easeInOut(raw);
      state.proj = {
        lon: from.lon + (to.lon - from.lon) * t,
        lat: from.lat + (to.lat - from.lat) * t,
        // Interpolate zoom logarithmically — a linear lerp across a ~400x
        // range spends almost the whole tween at the wide end.
        scale: Math.exp(Math.log(from.scale) + (Math.log(to.scale) - Math.log(from.scale)) * t),
      };
      drawDots(true);
      placePins();
      if (raw >= 1) {
        state.tween = null;
        rebuild();          // also re-seeds the panel for the new view
      } else {
        svg.style.opacity = 0;                 // arcs/rings are stale mid-zoom
        more = true;
      }
      if (!state.tween) svg.style.opacity = '';
    }

    if (state.arcsRunning && !state.tween && state.view === 'global') {
      // Time-based, not per-frame: a fixed increment would make the flight
      // take twice as long on a 30fps device as on a 60fps one.
      if (!state.arcT0) state.arcT0 = now;
      state.arcT = Math.min(1, (now - state.arcT0) / ARC_DURATION);
      updateArcProgress();
      if (state.arcT >= 1) state.arcsRunning = false; else more = true;
    }

    if (more) schedule();
  }

  /* ── Sizing ─────────────────────────────────────────────────────────── */

  function resize() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(220, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    state.proj = targetProj();
    rebuild();
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */

  tabs.forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

  resize();
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  }, { passive: true });

  // Hold the arc animation until the section is actually on screen.
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        state.arcT0 = 0;
        state.arcsRunning = true;
        schedule();
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    io.observe(root);
  } else {
    state.arcT = 1;
    updateArcProgress();
  }
})();
