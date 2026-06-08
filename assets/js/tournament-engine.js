(function () {
  'use strict';

  // CSS Injection for Premium Visuals
  const css = `
    .tf-radar-container {
      position: relative;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(218, 163, 62, 0.05) 0%, rgba(218, 163, 62, 0.15) 70%, rgba(0,0,0,0.4) 100%);
      border: 1px dashed rgba(218, 163, 62, 0.3);
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 15px auto;
      overflow: hidden;
    }
    .tf-radar-sweep {
      position: absolute;
      width: 100%;
      height: 100%;
      background: conic-gradient(from 0deg, rgba(218, 163, 62, 0.3) 0deg, rgba(218, 163, 62, 0) 120deg);
      border-radius: 50%;
      animation: tf-sweep 3s linear infinite;
      transform-origin: center;
    }
    .tf-radar-pulse {
      position: absolute;
      width: 12px;
      height: 12px;
      background: var(--gold);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--gold);
      animation: tf-pulse 1.5s ease-out infinite;
    }
    @keyframes tf-sweep {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes tf-pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .tf-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .tf-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 4px; height: 100%;
      background: var(--card-stripe-color, var(--gold));
      opacity: 0.8;
    }
    .tf-card:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(218, 163, 62, 0.4);
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .tf-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
  `;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Reference Coordinates for major Chess Hub cities
  const CITIES_COORDS = {
    'chennai': { name: 'Chennai, TN', lat: 13.0827, lon: 80.2707 },
    'bangalore': { name: 'Bangalore, KA', lat: 12.9716, lon: 77.5946 },
    'coimbatore': { name: 'Coimbatore, TN', lat: 11.0168, lon: 76.9558 },
    'mumbai': { name: 'Mumbai, MH', lat: 19.0760, lon: 72.8777 },
    'delhi': { name: 'New Delhi, DL', lat: 28.6139, lon: 77.2090 },
    'new delhi': { name: 'New Delhi, DL', lat: 28.6139, lon: 77.2090 }
  };

  // Mock Aggregated Chess Tournaments Fallback Database
  const LOCAL_TOURNAMENTS_FALLBACK = [
    {
      id: 'ext_tour_1',
      title: 'Chennai Open FIDE Rated Grandmaster Tournament',
      federation: 'FIDE',
      date: '2026-06-15',
      time: '09:00',
      location: 'Chennai (Jawaharlal Nehru Stadium)',
      coords: { lat: 13.0835, lon: 80.2740 },
      fee: 1500,
      category: 'Open FIDE Rated',
      eloLimit: 9999, // Open
      regLink: 'https://aicf.in/tournament/chennai-open-2026'
    },
    {
      id: 'ext_tour_2',
      title: 'Tamil Nadu State Under-16 Championship',
      federation: 'AICF',
      date: '2026-06-22',
      time: '10:00',
      location: 'Coimbatore (PSG College of Technology)',
      coords: { lat: 11.0244, lon: 77.0025 },
      fee: 500,
      category: 'Under 1600 ELO Only',
      eloLimit: 1600,
      regLink: 'https://tamilnaduchess.com/u16-state-2026'
    },
    {
      id: 'ext_tour_3',
      title: 'Karnataka FIDE Rated Under-12 Talent Search',
      federation: 'AICF',
      date: '2026-06-28',
      time: '09:30',
      location: 'Bangalore (Kanteerava Indoor Stadium)',
      coords: { lat: 12.9698, lon: 77.5920 },
      fee: 1200,
      category: 'Under 1200 ELO Only',
      eloLimit: 1200,
      regLink: 'https://karnatakachess.org/u12-fide-2026'
    },
    {
      id: 'ext_tour_4',
      title: 'Delhi Chess League Challenger Swiss',
      federation: 'AICF',
      date: '2026-07-05',
      time: '10:00',
      location: 'New Delhi (Indira Gandhi Arena)',
      coords: { lat: 28.6292, lon: 77.2514 },
      fee: 800,
      category: 'Under 1400 ELO Only',
      eloLimit: 1400,
      regLink: 'https://delhichess.com/challengers-2026'
    },
    {
      id: 'ext_tour_5',
      title: 'Mumbai Blitz Arena Showdown',
      federation: 'Chess.com',
      date: '2026-07-12',
      time: '18:00',
      location: 'Online / Mumbai Chess Club Meetup',
      coords: { lat: 19.0760, lon: 72.8777 },
      fee: 0,
      category: 'Open Blitz',
      eloLimit: 9999,
      regLink: 'https://chess.com/play/tournament/mumbai-blitz-2026'
    },
    {
      id: 'ext_tour_6',
      title: 'Chesskidoo Junior Rapid Cup (Coimbatore Zonal)',
      federation: 'AICF',
      date: '2026-07-18',
      time: '09:00',
      location: 'Coimbatore (Chesskidoo Zonal Academy)',
      coords: { lat: 11.0168, lon: 76.9558 },
      fee: 400,
      category: 'Under 1200 ELO Only',
      eloLimit: 1200,
      regLink: 'https://chesskidoo.com/tournaments/junior-cup'
    },
    {
      id: 'ext_tour_7',
      title: 'FIDE World Amateur Championship (South Zone)',
      federation: 'FIDE',
      date: '2026-07-25',
      time: '09:00',
      location: 'Chennai (Taj Connemara)',
      coords: { lat: 13.0617, lon: 80.2588 },
      fee: 2500,
      category: 'Under 2000 FIDE',
      eloLimit: 2000,
      regLink: 'https://fide.com/calendar/amateur-south-2026'
    }
  ];

  let tournamentsData = [];
  let tournamentsLoaded = false;

  // Client position tracking (defaults to Chennai center)
  let userLat = 13.0827;
  let userLon = 80.2707;
  let activeFinderStudent = null; // Used in admin mode to test eligibility

  // Haversine formula to compute distance in KM between coordinates
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  // ─── Fetch Live Lichess Arenas ──────────────────────────────────
  async function fetchLichessArenas() {
    try {
      const resp = await fetch('https://lichess.org/api/tournament', {
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const arenas = [...(data.started || []), ...(data.created || []), ...(data.finished || []).slice(0, 3)];
      return arenas.map(a => ({
        id: 'lichess_' + a.id,
        title: a.fullName || a.name || 'Lichess Arena',
        federation: 'Lichess',
        date: new Date(a.startsAt || Date.now()).toISOString().split('T')[0],
        time: new Date(a.startsAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        location: 'Online (lichess.org)',
        coords: { lat: 13.0827, lon: 80.2707 },
        fee: 0,
        category: a.perf?.name || a.variant?.name || 'Open',
        eloLimit: 9999,
        regLink: 'https://lichess.org/tournament/' + a.id
      }));
    } catch (e) {
      console.warn('[Lichess API] Failed to fetch arenas:', e);
      return [];
    }
  }

  // ─── Fetch Tournaments from Supabase (with fallback) ─────────────
  async function loadTournaments() {
    if (tournamentsLoaded && tournamentsData.length > 0) return;
    if (window.supabaseClient && !(window.sbTableKnownMissing && window.sbTableKnownMissing('tournaments'))) {
      try {
        const { data, error } = await window.supabaseClient
          .from('tournaments')
          .select('*')
          .order('start_date', { ascending: true });

        if (error) {
          if (window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('tournaments');
          } else {
            console.warn('[Supabase] Tournaments unavailable, using local data.');
          }
          tournamentsData = LOCAL_TOURNAMENTS_FALLBACK;
          tournamentsLoaded = true;
        } else {
          // Map database structure to client structure
          tournamentsData = (data || []).map(t => {
            const cityKey = (t.city || 'chennai').toLowerCase().trim();
            const cityCoords = CITIES_COORDS[cityKey] || CITIES_COORDS['chennai'];
            return {
              id: t.id,
              title: t.title,
              federation: t.organizer || t.source || 'FIDE',
              date: t.start_date,
              time: '09:00', // Default fallback time
              location: t.location + (t.city ? `, ${t.city}` : ''),
              coords: { lat: cityCoords.lat, lon: cityCoords.lon },
              fee: parseFloat(t.entry_fee || 0),
              category: t.rating_required || 'Open',
              eloLimit: parseInt(t.elo_limit || 9999),
              regLink: t.registration_url || 'https://aicf.in'
            };
          });
          tournamentsLoaded = true;
        }
      } catch (e) {
        console.warn('[Supabase] Failed to fetch tournaments. Local fallback:', e);
        tournamentsData = LOCAL_TOURNAMENTS_FALLBACK;
        tournamentsLoaded = true;
      }
    } else {
      tournamentsData = LOCAL_TOURNAMENTS_FALLBACK;
      tournamentsLoaded = true;
    }
    // Merge live Lichess arenas
    try {
      const lichessArenas = await fetchLichessArenas();
      if (lichessArenas.length > 0) {
        tournamentsData = [...tournamentsData, ...lichessArenas];
      }
    } catch (e) { console.warn('[Lichess] Merge failed:', e); }
  }

  // ─── Sub-Tab Routing Logics ──────────────────────────────────────
  window.setEventsSubTab = async function (tab) {
    document.querySelectorAll('.events-sub-view').forEach(el => el.style.display = 'none');
    
    const btnAcademy = document.getElementById('btn-events-academy');
    const btnFinder = document.getElementById('btn-events-finder');
    const btnCreate = document.getElementById('btn-create-event-top');
    const gridView = document.getElementById('ev-list-view');
    const manageView = document.getElementById('ev-manage-view');

    if (btnAcademy) btnAcademy.classList.remove('active');
    if (btnFinder) btnFinder.classList.remove('active');

    if (tab === 'academy') {
      if (btnAcademy) btnAcademy.classList.add('active');
      if (btnCreate) btnCreate.style.display = 'block';
      
      // Go back to event grid view or stay on manage view
      if (manageView && manageView.style.display === 'block') {
        manageView.style.display = 'block';
      } else {
        if (gridView) gridView.style.display = 'block';
        const evGrid = document.getElementById('ev-grid');
        if (evGrid) evGrid.style.display = 'grid';
      }
    } else if (tab === 'finder') {
      if (btnFinder) btnFinder.classList.add('active');
      if (btnCreate) btnCreate.style.display = 'none';
      if (manageView) manageView.style.display = 'none';
      
      const finderDiv = document.getElementById('tf-list-view');
      if (finderDiv) {
        finderDiv.style.display = 'block';
        await loadTournaments();
        try { window.tournamentInterestsData = await CK.db.getTournamentInterests(); } catch(e) { window.tournamentInterestsData = []; }
        renderTournamentFinderUI(finderDiv, false);
      }
    }
  };

  window.setChildEventsSubTab = async function (tab) {
    document.querySelectorAll('.child-events-sub-view').forEach(el => el.style.display = 'none');
    
    const btnAcademy = document.getElementById('btn-child-events-academy');
    const btnFinder = document.getElementById('btn-child-events-finder');

    if (btnAcademy) btnAcademy.classList.remove('active');
    if (btnFinder) btnFinder.classList.remove('active');

    if (tab === 'academy') {
      if (btnAcademy) btnAcademy.classList.add('active');
      const acaGrid = document.getElementById('child-ev-list-view');
      if (acaGrid) acaGrid.style.display = 'block';
    } else if (tab === 'finder') {
      if (btnFinder) btnFinder.classList.add('active');
      const finderDiv = document.getElementById('child-tf-list-view');
      if (finderDiv) {
        finderDiv.style.display = 'block';
        await loadTournaments();
        try { window.tournamentInterestsData = await CK.db.getTournamentInterests(); } catch(e) { window.tournamentInterestsData = []; }
        renderTournamentFinderUI(finderDiv, true);
      }
    }
  };

  // ─── Rendering Tournament Finder Core UI ─────────────────────────
  function renderTournamentFinderUI(container, isChildView) {
    const currentStudentObj = isChildView ? window.currentStudent : activeFinderStudent;
    const currentStudentId = currentStudentObj ? currentStudentObj.id : '';

    let studentSelectHtml = '';
    if (!isChildView) {
      // Admin Student Selector to test eligibility
      const students = window.allStudents || [];
      const opts = students.map(s => 
        `<option value="${s.id}" ${String(s.id) === String(currentStudentId) ? 'selected' : ''}>${escapeHtml(s.name || s.full_name)} (${s.rating || 1000} ELO)</option>`
      ).join('');
      studentSelectHtml = `
        <div style="display:flex; flex-direction:column; gap:4px; min-width:180px;">
          <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Check Eligibility For:</label>
          <select id="tf-student-select" class="premium-select" onchange="window.selectFinderStudent(this.value)" style="padding:7px; font-size:12px;">
            <option value="">-- Choose Student --</option>
            ${opts}
          </select>
        </div>
      `;
    }

    // Coordinates auto-detection alert block
    const userCityName = getNearestCityName(userLat, userLon);

    container.innerHTML = `
      <!-- Toolbar Filter Bar -->
      <div class="filter-bar" style="background:var(--surface2); padding:16px; border-radius:12px; border:1px solid var(--border); display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:20px;">
        <div style="display:flex; flex-direction:column; gap:4px; min-width:140px;">
          <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Reference Location:</label>
          <div style="display:flex; gap:6px;">
            <select id="tf-city-select" class="premium-select" onchange="window.selectFinderCity(this.value)" style="padding:7px; font-size:12px; flex:1;">
              <option value="chennai" ${userCityName === 'chennai' ? 'selected' : ''}>Chennai, TN</option>
              <option value="bangalore" ${userCityName === 'bangalore' ? 'selected' : ''}>Bangalore, KA</option>
              <option value="coimbatore" ${userCityName === 'coimbatore' ? 'selected' : ''}>Coimbatore, TN</option>
              <option value="mumbai" ${userCityName === 'mumbai' ? 'selected' : ''}>Mumbai, MH</option>
              <option value="delhi" ${userCityName === 'delhi' ? 'selected' : ''}>New Delhi, DL</option>
            </select>
            <button class="btn btn-outline" onclick="window.detectFinderLocation(${isChildView})" style="padding:7px 10px; font-size:12px;" title="Auto-Detect Location">📍</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; min-width:140px;">
          <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Coverage Radius:</label>
          <select id="tf-radius-select" class="premium-select" onchange="window.filterTournaments(${isChildView})" style="padding:7px; font-size:12px;">
            <option value="50">📍 Local — within 50 km</option>
            <option value="100">📍 Nearby — within 100 km</option>
            <option value="200" selected>🚗 Regional — within 200 km</option>
            <option value="500">🛣️ State — within 500 km</option>
            <option value="all">🇮🇳 National — All India</option>
            <option value="world">🌍 Worldwide — All Events</option>
          </select>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; min-width:160px; flex:1;">
          <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Search Events:</label>
          <input type="text" id="tf-search" placeholder="Name, venue, city, category…" oninput="window.filterTournaments(${isChildView})" style="padding:7px 10px; font-size:12px; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); border-radius:6px;">
        </div>

        ${studentSelectHtml}

        <div style="flex:1; text-align:right; min-width:160px;">
          <span class="badge" style="background:rgba(218,163,62,0.1); color:var(--gold); border:1px solid rgba(218,163,62,0.2); font-size:11px; padding:6px 12px;">
            ● AI Sync: Auto-scraping active (6h interval)
          </span>
        </div>
      </div>

      <!-- Radar and Search Info Panel -->
      <div style="display:grid; grid-template-columns:1fr; gap:20px; background:rgba(0,0,0,0.15); border:1px solid var(--border); padding:20px; border-radius:12px; margin-bottom:20px;">
        <div style="text-align:center;">
          <div class="tf-radar-container">
            <div class="tf-radar-sweep"></div>
            <div class="tf-radar-pulse"></div>
            <span style="z-index:2; font-size:26px;">📡</span>
          </div>
          <h4 style="margin:5px 0 2px 0; color:var(--gold); font-family:var(--font-head);">Location Telemetry Active</h4>
          <p id="tf-location-summary" style="font-size:11px; color:var(--ivory-dim); margin:0;">
            Centered on: <strong>${escapeHtml(userCityName.toUpperCase())}</strong> coords (${userLat.toFixed(4)}, ${userLon.toFixed(4)})
          </p>
        </div>
      </div>

      <!-- Tournaments Grid -->
      <div class="tf-grid" id="tf-results-grid"></div>
    `;

    // Perform initial filtering
    window.filterTournaments(isChildView);
  }

  // Auto-detect Geolocation
  window.detectFinderLocation = function (isChildView) {
    const locSummary = document.getElementById('tf-location-summary');
    if (locSummary) {
      locSummary.innerHTML = '⏳ Querying GPS telemetry satellites...';
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLon = position.coords.longitude;
          if (window.toast) window.toast('Location coordinates locked successfully!', 'success');
          
          // Re-render layout to update nearest city & distance logs
          const containerId = isChildView ? 'child-tf-list-view' : 'tf-list-view';
          const container = document.getElementById(containerId);
          if (container) {
            renderTournamentFinderUI(container, isChildView);
          }
        },
        (error) => {
          console.warn('[Geolocation] Access denied / error code:', error.code);
          if (window.toast) window.toast('GPS blocked. Falling back to regional server coordinates.', 'warning');
          
          // Set to default (Chennai) if blocked
          userLat = 13.0827;
          userLon = 80.2707;
          const containerId = isChildView ? 'child-tf-list-view' : 'tf-list-view';
          const container = document.getElementById(containerId);
          if (container) {
            renderTournamentFinderUI(container, isChildView);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      if (window.toast) window.toast('Geolocation API not supported by browser.', 'error');
    }
  };

  // City selection updates center coords
  window.selectFinderCity = function (cityKey) {
    const coords = CITIES_COORDS[cityKey];
    if (coords) {
      userLat = coords.lat;
      userLon = coords.lon;
      
      const isChildView = !document.getElementById('tf-student-select');
      const containerId = isChildView ? 'child-tf-list-view' : 'tf-list-view';
      const container = document.getElementById(containerId);
      if (container) {
        renderTournamentFinderUI(container, isChildView);
      }
    }
  };

  // Admin student selection updates eligibility
  window.selectFinderStudent = function (studentId) {
    const student = (window.allStudents || []).find(s => String(s.id) === String(studentId));
    activeFinderStudent = student || null;
    window.filterTournaments(false);
  };

  // Filters tournament cards by distance radius
  window.filterTournaments = function (isChildView) {
    const gridEl = document.getElementById('tf-results-grid');
    const radiusVal = document.getElementById('tf-radius-select')?.value || '200';
    if (!gridEl) return;

    gridEl.innerHTML = '';
    const studentObj = isChildView ? window.currentStudent : activeFinderStudent;
    const studentRating = studentObj ? parseInt(studentObj.rating || 1000) : 1000;
    const studentLevel = studentObj ? (studentObj.level || studentObj.grade || 'Beginner') : 'Beginner';

    // Compute distance and map tournaments
    const listings = tournamentsData.map(t => {
      const dist = calculateDistance(userLat, userLon, t.coords.lat, t.coords.lon);
      return { ...t, distance: dist };
    });

    // Free-text search across the visible events
    const query = (document.getElementById('tf-search')?.value || '').toLowerCase().trim();

    // Apply radius + search filters. 'all' and 'world' show every event
    // (radius unbounded); 'world' is the global view.
    const filtered = listings.filter(t => {
      // A text search looks across ALL events (ignores the radius) so users can
      // find a named event anywhere; otherwise the radius applies.
      if (query) {
        const hay = `${t.title} ${t.location} ${t.category} ${t.federation}`.toLowerCase();
        return hay.includes(query);
      }
      return (radiusVal === 'all' || radiusVal === 'world') ? true : (t.distance <= parseInt(radiusVal));
    });

    if (filtered.length === 0) {
      const reason = query ? `matching "${escapeHtml(query)}"` : `within the selected ${radiusVal === 'world' ? 'worldwide' : radiusVal + ' km'} range`;
      gridEl.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <span class="empty-icon">🏆</span>
          <p>No chess tournaments found ${reason}.</p>
          <button class="btn btn-outline btn-sm" onclick="var r=document.getElementById('tf-radius-select'); if(r) r.value='world'; var sb=document.getElementById('tf-search'); if(sb) sb.value=''; window.filterTournaments(${isChildView});" style="margin-top:10px;">🌍 View All Worldwide Events</button>
        </div>
      `;
      return;
    }

    // Sort by distance (nearest first)
    filtered.sort((a, b) => a.distance - b.distance);

    const interests = window.tournamentInterestsData || [];
    gridEl.innerHTML = filtered.map(t => {
      // 1. Check Rating Eligibility
      const isEligible = studentRating <= t.eloLimit;
      const eloDiff = t.eloLimit - studentRating;
      
      let eligibilityBadge = '';
      let borderStripeColor = 'var(--gold)';

      if (t.eloLimit === 9999) {
        eligibilityBadge = `<span class="tf-badge" style="background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.25);">✓ Open Bracket</span>`;
        borderStripeColor = '#3b82f6';
      } else if (isEligible) {
        eligibilityBadge = `<span class="tf-badge" style="background:rgba(16,185,129,0.12); color:var(--emerald); border:1px solid rgba(16,185,129,0.25);">✓ Eligible (Under ${t.eloLimit})</span>`;
        borderStripeColor = 'var(--emerald)';
      } else {
        eligibilityBadge = `<span class="tf-badge" style="background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.25);">❌ Rating > ${t.eloLimit}</span>`;
        borderStripeColor = '#ef4444';
      }

      // 2. AI Smart Recommendation Scoring
      let score = 50;
      let recs = [];
      if (studentObj) {
        if (t.eloLimit !== 9999) {
          if (eloDiff > 0 && eloDiff <= 150) {
            score += 30;
            recs.push("Ideal rating gap to push boundary.");
          } else if (eloDiff > 150 && eloDiff <= 300) {
            score += 15;
            recs.push("Challenging tier; build resilience.");
          } else if (eloDiff < 0) {
            score -= 40;
            recs.push("Rating exceeds limit.");
          }
        } else {
          if (studentRating >= 1400) {
            score += 20;
            recs.push("Good for open bracket experience.");
          } else {
            score -= 10;
            recs.push("Open categories are highly competitive.");
          }
        }
        
        // Age matching check
        const cat = t.category.toLowerCase();
        const underMatch = cat.match(/under\s*(\d+)|u-(\d+)/);
        if (underMatch) {
          const limitAge = parseInt(underMatch[1] || underMatch[2]);
          const studentAge = parseInt(studentObj.age || 10);
          if (studentAge <= limitAge && studentAge >= limitAge - 2) {
            score += 25;
            recs.push(`Great age bracket fit (${t.category}).`);
          } else if (studentAge > limitAge) {
            score -= 50;
            recs.push("Exceeds age limits.");
          }
        }
      }

      let starRating = '⭐⭐⭐ Moderate Fit';
      if (score >= 85) starRating = '⭐⭐⭐⭐⭐ High Recommend';
      else if (score >= 65) starRating = '⭐⭐⭐⭐ Recommended';
      else if (score < 40) starRating = '⭐ Low Fit';

      const coachRecHtml = `
        <div style="background:rgba(218,163,62,0.04); border-radius:8px; padding:8px; font-size:10.5px; border:1px solid rgba(218,163,62,0.15); color:#e8b84b; margin-top:8px; line-height:1.45;">
          <div style="font-weight:700; display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>🤖 AI Smart Recommendation</span>
            <span style="font-weight:800;">${starRating}</span>
          </div>
          <div style="opacity:0.85;">
            ${recs.length > 0 ? recs.join(' · ') : 'Compatible with active academy benchmarks.'}
          </div>
        </div>
      `;

      // 3. Interest selection
      let interestSelectorHtml = '';
      if (CK.currentUser) {
        const isStudent = CK.currentUser.role === 'student';
        const activeId = studentObj?.id || CK.currentUser.id;
        const myInterest = interests.find(i => i.student_id === activeId && i.tournament_id === t.id);
        const currentStatus = myInterest ? myInterest.status : 'None';

        if (isStudent) {
          interestSelectorHtml = `
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:4px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
              <span style="font-size:10px; color:var(--p-text-muted); font-weight:700; text-transform:uppercase;">Interested in attending? Select status:</span>
              <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                ${['Interested', 'Registering', 'Registered', 'Played', 'Won Prize'].map(status => {
                  const isActive = currentStatus === status;
                  const activeStyle = isActive 
                    ? 'background:#e8b84b !important; color:#000 !important; font-weight:700; border-color:#e8b84b;' 
                    : 'background:rgba(255,255,255,0.03); color:var(--p-text-muted); border-color:rgba(255,255,255,0.08);';
                  return `<button class="p-btn p-btn-sm" style="padding:3px 6px; font-size:9.5px; border-radius:4px; border:1px solid; transition:all 0.1s; ${activeStyle}"
                    onclick="window.toggleTournamentInterest('${t.id}', '${t.title.replace(/'/g, "\\'")}', '${status}')">${status}</button>`;
                }).join('')}
              </div>
            </div>`;
        } else {
          // Admin/Coach summary
          const tInterests = interests.filter(i => i.tournament_id === t.id && i.status !== 'None');
          const intCount = tInterests.filter(i => i.status === 'Interested').length;
          const regCount = tInterests.filter(i => i.status === 'Registered').length;
          const wonCount = tInterests.filter(i => i.status === 'Won Prize').length;
          interestSelectorHtml = `
            <div style="margin-top:10px; background:rgba(0,0,0,0.15); padding:8px; border-radius:6px; font-size:10px; border:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-around; text-align:center;">
              <div>
                <div style="font-weight:800; color:var(--p-gold); font-size:12px;">${intCount}</div>
                <div style="font-size:8.5px; color:var(--p-text-muted);">Interested</div>
              </div>
              <div>
                <div style="font-weight:800; color:var(--p-teal); font-size:12px;">${regCount}</div>
                <div style="font-size:8.5px; color:var(--p-text-muted);">Registered</div>
              </div>
              <div>
                <div style="font-weight:800; color:var(--p-online); font-size:12px;">${wonCount}</div>
                <div style="font-size:8.5px; color:var(--p-text-muted);">Won Prize</div>
              </div>
            </div>`;
        }
      }

      const entryFeeText = t.fee > 0 ? `₹${t.fee}` : 'Free Entry';
      const eventDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      return `
        <div class="tf-card" style="--card-stripe-color: ${borderStripeColor};">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <span class="tf-badge" style="background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--ivory);">${t.federation} Event</span>
              <span style="font-size:11px; font-weight:700; color:var(--gold);">${entryFeeText}</span>
            </div>
            <h3 style="font-size:13.5px; font-weight:700; color:var(--ivory); margin:0 0 6px 0; font-family:var(--font-head); line-height:1.35;">
              ${escapeHtml(t.title)}
            </h3>
            <div style="font-size:11px; color:var(--ivory-dim); display:flex; flex-direction:column; gap:4.5px; margin-bottom:8px;">
              <span>📅 Date: <strong>${eventDate} @ ${t.time}</strong></span>
              <span>📍 Venue: <strong>${escapeHtml(t.location)}</strong></span>
              <span style="color:var(--gold);">🚗 Distance: <strong>${t.distance} km away</strong></span>
            </div>
            <div style="margin-bottom:8px;">
              ${eligibilityBadge}
            </div>
          </div>
          ${coachRecHtml}
          ${interestSelectorHtml}
          <div style="display:flex; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:8px;">
            <a href="${t.regLink}" target="_blank" class="btn btn-gold btn-sm" style="flex:1.5; text-align:center; padding:6px; font-size:11px; border-radius:6px; display:inline-block; text-decoration:none; color:#000;">Register</a>
            <button class="btn btn-outline btn-sm" onclick="window.syncTournamentCalendar('${t.id}')" style="padding:6px; font-size:11px; flex:1;" title="Sync to Calendar">📅</button>
            <button class="btn btn-outline btn-sm" onclick="window.sendTournamentWhatsAppReminder('${t.id}')" style="padding:6px; font-size:11px; flex:1;" title="WhatsApp Reminder">💬</button>
            <button class="btn btn-outline btn-sm" onclick="window.downloadTournamentPoster('${t.id}')" style="padding:6px; font-size:11px; flex:1;" title="Download Poster">🖼️</button>
          </div>
        </div>
      `;
    }).join('');
  };

  // Calendar Sync (Downloads .ics file)
  // Generate & download a shareable event poster (uses html2canvas, already loaded).
  window.downloadTournamentPoster = function (tournamentId) {
    const t = tournamentsData.find(x => String(x.id) === String(tournamentId));
    if (!t) return;
    if (typeof html2canvas === 'undefined') {
      if (window.toast) window.toast('Poster engine not loaded yet, please retry.', 'error');
      return;
    }
    const eventDate = new Date(t.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
    const feeText = t.fee > 0 ? `Entry Fee: ₹${t.fee}` : 'FREE ENTRY';

    const poster = document.createElement('div');
    poster.style.cssText = 'position:fixed; left:-9999px; top:0; width:600px; height:800px; box-sizing:border-box;';
    poster.innerHTML = `
      <div style="width:600px; height:800px; background:linear-gradient(160deg,#0f1117 0%,#1a1d29 55%,#0b0d13 100%); color:#fff; font-family:Arial,sans-serif; padding:48px 44px; box-sizing:border-box; position:relative; overflow:hidden;">
        <div style="position:absolute; top:-40px; right:-30px; font-size:260px; opacity:0.05;">♟️</div>
        <div style="text-align:center; border-bottom:2px solid #DAA33E; padding-bottom:18px;">
          <div style="font-size:13px; letter-spacing:5px; color:#DAA33E; font-weight:700;">CHESSKIDOO ACADEMY</div>
          <div style="font-size:11px; letter-spacing:3px; color:#9aa0ad; margin-top:6px;">TOURNAMENT ANNOUNCEMENT</div>
        </div>
        <div style="margin-top:46px; text-align:center;">
          <div style="display:inline-block; background:rgba(218,163,62,0.14); border:1px solid rgba(218,163,62,0.4); color:#DAA33E; font-size:12px; font-weight:700; padding:6px 16px; border-radius:20px; letter-spacing:1px;">${escapeHtml(t.federation)} · ${escapeHtml(t.category)}</div>
          <h1 style="font-size:36px; line-height:1.25; margin:26px 10px 0; color:#fff; font-weight:800;">${escapeHtml(t.title)}</h1>
        </div>
        <div style="margin-top:48px; display:flex; flex-direction:column; gap:20px; font-size:18px;">
          <div style="display:flex; gap:14px; align-items:center;"><span style="font-size:24px;">📅</span><span><b style="color:#DAA33E;">When:</b> ${eventDate} &nbsp;@&nbsp; ${escapeHtml(t.time || '09:00')}</span></div>
          <div style="display:flex; gap:14px; align-items:center;"><span style="font-size:24px;">📍</span><span><b style="color:#DAA33E;">Venue:</b> ${escapeHtml(t.location)}</span></div>
          <div style="display:flex; gap:14px; align-items:center;"><span style="font-size:24px;">🏆</span><span><b style="color:#DAA33E;">Category:</b> ${escapeHtml(t.category)}</span></div>
          <div style="display:flex; gap:14px; align-items:center;"><span style="font-size:24px;">💰</span><span><b style="color:#DAA33E;">${feeText}</b></span></div>
        </div>
        <div style="position:absolute; left:44px; right:44px; bottom:44px; text-align:center;">
          <div style="background:#DAA33E; color:#000; font-weight:800; font-size:18px; padding:14px; border-radius:10px; letter-spacing:1px;">REGISTER NOW</div>
          <div style="font-size:12px; color:#9aa0ad; margin-top:14px; word-break:break-all;">${escapeHtml(t.regLink)}</div>
        </div>
      </div>`;
    document.body.appendChild(poster);
    if (window.toast) window.toast('Generating poster…', 'info');
    html2canvas(poster.firstElementChild, { backgroundColor: null, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Chesskidoo_${t.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(poster);
      if (window.toast) window.toast('Poster downloaded!', 'success');
    }).catch(err => {
      console.error('Poster generation failed:', err);
      if (poster.parentNode) document.body.removeChild(poster);
      if (window.toast) window.toast('Could not generate poster.', 'error');
    });
  };

  window.syncTournamentCalendar = function (tournamentId) {
    const t = tournamentsData.find(x => x.id === tournamentId);
    if (!t) return;

    // Parse start datetime (assuming local timezone)
    const [year, month, day] = t.date.split('-');
    const [hour, min] = (t.time || '09:00').split(':');
    const startDt = new Date(year, month - 1, day, hour, min);
    
    // Add 4 hours for end time
    const endDt = new Date(startDt.getTime() + 4 * 60 * 60 * 1000);
    
    // Format to YYYYMMDDTHHMMSS (floating time, no Z)
    const formatIcsDate = (d) => {
      return d.getFullYear().toString() +
             (d.getMonth() + 1).toString().padStart(2, '0') +
             d.getDate().toString().padStart(2, '0') + 'T' +
             d.getHours().toString().padStart(2, '0') +
             d.getMinutes().toString().padStart(2, '0') + '00';
    };

    const startDate = formatIcsDate(startDt);
    const endDate = formatIcsDate(endDt);

    const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Chesskidoo Academy//Tournament Finder//EN
BEGIN:VEVENT
UID:${t.id}@chesskidoo.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${t.title}
LOCATION:${t.location}
DESCRIPTION:Aggregated by Chesskidoo. Fee: Rs.${t.fee}. Class eligibility rating bracket: ${t.category}. Registration: ${t.regLink}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${t.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.toast) window.toast('Event calendar (.ics) downloaded successfully!', 'success');
  };

  // Dispatch WhatsApp Reminder
  window.sendTournamentWhatsAppReminder = function (tournamentId) {
    const t = tournamentsData.find(x => x.id === tournamentId);
    if (!t) return;

    const studentObj = window.currentStudent || activeFinderStudent;
    const studentName = studentObj ? (studentObj.name || studentObj.full_name) : 'Student';
    const eventDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const msg = `🏆 *CHESSKIDOO TOURNAMENT REMINDER*\n\nHello Parent,\n\nWe found a highly compatible chess event for *${studentName}* nearby:\n\n📌 *Tournament:* ${t.title}\n📅 *Date:* ${eventDate} @ ${t.time}\n📍 *Venue:* ${t.location}\n💰 *Entry Fee:* ${t.fee > 0 ? `Rs.${t.fee}` : 'Free Entry'}\n🔥 *Category:* ${t.category}\n\n🔗 *Register Here:* ${t.regLink}\n\nGood luck! Chesskidoo Academy Team`;

    const phone = studentObj ? (studentObj.parent_phone || studentObj.phone || '') : '';
    const parsed = window.parseStoredPhone ? window.parseStoredPhone(phone) : { countryCode: 'IN', localNumber: phone };
    const inferredCountry = (parsed.countryCode && parsed.countryCode !== 'IN') ? parsed.countryCode : (studentObj?.country_code || 'IN');
    const country = window.getCountryByCode ? window.getCountryByCode(inferredCountry) : { dial: '+91' };
    const dialCode = country.dial.replace(/\D/g, '');

    const base = 'https://api.whatsapp.com/send';
    window.open(`${base}?phone=${dialCode}${parsed.localNumber}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Helper: Find closest city reference key
  function getNearestCityName(lat, lon) {
    let nearestKey = 'chennai';
    let minDist = 999999;
    for (const [key, coords] of Object.entries(CITIES_COORDS)) {
      const dist = calculateDistance(lat, lon, coords.lat, coords.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestKey = key;
      }
    }
    return nearestKey;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  window.toggleTournamentInterest = async function(tournamentId, tournamentTitle, status) {
    const studentObj = (CK.currentUser && CK.currentUser.role === 'student') ? CK.currentUser : activeFinderStudent;
    if (!studentObj) {
      if (window.toast) window.toast('Please select a student profile first.', 'warning');
      return;
    }
    const studentId = studentObj.id || studentObj.userid;
    const studentName = studentObj.full_name || studentObj.name || 'Student';

    const existing = (window.tournamentInterestsData || []).find(i => i.student_id === studentId && i.tournament_id === tournamentId);
    let newStatus = status;
    if (existing && existing.status === status) {
      newStatus = 'None';
    }

    const payload = {
      id: existing ? existing.id : 'ti-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      student_id: studentId,
      student_name: studentName,
      tournament_id: tournamentId,
      tournament_title: tournamentTitle,
      status: newStatus
    };

    try {
      await CK.db.saveTournamentInterest(payload);
      window.tournamentInterestsData = await CK.db.getTournamentInterests();
      if (window.toast) window.toast(`Tournament status updated: ${newStatus}`, 'success');
      
      const isChildView = !document.getElementById('tf-student-select');
      window.filterTournaments(isChildView);
    } catch(err) {
      console.error(err);
      if (window.toast) window.toast('Failed to save interest status', 'error');
    }
  };

  /* ─── Admin: Create + Run in-house tournaments ─────────────────────
     "+ Create Tournament" was a dead button (showCreateForm never existed).
     Now it opens a modal create form; created (in-house) tournaments are listed
     with a "Run Swiss" button that launches the Swiss pairing manager
     (CK.swissUI). Persists via CK.db.saveTournament. */
  function _toast(msg, type) { if (window.CK && CK.showToast) CK.showToast(msg, type); else if (window.toast) window.toast(msg, type); }
  let _manageHostId = 'adminTournamentCreate';

  function showCreateForm(containerId) {
    if (containerId) _manageHostId = containerId;
    document.getElementById('tournCreateModal')?.remove();
    const m = document.createElement('div');
    m.id = 'tournCreateModal';
    m.className = 'cls-modal-overlay open';
    m.innerHTML = `
      <div class="cls-modal" style="max-width:640px;width:96%;">
        <div class="cls-modal-header"><h3>🏆 Create Tournament</h3><button class="cls-modal-close" onclick="document.getElementById('tournCreateModal').remove()">✕</button></div>
        <div class="cls-modal-body" style="padding:18px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div class="p-form-group"><label class="p-form-label">Tournament Name *</label><input class="p-form-control" id="tcf_title" placeholder="e.g. ChessKidoo Summer Open"></div>
            <div class="p-form-group"><label class="p-form-label">Date</label><input class="p-form-control" type="date" id="tcf_date"></div>
            <div class="p-form-group"><label class="p-form-label">Location / Venue</label><input class="p-form-control" id="tcf_location" placeholder="e.g. Chennai, TN"></div>
            <div class="p-form-group"><label class="p-form-label">Format</label><select class="p-form-control" id="tcf_format"><option>Swiss</option><option>Round Robin</option><option>Knockout</option><option>Blitz</option><option>Rapid</option></select></div>
            <div class="p-form-group"><label class="p-form-label">Level</label><select class="p-form-control" id="tcf_level"><option>Open</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
            <div class="p-form-group"><label class="p-form-label">Entry Fee (₹)</label><input class="p-form-control" type="number" id="tcf_fee" value="0" min="0"></div>
            <div class="p-form-group"><label class="p-form-label">Status</label><select class="p-form-control" id="tcf_status"><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option></select></div>
          </div>
        </div>
        <div class="cls-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="document.getElementById('tournCreateModal').remove()">Cancel</button>
          <button class="p-btn p-btn-gold" onclick="CK.tournament.submitCreateForm()">✓ Create Tournament</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }

  async function submitCreateForm() {
    const val = (id) => (document.getElementById(id) || {}).value;
    const title = (val('tcf_title') || '').trim();
    if (!title) { _toast('Tournament name is required', 'warning'); return; }
    // Only columns that exist in the Supabase `tournaments` table — extra keys
    // (e.g. `source`/`swiss`) make the upsert fail, which then wipes the row on
    // the next read. In-house events are marked via the existing `type` column;
    // the live Swiss pairing state lives in localStorage (ck_swiss_<id>).
    const t = {
      id: Date.now().toString(),
      title, name: title,
      date: val('tcf_date') || '',
      venue: val('tcf_location') || '',
      format: val('tcf_format') || 'Swiss',
      level: val('tcf_level') || 'Open',
      fee: parseInt(val('tcf_fee') || '0', 10) || 0,
      status: val('tcf_status') || 'upcoming',
      organizer: 'ChessKidoo',
      type: 'in-house',
      participants: [],
      createdAt: new Date().toISOString()
    };
    try {
      await CK.db.saveTournament(t);
      _toast('Tournament created: ' + title, 'success');
      document.getElementById('tournCreateModal')?.remove();
      renderManageList(_manageHostId, true); // useCache: avoid racing Supabase read-after-write
    } catch (e) {
      console.error('[Tournament] create failed:', e);
      _toast('Failed to create tournament', 'error');
    }
  }

  function _swissOf(id) { try { return JSON.parse(localStorage.getItem('ck_swiss_' + id) || 'null'); } catch (e) { return null; } }

  /* Lists in-house tournaments (type:'in-house' or any with a saved Swiss event)
     with Run + Delete actions. */
  async function renderManageList(containerId, useCache) {
    _manageHostId = containerId || _manageHostId;
    const el = document.getElementById(_manageHostId);
    if (!el) return;
    let list = [];
    if (useCache) {
      try { list = JSON.parse(localStorage.getItem('ck_tournaments') || '[]'); } catch (e) {}
    } else {
      try { list = (await CK.db.getTournaments()) || []; } catch (e) {}
    }
    const inHouse = list.filter(t => t.type === 'in-house' || _swissOf(t.id));
    if (!inHouse.length) {
      el.innerHTML = '<div style="opacity:.5;padding:12px;font-size:.85rem;">No in-house tournaments yet. Click “+ Create Tournament” to start one with automatic Swiss pairings.</div>';
      return;
    }
    el.innerHTML = inHouse.map(t => {
      const nm = (t.title || t.name || 'Tournament');
      const safe = nm.replace(/'/g, '’');
      const sw = _swissOf(t.id);
      const rounds = sw && sw.rounds ? sw.rounds.length : 0;
      const np = (sw && sw.players ? sw.players.length : (t.participants || []).length);
      return `<div class="sw-manage-row">
        <div><strong>${escapeHtml(nm)}</strong>
          <span style="opacity:.5;font-size:.8rem;margin-left:6px;">${escapeHtml(t.date || 'No date')} · ${escapeHtml(t.format || 'Swiss')} · ${np} players${rounds ? ' · R' + rounds : ''}</span></div>
        <div style="display:flex;gap:6px;">
          <button class="p-btn p-btn-gold p-btn-sm" onclick="CK.swissUI.openModal('${t.id}','${escapeHtml(safe)}')">🏁 Run Swiss</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.tournament.deleteInHouse('${t.id}')" title="Delete">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  async function deleteInHouse(id) {
    if (!confirm('Delete this tournament?')) return;
    try { await CK.db.deleteTournament(id); localStorage.removeItem('ck_swiss_' + id); } catch (e) {}
    _toast('Tournament deleted', 'info');
    renderManageList(_manageHostId);
  }

  window.CK = window.CK || {};
  window.CK.tournament = {
    loadTournaments,
    renderTournamentFinderUI,
    showCreateForm,
    submitCreateForm,
    renderManageList,
    deleteInHouse,
    toggleTournamentInterest: window.toggleTournamentInterest
  };

})();
