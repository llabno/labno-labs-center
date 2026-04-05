import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
};

const urgencyColor = (daysLeft) => {
  if (daysLeft < 0) return '#d14040';
  if (daysLeft <= 3) return '#d14040';
  if (daysLeft <= 14) return '#c49a40';
  return '#6aab6e';
};

const CalendarView = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTask, setScheduleTask] = useState(null);
  const [scheduleDateInput, setScheduleDateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalError, setGcalError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const [projRes, taskRes, pipeRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('global_tasks').select('*').not('due_date', 'is', null),
        supabase.from('project_pipelines').select('*, projects(name)').not('start_date', 'is', null),
      ]);
      setProjects(projRes.data || []);
      setTasks(taskRes.data || []);
      setPipelines(pipeRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const syncGoogleCalendar = useCallback(async () => {
    setGcalSyncing(true);
    setGcalError(null);
    try {
      const timeMin = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const timeMax = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await window.fetch(`/api/calendar/sync?timeMin=${timeMin}&timeMax=${timeMax}`);
      const data = await res.json();
      if (!res.ok) {
        setGcalError(data.error || 'Sync failed');
        setGcalEvents([]);
      } else {
        setGcalEvents(data.events || []);
      }
    } catch (err) {
      setGcalError(err.message || 'Network error');
      setGcalEvents([]);
    } finally {
      setGcalSyncing(false);
    }
  }, [year, month]);

  const days = getMonthDays(year, month);

  // Build date→events map
  const eventsByDate = useMemo(() => {
    const map = {};
    const addEvent = (dateStr, event) => {
      const d = dateStr?.slice(0, 10);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(event);
    };

    // Project due dates
    projects.forEach(p => {
      if (p.due_date) addEvent(p.due_date, { type: 'project_due', title: p.name, color: '#b06050', id: p.id });
    });

    // Task due dates
    tasks.forEach(t => {
      if (t.due_date) {
        const proj = projects.find(p => p.id === t.project_id);
        addEvent(t.due_date, { type: 'task', title: t.title, subtitle: proj?.name, color: t.column_id === 'completed' ? '#6aab6e' : '#5a8abf', id: t.id, completed: t.column_id === 'completed' });
      }
    });

    // Pipeline stage start dates
    pipelines.forEach(pp => {
      if (pp.start_date) {
        const STAGES = ['Kickoff', 'Scope', 'Design', 'Build', 'Test', 'Deploy', 'Handoff', 'Close'];
        addEvent(pp.start_date, { type: 'pipeline', title: `${STAGES[pp.stage_number - 1] || 'Stage ' + pp.stage_number}`, subtitle: pp.projects?.name, color: '#9c27b0', id: pp.id });
      }
    });

    // Google Calendar events
    gcalEvents.forEach(ev => {
      // start can be datetime or date-only
      const startDate = ev.start ? ev.start.slice(0, 10) : null;
      if (startDate) {
        const startTime = ev.start && ev.start.includes('T')
          ? new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : null;
        addEvent(startDate, {
          type: 'gcal',
          title: ev.summary,
          subtitle: startTime ? `${startTime}${ev.location ? ' · ' + ev.location : ''}` : ev.location || null,
          color: '#7c3aed',
          id: ev.id,
          description: ev.description,
          gcal: true,
        });
      }
    });

    return map;
  }, [projects, tasks, pipelines, gcalEvents]);

  // Upcoming 7 days for widget
  const upcoming7 = useMemo(() => {
    const items = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const events = eventsByDate[key] || [];
      if (events.length > 0) items.push({ date: d, dateKey: key, events });
    }
    return items;
  }, [eventsByDate]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleSchedule = async () => {
    if (!scheduleTask || !scheduleDateInput) return;
    await supabase.from('global_tasks').update({ due_date: scheduleDateInput }).eq('id', scheduleTask.id);
    setShowScheduleModal(false);
    setScheduleTask(null);
    setScheduleDateInput('');
    // Refresh
    const { data } = await supabase.from('global_tasks').select('*').not('due_date', 'is', null);
    setTasks(data || []);
  };

  const todayKey = today.toISOString().slice(0, 10);

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading calendar...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <CalIcon size={24} /> Calendar <InfoTooltip text={PAGE_INFO.calendar} />
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {gcalEvents.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 500 }}>
              {gcalEvents.length} GCal event{gcalEvents.length !== 1 ? 's' : ''}
            </span>
          )}
          {gcalError && (
            <span style={{ fontSize: '0.72rem', color: '#d14040', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gcalError}>
              {gcalError}
            </span>
          )}
          <button
            onClick={syncGoogleCalendar}
            disabled={gcalSyncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500,
              background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed',
              border: '1px solid rgba(124, 58, 237, 0.2)', cursor: gcalSyncing ? 'wait' : 'pointer',
              opacity: gcalSyncing ? 0.6 : 1, transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={14} style={{ animation: gcalSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {gcalSyncing ? 'Syncing...' : 'Sync Google Calendar'}
          </button>
        </div>
      </div>

      {/* Upcoming 7 Days Widget */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#b06050" /> Next 7 Days
        </h3>
        {upcoming7.length === 0 ? (
          <p style={{ color: '#8a8682', fontSize: '0.85rem' }}>No events in the next 7 days.</p>
        ) : (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {upcoming7.map(day => (
              <div key={day.dateKey} style={{ minWidth: '180px', flex: '0 0 auto', padding: '12px', borderRadius: '10px', background: day.dateKey === todayKey ? 'rgba(176,96,80,0.08)' : 'rgba(255,255,255,0.5)', border: `1px solid ${day.dateKey === todayKey ? 'rgba(176,96,80,0.2)' : 'rgba(0,0,0,0.05)'}` }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: day.dateKey === todayKey ? '#b06050' : '#6b6764', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {day.dateKey === todayKey ? 'Today' : DAYS[day.date.getDay()]} · {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {day.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', fontSize: '0.8rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                    <span style={{ color: '#2e2c2a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                    {ev.completed && <CheckCircle size={11} color="#6aab6e" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Month Calendar */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2e2c2a' }}>
            {MONTHS[month]} {year}
          </h3>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} style={{ minHeight: '80px' }} />;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const events = eventsByDate[dateKey] || [];
            const isToday = dateKey === todayKey;
            const isSelected = selectedDate === dateKey;
            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                style={{
                  minHeight: '80px', padding: '6px', borderRadius: '8px', cursor: 'pointer',
                  background: isSelected ? 'rgba(90,138,191,0.18)' : isToday ? 'rgba(176,96,80,0.06)' : 'rgba(255,255,255,0.3)',
                  border: isSelected ? '2px solid rgba(90,138,191,0.6)' : `1px solid ${isToday ? 'rgba(176,96,80,0.2)' : 'rgba(0,0,0,0.04)'}`,
                  boxShadow: isSelected ? '0 3px 12px rgba(90,138,191,0.25), inset 0 0 0 1px rgba(90,138,191,0.15)' : 'none',
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#b06050' : '#2e2c2a', marginBottom: '4px' }}>
                  {day}
                </div>
                {events.slice(0, 3).map((ev, j) => (
                  <div key={j} style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: ev.color + '18', color: ev.color, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {ev.title}
                  </div>
                ))}
                {events.length > 3 && (
                  <div style={{ fontSize: '0.6rem', color: '#8a8682' }}>+{events.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail — Expanded Panel */}
      {selectedDate && (() => {
        const selectedEvents = eventsByDate[selectedDate] || [];
        const selectedDateObj = new Date(selectedDate + 'T12:00:00');
        const fullDateLabel = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        return (
          <div className="glass-panel" style={{ padding: '1.5rem 1.75rem', borderTop: '3px solid rgba(90,138,191,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2e2c2a', margin: 0 }}>
                {fullDateLabel}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#8a8682', fontWeight: 500 }}>
                {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CalIcon size={32} color="#c4c0bc" style={{ marginBottom: '10px' }} />
                <p style={{ color: '#8a8682', fontSize: '0.92rem', margin: 0 }}>No events scheduled</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedEvents.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px',
                    borderRadius: '10px', background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(0,0,0,0.06)', borderLeft: `4px solid ${ev.color}`,
                    transition: 'box-shadow 0.15s ease',
                  }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ev.color, flexShrink: 0, marginTop: '4px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a' }}>{ev.title}</span>
                        {ev.completed && <CheckCircle size={14} color="#6aab6e" />}
                      </div>
                      {ev.subtitle && (
                        <div style={{ fontSize: '0.78rem', color: '#6b6764', marginBottom: '6px' }}>
                          Project: {ev.subtitle}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                          background: ev.color + '18', color: ev.color, textTransform: 'uppercase', letterSpacing: '0.03em',
                        }}>
                          {ev.type.replace('_', ' ')}
                        </span>
                        {ev.gcal && (
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                            background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.03em',
                          }}>
                            GCal
                          </span>
                        )}
                        {ev.completed && (
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                            background: 'rgba(106,171,110,0.12)', color: '#6aab6e', textTransform: 'uppercase', letterSpacing: '0.03em',
                          }}>
                            completed
                          </span>
                        )}
                      </div>
                    </div>
                    {ev.type === 'project_due' && (
                      <a href={`/project/${ev.id}`} title="Open project" style={{ color: '#5a8abf', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'background 0.15s' }}>
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} color="#8a8682" />
              <span style={{ fontSize: '0.8rem', color: '#8a8682', fontStyle: 'italic' }}>Add Event (coming soon)</span>
            </div>
          </div>
        );
      })()}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Schedule Task Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowScheduleModal(false)}>
          <div className="glass-panel" style={{ padding: '2rem', width: '380px', maxWidth: '90vw', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(32px)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#2e2c2a' }}>Schedule Task</h3>
            {scheduleTask && <p style={{ fontSize: '0.88rem', color: '#3e3c3a', marginBottom: '1rem' }}>{scheduleTask.title}</p>}
            <input type="date" value={scheduleDateInput} onChange={e => setScheduleDateInput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowScheduleModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={handleSchedule} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini widget for embedding on Dashboard
export const CalendarWidget = ({ onViewAll }) => {
  const [events, setEvents] = useState([]);
  const today = new Date();

  useEffect(() => {
    const fetch = async () => {
      const todayStr = today.toISOString().slice(0, 10);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekStr = weekEnd.toISOString().slice(0, 10);

      const [projRes, taskRes] = await Promise.all([
        supabase.from('projects').select('id, name, due_date').gte('due_date', todayStr).lte('due_date', weekStr),
        supabase.from('global_tasks').select('id, title, due_date, column_id').gte('due_date', todayStr).lte('due_date', weekStr),
      ]);

      const items = [];
      (projRes.data || []).forEach(p => items.push({ title: p.name, date: p.due_date, type: 'project', color: '#b06050' }));
      (taskRes.data || []).forEach(t => items.push({ title: t.title, date: t.due_date, type: 'task', color: t.column_id === 'completed' ? '#6aab6e' : '#5a8abf' }));
      items.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(items.slice(0, 5));
    };
    fetch();
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2e2c2a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalIcon size={14} color="#b06050" /> Upcoming
        </h4>
        {onViewAll && (
          <button onClick={onViewAll} style={{ fontSize: '0.72rem', color: '#5a8abf', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            View All →
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p style={{ color: '#8a8682', fontSize: '0.8rem' }}>Nothing scheduled this week.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <span style={{ color: '#2e2c2a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
              <span style={{ fontSize: '0.7rem', color: '#8a8682', flexShrink: 0 }}>
                {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
