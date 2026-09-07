import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace pricing section
old_pricing = r'      <!-- Pricing -->[\s\S]*?<!-- FAQ Section -->'

new_pricing = """      <!-- Pricing -->
      <section id="pricing" class="section-padding">
        <div class="section-head reveal">
          <div class="eyebrow">Transparent Pricing</div>
          <h2>Simple, Affordable Plans</h2>
          <p class="lead">No hidden fees. Every plan includes a free demo class to start.</p>
        </div>
        <div class="pricing-grid">
          <!-- Pawn Plan -->
          <div class="price-card dark-card reveal">
            <div class="price-rank">Starter</div>
            <h3 class="price-title">Pawn Plan</h3>
            <p class="price-desc">Perfect for beginners aged 6–10</p>
            <div class="price-amount">₹999<span>/mo</span></div>
            <ul class="price-features">
              <li><span class="check">✓</span> 8 live sessions/month (1 hr each)</li>
              <li><span class="check">✓</span> Beginner curriculum (Level 1)</li>
              <li><span class="check">✓</span> Parent progress dashboard</li>
              <li><span class="check">✓</span> In-class practice games</li>
              <li><span class="check">✓</span> WhatsApp support</li>
            </ul>
            <button class="btn price-btn" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p class="price-note">First demo class is always free</p>
          </div>
          
          <!-- Bishop Plan -->
          <div class="price-card gold-card reveal">
            <div class="price-rank">Most Popular &middot; Best Value</div>
            <h3 class="price-title">Bishop Plan</h3>
            <p class="price-desc">Ideal for intermediate learners aged 10–14</p>
            <div class="price-amount">₹1,799<span>/mo</span></div>
            <ul class="price-features">
              <li><span class="check">✓</span> 12 live sessions/month (1 hr each)</li>
              <li><span class="check">✓</span> Levels 1 & 2 curriculum access</li>
              <li><span class="check">✓</span> Full parent & student portal</li>
              <li><span class="check">✓</span> Game analysis reports</li>
              <li><span class="check">✓</span> Tournament preparation sessions</li>
              <li><span class="check">✓</span> Priority WhatsApp support</li>
            </ul>
            <button class="btn price-btn gold-btn" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p class="price-note">Save 15% with annual billing</p>
          </div>

          <!-- Queen Plan -->
          <div class="price-card dark-card reveal">
            <div class="price-rank">Elite</div>
            <h3 class="price-title">Queen Plan</h3>
            <p class="price-desc">Tournament-track for serious players aged 14–18</p>
            <div class="price-amount">₹2,999<span>/mo</span></div>
            <ul class="price-features">
              <li><span class="check">✓</span> 16 live sessions/month (1 hr each)</li>
              <li><span class="check">✓</span> All 3 levels + advanced content</li>
              <li><span class="check">✓</span> 1-on-1 coaching sessions</li>
              <li><span class="check">✓</span> FIDE rating preparation</li>
              <li><span class="check">✓</span> Chess psychology sessions</li>
              <li><span class="check">✓</span> Priority tournament entry support</li>
            </ul>
            <button class="btn price-btn" onclick="CK.openDemoModal()">Start Free Demo</button>
            <p class="price-note">First demo class is always free</p>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->"""

content = re.sub(old_pricing, new_pricing, content, flags=re.IGNORECASE)

# Update Contact Us in Footer
# Find the Contact Us block in the footer
old_contact = r'<div>\s*<h5 style="margin-bottom:20px; color:var\(--amber\); font-family:var\(--font-display\);">Contact Us</h5>[\s\S]*?<button class="btn btn-outline btn-sm"[\s\S]*?</button>\s*</div>\s*</div>'

new_contact = """<div>
            <h5 style="margin-bottom:20px; color:var(--amber); font-family:var(--font-display); font-size: 1.2rem;">Contact Us</h5>
            <div class="contact-us-details" style="display:flex; flex-direction:column; gap:16px; opacity:0.8; font-size:1.1rem;">
              <span style="display:flex; align-items:center; gap:10px;"><span style="font-size: 1.2rem;">📞</span> +91 95142 66505</span>
              <span style="display:flex; align-items:center; gap:10px;"><span style="font-size: 1.2rem;">📧</span> chesskidoo@gmail.com</span>
              <button class="btn demo-btn-gray" style="margin-top:15px;" onclick="CK.openDemoModal()">Get Free Demo</button>
            </div>
          </div>
        </div>"""

content = re.sub(old_contact, new_contact, content, flags=re.IGNORECASE)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced index.html")

