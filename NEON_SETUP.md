# ChessKidoo — Neon Backend Setup

Your backend now uses **Neon** (PostgreSQL). Neon's **Data API** is a PostgREST
endpoint — the exact protocol the app was originally built for — so the
migration was clean: a small adapter (`assets/js/neon-adapter.js`) talks to
Neon's Data API and the rest of the app is unchanged.

Work through these steps in order.

---

## 0. SECURITY — rotate your database password first

You pasted your Neon Postgres connection string (with the password) into chat,
so treat it as exposed:

- Neon Console → your project → **Roles** → reset the password for
  `neondb_owner` (or create a fresh role).
- The password / connection string is used **only** to run the SQL in Step 1.
  It must **never** go into the website — the browser only ever uses the
  public Data API URL.

---

## 1. Create the tables

Open the Neon Console → your project → **SQL Editor**, paste the entire
contents of **`neon_setup.sql`** (in this folder), and click **Run**.

This creates all 20 tables with the exact columns the app expects, opens them
to the Data API, and seeds the admin / coach / student logins.

Verify it worked — run: `SELECT count(*) FROM public.users;` → should return 10.

---

## 2. Enable the Data API & check its URL

- Neon Console → your project → **Data API** (or **Settings → Data API**).
- Make sure the Data API is **enabled**.
- Confirm the URL. The code currently uses:
  `https://ep-restless-dream-aotmdya8.apirest.c-2.ap-southeast-1.aws.neon.tech/neondb/rest/v1`
  If yours differs, edit `assets/js/config.js` → `NEON.DATA_API_URL`.

---

## 3. Set the Data API key (if your project needs one)

On the same Data API page, Neon shows how requests authenticate:

- **If anonymous access is allowed** — leave `NEON.API_KEY` as `""` in
  `assets/js/config.js`. Nothing else to do.
- **If a key / token is required** — copy it and paste it into
  `assets/js/config.js` → `NEON.API_KEY`. (A publishable/anon-style key is
  fine to put in client code; a private/secret key is NOT — if Neon only
  offers a secret key, tell me and we'll wire up Neon Auth instead.)

> If logins/data don't work after deploy, this is the most likely cause —
> check the browser console (F12) for `401`/`403` from the Data API.

---

## 4. Allow the website's domain (CORS)

If the Data API page has an **allowed origins / CORS** setting, add
`https://chessk.vercel.app` (and `http://localhost` for local testing).
If there's no such setting, Neon's Data API allows browser origins by default.

---

## 5. Deploy

```bash
git add assets/js/ index.html neon_setup.sql NEON_SETUP.md
git commit -m "feat: migrate backend to Neon Data API + add map link"
git push
```

Vercel auto-deploys. Hard-refresh https://chessk.vercel.app (Ctrl+Shift+R).

---

## 6. Default logins

| Role  | Email                | Password  |
|-------|----------------------|-----------|
| Admin | admin@gmail.com      | admin123  |
| Coach | (any coach email)    | chess123  |
| Student | student@gmail.com  | chess123  |

Coach emails: arivuselvam@, gyanasurya@, vishnu@, haris@, yogesh@, sudhin@,
ranjith@, rohith@ (all `@gmail.com`).

---

## 7. Test (incognito window)

- Open the site → F12 → Console → look for `Neon Data API adapter ready`.
- Log in as a coach → create a class.
- In the Neon SQL Editor: `SELECT * FROM classes;` — the new row should be
  there. That confirms real persistence.

---

## How it works / safety net

`neon-adapter.js` speaks PostgREST to Neon's Data API and exposes the same
interface the app already used. If Neon is ever unreachable or not set up,
the app **automatically falls back to its built-in localStorage data** — it
keeps working, so a backend issue can't take the site down.

## Notes

- **File uploads** (homework PDFs/materials): Neon has no file storage, so the
  document *record* saves but the file binary isn't hosted. Coaches can still
  use links. A dedicated file host can be added after launch.
- Two object-valued fields (AI weekly-report blob, spaced-repetition data) are
  stored as JSON — they work on Neon since the columns are `JSONB`.
- Obsolete now (safe to ignore/delete): `supabase_setup.sql`,
  `appwrite-setup.js`, `APPWRITE_SETUP.md`, `assets/js/appwrite-adapter.js`,
  `src/` folder, `vite.config.js`.

## If something doesn't work

Open the console (F12). The adapter logs `[ChessKidoo]` messages. A `401`/`403`
means the Data API key/auth (Step 3); a CORS error means Step 4; a `404` on a
table means Step 1 didn't run. Send me the exact red error and I'll fix it.
