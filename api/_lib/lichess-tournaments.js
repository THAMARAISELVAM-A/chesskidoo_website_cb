// Serverless handler for Lichess tournaments (Arenas)
export default async function lichessTournamentsHandler(request) {
  try {
    const headers = {
      'Accept': 'application/x-ndjson',
      'User-Agent': 'ChessKidoo-Admin/1.0 (chess academy management tool)',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    const target = 'https://lichess.org/api/tournament';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(target, { headers, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle 401/403/429 gracefully
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Lichess tournaments API requires authentication or rate limited', 
          status: response.status,
          tournaments: []
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Lichess tournaments API error', status: response.status }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const tournaments = [];

    for (const line of lines) {
      try {
        const t = JSON.parse(line);
        if (t.status === 10 || t.status === 20) {
          tournaments.push(t);
        }
      } catch (parseErr) {
        // Skip invalid lines
      }
    }

    return new Response(JSON.stringify({ tournaments }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=120, stale-while-revalidate=300'
      }
    });
  } catch (err) {
    console.error('Lichess tournaments proxy error:', err);
    const timedOut = err && err.name === 'AbortError';
    return new Response(JSON.stringify({
      error: timedOut ? 'Lichess tournaments request timed out' : 'Failed to fetch tournaments from Lichess',
      details: err.message,
      tournaments: []
    }), {
      status: timedOut ? 504 : 502,
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