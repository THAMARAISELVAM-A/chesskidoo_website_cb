/* assets/js/auth.js -------------------------------------------------------
   Supabase Authentication — handles all roles: admin, student, coach, parent
   Per-user email/password. Admin can set individual credentials.
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  /* Check per-user credential */
  async function _checkPerUserCred(email, password) {
    const creds = await CK.accessManager.getCreds();
    const stored = creds[email.toLowerCase()];
    return stored ? stored === password : false;
  }

  CK.handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email    = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const btn      = form.querySelector('[type="submit"]');

    btn.textContent = '♛ Entering...';
    btn.disabled = true;

    try {
      CK.showToast('Authenticating...', 'info');

      let profile = null;
      let session = null;
      let isOfflineMode = false;

      // 1. Attempt Supabase Auth login if online and configured
      if (window.supabaseClient && navigator.onLine) {
        try {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
          if (!error && data && data.user) {
            session = data.session;
            // Fetch profile via our DB layer (which handles Supabase query or fallback)
            profile = await CK.db.getProfile(data.user.id);
            if (!profile) {
              // Create a default fallback profile for admin or new auth user
              if (data.user.id === window.APP_CONFIG?.ADMIN_UUID || email === 'admin@gmail.com') {
                profile = {
                  id: data.user.id,
                  full_name: 'Academy Admin',
                  email: email,
                  role: 'admin',
                  userid: 'admin'
                };
                await CK.db.saveProfile(profile);
              } else {
                profile = {
                  id: data.user.id,
                  full_name: email.split('@')[0],
                  email: email,
                  role: 'student',
                  userid: Math.floor(100 + Math.random() * 900).toString()
                };
                await CK.db.saveProfile(profile);
              }
            }
          } else {
            console.warn("[ChessKidoo Auth] Supabase sign-in failed or returned empty. Error:", error);
          }
        } catch (supaErr) {
          console.warn("[ChessKidoo Auth] Supabase connection error. Proceeding to offline mode check.", supaErr);
          isOfflineMode = true;
        }
      } else {
        isOfflineMode = true;
      }

      // 2. Offline / Demo Fallback Check
      if (!profile) {
        // Fetch profiles from our local DB layer
        const profiles = await CK.db.getProfiles();
        const found = profiles.find(p => p && p.email && (p.email.toLowerCase() === email || (email.includes('@ck') && p.email.toLowerCase().startsWith(email.split('@')[0]))));
        
        if (found) {
          // Check per-user credential first (admin-set individual passwords)
          const role = (found.role || 'student').toLowerCase();
          const perUserMatch = await _checkPerUserCred(email, password);
          // Demo-mode passwords (only the ones shown in the UI login hints)
          const roleMatch =
            (role === 'admin'  && password === 'Admin123$') ||
            (role === 'coach'  && password === 'Coach123')  ||
            (role === 'parent' && password === 'Parent123') ||
            (role === 'student'&& password === 'Student123');
          const isValidPass = perUserMatch || roleMatch;

          if (isValidPass) {
            profile = found;
            session = { access_token: "mock-jwt-token-" + Date.now(), user: { id: found.id, email: found.email } };
            if (isOfflineMode) {
              console.log("[ChessKidoo Auth] Successful login in Resilient Offline Demo Mode ✓");
            }
          } else {
            throw new Error('Incorrect password for ' + found.full_name + '.');
          }
        } else {
          throw new Error('Account not found. Please contact the academy admin.');
        }
      }

      // 3. Save session and redirect
      CK.currentUser = profile;
      localStorage.setItem('ck_user', JSON.stringify(profile));
      if (session) localStorage.setItem('ck_session', JSON.stringify(session));

      const role = (profile.role || 'student').toLowerCase();
      CK.showToast(`Welcome back, ${profile.full_name || 'Champion'}! ♟`, 'success');

      setTimeout(() => {
        CK.showPage(`${role}-page`);
        if (CK.notifs) CK.notifs.init(profile);
        if (role === 'admin'   && CK.admin)   CK.admin.init();
        if (role === 'student' && CK.student) CK.student.init();
        if (role === 'coach'   && CK.coach)   CK.coach.init();
        if (role === 'parent'  && CK.parents) CK.parents.init();
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      CK.showToast(err.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
      btn.textContent = 'Enter the Arena →';
      btn.disabled = false;
    }
  };

  CK.logout = async () => {
    try {
      if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    } catch(e) {}
    localStorage.removeItem('ck_user');
    localStorage.removeItem('ck_session');
    CK.currentUser = null;
    CK.showToast('Logged out successfully.', 'success');
    setTimeout(() => {
      CK.showPage('landing-page');
      window.scrollTo(0, 0);
    }, 400);
  };

})();