# ChessKidoo — Platform Audit & PGN Architecture Verification

**Auditor role:** Senior architect / QA / security / UX review
**Method:** Source-code review across all modules + live Supabase schema inspection.
**Important caveat:** the build could not be run during this audit (sandbox
unavailable), so **performance, live-video reliability, and penetration testing
are architect-level estimates from code review, not measured numbers.** Scores
reflect that. Everything about the database and schema below was verified against
the live project.

---

## PART A — Hybrid PGN Vault: did we implement the recommended architecture?

Your recommended model was: **local-first PostgreSQL storage + external APIs for
enrichment + Stockfish + a background queue.** Here's the honest status.

| Architecture component | Status | Evidence |
|---|---|---|
| Local PGN DB (student/coach/tournament/class) | ✅ Implemented | `pgn_games` table has a `source` column: upload/manual/lichess/chesscom/tournament/coach/class. Verified live. |
| PostgreSQL storage (not vendor lock-in) | ✅ Implemented | Supabase Postgres tables `pgn_games`, `pgn_analysis`, `pgn_notes`. |
| External APIs — Lichess | ✅ Implemented | `pgn-vault.js` `importLichess()` + `pgn-library.js` Lichess fetch. |
| External APIs — Chess.com | ✅ Implemented | `pgn-vault.js` `importChesscom()` + `pgn-library.js`. |
| One-click username import → download → store | ✅ Implemented | Vault import buttons; stores normalized games. |
| One-click → **run Stockfish → report → graphs** | ⚠️ Partial | The queue + trigger exist; the worker isn't deployed (see below). |
| Cloud vault: store games/analysis/notes | ✅ Implemented | `pgn_games` + `pgn_analysis` + `pgn_notes`. |
| Cloud vault: store **reports / training plans** | ❌ Not yet | No `training_plans` / `reports` table for the vault. |
| Search (opening, opponent, result, date, tournament, coach) | ⚠️ Partial | Free-text search (players/opening/ECO) + filters for result/source/colour. **Date, tournament, coach filters not yet built.** |
| Filter (wins/losses/draws/blunders/accuracy) | ⚠️ Partial | W/L/D yes; **filtering by blunders/accuracy not yet** (accuracy is shown, not filtered). |
| Analytics (best/worst opening) | ✅ Implemented | Vault analytics compute best/worst opening + win rate + avg accuracy. |
| Analytics (endgame/tactical performance) | ❌ Not yet | Not computed — needs the engine analysis to populate phase metrics. |
| Background queue (Redis recommended) | ✅ Implemented (Postgres queue) | `pgn_analysis_queue` + `trg_enqueue_pgn_analysis` trigger (verified present). A Postgres queue replaces Redis — simpler, same contract. |
| Stockfish analysis worker | ⚠️ **Coded, NOT deployed** | `supabase/functions/analyze-pgn/index.ts` exists but `list_edge_functions` returns empty. Run `supabase functions deploy analyze-pgn`. |
| AI Coach Tom reviews the analysis | ❌ Not yet | Tom is currently rule-based (see AI section); no analysis→Tom pipeline. |

**Verdict on PGN:** the hybrid local + cloud + external-API architecture you
asked for is **genuinely implemented** at the data layer and frontend. The two
gaps to make it fully "real-time analysis flow": **(1) deploy `analyze-pgn`** so
the queue actually drains, and **(2) build the search/filter/analytics depth**
(date/coach/tournament search, blunder/accuracy filters, phase analytics) on top
of the analysis rows. It is **not** vendor-locked and you own all the data. ✅

---

## PART B — Full platform audit

### Executive summary

ChessKidoo is an unusually **feature-broad** academy platform: four role portals,
LMS-ish resources, CRM lead capture, attendance, fees, tournaments, a live-class
sync, a PGN/Stockfish lab, an arcade, and a polished marketing site. The breadth
and visual quality are genuinely strong for an academy product.

**The one thing that gates everything: security.** The app uses the public
Supabase **anon key with permissive `ck_app_all` RLS on every table**, meaning
anyone who opens the site can read/write the entire database — **including the
`credentials` table (login hashes) and minors' PII**. That is the dominant
finding and must be fixed before this can be called production-grade for a
platform handling children's data.

### Scorecard (/10 unless noted)

| Area | Score | One-line rationale |
|---|---|---|
| Visual design | **8.0** | Cohesive gold/navy premium theme; strong landing; minor spacing/contrast inconsistencies. |
| UX | **7.5** | Rich and capable, but dense — high feature count raises cognitive load/discoverability cost. |
| **Security** | **3.0** | Critical: anon-key full DB access incl. credentials + PII; GMeet private key in client; client-side auth. |
| Performance | **6.0** | No bundling; very large monolithic JS files; many blocking CDN scripts. Functional but heavy. |
| PGN Lab | **7.5** | Solid hybrid build; worker undeployed; analytics/search depth pending. |
| LMS | **5.5** | Resources/e-library/homework live; structured courses/quizzes/cert verification partial. |
| CRM | **5.0** | Lead capture + WhatsApp/email handoff; pipeline stages/automation minimal. |
| Tournament | **6.5** | Swiss pairing + engine present; FIDE tiebreaks, cert/PDF, live standings partial. |
| AI Coach Tom | **4.0** | Rule-based keyword assistant + heuristic "analysis"; not an LLM/engine-backed coach. |
| Mobile responsiveness | **7.0** | Responsive layers added this engagement; dense tables/boards still tight at 320px. |
| **Overall** | **~60/100** | Strong product capped by critical security + a few "coded-not-deployed" gaps. |

---

### SECTION 1 — Visual design (8/10)
Strengths: consistent premium gold/navy identity, good typography hierarchy,
strong landing (visual journey path, structured data, social proof), the 2026
redesign layer modernised Progress/Tournaments/Live/Access-Manager. Issues:
some inline-styled components create spacing drift; a few low-contrast muted-text
spots (the contrast-fix layer addresses the worst); the arcade and some admin
tables feel denser/older than the marketing pages. **Target after polish: 9/10.**

### SECTION 2 — UX (7.5/10)
Journeys work end-to-end for all four roles. The cost is **density** — students
have ~18 sidebar destinations; discoverability suffers. Recommended: a "Today"
home that surfaces the 3 things that matter (next class, due homework, daily
puzzle), collapse rarely-used nav into a "More" group, and add empty-state
guidance everywhere (now that demo data is reset to zero, empty states matter a lot).

### SECTION 3 — Performance (6/10, estimated)
Real risks from code: `student.js` ~3.9k lines, `arena.js` ~3.4k, `main.js`
~2.3k loaded as raw `<script>` modules (Vite is configured but the app ships
unbundled), plus ~15 third-party CDN scripts in `<head>`. Recommend: build with
Vite for tree-shaking/minification/code-splitting, lazy-load the arcade/lab/arena
bundles, self-host critical libs, and defer non-critical CDNs. Charts and boards
render fine but large tables (Access Manager, leaderboards) should virtualise.

### SECTION 4 — Security (3/10) — **the critical section**
1. **CRITICAL — Whole DB exposed via the public anon key.** Every table has a
   permissive `ck_app_all` policy for `anon`. The anon key is public (in
   `config.js`), so anyone can read/write `users`, `credentials`, `hw_submissions`,
   `fees`, etc. **The `credentials` table (105 rows of email → password hash) is
   world-readable.** This is a breach waiting to happen, and it's children's data.
2. **CRITICAL — Service-account private key in client code** (`gmeet-api.js`).
   Already flagged; rotate the key, deploy `create-meet`, delete the block.
3. **HIGH — Client-side auth with SHA-256 password hashes** (`auth.js` /
   `credentials`). No server verification, hashes appear unsalted; brute-forceable
   offline once the table is read (see #1).
4. **MEDIUM — No real RBAC at the data layer.** Role checks are client-side only;
   the DB grants everyone everything. A student can write coach/admin tables.
5. XSS: the codebase uses `CK.esc()` in many places (good) but there are raw
   `innerHTML` template interpolations of user data in spots — audit each.

**Remediation path (do before scaling):** migrate to **Supabase Auth**, tie RLS
to `auth.uid()`/role claims, restrict `credentials` to service-role only (or drop
it for Supabase Auth), salt+hash server-side, and keep the permissive model only
for genuinely public/read tables. This is a real project but it's the #1 priority.

### SECTION 5 — PGN & Stockfish Lab (7.5/10)
Upload/parse/replay/move-nav/position-loading all work (chessboard.js + chess.js,
chess.com pieces). Accuracy/mistake/blunder/opening recognition exist in
heuristic form client-side; true engine numbers depend on deploying `analyze-pgn`.
Coach review (comments/position-marking/homework/sharing) is partially there via
the homework + lab flows. Evaluation bar + analysis panels render. **Deploy the
worker and wire phase analytics to reach 9/10.**

### SECTION 6 — Live class (estimate)
Architecture: a synced board + engine eval + coach broadcast over Supabase
realtime, plus a **Google Meet join card** (now resolves from the auto-generated
class room). There is **no native WebRTC video** — video happens in Meet (a
sensible, reliable choice). The old "Phase 4 stub" was removed. Recording/native
screen-share are not in-app (Meet handles them). Reliable for its design; set
expectations that video = Meet, not in-app.

### SECTION 7 — LMS (5.5/10)
Resources/e-library/video/coach-assignments tabs exist and now sync (the
`document` table was fixed + realtime added). Gaps: structured course→lesson→quiz
progression, quiz engine, automatic certificate issuance with QR verification
(certs exist as PDF downloads but aren't course-completion-driven or persisted
cross-device). 

### SECTION 8 — CRM (5/10)
Lead capture works (`leads` table, demo form → WhatsApp/email). Missing: a real
pipeline (New→Interested→Trial→Joined→Dropped), follow-up scheduling, and
automation. The WhatsApp/email handoff is manual, not automated.

### SECTION 9 — Tournament module (6.5/10)
`tournament-engine.js` + `swiss-pairing.js` exist; tournaments table has 4 rows.
Pairings/standings present. Validate FIDE tiebreaks, rating calc, knockout/RR
edge cases, and add certificate + PDF report generation and live standings.

### SECTION 10 — Mobile responsiveness (7/10)
A dedicated responsive layer was added (`mobile-optimize-2026.css`) plus
touch-native effects. Remaining tight spots at 320–375px: wide admin tables
(now scroll), some board + side-panel layouts, and dense stat grids. Test the
report card and access manager at 320px.

### SECTION 11 — Animation & premium feel (8/10)
Strong: GSAP hero entrance + word fly-in, AOS/GSAP scroll reveals, the new
landing-fx layer (scroll-progress bar, count-up stats, cursor spotlight, card
tilt, tap ripples, press-scale, fade-up-on-scroll gap-filler), and the upgraded
page transition (fade + rise). All reduced-motion-safe. Missing: **skeleton
loaders** during data fetches and **animated chart draw-in**.

### SECTION 12 — Database (6/10)
34 tables, sensible naming, the missing tables were created and realtime enabled
(16 tables). Issues: the permissive RLS (security, above); a few FK columns
(`pgn_notes.game_id`) lack indexes; some progress tables (`elibrary_progress`,
`video_progress`, `live_class_chats`) are still localStorage-only. Add indexes on
FKs and hot filter columns; finish the 3 localStorage tables.

### SECTION 13 — AI Coach Tom (4/10)
Honest finding: **Tom is a rule-based keyword chatbot** (`tomai.js` + keyword
maps in `main.js`), plus heuristic game stats (`ai-analysis.js`). It is **not** an
LLM and does not do engine-grounded explanations. To deliver the "Tom Analysis /
AI Training Plan / Why-was-my-move-bad" vision, wire an LLM (or templated
engine-explanations) on top of the Stockfish output once the worker is deployed.

---

## Top issues (prioritised)

**Critical (fix before scaling):**
1. Anon-key full-DB access incl. `credentials` + minors' PII (RLS/auth model).
2. Google service-account private key shipped in client (`gmeet-api.js`).
3. Client-side auth, unsalted SHA-256 hashes, no server RBAC.
4. `analyze-pgn` / `create-meet` edge functions coded but **not deployed**.

**Major:**
5. No build/bundle step (huge unminified JS, many blocking CDNs).
6. AI "Tom" is rule-based, not engine/LLM-backed — manage expectations or upgrade.
7. PGN search/filter/analytics depth incomplete (date/coach/tournament, blunder/accuracy, phase metrics).
8. LMS lacks structured courses/quizzes + completion-driven certs.
9. CRM lacks pipeline + automation.
10. Three progress tables still localStorage-only (cross-device gaps).
11. Certificates not persisted cross-device (localStorage).

**Minor:**
12. Inline-style spacing drift; a few low-contrast spots.
13. Stale CSS class names (`bottles-card`/`carrom-card`) on game cards.
14. Dead code (`classroom.renderReportCard` unreachable; `startBottleShooter` orphaned).
15. Missing skeleton loaders / empty-state guidance (now critical post data-reset).
16. Some FK columns unindexed.
17. jsPDF certificate can't render non-Latin (Tamil) names.

## Top improvements (highest ROI first)
1. **Supabase Auth + proper RLS** (unblocks everything; enables true RBAC).
2. **Deploy the two edge functions** + a cron to drain the Stockfish queue.
3. **Add a Vite build** + lazy-load arcade/lab/arena.
4. **Upgrade Tom** to LLM-or-templated engine explanations on analysis output.
5. **"Today" home** per role to cut cognitive load.
6. Finish PGN **search/filter/analytics** (date/coach/tournament, blunder/accuracy, opening explorer with win%).
7. **Skeleton loaders** + animated chart draw-in for premium feel.
8. **Certificates + reports** persisted server-side with QR verification.
9. CRM **pipeline + WhatsApp automation**.
10. Tournament **certificates + PDF reports + FIDE tiebreak validation**.

## Missing premium / enterprise / chess-specific features
- **Premium:** skeleton loaders, command palette, audit log UI, exportable reports, dark/light toggle, push notifications.
- **Enterprise:** real RBAC, SSO, audit trail, data-export/GDPR tooling, multi-branch/academy tenancy, billing/invoicing.
- **Chess-specific:** opening explorer with master-game win%, engine-backed move explanations, spaced-repetition tactics trainer (you have SRS hooks — expand), FIDE rating sync, tournament broadcast/PGN live relay, blunder-of-the-week digest.

## Recommended roadmap
- **Phase 0 (now, blocking):** Supabase Auth + RLS lockdown; rotate the SA key; deploy both edge functions. *(security + the coded-not-deployed gaps)*
- **Phase 1 (launch+2wk):** Vite build + lazy-loading; skeleton loaders; "Today" home; finish PGN search/filter/analytics; index FKs.
- **Phase 2 (month 1–2):** LMS courses/quizzes/cert pipeline; CRM pipeline + WhatsApp automation; tournament certs/PDF; persist certs/reports.
- **Phase 3 (quarter):** Tom LLM upgrade on engine output; opening explorer; analytics center; mobile app shell (PWA already present).

## Priority matrix
- **High impact / High urgency:** Auth+RLS, deploy edge functions, rotate SA key.
- **High impact / Lower urgency:** Vite build, Tom upgrade, PGN analytics depth.
- **Lower impact / Quick wins:** skeleton loaders, empty states, dead-code cleanup, FK indexes, stale class names.

## Final verdict
**Can ChessKidoo compete with premium academy platforms?** On **breadth, design,
and chess-specific depth — yes, it's already in the conversation**, and few
competitors combine a polished marketing site, four portals, a PGN/Stockfish lab,
and an arcade. **But not yet on trust/enterprise-readiness**, because the security
model (anon-key full-DB access to children's data + auth done client-side) is
disqualifying for a serious platform. **Fix Phase 0 and it crosses the line from
"impressive academy app" to "credible premium product."** The good news: the hard
product work is largely done; the gap is mostly a focused security/auth migration
plus deploying what's already coded.
