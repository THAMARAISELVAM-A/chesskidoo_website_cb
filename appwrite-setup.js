/* appwrite-setup.js -----------------------------------------------------------
 * ChessKidoo — one-time Appwrite database setup.
 *
 * Creates the database, all 20 collections + attributes, the storage bucket,
 * and seeds the admin / coach / demo-student logins.
 *
 * RUN IT ONCE, LOCALLY (the API key never goes near the website code):
 *
 *   1. cd into this folder (D:\MY\chessk)
 *   2. npm install node-appwrite
 *   3. node appwrite-setup.js  YOUR_APPWRITE_API_KEY
 *      (optionally pass the endpoint as a 2nd argument if SGP isn't right:
 *       node appwrite-setup.js YOUR_KEY https://cloud.appwrite.io/v1 )
 *
 * Safe to re-run — existing items are skipped.
 * Do NOT commit your API key. This script reads it from the command line.
 * --------------------------------------------------------------------------- */

const sdk = require('node-appwrite');

const API_KEY  = process.argv[2];
const ENDPOINT = process.argv[3] || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT  = '6a0deace00126a358c7d';
const DB_ID    = 'chesskidoo';
const BUCKET   = 'documents';

if (!API_KEY) {
  console.error('\n  Usage: node appwrite-setup.js <APPWRITE_API_KEY> [endpoint]\n');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new sdk.Databases(client);
const storage   = new sdk.Storage(client);

const anyPerms = [
  sdk.Permission.read(sdk.Role.any()),
  sdk.Permission.create(sdk.Role.any()),
  sdk.Permission.update(sdk.Role.any()),
  sdk.Permission.delete(sdk.Role.any())
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ok    = (label) => console.log('  ✓ ' + label);
const skip  = (label, e) => console.log('  • ' + label + (e && e.code === 409 ? ' (already exists)' : ' — ' + (e && e.message || e)));

/* table -> attributes.  s = string, t = long text, i = integer, b = boolean, a = string array */
const SCHEMA = {
  users:           { s:['userid','email','full_name','role','phone_number','city','level','coach','batch','session','schedule','fee','status','due_date','join_date','grade','photo','certificate','last_note','childEmail','childId','child_id','timetable','revenue','streak_last_date','auth_id','fide_rating','session_type','payment_status','created_at'], t:['srs_data'], i:['rating','age','puzzle','game','star','classes','streak_count','xp'] },
  expenses:        { s:['date','category','description','amount','mode','bill','created_at'] },
  document:        { s:['file_name','name','level','coach','link','batch','user_ids','type','notes','created_at'] },
  attendance:      { s:['userid','studentId','studentName','classId','className','coachId','coachName','markedAt','date','status','class_title','created_at'] },
  ratings:         { s:['user_id','date','created_at'], i:['online','international'] },
  tourRatings:     { s:['user_id','name','result','change','created_at'] },
  resources:       { s:['name','type','level','notes','link','coach','batch','fen','solution','difficulty','category','explanation','created_at'] },
  meetings:        { s:['date','time','coach','coachId','coachName','title','batch','link','notes','type','created_at'], i:['duration'], a:['studentIds'] },
  leads:           { s:['name','phone','parent_name','child_age','city','status','email','message','source','full_name','age','created_at'] },
  coach_notes:     { s:['student','coach','text','date','created_at'] },
  credentials:     { s:['email','password','created_at'] },
  batch_links:     { s:['batch_level','link','updated_at'] },
  classes:         { s:['coachId','coachName','title','level','batch','time','zoomLink','createdAt','created_at'], i:['duration','maxStudents'], b:['active'], a:['days','studentIds'] },
  monthly_reports: { s:['studentId','studentName','coachId','coachName','notes','recommendation','topics','type','createdAt','created_at'], i:['month','year','attendance','puzzles','rating'], t:['data'] },
  puzzle_scores:   { s:['userId','userName','puzzleId','date','created_at'], i:['time','mistakes','xp'], b:['solved'] },
  coach_attendance:{ s:['coachId','classId','date','joinedAt','created_at'] },
  assignments:     { s:['title','type','dueDate','description','coach','created_at'], t:['pgn'], i:['created','moves'], a:['assignedTo'] },
  hw_submissions:  { s:['assignment_id','student_id','note','submittedAt','created_at'], i:['accuracy','movesStudied','totalMoves'], b:['completed'] },
  feedback:        { s:['fromId','fromName','fromRole','childId','childName','toId','toName','message','category','reply','parent_name','parent_email','student_email','text','status','created_at'], i:['rating'], b:['replied'] },
  broadcasts:      { s:['fen','coach','created_at'], t:['pgn'], i:['ts'] }
};

/* Indexes — Appwrite needs a 'key' index on every attribute used in a
   filter (Query.equal) or sort (orderAsc/orderDesc). $id is auto-indexed. */
const INDEXES = {
  users:            ['role', 'userid', 'email'],
  expenses:         ['created_at'],
  document:         ['level', 'created_at'],
  attendance:       ['userid', 'date', 'coachId'],
  ratings:          ['user_id', 'date'],
  tourRatings:      ['user_id'],
  resources:        ['batch', 'created_at'],
  meetings:         ['date', 'coach'],
  monthly_reports:  ['studentId', 'created_at'],
  puzzle_scores:    ['userId'],
  coach_attendance: ['coachId'],
  assignments:      ['created_at'],
  hw_submissions:   ['assignment_id', 'student_id'],
  feedback:         ['created_at'],
  coach_notes:      ['created_at'],
  credentials:      ['email']
};

async function makeIndex(col, key) {
  try {
    await databases.createIndex(DB_ID, col, 'idx_' + key, 'key', [key]);
    ok('index ' + col + '.' + key);
  } catch (e) { skip('index ' + col + '.' + key, e); }
}

async function makeAttr(col, key, kind) {
  try {
    if (kind === 's')  await databases.createStringAttribute(DB_ID, col, key, 512, false);
    if (kind === 't')  await databases.createStringAttribute(DB_ID, col, key, 65535, false);
    if (kind === 'a')  await databases.createStringAttribute(DB_ID, col, key, 512, false, null, true);
    if (kind === 'i')  await databases.createIntegerAttribute(DB_ID, col, key, false);
    if (kind === 'b')  await databases.createBooleanAttribute(DB_ID, col, key, false);
    ok(col + '.' + key);
  } catch (e) { skip(col + '.' + key, e); }
}

async function run() {
  console.log('\nChessKidoo — Appwrite setup');
  console.log('Endpoint: ' + ENDPOINT + '  Project: ' + PROJECT + '\n');

  // 1. Database
  try { await databases.create(DB_ID, 'ChessKidoo'); ok('database "' + DB_ID + '"'); }
  catch (e) { skip('database "' + DB_ID + '"', e); }

  // 2. Collections + attributes
  for (const [col, attrs] of Object.entries(SCHEMA)) {
    try { await databases.createCollection(DB_ID, col, col, anyPerms, false); ok('collection ' + col); }
    catch (e) { skip('collection ' + col, e); }
    for (const k of (attrs.s || [])) await makeAttr(col, k, 's');
    for (const k of (attrs.t || [])) await makeAttr(col, k, 't');
    for (const k of (attrs.i || [])) await makeAttr(col, k, 'i');
    for (const k of (attrs.b || [])) await makeAttr(col, k, 'b');
    for (const k of (attrs.a || [])) await makeAttr(col, k, 'a');
  }

  // 3. Storage bucket
  try { await storage.createBucket(BUCKET, BUCKET, anyPerms, false, true); ok('bucket ' + BUCKET); }
  catch (e) { skip('bucket ' + BUCKET, e); }

  // 4. Wait for attributes to finish processing, then build indexes
  console.log('\nWaiting 15s for attributes to become available…');
  await sleep(15000);

  for (const [col, keys] of Object.entries(INDEXES)) {
    for (const k of keys) await makeIndex(col, k);
  }

  // 5. Wait for indexes, then seed
  console.log('\nWaiting 10s for indexes to become available…');
  await sleep(10000);

  const ADMIN_PW = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123
  const STD_PW   = '777a025f5ca4a20f7bafee940f2820e28e1f4bbcbd9dd774bbce883166ef7c55'; // chess123

  const users = [
    ['a007b0b0-9b30-478f-a147-1af18dff20ce', { userid:'admin', email:'admin@gmail.com',       full_name:'Academy Admin',   role:'admin' }],
    ['c0c0c0c0-0000-4000-8000-000000000001', { userid:'c1', email:'arivuselvam@gmail.com', full_name:'ARIVUSELVAM',     role:'coach', level:'Advanced',     rating:1500 }],
    ['c0c0c0c0-0000-4000-8000-000000000002', { userid:'c2', email:'gyanasurya@gmail.com',  full_name:'GYANASURYA',      role:'coach', level:'Intermediate', rating:1450 }],
    ['c0c0c0c0-0000-4000-8000-000000000003', { userid:'c3', email:'vishnu@gmail.com',      full_name:'VISHNU',          role:'coach', level:'Advanced',     rating:1600 }],
    ['c0c0c0c0-0000-4000-8000-000000000004', { userid:'c4', email:'haris@gmail.com',       full_name:'HARIS',           role:'coach', level:'Beginner',     rating:1300 }],
    ['c0c0c0c0-0000-4000-8000-000000000005', { userid:'c5', email:'yogesh@gmail.com',      full_name:'YOGESH',          role:'coach', level:'Beginner',     rating:1350 }],
    ['c0c0c0c0-0000-4000-8000-000000000006', { userid:'c6', email:'sudhin@gmail.com',      full_name:'SUDHIN',          role:'coach', level:'Beginner',     rating:1300 }],
    ['c0c0c0c0-0000-4000-8000-000000000007', { userid:'c7', email:'ranjith@gmail.com',     full_name:'RANJITH',         role:'coach', level:'Advanced',     rating:1700 }],
    ['c0c0c0c0-0000-4000-8000-000000000008', { userid:'c8', email:'rohith@gmail.com',      full_name:'ROHITH SELVARAJ', role:'coach', level:'Beginner',     rating:1400 }],
    ['student-uuid-emma', { userid:'101', email:'student@gmail.com', full_name:'Emma Wilson', role:'student', level:'Intermediate', rating:800, coach:'ARIVUSELVAM', batch:'Evening', status:'Paid' }]
  ];
  for (const [id, data] of users) {
    try { await databases.createDocument(DB_ID, 'users', id, data); ok('user ' + data.email); }
    catch (e) { skip('user ' + data.email, e); }
  }

  const creds = [
    ['admin@gmail.com', ADMIN_PW], ['student@gmail.com', STD_PW],
    ['arivuselvam@gmail.com', STD_PW], ['gyanasurya@gmail.com', STD_PW],
    ['vishnu@gmail.com', STD_PW], ['haris@gmail.com', STD_PW],
    ['yogesh@gmail.com', STD_PW], ['sudhin@gmail.com', STD_PW],
    ['ranjith@gmail.com', STD_PW], ['rohith@gmail.com', STD_PW]
  ];
  for (const [email, password] of creds) {
    try { await databases.createDocument(DB_ID, 'credentials', sdk.ID.unique(), { email, password }); ok('credential ' + email); }
    catch (e) { skip('credential ' + email, e); }
  }

  const links = [
    ['Beginner',     'https://meet.google.com/beg-inner-room'],
    ['Intermediate', 'https://meet.google.com/int-strategy-abc'],
    ['Advanced',     'https://meet.google.com/adv-endgames-xyz']
  ];
  for (const [batch_level, link] of links) {
    try { await databases.createDocument(DB_ID, 'batch_links', batch_level, { batch_level, link }); ok('batch link ' + batch_level); }
    catch (e) { skip('batch link ' + batch_level, e); }
  }

  console.log('\nDone. Logins: admin@gmail.com / admin123 — coaches & student / chess123\n');
}

run().catch(e => { console.error('\nFATAL:', e && e.message || e, '\n'); process.exit(1); });
