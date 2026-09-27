// Consolidated Lichess proxy function (Hobby plan allows max 12 functions).
// Public URLs are unchanged — vercel.json rewrites /api/lichess-proxy,
// /api/lichess-games-proxy, /api/lichess-extras-proxy and /api/test-lichess
// here with a ?type= param.

import profileHandler from './_lib/lichess-profile.js';
import gamesHandler from './_lib/lichess-games.js';
import extrasHandler from './_lib/lichess-extras.js';
import testHandler from './_lib/lichess-test.js';
import explorerHandler from './_lib/lichess-explorer.js';
import tournamentsHandler from './_lib/lichess-tournaments.js';

const PATH_TYPES = {
  'lichess-games-proxy': 'games',
  'lichess-extras-proxy': 'extras',
  'lichess-explorer-proxy': 'explorer',
  'lichess-tournaments-proxy': 'tournaments',
  'test-lichess': 'test',
  'lichess-proxy': 'profile'
};

async function route(request) {
  const url = new URL(request.url, 'http://localhost');

  if (url.searchParams.get('games') === '1') {
    return gamesHandler(request);
  }

  const pathKey = Object.keys(PATH_TYPES).find((k) => url.pathname.includes(k));
  const type = url.searchParams.get('type') || (pathKey ? PATH_TYPES[pathKey] : 'profile');

  switch (type) {
    case 'games':
      return gamesHandler(request);
    case 'extras':
      return extrasHandler(request);
    case 'explorer':
      return explorerHandler(request);
    case 'tournaments':
      return tournamentsHandler(request);
    case 'test':
      return testHandler(request);
    case 'profile':
    default:
      return profileHandler(request);
  }
}

// Named exports: required for Vercel to use the web fetch-style signature.
export const GET = route;
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
