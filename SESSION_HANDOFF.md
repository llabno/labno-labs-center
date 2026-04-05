# Labno Labs Center — Session Handoff (2026-04-05)

## What This Is
React + Vite + Supabase app. **45 pages** + 3 public pages. 4 ventures: Movement Solutions, Labno Labs, Slowbraid, personal ops. Vercel deploy. Supabase "Mission Control" (jlvxubslxzwmzslvzgxs). Build: `node_modules/.bin/vite build` — zero errors, ~4s. Auth: lance@labnolabs.com (admin), romy@movement-solutions.com (clinical).

## Pages (45 + 3 public)

**Command Center (7):** Today, Dashboard (Getting Started banner), TaskQueue (50-case build spec + color-coded run tracking), Calendar (GCal sync), WorkPlanner (merged QuickPick+SmartScheduler with simple/advanced modes), QuickPick (legacy), SmartScheduler (legacy)

**Build Lab (4):** AppStudio, Wishlist, TemplateLibrary, UILibrary

**Intelligence (4):** Oracle (lazy loading, 10-item pagination), Strategic, Playbook, ContentPipeline (NEW — kanban: Ideas→Drafting→Review→Published)

**Operations (5):** Telemetry, Resources (actionable fix prompts + copy button + schedule), WorkHistory (NEW — unified activity_log, auto-duration, action filters), Autonomous (real run history, time filters), AgentQueue (NEW — human-in-the-loop confirmation)

**Clinical (5):** Speak Freely, SOAP Notes (auto-CPT Suggest button), ClinicalBlog, Reactivation, Client Availability (tier context + scheduling seasons + weekly openings)

**Sales & Clients (7):** DualCRM, ClientOnboarding, ProposalGenerator, ClientDocuments (inline proposal viewer), ClientProfitability, Billing Review, Screenshot to Code

**Other (5):** ProjectPassport, CommandCenter, Login, Settings (role badge), ClientPortal (NEW)

**Public (3):** `/availability/fill`, `/demo`, `/portal` (client self-service)

## Architecture Changes (Apr 4-5)

### Unified Data Source
- `activity_log` table is now the SINGLE source of truth for all activity
- 7 database triggers auto-write to it: global_tasks, agent_runs, soap_notes, session_briefs, wishlist, communication_log, client_documents
- Work History reads ONE table instead of 8 parallel queries
- Auto-duration estimation built in

### Agent Pipeline (LIVE)
- `AGENT_ROUTE=api` set in Vercel production
- Flow: WorkPlanner → `/api/agent/run` (queues) → `/api/agent/process` (Haiku) → results in `agent_runs` → triggers write to `activity_log`
- Agent Queue page for human-in-the-loop: `/agent-queue`
- `agent_questions` JSONB column on agent_runs for Q&A

### Role-Based Access
- `useRole.js`: admin (@labnolabs.com) sees all 45 pages, clinical (@movement-solutions.com) sees ~10
- Sidebar filters zones by role. Role badge shows next to username.

### Offline Cache
- Service worker at `/public/sw.js` registered in main.jsx
- Network-first for Supabase API calls, cache-first for static assets
- Critical pages (SOAP, Billing, Availability) work offline

### Security
- Session inactivity timer: 30-min timeout, 2-min warning, auto-logout
- Daily backup cron to Supabase Storage (27 tables, keeps 30 backups)
- Health check: `GET /api/health?deep=true` pings all routes + checks env vars

## API Endpoints (15)
`/api/briefing/weekly`, `/api/briefing/daily`, `/api/billing/superbill`, `/api/billing/auto-cpt`, `/api/tasks/cleanup`, `/api/wishlist/add`, `/api/agent/run`, `/api/agent/process`, `/api/agent/decompose`, `/api/reactivation/score`, `/api/sniper/generate`, `/api/calendar/sync`, `/api/availability/invite`, `/api/health`, `/api/backup/export`

## Cron Jobs (vercel.json — 8 total)
- `/api/agent/process` — every 15 min
- `/api/backup/export?cron=true&store=true` — daily 6am
- `/api/data/quality-notify` — daily 6am
- `/api/telemetry/aggregate` — hourly
- `/api/reactivation/score` — daily 6:15am
- `/api/mechanic/journal-reminder` — every 3 hours
- `/api/memory/consolidate` — daily 6am
- `/api/diagnostic/monday` — Mondays noon

## Env Vars (Vercel)
Set: `AGENT_ROUTE=api`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GOOGLE_CALENDAR_ID`
Needs: `GOOGLE_API_KEY` (Google Cloud Console → Credentials → Create API Key → Enable Calendar API)

## Build Notes
- Use `node_modules/.bin/vite build` (NOT npx — it may resolve Vite 8 instead of local Vite 5)
- CSS uses `[style*=]` attribute selectors for mobile grid override of React inline styles

## How to Continue
1. Read this file + MEMORY.md
2. `cd /Users/lancelabno/Projects/labno-labs-center && node_modules/.bin/vite build`
3. Check Vercel deployment status
4. Set GOOGLE_API_KEY when ready for calendar sync
