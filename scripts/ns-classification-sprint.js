/**
 * NS Classification Sprint
 * ========================
 * Classifies 2,277 untagged exercises by Green/Amber/Red NS state.
 *
 * Strategy:
 * 1. Pull all exercises missing ns_color from moso_rx (Supabase)
 * 2. Group by movement_family + safety_tier (both 100% populated)
 * 3. Apply rule-based classification for clear cases (~70% of exercises)
 * 4. Flag ambiguous exercises for Lance's clinical review
 * 5. Generate SQL UPDATE statements for batch application
 *
 * NS Color Definitions (Polyvagal):
 * - GREEN: Ventral vagal. Safe, social, regulated. Exercises that build capacity.
 * - AMBER: Sympathetic activation. Mobilized, alert. Exercises that channel energy.
 * - RED: Dorsal vagal. Shutdown, freeze. Exercises that gently settle/ground.
 *
 * Rule-based classification logic:
 * - safety_tier=green + gentle/restorative movement families → GREEN
 * - safety_tier=green + dynamic/strength families → GREEN or AMBER (context-dependent)
 * - safety_tier=yellow + any family → AMBER (higher activation/risk = sympathetic territory)
 * - exercises with "gentle", "breathing", "grounding" in name → GREEN
 * - exercises with "explosive", "plyometric", "sprint" in name → AMBER
 * - exercises targeting shutdown/freeze states → RED (settle category)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars from .env.prod (has service role key) and .env.local (has URL)
config({ path: path.resolve(__dirname, '../.env.prod') });
config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.prod and .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Classification Rules
// ============================================================

const NAME_PATTERNS = {
  green: [
    /breath/i, /breathing/i, /gentle/i, /grounding/i, /relax/i,
    /stretch/i, /yoga/i, /tai.chi/i, /meditation/i, /mobility/i,
    /foam.roll/i, /self.massage/i, /body.scan/i, /awareness/i,
    /slow/i, /mindful/i, /restorative/i, /supine/i, /prone/i,
    /savasana/i, /child.?s?.pose/i, /cat.cow/i, /rocking/i,
  ],
  amber: [
    /explosive/i, /plyometric/i, /sprint/i, /jump/i, /power/i,
    /agility/i, /reactive/i, /ballistic/i, /high.intensity/i,
    /burpee/i, /box.jump/i, /kettlebell.swing/i, /snatch/i,
    /clean/i, /jerk/i, /push.press/i, /battle.rope/i,
    /interval/i, /hiit/i, /tabata/i,
  ],
  red: [
    /belly.on.floor/i, /fetal/i, /weighted.blanket/i,
    /cocoon/i, /^shutdown/i, /freeze.response/i,
    /sigh.of/i, /\bhumming\b/i, /vocalize/i, /self.hold/i,
    /containment/i, /swaddle/i,
  ],
};

const FAMILY_RULES = {
  // Movement families that are almost always Green (case-insensitive match)
  green_families: [
    'breathe', 'breathing', 'flexibility', 'mobility', 'relaxation',
    'yoga', 'restorative', 'sensory', 'awareness', 'postural',
    'proprioception', 'foam roll', 'self-care',
  ],
  // Movement families that are typically Amber
  amber_families: [
    'power', 'plyometric', 'agility', 'speed', 'reactive',
    'sport', 'explosive', 'high threshold', 'ballistic',
  ],
  // Movement families that could go either way — need Lance's review
  ambiguous_families: [
    'balance', 'strength', 'endurance', 'functional', 'core',
    'gait', 'coordination', 'control', 'stabilize', 'stabilization',
    'dissociate', 'dissociation', 'load', 'unload',
  ],
};

function classifyExercise(exercise) {
  const name = exercise.exercise_name || '';
  const safety = exercise.safety_tier || '';
  const family = exercise.movement_family || '';

  // Safety=yellow exercises that match Green name patterns are likely descriptions of
  // dysfunctional patterns (e.g., "breath holding"), not calming exercises. Downgrade confidence.
  const isYellowSafety = safety === 'yellow';

  // Check name patterns first (highest confidence)
  for (const pattern of NAME_PATTERNS.red) {
    if (pattern.test(name)) return { color: 'Red', confidence: 'high', reason: `name matches settle/shutdown pattern: ${pattern}` };
  }
  for (const pattern of NAME_PATTERNS.amber) {
    if (pattern.test(name)) return { color: 'Amber', confidence: 'high', reason: `name matches high-activation pattern: ${pattern}` };
  }
  for (const pattern of NAME_PATTERNS.green) {
    if (pattern.test(name)) {
      if (isYellowSafety) {
        return { color: 'Green', confidence: 'low', reason: `name matches green pattern ${pattern} BUT safety=yellow — may be describing dysfunction, needs review` };
      }
      return { color: 'Green', confidence: 'high', reason: `name matches regulated/gentle pattern: ${pattern}` };
    }
  }

  // Check movement family rules (case-insensitive partial match)
  const familyLower = family.toLowerCase();
  const matchesFamily = (list) => list.some(f => familyLower.includes(f) || f.includes(familyLower));

  if (matchesFamily(FAMILY_RULES.green_families)) {
    return { color: 'Green', confidence: 'medium', reason: `movement family '${family}' is typically Green` };
  }
  if (matchesFamily(FAMILY_RULES.amber_families)) {
    return { color: 'Amber', confidence: 'medium', reason: `movement family '${family}' is typically Amber` };
  }
  if (matchesFamily(FAMILY_RULES.ambiguous_families)) {
    // Ambiguous families: use safety tier to decide
    if (safety === 'yellow') {
      return { color: 'Amber', confidence: 'medium', reason: `ambiguous family '${family}' + safety=yellow → Amber` };
    }
    return { color: 'Green', confidence: 'low', reason: `ambiguous family '${family}' + safety=green → defaults Green, needs review` };
  }

  // Safety tier as last resort
  if (safety === 'yellow') {
    return { color: 'Amber', confidence: 'low', reason: `safety_tier=yellow suggests sympathetic activation, unknown family '${family}'` };
  }
  if (safety === 'green') {
    return { color: 'Green', confidence: 'low', reason: `safety=green, unknown family '${family}' — defaults Green, needs review` };
  }

  return { color: null, confidence: 'none', reason: 'Could not classify. Needs Lance clinical review.' };
}

// ============================================================
// Main Execution
// ============================================================

async function run() {
  console.log('NS Classification Sprint — Starting...\n');

  // Pull unclassified exercises (paginated — Supabase defaults to 1000)
  let exercises = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('moso_rx')
      .select('id, exercise_name, safety_tier, movement_family, structures_involved, primary_framework')
      .is('ns_color', null)
      .order('movement_family')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Failed to fetch exercises:', error.message);
      process.exit(1);
    }
    exercises = exercises.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Found ${exercises.length} unclassified exercises.\n`);

  // Print unique movement families for reference
  const families = [...new Set(exercises.map(e => e.movement_family))].sort();
  console.log(`Unique movement families (${families.length}): ${families.join(', ')}\n`);

  const results = {
    high_confidence: [],   // Auto-apply
    medium_confidence: [],  // Batch review
    low_confidence: [],     // Individual review
    unclassified: [],       // Lance must classify manually
  };

  for (const ex of exercises) {
    const classification = classifyExercise(ex);
    const entry = {
      id: ex.id,
      name: ex.exercise_name,
      family: ex.movement_family,
      safety: ex.safety_tier,
      ns_color: classification.color,
      confidence: classification.confidence,
      reason: classification.reason,
    };

    if (classification.confidence === 'high') results.high_confidence.push(entry);
    else if (classification.confidence === 'medium') results.medium_confidence.push(entry);
    else if (classification.confidence === 'low') results.low_confidence.push(entry);
    else results.unclassified.push(entry);
  }

  // Summary
  console.log('=== Classification Results ===');
  console.log(`High confidence (auto-apply):  ${results.high_confidence.length}`);
  console.log(`Medium confidence (batch review): ${results.medium_confidence.length}`);
  console.log(`Low confidence (individual review): ${results.low_confidence.length}`);
  console.log(`Unclassified (Lance must review): ${results.unclassified.length}`);
  console.log('');

  // Generate SQL for high-confidence batch
  const sqlLines = ['-- NS Classification Sprint: High-Confidence Auto-Apply', '-- Generated: ' + new Date().toISOString(), ''];
  for (const entry of results.high_confidence) {
    sqlLines.push(`UPDATE moso_rx SET ns_color = '${entry.ns_color}' WHERE id = '${entry.id}'; -- ${entry.name} (${entry.reason})`);
  }

  // Generate review CSV for medium + low confidence
  const reviewLines = ['id,name,family,safety,suggested_ns_color,confidence,reason'];
  for (const entry of [...results.medium_confidence, ...results.low_confidence, ...results.unclassified]) {
    const escapedName = entry.name.replace(/"/g, '""');
    const escapedReason = entry.reason.replace(/"/g, '""');
    reviewLines.push(`"${entry.id}","${escapedName}","${entry.family}","${entry.safety}","${entry.ns_color || ''}","${entry.confidence}","${escapedReason}"`);
  }

  // Write outputs
  const outputDir = './scripts/ns-classification-output';
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(`${outputDir}/auto-apply.sql`, sqlLines.join('\n'));
  fs.writeFileSync(`${outputDir}/review-needed.csv`, reviewLines.join('\n'));
  fs.writeFileSync(`${outputDir}/full-results.json`, JSON.stringify(results, null, 2));

  console.log(`Output written to ${outputDir}/`);
  console.log(`  auto-apply.sql      — ${results.high_confidence.length} exercises ready to UPDATE`);
  console.log(`  review-needed.csv   — ${results.medium_confidence.length + results.low_confidence.length + results.unclassified.length} exercises need Lance's review`);
  console.log(`  full-results.json   — Complete classification data`);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Review auto-apply.sql — spot-check 10-15 entries for correctness');
  console.log('2. Run auto-apply.sql against Supabase SQL Editor');
  console.log('3. Open review-needed.csv — classify in batches by movement_family');
  console.log('4. Generate SQL for reviewed exercises');
  console.log('5. Repeat until ns_color coverage > 95%');
}

run().catch(console.error);
