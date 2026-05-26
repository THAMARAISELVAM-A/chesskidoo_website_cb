/* ════════════════════════════════════════════════════════════════════
   TOM — ChessKidoo intelligent assistant (v2)
   ────────────────────────────────────────────────────────────────────
   Lives in the global CK namespace as `CK.tomai`. Rule-based chatbot
   tailored to the ChessKidoo platform.

   v2 Improvements:
   - Polished detailed knight SVG icon (matches a real chess piece)
   - Unique gradient IDs per instance (so multiple renders don't collide)
   - Robust init (multiple triggers + fallback) so the launcher always shows
   - Context awareness: detects active portal/page and tailors answers
   - Expanded knowledge bank with per-portal commands
   - Better intent matching with synonyms
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const CK = window.CK = window.CK || {};
  if (CK.tomai && CK.tomai._initialized) { return; } // idempotent

  const TOM = CK.tomai = {};
  TOM._initialized = false;
  TOM._open = false;
  TOM._history = [];
  TOM._STORAGE_KEY = 'ck_tomai_history_v2';
  TOM._MAX_HISTORY = 50;
  TOM._svgInstance = 0;

  // ────────────────────────────────────────────────────────────────
  // 0. Staunton knight icon — clean, readable at 22px on gold disc
  // ────────────────────────────────────────────────────────────────
  TOM.knightSVG = function (variant) {
    variant = variant || 'dark';
    const fill = variant === 'light' ? '#fffdf6' : '#1A1209';
    const eye  = variant === 'light' ? '#1A1209' : '#F5C842';
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="${fill}">
        <path d="M15.5 21H4.5l1-3.5h9zM5 17.5 L4 15h12.5l-1 2.5z"/>
        <path d="M17 14.5 c-.3-1-.6-1.9-1-2.8 c-.7-1.6-1.7-3-3-4.2 L14 5 L11.5 6 L11 3.5 L8.5 6.2 c-1.4 1-2.5 2.4-3.2 4 C4.8 12 4.7 13.4 5 14.5z"/>
        <circle cx="14" cy="9.5" r=".7" fill="${eye}"/>
      </svg>`;
  };

  // ────────────────────────────────────────────────────────────────
  // 1. Context detector — which portal/page is the user on?
  // ────────────────────────────────────────────────────────────────
  TOM.getContext = function () {
    const ctx = { page: 'unknown', portal: null, panel: null };
    try {
      const active = document.querySelector('.page.active');
      if (active) {
        ctx.page = (active.id || '').replace('-page', '') || 'unknown';
      }
      // Portal-specific panel detection (the .p-panel.active inside the portal)
      const portalActive = document.querySelector('#admin-page.active, #student-page.active, #coach-page.active, #parent-page.active');
      if (portalActive) {
        ctx.portal = portalActive.id.replace('-page', '');
        const panel = portalActive.querySelector('.p-panel.active');
        if (panel) {
          ctx.panel = (panel.id || '').replace(/^p-panel-/, '').replace(/^student-panel-/, '')
                      .replace(/^coach-panel-/, '').replace(/^par-panel-/, '');
        }
      }
    } catch (e) { /* ignore */ }
    return ctx;
  };

  function contextGreeting() {
    const c = TOM.getContext();
    if (c.portal === 'admin')
      return `👋 You're in the **Admin Portal**. I can help with managing students, coaches, fees, attendance, reports, and the academy database.`;
    if (c.portal === 'student')
      return `👋 You're in the **Student Portal**. I can help with classes, puzzles, your progress, fees, and using the AI Arena.`;
    if (c.portal === 'coach')
      return `👋 You're in the **Coach Portal**. I can help with running live sessions, attendance, assigning puzzles, and student management.`;
    if (c.portal === 'parent')
      return `👋 You're in the **Parent Portal**. I can help track your child's progress, attendance, fees, and contact coaches.`;
    if (c.page === 'arena')
      return `♞ You're in the **AI Arena**. Ask me about difficulty levels, the analysis report, certificates, AI personalities, or how to play any move.`;
    if (c.page === 'more-games')
      return `🎮 You're in **More Games**. Ask me about any of the 9 mini-games — Puzzle Challenge, Memory Match, Knight's Star Catcher, and more.`;
    return `Hi! I'm **TOM** — your ChessKidoo assistant.`;
  }

  function contextSuggestions() {
    const c = TOM.getContext();
    if (c.portal === 'admin')
      return ['How do I add a student?', 'Show me reports', 'Manage fees', 'Mark attendance'];
    if (c.portal === 'student')
      return ['Show my puzzles', 'When is my next class?', 'Pay my fee', 'Try the Arena'];
    if (c.portal === 'coach')
      return ['Start a live session', 'Assign a puzzle', 'Mark attendance', 'My students'];
    if (c.portal === 'parent')
      return ["Show my child's progress", "Pay fees", "Contact coach", "Attendance"];
    if (c.page === 'arena')
      return ['How are levels different?', 'What is a brilliant move?', 'Show my certificate', 'How does the engine work?'];
    if (c.page === 'more-games')
      return ['What is Knight\'s Star Catcher?', 'How to play Memory Match?', 'Show me Quiz Blitz'];
    return ['What classes do you offer?', 'How much are the fees?', 'How to play chess?', 'Open the Arena'];
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Knowledge bank
  // ────────────────────────────────────────────────────────────────
  const KB = TOM._kb = [
    // ───── Smalltalk ─────
    { id: 'greet', priority: 90,
      patterns: [/\b(hi|hello|hey|yo|hola|howdy|hii+|namaste|vanakkam)\b/i, /^good\s+(morning|afternoon|evening)/i],
      answer: () => `${contextGreeting()}\n\nWhat would you like to know?`,
      suggest: contextSuggestions,
    },
    { id: 'thanks', priority: 90,
      patterns: [/\b(thanks|thank you|thx|ty|appreciate|nandri)\b/i],
      answer: () => `You're welcome! Happy to help. Anything else?`,
      suggest: contextSuggestions,
    },
    { id: 'bye', priority: 90,
      patterns: [/\b(bye|goodbye|see you|cya|later)\b/i],
      answer: () => `Goodbye! Come back any time. ♞`,
      suggest: () => [],
    },
    { id: 'who', priority: 80,
      patterns: [/who\s+(are|r)\s+(you|u)/i, /\bwhat\s+is\s+tom\s*ai/i, /\bwho.*tom/i, /your name/i],
      answer: () => `I'm **TOM** — the ChessKidoo Academy's intelligent assistant. I know everything about our chess programmes, coaches, fees, schedules, and the platform itself. Ask me anything!`,
      suggest: () => ['Show me programmes', 'Who is Coach Ranjith?', 'How do I sign up?'],
    },
    { id: 'where-am-i', priority: 80,
      patterns: [/where\s+am\s+i|what\s+page|which\s+(portal|page)/i],
      answer: () => {
        const c = TOM.getContext();
        if (c.portal) return `You're currently in the **${c.portal[0].toUpperCase() + c.portal.slice(1)} Portal**${c.panel ? ` (${c.panel} section)` : ''}.`;
        if (c.page === 'arena') return `You're in the **AI Challenge Arena** — play chess against Stockfish.`;
        if (c.page === 'more-games') return `You're in **More Games** — chess mini-games hub.`;
        if (c.page === 'landing' || c.page === 'home') return `You're on the **Home / Landing page**.`;
        if (c.page === 'login') return `You're on the **Login page**.`;
        return `You're on the ChessKidoo website.`;
      },
      suggest: contextSuggestions,
    },

    // ───── Portal-specific (admin) ─────
    { id: 'admin-add-student', priority: 85,
      patterns: [/add.*student|enroll.*student|new student|register.*student/i],
      answer: () => `In the **Admin Portal**, click the gold **+ Add Student** button in the top-right of the topbar. Fill in name, parent contact, level, and assigned coach. Default password is **123456** — students can change it after first login.`,
      suggest: () => ['Open admin portal', 'How to add coach?', 'Show fees'],
    },
    { id: 'admin-add-coach', priority: 85,
      patterns: [/add.*coach|hire.*coach|new coach/i],
      answer: () => `In the **Admin Portal → Coaches** panel, click **+ Add Coach**. Enter their name, specialisation, contact, and availability. They'll receive login credentials by email.`,
      suggest: () => ['Open admin portal', 'Manage students'],
    },
    { id: 'admin-reports', priority: 80,
      patterns: [/report(s)?|analytic|stat(s|istic)?|revenue|earning/i],
      answer: () => `The **Reports & Analytics** panel in Admin shows attendance trends, revenue, student engagement, top performers, and coach activity. Each report can be exported as PDF or CSV.`,
      suggest: () => ['Open admin reports', 'Manage fees', 'Attendance'],
    },
    { id: 'admin-attendance', priority: 80,
      patterns: [/attendance|present|absent|roll\s*call/i],
      answer: () => `Attendance is marked by **coaches** during each session. Admin can review attendance per student in the **Attendance** panel — filter by date range, student, or coach.`,
      suggest: () => ['Open attendance', 'Show reports'],
    },

    // ───── Portal-specific (student) ─────
    { id: 'student-class', priority: 85,
      patterns: [/next.*class|when.*class|my.*class|schedule.*today|live.*class/i],
      answer: () => `Your upcoming classes are shown on the **Student → Home** dashboard with a "Live Class" badge when one is in progress. Click **Join Live Classroom** to enter the session with your coach.`,
      suggest: () => ['Open student dashboard', 'Show puzzles'],
    },
    { id: 'student-puzzle', priority: 80,
      patterns: [/my.*puzzle|solve.*puzzle|daily.*tactic/i],
      answer: () => `Open the **Puzzles** panel in your portal. Solve sets of tactics sorted by theme (forks, pins, mates) and difficulty. Each solved puzzle adds to your **daily streak**.`,
      suggest: () => ['Open puzzles', 'Try the Arena', 'Show my progress'],
    },
    { id: 'student-progress', priority: 75,
      patterns: [/my.*progress|my.*rating|my.*stats|how.*am.*doing/i],
      answer: () => `In the **Student → Progress** panel you'll see your rating chart, puzzle streak, accuracy trends, and recent game results. Coaches can also leave personalised feedback there.`,
      suggest: () => ['Show puzzles', 'Try the Arena'],
    },

    // ───── Portal-specific (coach) ─────
    { id: 'coach-live', priority: 85,
      patterns: [/start.*live|live.*session|live.*class|broadcast/i],
      answer: () => `From the **Coach → Live Session** panel, click **Start Live Session**. Choose the class, share your board, and your students get a "Join Live" notification on their portal home. Use the integrated chess board for synced moves and the chat for Q&A.`,
      suggest: () => ['Assign a puzzle', 'My students', 'Mark attendance'],
    },
    { id: 'coach-assign-puzzle', priority: 85,
      patterns: [/assign.*puzzle|give.*tactic|push.*puzzle/i],
      answer: () => `Inside the **Coach → Assign Puzzles** panel, search by theme or rating, select students, and click **Assign**. Students get the puzzle in their queue with a deadline notification.`,
      suggest: () => ['Start live session', 'Show my students'],
    },

    // ───── Portal-specific (parent) ─────
    { id: 'parent-child-progress', priority: 85,
      patterns: [/(my\s+)?child.*progress|child.*rating|(my\s+)?kid.*progress|my\s+child/i],
      answer: () => `In the **Parent → Progress** panel you'll see your child's full progress: attendance %, current rating, completed puzzles, coach reports, and upcoming sessions. Click any item for details.`,
      suggest: () => ['Pay fees', 'Contact coach', 'Attendance history'],
    },
    { id: 'parent-pay', priority: 80,
      patterns: [/pay.*fee|fee.*due|invoice/i],
      answer: () => `Open the **Parent → Fee Payment** panel. You'll see the next due date and amount. Click **Pay Now** to settle via UPI / Google Pay / card. Receipts are emailed and saved in your portal.`,
      suggest: () => ["Show child progress", 'Contact coach'],
    },

    // ───── Academy info ─────
    { id: 'about', priority: 70,
      patterns: [/\babout\s+chesskid|about\s+(the\s+)?academy|what\s+is\s+chesskid/i, /\btell\s+me.*chesskid/i],
      answer: () => `**ChessKidoo Academy** is a chess training platform for kids and adults built around personalised coaching, AI-driven analysis, and a vibrant community. We blend live classes, an AI Arena (play & learn against Stockfish), puzzles, and game review tools — all on one platform.\n\nFounded by **Coach Ranjith A S**, our mission is *Building Brilliance Through Chess and AI*.`,
      suggest: () => ['What programmes?', 'Meet the coaches', 'How much are fees?'],
    },
    { id: 'programmes', priority: 70,
      patterns: [/\b(class|classes|programme|program|course|level|curriculum|tier)\b/i, /what.*offer|what.*teach/i],
      answer: () => `We offer **3 main tiers**:\n\n🌱 **Beginner Level** — Learn the rules, basic tactics, opening principles. For ages 6+.\n\n⚡ **Intermediate Level** — Combinations, endgames, opening repertoires. Up to ~1400.\n\n🔥 **Advanced Level** — Deep strategy, calculation, tournament prep. 1400+.\n\nAll programmes include live coaching, AI Arena access, puzzles, and personalised analysis.`,
      suggest: () => ['How much are fees?', 'Book a demo', 'Meet the coaches'],
    },
    { id: 'coaches', priority: 65,
      patterns: [/\bcoach(es)?\b|\binstructor|\bteacher|\btrainer/i, /\bwho.*teach/i],
      answer: () => `Our **lead coach** is **Ranjith A S** — Academy Director, with years of experience training students for tournaments. Specialist coaches handle tactics, openings, and endgames.\n\nInside the platform you can also play against four AI personalities: **Magnus (balanced)**, **Tal (aggressive)**, **Petrosian (defensive)**, and **Beth (tactical)**.`,
      suggest: () => ['Book a demo', 'Try the AI Arena', 'Show programmes'],
    },
    { id: 'ranjith', priority: 80,
      patterns: [/\branjith|ranjit/i, /\bdirector\b/i],
      answer: () => `**Coach Ranjith A S** is the Academy Director of ChessKidoo. He has personally trained dozens of students from beginner to tournament level and designed the curriculum. Book a one-on-one session or join his group classes.`,
      suggest: () => ['Book a demo', 'Contact academy'],
    },

    // ───── Fees / pricing ─────
    { id: 'fees', priority: 75,
      patterns: [/\b(fee|fees|price|pricing|cost|charge|how much)\b/i, /\bmonthly\b|\bsubscription\b/i],
      answer: () => `Our fees depend on the plan:\n\n💎 **Group Classes** — affordable monthly subscription with 8 sessions/month.\n💎 **1-on-1 Coaching** — personalised plans with our lead coaches.\n💎 **Premium Plus** — unlimited AI Arena, all puzzles, deep analysis reports.\n\nFor exact pricing, please **book a free demo** — we'll share the plan that fits you best.`,
      suggest: () => ['Book a free demo', 'Payment methods?', 'Refund policy?'],
    },
    { id: 'pay', priority: 70,
      patterns: [/\b(pay|payment|upi|gpay|google\s*pay|card|paypal)\b/i],
      answer: () => `We accept **UPI / Google Pay**, **debit/credit cards**, and **bank transfer**. Students/parents can pay securely from the **Fee Payment** section inside their portal. Receipts are issued automatically.`,
      suggest: () => ['Show fee section', 'Book a demo'],
    },
    { id: 'refund', priority: 65,
      patterns: [/\brefund|cancel.*(class|subscription|plan)/i],
      answer: () => `We offer a **prorated refund** if you cancel within the first week of your plan. Contact the academy at **Chesskidoo37@gmail.com** or via WhatsApp for cancellations.`,
      suggest: () => ['Contact academy', 'Show fees'],
    },

    // ───── Demo / signup / contact ─────
    { id: 'demo', priority: 80,
      patterns: [/\b(demo|trial|free class|book.*class|book.*session|try.*free)\b/i, /\bsign\s*up|register|join/i],
      answer: () => `Awesome — book a **free demo class** by clicking *Book Free Demo* on the home page, or message us:\n\n📧 **Chesskidoo37@gmail.com**\n💬 **WhatsApp: +91 9025846663**\n\nWe'll set up a 30-minute intro session at a time that works for you.`,
      suggest: () => ['Open demo form', 'WhatsApp us', 'Show fees'],
      action: () => { if (CK.openDemoModal) CK.openDemoModal(); },
    },
    { id: 'contact', priority: 70,
      patterns: [/\b(contact|reach|email|phone|whatsapp|call)\b/i],
      answer: () => `Get in touch:\n\n📧 **Chesskidoo37@gmail.com**\n💬 **WhatsApp: +91 9025846663**\n📍 Online classes, India\n\nWe usually reply within a few hours.`,
      suggest: () => ['Book a demo', 'Show programmes'],
    },
    { id: 'timings', priority: 65,
      patterns: [/\b(time|timing|schedule|when.*class|when.*open|hour)\b/i],
      answer: () => `Group classes run **weekdays 5–8 pm** and **weekends 9 am–7 pm** (IST). 1-on-1 sessions are scheduled flexibly — pick what fits you when you book a demo.`,
      suggest: () => ['Book a demo', 'See my schedule'],
    },

    // ───── Platform features ─────
    { id: 'arena', priority: 75,
      patterns: [/\b(ai\s*arena|arena|play.*ai|play.*computer|stockfish)\b/i],
      answer: () => `Our **AI Arena** lets you play chess against **Stockfish** (the strongest open-source engine) with four personalities and 4 difficulty levels — **Beginner / Intermediate / Advanced / Expert**.\n\nAt the end of every game you get a full analysis report with move classifications (brilliant / best / mistake / blunder), accuracy %, and a downloadable certificate.`,
      suggest: () => ['Open the Arena', 'How are levels different?', 'Show my reports'],
      action: () => { if (CK.showPage) { CK.showPage('arena-page'); if (CK.arena && CK.arena.init) setTimeout(() => CK.arena.init(), 200); } },
    },
    { id: 'levels', priority: 70,
      patterns: [/level.*differ|how.*level|easy|hard|difficulty/i],
      answer: () => `Each difficulty plays distinctly:\n\n🌱 **Beginner** — Depth 2, no opening book, no tablebases, 20% random moves + 35% blunder rate.\n⚡ **Intermediate** — Depth 6, limited book, occasional inaccuracies.\n🔥 **Advanced** — Depth 12, full opening book, simple endgames perfect.\n💀 **Expert** — Depth 18, full book + 7-piece tablebases. Punishing.`,
      suggest: () => ['Open the Arena', 'What is a brilliant move?'],
    },
    { id: 'certificate', priority: 65,
      patterns: [/\bcertificate|diploma|award/i],
      answer: () => `After finishing any match in the **AI Arena**, you can generate a personalised **Certificate of Completion** showing your name, age, level played, time taken, match result, and full move history. Click **View Certificate** on the post-game report screen.`,
      suggest: () => ['Open the Arena'],
    },
    { id: 'brilliant', priority: 60,
      patterns: [/brilliant|best move|excellent move|blunder|mistake|inaccuracy/i],
      answer: () => `Move classifications used in our analysis:\n\n✨ **Brilliant** — A non-obvious winning idea (often a sacrifice).\n★ **Best** — The engine's top choice (within 15 centipawns).\n! **Excellent** — Very close to best (within 40 cp).\n● **Good** — Reasonable (within 90 cp).\n?! **Inaccuracy** — Loses ~150 cp.\n? **Mistake** — Loses ~300 cp.\n?? **Blunder** — Major drop, often game-deciding.`,
      suggest: () => ['Open the Arena', 'How are levels different?'],
    },
    { id: 'puzzles', priority: 65,
      patterns: [/\bpuzzle|tactic|practice/i],
      answer: () => `Our **Puzzles** section has hundreds of tactical positions sorted by theme (forks, pins, mates) and rating. Solve consecutive puzzles to build streaks — great daily practice for sharpening calculation.`,
      suggest: () => ['Open Puzzles', 'Show more games'],
    },
    { id: 'moregames', priority: 60,
      patterns: [/\bmore\s*games|mini\s*game|arcade|games\b/i],
      answer: () => `In the **More Games** section we have 9 mini-games:\n\n🧩 Puzzle Challenge · 🤔 Guess the Grandmaster · 🎯 Memory Match · ⚡ Knight's Star Catcher · 🌧️ Pawn Storm Dodge · 👑 Queen's Capture Quest · 🧠 Chess Quiz Blitz · 🧭 Speed Coordinates · 👁️ Flashed Recall.`,
      suggest: () => ['Open More Games'],
      action: () => { if (CK.showPage) CK.showPage('more-games-page'); },
    },
    { id: 'pgnlab', priority: 60,
      patterns: [/\b(pgn|analysis|analyse|analyze|review.*game|stockfish.*lab)/i],
      answer: () => `The **PGN Stockfish Lab** lets you paste any game (PGN format) and get a move-by-move engine analysis: accuracy %, blunder map, best lines, eval graph. Perfect for reviewing tournament games.`,
      suggest: () => ['Open PGN Lab', 'Show me Arena'],
    },

    // ───── Chess rules / how-to ─────
    { id: 'howplay', priority: 70,
      patterns: [/\bhow.*(play|chess)\b|\brules\b|\bbeginner\s*guide/i],
      answer: () => `Chess basics:\n\n♟ Each side has 16 pieces (8 pawns + 8 majors)\n♚ Goal: **checkmate** the opposing king\n♘ Pieces move differently (knight in L, rook in straight lines, etc.)\n♙ White moves first; players alternate turns\n♔ Special moves: castling, en passant, promotion\n\nFor a hands-on start, try our **Beginner programme** or the **Arena** on Beginner difficulty.`,
      suggest: () => ['Open the Arena', 'Beginner programme', 'Try puzzles'],
    },
    { id: 'pieces', priority: 65,
      patterns: [/\bpiece(s)?\s+move|how.*move|knight.*move|pawn.*move|king.*move|queen.*move/i],
      answer: () => `Piece movements:\n\n♔ **King** — 1 square any direction\n♕ **Queen** — any number of squares, any direction\n♖ **Rook** — straight lines (ranks/files)\n♗ **Bishop** — diagonals\n♘ **Knight** — L-shape (2+1), jumps over pieces\n♙ **Pawn** — 1 square forward (2 on first move), captures diagonally`,
      suggest: () => ['What is checkmate?', 'Play in Arena'],
    },
    { id: 'checkmate', priority: 65,
      patterns: [/\bcheckmate|stalemate|check\b/i],
      answer: () => `**Check** — your king is under attack. You must escape (move king, block, or capture attacker).\n\n**Checkmate** — your king is in check and has NO legal escape. The game is over.\n\n**Stalemate** — you have no legal moves but your king is NOT in check. Result: draw.`,
      suggest: () => ['How pieces move?', 'Try Beginner Arena'],
    },
    { id: 'castle', priority: 60,
      patterns: [/\bcastl(e|ing)/i],
      answer: () => `**Castling** is a special move where the king moves 2 squares toward a rook and the rook jumps to the other side. Conditions: neither piece has moved, no pieces between, king isn't in (or passing through) check. Tucks the king safe + activates the rook.`,
      suggest: () => ['Try Arena'],
    },
    { id: 'opening', priority: 60,
      patterns: [/\bopening(s)?|\be4|\bd4|\bsicilian|\bcaro|\bspanish|\bitalian|\bqueen.s\s*gambit/i],
      answer: () => `Popular openings to learn first:\n\n♙ **Italian Game** (1.e4 e5 2.Nf3 Nc6 3.Bc4) — classic, attacking\n♙ **Spanish/Ruy Lopez** (1.e4 e5 2.Nf3 Nc6 3.Bb5) — most-studied opening ever\n♙ **Queen's Gambit** (1.d4 d5 2.c4) — solid, positional\n♙ **Sicilian Defense** (1.e4 c5) — sharp counter for Black`,
      suggest: () => ['Open the Arena', 'Try puzzles'],
    },

    // ───── Bilingual ─────
    { id: 'bilingual', priority: 70,
      patterns: [/tamil|bilingual|language|english.*tamil|தமிழ்/i],
      answer: () => `Yes — we offer **bilingual support in English & Tamil** (தமிழ்). Coaches explain concepts in whichever language the student is comfortable with, and key materials are available in both languages.\n\n*"இரண்டு மொழிகளிலும் கற்றுக் கொள்ளலாம்!"* — Learn comfortably in either language.`,
      suggest: () => ['Book a demo', 'Show programmes'],
    },

    // ───── Login / theme ─────
    { id: 'login', priority: 75,
      patterns: [/\blogin|sign\s*in|password|forgot/i],
      answer: () => `Use the **Login** button on the home page. Choose your role (Student / Coach / Parent / Admin). Default student password is **123456** (changeable in settings).\n\nForgot your password? Contact the academy and we'll reset it.`,
      suggest: () => ['Contact academy', 'Show programmes'],
    },
    { id: 'theme', priority: 60,
      patterns: [/\b(dark|light)\s*(mode|theme)|switch\s*theme/i],
      answer: () => `Inside any portal, click the **🌙 / ☀️ icon** in the topbar to switch between dark and light themes. Your preference is saved locally.`,
      suggest: () => ['Open portal'],
    },

    // ───── Help / fallback ─────
    { id: 'help', priority: 50,
      patterns: [/\b(help|menu|what.*can.*do|commands)/i],
      answer: () => `I can help with:\n\n📚 **Academy info** — programmes, coaches, fees, demo booking\n♞ **Chess rules** — how pieces move, openings, special moves\n🤖 **AI Arena** — playing the AI, difficulty levels, certificates\n🏠 **Portals** — student / coach / parent / admin guidance\n🎯 **Features** — puzzles, More Games, PGN Lab, themes\n\nJust ask me anything in plain English (or Tamil)!`,
      suggest: contextSuggestions,
    },
  ];

  // ────────────────────────────────────────────────────────────────
  // 3. Intent matcher with context boost
  // ────────────────────────────────────────────────────────────────
  function findBestIntent(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const ctx = TOM.getContext();
    let best = null;
    let bestScore = 0;
    for (const item of KB) {
      let score = 0;
      for (const pat of (item.patterns || [])) {
        if (pat.test(lower)) score += (item.priority || 50);
      }
      // Context boost — portal-specific intents score higher in matching portal
      if (score > 0 && ctx.portal && item.id && item.id.indexOf(ctx.portal + '-') === 0) {
        score += 30;
      }
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function fallbackAnswer() {
    const ctx = TOM.getContext();
    const where = ctx.portal ? ` in the ${ctx.portal} portal` : '';
    const lines = [
      `Hmm, I didn't quite catch that. Since you're${where || ' on the website'}, you can ask things like "how do I add a student?", "show my progress", or "open the Arena". Try rephrasing?`,
      `I'm not sure I follow. Could you rephrase? Some things I know well: classes, coaches, AI Arena, puzzles, certificates, and how to play chess.`,
      `Let me try again — could you ask in a different way? You can also tap one of the quick-reply chips below.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // ────────────────────────────────────────────────────────────────
  // 4. UI rendering
  // ────────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function mdLite(s) {
    let out = escapeHtml(s);
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    out = out.replace(/\n/g, '<br>');
    return out;
  }
  function callOrValue(v) {
    return (typeof v === 'function') ? v() : v;
  }

  function buildUI() {
    if (document.getElementById('tom-ai-root')) return;
    if (!document.body) {
      // Retry once body exists
      setTimeout(buildUI, 50);
      return;
    }
    // Hide the emergency inline launcher (defined in index.html) since
    // the real launcher with the full panel is about to mount.
    const emergency = document.getElementById('tom-ai-emergency-root');
    if (emergency) emergency.style.display = 'none';
    const root = document.createElement('div');
    root.id = 'tom-ai-root';
    root.innerHTML = `
      <button class="tom-ai-launcher" id="tom-ai-launcher" type="button" aria-label="Open TOM chat">
        <span class="tom-launcher-knight">${TOM.knightSVG('dark')}</span>
        <span class="tom-launcher-badge"></span>
      </button>
      <div class="tom-ai-panel" id="tom-ai-panel" role="dialog" aria-label="TOM chat">
        <header class="tom-ai-header">
          <div class="tom-ai-avatar" aria-hidden="true">${TOM.knightSVG('light')}</div>
          <div class="tom-ai-title">
            <div class="tom-ai-title-name">TOM</div>
            <div class="tom-ai-title-status">Online · ChessKidoo Assistant</div>
          </div>
          <div class="tom-ai-header-actions">
            <button class="tom-ai-icon-btn" id="tom-ai-clear" type="button" title="Clear chat" aria-label="Clear chat">🗑</button>
            <button class="tom-ai-icon-btn" id="tom-ai-close" type="button" title="Close" aria-label="Close">✕</button>
          </div>
        </header>
        <div class="tom-ai-messages" id="tom-ai-messages" aria-live="polite"></div>
        <div class="tom-quick-replies" id="tom-ai-chips"></div>
        <div class="tom-ai-input-row">
          <textarea class="tom-ai-input" id="tom-ai-input"
                    rows="1" placeholder="Ask TOM anything…" aria-label="Message TOM"></textarea>
          <button class="tom-ai-send" id="tom-ai-send" type="button" title="Send" aria-label="Send message">➤</button>
        </div>
        <div class="tom-ai-footer">TOM · ChessKidoo Academy Assistant</div>
      </div>`;
    document.body.appendChild(root);

    // Wire events
    const launcher = document.getElementById('tom-ai-launcher');
    const closeBtn = document.getElementById('tom-ai-close');
    const clearBtn = document.getElementById('tom-ai-clear');
    const sendBtn  = document.getElementById('tom-ai-send');
    const input    = document.getElementById('tom-ai-input');
    if (launcher) launcher.addEventListener('click', TOM.toggle);
    if (closeBtn) closeBtn.addEventListener('click', TOM.close);
    if (clearBtn) clearBtn.addEventListener('click', TOM.clear);
    if (sendBtn)  sendBtn.addEventListener('click', () => TOM.sendCurrent());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          TOM.sendCurrent();
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 110) + 'px';
      });
    }
    // Debug log so we can confirm the launcher is in the DOM
    console.log('[TOM] launcher mounted', launcher);
  }

  function renderMessages() {
    const box = document.getElementById('tom-ai-messages');
    if (!box) return;
    box.innerHTML = '';
    TOM._history.forEach((m) => {
      const div = document.createElement('div');
      div.className = `tom-msg tom-msg-${m.role}`;
      const avatar = m.role === 'bot'
        ? `<span class="tom-msg-knight">${TOM.knightSVG('light')}</span>`
        : '🙂';
      div.innerHTML = `
        <div class="tom-msg-avatar">${avatar}</div>
        <div class="tom-msg-bubble">${mdLite(m.text)}</div>`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }

  function renderTyping(on) {
    const box = document.getElementById('tom-ai-messages');
    if (!box) return;
    const existing = document.getElementById('tom-typing-row');
    if (existing) existing.remove();
    if (!on) return;
    const div = document.createElement('div');
    div.className = 'tom-msg tom-msg-bot';
    div.id = 'tom-typing-row';
    div.innerHTML = `
      <div class="tom-msg-avatar"><span class="tom-msg-knight">${TOM.knightSVG('light')}</span></div>
      <div class="tom-msg-bubble"><div class="tom-typing"><span></span><span></span><span></span></div></div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function renderChips(suggestions) {
    const chips = document.getElementById('tom-ai-chips');
    if (!chips) return;
    chips.innerHTML = '';
    (suggestions || []).slice(0, 4).forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'tom-quick-chip';
      btn.type = 'button';
      btn.textContent = label;
      btn.onclick = () => TOM.send(label);
      chips.appendChild(btn);
    });
    chips.style.display = (suggestions && suggestions.length) ? '' : 'none';
  }

  // ────────────────────────────────────────────────────────────────
  // 5. Conversation flow
  // ────────────────────────────────────────────────────────────────
  TOM.send = function (text) {
    text = String(text || '').trim();
    if (!text) return;

    TOM._history.push({ role: 'user', text });
    trimHistory(); persist(); renderMessages();
    renderChips([]);
    renderTyping(true);

    const delay = 350 + Math.min(800, text.length * 16);
    setTimeout(() => {
      renderTyping(false);
      const intent = findBestIntent(text);
      let reply, suggest, action;
      if (intent) {
        reply   = callOrValue(intent.answer);
        suggest = callOrValue(intent.suggest);
        action  = intent.action;
      } else {
        reply   = fallbackAnswer();
        suggest = contextSuggestions();
      }
      TOM._history.push({ role: 'bot', text: reply });
      trimHistory(); persist(); renderMessages();
      renderChips(suggest);
      if (action) { try { action(); } catch(e) { console.warn('TOM action failed:', e); } }
    }, delay);
  };

  TOM.sendCurrent = function () {
    const input = document.getElementById('tom-ai-input');
    if (!input) return;
    const text = input.value;
    input.value = '';
    input.style.height = 'auto';
    TOM.send(text);
  };

  function trimHistory() {
    if (TOM._history.length > TOM._MAX_HISTORY) {
      TOM._history = TOM._history.slice(-TOM._MAX_HISTORY);
    }
  }
  function persist() {
    try { localStorage.setItem(TOM._STORAGE_KEY, JSON.stringify(TOM._history)); } catch(e) {}
  }
  function restore() {
    try {
      const raw = localStorage.getItem(TOM._STORAGE_KEY);
      if (raw) TOM._history = JSON.parse(raw) || [];
    } catch(e) { TOM._history = []; }
  }

  // ────────────────────────────────────────────────────────────────
  // 6. Public API
  // ────────────────────────────────────────────────────────────────
  TOM.open = function () {
    const panel = document.getElementById('tom-ai-panel');
    const launcher = document.getElementById('tom-ai-launcher');
    if (!panel) {
      // The UI didn't mount — try again now
      buildUI();
      return setTimeout(TOM.open, 80);
    }
    panel.classList.add('tom-open');
    if (launcher) launcher.classList.add('tom-hidden');
    TOM._open = true;
    if (!TOM._history.length) {
      const greet = KB.find(k => k.id === 'greet');
      const reply = greet ? callOrValue(greet.answer) : `Hi! I'm TOM. How can I help?`;
      TOM._history.push({ role: 'bot', text: reply });
      persist();
      renderMessages();
      renderChips(greet ? callOrValue(greet.suggest) : []);
    } else {
      renderMessages();
      renderChips(contextSuggestions());
    }
    setTimeout(() => {
      const input = document.getElementById('tom-ai-input');
      if (input) input.focus();
    }, 300);
  };
  TOM.close = function () {
    const panel = document.getElementById('tom-ai-panel');
    const launcher = document.getElementById('tom-ai-launcher');
    if (!panel) return;
    panel.classList.remove('tom-open');
    if (launcher) launcher.classList.remove('tom-hidden');
    TOM._open = false;
  };
  TOM.toggle = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    TOM._open ? TOM.close() : TOM.open();
  };
  TOM.clear = function () {
    TOM._history = [];
    persist();
    renderMessages();
    renderChips([]);
    const greet = KB.find(k => k.id === 'greet');
    if (greet) {
      TOM._history.push({ role: 'bot', text: callOrValue(greet.answer) });
      persist();
      renderMessages();
      renderChips(callOrValue(greet.suggest));
    }
  };

  // ────────────────────────────────────────────────────────────────
  // 7. Robust init — fires on multiple triggers so it can never miss
  // ────────────────────────────────────────────────────────────────
  function init() {
    if (TOM._initialized) return;
    TOM._initialized = true;
    restore();
    buildUI();
  }

  // Multiple init paths so the launcher always shows up even if one
  // of the timing windows is missed.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // DOM already parsed — schedule init at the next microtask
    setTimeout(init, 0);
  }
  // Belt-and-suspenders fallback in case anything above silently fails
  window.addEventListener('load', () => { if (!TOM._initialized) init(); }, { once: true });
  setTimeout(() => { if (!TOM._initialized) init(); }, 2000);

  // ────────────────────────────────────────────────────────────────
  // 8. Auto-hide launcher when a full-screen overlay is open
  //    (cert, arcade, arena report). Uses a MutationObserver instead
  //    of CSS :has() so it works on every browser including older Safari.
  // ────────────────────────────────────────────────────────────────
  function syncLauncherVisibility() {
    const launcher = document.getElementById('tom-ai-launcher');
    const emergency = document.getElementById('tom-ai-emergency-launcher');
    const overlayActive = !!document.querySelector(
      '.cert-overlay.active, .arcade-overlay.active, #arena-report-overlay.active'
    );
    const setHide = (el) => {
      if (!el) return;
      if (overlayActive) {
        el.dataset._prevDisplay = el.style.display || '';
        el.style.display = 'none';
      } else if (el.dataset._prevDisplay !== undefined) {
        el.style.display = el.dataset._prevDisplay;
        delete el.dataset._prevDisplay;
      }
    };
    setHide(launcher);
    setHide(emergency);
  }
  // Watch for any class change on the body or its descendants
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(syncLauncherVisibility);
    const startObserver = () => {
      if (!document.body) { setTimeout(startObserver, 50); return; }
      mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
      syncLauncherVisibility();
    };
    startObserver();
  }
})();
