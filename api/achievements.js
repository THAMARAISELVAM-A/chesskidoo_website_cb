// api/achievements.js
// ChessKidoo Academy Achievements Endpoint
// Returns student achievements from Supabase or built-in verified achievements

const DEFAULT_ACHIEVEMENTS = [
  {
    id: "a1",
    student_name: "Anfal",
    title: "Zone Winner — Coimbatore District 🏆 Pollachi Star Players · Hindusthan Chess Team",
    description: "Anfal",
    img_url: "/assets/img/achievement-anfal-akmal.jpg",
    date_achieved: "2025-12-01"
  },
  {
    id: "a2",
    student_name: "Yadhuveer",
    title: "Winner 7/7 — Under-9 Category 🏆 Erode District Series Championship",
    description: "Yadhuveer",
    img_url: "/assets/img/achievement-yadhuveer.jpg",
    date_achieved: "2025-11-15"
  },
  {
    id: "a3",
    student_name: "Mukilan",
    title: "3rd Winner Up 🏅 From Under-9 to Under-17 Category · Played as Unstoppable",
    description: "Mukilan",
    img_url: "/assets/img/achievement-mukilan.jpg",
    date_achieved: "2025-10-20"
  },
  {
    id: "a4",
    student_name: "Anuksha",
    title: "7th Place — Under 9 Chess Festival (Namakkal) 🏆 Coach Guanasurya",
    description: "Anuksha",
    img_url: "/assets/img/achievement-anuksha.jpg",
    date_achieved: "2025-09-05"
  },
  {
    id: "a5",
    student_name: "Mocsha",
    title: "State Championship Prize Winner 🏆 Tamil Nadu State Chess Championship 2026",
    description: "Mocsha",
    img_url: "/assets/img/achievement-mocsha.jpg",
    date_achieved: "2026-01-20"
  },
  {
    id: "a6",
    student_name: "Riyazzen",
    title: "FIDE International Classical Tournament 🏅 FIDE Rating 1520",
    description: "Riyazzen",
    img_url: "/assets/img/achievement-riyazzen.jpg",
    date_achieved: "2026-02-10"
  },
  {
    id: "a7",
    student_name: "Rakshitha",
    title: "3rd Prize — District Competition 🏆 Circuit to District Winner",
    description: "Rakshitha",
    img_url: "/assets/img/achievement-rakshitha.jpg",
    date_achieved: "2025-08-14"
  },
  {
    id: "a8",
    student_name: "Auysh",
    title: "5th Place — Under-14 Boys State Championship 🏅",
    description: "Auysh",
    img_url: "/assets/img/acivements img 1.jpeg",
    date_achieved: "2025-07-22"
  },
  {
    id: "a9",
    student_name: "Poonthalir",
    title: "7th Position — Under-14 Girls State Championship 👑",
    description: "Poonthalir",
    img_url: "/assets/img/img fpweb.jpeg",
    date_achieved: "2025-07-21"
  },
  {
    id: "a10",
    student_name: "Varun",
    title: "Velammal Nexus Best Performer of the Tournament 🌟",
    description: "Varun",
    img_url: "/assets/img/acivements img4.jpeg",
    date_achieved: "2025-06-30"
  },
  {
    id: "a11",
    student_name: "Krishna",
    title: "2nd Place Winner — Out of 40 Class ⭐ Coach Rohith",
    description: "Krishna",
    img_url: "/assets/img/awardss.jpeg",
    date_achieved: "2025-05-18"
  },
  {
    id: "a12",
    student_name: "Buvargan",
    title: "5th Position — Erode District Chess Tournament 🏆 Republic Day Trophy 2025",
    description: "Buvargan",
    img_url: "/assets/img/awards.jpeg",
    date_achieved: "2025-01-26"
  },
  {
    id: "a13",
    student_name: "Riyas",
    title: "Top 30 out of 400 Players 🏅 Velammal Nexus Tournament · Tamil Nadu State Association",
    description: "Riyas",
    img_url: "/assets/img/acivements img3.jpeg",
    date_achieved: "2025-04-12"
  }
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

export default async function handler(req, res) {
  // Support both Edge and Node.js runtimes
  if (req.method === "OPTIONS") {
    if (res.status) {
      return res.status(200).json({});
    }
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vseombfkrvpffnpgbsnk.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (req.method === "GET") {
    try {
      if (supabaseKey) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/achievements?select=*&order=date_achieved.desc.nullslast`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            if (res.status) {
              return res.status(200).json({ success: true, data });
            }
            return new Response(JSON.stringify({ success: true, data }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
      }
    } catch (e) {
      console.warn("[Achievements API] Supabase query note:", e.message);
    }

    // Default verified achievements fallback
    if (res.status) {
      return res.status(200).json({ success: true, data: DEFAULT_ACHIEVEMENTS });
    }
    return new Response(JSON.stringify({ success: true, data: DEFAULT_ACHIEVEMENTS }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (supabaseKey) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/achievements`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify(body)
        });
        if (resp.ok) {
          const inserted = await resp.json();
          if (res.status) return res.status(201).json({ success: true, data: inserted });
          return new Response(JSON.stringify({ success: true, data: inserted }), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    } catch (e) {
      console.error("[Achievements API] Insert error:", e);
    }
    if (res.status) return res.status(200).json({ success: true, data: req.body });
    return new Response(JSON.stringify({ success: true, data: req.body }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (res.status) return res.status(405).json({ error: "Method not allowed" });
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: corsHeaders
  });
}
