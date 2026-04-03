import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Journal Reminder Cron
 * Runs every hour. Checks who has journal goals set and hasn't
 * written yet for their scheduled period. Creates notifications.
 * Also updates streaks.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify cron secret
  const cronAuth = req.headers.authorization;
  if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getUTCHours();

  // Determine current period (UTC — adjust for user timezone in future)
  const currentPeriod = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  // Fetch all users with journal goals
  const { data: settings } = await supabase
    .from('ifs_user_settings')
    .select('*')
    .eq('reminder_enabled', true)
    .neq('journal_goal_frequency', 'none');

  if (!settings || settings.length === 0) {
    return res.status(200).json({ status: 'no_goals_set', checked: 0 });
  }

  let reminders_sent = 0;
  let streaks_updated = 0;

  for (const setting of settings) {
    // Check if this period is in their goal times
    if (!setting.journal_goal_times?.includes(currentPeriod)) continue;

    // Check if they already wrote in this period today
    const { data: todayEntries } = await supabase
      .from('ifs_journal_entries')
      .select('id, log_period')
      .eq('user_id', setting.user_id)
      .eq('entry_date', today);

    const wroteThisPeriod = (todayEntries || []).some(e => e.log_period === currentPeriod);
    if (wroteThisPeriod) continue;

    // Check if we already sent a reminder for this period today
    const { data: existingReminder } = await supabase
      .from('ifs_notifications')
      .select('id')
      .eq('user_id', setting.user_id)
      .eq('type', 'journal_reminder')
      .gte('created_at', `${today}T00:00:00Z`)
      .ilike('body', `%${currentPeriod}%`)
      .limit(1);

    if (existingReminder?.length > 0) continue;

    // Send reminder
    const streakText = setting.current_streak > 0 ? ` You're on a ${setting.current_streak}-day streak!` : '';
    await supabase.from('ifs_notifications').insert({
      user_id: setting.user_id,
      type: 'journal_reminder',
      title: `${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)} check-in`,
      body: `Time for your ${currentPeriod} journal entry.${streakText}`,
    });
    reminders_sent++;

    // Update streak — check if yesterday had entries
    if (setting.last_journal_date) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (setting.last_journal_date === yesterdayStr || setting.last_journal_date === today) {
        // Streak continues
      } else {
        // Streak broken — reset
        await supabase.from('ifs_user_settings').update({
          current_streak: 0,
          updated_at: new Date().toISOString(),
        }).eq('user_id', setting.user_id);
        streaks_updated++;
      }
    }
  }

  return res.status(200).json({
    status: 'completed',
    users_checked: settings.length,
    reminders_sent,
    streaks_updated,
    period: currentPeriod,
  });
}
