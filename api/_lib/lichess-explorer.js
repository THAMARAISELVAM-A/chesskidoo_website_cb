export default async function handler(request) {
  const startTime = Date.now();
  try {
    const url = new URL(request.url, 'http://localhost');
    const fen = url.searchParams.get('fen');
    const topGames = url.searchParams.get('topGames') || '3';
    const moves = url.searchParams.get('moves') || '4';

    if (!fen) {
      return new Response(JSON.stringify({ error: 'Missing fen parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userAgent = 'ChessKidoo-Admin/1.0 (chess academy management tool)';
    const headers = {
      'Accept': 'application/json',
      'User-Agent': userAgent,
      'Accept-Language': 'en-US,en;q=0.9'
    };

    const targetUrl = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=${encodeURIComponent(topGames)}&moves=${encodeURIComponent(moves)}`;

    const fetchWithTimeout = async (target, timeoutMs) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(target, { headers, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const res = await fetchWithTimeout(targetUrl, 6000);

    if (!res.ok) {
      // Handle 401/403 gracefully - Lichess explorer may require auth or have rate limits
      if (res.status === 401 || res.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'Lichess explorer requires authentication', 
          status: res.status,
          moves: [],
          white: 0,
          draws: 0,
          black: 0
        }), {
          status: 200, // Return 200 with empty data to prevent UI errors
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Lichess explorer error', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
