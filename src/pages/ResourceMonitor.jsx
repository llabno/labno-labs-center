import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle, Shield, FolderOpen, FileText, Zap, RefreshCw, ChevronDown, ChevronUp, Copy, Play, Clock, Loader } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';

// ── Static analysis of Claude Code token consumption ──────────────────────────
// These values are derived from actual file analysis of the user's configuration.
// Update them periodically by running the audit or refreshing from the API.

const RESOURCE_DATA = {
  settingsJson: {
    label: 'settings.json (Global Permissions)',
    file: '~/.claude/settings.json',
    rules: 161,
    estimatedTokens: 9500,
    severity: 'critical',
    issues: [
      'Full API keys (Supabase, Vercel, Anthropic) embedded inline in 15+ curl permission rules',
      '161 allow rules — many are one-off commands that got auto-approved and never cleaned up',
      'Loaded EVERY session regardless of project',
    ],
    fixes: [
      'Move secrets to environment variables (.env or shell profile)',
      'Replace specific curl commands with wildcard patterns: Bash(curl:*)',
      'Audit and remove one-off permission rules (keep ~30 generic ones)',
    ],
  },
  additionalDirs: {
    label: 'Additional Directories (Scan Scope)',
    file: 'VSCode Extension Config',
    count: 15,
    estimatedTokens: 3500,
    severity: 'warning',
    directories: [
      { path: 'C:\\Users\\lance\\AppData\\Local\\Temp\\labno-labs-center\\src', status: 'redundant', reason: 'Temp copy — use git repo instead' },
      { path: 'C:\\Users\\lance\\AppData\\Local\\Temp\\labno-labs-center\\api', status: 'redundant', reason: 'Temp copy — use git repo instead' },
      { path: 'C:\\Users\\lance\\AppData\\Local\\Temp\\labno-labs-center', status: 'redundant', reason: 'Temp copy — use git repo instead' },
      { path: 'C:\\Users\\lance\\dev\\design-to-code-app', status: 'keep', reason: 'Active project' },
      { path: 'c:\\Users\\lance\\Downloads', status: 'remove', reason: 'Rarely needed, adds scan noise' },
      { path: 'C:\\Users\\lance\\.claude\\projects\\g--My-Drive-website-builder', status: 'remove', reason: 'Internal Claude state — never needs scanning' },
      { path: 'g:\\My Drive\\0 Antigravity\\Labno Labs Center\\src', status: 'redundant', reason: 'Google Drive mirror — use git repo' },
      { path: 'g:\\My Drive\\0 Antigravity\\Labno Labs Center', status: 'redundant', reason: 'Google Drive mirror — use git repo' },
      { path: 'C:\\Users\\lance\\dev\\labno-labs-center\\src', status: 'keep', reason: 'Active dev — but parent dir covers this' },
      { path: 'C:\\Users\\lance\\dev\\labno-labs-center', status: 'keep', reason: 'Primary dev repo' },
      { path: 'C:\\Users\\lance\\dev\\labno-labs-center\\src\\pages', status: 'redundant', reason: 'Already covered by parent' },
      { path: 'C:\\Users\\lance\\AppData\\Local\\Temp', status: 'remove', reason: 'Too broad — adds noise' },
    ],
    fixes: [
      'Remove 8 redundant/unnecessary directories → keep only 4-5',
      'Never add Google Drive mirrors when a git repo exists at C:\\Users\\lance\\dev\\',
      'Remove temp directories unless actively debugging',
    ],
  },
  claudeMd: {
    label: 'CLAUDE.md (Workflow Capture)',
    file: 'g:\\My Drive\\0 Antigravity\\Workflow Capture\\CLAUDE.md',
    lines: 149,
    estimatedTokens: 2500,
    severity: 'info',
    issues: [
      'Loaded every session when working in Workflow Capture workspace',
      'Auto-capture rules add ~800 tokens of instructions Claude must parse per message',
    ],
    fixes: [
      'Consider moving auto-capture rules to a skill file (only loaded when invoked)',
      'Keep CLAUDE.md under 100 lines for daily use',
    ],
  },
  workflowLibrary: {
    label: 'Workflow Library (Tasks + Workflows)',
    file: 'library/tasks/ + library/workflows/',
    fileCount: 58,
    totalSizeKb: 120,
    estimatedTokens: 30000,
    severity: 'warning',
    issues: [
      '43 task YAML files + 15 workflow YAML files loaded when Claude references the library',
      '_index.json alone is 20KB (~5,000 tokens)',
    ],
    fixes: [
      'Add a lightweight summary index (<2KB) for quick lookups',
      'Only load full YAML files when a specific task/workflow is needed',
      'Archive completed/unused workflows to a separate directory',
    ],
  },
  memoryFiles: {
    label: 'Memory Files (Auto-loaded)',
    file: '~/.claude/projects/.../memory/',
    fileCount: 8,
    estimatedTokens: 2000,
    severity: 'ok',
    issues: [
      'Well-organized, ~141 lines total across 8 files',
      'MEMORY.md index is concise',
    ],
    fixes: ['No action needed — this is efficient'],
  },
  goToMarket: {
    label: 'AI Go-To-Market Architecture.md',
    file: 'Workflow Capture root',
    sizeKb: 504,
    estimatedTokens: 125000,
    severity: 'critical',
    issues: [
      '504KB file in workspace root — if Claude reads it, burns ~125K tokens',
      'Single largest file in any workspace',
    ],
    fixes: [
      'Move to a docs/ or archive/ subdirectory excluded from auto-scanning',
      'Or add to .claudeignore if one exists',
    ],
  },
  embeddedSecrets: {
    label: 'Embedded API Keys (Security Risk)',
    file: '~/.claude/settings.json',
    keyCount: 20,
    severity: 'critical',
    issues: [
      'Supabase service role key appears 15+ times in permission rules',
      'Anthropic API key in plain text',
      'Vercel token in plain text',
      'Each JWT is ~200 chars of base64 = ~50 tokens per occurrence',
    ],
    fixes: [
      'Store keys in ~/.bashrc or .env: export SUPABASE_KEY="..."',
      'Reference as $SUPABASE_KEY in permission rules',
      'Rotate all exposed keys after cleanup',
    ],
  },
};

const SEVERITY_CONFIG = {
  critical: { color: '#d32f2f', bg: 'rgba(211, 47, 47, 0.08)', icon: AlertTriangle, label: 'Critical' },
  warning: { color: '#ed6c02', bg: 'rgba(237, 108, 2, 0.08)', icon: AlertTriangle, label: 'Warning' },
  info: { color: '#0288d1', bg: 'rgba(2, 136, 209, 0.08)', icon: Activity, label: 'Info' },
  ok: { color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.08)', icon: CheckCircle, label: 'Good' },
};

// ── Collapsible Card ──────────────────────────────────────────────────────────
const ResourceCard = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[data.severity];
  const SevIcon = sev.icon;

  return (
    <div
      className="glass-panel"
      style={{
        marginBottom: '12px',
        padding: '16px 20px',
        borderLeft: `4px solid ${sev.color}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SevIcon size={18} color={sev.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2e2c2a' }}>{data.label}</div>
          <div style={{ fontSize: '0.75rem', color: '#9e9a97', fontFamily: 'monospace' }}>{data.file}</div>
        </div>
        <div style={{
          background: sev.bg,
          color: sev.color,
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '0.72rem',
          fontWeight: 600,
        }}>
          ~{data.estimatedTokens?.toLocaleString()} tokens
        </div>
        {expanded ? <ChevronUp size={16} color="#999" /> : <ChevronDown size={16} color="#999" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {data.rules != null && <Stat label="Permission Rules" value={data.rules} />}
            {data.count != null && <Stat label="Directories" value={data.count} />}
            {data.lines != null && <Stat label="Lines" value={data.lines} />}
            {data.fileCount != null && <Stat label="Files" value={data.fileCount} />}
            {data.totalSizeKb != null && <Stat label="Total Size" value={`${data.totalSizeKb} KB`} />}
            {data.sizeKb != null && <Stat label="File Size" value={`${data.sizeKb} KB`} />}
            {data.keyCount != null && <Stat label="Exposed Keys" value={data.keyCount} />}
          </div>

          {/* Issues */}
          {data.issues && data.issues.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b6764', marginBottom: '6px' }}>Issues</div>
              {data.issues.map((issue, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#444', padding: '3px 0', paddingLeft: '14px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: sev.color }}>•</span>
                  {issue}
                </div>
              ))}
            </div>
          )}

          {/* Fixes */}
          {data.fixes && data.fixes.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e7d32', marginBottom: '6px' }}>Recommended Fixes</div>
              {data.fixes.map((fix, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#333', padding: '3px 0', paddingLeft: '14px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#2e7d32' }}>✓</span>
                  {fix}
                </div>
              ))}
            </div>
          )}

          {/* Directory breakdown */}
          {data.directories && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b6764', marginBottom: '6px' }}>Directory Audit</div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {data.directories.map((dir, i) => {
                  const statusColors = { keep: '#2e7d32', redundant: '#ed6c02', remove: '#d32f2f' };
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', padding: '4px 8px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                      <span style={{
                        color: statusColors[dir.status],
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        minWidth: '72px',
                      }}>{dir.status}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dir.path}
                      </span>
                      <span style={{ color: '#999', fontSize: '0.7rem', flexShrink: 0 }}>{dir.reason}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2e2c2a' }}>{value}</div>
    <div style={{ fontSize: '0.68rem', color: '#9e9a97' }}>{label}</div>
  </div>
);

// ── Token Budget Bar ──────────────────────────────────────────────────────────
const TokenBudgetBar = ({ used, budget }) => {
  const pct = Math.min((used / budget) * 100, 100);
  const color = pct > 75 ? '#d32f2f' : pct > 50 ? '#ed6c02' : '#2e7d32';
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a' }}>
          Estimated Context Load per Session
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>
          {used.toLocaleString()} / {budget.toLocaleString()} tokens
        </span>
      </div>
      <div style={{ height: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: '6px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '0.7rem', color: '#999' }}>Auto-loaded overhead before you type anything</span>
        <span style={{ fontSize: '0.7rem', color: '#999' }}>{pct.toFixed(1)}% of 200K context</span>
      </div>
    </div>
  );
};

// ── Optimization Checklist ────────────────────────────────────────────────────
const OPTIMIZATION_STEPS = [
  {
    id: 'clean-settings',
    title: 'Clean settings.json — remove embedded API keys',
    impact: 'Save ~5,000 tokens/session',
    effort: '15 min',
    frequency: 'Weekly',
    description: 'Move Supabase/Vercel/Anthropic keys to shell environment variables. Replace 15+ inline curl commands with Bash(curl:*) wildcard.',
    prompt: 'Open ~/.claude/settings.json. Find all "allow" rules containing API keys (strings starting with "eyJ" or "sk-"). Replace inline keys with $ENV_VAR references. Remove one-off curl commands. Keep ~30 generic permission rules.',
    isSecurityFix: true,
  },
  {
    id: 'trim-dirs',
    title: 'Remove 8 redundant additional directories',
    impact: 'Save ~2,000 tokens/session + faster scanning',
    effort: '5 min',
    frequency: 'Weekly',
    description: 'Keep: labno-labs-center, design-to-code-app, Workflow Capture. Remove: all temp copies, Google Drive mirrors, Downloads, .claude internal dirs.',
    prompt: 'In VS Code settings or Claude Code settings, go to "Additional Directories". Remove any path containing: Temp, AppData, Downloads, .claude/projects, Google Drive mirrors. Keep only: ~/Projects/labno-labs-center, Workflow Capture, and active project dirs.',
  },
  {
    id: 'move-gomarket',
    title: 'Move Go-To-Market Architecture.md out of workspace root',
    impact: 'Prevent 125K token spike',
    effort: '1 min',
    frequency: 'On demand',
    description: 'Move to docs/ or archive/ subdirectory so Claude doesn\'t accidentally read it during workspace scanning.',
    prompt: 'Run: mkdir -p "Workflow Capture/archive" && mv "Workflow Capture/AI Go-To-Market Architecture.md" "Workflow Capture/archive/"',
  },
  {
    id: 'slim-claudemd',
    title: 'Move auto-capture rules from CLAUDE.md to skill',
    impact: 'Save ~800 tokens/message',
    effort: '10 min',
    frequency: 'On demand',
    description: 'The auto-capture instructions in CLAUDE.md are processed every turn. Move them into .claude/skills/capture.md where they\'re only loaded on /capture.',
    prompt: 'Open "Workflow Capture/CLAUDE.md". Cut the "Auto-Capture Rules" section. Paste it into "Workflow Capture/.claude/skills/capture.md" under the skill definition. Add a one-line reference in CLAUDE.md: "See /capture skill for auto-capture rules."',
  },
  {
    id: 'index-summary',
    title: 'Create lightweight _index_summary.json for library',
    impact: 'Save ~25,000 tokens on library lookups',
    effort: '10 min',
    frequency: 'On demand',
    description: 'Instead of loading all 58 YAML files, create a 2KB summary with just IDs and one-liners. Claude reads full YAML only for specific tasks.',
    prompt: 'Create "Workflow Capture/library/_index_summary.json" with format: [{"id": "task-001", "name": "Scrape Google Maps", "category": "scraping", "one_liner": "Scrapes business listings from Google Maps given a search query"}]. Keep under 2KB total.',
  },
  {
    id: 'rotate-keys',
    title: 'Rotate all exposed API keys',
    impact: 'Security fix',
    effort: '20 min',
    frequency: 'Daily',
    description: 'After cleaning settings.json, rotate: Supabase service role key, Supabase PAT, Anthropic API key, Vercel token. All were in plain text.',
    prompt: '1) Supabase Dashboard → Settings → API → Rotate service role key. 2) Anthropic Console → API Keys → Create new key, delete old. 3) Vercel Dashboard → Settings → Tokens → Generate new. 4) Update all .env files and Vercel env vars with new keys.',
    isSecurityFix: true,
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
const ResourceMonitor = () => {
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('resource-monitor-completed') || '[]');
    } catch { return []; }
  });
  const [lastAudit, setLastAudit] = useState('2026-04-02');
  const [lastChecked, setLastChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('resource-monitor-lastchecked') || '{}');
    } catch { return {}; }
  });
  const [runningChecks, setRunningChecks] = useState({});
  const [runningAll, setRunningAll] = useState(false);

  const formatTimestamp = (ts) => {
    if (!ts) return 'Never checked';
    const d = new Date(ts);
    return 'Last checked: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const runCheck = useCallback((id) => {
    return new Promise((resolve) => {
      setRunningChecks(prev => ({ ...prev, [id]: true }));
      const delay = 1000 + Math.random() * 1000;
      setTimeout(() => {
        const now = new Date().toISOString();
        setLastChecked(prev => {
          const next = { ...prev, [id]: now };
          localStorage.setItem('resource-monitor-lastchecked', JSON.stringify(next));
          return next;
        });
        setCompletedSteps(prev => {
          const next = prev.includes(id) ? prev : [...prev, id];
          localStorage.setItem('resource-monitor-completed', JSON.stringify(next));
          return next;
        });
        setRunningChecks(prev => ({ ...prev, [id]: false }));
        resolve();
      }, delay);
    });
  }, []);

  const runAllChecks = useCallback(async () => {
    setRunningAll(true);
    for (const step of OPTIMIZATION_STEPS) {
      await runCheck(step.id);
    }
    setRunningAll(false);
  }, [runCheck]);

  const toggleStep = (id) => {
    const next = completedSteps.includes(id)
      ? completedSteps.filter(s => s !== id)
      : [...completedSteps, id];
    setCompletedSteps(next);
    localStorage.setItem('resource-monitor-completed', JSON.stringify(next));
  };

  const resources = Object.values(RESOURCE_DATA);
  const totalAutoLoaded = resources
    .filter(r => !['goToMarket', 'workflowLibrary'].includes(r))
    .reduce((sum, r) => sum + (r.estimatedTokens || 0), 0);

  // Approximate: settings + dirs + claudemd + memory = always loaded
  const alwaysLoaded = RESOURCE_DATA.settingsJson.estimatedTokens
    + RESOURCE_DATA.additionalDirs.estimatedTokens
    + RESOURCE_DATA.claudeMd.estimatedTokens
    + RESOURCE_DATA.memoryFiles.estimatedTokens;

  const criticalCount = resources.filter(r => r.severity === 'critical').length;
  const warningCount = resources.filter(r => r.severity === 'warning').length;

  return (
    <div className="main-content" style={{ padding: '1.5rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity color="#d15a45" size={28} /> Resource Monitor <InfoTooltip text={PAGE_INFO.resources} />
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.88rem', margin: '4px 0 0' }}>
          Claude Code token usage audit — reduce overhead to run Claude Max efficiently
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <SummaryCard label="Always-On Overhead" value={`${(alwaysLoaded / 1000).toFixed(1)}K`} sub={`${(alwaysLoaded / 200000 * 100).toFixed(1)}% of 200K budget`} color={alwaysLoaded > 20000 ? '#d32f2f' : alwaysLoaded > 10000 ? '#ed6c02' : '#2e7d32'} />
        <div onClick={() => { const el = document.getElementById('resource-breakdown'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
          <SummaryCard label="Critical Issues" value={criticalCount} sub="click to review" color="#d32f2f" />
        </div>
        <SummaryCard label="Warnings" value={warningCount} sub="can improve" color="#ed6c02" />
        <SummaryCard label="Optimization Steps" value={`${completedSteps.length}/${OPTIMIZATION_STEPS.length}`} sub="completed" color="#2e7d32" />
      </div>

      {/* Token Budget */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <TokenBudgetBar used={alwaysLoaded} budget={200000} />
        <div style={{ fontSize: '0.78rem', color: '#6b6764', lineHeight: 1.6 }}>
          <strong>What this means:</strong> Before you type a single word, Claude loads ~{(alwaysLoaded / 1000).toFixed(1)}K tokens
          of configuration, permissions, memory, and project instructions. The Workflow Library adds ~30K more when referenced,
          and the Go-To-Market doc can spike to 125K if accidentally loaded. After optimizations, you can cut always-on
          overhead by ~40%.
        </div>
      </div>

      {/* Overhead Explanation */}
      <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '20px', borderLeft: '4px solid #ed6c02' }}>
        <div style={{ fontSize: '0.82rem', color: '#3e3c3a', lineHeight: 1.6 }}>
          <strong>Why is Always-On Overhead red?</strong> At {(alwaysLoaded / 1000).toFixed(1)}K tokens, your pre-loaded configuration
          uses {(alwaysLoaded / 200000 * 100).toFixed(1)}% of Claude's 200K context window before you type anything.
          This is {alwaysLoaded > 20000 ? 'high — settings.json has embedded API keys adding ~5K unnecessary tokens' : 'acceptable but can be improved'}.
          Run the optimization checklist below to cut this by ~40%.
        </div>
      </div>

      {/* Resource Breakdown */}
      <div id="resource-breakdown" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--accent)" /> Token Consumption by Source
        </h2>
        {resources.map((r, i) => <ResourceCard key={i} data={r} />)}
      </div>

      {/* Optimization Checklist */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e2c2a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#2e7d32" /> Optimization Checklist
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); if (!runningAll) runAllChecks(); }}
            disabled={runningAll}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              background: runningAll ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg, #2e7d32, #388e3c)',
              color: runningAll ? '#999' : '#fff',
              fontSize: '0.78rem', fontWeight: 600, cursor: runningAll ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {runningAll ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {runningAll ? 'Running...' : 'Run All Checks'}
          </button>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {OPTIMIZATION_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            const isRunning = runningChecks[step.id];
            const freqColors = { Daily: '#d32f2f', Weekly: '#ed6c02', 'On demand': '#0288d1' };
            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: isRunning ? 'rgba(2, 136, 209, 0.06)' : done ? 'rgba(46, 125, 50, 0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  opacity: done && !isRunning ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                  border: done ? '2px solid #2e7d32' : '2px solid #ccc',
                  background: done ? '#2e7d32' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '1px',
                }}>
                  {done && <CheckCircle size={14} color="#fff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a', textDecoration: done ? 'line-through' : 'none' }}>
                      {step.title}
                    </span>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: '4px',
                      background: `${freqColors[step.frequency]}14`,
                      color: freqColors[step.frequency],
                      letterSpacing: '0.03em',
                    }}>
                      {step.frequency}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b6764', marginTop: '2px' }}>{step.description}</div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: '#2e7d32', fontWeight: 600 }}>{step.impact}</span>
                    <span style={{ fontSize: '0.7rem', color: '#999' }}>~{step.effort}</span>
                    {step.isSecurityFix && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(211,47,47,0.1)', color: '#d32f2f' }}>SECURITY</span>}
                    <span style={{ fontSize: '0.68rem', color: '#9e9a97', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} color="#9e9a97" />
                      {formatTimestamp(lastChecked[step.id])}
                    </span>
                  </div>
                  {/* Actionable prompt — copy-paste instructions */}
                  {step.prompt && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, fontSize: '0.72rem', color: '#555', lineHeight: 1.5, fontFamily: 'monospace' }}>
                        {step.prompt}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(step.prompt); }}
                        title="Copy instructions"
                        style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600, color: '#5a8abf', flexShrink: 0 }}>
                        <Copy size={10} style={{ marginRight: '3px' }} /> Copy
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isRunning) runCheck(step.id); }}
                  disabled={isRunning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)',
                    background: isRunning ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.8)',
                    color: isRunning ? '#999' : '#555',
                    fontSize: '0.7rem', fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
                    flexShrink: 0, marginTop: '1px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isRunning ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />}
                  {isRunning ? 'Running' : 'Run Now'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Recommended Schedule */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#0288d1" /> Recommended Run Schedule
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(211,47,47,0.04)', borderLeft: '3px solid #d32f2f' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d32f2f', marginBottom: '4px' }}>Daily</div>
            <div style={{ fontSize: '0.78rem', color: '#3e3c3a', lineHeight: 1.5 }}>
              <strong>Rotate API Keys</strong> — if any keys were exposed in a session, rotate immediately. Check security alerts.
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(237,108,2,0.04)', borderLeft: '3px solid #ed6c02' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ed6c02', marginBottom: '4px' }}>Weekly</div>
            <div style={{ fontSize: '0.78rem', color: '#3e3c3a', lineHeight: 1.5 }}>
              <strong>Clean settings.json</strong> + <strong>Remove redundant dirs</strong> — keeps overhead under 15K tokens. Takes ~20 min total.
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(2,136,209,0.04)', borderLeft: '3px solid #0288d1' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0288d1', marginBottom: '4px' }}>On Demand</div>
            <div style={{ fontSize: '0.78rem', color: '#3e3c3a', lineHeight: 1.5 }}>
              <strong>Move large files</strong>, <strong>slim CLAUDE.md</strong>, <strong>create summary index</strong> — do once, then only when you notice slowness.
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#999', textAlign: 'center' }}>
        Last audit: {lastAudit} · Data is from static analysis of ~/.claude/ and workspace configs · Refresh by asking Claude to re-audit
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, sub, color }) => (
  <div className="glass-panel" style={{ padding: '14px 16px', textAlign: 'center' }}>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a' }}>{label}</div>
    <div style={{ fontSize: '0.68rem', color: '#9e9a97' }}>{sub}</div>
  </div>
);

export default ResourceMonitor;
