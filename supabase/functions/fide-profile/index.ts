/**
 * Supabase Edge Function: fide-profile
 *
 * Server-side proxy for the FIDE API so the browser avoids CORS errors.
 * Tries two FIDE endpoints and returns normalised rating data.
 *
 * Deploy:
 *   supabase functions deploy fide-profile
 *
 * Usage (GET):
 *   /functions/v1/fide-profile?id=35027789
 *
 * Response (JSON):
 *   {
 *     fide_id:        "35027789",
 *     name:           "Magnus Carlsen",
 *     title:          "GM",
 *     federation:     "NOR",
 *     standard:       2830,
 *     rapid:          2834,
 *     blitz:          2886,
 *     profile_url:    "https://ratings.fide.com/profile/1503014"
 *   }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const rawId = url.searchParams.get('id') ?? '';
  const fideId = rawId.replace(/\D/g, '');
  if (!fideId) return json({ error: 'Missing or invalid FIDE ID' }, 400);

  /* ── Try app.fide.com API ────────────────────────────────────────────── */
  try {
    const res = await fetch(`https://app.fide.com/api/v1/client/profile/${fideId}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'ChessKidoo/1.0' },
    });
    if (res.ok) {
      const d = await res.json();
      return json({
        fide_id:     fideId,
        name:        d.name        ?? d.full_name   ?? null,
        title:       d.title       ?? null,
        federation:  d.federation  ?? d.country     ?? null,
        standard:    d.rating      ?? d.standard_rating ?? null,
        rapid:       d.rapid_rating  ?? null,
        blitz:       d.blitz_rating  ?? null,
        profile_url: `https://ratings.fide.com/profile/${fideId}`,
        source:      'app.fide.com',
      });
    }
  } catch (_) { /* fall through */ }

  /* ── Try ratings.fide.com HTML scrape as last resort ────────────────── */
  try {
    const res = await fetch(`https://ratings.fide.com/profile/${fideId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 ChessKidoo/1.0' },
    });
    if (res.ok) {
      const html = await res.text();
      const nameM   = html.match(/<div[^>]*profile-top-title[^>]*>\s*([^<]+)/i);
      const titleM  = html.match(/FIDE title.*?<span[^>]*>([A-Z]{2,3})<\/span>/i);
      const fedM    = html.match(/Federation.*?<span[^>]*>([A-Z]{3})<\/span>/i);
      const stdM    = html.match(/Standard.*?(\d{3,4})/i);
      const rapM    = html.match(/Rapid.*?(\d{3,4})/i);
      const blzM    = html.match(/Blitz.*?(\d{3,4})/i);
      return json({
        fide_id:    fideId,
        name:       nameM?.[1]?.trim()  ?? null,
        title:      titleM?.[1]?.trim() ?? null,
        federation: fedM?.[1]?.trim()   ?? null,
        standard:   stdM  ? parseInt(stdM[1])  : null,
        rapid:      rapM  ? parseInt(rapM[1])  : null,
        blitz:      blzM  ? parseInt(blzM[1])  : null,
        profile_url: `https://ratings.fide.com/profile/${fideId}`,
        source:     'ratings.fide.com',
      });
    }
  } catch (_) { /* fall through */ }

  return json({
    fide_id:     fideId,
    profile_url: `https://ratings.fide.com/profile/${fideId}`,
    source:      null,
    error:       'FIDE data temporarily unavailable — ID saved, ratings will sync later',
  }, 200);
});
