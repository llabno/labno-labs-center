/**
 * Seed Internal Mechanic project and tasks into Supabase Dashboard.
 *
 * Run: node scripts/seed-internal-mechanic-project.js
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 * (or set them in .env and use dotenv)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-internal-mechanic-project.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  // 1. Create the Internal Mechanic project
  const { data: project, error: projErr } = await supabase
    .from('internal_projects')
    .insert({
      name: 'Internal Mechanic App (IFS + Sarah Peyton)',
      status: 'Active',
      complexity: 3,
      total_tasks: 18,
      completed_tasks: 6,
    })
    .select()
    .single();

  if (projErr) {
    console.error('Failed to create project:', projErr.message);
    process.exit(1);
  }

  console.log(`Created project: ${project.name} (${project.id})`);

  // 2. Define tasks - V1 completed + V2 backlog
  const tasks = [
    // V1 COMPLETED
    { title: 'Create Supabase migration (ifs_parts, ifs_contracts, ifs_relationships, ifs_unburdening_sessions)', column_id: 'completed', assigned_to: 'agent' },
    { title: 'Build InternalMechanic.jsx page — Parts Registry tab', column_id: 'completed', assigned_to: 'agent' },
    { title: 'Build Visual Board tab (SVG drag-and-drop parts map)', column_id: 'completed', assigned_to: 'agent' },
    { title: 'Build Conscious Contracts tab (Sarah Peyton framework)', column_id: 'completed', assigned_to: 'agent' },
    { title: 'Build Unburdening Flow tab (6-step guided process)', column_id: 'completed', assigned_to: 'agent' },
    { title: 'Build Relationships tab (people → parts activation mapping)', column_id: 'completed', assigned_to: 'agent' },

    // V1 IN REVIEW
    { title: 'Run Supabase migration on production database', column_id: 'triage', assigned_to: 'lance' },
    { title: 'Test all CRUD operations on Parts Registry', column_id: 'triage', assigned_to: 'lance' },
    { title: 'Test Visual Board drag positioning + persistence', column_id: 'triage', assigned_to: 'lance' },
    { title: 'Test Unburdening Flow AI suggestions (verify API key)', column_id: 'triage', assigned_to: 'lance' },

    // V2 BACKLOG — Future features
    { title: 'Integrate Internal Mechanic Gem prompts + spreadsheet data', column_id: 'backlog', assigned_to: 'lance' },
    { title: 'Add Time Travel with Resonance flow (Sarah Peyton)', column_id: 'backlog', assigned_to: 'agent' },
    { title: 'Add unconscious contract auto-detection from unburdening sessions', column_id: 'backlog', assigned_to: 'agent' },
    { title: 'Build exportable session reports (PDF/print)', column_id: 'backlog', assigned_to: 'agent' },
    { title: 'Add polyvagal state tracking over time (chart)', column_id: 'backlog', assigned_to: 'agent' },
    { title: 'Build consumer-facing version for app marketplace', column_id: 'backlog', assigned_to: 'lance' },
    { title: 'Add voice input for unburdening sessions', column_id: 'backlog', assigned_to: 'agent' },
    { title: 'Integrate with Core Three exercise library for somatic suggestions', column_id: 'backlog', assigned_to: 'agent' },
  ];

  const { data: taskData, error: taskErr } = await supabase
    .from('global_tasks')
    .insert(tasks.map(t => ({
      ...t,
      project_id: project.id,
    })))
    .select();

  if (taskErr) {
    console.error('Failed to create tasks:', taskErr.message);
    process.exit(1);
  }

  console.log(`Created ${taskData.length} tasks`);
  console.log('\nDone! Open Mission Control to see the Internal Mechanic project board.');
}

seed();
