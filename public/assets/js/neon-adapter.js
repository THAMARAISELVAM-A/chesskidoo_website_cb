/* assets/js/neon-adapter.js -----------------------------------------------
   ChessKidoo — Neon Data API backend adapter

   Neon's Data API is a PostgREST endpoint — the SAME protocol the app was
   originally built for (Supabase is also PostgREST). This adapter speaks
   PostgREST directly with plain fetch() and exposes the same interface the
   app expects (window.supabaseClient.from('table').select()/.upsert()...),
   so db.js and auth.js work UNCHANGED.

   SAFE: every call still passes through db.js's try/catch → if Neon is
   unreachable or not set up, the app falls back to its localStorage data.
   No database password is used here — the browser only talks to the public
   Data API URL.
   ------------------------------------------------------------------------- */

(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.NEON) || {};
  let BASE = (cfg.DATA_API_URL || '').replace(/\/+$/, '');
  const KEY = cfg.API_KEY || '';

  if (!BASE) {
    console.error('[ChessKidoo Neon] No DATA_API_URL configured — staying in offline/localStorage mode.');
    return;
  }

  /* ── Low-level PostgREST request ── */
  async function request(method, path, opts) {
    opts = opts || {};
    const headers = { 'Accept': 'application/json' };
    if (KEY) { headers['apikey'] = KEY; headers['Authorization'] = 'Bearer ' + KEY; }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.prefer) headers['Prefer'] = opts.prefer;

    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      return { data: null, error: { message: 'Network error: ' + ((e && e.message) || e) } };
    }

    let payload = null;
    const text = await res.text().catch(() => '');
    if (text) { try { payload = JSON.parse(text); } catch (e) { payload = text; } }

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: (payload && payload.message) || res.statusText || ('HTTP ' + res.status),
          code: res.status,
          details: payload
        }
      };
    }
    return { data: payload, error: null };
  }

  /* PostgREST filter value encoding: col=eq.value */
  function enc(v) { return encodeURIComponent(v == null ? '' : String(v)); }

  /* ── Supabase-style query builder ── */
  function from(table) {
    const state = { table, op: 'select', filters: [], orders: [], single: false, payload: null, onConflict: null };

    async function exec() {
      const tbl = encodeURIComponent(table);

      if (state.op === 'select') {
        const params = ['select=*'];
        for (const [c, v] of state.filters) params.push(enc(c) + '=eq.' + enc(v));
        for (const [c, dir] of state.orders) params.push('order=' + enc(c) + '.' + dir);
        params.push('limit=1000');
        const r = await request('GET', '/' + tbl + '?' + params.join('&'));
        if (r.error) return r;
        let rows = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);
        return { data: state.single ? (rows[0] || null) : rows, error: null };
      }

      if (state.op === 'insert' || state.op === 'upsert') {
        let path = '/' + tbl;
        let prefer = 'return=representation';
        if (state.op === 'upsert') {
          prefer = 'resolution=merge-duplicates,return=representation';
          if (state.onConflict) path += '?on_conflict=' + encodeURIComponent(state.onConflict);
        }
        const r = await request('POST', path, { body: state.payload, prefer });
        if (r.error) return r;
        return { data: Array.isArray(r.data) ? r.data : [r.data], error: null };
      }

      if (state.op === 'delete') {
        if (!state.filters.length) {
          return { data: null, error: { message: 'Refusing unfiltered delete' } };
        }
        const params = state.filters.map(([c, v]) => enc(c) + '=eq.' + enc(v));
        const r = await request('DELETE', '/' + tbl + '?' + params.join('&'));
        return { data: r.data, error: r.error };
      }
    }

    const builder = {
      select() { state.op = 'select'; return builder; },
      insert(obj) { state.op = 'insert'; state.payload = obj; return builder; },
      upsert(obj, o) {
        state.op = 'upsert'; state.payload = obj;
        if (o && o.onConflict) state.onConflict = o.onConflict;
        return builder;
      },
      delete() { state.op = 'delete'; return builder; },
      eq(col, val) { state.filters.push([col, val]); return builder; },
      order(col, o) { state.orders.push([col, (o && o.ascending === false) ? 'desc' : 'asc']); return builder; },
      maybeSingle() { state.single = true; return exec(); },
      single() { state.single = true; return exec(); },
      then(resolve, reject) { return exec().then(resolve, reject); },
      catch(reject) { return exec().catch(reject); }
    };
    return builder;
  }

  /* ── Auth shim ──
     Neon's Data API has no auth service. The app logs users in via its own
     SHA-256 'credentials' table (see auth.js); these calls resolve as
     "no session" so auth.js cleanly falls through to that credential check. */
  const auth = {
    async signInWithPassword() { return { data: null, error: { message: 'Using academy credential login.' } }; },
    async getSession() { return { data: { session: null }, error: null }; },
    async getUser()    { return { data: { user: null }, error: null }; },
    async signOut()    { return { error: null }; },
    async signUp()     { return { data: { user: { id: 'student-' + Date.now() } }, error: null }; },
    async resetPasswordForEmail() { return { error: { message: 'Please ask the academy admin to reset your password.' } }; },
    async signInWithOAuth() { return { data: null, error: { message: 'Google sign-in is not enabled. Use email & password.' } }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }
  };

  /* ── Storage shim ──
     Neon has no object storage. Uploads are recorded as metadata only (the
     document/material row still saves) so publishing never errors. Hosting
     the actual files is a separate post-launch task. */
  function storageFrom() {
    return {
      async upload(path)        { return { data: { path: path }, error: null }; },
      getPublicUrl(path)        { return { data: { publicUrl: path || '' } }; },
      async remove()            { return { data: null, error: null }; }
    };
  }

  /* Expose as window.supabaseClient so db.js / auth.js work unchanged. */
  window.supabaseClient = {
    from,
    auth,
    storage: { from: storageFrom },
    _neon: { base: BASE }
  };

  console.log('[ChessKidoo] Neon Data API adapter ready → ' + BASE);
})();
