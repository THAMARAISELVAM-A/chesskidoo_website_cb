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
  // Only master or admin roles can access this endpoint
  if (auth.role !== 'master' && auth.role !== 'admin') {
    return corsResponse({ error: 'Unauthorized: Admin privileges required' }, 403, origin);
  }

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
      const { email, password, role } = body;

      if (!email || !password || !role) {
        return corsResponse({ error: 'Email, password, and role are required' }, 400, origin);
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
      const { id, role: newRole, password } = body;

      if (!id) {
        return corsResponse({ error: 'User ID is required' }, 400, origin);
      }

      const updates = {};
      if (newRole) updates.user_metadata = { role: newRole };
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
