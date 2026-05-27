/* assets/js/db.js ---------------------------------------------------------
   ChessKidoo Resilient Database Layer (Supabase + LocalStorage Fallback)
   
   This module provides unified CRUD wrappers for users, documents, attendance,
   and ratings. It automatically handles offline environments by falling back
   to a highly robust localStorage database populated with beautiful demo data.
   ------------------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  // Default Mock Database Structure
  const DEFAULT_DB = {
    users: [
      {
        id: "a007b0b0-9b30-478f-a147-1af18dff20ce", // ADMIN_UUID from config
        email: "admin@gmail.com",
        full_name: "Academy Admin",
        role: "admin",
        userid: "admin",
        phone_number: "+91 90258 46663",
        city: "Chennai"
      },

      // Coaches
      { id: "c1", full_name: "ARIVUSELVAM", email: "arivuselvam@gmail.com", role: "coach", phone_number: "+91 98400 11223", level: "Advanced", batches: "Group 17:00, WEEKEND", timetable: "Mon-Thu 5PM, Sat 10AM", revenue: "₹18,400", classes: 18, star: 5, puzzle: "Endgames Specialist" },
      { id: "c2", full_name: "GYANASURYA", email: "gyanasurya@gmail.com", role: "coach", phone_number: "+91 98400 22334", level: "Intermediate", batches: "WEEKDAY, WEEKEND", timetable: "Tue-Fri 6PM, Sun 4PM", revenue: "₹15,000", classes: 22, star: 4, puzzle: "Tactics Specialist" },
      { id: "c3", full_name: "VISHNU", email: "vishnu@gmail.com", role: "coach", phone_number: "+91 98400 33445", level: "Advanced", batches: "FRI& SAT, Fri & Sat", timetable: "Fri-Sat 4PM-8PM", revenue: "₹24,500", classes: 20, star: 5, puzzle: "Calculation Expert" },
      { id: "c4", full_name: "HARIS", email: "haris@gmail.com", role: "coach", phone_number: "+91 98400 44556", level: "Beginner", batches: "Weekend, MORNING & EVENING", timetable: "Sat-Sun 9AM & 5PM", revenue: "₹11,200", classes: 16, star: 4, puzzle: "Junior Trainer" },
      { id: "c5", full_name: "YOGESH", email: "yogesh@gmail.com", role: "coach", phone_number: "+91 98400 55667", level: "Beginner", batches: "WEEKEND - SUNDAY&MONDAY, Evening", timetable: "Sun-Mon 5PM", revenue: "₹12,800", classes: 19, star: 4, puzzle: "Fundamentals Coach" },
      { id: "c6", full_name: "SUDHIN", email: "sudhin@gmail.com", role: "coach", phone_number: "+91 98400 66778", level: "Beginner", batches: "Evening 17:00, Group", timetable: "Mon-Wed 5PM", revenue: "₹9,600", classes: 14, star: 4, puzzle: "Pawn Structures" },
      { id: "c7", full_name: "RANJITH", email: "ranjith@gmail.com", role: "coach", phone_number: "+91 98400 77889", level: "Advanced", batches: "Weekend, Group 17:00", timetable: "Thu-Sun 5PM", revenue: "₹21,000", classes: 25, star: 5, puzzle: "Positional Master" },
      { id: "c8", full_name: "ROHITH SELVARAJ", email: "rohith@gmail.com", role: "coach", phone_number: "+91 98400 88990", level: "Beginner", batches: "Group 17:00, MORNING & EVENING", timetable: "Mon-Fri 5PM", revenue: "₹13,700", classes: 21, star: 4, puzzle: "Tactical Trainer" }
    ],

    expenses: [],
    document: [],
    resources: [],
    attendance: [],
    ratings: [],
    tourRatings: []
  };

  // Helper: Initialize localStorage if empty (never overwrite existing data)
  const initLocalStore = () => {
    Object.keys(DEFAULT_DB).forEach(key => {
      const storeKey = `ck_db_${key}`;
      if (!localStorage.getItem(storeKey)) {
        localStorage.setItem(storeKey, JSON.stringify(DEFAULT_DB[key]));
      }
    });
    // Pre-populate offline credentials in localStorage so demo accounts are fully accessible out-of-the-box
    const credsKey = 'ck_user_credentials';
    const credsVersion = 'ck_creds_version';
    if (!localStorage.getItem(credsKey) || localStorage.getItem(credsVersion) !== '3') {
      localStorage.setItem(credsVersion, '3');
      const defaultCreds = {
        'admin@chesskidoo.com': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        'admin@gmail.com': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        'student@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456 (student default)
        'arivuselvam@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'gyanasurya@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'vishnu@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'haris@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'yogesh@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'sudhin@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'ranjith@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'rohith@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248' // chess123
      };
      localStorage.setItem(credsKey, JSON.stringify(defaultCreds));
    }
  };
  initLocalStore();

  // Helper: Get local storage item (always returns array, never null)
  const getLocal = (key) => { try { return JSON.parse(localStorage.getItem(`ck_db_${key}`)) || []; } catch(e) { return []; } };

  // Helper: Set local storage item
  const setLocal = (key, data) => localStorage.setItem(`ck_db_${key}`, JSON.stringify(data));

  // Determine if Supabase can be queried.
  // A single transient failure must NOT disable the DB for the whole session
  // (that was making the app appear "disconnected" — all writes silently went
  // to localStorage and never reached Supabase). Instead we back off for a short
  // cooldown and then automatically retry, so the connection self-heals.
  let _supabaseCooldownUntil = 0;
  const _COOLDOWN_MS = 12000;
  const canUseSupabase = () => {
    if (Date.now() < _supabaseCooldownUntil) return false;
    return !!(window.supabaseClient && navigator.onLine);
  };
  const markSupabaseFailed = () => {
    _supabaseCooldownUntil = Date.now() + _COOLDOWN_MS;
    console.warn(`[ChessKidoo DB] Supabase temporarily unreachable; retrying in ${_COOLDOWN_MS/1000}s. Using local storage meanwhile.`);
  };

  /* ─── CK.db Main Object ─── */
  CK.db = {
    // --- USER PROFILE OPERATIONS ---

    // Fetch all profiles of a certain role
    async getProfiles(role = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('users').select('*');
          if (role) query = query.eq('role', role);
          // Race against a 3s timeout to prevent hanging
          const result = await Promise.race([
            query,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 6000))
          ]);
          const { data, error } = result;
          if (!error) return data || [];
          console.warn("[ChessKidoo DB] Supabase query failed, falling back to local storage:", error.message || error);
          markSupabaseFailed();
        } catch (e) {
          console.warn("[ChessKidoo DB] Supabase error, falling back:", e);
          markSupabaseFailed();
        }
      }

      const localUsers = getLocal('users');
      return role ? localUsers.filter(u => u.role === role) : localUsers;
    },

    // Fetch a single profile by user ID or custom readable userid string
    async getProfile(id, isCustomUserId = false) {
      if (canUseSupabase()) {
        try {
          const col = isCustomUserId ? 'userid' : 'id';
          const result = await Promise.race([
            window.supabaseClient.from('users').select('*').eq(col, id).maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 6000))
          ]);
          const { data, error } = result;
          // No error = successful query. data may be null (user simply not found) —
          // that is NOT a connection failure, so return it without disabling Supabase.
          if (!error) return data;
          console.warn("[ChessKidoo DB] Supabase profile query error, falling back:", error.message || error);
          markSupabaseFailed();
        } catch (e) {
          console.warn("[ChessKidoo DB] Profile query error, falling back:", e);
          markSupabaseFailed();
        }
      }

      const localUsers = getLocal('users');
      const col = isCustomUserId ? 'userid' : 'id';
      return localUsers.find(u => u[col] === id) || null;
    },

    // Save a user profile (Insert/Update)
    async saveProfile(profile) {
      if (!profile.id) profile.id = 'user-' + Date.now();
      if (!profile.userid) profile.userid = Math.floor(100 + Math.random() * 900).toString();

      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient
            .from('users')
            .upsert(profile);
          if (error) console.warn("[ChessKidoo DB] Supabase save failed, saving to local only:", error);
        } catch (e) {
          console.warn("[ChessKidoo DB] Supabase error during save:", e);
        }
      }

      // Always update local storage as a mirror/fallback
      const localUsers = getLocal('users');
      const idx = localUsers.findIndex(u => u.id === profile.id);
      if (idx !== -1) {
        localUsers[idx] = { ...localUsers[idx], ...profile };
      } else {
        localUsers.push(profile);
      }
      setLocal('users', localUsers);
      return profile;
    },

    // Delete a profile
    async deleteProfile(id) {
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient
            .from('users')
            .delete()
            .eq('id', id);
          if (error) console.warn("[ChessKidoo DB] Supabase delete failed:", error);
        } catch (e) {
          console.warn("[ChessKidoo DB] Supabase delete error:", e);
        }
      }

      const localUsers = getLocal('users');
      const filtered = localUsers.filter(u => u.id !== id);
      setLocal('users', filtered);
      return true;
    },

    // --- EXPENDITURE OPERATIONS ---
    async getExpenses() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('expenses').select('*').order('created_at', { ascending: false });
          if (!error && data) { setLocal('expenses', data); return data; }
          markSupabaseFailed();
        } catch (e) { markSupabaseFailed(); }
      }
      return getLocal('expenses') || [];
    },
    async saveExpense(expense) {
      if (!expense.id) expense.id = Date.now();
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('expenses').upsert(expense);
          if (error) console.warn('[ChessKidoo DB] Expense save error:', error);
        } catch (e) { console.warn('[ChessKidoo DB] Expense save error:', e); }
      }
      const list = getLocal('expenses') || [];
      const idx = list.findIndex(e => e.id === expense.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...expense };
      else list.unshift(expense);
      setLocal('expenses', list);
      return expense;
    },
    async deleteExpense(id) {
      if (canUseSupabase()) {
        try {
          await window.supabaseClient.from('expenses').delete().eq('id', id);
        } catch (e) { console.warn('[ChessKidoo DB] Expense delete error:', e); }
      }
      const list = getLocal('expenses') || [];
      setLocal('expenses', list.filter(e => e.id !== id));
      return true;
    },

    // --- DOCUMENT OPERATIONS ---

    // Fetch documents
    async getDocuments(level = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('document').select('*').order('created_at', { ascending: false });
          if (level) query = query.eq('level', level);
          const { data, error } = await query;
          if (!error && data) return data;
        } catch (e) {
          console.warn("[ChessKidoo DB] Documents query error, falling back:", e);
        }
      }

      const docs = getLocal('document') || [];
      return level ? docs.filter(d => d.level === level) : docs;
    },

    // Save a document record
    async saveDocument(doc) {
      if (!doc.id) doc.id = Date.now();
      if (!doc.created_at) doc.created_at = new Date().toISOString();

      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('document').upsert(doc);
          if (error) console.warn('[ChessKidoo DB] saveDocument Supabase error:', error.message);
        } catch (e) {
          console.warn("[ChessKidoo DB] Document save error, local only:", e);
        }
      }

      const docs = getLocal('document') || [];
      const idx = docs.findIndex(d => d.id === doc.id);
      if (idx !== -1) docs[idx] = { ...docs[idx], ...doc };
      else docs.push(doc);
      setLocal('document', docs);
      return doc;
    },

    // Delete a document
    async deleteDocument(id) {
      const numId = Number(id) || id;
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('document').delete().eq('id', numId);
          if (error) console.warn('[ChessKidoo DB] deleteDocument Supabase error:', error.message);
        } catch (e) {
          console.warn("[ChessKidoo DB] Document delete error, local only:", e);
        }
      }

      const docs = getLocal('document') || [];
      const filtered = docs.filter(d => d.id !== numId && d.id !== id);
      setLocal('document', filtered);
      return true;
    },


    // --- ATTENDANCE OPERATIONS ---

    // Fetch attendance log
    async getAttendance(userid = null, date = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('attendance').select('*');
          if (userid) query = query.eq('userid', userid);
          if (date) query = query.eq('date', date);
          const { data, error } = await query;
          if (!error && data) return data;
        } catch (e) {
          console.warn("[ChessKidoo DB] Attendance query error, falling back:", e);
        }
      }

      const att = getLocal('attendance') || [];
      return att.filter(a => {
        const matchUser = userid ? a.userid === userid : true;
        const matchDate = date ? a.date === date : true;
        return matchUser && matchDate;
      });
    },

    // Save attendance (Insert/Update)
    async saveAttendance(log) {
      if (!log.id) log.id = 'att-' + Date.now();
      if (!log.created_at) log.created_at = new Date().toISOString();

      if (canUseSupabase()) {
        try {
          // Upsert on (userid,date) so re-marking a student's attendance
          // updates the existing row instead of failing the unique constraint.
          const { error } = await window.supabaseClient
            .from('attendance')
            .upsert(log, { onConflict: 'userid,date' });
          if (error) console.warn("[ChessKidoo DB] Attendance save error:", error.message);
        } catch (e) {
          console.warn("[ChessKidoo DB] Attendance save error, local only:", e);
        }
      }

      const att = getLocal('attendance');
      const idx = att.findIndex(a => a.id === log.id || (a.userid === log.userid && a.date === log.date));
      if (idx !== -1) att[idx] = { ...att[idx], ...log };
      else att.push(log);
      setLocal('attendance', att);
      return log;
    },
    async runAttendanceSweep(coachName, classId, className) {
      if (!coachName) return;
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Get all student profiles
      const students = (await this.getProfiles('student')) || [];
      
      // 2. Filter students assigned to this coach (case-insensitive)
      const coachStudents = students.filter(s => s.coach && s.coach.trim().toLowerCase() === coachName.trim().toLowerCase());
      if (coachStudents.length === 0) {
        console.log(`[Attendance Sweep] No students found assigned to coach: ${coachName}`);
        return;
      }
      
      // 3. Get all attendance records for today
      const todayLogs = (await this.getAttendance(null, today)) || [];
      const presentUserIds = new Set(
        todayLogs.filter(log => log.status === 'present').map(log => log.userid)
      );
      
      console.log(`[Attendance Sweep] Sweeping for coach "${coachName}", class "${className || classId}". Today present user IDs:`, [...presentUserIds]);
      
      // 4. Mark absent for all students of this coach who are not already present
      for (const student of coachStudents) {
        const studentUserId = student.id || student.userid;
        if (!studentUserId) continue;
        
        if (!presentUserIds.has(studentUserId)) {
          const existingAbsent = todayLogs.find(log => log.userid === studentUserId && log.status === 'absent');
          if (!existingAbsent) {
            console.log(`[Attendance Sweep] Marking student ${student.full_name || studentUserId} as ABSENT`);
            const log = {
              id: 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              userid: studentUserId,
              "studentId": studentUserId,
              "studentName": student.full_name || 'Student',
              "classId": classId || 'Class',
              "className": className || 'Chess Class',
              "coachId": coachName,
              "coachName": coachName,
              "markedAt": new Date().toISOString(),
              date: today,
              status: 'absent'
            };
            await this.saveAttendance(log);
          }
        }
      }
    },


    // --- RATINGS OPERATIONS ---

    // Fetch ratings history
    async getRatings(userid) {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient
            .from('ratings')
            .select('*')
            .eq('user_id', userid)
            .order('date', { ascending: true });
          if (!error && data) return data;
        } catch (e) {
          console.warn("[ChessKidoo DB] Ratings query error, falling back:", e);
        }
      }

      const ratings = getLocal('ratings');
      return ratings
        .filter(r => r.user_id === userid || r.user_id === userid?.toString())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // Save rating log
    async saveRating(ratingLog) {
      if (!ratingLog.id) ratingLog.id = Date.now();
      if (!ratingLog.date) ratingLog.date = new Date().toISOString();

      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('ratings').upsert(ratingLog);
          if (error) console.warn("[ChessKidoo DB] Rating save error:", error.message);
        } catch (e) {
          console.warn("[ChessKidoo DB] Rating save error, local only:", e);
        }
      }

      const ratings = getLocal('ratings') || [];
      const rIdx = ratings.findIndex(r => r.id === ratingLog.id);
      if (rIdx !== -1) ratings[rIdx] = { ...ratings[rIdx], ...ratingLog };
      else ratings.push(ratingLog);
      setLocal('ratings', ratings);
      return ratingLog;
    },


    // --- TOURNAMENT RATINGS OPERATIONS ---

    // Fetch tournament history
    async getTourRatings(userid) {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient
            .from('tourRatings')
            .select('*')
            .eq('user_id', userid);
          if (!error && data) return data;
        } catch (e) {
          console.warn("[ChessKidoo DB] TourRatings query error, falling back:", e);
        }
      }

      const tours = getLocal('tourRatings') || [];
      return tours.filter(t => t.user_id === userid);
    },

    // Save tournament rating log
    async saveTourRating(tourLog) {
      if (!tourLog.id) tourLog.id = Date.now();

      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('tourRatings').upsert(tourLog);
          if (error) console.warn("[ChessKidoo DB] TourRating save error:", error.message);
        } catch (e) {
          console.warn("[ChessKidoo DB] TourRating save error, local only:", e);
        }
      }

      const tours = getLocal('tourRatings') || [];
      const tIdx = tours.findIndex(t => t.id === tourLog.id);
      if (tIdx !== -1) tours[tIdx] = { ...tours[tIdx], ...tourLog };
      else tours.push(tourLog);
      setLocal('tourRatings', tours);
      return tourLog;
    },

    // --- RESOURCES OPERATIONS ---
    async getResources(batch = null) {
      if (canUseSupabase()) {
        try {
          let q = window.supabaseClient.from('resources').select('*').order('created_at', { ascending: false });
          if (batch) q = q.eq('batch', batch);
          const { data, error } = await q;
          if (!error && data) { setLocal('resources', data); return data; }
          markSupabaseFailed();
        } catch (e) { markSupabaseFailed(); }
      }
      const local = getLocal('resources') || [];
      return batch ? local.filter(r => String(r.batch) === String(batch)) : local;
    },
    async saveResource(resource) {
      if (!resource.id) resource.id = Date.now();
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('resources').upsert(resource);
          if (error) console.warn('[ChessKidoo DB] Resource save error:', error);
        } catch (e) { console.warn('[ChessKidoo DB] Resource save error:', e); }
      }
      const list = getLocal('resources') || [];
      const idx = list.findIndex(r => r.id === resource.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...resource };
      else list.push(resource);
      setLocal('resources', list);
      return resource;
    },
    async deleteResource(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('resources').delete().eq('id', id); } catch (e) { }
      }
      const list = getLocal('resources') || [];
      setLocal('resources', list.filter(r => r.id !== id));
      return true;
    },

    // --- MEETINGS OPERATIONS ---
    async getMeetings(filters = {}) {
      if (canUseSupabase()) {
        try {
          let q = window.supabaseClient.from('meetings').select('*').order('date', { ascending: true });
          if (filters.date) q = q.eq('date', filters.date);
          if (filters.coach) q = q.eq('coach', filters.coach);
          const { data, error } = await q;
          if (!error && data) { localStorage.setItem('ck_meetings', JSON.stringify(data)); return data; }
          markSupabaseFailed();
        } catch (e) { markSupabaseFailed(); }
      }
      return JSON.parse(localStorage.getItem('ck_meetings') || '[]');
    },
    async saveMeeting(meeting) {
      if (!meeting.id) meeting.id = Date.now();
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('meetings').upsert(meeting);
          if (error) console.warn('[ChessKidoo DB] Meeting save error:', error);
        } catch (e) { console.warn('[ChessKidoo DB] Meeting save error:', e); }
      }
      const list = JSON.parse(localStorage.getItem('ck_meetings') || '[]');
      const idx = list.findIndex(m => m.id === meeting.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...meeting };
      else list.push(meeting);
      localStorage.setItem('ck_meetings', JSON.stringify(list));
      return meeting;
    },
    async deleteMeeting(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('meetings').delete().eq('id', id); } catch (e) { }
      }
      const list = JSON.parse(localStorage.getItem('ck_meetings') || '[]');
      localStorage.setItem('ck_meetings', JSON.stringify(list.filter(m => m.id !== id)));
      return true;
    },

    // --- TOURNAMENTS OPERATIONS ---
    async getTournaments() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('tournaments').select('*').order('createdAt', { ascending: false });
          if (!error && data) { localStorage.setItem('ck_tournaments', JSON.stringify(data)); return data; }
          markSupabaseFailed();
        } catch (e) { markSupabaseFailed(); }
      }
      return JSON.parse(localStorage.getItem('ck_tournaments') || '[]');
    },
    async saveTournament(t) {
      if (!t.id) t.id = Date.now().toString();
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('tournaments').upsert(t);
          if (error) console.warn('[ChessKidoo DB] Tournament save error:', error);
        } catch (e) { console.warn('[ChessKidoo DB] Tournament save error:', e); }
      }
      const list = JSON.parse(localStorage.getItem('ck_tournaments') || '[]');
      const idx = list.findIndex(x => x.id === t.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...t };
      else list.push(t);
      localStorage.setItem('ck_tournaments', JSON.stringify(list));
      return t;
    },
    async deleteTournament(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('tournaments').delete().eq('id', id); } catch (e) { }
      }
      const list = JSON.parse(localStorage.getItem('ck_tournaments') || '[]');
      localStorage.setItem('ck_tournaments', JSON.stringify(list.filter(x => x.id !== id)));
      return true;
    },

    /* Tournament-join — atomic-ish update of the participants[] array on a
       tournament row. Awards XP on join + extra XP on completion. */
    async joinTournament(tournamentId, student) {
      if (!student || !student.id) return { error: new Error('Student required') };
      const list = await this.getTournaments();
      const t = list.find(x => x.id === tournamentId);
      if (!t) return { error: new Error('Tournament not found') };
      t.participants = Array.isArray(t.participants) ? t.participants : [];
      if (t.participants.find(p => p.id === student.id)) {
        return { warning: 'Already joined' };
      }
      t.participants.push({
        id: student.id,
        name: student.full_name || student.email || 'Student',
        level: student.level || 'Beginner',
        joinedAt: new Date().toISOString(),
        status: 'registered'
      });
      await this.saveTournament(t);
      // Award join XP
      await this.awardXP(student.id, 25, `Joined tournament: ${t.title || t.name}`);
      return { data: t };
    },

    /* Award XP points to a student (used for tournament join, homework
       completion, puzzle solving, etc.). Persists `xp` field on profile
       AND adds an event log entry for the student's progress trail. */
    async awardXP(studentId, amount, reason) {
      if (!studentId || !amount) return;
      const profile = await this.getProfile(studentId);
      if (!profile) return;
      profile.xp = (parseInt(profile.xp) || 0) + amount;
      profile.star = Math.min(5, 1 + Math.floor(profile.xp / 200));
      await this.saveProfile(profile);

      // Event log
      const log = JSON.parse(localStorage.getItem('ck_xp_log') || '[]');
      log.unshift({
        userId: studentId,
        amount,
        reason: reason || 'XP earned',
        ts: new Date().toISOString()
      });
      localStorage.setItem('ck_xp_log', JSON.stringify(log.slice(0, 500)));

      if (CK && CK.showToast) {
        CK.showToast(`⭐ +${amount} XP — ${reason || 'Great work!'}`, 'success');
      }
      return profile;
    },
    // New: Classes Management (for Admin Portal)
    async getClasses() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('classes').select('*');
          if (!error && data) { localStorage.setItem('ck_admin_classes', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      return JSON.parse(localStorage.getItem('ck_admin_classes') || '[]');
    },
    async saveClass(cls) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('classes').upsert(cls); } catch (e) { }
      }
      const list = JSON.parse(localStorage.getItem('ck_admin_classes') || '[]');
      const idx = list.findIndex(c => c.id === cls.id);
      if (idx !== -1) list[idx] = cls; else list.push(cls);
      localStorage.setItem('ck_admin_classes', JSON.stringify(list));
      return cls;
    },
    async deleteClass(classId) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('classes').delete().eq('id', classId); } catch (e) { }
      }
      const list = JSON.parse(localStorage.getItem('ck_admin_classes') || '[]');
      localStorage.setItem('ck_admin_classes', JSON.stringify(list.filter(c => c.id !== classId)));
      return true;
    },

    // --- NEW: MONTHLY REPORTS ---
    async getMonthlyReports(studentId = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('monthly_reports').select('*');
          if (studentId) query = query.eq('studentId', studentId);
          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data) { localStorage.setItem('ck_monthly_reports', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_monthly_reports') || '[]');
      if (studentId) return all.filter(r => r.studentId === studentId);
      return all;
    },
    async saveMonthlyReport(report) {
      if (!report.id) report.id = 'mr-' + Date.now();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('monthly_reports').upsert(report); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_monthly_reports') || '[]');
      const idx = all.findIndex(r => r.id === report.id);
      if (idx !== -1) all[idx] = report; else all.push(report);
      localStorage.setItem('ck_monthly_reports', JSON.stringify(all));
      return report;
    },

    // --- NEW: PUZZLE SCORES ---
    async getPuzzleScores(userId = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('puzzle_scores').select('*');
          if (userId) query = query.eq('userId', userId);
          const { data, error } = await query;
          if (!error && data) { localStorage.setItem('ck_puzzle_scores', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_puzzle_scores') || '[]');
      if (userId) return all.filter(s => s.userId === userId);
      return all;
    },
    async savePuzzleScore(score) {
      if (!score.id) score.id = 'ps-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('puzzle_scores').upsert(score); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_puzzle_scores') || '[]');
      const idx = all.findIndex(s => s.id === score.id);
      if (idx !== -1) all[idx] = score; else all.push(score);
      localStorage.setItem('ck_puzzle_scores', JSON.stringify(all));
      return score;
    },

    // --- NEW: COACH ATTENDANCE ---
    async getCoachAttendance(coachId = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('coach_attendance').select('*');
          if (coachId) query = query.eq('coachId', coachId);
          const { data, error } = await query;
          if (!error && data) { localStorage.setItem('ck_coach_attendance', JSON.stringify(data)); return data; }
        } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_coach_attendance') || '[]');
      if (coachId) return all.filter(a => a.coachId === coachId);
      return all;
    },
    async saveCoachAttendance(record) {
      if (!record.id) record.id = 'ca-' + Date.now();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('coach_attendance').upsert(record); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_coach_attendance') || '[]');
      const idx = all.findIndex(a => a.id === record.id);
      if (idx !== -1) all[idx] = record; else all.push(record);
      localStorage.setItem('ck_coach_attendance', JSON.stringify(all));
      return record;
    },
    async recordCoachAttendance(coachId, classId) {
      const today = new Date().toISOString().split('T')[0];
      const record = {
        id: 'ca-' + Date.now(),
        "coachId": coachId || 'general',
        "classId": classId || 'general',
        date: today,
        "joinedAt": new Date().toISOString()
      };
      console.log(`[Coach Attendance] Marking coach "${coachId}" present for class "${classId}"`);
      return await this.saveCoachAttendance(record);
    },
    async deleteCoachAttendance(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('coach_attendance').delete().eq('id', id); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_coach_attendance') || '[]').filter(a => a.id !== id);
      localStorage.setItem('ck_coach_attendance', JSON.stringify(all));
      return true;
    },

    /* ── Assignments ── */
    async getAssignments() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('assignments').select('*').order('created_at', { ascending: false });
          if (!error && data) { localStorage.setItem('ck_assignments', JSON.stringify(data)); return data; }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem('ck_assignments') || '[]');
    },
    async saveAssignment(a) {
      if (!a.id) a.id = 'as-' + Date.now();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('assignments').upsert(a); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_assignments') || '[]');
      const idx = all.findIndex(x => x.id === a.id);
      if (idx !== -1) all[idx] = a; else all.unshift(a);
      localStorage.setItem('ck_assignments', JSON.stringify(all));
      return a;
    },
    async deleteAssignment(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('assignments').delete().eq('id', id); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_assignments') || '[]');
      const filtered = all.filter(x => x.id !== id);
      localStorage.setItem('ck_assignments', JSON.stringify(filtered));
      return true;
    },

    /* ── Submissions ── */
    async getSubmissions(assignmentId = null, studentId = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('hw_submissions').select('*');
          if (assignmentId) query = query.eq('assignment_id', assignmentId);
          if (studentId)    query = query.eq('student_id', studentId);
          const { data, error } = await query;
          if (!error && data) { localStorage.setItem('ck_hw_submissions', JSON.stringify(data)); return data; }
        } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_hw_submissions') || '[]');
      if (assignmentId && studentId) return all.filter(s => s.assignment_id === assignmentId && s.student_id === studentId);
      if (assignmentId) return all.filter(s => s.assignment_id === assignmentId);
      if (studentId)    return all.filter(s => s.student_id === studentId);
      return all;
    },
    async saveSubmission(s) {
      if (!s.id) s.id = 'sub-' + Date.now();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('hw_submissions').upsert(s); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_hw_submissions') || '[]');
      const idx = all.findIndex(x => x.id === s.id || (x.assignment_id === s.assignment_id && x.student_id === s.student_id));
      if (idx !== -1) all[idx] = s; else all.push(s);
      localStorage.setItem('ck_hw_submissions', JSON.stringify(all));
      return s;
    },

    /* ── Feedback ── */
    async getFeedback() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('feedback').select('*').order('created_at', { ascending: false });
          if (!error && data) { localStorage.setItem('ck_feedback', JSON.stringify(data)); return data; }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem('ck_feedback') || '[]');
    },
    async saveFeedback(f) {
      if (!f.id) f.id = 'fb-' + Date.now();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('feedback').upsert(f); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_feedback') || '[]');
      const idx = all.findIndex(x => x.id === f.id);
      if (idx !== -1) all[idx] = f; else all.unshift(f);
      localStorage.setItem('ck_feedback', JSON.stringify(all));
      return f;
    },
    async deleteFeedback(id) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('feedback').delete().eq('id', id); } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_feedback') || '[]').filter(x => x.id !== id);
      localStorage.setItem('ck_feedback', JSON.stringify(all));
      return true;
    }
  };

  // --- STUDENT TRACKING SYSTEM (Admin / Coach / Student Integration) ---
  CK.tracker = {
    async addReview(reviewObj) {
      const note = {
        student: reviewObj.student,
        coach: reviewObj.coach || '',
        text: reviewObj.text,
        date: reviewObj.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('coach_notes').insert(note).select();
          if (!error && data && data[0]) {
            note.id = data[0].id;
          }
        } catch(e) {}
      }
      if (!note.id) note.id = Date.now();
      const notes = JSON.parse(localStorage.getItem('ck_coach_notes')) || [];
      notes.push(note);
      localStorage.setItem('ck_coach_notes', JSON.stringify(notes));

      // Update student's last_note and save a rating snapshot (do NOT blindly +15 every call)
      const students = (await CK.db.getProfiles('student')) || [];
      const s = students.find(u => (u.full_name || '').toLowerCase() === reviewObj.student.toLowerCase());
      if (s) {
        s.last_note = reviewObj.text;
        // Only bump rating if reviewer explicitly provided a delta
        const delta = parseInt(reviewObj.ratingDelta) || 0;
        if (delta !== 0) {
          s.rating = Math.max(100, (s.rating || 800) + delta);
          // Save rating snapshot to ratings table for chart history
          await CK.db.saveRating({
            id: Date.now(),
            user_id: s.id,
            online: s.rating,
            international: parseInt(s.fide_rating) || 0,
            date: new Date().toISOString()
          });
        }
        await CK.db.saveProfile(s);
      }

      if (window.CK && CK.student && typeof CK.student.renderCoachReviews === 'function') {
        CK.student.renderCoachReviews();
      }
    },

    async deleteReview(id) {
      if (canUseSupabase()) {
        try {
          await window.supabaseClient.from('coach_notes').delete().eq('id', id);
        } catch(e) {}
      }
      const notes = JSON.parse(localStorage.getItem('ck_coach_notes') || '[]');
      const filtered = notes.filter(n => String(n.id) !== String(id));
      localStorage.setItem('ck_coach_notes', JSON.stringify(filtered));
      return true;
    },

    async getReviews(studentName) {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('coach_notes').select('*').order('created_at', { ascending: false });
          if (!error && data) { localStorage.setItem('ck_coach_notes', JSON.stringify(data)); }
        } catch(e) {}
      }
      const notes = JSON.parse(localStorage.getItem('ck_coach_notes') || '[]');
      if (!studentName) return notes;
      return notes.filter(n => (n.student || '').toLowerCase() === studentName.toLowerCase()).reverse();
    }
  };

  /* ─────────────────────────────────────────────────────────
     ACCESS MANAGEMENT — Admin sets per-user credentials
  ───────────────────────────────────────────────────────── */
  CK.accessManager = {
    _getAdminAuth() {
      if (!window.APP_CONFIG?.SUPABASE_URL || !window.APP_CONFIG?.SUPABASE_ANON_KEY) return null;
      if (!this._tempClient && window.supabase) {
        // Create a temporary, non-persisting client so creating users doesn't log the admin out!
        this._tempClient = window.supabase.createClient(
          window.APP_CONFIG.SUPABASE_URL, 
          window.APP_CONFIG.SUPABASE_ANON_KEY, 
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
      }
      return this._tempClient ? this._tempClient.auth : null;
    },

    async getCreds() {
      console.warn("getCreds() is deprecated. Passwords are securely managed by Supabase Auth and cannot be extracted.");
      return {};
    },

    // SHA-256 password hash → hex
    async _hashPassword(password) {
      try {
        const data = new TextEncoder().encode(password);
        const buf  = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('[Auth] hashPassword crypto.subtle failed:', e);
        return null;
      }
    },

    // Mirror the password into the localStorage SHA-256 credentials map so
    // the login flow in auth.js can authenticate this user even when
    // Supabase Auth is unavailable (offline, email-already-registered, etc).
    async _saveLocalCredential(email, password) {
      if (!email || !password) return false;
      const hash = await this._hashPassword(password);
      if (!hash) return false;
      try {
        const creds = JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
        creds[email.toLowerCase()] = hash;
        localStorage.setItem('ck_user_credentials', JSON.stringify(creds));
        return true;
      } catch (e) {
        console.warn('[Auth] could not write local credentials:', e);
        return false;
      }
    },

    /* setCredential — best-effort: ALWAYS writes the local hash AND tries
       Supabase Auth signUp. Success if EITHER succeeds. Email-already-
       registered in Supabase is treated as success (admin is just resetting
       the local password for an existing user). */
    async setCredential(email, password) {
      if (!email || !password) {
        return { error: new Error('Email and password required') };
      }
      email = email.toLowerCase();

      // 1. ALWAYS save to local hash so the user can log in immediately
      //    even if Supabase signUp fails or the email is already taken.
      const localOk = await this._saveLocalCredential(email, password);

      // 2. Try Supabase signUp (best effort — non-fatal if it fails).
      let supabaseUser = null;
      let supabaseError = null;
      const auth = this._getAdminAuth();
      if (auth) {
        try {
          const { data, error } = await auth.signUp({ email, password });
          if (error) {
            supabaseError = error;
            // "User already registered" is fine — we still updated the local
            // hash so login will work via the offline-mode fallthrough.
            if (/already|registered|exist/i.test(error.message || '')) {
              return {
                data: { user: { id: 'local-' + Date.now(), email } },
                warning: 'Supabase: user already exists; local credentials updated.'
              };
            }
          } else {
            supabaseUser = data?.user;
          }
        } catch(e) {
          supabaseError = e;
          console.warn('[Auth] Supabase signUp error:', e);
        }
      }

      // Return success if EITHER path worked
      if (supabaseUser || localOk) {
        return {
          data: { user: supabaseUser || { id: 'local-' + Date.now(), email } },
          warning: supabaseError ? `Supabase: ${supabaseError.message || supabaseError}. Local credentials saved.` : null
        };
      }
      return { error: supabaseError || new Error('Failed to save credentials') };
    },

    async removeCredential(email) {
      console.warn("User deletion must be performed securely in the Supabase Auth Dashboard.");
    },

    /* Give all students/coaches their own access using their email + a shared password */
    async bulkSetRolePassword(role, password) {
      const users = (await CK.db.getProfiles(role)) || [];
      for (const u of users) {
        if (u.email) await this.setCredential(u.email, password);
      }
      return users.length;
    },

    /* Add a parent account linked to a child */
    async addParent(parentName, parentEmail, parentPassword, childEmail) {
      const uid = () => 'par-' + Date.now().toString(36);
      const parent = {
        id: uid(), full_name: parentName, email: parentEmail,
        role: 'parent', childEmail, userid: 'p-' + Date.now().toString(36)
      };
      await CK.db.saveProfile(parent);
      await this.setCredential(parentEmail, parentPassword);
      return parent;
    },

    async renderAccessTable(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const users = (await CK.db.getProfiles()) || [];
      const nonAdmin = users.filter(u => u.role !== 'admin');
      const creds = await this.getCreds();
      el.innerHTML = `
        <div class="acc-search-row">
          <input class="p-input" id="accSearch" placeholder="Search by name or email…" oninput="CK.accessManager._filter(this.value)">
          <select class="p-input" id="accRoleFilter" style="width:140px" onchange="CK.accessManager._filter(document.getElementById('accSearch').value)">
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="coach">Coaches</option>
            <option value="parent">Parents</option>
          </select>
        </div>
        <div class="acc-bulk-row">
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.bulkDialog('student')">🔑 Set Password for All Students</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.bulkDialog('coach')">🔑 Set Password for All Coaches</button>
          <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.accessManager.addParentDialog()">➕ Add Parent Account</button>
        </div>
        <table class="p-table" style="width:100%;margin-top:12px" id="accTable">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Has Access</th><th>Actions</th></tr></thead>
          <tbody id="accTableBody">
            ${this._rows(nonAdmin, creds)}
          </tbody>
        </table>`;
    },

    _rows(users, creds) {
      const _e = CK.esc || (s => s);
      return users.map(u => {
        const safeEmail = _e(u.email?.replace(/'/g,'&apos;') || '');
        const safeName  = _e((u.full_name||'').replace(/'/g,'&apos;'));
        const safeId    = _e((u.id||'').replace(/'/g,'&apos;'));
        const hasAccess = u.email && creds[u.email.toLowerCase()];
        return `
        <tr data-name="${_e((u.full_name||'').toLowerCase())}" data-email="${_e((u.email||'').toLowerCase())}" data-role="${_e(u.role)}">
          <td style="font-weight:600">${_e(u.full_name || '—')}</td>
          <td style="font-family:monospace;font-size:0.82rem">${_e(u.email || '—')}</td>
          <td>
            <select class="p-input" style="height:28px;padding:0 6px;font-size:0.8rem;width:100px"
                onchange="CK.accessManager.changeRole('${safeId}','${safeEmail}',this.value,this)">
              ${['student','coach','parent'].map(r =>
                `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </td>
          <td>${hasAccess ? '<span class="p-badge p-badge-green">✓ Active</span>' : '<span class="p-badge p-badge-red">No Access</span>'}</td>
          <td style="display:flex;gap:4px;flex-wrap:wrap">
            ${u.email ? `<button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.setDialog('${safeEmail}','${safeName}')">🔑 Set Password</button>` : ''}
            ${hasAccess ? `<button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" onclick="CK.accessManager.revokeAccess('${safeEmail}')">✕ Revoke</button>` : ''}
            ${u.role === 'parent' ? `<button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.setChildDialog('${safeId}','${safeName}')">🔗 Set Child</button>` : ''}
          </td>
        </tr>`;
      }).join('');
    },

    async changeRole(userId, email, newRole, selectEl) {
      if (!userId) return;
      const profile = await CK.db.getProfile(userId);
      if (!profile) { CK.showToast('User not found.', 'error'); return; }
      profile.role = newRole;
      await CK.db.saveProfile(profile);
      CK.showToast(`Role changed to ${newRole} for ${profile.full_name || email}.`, 'success');
      // Update row role filter attribute
      const tr = selectEl?.closest('tr');
      if (tr) tr.dataset.role = newRole;
    },

    async setChildDialog(parentId, parentName) {
      const childEmail = prompt(`Enter the student's email to link as child for ${parentName}:`);
      if (!childEmail) return;
      const profile = await CK.db.getProfile(parentId);
      if (!profile) return CK.showToast('Parent profile not found.', 'error');
      profile.childEmail = childEmail.trim().toLowerCase();
      await CK.db.saveProfile(profile);
      CK.showToast(`Child (${childEmail}) linked to ${parentName}.`, 'success');
    },

    _filter(query) {
      const role = document.getElementById('accRoleFilter')?.value || '';
      document.querySelectorAll('#accTable tbody tr').forEach(tr => {
        const nameMatch  = tr.dataset.name?.includes(query.toLowerCase());
        const emailMatch = tr.dataset.email?.includes(query.toLowerCase());
        const roleMatch  = !role || tr.dataset.role === role;
        tr.style.display = ((nameMatch || emailMatch) && roleMatch) ? '' : 'none';
      });
    },

    setDialog(email, name) {
      const pass = prompt(`Set password for ${name} (${email}):`);
      if (!pass) return;
      this.setCredential(email, pass);
      CK.showToast(`Access granted to ${name}!`, 'success');
      this.renderAccessTable('adminAccessTable');
    },

    revokeAccess(email) {
      if (!confirm(`Revoke access for ${email}?`)) return;
      this.removeCredential(email);
      CK.showToast('Access revoked.', 'success');
      this.renderAccessTable('adminAccessTable');
    },

    async bulkDialog(role) {
      const pass = prompt(`Set one password for ALL ${role}s:`);
      if (!pass) return;
      const count = await this.bulkSetRolePassword(role, pass);
      CK.showToast(`Password set for ${count} ${role}s!`, 'success');
      this.renderAccessTable('adminAccessTable');
    },

    addParentDialog() {
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.innerHTML = `
        <div class="p-modal">
          <div class="p-modal-header"><h3 class="p-modal-title">➕ Add Parent Account</h3><button class="p-modal-close" onclick="this.closest('.p-modal-overlay').remove()">✕</button></div>
          <div class="p-modal-body">
            <div class="p-form-group"><label class="p-form-label">Parent Name</label><input class="p-form-control" id="addp_name" placeholder="e.g. Ravi Shankar"></div>
            <div class="p-form-group"><label class="p-form-label">Parent Email</label><input class="p-form-control" type="email" id="addp_email" placeholder="parent@gmail.com"></div>
            <div class="p-form-group"><label class="p-form-label">Password</label><input class="p-form-control" type="password" id="addp_pass" placeholder="Password for parent login"></div>
            <div class="p-form-group"><label class="p-form-label">Child's Email</label><input class="p-form-control" type="email" id="addp_child" placeholder="child@gmail.com"></div>
          </div>
          <div class="p-modal-footer">
            <button class="p-btn p-btn-ghost" onclick="this.closest('.p-modal-overlay').remove()">Cancel</button>
            <button class="p-btn p-btn-blue" onclick="CK.accessManager._doAddParent()">➕ Create Parent</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    },

    async _doAddParent() {
      const name  = document.getElementById('addp_name')?.value.trim();
      const email = document.getElementById('addp_email')?.value.trim();
      const pass  = document.getElementById('addp_pass')?.value;
      const child = document.getElementById('addp_child')?.value.trim();
      if (!name || !email || !pass) { CK.showToast('Fill all fields', 'warning'); return; }
      await this.addParent(name, email, pass, child);
      CK.showToast(`Parent account created for ${name}!`, 'success');
      document.querySelector('.p-modal-overlay')?.remove();
      this.renderAccessTable('adminAccessTable');
    }
  };

  // --- BATCH CLASS & ROOM LINK MANAGEMENT ---
  CK.batchManager = {
    async getLinks() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('batch_links').select('*');
          if (!error && data) {
            const map = {};
            data.forEach(item => { map[item.batch_level] = item.link; });
            localStorage.setItem('ck_batch_links', JSON.stringify(map));
            return map;
          }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem('ck_batch_links')) || {
        'Beginner': 'https://meet.google.com/beg-inner-room',
        'Intermediate': 'https://meet.google.com/int-strategy-abc',
        'Advanced': 'https://meet.google.com/adv-endgames-xyz'
      };
    },
    async saveLink(batchLevel, link) {
      if (canUseSupabase()) {
        try {
          await window.supabaseClient.from('batch_links').upsert({ batch_level: batchLevel, link });
        } catch(e) {}
      }
      const links = JSON.parse(localStorage.getItem('ck_batch_links') || '{}');
      links[batchLevel] = link;
      localStorage.setItem('ck_batch_links', JSON.stringify(links));
      if (window.CK && CK.showToast) {
        CK.showToast(`Updated Google Meet link for ${batchLevel} Batch!`, 'success');
      }
    }
  };

})();
