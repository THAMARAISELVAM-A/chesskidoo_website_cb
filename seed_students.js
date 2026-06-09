import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://hcjuyqicftkgpiyrkscr.supabase.co';
// Read from environment if possible, or use the anon key we extracted
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjanV5cWljZnRrZ3BpeXJrc2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTE4NTIsImV4cCI6MjA5MzEyNzg1Mn0.utVxS7jX2GH9mIVbKquuQFCyH99nUmP_geWI8hhWJP4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

const studentsData = [
  { "full_name": "PRAVEEN - PARENTS NAME", "phone_number": "9840514302", "level": "Beginner", "rating": 800, "join_date": "2026-06-07", "due_date": "2026-06-07", "fee": "2000", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "YOGESH" },
  { "full_name": "POORNIMA - PARENTS", "phone_number": "9626846669", "level": "Beginner", "rating": 800, "join_date": "2026-06-07", "due_date": "2026-07-07", "fee": "1900", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "YOGESH" },
  { "full_name": "Rohith Expenditure chess Academy", "phone_number": "6385688722", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-07-07", "fee": "1000", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "Aradhya", "phone_number": "741872621", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-06-28", "fee": "2900", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "VASANTH KUMAR" },
  { "full_name": "SAMIKSHA", "phone_number": "9003457873", "level": "Beginner", "rating": 800, "join_date": "2026-05-29", "due_date": "2026-06-29", "fee": "4800", "payment_status": "Paid", "batch": "Group", "timetable": "17:00", "coach": "ROHITH SELVARAJ" },
  { "full_name": "VENKATESH LAXMINAGAR -daughter", "phone_number": "9686103333", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-06-29", "fee": "1800", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "VENKATESH LAXMINAGAR -SON", "phone_number": "9686103333", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-06-30", "fee": "1798", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "ILAM BHARATHI", "phone_number": "9629673733", "level": "Beginner", "rating": 800, "join_date": "2026-06-10", "due_date": "2026-06-10", "fee": "1600", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "RANJITH" },
  { "full_name": "YADHUIVER", "phone_number": "9551118111", "level": "Beginner", "rating": 800, "join_date": "2026-06-03", "due_date": "2026-06-03", "fee": "2700", "payment_status": "Paid", "batch": "Group", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "YOGESH", "phone_number": "9344097252", "level": "Beginner", "rating": 800, "join_date": "2026-06-03", "due_date": "2026-06-03", "fee": "2700", "payment_status": "Due", "batch": "Group", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "ABINITHA", "phone_number": "9952209603", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-06-29", "fee": "2600", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "YUVAN", "phone_number": "9789107123", "level": "Beginner", "rating": 800, "join_date": "2026-06-01", "due_date": "2026-06-03", "fee": "2800", "payment_status": "Due", "batch": "Group", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "Banu priya --offline academy", "phone_number": "9080578952", "level": "Beginner", "rating": 800, "join_date": "2026-05-18", "due_date": "2026-06-18", "fee": "1000", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "Saranya --offline academy", "phone_number": "8220165338", "level": "Beginner", "rating": 800, "join_date": "2026-05-18", "due_date": "2026-06-20", "fee": "1270", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "Prajesh --offline academy", "phone_number": "9442628925", "level": "Beginner", "rating": 800, "join_date": "2026-05-18", "due_date": "2026-06-19", "fee": "1270", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "Mansa --offline academy", "phone_number": "8667593451", "level": "Beginner", "rating": 800, "join_date": "2026-05-18", "due_date": "2026-06-17", "fee": "1270", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "SAI", "phone_number": "9789012394", "level": "Beginner", "rating": 800, "join_date": "2026-05-07", "due_date": "2026-06-07", "fee": "1600", "payment_status": "Pending", "batch": "Group", "timetable": "17:00", "coach": "YOGESH" },
  { "full_name": "MOHAMMED ATIFK", "phone_number": "9566439055", "level": "Beginner", "rating": 800, "join_date": "2026-04-20", "due_date": "2026-06-20", "fee": "1700", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "PRANISH P", "phone_number": "9942827234", "level": "Beginner", "rating": 800, "join_date": "2026-04-27", "due_date": "2026-06-04", "fee": "1500", "payment_status": "Paid", "batch": "Weekend", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "SUSIN", "phone_number": "8667258857", "level": "Advanced", "rating": 800, "join_date": "2026-04-08", "due_date": "2026-06-08", "fee": "1800", "payment_status": "Paid", "batch": "Weekend", "timetable": "17:00", "coach": "RANJITH" },
  { "full_name": "ATISH VIDUN", "phone_number": "9677751414", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "3200", "payment_status": "Pending", "batch": "Single", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "BALAJI GANESH", "phone_number": "7324276741", "level": "Beginner", "rating": 800, "join_date": "2026-02-21", "due_date": "2026-06-06", "fee": "5200", "payment_status": "Paid", "batch": "Weekday", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "ATHIVIK", "phone_number": "8608969999", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-14", "fee": "2500", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "YOGESH" },
  { "full_name": "SACHIN", "phone_number": "9944227799", "level": "Advanced", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "3000", "payment_status": "Pending", "batch": "Single", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "UTTASAN", "phone_number": "8870897095", "level": "Advanced", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "3000", "payment_status": "Paid", "batch": "Single", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "PRNAVAV", "phone_number": "9843431086", "level": "Beginner", "rating": 800, "join_date": "2026-04-08", "due_date": "2026-06-08", "fee": "2200", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "SHREVIN", "phone_number": "7899295230", "level": "Beginner", "rating": 800, "join_date": "2026-03-13", "due_date": "2026-06-25", "fee": "1800", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "AARA V", "phone_number": "9786767007", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "1800", "payment_status": "Paid", "batch": "Weekend", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "RAKISTHA", "phone_number": "9789779973", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-27", "fee": "800", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "NIGUNAN", "phone_number": "9952178004", "level": "Beginner", "rating": 800, "join_date": "2026-04-10", "due_date": "2026-06-10", "fee": "2400", "payment_status": "Pending", "batch": "Weekday", "timetable": "17:00", "coach": "GYANASURYA" },
  { "full_name": "SREELAXMI", "phone_number": "9952178004", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "5000", "payment_status": "Paid", "batch": "Morning & Evening", "timetable": "17:00", "coach": "ROHITH SELVARAJ" },
  { "full_name": "MAGATHI", "phone_number": "9843431086", "level": "Beginner", "rating": 800, "join_date": "2026-04-08", "due_date": "2026-06-08", "fee": "2200", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "KRISHNA", "phone_number": "8300854984", "level": "Intermediate", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-21", "fee": "750", "payment_status": "Pending", "batch": "Morning & Evening", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "VELAVA", "phone_number": "9025589784", "level": "Intermediate", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-25", "fee": "1800", "payment_status": "Overdue", "batch": "Fri & Sat", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "MUKILAN", "phone_number": "8300074400", "level": "Advanced", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-04", "fee": "2600", "payment_status": "Pending", "batch": "Fri & Sat", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "ANFAL", "phone_number": "8870846140", "level": "Intermediate", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-22", "fee": "3300", "payment_status": "Overdue", "batch": "Fri & Sat", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "ANUKSHAA", "phone_number": "6374838638", "level": "Beginner", "rating": 800, "join_date": "2026-04-23", "due_date": "2026-06-23", "fee": "1800", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "VARUN", "phone_number": "9677499903", "level": "Beginner", "rating": 1400, "join_date": "2026-03-15", "due_date": "2026-06-15", "fee": "1600", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "RANJITH" },
  { "full_name": "SAKUNTHALA", "phone_number": "9150417754", "level": "Beginner", "rating": 800, "join_date": "2026-04-15", "due_date": "2026-06-04", "fee": "1700", "payment_status": "Not Enrolled", "batch": "Weekend", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "SAKTHI - SATHYA -SANKARLINGAM", "phone_number": "426045111", "level": "Elite", "rating": 799, "join_date": "2026-04-15", "due_date": "2026-06-04", "fee": "7000", "payment_status": "Pending", "batch": "Single", "timetable": "17:00", "coach": "RANJITH" },
  { "full_name": "RIYAS", "phone_number": "9677499903", "level": "Beginner", "rating": 1400, "join_date": "2026-03-15", "due_date": "2026-06-15", "fee": "1600", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "RANJITH" },
  { "full_name": "POONTHALIR", "phone_number": "9952484616", "level": "Beginner", "rating": 1000, "join_date": "2026-03-22", "due_date": "2026-06-21", "fee": "900", "payment_status": "Pending", "batch": "Morning & Evening", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "MOHAMMED RAYAN", "phone_number": "9566439055", "level": "Beginner", "rating": 800, "join_date": "2026-04-13", "due_date": "2026-06-20", "fee": "1700", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "YOGESH" },
  { "full_name": "JAYARAJ", "phone_number": "8682837002", "level": "Beginner", "rating": 1000, "join_date": "2026-03-07", "due_date": "2026-06-20", "fee": "2500", "payment_status": "Pending", "batch": "Fri & Sat", "timetable": "17:00", "coach": "VISHNU" },
  { "full_name": "JEEVAN BASIC", "phone_number": "4086792841", "level": "Beginner", "rating": 800, "join_date": "2026-03-15", "due_date": "2026-06-24", "fee": "3300", "payment_status": "Pending", "batch": "Weekday", "timetable": "17:00", "coach": "SUDHIN" },
  { "full_name": "ARUNYA", "phone_number": "9042040150", "level": "Beginner", "rating": 800, "join_date": "2026-04-24", "due_date": "2026-06-24", "fee": "2400", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "AADHAVAN - SINGAPORE", "phone_number": "86501029", "level": "Beginner", "rating": 850, "join_date": "2026-04-20", "due_date": "2026-06-04", "fee": "2200", "payment_status": "Paid", "batch": "Weekday", "timetable": "17:00", "coach": "ARIVUSELVAM" },
  { "full_name": "ANUSH", "phone_number": "6374838638", "level": "Intermediate", "rating": 800, "join_date": "2026-04-23", "due_date": "2026-06-23", "fee": "1000", "payment_status": "Pending", "batch": "Weekend", "timetable": "17:00", "coach": "GYANASURYA" }
];

async function seedData() {
  const records = studentsData.map((s, index) => ({
    id: 'student-seed-' + (Date.now() + index),
    userid: 's' + (1000 + index),
    email: s.full_name.split(' ')[0].toLowerCase() + index + '@demo.com',
    full_name: s.full_name,
    role: 'student',
    phone_number: s.phone_number,
    level: s.level,
    rating: s.rating,
    join_date: s.join_date,
    due_date: s.due_date,
    fee: s.fee,
    payment_status: s.payment_status,
    batch: s.batch,
    timetable: s.timetable,
    coach: s.coach,
    status: 'Active'
  }));

  console.log(`Prepared ${records.length} records. Uploading...`);
  const { data, error } = await supabase.from('users').upsert(records, { onConflict: 'id' });
  if (error) {
    console.error('Error inserting data:', error);
  } else {
    console.log('Successfully inserted all student data into Supabase!');
  }
}

seedData();
