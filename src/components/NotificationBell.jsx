import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    newTasks: 0,
    unbilledSessions: 0,
    newIdeas: 0,
    agentCompleted: 0,
    agentNeedsInput: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const navigate = useNavigate();

  const total = notifications.newTasks + notifications.unbilledSessions + notifications.newIdeas + notifications.agentCompleted + notifications.agentNeedsInput + notifications.overdueTasks;

  // Fetch notification counts on mount and every 5 minutes
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchCounts() {
    setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [tasksRes, soapRes, wishlistRes, agentCompletedRes, agentInputRes, overdueRes] = await Promise.all([
        supabase
          .from('global_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('column_id', 'triage')
          .gte('created_at', twentyFourHoursAgo),
        supabase
          .from('soap_notes')
          .select('id', { count: 'exact', head: true })
          .eq('billing_status', 'pending'),
        supabase
          .from('wishlist')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'New Idea'),
        // Agent completions in last 24h
        supabase
          .from('agent_runs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('completed_at', twentyFourHoursAgo),
        // Agents needing human input
        supabase
          .from('agent_runs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'needs_input'),
        // Overdue recurring tasks (blocked or never run)
        supabase
          .from('global_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('column_id', 'blocked'),
      ]);

      setNotifications({
        newTasks: tasksRes.count || 0,
        unbilledSessions: soapRes.count || 0,
        newIdeas: wishlistRes.count || 0,
        agentCompleted: agentCompletedRes.count || 0,
        agentNeedsInput: agentInputRes.count || 0,
        overdueTasks: overdueRes.count || 0,
      });
    } catch (err) {
      console.error('NotificationBell fetch error:', err);
    }
    setLoading(false);
  }

  function handleNavigate(path) {
    setOpen(false);
    navigate(path);
  }

  const items = [
    { label: 'agents need your input', count: notifications.agentNeedsInput, path: '/agent-queue', color: '#d32f2f' },
    { label: 'new tasks in triage', count: notifications.newTasks, path: '/taskqueue', color: '#b06050' },
    { label: 'agent tasks completed', count: notifications.agentCompleted, path: '/autonomous', color: '#2d8a4e' },
    { label: 'unbilled sessions', count: notifications.unbilledSessions, path: '/soap', color: '#ad1457' },
    { label: 'blocked tasks', count: notifications.overdueTasks, path: '/planner', color: '#c49a40' },
    { label: 'new ideas', count: notifications.newIdeas, path: '/wishlist', color: '#9c27b0' },
  ];

  return (
    <div ref={ref} style={{ position: 'fixed', right: '24px', top: '16px', zIndex: 1000 }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'box-shadow 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.14)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Bell size={20} color="#555" />
        {total > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#d32f2f',
            color: '#fff',
            fontSize: '0.62rem',
            fontWeight: 700,
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 2px 6px rgba(211,47,47,0.4)',
            lineHeight: 1,
          }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '52px',
          right: 0,
          width: '280px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease-out',
        }}>
          <div style={{
            padding: '12px 16px 8px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333' }}>Notifications</span>
            <button
              onClick={() => setOpen(false)}
              style={{
                fontSize: '0.65rem',
                color: '#8a8682',
                background: 'rgba(0,0,0,0.04)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Dismiss All
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '0.78rem' }}>Loading...</div>
          ) : total === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '0.78rem' }}>All clear -- nothing needs attention.</div>
          ) : (
            <div style={{ padding: '6px 0' }}>
              {items.filter(i => i.count > 0).map(item => (
                <div
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: item.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: item.color,
                    flexShrink: 0,
                  }}>
                    {item.count}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#444', fontWeight: 500 }}>
                    {item.count} {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '8px 16px 10px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <span
              onClick={() => { fetchCounts(); }}
              style={{ fontSize: '0.65rem', color: '#8a8682', cursor: 'pointer', fontWeight: 500 }}
            >
              Refresh
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
