/**
 * Supabase Edge Function: send-demo-email
 *
 * Replaces the client-side EmailJS call so API keys never ship to the browser.
 * Deploy: supabase functions deploy send-demo-email
 * Secrets: supabase secrets set RESEND_API_KEY=re_...
 *
 * Request body (JSON):
 *   { name, phone, age, city }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ACADEMY_EMAIL  = Deno.env.get('ACADEMY_EMAIL')  ?? 'Chesskidoo37@gmail.com';
const ACADEMY_NAME   = Deno.env.get('ACADEMY_NAME')   ?? 'ChessKidoo Academy';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  let body: { name?: string; phone?: string; age?: string; city?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  const { name = 'Parent', phone = '—', age = '—', city = '—' } = body;

  if (!RESEND_API_KEY) {
    console.error('[send-demo-email] RESEND_API_KEY not set in secrets');
    return new Response('Server misconfiguration', { status: 500, headers: CORS });
  }

  const html = `
    <h2>New Demo Class Booking — ${ACADEMY_NAME}</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>Parent Name</strong></td><td>${escHtml(name)}</td></tr>
      <tr><td><strong>Phone / WhatsApp</strong></td><td>${escHtml(phone)}</td></tr>
      <tr><td><strong>Child's Age</strong></td><td>${escHtml(age)}</td></tr>
      <tr><td><strong>City</strong></td><td>${escHtml(city)}</td></tr>
    </table>
    <p style="margin-top:16px;color:#666;">Submitted from the ChessKidoo website booking form.</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    `${ACADEMY_NAME} <noreply@chesskidoo.com>`,
      to:      [ACADEMY_EMAIL],
      subject: `Demo Booking — ${name} (age ${age}, ${city})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-demo-email] Resend error:', err);
    return new Response('Email delivery failed', { status: 502, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
