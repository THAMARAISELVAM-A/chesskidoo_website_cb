/**
 * assets/js/blogs.js
 * Comprehensive Blogs & Insights System for ChessKidoo Academy
 * Articles on Academy Vision, Founder's Desk, Valuable Players & Chess Mastery.
 * Includes interactive reading modal, discussion/commenting, and custom blog writing.
 */

(() => {
  const CK = window.CK = window.CK || {};

  const DEFAULT_ARTICLES = [
    {
      id: 'the-chesskidoo-revolution',
      title: "The ChessKidoo Revolution: How We Built India's 1st Student Tracking System",
      category: "Academy & Vision",
      categoryClass: "cat-academy",
      readTime: "5 min read",
      date: "October 10, 2026",
      author: "ChessKidoo Editorial Team",
      authorRole: "Academy Leadership",
      authorAvatar: "♟️",
      coverIcon: "🏛️",
      excerpt: "Inside the founding journey of ChessKidoo Academy — how structured FIDE methodology, automated progress analytics, and dedicated faculty converged to build India's premier chess learning ecosystem.",
      tags: ["Academy Story", "Student Tracking", "FIDE Coaching", "Pedagogy"],
      content: `
        <p class="blog-lead">When ChessKidoo was founded, chess education across India faced a recurring hurdle: while children attended weekly classes with boundless enthusiasm, parents and coaches struggled to track tangible cognitive progress, puzzle accuracy velocity, and individual tactical blind spots.</p>
        
        <h3>The Genesis: From Traditional Coaching to Digital Clarity</h3>
        <p>In traditional setups, learning logs were kept on crumpled sheets of notebook paper, attendance was marked haphazardly, and game evaluations happened verbally without persistent archives. A child who repeatedly stumbled in rook-and-pawn endgames had no automated feedback loop to systematically target that weakness.</p>
        <p>ChessKidoo was born to change that paradigm. By engineering <strong>India's 1st Student Tracking System</strong>, we fused certified international coaching with proprietary digital dashboards. Every move played, puzzle attempted, and tournament participated in is synthesized into actionable training insights.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Chess is not merely about memorizing theoretical variations; it is about building a disciplined, fearless mind that evaluates reality with objectivity."</p>
          <span class="quote-author">— ChessKidoo Academy Mission Manifesto</span>
        </div>

        <h3>The Three Pillars of Our Curriculum</h3>
        <p>Our curriculum is structured into three progressive phases, accredited to meet the rigorous pedagogical benchmarks set by the International Chess Federation (FIDE):</p>
        <ul>
          <li><strong>Foundational Mechanics:</strong> Board geography, piece coordination, tactical motifs (pins, forks, skewers), and opening safety principles.</li>
          <li><strong>Strategic Formulation:</strong> Pawn structures, pawn breaks, king safety assessment, and prophylactic thinking.</li>
          <li><strong>Tournament Mastery:</strong> Clock psychology, master game analysis, opening repertoire fortification, and deep tactical calculation.</li>
        </ul>

        <h3>Expanding Horizons: Reaching 10,000+ Young Minds</h3>
        <p>Today, ChessKidoo trains hundreds of students spanning India, the United States, Singapore, the United Kingdom, and the UAE. Through interactive live batches, personal AI study rooms, and weekly tournaments, we are nurturing tomorrow's Grandmasters and life leaders.</p>
      `
    },
    {
      id: 'from-the-founders-desk',
      title: "From The Founder's Desk: Why Chess is the Ultimate Mental Gymnasium for Kids",
      category: "Founder's Desk",
      categoryClass: "cat-founder",
      readTime: "6 min read",
      date: "October 4, 2026",
      author: "Founder & Chief Mentor",
      authorRole: "Founder, ChessKidoo Academy",
      authorAvatar: "👑",
      coverIcon: "✍️",
      excerpt: "A personal reflection from our founder on fostering emotional resilience, strategic patience, and the ability to think two moves ahead in an era of rapid digital distraction.",
      tags: ["Founder's Vision", "Mindset", "Life Skills", "Leadership"],
      content: `
        <p class="blog-lead">In a modern world characterized by short-form video reels, instant gratification, and fleeting attention spans, the ancient game of chess offers something extraordinarily rare: a sanctuary of deep, uninterrupted contemplation.</p>

        <h3>Patience: The Superpower of the 21st Century</h3>
        <p>When an 8-year-old sits across a 64-square board for a classical 60-minute game, an astonishing transformation occurs. For that hour, there are no notifications, no algorithmically generated dopamine hits. There is only an evolving matrix of possibilities, demanding absolute focus and accountability for every move.</p>
        <p>Every time a child pauses to question: <em>"If I push this pawn, what square am I weakening? What will my opponent reply?"</em>, they are exercising the prefrontal cortex. They are learning to delay gratification in favor of long-term strategic advantage.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"The greatest gift you can bestow upon a child is the confidence that they can sit quietly, analyze a complex crisis, and find the winning path on their own."</p>
          <span class="quote-author">— Founder's Address to Academy Parents</span>
        </div>

        <h3>Teaching Children How to Lose with Dignity</h3>
        <p>No one becomes a chess master without losing hundreds of games. In chess, there is no luck; you cannot blame the weather, the referee, or the playing surface. When you lose, you must shake hands with your rival, sign the scoresheet, and sit down to ask: <em>"Where did my calculation fail?"</em></p>
        <p>This single habit eliminates fear of failure in academics and life. It teaches children to reframe a loss not as an emotional defeat, but as a priceless dataset pointing toward future mastery.</p>

        <h3>Our Promise at ChessKidoo</h3>
        <p>Our commitment is not merely to build trophy holders — though our students have won plenty — but to cultivate grounded, courteous, and analytically brilliant human beings. When our students step away from the chessboard, they carry with them the supreme asset: the ability to think before they act.</p>
      `
    },
    {
      id: 'wall-of-champions-our-prodigies',
      title: "Wall of Champions: How Our Star Prodigies Conquered District & State Podiums",
      category: "Valuable Players & Stars",
      categoryClass: "cat-players",
      readTime: "7 min read",
      date: "September 28, 2026",
      author: "Senior Coaching Council",
      authorRole: "FIDE Faculty & Tournament Coaches",
      authorAvatar: "🏆",
      coverIcon: "⭐",
      excerpt: "Spotlight on our valuable young masters — Anfal Akmal, Yadhuveer, Mukilan, Mocsha, and Riyazzen — their relentless training discipline, breakthrough tournament games, and turning points.",
      tags: ["Star Players", "State Champions", "Tournament Triumphs", "Podium Finish"],
      content: `
        <p class="blog-lead">Behind every shining tournament trophy in our academy cabinet lies early morning tactical puzzle sessions, intense blitz sparring, and hundreds of hours of endgame drill work. Let us explore the inspiring journeys of our standout players.</p>

        <h3>Yadhuveer: The 7/7 Clean Sweep Phenomenon</h3>
        <p>At the Erode District Series Championship, Yadhuveer achieved what chess coaches regard as the ultimate tournament triumph: a <strong>flawless 7 wins out of 7 rounds</strong> in the Under-9 category. Facing seasoned rivals who brought deep opening theory, Yadhuveer demonstrated exceptional endgame conversion technique, steering complex knight endgames into clinical victories.</p>

        <h3>Anfal Akmal: Coimbatore District & Pollachi Star</h3>
        <p>Anfal's aggressive, dynamic style has made him a household name across regional circuits. Representing the Hindusthan Chess Team, Anfal secured the Zone Winner championship through fierce tactical piece sacrifices and unshakeable confidence in double-edged positions.</p>

        <h3>Mocsha & Riyazzen: State Podiums & FIDE International Milestones</h3>
        <p>Mocsha captured top honors at the Tamil Nadu State Chess Championship, displaying maturity beyond her years. Meanwhile, Riyazzen crossed the coveted <strong>FIDE International Classical Rating of 1520</strong>, competing fearlessly against adult FIDE-rated masters in classical time controls.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Champion players are not born with special hands or magical brains. They are sculpted by the daily willingness to solve 20 difficult puzzles when nobody is watching."</p>
          <span class="quote-author">— Coach Gyan Surya, FIDE Candidate Master</span>
        </div>

        <h3>Mukilan: Unstoppable from Under-9 to Under-17</h3>
        <p>Mukilan's standout achievement was clinching 3rd place in an open category tournament spanning from Under-9 up to Under-17 players. Playing against opponents nearly twice his age, his calculation depth and defensive grit stunned spectators and coaches alike.</p>
        <p>These young champions embody the soul of ChessKidoo Academy. Their journeys demonstrate that with structured mentorship, any young student can ascend from beginner moves to regional and national glory.</p>
      `
    },
    {
      id: 'bodhana-youngest-female-im',
      title: "11 Years Old, History Made: Bodhana Sivanandan Becomes the Youngest Female IM Ever, Breaking Judit Polgar's 38-Year Record",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "6 min read",
      date: "October 23, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "👑",
      coverImage: "assets/img/blogs/bodhana-youngest-im.jpg",
      coverCaption: "Bodhana Sivanandan, 11, completed her IM title at the 30th European Club Cup for Women in Budva, Montenegro (Image courtesy: ChessBase India)",
      excerpt: "11 years, 7 months and 16 days. A schoolgirl from Harrow, London, with roots in Trichy, Tamil Nadu, scored her third and final IM norm — and wrote her name above Judit Polgar's in the record books.",
      tags: ["Bodhana Sivanandan", "Judit Polgar", "IM Title", "European Club Cup", "Record Breaker"],
      sourceName: "ChessBase India (Sagar Shah)",
      sourceTitle: "11-year-old Bodhana Sivanandan breaks Judit Polgar's 38-year-old IM record!",
      sourceUrl: "https://chessbase.in/news-bites/11-year-old-bodhana-sivanandan-becomes-youngest-female-im-in-history-of-chess",
      content: `
        <p class="blog-lead">11 years, 7 months and 16 days. That is exactly how old <strong>Bodhana Sivanandan (2406)</strong> was on Friday, October 23, 2026, when she became the youngest girl in chess history to complete the International Master title — scoring her third and final IM norm at the <strong>30th European Club Cup for Women in Budva, Montenegro</strong>. In doing so, the schoolgirl from Harrow, London, whose family hails from <strong>Trichy in Tamil Nadu</strong>, shattered a 38-year-old record held by none other than <strong>Judit Polgar</strong>, the greatest female player of all time, who had qualified at 12 back in 1988.</p>

        <h3>Three Norms in Three Months: A Grind Disguised as a Miracle</h3>
        <p>Titles look like lightning strikes from the outside; up close they are schedules. All three of Bodhana's IM norms landed in barely three months: the first at the <strong>Dole Open in France in July</strong>, where she beat GM Marc'Andria Maurizzi (2628) to become the youngest girl ever to defeat a 2600+ opponent in classical chess; the second at the <strong>Samarkand Olympiad in September</strong>, where she played every single round on England's top board and became the youngest player ever to complete the WGM title requirements; and the third in Budva in October. Tournament after tournament, norm after norm — that is what consistency looks like at eleven.</p>

        <h3>The Budva Campaign, Round by Round</h3>
        <p>Playing top board for <strong>She Plays To Win Lionesses A</strong>, Bodhana opened with a fighting 77-move loss to former Women's World Championship challenger <strong>GM Aleksandra Goryachkina (2536)</strong> — and then simply refused to lose again: a win over India's WFM Darshini T Sri (2191), an outclassing of Austria's IM Olga Badelka (2408), a poised draw with Georgia's GM Nino Batsiashvili (2459), and three closing wins in a row. In the final round she <em>needed a win with the black pieces</em> against Sweden's WIM Viktoria Johansson — and delivered, finishing on <strong>5.5/7 with a 2504 performance rating</strong>. The 24 points gained took her rating from 2382 to <strong>2406</strong>, past the 2400 threshold the title requires.</p>

        <h3>In the Most Elite Company Imaginable</h3>
        <p>Bodhana is now the <strong>seventh-youngest player, boy or girl, ever to qualify for the IM title</strong>, and one of only ten in chess history to do it before turning 12. Here is the detail that should make every ChessKidoo sit up: she is exactly one month older than <strong>Javokhir Sindarov</strong> was when he qualified in 2017, and World Champion <strong>D. Gukesh</strong> was almost two months older in 2018. The two players fighting for the World Championship next month are both on that list — and so is an eleven-year-old with Tamil Nadu roots.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"I'm happy about that — but hopefully I'm able to get grandmaster soon as well!"</p>
          <span class="quote-author">— Bodhana Sivanandan, minutes after becoming the youngest female IM ever</span>
        </div>

        <h3>Tamil Nadu Roots, World Records</h3>
        <p>The English Chess Federation's Malcolm Pein called her "a generational talent" who is "more than matching Judit Polgar's achievements at a similar age." For our academy family, the story has a warmer layer: Bodhana's family hails from <strong>Trichy, Tamil Nadu</strong> — the same chess-mad state that produced Anand, Praggnanandhaa, Vaishali and now India's 99th Grandmaster from Coimbatore. She is already the second-highest-rated player in the world born in 2015 or later, and her next stop is the FIDE Swiss at the London Chess Classic.</p>

        <h3>What ChessKidoo Students Can Learn from Bodhana</h3>
        <ul>
          <li><strong>Round one is not the tournament.</strong> A 77-move loss to a 2536-rated grandmaster started her Budva week. Five straight scoring results later, she had the title. Your worst game is never your whole story.</li>
          <li><strong>Stack small wins on a schedule.</strong> Three norms in three months is not luck — it is tournament planning, homework and stamina. Champions are built one rating event at a time.</li>
          <li><strong>Ask for the hard colours.</strong> Needing a win with Black in the last round, she played for the full point instead of hiding. Train to win with both colours from day one.</li>
          <li><strong>Keep the next dream queued.</strong> Her first sentence after history was about becoming a Grandmaster. Celebrate for an evening; wake up hungry.</li>
        </ul>

        <p>Remember this name, because chess will be spelling it for decades: <strong>Bodhana Sivanandan</strong>. And remember the day a Polgar record fell to a girl who trains like our students do — move by move, norm by norm.</p>
      `
    },
    {
      id: 'gukesh-clutch-olympiad-2026',
      title: "Gukesh Comes Clutch at the Chess Olympiad: Team India Second in Both Sections Ahead of the Final Weekend",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "6 min read",
      date: "September 26, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "🌍",
      coverImage: "assets/img/blogs/olympiad-gukesh.jpg",
      coverCaption: "World Champion D Gukesh rescued board four against Germany to keep India's Open team alive in Samarkand (Image courtesy: FIDE / Times Now)",
      featured: true,
      excerpt: "A rescue act worthy of his crown — Gukesh stunned Alexander Donchenko from a near-lost position on board four, while our women's team swept hosts Uzbekistan 3-1. Gold medal bids in both sections go down to the wire.",
      tags: ["Chess Olympiad 2026", "D Gukesh", "Team India", "Divya Deshmukh", "Samarkand"],
      sourceName: "Times Now (Aayush Kataria)",
      sourceTitle: "Chess Olympiad: Gukesh Comes Clutch; India Second In Both Open And Women's Category Going Into Final Weekend",
      sourceUrl: "https://www.timesnownews.com/sports/chess/chess-olympiad-gukesh-comes-clutch-india-second-in-both-open-and-women-category-going-into-final-weekend-article-156226224",
      content: `
        <p class="blog-lead">Samarkand served up the kind of Friday evening chess students dream about. In round nine of the 2026 Chess Olympiad, Team India beat Germany 2.5–1.5 in the Open section and hosts Uzbekistan 3–1 in the Women's section — and suddenly, the defence of BOTH gold medals is mathematically alive going into the final two rounds.</p>

        <h3>Board Four Rescue: The Saving Game Every Coach Dreams Of</h3>
        <p>The headline belongs to the World Champion. India's match against Germany — the very team that had ambushed table-leaders Uzbekistan 24 hours earlier — was tipping toward disaster when <strong>D Gukesh</strong>, on board four, looked briefly headed for a loss against Alexander Donchenko. Had that game collapsed, India's gold-medal race would likely have died with it.</p>
        <p>Instead, the 20-year-old dug in, held the worse position, and played the tournament of a champion in reverse: the inferior setup curdled into a full point. That single clutch conversion kept India at 2.5–1.5, while <strong>R Praggnanandhaa, Arjun Erigaisi and Nihal Sarin</strong> banked composed draws on boards one, two and three. India sit second, just one point behind Uzbekistan, and face the Uzbekistan-B team in round ten before finishing the event on Sunday.</p>

        <figure class="blog-content-figure">
          <img loading="lazy" src="assets/img/blogs/olympiad-standings-open.jpg" alt="Open category standings after round 9 of the 2026 Chess Olympiad">
          <figcaption>Open section standings after round 9 — one point separates India from the leaders (Table via Chess.com / Times Now)</figcaption>
        </figure>

        <h3>The Women's Charge: 3–1 Into Round Ten's Blockbuster</h3>
        <p>While the Open team survived on nerves of steel, the Women's team engineered the statement result of the day: a 3–1 win over hosts Uzbekistan, powered by full points from <strong>Divya Deshmukh and Vantika Agarwal</strong>, with veterans <strong>Koneru Humpy and Savita</strong> cushioning the draw points. The defending champions are now just two points behind leaders China — and the two teams meet head-to-head in round ten. A win books the gold-medal finish; the maths could not be more cinematic.</p>

        <figure class="blog-content-figure">
          <img loading="lazy" src="assets/img/blogs/olympiad-standings-women.jpg" alt="Women's category standings after round 9 of the 2026 Chess Olympiad">
          <figcaption>Women's section standings after round 9 — India vs China decides the title race (Table via Chess.com / Times Now)</figcaption>
        </figure>

        <h3>The Nona Gaprindashvili Cup Is Coming Home (Again)</h3>
        <p>Beyond both board races, one trophy is nearly sealed: the <strong>Nona Gaprindashvili Cup</strong>, awarded to the nation with the best combined performance across the Open and Women's sections. With second place in both categories, India are on course to lift it for the <strong>third consecutive Olympiad</strong> — a dynasty in the making.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"It is easy to play well when you are winning. Champions are built inside positions that look lost — one patient move at a time."</p>
          <span class="quote-author">— ChessKidoo Coaching Council, on Gukesh's clutch save</span>
        </div>

        <h3>What Our Students Should Steal from Round 9</h3>
        <ul>
          <li><strong>Rescue positions, don't rush them.</strong> Gukesh's board four is exactly what our weekly "worse but playable" drills train: slow down when the position sinks, out-resource your opponent, and wait for your moment.</li>
          <li><strong>Knights over ego.</strong> Three grandmasters accepted that a draw served the team better than a gamble. Individual brilliance must sometimes bow to the scoreboard.</li>
          <li><strong>Play the game in front of you.</strong> India's title race reset after every single round — the same round-by-round focus we ask of every ChessKidoo competitor before round one, not just round nine.</li>
        </ul>

        <p>Two rounds remain. Watch the final weekend with a scoreboard, not just a broadcast — and note how many of the medal-hungry games are decided by defence rather than attack. That is the quiet lesson of champions.</p>
      `
    },
    {
      id: 'israel-fide-yom-kippur-dispute',
      title: "‘We Are Very Angry': Israel Federation Blasts FIDE After Olympiad Forfeits Over Yom Kippur",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "5 min read",
      date: "September 22, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "⚖️",
      coverImage: "assets/img/blogs/israel-fide-yom-kippur.jpg",
      coverCaption: "Israel's men's and women's teams had to forfeit round six matches in Samarkand after the promised rescheduling failed to materialise (Image courtesy: FIDE / Times Now)",
      excerpt: "A written commitment to reschedule Israel's matches around the holiest day in Judaism was never fulfilled — the Netherlands and Bulgaria declined to move, 4–0 forfeits followed, and rating damage now hangs over the teams.",
      tags: ["Chess Olympiad 2026", "FIDE", "Israel", "Yom Kippur", "Tournament Rules"],
      sourceName: "Times Now (Faham Uddin / Jerusalem Post)",
      sourceTitle: "‘We Are Very Angry': Israel Chess Federation Blasts FIDE Over Yom Kippur Dispute",
      sourceUrl: "https://www.timesnownews.com/sports/chess/we-are-very-angry-israel-chess-federation-blasts-fide-over-yom-kippur-dispute-article-156200254",
      content: `
        <p class="blog-lead">Chess Olympiads celebrate minds meeting across borders — but in Samarkand this year they also exposed the hard machinery behind elite tournaments. The Israel Chess Federation has gone public with its fury at FIDE after both its men's and women's teams were forced to forfeit matches scheduled on <strong>Yom Kippur</strong>, the holiest day of the Jewish year.</p>

        <h3>The Promise That Wasn't Kept</h3>
        <p>According to the federation, FIDE had agreed <strong>in writing, back in January</strong>, to reschedule Israel's matches around Yom Kippur — a day on which religious law forbids working, competing, or even handling electronics. Rescheduling was never unilateral: each pairing needed the willing agreement of the opposing team. In round five, <strong>Singapore's men's team and Colombia's women's team</strong> cooperated, and matches went ahead. In round six, the <strong>Netherlands (Open) and Bulgaria (Women's) declined</strong> — and with no deferred slots in place, Israel recorded two <strong>4–0 defeats by forfeit</strong>.</p>

        <h3>What the Leadership Said</h3>
        <p>Federation chairman <strong>Dr Zvika Barkai</strong> minced no words: <em>"We are very angry that the International Chess Federation failed to honour the commitments it made... in reality, they did almost nothing, and we are very upset with them about this."</em> CEO <strong>Gil Boruchovsky</strong> added that FIDE "did not enforce what had been agreed upon with us in advance, causing us significant harm" — including at least a failed attempt to prevent the 4–0 scorelines that will "severely hurt our ranking later on", warning that Israel's next steps "will not go unchallenged". Both teams, he stressed, remain motivated to fight for a top-15 finish.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"A tournament calendar is part of the competition itself. Talents decide the game; logistics decide who gets to play it."</p>
          <span class="quote-author">— ChessKidoo News Desk</span>
        </div>

        <h3>What Every Tournament Family Can Learn</h3>
        <ul>
          <li><strong>Read the regulations before you register.</strong> National events, district events, and holiday calendars collide every season in Tamil Nadu too. Confirm round timings, religious holidays, and travel windows with your coach <em>before</em> the entry form is filed.</li>
          <li><strong>Written clarity beats verbal kindness.</strong> A promise in chat disappears; an agreement in the tournament regulations protects the whole event. That lesson scales from FIDE down to a three-round school league.</li>
          <li><strong>Forfeits are not just lost games — they are lost rating blood.</strong> Students casually skipping rounds because "arrangements will work out" risk exactly what Israel now faces: rankings repaired only over months.</li>
          <li><strong>Respect is the sport.</strong> Opponents honoring someone's sacred day — as Singapore and Colombia did — is a masterclass in the etiquette we teach alongside openings and endings.</li>
        </ul>

        <p>The Olympiad should crown values as much as medals. This controversy will not die with the final rounds — and its biggest takeaway for our students is simple: <strong>plan the calendar like you plan the opening.</strong></p>
      `
    },
    {
      id: 'mastering-critical-moments-tactics',
      title: "Mastering the Critical Moment: How Young Players Calculate Under Tournament Clock Pressure",
      category: "Chess Tactics & Strategy",
      categoryClass: "cat-tactics",
      readTime: "5 min read",
      date: "September 18, 2026",
      author: "Coach Ranjith & Faculty",
      authorRole: "FIDE Certified Advanced Coach",
      authorAvatar: "⏱️",
      coverIcon: "🎯",
      excerpt: "Masterclass insights into candidate move pruning, prophylactic thinking, time trouble management, and emotional stabilization during high-stakes tournament games.",
      tags: ["Tactics", "Calculation", "Time Pressure", "Tournament Prep"],
      content: `
        <p class="blog-lead">Every competitive chess game arrives at a crossroads: a single position where a normal move leads to a draw or loss, while a counter-intuitive tactical resource blows open the opposing king. How do grandmasters find these moves when the clock is ticking down?</p>

        <h3>1. The Candidate Moves Framework</h3>
        <p>The most common blunder among junior players is committing to the very first move that looks appealing. At ChessKidoo, we train our intermediate and advanced students in the <strong>Candidate Moves Protocol</strong>:</p>
        <ol>
          <li>Identify all checks, captures, and pawn tension changes (Forcing Moves).</li>
          <li>Select at least 3 plausible candidate moves before calculating any single line deeply.</li>
          <li>Look for the opponent's strongest, most aggressive reply — not the reply you wish they would play!</li>
        </ol>

        <h3>2. Taming the Clock: The 10% Time Allocation Rule</h3>
        <p>Time trouble (zeitnot) is the graveyard of winning positions. Our coaches teach the 10% rule: in a 60-minute classical game, never spend more than 6 minutes on an opening move unless an unexpected tactical crisis has arisen. Reserve calculation energy for moves 25 through 40, where the battle is decided.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Tactics is knowing what to do when there is something to do; strategy is knowing what to do when there is nothing to do."</p>
          <span class="quote-author">— Tartakower's Maxim, core to ChessKidoo Advanced Curriculum</span>
        </div>

        <h3>3. Bouncing Back from Inaccuracies</h3>
        <p>If you drop a pawn or make an error, the golden rule is: <em>Take a deep breath, sit upright, and reset your evaluation.</em> The player who recovers their composure first after a blunder almost invariably wins the game.</p>
      `
    },
    {
      id: 'the-chess-parents-playbook',
      title: "The Chess Parent's Playbook: Nurturing Your Child's Ambition with Joy and Balance",
      category: "Parenting & Growth",
      categoryClass: "cat-parents",
      readTime: "6 min read",
      date: "September 10, 2026",
      author: "Academy Counselling Circle",
      authorRole: "Student Mentorship & Parent Relations",
      authorAvatar: "🌱",
      coverIcon: "❤️",
      excerpt: "A compassionate guide for chess parents on celebrating effort over ratings, debriefing losses constructively, and maintaining academic harmony alongside tournament passion.",
      tags: ["Parent Guide", "Emotional Support", "Healthy Growth", "Parenting"],
      content: `
        <p class="blog-lead">Being a chess parent is one of the most rewarding yet emotionally testing roles in youth sports. Watching your child sit silently across the board for two hours while you pace the waiting hall outside requires tremendous patience and understanding.</p>

        <h3>Tip 1: Praise the Process, Not the ELO Rating</h3>
        <p>When your child finishes a tournament round, avoid the immediate question: <em>"Did you win or lose?"</em> or <em>"How many rating points did you gain?"</em></p>
        <p>Instead, ask questions that foster intrinsic motivation:</p>
        <ul>
          <li><em>"Did you enjoy the game? What was your favorite move?"</em></li>
          <li><em>"Did you take your time and calculate before making big decisions?"</em></li>
          <li><em>"What is one new pattern you learned from your opponent?"</em></li>
        </ul>

        <h3>Tip 2: The 20-Minute Post-Loss Buffer</h3>
        <p>Right after a tough defeat, a child's emotions are raw. Never analyze the game or offer tactical criticism in the immediate 20 minutes following a loss. Simply provide a bottle of water, a warm hug, and let them decompress. Leave the analytical autopsy to their coach during the weekly review session.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Your child will remember how you treated them after a loss far longer than they will remember the trophy they won."</p>
          <span class="quote-author">— ChessKidoo Parent Guide</span>
        </div>

        <h3>Tip 3: Academic and Chess Equilibrium</h3>
        <p>At ChessKidoo, we structure our homework and weekly classes to complement school routines. Chess should serve as an intellectual multiplier for academic performance — boosting spatial geometry, mathematics, and reading comprehension — never a source of familial friction.</p>
      `
    },
    {
      id: 'anand-sindarov-gcl-twist',
      title: "Anand's ‘Comedy of Errors' at the Global Chess League: A Draw Refused, a Flag Fallen, a Lesson Taught",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "6 min read",
      date: "September 9, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "⏳",
      coverImage: "assets/img/blogs/gcl-anand-sindarov.jpg",
      coverCaption: "Viswanathan Anand's clock struck first against Javokhir Sindarov at the Global Chess League, hours after an earlier defeat to Ian Nepomniachtchi (Screengrab X / Times Now)",
      excerpt: "The legend had White, an advantage, and two chances to take half a point against the 20-year-old World Championship challenger. He refused both — and the clock had the final word.",
      tags: ["Viswanathan Anand", "Global Chess League", "Sindarov", "Time Pressure", "Clock Management"],
      sourceName: "Times Now (Faham Uddin)",
      sourceTitle: "Viswanathan Anand Loses To Sindarov After Turning Down Draw In Global Chess League",
      sourceUrl: "https://www.timesnownews.com/sports/chess/viswanathan-anand-loses-to-sindarov-after-turning-down-draw-in-global-chess-league-article-156123997",
      content: `
        <p class="blog-lead">It was a heavy week at the Global Chess League for the man who has carried Indian chess for three decades. Playing for the Alaskan Knights, <strong>Viswanathan Anand</strong> fell to world No. 1 <strong>Magnus Carlsen</strong> on Monday, held Alireza Firouzja to a draw, then on Tuesday resigned within hours against <strong>Ian Nepomniachtchi</strong> — before his clocks delivered the cruelest cut of all against <strong>Javokhir Sindarov</strong>, the 20-year-old challenging Gukesh for the World Championship.</p>

        <h3>The Game: All the Pieces, None of the Time</h3>
        <p>Anand, on the White side, reached a genuine advantage. With chances to win slipping as the clock drained, the young Uzbek offered a draw <em>at move 43 with ...Re4+</em>. Anand declined — and he told the press exactly why with disarming honesty: <em>"It seemed to me that his pieces had no coordination, so I tried to play for a win. And then, it's madness. I think at the very end, I must have had a draw, but I went with 70.Kxd4+... I already blundered, allowing 73...Rf8...Rc4+, and I can't take on B4."</em> The flag fell. When asked what went wrong, his answer was beautifully human: <em>"I don't know. If I know, I would do something."</em></p>

        <h3>How the Challenger Saw It</h3>
        <p>Sindarov was candid that he was unhappy with his own play — and openly relieved the draw was refused: <em>"I was very happy when he did not accept my draw. And I was thinking, Okay, I need to go in, I will win or lose."</em> He even read the position psychologically: <em>"I started to understand that he felt nervous when his time was going to be less than one minute... I took this psychological advantage, and I started trying to push, and he missed my last trick."</em></p>

        <div class="blog-quote-box">
          <p class="quote-text">"The board holds 64 squares. The clock is the 65th opponent — the only one that never blunders."</p>
          <span class="quote-author">— ChessKidoo Endgame &amp; Clock Lab</span>
        </div>

        <h3>Three Lessons Every ChessKidoo Student Should Pocket</h3>
        <ul>
          <li><strong>The 10% time rule is not a suggestion.</strong> Our critical-moments masterclass teaches it daily for a reason: a five-time World Champion spent his clock before move 30 and lost a winning position to arithmetic, not brilliance. Budget your minutes like pocket money — opening pars, middlegame savings, endgame investment.</li>
          <li><strong>A half-point in hand beats a win in the clouds.</strong> Refusing comfortable half-points out of ambition is brave, but it must be priced against the clock. Honest evaluation includes <em>your remaining time</em>, not only your material.</li>
          <li><strong>Opponents read your posture, not just your pieces.</strong> Sindarov legitimately pounced on visible nerves. Breathing drills, hand steady, and a poker face between moves are trainable skills — we run them before every round.</li>
        </ul>

        <p>Anand's worst day at the Global Chess League in years carries more coaching value than half a flawless tournament. A "comedy of errors" spoken aloud, without excuses, is precisely how we want our students to own every loss: <strong>name it, understand it, return stronger.</strong></p>
      `
    },
    {
      id: 'pragg-stlouis-rapid-lead',
      title: "Praggnanandhaa Tops the St. Louis Rapids: 12/18 and a Grand Chess Tour Finals Dream Kept Alive",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "6 min read",
      date: "August 5, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "⚡",
      coverImage: "assets/img/blogs/pragg-stlouis-rapid.jpg",
      coverCaption: "R Praggnanandhaa topped the rapid section in St Louis with 12 points from 18 (Image courtesy: PTI / Times Now)",
      excerpt: "Four wins, four draws and one final-round stumble — yet Praggnanandhaa still owns the rapid section by a point, with 18 blitz games and a $200,000 prize pool between him and the Grand Chess Tour finals.",
      tags: ["R Praggnanandhaa", "Grand Chess Tour", "St Louis Rapid & Blitz", "Sindarov", "Rapid Chess"],
      sourceName: "Times Now (PTI)",
      sourceTitle: "R Praggnanandhaa Tops St. Louis Rapids, Keeps Grand Chess Tour Finals Dream Alive",
      sourceUrl: "https://www.timesnownews.com/sports/chess/r-praggnanandhaa-tops-st-louis-rapids-keeps-grand-chess-tour-finals-dream-alive-article-155299393",
      content: `
        <p class="blog-lead">In a year when the World Championship spotlight belongs to Gukesh and Sindarov, <strong>R Praggnanandhaa</strong> went on his own summer statement run in St Louis: topping the <strong>rapid section</strong> of the Grand Chess Tour's premier speed event with a near-perfect 12 points from 18 — immaculate technique, precision, and the will to win rolled into one.</p>

        <h3>The Rapid Report Card: 12/18, Decoded</h3>
        <p>Young analysts — break down scoring the ChessKidoo way. Rapid games are worth <strong>two points</strong>: four wins (4 × 2) plus four draws (4 × 1) landed Praggnanandhaa on 12, even after losing the ninth and final rapid round to Dutch GM <strong>Jorden van Foreest</strong>. The stumble changed nothing at the top: he carried a one-point lead into the blitz phase over <strong>Javokhir Sindarov</strong> (11), with Wesley So (10), then a chasing pack of Levon Aronian, Leinier Dominguez Perez, Anish Giri and Vincent Keymer (9 each). Had he beaten van Foreest, the cushion could have been decisive — proof of how extra half-points in round nine matter as much as the earlier wins.</p>

        <h3>The Blitz Battalion: 18 Games, One Point Each</h3>
        <p>Blitz resets the math to <strong>one point per win</strong> across 18 games, deciding both the event title and a slice of the <strong>$200,000 purse</strong> ($50,000 to the champion). Blitz is the format where Praggnanandhaa's preparation meets chaos — and where the one-point cruise margins shrink to anonymity. The round-robin will be followed by the classical <strong>Sinquefield Cup</strong>, keeping the American summer fully loaded.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Momentum beats panic. A lost final round cost him nothing at the top because nine steady rounds had come before it."</p>
          <span class="quote-author">— ChessKidoo News Desk</span>
        </div>

        <h3>Why Our Students Must Follow This Tournament</h3>
        <ul>
          <li><strong>Know the scoring system better than your rival.</strong> Two points per rapid win, one per draw, one per blitz win — elite players optimise for the exact payout structure all tournament long. When your district event offers points for team boards, strategy changes with it.</li>
          <li><strong>Consistency across three formats is a superpower.</strong> Rapid, blitz, and classical chess reward different muscles. Praggnanandhaa's schedule this year is a curriculum: speed teaches structure; classical teaches patience.</li>
          <li><strong>Losing rounds happen to the best.</strong> Even 2026's fastest start saw its ninth-round collapse — and the standings barely shivered. What protects a lead is the depth built round by round, exactly what daily puzzles and homework accuracy build for our kids.</li>
        </ul>

        <p>Watch the blitz days as a family, score the cross-tables together, and let the children do their own arithmetic — this is chess education disguised as spectator sport.</p>
      `
    },
    {
      id: 'anand-fide-interim-president',
      title: "Anand Takes Charge of World Chess: FIDE's Interim President After EU Sanctions Name Dvorkovich",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "5 min read",
      date: "July 24, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "🏛️",
      coverImage: "assets/img/blogs/anand-fide-president.jpg",
      coverCaption: "Viswanathan Anand, the 15th World Champion, has assumed charge as FIDE's Interim President (Image courtesy: ChessBase India)",
      excerpt: "The EU's 21st sanctions list named FIDE President Arkady Dvorkovich, who voluntarily stepped aside to keep the federation stable. Holding the keys to world chess now: India's five-time World Champion.",
      tags: ["Viswanathan Anand", "FIDE", "Arkady Dvorkovich", "EU Sanctions", "Chess Governance"],
      sourceName: "ChessBase India (Devansh Singh)",
      sourceTitle: "Viswanathan Anand Takes Charge as FIDE Interim President",
      sourceUrl: "https://chessbase.in/news/viswanathan-anand-takes-charge-as-fide-interim-president",
      content: `
        <p class="blog-lead">World chess has a new man at the very top — and he learned his chess in Chennai. On July 24, 2026, FIDE President <strong>Arkady Dvorkovich</strong> announced that he was <strong>voluntarily suspending his powers and duties with immediate effect</strong> after the European Union named him in its 21st sanctions list. In accordance with the FIDE Charter, <strong>Viswanathan Anand</strong> — the 15th World Chess Champion and FIDE's Deputy President — has taken charge as the <strong>Interim President of the International Chess Federation</strong>.</p>

        <h3>What Exactly Happened</h3>
        <p>Council Decision (CFSP) 2026/1845, adopted on July 23, 2026, added Dvorkovich — Russia's former deputy prime minister and FIDE President since 2018 — to the EU's restrictive measures. His response was immediate and defiant: <em>"I consider this decision unlawful and unfair, and this decision will be immediately challenged by all possible means. I am confident that justice will prevail."</em> But he also read the chessboard coldly: until a court rules, the sanctions could <em>"hinder the stable functioning of FIDE"</em> — so he stepped aside for as long as EU and Swiss sanctions remain in force.</p>

        <h3>The FIDE Council Responds</h3>
        <p>The FIDE Council convened and ratified two decisions: first, acceptance of Dvorkovich's suspension — he will not act as controller or holder of FIDE or its assets while the sanctions last; second, appointment of Anand as Interim President under <strong>Article 19.2 of the FIDE Charter</strong> for the duration of the restrictive measures. Anand, elected Deputy President in August 2022, now occupies the highest administrative seat in international chess — a five-time World Champion running the institution that crowns champions.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Champions master 64 squares. The rarest masters master transitions — and Anand has spent a lifetime doing both with the same calm."</p>
          <span class="quote-author">— ChessKidoo News Desk</span>
        </div>

        <h3>Why This Is a Giant Moment for Indian Chess</h3>
        <p>A boy who won India's first Grandmaster title in 1988 now heads world chess in its hardest governance week in years. For every ChessKidoo student, the message is loud: the game's summit is not only over the board. Federations decide who plays which Olympiad, whose ratings survive walkovers, and how titles are awarded — the same machinery we saw bend under pressure in the Israel-Yom Kippur controversy at the Samarkand Olympiad. Steady hands matter.</p>

        <h3>What Young Players and Parents Should Watch</h3>
        <ul>
          <li><strong>Chess and politics touch, even if they are not the same game.</strong> Sanctions, federations and calendars decide who plays where. Knowing the landscape is part of being a modern tournament family.</li>
          <li><strong>Calm is a leadership superpower.</strong> Anand has now steered world chess through a sanctions storm the way he steered time-scrambles: politely, precisely, without panic.</li>
          <li><strong>Institutions need caretakers.</strong> Dvorkovich stepping aside to protect FIDE's daily work is a lesson in putting the game above the person.</li>
        </ul>

        <p>The next months will test the arrangement: Dvorkovich's court challenge, the council's balancing act, and a World Championship between Gukesh and Sindarov on the horizon. Whatever happens, chess has a steady hand on the wheel — and for once, it is a hand Indian kids can call their own.</p>
      `
    },
    {
      id: 'arjun-erigaisi-chennai-gms',
      title: "Arjun Erigaisi Takes Down World Champion Gukesh in Chennai to Join the Grandmasters Lead",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "5 min read",
      date: "July 21, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "♞",
      coverImage: "assets/img/blogs/arjun-chennai-gms.jpg",
      coverCaption: "Arjun Erigaisi punished a rare Gukesh slip in Round 5 of the 4th Quantbox Chennai Grand Masters 2026 (Photos: Tushar Damor / ChessBase India)",
      excerpt: "Gukesh was completely winning — the engine knew it, the hall knew it. But the perfect finisher never came, time pressure bit, and India No. 1 struck with Black to join Alireza Firouzja in the lead.",
      tags: ["Arjun Erigaisi", "D Gukesh", "Chennai Grand Masters", "Alireza Firouzja", "Time Pressure"],
      sourceName: "ChessBase India (Devansh Singh)",
      sourceTitle: "India No.1 Arjun Erigaisi beats World Champion Gukesh at 4th Quantbox Chennai Grandmasters 2026",
      sourceUrl: "https://chessbase.in/news/4th-quantbox-chennai-grand-masters-2026-round-5",
      content: `
        <p class="blog-lead">In Round 5 of the <strong>4th Quantbox Chennai Grand Masters 2026</strong>, India No. 1 <strong>Arjun Erigaisi</strong> did what few players on Earth have managed this year: he beat World Champion <strong>D Gukesh</strong> — with the black pieces, in a game the champion had been winning, in the champion's home state. The win pulled Arjun level with <strong>Alireza Firouzja</strong> at the top with two rounds to play.</p>

        <h3>How a Won Game Slipped Through a Champion's Fingers</h3>
        <p>Gukesh played a genuinely brilliant first phase: he outplayed Arjun, and engines ranked him as completely winning. But the perfect finisher never arrived. As the clock drained, the chances slipped one by one — and then came the crucial error, which Arjun, patient all game long, converted into a full point. ChessBase India's analysis put the lesson perfectly: <em>"We keep thinking how we will win, but sometimes it is important to ask: if I stop my opponent's plan, what would they do? Victory often comes by not doing much more than that!"</em></p>

        <h3>The Rest of a Chaos Round</h3>
        <p>Arjun's charge had been building: in Round 3 he was the only winner on the board, taking down <strong>Hans Niemann</strong> in a razor-sharp closed Catalan, and Round 4 left him in sole second, half a point behind Firouzja. In Round 5, <strong>Nodirbek Abdusattorov</strong> also won with Black against <strong>Nihal Sarin</strong> to sit half a point off the lead — while an upset storm was already brewing for Round 6. The stakes were serious: a grand prize pool of <strong>₹75,00,000</strong> and heavy <strong>FIDE Circuit points</strong> feeding the next Candidates cycle, all under a classical 90 minutes + 30 seconds control at The Westin Chennai Velachery.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Against a champion, you rarely get two chances. Arjun stayed alive long enough to use his one."</p>
          <span class="quote-author">— ChessKidoo Coaching Council</span>
        </div>

        <h3>What Our Students Should Steal from Round 5</h3>
        <ul>
          <li><strong>Defence is an attack on the opponent's plan.</strong> Arjun's win began the moment he stopped chasing the game he wanted and started deleting the game Gukesh wanted. Ask "what does my rival want?" before every big decision.</li>
          <li><strong>The clock decides money tournaments.</strong> A world-class advantage died under time pressure — the same villain from Anand's Global Chess League story. Budget minutes like pocket money, every single game.</li>
          <li><strong>World-class chess happens in our backyard.</strong> Chennai hosts super-tournaments your family can actually attend. Watch the boards live, collect autographs, and let grandmaster chess feel normal — not distant.</li>
        </ul>

        <p><em>Epilogue: two days later, Alireza Firouzja lifted the Chennai Grand Masters title on July 23 — but the thunderclap of the event stayed Arjun's black-piece takedown of a World Champion.</em></p>
      `
    },
    {
      id: 'rathanvel-india-99th-gm',
      title: "India's 99th Grandmaster is From Coimbatore: The V S Rathanvel Story of Norms, Near-Misses and Never Giving Up",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "7 min read",
      date: "July 18, 2026",
      author: "ChessKidoo News Desk",
      authorRole: "World Chess Correspondents",
      authorAvatar: "📰",
      coverIcon: "🇮🇳",
      coverImage: "assets/img/blogs/rathanvel-99th-gm.jpg",
      coverCaption: "V S Rathanvel — India's 99th Grandmaster, born in Coimbatore, Tamil Nadu (Image courtesy: ChessBase India)",
      excerpt: "Five norms were banked by 2022. The 2500 rating refused to come for four more years. Then came Assam, ten straight wins, exactly eight rating points — and a Coimbatore boy became India's 99th Grandmaster.",
      tags: ["V S Rathanvel", "India's 99th GM", "Coimbatore", "Grandmaster Norms", "Perseverance"],
      sourceName: "ChessBase India (Sagar Shah) & Sportstar",
      sourceTitle: "BREAKING: India gets its 99th Grandmaster - Rathanvel VS",
      sourceUrl: "https://chessbase.in/news/rathanvel-is-indias-99th-gm",
      content: `
        <p class="blog-lead">On July 18, 2026, at the <strong>3rd Guwahati Smart City International Open</strong> in Assam, <strong>V S Rathanvel</strong> crossed the live rating of 2500 — and India quietly welcomed its <strong>99th Grandmaster</strong>. The milestone made headlines across the country, but for us it landed closer to the heart: Rathanvel was <strong>born in 2001 in Coimbatore, Tamil Nadu</strong> — the very city ChessKidoo calls home. (Some state releases spell his name "Rathnavel"; ChessBase and Sportstar carry the official <em>Rathanvel</em>.)</p>

        <h3>The Norm Machine: Five Norms Before Most Players Finish One</h3>
        <p>A Grandmaster needs three norms and a 2500 rating. Rathanvel collected <strong>five norms</strong>: the first at the <strong>First Saturday tournament in Hungary, September 2021</strong>; the second weeks later at the <strong>Vezerkepzo GM-MIX</strong>; the third at <strong>First Saturday GM in Budapest, March 2022</strong> with 7.5/9; the fourth at <strong>Abu Dhabi in August 2023</strong> (5.5/9 against a 2577-strength field, beating Spain's Santos Latasa and drawing Javokhir Sindarov and Vladislav Artemiev); and the fifth at <strong>France's Top 16 in mid-2025</strong>, where he toppled Czech legend <strong>David Navara</strong> and Egypt's <strong>Bassem Amin</strong>. The norm requirement was complete in <strong>2022</strong>. The rating was not.</p>

        <h3>Four Years of "So Close"</h3>
        <p>What followed was one of the most testing rating barriers Indian chess has seen. For nearly four years Rathanvel remained one of the strongest International Masters in India and the world, repeatedly knocking on 2500's door. <em>"There were three or four occasions when I came within just one game of crossing 2500,"</em> he recalled — painful near-misses against <strong>Maxim Matlakov in 2023</strong> and <strong>David Paravyan in 2024</strong>, where one more win would have ended the wait. Those who know his game insist the block was <strong>psychological rather than technical</strong>. As he put it himself: <em>"The closer you get, the pressure adds on."</em></p>

        <h3>The July Gamble That Worked</h3>
        <p>Rathanvel began July rated <strong>2492</strong> — eight points short. His plan was surgical: two rating tournaments in Assam (the Ayodhana event, then Guwahati Smart City), and a bold rating-protection strategy — <strong>skipping rounds against players below 1600</strong> so no win would be "wasted" and no loss could crater the average. Then he simply won <strong>ten games in a row</strong>, banked exactly the <strong>eight Elo points</strong> he needed, and the title that five norms had promised for four years finally belonged to him. Assam can claim a slice of history too: India's 99th GM was crowned at their tournament.</p>

        <h3>A Coimbatore Story from Move One</h3>
        <p>The journey began at home: a six-year-old Rathanvel, a <strong>free chessboard</strong>, and his <strong>mother Senthil Vadivu</strong> as his first opponent, while father <strong>C. Sivakumar</strong> and mother Senthil Vadivu ran their wedding-card printing business in Coimbatore. First teachers <strong>Krishnamurthy and Dhansekar</strong> shaped him in the city; a <strong>U-10 World Youth bronze medal in Rio de Janeiro (2011)</strong> announced the talent; the <strong>IM title came in 2020</strong>; and in 2018, aged 17, he had already beaten 2727-rated <strong>Le Quang Liem</strong> in Abu Dhabi. His classical scorecards read like a who's-who: draws with <strong>Nodirbek Abdusattorov (twice), Artemiev, Sindarov and Gukesh</strong>. He represented Tamil Nadu three times at SGFI school games — winning two golds and a silver — and credits coaches <strong>GM Vishnu Prasanna, GM Srinath Narayanan, GM Shyam Sundar and GM Sundararajan Kidambi</strong>, with long support from <strong>MPL (2019–2025)</strong> and <strong>Dr. M. Manickam of Sakthi Finance</strong>.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"The closer you get, the pressure adds on."</p>
          <span class="quote-author">— V S Rathanvel, on four years stuck below 2500 with five norms in the bank</span>
        </div>

        <h3>What ChessKidoo Kids Should Learn from GM #99</h3>
        <ul>
          <li><strong>The title is a marathon, not a highlight.</strong> Three norms minimum became five norms and five years for a player this strong. Progress is measured in seasons, not weekends.</li>
          <li><strong>Near-misses are data, not verdicts.</strong> The Matlakov and Paravyan games hurt — and then became fuel. Review the losses that "should" have been wins; they hold your next rating level.</li>
          <li><strong>Plan your rating like a campaign.</strong> Choosing the right tournaments, the right boards and even the right rounds to rest is a skill our students can start learning at district level.</li>
          <li><strong>Your city can produce a Grandmaster.</strong> It already did — from a Coimbatore card shop, with a mother as the first opponent. The next one could be sitting in a ChessKidoo classroom right now.</li>
        </ul>

        <p>India now stands at <strong>99</strong>. The whole country is asking who the 100th will be — and somewhere in Tamil Nadu, a six-year-old with a new chessboard is already practising for that headline.</p>
      `
    },
    {
      id: 'gm-rathnavel-chess-journey',
      title: "GM Rathnavel: Tamil Nadu's Pride and the Inspiring Chess Journey",
      category: "Chess News & Headlines",
      categoryClass: "cat-news",
      readTime: "7 min read",
      date: "November 10, 2026",
      author: "ChessKidoo Editorial Team",
      authorRole: "Chess Correspondents",
      authorAvatar: "♟️",
      coverIcon: "♟️",
      coverImage: "assets/img/hero-chess-3d.jpg",
      coverCaption: "Grandmaster Rathnavel — a beacon of Tamil Nadu chess excellence",
      excerpt: "Discover the inspiring journey of Grandmaster Rathnavel, one of Tamil Nadu's finest chess talents. From local tournaments to international glory, his story is a testament to dedication, discipline, and the power of structured chess training.",
      tags: ["GM Rathnavel", "Grandmaster", "Tamil Nadu Chess", "Chess Journey", "Inspiration"],
      sourceName: "ChessKidoo Academy",
      sourceTitle: "GM Rathnavel: Tamil Nadu's Chess Pride",
      sourceUrl: "https://chesskidoo.com",
      content: `
        <p class="blog-lead">Grandmaster Rathnavel stands as one of Tamil Nadu's most accomplished chess players, embodying the spirit of dedication and strategic brilliance that defines Indian chess. His journey from a young enthusiast to a Grandmaster is a story of perseverance, tactical mastery, and an unyielding passion for the 64 squares.</p>

        <h3>Early Beginnings</h3>
        <p>Rathnavel's chess journey began in the vibrant chess culture of Tamil Nadu, a state that has produced legends like Viswanathan Anand. Starting as a young player with natural talent, he quickly distinguished himself through his deep positional understanding and fearless attacking style.</p>

        <h3>The Grandmaster Title</h3>
        <p>Earning the Grandmaster title is the pinnacle of chess achievement, requiring three GM norms and a 2500 FIDE rating. Rathnavel's path to this title was marked by consistent performances in international tournaments, demonstrating his ability to compete against the world's best players.</p>

        <div class="blog-quote-box">
          <p class="quote-text">"Every Grandmaster was once a beginner who refused to give up. The 64 squares teach you that every setback is just a puzzle waiting to be solved."</p>
          <span class="quote-author">— GM Rathnavel</span>
        </div>

        <h3>Training Philosophy</h3>
        <p>Rathnavel's approach to chess emphasizes:</p>
        <ul>
          <li><strong>Deep positional understanding:</strong> Rather than memorizing openings, he focuses on understanding pawn structures and piece coordination.</li>
          <li><strong>Tactical sharpness:</strong> Daily puzzle solving and tactical exercises to maintain calculation accuracy.</li>
          <li><strong>Endgame mastery:</strong> The belief that endgames are where games are truly decided.</li>
          <li><strong>Mental resilience:</strong> Building the psychological strength needed for long classical games.</li>
        </ul>

        <h3>Impact on Indian Chess</h3>
        <p>As a Grandmaster from Tamil Nadu, Rathnavel has contributed significantly to India's growing chess dominance. His games are studied by young players across the country, and his coaching philosophy has influenced a new generation of Indian chess talents.</p>

        <p>At ChessKidoo Academy, we draw inspiration from players like GM Rathnavel — their journeys remind us that with structured training, consistent practice, and the right mentorship, any young player can achieve greatness on the 64 squares.</p>
      `
    },
    {
      id: 'hindustan-chess-cell',
      title: "Hindustan Chess Cell: Nurturing Champions in Coimbatore",
      category: "Academy & Vision",
      categoryClass: "cat-academy",
      readTime: "6 min read",
      date: "November 12, 2026",
      author: "ChessKidoo Editorial Team",
      authorRole: "Academy Leadership",
      authorAvatar: "♟️",
      coverIcon: "🏆",
      coverImage: "assets/img/hero-chess-3d.jpg",
      coverCaption: "Hindustan Chess Cell — Coimbatore's premier chess training center",
      excerpt: "Explore the story of Hindustan Chess Cell in Coimbatore, a breeding ground for chess talent. Learn how this academy has produced district winners, state champions, and FIDE-rated players through structured FIDE methodology and dedicated coaching.",
      tags: ["Hindustan Chess Cell", "Coimbatore Chess", "Chess Academy", "Tamil Nadu", "FIDE Training"],
      sourceName: "ChessKidoo Academy",
      sourceTitle: "Hindustan Chess Cell: Nurturing Chess Champions",
      sourceUrl: "https://chesskidoo.com",
      content: `
        <p class="blog-lead">Nestled in the heart of Coimbatore, <strong>Hindustan Chess Cell</strong> has emerged as one of Tamil Nadu's most respected chess training centers. Known for producing district winners, state champions, and FIDE-rated players, the academy has become a beacon for young chess enthusiasts across the region.</p>

        <h3>A Legacy of Excellence</h3>
        <p>Hindustan Chess Cell has built its reputation on a foundation of structured FIDE methodology and dedicated coaching. The academy's approach mirrors the best practices of international chess training, adapted for young Indian players.</p>

        <h3>Notable Achievements</h3>
        <p>Students from Hindustan Chess Cell have consistently performed at the highest levels:</p>
        <ul>
          <li><strong>Anfal</strong> — Zone Winner, Coimbatore District Championship (Pollachi Star Players, Hindusthan Chess Team)</li>
          <li><strong>Mocsha</strong> — Tamil Nadu State Chess Championship Prize Winner</li>
          <li><strong>Yadhuveer</strong> — Winner 7/7, Under-9 Category, Erode District Series Championship</li>
          <li><strong>Riyazzen</strong> — FIDE International Classical Tournament, FIDE Rating 1520</li>
        </ul>

        <div class="blog-quote-box">
          <p class="quote-text">"Champion players are not born with special hands or magical brains. They are sculpted by the daily willingness to solve 20 difficult puzzles when nobody is watching."</p>
          <span class="quote-author">— Coach Gyan Surya, FIDE Candidate Master, Hindustan Chess Cell</span>
        </div>

        <h3>Training Methodology</h3>
        <p>Hindustan Chess Cell follows a three-tier training system:</p>
        <ul>
          <li><strong>Foundation Level:</strong> Board geography, piece movement, basic tactics, and opening principles for beginners.</li>
          <li><strong>Intermediate Level:</strong> Pawn structures, strategic planning, endgame technique, and tournament preparation.</li>
          <li><strong>Advanced Level:</strong> Deep calculation, opening repertoire building, master game analysis, and FIDE rating improvement.</li>
        </ul>

        <h3>ChessKidoo & Hindustan Chess Cell Partnership</h3>
        <p>ChessKidoo Academy collaborates with Hindustan Chess Cell to bring structured digital tracking to Coimbatore's chess community. Through our student tracking system, parents can monitor their child's progress, puzzle accuracy, and tournament performance in real-time.</p>

        <p>Together, we are building a chess ecosystem where every young player has the tools, mentorship, and data-driven insights needed to reach their full potential.</p>
      `
    },
    {
      id: 'chesskidoo-student-tracking-deep-dive',
      title: "Inside ChessKidoo's Student Tracking System: How Data Drives Chess Excellence",
      category: "Academy & Vision",
      categoryClass: "cat-academy",
      readTime: "8 min read",
      date: "November 15, 2026",
      author: "ChessKidoo Tech Team",
      authorRole: "Product & Engineering",
      authorAvatar: "♟️",
      coverIcon: "📊",
      coverImage: "assets/img/hero-chess-3d.jpg",
      coverCaption: "ChessKidoo's proprietary student tracking dashboard",
      excerpt: "A deep dive into ChessKidoo's proprietary student tracking system — how automated progress analytics, puzzle velocity tracking, and time-based fee management work together to create India's most comprehensive chess learning platform.",
      tags: ["Student Tracking", "Data Analytics", "Chess Education", "Technology", "FIDE"],
      sourceName: "ChessKidoo Academy",
      sourceTitle: "Inside ChessKidoo's Student Tracking System",
      sourceUrl: "https://chesskidoo.com",
      content: `
        <p class="blog-lead">ChessKidoo's Student Tracking System is India's first comprehensive digital platform for chess education management. Built from the ground up to address the unique needs of chess academies, it combines student progress tracking, fee management, attendance, homework, and performance analytics in a single unified system.</p>

        <h3>Core Features</h3>
        <ul>
          <li><strong>Time-Based Fee Management:</strong> Fees are calculated per-month based on active/inactive status periods. Students are only billed for months they were active. Historical records are never deleted.</li>
          <li><strong>Progress Analytics:</strong> Every puzzle solved, game played, and tournament participated in is tracked and analyzed.</li>
          <li><strong>Attendance Tracking:</strong> Per-student, per-day attendance with classwork/homework notes.</li>
          <li><strong>Homework System:</strong> Assign, submit, review homework with file attachments and feedback.</li>
          <li><strong>Performance Reports:</strong> Automated reports for parents showing progress, fees, and attendance.</li>
        </ul>

        <h3>Time-Based Status Engine</h3>
        <p>The system's most innovative feature is its time-based student status engine. Unlike traditional systems that use a single "current status" field, ChessKidoo tracks status changes over time:</p>
        <ul>
          <li><strong>Active Periods:</strong> Fees apply only during active months</li>
          <li><strong>Inactive Periods:</strong> Amount = ₹0, status = "No Fee Required"</li>
          <li><strong>Reactivation:</strong> Fees resume from the effective month, no backfill</li>
          <li><strong>Historical Preservation:</strong> Past paid/unpaid records are never modified</li>
        </ul>

        <div class="blog-quote-box">
          <p class="quote-text">"Data doesn't just track progress — it reveals patterns. A student who consistently struggles in endgames can be identified and helped before it becomes a habit."</p>
          <span class="quote-author">— ChessKidoo Product Team</span>
        </div>

        <h3>Coach & Admin Dashboards</h3>
        <p>The system provides role-based dashboards:</p>
        <ul>
          <li><strong>Admin Dashboard:</strong> Revenue tracking, student management, fee collection, attendance overview, coach management</li>
          <li><strong>Coach Portal:</strong> Student lists, homework assignment, attendance marking, study PGN analysis, daily tasks</li>
          <li><strong>Parent Portal:</strong> Child's progress, fee history, attendance, homework submissions, tournament results</li>
          <li><strong>Student Portal:</strong> Personal dashboard, puzzle stats, game history, learning resources</li>
        </ul>

        <p>ChessKidoo's student tracking system represents the future of chess education in India — where every move, every puzzle, and every fee is tracked, analyzed, and optimized for student success.</p>
      `
    },
  ];

  const DEFAULT_COMMENTS = {
    'the-chesskidoo-revolution': [
      {
        id: 'c1',
        name: 'Suresh Kumar',
        role: 'Parent',
        date: 'Oct 11, 2026',
        text: 'The student tracking system has been a game changer for my son. Seeing his daily tactical accuracy and homework feedback in one portal gives us complete clarity on his progress!'
      },
      {
        id: 'c2',
        name: 'Coach Gyan Surya',
        role: 'Coach',
        date: 'Oct 12, 2026',
        text: 'Proud to be a part of this journey from day one. Seeing young 6-year-olds transform into confident state contenders is the greatest reward.'
      }
    ],
    'from-the-founders-desk': [
      {
        id: 'c3',
        name: 'Priya Meenakshi',
        role: 'Parent',
        date: 'Oct 5, 2026',
        text: 'So true! My daughter used to be very impatient with school tasks, but after 6 months of coaching at ChessKidoo, her concentration has skyrocketed.'
      },
      {
        id: 'c4',
        name: 'Karthik Raja',
        role: 'Tournament Player',
        date: 'Oct 7, 2026',
        text: 'Inspiring words from the founder. Chess truly teaches life lessons that no textbook can replicate.'
      }
    ],
    'wall-of-champions-our-prodigies': [
      {
        id: 'c5',
        name: 'Ramesh Babu',
        role: 'Parent',
        date: 'Sep 29, 2026',
        text: 'Hearty congratulations to Yadhuveer and Anfal! Watching their progress inspires our younger kids to work harder every single day.'
      }
    ],
    'gukesh-clutch-olympiad-2026': [
      {
        id: 'cn1',
        name: 'Divya Raghavan',
        role: 'Parent',
        date: 'Sep 26, 2026',
        text: 'My son watched the last game live and now insists on doing "rescue drills" before bed. Please include this Olympiad in the weekly homework puzzles!'
      },
      {
        id: 'cn2',
        name: 'Coach Gyan Surya',
        role: 'Coach',
        date: 'Sep 27, 2026',
        text: 'Gukesh saving that board four is a masterclass in defence we will replay for every advanced batch this week. Follow the women’s games too — India vs China is a classroom of its own.'
      }
    ],
    'israel-fide-yom-kippur-dispute': [
      {
        id: 'cn3',
        name: 'Vijay Ananth',
        role: 'Coach',
        date: 'Sep 23, 2026',
        text: 'A timely reminder for every academy parent — we now double-check round timings against festival calendars before every district registration. No walkovers, ever!'
      }
    ],
    'anand-sindarov-gcl-twist': [
      {
        id: 'cn4',
        name: 'Harini Suresh',
        role: 'Tournament Player',
        date: 'Sep 10, 2026',
        text: "The 65th opponent quote is going on my study wall. Even I know the pain of losing on time with a winning position — Anand made me feel less alone."
      },
      {
        id: 'cn5',
        name: 'Ranjith A S',
        role: 'Coach',
        date: 'Sep 11, 2026',
        text: 'We will run this exact "draw decision under low clock" position in Saturday’s batch. A world champion’s worst clock day is the best teaching material of the month.'
      }
    ],
    'pragg-stlouis-rapid-lead': [
      {
        id: 'cn6',
        name: 'Mohana Krishnan',
        role: 'Parent',
        date: 'Aug 6, 2026',
        text: 'My daughter calculated Praggnanandhaa’s rapid points on paper exactly like the article suggests. Tournament maths is the best home exercise for chess kids!'
      }
    ],
    'bodhana-youngest-female-im': [
      {
        id: 'cn7',
        name: 'Sneha Krishnan',
        role: 'Parent',
        date: 'Oct 25, 2026',
        text: 'Trichy roots and a Judit Polgar record — my daughter has not stopped talking about Bodhana all weekend. We have drawn her three-norms chart on our fridge!'
      },
      {
        id: 'cn8',
        name: 'Coach Aravind',
        role: 'Coach',
        date: 'Oct 26, 2026',
        text: 'Losing round one to a 2536 GM and still taking the title — we will use exactly that Budva storyline in the girls’ batch this week. Records reward consistency.'
      }
    ],
    'anand-fide-interim-president': [
      {
        id: 'cn9',
        name: 'Harini Suresh',
        role: 'Tournament Player',
        date: 'Jul 25, 2026',
        text: 'From refusing draws to signing council decisions — Vishy sir’s calm is now world chess’s calm. FIDE is in steady hands.'
      },
      {
        id: 'cn10',
        name: 'Ramesh Babu',
        role: 'Parent',
        date: 'Jul 26, 2026',
        text: 'Explained this to my kids with the class-monitor analogy and they got it instantly. Anand sir will keep the tournament calendar fair for everyone.'
      }
    ],
    'arjun-erigaisi-chennai-gms': [
      {
        id: 'cn11',
        name: 'Coach Gyan Surya',
        role: 'Coach',
        date: 'Jul 22, 2026',
        text: '“First stop your opponent’s plan” is now our motto of the week. Arjun proved you can beat a World Champion without ever playing a spectacular move.'
      },
      {
        id: 'cn12',
        name: 'Divya Raghavan',
        role: 'Parent',
        date: 'Jul 22, 2026',
        text: 'We took the kids to Chennai for the final rounds — seeing super-GM chess live changed something in them. Next trip already planned!'
      }
    ],
    'rathanvel-india-99th-gm': [
      {
        id: 'cn13',
        name: 'Lakshmi Prabha',
        role: 'Parent',
        date: 'Jul 19, 2026',
        text: 'A Grandmaster from our own Coimbatore! We showed my son the norms table over breakfast and he now writes “GM #99” on his practice notebook every day.'
      },
      {
        id: 'cn14',
        name: 'Ranjith A S',
        role: 'Coach',
        date: 'Jul 20, 2026',
        text: 'Four years below 2500 after five norms — that is the realest lesson in chess we can teach our students. Patience is a rating strategy too. Congratulations, Rathanvel!'
      }
    ]
  };

  const CK_Blogs = {
    articles: [],
    activeCategory: 'All',
    searchQuery: '',

    init() {
      this.loadArticles();
      this.renderCategoryChips();
      this.renderFeaturedSpotlight();
      this.renderArticles();
      this.bindEvents();
    },

    loadArticles() {
      try {
        const custom = JSON.parse(localStorage.getItem('chesskidoo_custom_blogs') || '[]');
        this.articles = [...custom, ...DEFAULT_ARTICLES];
      } catch (e) {
        this.articles = DEFAULT_ARTICLES.slice();
      }
    },

    getComments(articleId) {
      try {
        const stored = JSON.parse(localStorage.getItem('chesskidoo_blog_comments') || '{}');
        const defaultForArticle = DEFAULT_COMMENTS[articleId] || [];
        const customForArticle = stored[articleId] || [];
        return [...defaultForArticle, ...customForArticle];
      } catch (e) {
        return DEFAULT_COMMENTS[articleId] || [];
      }
    },

    saveComment(articleId, commentObj) {
      try {
        const stored = JSON.parse(localStorage.getItem('chesskidoo_blog_comments') || '{}');
        stored[articleId] = stored[articleId] || [];
        stored[articleId].push(commentObj);
        localStorage.setItem('chesskidoo_blog_comments', JSON.stringify(stored));
      } catch (e) {}
    },

    renderCategoryChips() {
      const container = document.getElementById('blog-category-chips');
      if (!container) return;
      const categories = [
        'All',
        'Academy & Vision',
        "Founder's Desk",
        'Chess News & Headlines',
        'Valuable Players & Stars',
        'Chess Tactics & Strategy',
        'Parenting & Growth'
      ];

      container.innerHTML = categories.map(cat => {
        const isActive = this.activeCategory === cat;
        return `<button class="blog-chip ${isActive ? 'active' : ''}" onclick="CK.blogs.setCategory('${cat}')">${cat}</button>`;
      }).join('');
    },

    setCategory(cat) {
      this.activeCategory = cat;
      this.renderCategoryChips();
      this.renderArticles();
    },

    setSearch(query) {
      this.searchQuery = (query || '').trim().toLowerCase();
      this.renderArticles();
    },

    renderFeaturedSpotlight() {
      const el = document.getElementById('blog-featured-card');
      if (!el || this.articles.length === 0) return;
      // Featured priority: article flagged `featured: true`, else first article.
      const featured = this.articles.find(a => a.featured) || this.articles[0];
      el.innerHTML = `
        <div class="blog-featured-inner ${featured.coverImage ? 'has-cover' : ''}">
          ${featured.coverImage ? `
          <div class="blog-featured-cover">
            <img src="${featured.coverImage}" alt="${escapeHtml(featured.coverCaption || featured.title)}" loading="lazy">
            ${featured.coverCaption ? `<span class="blog-cover-credit">${escapeHtml(featured.coverCaption)}</span>` : ''}
          </div>` : ''}
          <div class="blog-featured-body">
            <div class="blog-featured-badge">⭐ FEATURED CHRONICLE</div>
            <h2 class="blog-featured-title">${escapeHtml(featured.title)}</h2>
            <p class="blog-featured-excerpt">${escapeHtml(featured.excerpt)}</p>
            <div class="blog-featured-meta">
              <span class="blog-meta-item">✍️ ${escapeHtml(featured.author)}</span>
              <span class="blog-meta-item">⏱️ ${featured.readTime}</span>
              <span class="blog-meta-item">📅 ${featured.date}</span>
            </div>
            <button class="btn btn-gold blog-featured-btn" onclick="CK.blogs.openArticle('${featured.id}')">
              Read Full Chronicle →
            </button>
          </div>
        </div>
      `;
    },

    renderArticles() {
      const grid = document.getElementById('blog-articles-grid');
      if (!grid) return;

      let list = this.articles.slice();

      if (this.activeCategory !== 'All') {
        list = list.filter(a => a.category === this.activeCategory);
      }

      if (this.searchQuery) {
        list = list.filter(a =>
          a.title.toLowerCase().includes(this.searchQuery) ||
          a.excerpt.toLowerCase().includes(this.searchQuery) ||
          a.author.toLowerCase().includes(this.searchQuery) ||
          (a.tags && a.tags.some(t => t.toLowerCase().includes(this.searchQuery)))
        );
      }

      if (list.length === 0) {
        grid.innerHTML = `
          <div class="blog-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--ivory-dim);">
            <div style="font-size: 3rem; margin-bottom: 12px;">♟️</div>
            <h3 style="color: var(--gold); margin-bottom: 8px;">No matching articles found</h3>
            <p>Try searching with another keyword or pick a different category.</p>
            <button class="btn btn-outline" style="margin-top: 16px;" onclick="CK.blogs.setCategory('All'); document.getElementById('blog-search-input').value=''; CK.blogs.setSearch('');">Reset Filters</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = list.map(a => {
        const comments = this.getComments(a.id);
        const tagsHtml = (a.tags || []).map(t => `<span class="blog-tag">#${escapeHtml(t)}</span>`).join(' ');
        const coverHtml = a.coverImage
          ? `<div class="blog-card-cover"><img src="${a.coverImage}" alt="${escapeHtml(a.coverCaption || a.title)}" loading="lazy"></div>`
          : `<div class="blog-card-cover-fallback">${a.coverIcon || '♟️'}</div>`;

        return `
          <article class="blog-card" onclick="CK.blogs.openArticle('${a.id}')">
            ${coverHtml}
            <div class="blog-card-header">
              <span class="blog-cat-badge ${a.categoryClass || 'cat-academy'}">${escapeHtml(a.category)}</span>
              <span class="blog-read-time">⏱️ ${a.readTime}</span>
            </div>
            <h3 class="blog-card-title">${escapeHtml(a.title)}</h3>
            <p class="blog-card-excerpt">${escapeHtml(a.excerpt)}</p>
            <div class="blog-card-tags">${tagsHtml}</div>
            <div class="blog-card-footer">
              <div class="blog-author-info">
                <span class="blog-author-avatar">${a.authorAvatar || '♟️'}</span>
                <div>
                  <div class="blog-author-name">${escapeHtml(a.author)}</div>
                  <div class="blog-publish-date">${a.date}</div>
                </div>
              </div>
              <div class="blog-card-action">
                <span class="blog-comment-count" title="${comments.length} discussions">💬 ${comments.length}</span>
                <span class="blog-read-link">Read →</span>
              </div>
            </div>
          </article>
        `;
      }).join('');
    },

    openArticle(articleId) {
      const article = this.articles.find(a => a.id === articleId);
      if (!article) return;

      const modal = document.getElementById('blog-reader-modal');
      if (!modal) return;

      document.getElementById('brm-category').innerText = article.category;
      document.getElementById('brm-category').className = `blog-cat-badge ${article.categoryClass || 'cat-academy'}`;
      document.getElementById('brm-title').innerText = article.title;
      document.getElementById('brm-author').innerText = article.author;
      document.getElementById('brm-role').innerText = article.authorRole || 'Contributor';
      document.getElementById('brm-date').innerText = article.date;
      document.getElementById('brm-readtime').innerText = article.readTime;
      document.getElementById('brm-avatar').innerText = article.authorAvatar || '♟️';
      // Banner photo + source attribution for syndicated chronicles
      const bannerHtml = article.coverImage ? `
        <figure class="blog-reader-banner">
          <img src="${article.coverImage}" alt="${escapeHtml(article.coverCaption || article.title)}">
          ${article.coverCaption ? `<figcaption>${escapeHtml(article.coverCaption)}</figcaption>` : ''}
        </figure>` : '';
      const sourceHtml = article.sourceUrl ? `
        <div class="blog-source-attribution">
          📰 Syndicated chronicle — analysis based on “${escapeHtml(article.sourceTitle || article.title)}”, ${escapeHtml(article.sourceName || 'external news desk')}.
          <a href="${article.sourceUrl}" target="_blank" rel="noopener">Read the original report →</a>
        </div>` : '';
      document.getElementById('brm-content').innerHTML = bannerHtml + article.content + sourceHtml;
      document.getElementById('brm-article-id').value = article.id;

      this.renderArticleComments(article.id);
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    closeReader() {
      const modal = document.getElementById('blog-reader-modal');
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
    },

    renderArticleComments(articleId) {
      const container = document.getElementById('brm-comments-list');
      const countEl = document.getElementById('brm-comments-count');
      if (!container) return;

      const comments = this.getComments(articleId);
      if (countEl) countEl.innerText = `${comments.length} Comment${comments.length === 1 ? '' : 's'}`;

      if (comments.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--ivory-dim); padding: 20px; font-style: italic;">
            Be the first to share your thoughts or ask a question!
          </div>
        `;
        return;
      }

      container.innerHTML = comments.map(c => `
        <div class="blog-comment-item">
          <div class="blog-comment-head">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="blog-comment-author">${escapeHtml(c.name)}</span>
              <span class="blog-comment-role-badge">${escapeHtml(c.role || 'Reader')}</span>
            </div>
            <span class="blog-comment-date">${c.date}</span>
          </div>
          <div class="blog-comment-body">${escapeHtml(c.text)}</div>
        </div>
      `).join('');
    },

    submitComment() {
      const articleId = document.getElementById('brm-article-id').value;
      const nameInput = document.getElementById('brm-comment-name');
      const roleInput = document.getElementById('brm-comment-role');
      const textInput = document.getElementById('brm-comment-text');

      const name = nameInput.value.trim();
      const role = roleInput.value;
      const text = textInput.value.trim();

      if (!name) {
        alert('Please enter your name');
        nameInput.focus();
        return;
      }
      if (!text) {
        alert('Please enter your comment or question');
        textInput.focus();
        return;
      }

      const newComment = {
        id: 'c_' + Date.now(),
        name: name,
        role: role,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        text: text
      };

      this.saveComment(articleId, newComment);
      textInput.value = '';
      this.renderArticleComments(articleId);

      // Flash confirmation toast if available
      if (window.CK && CK.showToast) {
        CK.showToast('Your comment has been posted!', 'success');
      } else {
        const count = document.getElementById('brm-comments-count');
        if (count) count.scrollIntoView({ behavior: 'smooth' });
      }
    },

    openWriteModal() {
      const modal = document.getElementById('blog-write-modal');
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeWriteModal() {
      const modal = document.getElementById('blog-write-modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    },

    publishCustomBlog() {
      const title = document.getElementById('bwm-title').value.trim();
      const category = document.getElementById('bwm-category').value;
      const author = document.getElementById('bwm-author').value.trim();
      const authorRole = document.getElementById('bwm-role').value.trim();
      const readTime = document.getElementById('bwm-readtime').value.trim() || '4 min read';
      const excerpt = document.getElementById('bwm-excerpt').value.trim();
      const rawContent = document.getElementById('bwm-content').value.trim();
      const rawTags = document.getElementById('bwm-tags').value.trim();

      if (!title) { alert('Please enter a blog title'); return; }
      if (!author) { alert('Please enter the author name'); return; }
      if (!excerpt) { alert('Please enter a short excerpt'); return; }
      if (!rawContent) { alert('Please write the article content'); return; }

      // Map category to CSS class
      let categoryClass = 'cat-academy';
      if (category.includes('Founder')) categoryClass = 'cat-founder';
      else if (category.includes('News')) categoryClass = 'cat-news';
      else if (category.includes('Players')) categoryClass = 'cat-players';
      else if (category.includes('Tactics')) categoryClass = 'cat-tactics';
      else if (category.includes('Parenting')) categoryClass = 'cat-parents';

      // Format paragraphs if plain text
      let formattedHtml = rawContent;
      if (!rawContent.includes('<p>')) {
        formattedHtml = rawContent.split('\n\n')
          .filter(p => p.trim())
          .map(p => `<p>${escapeHtml(p.trim())}</p>`)
          .join('\n');
      }

      const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : ['ChessKidoo', category];

      const newBlog = {
        id: 'blog_' + Date.now(),
        title: title,
        category: category,
        categoryClass: categoryClass,
        readTime: readTime.includes('read') ? readTime : `${readTime} min read`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        author: author,
        authorRole: authorRole || 'Academy Contributor',
        authorAvatar: category.includes('Founder') ? '👑' : (category.includes('Players') ? '⭐' : '✍️'),
        coverIcon: '📝',
        excerpt: excerpt,
        tags: tags,
        content: formattedHtml
      };

      try {
        const custom = JSON.parse(localStorage.getItem('chesskidoo_custom_blogs') || '[]');
        custom.unshift(newBlog);
        localStorage.setItem('chesskidoo_custom_blogs', JSON.stringify(custom));
      } catch (e) {}

      // Reset form
      document.getElementById('bwm-form').reset();
      this.closeWriteModal();
      this.loadArticles();
      this.renderArticles();

      if (window.CK && CK.showToast) {
        CK.showToast('Blog article successfully published!', 'success');
      } else {
        alert('Blog article successfully published!');
      }
    },

    bindEvents() {
      const searchInput = document.getElementById('blog-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.setSearch(e.target.value);
        });
      }
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  CK.blogs = CK_Blogs;

  // Auto-init when blogs page is navigated or DOM loaded
  document.addEventListener('DOMContentLoaded', () => {
    const blogsPage = document.getElementById('blogs-page');
    if (blogsPage) {
      CK.blogs.init();
    }
  });
})();
