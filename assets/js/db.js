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
        id: "a0000000-0000-4000-8000-000000000001", // ADMIN_UUID — must match Supabase + config.js
        email: "admin@gmail.com",
        full_name: "Academy Admin",
        role: "admin",
        userid: "admin",
        phone_number: "+91 90258 46663",
        city: "Chennai"
      },

      // ── Coaches (batches use standard format: CoachName Batch# Time) ──
      { id: "c0c0c0c0-0001-4000-8000-000000000001", full_name: "ARIVUSELVAM", email: "arivuselvam@gmail.com", role: "coach", phone_number: "+91 98400 11223", level: "Advanced", batches: "ARIVUSELVAM Batch 1 7:00 PM - 8:00 PM, ARIVUSELVAM Batch 2 8:00 PM - 9:00 PM, ARIVUSELVAM Batch 3 8:00 PM - 9:00 PM, ARIVUSELVAM Batch 4 7:00 PM - 8:00 PM", timetable: "Mon/Wed 7-9PM, Tue/Thu 7-8PM", revenue: "₹18,400", classes: 18, star: 5, puzzle: 0, specialization: "Endgames Specialist" },
      { id: "c0c0c0c0-0002-4000-8000-000000000002", full_name: "GYANASURYA", email: "gyanasurya@gmail.com", role: "coach", phone_number: "+91 98400 22334", level: "Beginner", batches: "GYANASURYA Batch 1 5:40 AM - 6:20 AM, GYANASURYA Batch 2 7:00 AM - 8:00 AM, GYANASURYA Batch 3 7:00 PM - 8:00 PM", timetable: "Wed/Fri 5:40AM-8AM, Sat/Sun 7PM", revenue: "₹15,000", classes: 22, star: 4, puzzle: 0, specialization: "Tactics Specialist" },
      { id: "c0c0c0c0-0003-4000-8000-000000000003", full_name: "VISHNU", email: "vishnu@gmail.com", role: "coach", phone_number: "+91 98400 33445", level: "Intermediate", batches: "VISHNU Batch 1 6:00 PM - 7:00 PM, VISHNU Batch 2 7:00 PM - 8:00 PM, VISHNU Batch 3 7:00 PM - 8:00 PM", timetable: "Wed/Thu 6-8PM, Fri/Sat 7-8PM", revenue: "₹24,500", classes: 20, star: 5, puzzle: 0, specialization: "Calculation Expert" },
      { id: "c0c0c0c0-0004-4000-8000-000000000004", full_name: "HARIS", email: "haris@gmail.com", role: "coach", phone_number: "+91 98400 44556", level: "Beginner", batches: "HARIS Batch 1", timetable: "Sat-Sun 9AM", revenue: "₹11,200", classes: 16, star: 4, puzzle: 0, specialization: "Junior Trainer" },
      { id: "c0c0c0c0-0005-4000-8000-000000000005", full_name: "YOGESH", email: "yogesh@gmail.com", role: "coach", phone_number: "+91 98400 55667", level: "Beginner", batches: "YOGESH Batch 1 6:00 AM - 7:00 AM, YOGESH Batch 2 6:00 PM - 7:00 PM, YOGESH Batch 3 7:30 PM - 8:30 PM", timetable: "Thu/Fri 6AM, Sat/Sun 6-8:30PM", revenue: "₹12,800", classes: 19, star: 4, puzzle: 0, specialization: "Fundamentals Coach" },
      { id: "c0c0c0c0-0006-4000-8000-000000000006", full_name: "SUDHIN", email: "sudhin@gmail.com", role: "coach", phone_number: "+91 98400 66778", level: "Beginner", batches: "SUDHIN Batch 1 7:00 PM - 8:00 PM", timetable: "Sat/Sun 7PM-8PM", revenue: "₹9,600", classes: 14, star: 4, puzzle: 0, specialization: "Pawn Structures" },
      { id: "c0c0c0c0-0007-4000-8000-000000000007", full_name: "RANJITH", email: "ranjith@gmail.com", role: "coach", phone_number: "+91 98400 77889", level: "Advanced", batches: "RANJITH Batch 1 2:45 PM - 3:45 PM, RANJITH Batch 2 7:00 PM - 8:00 PM", timetable: "Wed/Fri 2:45PM, Sat/Sun 7PM", revenue: "₹21,000", classes: 25, star: 5, puzzle: 0, specialization: "Positional Master" },
      { id: "c0c0c0c0-0008-4000-8000-000000000008", full_name: "ROHITH SELVARAJ", email: "rohith@gmail.com", role: "coach", phone_number: "+91 98400 88990", level: "Beginner", batches: "ROHITH SELVARAJ Batch 1 5:00 AM - 5:40 AM, ROHITH SELVARAJ Batch 2 8:00 PM - 9:00 PM", timetable: "Tue/Wed/Sat 5AM, Wed/Thu 8PM", revenue: "₹13,700", classes: 21, star: 4, puzzle: 0, specialization: "Tactical Trainer" },
      { id: "c0c0c0c0-0009-4000-8000-000000000009", full_name: "VASANTH KUMAR", email: "vasanth@gmail.com", role: "coach", phone_number: "+91 98400 99001", level: "Beginner", batches: "VASANTH KUMAR Batch 1 7:00 PM - 7:40 PM", timetable: "Mon/Wed 7PM-7:40PM", revenue: "₹8,500", classes: 12, star: 4, puzzle: 0, specialization: "Opening Prep" },

      // ── Students (from Master Schedule Matrix) ──
      // --- ROHITH SELVARAJ students ---
      { id: "s-rohith-1", full_name: "Sreelaxmi", email: "sreelaxmi@gmail.com", role: "student", coach: "ROHITH SELVARAJ", batch: "ROHITH SELVARAJ Batch 1 5:00 AM - 5:40 AM", level: "Beginner", rating: 850, join_date: "2026-05-01", session: "Individual", schedule: "Tue/Wed/Sat 5:00 AM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-rohith-2", full_name: "Samiksha", email: "samiksha@gmail.com", role: "student", coach: "ROHITH SELVARAJ", batch: "ROHITH SELVARAJ Batch 2 8:00 PM - 9:00 PM", level: "Beginner", rating: 800, join_date: "2026-05-05", session: "Individual", schedule: "Wed/Thu 8:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },

      // --- RANJITH students ---
      { id: "s-ranjith-1", full_name: "Sakthi", email: "sakthi@gmail.com", role: "student", coach: "RANJITH", batch: "RANJITH Batch 1 2:45 PM - 3:45 PM", level: "Advanced", rating: 1350, join_date: "2026-04-15", session: "Group", schedule: "Wed/Fri 2:45 PM", fee: "3000", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-ranjith-2", full_name: "Sathya", email: "sathya@gmail.com", role: "student", coach: "RANJITH", batch: "RANJITH Batch 1 2:45 PM - 3:45 PM", level: "Advanced", rating: 1300, join_date: "2026-04-15", session: "Group", schedule: "Wed/Fri 2:45 PM", fee: "3000", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-ranjith-3", full_name: "Riyas", email: "riyas@gmail.com", role: "student", coach: "RANJITH", batch: "RANJITH Batch 2 7:00 PM - 8:00 PM", level: "Advanced", rating: 1250, join_date: "2026-04-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "3000", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-ranjith-4", full_name: "Susil", email: "susil@gmail.com", role: "student", coach: "RANJITH", batch: "RANJITH Batch 2 7:00 PM - 8:00 PM", level: "Advanced", rating: 1200, join_date: "2026-04-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "3000", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-ranjith-5", full_name: "Varun", email: "varun@gmail.com", role: "student", coach: "RANJITH", batch: "RANJITH Batch 2 7:00 PM - 8:00 PM", level: "Advanced", rating: 1280, join_date: "2026-04-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "3000", status: "Paid", due_date: "14-Jul-2026" },

      // --- GYANASURYA students ---
      { id: "s-gyana-1", full_name: "Ekash", email: "ekash@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 1 5:40 AM - 6:20 AM", level: "Beginner", rating: 750, join_date: "2026-05-10", session: "Individual", schedule: "Wed/Fri 5:40 AM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-gyana-2", full_name: "Nigunan", email: "nigunan@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 2 7:00 AM - 8:00 AM", level: "Beginner", rating: 700, join_date: "2026-05-12", session: "Group", schedule: "Wed/Fri 7:00 AM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-gyana-3", full_name: "Aara", email: "aara@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 3 7:00 PM - 8:00 PM", level: "Beginner", rating: 680, join_date: "2026-05-15", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-gyana-4", full_name: "Anush", email: "anush@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 3 7:00 PM - 8:00 PM", level: "Beginner", rating: 720, join_date: "2026-05-15", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-gyana-5", full_name: "Rakshitha", email: "rakshitha@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 3 7:00 PM - 8:00 PM", level: "Beginner", rating: 690, join_date: "2026-05-15", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-gyana-6", full_name: "Shervin", email: "shervin@gmail.com", role: "student", coach: "GYANASURYA", batch: "GYANASURYA Batch 3 7:00 PM - 8:00 PM", level: "Beginner", rating: 710, join_date: "2026-05-15", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },

      // --- ARIVUSELVAM students ---
      { id: "s-arivu-1", full_name: "Eduveer", email: "eduveer@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 1 7:00 PM - 8:00 PM", level: "Advanced", rating: 1400, join_date: "2026-04-10", session: "Group", schedule: "Mon/Wed 7:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-2", full_name: "Yugan", email: "yugan@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 1 7:00 PM - 8:00 PM", level: "Advanced", rating: 1380, join_date: "2026-04-10", session: "Group", schedule: "Mon/Wed 7:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-3", full_name: "Aarunya", email: "aarunya@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 2 8:00 PM - 9:00 PM", level: "Advanced", rating: 1250, join_date: "2026-04-12", session: "Group", schedule: "Mon/Wed 8:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-4", full_name: "Magathi", email: "magathi@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 2 8:00 PM - 9:00 PM", level: "Advanced", rating: 1200, join_date: "2026-04-12", session: "Group", schedule: "Mon/Wed 8:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-5", full_name: "Pranav", email: "pranav@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 2 8:00 PM - 9:00 PM", level: "Advanced", rating: 1300, join_date: "2026-04-12", session: "Group", schedule: "Mon/Wed 8:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-6", full_name: "Aatish", email: "aatish@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 3 8:00 PM - 9:00 PM", level: "Advanced", rating: 1150, join_date: "2026-04-18", session: "Group", schedule: "Mon/Wed 8:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-7", full_name: "Uttsan", email: "uttsan@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 3 8:00 PM - 9:00 PM", level: "Advanced", rating: 1180, join_date: "2026-04-18", session: "Group", schedule: "Mon/Wed 8:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-8", full_name: "Mukilan", email: "mukilan@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 4 7:00 PM - 8:00 PM", level: "Advanced", rating: 1320, join_date: "2026-04-22", session: "Group", schedule: "Tue/Thu 7:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-arivu-9", full_name: "Sachin", email: "sachin@gmail.com", role: "student", coach: "ARIVUSELVAM", batch: "ARIVUSELVAM Batch 4 7:00 PM - 8:00 PM", level: "Advanced", rating: 1290, join_date: "2026-04-22", session: "Group", schedule: "Tue/Thu 7:00 PM", fee: "3500", status: "Paid", due_date: "14-Jul-2026" },

      // --- YOGESH students ---
      { id: "s-yogesh-1", full_name: "Jeevan", email: "jeevan@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 1 6:00 AM - 7:00 AM", level: "Beginner", rating: 780, join_date: "2026-05-08", session: "Individual", schedule: "Thu/Fri 6:00 AM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-yogesh-2", full_name: "Sai", email: "sai@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 2 6:00 PM - 7:00 PM", level: "Beginner", rating: 820, join_date: "2026-05-10", session: "Group", schedule: "Sat/Sun 6:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-yogesh-3", full_name: "Venkatesh Son", email: "venkateshson@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 2 6:00 PM - 7:00 PM", level: "Beginner", rating: 790, join_date: "2026-05-10", session: "Group", schedule: "Sat/Sun 6:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-yogesh-4", full_name: "Athvik", email: "athvik@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 3 7:30 PM - 8:30 PM", level: "Beginner", rating: 760, join_date: "2026-05-12", session: "Group", schedule: "Sat/Sun 7:30 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-yogesh-5", full_name: "Mohammad Rayan", email: "mohammadrayan@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 3 7:30 PM - 8:30 PM", level: "Beginner", rating: 740, join_date: "2026-05-12", session: "Group", schedule: "Sat/Sun 7:30 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-yogesh-6", full_name: "Pranesh", email: "pranesh@gmail.com", role: "student", coach: "YOGESH", batch: "YOGESH Batch 3 7:30 PM - 8:30 PM", level: "Beginner", rating: 810, join_date: "2026-05-12", session: "Group", schedule: "Sat/Sun 7:30 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },

      // --- SUDHIN students ---
      { id: "s-sudhin-1", full_name: "Aakif", email: "aakif@gmail.com", role: "student", coach: "SUDHIN", batch: "SUDHIN Batch 1 7:00 PM - 8:00 PM", level: "Beginner", rating: 700, join_date: "2026-05-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-sudhin-2", full_name: "Pranish", email: "pranish@gmail.com", role: "student", coach: "SUDHIN", batch: "SUDHIN Batch 1 7:00 PM - 8:00 PM", level: "Beginner", rating: 720, join_date: "2026-05-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-sudhin-3", full_name: "Venkatesh Daughter", email: "venkateshdaughter@gmail.com", role: "student", coach: "SUDHIN", batch: "SUDHIN Batch 1 7:00 PM - 8:00 PM", level: "Beginner", rating: 680, join_date: "2026-05-20", session: "Group", schedule: "Sat/Sun 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },

      // --- VASANTH KUMAR students ---
      { id: "s-vasanth-1", full_name: "Aaradhya", email: "aaradhya@gmail.com", role: "student", coach: "VASANTH KUMAR", batch: "VASANTH KUMAR Batch 1 7:00 PM - 7:40 PM", level: "Beginner", rating: 650, join_date: "2026-05-25", session: "Individual", schedule: "Mon/Wed 7:00 PM", fee: "2200", status: "Paid", due_date: "14-Jul-2026" },

      // --- VISHNU students ---
      { id: "s-vishnu-1", full_name: "Abinitha", email: "abinitha@gmail.com", role: "student", coach: "VISHNU", batch: "VISHNU Batch 1 6:00 PM - 7:00 PM", level: "Intermediate", rating: 1050, join_date: "2026-04-28", session: "Individual", schedule: "Wed/Thu 6:00 PM", fee: "2800", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-vishnu-2", full_name: "Yogesh (Student)", email: "yogeshstudent@gmail.com", role: "student", coach: "VISHNU", batch: "VISHNU Batch 2 7:00 PM - 8:00 PM", level: "Intermediate", rating: 1100, join_date: "2026-04-28", session: "Individual", schedule: "Wed/Thu 7:00 PM", fee: "2800", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-vishnu-3", full_name: "Akmal", email: "akmal@gmail.com", role: "student", coach: "VISHNU", batch: "VISHNU Batch 3 7:00 PM - 8:00 PM", level: "Intermediate", rating: 980, join_date: "2026-05-02", session: "Group", schedule: "Fri/Sat 7:00 PM", fee: "2800", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-vishnu-4", full_name: "Anfal", email: "anfal@gmail.com", role: "student", coach: "VISHNU", batch: "VISHNU Batch 3 7:00 PM - 8:00 PM", level: "Intermediate", rating: 950, join_date: "2026-05-02", session: "Group", schedule: "Fri/Sat 7:00 PM", fee: "2800", status: "Paid", due_date: "14-Jul-2026" },
      { id: "s-vishnu-5", full_name: "Buvargan", email: "buvargan@gmail.com", role: "student", coach: "VISHNU", batch: "VISHNU Batch 3 7:00 PM - 8:00 PM", level: "Intermediate", rating: 1020, join_date: "2026-05-02", session: "Group", schedule: "Fri/Sat 7:00 PM", fee: "2800", status: "Paid", due_date: "14-Jul-2026" }
    ],

    // ── Global Batch Registry (derived from coaches for quick lookups) ──
    batches: [
      { id: "b-rohith-1", coach: "ROHITH SELVARAJ", batchName: "ROHITH SELVARAJ Batch 1 5:00 AM - 5:40 AM", time: "5:00 AM - 5:40 AM", days: ["Tue","Wed","Sat"], students: ["Sreelaxmi"] },
      { id: "b-rohith-2", coach: "ROHITH SELVARAJ", batchName: "ROHITH SELVARAJ Batch 2 8:00 PM - 9:00 PM", time: "8:00 PM - 9:00 PM", days: ["Wed","Thu"], students: ["Samiksha"] },
      { id: "b-ranjith-1", coach: "RANJITH", batchName: "RANJITH Batch 1 2:45 PM - 3:45 PM", time: "2:45 PM - 3:45 PM", days: ["Wed","Fri"], students: ["Sakthi","Sathya"] },
      { id: "b-ranjith-2", coach: "RANJITH", batchName: "RANJITH Batch 2 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Sat","Sun"], students: ["Riyas","Susil","Varun"] },
      { id: "b-gyana-1", coach: "GYANASURYA", batchName: "GYANASURYA Batch 1 5:40 AM - 6:20 AM", time: "5:40 AM - 6:20 AM", days: ["Wed","Fri"], students: ["Ekash"] },
      { id: "b-gyana-2", coach: "GYANASURYA", batchName: "GYANASURYA Batch 2 7:00 AM - 8:00 AM", time: "7:00 AM - 8:00 AM", days: ["Wed","Fri"], students: ["Nigunan"] },
      { id: "b-gyana-3", coach: "GYANASURYA", batchName: "GYANASURYA Batch 3 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Sat","Sun"], students: ["Aara","Anush","Rakshitha","Shervin"] },
      { id: "b-arivu-1", coach: "ARIVUSELVAM", batchName: "ARIVUSELVAM Batch 1 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Mon","Wed"], students: ["Eduveer","Yugan"] },
      { id: "b-arivu-2", coach: "ARIVUSELVAM", batchName: "ARIVUSELVAM Batch 2 8:00 PM - 9:00 PM", time: "8:00 PM - 9:00 PM", days: ["Mon","Wed"], students: ["Aarunya","Magathi","Pranav"] },
      { id: "b-arivu-3", coach: "ARIVUSELVAM", batchName: "ARIVUSELVAM Batch 3 8:00 PM - 9:00 PM", time: "8:00 PM - 9:00 PM", days: ["Mon","Wed"], students: ["Aatish","Uttsan"] },
      { id: "b-arivu-4", coach: "ARIVUSELVAM", batchName: "ARIVUSELVAM Batch 4 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Tue","Thu"], students: ["Mukilan","Sachin"] },
      { id: "b-yogesh-1", coach: "YOGESH", batchName: "YOGESH Batch 1 6:00 AM - 7:00 AM", time: "6:00 AM - 7:00 AM", days: ["Thu","Fri"], students: ["Jeevan"] },
      { id: "b-yogesh-2", coach: "YOGESH", batchName: "YOGESH Batch 2 6:00 PM - 7:00 PM", time: "6:00 PM - 7:00 PM", days: ["Sat","Sun"], students: ["Sai","Venkatesh Son"] },
      { id: "b-yogesh-3", coach: "YOGESH", batchName: "YOGESH Batch 3 7:30 PM - 8:30 PM", time: "7:30 PM - 8:30 PM", days: ["Sat","Sun"], students: ["Athvik","Mohammad Rayan","Pranesh"] },
      { id: "b-sudhin-1", coach: "SUDHIN", batchName: "SUDHIN Batch 1 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Sat","Sun"], students: ["Aakif","Pranish","Venkatesh Daughter"] },
      { id: "b-vasanth-1", coach: "VASANTH KUMAR", batchName: "VASANTH KUMAR Batch 1 7:00 PM - 7:40 PM", time: "7:00 PM - 7:40 PM", days: ["Mon","Wed"], students: ["Aaradhya"] },
      { id: "b-vishnu-1", coach: "VISHNU", batchName: "VISHNU Batch 1 6:00 PM - 7:00 PM", time: "6:00 PM - 7:00 PM", days: ["Wed","Thu"], students: ["Abinitha"] },
      { id: "b-vishnu-2", coach: "VISHNU", batchName: "VISHNU Batch 2 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Wed","Thu"], students: ["Yogesh (Student)"] },
      { id: "b-vishnu-3", coach: "VISHNU", batchName: "VISHNU Batch 3 7:00 PM - 8:00 PM", time: "7:00 PM - 8:00 PM", days: ["Fri","Sat"], students: ["Akmal","Anfal","Buvargan"] }
    ],

    expenses: [],
    document: [],
    resources: [],
    attendance: [],
    monthly_reports: [],
    vault_recordings: [],
    ratings: [],
    tourRatings: []
  };


  // Helper: Initialize localStorage if empty (never overwrite existing data)
  const initLocalStore = () => {
    Object.keys(DEFAULT_DB).forEach(key => {
      const storeKey = `ck_db_${key}`;
      let existing = [];
      if (!localStorage.getItem(storeKey)) {
        localStorage.setItem(storeKey, JSON.stringify(DEFAULT_DB[key]));
        existing = DEFAULT_DB[key];
      } else {
        try {
          existing = JSON.parse(localStorage.getItem(storeKey));
        } catch(e) {
          existing = [];
        }
      }
      
      // Auto-seed missing coaches to Supabase AND local
      if (key === 'users') {
        try {
          const existingCoachEmails = new Set(existing.filter(u => u.role === 'coach').map(u => (u.email || '').toLowerCase()));
          const missingCoaches = DEFAULT_DB.users.filter(u => u.role === 'coach' && !existingCoachEmails.has((u.email || '').toLowerCase()));
          if (missingCoaches.length > 0) {
            existing.push(...missingCoaches);
            localStorage.setItem(storeKey, JSON.stringify(existing));
          }
          
          // Always try to sync default coaches up to Supabase just in case they are missing there
          setTimeout(async () => {
            if (canUseSupabase()) {
              try {
                for (const coach of DEFAULT_DB.users.filter(u => u.role === 'coach')) {
                   // Strip 'id' prefix if it exists in local but Supabase expects UUIDs? 
                   // Wait, our coaches use 'c1', 'c2' string IDs.
                   // Ensure all required fields are uploaded so Admin dashboard populates fully
                   const safeCoach = { ...coach };
                   await window.supabaseClient.from('users').upsert(safeCoach, { onConflict: 'id' }).catch(() => {});
                }
                console.log('[ChessKidoo DB] Seeded/Verified default coaches in Supabase.');
              } catch(e) {}
            }
          }, 2000);
        } catch(e) {}
      }
    });
    // Pre-populate offline credentials in localStorage so demo accounts are fully accessible out-of-the-box
    const credsKey = 'ck_user_credentials';
    const credsVersion = 'ck_creds_version';
    if (!localStorage.getItem(credsKey) || localStorage.getItem(credsVersion) !== '4') {
      localStorage.setItem(credsVersion, '4');
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
        'rohith@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        'vasanth@gmail.com': '83a75bd68c35339c8ba42777a48e4c7e48065e584409d8d12bb84b8032b70248', // chess123
        // Student credentials (all use 123456)
        'sreelaxmi@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'samiksha@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'sakthi@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'sathya@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'riyas@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'susil@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'varun@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'ekash@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'nigunan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'aara@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'anush@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'rakshitha@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'shervin@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'eduveer@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'yugan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'aarunya@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'magathi@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'pranav@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'aatish@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'uttsan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'mukilan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'sachin@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'jeevan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'sai@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'venkateshson@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'athvik@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'mohammadrayan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'pranesh@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'aakif@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'pranish@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'venkateshdaughter@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'aaradhya@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'abinitha@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'yogeshstudent@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'akmal@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'anfal@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        'buvargan@gmail.com': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
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

  // Tables that returned "does not exist" (404 / PGRST205). Once a table is known
  // missing we stop hammering Supabase with it and use localStorage directly —
  // avoids repeated 404 noise (e.g. opening_mastery was queried 12+ times/render).
  const _deadTables = new Set();
  const tableLive = (name) => !_deadTables.has(name);
  const flagIfMissing = (name, error) => {
    if (error && (error.code === 'PGRST205' || error.code === '42P01' ||
        /could not find the table|does not exist/i.test(error.message || ''))) {
      _deadTables.add(name);
    }
  };

  /* ─── CK.db Main Object ─── */
  CK.db = {
    // --- USER PROFILE OPERATIONS ---

    // Fetch all profiles of a certain role
    async getProfiles(role = null) {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('users').select('*');
          if (role) query = query.ilike('role', role);
          // Race against a 3s timeout to prevent hanging
          const result = await Promise.race([
            query,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 6000))
          ]);
          const { data, error } = result;
          if (!error) {
            const rows = data || [];
            // Mirror live data to localStorage so a later Supabase cooldown still
            // has real data to fall back on (prevents portals going blank / looking
            // "hardcoded" the moment a single request times out). A role-filtered
            // fetch only returns that one role's rows, so MERGE by id — never
            // replace the whole cache with one role's subset.
            try {
              if (role) {
                const byId = {};
                getLocal('users').forEach(u => { if (u && u.id != null) byId[u.id] = u; });
                rows.forEach(u => { if (u && u.id != null) byId[u.id] = u; });
                const liveIds = new Set(rows.map(u => u.id));
                const defaultIds = new Set(DEFAULT_DB.users.map(du => du.id));
                setLocal('users', Object.values(byId).filter(u => u.role !== role || liveIds.has(u.id) || defaultIds.has(u.id)));
              } else {
                const byId = {};
                DEFAULT_DB.users.forEach(u => { if (u && u.id != null) byId[u.id] = u; });
                rows.forEach(u => { if (u && u.id != null) byId[u.id] = u; });
                setLocal('users', Object.values(byId));
              }
            } catch (_) { /* localStorage full / disabled — non-fatal */ }
            return rows;
          }
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
          if (!error) {
            // Keep the localStorage mirror fresh for offline/cooldown fallback.
            if (data && data.id != null) {
              try {
                const cache = getLocal('users');
                const i = cache.findIndex(u => u && u.id === data.id);
                if (i !== -1) cache[i] = { ...cache[i], ...data }; else cache.push(data);
                setLocal('users', cache);
              } catch (_) { /* non-fatal */ }
            }
            return data;
          }
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

    // --- BATCHES OPERATIONS ---
    async getBatches() {
      // Generate batches dynamically from coaches if not stored
      let stored = getLocal('batches');
      if (stored && stored.length > 0) return stored;

      const coaches = await this.getProfiles('coach');
      const batches = [];
      const seen = new Set();
      
      coaches.forEach(coach => {
        if (coach.batches) {
          const coachBatches = coach.batches.split(',').map(b => b.trim()).filter(b => b);
          coachBatches.forEach(batchStr => {
            if (!seen.has(batchStr)) {
              seen.add(batchStr);
              batches.push({ batchName: batchStr, coach: coach.full_name || 'Coach' });
            }
          });
        }
      });
      
      return batches;
    },


    // --- VAULT RECORDINGS OPERATIONS ---
    async getVaultRecordings() {
      if (canUseSupabase()) {
        try {
          let query = window.supabaseClient.from('vault_recordings').select('*');
          const { data, error } = await query;
          if (!error && data) {
            setLocal('vault_recordings', data);
            return data;
          }
        } catch (e) {
          console.warn("[ChessKidoo DB] Vault fetch error, falling back to local:", e);
        }
      }
      return getLocal('vault_recordings') || [];
    },

    async saveVaultRecording(rec) {
      if (!rec.id) rec.id = 'vrec-' + Date.now();
      if (!rec.timestamp) rec.timestamp = Date.now();
      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('vault_recordings').upsert(rec);
          if (error) console.warn("[ChessKidoo DB] Vault save error:", error.message);
        } catch (e) {}
      }
      const vault = getLocal('vault_recordings') || [];
      const idx = vault.findIndex(v => v.id === rec.id || (v.batch === rec.batch && v.date === rec.date));
      if (idx !== -1) vault[idx] = { ...vault[idx], ...rec };
      else vault.push(rec);
      setLocal('vault_recordings', vault);
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

    // --- PUZZLE ASSIGNMENTS (coach → student tracking) ---
    async getPuzzleAssignments(filter = {}) {
      if (canUseSupabase() && tableLive('puzzle_assignments')) {
        try {
          const { data, error } = await window.supabaseClient.from('puzzle_assignments').select('*');
          if (error) flagIfMissing('puzzle_assignments', error);
          if (!error && data) { localStorage.setItem('ck_puzzle_assignments', JSON.stringify(data)); }
        } catch (e) { }
      }
      let all = JSON.parse(localStorage.getItem('ck_puzzle_assignments') || '[]');
      if (filter.coachId) all = all.filter(a => a.coachId === filter.coachId);
      if (filter.studentId) all = all.filter(a => a.studentId === filter.studentId);
      return all;
    },
    async savePuzzleAssignment(a) {
      if (!a.id) a.id = 'pa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      if (!a.assignedAt) a.assignedAt = new Date().toISOString();
      if (canUseSupabase() && tableLive('puzzle_assignments')) {
        try { const { error } = await window.supabaseClient.from('puzzle_assignments').upsert(a); flagIfMissing('puzzle_assignments', error); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_puzzle_assignments') || '[]');
      const idx = all.findIndex(x => x.id === a.id);
      if (idx !== -1) all[idx] = a; else all.push(a);
      localStorage.setItem('ck_puzzle_assignments', JSON.stringify(all));
      return a;
    },

    async getGames(userId = null) {
      if (canUseSupabase() && tableLive('student_games')) {
        try {
          let query = window.supabaseClient.from('student_games').select('*');
          if (userId) query = query.eq('userId', userId);
          const { data, error } = await query;
          if (error) flagIfMissing('student_games', error);
          if (!error && data) { localStorage.setItem('ck_games', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_games') || '[]');
      // Games are saved with `studentId` (game-tracker); accept either field so
      // CK.db.getGames(id) and CK.gameTracker.getGames(id) agree.
      if (userId) return all.filter(s => s.userId === userId || s.studentId === userId);
      return all;
    },
    async saveGame(game) {
      if (!game.id) game.id = 'gm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      if (canUseSupabase() && tableLive('student_games')) {
        try { const { error } = await window.supabaseClient.from('student_games').upsert(game); flagIfMissing('student_games', error); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_games') || '[]');
      const idx = all.findIndex(s => s.id === game.id);
      if (idx !== -1) all[idx] = game; else all.push(game);
      localStorage.setItem('ck_games', JSON.stringify(all));
      return game;
    },
    async getOpeningMastery(userId = null) {
      if (canUseSupabase() && tableLive('opening_mastery')) {
        try {
          let query = window.supabaseClient.from('opening_mastery').select('*');
          if (userId) query = query.eq('userId', userId);
          const { data, error } = await query;
          if (error) flagIfMissing('opening_mastery', error);
          if (!error && data) { localStorage.setItem('ck_opening_mastery', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_opening_mastery') || '[]');
      if (userId) return all.filter(s => s.userId === userId);
      return all;
    },
    async saveOpeningMastery(mastery) {
      if (!mastery.id) mastery.id = 'om-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      if (canUseSupabase() && tableLive('opening_mastery')) {
        try { const { error } = await window.supabaseClient.from('opening_mastery').upsert(mastery); flagIfMissing('opening_mastery', error); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_opening_mastery') || '[]');
      const idx = all.findIndex(s => s.id === mastery.id);
      if (idx !== -1) all[idx] = mastery; else all.push(mastery);
      localStorage.setItem('ck_opening_mastery', JSON.stringify(all));
      return mastery;
    },

    // --- E-LIBRARY READING PROGRESS (per student; localStorage-backed) ---
    // These were referenced by the student e-library but never implemented, so
    // renderELibrary threw "getELibraryProgress is not a function" and no books
    // ever rendered. Personal reading progress → localStorage is appropriate.
    async getELibraryProgress(studentId = null) {
      const all = JSON.parse(localStorage.getItem('ck_elib_progress') || '[]');
      return studentId ? all.filter(p => p.student_id === studentId) : all;
    },
    async saveELibraryProgress(p) {
      if (!p || !p.student_id || !p.book_id) return p;
      const all = JSON.parse(localStorage.getItem('ck_elib_progress') || '[]');
      const idx = all.findIndex(x => x.student_id === p.student_id && x.book_id === p.book_id);
      if (idx !== -1) all[idx] = { ...all[idx], ...p }; else all.push(p);
      localStorage.setItem('ck_elib_progress', JSON.stringify(all));
      return p;
    },
    async getVideoProgress(studentId = null) {
      const all = JSON.parse(localStorage.getItem('ck_video_progress') || '[]');
      return studentId ? all.filter(p => p.student_id === studentId) : all;
    },
    async saveVideoProgress(p) {
      if (!p || !p.student_id || !p.video_id) return p;
      const all = JSON.parse(localStorage.getItem('ck_video_progress') || '[]');
      const idx = all.findIndex(x => x.student_id === p.student_id && x.video_id === p.video_id);
      if (idx !== -1) all[idx] = { ...all[idx], ...p }; else all.push(p);
      localStorage.setItem('ck_video_progress', JSON.stringify(all));
      return p;
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
          // Only adopt Supabase when it actually has rows — an empty result (e.g.
          // a read racing a just-written row) must NOT wipe locally-saved homework.
          if (!error && data && data.length) { localStorage.setItem('ck_assignments', JSON.stringify(data)); return data; }
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
    },

    // --- AUDIT LOG OPERATIONS ---
    async getAuditLogs(limit = 100) {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient
            .from('audit_logs').select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
          if (!error && data) { localStorage.setItem('ck_audit_logs', JSON.stringify(data)); return data; }
          markSupabaseFailed();
        } catch (e) { markSupabaseFailed(); }
      }
      return JSON.parse(localStorage.getItem('ck_audit_logs') || '[]');
    },
    async saveAuditLog(log) {
      if (!log.id) log.id = 'al-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      if (!log.timestamp) log.timestamp = new Date().toISOString();
      if (!log.severity) log.severity = 'INFO';
      const prevLogs = JSON.parse(localStorage.getItem('ck_audit_logs') || '[]');
      log.hash_prev = prevLogs.length > 0 ? prevLogs[0].id : null;

      if (canUseSupabase()) {
        try {
          const { error } = await window.supabaseClient.from('audit_logs').upsert(log);
          if (error) console.warn('[CK DB] Audit log save error:', error);
        } catch (e) { console.warn('[CK DB] Audit log save error:', e); }
      }
      prevLogs.unshift(log);
      localStorage.setItem('ck_audit_logs', JSON.stringify(prevLogs.slice(0, 500)));
      return log;
    },

    // --- COACH PAYMENTS / PAYROLL ---
    async getCoachPayments(coachId = null) {
      if (canUseSupabase()) {
        try {
          let q = window.supabaseClient.from('coach_payments').select('*').order('created_at', { ascending: false });
          if (coachId) q = q.eq('coach_id', coachId);
          const { data, error } = await q;
          if (!error && data) { localStorage.setItem('ck_coach_payments', JSON.stringify(data)); return data; }
        } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_coach_payments') || '[]');
      return coachId ? all.filter(p => p.coach_id === coachId) : all;
    },
    async saveCoachPayment(p) {
      if (!p.id) p.id = 'cp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
      if (!p.created_at) p.created_at = new Date().toISOString();
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('coach_payments').upsert(p); } catch (e) { }
      }
      const all = JSON.parse(localStorage.getItem('ck_coach_payments') || '[]');
      const idx = all.findIndex(x => x.id === p.id);
      if (idx !== -1) all[idx] = p; else all.unshift(p);
      localStorage.setItem('ck_coach_payments', JSON.stringify(all));
      return p;
    },

    // --- CREDENTIALS SYNC (Supabase credentials table) ---
    async getCredentials() {
      if (canUseSupabase()) {
        try {
          const { data, error } = await window.supabaseClient.from('credentials').select('*');
          if (!error && data) {
            const map = {};
            data.forEach(c => { map[c.email] = c.password; });
            localStorage.setItem('ck_user_credentials', JSON.stringify(map));
            return map;
          }
        } catch (e) { }
      }
      return JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
    },
    async saveCredential(email, hash) {
      if (canUseSupabase()) {
        try {
          await window.supabaseClient.from('credentials').upsert({ email, password: hash });
        } catch (e) { }
      }
      const creds = JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
      creds[email] = hash;
      localStorage.setItem('ck_user_credentials', JSON.stringify(creds));
    },
    async deleteCredential(email) {
      if (canUseSupabase()) {
        try { await window.supabaseClient.from('credentials').delete().eq('email', email); } catch (e) { }
      }
      const creds = JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
      delete creds[email];
      localStorage.setItem('ck_user_credentials', JSON.stringify(creds));
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
    },
    // --- TOURNAMENT INTEREST OPERATIONS ---
    async getTournamentInterests() {
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('tournament_interests'))) {
        try {
          const { data, error } = await window.supabaseClient.from('tournament_interests').select('*');
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('tournament_interests');
          } else if (!error && data) {
            localStorage.setItem('ck_tournament_interests', JSON.stringify(data));
            return data;
          }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem('ck_tournament_interests') || '[]');
    },
    async saveTournamentInterest(ti) {
      if (!ti.id) ti.id = 'ti-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      ti.updated_at = new Date().toISOString();
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('tournament_interests'))) {
        try {
          const { error } = await window.supabaseClient.from('tournament_interests').upsert(ti);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('tournament_interests');
          }
        } catch(e) {}
      }
      const all = JSON.parse(localStorage.getItem('ck_tournament_interests') || '[]');
      const idx = all.findIndex(x => x.id === ti.id || (x.student_id === ti.student_id && x.tournament_id === ti.tournament_id));
      if (idx !== -1) all[idx] = { ...all[idx], ...ti }; else all.unshift(ti);
      localStorage.setItem('ck_tournament_interests', JSON.stringify(all));
      return ti;
    },

    // --- E-LIBRARY PROGRESS OPERATIONS ---
    async getELibraryProgress(studentId) {
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('elibrary_progress'))) {
        try {
          const { data, error } = await window.supabaseClient.from('elibrary_progress').select('*').eq('student_id', studentId);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('elibrary_progress');
          } else if (!error && data) {
            localStorage.setItem(`ck_elibrary_progress_${studentId}`, JSON.stringify(data));
            return data;
          }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem(`ck_elibrary_progress_${studentId}`) || '[]');
    },
    async saveELibraryProgress(ep) {
      if (!ep.id) ep.id = 'ep-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      ep.updated_at = new Date().toISOString();
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('elibrary_progress'))) {
        try {
          const { error } = await window.supabaseClient.from('elibrary_progress').upsert(ep);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('elibrary_progress');
          }
        } catch(e) {}
      }
      const studentId = ep.student_id;
      const all = JSON.parse(localStorage.getItem(`ck_elibrary_progress_${studentId}`) || '[]');
      const idx = all.findIndex(x => x.id === ep.id || (x.student_id === ep.student_id && x.book_id === ep.book_id));
      if (idx !== -1) all[idx] = { ...all[idx], ...ep }; else all.unshift(ep);
      localStorage.setItem(`ck_elibrary_progress_${studentId}`, JSON.stringify(all));
      return ep;
    },

    // --- VIDEO PROGRESS OPERATIONS ---
    async getVideoProgress(studentId) {
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('video_progress'))) {
        try {
          const { data, error } = await window.supabaseClient.from('video_progress').select('*').eq('student_id', studentId);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('video_progress');
          } else if (!error && data) {
            localStorage.setItem(`ck_video_progress_${studentId}`, JSON.stringify(data));
            return data;
          }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem(`ck_video_progress_${studentId}`) || '[]');
    },
    async saveVideoProgress(vp) {
      if (!vp.id) vp.id = 'vp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      vp.updated_at = new Date().toISOString();
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('video_progress'))) {
        try {
          const { error } = await window.supabaseClient.from('video_progress').upsert(vp);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('video_progress');
          }
        } catch(e) {}
      }
      const studentId = vp.student_id;
      const all = JSON.parse(localStorage.getItem(`ck_video_progress_${studentId}`) || '[]');
      const idx = all.findIndex(x => x.id === vp.id || (x.student_id === vp.student_id && x.video_id === vp.video_id));
      if (idx !== -1) all[idx] = { ...all[idx], ...vp }; else all.unshift(vp);
      localStorage.setItem(`ck_video_progress_${studentId}`, JSON.stringify(all));
      return vp;
    },

    // --- LIVE CLASS CHAT OPERATIONS ---
    async getLiveClassChats(classId) {
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('live_class_chats'))) {
        try {
          const { data, error } = await window.supabaseClient.from('live_class_chats').select('*').eq('class_id', classId).order('timestamp', { ascending: true });
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('live_class_chats');
          } else if (!error && data) {
            localStorage.setItem(`ck_live_chats_${classId}`, JSON.stringify(data));
            return data;
          }
        } catch(e) {}
      }
      return JSON.parse(localStorage.getItem(`ck_live_chats_${classId}`) || '[]');
    },
    async saveLiveClassChat(msg) {
      if (!msg.id) msg.id = 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      msg.timestamp = new Date().toISOString();
      if (canUseSupabase() && !(window.sbTableKnownMissing && window.sbTableKnownMissing('live_class_chats'))) {
        try {
          const { error } = await window.supabaseClient.from('live_class_chats').upsert(msg);
          if (error && window.sbIsTableMissing && window.sbIsTableMissing(error)) {
            window.sbMarkTableMissing('live_class_chats');
          }
        } catch(e) {}
      }
      const classId = msg.class_id;
      const all = JSON.parse(localStorage.getItem(`ck_live_chats_${classId}`) || '[]');
      all.push(msg);
      localStorage.setItem(`ck_live_chats_${classId}`, JSON.stringify(all));
      return msg;
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

    /* Returns a map of { email: hash } for all users with portal access.
       Reads from the Supabase `credentials` table (synced to localStorage). */
    async getCreds() {
      try {
        return (CK.db && CK.db.getCredentials) ? await CK.db.getCredentials() : {};
      } catch (e) {
        return JSON.parse(localStorage.getItem('ck_user_credentials') || '{}');
      }
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
        await CK.db.saveCredential(email.toLowerCase(), hash);
        return true;
      } catch (e) {
        console.warn('[Auth] could not write credentials:', e);
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
      if (!email) return false;
      email = email.toLowerCase();
      if (CK.db && CK.db.deleteCredential) await CK.db.deleteCredential(email);
      if (CK.db && CK.db.saveAuditLog) {
        CK.db.saveAuditLog({
          user_id: CK.currentUser?.id || 'admin', user_name: CK.currentUser?.full_name || 'Admin',
          action: 'REVOKE_ACCESS', resource: 'credentials',
          detail: `Revoked portal access for ${email}`, severity: 'WARN'
        });
      }
      return true;
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
      this._lastContainerId = containerId;
      el.innerHTML = '<div style="text-align:center;opacity:.45;padding:30px;">⟳ Syncing access from Supabase…</div>';

      const users = (await CK.db.getProfiles()) || [];
      const nonAdmin = users.filter(u => u.role !== 'admin');
      const creds = await this.getCreds();

      // Compute live stats
      const withAccess = nonAdmin.filter(u => u.email && creds[u.email.toLowerCase()]).length;
      const noAccess = nonAdmin.length - withAccess;
      const byRole = { student: 0, coach: 0, parent: 0 };
      nonAdmin.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
      const online = (window.supabaseClient && navigator.onLine);

      const statCard = (icon, val, label, color) => `
        <div class="acc-stat-card">
          <div class="acc-stat-icon" style="background:${color}1a;color:${color}">${icon}</div>
          <div><div class="acc-stat-val">${val}</div><div class="acc-stat-label">${label}</div></div>
        </div>`;

      el.innerHTML = `
        <div class="acc-stats-row">
          ${statCard('👥', nonAdmin.length, 'Total Users', '#3b82f6')}
          ${statCard('✅', withAccess, 'Active Access', '#22c55e')}
          ${statCard('🔒', noAccess, 'No Access', '#ef4444')}
          ${statCard(online ? '🟢' : '🔴', online ? 'Supabase' : 'Offline', online ? 'Live Sync' : 'Local Only', online ? '#22c55e' : '#f59e0b')}
        </div>
        <div class="acc-search-row">
          <input class="p-input" id="accSearch" placeholder="🔍 Search by name or email…" oninput="CK.accessManager._filter(this.value)">
          <select class="p-input" id="accRoleFilter" style="width:150px" onchange="CK.accessManager._filter(document.getElementById('accSearch').value)">
            <option value="">All Roles (${nonAdmin.length})</option>
            <option value="student">Students (${byRole.student})</option>
            <option value="coach">Coaches (${byRole.coach})</option>
            <option value="parent">Parents (${byRole.parent})</option>
          </select>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.renderAccessTable('${containerId}')" title="Refresh from Supabase">🔄</button>
        </div>
        <div class="acc-bulk-row">
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.bulkDialog('student')">🔑 Set Password — All Students</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.accessManager.bulkDialog('coach')">🔑 Set Password — All Coaches</button>
          <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.accessManager.addParentDialog()">➕ Add Parent Account</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="p-table" style="width:100%;margin-top:12px" id="accTable">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Actions</th></tr></thead>
            <tbody id="accTableBody">
              ${this._rows(nonAdmin, creds)}
            </tbody>
          </table>
        </div>`;
      this._subRealtime();
    },

    /* Live-refresh the access table when the users table changes (new
       enrollments, role edits) — but never while the admin is mid-edit. */
    _subRealtime() {
      if (this._accRtDone) return;
      if (!window.supabaseClient || !window.supabaseClient.channel) return;
      this._accRtDone = true;
      try {
        window.supabaseClient.channel('ck_access_rt')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            const cid = this._lastContainerId || 'adminAccessTable';
            const cont = document.getElementById(cid);
            if (!cont) return;
            const ae = document.activeElement;
            if (ae && cont.contains(ae)) return; // don't yank focus while typing
            this.renderAccessTable(cid);
          })
          .subscribe();
      } catch (e) { /* realtime optional */ }
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
            <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" onclick="CK.accessManager.deleteUserDialog('${safeId}','${safeEmail}','${safeName}')">🗑 Delete</button>
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
      const childEmail = await CK.prompt(`Enter the student's email to link as child for ${parentName}:`);
      if (!childEmail) return;
      const profile = await CK.db.getProfile(parentId);
      if (!profile) return CK.showToast('Parent profile not found.', 'error');
      profile.childEmail = childEmail.trim().toLowerCase();
      await CK.db.saveProfile(profile);
      CK.showToast(`Child (${childEmail}) linked to ${parentName}.`, 'success');
    },

    async deleteUserDialog(userId, email, name) {
      if (!await window.CK.confirm(`WARNING: Are you sure you want to permanently delete the profile for ${name} (${email})?\n\nThis action cannot be undone.`)) return;
      
      // Attempt to revoke Supabase credential first
      if (email && this.removeCredential) {
        await this.removeCredential(email);
      }
      
      // Delete the profile
      const { error } = await window.supabaseClient.from('users').delete().eq('id', userId);
      if (error) {
        console.error('Error deleting user profile:', error);
        CK.showToast('Failed to delete user profile.', 'error');
        return;
      }
      
      CK.showToast(`User ${name} has been permanently deleted.`, 'success');
      this.renderAccessTable('adminAccessTable');
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

    // Modern modal-based password setter (replaces window.prompt)
    setDialog(email, name) {
      const _e = CK.esc || (s => s);
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.innerHTML = `
        <div class="p-modal" style="max-width:440px">
          <div class="p-modal-header"><div class="p-modal-title">🔑 Set Password — ${_e(name)}</div><button class="p-modal-close" onclick="this.closest('.p-modal-overlay').remove()">✕</button></div>
          <div class="p-modal-body">
            <div class="p-form-group"><label class="p-form-label">Account Email</label><input class="p-form-control" value="${_e(email)}" disabled style="opacity:.7"></div>
            <div class="p-form-group"><label class="p-form-label">New Password</label>
              <input class="p-form-control" type="text" id="setpw_input" placeholder="Min 6 characters" autocomplete="off">
              <div style="font-size:.72rem;opacity:.55;margin-top:6px">The user logs in with this email + password. Synced to Supabase instantly.</div>
            </div>
          </div>
          <div class="p-modal-footer">
            <button class="p-btn p-btn-ghost" onclick="this.closest('.p-modal-overlay').remove()">Cancel</button>
            <button class="p-btn p-btn-blue" id="setpw_save">💾 Grant Access</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      const input = modal.querySelector('#setpw_input');
      input?.focus();
      modal.querySelector('#setpw_save').onclick = async () => {
        const pass = input.value.trim();
        if (pass.length < 6) { CK.showToast('Password must be at least 6 characters.', 'warning'); return; }
        const btn = modal.querySelector('#setpw_save');
        btn.disabled = true; btn.textContent = '⏳ Saving…';
        await this.setCredential(email, pass);
        if (CK.db && CK.db.saveAuditLog) CK.db.saveAuditLog({
          user_id: CK.currentUser?.id || 'admin', user_name: CK.currentUser?.full_name || 'Admin',
          action: 'SET_PASSWORD', resource: 'credentials', detail: `Set/updated portal access for ${email}`, severity: 'INFO'
        });
        CK.showToast(`✅ Access granted to ${name}!`, 'success');
        modal.remove();
        this.renderAccessTable(this._lastContainerId || 'adminAccessTable');
      };
    },

    async revokeAccess(email) {
      if (!await window.CK.confirm(`Revoke portal access for ${email}?\n\nThey will no longer be able to log in until a new password is set.`)) return;
      await this.removeCredential(email);
      CK.showToast('🔒 Access revoked.', 'success');
      this.renderAccessTable(this._lastContainerId || 'adminAccessTable');
    },

    async bulkDialog(role) {
      const _e = CK.esc || (s => s);
      const modal = document.createElement('div');
      modal.className = 'p-modal-overlay open';
      modal.innerHTML = `
        <div class="p-modal" style="max-width:440px">
          <div class="p-modal-header"><div class="p-modal-title">🔑 Bulk Password — All ${_e(role)}s</div><button class="p-modal-close" onclick="this.closest('.p-modal-overlay').remove()">✕</button></div>
          <div class="p-modal-body">
            <div style="padding:10px 12px;background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;border-radius:6px;font-size:.8rem;margin-bottom:14px">⚠️ This sets the <strong>same password</strong> for every ${_e(role)} account. Use for quick onboarding, then have users change it.</div>
            <div class="p-form-group"><label class="p-form-label">Shared Password</label><input class="p-form-control" type="text" id="bulkpw_input" placeholder="Min 6 characters"></div>
          </div>
          <div class="p-modal-footer">
            <button class="p-btn p-btn-ghost" onclick="this.closest('.p-modal-overlay').remove()">Cancel</button>
            <button class="p-btn p-btn-blue" id="bulkpw_save">Apply to All ${_e(role)}s</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#bulkpw_input')?.focus();
      modal.querySelector('#bulkpw_save').onclick = async () => {
        const pass = modal.querySelector('#bulkpw_input').value.trim();
        if (pass.length < 6) { CK.showToast('Password must be at least 6 characters.', 'warning'); return; }
        const btn = modal.querySelector('#bulkpw_save');
        btn.disabled = true; btn.textContent = '⏳ Applying…';
        const count = await this.bulkSetRolePassword(role, pass);
        if (CK.db && CK.db.saveAuditLog) CK.db.saveAuditLog({
          user_id: CK.currentUser?.id || 'admin', user_name: CK.currentUser?.full_name || 'Admin',
          action: 'BULK_SET_PASSWORD', resource: 'credentials', detail: `Set password for ${count} ${role}s`, severity: 'WARN'
        });
        CK.showToast(`✅ Password set for ${count} ${role}s!`, 'success');
        modal.remove();
        this.renderAccessTable(this._lastContainerId || 'adminAccessTable');
      };
    },

    addParentDialog() {
      const modal = document.createElement('div');
      modal.id = 'addParentModalOverlay';
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
      const btn = document.querySelector('#addParentModalOverlay .p-btn-blue');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating…'; }
      
      try {
        const name  = document.getElementById('addp_name')?.value.trim();
        const child = document.getElementById('addp_child')?.value.trim();
        let email = document.getElementById('addp_email')?.value.trim();
        let pass  = document.getElementById('addp_pass')?.value;
        
        if (!name || !child) { 
          CK.showToast('Name and Child Email are required', 'warning'); 
          if (btn) { btn.disabled = false; btn.textContent = '➕ Create Parent'; }
          return; 
        }
        
        if (!email) {
          const childPrefix = child.split('@')[0];
          email = `${childPrefix}.parent@gmail.com`;
        }
        if (!pass) pass = '123456';
        
        await this.addParent(name, email, pass, child);
        CK.showToast(`Parent account created for ${name}!`, 'success');
        document.getElementById('addParentModalOverlay')?.remove();
        this.renderAccessTable(this._lastContainerId || 'adminAccessTable');
      } catch (err) {
        console.error('[AddParent] Error:', err);
        CK.showToast('Failed to create parent account. Check console.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '➕ Create Parent'; }
      }
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
