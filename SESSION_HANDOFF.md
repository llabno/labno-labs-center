# Labno Labs Center — Session Handoff (2026-04-05)

## What This Is
React + Vite + Supabase app. **42 pages** + 3 public pages. 4 ventures: Movement Solutions, Labno Labs, Slowbraid, personal ops. Vercel deploy. Supabase "Mission Control" (jlvxubslxzwmzslvzgxs). Build: `npx vite build` — zero errors, ~3.5s. Auth: lance@labnolabs.com (admin), romy@movement-solutions.com (clinical).

## Pages (42 + 3 public)

**Command Center (7):** Today (`/today`), Dashboard, TaskQueue (50-case build spec + run tracking), Calendar (GCal sync), WorkPlanner (merged QuickPick+SmartScheduler, simple/advanced modes), QuickPick (legacy, still works), SmartScheduler (legacy, still works)

**Build Lab (4):** AppStudio, Wishlist (Cmd+K, agent dispatch), TemplateLibrary, UILibrary

**Intelligence (3):** Oracle (lazy content loading, 10-item pagination), Strategic, Playbook

**Operations (4):** Telemetry, Resources (actionable prompts, copy-paste fixes, schedule recommendations), WorkHistory (click-to-expand, 6 data sources), Autonomous (real run history with time filters, no terminal animation)

**Clinical (5):** Speak Freely (10 boards), SOAP Notes (exercise library, voice dictation), ClinicalBlog, Reactivation, Client Availability (tier context: Resilience/Flow/Edge with full descriptions, heat map)

**Sales & Clients (7):** DualCRM (Tier 1/2/3), ClientOnboarding, ProposalGenerator, ClientDocuments (inline proposal viewer with PDF/copy), ClientProfitability, Billing Review, Screenshot to Code

**Other (5):** ProjectPassport, CommandCenter, Login, Settings (role badge: ADMIN/CLINICAL), ClientPortal (NEW)

**Public (3):** `/availability/fill`, `/demo`, `/portal` (client self-service — proposals, scheduling, contact requests)

## New Since Last Session (Apr 4-5)

### Major Features
- **Work Planner** (`/planner`) — merged QuickPick + SmartScheduler. Simple mode (time-based) + Advanced mode (launch controls, availability, heat map). "How This Works" explainer. All tasks have "Send to Agent" button.
- **Client Portal** (`/portal?client=xxx`) — public, no auth. Shows proposals, document status, availability link, contact request button. Auto-marks "sent" docs as "viewed".
- **Auto-CPT Billing** (`/api/billing/auto-cpt`) — AI-powered CPT code suggestions from SOAP notes with proper 8-minute rule enforcement.
- **Role-Based Views** — `useRole.js`: admin (sees all 42 pages) vs clinical (sees ~10 pages). Sidebar filters by role. Badge shows next to username.
- **Session Inactivity Timer** — 30-min timeout, 2-min warning banner, "Stay Active" button. Auto-logout on inactivity.
- **Autonomous Tab Rebuilt** — Terminal animation removed. Real run history with Today/Week/Month/All Time filters. Click-to-expand results. Empty state with step-by-step instructions.

### Agent Pipeline (NOW LIVE)
- `AGENT_ROUTE=api` set in Vercel production
- `ANTHROPIC_API_KEY` confirmed in Vercel
- Agent completions now write to `activity_log` (Work History shows them)
- Wishlist items auto-marked "Done" when agent completes
- Process chain: QuickPick/WorkPlanner → `/api/agent/run` (queues) → `/api/agent/process` (executes via Haiku) → results in `agent_runs` table → appears in Autonomous tab + Work History

### Infrastructure
- **Backup** — daily cron (was weekly), saves to Supabase Storage bucket "backups", auto-cleans old backups (keeps 30), backs up 27 tables
- **Health Check** — `GET /api/health?deep=true` pings all 10 API routes, checks env vars, agent budget, Oracle SOPs
- **Resource Monitor** — every optimization step has copy-paste instructions + Copy button. Security fixes labeled. Recommended run schedule (Daily/Weekly/On demand).

### UI/UX Fixes
- Dropdown transparency fixed (solid white backgrounds)
- InfoTooltip auto-positions below when near top of viewport
- Calendar selected day has stronger highlight (scale, shadow, border)
- Task Queue cards have color-coded run status (green/red/amber/gray)
- QuickPick "on demand" tasks show "Runs when needed — not scheduled"
- SmartScheduler priority legend (P0/P1/P2 explained)
- Dashboard lighter (#f7f5f2), glass panels more opaque (0.45)
- Work History entries click-to-expand with full detail panel
- Tier context shows in ClientAvailability: "Long-term stable, great rapport. Retain client, recurring monthly."
- Mobile-first responsive CSS for all grid layouts

## API Endpoints (13)
`/api/briefing/weekly`, `/api/briefing/daily`, `/api/billing/superbill`, `/api/billing/auto-cpt` (NEW), `/api/tasks/cleanup`, `/api/wishlist/add`, `/api/agent/run`, `/api/agent/process`, `/api/agent/decompose`, `/api/reactivation/score`, `/api/sniper/generate`, `/api/calendar/sync`, `/api/availability/invite`, `/api/health`, `/api/backup/export`

## Pending Migrations
Run in Supabase SQL Editor at https://supabase.com/dashboard/project/jlvxubslxzwmzslvzgxs/sql:
```sql
-- 1. Client availability
ALTER TABLE client_availability ADD COLUMN IF NOT EXISTS client_name TEXT;

-- 2. Wishlist dispatch tracking
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- 3. Exercise library (run file: 20260404_exercise_library.sql)

-- 4. Task meta columns + seed improvement tasks (run file: 20260405_seed_improvement_tasks.sql)
```

## Env Vars (Vercel)
- `AGENT_ROUTE=api` — enables real agent execution (was simulation)
- `ANTHROPIC_API_KEY` — for agent processing + auto-CPT
- `CRON_SECRET` — for cron job auth
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — backend
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — frontend
- `GOOGLE_CALENDAR_ID` — NEEDS TO BE SET for calendar sync
- `GOOGLE_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_KEY` — NEEDS TO BE SET

## Cron Jobs (vercel.json)
- `/api/agent/process` — every 15 min (processes queued agent runs)
- `/api/backup/export?cron=true&store=true` — daily 6am (full DB backup)
- `/api/data/quality-notify` — daily 6am
- `/api/telemetry/aggregate` — hourly
- `/api/reactivation/score` — daily 6:15am
- `/api/mechanic/journal-reminder` — every 3 hours
- `/api/memory/consolidate` — daily 6am
- `/api/diagnostic/monday` — Mondays at noon

## Key Design Decisions
- **Roles:** admin (@labnolabs.com) sees everything. clinical (@movement-solutions.com) sees ~10 clinical pages.
- **Agent routing:** AGENT_ROUTE=api uses Anthropic API. =local uses Claude CLI. Default=simulation (no cost).
- **Billing:** Auto-CPT with 8-minute rule. AI suggests codes from SOAP content.
- **Backups:** Daily to Supabase Storage, 30 retained, 27 tables exported.
- **Session security:** 30-min inactivity timeout with 2-min warning.

## How to Continue
1. Read this file + MEMORY.md
2. `cd /Users/lancelabno/Projects/labno-labs-center && npx vite build`
3. Run pending migrations above in Supabase SQL Editor
4. Set GOOGLE_CALENDAR_ID + GOOGLE_API_KEY in Vercel env vars
