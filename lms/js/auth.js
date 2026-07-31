/**
 * ChessKidoo Authentication Module
 * Handles secure backend login, role-based access, and session persistence.
 */

window.doLogin = async function() {
    const userEl = document.getElementById('li-user');
    const passEl = document.getElementById('li-pass');
    const errEl = document.getElementById('login-err');
    const loginBtn = document.getElementById('login-submit-btn') || document.querySelector('.login-btn');
    
    if (!userEl || !passEl || !errEl) return;

    const user = userEl.value.trim();
    const pass = passEl.value.trim();
    errEl.style.display = 'none';

    if (!user || !pass) {
        errEl.textContent = 'Enter username and password.';
        errEl.style.display = 'block';
        return;
    }

    const setBtnLoading = (loading) => {
        if (!loginBtn) return;
        loginBtn.disabled = loading;
        loginBtn.textContent = loading ? 'Authenticating...' : 'Sign In';
    };

    setBtnLoading(true);
    const telemetry = window.extractDeviceTelemetry ? window.extractDeviceTelemetry() : {};

    try {
        // 1. Auth API - Primary Secure Authentication via Supabase Edge Function
        const authRes = await window.apiCall(`${window.API_BASE}/auth`, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass })
        }).catch(err => {
            console.error('API Auth failed:', err);
            return null;
        });
        
        if (authRes && authRes.ok) {
            const data = await authRes.json().catch(() => ({}));
            if (data.success) {
                // coach-admin is a retired role that can no longer be assigned.
                // Older accounts may still carry it, so map it to admin — the
                // access_control function does the same — and re-save the account
                // in Access Control to migrate it off permanently.
                let displayRole = String(data.role || '').trim().toLowerCase();
                if (displayRole === 'coach-admin' || displayRole === 'coach+admin') {
                    displayRole = 'admin';
                }
                window.role = displayRole;

                // The /auth Edge Function returns a custom token that other Edge
                // Functions (access_control, etc.) cannot validate via
                // supabase.auth.getUser(). Establish a real Supabase Auth session
                // so a proper JWT is available for all subsequent API calls.
                let sbJwt = data.token || null;
                if (window.supabaseClient) {
                    try {
                        const email = user.includes('@') ? user : `${user.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
                        const { data: sbData } = await window.supabaseClient.auth.signInWithPassword({
                            email,
                            password: pass
                        }).catch(() => ({ data: null }));
                        if (sbData?.session?.access_token) {
                            sbJwt = sbData.session.access_token;
                        }
                    } catch (e) {
                        console.warn('[Auth] Supabase session fallback failed:', e.message);
                    }
                }

                const authDataStr = JSON.stringify({
                    role: displayRole,
                    actualRole: data.role, // store actual role for audit logs
                    user: data.user || user,
                    studentId: data.student_id,
                    coachId: data.coach_id,
                    token: sbJwt,
                    userId: data.coach_id // Set userId for coach role compatibility
                });
                sessionStorage.setItem('twoknights_auth', authDataStr);
                localStorage.setItem('twoknights_auth', authDataStr);
                if (sbJwt) {
                    sessionStorage.setItem('sb-access-token', sbJwt);
                    localStorage.setItem('sb-access-token', sbJwt);
                }
                // Also set window.currentCoachId for coach dashboard
                window.currentCoachId = data.coach_id || null;
                window.userId = data.coach_id || null; // Set userId for homework.js compatibility
                window.finishLogin(data.user || user, displayRole, data.student_id);
                window.toast(`Welcome back, ${displayRole}!`, 'success');

                // Log successful login with security telemetry parameters
                if (window.logAudit) {
                    window.logAudit('auth', data.role, 'login_success', null, {
                        user: data.user || user,
                        role: data.role,
                        ipAddress: telemetry.ip,
                        deviceOS: telemetry.os,
                        browser: telemetry.browser,
                        countryCode: telemetry.country,
                        status: 'SUCCESS',
                        action: 'auth.login.success'
                    });
                }
                return;
            }
        }

        // 2. Direct Supabase Auth fallback if Edge function /auth is unavailable or refused
        if (window.supabaseClient) {
            const { data: sbData, error: sbErr } = await window.supabaseClient.auth.signInWithPassword({
                email: user.includes('@') ? user : `${user.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
                password: pass
            }).catch(() => ({ data: null, error: null }));

            if (!sbErr && sbData && sbData.user) {
                const u = sbData.user;
                const sess = sbData.session;
                let displayRole = String(u.user_metadata?.role || 'admin').trim().toLowerCase();
                if (displayRole === 'coach-admin' || displayRole === 'coach+admin') displayRole = 'admin';
                window.role = displayRole;
                const token = sess?.access_token || null;
                const authObj = {
                    role: displayRole,
                    actualRole: u.user_metadata?.role || displayRole,
                    user: u.email || user,
                    studentId: u.user_metadata?.student_id || null,
                    coachId: u.user_metadata?.coach_id || null,
                    token: token,
                    userId: u.user_metadata?.coach_id || u.id
                };
                const authDataStr = JSON.stringify(authObj);
                sessionStorage.setItem('twoknights_auth', authDataStr);
                localStorage.setItem('twoknights_auth', authDataStr);
                if (token) {
                    sessionStorage.setItem('sb-access-token', token);
                    localStorage.setItem('sb-access-token', token);
                }
                window.currentCoachId = authObj.coachId;
                window.userId = authObj.userId;
                window.finishLogin(u.email || user, displayRole, authObj.studentId);
                window.toast(`Welcome back, ${displayRole}!`, 'success');
                if (window.logAudit) {
                    window.logAudit('auth', displayRole, 'login_success', null, {
                        user: u.email || user,
                        role: displayRole,
                        status: 'SUCCESS',
                        action: 'auth.login.supabase_fallback'
                    });
                }
                return;
            }
        }

        errEl.textContent = 'Invalid credentials or connection error.';
        errEl.style.display = 'block';
        if (window.logAudit) {
            window.logAudit('auth', user, 'login_failed', null, {
                username: user,
                ipAddress: telemetry.ip,
                deviceOS: telemetry.os,
                browser: telemetry.browser,
                countryCode: telemetry.country,
                status: 'FAILED',
                action: 'auth.login.failed',
                error: 'Connection or response failure'
            });
        }
        
    } catch (e) {
        console.error('Login error:', e);
        errEl.textContent = 'Server unreachable. Please try again later.';
        if (window.logAudit) {
            window.logAudit('auth', user, 'login_failed', null, {
                username: user,
                ipAddress: telemetry.ip,
                deviceOS: telemetry.os,
                browser: telemetry.browser,
                countryCode: telemetry.country,
                status: 'FAILED',
                action: 'auth.login.failed',
                error: e.message
            });
        }
    } finally {
        setBtnLoading(false);
    }
};

  window.doLogout = async function() {
      const auth = sessionStorage.getItem('twoknights_auth');
      let token = null;
      if (auth) {
        try {
          const data = JSON.parse(auth);
          token = data.token;
        } catch (_) {}
      }
      if (!token) {
        token = sessionStorage.getItem('sb-access-token');
      }
      if (token) {
        await (window.apiCall || fetch)('/api/auth', {
          method: 'POST',
          body: JSON.stringify({ action: 'logout', token })
        }).catch(() => {});
      }

      sessionStorage.removeItem('twoknights_auth');
      sessionStorage.removeItem('sb-access-token');
      window.role = null;
      
      document.body.classList.remove('admin-mode', 'coach-mode', 'parent-mode', 'master-mode');
      document.body.classList.add('login-mode');
      
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.style.display = 'flex';
      
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('active');
      
      if (window.toast) window.toast('Logged out safely.', 'info');
      setTimeout(() => location.reload(), 500); // Reload to clear all state
    };
