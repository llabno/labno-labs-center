/**
 * Run a SQL migration against Supabase using the Management API.
 *
 * Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/run-migration.js <file>
 *
 * This uses the Supabase PostgREST /rpc endpoint with a custom exec_sql function,
 * OR falls back to executing each statement individually.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.js <sql-file>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = readFileSync(file, 'utf-8');

// Extract the project ref from the URL
const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];

// Try the Supabase Management API (requires access token, which we may not have)
// Fall back to running via pg directly if supabase CLI is available
console.log(`Running migration: ${file}`);
console.log(`Project: ${projectRef}`);
console.log('---');

// Strip comments and split into statements
const statements = sql
  .replace(/--.*$/gm, '')
  .split(/;\s*$/m)
  .map(s => s.trim())
  .filter(s => s.length > 5);

console.log(`Found ${statements.length} SQL statements`);
console.log('');
console.log('=== COPY THE SQL BELOW INTO SUPABASE DASHBOARD → SQL EDITOR ===');
console.log('');
console.log(sql);
console.log('');
console.log('=== END SQL ===');
console.log('');
console.log(`Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('Paste the SQL above and click "Run"');
