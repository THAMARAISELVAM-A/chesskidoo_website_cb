# ChessKidoo — Launch Checklist

This is your step-by-step guide to get the real Supabase backend live.
Work through it top to bottom. Estimated time: 20–30 minutes.

---

## What was wrong (plain English)

Your app was *built correctly* to use Supabase, but several database tables had
column names that did **not** match what the JavaScript sends. Example: the code
saves a class with `maxStudents` / `zoomLink`, but the old database had
`max_students` / `zoomlink`. When names don't match, Supabase **rejects the whole
save**, and the app quietly falls back to its built-in demo data. That's why it
looked like "demo mode" — the real writes were failing silently.

**The fix:** a corrected database schema (`supabase_setup.sql`) where every
column exactly matches the code, plus one small JavaScript fix in `db.js`.

---

## STEP 1 — Rebuild the database  (REQUIRED)

1. Open https://supabase.com/dashboard/project/hcjuyqicftkgpiyrkscr
2. Left sidebar → **SQL Editor** → **New query**
3. Open the file `supabase_setup.sql` from this folder, copy **everything**, paste it in
4. Click **Run**
5. You should see "Success. No rows returned."

> This rebuilds all 20 tables cleanly. It WIPES old table data — that's fine
> pre-launch (the old data was just demo data). It also seeds the admin + 8
> coach + 1 demo-student logins and the `documents` storage bucket.

**Verify it worked** — run this in the SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
```
You should see 20 tables (users, classes, attendance, assignments, document, etc.).

---

## STEP 2 — Auth settings  (REQUIRED)

The academy admin creates student/coach accounts from inside the app. For those
new accounts to log in immediately, turn OFF email confirmation:

1. Supabase Dashboard → **Authentication** → **Sign In / Providers** (or **Settings**)
2. Find **"Confirm email"** → turn it **OFF**
3. Save

> The 9 seeded logins below already work without this — they use the built-in
> `credentials` table. This step only matters for accounts created later.

---

## STEP 3 — Default logins (after Step 1)

| Role  | Email                   | Password   |
|-------|-------------------------|------------|
| Admin | admin@gmail.com         | admin123   |
| Coach | arivuselvam@gmail.com   | chess123   |
| Coach | vishnu@gmail.com        | chess123   |
| (…all 8 coach emails use password `chess123`) | | |
| Student | student@gmail.com     | chess123   |

Change these after launch via the Admin portal → Access Manager.

---

## STEP 4 — Payments (OPTIONAL — only if taking online card payments)

`assets/js/config.js` line 25 has a placeholder Razorpay key
(`rzp_test_REPLACE_WITH_YOUR_KEY`). Card payments will not work until you put
your real key there. UPI payments (the `ACADEMY_UPI_ID` in the same file) work
without Razorpay. If you only use UPI for launch, you can skip this.

---

## STEP 5 — Deploy

From this folder (`D:\MY\chessk`), run:

```bash
git add supabase_setup.sql assets/js/db.js LAUNCH_CHECKLIST.md
git commit -m "fix: reconcile Supabase schema with app code; fix attendance upsert"
git push
```

Vercel auto-deploys from GitHub. Watch the deployment at vercel.com — it takes
~1 minute. Then hard-refresh https://chessk.vercel.app (Ctrl+Shift+R).

> Note: `supabase_setup.sql` only needs to be RUN once in Supabase (Step 1).
> Committing it just keeps it in your repo for reference.

---

## STEP 6 — Test after deploy  (do this before announcing launch)

Open the site in a **private/incognito window** (so old demo data in
localStorage doesn't mask real behavior) and check:

- [ ] Landing page loads, no console errors (F12 → Console)
- [ ] Log in as **admin** → Admin portal opens
- [ ] Admin → add a student → log out → log in as that student
- [ ] Log in as a **coach** → create a class → it saves
- [ ] Coach → upload homework / a class material file
- [ ] Coach → mark a student present → check it shows in Admin
- [ ] Student portal → see the class + homework the coach added
- [ ] Open the same account in another browser → data is the same
      (this proves it's saving to Supabase, not just localStorage)

**How to confirm real persistence:** after creating a class, go to Supabase →
**Table Editor** → `classes` table. The new row should be there.

---

## Known issues to handle AFTER launch (not blockers)

1. **Parent feedback display** — the parent feedback form and the coach's
   feedback inbox use slightly different field names internally. Feedback will
   *save* fine, but may display incompletely on one side. Needs a small code
   cleanup later.
2. **Security (RLS)** — this setup keeps Row Level Security OFF so the public
   anon key can read/write. That's normal for launch but means anyone with the
   key can write data. Post-launch, consider proper RLS policies.
3. **Browser/build testing** — I could not run the site or a browser this
   session, so the items in Step 6 are your verification. If anything there
   fails, send me the console error (F12 → Console) and I'll fix it.

---

## If something breaks

Open the browser console (F12 → Console) and look for red errors. The most
useful ones start with `[ChessKidoo DB]`. Copy the exact message and send it —
that tells me precisely which table/column is still off.
