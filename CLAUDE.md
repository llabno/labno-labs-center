# Labno Labs Center — Claude Code Project Context

## What This Is
Labno Labs Center ("Mission Control") is the internal operations dashboard for Lance Labno's multi-venture system. It connects two worlds:

1. **MOSO Overseer** — Personal AI agent system (Chief, Coach, Architect, Voice, Librarian) running on Gemini Gems + Google Sheets + Apps Script
2. **Labno Labs Center** — React + Supabase + Vercel dashboard with autonomous task execution, CRM, Oracle (second brain), and project management

## Routing Architecture: Local vs API

**Core principle:** Only spend API tokens when the system must work without Lance present. Everything interactive uses the Pro subscription (Claude Code) or free tier (Gemini).

### When to use LOCAL (Claude Code Pro / Gemini — no API cost)
- Code changes, refactoring, debugging
- Reading/writing to Supabase via CLI or local dev server
- Oracle queries during development (`npm run dev` routes through local)
- Running MOSO agent tasks interactively (Coach pulse, Chief briefing)
- Syncing MOSO outputs to Supabase (bridge script)
- Any task where Lance is present at the keyboard

### When to use VERCEL API KEY (paid per-token)
- `/api/agent/process` — cron-triggered autonomous task execution (runs every minute)
- `/api/agent/sdk` — dashboard-triggered agent runs when Lance clicks "Execute"
- `/api/oracle/ask` — production Oracle queries from the live dashboard
- `/api/lemon-squeezy/webhook` — no AI needed, just webhook routing

### Model routing
| Context | Model | Cost |
|---------|-------|------|
| IDE (Claude Code) | Claude Opus 4.6 | Pro subscription (included) |
| Vercel agent tasks | Claude Sonnet 4 | API key (per-token) |
| Oracle production | Claude Haiku 3 | API key (per-token, cheap) |
| MOSO agents (Chief, Coach, etc.) | Gemini | Free (Google AI Studio) |
| Local dev Oracle | Claude via CLI | Pro subscription (included) |

## Tech Stack
- **Frontend:** React 18 + React Router 6 (SPA)
- **Build:** Vite 5
- **Backend:** Vercel Serverless (Node.js) + FastAPI (Python)
- **Database:** Supabase (PostgreSQL + pgvector for embeddings)
- **Auth:** Supabase Auth (email-restricted to @labnolabs.com, @movement-solutions.com)
- **AI:** Anthropic Claude API (Sonnet for agents, Haiku for Oracle)
- **Payments:** Lemon Squeezy webhook integration
- **Telemetry:** PostHog
- **MOSO layer:** Google Sheets + Apps Script + Gemini Gems

## Project Structure
```
/src/pages/
  Dashboard.jsx      — Mission Control home, Kanban project boards
  Oracle.jsx         — Second Brain (oracle_sops with pgvector)
  DualCRM.jsx        — Clinical (MOSO) + Consulting lead management
  Autonomous.jsx     — Agent monitoring, activity feed, routing status
  AppStudio.jsx      — Internal app workspace
  UILibrary.jsx      — Component assets
  Reactivation.jsx   — Reactivation inbox
  Settings.jsx       — User & system config
  Login.jsx          — Supabase auth

/api/
  agent/process.js   — Cron: dequeues + executes agent tasks (Sonnet)
  agent/sdk.js       — SDK: dashboard-triggered execution (Sonnet)
  agent/run.js       — Queues task + fires processor
  agent/cloudrun.js  — Cloud Run dispatch (fallback to Vercel)
  agent/webhook.js   — External webhook handler
  index.py           — FastAPI: Oracle API + Lemon Squeezy webhooks
  sniper_agent.py    — Python agent for specialized tasks

/api/bridge/
  moso-sync.js       — Bridge: syncs MOSO agent outputs to Supabase
```

## Database Tables (Supabase)
| Table | Purpose | RLS |
|-------|---------|-----|
| `internal_projects` | Kanban projects | @labnolabs.com |
| `global_tasks` | Task cards (backlog/triage/review/completed) | @labnolabs.com |
| `oracle_sops` | Second Brain knowledge base + pgvector | @labnolabs.com |
| `moso_clinical_leads` | HIPAA clinical CRM | lance@labnolabs.com ONLY |
| `labno_consulting_leads` | Consulting pipeline | @labnolabs.com |
| `agent_runs` | Autonomous task execution log | @labnolabs.com |
| `moso_sync_log` | Bridge: MOSO agent output sync history | @labnolabs.com |

## MOSO Agent System (reference)
Lives in `g:\My Drive\website-builder\moso-overseer\`. Constitutional governance with 5 agents:

| Agent | Role | Platform | Outputs |
|-------|------|----------|---------|
| The Chief | Daily ops, calendar, communication | Gemini Gem | Morning Briefing, comm drafts |
| The Coach | Health, habits, energy patterns | Gemini Gem | Weekly Pulse, Pattern Alerts, Monthly Report |
| The Architect | Consulting strategy | Gemini Gem | Client audits, roadmaps |
| The Voice/Sniper | Content & brand | Gemini Gem | Content drafts |
| The Librarian | Knowledge & research | Gemini Gem | Research summaries |

Data sources: Personal_Log (Google Sheet), Coach_Alerts tab, Pattern_Flag, Calendar
Governance: Personal Primitives v1.0, Moso Primitives v2.1

## Environment Variables
```
# Frontend (Vite)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Backend (Vercel env vars)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=          # Only for production autonomous tasks
CRON_SECRET=                # Secures /api/agent/process cron

# Cloud Run (optional)
CLOUD_RUN_AGENT_URL=
CLOUD_RUN_AUTH_TOKEN=

# MOSO Bridge
MOSO_BRIDGE_SECRET=         # Secures bridge sync endpoint
GOOGLE_SHEETS_API_KEY=      # For reading Personal_Log from Supabase edge function
PERSONAL_LOG_SHEET_ID=1_1Ix8tTLuYnUWJdkYXjcb1Nxtqb12rIg2ueP5aH1Pug

# Local dev routing
AGENT_ROUTE=local           # "local" = CLI execution, "api" = Anthropic API
```

## Rules
- Never commit `.env` files or API keys
- HIPAA wall: clinical data (`moso_clinical_leads`) restricted to lance@labnolabs.com
- MOSO constitutional rules apply: Options Not Commitments, Subtract Before You Add
- Forbidden language list applies to all agent outputs (see moso-overseer/constitution/)
- Agent edits to `/agents/` or `/constitution/` in MOSO require explicit Lance approval (A3+)
- All MOSO sync operations are A2 (autonomous draft, Lance reviews)

## Local Development
```bash
npm run dev                 # Vite dev server on localhost:5173
# Agent tasks route through local CLI when AGENT_ROUTE=local
# Oracle queries route through local Claude when running locally
```

## Deployment
- Vercel auto-deploys from `main` branch of github.com/llabno/labno-labs-center
- Cron: `/api/agent/process` runs every minute
- Security headers: X-Frame-Options DENY, HSTS enabled
