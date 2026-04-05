import { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle, MessageSquare, Heart, Lightbulb, FileText, Clipboard, Bot, RefreshCw, Timer } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';

// Source badge config
const SOURCE_CONFIG = {
  Task:     { icon: CheckCircle,   bg: '#e8f5e9', color: '#2e7d32' },
  CRM:      { icon: MessageSquare, bg: '#e3f2fd', color: '#1565c0' },
  Clinical: { icon: Heart,         bg: '#fce4ec', color: '#c62828' },
  Brief:    { icon: Clipboard,     bg: '#f3e5f5', color: '#7b1fa2' },
  Wishlist: { icon: Lightbulb,     bg: '#fff3e0', color: '#e65100' },
  Agent:    { icon: Bot,           bg: '#e8eaf6', color: '#3949ab' },
  System:   { icon: RefreshCw,     bg: '#f5f5f5', color: '#666' },
};

// Auto-duration estimation based on action type
const estimateDuration = (entry) => {
  if (entry.duration) return entry.duration;
  const action = entry.action || '';
  const source = entry.source || '';
  // SOAP notes are typically 3-5 minutes to write
  if (source === 'Clinical') return 5;
  // Session briefs are 90 seconds
  if (source === 'Brief') return 2;
  // Agent tasks — estimate from result length
  if (source === 'Agent' && action === 'agent_completed') return 1;
  // CRM entries — quick logging
  if (source === 'CRM') return 2;
  // Task status changes — instant
  if (action === 'created' || action === 'status_changed') return 1;
  if (action === 'completed') return 3;
  return null;
};

const WorkHistory = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState('week');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  // ---------- Single-source fetch from activity_log ----------
  const fetchAll = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      setEntries(data.map(a => ({
        id: a.id,
        source: a.source_type || 'System',
        title: a.title || a.action || 'Activity',
        description: a.description || '',
        action: a.action || '',
        project: a.project || null,
        timestamp: a.created_at,
        meta: typeof a.details === 'string' ? a.details : (a.details ? JSON.stringify(a.details) : null),
        actor: a.actor || 'System',
        entity_type: a.entity_type || null,
        entity_id: a.entity_id || null,
        duration: estimateDuration(a),
      })));
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---------- Time filtering ----------
  const timeFiltered = useMemo(() => {
    const now = new Date();
    return entries.filter(e => {
      if (timeRange === 'all') return true;
      const d = new Date(e.timestamp);
      if (timeRange === 'today') return d.toDateString() === now.toDateString();
      if (timeRange === 'week') { const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago; }
      if (timeRange === 'month') { const ago = new Date(now); ago.setMonth(ago.getMonth() - 1); return d >= ago; }
      return true;
    });
  }, [entries, timeRange]);

  // ---------- Source + Action filtering ----------
  const filtered = useMemo(() => {
    let result = timeFiltered;
    if (sourceFilter !== 'All') result = result.filter(e => e.source === sourceFilter);
    if (actionFilter !== 'All') result = result.filter(e => e.action === actionFilter);
    return result;
  }, [timeFiltered, sourceFilter, actionFilter]);

  // ---------- Source counts for pills ----------
  const sourceCounts = useMemo(() => {
    const counts = { All: timeFiltered.length };
    timeFiltered.forEach(e => { counts[e.source] = (counts[e.source] || 0) + 1; });
    return counts;
  }, [timeFiltered]);

  // ---------- Action counts ----------
  const actionCounts = useMemo(() => {
    const counts = {};
    timeFiltered.forEach(e => { if (e.action) counts[e.action] = (counts[e.action] || 0) + 1; });
    return counts;
  }, [timeFiltered]);

  // ---------- Total estimated duration ----------
  const totalDuration = useMemo(() => {
    return filtered.reduce((sum, e) => sum + (e.duration || 0), 0);
  }, [filtered]);

  // ---------- Helpers ----------
  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (min) => {
    if (!min) return null;
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ---------- Group by date ----------
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const key = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups);
  }, [filtered]);

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Clock color="#b06050" /> Work History <InfoTooltip text={PAGE_INFO.history} />
          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontWeight: 600 }}>
            {filtered.length} entries
          </span>
          {totalDuration > 0 && (
            <span style={{ fontSize: '0.68rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(45,138,78,0.1)', color: '#2d8a4e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Timer size={11} /> ~{formatDuration(totalDuration)}
            </span>
          )}
        </h1>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem', color: '#6b6764' }}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

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

        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />

        {/* Source filter pills */}
        {['All', 'Task', 'Agent', 'CRM', 'Clinical', 'Brief', 'Wishlist'].map(s => {
          const cfg = SOURCE_CONFIG[s];
          const count = sourceCounts[s] || 0;
          const isActive = sourceFilter === s;
          return (
            <button key={s} onClick={() => setSourceFilter(s)}
              style={{
                fontSize: '0.78rem', padding: '4px 12px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, transition: 'all 0.15s',
                background: isActive ? (cfg?.bg || 'rgba(176,96,80,0.15)') : 'rgba(0,0,0,0.04)',
                color: isActive ? (cfg?.color || '#b06050') : '#888',
              }}>
              {s} {count > 0 && <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Action filter — collapsible */}
      {Object.keys(actionCounts).length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', fontSize: '0.68rem' }}>
          <span style={{ color: '#8a8682', padding: '3px 0', fontWeight: 600 }}>Action:</span>
          <button onClick={() => setActionFilter('All')}
            style={{ padding: '2px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
              background: actionFilter === 'All' ? '#333' : 'rgba(0,0,0,0.04)', color: actionFilter === 'All' ? '#fff' : '#888' }}>
            All
          </button>
          {Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([action, count]) => (
            <button key={action} onClick={() => setActionFilter(actionFilter === action ? 'All' : action)}
              style={{ padding: '2px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 500,
                background: actionFilter === action ? 'rgba(176,96,80,0.15)' : 'rgba(0,0,0,0.03)', color: actionFilter === action ? '#b06050' : '#999' }}>
              {action.replace(/_/g, ' ')} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Data source indicator */}
      <div style={{ fontSize: '0.65rem', color: '#bbb', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2d8a4e' }} />
        Powered by unified activity_log — all sources feed in via database triggers
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Loading activity...</div>
        ) : grouped.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
            {entries.length === 0
              ? 'No activity yet. Run the unified_activity_log.sql migration to enable triggers, then actions will appear here automatically.'
              : 'No activity found for this period and filter combination.'}
          </div>
        ) : grouped.map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingLeft: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {dateLabel}
              </span>
              <span style={{ fontSize: '0.62rem', color: '#bbb' }}>
                {items.length} {items.length === 1 ? 'entry' : 'entries'}
                {(() => { const d = items.reduce((s, e) => s + (e.duration || 0), 0); return d > 0 ? ` · ~${formatDuration(d)}` : ''; })()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map(entry => {
                const cfg = SOURCE_CONFIG[entry.source] || SOURCE_CONFIG.System;
                const Icon = cfg.icon;
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id} className="glass-panel" style={{
                    padding: 0, overflow: 'hidden', transition: 'all 0.15s', cursor: 'pointer',
                    border: isExpanded ? `1px solid ${cfg.color}30` : undefined,
                  }}>
                    {/* Summary row */}
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(176,96,80,0.03)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, color: cfg.color, flexShrink: 0, marginTop: '2px' }}>
                        <Icon size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a' }}>{entry.title}</span>
                          <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, background: cfg.bg, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{entry.source}</span>
                          {entry.action && entry.action !== 'created' && (
                            <span style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 500, background: 'rgba(0,0,0,0.04)', color: '#888' }}>{entry.action.replace(/_/g, ' ')}</span>
                          )}
                          {entry.project && <span style={{ fontSize: '0.72rem', color: '#888', fontStyle: 'italic' }}>{entry.project}</span>}
                          {entry.duration && <span style={{ fontSize: '0.65rem', color: '#2d8a4e', fontWeight: 500 }}>~{formatDuration(entry.duration)}</span>}
                        </div>
                        {!isExpanded && entry.description && (
                          <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '3px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.description}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                        <div>{formatTime(entry.timestamp)}</div>
                        <div style={{ fontSize: '0.6rem', color: '#ccc' }}>{timeAgo(entry.timestamp)}</div>
                      </div>
                    </div>
                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
                        <div className="responsive-grid-2" style={{ padding: '12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', marginBottom: '4px', textTransform: 'uppercase' }}>Details</div>
                            {entry.description ? (
                              <div style={{ fontSize: '0.82rem', color: '#3e3c3a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.description}</div>
                            ) : (
                              <div style={{ fontSize: '0.82rem', color: '#bbb', fontStyle: 'italic' }}>No additional details.</div>
                            )}
                            {entry.meta && entry.meta !== '{}' && entry.meta !== 'null' && (
                              <div style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '6px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.02)', padding: '6px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                                {entry.meta}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', marginBottom: '4px', textTransform: 'uppercase' }}>Context</div>
                            <div style={{ fontSize: '0.78rem', color: '#3e3c3a', lineHeight: 1.6 }}>
                              <div><strong>Source:</strong> {entry.source}</div>
                              {entry.action && <div><strong>Action:</strong> {entry.action.replace(/_/g, ' ')}</div>}
                              {entry.actor && entry.actor !== 'System' && <div><strong>Actor:</strong> {entry.actor}</div>}
                              {entry.project && <div><strong>Project:</strong> {entry.project}</div>}
                              {entry.entity_type && <div><strong>Entity:</strong> {entry.entity_type} {entry.entity_id ? `#${entry.entity_id.slice(0, 8)}` : ''}</div>}
                              <div><strong>When:</strong> {new Date(entry.timestamp).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                              {entry.duration && <div><strong>Est. Duration:</strong> ~{formatDuration(entry.duration)}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default WorkHistory;
