/* assets/js/router.js -----------------------------------------------------
   SPA Router — delegates to main.js CK.showPage, adds auth guards
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  CK.showHome  = () => CK.showPage('landing-page');
  CK.showLogin = () => CK.showPage('login-page');

  CK.checkAuth = () => {
    let u = CK.currentUser;
    if (!u) {
      const stored = localStorage.getItem('ck_user');
      if (stored) {
        try { u = JSON.parse(stored); CK.currentUser = u; } catch(e){}
      }
    }
    return u;
  };

  CK.handleRoute = () => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'home') {
      // If a user is already logged in, keep them in their portal instead
      // of bouncing them to the public landing page on refresh.
      const u = CK.checkAuth();
      if (u && u.role) {
        const role = String(u.role).toLowerCase();
        CK.showPage(`${role}-page`);
        setTimeout(() => {
          if (role === 'admin'   && CK.admin)   CK.admin.init();
          if (role === 'student' && CK.student) CK.student.init();
          if (role === 'coach'   && CK.coach)   CK.coach.init();
          if (role === 'parent'  && CK.parents) CK.parents.init();
        }, 100);
      } else {
        CK.showHome();
      }
      return;
    }
    if (hash === 'login') {
      CK.showLogin();
      return;
    }
    if (hash === 'arena') {
      CK.navigate('arena');
      return;
    }
    if (hash === 'more-games') {
      CK.navigate('more-games');
      return;
    }
    if (['admin', 'student', 'coach', 'parent'].includes(hash)) {
      const u = CK.checkAuth();
      if (!u || String(u.role || '').toLowerCase() !== hash) {
        CK.showToast('Please log in to access this portal.', 'warning');
        CK.showLogin();
      } else {
        CK.showPage(`${hash}-page`);
        setTimeout(() => {
          if (hash === 'admin'   && CK.admin)   CK.admin.init();
          if (hash === 'student' && CK.student) CK.student.init();
          if (hash === 'coach'   && CK.coach)   CK.coach.init();
          if (hash === 'parent'  && CK.parents) CK.parents.init();
        }, 100);
      }
      return;
    }
    // Check if it's a landing page section
    const landingSections = ['features', 'levels', 'coaches', 'achievements', 'about', 'reviews', 'pricing', 'faq'];
    if (landingSections.includes(hash)) {
      CK.navigate(hash);
      return;
    }
    CK.showHome();
  };

  window.addEventListener('popstate', CK.handleRoute);
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(CK.handleRoute, 50);
  });

})();