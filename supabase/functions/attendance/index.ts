import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getClient();
    const url = new URL(req.url);
    const method = req.method;
    const date = url.searchParams.get('date');
    const studentId = url.searchParams.get('student_id');

    if (method === 'GET') {
      let query = supabase.from('attendance').select('*').order('date', { ascending: false });
      if (date) query = query.eq('date', date);
      if (studentId) query = query.eq('student_id', studentId);

      const { data, error } = await query;
      if (error) return jsonResponse({ data: [], error: error.message }, 200);

      return jsonResponse({ data: data || [], total: (data || []).length });
    }

    if (method === 'POST') {
      let body: any = [];
      try { body = await req.json(); } catch (_e) {}

      const records = Array.isArray(body) ? body : [body];
      const validRecords = records.map(r => ({
        id: r.id || crypto.randomUUID(),
        student_id: String(r.student_id || ''),
        date: String(r.date || new Date().toISOString().split('T')[0]),
        status: String(r.status || 'Present'),
        notes: String(r.notes || ''),
        created_at: String(r.created_at || new Date().toISOString())
      })).filter(r => r.student_id && r.date && r.status);

      if (validRecords.length === 0) {
        return jsonResponse({ error: 'No valid attendance records provided' }, 400);
      }

      const { data: upserted, error } = await supabase.from('attendance').upsert(validRecords).select();
      if (error) throw error;

      return jsonResponse({ success: true, count: (upserted || []).length, data: upserted });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    return jsonResponse({ error: error.message || String(error) }, 500);
  }
});
