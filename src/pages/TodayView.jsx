import { useState, useEffect } from 'react';
import { Sun, Calendar, ListChecks, Bell, Zap, Clock, ArrowRight, FileText, MessageSquare, CheckCircle, AlertTriangle, Sparkles, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import Breadcrumbs from '../components/Breadcrumbs';
import { supabase } from '../lib/supabase';

const DAILY_QUOTES = [
  "Build the system, then trust it.",
  "Small sessions, big outcomes.",
  "Every patient is a teacher.",
  "Ship today, refine tomorrow.",
  "Energy management over time management.",
  "The compound effect is real. Keep stacking.",
  "What you measure, you can move.",
];

const NS_COLORS = {
  Green: { color: '#2d8a4e', bg: 'rgba(45,138,78,0.1)' },
  Amber: { color: '#c49a40', bg: 'rgba(196,154,64,0.1)' },
  Red: { color: '#d14040', bg: 'rgba(209,64,64,0.1)' },
};

const TRIGGER_COLORS = {
  1: { color: '#d14040', bg: 'rgba(209,64,64,0.1)', label: 'Tier 1' },
  2: { color: '#c49a40', bg: 'rgba(196,154,64,0.1)', label: 'Tier 2' },
  3: { color: '#5a8abf', bg: 'rgba(90,138,191,0.1)', label: 'Tier 3' },
};

const formatDate = (d) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const SectionHeader = ({ icon: Icon, title, count, color = '#b06050' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
    <Icon size={18} color={color} />
    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2e2c2a', margin: 0 }}>{title}</h3>
    {count !== undefined && (
      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8a8682', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '10px' }}>{count}</span>
    )}
  </div>
);

export default function TodayView() {
  const [sessions, setSessions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({ unbilled: 0, wishlist: 0, overdue: 0, proposals: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const quote = DAILY_QUOTES[today.getDate() % DAILY_QUOTES.length];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSessions(),
        loadTasks(),
        loadPendingCounts(),
        loadRecentActivity(),
      ]);
    } catch (err) {
      console.error('TodayView load error:', err);
    }
    setLoading(false);
  };

  const loadSessions = async () => {
    // Try session_briefs first, then soap_notes
    const { data: briefs } = await supabase
      .from('session_briefs')
      .select('*')
      .eq('session_date', todayStr)
      .order('created_at', { ascending: true });

    const { data: soaps } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('session_date', todayStr)
      .order('created_at', { ascending: true });

    // Merge, preferring briefs and deduplicating by client name
    const seen = new Set();
    const merged = [];
    for (const b of (briefs || [])) {
      const key = (b.client_name || '').toLowerCase();
      if (!seen.has(key)) { seen.add(key); merged.push({ ...b, source: 'brief' }); }
    }
    for (const s of (soaps || [])) {
      const key = (s.client_name || '').toLowerCase();
      if (!seen.has(key)) { seen.add(key); merged.push({ ...s, source: 'soap' }); }
    }
    setSessions(merged);
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from('global_tasks')
      .select('*, projects(name)')
      .neq('status', 'completed')
      .order('priority', { ascending: true, nullsFirst: false })
      .limit(5);
    setTasks(data || []);
  };

  const loadPendingCounts = async () => {
    // Unbilled SOAP notes
    const { count: unbilled } = await supabase
      .from('soap_notes')
      .select('id', { count: 'exact', head: true })
      .eq('billed', false);

    // Unread wishlist items
    const { count: wishlist } = await supabase
      .from('wishlist')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'New Idea');

    // Overdue tasks
    const { count: overdue } = await supabase
      .from('global_tasks')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'completed')
      .lt('due_date', todayStr);

    // Pending proposals
    const { count: proposals } = await supabase
      .from('client_documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');

    setPendingCounts({
      unbilled: unbilled || 0,
      wishlist: wishlist || 0,
      overdue: overdue || 0,
      proposals: proposals || 0,
    });
  };

  const loadRecentActivity = async () => {
    // Recent communication log entries
    const { data: comms } = await supabase
      .from('communication_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    // Recently completed tasks
    const { data: completed } = await supabase
      .from('global_tasks')
      .select('*, projects(name)')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(3);

    const merged = [
      ...(comms || []).map(c => ({ type: 'comm', ...c, sortDate: c.created_at })),
      ...(completed || []).map(t => ({ type: 'task', ...t, sortDate: t.updated_at })),
    ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate)).slice(0, 5);

    setRecentActivity(merged);
  };

  const totalPending = pendingCounts.unbilled + pendingCounts.wishlist + pendingCounts.overdue + pendingCounts.proposals;

  return (
    <div className="main-content" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <Breadcrumbs />

      {/* Good Morning Header */}
      <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(176,96,80,0.06), rgba(196,154,64,0.04))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Sun size={24} color="#c49a40" />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2e2c2a', margin: 0 }}>
                {getTimeGreeting()}, Lance
              </h1>
              <InfoTooltip text={PAGE_INFO.today || 'Your daily morning dashboard. See sessions, tasks, and actions at a glance.'} />
            </div>
            <p style={{ fontSize: '0.88rem', color: '#8a8682', margin: '4px 0 0 34px' }}>
              {formatDate(today)}
            </p>
          </div>
          <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(196,154,64,0.08)', maxWidth: '320px' }}>
            <p style={{ fontSize: '0.82rem', color: '#8a7a5a', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              "{quote}"
            </p>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Today's Sessions */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <SectionHeader icon={Calendar} title="Today's Sessions" count={sessions.length} color="#ad1457" />
          {loading ? (
            <p style={{ fontSize: '0.82rem', color: '#aaa' }}>Loading...</p>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
              <Calendar size={32} color="#ddd" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>No sessions scheduled</p>
              <Link to="/soap" style={{ fontSize: '0.75rem', color: '#b06050', textDecoration: 'none', marginTop: '6px', display: 'inline-block' }}>
                + Add Session Brief
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessions.map((s, i) => {
                const ns = NS_COLORS[s.nervous_system_state] || NS_COLORS.Green;
                return (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a' }}>{s.client_name}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {s.tier && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', background: 'rgba(173,20,87,0.08)', color: '#ad1457' }}>
                            {s.tier}
                          </span>
                        )}
                        {s.session_type && (
                          <span style={{ fontSize: '0.62rem', color: '#8a8682' }}>{s.session_type}</span>
                        )}
                      </div>
                    </div>
                    {s.nervous_system_state && (
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ns.color, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.72rem', color: ns.color }}>NS: {s.nervous_system_state}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Tasks */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <SectionHeader icon={ListChecks} title="Priority Tasks" count={tasks.length} color="#b06050" />
          {loading ? (
            <p style={{ fontSize: '0.82rem', color: '#aaa' }}>Loading...</p>
          ) : tasks.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#aaa', textAlign: 'center', padding: '24px 0' }}>All clear! No pending tasks.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tasks.map((t, i) => {
                const trigger = TRIGGER_COLORS[t.trigger_level] || TRIGGER_COLORS[3];
                const projName = t.projects?.name || '';
                const urgency = getUrgencyLabel(t.due_date);
                return (
                  <div key={t.id || i} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: trigger.bg, color: trigger.color, whiteSpace: 'nowrap' }}>
                      {trigger.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title || t.name}
                      </div>
                      {projName && (
                        <div style={{ fontSize: '0.68rem', color: '#8a8682' }}>{projName}</div>
                      )}
                    </div>
                    {urgency && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', background: urgency.bg, color: urgency.color, whiteSpace: 'nowrap' }}>
                        {urgency.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <SectionHeader icon={Bell} title="Pending Actions" count={totalPending} color="#c49a40" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <PendingCard icon={FileText} label="Unbilled SOAPs" count={pendingCounts.unbilled} color="#d14040" link="/billing" />
            <PendingCard icon={Sparkles} label="New Ideas" count={pendingCounts.wishlist} color="#9c27b0" link="/wishlist" />
            <PendingCard icon={AlertTriangle} label="Overdue Tasks" count={pendingCounts.overdue} color="#c49a40" link="/taskqueue" />
            <PendingCard icon={FileText} label="Draft Proposals" count={pendingCounts.proposals} color="#5a8abf" link="/proposals" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <SectionHeader icon={Zap} title="Quick Actions" color="#2d8a4e" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <QuickActionButton icon={FileText} label="Start Session Brief" to="/soap" color="#ad1457" />
            <QuickActionButton icon={Sparkles} label="Add Idea" to="/wishlist" color="#9c27b0" subtitle="Cmd+K" />
            <QuickActionButton icon={PhoneCall} label="Check CRM" to="/crm" color="#e65100" />
            <QuickActionButton icon={Calendar} label="View Calendar" to="/calendar" color="#1565c0" />
          </div>
        </div>
      </div>

      {/* Recent Activity — full width */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginTop: '16px' }}>
        <SectionHeader icon={Clock} title="Recent Activity" count={recentActivity.length} color="#00695c" />
        {loading ? (
          <p style={{ fontSize: '0.82rem', color: '#aaa' }}>Loading...</p>
        ) : recentActivity.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#aaa', textAlign: 'center', padding: '16px 0' }}>No recent activity</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
                {item.type === 'comm' ? (
                  <MessageSquare size={14} color="#5a8abf" />
                ) : (
                  <CheckCircle size={14} color="#6aab6e" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.type === 'comm'
                      ? `${item.direction || ''} ${item.channel || ''}: ${item.subject || item.summary || 'Communication'}`
                      : `Completed: ${item.title || item.name}`
                    }
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#8a8682' }}>
                    {item.type === 'task' && item.projects?.name ? `${item.projects.name} · ` : ''}
                    {formatTimeAgo(item.sortDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components

function PendingCard({ icon: Icon, label, count, color, link }) {
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <div style={{ padding: '12px', borderRadius: '10px', background: count > 0 ? `${color}08` : 'rgba(0,0,0,0.02)', border: `1px solid ${count > 0 ? `${color}20` : 'rgba(0,0,0,0.05)'}`, cursor: 'pointer', transition: 'transform 0.15s', textAlign: 'center' }}
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
        <Icon size={18} color={count > 0 ? color : '#bbb'} style={{ marginBottom: '4px' }} />
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: count > 0 ? color : '#ccc' }}>{count}</div>
        <div style={{ fontSize: '0.68rem', color: '#8a8682', fontWeight: 500 }}>{label}</div>
      </div>
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, to, color, subtitle }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{ padding: '16px 12px', borderRadius: '12px', background: `${color}08`, border: `1px solid ${color}15`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}15`; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <Icon size={22} color={color} style={{ marginBottom: '6px' }} />
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2e2c2a' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.6rem', color: '#8a8682', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </Link>
  );
}

function getUrgencyLabel(dueDateStr) {
  if (!dueDateStr) return null;
  const now = new Date();
  const due = new Date(dueDateStr);
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d overdue`, color: '#fff', bg: '#d14040' };
  if (daysLeft <= 3) return { label: `${daysLeft}d left`, color: '#d14040', bg: 'rgba(209,64,64,0.12)' };
  if (daysLeft <= 14) return { label: `${daysLeft}d left`, color: '#c49a40', bg: 'rgba(196,154,64,0.10)' };
  return { label: `${daysLeft}d`, color: '#6aab6e', bg: 'rgba(106,171,110,0.10)' };
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
