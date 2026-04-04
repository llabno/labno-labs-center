/**
 * Seed NEW projects and tasks derived from:
 * 1. "AI Agent Plumbing and Habits" article (infrastructure + security + atomic habits)
 * 2. "Nick Saraev Automation Agency Resources" (sales + operations + productization)
 *
 * Run: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-plumbing-agency-projects.js
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
// New projects from article analysis
// ============================================
const PROJECTS = [
  // ─────────────────────────────────────────
  // 1. AGENT INFRASTRUCTURE PLUMBING (80% that matters)
  // Source: AI Agent Plumbing article — 12 Infrastructure Primitives
  // ─────────────────────────────────────────
  {
    name: 'Agent Infrastructure — 80% Plumbing',
    status: 'Planning',
    complexity: 5,
    due_date: '2026-05-15',
    tasks: [
      // Phase 1: Core State Layer (Day 1 priorities)
      { title: 'Design JSON schema for agent inbox messages and task state files', column_id: 'backlog', assigned_to: 'agent', description: 'Define message format (text, shutdown, idle), task schema (subject, desc, status, owner, deps). Based on Claude Code filesystem primitives.' },
      { title: 'Build filesystem-backed agent inbox system (read/write/poll)', column_id: 'backlog', assigned_to: 'agent', description: 'Implement ~/.labno/agents/{name}/inbox.json + ~/.labno/tasks/{team}/N.json. File watcher polling loop. Crash-safe state persistence.' },
      { title: 'Build Query Engine syscall gate — tool permission validation layer', column_id: 'backlog', assigned_to: 'agent', description: 'POSIX-like capability security: agents request abstract actions (read_file_safe, git_commit_verified), validated against permission matrix before execution. No direct bash access.' },
      { title: 'Implement session checkpointing and crash recovery', column_id: 'backlog', assigned_to: 'agent', description: 'Serialize agent state to JSON checkpoints. On crash/restart, resume from last successful state. Signal handlers for SIGTERM/SIGINT.' },

      // Phase 2: Orchestration & Cost Control (Week 1)
      { title: 'Build Leader/Teammate multi-agent orchestration layer', column_id: 'backlog', assigned_to: 'agent', description: 'Leader agent (opus) plans + spawns Teammate agents (sonnet/haiku) with restricted toolsets. Parallel execution via child_process. Results via inbox files.' },
      { title: 'Implement memory consolidation daemon (KAIROS-like)', column_id: 'backlog', assigned_to: 'agent', description: 'Background daemon: compress bloated conversation/inbox JSON, summarize old context, discard irrelevant data. Prevents token bloat in long sessions.' },
      { title: 'Integrate token budget enforcement into agent dispatch loop', column_id: 'backlog', assigned_to: 'agent', description: 'Hard-cap financial limits per task. Auto-halt and request human auth if projected cost exceeds remaining budget. Circuit breaker for recursive debugging loops.' },

      // Phase 3: Observability (Month 1)
      { title: 'Build Agent Observability Dashboard in labno-labs-center', column_id: 'backlog', assigned_to: 'agent', description: 'Real-time: token spend/task, crash counts, loop detection (rising tokens + no output), tool call frequency. Daily Agent Audit Scorecard for morning review.' },
      { title: 'Create morning Agent Audit Scorecard notification', column_id: 'backlog', assigned_to: 'agent', description: 'Automated daily summary: crash/recovery count, token spend ratio (planning vs execution), anomalous agents (5%+ daily token increase with no output = loop detection).' },
    ],
  },

  // ─────────────────────────────────────────
  // 2. AGENT SECURITY STACK (18-Module pattern)
  // Source: AI Agent Plumbing article — Security Stack + Threat Landscape
  // ─────────────────────────────────────────
  {
    name: 'Agent Security — 18-Module Stack',
    status: 'Planning',
    complexity: 4,
    due_date: '2026-05-01',
    tasks: [
      { title: 'Deploy automated weekly dependency audit agent (CVE scanner)', column_id: 'backlog', assigned_to: 'agent', description: 'Reads package.json + lock files from all repos. Cross-references npm advisory + CVE databases. Binary pass/fail. Blocks deploys on critical findings. Runs every Monday AM.' },
      { title: 'Configure Docker sandbox for agent execution environments', column_id: 'backlog', assigned_to: 'agent', description: 'All agent execution in Docker containers. Restricted network, no host FS mounts beyond work dirs. Block unverified npm installs. Prevents supply-chain compromise of host.' },
      { title: 'Implement agent output IP protection (anti-exfiltration)', column_id: 'backlog', assigned_to: 'agent', description: 'Strip identifying markers from agent-generated code pushed to external repos. Prevent proprietary patterns from leaking. Based on Claude Code anti-distillation concept.' },
      { title: 'Add behavioral telemetry for human-AI interaction health', column_id: 'backlog', assigned_to: 'agent', description: 'Track: user frustration signals (repeated retries, abandoned sessions), "continue" command frequency (agent failing to complete in output limits). Tune orchestration dynamically.' },
      { title: 'Create agent permission matrix config (per-agent tool access)', column_id: 'backlog', assigned_to: 'agent', description: 'JSON config defining which tools each agent type can access. Scraper agent: read-only web. Writer agent: file write + git. Leader agent: spawn teammates. No agent gets full bash.' },
    ],
  },

  // ─────────────────────────────────────────
  // 3. CONSULTING SALES & OPERATIONS PIPELINE
  // Source: Nick Saraev Automation Agency Resources
  // ─────────────────────────────────────────
  {
    name: 'Labno Labs Consulting — Sales & Operations Pipeline',
    status: 'Planning',
    complexity: 3,
    due_date: '2026-05-15',
    tasks: [
      // Sales
      { title: 'Build 3-flow CRM sales pipeline (inbound + outbound + referral)', column_id: 'backlog', assigned_to: 'lance', description: 'Implement in labno_consulting_leads: inbound (form→qualify→propose→close), outbound (list→outreach→followup), referral (intro→warm close). Auto-score leads with Claude.' },
      { title: 'Build AI-powered proposal generator', column_id: 'backlog', assigned_to: 'agent', description: 'Takes discovery form data → generates scope, timeline, pricing, case studies. Claude drafts, human reviews. PDF/HTML output. Based on Saraev proposal framework.' },
      { title: 'Design 4 productized service packages with fixed pricing', column_id: 'backlog', assigned_to: 'lance', description: 'AI Audit, Automation Build, Agent System, Monthly Retainer. Each: fixed scope, timeline, deliverables, margin targets. Lemon Squeezy checkout flows.' },

      // Operations
      { title: 'Build automated client onboarding pipeline', column_id: 'backlog', assigned_to: 'agent', description: 'Discovery form → auto-create project + tasks → welcome email → client folder (Drive + repo) → kickoff call scheduled. End-to-end, no manual steps.' },
      { title: 'Implement scope creep prevention system', column_id: 'backlog', assigned_to: 'agent', description: 'Scope tracker (agreed vs actual), change request workflow (submit→auto-price→approve), variance alerts. Keeps projects profitable.' },
      { title: 'Build retainer conversion automation', column_id: 'backlog', assigned_to: 'agent', description: 'Trigger at project 80% completion: offer retainer package. Monthly dashboard: hours used/remaining, renewal date. Lemon Squeezy recurring billing.' },
      { title: 'Create client project management template (ClickUp-style)', column_id: 'backlog', assigned_to: 'agent', description: 'Standardized project template: milestones, deliverables, client access portal, status updates. Auto-created from onboarding pipeline.' },

      // Scaling
      { title: 'Build consulting revenue dashboard (pipeline value, conversion rates, MRR)', column_id: 'backlog', assigned_to: 'agent', description: 'Track: pipeline value by stage, conversion rates (lead→proposal→close), MRR from retainers, project margins. Based on Saraev $25K scaling guide.' },
    ],
  },

  // ─────────────────────────────────────────
  // 4. CYBERNETIC DEVELOPER HABITS (Atomic Habits integration)
  // Source: AI Agent Plumbing article — Section 7
  // ─────────────────────────────────────────
  {
    name: 'Cybernetic Developer — Atomic Habits Integration',
    status: 'Planning',
    complexity: 2,
    due_date: '2026-04-30',
    tasks: [
      { title: 'Create CLAUDE.md daily update protocol (5-min EOD habit)', column_id: 'backlog', assigned_to: 'lance', description: 'Habit 1: Before logging off, spend 5 min updating CLAUDE.md — add one rule from todays hallucination OR remove one obsolete instruction. Compounds into better agent behavior.' },
      { title: 'Build CLAUDE.md version history tracker', column_id: 'backlog', assigned_to: 'agent', description: 'Track changes to CLAUDE.md over time. Show which rules were added/removed and why. Visualize how agent instructions evolve. Git-backed with annotations.' },
      { title: 'Design Primitive Fluency training protocol (2x/week, 1hr no-AI)', column_id: 'backlog', assigned_to: 'lance', description: 'Habit 3: Twice weekly, debug/build/architect WITHOUT any AI assist. Standard docs + whiteboard only. Prevents cognitive deskilling. Maintains ability to recover when agents fail.' },
      { title: 'Create weekly Zero-Trust Security Sweep checklist', column_id: 'backlog', assigned_to: 'agent', description: 'Habit 4: Automated Monday security agent scans all repos. Human habit: review binary pass/fail before any deployment. Frictionless security hygiene.' },
      { title: 'Build Learning Velocity tracker (new tools/frameworks mastered)', column_id: 'backlog', assigned_to: 'agent', description: 'Judgment Economy metric: track how fast new paradigms are adopted. Log: tool name, first encounter date, production use date, mastery assessment. KPI for cybernetic developer.' },
    ],
  },
];

// ============================================
// Seed function (same pattern as seed-all-projects.js)
// ============================================
async function seed() {
  console.log('Seeding Plumbing + Agency projects into Labno Labs Dashboard...\n');

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
        due_date: project.due_date || null,
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
        title: t.title,
        description: t.description || null,
        column_id: t.column_id,
        assigned_to: t.assigned_to,
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
  console.log('\nOpen Mission Control → Projects & Tasks to see them.');
}

seed();
