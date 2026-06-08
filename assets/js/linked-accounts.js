/* assets/js/linked-accounts.js
   ChessKidoo — External API Integration (Lichess & Chess.com) */

window.CK = window.CK || {};

CK.linkedAccounts = (() => {
  
  /**
   * Fetch Lichess user stats from the official API.
   * @param {string} username 
   * @returns {Promise<Object>} { rapid: number, blitz: number }
   */
  async function fetchLichess(username) {
    if (!username) return null;
    try {
      const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        rapid: data.perfs?.rapid?.rating || 0,
        blitz: data.perfs?.blitz?.rating || 0
      };
    } catch (e) {
      console.warn('Lichess fetch failed', e);
      return null;
    }
  }

  /**
   * Fetch Chess.com user stats from the public API.
   * @param {string} username 
   * @returns {Promise<Object>} { rapid: number, blitz: number }
   */
  async function fetchChesscom(username) {
    if (!username) return null;
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        rapid: data.chess_rapid?.last?.rating || 0,
        blitz: data.chess_blitz?.last?.rating || 0
      };
    } catch (e) {
      console.warn('Chess.com fetch failed', e);
      return null;
    }
  }

  /**
   * Links external accounts to the current user profile.
   */
  async function linkAccounts(lichessUser, chesscomUser) {
    if (!CK.currentUser) {
      CK.showToast('You must be logged in to link accounts', 'warning');
      return;
    }
    const updates = {};
    if (lichessUser !== undefined) updates.lichess_username = lichessUser;
    if (chesscomUser !== undefined) updates.chesscom_username = chesscomUser;
    
    await CK.db.updateProfile(CK.currentUser.id || CK.currentUser.userid, updates);
    
    // Update local currentUser reference
    CK.currentUser = { ...CK.currentUser, ...updates };
    CK.showToast('Accounts linked successfully! Your stats will sync automatically.', 'success');
  }

  return {
    fetchLichess,
    fetchChesscom,
    linkAccounts
  };
})();
