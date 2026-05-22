/* assets/js/appwrite-adapter.js -------------------------------------------
   ChessKidoo — Appwrite Backend Adapter

   This is a compatibility layer. The whole app was written against a
   Supabase-style client (window.supabaseClient.from('table').select()...).
   Rather than rewrite 40+ data functions, this file builds an object with
   the SAME interface, backed by Appwrite. db.js / auth.js stay untouched.

   It is SAFE: every call still goes through db.js's try/catch → if Appwrite
   is unreachable or a collection is missing, the app falls back to its
   localStorage data exactly as before. No secret key is used here — the
   browser SDK authenticates with the public project ID only.
   ------------------------------------------------------------------------- */

(function () {
  const CK = window.CK = window.CK || {};
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.APPWRITE) || {};

  if (!window.Appwrite) {
    console.error('[ChessKidoo Appwrite] SDK not loaded — staying in offline/localStorage mode.');
    return;
  }
  if (!cfg.PROJECT_ID || !cfg.ENDPOINT) {
    console.error('[ChessKidoo Appwrite] Missing APP_CONFIG.APPWRITE settings.');
    return;
  }

  const { Client, Databases, Storage, Query, ID } = window.Appwrite;

  const client = new Client().setEndpoint(cfg.ENDPOINT).setProject(cfg.PROJECT_ID);
  const databases = new Databases(client);
  const storage   = new Storage(client);
  const DB     = cfg.DATABASE_ID || 'chesskidoo';
  const BUCKET = cfg.BUCKET_ID   || 'documents';

  // Tables whose primary key is NOT the document id ($id).
  const PK = { credentials: 'email', batch_links: 'batch_level' };

  const is404 = (e) => e && (e.code === 404 || /not found|could not be found/i.test(e.message || ''));

  /* Map an Appwrite document to the shape the app expects. */
  function mapDoc(table, d) {
    if (!d || typeof d !== 'object') return d;
    const out = { ...d };
    if ((PK[table] || 'id') === 'id') out.id = d.$id;
    if (out.created_at === undefined && d.$createdAt) out.created_at = d.$createdAt;
    delete out.$id; delete out.$collectionId; delete out.$databaseId;
    delete out.$permissions; delete out.$createdAt; delete out.$updatedAt;
    delete out.$sequence;
    return out;
  }

  /* Strip fields Appwrite manages / that aren't real attributes. */
  function cleanPayload(table, obj) {
    const out = {};
    Object.keys(obj || {}).forEach(k => {
      if (k.charAt(0) === '$') return;
      if (k === 'id' && (PK[table] || 'id') === 'id') return; // id -> $id
      if (obj[k] === undefined) return;
      out[k] = obj[k];
    });
    return out;
  }

  async function createDoc(table, id, data) {
    const docId = (id !== null && id !== undefined && id !== '') ? String(id) : ID.unique();
    return databases.createDocument(DB, table, docId, data);
  }
  async function updateDoc(table, id, data) {
    return databases.updateDocument(DB, table, String(id), data);
  }

  async function doUpsert(table, payload, onConflict) {
    const clean = cleanPayload(table, payload);
    const pk = PK[table] || 'id';

    if (onConflict) {
      const cols = String(onConflict).split(',').map(s => s.trim()).filter(Boolean);
      const q = cols.map(c => Query.equal(c === 'id' ? '$id' : c, [String(payload[c])]));
      q.push(Query.limit(1));
      const found = await databases.listDocuments(DB, table, q);
      if (found.documents.length) return updateDoc(table, found.documents[0].$id, clean);
      return createDoc(table, payload.id, clean);
    }

    if (pk === 'id') {
      const id = (payload.id !== null && payload.id !== undefined) ? String(payload.id) : null;
      if (id) {
        try { return await updateDoc(table, id, clean); }
        catch (e) { if (is404(e)) return createDoc(table, id, clean); throw e; }
      }
      return createDoc(table, null, clean);
    }

    // primary key is a regular field (credentials.email, batch_links.batch_level)
    const keyVal = payload[pk];
    const found = await databases.listDocuments(DB, table, [Query.equal(pk, [String(keyVal)]), Query.limit(1)]);
    if (found.documents.length) return updateDoc(table, found.documents[0].$id, clean);
    return createDoc(table, null, clean);
  }

  async function doDelete(table, filters) {
    if (filters.length === 1 && (filters[0][0] === 'id')) {
      await databases.deleteDocument(DB, table, String(filters[0][1]));
      return;
    }
    const q = filters.map(([c, v]) => Query.equal(c === 'id' ? '$id' : c, [String(v)]));
    q.push(Query.limit(200));
    const res = await databases.listDocuments(DB, table, q);
    for (const d of res.documents) {
      try { await databases.deleteDocument(DB, table, d.$id); } catch (e) { /* continue */ }
    }
  }

  /* ── Supabase-style query builder ── */
  function from(table) {
    const state = { table, op: 'select', filters: [], orders: [], single: false, payload: null, onConflict: null };

    async function exec() {
      try {
        if (state.op === 'select') {
          const q = [];
          for (const [c, v] of state.filters) q.push(Query.equal(c === 'id' ? '$id' : c, [normalize(v)]));
          for (const [c, dir] of state.orders) q.push(dir === 'desc' ? Query.orderDesc(c) : Query.orderAsc(c));
          q.push(Query.limit(200));
          const res  = await databases.listDocuments(DB, table, q);
          const docs = res.documents.map(d => mapDoc(table, d));
          return { data: state.single ? (docs[0] || null) : docs, error: null };
        }
        if (state.op === 'insert') {
          const clean = cleanPayload(table, state.payload);
          const r = await createDoc(table, state.payload && state.payload.id, clean);
          return { data: [mapDoc(table, r)], error: null };
        }
        if (state.op === 'upsert') {
          const r = await doUpsert(table, state.payload, state.onConflict);
          return { data: [mapDoc(table, r)], error: null };
        }
        if (state.op === 'delete') {
          await doDelete(table, state.filters);
          return { data: null, error: null };
        }
      } catch (e) {
        return { data: null, error: { message: (e && e.message) || String(e), code: e && e.code } };
      }
    }

    const builder = {
      select() { state.op = 'select'; return builder; },
      insert(obj) { state.op = 'insert'; state.payload = obj; return builder; },
      upsert(obj, opts) {
        state.op = 'upsert'; state.payload = obj;
        if (opts && opts.onConflict) state.onConflict = opts.onConflict;
        return builder;
      },
      delete() { state.op = 'delete'; return builder; },
      eq(col, val) { state.filters.push([col, val]); return builder; },
      order(col, opts) { state.orders.push([col, (opts && opts.ascending === false) ? 'desc' : 'asc']); return builder; },
      maybeSingle() { state.single = true; return exec(); },
      single() { state.single = true; return exec(); },
      then(resolve, reject) { return exec().then(resolve, reject); },
      catch(reject) { return exec().catch(reject); }
    };
    return builder;
  }

  function normalize(v) { return (typeof v === 'number') ? v : String(v); }

  /* ── Auth shim ──
     The app logs users in via its own SHA-256 'credentials' collection
     (see auth.js). We make Appwrite-Auth calls resolve "no session" so
     auth.js cleanly falls through to that credential check. */
  const auth = {
    async signInWithPassword() {
      return { data: null, error: { message: 'Using academy credential login.' } };
    },
    async getSession() { return { data: { session: null }, error: null }; },
    async getUser()    { return { data: { user: null }, error: null }; },
    async signOut()    { return { error: null }; },
    async signUp() {
      // Lets admin.js create a student profile with a generated id.
      return { data: { user: { id: 'student-' + Date.now() } }, error: null };
    },
    async resetPasswordForEmail() {
      return { error: { message: 'Please ask the academy admin to reset your password.' } };
    },
    async signInWithOAuth() {
      return { data: null, error: { message: 'Google sign-in is not enabled. Use email & password.' } };
    },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }
  };

  /* ── Storage shim ── */
  function storageFrom(/* bucket */) {
    return {
      async upload(path, file) {
        try {
          const f = await storage.createFile(BUCKET, ID.unique(), file);
          return { data: { path, id: f.$id }, error: null };
        } catch (e) {
          return { data: null, error: { message: (e && e.message) || 'Upload failed' } };
        }
      },
      getPublicUrl(path) {
        return { data: { publicUrl: path || '' } };
      },
      async remove() { return { data: null, error: null }; }
    };
  }

  /* Expose as window.supabaseClient so db.js / auth.js work unchanged. */
  window.supabaseClient = {
    from,
    auth,
    storage: { from: storageFrom },
    _appwrite: { client, databases, storage, DB, BUCKET }
  };
  window.appwriteClient = client;

  console.log('[ChessKidoo] Appwrite backend adapter ready (project ' + cfg.PROJECT_ID + ').');
})();
