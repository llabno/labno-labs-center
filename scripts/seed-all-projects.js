/**
 * Seed ALL projects and tasks into Supabase Dashboard.
 * Covers: Internal Mechanic, Data Sanitization, Clinical Blog,
 * Telemetry, GCal Sync, Oracle, App Studio Pipeline, and more.
 *
 * Run: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-all-projects.js
 *
 * SAFE: Checks for existing projects by name before inserting (no duplicates).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// All projects and their tasks
// ============================================
const PROJECTS = [
  // ─────────────────────────────────────────
  // 1. INTERNAL MECHANIC (full pipeline)
  // ─────────────────────────────────────────
  {
    name: 'Internal Mechanic App (IFS + Relational Intelligence)',
    status: 'Active',
    complexity: 3,
    tasks: [
      // COMPLETED
      { title: 'Create Supabase migration — ifs_parts, ifs_contracts, ifs_relationships, ifs_unburdening_sessions', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Parts Registry tab', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Visual Board tab (SVG drag-and-drop)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Conscious Contracts tab (Sarah Peyton)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Unburdening Flow tab (6-step guided)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Relationships tab', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Create Supabase migration — ifs_entities, ifs_interaction_logs, ifs_analysis_results', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Extract Phase 5/6 rules from all 9 workbooks to JSON', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build 9-module analysis pipeline API (analyze.js)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Log Submission tab (5-step intake)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Analysis View tab (9-module output renderer)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build Entity Profiles tab (cross-session persistence)', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Write Sarah Peyton comprehensive reference document', column_id: 'completed', assigned_to: 'agent' },
      // TRIAGE — needs Lance
      { title: 'Run both Supabase migrations on production', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Deploy to Vercel and test /mechanic route', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Submit first real interaction log — validate pipeline against Gem output', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test entity profile updates after 3+ logs for same person', column_id: 'triage', assigned_to: 'lance' },
      // BACKLOG — V2+
      { title: 'Add Time Travel with Resonance flow (Sarah Peyton)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add per-module validation feedback (accuracy tracking for Phase 1 exit)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add pattern detection synthesis (fires at 3+ entity logs)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Build exportable session reports (PDF/print)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add polyvagal state tracking over time (chart)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Integrate with Core Three exercise library for somatic suggestions', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Build consumer-facing standalone version for app marketplace', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },

  // ─────────────────────────────────────────
  // 2. DATA SANITIZATION (CRM Phase 1)
  // ─────────────────────────────────────────
  {
    name: 'MOSO Data Sanitization (CRM Phase 1)',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Auto-detect HIPAA fields in clinical leads', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Strip clinical data from B2B consulting exports', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Run data-sanitizer.js on full clinical CRM export', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Generate quality report on consulting leads (duplicates, missing fields)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Manual dedup review for flagged records', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Port clean consulting leads to labno_consulting_leads table', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Create clean CSV template for B2B partners', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },

  // ─────────────────────────────────────────
  // 3. CLINICAL BLOG + SNIPER AGENT
  // ─────────────────────────────────────────
  {
    name: 'Clinical Blog + Sniper Agent',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Test SOAP note → blog post generation (Sniper Agent)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Add RSS feed endpoint for published posts', column_id: 'completed', assigned_to: 'agent' },
      { title: 'Build public blog page (SEO-optimized, no comments)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add category/tag system for blog posts', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Set up auto-publish workflow (draft → review → publish)', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Configure blog subdomain or route on Vercel', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },

  // ─────────────────────────────────────────
  // 4. OVERSUBSCRIBED DIGITAL PRODUCT ENGINE
  // ─────────────────────────────────────────
  {
    name: 'Oversubscribed Digital Product Engine',
    status: 'Planning',
    complexity: 2,
    tasks: [
      { title: 'Choose first product: Stretch Guide or Career Portfolio Guide', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Integrate Lemon Squeezy checkout flow', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Auto-insert purchasers into labno_consulting_leads', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Build product landing page template', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Set up Lemon Squeezy webhook → Supabase pipeline', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Create email follow-up sequence for purchasers', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },

  // ─────────────────────────────────────────
  // 5. TELEMETRY & ANALYTICS
  // ─────────────────────────────────────────
  {
    name: 'Global Telemetry & PostHog Analytics',
    status: 'Active',
    complexity: 1,
    tasks: [
      { title: 'Verify PostHog tracking across all pages', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test hourly geo_telemetry aggregation cron', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Build Telemetry dashboard page (zip code heat map)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add conversion funnel tracking (visitor → lead → client)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Inject PostHog into all external assets (websites, apps)', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },

  // ─────────────────────────────────────────
  // 6. GOOGLE CALENDAR CRM SYNC
  // ─────────────────────────────────────────
  {
    name: 'GCal → CRM Sync Bridge',
    status: 'Planning',
    complexity: 2,
    tasks: [
      { title: 'Choose sync method: Make.com, n8n, or custom cron', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Build GCal API bridge (read events → Supabase)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Map GCal events to clinical visit records', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Auto-update last_visit_date on moso_clinical_leads', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add sync status indicator to Dashboard', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },

  // ─────────────────────────────────────────
  // 7. ORACLE (Second Brain)
  // ─────────────────────────────────────────
  {
    name: 'Oracle V1 — Second Brain RAG',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Verify Oracle auth gate (restrict to allowed domains)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test semantic SOP search (pgvector embeddings)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Bulk-embed existing SOPs (run /api/oracle/embed)', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Add SOP upload UI (paste content → auto-embed)', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add SOP categories and visibility controls', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Build Oracle API for external agent access', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },

  // ─────────────────────────────────────────
  // 8. APP STUDIO PIPELINE (Client Apps)
  // ─────────────────────────────────────────
  {
    name: 'App Studio — College Career OS',
    status: 'Active',
    complexity: 1,
    tasks: [
      { title: 'Finalize College Career OS (95% → 100%)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Set up telemetry on College Career OS', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Archive and lock production deployment', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },
  {
    name: 'App Studio — Stretching App (Romy)',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Build exercise library UI', column_id: 'triage', assigned_to: 'romy' },
      { title: 'Integrate video player for exercise demos', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Connect to Core Three exercise database', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Build patient-facing interface', column_id: 'backlog', assigned_to: 'romy' },
      { title: 'Sandbox deploy to Vercel test branch', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },
  {
    name: 'App Studio — Art Portfolio (Avery)',
    status: 'Planning',
    complexity: 1,
    tasks: [
      { title: 'Complete wireframes and feature spec', column_id: 'triage', assigned_to: 'avery' },
      { title: 'Spin up Next.js starter kit', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Design minimalist portfolio layout', column_id: 'backlog', assigned_to: 'avery' },
      { title: 'Build image gallery component', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },

  // ─────────────────────────────────────────
  // 9. REACTIVATION PIPELINE
  // ─────────────────────────────────────────
  {
    name: 'Patient Reactivation Pipeline',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Test daily reactivation scoring cron', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Verify RingCentral click-to-call integration', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test SMS campaign orchestration', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Build automated re-engagement email templates', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add reactivation success tracking (reactivated → active)', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },

  // ─────────────────────────────────────────
  // 10. INFRASTRUCTURE & DEVOPS
  // ─────────────────────────────────────────
  {
    name: 'Infrastructure & DevOps',
    status: 'Active',
    complexity: 1,
    tasks: [
      { title: 'Verify all 5 Vercel cron jobs are running', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test weekly backup export cron (Sundays 6am)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Set up Google Secret Manager for production keys', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Configure monitoring/alerts for failed agent runs', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Add health check endpoint for uptime monitoring', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Ensure MCP config consistency across M2 Air and MSI Intel', column_id: 'backlog', assigned_to: 'lance' },
    ],
  },

  // ─────────────────────────────────────────
  // 11. MOSO AGENT SYSTEM
  // ─────────────────────────────────────────
  {
    name: 'MOSO Overseer Agent System',
    status: 'Active',
    complexity: 2,
    tasks: [
      { title: 'Define agent handoff protocols (Mechanic ↔ Sniper ↔ Overseer)', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Test MOSO Bridge sync (Chief → morning_briefing)', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Test Coach → weekly_pulse sync', column_id: 'triage', assigned_to: 'lance' },
      { title: 'Build Kylie (AI receptionist) intake flow', column_id: 'backlog', assigned_to: 'agent' },
      { title: 'Deploy Kylie across all first-touch touchpoints', column_id: 'backlog', assigned_to: 'lance' },
      { title: 'Build automated referral physician nurture sequence', column_id: 'backlog', assigned_to: 'agent' },
    ],
  },
];

// ============================================
// Seed function
// ============================================
async function seed() {
  console.log('Seeding projects and tasks into Labno Labs Dashboard...\n');

  let totalProjects = 0;
  let totalTasks = 0;
  let skipped = 0;

  for (const project of PROJECTS) {
    // Check if project already exists
    const { data: existing } = await supabase
      .from('internal_projects')
      .select('id, name')
      .ilike('name', `%${project.name.slice(0, 30)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  SKIP: "${project.name}" already exists (${existing[0].id})`);
      skipped++;
      continue;
    }

    const completedCount = project.tasks.filter(t => t.column_id === 'completed').length;

    const { data: proj, error: projErr } = await supabase
      .from('internal_projects')
      .insert({
        name: project.name,
        status: project.status,
        complexity: project.complexity,
        total_tasks: project.tasks.length,
        completed_tasks: completedCount,
      })
      .select()
      .single();

    if (projErr) {
      console.error(`  FAIL: "${project.name}" — ${projErr.message}`);
      continue;
    }

    const { data: taskData, error: taskErr } = await supabase
      .from('global_tasks')
      .insert(project.tasks.map(t => ({
        ...t,
        project_id: proj.id,
      })))
      .select();

    if (taskErr) {
      console.error(`  FAIL tasks for "${project.name}" — ${taskErr.message}`);
      continue;
    }

    totalProjects++;
    totalTasks += taskData.length;
    console.log(`  OK: "${project.name}" — ${taskData.length} tasks (${completedCount} completed)`);
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`Created: ${totalProjects} projects, ${totalTasks} tasks`);
  console.log(`Skipped: ${skipped} (already existed)`);
  console.log(`════════════════════════════════════════`);
  console.log('\nOpen Mission Control to see all projects.');
}

seed();
