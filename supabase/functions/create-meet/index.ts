// supabase/functions/create-meet/index.ts
// -----------------------------------------------------------------------------
// ChessKidoo — Secure Google Meet space creator.
//
// Replaces the in-browser service-account key (which must NOT ship to clients).
// Mints a Google OAuth token from the service account and creates a Meet space,
// returning { meetingUri }.
//
// Required secrets (set once, never committed):
//   supabase secrets set GOOGLE_SA_CLIENT_EMAIL="chesskidoo-academy@<proj>.iam.gserviceaccount.com"
//   supabase secrets set GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//
// Deploy:
//   supabase functions deploy create-meet --no-verify-jwt
// -----------------------------------------------------------------------------

const CLIENT_EMAIL = Deno.env.get("GOOGLE_SA_CLIENT_EMAIL") ?? "";
const PRIVATE_KEY = (Deno.env.get("GOOGLE_SA_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(s: string): string { return b64url(new TextEncoder().encode(s)); }

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64urlStr(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/meetings.space.created",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signingInput = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error("token: " + (await res.text()));
  const j = await res.json();
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return json({ error: "Service account secrets not configured" }, 500);
  }
  try {
    const token = await getAccessToken();
    const res = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return json({ error: "meet: " + (await res.text()) }, 502);
    const space = await res.json();
    return json({ meetingUri: space.meetingUri, name: space.name });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
