// Serverless handler for Chess.com user clubs and tournaments
export default async function chesscomClubsHandler(request) {
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

    const [clubsRes, tournamentsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/clubs`, { headers }),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/tournaments`, { headers })
    ]);

    const clubsData = clubsRes.ok ? await clubsRes.json() : { clubs: [] };
    const tournamentsData = tournamentsRes.ok ? await tournamentsRes.json() : { finished: [] };

    return new Response(JSON.stringify({
      clubs: clubsData.clubs || [],
      tournaments: (tournamentsData.finished || []).slice(0, 10)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch clubs/tournaments', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
