import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-role, x-portal-token, x-portal-student-id, x-user-role, x-student-id'
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
      if (studentId) query = query.eq('studentId', studentId);

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
        date: String(r.date || new Date().toISOString().split('T')[0]),
        status: String(r.status || 'present'),
        studentId: r.studentId || r.student_id || null,
        studentName: r.studentName || r.student_name || null,
        coachId: r.coachId || r.coach_id || null,
        coachName: r.coachName || r.coach_name || null,
        markedAt: r.markedAt || r.marked_at || new Date().toISOString(),
        notes: r.notes === undefined || r.notes === null ? null : String(r.notes),
        notesProvided: r.notes !== undefined && r.notes !== null,
        created_at: String(r.created_at || new Date().toISOString())
      })).filter(r => r.date && r.status);

      if (validRecords.length === 0) {
        return jsonResponse({ error: 'No valid attendance records provided. Required fields: date, status' }, 400);
      }

      // The table has UNIQUE (userid, date) only, so a plain insert appends a
      // second row every time a day is re-marked. Row identity for corrections
      // is (date, "studentId"): fetch existing rows for the incoming pairs,
      // update them, and insert only genuinely new ones.
      const withStudent: any[] = validRecords.filter(r => r.studentId);
      const withoutStudent: any[] = validRecords.filter(r => !r.studentId);
      const results: any[] = [];

      if (withoutStudent.length > 0) {
        const { data: inserted, error } = await supabase.from('attendance').insert(withoutStudent).select();
        if (error) {
          console.error('[Attendance] insert error:', error.message);
          return jsonResponse({ error: 'Failed to save attendance: ' + error.message }, 500);
        }
        if (inserted) results.push(...inserted);
      }

      if (withStudent.length > 0) {
        const dates = [...new Set(withStudent.map(r => r.date))];
        const studentIds = [...new Set(withStudent.map(r => String(r.studentId)))];
        const { data: existingRows } = await supabase
          .from('attendance')
          .select('id, date, "studentId"')
          .in('date', dates)
          .in('studentId', studentIds);

        const pairKey = (d: string, sid: string) => `${d}|${sid}`;
        const existingMap = new Map<string, string>();
        (existingRows || []).forEach((row: any) => {
          if (!row) return;
          existingMap.set(pairKey(String(row.date), String(row.studentId)), row.id);
        });

        const updates: any[] = [];
        const inserts: any[] = [];
        withStudent.forEach(r => {
          const existingId = existingMap.get(pairKey(r.date, String(r.studentId)));
          if (existingId) {
            const updateRow: Record<string, unknown> = {
              id: existingId,
              status: r.status,
              studentId: r.studentId,
              studentName: r.studentName,
              coachId: r.coachId,
              coachName: r.coachName,
              markedAt: r.markedAt
            };
            // Only overwrite notes when this save actually carried them, so a
            // status-only patch cannot wipe previously stored CW/HW notes.
            if (r.notesProvided) updateRow.notes = r.notes;
            updates.push(updateRow);
          } else {
            inserts.push(r);
          }
        });

        if (updates.length > 0) {
          const { data: updated, error } = await supabase.from('attendance').upsert(updates).select();
          if (error) {
            console.error('[Attendance] update error:', error.message);
            return jsonResponse({ error: 'Failed to update attendance: ' + error.message }, 500);
          }
          if (updated) results.push(...updated);
        }

        if (inserts.length > 0) {
          const { data: inserted, error } = await supabase.from('attendance').insert(inserts).select();
          if (error) {
            console.error('[Attendance] insert error:', error.message);
            return jsonResponse({ error: 'Failed to save attendance: ' + error.message }, 500);
          }
          if (inserted) results.push(...inserted);
        }
      }

      return jsonResponse({ success: true, count: results.length, data: results });
    }

    // PUT/PATCH - Update attendance record
    if (method === 'PUT' || method === 'PATCH') {
      let body: any = {};
      try { body = await req.json(); } catch (_e) {}

      const updateData: Record<string, unknown> = {};
      if (body.status !== undefined) updateData.status = String(body.status);
      if (body.date !== undefined) updateData.date = String(body.date);
      if (body.notes !== undefined) updateData.notes = String(body.notes);

      if (Object.keys(updateData).length === 0) {
        return jsonResponse({ error: 'No valid fields to update' }, 400);
      }

      const id = url.searchParams.get('id');
      let query = supabase.from('attendance').update(updateData);
      if (id) {
        query = query.eq('id', id);
      } else {
        return jsonResponse({ error: 'ID required' }, 400);
      }

      const { data, error } = await query.select();
      if (error) throw error;
      return jsonResponse({ success: true, data: data || [] });
    }

    // DELETE - Delete attendance record
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      const deleteStudentId = url.searchParams.get('student_id') || url.searchParams.get('studentId');
      const deleteDate = url.searchParams.get('date');
      
      let query = supabase.from('attendance').delete();
      if (id) {
        query = query.eq('id', id);
      } else if (deleteStudentId && deleteDate) {
        query = query.eq('studentId', deleteStudentId).eq('date', deleteDate);
      } else if (deleteStudentId) {
        query = query.eq('studentId', deleteStudentId);
      } else if (deleteDate) {
        query = query.eq('date', deleteDate);
      } else {
        return jsonResponse({ error: 'ID or student_id+date required' }, 400);
      }

      const { error } = await query;
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    return jsonResponse({ error: error.message || String(error) }, 500);
  }
});
