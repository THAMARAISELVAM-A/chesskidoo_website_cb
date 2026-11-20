// api/chess-news.js
// ChessKidoo Academy — Auto-Fetch Chess News Endpoint
// Fetches latest chess news from multiple sources and returns as JSON

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

// Curated fallback news (updated periodically)
const FALLBACK_NEWS = [
  { title: "FIDE Candidates Tournament 2026: Full Schedule & Participants", source: "FIDE", url: "https://www.fide.com/regular/tournaments/", date: "Nov 2026", img: "🏆" },
  { title: "GM Praggnanandhaa Wins Prague Masters 2026", source: "ChessBase", url: "https://en.chessbase.com", date: "Mar 2026", img: "♟️" },
  { title: "Bodhana Sivanandan Becomes Youngest Female IM in History", source: "ChessBase India", url: "https://chessbase.in", date: "Oct 2026", img: "👑" },
  { title: "Lichess New Features: Enhanced Training & Analysis", source: "Lichess", url: "https://lichess.org/blog", date: "Nov 2026", img: "🎮" },
  { title: "Chess.com Global Championship: Registration Open", source: "Chess.com", url: "https://www.chess.com/news", date: "Nov 2026", img: "🌐" },
  { title: "Indian Chess: 99 Grandmasters and Counting", source: "ChessBase India", url: "https://chessbase.in", date: "Nov 2026", img: "🇮🇳" },
  { title: "FIDE World Rapid & Blitz Championship 2026 Announced", source: "FIDE", url: "https://www.fide.com", date: "Nov 2026", img: "🌍" },
  { title: "ChessKidoo Academy: New Training Programs Launched", source: "ChessKidoo", url: "https://chesskidoo.com", date: "Nov 2026", img: "📚" },
];

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    if (res.status) return res.status(200).json({});
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    if (res.status) return res.status(405).json({ error: "Method not allowed" });
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  // Try to fetch live news from ChessBase RSS (public feed)
  const liveNews = [];
  const sources = [
    { url: "https://en.chessbase.com/rss", source: "ChessBase", img: "♟️" },
  ];

  for (const src of sources) {
    try {
      const resp = await fetch(src.url, { headers: { "User-Agent": "ChessKidoo/1.0" } });
      if (resp.ok) {
        const text = await resp.text();
        // Simple RSS parser
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
        for (const item of items.slice(0, 4)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
          const link = (item.match(/<link>(.*?)<\/link>/))?.[1] || "";
          const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
          if (title && link) {
            liveNews.push({
              title: title.trim(),
              source: src.source,
              url: link.trim(),
              date: pubDate ? new Date(pubDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recent",
              img: src.img
            });
          }
        }
      }
    } catch (e) {
      console.warn("[Chess News] Fetch note:", e.message);
    }
  }

  const news = liveNews.length > 0 ? liveNews : FALLBACK_NEWS;

  if (res.status) {
    return res.status(200).json({ success: true, data: news, live: liveNews.length > 0 });
  }
  return new Response(JSON.stringify({ success: true, data: news, live: liveNews.length > 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
