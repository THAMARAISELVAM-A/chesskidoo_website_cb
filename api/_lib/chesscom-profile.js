// Serverless handler for Chess.com user profile and ratings stats
export default async function chesscomProfileHandler(request) {
  const url = new URL(request.url, 'http://localhost');
  const username = url.searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'username parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'ChessKidoo/1.0 (chess academy management tool)'
    };

    const [statsRes, profileRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, { headers }),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, { headers })
    ]);

    // Handle 401/403/429 gracefully - Chess.com may rate limit or require auth
    if (!statsRes.ok) {
      if (statsRes.status === 401 || statsRes.status === 403 || statsRes.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Chess.com API rate limited or requires authentication', 
          status: statsRes.status,
          stats: {},
          profile: {}
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (statsRes.status === 404) {
        return new Response(JSON.stringify({ error: 'Chess.com user not found', notFound: true }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Chess.com user not found' }), {
        status: statsRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stats = await statsRes.json();
    const profile = profileRes.ok ? await profileRes.json() : {};

    return new Response(JSON.stringify({ ...stats, ...profile }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Chess.com data', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
