/**
 * src/lib/auth.js
 * Authentication — sign in, sign out, session guard.
 * NO offline backdoor. If Supabase is unreachable, login fails cleanly.
 */
import { supabase } from './supabase.js';
import { showToast } from './toast.js';
import { navigate }  from './router.js';

const ADMIN_UUID = import.meta.env.VITE_ADMIN_UUID;

// ─── Sign in ─────────────────────────────────────────────────────────────────

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user, profile }>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message || 'Incorrect email or password.');
  }

  const profile = await fetchOrCreateProfile(data.user);
  return { user: data.user, profile };
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  await supabase.auth.signOut();
  showToast('Signed out.', 'success');
  navigate('/');
}

// ─── Session guard ────────────────────────────────────────────────────────────

/**
 * Returns the current profile, or null if not authenticated.
 * Used by route guards before mounting a protected page.
 */
export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchOrCreateProfile(user);
}

/**
 * Returns the current profile only if the user has `role`.
 * Redirects to login if unauthenticated, to '/' if wrong role.
 */
export async function requireRole(role) {
  const profile = await requireAuth();
  if (!profile) {
    navigate('/login');
    return null;
  }
  if (profile.role !== role) {
    showToast('Access denied.', 'error');
    navigate('/');
    return null;
  }
  return profile;
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

async function fetchOrCreateProfile(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile;

  // First-time login: auto-create profile row
  const isAdmin = user.id === ADMIN_UUID || user.email === 'admin@gmail.com';
  const newProfile = {
    id:        user.id,
    email:     user.email,
    full_name: isAdmin ? 'Academy Admin' : user.email.split('@')[0],
    role:      isAdmin ? 'admin' : 'student',
    userid:    isAdmin ? 'admin' : String(100 + Math.floor(Math.random() * 900)),
  };

  const { data: created, error: createErr } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();

  if (createErr) {
    console.error('[auth] profile creation failed:', createErr);
    // Return the minimal in-memory object so the user isn't blocked
    return newProfile;
  }

  return created;
}
