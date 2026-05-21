/**
 * Supabase Edge Function: razorpay-order
 *
 * Creates a Razorpay order server-side so amount cannot be tampered with
 * on the client, then returns the order_id to the browser.
 *
 * Deploy:
 *   supabase functions deploy razorpay-order
 *
 * Secrets (set in Supabase Dashboard → Project Settings → Edge Function Secrets):
 *   RAZORPAY_KEY_ID       rzp_live_XXXXXXXXXXXXXXXX
 *   RAZORPAY_KEY_SECRET   <from Razorpay dashboard>
 *
 * Request body (JSON):
 *   { amount_inr: number, student_id: string, batch: string }
 *
 * Response (JSON):
 *   { order_id: string, amount: number, currency: "INR" }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID     = Deno.env.get('RAZORPAY_KEY_ID')     ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')        ?? '';
const SUPABASE_ANON_KEY   = Deno.env.get('SUPABASE_ANON_KEY')   ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: CORS });

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)
    return json({ error: 'Payment gateway not configured' }, 500);

  // Verify caller is a logged-in Supabase user
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  let body: { amount_inr?: number; student_id?: string; batch?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const amountPaise = Math.round((body.amount_inr ?? 0) * 100);
  if (amountPaise < 100) return json({ error: 'Amount too small' }, 400);
  if (amountPaise > 50_000_00) return json({ error: 'Amount too large' }, 400);

  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const receipt = `ck_${user.id.slice(0, 8)}_${Date.now()}`;

  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount:   amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        student_id: body.student_id ?? user.id,
        batch:      body.batch      ?? 'Chess Training',
        user_id:    user.id,
      },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.text();
    console.error('[razorpay-order] Razorpay error:', err);
    return json({ error: 'Order creation failed' }, 502);
  }

  const order = await rzpRes.json();
  return json({ order_id: order.id, amount: order.amount, currency: order.currency });
});
