/**
 * src/lib/supabase.js
 * Single Supabase client instance for the whole app.
 * Credentials come from Vite env vars (VITE_* prefix exposes them to client).
 */
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  throw new Error(
    '[ChessKidoo] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
      'Copy .env.example → .env.local and fill in your project credentials.'
  );
}

export const supabase = createClient(URL, KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Convenience: current signed-in user (null if not authenticated) */
export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Convenience: current session (null if not authenticated) */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
