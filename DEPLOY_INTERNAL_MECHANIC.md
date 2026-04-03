# Internal Mechanic — Deploy Instructions

Build verified clean. Zero errors. Everything is ready.

## Step 1: Run Migrations (Supabase SQL Editor)

Go to your Supabase project → SQL Editor → paste and run these **in order**:

### Migration 1: Core IFS tables
File: `supabase/migrations/20260402_internal_mechanic_tables.sql`
Creates: `ifs_parts`, `ifs_contracts`, `ifs_relationships`, `ifs_unburdening_sessions`

### Migration 2: Entities + Analysis pipeline
File: `supabase/migrations/20260402_mechanic_entities_and_analysis.sql`
Creates: `ifs_entities`, `ifs_interaction_logs`, `ifs_analysis_results`

## Step 2: Seed Projects (Terminal)

```bash
cd ~/Projects/labno-labs-center
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed-all-projects.js
```

This creates 12 projects with 97 tasks in your Dashboard.

## Step 3: Deploy to Vercel

```bash
git add -A && git commit -m "feat: Internal Mechanic — 9-module relational intelligence engine"
git push origin main
```

Vercel auto-deploys from main. The `/mechanic` route will be live.

## Step 4: Test

1. Open labno-labs-center → Internal Mechanic (Brain icon in sidebar)
2. Go to "New Log" tab
3. Create a new entity (any person)
4. Write a real interaction log
5. Select somatic state + affective drive
6. Submit — watch the 9-module pipeline run (~30-60 seconds)
7. Check Analysis tab for results

## What Was Built

- 8-tab Internal Mechanic page at `/mechanic`
- 9-module analysis pipeline (Sonnet × 10 API calls per log)
- 9 JSON rule files extracted from your workbooks
- 7 new Supabase tables with owner-only RLS
- Sarah Peyton reference document
- 12 organized projects with 97 tasks
