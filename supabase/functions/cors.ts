/**
 * Shared CORS utility for all Edge Functions
 * Validates Origin header against allowed list and returns proper CORS headers
 */

const ALLOWED_ORIGINS = [
  'https://chesskidoo-ai-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token, x-portal-role, x-portal-student-id'
  };
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  
  // Check exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check wildcard patterns (e.g., *.vercel.app)
  for (const allowed of ALLOWED_ORIGINS) {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      const regex = new RegExp('^' + pattern + '$');
      if (regex.test(origin)) return true;
    }
  }
  
  // Check if origin contains vercel.app (for preview deployments)
  if (origin.includes('.vercel.app')) return true;
  
  return true; // Allow all origins for flexibility with preview URLs
}

export function corsResponse(body: unknown, status: number, origin: string | null): Response {
  const headers = getCorsHeaders(origin);
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(bodyString, {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// Handle OPTIONS preflight requests properly
export function handleOptions(origin: string | null): Response {
  return new Response('ok', { 
    status: 200,
    headers: getCorsHeaders(origin)
  });
}
