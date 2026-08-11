// Consolidated Chess.com proxy function.
// Public URLs: /api/chesscom-proxy, /api/chesscom-games-proxy, /api/chesscom-clubs-proxy

import profileHandler from './_lib/chesscom-profile.js';
import gamesHandler from './_lib/chesscom-games.js';
import clubsHandler from './_lib/chesscom-clubs.js';

const PATH_TYPES = {
  'chesscom-games-proxy': 'games',
  'chesscom-clubs-proxy': 'clubs',
  'chesscom-proxy': 'profile'
};

async function route(request) {
  const url = new URL(request.url, 'http://localhost');
  const pathKey = Object.keys(PATH_TYPES).find((k) => url.pathname.includes(k));
  const type = url.searchParams.get('type') || (pathKey ? PATH_TYPES[pathKey] : 'profile');

  switch (type) {
    case 'games':
      return gamesHandler(request);
    case 'clubs':
      return clubsHandler(request);
    case 'profile':
    default:
      return profileHandler(request);
  }
}

// Named exports: required for Vercel Web API fetch-style handlers
export const GET = route;
export const OPTIONS = route;
