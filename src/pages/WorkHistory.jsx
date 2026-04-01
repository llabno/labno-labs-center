import { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, BarChart2, Filter, ChevronDown, User, Bot, Folder, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORY_COLORS = {
  'Feature': { bg: '#e8f5e9', color: '#2e7d32' },
  'Bug Fix': { bg: '#fce4ec', color: '#c62828' },
  'UI/UX': { bg: '#f3e5f5', color: '#7b1fa2' },
  'Infrastructure': { bg: '#e3f2fd', color: '#1565c0' },
  'DevOps': { bg: '#fff3e0', color: '#e65100' },
  'Auth': { bg: '#e0f2f1', color: '#00695c' },
  'Integration': { bg: '#fce4ec', color: '#ad1457' },
  'Compliance': { bg: '#ffebee', color: '#b71c1c' },
};

const getCatStyle = (cat) => CATEGORY_COLORS[cat] || { bg: '#f5f5f5', color: '#666' };

const WorkHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeRange, setTimeRange] = useState('today'); // today | week | month | all
  const [projectFilter, setProjectFilter] = useState('All');
  const [requestedByFilter, setRequestedByFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  // Unique filter options from data
  const filterOptions = useMemo(() => ({
    projects: ['All', ...new Set(history.map(h => h.project_name).filter(Boolean))],
    requesters: ['All', ...new Set(history.map(h => h.requested_by).filter(Boolean))],
    agents: ['All', ...new Set(history.map(h => h.agent_or_mcp).filter(Boolean))],
    categories: ['All', ...new Set(history.map(h => h.category).filter(Boolean))],
  }), [history]);

  // Filter by time range
  const timeFiltered = useMemo(() => {
    const now = new Date();
    return history.filter(h => {
      if (timeRange === 'all') return true;
      const created = new Date(h.created_at);
      if (timeRange === 'today') {
        return created.toDateString() === now.toDateString();
      }
      if (timeRange === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }
      if (timeRange === 'month') {
        const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
        return created >= monthAgo;
      }
      return true;
    });
  }, [history, timeRange]);

  // Apply all filters
  const filtered = useMemo(() => {
    return timeFiltered.filter(h => {
      if (projectFilter !== 'All' && h.project_name !== projectFilter) return false;
      if (requestedByFilter !== 'All' && h.requested_by !== requestedByFilter) return false;
      if (agentFilter !== 'All' && h.agent_or_mcp !== agentFilter) return false;
      if (categoryFilter !== 'All' && h.category !== categoryFilter) return false;
      return true;
    });
  }, [timeFiltered, projectFilter, requestedByFilter, agentFilter, categoryFilter]);

  // Analytics
  const analytics = useMemo(() => {
    const totalMinutes = filtered.reduce((s, h) => s + (h.duration_minutes || 0), 0);
    const byCategory = {};
    const byProject = {};
    const byAgent = {};
    const byRequester = {};

    filtered.forEach(h => {
      byCategory[h.category] = (byCategory[h.category] || 0) + 1;
      byProject[h.project_name] = (byProject[h.project_name] || 0) + 1;
      byAgent[h.agent_or_mcp] = (byAgent[h.agent_or_mcp] || 0) + 1;
      byRequester[h.requested_by] = (byRequester[h.requested_by] || 0) + 1;
    });

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const topProject = Object.entries(byProject).sort((a, b) => b[1] - a[1])[0];

    return { totalMinutes, totalTasks: filtered.length, byCategory, byProject, byAgent, byRequester, topCategory, topProject };
  }, [filtered]);

  const formatDuration = (min) => {
    if (!min) return '—';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const BarChart = ({ data, maxWidth = 200 }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map(([label, count]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <span style={{ width: '120px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{label}</span>
            <div style={{ flex: 1, maxWidth, height: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: 'rgba(176,96,80,0.5)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ width: '24px', color: '#666', fontWeight: 600 }}>{count}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Clock color="#b06050" /> Work History
        <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontWeight: 600 }}>
          {analytics.totalTasks} tasks · {formatDuration(analytics.totalMinutes)}
        </span>
      </h1>

      {/* Time Range Toggle */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
          { key: 'month', label: 'This Month' },
          { key: 'all', label: 'All Time' },
        ].map(t => (
          <button key={t.key} onClick={() => setTimeRange(t.key)}
            className={`filter-pill${timeRange === t.key ? ' active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '5px 14px' }}>{t.label}</button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Dropdown Filters */}
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)' }}>
          {filterOptions.projects.map(p => <option key={p} value={p}>{p === 'All' ? 'All Projects' : p}</option>)}
        </select>
        <select value={requestedByFilter} onChange={e => setRequestedByFilter(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)' }}>
          {filterOptions.requesters.map(r => <option key={r} value={r}>{r === 'All' ? 'All Requesters' : r}</option>)}
        </select>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)' }}>
          {filterOptions.agents.map(a => <option key={a} value={a}>{a === 'All' ? 'All Agents/MCPs' : a}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)' }}>
          {filterOptions.categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      {/* Analytics Summary Cards */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>By Category</h3>
          <BarChart data={analytics.byCategory} />
        </div>
        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>By Project</h3>
          <BarChart data={analytics.byProject} />
        </div>
        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>By Agent/MCP</h3>
          <BarChart data={analytics.byAgent} />
        </div>
      </div>

      {/* Efficiency Insights */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <div>
          <span style={{ color: '#999' }}>Total Time:</span>{' '}
          <strong style={{ color: '#2e2c2a' }}>{formatDuration(analytics.totalMinutes)}</strong>
        </div>
        <div>
          <span style={{ color: '#999' }}>Avg per Task:</span>{' '}
          <strong style={{ color: '#2e2c2a' }}>{analytics.totalTasks ? formatDuration(Math.round(analytics.totalMinutes / analytics.totalTasks)) : '—'}</strong>
        </div>
        <div>
          <span style={{ color: '#999' }}>Most Common:</span>{' '}
          <strong style={{ color: '#2e2c2a' }}>{analytics.topCategory ? `${analytics.topCategory[0]} (${analytics.topCategory[1]})` : '—'}</strong>
        </div>
        <div>
          <span style={{ color: '#999' }}>Top Project:</span>{' '}
          <strong style={{ color: '#2e2c2a' }}>{analytics.topProject ? `${analytics.topProject[0]} (${analytics.topProject[1]})` : '—'}</strong>
        </div>
      </div>

      {/* Task List */}
      <div className="glass-panel" style={{ flex: 1, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0 }}>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Task</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Project</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Requested By</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Agent/MCP</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#666', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No work history for this period</td></tr>
              ) : filtered.map(h => {
                const cs = getCatStyle(h.category);
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(176,96,80,0.02)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.6rem 1rem', color: '#999', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatTime(h.created_at)}</td>
                    <td style={{ padding: '0.6rem 1rem', color: '#2e2c2a', fontWeight: 500 }}>{h.task_title}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#666' }}>
                        <Folder size={11} /> {h.project_name || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, background: cs.bg, color: cs.color }}>{h.category}</span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#666' }}>
                        <User size={11} /> {h.requested_by || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#666' }}>
                        <Bot size={11} /> {h.agent_or_mcp || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#444', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatDuration(h.duration_minutes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkHistory;
