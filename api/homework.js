// api/homework.js
// ChessKidoo Academy Homework Endpoint — Persistent Supabase DB backed

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-portal-student-id'
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vseombfkrvpffnpgbsnk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// In-memory fallback cache
let assignmentsCache = [];
let submissionsCache = [];

async function sbFetch(path, options = {}) {
  if (!supabaseKey) return null;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...options, headers });
    return res;
  } catch (e) {
    console.warn('[Homework API] Supabase request note:', e.message);
    return null;
  }
}

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(request.url || '/', 'http://localhost');
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const view = url.searchParams.get('view');

  // --- GET ---
  if (request.method === 'GET') {
    if (view === 'submissions') {
      try {
        const sbRes = await sbFetch('homework_submissions?select=*&order=created_at.desc');
        if (sbRes && sbRes.ok) {
          const list = await sbRes.json();
          if (Array.isArray(list)) {
            submissionsCache = list;
            return jsonResponse({ data: list, total: list.length });
          }
        }
      } catch (_) {}
      return jsonResponse({ data: submissionsCache, total: submissionsCache.length });
    }

    if (id) {
      try {
        const sbRes = await sbFetch(`homework_assignments?id=eq.${encodeURIComponent(id)}&select=*`);
        if (sbRes && sbRes.ok) {
          const list = await sbRes.json();
          if (Array.isArray(list) && list.length > 0) return jsonResponse(list[0]);
        }
      } catch (_) {}
      const a = assignmentsCache.find(x => String(x.id) === String(id));
      if (a) return jsonResponse(a);
      return jsonResponse({ error: 'Not found' }, 404);
    }

    try {
      const sbRes = await sbFetch('homework_assignments?select=*&order=created_at.desc');
      if (sbRes && sbRes.ok) {
        const list = await sbRes.json();
        if (Array.isArray(list)) {
          assignmentsCache = list;
          return jsonResponse({ data: list, total: list.length });
        }
      }
    } catch (_) {}
    return jsonResponse({ data: assignmentsCache, total: assignmentsCache.length });
  }

  // --- POST ---
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    // Submit homework
    if (action === 'submit') {
      const studentId = body.student_id || url.searchParams.get('student_id');
      const assignmentId = body.assignment_id || url.searchParams.get('assignment_id');
      if (!studentId || !assignmentId) {
        return jsonResponse({ error: 'Student ID and Assignment ID are required' }, 400);
      }

      const submissionRecord = {
        assignment_id: String(assignmentId),
        student_id: String(studentId),
        submission_text: body.submission_text || '',
        submission_url: body.submission_url || '',
        file_urls: Array.isArray(body.file_urls) ? body.file_urls : (body.file_urls ? [body.file_urls] : []),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const sbRes = await sbFetch('homework_submissions', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(submissionRecord)
        });
        if (sbRes && sbRes.ok) {
          const inserted = await sbRes.json();
          const rec = Array.isArray(inserted) ? inserted[0] : inserted;
          return jsonResponse({ data: rec, success: true }, 201);
        }
      } catch (e) {
        console.warn('[Homework API] Supabase submission insert note:', e.message);
      }

      // Memory fallback
      const existingIdx = submissionsCache.findIndex(s => String(s.assignment_id) === String(assignmentId) && String(s.student_id) === String(studentId));
      submissionRecord.id = existingIdx >= 0 ? submissionsCache[existingIdx].id : `sub_${Date.now()}`;
      if (existingIdx >= 0) submissionsCache[existingIdx] = submissionRecord;
      else submissionsCache.unshift(submissionRecord);

      return jsonResponse({ data: submissionRecord, success: true }, 201);
    }

    // Create assignment
    const title = String(body.title || '').trim();
    if (!title) return jsonResponse({ error: 'Title is required' }, 400);

    const assignmentRecord = {
      id: body.id || `hw_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title,
      description: String(body.description || '').trim(),
      due_date: body.due_date || null,
      status: body.status || 'active',
      target_type: body.target_type || 'student',
      student_id: body.student_id ? String(body.student_id) : null,
      batch_id: body.batch_id ? String(body.batch_id) : null,
      coach_id: body.coach_id ? String(body.coach_id) : null,
      created_by: body.created_by || body.coach_id || null,
      questions_files: body.questions_files || body.attachment_urls || [],
      attachment_urls: body.attachment_urls || body.questions_files || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const sbRes = await sbFetch('homework_assignments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(assignmentRecord)
      });
      if (sbRes && sbRes.ok) {
        const inserted = await sbRes.json();
        const rec = Array.isArray(inserted) ? inserted[0] : inserted;
        assignmentsCache.unshift(rec);
        return jsonResponse({ data: rec, success: true }, 201);
      }
    } catch (e) {
      console.warn('[Homework API] Supabase assignment insert note:', e.message);
    }

    assignmentsCache.unshift(assignmentRecord);
    return jsonResponse({ data: assignmentRecord, success: true }, 201);
  }

  // --- PUT / PATCH ---
  if (request.method === 'PUT' || request.method === 'PATCH') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    if (action === 'review') {
      if (!id) return jsonResponse({ error: 'Submission ID is required for review' }, 400);
      const updates = {
        status: body.status || 'approved',
        feedback: body.feedback || '',
        score: body.score !== undefined && body.score !== '' ? Number(body.score) : null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const sbRes = await sbFetch(`homework_submissions?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(updates)
        });
        if (sbRes && sbRes.ok) {
          const updated = await sbRes.json();
          return jsonResponse({ data: Array.isArray(updated) ? updated[0] : updated, success: true });
        }
      } catch (_) {}

      const idx = submissionsCache.findIndex(s => String(s.id) === String(id));
      if (idx >= 0) {
        submissionsCache[idx] = { ...submissionsCache[idx], ...updates };
        return jsonResponse({ data: submissionsCache[idx], success: true });
      }
      return jsonResponse({ error: 'Submission not found' }, 404);
    }

    if (id) {
      const updates = {
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.description !== undefined ? { description: String(body.description).trim() } : {}),
        ...(body.due_date !== undefined ? { due_date: body.due_date || null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        updated_at: new Date().toISOString()
      };

      try {
        const sbRes = await sbFetch(`homework_assignments?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(updates)
        });
        if (sbRes && sbRes.ok) {
          const updated = await sbRes.json();
          return jsonResponse({ data: Array.isArray(updated) ? updated[0] : updated, success: true });
        }
      } catch (_) {}

      const idx = assignmentsCache.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) {
        assignmentsCache[idx] = { ...assignmentsCache[idx], ...updates };
        return jsonResponse({ data: assignmentsCache[idx], success: true });
      }
      return jsonResponse({ error: 'Assignment not found' }, 404);
    }

    return jsonResponse({ error: 'ID is required' }, 400);
  }

  // --- DELETE ---
  if (request.method === 'DELETE') {
    if (!id) return jsonResponse({ error: 'ID is required' }, 400);

    if (action === 'submission') {
      try {
        await sbFetch(`homework_submissions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch (_) {}
      submissionsCache = submissionsCache.filter(s => String(s.id) !== String(id));
      return jsonResponse({ success: true });
    }

    try {
      await sbFetch(`homework_submissions?assignment_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      await sbFetch(`homework_assignments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}
    assignmentsCache = assignmentsCache.filter(a => String(a.id) !== String(id));
    submissionsCache = submissionsCache.filter(s => String(s.assignment_id) !== String(id));
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export default async function handler(req, res) {
  if (req && typeof req.headers?.get !== 'function' && res && typeof res.status === 'function') {
    const method = req.method || 'GET';
    const rawUrl = req.url || '/';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `http://localhost${rawUrl}`;
    const urlObj = new URL(fullUrl);
    if (req.query) {
      Object.entries(req.query).forEach(([k, v]) => {
        if (v !== undefined) urlObj.searchParams.set(k, String(v));
      });
    }

    const headers = new Headers();
    Object.entries(req.headers || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(val => headers.append(k, val));
      else if (v) headers.set(k, String(v));
    });

    const webReq = new Request(urlObj.toString(), {
      method,
      headers,
      body: (method !== 'GET' && method !== 'HEAD' && req.body) ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined
    });

    const webRes = await handleRequest(webReq);
    let data;
    try {
      data = await webRes.json();
    } catch (_) {
      data = {};
    }
    return res.status(webRes.status).json(data);
  }
  return handleRequest(req);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
