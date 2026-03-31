import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Cpu, Circle, ChevronRight } from 'lucide-react';

const MOCK_FEED = [
  { time: '14:32', msg: 'Claude indexed 3 SOPs from Notion workspace', status: 'success' },
  { time: '14:28', msg: 'Exercise Scraper found 12 new entries on PhysioPedia', status: 'success' },
  { time: '14:25', msg: 'Lead Gen enriched 8 contacts via Apollo API', status: 'warning' },
  { time: '14:20', msg: 'Claude committed fix for date-parsing edge case', status: 'success' },
  { time: '14:15', msg: 'Exercise Scraper rate-limited — backing off 60s', status: 'warning' },
  { time: '14:10', msg: 'Lead Gen pipeline paused — API quota reached', status: 'error' },
  { time: '14:05', msg: 'Claude generated test suite for Oracle module', status: 'success' },
  { time: '13:58', msg: 'Exercise Scraper exported CSV batch (42 rows)', status: 'success' },
  { time: '13:50', msg: 'System health check — all agents nominal', status: 'success' },
  { time: '13:42', msg: 'Claude refactored DualCRM filter logic', status: 'success' },
];

const TERMINAL_LINES = [
  { text: '$ claude --model opus-4 --task "index SOPs"', color: '#8be9fd' },
  { text: 'Connecting to workspace...', color: '#6272a4' },
  { text: 'Scanning 14 documents in /SOPs/clinical/', color: '#f8f8f2' },
  { text: 'Indexed: rehab-protocol-v3.md (2.4KB)', color: '#50fa7b' },
  { text: 'Indexed: intake-form-spec.md (1.1KB)', color: '#50fa7b' },
  { text: 'Indexed: discharge-checklist.md (890B)', color: '#50fa7b' },
  { text: 'Embedding vectors stored in Supabase pgvector', color: '#f8f8f2' },
  { text: '$ scraper run --source physiopedia --limit 20', color: '#8be9fd' },
  { text: 'PhysioPedia crawler initialized...', color: '#6272a4' },
  { text: 'Found 12 new exercise entries', color: '#f1fa8c' },
  { text: 'Parsing: Shoulder External Rotation (Band)', color: '#f8f8f2' },
  { text: 'Parsing: Hip Flexor Stretch (Kneeling)', color: '#f8f8f2' },
  { text: 'Export complete: /output/exercises_batch_047.csv', color: '#50fa7b' },
  { text: '$ leadgen status', color: '#8be9fd' },
  { text: 'Pipeline: PAUSED (API quota 98% consumed)', color: '#ff5555' },
  { text: 'Enriched today: 8 contacts | Remaining: 12', color: '#f8f8f2' },
  { text: 'Next reset: 2026-04-01T00:00:00Z', color: '#6272a4' },
  { text: '$ _', color: '#50fa7b' },
];

const AGENTS = [
  { name: 'Claude Code', desc: 'SOP indexing, code commits, test generation', status: 'running', color: '#50fa7b', statusLabel: 'Running', tasks: 47, uptime: '6h 12m' },
  { name: 'Exercise Scraper', desc: 'PhysioPedia, ExRx crawling and CSV export', status: 'idle', color: '#f1fa8c', statusLabel: 'Idle', tasks: 12, uptime: '2h 05m' },
  { name: 'Lead Gen Agent', desc: 'Apollo enrichment, outbound sequencing', status: 'stopped', color: '#ff5555', statusLabel: 'Stopped', tasks: 8, uptime: '0m' },
];

const Autonomous = () => {
  const [visibleLines, setVisibleLines] = useState(5);

  useEffect(() => {
    if (visibleLines < TERMINAL_LINES.length) {
      const timer = setTimeout(() => setVisibleLines(v => v + 1), 800);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  const statusDotColor = (status) => {
    if (status === 'success') return '#50fa7b';
    if (status === 'warning') return '#f1fa8c';
    return '#ff5555';
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #12121e 0%, #1a1a2e 100%)', borderRadius: '20px', color: '#e0dfe6' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8e6f0', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Terminal size={22} color="#8be9fd" /> Autonomous Systems
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#6272a4', marginBottom: '1.5rem' }}>Real-time monitoring of background agents and automated pipelines.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left column: feed + terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>

          {/* Agent Activity Feed */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.25rem',
            flex: '0 0 auto',
            maxHeight: '320px',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c0bdd0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#8be9fd" /> Agent Activity Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {MOCK_FEED.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusDotColor(entry.status), flexShrink: 0, boxShadow: `0 0 6px ${statusDotColor(entry.status)}44` }} />
                  <span style={{ fontSize: '0.75rem', color: '#6272a4', fontFamily: 'monospace', minWidth: '42px' }}>{entry.time}</span>
                  <span style={{ fontSize: '0.82rem', color: '#d0cfe0' }}>{entry.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* IDE Terminal View */}
          <div style={{
            background: '#0d0d1a',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '1.25rem',
            flex: 1,
            minHeight: '280px',
            overflowY: 'auto',
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: '0.8rem',
            lineHeight: 1.7,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5555' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f1fa8c' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#50fa7b' }} />
              <span style={{ fontSize: '0.72rem', color: '#6272a4', marginLeft: '8px' }}>labno-ops -- bash -- 120x40</span>
            </div>
            {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={i} style={{ color: line.color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line.text}
              </div>
            ))}
            {visibleLines < TERMINAL_LINES.length && (
              <span className="terminal-cursor" style={{ display: 'inline-block', width: '8px', height: '15px', background: '#50fa7b', animation: 'blink-cursor 1s step-end infinite', verticalAlign: 'text-bottom' }} />
            )}
            {visibleLines >= TERMINAL_LINES.length && (
              <span className="terminal-cursor" style={{ display: 'inline-block', width: '8px', height: '15px', background: '#50fa7b', animation: 'blink-cursor 1s step-end infinite', verticalAlign: 'text-bottom' }} />
            )}
          </div>
        </div>

        {/* Right column: Active Agents sidebar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c0bdd0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#8be9fd" /> Active Agents
          </h3>

          {AGENTS.map((agent, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '1.25rem',
              borderLeft: `3px solid ${agent.color}`,
              transition: 'all 0.25s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: agent.color,
                  boxShadow: `0 0 8px ${agent.color}66`,
                  animation: agent.status === 'running' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e8e6f0' }}>{agent.name}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#7a789a', marginBottom: '10px', lineHeight: 1.4 }}>{agent.desc}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  padding: '3px 8px', borderRadius: '10px',
                  background: `${agent.color}18`, color: agent.color,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {agent.statusLabel}
                </span>
                <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#8a88a0' }}>
                  {agent.tasks} tasks
                </span>
                <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#8a88a0' }}>
                  {agent.uptime}
                </span>
              </div>
            </div>
          ))}

          {/* System summary card */}
          <div style={{
            marginTop: 'auto',
            background: 'rgba(139,233,253,0.04)',
            border: '1px solid rgba(139,233,253,0.12)',
            borderRadius: '14px',
            padding: '1rem',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6272a4', marginBottom: '8px', fontWeight: 600 }}>System Status</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#8a88a0' }}>Agents Online</span>
              <span style={{ color: '#50fa7b', fontWeight: 600 }}>2 / 3</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '4px' }}>
              <span style={{ color: '#8a88a0' }}>Tasks Today</span>
              <span style={{ color: '#e8e6f0', fontWeight: 600 }}>67</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '4px' }}>
              <span style={{ color: '#8a88a0' }}>Errors</span>
              <span style={{ color: '#ff5555', fontWeight: 600 }}>1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Autonomous;
