/**
 * Student Schedule Manager Module
 * Handles beautiful schedule cards, preview generation, HTML2Canvas rendering,
 * WhatsApp sharing, and contextual AI insights.
 */

(function () {
  let currentScheduleData = {};

  // Single source of truth for the schedule's coach name. Prefers the coach
  // chosen in the Schedule Manager (schedData.coachId / coachName), then the
  // student's globally-assigned coach, then 'TBD'. Used by the admin preview,
  // the parent schedule card, and the .ics calendar export so they always agree.
  function resolveScheduleCoachName(schedData, student) {
    const coaches = window.allCoaches || window.coaches || [];
    if (schedData && schedData.coachId) {
      const c = coaches.find((c) => String(c.id) === String(schedData.coachId));
      if (c) return c.name;
    }
    if (schedData && schedData.coachName) return schedData.coachName;
    if (student && student.coach_id) {
      const c = coaches.find((c) => String(c.id) === String(student.coach_id));
      if (c) return c.name;
    }
    return "TBD";
  }
  window.resolveScheduleCoachName = resolveScheduleCoachName;

  window.setScheduleMode = function (mode) {
    const individualPanel = document.getElementById("sch-individual-panel");
    const groupPanel = document.getElementById("sch-group-panel");
    const individualBtn = document.getElementById("sch-mode-individual");
    const groupBtn = document.getElementById("sch-mode-group");
    const saveBtn = document.getElementById("sch-save-btn");
    const groupSaveBtn = document.getElementById("sch-group-save-btn");

    if (!individualPanel || !groupPanel) return;

    if (mode === "individual") {
      individualPanel.style.display = "block";
      groupPanel.style.display = "none";
      if (individualBtn) {
        individualBtn.style.background = "var(--gold)";
        individualBtn.style.color = "#111";
      }
      if (groupBtn) {
        groupBtn.style.background = "transparent";
        groupBtn.style.color = "var(--ivory)";
      }
      if (saveBtn) saveBtn.style.display = "";
      if (groupSaveBtn) groupSaveBtn.style.display = "none";
    } else if (mode === "group") {
      individualPanel.style.display = "none";
      groupPanel.style.display = "block";
      if (individualBtn) {
        individualBtn.style.background = "transparent";
        individualBtn.style.color = "var(--ivory)";
      }
      if (groupBtn) {
        groupBtn.style.background = "var(--gold)";
        groupBtn.style.color = "#111";
      }
      if (saveBtn) saveBtn.style.display = "none";
      if (groupSaveBtn) groupSaveBtn.style.display = "";
      if (window.toggleScheduleGroup) window.toggleScheduleGroup();
    } else {
      individualPanel.style.display = "none";
      groupPanel.style.display = "block";
      if (groupBtn) {
        groupBtn.style.background = "var(--gold)";
        groupBtn.style.color = "#111";
      }
      if (individualBtn) {
        individualBtn.style.background = "transparent";
        individualBtn.style.color = "var(--ivory)";
      }
      if (saveBtn) saveBtn.style.display = "none";
      if (groupSaveBtn) groupSaveBtn.style.display = "";
      if (window.toggleScheduleGroup) window.toggleScheduleGroup();
    }
  };

  window.initSchedulePage = function () {
    populateStudentSelect();
    populateCoachSelect();
    window.setScheduleMode("individual");
    resetScheduleInputs();
    if (window.generateSchedulePreview) window.generateSchedulePreview();
  };

  function populateStudentSelect() {
    const sel = document.getElementById("sch-student-select");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Student --</option>';
    const students = window.allStudents || window.students || [];
    const role = window.role || "admin";
    const coachId = window.currentCoachId || window.userId;
    const list =
      role === "coach" && coachId
        ? students.filter((s) => String(s.coach_id) === String(coachId))
        : students;
    if (list.length) {
      list.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent =
          s.name + (s.parent_name ? ` (Parent: ${s.parent_name})` : "");
        sel.appendChild(opt);
      });
    }
  }

  function populateCoachSelect() {
    const sel = document.getElementById("sch-coach-select");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Coach --</option>';
    const coaches = window.allCoaches || window.coaches || [];
    if (coaches.length) {
      coaches.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
  }

  function resetScheduleInputs() {
    if (document.getElementById("sch-reg-days"))
      document.getElementById("sch-reg-days").value = "";
    if (document.getElementById("sch-reg-time"))
      document.getElementById("sch-reg-time").value = "";
    if (document.getElementById("sch-meet-link"))
      document.getElementById("sch-meet-link").value = "";
    if (document.getElementById("sch-coach-select"))
      document.getElementById("sch-coach-select").value = "";
    if (document.getElementById("sch-footnote"))
      document.getElementById("sch-footnote").value =
        "Welcome to ChessKidoo Academy! We look forward to an exciting chess learning journey together.";
  }

  // UTF-8 safe base64 helpers. The server sanitizes the `notes` column and
  // strips quotes (" ' ` < > ;), which would corrupt a raw [SCHEDULE:{json}]
  // tag. So we persist the schedule as [SCHEDULE64:<base64>] — base64's
  // alphabet (A-Za-z0-9+/=) survives sanitization intact.
  function encodeSchedulePayload(obj) {
    try {
      return window.btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    } catch (e) {
      return "";
    }
  }
  function decodeSchedulePayload(b64) {
    try {
      return JSON.parse(decodeURIComponent(escape(window.atob(b64))));
    } catch (e) {
      return null;
    }
  }

  // Parses the embedded schedule tag from the notes column. Supports the new
  // sanitization-safe [SCHEDULE64:...] format and the legacy [SCHEDULE:{...}].
  window.extractScheduleJSON = function (notesString, student = null) {
    console.log("[Schedule] extractScheduleJSON notesLen=", (notesString || "").length, "studentId=", student?.id, "studentDays=", student?.days, "allBatches=", (window.allBatches || []).length);
    if (notesString) {
      const m64 = notesString.match(/\[SCHEDULE64:([A-Za-z0-9+/=]+)\]/);
      if (m64 && m64[1]) {
        const decoded = decodeSchedulePayload(m64[1]);
        if (decoded) {
          console.log("[Schedule] extractScheduleJSON decoded from SCHEDULE64", decoded);
          return decoded;
        }
      }
      const match = notesString.match(/\[SCHEDULE:({.*?})\]/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          console.log("[Schedule] extractScheduleJSON decoded from legacy SCHEDULE", parsed);
          return parsed;
        } catch (e) {
          console.warn("Failed to parse legacy schedule JSON", e);
        }
      }
      console.log("[Schedule] extractScheduleJSON no schedule tag found in notes");
    } else {
      console.log("[Schedule] extractScheduleJSON notes empty for student", student?.id);
    }

    // FALLBACK: Check student's days column first, then live batch lookup
    if (student) {
      // First try: use student's days column
      if (student.days) {
        const dayArray = String(student.days)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        const timeVal = student.session_time || student.batch_time || "TBD";
        const result = {
          regDays: dayArray.join(" & "),
          regTime: timeVal,
          regCoachName: student.coach_name || student.coaching_coach || "TBD",
          meetLink: student.notes
            ? student.notes.match(/https?:\/\/[^\s]+/)?.[0] || ""
            : "",
          isMatrixOverride: false,
        };
        console.log("[Schedule] extractScheduleJSON fallback from student.days", result);
        return result;
      }
      // Second try: Look up student's live batch schedule dynamically
      if (student.id && window.allBatches) {
        const myBatch = window.allBatches.find((b) => {
          const ids = Array.isArray(b.student_ids)
            ? b.student_ids.map(String)
            : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
          return ids.includes(String(student.id)) || (student.batch_id && String(student.batch_id) === String(b.id)) || (student.batch && String(student.batch) === String(b.name));
        });
        console.log("[Schedule] extractScheduleJSON batch lookup found=", !!myBatch, myBatch?.name, myBatch?.days, myBatch?.time_slot);
        if (myBatch) {
          const coaches = window.allCoaches || window.coaches || [];
          const c = coaches.find(
            (co) => String(co.id) === String(myBatch.coach_id) || (window.ckSameCoach && window.ckSameCoach(co.id, myBatch.coach_id)),
          );
          const result = {
            regDays: myBatch.days || "TBD",
            regTime: myBatch.time_slot || "TBD",
            regCoachName: c ? (c.name || c.full_name) : "TBD",
            meetLink:
              (myBatch.notes || "").match(/https?:\/\/[^\s"'<>]+/)?.[0] ||
              "",
            isMatrixOverride: false,
          };
          console.log("[Schedule] extractScheduleJSON fallback from batch", result);
          return result;
        }
      }
    }
    console.log("[Schedule] extractScheduleJSON returning null");
    return null;
  };

  window.removeScheduleJSON = function (notesString) {
    if (!notesString) return notesString;
    return notesString
      .replace(/\[SCHEDULE64:[A-Za-z0-9+/=]+\]/g, "")
      .replace(/\[SCHEDULE:({.*?})\]/g, "")
      .trim();
  };

  window.renderChildWeeklySchedule = function (student, schedData) {
    const container = document.getElementById("child-weekly-schedule-container");
    console.log("[Schedule] renderChildWeeklySchedule called student=", student?.id, "container=", !!container, "schedDataProvided=", !!schedData);
    if (!container) return;
    if (!student) {
      student = window.currentStudent;
    }
    if (!student) {
      console.warn("[Schedule] renderChildWeeklySchedule no student");
      container.innerHTML = `<div class="empty-state" style="padding:24px;"><span class="empty-icon">📆</span><p>No student selected.</p></div>`;
      return;
    }

    if (!schedData) {
      schedData = window.extractScheduleJSON(student.notes, student);
    }
    console.log("[Schedule] weekly schedData=", !!schedData, "regDays=", schedData?.regDays, "allBatches=", (window.allBatches || []).length);
    if (!schedData) {
      container.innerHTML = `<div class="empty-state" style="padding:24px;"><span class="empty-icon">📆</span><p>No schedule found.</p></div>`;
      return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const regDaysLower = String(schedData.regDays || "").toLowerCase();
    const timeStr = schedData.regTime || "TBD";
    const coachName = schedData.regCoachName || "";
    const meetLink = schedData.meetLink || "";
    const title = (student.name || "Student") + " - Chess Class";

    let weekGridHtml = '<div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:8px; margin-top:16px;">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const isScheduled = regDaysLower.includes(fullDays[i].toLowerCase()) || regDaysLower.includes(days[i].toLowerCase());

      let calLink = null;
      if (isScheduled && timeStr !== "TBD" && window.generateGoogleCalendarLink) {
        calLink = window.generateGoogleCalendarLink({
          title: title,
          timeStr: timeStr,
          coachName: coachName,
          meetLink: meetLink,
          description: "Regular chess class with " + coachName + ". Timing: " + timeStr,
          specificDate: dateStr,
        });
      }

      const dayStyle = isScheduled
        ? "background:linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.25)); border:1px solid rgba(59,130,246,0.4); color:#fff;"
        : "background:rgba(255,255,255,0.03); border:1px solid var(--border); color:var(--ivory-dim); opacity:0.7;";

      const actionHtml = isScheduled && calLink
        ? `<a href="${calLink}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size:10px; padding:3px 8px; white-space:nowrap; margin-top:4px;" onclick="window.toast && window.toast('Opening Google Calendar...', 'info');">+ GCal</a>`
        : '<span style="font-size:10px; color:var(--ivory-dim);">—</span>';

      const timeDisplay = isScheduled ? `<div style="font-size:10px; color:var(--gold); font-weight:700; margin-top:4px;">${escapeHtml(timeStr)}</div>` : "";

      weekGridHtml += `
        <div style="padding:10px; border-radius:8px; ${dayStyle} text-align:center;">
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">${days[i]}</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px;">${d.getDate()}</div>
          <div style="font-size:10px; opacity:0.8;">${displayDate.split(" ")[0]}</div>
          ${timeDisplay}
          <div style="margin-top:4px;">${actionHtml}</div>
        </div>
      `;
    };
    weekGridHtml += "</div>";

    container.innerHTML = `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:13px; color:var(--gold); font-weight:700;">This Week</span>
          <span style="font-size:12px; color:var(--ivory-dim); margin-left:8px;">${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(monday.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        ${meetLink ? `<a href="${meetLink}" target="_blank" rel="noopener" class="btn btn-gold btn-sm" style="font-weight:700;">Join Live Class 🎥</a>` : ""}
      </div>
      <div class="card" style="padding:16px; border:1px solid var(--border); border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:12px; color:var(--ivory-dim); text-transform:uppercase; letter-spacing:0.5px;">Regular Class</div>
            <div style="font-size:14px; color:var(--ivory); font-weight:700; margin-top:2px;">Days: ${escapeHtml(schedData.regDays || "TBD")}</div>
            <div style="font-size:13px; color:var(--gold);">Timing: ${escapeHtml(timeStr)}</div>
            <div style="font-size:12px; color:var(--ivory2);">Coach: ${escapeHtml(coachName || "TBD")}</div>
          </div>
        </div>
        ${weekGridHtml}
      </div>
     `;
   };

   function getSessionDatesForMonth(daysStr, year, month) {
     if (!daysStr) return [];
     const dayNames = String(daysStr)
       .toLowerCase()
       .split(/[&,]+/)
       .map((d) => d.trim())
       .filter(Boolean);
     const fullDayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
     let targetDays = dayNames
       .map((d) => fullDayMap[d.slice(0, 3)])
       .filter((n) => !isNaN(n));

     if (dayNames.some((d) => d.includes("weekend"))) {
       if (!targetDays.includes(5)) targetDays.push(5);
       if (!targetDays.includes(6)) targetDays.push(6);
     }
     if (dayNames.some((d) => d.includes("weekday"))) {
       for (let i = 1; i <= 5; i++) {
         if (!targetDays.includes(i)) targetDays.push(i);
       }
     }
     if (!targetDays.length) return [];

     const dates = [];
     const d = new Date(year, month, 1);
     while (d.getMonth() === month) {
       if (targetDays.includes(d.getDay())) {
         dates.push({
           date: new Date(d),
           dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
           dateStr: d.toISOString().split("T")[0],
           displayDate: d.toLocaleDateString("en-US", {
             day: "numeric",
             month: "short",
             year: "numeric",
           }),
         });
       }
       d.setDate(d.getDate() + 1);
     }
     return dates;
   }

   function buildMonthlyScheduleTable(sessions, options = {}) {
     const { showStudentNames = false, title = "Monthly Schedule" } = options;

     if (!sessions || sessions.length === 0) {
       return `<div class="empty-state" style="padding:24px;"><span class="empty-icon">📅</span><p>No sessions scheduled for this month.</p></div>`;
     }

     const headerCells = showStudentNames
       ? "<th>#</th><th>Day</th><th>Date</th><th>Time</th><th>Student Names</th>"
       : "<th>#</th><th>Day</th><th>Date</th><th>Time</th>";

     const rows = sessions
       .map((s, i) => {
         const studentCell = showStudentNames
           ? `<td style="font-size:12px; color:var(--ivory); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.studentNames || "")}</td>`
           : "";

         return `<tr>
           <td style="text-align:center; font-weight:600; width:40px;">${i + 1}</td>
           <td style="font-size:12px; color:var(--ivory2);">${escapeHtml(s.dayName || "")}</td>
           <td style="font-size:12px; color:var(--ivory);">${escapeHtml(s.displayDate || s.dateStr || "")}</td>
           <td style="font-size:12px; font-family:var(--font-mono, monospace); color:var(--gold);">${escapeHtml(s.timeStr || "TBD")}</td>
           ${studentCell}
         </tr>`;
       })
       .join("");

     return `<div style="margin-top:24px;">
       <h3 style="color:var(--gold); font-size:16px; margin-bottom:12px; font-family:var(--font-head); letter-spacing:0.5px;">📅 ${escapeHtml(title)}</h3>
       <div class="table-wrap" style="overflow-x:auto; border:1px solid var(--border); border-radius:10px;">
         <table class="coach-mini-table" style="width:100%; border-collapse:collapse;">
           <thead>
             <tr style="background:rgba(0,0,0,0.2);">${headerCells}</tr>
           </thead>
           <tbody>${rows}</tbody>
         </table>
       </div>
     </div>`;
   }

   window.renderChildMonthlySchedule = function (student) {
     const container = document.getElementById("child-monthly-schedule-container");
     if (!container) return;
     if (!student) {
       student = window.currentStudent;
     }
     if (!student) {
       container.innerHTML = `<div class="empty-state" style="padding:24px;"><span class="empty-icon">📅</span><p>No student selected.</p></div>`;
       return;
     }

     const monthInput = document.getElementById("child-schedule-month");
     if (monthInput && !monthInput.value) {
       const now = new Date();
       monthInput.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
     }

     const schedData = window.extractScheduleJSON(student.notes, student);
     if (!schedData) {
       container.innerHTML = `<div class="empty-state" style="padding:24px;"><span class="empty-icon">📅</span><p>No schedule found for this month.</p></div>`;
       return;
     }

     let year, month;
     if (monthInput && monthInput.value) {
       const [y, m] = monthInput.value.split("-").map(Number);
       year = y;
       month = m - 1;
     } else {
       const now = new Date();
       year = now.getFullYear();
       month = now.getMonth();
     }

     const sessionDates = getSessionDatesForMonth(schedData.regDays || "", year, month);
     const sessions = sessionDates.map((sd) => ({
       ...sd,
       timeStr: schedData.regTime || "TBD",
       coachName: schedData.regCoachName || "",
       meetLink: schedData.meetLink || "",
       title: (student.name || "Student") + " - Chess Class",
       studentNames: student.name || "",
     }));

     container.innerHTML = buildMonthlyScheduleTable(sessions, {
       showStudentNames: false,
       title: "Monthly Schedule - " + (student.name || "Student"),
     });
   };

   window.setChildScheduleView = function (view) {
     view = view || "weekly";
     const monthlyPanel = document.getElementById("child-schedule-monthly-panel");
     const weeklyPanel = document.getElementById("child-schedule-weekly-panel");
     const monthlyTab = document.getElementById("child-schedule-tab-monthly");
     const weeklyTab = document.getElementById("child-schedule-tab-weekly");

     if (!monthlyPanel || !weeklyPanel) return;

     if (view === "weekly") {
       monthlyPanel.style.display = "none";
       weeklyPanel.style.display = "block";
       if (monthlyTab) { monthlyTab.classList.remove("active"); monthlyTab.style.background = "transparent"; monthlyTab.style.color = "var(--ivory)"; }
       if (weeklyTab) { weeklyTab.classList.add("active"); weeklyTab.style.background = "linear-gradient(135deg,var(--gold) 0%,#b8860b 100%)"; weeklyTab.style.color = "#000"; }
       if (window.renderChildWeeklySchedule) window.renderChildWeeklySchedule(window.currentStudent);
     } else {
       monthlyPanel.style.display = "block";
       weeklyPanel.style.display = "none";
       if (weeklyTab) { weeklyTab.classList.remove("active"); weeklyTab.style.background = "transparent"; weeklyTab.style.color = "var(--ivory)"; }
       if (monthlyTab) { monthlyTab.classList.add("active"); monthlyTab.style.background = "linear-gradient(135deg,var(--gold) 0%,#b8860b 100%)"; monthlyTab.style.color = "#000"; }
       if (window.renderChildMonthlySchedule) window.renderChildMonthlySchedule(window.currentStudent);
     }
   };

   window.loadStudentScheduleData = function (studentId) {
    resetScheduleInputs();
    if (!studentId) {
      if (window.generateSchedulePreview) window.generateSchedulePreview();
      return;
    }

    const student = (window.allStudents || []).find((s) => s.id == studentId);
    if (student && student.notes) {
      const schedData = window.extractScheduleJSON(student.notes);
      if (schedData) {
        if (document.getElementById("sch-reg-days"))
          document.getElementById("sch-reg-days").value =
            schedData.regDays || "";
        if (document.getElementById("sch-reg-time"))
          document.getElementById("sch-reg-time").value =
            schedData.regTime || "";
        if (document.getElementById("sch-meet-link"))
          document.getElementById("sch-meet-link").value =
            schedData.meetLink || "";
        if (document.getElementById("sch-coach-select"))
          document.getElementById("sch-coach-select").value =
            schedData.coachId || "";
        if (document.getElementById("sch-footnote"))
          document.getElementById("sch-footnote").value =
            schedData.footnote || "";
      }
    }

    if (window.generateSchedulePreview) window.generateSchedulePreview();

    // Call Contextual AI Insight for the Schedule block
    if (window.generateContextualInsight) {
      window.generateContextualInsight("schedule", studentId);
    }
  };

  window.toggleDayShortcut = function (day) {
    const input = document.getElementById("sch-reg-days");
    if (!input) return;
    let days = input.value
      .split("&")
      .map((d) => d.trim())
      .filter(Boolean);
    if (days.includes(day)) {
      days = days.filter((d) => d !== day);
    } else {
      days.push(day);
    }
    input.value = days.join(" & ");

    // Update button active states
    const buttons = document.querySelectorAll(
      "#sch-days-shortcuts .sch-day-btn",
    );
    buttons.forEach((btn) => {
      const btnDay = btn.dataset.day;
      if (days.includes(btnDay)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (window.generateSchedulePreview) window.generateSchedulePreview();
  };

  // Returns the base CSS color for a coach
  function getCoachColor(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("rohith")) return "#3b5998";
    if (n.includes("ranjith")) return "#27ae60";
    if (n.includes("gyana")) return "#8e44ad";
    if (n.includes("arivu")) return "#d35400";
    if (n.includes("yogesh")) return "#2ecc71";
    if (n.includes("sudhin")) return "#f39c12";
    if (n.includes("vasanth")) return "#16a085";
    if (n.includes("vishnu")) return "#7f8c8d";
    return "#4f5d75"; // default
  }

  // Shared function to render the Schedule Card HTML using the Master Matrix theme
  function buildScheduleCardHtml(
    studentName,
    schedData,
    coachName,
    isChildView,
    studentId,
    studentBatches = [],
  ) {
    const regDays = schedData.regDays || "TBD";
    const regTime = schedData.regTime || "TBD";
    const meetLink = schedData.meetLink || "";
    const footnote = schedData.footnote || "";

    const coachColor = getCoachColor(coachName);

    // Generate Weekly Calendar View HTML matching the Master Matrix table header style
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const activeDaysStr = regDays.toLowerCase();

    let weekGridHtml =
      '<div style="display:flex; gap:4px; margin-top:12px; margin-bottom:12px; justify-content:space-between; width:100%;">';
    const dayIcons = ["📅", "🥏", "🎯", "🎲", "🎉", "🎊", "⚽"];
    for (let i = 0; i < 7; i++) {
      const isActive =
        activeDaysStr.includes(daysOfWeek[i].toLowerCase()) ||
        activeDaysStr.includes(shortDays[i].toLowerCase());
      if (isActive) {
        weekGridHtml += `<div title="${daysOfWeek[i]}" style="flex:1; text-align:center; padding:8px 4px; border-radius:4px; background:linear-gradient(135deg, ${coachColor}, ${coachColor}cc); color:#ffffff; font-weight:600; font-size:11px; border:1px solid ${coachColor}; text-transform:uppercase; box-shadow:0 2px 8px rgba(0,0,0,0.2);">${shortDays[i]}<span style="display:block; font-size:9px; opacity:0.9;">${dayIcons[i]}</span></div>`;
      } else {
        weekGridHtml += `<div title="${daysOfWeek[i]}" style="flex:1; text-align:center; padding:8px 4px; border-radius:4px; background-color:#1c2030; color:#a4b0cb; font-weight:600; font-size:11px; border:1px solid #2c3242; text-transform:uppercase; opacity:0.6;">${shortDays[i]}<span style="display:block; font-size:9px;">${dayIcons[i]}</span></div>`;
      }
    }
    weekGridHtml += "</div>";

    // Action Buttons
    let actionButtons = "";
    if (isChildView) {
      let calLink = null;
      if (window.generateGoogleCalendarLink) {
        calLink = window.generateGoogleCalendarLink({
          title: studentName + " - Chess Class",
          days: regDays,
          timeStr: regTime,
          coachName: coachName,
          meetLink: meetLink,
          description: "Regular chess class with " + coachName
        });
      }
       const ultimateFallback = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(studentName + " - Chess Class") + "&dates=" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z/" + new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z&details=" + encodeURIComponent("Coach: " + (coachName || "TBD") + "\nTime: " + (regTime || "TBD")) + "&location=" + encodeURIComponent(meetLink || "ChessKidoo Academy");
       const finalCalLink = calLink || (window.buildFallbackCalendarLink ? window.buildFallbackCalendarLink(studentName + " - Chess Class", regDays, regTime, coachName, meetLink) : null) || ultimateFallback;
       const calendarBtn = finalCalLink ? `<a href="${finalCalLink}" target="_blank" style="background:#1c2030; border:1px solid #2c3242; color:#ffffff; padding:10px 20px; border-radius:4px; text-decoration:none; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px;" onmouseover="this.style.background='#2c3242'" onmouseout="this.style.background='#1c2030'" onclick="console.log('GCal URL:', '${String(finalCalLink).replace(/'/g, "\\'")}'); window.toast && window.toast('Opening Google Calendar...', 'info');">Add to Google Calendar 📅</a>` : `<button disabled title="Schedule data incomplete" style="background:#1c2030; border:1px solid #2c3242; color:#ffffff; padding:10px 20px; border-radius:4px; font-weight:600; font-size:13px; cursor:not-allowed; opacity:0.7; display:inline-flex; align-items:center; gap:6px;">Add to Google Calendar 📅</button>`;
      actionButtons = `
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; justify-content:center;">
                    ${meetLink ? `<a href="${meetLink}" target="_blank" style="background:${coachColor}; color:#ffffff; padding:10px 20px; border-radius:4px; text-decoration:none; font-weight:600; font-size:13px; box-shadow:0 4px 15px rgba(0,0,0,0.3); display:flex; align-items:center; gap:6px;">Join Class 🎥</a>` : ""}
                    ${calendarBtn}
                    ${window.currentUser && window.currentUser.role === "admin" ? `<button onclick="window.editStudentSchedule('${studentId}')" style="background:#4f5d75; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:10px 20px; border-radius:4px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:6px;">Edit Schedule ✏️</button>` : ""}
                </div>`;
    }

    return `
        <div id="sch-render-target" style="
            background-color: #141722;
            border: 1px solid #2c3242;
            border-left: 4px solid ${coachColor};
            border-radius: 6px;
            padding: 24px;
            color: #ffffff;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            position: relative;
            overflow: hidden;
            width: 100%;
            box-sizing: border-box;
        ">
            <!-- Header -->
            <div style="text-align:center; border-bottom:1px solid #2c3242; padding-bottom:12px; margin-bottom:20px;">
                <h2 style="color:#ffffff; margin:0; font-size:16px; font-weight:500; letter-spacing:0.5px;">Chess Academy &mdash; Official Schedule</h2>
                <div style="color:#8a90a6; font-size:11px; margin-top:2px;">Complete Unified Roster</div>
            </div>

            <!-- Student Name -->
            <div style="text-align:center; margin-bottom:24px;">
                <div style="font-size:12px; color:#8a90a6;">Welcome to the academy,</div>
                <div style="font-size:24px; font-weight:600; color:#ffffff; margin-top:4px;">${studentName}</div>
            </div>

            <!-- Regular Class Block -->
            <div style="background-color:#1a1e2e; border:1px solid #2c3242; border-radius:4px; padding:16px; margin-bottom:16px;">
                <div style="font-size:10px; text-transform:uppercase; color:#a4b0cb; font-weight:600; letter-spacing:0.5px; margin-bottom:8px;">Regular Class (Weekly Calendar)</div>
                
                ${weekGridHtml}
                
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding-top:8px;">
                    <span style="color:#8a90a6; font-size:12px;">Days:</span>
                    <span style="font-weight:600; font-size:12px;">${regDays}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#8a90a6; font-size:12px;">Timing:</span>
                    <span style="font-weight:600; font-size:12px;">${regTime}</span>
                </div>
                
                <div style="display:flex; justify-content:space-between; padding-top:12px; margin-top:4px; border-top:1px dashed #2c3242;">
                    <span style="color:#8a90a6; font-size:12px;">Coach:</span>
                    <span style="font-weight:bold; font-size:13px; color:${coachColor};">${coachName}</span>
                </div>

                ${
                  !isChildView && meetLink
                    ? `
                <div style="margin-top:16px; text-align:center;">
                    <a href="${meetLink}" target="_blank" style="display:inline-block; background:${coachColor}; color:#ffffff; padding:8px 20px; border-radius:4px; text-decoration:none; font-weight:600; font-size:12px; margin-right:8px;">Join Class 🎥</a>
                    ${(() => {
                      const calLink = window.generateGoogleCalendarLink ? window.generateGoogleCalendarLink({
                        title: studentName + " - Chess Class",
                        days: regDays,
                        timeStr: regTime,
                        coachName: coachName,
                        meetLink: meetLink,
                        description: "Regular chess class with " + coachName
                      }) : '';
                      return calLink ? `<a href="${calLink}" target="_blank" style="display:inline-block; background:#1c2030; border:1px solid #2c3242; color:#ffffff; padding:8px 20px; border-radius:4px; text-decoration:none; font-weight:600; font-size:12px;">Add to Google Calendar 📅</a>` : '';
                    })()}
                </div>`
                    : ""
                }
            </div>

            ${
              isChildView && studentBatches.length > 0
                ? `
            <!-- Batch / Group Info -->
            <div style="background-color:#1a1e2e; border:1px solid #2c3242; border-radius:4px; padding:16px; margin-bottom:16px;">
                <div style="font-size:10px; text-transform:uppercase; color:#a4b0cb; font-weight:600; letter-spacing:0.5px; margin-bottom:8px;">Your Batches</div>
                ${studentBatches
                  .map(
                    (b) => `
                <div style="margin-bottom:10px;">
                    <div style="font-weight:600; color:#ffffff; font-size:12px; margin-bottom:4px;">${b.name}</div>
                    <div style="font-size:11px; color:#8a90a6;">
                        ${b.days || ""} • ${b.time_slot || ""}
                        ${
                          window.allCoaches && b.coach_id
                            ? `<span style="color:${coachColor};"> • Coach: ${window.allCoaches.find((c) => String(c.id) === String(b.coach_id))?.name || "TBD"}</span>`
                            : ""
                        }
                    </div>
                    ${
                      Array.isArray(b.student_ids) && b.student_ids.length > 1
                        ? `
                    <div style="font-size:10px; color:#a4b0cb; margin-top:6px;">
                        <span style="color:#8a90a6;">Group mates:</span> ${b.student_ids
                          .map((sid) => {
                            const s = (window.allStudents || []).find(
                              (x) => String(x.id) === String(sid),
                            );
                            return s ? s.name : "";
                          })
                          .filter(Boolean)
                          .join(", ")}
                    </div>`
                        : ""
                    }
                </div>
                `,
                  )
                  .join("")}
            </div>
            `
                : ""
            }

            ${actionButtons}

            ${footnote ? `<div style="font-size:10px; color:#4f5d75; text-align:center; font-style:italic; line-height:1.4; margin-top:16px;">"${footnote}"</div>` : ""}
        </div>
        `;
  }

  window.generateSchedulePreview = function () {
    const wrapper = document.getElementById("sch-card-preview-wrapper");
    const isGroupMode =
      document.getElementById("sch-group-panel") &&
      document.getElementById("sch-group-panel").style.display === "block";
    const studentId = document.getElementById("sch-student-select")
      ? document.getElementById("sch-student-select").value
      : null;

    if (!isGroupMode && !studentId) {
      if (wrapper) {
        wrapper.innerHTML = `
                <div class="twoknights-schedule-card" style="text-align:center; padding:40px; color:var(--ivory-dim); border:4px dashed var(--border); background:rgba(0,0,0,0.15)">
                  <span style="font-size:40px; display:block; margin-bottom:12px;">♟️</span>
                  Select a student or group and click "Preview Card" to view the beautiful layout.
                </div>`;
      }
      return;
    }

    let stName = "Student";
    if (isGroupMode) {
      const grpSel = document.getElementById("sch-batch-select");
      stName =
        grpSel && grpSel.value
          ? grpSel.options[grpSel.selectedIndex].text
          : "Group Schedule";
    } else {
      const student = (window.allStudents || []).find((s) => s.id == studentId);
      if (student) stName = student.name;
    }

    const schedData = {
      regDays: document.getElementById("sch-reg-days").value || "TBD",
      regTime: document.getElementById("sch-reg-time").value || "TBD",
      meetLink: document.getElementById("sch-meet-link")
        ? document.getElementById("sch-meet-link").value
        : "",
      footnote: document.getElementById("sch-footnote").value || "",
    };

    // Update day button active states
    const buttons = document.querySelectorAll(
      "#sch-days-shortcuts .sch-day-btn",
    );
    const days = schedData.regDays
      .split("&")
      .map((d) => d.trim())
      .filter(Boolean);
    buttons.forEach((btn) => {
      if (days.includes(btn.dataset.day)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const coachId = document.getElementById("sch-coach-select").value;
    let coachName = "TBD";
    if (coachId && (window.allCoaches || window.coaches)) {
      const coach = (window.allCoaches || window.coaches || []).find(
        (c) => c.id == coachId,
      );
      if (coach) coachName = coach.name;
    }

    wrapper.innerHTML = buildScheduleCardHtml(
      stName,
      schedData,
      coachName,
      false,
      studentId,
    );
  };

  // Reads the current schedule form into a schedData object (shared by the
  // single-student save and the group save).
  function buildScheduleDataFromForm() {
    const coachId = document.getElementById("sch-coach-select").value;
    const coachObj = (window.allCoaches || window.coaches || []).find(
      (c) => String(c.id) === String(coachId),
    );
    return {
      regDays: document.getElementById("sch-reg-days").value,
      regTime: document.getElementById("sch-reg-time").value,
      meetLink: document.getElementById("sch-meet-link")
        ? document.getElementById("sch-meet-link").value
        : "",
      coachId: coachId,
      coachName: coachObj ? coachObj.name : "", // denormalized so the parent card is correct even if rosters change
      footnote: document.getElementById("sch-footnote").value,
    };
  }

  // Persists a schedData payload onto one student's notes (PUT). Returns true on success.
  async function persistScheduleForStudent(student, schedData) {
    if (!student) return false;
    const notesWithoutSchedule = window.removeScheduleJSON(student.notes || "");
    const newNotes = (
      notesWithoutSchedule + ` [SCHEDULE64:${encodeSchedulePayload(schedData)}]`
    ).trim();
    try {
      const res = await window.apiCall(
        "/api/students?id=" + encodeURIComponent(student.id),
        {
          method: "PUT",
          body: JSON.stringify({
            notes: newNotes,
            learning_mode: student.learning_mode || "online",
          }),
        },
      );
      if (res.ok) {
        student.notes = newNotes;
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Schedule] save failed for", student.id, e);
      return false;
    }
  }
  window.persistScheduleForStudent = persistScheduleForStudent;
  window.encodeSchedulePayload = encodeSchedulePayload;

  window.saveStudentSchedule = async function () {
    const studentId = document.getElementById("sch-student-select").value;
    if (!studentId) return window.toast("Please select a student", "error");
    const student = (window.allStudents || []).find((s) => s.id == studentId);
    if (!student) return;

    window.toast("Saving schedule...", "info");
    const ok = await persistScheduleForStudent(
      student,
      buildScheduleDataFromForm(),
    );
    window.toast(
      ok ? "Schedule saved successfully!" : "Failed to save schedule.",
      ok ? "success" : "error",
    );
  };

  // ─── Group / Batch Class Scheduling ─────────────────────────────
  // Toggle the group panel and (re)build the multi-select student list.
  window.toggleScheduleGroup = function () {
    const panel = document.getElementById("sch-group-panel");
    if (!panel) return;

    // Populate batch dropdown
    const batchSelect = document.getElementById("sch-batch-select");
    if (batchSelect && window.allBatches) {
      const prevVal = batchSelect.value;
      const sortedBatches = [...window.allBatches].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      batchSelect.innerHTML =
        '<option value="">-- Select Batch --</option>' +
        sortedBatches
          .map(
            (b) =>
              `<option value="${b.id}">${window.escapeHtml ? window.escapeHtml(b.name) : b.name} (${window.parseStudentIds ? window.parseStudentIds(b.student_ids).length : (Array.isArray(b.student_ids) ? b.student_ids.length : 0)} students)</option>`,
          )
          .join("");
      if (prevVal) batchSelect.value = prevVal;
    }

    const coachId = window.currentCoachId || window.userId;
    const role = window.role || "admin";
    const students = (window.allStudents || []).filter((s) => {
      if ((s.status || "active").toLowerCase() === "archived") return false;
      if (role === "coach" && coachId && !window.ckSameCoach?.(s.coach_id, coachId) && String(s.coach_id) !== String(coachId))
        return false;
      return true;
    });
    const list = students.sort((a, b) => {
      const nameA = window.getStudentName ? window.getStudentName(a) : (a.name || "");
      const nameB = window.getStudentName ? window.getStudentName(b) : (b.name || "");
      return nameA.localeCompare(nameB);
    });
    const listEl = document.getElementById("sch-group-list");
    if (listEl) {
      listEl.innerHTML = list
        .map(
          (s) =>
            `<label style="display:flex; align-items:center; gap:10px; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; color:var(--ivory); cursor:pointer; width:100%; box-sizing:border-box;">
                   <input type="checkbox" class="sch-group-cb" value="${s.id}" style="accent-color:var(--gold); margin:0; flex-shrink:0; width:16px; height:16px;">
                   <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${window.escapeHtml ? window.escapeHtml(window.getStudentName ? window.getStudentName(s) : s.name) : s.name}${s.session_mode ? ` <span style="color:var(--ivory-dim); font-size:11px; margin-left:4px;">(${s.session_mode})</span>` : ""}</span>
                 </label>`,
        )
        .join("");
    }
    panel.style.display = "block";
  };

  window.schGroupSelect = function (mode) {
    const cbs = document.querySelectorAll(".sch-group-cb");
    const students = window.allStudents || [];
    cbs.forEach((cb) => {
      if (mode === "all") cb.checked = true;
      else if (mode === "none") cb.checked = false;
      else if (mode === "group") {
        const s = students.find((x) => String(x.id) === String(cb.value));
        cb.checked = !!(
          s &&
          String(s.session_mode || s.batch_type || "").toLowerCase() === "group"
        );
      }
    });
  };

  window.schGroupSelectBatch = function (batchId) {
    if (!batchId) return;
    const batch = (window.allBatches || []).find(
      (b) => String(b.id) === String(batchId),
    );
    if (!batch) return;
    const cbs = document.querySelectorAll(".sch-group-cb");
    const rawIds = Array.isArray(batch.student_ids) ? batch.student_ids.map(String) : (window.parseStudentIds ? window.parseStudentIds(batch.student_ids) : []);
    const students = window.allStudents || [];
    cbs.forEach((cb) => {
      const s = students.find(x => String(x.id) === String(cb.value));
      const inBatch = rawIds.includes(String(cb.value)) || (s && ((s.batch_id && String(s.batch_id) === String(batch.id)) || (s.batch && String(s.batch) === String(batch.name))));
      cb.checked = inBatch;
    });
  };

  window.saveScheduleToGroup = async function () {
    const ids = Array.from(
      document.querySelectorAll(".sch-group-cb:checked"),
    ).map((cb) => cb.value);
    if (ids.length === 0)
      return window.toast(
        "Select at least one student for the group.",
        "error",
      );
    const schedData = buildScheduleDataFromForm();
    window.toast(`Saving schedule to ${ids.length} students...`, "info");
    let ok = 0;
    for (const id of ids) {
      const student = (window.allStudents || []).find(
        (s) => String(s.id) === String(id),
      );
      if (await persistScheduleForStudent(student, schedData)) ok++;
    }
    window.toast(
      `Group schedule saved to ${ok}/${ids.length} students.`,
      ok === ids.length ? "success" : "warning",
    );
  };

  window.downloadScheduleCardImage = function () {
    const target = document.getElementById("sch-render-target");
    if (!target)
      return window.toast("Please generate preview first", "warning");

    let stName = "Student";
    const isGroupMode =
      document.getElementById("sch-group-panel") &&
      document.getElementById("sch-group-panel").style.display === "block";
    if (isGroupMode) {
      const grpSel = document.getElementById("sch-batch-select");
      stName =
        grpSel && grpSel.value
          ? grpSel.options[grpSel.selectedIndex].text
          : "Group Schedule";
    } else {
      const sel = document.getElementById("sch-student-select");
      if (sel && sel.selectedIndex >= 0) {
        stName =
          sel.options[sel.selectedIndex].text.split("(")[0].trim() || "Student";
      }
    }

    if (typeof html2canvas === "undefined") {
      return window.toast("html2canvas library is not loaded", "error");
    }

    window.toast("Generating image...", "info");
    window
      .html2canvas(target, { backgroundColor: null, scale: 2 })
      .then((canvas) => {
        const link = document.createElement("a");
        link.download = `chesskidoo_Schedule_${stName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        window.toast("Image downloaded!", "success");
      })
      .catch((err) => {
        console.error("Canvas error:", err);
        window.toast("Error creating image", "error");
      });
  };

  window.shareScheduleViaWhatsApp = function () {
    const studentId = document.getElementById("sch-student-select").value;
    if (!studentId) return window.toast("Please select a student", "error");
    const student = (window.allStudents || []).find((s) => s.id == studentId);
    if (!student) return;

    const regDays = document.getElementById("sch-reg-days").value || "TBD";
    const regTime = document.getElementById("sch-reg-time").value || "TBD";
    const meetLink = document.getElementById("sch-meet-link")
      ? document.getElementById("sch-meet-link").value
      : "";
    const coachId = document.getElementById("sch-coach-select").value;
    let coachName = "TBD";
    if (coachId && (window.allCoaches || window.coaches)) {
      const coach = (window.allCoaches || window.coaches || []).find(
        (c) => c.id == coachId,
      );
      if (coach) coachName = coach.name;
    }
    const footnote = document.getElementById("sch-footnote").value || "";

    const stName = student.name;
    const phone = student.parent_phone || "";

    if (!phone) {
      return window.toast(
        "Student does not have a parent phone number saved",
        "error",
      );
    }

    // Strip any internal learning-mode marker that may have leaked into the
    // stored name (e.g. "Prajesh --offline academy") for a clean parent message.
    const cleanName =
      (stName || "Student")
        .replace(/\s*-+\s*(offline|online)(\s+academy)?\s*$/i, "")
        .trim() || stName;

    // NOTE: emojis are written as \u{...} escapes (pure ASCII in source) so
    // they can never be corrupted to "?" by file-encoding / build / transport.
    let msg = `\u{1F451} *ChessKidoo ACADEMY*\n_Official Class Schedule_\n\n`; // 👑
    msg += `Hello Sir/Madam, \u{1F44B}\n\n`; // 👋
    msg += `We are happy to inform you that *${cleanName}* has been scheduled for chess classes at our academy. \u{265F}\u{FE0F}\n\n`; // ♟️
    msg += `\u{1F5D3}\u{FE0F} *REGULAR CLASS*\n`; // 🗓️
    msg += `\u{1F4C6} Days: ${regDays}\n`; // 📆
    msg += `\u{23F1}\u{FE0F} Timing: ${regTime}\n`; // ⏱️
    msg += `\u{1F393} Coach: ${coachName}\n\n`; // 🎓
    if (meetLink) msg += `\u{1F3A5} *Join Online Class:* ${meetLink}\n\n`; // 🎥
    if (footnote) msg += `\u{2728} _${footnote}_\n`; // ✨

    const waUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  window.renderChildSchedule = function (student, coachName) {
    const wrapper = document.getElementById("child-schedule-card-container");
    if (!wrapper) {
      console.warn("[Schedule] child-schedule-card-container missing");
      return;
    }
    if (!student) {
      console.warn("[Schedule] renderChildSchedule called with no student");
      return;
    }

    const schedData = window.extractScheduleJSON(student.notes, student);
    console.log("[Schedule] renderChildSchedule id=", student.id, "name=", student.name, "notesLen=", (student.notes || "").length, "schedData=", !!schedData, "allBatches=", (window.allBatches || []).length);

    if (!schedData) {
      console.log("[Schedule] Using fallback batch data for student", student.id, "student.batch_id=", student.batch_id, "student.batch=", student.batch, "student.days=", student.days);
      const studentBatches = (window.allBatches || []).filter((b) => {
        const ids = Array.isArray(b.student_ids)
          ? b.student_ids.map(String)
          : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
        const match = ids.includes(String(student.id)) || (student.batch_id && String(student.batch_id) === String(b.id)) || (student.batch && String(student.batch) === String(b.name));
        if (!match) {
          console.log("[Schedule] batch no-match id=", b.id, "name=", b.name, "days=", b.days, "time_slot=", b.time_slot, "student_ids=", ids.slice(0, 5));
        }
        return match;
      });
      console.log("[Schedule] studentBatches fallback count", studentBatches.length, studentBatches.map(b => ({ id: b.id, name: b.name, days: b.days, time_slot: b.time_slot })));

      if (studentBatches.length > 0) {
        console.log("[Schedule] Fallback success, rendering card with batch", studentBatches[0].name, "days=", studentBatches[0].days, "time=", studentBatches[0].time_slot);
        const firstBatch = studentBatches[0];
        const coaches = window.allCoaches || window.coaches || [];
        const batchCoach = coaches.find(
          (co) => String(co.id) === String(firstBatch.coach_id) || (window.ckSameCoach && window.ckSameCoach(co.id, firstBatch.coach_id)),
        );
        const fallbackSchedData = {
          regDays: firstBatch.days || "TBD",
          regTime: firstBatch.time_slot || "TBD",
          regCoachName: batchCoach ? (batchCoach.name || batchCoach.full_name) : (coachName || "TBD"),
          meetLink:
            (firstBatch.meet_link || "") ||
            (String(firstBatch.notes || "").match(/https?:\/\/[^\s"'<>]+/)?.[0] || ""),
          isMatrixOverride: false,
        };

        wrapper.innerHTML = buildScheduleCardHtml(
          student.name,
          fallbackSchedData,
          fallbackSchedData.regCoachName,
          true,
          student.id,
          studentBatches,
        );

        const bNameEl = document.getElementById("child-live-batch-name");
        const bDaysEl = document.getElementById("child-live-days");
        const bTimeEl = document.getElementById("child-live-time");
        const bCoachEl = document.getElementById("child-live-coach");
        const bBtnWrap = document.getElementById("child-live-meet-btn-wrapper");

        if (bNameEl) bNameEl.textContent = firstBatch.name ? `${firstBatch.name} (Batch)` : `${student.name}'s Online Class`;
        if (bDaysEl) bDaysEl.textContent = fallbackSchedData.regDays;
        if (bTimeEl) bTimeEl.textContent = fallbackSchedData.regTime;
        if (bCoachEl) bCoachEl.textContent = fallbackSchedData.regCoachName;
        if (bBtnWrap) {
          if (fallbackSchedData.meetLink) {
            bBtnWrap.innerHTML = `<a href="${fallbackSchedData.meetLink}" target="_blank" rel="noopener" class="btn btn-gold btn-sm" style="font-weight:700; font-size:13px; padding:10px 18px; box-shadow:0 4px 15px rgba(212,175,55,0.4);">Join Live Class 🎥</a>`;
          } else {
            bBtnWrap.innerHTML = `<span style="font-size:12px; color:var(--ivory-dim); background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:6px;">No live link set yet</span>`;
          }
        }

        if (window.generateContextualInsight) {
          window.generateContextualInsight("child_schedule", student.id);
        }

        if (window.setChildScheduleView) {
          window.setChildScheduleView("weekly");
        }

        return;
      }

      wrapper.innerHTML = `
            <div class="card" style="padding:40px; text-align:center; color:var(--ivory-dim); width:100%;">
              <span style="font-size:36px; display:block; margin-bottom:12px;">📅</span>
              No active schedule found. Please contact the administrator.
            </div>`;
      return;
    }

    const resolvedCoachName =
      schedData.regCoachName ||
      resolveScheduleCoachName(schedData, student) ||
      coachName ||
      "TBD";

    const studentBatches = (window.allBatches || []).filter((b) => {
      const ids = Array.isArray(b.student_ids)
        ? b.student_ids.map(String)
        : (window.parseStudentIds ? window.parseStudentIds(b.student_ids) : []);
      return ids.includes(String(student.id)) || (student.batch_id && String(student.batch_id) === String(b.id)) || (student.batch && String(student.batch) === String(b.name));
    });

    if (!schedData.meetLink && studentBatches.length) {
      for (const b of studentBatches) {
        const l =
          (b.meet_link || "") ||
          (String(b.notes || "").match(/https?:\/\/[^\s"'<>]+/)?.[0] || "");
        if (l) {
          schedData.meetLink = l;
          break;
        }
      }
    }

    wrapper.innerHTML = buildScheduleCardHtml(
      student.name,
      schedData,
      resolvedCoachName,
      true,
      student.id,
      studentBatches,
    );

    const bNameEl = document.getElementById("child-live-batch-name");
    const bDaysEl = document.getElementById("child-live-days");
    const bTimeEl = document.getElementById("child-live-time");
    const bCoachEl = document.getElementById("child-live-coach");
    const bBtnWrap = document.getElementById("child-live-meet-btn-wrapper");

    const firstBatch = studentBatches[0];
    if (bNameEl) bNameEl.textContent = firstBatch?.name ? `${firstBatch.name} (Batch)` : `${student.name}'s Online Class`;
    if (bDaysEl) bDaysEl.textContent = schedData.regDays || firstBatch?.days || "TBD";
    if (bTimeEl) bTimeEl.textContent = schedData.regTime || firstBatch?.time_slot || "TBD";
    if (bCoachEl) bCoachEl.textContent = resolvedCoachName;
    if (bBtnWrap) {
      if (schedData.meetLink) {
        bBtnWrap.innerHTML = `<a href="${schedData.meetLink}" target="_blank" rel="noopener" class="btn btn-gold btn-sm" style="font-weight:700; font-size:13px; padding:10px 18px; box-shadow:0 4px 15px rgba(212,175,55,0.4);">Join Live Class 🎥</a>`;
      } else {
        bBtnWrap.innerHTML = `<span style="font-size:12px; color:var(--ivory-dim); background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:6px;">No live link set yet</span>`;
      }
    }

    if (window.generateContextualInsight) {
      window.generateContextualInsight("child_schedule", student.id);
    }

    if (window.setChildScheduleView) {
      window.setChildScheduleView("weekly");
    }
  };

  window.syncClassCalendar = function (studentId) {
    const student = (window.allStudents || []).find((s) => s.id == studentId);
    if (!student || !student.notes) return;
    const schedData = window.extractScheduleJSON(student.notes);
    if (!schedData) return;

    const coachName = resolveScheduleCoachName(schedData, student) || "Coach";
    const link = window.generateGoogleCalendarLink ? window.generateGoogleCalendarLink({
      title: (student.name || "Student") + " - Chess Class",
      days: schedData.regDays || "",
      timeStr: schedData.regTime || "",
      coachName: coachName,
      meetLink: schedData.meetLink || "",
      description: "Regular chess class with " + coachName + ". Timing: " + (schedData.regTime || "TBD")
    }) : null;

    if (link) {
      window.open(link, "_blank");
      if (window.toast) window.toast("Opening Google Calendar...", "success");
    } else {
      if (window.toast) window.toast("Unable to generate calendar link. Please check schedule.", "error");
    }
  };

  window.editStudentSchedule = function (studentId) {
    if (!window.currentUser || window.currentUser.role !== "admin") return;

    // Find the student
    const student = window.allStudents.find(
      (s) => String(s.id) === String(studentId),
    );
    if (!student) return;

    // Open the Schedule Manager tab
    if (window.setPage) window.setPage("schedule");

    // Allow DOM to render page
    setTimeout(() => {
      const studentSelect = document.getElementById("sch-student-select");
      if (studentSelect) {
        studentSelect.value = studentId;
        studentSelect.dispatchEvent(new window.Event("change")); // Trigger logic to load their existing schedule
      }
    }, 100);
  };
})();
