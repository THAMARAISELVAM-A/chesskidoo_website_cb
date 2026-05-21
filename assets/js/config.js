/* assets/js/config.js -------------------------------------------------------
   ChessKidoo — Runtime Configuration
   
   SECURITY NOTE:
   The Supabase ANON KEY is intentionally public — it is designed for
   client-side use and is restricted by Row Level Security (RLS) policies
   in Supabase. It cannot access data beyond what RLS permits.
   
   Never commit SERVICE_ROLE keys or private secrets here.
   --------------------------------------------------------------- */

// Guarantee the CK namespace exists before any module attaches to it
window.CK = window.CK || {};

window.APP_CONFIG = {
  SUPABASE_URL:     "https://hcjuyqicftkgpiyrkscr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjanV5cWljZnRrZ3BpeXJrc2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTE4NTIsImV4cCI6MjA5MzEyNzg1Mn0.utVxS7jX2GH9mIVbKquuQFCyH99nUmP_geWI8hhWJP4",

  // Admin UUID from Supabase Auth (set after creating the admin user)
  ADMIN_UUID:       "a007b0b0-9b30-478f-a147-1af18dff20ce",

  // Razorpay — replace with your live key from dashboard.razorpay.com
  // Test key format: rzp_test_XXXXXXXXXXXXXXXX
  // Live key format: rzp_live_XXXXXXXXXXXXXXXX
  RAZORPAY_KEY:     "rzp_test_REPLACE_WITH_YOUR_KEY",

  // Academy display info
  ACADEMY_NAME:     "ChessKidoo Academy",
  ACADEMY_EMAIL:    "Chesskidoo37@gmail.com",
  ACADEMY_PHONE:    "+91 90258 46663",
  ACADEMY_CITY:     "Chennai, Tamil Nadu",

  // UPI Payment — direct bank transfer (no gateway needed)
  // IMPORTANT: Replace ACADEMY_UPI_ID with the actual UPI VPA from your bank app
  // (e.g. ranjithas@okaxis, 9025846663@ybl, etc.)
  ACADEMY_UPI_ID:     "9025846663@upi",
  ACADEMY_UPI_NAME:   "Ranjith A S",
  ACADEMY_UPI_MOBILE: "9025846663",

  // EmailJS (public keys — safe for client-side)
  EMAILJS_SERVICE:  "service_7mn07q9",
  EMAILJS_TEMPLATE: "template_3lumv9c",
  EMAILJS_KEY:      "1EuHvvzi2H9RnaBF6"
};

// Expose Razorpay key via global for student.js payment gateway
window.CK_RAZORPAY_KEY = window.APP_CONFIG.RAZORPAY_KEY;

// HTML-escape helper — use CK.esc(str) inside any innerHTML template
// to prevent XSS from user-supplied names, notes, and descriptions.
window.CK = window.CK || {};
window.CK.esc = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Initialize Supabase Client
(function initSupabase() {
  const maxRetries = 10;
  let retries = 0;

  function attemptInit() {
    if (window.supabase) {
      try {
        window.supabaseClient = window.supabase.createClient(
          window.APP_CONFIG.SUPABASE_URL,
          window.APP_CONFIG.SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: false
            }
          }
        );
      } catch (e) {
        console.error("[ChessKidoo] Supabase init failed:", e);
      }
    } else {
      retries++;
      if (retries < maxRetries) {
        console.warn(`[ChessKidoo] Supabase SDK not ready, retrying... (${retries}/${maxRetries})`);
        setTimeout(attemptInit, 500);
      } else {
        console.error("[ChessKidoo] Supabase SDK failed to load after multiple attempts. Check CDN import.");
      }
    }
  }

  attemptInit();
})();

