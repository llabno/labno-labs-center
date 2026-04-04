import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Shield, FolderOpen, FileText, Zap, RefreshCw, ChevronDown, ChevronUp, Copy } from 'lucide-react';
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
    description: 'Move Supabase/Vercel/Anthropic keys to shell environment variables. Replace 15+ inline curl commands with Bash(curl:*) wildcard.',
  },
  {
    id: 'trim-dirs',
    title: 'Remove 8 redundant additional directories',
    impact: 'Save ~2,000 tokens/session + faster scanning',
    effort: '5 min',
    description: 'Keep: labno-labs-center, design-to-code-app, Workflow Capture. Remove: all temp copies, Google Drive mirrors, Downloads, .claude internal dirs.',
  },
  {
    id: 'move-gomarket',
    title: 'Move Go-To-Market Architecture.md out of workspace root',
    impact: 'Prevent 125K token spike',
    effort: '1 min',
    description: 'Move to docs/ or archive/ subdirectory so Claude doesn\'t accidentally read it during workspace scanning.',
  },
  {
    id: 'slim-claudemd',
    title: 'Move auto-capture rules from CLAUDE.md to skill',
    impact: 'Save ~800 tokens/message',
    effort: '10 min',
    description: 'The auto-capture instructions in CLAUDE.md are processed every turn. Move them into .claude/skills/capture.md where they\'re only loaded on /capture.',
  },
  {
    id: 'index-summary',
    title: 'Create lightweight _index_summary.json for library',
    impact: 'Save ~25,000 tokens on library lookups',
    effort: '10 min',
    description: 'Instead of loading all 58 YAML files, create a 2KB summary with just IDs and one-liners. Claude reads full YAML only for specific tasks.',
  },
  {
    id: 'rotate-keys',
    title: 'Rotate all exposed API keys',
    impact: 'Security fix',
    effort: '20 min',
    description: 'After cleaning settings.json, rotate: Supabase service role key, Supabase PAT, Anthropic API key, Vercel token. All were in plain text.',
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
          <Activity color="#d15a45" size={28} /> Resource Monitor
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.88rem', margin: '4px 0 0' }}>
          Claude Code token usage audit — reduce overhead to run Claude Max efficiently
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <SummaryCard label="Always-On Overhead" value={`${(alwaysLoaded / 1000).toFixed(1)}K`} sub="tokens/session" color="#d32f2f" />
        <SummaryCard label="Critical Issues" value={criticalCount} sub="need attention" color="#d32f2f" />
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

      {/* Resource Breakdown */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--accent)" /> Token Consumption by Source
        </h2>
        {resources.map((r, i) => <ResourceCard key={i} data={r} />)}
      </div>

      {/* Optimization Checklist */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} color="#2e7d32" /> Optimization Checklist
        </h2>
        <div style={{ display: 'grid', gap: '8px' }}>
          {OPTIMIZATION_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: done ? 'rgba(46, 125, 50, 0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  opacity: done ? 0.6 : 1,
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
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a', textDecoration: done ? 'line-through' : 'none' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b6764', marginTop: '2px' }}>{step.description}</div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#2e7d32', fontWeight: 600 }}>{step.impact}</span>
                    <span style={{ fontSize: '0.7rem', color: '#999' }}>~{step.effort}</span>
                  </div>
                </div>
              </div>
            );
          })}
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
