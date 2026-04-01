#!/usr/bin/env node

/**
 * MOSO Bridge CLI — sync agent outputs from your IDE to the Dashboard
 *
 * Usage (from labno-labs-center root):
 *   node scripts/moso-bridge-cli.js --agent coach --type weekly_pulse --title "Week of 2026-03-31" --file pulse.md
 *   node scripts/moso-bridge-cli.js --agent chief --type morning_briefing --content "Briefing content here"
 *   node scripts/moso-bridge-cli.js --agent coach --type pattern_alert --content "🔴 2+ Depleted days" --energy Low
 *
 * Targets:
 *   --local    → POST to localhost:5173 (Vite dev server, default)
 *   --prod     → POST to production Vercel URL
 *
 * Environment:
 *   MOSO_BRIDGE_SECRET  — required (set in .env or export)
 *   VERCEL_PROD_URL     — production URL (default: reads from .vercel/project.json)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)

function getArg(flag) {
  const idx = args.indexOf(flag)
  if (idx === -1 || idx + 1 >= args.length) return null
  return args[idx + 1]
}

function hasFlag(flag) {
  return args.includes(flag)
}

// Parse arguments
const agent = getArg('--agent')
const outputType = getArg('--type')
const title = getArg('--title')
const energyState = getArg('--energy')
const filePath = getArg('--file')
const inlineContent = getArg('--content')
const domains = getArg('--domains') // comma-separated

if (!agent || !outputType) {
  console.error(`
MOSO Bridge CLI — sync agent outputs to the Labno Labs Dashboard

Usage:
  node scripts/moso-bridge-cli.js --agent <name> --type <type> [options]

Required:
  --agent <name>      Agent name: chief, coach, architect, voice, librarian, overseer
  --type <type>       Output type: weekly_pulse, pattern_alert, monthly_report,
                      morning_briefing, communication_draft, calendar_defense,
                      client_audit, roadmap, strategy_brief, content_draft,
                      research_summary, system_audit, drift_check, general

Content (one required):
  --content <text>    Inline content string
  --file <path>       Read content from a markdown file

Options:
  --title <title>     Title for the sync entry
  --energy <state>    Energy state: High, Steady, Low, Depleted
  --domains <list>    Comma-separated active domains
  --local             Target localhost:5173 (default)
  --prod              Target production Vercel URL

Environment:
  MOSO_BRIDGE_SECRET  Required for authentication
  VERCEL_PROD_URL     Production URL override
`)
  process.exit(1)
}

// Get content from file or inline
let content = inlineContent
if (filePath) {
  try {
    content = readFileSync(resolve(filePath), 'utf-8')
  } catch (err) {
    console.error(`Failed to read file: ${filePath}`)
    console.error(err.message)
    process.exit(1)
  }
}

if (!content) {
  console.error('Error: Provide --content or --file')
  process.exit(1)
}

// Determine target URL
const isProd = hasFlag('--prod')
let baseUrl

if (isProd) {
  baseUrl = process.env.VERCEL_PROD_URL || 'https://labno-labs-center.vercel.app'
} else {
  baseUrl = 'http://localhost:5173'
}

const bridgeSecret = process.env.MOSO_BRIDGE_SECRET
if (!bridgeSecret) {
  console.error('Error: MOSO_BRIDGE_SECRET environment variable not set')
  console.error('Set it: export MOSO_BRIDGE_SECRET=your-secret-here')
  process.exit(1)
}

// Build payload
const payload = {
  agent,
  output_type: outputType,
  title: title || `${agent}/${outputType}`,
  content,
  energy_state: energyState || null,
  domains_active: domains ? domains.split(',').map(d => d.trim()) : [],
  metadata: {
    source: 'cli',
    synced_from: 'claude-code-ide',
    timestamp: new Date().toISOString()
  }
}

// Send
console.log(`\nSyncing ${agent}/${outputType} → ${baseUrl}/api/bridge/moso-sync`)
console.log(`Content: ${content.length} chars`)
if (energyState) console.log(`Energy: ${energyState}`)
if (domains) console.log(`Domains: ${domains}`)
console.log('')

try {
  const response = await fetch(`${baseUrl}/api/bridge/moso-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bridgeSecret}`
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (response.ok) {
    console.log('Sync successful!')
    console.log(`  Sync ID: ${data.sync_id}`)
    console.log(`  Agent: ${data.agent}`)
    console.log(`  Type: ${data.output_type}`)
    if (data.side_effects?.length > 0) {
      console.log(`  Side effects: ${data.side_effects.join(', ')}`)
    }
    console.log(`  ${data.message}`)
  } else {
    console.error('Sync failed:', data.error || response.statusText)
    if (data.valid_agents) console.error('Valid agents:', data.valid_agents.join(', '))
    if (data.valid_output_types) console.error('Valid types:', data.valid_output_types.join(', '))
    process.exit(1)
  }
} catch (err) {
  console.error(`Connection failed to ${baseUrl}`)
  console.error(err.message)
  console.error('\nIs the dev server running? Try: npm run dev')
  process.exit(1)
}
