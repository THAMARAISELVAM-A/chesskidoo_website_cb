import re
with open('assets/js/student.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Completely upgrade the student dashboard HTML generation
new_student_html = """
    const fullName = user.full_name || 'Chess Student';
    const level = user.level || 'Beginner';
    const isBeginner = level === 'Beginner';
    const isIntermediate = level === 'Intermediate';
    const isAdvanced = level === 'Advanced';

    container.innerHTML = `
      <div class="portal-welcome-banner">
        <div class="portal-welcome-text">
          <h1>Welcome Back, ${fullName}!</h1>
          <p>You're on the path to becoming a Chess Grandmaster.</p>
        </div>
        <div style="background:rgba(255,255,255,0.1); padding:15px 25px; border-radius:15px; text-align:center; backdrop-filter:blur(5px);">
          <div style="font-size:0.8rem; text-transform:uppercase; opacity:0.7; letter-spacing:1px;">Current Rating</div>
          <div style="font-size:2rem; font-weight:800; color:var(--amber);">${user.online || 400}</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Learning Journey Card -->
        <div class="dash-card">
          <div class="dash-card-title">♟ Learning Roadmap</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div style="text-align:center; opacity:${isBeginner?1:0.4}">
              <div style="font-size:1.5rem;">♙</div><div style="font-size:0.7rem; font-weight:800;">BEGINNER</div>
            </div>
            <div style="flex:1; height:2px; background:#e2e8f0; margin:0 10px; position:relative;">
              <div style="position:absolute; left:0; top:0; height:100%; width:${isIntermediate||isAdvanced?'100%':'0%'}; background:var(--amber);"></div>
            </div>
            <div style="text-align:center; opacity:${isIntermediate?1:0.4}">
              <div style="font-size:1.5rem;">♗</div><div style="font-size:0.7rem; font-weight:800;">INTERMEDIATE</div>
            </div>
            <div style="flex:1; height:2px; background:#e2e8f0; margin:0 10px; position:relative;">
              <div style="position:absolute; left:0; top:0; height:100%; width:${isAdvanced?'100%':'0%'}; background:var(--amber);"></div>
            </div>
            <div style="text-align:center; opacity:${isAdvanced?1:0.4}">
              <div style="font-size:1.5rem;">♛</div><div style="font-size:0.7rem; font-weight:800;">ADVANCED</div>
            </div>
          </div>
          <p style="font-size:0.85rem; color:#64748b; line-height:1.5;">Master the fundamentals to unlock Intermediate techniques.</p>
          <button class="dash-btn dash-btn-primary" style="width:100%; margin-top:10px;">View Curriculum</button>
        </div>

        <!-- Progress Stats Card -->
        <div class="dash-card">
          <div class="dash-card-title">📊 Performance Tracking</div>
          <div style="height:150px;"><canvas id="studentRatingChart"></canvas></div>
          <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div style="background:#f8fafc; padding:12px; border-radius:12px; text-align:center;">
              <div style="font-size:0.7rem; opacity:0.6;">ATTENDANCE</div>
              <div style="font-size:1.2rem; font-weight:800;">${presentCount}</div>
            </div>
            <div style="background:#fff7ed; padding:12px; border-radius:12px; text-align:center;">
              <div style="font-size:0.7rem; color:#9a3412; opacity:0.6;">STARS</div>
              <div style="font-size:1.2rem; font-weight:800; color:#c2410c;">${user.star || 0} ★</div>
            </div>
          </div>
        </div>

        <!-- Coach Support Card -->
        <div class="dash-card">
          <div class="dash-card-title">👨‍🏫 Your Coach</div>
          <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
            <div style="width:50px; height:50px; border-radius:50%; background:var(--amber-pale); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👤</div>
            <div>
              <div style="font-weight:700;">${user.coach || 'Assigning...'}</div>
              <div style="font-size:0.75rem; opacity:0.6;">Professional FIDE Coach</div>
            </div>
          </div>
          <button class="dash-btn" style="width:100%;" onclick="window.open('https://wa.me/919514266505')">💬 Chat with Support</button>
        </div>
      </div>

      <div style="margin-top:40px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-family:var(--font-display); margin:0;">Study Materials</h2>
          <span style="font-size:0.85rem; color:#64748b;">Showing materials for <strong>${level}</strong> level</span>
        </div>
        <div class="portal-table-wrap">
          <table class="portal-table">
            <thead>
              <tr><th>Date</th><th>Material Name</th><th>Category</th><th>Download</th></tr>
            </thead>
            <tbody>
              ${files.length ? files.map(f => `
                <tr>
                  <td>${new Date(f.created_at).toLocaleDateString()}</td>
                  <td style="font-weight:700;">${f.name || 'Resource'}</td>
                  <td><span class="status-pill status-paid" style="background:#e0f2fe; color:#0369a1;">Learning Asset</span></td>
                  <td><button class="dash-btn" onclick="CK.downloadFile('${f.file_name}')">📥 Download</button></td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="text-align:center; padding:60px; opacity:0.4;">No materials assigned to your level yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
"""

# Replace the innerHTML block in student.js
js = re.sub(r'const fullName = user\.full_name \|\| [\s\S]*?container\.innerHTML = `[\s\S]*?`;', new_student_html, js)

with open('assets/js/student.js', 'w', encoding='utf-8') as f:
    f.write(js)

