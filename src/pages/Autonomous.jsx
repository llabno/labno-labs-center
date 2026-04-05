import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Cpu, Clock, ChevronRight, ChevronDown, AlertCircle, CheckCircle, Loader, Zap, ExternalLink } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AGENT_DEFS = [
  { name: 'Claude Code', desc: 'SOP indexing, code commits, test generation', routes: ['local', 'api'] },
  { name: 'Sniper Agent', desc: 'Clinical blog generation, HIPAA stripping', routes: ['api'] },
  { name: 'Data Quality', desc: 'CRM hygiene checks, dedup, HIPAA compliance', routes: ['cron'] },
  { name: 'Reactivation', desc: 'Inactive patient scoring, outreach queue', routes: ['cron', 'manual'] },
  { name: 'Backup', desc: 'Weekly database export for disaster recovery', routes: ['cron'] },
  { name: 'Telemetry', desc: 'PostHog geo aggregation into Supabase', routes: ['cron'] },
];

const MOSO_AGENTS = [
  { name: 'The Chief', desc: 'Morning briefings, calendar defense, comms', platform: 'Gemini', color: '#bd93f9' },
  { name: 'The Coach', desc: 'Weekly Pulse, Pattern Alerts, energy tracking', platform: 'Gemini', color: '#ff79c6' },
  { name: 'The Architect', desc: 'Consulting strategy, client audits', platform: 'Gemini', color: '#ffb86c' },
];

const ROUTE_LABELS = {
  local: { label: 'Local CLI (Pro)', color: '#50fa7b', desc: 'Free — uses Claude Pro subscription' },
  api: { label: 'Vercel API', color: '#f1fa8c', desc: 'Paid — uses ANTHROPIC_API_KEY' },
  simulation: { label: 'Simulation', color: '#6272a4', desc: 'No AGENT_ROUTE env var set — runs are simulated' },
};

const STATUS_COLORS = {
  queued: '#f1fa8c',
  running: '#8be9fd',
  completed: '#50fa7b',
  failed: '#ff5555',
};

const Autonomous = () => {
  const [agentRuns, setAgentRuns] = useState([]);
  const [mosoSyncs, setMosoSyncs] = useState([]);
  const [routeMode, setRouteMode] = useState('simulation');
  const [timeRange, setTimeRange] = useState('week');
  const [expandedRun, setExpandedRun] = useState(null);

  useEffect(() => {
    const fetchRuns = async () => {
      const { data } = await supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) {
        setAgentRuns(data);
        const latestCompleted = data.find(r => r.result && r.status === 'completed');
        if (latestCompleted?.result) {
          const routeMatch = latestCompleted.result.match(/\[Route: (\w+)\]/);
          if (routeMatch) setRouteMode(routeMatch[1]);
        }
      }
    };
    const fetchMosoSyncs = async () => {
      const { data } = await supabase.from('moso_sync_log').select('*').order('synced_at', { ascending: false }).limit(10);
      if (data) setMosoSyncs(data);
    };
    fetchRuns();
    fetchMosoSyncs();
    const interval = setInterval(() => { fetchRuns(); fetchMosoSyncs(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRuns = useMemo(() => {
    const now = new Date();
    return agentRuns.filter(r => {
      const d = new Date(r.created_at);
      if (timeRange === 'today') return d.toDateString() === now.toDateString();
      if (timeRange === 'week') { const ago = new Date(now); ago.setDate(ago.getDate() - 7); return d >= ago; }
      if (timeRange === 'month') { const ago = new Date(now); ago.setMonth(ago.getMonth() - 1); return d >= ago; }
      return true;
    });
  }, [agentRuns, timeRange]);

  const stats = useMemo(() => {
    const s = { queued: 0, running: 0, completed: 0, failed: 0, total: filteredRuns.length };
    filteredRuns.forEach(r => { if (s[r.status] !== undefined) s[r.status]++; });
    return s;
  }, [filteredRuns]);

  const deriveAgentStatus = (agentDef) => {
    const keywords = agentDef.name.toLowerCase().split(' ');
    const related = agentRuns.filter(r => {
      const title = (r.task_title || '').toLowerCase();
      return keywords.some(k => title.includes(k));
    });
    const running = related.find(r => r.status === 'running' || r.status === 'queued');
    const lastCompleted = related.find(r => r.status === 'completed');
    const tasks = related.length;
    if (running) return { status: 'running', color: '#8be9fd', label: 'Running', tasks };
    if (lastCompleted) {
      const hoursAgo = (Date.now() - new Date(lastCompleted.created_at).getTime()) / 3600000;
      if (hoursAgo < 1) return { status: 'recent', color: '#50fa7b', label: 'Active', tasks };
      if (hoursAgo < 24) return { status: 'idle', color: '#f1fa8c', label: 'Idle', tasks };
    }
    return { status: 'stopped', color: '#6272a4', label: tasks > 0 ? 'Idle' : 'No Runs', tasks };
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const hasRuns = agentRuns.length > 0;

  return (
    <div className="main-content" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #12121e 0%, #1a1a2e 100%)', borderRadius: '20px', color: '#e0dfe6' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8e6f0', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Activity size={22} color="#8be9fd" /> Autonomous Systems <InfoTooltip text={PAGE_INFO.autonomous} color="#e8e6f0" />
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#6272a4', marginBottom: '1.5rem' }}>Real-time monitoring of background agents and automated pipelines.</p>

      {/* Nothing to see yet callout */}
      {!hasRuns && (
        <div style={{ padding: '24px', borderRadius: '14px', background: 'rgba(139,233,253,0.06)', border: '1px solid rgba(139,233,253,0.15)', marginBottom: '1.5rem', textAlign: 'center' }}>
          <AlertCircle size={28} color="#8be9fd" style={{ marginBottom: '8px' }} />
          <h3 style={{ fontSize: '1rem', color: '#e8e6f0', marginBottom: '8px' }}>No agents have run yet</h3>
          <p style={{ fontSize: '0.82rem', color: '#8a88a0', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto 12px' }}>
            To dispatch agents, go to <strong style={{ color: '#8be9fd' }}>Quick Pick</strong> and click "Run" or "Send to Agent" on any task.
            The agent will be queued, processed, and results will appear here.
          </p>
          <p style={{ fontSize: '0.72rem', color: '#6272a4', lineHeight: 1.5, maxWidth: '500px', margin: '0 auto 16px' }}>
            <strong>What needs to happen:</strong> 1) Tasks must exist in <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>global_tasks</code> table.
            2) Click "Run" in Quick Pick or SmartScheduler. 3) This calls <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>/api/agent/run</code> which queues the task.
            4) The processor at <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>/api/agent/process</code> picks it up.
            5) Set <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>AGENT_ROUTE=api</code> in Vercel env vars for real execution.
          </p>
          <Link to="/quickpick" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', background: 'rgba(139,233,253,0.15)', color: '#8be9fd', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
            <Zap size={14} /> Go to Quick Pick <ExternalLink size={12} />
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left column: Run History (replaces terminal animation) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>

          {/* Time Range + Stats */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All Time' },
            ].map(t => (
              <button key={t.key} onClick={() => setTimeRange(t.key)}
                style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: timeRange === t.key ? 'rgba(139,233,253,0.2)' : 'rgba(255,255,255,0.04)', color: timeRange === t.key ? '#8be9fd' : '#6272a4' }}>
                {t.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <span key={key} style={{ color, fontWeight: 600 }}>{stats[key]} {key}</span>
              ))}
            </div>
          </div>

          {/* Run History List */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '1.25rem',
            flex: 1,
            overflowY: 'auto',
            maxHeight: '600px',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c0bdd0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#8be9fd" /> Run History ({filteredRuns.length})
            </h3>

            {filteredRuns.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6272a4' }}>
                <Clock size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>No runs in this time period.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredRuns.map(run => {
                  const isExpanded = expandedRun === run.id;
                  const statusColor = STATUS_COLORS[run.status] || '#6272a4';
                  return (
                    <div key={run.id} style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${isExpanded ? statusColor + '33' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.2s' }}>
                      <div
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                      >
                        {isExpanded ? <ChevronDown size={14} color="#6272a4" /> : <ChevronRight size={14} color="#6272a4" />}
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: run.status === 'running' ? `0 0 8px ${statusColor}66` : 'none', animation: run.status === 'running' ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
                        <span style={{ fontSize: '0.72rem', color: '#6272a4', fontFamily: 'monospace', minWidth: '90px', flexShrink: 0 }}>
                          {formatTime(run.created_at)}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#d0cfe0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {run.task_title}
                        </span>
                        {run.project_name && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#8a88a0' }}>{run.project_name}</span>
                        )}
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: `${statusColor}18`, color: statusColor, textTransform: 'uppercase' }}>
                          {run.status}
                        </span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px 0' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#6272a4', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Timeline</div>
                              <div style={{ fontSize: '0.75rem', color: '#8a88a0', lineHeight: 1.6 }}>
                                <div>Created: {formatTime(run.created_at)}</div>
                                {run.started_at && <div>Started: {formatTime(run.started_at)}</div>}
                                {run.completed_at && <div>Completed: {formatTime(run.completed_at)}</div>}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#6272a4', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Details</div>
                              <div style={{ fontSize: '0.75rem', color: '#8a88a0', lineHeight: 1.6 }}>
                                {run.project_name && <div>Project: {run.project_name}</div>}
                                <div>Status: <span style={{ color: statusColor }}>{run.status}</span></div>
                                {run.error && <div style={{ color: '#ff5555' }}>Error: {run.error}</div>}
                              </div>
                            </div>
                          </div>
                          {run.result && (
                            <div style={{ marginTop: '6px' }}>
                              <div style={{ fontSize: '0.68rem', color: '#6272a4', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Result</div>
                              <pre style={{ fontSize: '0.72rem', color: '#c0bdd0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0, lineHeight: 1.5, maxHeight: '200px', overflow: 'auto', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)' }}>
                                {run.result}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Agents sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c0bdd0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#8be9fd" /> Active Agents
          </h3>

          {AGENT_DEFS.map((agentDef, i) => {
            const live = deriveAgentStatus(agentDef);
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '1rem',
                borderLeft: `3px solid ${live.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: live.color, boxShadow: `0 0 8px ${live.color}66`, animation: live.status === 'running' ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8e6f0' }}>{agentDef.name}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#7a789a', marginBottom: '8px', lineHeight: 1.3 }}>{agentDef.desc}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: `${live.color}18`, color: live.color, textTransform: 'uppercase' }}>{live.label}</span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#8a88a0' }}>{live.tasks} runs</span>
                </div>
              </div>
            );
          })}

          {/* Routing Mode */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${(ROUTE_LABELS[routeMode] || ROUTE_LABELS.simulation).color}33`, borderRadius: '14px', padding: '1rem', borderLeft: `3px solid ${(ROUTE_LABELS[routeMode] || ROUTE_LABELS.simulation).color}` }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6272a4', marginBottom: '6px', fontWeight: 600 }}>Agent Routing</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: (ROUTE_LABELS[routeMode] || ROUTE_LABELS.simulation).color }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: (ROUTE_LABELS[routeMode] || ROUTE_LABELS.simulation).color }}>
                {(ROUTE_LABELS[routeMode] || { label: routeMode }).label}
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: '#7a789a', margin: 0, lineHeight: 1.4 }}>
              {(ROUTE_LABELS[routeMode] || ROUTE_LABELS.simulation).desc}
            </p>
          </div>

          {/* MOSO Agents */}
          <div>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c0bdd0', marginBottom: '6px' }}>MOSO Agents</h3>
            {MOSO_AGENTS.map((agent, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '8px 10px', marginBottom: '4px', borderLeft: `3px solid ${agent.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e8e6f0' }}>{agent.name}</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', background: `${agent.color}18`, color: agent.color, textTransform: 'uppercase' }}>{agent.platform}</span>
                </div>
                <p style={{ fontSize: '0.68rem', color: '#7a789a', margin: '2px 0 0', lineHeight: 1.3 }}>{agent.desc}</p>
              </div>
            ))}
          </div>

          {/* System summary */}
          <div style={{ background: 'rgba(139,233,253,0.04)', border: '1px solid rgba(139,233,253,0.12)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6272a4', marginBottom: '8px', fontWeight: 600 }}>System Status</div>
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '3px' }}>
                <span style={{ color: '#8a88a0', textTransform: 'capitalize' }}>{key}</span>
                <span style={{ color, fontWeight: 600 }}>{stats[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Autonomous;
