# ChessKidoo — Appwrite Backend Setup

Your backend has been migrated from Supabase to **Appwrite**. The app code was
kept intact — a small adapter (`assets/js/appwrite-adapter.js`) translates the
app's existing data calls to Appwrite, so nothing else had to be rewritten.

Work through these 6 steps in order. ~20 minutes.

---

## 0. SECURITY — regenerate your API key first

You pasted your Appwrite **server API key** into chat, so treat it as exposed.

- Appwrite Console → your project → **Overview → Integrations / API keys**
- **Delete** the old key, **create a new one** (scopes: `databases.*`,
  `collections.*`, `attributes.*`, `indexes.*`, `documents.*`, `buckets.*`)
- Use the **new** key only for Step 3 below. It must never go into the website.

---

## 1. Add the website as a Web Platform  (REQUIRED — or the browser is blocked)

Appwrite rejects browser requests from unregistered domains.

- Console → your project → **Overview → Platforms → Add platform → Web App**
- Name: `ChessKidoo`, Hostname: `chessk.vercel.app`
- Add a second platform with hostname `localhost` (so you can test locally)

---

## 2. Verify the API endpoint

- Console → **Settings** (or the project overview) → find the **API Endpoint**.
- The code currently uses `https://sgp.cloud.appwrite.io/v1` (Singapore region).
- If yours is different, edit `assets/js/config.js` → `APPWRITE.ENDPOINT` to match.
- The `PROJECT_ID` is already set to `6a0deace00126a358c7d`.

---

## 3. Build the database (run once, on your computer)

This creates all 20 collections, their attributes, indexes, the storage
bucket, and the admin/coach/student logins.

```bash
cd D:\MY\chessk
npm install node-appwrite@14
node appwrite-setup.js  YOUR_NEW_API_KEY
```

(The `@14` pin matches the script's API calls. If you see signature errors,
tell me the exact message and I'll adjust.)

(If Step 2 showed a different endpoint, pass it as a 2nd argument:
`node appwrite-setup.js YOUR_NEW_API_KEY https://cloud.appwrite.io/v1`)

The script prints a ✓ for each item and pauses ~25s while Appwrite processes
attributes and indexes. It's safe to re-run — existing items are skipped.

> Do not commit your API key. The script takes it from the command line so it
> never gets saved into a file.

---

## 4. Deploy the code

```bash
git add assets/js/ index.html appwrite-setup.js APPWRITE_SETUP.md
git commit -m "feat: migrate backend from Supabase to Appwrite"
git push
```

Vercel auto-deploys. Then hard-refresh https://chessk.vercel.app (Ctrl+Shift+R).

---

## 5. Default logins (after Step 3)

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@gmail.com        | admin123  |
| Coach | (any coach email)      | chess123  |
| Student | student@gmail.com    | chess123  |

Coach emails: arivuselvam@, gyanasurya@, vishnu@, haris@, yogesh@, sudhin@,
ranjith@, rohith@ — all `@gmail.com`. Change passwords after launch via the
Admin portal → Access Manager.

---

## 6. Test (in an incognito window)

- Open the site, F12 → Console — look for `Appwrite backend adapter ready`.
- Log in as admin → add a student → log out → log in as that student.
- Log in as a coach → create a class.
- In the Appwrite Console → **Databases → chesskidoo → classes**, confirm the
  new class row is there. That proves real persistence is working.

---

## How it works / safety net

`appwrite-adapter.js` exposes the same interface the app already used, backed
by Appwrite. If Appwrite is ever unreachable, or you skip Step 3, the app
**automatically falls back to its built-in localStorage data** — it keeps
working, just without cross-device persistence. So a backend hiccup can't take
the site down.

## Known limitations to revisit after launch

- Two object-valued fields (the AI weekly-report blob and a spaced-repetition
  blob) don't persist to Appwrite; they fall back to localStorage. Non-critical.
- New students created in the Admin portal get a profile but need a password
  set via Admin → Access Manager before they can log in.
- The old `supabase_setup.sql`, `src/` folder and `vite.config.js` are now
  unused legacy — safe to ignore or delete later.

## If something doesn't work

Open the browser console (F12). The adapter and data layer log clear messages.
Copy any red `[ChessKidoo]` error and send it over — it pinpoints the exact
collection/attribute to fix.
