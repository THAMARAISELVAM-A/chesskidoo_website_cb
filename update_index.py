import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the start and end of the landing page
start_marker = r'<!-- ======================== LANDING PAGE ======================== -->'
end_marker = r'<!-- Dashboards -->'
login_marker = r'<div id="login-page" class="page">'

# We'll construct the entire landing page and footer
new_landing_page = """<!-- ======================== LANDING PAGE ======================== -->
    <div id="landing-page" class="page active">
      <!-- Hero Section -->
      <section class="hero" id="home">
        <div class="hero-bg"></div>
        <div class="hero-pattern"></div>
        <div class="hero-content-wrap">
          <div class="hero-grid">
            <div class="hero-content">
              <div class="hero-badge"><span>🇮🇳</span> India's #1 Chess Academy for Kids</div>
              <h1 class="hero-title">Where Young Minds<br><span class="line-accent">Master the Board</span></h1>
              <p class="hero-sub">Manage your chess students, track progress, and level up your coaching experience with FIDE-certified experts.</p>
              <div class="hero-btns">
                <button class="btn btn-primary" onclick="CK.openDemoModal()">📅 Book Free Demo</button>
                <a href="https://wa.me/919514266505" target="_blank" class="btn btn-ghost">💬 WhatsApp Us</a>
              </div>
              <div class="hero-stats">
                <div><div class="hero-stat-num">500+</div><div class="hero-stat-label">Active Students</div></div>
                <div><div class="hero-stat-num">7</div><div class="hero-stat-label">FIDE Coaches</div></div>
                <div><div class="hero-stat-num">12+</div><div class="hero-stat-label">Championships</div></div>
                <div><div class="hero-stat-num">4.9★</div><div class="hero-stat-label">Parent Rating</div></div>
              </div>
            </div>
            <div class="hero-visual">
              <div class="hero-board reveal">
                <div class="hero-board-wrap">
                  <div id="main-chessboard" class="chessboard-container"></div>
                </div>
                <div class="board-shadow"></div>
              </div>
              <div class="floating-badge">🏆 FIDE Certified</div>
              <div class="floating-badge">📈 Live Progress Tracking</div>
              <div class="floating-badge" style="top: 80%; left: -20px; right: auto;">🎓 7 Expert Coaches</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust Bar -->
      <div class="trust-bar">
        <div class="trust-inner">
          <div class="trust-item">♟ FIDE Certified Academy</div><div class="trust-divider"></div>
          <div class="trust-item">🏅 ISO 9001:2015</div><div class="trust-divider"></div>
          <div class="trust-item">👨‍🎓 500+ Active Students</div><div class="trust-divider"></div>
          <div class="trust-item">⭐ 4.9/5 Parent Rating</div><div class="trust-divider"></div>
          <div class="trust-item">🇮🇳 AICF Affiliate</div><div class="trust-divider"></div>
          <div class="trust-item">🏆 12+ Championships Won</div><div class="trust-divider"></div>
          <div class="trust-item">🎯 India's #1 Chess Tracking System</div>
        </div>
      </div>

      <!-- Features -->
      <section id="features" class="section-padding">
        <div class="section-head reveal">
          <div class="eyebrow">Why ChessKidoo?</div>
          <h2>Everything Your Child Needs to Excel</h2>
          <p class="lead">One-stop solution for kids learning chess - tracking, coaching, tournaments and more.</p>
        </div>
        <div class="feat-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">📊</div><h3>Smart Student Tracking</h3>
            <p>Manage profiles, game history, and ratings for every student in one clean dashboard.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">📈</div><h3>Progress Analytics</h3>
            <p>Visual insights into each student's performance trends and learning velocity over time.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">🏆</div><h3>Tournament Ready</h3>
            <p>Manage tournaments, match pairings, and leaderboards with professional efficiency.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">🌍</div><h3>Internationally Certified Coaches</h3>
            <p>Learn from professionals trained under FIDE's rigorous global standards.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">⭐</div><h3>FIDE-Rated Experts (ELO 1600+)</h3>
            <p>Coaches with real competitive success and proven tournament experience.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">🧩</div><h3>India's 1st Tracking System</h3>
            <p>Monthly reports, rating growth and skill-analytics for every child.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">📚</div><h3>Complete Training Program</h3>
            <p>Openings, middlegame tactics, endgames, strategy and mental prep - all on one platform.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">🗣️</div><h3>Personalized Feedback</h3>
            <p>Every game is reviewed and discussed with the coach for continuous improvement.</p>
          </div>
          <div class="feat-card reveal">
            <div class="feat-icon-wrap">🇮🇳</div><h3>Bilingual Support</h3>
            <p>Clear communication for students and parents in English & Tamil.</p>
          </div>
        </div>
      </section>

      <!-- Curriculum -->
      <section id="levels" class="section-padding" style="background: var(--bg-dark); color: white;">
        <div class="section-head reveal">
          <div class="eyebrow" style="color: var(--amber-light)">Student Levels</div>
          <h2 style="color: white;">Three Levels – One Journey</h2>
          <p class="lead" style="color: rgba(255,255,255,0.7);">Progress from total beginner to tournament-ready competitor.</p>
        </div>
        <div class="level-grid">
          <div class="level-card reveal">
            <div class="level-rank">Beginner</div>
            <span class="level-piece">♟</span>
            <h3>Beginner Level</h3>
            <p>Ideal for students new to chess. Focuses on basic moves, opening principles, and board control fundamentals.</p>
            <ul style="text-align: left; opacity: 0.8; font-size: 0.9rem; margin: 20px 0; padding-left: 20px;">
              <li>Piece movements & rules</li>
              <li>Basic tactics & checkmates</li>
              <li>Simple endgame principles</li>
              <li>Board awareness training</li>
            </ul>
            <div style="margin-top:auto; font-weight:700; color:var(--amber);">Start Here →</div>
          </div>
          <div class="level-card featured reveal">
            <div class="level-rank">Most Popular</div>
            <span class="level-piece">♗</span>
            <h3>Intermediate Level</h3>
            <p>Designed for players with a solid foundation. Develops tactical awareness, middle-game strategy, and endgame mastery.</p>
            <ul style="text-align: left; opacity: 0.8; font-size: 0.9rem; margin: 20px 0; padding-left: 20px;">
              <li>Advanced combinations</li>
              <li>Opening repertoire building</li>
              <li>Middlegame strategy</li>
              <li>Endgame technique drills</li>
            </ul>
            <div style="margin-top:auto; font-weight:700; color:var(--amber);">Level Up →</div>
          </div>
          <div class="level-card reveal">
            <div class="level-rank">Elite</div>
            <span class="level-piece">♛</span>
            <h3>Advanced Level</h3>
            <p>For competitive players targeting tournaments. Deep analysis, advanced openings, and psychological gameplay mastery.</p>
            <ul style="text-align: left; opacity: 0.8; font-size: 0.9rem; margin: 20px 0; padding-left: 20px;">
              <li>Opening theory mastery</li>
              <li>Endgame precision</li>
              <li>Chess psychology training</li>
              <li>FIDE rating preparation</li>
            </ul>
            <div style="margin-top:auto; font-weight:700; color:var(--amber);">Go Elite →</div>
          </div>
        </div>
      </section>

      <!-- Coaches Section -->
      <section id="coaches" class="section-padding">
        <div class="section-head reveal">
          <div class="eyebrow">Our Expert Faculty</div>
          <h2>Meet the Minds Behind the Moves</h2>
          <p class="lead">7 FIDE-certified coaches with international ratings and state-championship experience.</p>
        </div>
        <div class="coach-grid">
          <div class="coach-card reveal">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/ranjith.jpg');">
              <div class="coach-rating-badge">FIDE 2200+</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Advanced</div>
              <h5 class="coach-name">♔ Ranjith</h5>
              <p class="coach-bio">FIDE-certified coach with 2 years training young talents to achieve international ratings.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.1s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/vishnu.jpg');">
              <div class="coach-rating-badge">Senior Coach</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Intermediate</div>
              <h5 class="coach-name">♕ Vishnu</h5>
              <p class="coach-bio">2 years at Hindustan Incubation Chess Club, specialising in middlegame strategy.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.2s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/rohith.jpg');">
              <div class="coach-rating-badge">Tactics Expert</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Intermediate</div>
              <h5 class="coach-name">♖ Rohith Selvaraj</h5>
              <p class="coach-bio">FIDE-certified specialist in tactical patterns and competitive preparation.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.3s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/gyansurya.jpg');">
              <div class="coach-rating-badge">AFM Titled</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Beginner & Intermediate</div>
              <h5 class="coach-name">♗ Gyansurya</h5>
              <p class="coach-bio">Child specialist and AFM title holder - making chess approachable for younger students.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.4s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/saran.jpg');">
              <div class="coach-rating-badge">Youth Expert</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Beginner & Intermediate</div>
              <h5 class="coach-name">♘ Saran</h5>
              <p class="coach-bio">Dedicated beginner specialist with a talent for keeping young students engaged and motivated.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.5s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/yogesh.jpg');">
              <div class="coach-rating-badge">Head Coach</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Intermediate</div>
              <h5 class="coach-name">♙ Yogesh</h5>
              <p class="coach-bio">Anna University South Zone representative and Sri Eshwar College of Engineering player.</p>
            </div>
          </div>
          <div class="coach-card reveal" style="transition-delay:0.6s;">
            <div class="coach-img-wrap" style="background-image: url('https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/haris.jpg'); background-size:cover; background-position:center top;">
              <div class="coach-rating-badge">Psychologist</div>
            </div>
            <div class="coach-info">
              <div class="coach-role">Beginner</div>
              <h5 class="coach-name">♚ Haris</h5>
              <p class="coach-bio">Chess psychology specialist - building mental strength and resilience alongside chess skills.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Parent Reviews Section -->
      <section id="reviews" class="section-padding" style="background: var(--cream-dark);">
        <div class="section-head reveal">
          <div class="eyebrow">Parent Reviews</div>
          <h2>Real Stories, Real Results</h2>
          <p class="lead">From families across India who chose ChessKidoo for their children.</p>
        </div>
        <div class="feat-grid">
          <div class="feat-card reveal" style="background:#fff; text-align:left;">
            <div style="color:var(--amber); font-size:1.2rem; margin-bottom:10px;">★★★★★</div>
            <p style="font-style:italic; opacity:0.8; margin-bottom:20px;">"Chess-Kidoo is not just about chess moves. My daughter has improved her concentration, discipline, and problem-solving skills tremendously."</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="logo-icon" style="width:40px; height:40px; font-size:18px;">R</div>
              <div>
                <h5 style="margin:0;">Parent of U-15 Riyas</h5>
                <span style="font-size:0.75rem; color:#166534; font-weight:700;">✓ Verified Enrolment</span>
              </div>
            </div>
          </div>
          <div class="feat-card reveal" style="background:#fff; text-align:left; transition-delay:0.1s;">
            <div style="color:var(--amber); font-size:1.2rem; margin-bottom:10px;">★★★★★</div>
            <p style="font-style:italic; opacity:0.8; margin-bottom:20px;">"My son's confidence has grown tremendously after joining Chess-Kidoo. The coaches are patient, motivating and focus on both fundamentals and strategy."</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="logo-icon" style="width:40px; height:40px; font-size:18px;">A</div>
              <div>
                <h5 style="margin:0;">Parent of U-15 Adhavan</h5>
                <span style="font-size:0.75rem; color:#166534; font-weight:700;">✓ Verified Enrolment</span>
              </div>
            </div>
          </div>
          <div class="feat-card reveal" style="background:#fff; text-align:left; transition-delay:0.2s;">
            <div style="color:var(--amber); font-size:1.2rem; margin-bottom:10px;">★★★★★</div>
            <p style="font-style:italic; opacity:0.8; margin-bottom:20px;">"The structured curriculum and regular feedback sessions really impressed us. Chess-Kidoo helped our child develop logical thinking and patience."</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="logo-icon" style="width:40px; height:40px; font-size:18px;">S</div>
              <div>
                <h5 style="margin:0;">Parent of U-12 Saran</h5>
                <span style="font-size:0.75rem; color:#166534; font-weight:700;">✓ Verified Enrolment</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="section-padding">
        <div class="section-head reveal">
          <div class="eyebrow">Transparent Pricing</div>
          <h2>Simple, Affordable Plans</h2>
          <p class="lead">No hidden fees. Every plan includes a free demo class to start.</p>
        </div>
        <div class="level-grid">
          <div class="level-card reveal" style="text-align:left; padding:40px;">
            <div class="level-rank">Starter</div>
            <h3 style="font-size:1.8rem; margin:10px 0;">Pawn Plan</h3>
            <p style="opacity:0.7;">Perfect for beginners aged 6–10</p>
            <div style="font-size:2.5rem; font-family:var(--font-display); font-weight:900; margin:20px 0; color:var(--ink);">₹999<span style="font-size:1rem; opacity:0.5; font-family:var(--font-sans); font-weight:500;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; line-height:2;">
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> 8 live sessions/month (1 hr each)</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Beginner curriculum (Level 1)</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Parent progress dashboard</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> In-class practice games</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> WhatsApp support</li>
            </ul>
            <button class="btn btn-outline" style="width:100%; border-color:var(--ink); color:var(--ink);" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p style="text-align:center; font-size:0.75rem; opacity:0.5; margin-top:10px;">First demo class is always free</p>
          </div>
          
          <div class="level-card featured reveal" style="text-align:left; padding:40px;">
            <div class="level-rank">Most Popular &middot; Best Value</div>
            <h3 style="font-size:1.8rem; margin:10px 0; color:var(--amber);">Bishop Plan</h3>
            <p style="opacity:0.8;">Ideal for intermediate learners aged 10–14</p>
            <div style="font-size:2.5rem; font-family:var(--font-display); font-weight:900; margin:20px 0; color:var(--ink);">₹1,799<span style="font-size:1rem; opacity:0.5; font-family:var(--font-sans); font-weight:500;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; line-height:2;">
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> 12 live sessions/month (1 hr each)</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Levels 1 & 2 curriculum access</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Full parent & student portal</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Game analysis reports</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Tournament preparation sessions</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Priority WhatsApp support</li>
            </ul>
            <button class="btn btn-primary" style="width:100%;" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p style="text-align:center; font-size:0.75rem; opacity:0.7; margin-top:10px;">Save 15% with annual billing</p>
          </div>

          <div class="level-card reveal" style="text-align:left; padding:40px;">
            <div class="level-rank">Elite</div>
            <h3 style="font-size:1.8rem; margin:10px 0;">Queen Plan</h3>
            <p style="opacity:0.7;">Tournament-track for serious players aged 14–18</p>
            <div style="font-size:2.5rem; font-family:var(--font-display); font-weight:900; margin:20px 0; color:var(--ink);">₹2,999<span style="font-size:1rem; opacity:0.5; font-family:var(--font-sans); font-weight:500;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; line-height:2;">
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> 16 live sessions/month (1 hr each)</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> All 3 levels + advanced content</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> 1-on-1 coaching sessions</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> FIDE rating preparation</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Chess psychology sessions</li>
              <li><span style="color:var(--amber); font-weight:bold;">✓</span> Priority tournament entry support</li>
            </ul>
            <button class="btn btn-outline" style="width:100%; border-color:var(--ink); color:var(--ink);" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p style="text-align:center; font-size:0.75rem; opacity:0.5; margin-top:10px;">First demo class is always free</p>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section id="faq" class="section-padding" style="background: var(--cream-dark); max-width:800px; margin:0 auto; width:100%; border-radius:24px;">
        <div class="section-head reveal">
          <div class="eyebrow">FAQ</div>
          <h2>Frequently Asked Questions</h2>
          <p class="lead">Everything parents want to know before booking a demo class.</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('We welcome kids from age 5 and up.','info')">What is the minimum age to join ChessKidoo? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('We provide highly interactive online classes via Google Meet.','info')">Are the classes online or offline? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('No! Our Beginner level starts from absolute scratch.','info')">Does my child need prior chess knowledge? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('It is a 45-min live session with a coach to assess your child\'s level.','info')">How does the free demo class work? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('Yes! Our Elite Queen plan focuses specifically on tournament preparation.','info')">Will my child be prepared for FIDE-rated tournaments? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('Absolutely. Our Student Portal provides live analytics and attendance.','info')">Can I track my child's progress? <span>+</span></div>
          <div style="background:#fff; padding:20px 24px; border-radius:12px; font-weight:600; display:flex; justify-content:space-between; cursor:pointer;" onclick="CK.showToast('Yes, our plans are flexible. You can change anytime.','info')">Can I change or cancel my plan? <span>+</span></div>
        </div>
      </section>

      <!-- CTA -->
      <section id="cta" class="section-padding" style="background: var(--ink); color: white; text-align: center; margin-top:80px;">
        <div class="container reveal">
          <div style="font-size:3rem; margin-bottom:16px; color:var(--amber);">♛</div>
          <h2>Your child's first move<br>starts with a free class.</h2>
          <p style="opacity: 0.7; margin: 20px auto 40px; max-width:600px; font-size:1.1rem; line-height:1.6;">Join 500+ students and families who chose ChessKidoo. No experience needed – just curiosity.</p>
          <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="CK.openDemoModal()">📅 Book Free Demo</button>
            <a href="https://wa.me/919514266505" target="_blank" class="btn btn-ghost" style="color:#fff; border-color:rgba(255,255,255,0.3);">💬 Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer style="background: #0F0A06; color: white; padding: 80px 0 30px;">
        <div class="container footer-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
          <div style="grid-column: span 2;">
            <div class="logo" style="margin-bottom:20px;">
              <div class="logo-icon" style="color:var(--amber);">♛</div>
              <span class="logo-text" style="color: white;">Chess<span>Kidoo</span></span>
            </div>
            <p style="opacity: 0.6; line-height:1.6; max-width:300px;">India's #1 FIDE-certified chess academy for students aged 6–18. Building champions, one move at a time.</p>
          </div>
          <div>
            <h5 style="margin-bottom:20px; color:var(--amber); font-family:var(--font-display);">Learn</h5>
            <div style="display:flex; flex-direction:column; gap:12px; opacity:0.7;">
              <a href="#features" style="color:#fff; text-decoration:none;">Features</a>
              <a href="#coaches" style="color:#fff; text-decoration:none;">Our Coaches</a>
              <a href="#levels" style="color:#fff; text-decoration:none;">Curriculum</a>
              <a href="#pricing" style="color:#fff; text-decoration:none;">Pricing</a>
            </div>
          </div>
          <div>
            <h5 style="margin-bottom:20px; color:var(--amber); font-family:var(--font-display);">Company</h5>
            <div style="display:flex; flex-direction:column; gap:12px; opacity:0.7;">
              <a href="#reviews" style="color:#fff; text-decoration:none;">Reviews</a>
              <a href="#faq" style="color:#fff; text-decoration:none;">FAQ</a>
              <a href="#" style="color:#fff; text-decoration:none;">Instagram</a>
              <a href="#" style="color:#fff; text-decoration:none;">YouTube</a>
            </div>
          </div>
          <div>
            <h5 style="margin-bottom:20px; color:var(--amber); font-family:var(--font-display);">Contact Us</h5>
            <div style="display:flex; flex-direction:column; gap:12px; opacity:0.7;">
              <span>📞 +91 95142 66505</span>
              <span>📧 chesskidoo@gmail.com</span>
              <button class="btn btn-outline btn-sm" style="color:#fff; border-color:#fff; width:fit-content; margin-top:10px;" onclick="CK.openDemoModal()">Get Free Demo</button>
            </div>
          </div>
        </div>
        <div class="container" style="margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; font-size: 0.85rem; opacity: 0.4; text-align: center; display:flex; justify-content:space-between; flex-wrap:wrap; gap:20px;">
          <div>© 2026 ChessKidoo, Inc. All rights reserved</div>
          <div>FIDE Certified · ISO 9001:2015 · AICF Affiliate</div>
          <div>Made with ♟ in India</div>
        </div>
      </footer>
    </div>"""

# Ensure we found the markers
if start_marker in content and login_marker in content:
    pre = content.split(start_marker)[0]
    post = login_marker + content.split(login_marker)[1]
    final_content = pre + new_landing_page + "\n\n    " + post
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("Replaced content successfully.")
else:
    print("Markers not found.")

