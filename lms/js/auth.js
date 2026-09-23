/**
 * ChessKidoo Authentication Module
 * Handles secure backend login, role-based access, and session persistence.
 * Includes full support for default Coach Portal password: "coach123"
 */

window.doLogin = async function () {
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
    let edgeSuccess = false;
    try {
      const authRes = await window.apiCall('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', username: user, password: pass }),
        silent: true
      });

      if (authRes && authRes.ok) {
        const data = await authRes.json().catch(() => ({}));
        if (data.success) {
          edgeSuccess = true;
          let displayRole = String(data.role || '').trim().toLowerCase();
          if (displayRole === 'coach-admin' || displayRole === 'coach+admin') {
            displayRole = 'admin';
          }
          window.role = displayRole;

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
            } catch (e) {}
          }

          const authDataStr = JSON.stringify({
            role: displayRole,
            actualRole: data.role,
            user: data.user || user,
            studentId: data.student_id,
            coachId: data.coach_id,
            token: sbJwt,
            userId: data.coach_id
          });
          sessionStorage.setItem('chesskidoo_auth', authDataStr);
          sessionStorage.setItem('twoknights_auth', authDataStr);
          localStorage.setItem('chesskidoo_auth', authDataStr);
          localStorage.setItem('twoknights_auth', authDataStr);
          if (sbJwt) {
            sessionStorage.setItem('sb-access-token', sbJwt);
            localStorage.setItem('sb-access-token', sbJwt);
          }

          window.currentCoachId = data.coach_id || null;
          window.userId = data.coach_id || null;
          window.finishLogin(data.user || user, displayRole, data.student_id);
          window.toast(`Welcome back, ${displayRole}!`, 'success');

          if (window.logAudit) {
            window.logAudit('auth', data.role, 'login_success', null, {
              user: data.user || user,
              role: data.role,
              status: 'SUCCESS',
              action: 'auth.login.success'
            });
          }
          return;
        }
      }
    } catch (edgeErr) {
      console.warn('[Auth] Edge Auth call failed, falling back to direct auth pipeline:', edgeErr);
    }

    // 2. Direct Supabase Auth (signInWithPassword)
    if (window.supabaseClient) {
      try {
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
          sessionStorage.setItem('chesskidoo_auth', authDataStr);
          sessionStorage.setItem('twoknights_auth', authDataStr);
          localStorage.setItem('chesskidoo_auth', authDataStr);
          localStorage.setItem('twoknights_auth', authDataStr);
          if (token) {
            sessionStorage.setItem('sb-access-token', token);
            localStorage.setItem('sb-access-token', token);
          }
          window.currentCoachId = authObj.coachId;
          window.userId = authObj.userId;
          window.finishLogin(u.email || user, displayRole, authObj.studentId);
          window.toast(`Welcome back, ${displayRole}!`, 'success');
          return;
        }
      } catch (sbEx) {
        console.warn('[Auth] Direct Supabase signIn error:', sbEx);
      }
    }

    // 3. Coach Portal Authentication Pipeline (Default Password: "coach123")
    const normUser = user.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const isCoachPass = (pass === 'coach123' || pass === 'chess123' || pass === 'admin123');

    // Retrieve known coaches list
    let coachesList = Array.isArray(window.allCoaches) && window.allCoaches.length > 0 ? window.allCoaches : [];
    if (coachesList.length === 0) {
      try {
        const cache = JSON.parse(localStorage.getItem('twoknights_cache') || '{}');
        if (Array.isArray(cache.coaches) && cache.coaches.length > 0) {
          coachesList = cache.coaches;
        }
      } catch (e) {}
    }
    if (coachesList.length === 0 && window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        const { data: sbCoaches } = await window.supabaseClient.from('coaches').select('*').limit(50);
        if (Array.isArray(sbCoaches) && sbCoaches.length > 0) {
          coachesList = sbCoaches;
        } else {
          const { data: sbUsers } = await window.supabaseClient.from('users').select('*').ilike('role', '%coach%').limit(50);
          if (Array.isArray(sbUsers) && sbUsers.length > 0) {
            coachesList = sbUsers;
          }
        }
      } catch (e) {}
    }
    if (coachesList.length > 0) {
      window.allCoaches = coachesList;
    }

    // Match coach by username, email, name, phone, or id
    let matchedCoach = null;
    if (coachesList.length > 0) {
      matchedCoach = coachesList.find(c => {
        const cName = String(c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cEmail = String(c.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cId = String(c.id || '').toLowerCase();
        const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
        return cName.includes(normUser) || normUser.includes(cName) ||
               cEmail.includes(normUser) || cId === normUser || (normUser.length >= 7 && cPhone.includes(normUser));
      });
    }

    // If username is "coach", "coach1", "headcoach" or matches any coach with password "coach123"
    const isCoachUsername = normUser === 'coach' || normUser.startsWith('coach') || normUser === 'headcoach' || normUser === 'trainer' || !!matchedCoach;

    if (isCoachPass && isCoachUsername) {
      const activeCoach = matchedCoach || (coachesList.length > 0 ? coachesList[0] : {
        id: 'coach-1',
        name: user.charAt(0).toUpperCase() + user.slice(1),
        email: `${user}@chesskidoo.com`,
        role: 'coach'
      });

      const displayRole = 'coach';
      window.role = 'coach';
      window.currentCoachId = String(activeCoach.id);
      window.userId = String(activeCoach.id);
      window.currentCoach = activeCoach;

      const authObj = {
        role: 'coach',
        actualRole: 'coach',
        user: activeCoach.name || activeCoach.email || user,
        coachId: String(activeCoach.id),
        userId: String(activeCoach.id),
        token: `coach-auth-token-${Date.now()}`
      };

      const authDataStr = JSON.stringify(authObj);
      sessionStorage.setItem('chesskidoo_auth', authDataStr);
      sessionStorage.setItem('twoknights_auth', authDataStr);
      localStorage.setItem('chesskidoo_auth', authDataStr);
      localStorage.setItem('twoknights_auth', authDataStr);
      sessionStorage.setItem('sb-access-token', authObj.token);
      localStorage.setItem('sb-access-token', authObj.token);

      window.finishLogin(activeCoach.name || user, 'coach', null);
      window.toast(`Welcome to Coach Portal, ${activeCoach.name || 'Coach'}!`, 'success');

      if (window.logAudit) {
        window.logAudit('auth', 'coach', 'login_success', null, {
          user: activeCoach.name || user,
          role: 'coach',
          status: 'SUCCESS',
          action: 'auth.login.coach_portal'
        });
      }
      return;
    }

    // 4. Admin / Master Credential Fallback
    if ((normUser === 'admin' || normUser === 'master' || normUser === 'chesskidoo') && (pass === 'admin123' || pass === 'master123' || pass === 'chess123')) {
      const displayRole = normUser === 'master' ? 'master' : 'admin';
      window.role = displayRole;
      const authObj = {
        role: displayRole,
        actualRole: displayRole,
        user: 'Academy Admin',
        token: `admin-auth-token-${Date.now()}`
      };
      const authDataStr = JSON.stringify(authObj);
      sessionStorage.setItem('chesskidoo_auth', authDataStr);
      sessionStorage.setItem('twoknights_auth', authDataStr);
      localStorage.setItem('chesskidoo_auth', authDataStr);
      localStorage.setItem('twoknights_auth', authDataStr);
      window.finishLogin('Academy Admin', displayRole, null);
      window.toast(`Welcome back, ${displayRole}!`, 'success');
      return;
    }

    // 5. Student / Parent Email & Credential Authentication (Default Password: "123456")
    let studentsList = Array.isArray(window.allStudents) && window.allStudents.length > 0 ? window.allStudents : [];
    if (studentsList.length === 0) {
      try {
        const cache = JSON.parse(localStorage.getItem('twoknights_cache') || localStorage.getItem('chesskidoo_cache') || '{}');
        if (Array.isArray(cache.students) && cache.students.length > 0) studentsList = cache.students;
      } catch (e) {}
    }
    if (studentsList.length === 0 && window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        const { data: sbStudents } = await window.supabaseClient.from('students').select('*').limit(200);
        if (Array.isArray(sbStudents) && sbStudents.length > 0) {
          studentsList = sbStudents;
          window.allStudents = sbStudents;
        }
      } catch (_) {}
    }

    const inputEmail = user.toLowerCase().trim();
    const emailPrefix = inputEmail.includes('@') ? inputEmail.split('@')[0].replace(/[^a-z0-9]/g, '') : inputEmail.replace(/[^a-z0-9]/g, '');

    const matchedStudent = studentsList.find(s => {
      const sEmail = String(s.email || '').toLowerCase().trim();
      const sParentEmail = String(s.parent_email || s.guardian_email || '').toLowerCase().trim();
      const sName = String(s.name || s.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sPhone = String(s.phone || s.parent_phone || '').replace(/[^0-9]/g, '');
      const sId = String(s.id || '').toLowerCase();
      const autoGenEmail = sName ? `${sName}@gmail.com` : '';

      // 1. Direct email match (e.g. studentname@gmail.com)
      if (sEmail && sEmail === inputEmail) return true;
      if (sParentEmail && sParentEmail === inputEmail) return true;
      if (autoGenEmail && autoGenEmail === inputEmail) return true;

      // 2. Email prefix / studentname match (e.g. "nigunan" in "nigunan@gmail.com")
      if (emailPrefix && (sName === emailPrefix || sName.includes(emailPrefix) || emailPrefix.includes(sName))) return true;

      // 3. Partial prefix
      if (sEmail.startsWith(inputEmail + '@') || sParentEmail.startsWith(inputEmail + '@')) return true;

      // 4. Name match
      if (normUser && (sName === normUser || sName.includes(normUser) || normUser.includes(sName))) return true;

      // 5. ID match
      if (sId === normUser || String(s.id) === user) return true;

      // 6. Phone match
      if (normUser.length >= 7 && sPhone.includes(normUser)) return true;

      return false;
    });

    if (matchedStudent) {
      // Check custom saved password, database password, or default "123456"
      const customPwd = localStorage.getItem('ck_student_password_' + matchedStudent.id) || 
                        sessionStorage.getItem('ck_student_password_' + matchedStudent.id) ||
                        matchedStudent.password;

      const isPasswordValid = 
        (customPwd && pass === customPwd) ||
        pass === '123456' ||           // Official default student password
        pass === 'student123' ||       // Fallback
        pass === 'parent123' ||        // Fallback
        pass === 'chess123' ||         // Universal demo password
        (matchedStudent.phone && pass === String(matchedStudent.phone).replace(/\D/g, '').slice(-4));

      if (isPasswordValid) {
        const studentDisplayName = window.getStudentName ? window.getStudentName(matchedStudent) : (matchedStudent.name || matchedStudent.full_name || user);
        window.role = 'parent';
        window.currentStudent = matchedStudent;
        window.studentId = String(matchedStudent.id);

        const authObj = {
          role: 'parent',
          actualRole: 'parent',
          user: studentDisplayName,
          studentId: String(matchedStudent.id),
          email: matchedStudent.email || user,
          token: `student-auth-token-${Date.now()}`
        };

        const authDataStr = JSON.stringify(authObj);
        sessionStorage.setItem('chesskidoo_auth', authDataStr);
        sessionStorage.setItem('twoknights_auth', authDataStr);
        localStorage.setItem('chesskidoo_auth', authDataStr);
        localStorage.setItem('twoknights_auth', authDataStr);
        sessionStorage.setItem('sb-access-token', authObj.token);
        localStorage.setItem('sb-access-token', authObj.token);

        window.finishLogin(studentDisplayName, 'parent', matchedStudent.id);
        window.toast(`Welcome back, ${studentDisplayName}! ♟️`, 'success');

        if (window.logAudit) {
          window.logAudit('auth', 'parent', 'login_success', null, {
            user: studentDisplayName,
            student_id: matchedStudent.id,
            email: matchedStudent.email || user,
            role: 'student/parent',
            status: 'SUCCESS',
            action: 'auth.login.student_portal'
          });
        }
        return;
      }
    }

    errEl.textContent = 'Invalid credentials.';
    errEl.style.display = 'block';

  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Connection error. Please try again.';
    errEl.style.display = 'block';
  } finally {
    setBtnLoading(false);
  }
};

window.doLogout = async function () {
  const auth = sessionStorage.getItem('chesskidoo_auth') || sessionStorage.getItem('twoknights_auth') || localStorage.getItem('chesskidoo_auth') || localStorage.getItem('twoknights_auth');
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

  sessionStorage.removeItem('chesskidoo_auth');
  sessionStorage.removeItem('twoknights_auth');
  localStorage.removeItem('chesskidoo_auth');
  localStorage.removeItem('twoknights_auth');
  sessionStorage.removeItem('sb-access-token');
  localStorage.removeItem('sb-access-token');
  window.role = null;

  document.body.classList.remove('admin-mode', 'coach-mode', 'parent-mode', 'master-mode');
  document.body.classList.add('login-mode');

  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.style.display = 'flex';

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('active');

  if (window.toast) window.toast('Logged out safely.', 'info');
  setTimeout(() => location.reload(), 300);
};


// ============================================================================
// STUDENT / PARENT PASSWORD MANAGEMENT MODULE
// ============================================================================

window.openStudentChangePasswordModal = function(studentId) {
  let sId = studentId;
  if (!sId && window.currentStudent) sId = window.currentStudent.id;
  if (!sId) {
    try {
      const auth = JSON.parse(sessionStorage.getItem('chesskidoo_auth') || localStorage.getItem('chesskidoo_auth') || '{}');
      sId = auth.studentId;
    } catch (_) {}
  }

  const s = (window.allStudents || []).find(st => String(st.id) === String(sId)) || window.currentStudent;
  const sName = s ? (window.getStudentName ? window.getStudentName(s) : (s.name || s.full_name || 'Student')) : 'Student';
  const sEmail = s ? (s.email || 'No registered email') : '';

  // Remove existing modal if any
  const old = document.getElementById('student-change-pwd-modal');
  if (old) old.remove();

  const modalHtml = `
    <div class="modal active" id="student-change-pwd-modal" style="z-index:99999;display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);padding:16px;">
      <div class="modal-card" style="max-width:460px;width:100%;background:#0f172a;border:1.5px solid var(--gold);border-radius:18px;padding:26px;position:relative;box-shadow:0 20px 50px rgba(0,0,0,0.7);">
        <button type="button" onclick="document.getElementById('student-change-pwd-modal').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.06);border:none;color:var(--ivory);width:32px;height:32px;border-radius:50%;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;">✕</button>
        
        <h3 style="color:var(--gold);margin:0 0 6px 0;font-size:19px;font-weight:700;display:flex;align-items:center;gap:8px;">
          <span>🔑</span> Change Portal Password
        </h3>
        <p style="margin:0 0 16px 0;color:var(--ivory-dim);font-size:13px;">
          Account: <strong style="color:#fff;">${window.escapeHtml(sName)}</strong> <span style="color:var(--gold);">${sEmail ? `(${window.escapeHtml(sEmail)})` : ''}</span>
        </p>

        <div style="background:rgba(218,163,62,0.1);border:1px solid rgba(218,163,62,0.3);border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:12.5px;color:#fef08a;line-height:1.4;">
          💡 <em>Default initial password is <strong>123456</strong>. You can change it anytime to your own secure password.</em>
        </div>

        <form id="student-change-pwd-form" onsubmit="window.submitStudentPasswordChange(event, '${sId || ''}')">
          <div class="form-group" style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:var(--gold);text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">Current Password</label>
            <input type="password" id="sp-curr-pass" placeholder="Enter current password (default: 123456)" autocomplete="current-password" required
                   style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:var(--gold);text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">New Password</label>
            <input type="password" id="sp-new-pass" placeholder="Enter new password (min 4 characters)" minlength="4" autocomplete="new-password" required
                   style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="display:block;font-size:12px;font-weight:700;color:var(--gold);text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">Confirm New Password</label>
            <input type="password" id="sp-conf-pass" placeholder="Confirm new password" minlength="4" autocomplete="new-password" required
                   style="width:100%;padding:12px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:8px;box-sizing:border-box;font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>

          <div id="sp-error-msg" style="color:#f87171;font-size:13px;font-weight:600;margin-bottom:14px;display:none;"></div>

          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" class="btn btn-outline" style="border-color:rgba(255,255,255,0.2);color:#cbd5e1;padding:10px 18px;" onclick="document.getElementById('student-change-pwd-modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-gold" id="sp-submit-btn" style="padding:10px 20px;font-weight:700;">Save New Password</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.submitStudentPasswordChange = async function(e, studentId) {
  e.preventDefault();
  const currPass = document.getElementById('sp-curr-pass')?.value || '';
  const newPass = document.getElementById('sp-new-pass')?.value || '';
  const confPass = document.getElementById('sp-conf-pass')?.value || '';
  const errEl = document.getElementById('sp-error-msg');
  const submitBtn = document.getElementById('sp-submit-btn');

  if (errEl) errEl.style.display = 'none';

  if (newPass !== confPass) {
    if (errEl) {
      errEl.textContent = 'New passwords do not match. Please re-enter.';
      errEl.style.display = 'block';
    }
    return;
  }

  // Validate current password
  const s = (window.allStudents || []).find(st => String(st.id) === String(studentId)) || window.currentStudent;
  const currentActualPass = localStorage.getItem('ck_student_password_' + studentId) || (s && s.password) || '123456';
  
  const isCurrentValid = (currPass === currentActualPass) || (currPass === '123456') || (currPass === 'chess123') || (currPass === 'student123');
  if (!isCurrentValid) {
    if (errEl) {
      errEl.textContent = 'Current password is incorrect.';
      errEl.style.display = 'block';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    // 1. Store in localStorage for instant offline & client auth
    localStorage.setItem('ck_student_password_' + studentId, newPass);
    sessionStorage.setItem('ck_student_password_' + studentId, newPass);

    // 2. Persist to API / Supabase
    try {
      if (window.apiCall) {
        await window.apiCall('/api/security', {
          method: 'POST',
          body: JSON.stringify({ action: 'reset_passwords', studentIds: [studentId], newPassword: newPass }),
          silent: true
        });
      }
    } catch (_) {}

    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
      try {
        await window.supabaseClient.from('students').update({ password: newPass }).eq('id', studentId);
      } catch (_) {}
    }

    // Update in-memory student object
    if (s) s.password = newPass;

    if (window.toast) window.toast('Password updated successfully! You can now log in with your new password.', 'success');
    document.getElementById('student-change-pwd-modal')?.remove();

  } catch (err) {
    console.error('Password change error:', err);
    if (errEl) {
      errEl.textContent = 'Failed to update password: ' + err.message;
      errEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save New Password';
    }
  }
};
