import { checkRateLimit } from './rate_limit.js'

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token, x-portal-role, x-portal-student-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Rate Limiting ---
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'auth')

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Input Validation ---
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const action = String(body.action || '').trim()
  const username = String(body.username || '').trim()
  const password = String(body.password || '').trim()

  if (action !== 'login' || !username || !password) {
    return new Response(JSON.stringify({ error: 'Missing action, username, or password' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Sanitization ---
  function sanitizeString(str: unknown, maxLength = 255): string {
    if (typeof str !== 'string') return ''
    return str.slice(0, maxLength).replace(/[<>"'`;]/g, '').trim()
  }

  const cleanUser = sanitizeString(username, 120)
  const cleanPass = sanitizeString(password, 120)

  if (!cleanUser || !cleanPass) {
    return new Response(JSON.stringify({ error: 'Invalid credentials format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Try Supabase Auth first ---
  const email = cleanUser.includes('@') ? cleanUser : `${cleanUser.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`

  let sbJwt: string | null = null
  let sbUser: any = null
  let sbError: any = null

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass
    })
    sbUser = data.user
    sbError = error
    if (data.session?.access_token) {
      sbJwt = data.session.access_token
    }
  } catch (e) {
    sbError = e
  }

  if (sbUser && !sbError) {
    const role = String(sbUser.user_metadata?.role || 'authenticated').trim().toLowerCase()
    return new Response(JSON.stringify({
      success: true,
      role: role,
      user: sbUser.email || cleanUser,
      student_id: sbUser.user_metadata?.student_id || null,
      coach_id: sbUser.user_metadata?.coach_id || null,
      token: sbJwt
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // --- Fallback: Check coaches table with default passwords ---
  const defaultPasswords = ['coach123', 'chess123', 'admin123']
  const isDefaultPass = defaultPasswords.includes(cleanPass)

  if (isDefaultPass) {
    const normUser = cleanUser.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

    // --- Admin Login Support ---
    if (normUser === 'admin' || normUser === 'administrator' || normUser === 'superadmin') {
      const token = `admin-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`
      return new Response(JSON.stringify({
        success: true,
        role: 'admin',
        user: 'Admin',
        student_id: null,
        coach_id: null,
        token: token
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let coach = null
    try {
      const { data } = await supabase
        .from('coaches')
        .select('*')
        .or(`name.ilike.%${normUser}%,email.ilike.%${normUser}%,id.eq.${normUser}`)
        .limit(1)
      coach = data && data.length > 0 ? data[0] : null
    } catch {}

    if (!coach) {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .ilike('role', '%coach%')
          .or(`name.ilike.%${normUser}%,email.ilike.%${normUser}%,id.eq.${normUser}`)
          .limit(1)
        coach = data && data.length > 0 ? data[0] : null
      } catch {}
    }

    if (coach || normUser === 'coach' || normUser.startsWith('coach') || normUser === 'headcoach' || normUser === 'trainer') {
      const displayRole = 'coach'
      const coachId = coach?.id || 'coach-1'
      const coachName = coach?.name || cleanUser

      // Create a session token for the coach
      const token = `coach-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`

      return new Response(JSON.stringify({
        success: true,
        role: displayRole,
        user: coachName,
        student_id: null,
        coach_id: String(coachId),
        token: token
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // --- Fallback: Check students table ---
  let student = null
  try {
    const { data } = await supabase
      .from('students')
      .select('*')
      .or(`name.ilike.%${cleanUser}%,email.ilike.%${cleanUser}%,id.eq.${cleanUser}`)
      .limit(1)
    student = data && data.length > 0 ? data[0] : null
  } catch {}

  if (!student) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('role', '%student%')
        .or(`name.ilike.%${cleanUser}%,email.ilike.%${cleanUser}%,id.eq.${cleanUser}`)
        .limit(1)
      student = data && data.length > 0 ? data[0] : null
    } catch {}
  }

  if (student) {
    // For students, check for valid Supabase auth or default password
    const studentDefaultPasswords = ['123456', 'student123', 'password'];
    const isValidStudentPass = sbJwt || studentDefaultPasswords.includes(cleanPass);

    if (isValidStudentPass) {
      // Create a session token for the student
      const token = sbJwt || `student-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Response(JSON.stringify({
        success: true,
        role: 'student',
        user: student.name || student.email || cleanUser,
        student_id: String(student.id),
        coach_id: null,
        token: token
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
