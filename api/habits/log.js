/**
 * habits/log.js — Log Developer Habits (Atomic Habits tracking)
 *
 * POST /api/habits/log
 * Body: { habit_type, duration_minutes?, notes?, metadata? }
 *
 * Supported habit_type values:
 *   - claude_md_update: 5-min EOD CLAUDE.md update (Habit 1)
 *   - primitive_fluency: 1hr no-AI coding session (Habit 3)
 *   - security_sweep: Reviewed weekly security report (Habit 4)
 *   - learning_velocity: Logged a new tool/framework mastered
 *
 * GET /api/habits/log — Returns habit stats for dashboard
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'POST') {
    const { habit_type, duration_minutes, notes, metadata, user_name } = req.body || {};

    if (!habit_type) {
      return res.status(400).json({ error: 'habit_type is required' });
    }

    const validTypes = ['claude_md_update', 'primitive_fluency', 'security_sweep', 'learning_velocity'];
    if (!validTypes.includes(habit_type)) {
      return res.status(400).json({ error: `Invalid habit_type. Must be one of: ${validTypes.join(', ')}` });
    }

    const { data, error } = await supabase.from('developer_habits').insert({
      habit_type,
      user_name: user_name || 'lance',
      duration_minutes: duration_minutes || null,
      notes: notes || null,
      metadata: metadata || {},
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'GET') {
    // Return stats for the dashboard
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: habits, error } = await supabase
      .from('developer_habits')
      .select('*')
      .gte('completed_at', thirtyDaysAgo)
      .order('completed_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Aggregate by type
    const stats = {};
    for (const h of (habits || [])) {
      if (!stats[h.habit_type]) {
        stats[h.habit_type] = { count: 0, total_minutes: 0, last_completed: null, streak: 0 };
      }
      stats[h.habit_type].count++;
      stats[h.habit_type].total_minutes += h.duration_minutes || 0;
      if (!stats[h.habit_type].last_completed) {
        stats[h.habit_type].last_completed = h.completed_at;
      }
    }

    // Calculate streaks for CLAUDE.md updates (should be daily)
    const claudeUpdates = (habits || [])
      .filter(h => h.habit_type === 'claude_md_update')
      .map(h => new Date(h.completed_at).toDateString());
    const uniqueDays = [...new Set(claudeUpdates)];
    let streak = 0;
    const today = new Date().toDateString();
    const checkDate = new Date();
    for (let i = 0; i < 90; i++) {
      if (uniqueDays.includes(checkDate.toDateString())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0 && checkDate.toDateString() === today) {
        // Today hasn't been logged yet — that's OK, don't break streak
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    if (stats.claude_md_update) stats.claude_md_update.streak = streak;

    // Calculate Primitive Fluency (should be 2x/week)
    if (stats.primitive_fluency) {
      const weeksInPeriod = 4.3; // ~30 days
      stats.primitive_fluency.sessions_per_week = (stats.primitive_fluency.count / weeksInPeriod).toFixed(1);
      stats.primitive_fluency.target_per_week = 2;
    }

    // Targets
    const targets = {
      claude_md_update: { frequency: 'daily', target_per_week: 5, description: '5-min EOD CLAUDE.md update' },
      primitive_fluency: { frequency: '2x/week', target_per_week: 2, description: '1hr no-AI coding session' },
      security_sweep: { frequency: 'weekly', target_per_week: 1, description: 'Review security sweep report' },
      learning_velocity: { frequency: 'as-needed', target_per_week: 0, description: 'Log new tool/framework mastered' },
    };

    return res.status(200).json({ stats, targets, period: '30 days', total_entries: habits?.length || 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
