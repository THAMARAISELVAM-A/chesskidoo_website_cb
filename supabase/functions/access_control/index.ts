import { checkRateLimit } from './rate_limit.js';

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return corsResponse({}, 200, origin);
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'access_control')
  if (!rateLimitResult.allowed) {
    return corsResponse({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }, 429, origin);
  }

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin);
  }

  // Create client with service_role to manage users via admin API
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Verify requester is a master admin using JWT claims (not client-controlled headers)
  const { validateAuth } = await import('./rate_limit.js')
  const auth = await validateAuth(req, supabase)
  if (!auth.allowed) {
    return corsResponse({ error: auth.error }, 401, origin);
  }

  // The three roles this endpoint hands out. coach-admin has been retired.
  const ASSIGNABLE_ROLES = ['admin', 'coach', 'parent'];

  // Retired role that may still sit on older accounts. It is accepted as a plain
  // admin so those users keep working instead of being locked out on deploy, but
  // it can no longer be assigned — editing such an account in the portal saves it
  // back as "admin", which migrates it. lms/js/auth.js does the same mapping.
  const LEGACY_ADMIN_ALIASES = ['coach-admin', 'coach+admin'];

  // Who may call this endpoint. "master" is the owner: admin-level here, but
  // deliberately absent from ASSIGNABLE_ROLES so it cannot be handed out.
  const ADMIN_ROLES = ['master', 'admin', ...LEGACY_ADMIN_ALIASES];
  const normaliseRole = (r) => String(r || '').trim().toLowerCase();

  const callerRole = normaliseRole(auth.role);
  const isMaster = callerRole === 'master';

  // Deliberately NOT accepting 'service_role' here. validateAuth() reports that
  // role for the publishable anon key as well as for the real service-role key,
  // and the anon key ships in the browser — trusting it would hand full user
  // administration to anyone who reads the page source. No internal caller uses
  // this endpoint, so there is nothing to lose by refusing it.
  if (!ADMIN_ROLES.includes(callerRole)) {
    return corsResponse({
      error: callerRole === 'service_role'
        ? 'Unauthorized: this endpoint requires a signed-in admin, not an API key'
        : 'Unauthorized: Admin privileges required'
    }, 403, origin);
  }

  // Reading a user's stored role, used by the guards below.
  const storedRoleOf = async (userId) => {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    return { user: data.user, role: normaliseRole(data.user.user_metadata?.role) };
  };

  try {
    const method = req.method;

    if (method === 'GET') {
      // List users
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;

      const safeUsers = users.users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.user_metadata?.role || 'unknown',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      }));

      return corsResponse({ users: safeUsers }, 200, origin);
    }

    if (method === 'POST') {
      // Create user
      const body = await req.json();
      const { email, password } = body;
      const role = normaliseRole(body.role);

      if (!email || !password || !role) {
        return corsResponse({ error: 'Email, password, and role are required' }, 400, origin);
      }

      // Reject anything the portal cannot act on. Without this a typo ("Admin",
      // "student") created an account that authenticated fine but matched none
      // of the portal's role gates, so it had no access to anything.
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return corsResponse({
          error: `Invalid role "${body.role}". Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
        }, 400, origin);
      }

      if (String(password).length < 8) {
        return corsResponse({ error: 'Password must be at least 8 characters' }, 400, origin);
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: role }
      });

      if (error) throw error;

      return corsResponse({ success: true, user: data.user }, 201, origin);
    }

    if (method === 'PUT') {
      // Update user role or password
      const body = await req.json();
      const { id, password } = body;
      const newRole = body.role ? normaliseRole(body.role) : null;

      if (!id) {
        return corsResponse({ error: 'User ID is required' }, 400, origin);
      }
      if (!newRole && !password) {
        return corsResponse({ error: 'Nothing to update: provide a role or a password' }, 400, origin);
      }
      if (newRole && !ASSIGNABLE_ROLES.includes(newRole)) {
        return corsResponse({
          error: `Invalid role "${body.role}". Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
        }, 400, origin);
      }
      if (password && String(password).length < 8) {
        return corsResponse({ error: 'Password must be at least 8 characters' }, 400, origin);
      }

      const target = await storedRoleOf(id);
      if (!target) {
        return corsResponse({ error: 'User not found' }, 404, origin);
      }

      if (newRole) {
        // Don't let an admin lock themselves out of this very screen.
        if (auth.user && auth.user.id === id && !ADMIN_ROLES.includes(newRole)) {
          return corsResponse({
            error: 'You cannot remove your own admin access. Ask another admin to do it.'
          }, 403, origin);
        }
        // master is the owner account and is not assignable, so the only way to
        // touch one is to demote it. Reserve that for another master.
        if (target.role === 'master' && !isMaster) {
          return corsResponse({ error: 'Only a master account can change the master account' }, 403, origin);
        }
      }

      const updates = {};
      if (newRole) {
        // Merge, never replace. Sending { role } alone dropped every other key —
        // student_id, coach_id, name — so changing somebody's role silently
        // unlinked their portal account from its student or coach record.
        updates.user_metadata = { ...(target.user.user_metadata || {}), role: newRole };
      }
      if (password) updates.password = password;

      const { data, error } = await supabase.auth.admin.updateUserById(id, updates);

      if (error) throw error;

      return corsResponse({ success: true, user: data.user }, 200, origin);
    }

    if (method === 'DELETE') {
      // Delete user
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return corsResponse({ error: 'User ID is required' }, 400, origin);
      }
      if (auth.user && auth.user.id === id) {
        return corsResponse({ error: 'You cannot revoke your own access' }, 403, origin);
      }

      const target = await storedRoleOf(id);
      if (!target) {
        return corsResponse({ error: 'User not found' }, 404, origin);
      }
      if (target.role === 'master' && !isMaster) {
        return corsResponse({ error: 'Only a master account can revoke another master' }, 403, origin);
      }

      const { error } = await supabase.auth.admin.deleteUser(id);

      if (error) throw error;

      return corsResponse({ success: true }, 200, origin);
    }

    return corsResponse({ error: 'Method not allowed' }, 405, origin);

  } catch (error) {
    console.error('Access Control error:', error.message);
    return corsResponse({ error: error.message }, 500, origin);
  }
})
