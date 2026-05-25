/* assets/js/auth.js -------------------------------------------------------
   Supabase Authentication — handles all roles: admin, student, coach, parent
   Per-user email/password. Admin can set individual credentials.
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};


  /* Simple brute-force rate limiter — 5 attempts per email per 15 min */
  const _failMap = {};
  function _recordFail(email) {
    const now = Date.now();
    const entry = _failMap[email] || { count: 0, since: now };
    if (now - entry.since > 900000) { entry.count = 0; entry.since = now; }
    entry.count++;
    _failMap[email] = entry;
  }
  function _isLockedOut(email) {
    const entry = _failMap[email];
    if (!entry) return false;
    if (Date.now() - entry.since > 900000) { delete _failMap[email]; return false; }
    return entry.count >= 5;
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
      if (_isLockedOut(email)) {
        throw new Error('Too many failed attempts. Please wait 15 minutes or reset your password.');
      }
      CK.showToast('Authenticating...', 'info');

      let profile = null;
      let isOfflineMode = false;

      // 1. Attempt Supabase Auth login if online and configured
      if (window.supabaseClient && navigator.onLine) {
        try {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
          if (!error && data && data.user) {
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
            // Supabase Auth rejected — fall through to per-user credential check.
            // Users managed via Access Manager use SHA-256 credentials, not Supabase Auth.
            console.info("[ChessKidoo Auth] Supabase Auth did not authenticate. Falling through to per-user credentials.", error?.message);
            isOfflineMode = true;
          }
        } catch (supaErr) {
          console.warn("[ChessKidoo Auth] Supabase connection error. Proceeding to offline mode check.", supaErr);
          isOfflineMode = true;
        }
      } else {
        isOfflineMode = true;
      }

      // 2. Per-user credential check (SHA-256 hashes stored in localStorage)
      if (!profile && isOfflineMode) {
        const creds = JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
        const storedHash = creds[email];
        if (storedHash) {
          const encoder = new TextEncoder();
          const data = encoder.encode(password);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex === storedHash) {
            const allUsers = JSON.parse(localStorage.getItem('ck_db_users') || '[]');
            profile = allUsers.find(u => (u.email || '').toLowerCase() === email) || null;
            if (!profile && email === 'admin@gmail.com') {
              profile = { id: window.APP_CONFIG?.ADMIN_UUID || 'admin', full_name: 'Academy Admin', email, role: 'admin', userid: 'admin' };
            }
          }
        }
      }

      if (!profile) {
        throw new Error('Incorrect email or password. Please try again.');
      }

      // 3. Save profile (never store JWT — Supabase manages its own sb-* keys)
      CK.currentUser = profile;
      localStorage.setItem('ck_user', JSON.stringify(profile));

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
      _recordFail(email);
      CK.showToast(err.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  };

  CK.forgotPassword = async (email) => {
    if (!email) { CK.showToast('Enter your email first.', 'error'); return; }
    if (!window.supabaseClient) { CK.showToast('Password reset requires an internet connection.', 'error'); return; }
    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      CK.showToast('Password reset link sent! Check your email.', 'success');
    } catch (err) {
      CK.showToast(err.message || 'Could not send reset email.', 'error');
    }
  };

  /* ── Google OAuth Login ── */
  CK.handleGoogleLogin = async () => {
    if (!window.supabaseClient) {
      CK.showToast('Google login requires an internet connection.', 'error');
      return;
    }
    try {
      CK.showToast('Redirecting to Google...', 'info');
      const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
      // The browser will redirect to Google — on return, _handleAuthCallback picks up
    } catch (err) {
      CK.showToast(err.message || 'Google login failed. Please try again.', 'error');
    }
  };

  /* ── Handle OAuth Callback (runs on page load) ── */
  CK._handleAuthCallback = async () => {
    if (!window.supabaseClient) return;
    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (error || !session || !session.user) return;

      // Already logged in via ck_user? Skip
      if (CK.currentUser) return;

      const user = session.user;
      const email = user.email?.toLowerCase();

      // Check if a profile already exists for this user
      let profile = await CK.db.getProfile(user.id);

      if (!profile) {
        // Check if there's an existing profile by email (admin-created)
        const allProfiles = await CK.db.getProfiles();
        profile = allProfiles.find(p => p?.email?.toLowerCase() === email);

        if (profile) {
          // Link the Supabase auth ID to the existing profile
          profile.auth_id = user.id;
          await CK.db.saveProfile(profile);
        } else {
          // Brand new user via Google — create student profile
          profile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
            email: email,
            role: 'student',
            userid: Math.floor(100 + Math.random() * 900).toString(),
            photo: user.user_metadata?.avatar_url || '',
            rating: 800,
            level: 'Beginner',
            status: 'Pending',
            join_date: new Date().toISOString().split('T')[0]
          };
          await CK.db.saveProfile(profile);
        }
      }

      // Log in
      CK.currentUser = profile;
      localStorage.setItem('ck_user', JSON.stringify(profile));

      const role = (profile.role || 'student').toLowerCase();
      CK.showToast(`Welcome, ${profile.full_name || 'Champion'}! ♟`, 'success');

      setTimeout(() => {
        CK.showPage(`${role}-page`);
        if (CK.notifs) CK.notifs.init(profile);
        if (role === 'admin'   && CK.admin)   CK.admin.init();
        if (role === 'student' && CK.student) CK.student.init();
        if (role === 'coach'   && CK.coach)   CK.coach.init();
        if (role === 'parent'  && CK.parents) CK.parents.init();
      }, 500);
    } catch (err) {
      console.warn('[ChessKidoo Auth] OAuth callback error:', err);
    }
  };

  CK.logout = async () => {
    try {
      if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    } catch(e) {}
    ['ck_user', 'ck_live_presence', 'ck_meetings', 'ck_notifications'].forEach(k => localStorage.removeItem(k));
    // Clear daily-notification guards so they regenerate on next login
    Object.keys(localStorage).filter(k => k.startsWith('ck_notifs_generated_')).forEach(k => localStorage.removeItem(k));
    CK.currentUser = null;
    CK.showToast('Logged out successfully.', 'success');
    setTimeout(() => {
      CK.showPage('landing-page');
      window.scrollTo(0, 0);
    }, 400);
  };

  // ── Global Auth State Listener for Password Recovery ──
  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setTimeout(async () => {
          const newPassword = prompt("Please enter your NEW password (minimum 8 characters):");
          if (newPassword && newPassword.length >= 8) {
            const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });
            if (error) {
              CK.showToast("Failed to update password: " + error.message, "error");
            } else {
              CK.showToast("Password updated successfully! You can now log in.", "success");
              await CK.logout();
            }
          } else {
            CK.showToast("Password must be at least 8 characters. Please refresh the page to try again.", "error");
          }
        }, 1000); // Give the UI a moment to load
      }
    });
  }

})();