/* assets/js/gmeet-api.js --------------------------------------------------
   ChessKidoo Google Meet compatibility wrapper.

   This file intentionally does not ship any Google service-account credentials.
   Real Meet creation should be handled by the Supabase Edge Function through
   CK.gmeetScheduler.createMeet(). The methods here provide safe fallbacks for
   older code paths that still call CK.gmeet directly.
------------------------------------------------------------------------ */

window.CK = window.CK || {};

CK.gmeet = (() => {
  function _fallbackLink() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const r = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
  }

  async function createMeetSpace() {
    return _fallbackLink();
  }

  async function getMeetParticipants() {
    return [];
  }

  async function getMeetRecordings() {
    return [];
  }

  return { createMeetSpace, getMeetParticipants, getMeetRecordings };
})();
