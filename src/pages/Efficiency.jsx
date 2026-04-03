import { useState, useEffect } from 'react';
import { Gauge, DollarSign, Zap, Activity, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmt = (n, decimals = 2) => (n || 0).toFixed(decimals);
const fmtCost = (n) => '$' + fmt(n);
const fmtTokens = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
};
const shortDate = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
const durationStr = (start, end) => {
  if (!start || !end) return '--';
  const ms = new Date(end) - new Date(start);
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

const STATUS_COLORS = {
  queued: '#5a8abf',
  running: '#c49a40',
  completed: '#6aab6e',
  failed: '#c0392b',
};

const Efficiency = () => {
  const [loading, setLoading] = useState(true);
  const [todayCost, setTodayCost] = useState(0);
  const [mtdCost, setMtdCost] = useState(0);
  const [todayRequests, setTodayRequests] = useState(0);
  const [mtdRequests, setMtdRequests] = useState(0);
  const [dailyData, setDailyData] = useState([]);
  const [byEndpoint, setByEndpoint] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [agentRuns, setAgentRuns] = useState([]);
  const [rateLimits, setRateLimits] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // Today's cost + count
      const { data: todayRows } = await supabase
        .from('token_usage_log')
        .select('estimated_cost_usd')
        .gte('created_at', todayStart);

      const tCost = (todayRows || []).reduce((s, r) => s + (r.estimated_cost_usd || 0), 0);
      const tCount = (todayRows || []).length;
      setTodayCost(tCost);
      setTodayRequests(tCount);

      // MTD cost + count
      const { data: mtdRows } = await supabase
        .from('token_usage_log')
        .select('estimated_cost_usd')
        .gte('created_at', monthStart);

      const mCost = (mtdRows || []).reduce((s, r) => s + (r.estimated_cost_usd || 0), 0);
      const mCount = (mtdRows || []).length;
      setMtdCost(mCost);
      setMtdRequests(mCount);

      // Daily summary (last 30 days)
      const { data: dailyRows } = await supabase
        .from('token_usage_daily_summary')
        .select('day, total_cost_usd')
        .gte('day', thirtyDaysAgo)
        .order('day', { ascending: true });

      // Aggregate by day (view may have multiple rows per day for different endpoints/models)
      const dayMap = {};
      (dailyRows || []).forEach(r => {
        dayMap[r.day] = (dayMap[r.day] || 0) + (r.total_cost_usd || 0);
      });
      const aggregated = Object.entries(dayMap).map(([day, cost]) => ({ day, cost })).sort((a, b) => a.day.localeCompare(b.day));
      setDailyData(aggregated);

      // By endpoint (current month)
      const { data: epRows } = await supabase
        .from('token_usage_daily_summary')
        .select('endpoint, request_count, total_tokens, total_cost_usd')
        .gte('day', monthStart.split('T')[0]);

      const epMap = {};
      (epRows || []).forEach(r => {
        if (!epMap[r.endpoint]) epMap[r.endpoint] = { endpoint: r.endpoint, requests: 0, tokens: 0, cost: 0 };
        epMap[r.endpoint].requests += r.request_count || 0;
        epMap[r.endpoint].tokens += r.total_tokens || 0;
        epMap[r.endpoint].cost += r.total_cost_usd || 0;
      });
      setByEndpoint(Object.values(epMap).sort((a, b) => b.cost - a.cost));

      // By model (current month)
      const { data: modelRows } = await supabase
        .from('token_usage_daily_summary')
        .select('model, request_count, total_tokens, total_cost_usd')
        .gte('day', monthStart.split('T')[0]);

      const mMap = {};
      (modelRows || []).forEach(r => {
        if (!mMap[r.model]) mMap[r.model] = { model: r.model, requests: 0, tokens: 0, cost: 0 };
        mMap[r.model].requests += r.request_count || 0;
        mMap[r.model].tokens += r.total_tokens || 0;
        mMap[r.model].cost += r.total_cost_usd || 0;
      });
      setByModel(Object.values(mMap).sort((a, b) => b.cost - a.cost));

      // Agent runs (last 20)
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('task_title, status, started_at, completed_at, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      setAgentRuns(runs || []);

      // Rate limit events (last 20)
      const { data: rlRows } = await supabase
        .from('rate_limit_log')
        .select('identifier, endpoint, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      setRateLimits(rlRows || []);

    } catch (err) {
      console.error('Efficiency fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const avgCostPerReq = mtdRequests > 0 ? mtdCost / mtdRequests : 0;
  const maxDailyCost = Math.max(...dailyData.map(d => d.cost), 1);
  const BUDGET = 50;
  const budgetPct = BUDGET > 0 ? (mtdCost / BUDGET) * 100 : 0;
  const budgetColor = budgetPct < 60 ? '#6aab6e' : budgetPct < 85 ? '#c49a40' : '#c0392b';

  // Projected month-end
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyAvg = dayOfMonth > 0 ? mtdCost / dayOfMonth : 0;
  const projected = dailyAvg * daysInMonth;

  const barColor = (cost) => {
    if (cost > 3) return '#c0392b';
    if (cost > 1) return '#c49a40';
    return '#6aab6e';
  };

  const panelStyle = {
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const tableHeaderStyle = {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#8a8682',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  };

  const tableCellStyle = {
    fontSize: '0.85rem',
    color: '#2e2c2a',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
  };

  return (
    <div className="main-content" style={{ padding: '2rem', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e2c2a', margin: 0 }}>
            <Gauge size={22} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent)' }} />
            Efficiency Monitor
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#9e9a97', marginTop: '4px' }}>
            Token costs, API usage, and system health
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px', padding: '8px 14px', cursor: 'pointer',
            fontSize: '0.82rem', color: '#6b6764', fontWeight: 500,
            transition: 'all 0.25s ease',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { title: "Today's Cost", value: fmtCost(todayCost), icon: <DollarSign size={18} style={{ color: '#6aab6e' }} /> },
          { title: 'Month-to-Date Cost', value: fmtCost(mtdCost), icon: <DollarSign size={18} style={{ color: 'var(--accent)' }} /> },
          { title: 'Requests Today', value: todayRequests.toLocaleString(), icon: <Zap size={18} style={{ color: '#5a8abf' }} /> },
          { title: 'Avg Cost / Request', value: fmtCost(avgCostPerReq, 4), icon: <Activity size={18} style={{ color: '#c49a40' }} /> },
        ].map((card, i) => (
          <div key={i} className="stat-card glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {card.icon}
              <span className="stat-title">{card.title}</span>
            </div>
            <div className="stat-value" style={{ fontSize: '2rem' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Daily Cost Chart */}
      <div className="glass-panel" style={panelStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
          Daily Cost (Last 30 Days)
        </h3>
        {dailyData.length === 0 ? (
          <p style={{ color: '#9e9a97', fontSize: '0.85rem' }}>No data yet</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '180px', paddingBottom: '24px', position: 'relative' }}>
            {dailyData.map((d, i) => {
              const heightPct = (d.cost / maxDailyCost) * 100;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    position: 'relative',
                  }}
                  title={`${d.day}: ${fmtCost(d.cost)}`}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '24px',
                      height: `${Math.max(heightPct, 2)}%`,
                      background: `linear-gradient(180deg, ${barColor(d.cost)} 0%, ${barColor(d.cost)}99 100%)`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                      cursor: 'default',
                    }}
                  />
                  {i % Math.max(1, Math.floor(dailyData.length / 10)) === 0 && (
                    <span style={{
                      position: 'absolute',
                      bottom: '-20px',
                      fontSize: '0.6rem',
                      color: '#9e9a97',
                      whiteSpace: 'nowrap',
                    }}>
                      {shortDate(d.day)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.7rem', color: '#9e9a97' }}>
          <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#6aab6e', marginRight: '4px' }} />&lt;$1</span>
          <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#c49a40', marginRight: '4px' }} />$1-3</span>
          <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#c0392b', marginRight: '4px' }} />&gt;$3</span>
        </div>
      </div>

      {/* Row 3: Endpoint + Model tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Cost by Endpoint */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
            Cost by Endpoint (MTD)
          </h3>
          {byEndpoint.length === 0 ? (
            <p style={{ color: '#9e9a97', fontSize: '0.85rem' }}>No data yet</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Endpoint</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Requests</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Tokens</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Cost</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Avg Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byEndpoint.map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...tableCellStyle, fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.endpoint}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>{row.requests.toLocaleString()}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtTokens(row.tokens)}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCost(row.cost)}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right', color: '#6b6764' }}>{fmtCost(row.requests > 0 ? row.cost / row.requests : 0, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cost by Model */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
            Cost by Model (MTD)
          </h3>
          {byModel.length === 0 ? (
            <p style={{ color: '#9e9a97', fontSize: '0.85rem' }}>No data yet</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Model</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Requests</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Tokens</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...tableCellStyle, fontWeight: 500 }}>{row.model}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>{row.requests.toLocaleString()}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtTokens(row.tokens)}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCost(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Agent Runs + Rate Limits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Agent Run History */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
            <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Agent Run History
          </h3>
          {agentRuns.length === 0 ? (
            <p style={{ color: '#9e9a97', fontSize: '0.85rem' }}>No agent runs yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
              {agentRuns.map((run, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.45)',
                }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: STATUS_COLORS[run.status] || '#9e9a97',
                    flexShrink: 0,
                    boxShadow: run.status === 'running' ? `0 0 6px ${STATUS_COLORS.running}` : 'none',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.task_title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9e9a97' }}>
                      {run.status} &middot; {durationStr(run.started_at, run.completed_at)} &middot; {timeAgo(run.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rate Limit Events */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
            <ShieldAlert size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Rate Limit Events
          </h3>
          {rateLimits.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6aab6e', fontSize: '0.85rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6aab6e' }} />
              No rate limit events — system is healthy
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
              {rateLimits.map((evt, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.45)',
                }}>
                  <ShieldAlert size={14} style={{ color: '#c0392b', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(evt.identifier || '').length > 24 ? evt.identifier.slice(0, 24) + '...' : evt.identifier}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9e9a97' }}>
                      {evt.endpoint} &middot; {timeAgo(evt.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Budget Tracker */}
      <div className="glass-panel" style={panelStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
          <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Monthly Budget Tracker
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            height: '28px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${Math.min(budgetPct, 100)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${budgetColor} 0%, ${budgetColor}cc 100%)`,
              borderRadius: '8px',
              transition: 'width 0.6s ease',
            }} />
            <span style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: budgetPct > 50 ? '#fff' : '#2e2c2a',
              mixBlendMode: budgetPct > 50 ? 'normal' : 'normal',
            }}>
              {fmt(budgetPct, 1)}%
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2e2c2a' }}>
            {fmtCost(mtdCost)} of {fmtCost(BUDGET)} budget used ({fmt(budgetPct, 1)}%)
          </span>
          <span style={{ fontSize: '0.8rem', color: '#6b6764' }}>
            Projected month-end: <strong style={{ color: projected > BUDGET ? '#c0392b' : '#2e2c2a' }}>{fmtCost(projected)}</strong>
            <span style={{ color: '#9e9a97', marginLeft: '8px' }}>
              ({fmt(dailyAvg, 2)}/day avg &times; {daysInMonth} days)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Efficiency;
