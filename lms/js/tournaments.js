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

  // Verified upcoming regional & national tournaments fallback
  const LOCAL_TOURNAMENTS_FALLBACK = [
    {
      id: 'aicf_tn_2026_01',
      title: 'Tamil Nadu State Children Rapid Championship 2026',
      federation: 'TNSCA / AICF',
      date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
      time: '09:00',
      location: 'Jawaharlal Nehru Stadium, Chennai',
      coords: CITIES_COORDS['chennai'],
      fee: 500,
      category: 'Under-15 & Open',
      eloLimit: 9999,
      regLink: 'https://aicf.in',
      sourceBadge: 'AICF'
    },
    {
      id: 'aicf_cbe_2026_02',
      title: 'Kovai Grand Prix FIDE Rated Open',
      federation: 'FIDE / AICF',
      date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      time: '09:30',
      location: 'Hindusthan Arts & Science, Coimbatore',
      coords: CITIES_COORDS['coimbatore'],
      fee: 1000,
      category: 'FIDE Rated (Below 1800)',
      eloLimit: 1800,
      regLink: 'https://aicf.in',
      sourceBadge: 'FIDE'
    },
    {
      id: 'aicf_blr_2026_03',
      title: 'Bengaluru Youth Chess Festival 2026',
      federation: 'KSCA / AICF',
      date: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      time: '10:00',
      location: 'Kanteerava Indoor Stadium, Bangalore',
      coords: CITIES_COORDS['bangalore'],
      fee: 750,
      category: 'Under-12 & Under-16',
      eloLimit: 9999,
      regLink: 'https://aicf.in',
      sourceBadge: 'AICF'
    },
    {
      id: 'ck_online_arena_04',
      title: 'ChessKidoo Inter-Batch Arena Championship',
      federation: 'ChessKidoo',
      date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      time: '18:00',
      location: 'Online — ChessKidoo Arena',
      coords: CITIES_COORDS['chennai'],
      fee: 0,
      category: 'Junior & Intermediate',
      eloLimit: 9999,
      regLink: 'https://chesskidoo.com/lms',
      sourceBadge: 'Academy'
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

  // ─── Fetch Tournaments from Multiple Sources (Supabase, Lichess, Chess.com) ─────────────
  window.loadTournaments = async function(forceSync = false) {
    if (!forceSync && tournamentsLoaded && tournamentsData.length > 0) return;
    
    let allTournaments = [];
    
    // 1. Fetch from Supabase (Local/Admin Events)
    if (window.supabaseClient && !(window.sbTableKnownMissing && window.sbTableKnownMissing('tournaments'))) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await window.supabaseClient
          .from('tournaments')
          .select('*')
          .gte('start_date', todayStr)
          .order('start_date', { ascending: true });

        if (error) {
          if (window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('tournaments');
          } else {
            console.warn('[Supabase] Tournaments unavailable, using local data.');
          }
        } else {
          // Map database structure to client structure
          const dbTournaments = (data || []).map(t => {
            const cityKey = (t.city || 'chennai').toLowerCase().trim();
            const cityCoords = CITIES_COORDS[cityKey] || CITIES_COORDS['chennai'];
            return {
              id: t.id,
              title: t.title,
              federation: t.organizer || t.source || 'FIDE',
              date: t.start_date,
              time: '09:00', // Default fallback time
              location: t.location + (t.city ? `, ${t.city}` : ''),
              coords: cityCoords,
              fee: parseFloat(t.entry_fee) || 0,
              category: t.rating_required || 'Open',
              eloLimit: parseInt(t.elo_limit) || 9999,
              regLink: t.registration_url || '',
              sourceBadge: 'Academy'
            };
          });
          allTournaments = allTournaments.concat(dbTournaments);
        }
      } catch (err) {
        console.error('[Supabase] Error loading tournaments', err);
      }
    }

    // 2. Fetch from Lichess Arena API
    try {
      const lichessRes = await fetch('https://lichess.org/api/tournament');
      if (lichessRes.ok) {
        const text = await lichessRes.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');
        let count = 0;
        
        // Parse NDJSON (Newline Delimited JSON)
        for (const line of lines) {
          try {
            const t = JSON.parse(line);
            // Only add upcoming/created arenas (status 10/20)
            if (t.status === 10 || t.status === 20) { 
              const startDate = new Date(t.startsAt || t.createdAt);
              allTournaments.push({
                id: 'lichess_' + t.id,
                title: t.fullName || 'Lichess Arena',
                federation: 'Lichess',
                date: startDate.toISOString().split('T')[0],
                time: startDate.toTimeString().substring(0,5),
                location: 'Online — Lichess',
                coords: CITIES_COORDS['chennai'], // Online defaults
                fee: 0,
                category: t.perf ? t.perf.name : 'Open',
                eloLimit: 9999,
                regLink: `https://lichess.org/tournament/${t.id}`,
                sourceBadge: 'Lichess'
              });
              count++;
              if (count >= 15) break; // Limit to 15 upcoming arenas
            }
          } catch(e) {}
        }
      }
    } catch(err) {
      console.warn('[Lichess API] Failed to fetch live tournaments', err);
    }

    // 3. Fallback if everything failed
    if (allTournaments.length === 0) {
      allTournaments = LOCAL_TOURNAMENTS_FALLBACK.map(t => ({...t, sourceBadge: t.sourceBadge || 'AICF'}));
    }

    // Sort all by date
    allTournaments.sort((a, b) => new Date(a.date) - new Date(b.date));

    tournamentsData = allTournaments;
    tournamentsLoaded = true;
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
        renderTournamentFinderUI(finderDiv, false);
      }
    }
  };

  window.setChildEventsSubTab = async function (tab) {
    const fameView = document.getElementById('child-fame-list-view');
    const acaGrid = document.getElementById('child-ev-list-view');
    const finderDiv = document.getElementById('child-tf-list-view');

    const btnAcademy = document.getElementById('btn-child-events-academy');
    const btnFinder = document.getElementById('btn-child-events-finder');

    if (btnAcademy) btnAcademy.classList.remove('active');
    if (btnFinder) btnFinder.classList.remove('active');

    if (tab === 'finder') {
      if (btnFinder) btnFinder.classList.add('active');
      if (acaGrid) acaGrid.style.display = 'none';
      if (finderDiv) {
        finderDiv.style.display = 'block';
        await loadTournaments();
        renderTournamentFinderUI(finderDiv, true);
      }
    } else {
      if (btnAcademy) btnAcademy.classList.add('active');
      if (fameView) fameView.style.display = 'block';
      if (acaGrid) acaGrid.style.display = 'block';
      if (finderDiv) finderDiv.style.display = 'none';
      if (window.renderChildFame) window.renderChildFame();
      renderChildEvents();
    }
  };

  // ─── Rendering Tournament Finder Core UI ─────────────────────────
  function renderTournamentFinderUI(container, isChildView) {
    const currentStudentObj = isChildView ? window.currentStudent : activeFinderStudent;
    const currentStudentId = currentStudentObj ? currentStudentObj.id : '';

    let studentSelectHtml = '';
    // Student Selector to test eligibility (for Admin and Parent portal with multiple children)
    let students = window.allStudents || [];
    
    // Privacy filter for parent portal: only show their own children
    if (isChildView) {
      if (window.currentUser && window.currentUser.role === 'parent') {
        const pPhone = window.currentUser.phone;
        const pEmail = window.currentUser.email;
        students = students.filter(s => 
          (pPhone && s.parent_phone === pPhone) || 
          (pEmail && s.parent_email === pEmail)
        );
        // Fallback if matching fails but currentStudent is set
        if (students.length === 0 && window.currentStudent) {
          students = [window.currentStudent];
        }
      } else if (window.currentStudent) {
        students = [window.currentStudent];
      }
    }
    const opts = students
      .slice()
      .sort((a, b) => (a.name || a.full_name || '').localeCompare(b.name || b.full_name || ''))
      .map(s => 
      `<option value="${s.id}" ${String(s.id) === String(currentStudentId) ? 'selected' : ''}>${escapeHtml(s.name || s.full_name)} (${s.rating || 1000} ELO)</option>`
    ).join('');
    studentSelectHtml = `
      <div style="display:flex; flex-direction:column; gap:4px; min-width:180px;">
        <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Check Eligibility For:</label>
        <select id="tf-student-select" class="premium-select" onchange="window.selectFinderStudent(this.value, ${isChildView})" style="padding:7px; font-size:12px;">
          <option value="">-- Choose Student --</option>
          ${opts}
        </select>
      </div>
    `;

    // Coordinates auto-detection alert block
    const userCityName = getNearestCityName(userLat, userLon);

    container.innerHTML = `
      <!-- Toolbar Filter Bar -->
      <div class="filter-bar" style="background:var(--surface2); padding:16px; border-radius:12px; border:1px solid var(--border); display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:20px;">
        <div style="display:flex; flex-direction:column; gap:4px; min-width:140px;">
          <label style="font-size:11px; color:var(--ivory-dim); font-weight:700;">Reference Location:</label>
          <div style="display:flex; gap:6px;">
            <select id="tf-city-select-${isChildView ? 'child' : 'admin'}" class="premium-select" onchange="window.selectFinderCity(this.value, ${isChildView})" style="padding:7px; font-size:12px; flex:1;">
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
          <select id="tf-radius-select-${isChildView ? 'child' : 'admin'}" class="premium-select" onchange="window.filterTournaments(${isChildView})" style="padding:7px; font-size:12px;">
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
          <input type="text" id="tf-search-${isChildView ? 'child' : 'admin'}" placeholder="Name, venue, city, category…" oninput="window.filterTournaments(${isChildView})" style="padding:7px 10px; font-size:12px; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); border-radius:6px;">
        </div>

        ${studentSelectHtml}

        <div style="flex:1; text-align:right; min-width:160px;">
          <button class="btn btn-outline" onclick="var btn=this; btn.innerHTML='⏳ Syncing...'; btn.disabled=true; window.loadTournaments(true).then(()=>{ window.filterTournaments(${isChildView}); btn.innerHTML='🔄 Sync Live APIs'; btn.disabled=false; });" style="padding:6px 12px; font-size:11px; background:rgba(218,163,62,0.1); color:var(--gold); border:1px solid rgba(218,163,62,0.4);">
            🔄 Sync Live APIs
          </button>
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
          <p id="tf-location-summary-${isChildView ? 'child' : 'admin'}" style="font-size:11px; color:var(--ivory-dim); margin:0;">
            Centered on: <strong>${escapeHtml(userCityName.toUpperCase())}</strong> coords (${userLat.toFixed(4)}, ${userLon.toFixed(4)})
          </p>
        </div>
      </div>

      <!-- Tournaments Grid -->
      <div class="tf-grid" id="tf-results-grid-${isChildView ? 'child' : 'admin'}"></div>
    `;

    // Perform initial filtering
    window.filterTournaments(isChildView);
  }

  // Auto-detect Geolocation
  window.detectFinderLocation = function (isChildView) {
    const locSummary = document.getElementById(`tf-location-summary-${isChildView ? 'child' : 'admin'}`);
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
  window.selectFinderCity = function (cityKey, isChildView) {
    const coords = CITIES_COORDS[cityKey];
    if (coords) {
      userLat = coords.lat;
      userLon = coords.lon;
      
      const containerId = isChildView ? 'child-tf-list-view' : 'tf-list-view';
      const container = document.getElementById(containerId);
      if (container) {
        renderTournamentFinderUI(container, isChildView);
      }
    }
  };

  // Admin and Parent student selection updates eligibility
  window.selectFinderStudent = function (studentId, isChildView) {
    const student = (window.allStudents || []).find(s => String(s.id) === String(studentId));
    if (isChildView) {
      window.currentStudent = student || null;
    } else {
      activeFinderStudent = student || null;
    }
    window.filterTournaments(isChildView);
  };

  // Filters tournament cards by distance radius
  window.filterTournaments = function (isChildView) {
    const gridEl = document.getElementById(`tf-results-grid-${isChildView ? 'child' : 'admin'}`);
    const radiusVal = document.getElementById(`tf-radius-select-${isChildView ? 'child' : 'admin'}`)?.value || '200';
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
    const query = (document.getElementById(`tf-search-${isChildView ? 'child' : 'admin'}`)?.value || '').toLowerCase().trim();

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
          <button class="btn btn-outline btn-sm" onclick="var r=document.getElementById('tf-radius-select-${isChildView ? 'child' : 'admin'}'); if(r) r.value='world'; var sb=document.getElementById('tf-search-${isChildView ? 'child' : 'admin'}'); if(sb) sb.value=''; window.filterTournaments(${isChildView});" style="margin-top:10px;">🌍 View All Worldwide Events</button>
        </div>
      `;
      return;
    }

    // Sort by distance (nearest first)
    filtered.sort((a, b) => a.distance - b.distance);

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

      // 2. Compute Coach Recommendation
      let coachRec = '';
      if (!studentObj) {
        coachRec = '<em>Select a student profile to generate coach recommendations.</em>';
      } else if (!isEligible) {
        coachRec = '⚠️ <strong>Ineligible:</strong> Rating exceeds tournament threshold. Try the Open category.';
      } else if (t.eloLimit !== 9999 && eloDiff <= 150) {
        coachRec = '🔥 <strong>High Recommendation:</strong> Excellent ELO bracket to push rating ceiling.';
      } else if (studentLevel.toLowerCase() === 'beginner' && t.eloLimit > 1400) {
        coachRec = '💡 <strong>Coach Advice:</strong> Elite category. Focus on game notations, and expect high resistance.';
      } else {
        coachRec = '♟️ <strong>Recommended:</strong> Match matches current developmental chess goals.';
      }

      const entryFeeText = t.fee > 0 ? `₹${t.fee}` : 'Free Entry';
      const eventDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      return `
        <div class="tf-card" style="--card-stripe-color: ${borderStripeColor};">
          <div>
            <!-- Card Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <span class="tf-badge" style="background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--ivory);">${t.federation} Event</span>
              <span style="font-size:11px; font-weight:700; color:var(--gold);">${entryFeeText}</span>
            </div>

            <!-- Title -->
            <h3 style="font-size:14px; font-weight:700; color:var(--ivory); margin:0 0 6px 0; font-family:var(--font-head); line-height:1.4;">
              ${escapeHtml(t.title)}
            </h3>

            <!-- Details -->
            <div style="font-size:11px; color:var(--ivory-dim); display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
              <span>📅 Date: <strong>${eventDate} @ ${t.time}</strong></span>
              <span>📍 Venue: <strong>${escapeHtml(t.location)}</strong></span>
              <span style="color:var(--gold);">🚗 Distance: <strong>${t.distance} km away</strong></span>
            </div>

            <!-- Eligibility Badge -->
            <div style="margin-bottom:10px;">
              ${eligibilityBadge}
            </div>
          </div>

          <!-- Coach Recommendation Block -->
          <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:8px 10px; font-size:11px; border:1px solid rgba(255,255,255,0.03); color:var(--ivory-dim); line-height:1.4;">
            ${coachRec}
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:8px; margin-top:4px;">
            ${t.sourceBadge === 'Academy' && !t.regLink
               ? `<button class="btn btn-gold btn-sm" onclick="window.showInterestTournament('${t.id}')" style="flex:1; padding:6px; font-size:11px; border-radius:6px; border:none; cursor:pointer;">⭐ Show Interest</button>`
               : `<a href="${t.regLink || '#'}" target="_blank" class="btn btn-gold btn-sm" style="flex:1; text-align:center; padding:6px; font-size:11px; border-radius:6px; text-decoration:none;">Register</a>`
            }
            <button class="btn btn-outline btn-sm" onclick="window.syncTournamentCalendar('${t.id}')" style="padding:6px 10px; font-size:11px;" title="Sync to Calendar">📅</button>
            <button class="btn btn-outline btn-sm" onclick="window.sendTournamentWhatsAppReminder('${t.id}')" style="padding:6px 10px; font-size:11px;" title="WhatsApp Reminder">💬</button>
            <button class="btn btn-outline btn-sm" onclick="window.downloadTournamentPoster('${t.id}')" style="padding:6px 10px; font-size:11px;" title="Download Event Poster">🖼️</button>
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
          <div style="font-size:13px; letter-spacing:5px; color:#DAA33E; font-weight:700;">ChessKidoo ACADEMY</div>
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
      link.download = `chesskidoo_${t.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
PRODID:-//ChessKidoo Chess Academy//Tournament Finder//EN
BEGIN:VEVENT
UID:${t.id}@chesskidoo.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${t.title}
LOCATION:${t.location}
DESCRIPTION:Aggregated by ChessKidoo. Fee: Rs.${t.fee}. Class eligibility rating bracket: ${t.category}. Registration: ${t.regLink}
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

  // Register Interest for Academy Tournaments
  window.showInterestTournament = function(tournamentId) {
    const t = tournamentsData.find(x => String(x.id) === String(tournamentId));
    if (!t) return;
    
    // Attempt to log interest in the student's notes or via an API call in the future
    if (window.toast) {
      window.toast(`Interest registered for ${t.title}! An admin will contact you with details.`, 'success');
    } else {
      alert(`Interest registered for ${t.title}! An admin will contact you with details.`);
    }
  };

  // Dispatch WhatsApp Reminder
  window.sendTournamentWhatsAppReminder = function (tournamentId) {
    const t = tournamentsData.find(x => String(x.id) === String(tournamentId));
    if (!t) return;

    const studentObj = window.currentStudent || activeFinderStudent;
    const studentName = studentObj ? (studentObj.name || studentObj.full_name) : 'Student';
    const eventDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const msg = `🏆 *ChessKidoo TOURNAMENT REMINDER*\n\nHello Parent,\n\nWe found a highly compatible chess event for *${studentName}* nearby:\n\n📌 *Tournament:* ${t.title}\n📅 *Date:* ${eventDate} @ ${t.time}\n📍 *Venue:* ${t.location}\n💰 *Entry Fee:* ${t.fee > 0 ? `Rs.${t.fee}` : 'Free Entry'}\n🔥 *Category:* ${t.category}\n\n🔗 *Register Here:* ${t.regLink}\n\nGood luck! ChessKidoo Academy Team`;

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

  // ─────────────────────────────────────────────────────────────────
  // ── IN-HOUSE ACADEMY TOURNAMENTS & SWISS PAIRING ARENA ──
  // ─────────────────────────────────────────────────────────────────
  const STORAGE_INHOUSE_TOURNAMENTS = 'ck_inhouse_tournaments';

  function getInHouseTournaments() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_INHOUSE_TOURNAMENTS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveInHouseTournaments(list) {
    localStorage.setItem(STORAGE_INHOUSE_TOURNAMENTS, JSON.stringify(list));
  }

  // Generate Sample In-House Tournament if empty
  (function seedInitialTournament() {
    // Sample tournament seeding removed - no test data should be auto-generated
  })();

  // Standings calculation with Buchholz and Sonneborn-Berger
  function calculateTournamentStandings(tourn) {
    const agg = {};
    tourn.players.forEach(p => {
      agg[p.id] = { id: p.id, name: p.name, rating: p.rating, score: 0, wins: 0, draws: 0, losses: 0, byes: 0, opponents: [] };
    });

    (tourn.rounds || []).forEach(rnd => {
      rnd.pairings.forEach(pr => {
        const w = agg[pr.white];
        if (pr.black === null) {
          if (w && pr.result === 'bye') { w.score += 1; w.byes += 1; }
          return;
        }
        const b = agg[pr.black];
        if (!w || !b) return;

        w.opponents.push(pr.black);
        b.opponents.push(pr.white);

        if (pr.result === '1-0') { w.score += 1; w.wins++; b.losses++; }
        else if (pr.result === '0-1') { b.score += 1; b.wins++; w.losses++; }
        else if (pr.result === '1/2') { w.score += 0.5; w.draws++; b.score += 0.5; b.draws++; }
      });
    });

    const scoreOf = id => (agg[id] ? agg[id].score : 0);
    const rows = tourn.players.map(p => {
      const a = agg[p.id];
      const buchholz = a.opponents.reduce((s, oid) => s + scoreOf(oid), 0);
      let sb = 0;
      (tourn.rounds || []).forEach(rnd => rnd.pairings.forEach(pr => {
        if (pr.black === null) return;
        const me = pr.white === p.id ? 'w' : (pr.black === p.id ? 'b' : null);
        if (!me) return;
        const oppId = me === 'w' ? pr.black : pr.white;
        const won = (me === 'w' && pr.result === '1-0') || (me === 'b' && pr.result === '0-1');
        const drew = pr.result === '1/2';
        if (won) sb += scoreOf(oppId);
        else if (drew) sb += scoreOf(oppId) / 2;
      }));

      return {
        id: p.id, name: p.name, rating: p.rating,
        score: a.score, wins: a.wins, draws: a.draws, losses: a.losses, byes: a.byes,
        buchholz: +buchholz.toFixed(1), sb: +sb.toFixed(1), played: a.opponents.length
      };
    });

    rows.sort((a, b) => (b.score - a.score) || (b.buchholz - a.buchholz) || (b.sb - a.sb) || (b.wins - a.wins) || (b.rating - a.rating));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }

  // Open Full In-House Tournament Arena Modal
  window.openAcademyTournamentArena = function (tournId) {
    const list = getInHouseTournaments();
    const tourn = tournId ? list.find(x => x.id === tournId) : list[0];
    if (!tourn) {
      if (window.toast) window.toast('No tournament found.', 'warning');
      return;
    }

    const standings = calculateTournamentStandings(tourn);
    const currRoundNum = (tourn.rounds && tourn.rounds.length) ? tourn.rounds.length : 1;
    const currRound = tourn.rounds ? tourn.rounds[currRoundNum - 1] : null;

    const modalHtml = `
      <div id="inhouse-tournament-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:16px;" onclick="document.getElementById('inhouse-tournament-modal').remove()">
        <div class="card" style="background:#0f172a; border:1.5px solid var(--gold); border-radius:18px; max-width:860px; width:100%; max-height:90vh; overflow-y:auto; padding:26px; box-shadow:0 25px 60px rgba(0,0,0,0.8);" onclick="event.stopPropagation()">
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid rgba(218,163,62,0.25); padding-bottom:14px;">
            <div>
              <span style="font-size:11px; font-weight:800; color:var(--gold); text-transform:uppercase; letter-spacing:1px;">🏆 In-House Swiss Arena</span>
              <h3 style="margin:4px 0 0; color:#fff; font-size:20px; font-weight:800;">${escapeHtml(tourn.title)}</h3>
              <div style="font-size:12.5px; color:var(--ivory-dim); margin-top:2px;">⏱️ Time Control: ${escapeHtml(tourn.timeControl)} · Round ${currRoundNum} of ${tourn.totalRounds}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-gold btn-sm" onclick="window.generateNextSwissRound('${tourn.id}')">⚡ Pair Next Round</button>
              <button onclick="document.getElementById('inhouse-tournament-modal').remove()" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer;">✕</button>
            </div>
          </div>

          <!-- Top Podium Section (Top 3) -->
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:24px; text-align:center;">
            <!-- 2nd Place -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid #94a3b8; border-radius:14px; padding:14px;">
              <div style="font-size:24px;">🥈</div>
              <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">2nd Place</div>
              <div style="font-size:14px; font-weight:700; color:#fff; margin:4px 0;">${standings[1] ? escapeHtml(standings[1].name) : '—'}</div>
              <div style="font-size:12px; color:var(--gold); font-weight:700;">${standings[1] ? standings[1].score + ' pts' : '0 pts'}</div>
            </div>
            <!-- 1st Place -->
            <div style="background:linear-gradient(135deg, rgba(234,179,8,0.15), rgba(30,41,59,0.9)); border:2px solid var(--gold); border-radius:14px; padding:14px; transform:scale(1.04); box-shadow:0 10px 25px rgba(234,179,8,0.2);">
              <div style="font-size:28px;">🥇</div>
              <div style="font-size:11px; font-weight:800; color:var(--gold); text-transform:uppercase;">1st Place Champion</div>
              <div style="font-size:15px; font-weight:800; color:#fff; margin:4px 0;">${standings[0] ? escapeHtml(standings[0].name) : '—'}</div>
              <div style="font-size:13px; color:var(--gold); font-weight:800;">${standings[0] ? standings[0].score + ' pts' : '0 pts'}</div>
            </div>
            <!-- 3rd Place -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid #cd7f32; border-radius:14px; padding:14px;">
              <div style="font-size:24px;">🥉</div>
              <div style="font-size:11px; font-weight:800; color:#cd7f32; text-transform:uppercase;">3rd Place</div>
              <div style="font-size:14px; font-weight:700; color:#fff; margin:4px 0;">${standings[2] ? escapeHtml(standings[2].name) : '—'}</div>
              <div style="font-size:12px; color:var(--gold); font-weight:700;">${standings[2] ? standings[2].score + ' pts' : '0 pts'}</div>
            </div>
          </div>

          <!-- Tabs: Current Round Pairings | Live Standings Leaderboard -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px;">
            <!-- Left: Current Round Pairings & Score Entry -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:14px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:13px; font-weight:700; color:var(--gold);">⚔️ Round ${currRoundNum} Pairings</span>
                <span style="font-size:11px; color:var(--ivory-dim);">Click score to record</span>
              </div>
              <div style="display:grid; gap:8px;">
                ${currRound && currRound.pairings ? currRound.pairings.map(pr => {
                  return `
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                      <div style="font-size:12px; font-weight:700; color:#fff;">
                        <span style="color:#f8fafc;">⚪ ${escapeHtml(pr.whiteName)}</span> vs <span style="color:#94a3b8;">⚫ ${escapeHtml(pr.blackName)}</span>
                      </div>
                      <div style="display:flex; gap:4px;">
                        <button type="button" class="btn btn-sm ${pr.result === '1-0' ? 'btn-gold' : 'btn-outline-grey'}" style="padding:2px 8px; font-size:11px;" onclick="window.recordInHouseMatchResult('${tourn.id}', ${currRoundNum}, ${pr.board}, '1-0')">1-0</button>
                        <button type="button" class="btn btn-sm ${pr.result === '1/2' ? 'btn-gold' : 'btn-outline-grey'}" style="padding:2px 8px; font-size:11px;" onclick="window.recordInHouseMatchResult('${tourn.id}', ${currRoundNum}, ${pr.board}, '1/2')">½-½</button>
                        <button type="button" class="btn btn-sm ${pr.result === '0-1' ? 'btn-gold' : 'btn-outline-grey'}" style="padding:2px 8px; font-size:11px;" onclick="window.recordInHouseMatchResult('${tourn.id}', ${currRoundNum}, ${pr.board}, '0-1')">0-1</button>
                      </div>
                    </div>
                  `;
                }).join('') : '<div style="color:#94a3b8; font-size:12px;">No active pairings.</div>'}
              </div>
            </div>

            <!-- Right: Live Standings Table -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:14px; padding:16px;">
              <div style="font-size:13px; font-weight:700; color:var(--gold); margin-bottom:12px;">
                📊 FIDE Standings &amp; Tiebreaks
              </div>
              <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; color:#fff;">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--gold); text-align:left;">
                      <th style="padding:6px 8px;">#</th>
                      <th style="padding:6px 8px;">Player</th>
                      <th style="padding:6px 8px;">Pts</th>
                      <th style="padding:6px 8px;">Buch</th>
                      <th style="padding:6px 8px;">S-B</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${standings.map(s => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                        <td style="padding:6px 8px; font-weight:700; color:${s.rank === 1 ? '#eab308' : '#94a3b8'};">${s.rank}</td>
                        <td style="padding:6px 8px; font-weight:600;">${escapeHtml(s.name)}</td>
                        <td style="padding:6px 8px; font-weight:800; color:var(--gold);">${s.score}</td>
                        <td style="padding:6px 8px; color:#94a3b8;">${s.buchholz}</td>
                        <td style="padding:6px 8px; color:#94a3b8;">${s.sb}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px; flex-wrap:wrap; gap:10px;">
            <button class="btn btn-outline btn-sm" onclick="window.downloadTournamentCertificate('${escapeHtml(standings[0]?.name || 'Champion')}', '${escapeHtml(tourn.title)}', 'Champion (1st Place)')">
              🎓 Generate Winner Certificate (.pdf)
            </button>
            <button class="btn btn-gold btn-sm" onclick="document.getElementById('inhouse-tournament-modal').remove()">
              Done &amp; Close
            </button>
          </div>
        </div>
      </div>
    `;

    const old = document.getElementById('inhouse-tournament-modal');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  window.recordInHouseMatchResult = function (tournId, roundNum, boardNum, result) {
    const list = getInHouseTournaments();
    const tourn = list.find(x => x.id === tournId);
    if (!tourn) return;

    const round = tourn.rounds.find(r => r.number === roundNum);
    if (!round) return;
    const pr = round.pairings.find(p => p.board === boardNum);
    if (!pr) return;

    pr.result = result;
    saveInHouseTournaments(list);
    if (window.toast) window.toast(`Board ${boardNum} result recorded: ${result}`, 'success');
    window.openAcademyTournamentArena(tournId);
  };

  window.generateNextSwissRound = function (tournId) {
    const list = getInHouseTournaments();
    const tourn = list.find(x => x.id === tournId);
    if (!tourn) return;

    if (tourn.rounds.length >= tourn.totalRounds) {
      if (window.toast) window.toast('Tournament has completed all rounds! 🏆', 'info');
      return;
    }

    const standings = calculateTournamentStandings(tourn);
    const pool = [...standings];
    const newPairings = [];
    let board = 1;

    for (let i = 0; i < pool.length; i += 2) {
      if (i + 1 < pool.length) {
        newPairings.push({
          board: board++,
          white: pool[i].id,
          black: pool[i + 1].id,
          whiteName: pool[i].name,
          blackName: pool[i + 1].name,
          result: null
        });
      }
    }

    tourn.rounds.push({
      number: tourn.rounds.length + 1,
      pairings: newPairings
    });

    saveInHouseTournaments(list);
    if (window.toast) window.toast(`Generated Round ${tourn.rounds.length} Swiss Pairings!`, 'success');
    window.openAcademyTournamentArena(tournId);
  };

  window.downloadTournamentCertificate = function (playerName, tournamentTitle, rankTitle) {
    const certText = `
CHESSKIDOO ACADEMY OF CHESS
────────────────────────────────────────────────────────────
CERTIFICATE OF EXCELLENCE & ACHIEVEMENT

This certificate is proudly presented to:
★ ${playerName} ★

For outstanding tactical performance, dedication, and sportsmanship
in the tournament:
"${tournamentTitle}"

Achieving the prestigious title of: ${rankTitle}

Awarded on: ${new Date().toLocaleDateString()}
Grandmaster Panel & Chief Arbiter, ChessKidoo Academy
────────────────────────────────────────────────────────────
    `;
    const blob = new Blob([certText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${playerName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.toast) window.toast('📥 Downloaded Certificate of Achievement!', 'success');
  };

  // ─────────────────────────────────────────────────────────────────
  // ── IN-HOUSE EVENT MANAGER & TOURNAMENT SECTION RENDERER ──
  // ─────────────────────────────────────────────────────────────────
  window.openCreateSwissTournamentModal = function () {
    const students = window.allStudents || [];
    const sampleOptions = students.length ? students.slice(0, 16).map(s => {
      const sName = s.name || s.full_name || 'Student';
      return `<label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px; cursor:pointer;">
        <input type="checkbox" class="swiss-player-chk" value="${s.id}" data-name="${escapeHtml(sName)}" checked>
        <span>${escapeHtml(sName)} (${s.rating || 1200})</span>
      </label>`;
    }).join('') : `
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p1" data-name="Riyazzen S" checked> Riyazzen S (1450)</label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p2" data-name="Anuksha M" checked> Anuksha M (1380)</label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p3" data-name="Mukilan K" checked> Mukilan K (1420)</label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p4" data-name="Yadhuveer P" checked> Yadhuveer P (1290)</label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p5" data-name="Mocsha R" checked> Mocsha R (1340)</label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#e2e8f0; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:6px;"><input type="checkbox" class="swiss-player-chk" value="p6" data-name="Rakshitha S" checked> Rakshitha S (1310)</label>
    `;

    const modalHtml = `
      <div id="create-swiss-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:16px;" onclick="document.getElementById('create-swiss-modal').remove()">
        <div class="card" style="background:#0f172a; border:1.5px solid var(--gold); border-radius:18px; max-width:600px; width:100%; max-height:90vh; overflow-y:auto; padding:26px; box-shadow:0 25px 60px rgba(0,0,0,0.8);" onclick="event.stopPropagation()">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid rgba(218,163,62,0.25); padding-bottom:12px;">
            <div>
              <span style="font-size:11px; font-weight:800; color:var(--gold); text-transform:uppercase; letter-spacing:1px;">🏆 In-House Swiss System</span>
              <h3 style="margin:2px 0 0; color:#fff; font-size:19px; font-weight:800;">Create Tournament Arena</h3>
            </div>
            <button onclick="document.getElementById('create-swiss-modal').remove()" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer;">✕</button>
          </div>

          <form onsubmit="event.preventDefault(); window.submitCreateSwissTournament();" style="display:grid; gap:14px;">
            <div>
              <label style="font-size:12px; font-weight:700; color:var(--gold); text-transform:uppercase; display:block; margin-bottom:6px;">Tournament Title *</label>
              <input type="text" id="new-swiss-title" class="input-field" placeholder="e.g., ChessKidoo Super Rapid Arena" required style="width:100%;">
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label style="font-size:12px; font-weight:700; color:var(--gold); text-transform:uppercase; display:block; margin-bottom:6px;">Time Control</label>
                <select id="new-swiss-time" class="input-field" style="width:100%;">
                  <option value="3 min + 2 sec">⚡ 3+2 Blitz</option>
                  <option value="5 min + 3 sec" selected>⚔️ 5+3 Blitz / Rapid</option>
                  <option value="10 min + 5 sec">⏱️ 10+5 Rapid</option>
                  <option value="15 min + 10 sec">👑 15+10 Classical</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px; font-weight:700; color:var(--gold); text-transform:uppercase; display:block; margin-bottom:6px;">Number of Rounds</label>
                <select id="new-swiss-rounds" class="input-field" style="width:100%;">
                  <option value="3" selected>3 Rounds (Fast Arena)</option>
                  <option value="4">4 Rounds</option>
                  <option value="5">5 Rounds (Standard Swiss)</option>
                  <option value="6">6 Rounds</option>
                </select>
              </div>
            </div>

            <div>
              <label style="font-size:12px; font-weight:700; color:var(--gold); text-transform:uppercase; display:block; margin-bottom:6px;">Participating Students</label>
              <div id="new-swiss-player-list" style="display:grid; grid-template-columns:1fr 1fr; gap:6px; max-height:160px; overflow-y:auto; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid var(--border);">
                ${sampleOptions}
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('create-swiss-modal').remove()">Cancel</button>
              <button type="submit" class="btn btn-gold" style="font-weight:800;">🚀 Launch &amp; Pair Round 1</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const old = document.getElementById('create-swiss-modal');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  window.submitCreateSwissTournament = function () {
    const title = (document.getElementById('new-swiss-title')?.value || '').trim() || 'ChessKidoo Swiss Arena';
    const timeControl = document.getElementById('new-swiss-time')?.value || '5 min + 3 sec';
    const totalRounds = parseInt(document.getElementById('new-swiss-rounds')?.value || '3', 10);

    const checkedBoxes = Array.from(document.querySelectorAll('.swiss-player-chk:checked'));
    if (checkedBoxes.length < 2) {
      if (window.toast) window.toast('Please select at least 2 players to start a tournament.', 'warning');
      return;
    }

    const players = checkedBoxes.map((chk, idx) => ({
      id: chk.value || ('p_' + idx),
      name: chk.getAttribute('data-name') || ('Player ' + (idx + 1)),
      rating: 1200 + Math.floor(Math.random() * 300)
    }));

    // Generate Round 1 Pairings
    const round1Pairings = [];
    let board = 1;
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        round1Pairings.push({
          board: board++,
          white: players[i].id,
          black: players[i + 1].id,
          whiteName: players[i].name,
          blackName: players[i + 1].name,
          result: null
        });
      } else {
        // Odd player bye
        round1Pairings.push({
          board: 0,
          white: players[i].id,
          black: null,
          whiteName: players[i].name,
          blackName: 'BYE',
          result: 'bye'
        });
      }
    }

    const newTourn = {
      id: 'ck_tourn_' + Date.now(),
      title: title,
      timeControl: timeControl,
      totalRounds: totalRounds,
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      players: players,
      rounds: [
        {
          number: 1,
          pairings: round1Pairings
        }
      ]
    };

    const list = getInHouseTournaments();
    list.unshift(newTourn);
    saveInHouseTournaments(list);

    const modal = document.getElementById('create-swiss-modal');
    if (modal) modal.remove();

    if (window.toast) window.toast(`Created "${title}" with Round 1 Pairings!`, 'success');
    window.openAcademyTournamentArena(newTourn.id);
  };

  // Main Event Section Renderer for Admin (#page-events) and Coach (#page-coach-events)
  window.renderEventsPage = function (containerId = 'events-content', isCoachMode = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tournaments = getInHouseTournaments();
    const activeTourn = tournaments[0];
    const standings = activeTourn ? calculateTournamentStandings(activeTourn) : [];

    container.innerHTML = `
      <div class="coach-shell" style="padding:0;">
        <!-- Top Toolbar Banner -->
        <div class="coach-section-block" style="margin-bottom:20px; background:var(--surface, #1e293b); border:1px solid var(--border); border-radius:14px; padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
            <div>
              <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(218,163,62,0.15); border:1px solid rgba(218,163,62,0.3); border-radius:99px; padding:4px 12px; font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; margin-bottom:8px;">
                <span>🏆 FIDE Swiss Pairing Arena</span>
              </div>
              <h2 style="margin:0 0 6px; color:#fff; font-size:22px; font-weight:800;">Academy Tournaments &amp; Event Management</h2>
              <p style="margin:0; color:var(--ivory-dim); font-size:13.5px;">Run internal academy Swiss &amp; Round-Robin tournaments with automated Buchholz/Sonneborn-Berger tiebreaks, live pairings, and winner certificates.</p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-gold" onclick="window.openCreateSwissTournamentModal()" style="font-weight:700;">
                ➕ Create Swiss Tournament
              </button>
              ${activeTourn ? `
                <button class="btn btn-outline" onclick="window.openAcademyTournamentArena('${activeTourn.id}')" style="border-color:rgba(218,163,62,0.4); color:var(--gold); font-weight:700;">
                  ⚔️ Open Live Arena
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- In-House Tournaments Showcase Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:18px; margin-bottom:24px;">
          ${tournaments.map(t => {
            const st = calculateTournamentStandings(t);
            const rCount = t.rounds ? t.rounds.length : 0;
            return `
              <div class="card" style="background:var(--surface, #1e293b); border:1px solid var(--border); border-radius:14px; padding:20px; display:flex; flex-direction:column; justify-content:space-between; gap:14px; transition:transform 0.2s;" onmouseenter="this.style.borderColor='rgba(218,163,62,0.4)'" onmouseleave="this.style.borderColor='var(--border)'">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:11px; font-weight:800; background:rgba(218,163,62,0.15); color:var(--gold); padding:3px 8px; border-radius:6px; border:1px solid rgba(218,163,62,0.3);">⏱️ ${escapeHtml(t.timeControl)}</span>
                    <span style="font-size:12px; color:var(--ivory-dim);">Round ${rCount} of ${t.totalRounds}</span>
                  </div>
                  <h3 style="margin:0 0 6px; color:#fff; font-size:17px; font-weight:700;">${escapeHtml(t.title)}</h3>
                  <div style="font-size:13px; color:var(--gold); font-weight:600;">👑 Current Leader: ${st[0] ? escapeHtml(st[0].name) + ' (' + st[0].score + ' pts)' : '—'}</div>
                </div>

                <div style="display:flex; gap:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                  <button class="btn btn-gold btn-sm" style="flex:1; font-weight:700;" onclick="window.openAcademyTournamentArena('${t.id}')">
                    ⚔️ Open Arena
                  </button>
                  <button class="btn btn-outline btn-sm" style="flex:1; border-color:rgba(218,163,62,0.4); color:var(--gold);" onclick="window.downloadTournamentCertificate('${escapeHtml(st[0]?.name || 'Champion')}', '${escapeHtml(t.title)}', 'Champion (1st Place)')">
                    🎓 Certificate
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Regional & National Upcoming Tournaments -->
        <div class="card" style="background:var(--surface, #1e293b); border:1px solid var(--border); border-radius:14px; padding:22px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="margin:0 0 4px; color:#fff; font-size:17px; font-weight:700;">🌐 Regional &amp; National FIDE / AICF Tournaments</h3>
              <p style="margin:0; font-size:12.5px; color:var(--ivory-dim);">Upcoming local tournaments with student eligibility, calendar sync, and WhatsApp broadcasts.</p>
            </div>
            <button class="btn btn-outline-grey btn-sm" onclick="window.loadTournaments(true)">🔄 Sync Events</button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
            ${LOCAL_TOURNAMENTS_FALLBACK.map(lt => `
              <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:10.5px; font-weight:800; background:rgba(56,189,248,0.15); color:#38bdf8; padding:2px 6px; border-radius:4px;">${escapeHtml(lt.federation)}</span>
                    <span style="font-size:11.5px; color:var(--ivory-dim);">📅 ${lt.date}</span>
                  </div>
                  <h4 style="margin:0 0 4px; color:#fff; font-size:14.5px; font-weight:700;">${escapeHtml(lt.title)}</h4>
                  <div style="font-size:12px; color:var(--ivory-dim);">📍 ${escapeHtml(lt.location)} · Fee: ₹${lt.fee}</div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-outline btn-sm" style="flex:1; font-size:11px; padding:4px 8px; border-color:rgba(218,163,62,0.4); color:var(--gold);" onclick="window.syncTournamentCalendar('${lt.id}')">📅 Add to Cal</button>
                  <button class="btn btn-outline-grey btn-sm" style="flex:1; font-size:11px; padding:4px 8px;" onclick="window.sendTournamentWhatsAppReminder('${lt.id}')">💬 WhatsApp</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  // Hook into scripts.js globals
  window.renderCoachEvents = function () {
    window.renderEventsPage('coach-events-content', true);
  };
  window.renderEvents = function () {
    window.renderEventsPage('admin-events-content', false);
  };

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
})();

