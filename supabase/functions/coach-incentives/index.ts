import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token, x-portal-role, x-user-role'
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ── Coach incentives / special bonuses ──────────────────────────────────────
// Complements the browser-local `chesskidoo_coach_bonuses` cache so payroll is
// durable across devices:
//   GET            → latest incentives (limit 500)
//   POST / PUT     → upsert one incentive record (id required or generated)
//   DELETE?id=     → remove an incentive
// Auth mirrors the homework function: anon-key requests are allowed (the
// function is RLS-gated on the table itself with portal_all_access).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || '';

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials');
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
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (req.method === 'GET') {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '500')));
      const coachId = url.searchParams.get('coach_id');
      const month = url.searchParams.get('month');

      let query = supabase
        .from('coach_incentives')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (coachId) query = query.eq('coach_id', coachId);
      if (month) query = query.eq('month', month);

      const { data, error } = await query;
      if (error) {
        console.warn('[CoachIncentives] GET error:', error.message);
        return jsonResponse({ data: [], total: 0 });
      }
      return jsonResponse({ data: data || [], total: (data || []).length });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      const coachId = body.coach_id;
      const month = body.month;
      if (!coachId || !month) {
        return jsonResponse({ error: 'coach_id and month are required' }, 400);
      }
      const row = {
        id: body.id || crypto.randomUUID(),
        coach_id: String(coachId),
        coach_name: body.coach_name || null,
        month: String(month),
        amount: Number(body.amount) || 0,
        category: body.category || null,
        title: body.title || 'Incentive',
        status: body.status || 'Included in Salary',
        date: body.date || null,
        notes: body.notes || null
      };
      if (row.amount <= 0) return jsonResponse({ error: 'amount must be greater than 0' }, 400);

      const { data, error } = await supabase
        .from('coach_incentives')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        console.warn('[CoachIncentives] upsert error:', error.message);
        return jsonResponse({ error: 'Failed to save incentive: ' + error.message }, 500);
      }
      return jsonResponse({ data, success: true }, 201);
    }

    if (req.method === 'DELETE') {
      if (!id) return jsonResponse({ error: 'ID required' }, 400);
      const { error } = await supabase.from('coach_incentives').delete().eq('id', id);
      if (error) {
        console.warn('[CoachIncentives] delete error:', error.message);
        return jsonResponse({ error: 'Failed to delete incentive: ' + error.message }, 500);
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err: any) {
    console.error('[CoachIncentives] unexpected error:', err);
    return jsonResponse({ error: err?.message || String(err) }, 500);
  }
});
