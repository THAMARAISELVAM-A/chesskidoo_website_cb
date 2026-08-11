// Serverless handler for Chess.com user recent games archives
export default async function chesscomGamesHandler(request) {
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

    const archivesRes = await fetch(
      `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
      { headers }
    );

    if (!archivesRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch game archives' }), {
        status: archivesRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const archivesData = await archivesRes.json();
    const archives = archivesData.archives || [];

    if (archives.length === 0) {
      return new Response(JSON.stringify({ games: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const recentArchives = archives.slice(-2);
    const allGames = [];

    for (const archiveUrl of recentArchives) {
      try {
        const gamesRes = await fetch(archiveUrl, { headers });
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          allGames.push(...(gamesData.games || []));
        }
      } catch (e) {
        console.warn('[Chess.com Games] Failed to fetch archive:', archiveUrl, e.message);
      }
    }

    const simplified = allGames
      .sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
      .slice(0, 20)
      .map(g => ({
        url: g.url,
        time_control: g.time_control,
        time_class: g.time_class,
        rated: g.rated,
        end_time: g.end_time,
        white: {
          username: g.white?.username,
          rating: g.white?.rating,
          result: g.white?.result,
        },
        black: {
          username: g.black?.username,
          rating: g.black?.rating,
          result: g.black?.result,
        }
      }));

    return new Response(JSON.stringify({ games: simplified, total: allGames.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Chess.com games', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
