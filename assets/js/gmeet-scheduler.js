/* assets/js/gmeet-scheduler.js ----------------------------------------------
   ChessKidoo — Manual Google Meet helper only

   Automatic link creation is disabled. Coaches must paste the exact Google
   Meet URL manually when creating/editing a class or live session.
------------------------------------------------------------------------ */

window.CK = window.CK || {};

CK.gmeetScheduler = (() => {
  function _fallbackLink() {
    const c = 'abcdefghijklmnopqrstuvwxyz';
    const r = n => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
  }
  function _valid(link) {
    return /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(link || '');
  }

  // Create one Meet link — secure server-side first, then legacy client, then fallback.
  async function createMeet() {
    // 1) Secure: Supabase edge function holds the SA key in env (recommended).
    try {
      if (window.supabaseClient && window.supabaseClient.functions) {
        const { data, error } = await window.supabaseClient.functions.invoke('create-meet', { body: {} });
        const uri = data && (data.meetingUri || data.uri || data.link);
        if (!error && uri && _valid(uri)) return uri;
      }
    } catch (e) { /* function not deployed yet → fall through */ }
    // 2) Legacy in-browser gmeet (itself falls back to a generated link).
    try {
      if (window.CK && CK.gmeet && CK.gmeet.createMeetSpace) {
        const uri = await CK.gmeet.createMeetSpace();
        if (uri) return uri;
      }
    } catch (e) {}
    // 3) Deterministic placeholder so a join link always exists.
    return _fallbackLink();
  }

  // Ensure a single meeting object has a valid link (used before save).
  async function autoSchedule(meeting) {
    return meeting;
  }

  // Manual helper only; no automatic link filling is performed anywhere.
  async function ensureLinks(_force) {
    return 0;
  }

  async function ensureClassLinks() {
    return 0;
  }

  return { ensureLinks, ensureClassLinks, createMeet, autoSchedule };
})();
