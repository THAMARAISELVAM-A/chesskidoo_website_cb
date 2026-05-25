/* assets/js/certs.js
   ChessKidoo — Certificate Generator
   Uses jsPDF (loaded from CDN) to create downloadable PDF certificates
   for each level completed. Works fully client-side, no server needed. */

window.CK = window.CK || {};

CK.certs = (() => {
  const CERTS_KEY = 'ck_earned_certs';
  const get  = () => JSON.parse(localStorage.getItem(CERTS_KEY) || '[]');
  const save = d  => localStorage.setItem(CERTS_KEY, JSON.stringify(d));
  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  const LEVELS = {
    Beginner:     { color: '#22c55e', badge: '🥉', desc: 'Foundation of Chess Excellence',     requirements: 'Completed 10 puzzles, attended 10 classes, and passed the beginner assessment.' },
    Intermediate: { color: '#3b82f6', badge: '🥈', desc: 'Tactical Mastery Achievement',      requirements: 'Solved 30 puzzles, maintained 80% attendance, and demonstrated tactical proficiency.' },
    Advanced:     { color: '#e8b84b', badge: '🥇', desc: 'Strategic Grandmaster Certificate', requirements: 'Completed the advanced curriculum, won a rated tournament game, and scored 40+ rating points.' }
  };

  /* ─── Check if student has earned a certificate ─── */
  function checkEligibility(profile, attendancePct, puzzlesSolved) {
    const level = profile.level || 'Beginner';
    const earned = get();
    if (earned.find(c => c.studentId === profile.id && c.level === level)) {
      return { eligible: true, alreadyEarned: true };
    }
    const thresholds = { Beginner: { att: 60, puzzles: 5 }, Intermediate: { att: 70, puzzles: 20 }, Advanced: { att: 80, puzzles: 40 } };
    const t = thresholds[level] || thresholds.Beginner;
    return {
      eligible: attendancePct >= t.att && puzzlesSolved >= t.puzzles,
      alreadyEarned: false,
      attendancePct, puzzlesSolved, required: t
    };
  }

  /* ─── Award a certificate ─── */
  function awardCertificate(studentProfile, coachName) {
    const level = studentProfile.level || 'Beginner';
    const existing = get().find(c => c.studentId === studentProfile.id && c.level === level);
    if (existing) return existing;
    const cert = {
      id: uid(),
      studentId: studentProfile.id,
      studentName: studentProfile.full_name || 'Student',
      level,
      coachName: coachName || studentProfile.coach || 'ChessKidoo Academy',
      issuedAt: new Date().toISOString(),
      certNumber: 'CK-' + Date.now().toString(36).toUpperCase()
    };
    const all = get();
    all.push(cert);
    save(all);
    return cert;
  }

  /* ─── Generate PDF certificate using jsPDF ─── */
  function generatePDF(cert) {
    if (!window.jspdf && !window.jsPDF) {
      CK.showToast('Certificate generator loading… please try again in a moment.', 'info');
      _loadJsPDF(() => generatePDF(cert));
      return;
    }
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210;
    const lvl = LEVELS[cert.level] || LEVELS.Beginner;

    // Background - Dark Navy
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, H, 'F');

    // Rich Gold Color
    const GOLD = [212, 175, 55];
    const GOLD_RGB = '212, 175, 55';

    // ─── Intricate Borders ───
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(2);
    doc.rect(10, 10, W - 20, H - 20); // Outer heavy frame
    
    doc.setLineWidth(0.5);
    doc.rect(13, 13, W - 26, H - 26); // Inner frame 1
    doc.rect(15, 15, W - 30, H - 30); // Inner frame 2

    // ─── Ornamental Corner Blocks ───
    const cornerSize = 24;
    const corners = [
      [15, 15], [W - 15 - cornerSize, 15], 
      [15, H - 15 - cornerSize], [W - 15 - cornerSize, H - 15 - cornerSize]
    ];
    corners.forEach(([x, y]) => {
      // Solid gold block
      doc.setFillColor(...GOLD);
      doc.rect(x, y, cornerSize, cornerSize, 'F');
      // Inner cut-out circle
      doc.setFillColor(15, 23, 42);
      doc.circle(x + cornerSize/2, y + cornerSize/2, 10, 'F');
      // Inner thin gold ring
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      doc.circle(x + cornerSize/2, y + cornerSize/2, 8, 'S');
      // Center icon
      doc.setFont('times', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(...GOLD);
      doc.text('♛', x + cornerSize/2, y + cornerSize/2 + 4, { align: 'center' });
    });

    // ─── Typography & Content ───
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...GOLD);
    // JS PDF charSpace workaround using spacing in string
    doc.text('C H E S S K I D O O   A C A D E M Y', W/2, 45, { align: 'center' });
    
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text('India\'s Premier Chess Education Platform', W/2, 53, { align: 'center' });

    // Certificate Ribbon/Title
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(W/2 - 40, 68, W/2 + 40, 68);
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    doc.text('CERTIFICATE OF MASTERY', W/2, 65, { align: 'center' });
    
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(180, 190, 210);
    doc.text('This is to proudly certify that', W/2, 82, { align: 'center' });

    // Student Name (Elegant Serif)
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(42);
    doc.setTextColor(255, 255, 255);
    doc.text(cert.studentName, W/2, 105, { align: 'center' });

    // Elegant underline
    const nameWidth = doc.getTextWidth(cert.studentName);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(W/2 - nameWidth/2 - 10, 110, W/2 + nameWidth/2 + 10, 110);

    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(180, 190, 210);
    doc.text('has successfully completed the rigorous requirements of the', W/2, 122, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...GOLD);
    doc.text(`${cert.level.toUpperCase()} LEVEL PROGRAM`, W/2, 136, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(160, 170, 190);
    doc.text(lvl.desc, W/2, 145, { align: 'center' });
    doc.text(lvl.requirements, W/2, 151, { align: 'center', maxWidth: 200 });

    // ─── Signatures & Seal ───
    const sigY = 175;
    
    // Left Signature
    doc.setDrawColor(120, 130, 150);
    doc.setLineWidth(0.5);
    doc.line(40, sigY, 100, sigY);
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    // Pseudo-script signature
    doc.text(cert.coachName, 70, sigY - 5, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Official Chess Coach', 70, sigY + 6, { align: 'center' });

    // Center Gold Seal
    const sealX = W/2, sealY = sigY - 5;
    // Outer badge ripples (approximate with a thick dashed circle)
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(3);
    doc.setLineDashPattern([2, 2], 0);
    doc.circle(sealX, sealY, 15, 'S');
    doc.setLineDashPattern([], 0); // reset
    // Solid seal body
    doc.setFillColor(212, 175, 55);
    doc.circle(sealX, sealY, 13, 'F');
    doc.setFillColor(15, 23, 42);
    doc.circle(sealX, sealY, 11, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...GOLD);
    doc.text('♚', sealX, sealY + 8, { align: 'center' });

    // Right Signature
    doc.setDrawColor(120, 130, 150);
    doc.setLineWidth(0.5);
    doc.line(W - 100, sigY, W - 40, sigY);
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Ranjith A S', W - 70, sigY - 4, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Academy Director', W - 70, sigY + 6, { align: 'center' });

    // ─── Footer ───
    const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    doc.setFont('helvetica', 'normal'); // standard font for fine print
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 130);
    doc.text(`Issued: ${dateStr}`, 20, H - 10);
    doc.text(`Certificate No: ${cert.certNumber}`, W - 20, H - 10, { align: 'right' });
    doc.text('ChessKidoo Academy · Chennai, Tamil Nadu · chesskidoo37@gmail.com', W/2, H - 10, { align: 'center' });

    doc.save(`ChessKidoo_Certificate_${cert.studentName.replace(/\s+/g,'_')}_${cert.level}.pdf`);
    CK.showToast('🎓 Certificate downloaded!', 'success');
  }

  /* ─── Lazy-load jsPDF from CDN ─── */
  function _loadJsPDF(callback) {
    if (document.getElementById('jspdf-cdn')) { callback && callback(); return; }
    const s = document.createElement('script');
    s.id = 'jspdf-cdn';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => callback && callback();
    document.head.appendChild(s);
  }

  /* ─── Render earned certificates for student portal ─── */
  function renderStudentCerts(containerId, studentProfile, attendancePct, puzzlesSolved) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const earned = get().filter(c => c.studentId === studentProfile.id);
    const eligibility = checkEligibility(studentProfile, attendancePct, puzzlesSolved);
    const level = studentProfile.level || 'Beginner';
    const lvlData = LEVELS[level];

    el.innerHTML = `
      <div class="cert-section">
        <div class="cert-section-title">🎓 My Certificates</div>
        ${earned.length ? earned.map(cert => `
          <div class="cert-card">
            <div class="cert-badge">${LEVELS[cert.level]?.badge || '🏆'}</div>
            <div class="cert-info">
              <div class="cert-level">${cert.level} Level Certificate</div>
              <div class="cert-name">${cert.studentName}</div>
              <div class="cert-date">Issued ${new Date(cert.issuedAt).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'})}</div>
              <div class="cert-num"># ${cert.certNumber}</div>
            </div>
            <button class="p-btn p-btn-gold p-btn-sm" onclick="CK.certs.downloadCert('${cert.id}')">⬇ Download PDF</button>
          </div>`) .join('') : `<div class="cls-empty">No certificates earned yet — keep studying!</div>`}

        <div class="cert-next-target">
          <div class="cert-next-title">📋 Next Certificate: ${level} Level</div>
          <div class="cert-progress-grid">
            <div class="cert-req ${attendancePct >= (level==='Beginner'?60:level==='Intermediate'?70:80) ? 'cert-req-done' : ''}">
              <span class="cert-req-icon">${attendancePct >= (level==='Beginner'?60:level==='Intermediate'?70:80) ? '✅' : '⭕'}</span>
              <span>Attendance: ${Math.round(attendancePct)}% / ${level==='Beginner'?60:level==='Intermediate'?70:80}% required</span>
            </div>
            <div class="cert-req ${puzzlesSolved >= (level==='Beginner'?5:level==='Intermediate'?20:40) ? 'cert-req-done' : ''}">
              <span class="cert-req-icon">${puzzlesSolved >= (level==='Beginner'?5:level==='Intermediate'?20:40) ? '✅' : '⭕'}</span>
              <span>Puzzles Solved: ${puzzlesSolved} / ${level==='Beginner'?5:level==='Intermediate'?20:40} required</span>
            </div>
          </div>
          ${eligibility.eligible && !eligibility.alreadyEarned
            ? `<button class="p-btn p-btn-gold" onclick="CK.certs.claimCert()">🎓 Claim Your ${level} Certificate!</button>`
            : eligibility.alreadyEarned
            ? `<div class="p-badge p-badge-green">✅ Already earned — download above!</div>`
            : `<div style="color:var(--p-text-muted);font-size:0.85rem">Complete requirements to unlock your certificate.</div>`}
        </div>
      </div>`;
  }

  function downloadCert(certId) {
    const cert = get().find(c => c.id === certId);
    if (!cert) { CK.showToast('Certificate not found', 'error'); return; }
    _loadJsPDF(() => generatePDF(cert));
  }

  const _pendingClaim = null;
  function claimCert() {
    const user = CK.currentUser || JSON.parse(localStorage.getItem('ck_user') || '{}');
    if (!user || !user.id) { CK.showToast('Please log in first', 'error'); return; }
    const cert = awardCertificate(user, user.coach);
    _loadJsPDF(() => generatePDF(cert));
    CK.showToast('🎓 Certificate generated!', 'success');
    if (CK.student) CK.student.renderAchievementsTab();
  }

  return {
    LEVELS, checkEligibility, awardCertificate, generatePDF,
    renderStudentCerts, downloadCert, claimCert, getEarned: get
  };
})();
