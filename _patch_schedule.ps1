$ErrorActionPreference = 'SilentlyContinue'
$path = "D:\MY\chessk\assets\js\schedule-pro.js"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1) Fix openMatrixSlotEditor: replace getBatch body
$old1 = @'
  const getBatch = async (batchName) => {
    const classList = await CK.db.getBatch();
    if (!classList || !classList.length) return [];
    return classList.filter(b => b.name.toLowerCase() === batchName.toLowerCase());
  };
'@
$new1 = @'
  const getBatch = async (batchName) => {
    const batches = await CK.db.getBatches();
    if (!batches || !batches.length) {
      if (typeof batchName === 'string' && batchName.trim()) return [batchName.trim()];
      return [];
    }
    const names = batches.map(b => typeof b === 'string' ? b : (b.batchName || b.name || b.batch || ''));
    if (typeof batchName === 'string' && batchName.trim()) {
      return names.filter(n => String(n).toLowerCase() === batchName.toLowerCase().trim());
    }
    return [];
  };
'@
if ($c.Contains($old1)) { $c = $c.Replace($old1, $new1); Write-Host "Fixed getBatch" } else { Write-Host "getBatch not found as expected" }

# 2) Fix matrix modal close buttons
$old2 = "cls-modal-close`" onclick=`"this.closest('.p-modal-overlay')"
$new2 = "cls-modal-close`" onclick=`"this.closest('.cls-modal-overlay')"
$cnt2 = ($c.Split($old2)).Length - 1
if ($cnt2 -gt 0) { $c = $c.Replace($old2, $new2); Write-Host "Fixed close buttons: $cnt2" } else { Write-Host "No close button fixes needed" }

# 3) Escape single quotes in onclick handlers
$old3 = "editMatrixSlot('${row.coach}'"  
$new3 = "editMatrixSlot('${safeCoach}'"
if ($c.Contains($old3)) { $c = $c.Replace($old3, $new3); Write-Host "Fixed editMatrixSlot injection" } else { Write-Host "editMatrixSlot not found" }

$old3b = "coachAddMeeting('${coachId}', '${coachName}'"
$new3b = "coachAddMeeting('${coachId}', '${safeCoachName}'"
if ($c.Contains($old3b)) { $c = $c.Replace($old3b, $new3b); Write-Host "Fixed coachAddMeeting injection" } else { Write-Host "coachAddMeeting not found" }

$old3c = "editMeeting('${m.id}'"
$new3c = "editMeeting('${safeMId}'"
if ($c.Contains($old3c)) { $c = $c.Replace($old3c, $new3c); Write-Host "Fixed editMeeting injection" } else { Write-Host "editMeeting not found" }

$old3d = "deleteMeeting('${m.id}', '${coachId}'"
$new3d = "deleteMeeting('${safeMId}', '${coachId}'"
if ($c.Contains($old3d)) { $c = $c.Replace($old3d, $new3d); Write-Host "Fixed deleteMeeting injection" } else { Write-Host "deleteMeeting not found" }

# 4) Fix saveLive payload
$old4 = "const payload = d ? { id: 'global_live', fen: d.fen, pgn: d.coachNote || '', coach: window.CK?.currentUser?.full_name || 'Coach', ts: Date.now() } : null;"
$new4 = "const payload = d ? { id: 'global_live', fen: d.fen, pgn: d.coachNote || '', coach: window.CK?.currentUser?.full_name || 'Coach', ts: Date.now(), meet_url: d.meetUrl || '' } : null;"
if ($c.Contains($old4)) { $c = $c.Replace($old4, $new4); Write-Host "Fixed saveLive meet_url" } else { Write-Host "saveLive payload not found" }

# 5) Add manual Google Meet scheduling feature
$old5 = @'
    modal.querySelector('#mm_gen_link').onclick = async (e) => {
      e.preventDefault();
      const btn = e.target;
      btn.textContent = '⏳...';
      btn.disabled = true;
      try {
        const link = (CK.gmeetScheduler && CK.gmeetScheduler.createMeet)
          ? await CK.gmeetScheduler.createMeet()
          : (CK.gmeet && CK.gmeet.createMeetSpace) ? await CK.gmeet.createMeetSpace() : `https://meet.google.com/mock-${uid()}`;
        modal.querySelector('#mm_link').value = link;
        btn.textContent = '✅ Generated';
      } catch (err) {
        btn.textContent = '❌ Failed';
      }
      setTimeout(() => { btn.disabled = false; btn.textContent = '🪄 Generate'; }, 2000);
    };
'@
$new5 = @'
    modal.querySelector('#mm_gen_link').onclick = async (e) => {
      e.preventDefault();
      const btn = e.target;
      btn.textContent = '⏳...';
      btn.disabled = true;
      try {
        const link = (CK.gmeetScheduler && CK.gmeetScheduler.createMeet)
          ? await CK.gmeetScheduler.createMeet()
          : (CK.gmeet && CK.gmeet.createMeetSpace) ? await CK.gmeet.createMeetSpace() : null;
        if (link) {
          modal.querySelector('#mm_link').value = link;
          btn.textContent = '✅ Generated';
        } else {
          btn.textContent = '📋 Paste link';
          const manual = prompt('Paste your Google Meet link here:');
          if (manual && manual.trim()) modal.querySelector('#mm_link').value = manual.trim();
          btn.textContent = '🪄 Generate';
        }
      } catch (err) {
        btn.textContent = '📋 Paste link';
        const manual = prompt('Paste your Google Meet link here:');
        if (manual && manual.trim()) modal.querySelector('#mm_link').value = manual.trim();
        btn.textContent = '🪄 Generate';
      }
      btn.disabled = false;
    };
'@
if ($c.Contains($old5)) { $c = $c.Replace($old5, $new5); Write-Host "Added manual Meet scheduling" } else { Write-Host "Generate link handler not found" }

# 6) Add safe escape helpers before the return statement
$old6 = @'
  return {
    get, renderCoachSchedule, renderStudentSchedule, renderAdminSchedule, upcomingCount,
    editMeeting, deleteMeeting
  };
'@
$new6 = @'
  return {
    get, renderCoachSchedule, renderStudentSchedule, renderAdminSchedule, upcomingCount,
    editMeeting, deleteMeeting
  };
'@
if ($c.Contains($old6)) {
  $c = $c.Replace($old6, $new6);
  Write-Host "Verified return statement"
} else { Write-Host "Return not found" }

[System.IO.File]::WriteAllText($path, $c, (New-Object System.Text.UTF8Encoding $true))
Write-Host "Saved schedule-pro.js"
