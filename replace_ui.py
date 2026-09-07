import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Curriculum -> Classes We Offer
old_curriculum = r'      <!-- Curriculum -->[\s\S]*?<!-- Coaches Section -->'
new_curriculum = """      <!-- Classes We Offer -->
      <section id="curriculum" class="section-padding" style="background:#fdf8f5;">
        <div class="section-head reveal" style="text-align:center;">
          <div class="eyebrow" style="color:#000; letter-spacing:normal; font-family:var(--font-sans); text-transform:none;">Flexible Learning</div>
          <h2 style="font-family:var(--font-display); font-size:3rem; color:#000;">Classes We Offer</h2>
        </div>
        <div class="grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; max-width:900px; margin:0 auto;">
          
          <div class="ck-card reveal" style="text-align:center; padding:40px 20px; border-radius:12px; border:1px solid #e0e0e0; background:#fff;">
            <h4 style="font-family:var(--font-display); font-size:1.4rem; color:#000; margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span style="color:#3498db;">🌐</span> Online Classes
            </h4>
            <p style="color:#444; font-size:0.95rem;">Learn from anywhere in the world.</p>
          </div>

          <div class="ck-card reveal" style="text-align:center; padding:40px 20px; border-radius:12px; border:1px solid #e6dcae; background:#fcf4ca;">
            <h4 style="font-family:var(--font-display); font-size:1.4rem; color:#000; margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span style="color:#e74c3c;">📍</span> Offline Classes
            </h4>
            <p style="color:#444; font-size:0.95rem;">Direct coaching at our physical location.</p>
          </div>

          <div class="ck-card reveal" style="text-align:center; padding:40px 20px; border-radius:12px; border:1px solid #e0e0e0; background:#fff;">
            <h4 style="font-family:var(--font-display); font-size:1.4rem; color:#000; margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span style="color:#8e44ad;">👥</span> 1-to-1 & Group
            </h4>
            <p style="color:#444; font-size:0.95rem;">Personalized attention or competitive group learning.</p>
          </div>

        </div>
      </section>

      <!-- Coaches Section -->"""
html = re.sub(old_curriculum, new_curriculum, html)


# 2. Update Coaches Section
old_coaches = r'      <!-- Coaches Section -->[\s\S]*?<!-- Reviews -->'
new_coaches = """      <!-- Coaches Section -->
      <section id="coaches" class="section-padding" style="background:#fff;">
        <div class="section-head reveal" style="text-align:center; margin-bottom:40px;">
          <h2 style="font-family:var(--font-sans); font-size:2rem; color:#000;">Our Coaches</h2>
        </div>
        <div class="coach-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:15px; max-width:1100px; margin:0 auto; padding:0 20px;">
          
          <div class="ck-card reveal" style="padding:0; overflow:hidden; border:1px solid #e0e0e0; border-radius:5px; background:#fff; text-align:center; position:relative;">
            <span style="position:absolute; top:10px; right:10px; background:#000; color:#fff; font-size:0.7rem; padding:4px 8px; border-radius:15px; font-weight:600;">Advanced</span>
            <img src="https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/ranjith.jpg" alt="Ranjith" style="width:100%; height:250px; object-fit:cover; display:block;">
            <div style="padding:20px 10px;">
              <h5 style="color:#000; font-size:1.1rem; margin:0 0 10px 0;">Ranjith</h5>
              <p style="color:#666; font-size:0.85rem; margin:0;">FIDE-certified coach with 2 years of experience in training young talents.</p>
            </div>
          </div>

          <div class="ck-card reveal" style="padding:0; overflow:hidden; border:1px solid #e0e0e0; border-radius:5px; background:#fff; text-align:center; position:relative;">
            <span style="position:absolute; top:10px; right:10px; background:#000; color:#fff; font-size:0.7rem; padding:4px 8px; border-radius:15px; font-weight:600;">Intermediate</span>
            <img src="https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/vishnu.jpg" alt="Vishnu" style="width:100%; height:250px; object-fit:cover; display:block;">
            <div style="padding:20px 10px;">
              <h5 style="color:#000; font-size:1.1rem; margin:0 0 10px 0;">Vishnu</h5>
              <p style="color:#666; font-size:0.85rem; margin:0;">2 years of experience in Hindustan Incubation Chess Club.</p>
            </div>
          </div>

          <div class="ck-card reveal" style="padding:0; overflow:hidden; border:1px solid #e0e0e0; border-radius:5px; background:#fff; text-align:center; position:relative;">
            <span style="position:absolute; top:10px; right:10px; background:#000; color:#fff; font-size:0.7rem; padding:4px 8px; border-radius:15px; font-weight:600;">Intermediate</span>
            <img src="https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/rohith.jpg" alt="Rohith Selvaraj" style="width:100%; height:250px; object-fit:cover; display:block;">
            <div style="padding:20px 10px;">
              <h5 style="color:#000; font-size:1.1rem; margin:0 0 10px 0;">Rohith Selvaraj</h5>
              <p style="color:#666; font-size:0.85rem; margin:0;">FIDE-certified coach with 2 years of experience.</p>
            </div>
          </div>

          <div class="ck-card reveal" style="padding:0; overflow:hidden; border:1px solid #e0e0e0; border-radius:5px; background:#fff; text-align:center; position:relative;">
            <span style="position:absolute; top:10px; right:10px; background:#000; color:#fff; font-size:0.7rem; padding:4px 8px; border-radius:15px; font-weight:600;">Beginner, Intermediate</span>
            <img src="https://hcjuyqicftkgpiyrkscr.supabase.co/storage/v1/object/public/Images/gyansurya.jpg" alt="Gyansurya" style="width:100%; height:250px; object-fit:cover; display:block;">
            <div style="padding:20px 10px;">
              <h5 style="color:#000; font-size:1.1rem; margin:0 0 10px 0;">Gyansurya</h5>
              <p style="color:#666; font-size:0.85rem; margin:0;">Beginner coach of child specialist. AFM title player</p>
            </div>
          </div>

        </div>
      </section>

      <!-- Certified Excellence Section -->
      <section class="section-padding" style="background:#fdf8f5;">
        <div class="section-head reveal" style="text-align:center;">
          <div class="eyebrow" style="color:#000; letter-spacing:normal; font-family:var(--font-sans); text-transform:none;">Global Standards</div>
          <h2 style="font-family:var(--font-display); font-size:3rem; color:#000;">Certified Excellence</h2>
        </div>
        <div class="grid" style="display:flex; justify-content:center; gap:20px; max-width:900px; margin:0 auto;">
          <div class="ck-card reveal" style="flex:1; text-align:center; padding:40px 20px; border-radius:12px; border:1px solid #e0e0e0; background:#fff;">
            <div style="font-size:2rem; margin-bottom:15px;">♟</div>
            <h5 style="font-size:0.8rem; font-weight:700; text-transform:uppercase; margin-bottom:5px; color:#000;">FIDE Certification</h5>
            <p style="color:#444; font-size:1rem; margin:0;">Global standards in coaching.</p>
          </div>
          <div class="ck-card reveal" style="flex:1; text-align:center; padding:40px 20px; border-radius:12px; border:1px solid #e0e0e0; background:#fff;">
            <div style="font-size:2rem; margin-bottom:15px;">🏅</div>
            <h5 style="font-size:0.8rem; font-weight:700; text-transform:uppercase; margin-bottom:5px; color:#000;">ISO Certification</h5>
            <p style="color:#444; font-size:1rem; margin:0;">Certified quality management.</p>
          </div>
        </div>
      </section>

      <!-- Reviews -->"""
html = re.sub(old_coaches, new_coaches, html)


# 3. Update Pricing
old_pricing = r'      <!-- Pricing -->[\s\S]*?<!-- FAQ Section -->'
new_pricing = """      <!-- Pricing -->
      <section id="pricing" class="section-padding" style="background:#fff;">
        <div class="section-head reveal" style="text-align:center;">
          <h2 style="font-family:var(--font-sans); font-size:2.5rem; color:#000; margin-bottom:10px;">Simple, Affordable Plans</h2>
          <p style="color:#666;">No hidden fees. Every plan includes a free demo class to start.</p>
        </div>
        <div class="pricing-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; max-width:1100px; margin:40px auto 0;">
          
          <!-- Pawn Plan -->
          <div class="ck-card reveal" style="border:1px solid #e0e0e0; border-radius:8px; padding:30px; display:flex; flex-direction:column; text-align:left;">
            <div style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:#888; margin-bottom:5px;">Starter</div>
            <h3 style="font-size:1.8rem; margin:0 0 10px; color:#000;">Pawn Plan</h3>
            <p style="color:#666; font-size:0.9rem; margin-bottom:20px;">Perfect for beginners aged 6–10</p>
            <div style="font-size:2.5rem; font-weight:700; color:#000; margin-bottom:20px;">₹999<span style="font-size:1rem; color:#888;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; color:#333; line-height:1.8; flex-grow:1;">
              <li>✓ 8 live sessions/month (1 hr each)</li>
              <li>✓ Beginner curriculum (Level 1)</li>
              <li>✓ Parent progress dashboard</li>
              <li>✓ In-class practice games</li>
              <li>✓ WhatsApp support</li>
            </ul>
            <button class="ck-btn-outline" style="width:100%; border:1px solid #000; color:#000; border-radius:50px; padding:12px; margin-bottom:10px;" onclick="CK.openDemoModal()">Start Free Demo</button>
            <div style="text-align:center; font-size:0.8rem; color:#888;">First demo class is always free</div>
          </div>
          
          <!-- Bishop Plan -->
          <div class="ck-card reveal" style="border:2px solid #e67e22; border-radius:8px; padding:30px; display:flex; flex-direction:column; text-align:left; position:relative; box-shadow:0 10px 30px rgba(230,126,34,0.15);">
            <div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:#e67e22; color:#fff; font-size:0.75rem; padding:4px 12px; border-radius:20px; font-weight:700; white-space:nowrap;">Most Popular · Best Value</div>
            <h3 style="font-size:1.8rem; margin:10px 0; color:#000;">Bishop Plan</h3>
            <p style="color:#666; font-size:0.9rem; margin-bottom:20px;">Ideal for intermediate learners aged 10–14</p>
            <div style="font-size:2.5rem; font-weight:700; color:#000; margin-bottom:20px;">₹1,799<span style="font-size:1rem; color:#888;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; color:#333; line-height:1.8; flex-grow:1;">
              <li><span style="color:#e67e22;">✓</span> 12 live sessions/month (1 hr each)</li>
              <li><span style="color:#e67e22;">✓</span> Levels 1 & 2 curriculum access</li>
              <li><span style="color:#e67e22;">✓</span> Full parent & student portal</li>
              <li><span style="color:#e67e22;">✓</span> Game analysis reports</li>
              <li><span style="color:#e67e22;">✓</span> Tournament preparation sessions</li>
              <li><span style="color:#e67e22;">✓</span> Priority WhatsApp support</li>
            </ul>
            <button class="ck-btn-primary" style="width:100%; margin-bottom:10px;" onclick="CK.openDemoModal()">Start Free Demo</button>
            <div style="text-align:center; font-size:0.8rem; color:#888;">Save 15% with annual billing</div>
          </div>

          <!-- Queen Plan -->
          <div class="ck-card reveal" style="border:1px solid #e0e0e0; border-radius:8px; padding:30px; display:flex; flex-direction:column; text-align:left;">
            <div style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:#888; margin-bottom:5px;">Elite</div>
            <h3 style="font-size:1.8rem; margin:0 0 10px; color:#000;">Queen Plan</h3>
            <p style="color:#666; font-size:0.9rem; margin-bottom:20px;">Tournament-track for serious players aged 14–18</p>
            <div style="font-size:2.5rem; font-weight:700; color:#000; margin-bottom:20px;">₹2,999<span style="font-size:1rem; color:#888;">/mo</span></div>
            <ul style="list-style:none; padding:0; margin:0 0 30px; font-size:0.95rem; color:#333; line-height:1.8; flex-grow:1;">
              <li>✓ 16 live sessions/month (1 hr each)</li>
              <li>✓ All 3 levels + advanced content</li>
              <li>✓ 1-on-1 coaching sessions</li>
              <li>✓ FIDE rating preparation</li>
              <li>✓ Chess psychology sessions</li>
              <li>✓ Priority tournament entry support</li>
            </ul>
            <button class="ck-btn-outline" style="width:100%; border:1px solid #000; color:#000; border-radius:50px; padding:12px; margin-bottom:10px;" onclick="CK.openDemoModal()">Start Free Demo</button>
            <div style="text-align:center; font-size:0.8rem; color:#888;">First demo class is always free</div>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->"""
html = re.sub(old_pricing, new_pricing, html)


# 4. Update CTA and Footer
old_footer = r'      <!-- Call to Action -->[\s\S]*?</body>'
new_footer = """      <!-- Call to Action -->
      <section class="section-padding" style="background:#1a1917; color:#fff; text-align:center;">
        <h2 style="font-family:var(--font-display); font-size:4rem; margin-bottom:20px; color:#fff;">Start Your Child's Journey Today</h2>
        <p style="font-size:1.2rem; color:#ccc; margin-bottom:40px;">Join India's first data-driven chess tracking system.</p>
        <div style="display:flex; justify-content:center; gap:20px;">
          <button class="ck-btn-primary" onclick="CK.openDemoModal()">Book Free Demo Class</button>
          <a href="https://wa.me/919514266505" target="_blank" class="ck-btn-outline" style="text-decoration:none;">Chat on WhatsApp</a>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer style="background:#110a04; color:#fff; padding:60px 0 20px;">
      <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:40px; margin-bottom:40px;">
        
        <div style="max-width:300px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
            <div style="background:#e67e22; border-radius:8px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">♔</div>
            <span style="font-family:var(--font-display); font-size:1.5rem; font-weight:700;">ChessKidoo</span>
          </div>
          <p style="color:#aaa; font-size:1.1rem; line-height:1.6;">India's #1 FIDE-certified chess academy for students aged 6–18. Building champions with data.</p>
        </div>

        <div>
          <h5 style="font-family:var(--font-display); font-size:1rem; margin-bottom:20px; text-transform:uppercase; letter-spacing:1px;">Explore</h5>
          <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:15px;">
            <li><a href="#" style="color:#aaa; text-decoration:none;">Home</a></li>
            <li><a href="#curriculum" style="color:#aaa; text-decoration:none;">About</a></li>
            <li><a href="#curriculum" style="color:#aaa; text-decoration:none;">Curriculum</a></li>
            <li><a href="#coaches" style="color:#aaa; text-decoration:none;">Coaches</a></li>
          </ul>
        </div>

        <div>
          <h5 style="font-family:var(--font-display); font-size:1rem; margin-bottom:20px; text-transform:uppercase; letter-spacing:1px;">Support</h5>
          <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:15px;">
            <li><a href="mailto:chesskidoo37@gmail.com" style="color:#aaa; text-decoration:none;">Email Us</a></li>
            <li><a href="https://wa.me/919514266505" target="_blank" style="color:#aaa; text-decoration:none;">WhatsApp</a></li>
          </ul>
        </div>

        <div>
          <h5 style="font-family:var(--font-display); font-size:1rem; margin-bottom:20px; text-transform:uppercase; letter-spacing:1px;">Contact</h5>
          <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:15px;">
            <li style="color:#aaa;">📧 Chesskidoo37@gmail.com</li>
            <li style="color:#aaa;">📍 India</li>
          </ul>
        </div>

      </div>
      <div class="container" style="border-top:1px solid rgba(255,255,255,0.1); padding-top:20px; display:flex; justify-content:space-between; color:#777; font-size:0.9rem;">
        <div>© 2026 ChessKidoo, Inc. All Rights Reserved.</div>
        <div>Made with ♟ in India</div>
      </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/db.js"></script>
    <script src="assets/js/main.js"></script>
    <script src="assets/js/admin.js"></script>
    <script src="assets/js/coach.js"></script>
    <script src="assets/js/student.js"></script>
  </body>"""
html = re.sub(old_footer, new_footer, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

