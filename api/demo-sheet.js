import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
};

const DEFAULT_SHEET_ID = '1AG6Mvpctz6TFzCRGa1-6Qz0V1cl0NDI-QqxINHPn5mU';
const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit?usp=sharing`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const parentName = String(body.parentName || body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const childName = String(body.childName || '').trim();
  const childAge = String(body.childAge || body.age || '').trim();
  const childDetails = String(body.childDetails || [childName, childAge ? `Age ${childAge}` : ''].filter(Boolean).join(' ') || '').trim();
  const city = String(body.city || '').trim() || 'Not specified';
  const level = String(body.level || 'Beginner').trim();
  const mode = String(body.mode || 'Online Class').trim();
  const slot = String(body.slot || 'Evening (5 PM - 8 PM)').trim();
  const language = String(body.language || 'English').trim();
  const notes = String(body.notes || `Mode: ${mode} | Slot: ${slot} | Language: ${language}`).trim();
  const timestamp = body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  if (!parentName && !phone) {
    return jsonResponse({ error: 'Parent name or phone number is required' }, 400);
  }

  const sheetRowPayload = {
    timestamp,
    parentName,
    phone,
    childName,
    childAge,
    childDetails: childDetails || childAge,
    city,
    level,
    mode,
    slot,
    language,
    notes,
    sheetId: DEFAULT_SHEET_ID,
    sheetUrl: DEFAULT_SHEET_URL
  };

  let sheetSaved = false;
  let sheetError = null;

  // 1. Send to configured Google Apps Script Webhook URL if set
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || process.env.GOOGLE_WEBHOOK_URL || '';
  if (webhookUrl && webhookUrl.startsWith('https://script.google.com')) {
    try {
      const gRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetRowPayload),
        signal: AbortSignal.timeout(6000)
      });
      if (gRes.ok) {
        sheetSaved = true;
      }
    } catch (gErr) {
      sheetError = gErr.message;
      console.warn('[Demo Sheet API] Webhook post failed:', gErr);
    }
  }

  // 2. Persist to Supabase leads and messages tables
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://vseombfkrvpffnpgbsnk.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_DADHCm1eB-nASpQfSi5zvA_2rMZxCJT';

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    await supabase.from('leads').insert({
      name: parentName,
      phone,
      parent_name: parentName,
      child_age: childAge,
      city,
      level,
      language,
      notes: `${notes} | Sheet: ${DEFAULT_SHEET_ID}`,
      status: 'new',
      created_at: new Date().toISOString()
    }).catch(e => console.warn('[Demo Sheet API] Supabase leads insert warning:', e.message));

    const summaryMsg = `Parent Name: ${parentName}\nPhone: ${phone}\nChild Details: ${childDetails}\nCity: ${city}\nLevel: ${level}\nMode: ${mode}\nTime Slot: ${slot}\nPreferred Language: ${language}\nGoogle Sheet: ${DEFAULT_SHEET_URL}`;

    await supabase.from('messages').insert({
      sender_name: parentName,
      sender_type: 'parent',
      subject: 'New Demo Class Booking Enquiry',
      category: 'Demo Enquiry',
      message: summaryMsg,
      is_read: false,
      created_at: new Date().toISOString()
    }).catch(e => console.warn('[Demo Sheet API] Supabase messages insert warning:', e.message));

  } catch (sbErr) {
    console.warn('[Demo Sheet API] Supabase logging warning:', sbErr);
  }

  return jsonResponse({
    success: true,
    sheetSaved,
    sheetError,
    sheetId: DEFAULT_SHEET_ID,
    sheetUrl: DEFAULT_SHEET_URL,
    timestamp,
    message: 'Demo class booking logged successfully'
  });
}

// Node.js (req, res) fallback handler for Vercel
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Convert Node req to Web Request
  const body = req.body || {};
  const fakeReq = {
    json: async () => body
  };
  const webRes = await POST(fakeReq);
  const data = await webRes.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(webRes.status).json(data);
}
