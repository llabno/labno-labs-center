/**
 * Google Calendar integration helpers
 * Used by WorkPlanner, CalendarView, and SmartScheduler
 */

import { supabase } from './supabase';

/**
 * Create a Google Calendar event via the API
 * Falls back to opening Google Calendar URL if API fails
 */
export async function createGCalEvent({ title, start, end, description, location }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/calendar/create-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        summary: title,
        start,
        end,
        description: description || '',
        location: location || '',
      }),
    });

    const data = await res.json();

    if (data.success) {
      return { success: true, event: data.event };
    }

    // If service account not configured, return setup instructions
    if (data.setup_steps) {
      return { success: false, needsSetup: true, steps: data.setup_steps, error: data.error };
    }

    return { success: false, error: data.error || 'Failed to create event' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate a Google Calendar URL for creating an event in the browser
 * This always works, even without service account
 */
export function getGCalUrl({ title, start, end, description }) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(description || '')}`;
}

/**
 * Create event via API, fall back to browser URL
 */
export async function addToGCal({ title, startMinutes, description, projectName }) {
  const start = new Date();
  const end = new Date(start.getTime() + (startMinutes || 60) * 60000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const desc = `${description || ''}\nProject: ${projectName || 'Unassigned'}`.trim();

  const result = await createGCalEvent({ title, start: startISO, end: endISO, description: desc });

  if (result.success) {
    return result;
  }

  // Fallback: open in browser
  const url = getGCalUrl({ title, start: startISO, end: endISO, description: desc });
  window.open(url, '_blank');
  return { success: true, fallback: true, url };
}
