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

    if (!statsRes.ok) {
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
