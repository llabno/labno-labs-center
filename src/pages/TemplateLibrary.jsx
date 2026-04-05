import { useState, useEffect, useRef } from 'react';
import { Library, Copy, Check, ChevronDown, ChevronRight, Search, Layers, Zap, Hand, Bot, Play, Plus, Edit2, Download, ExternalLink, FileText, MoreVertical, X, Printer, FileDown } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { watermarkFooterText } from '../components/Watermark';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

const STAGE_LABELS = ['Kickoff', 'Scope', 'Design', 'Build/Execute', 'Test', 'Deploy', 'Handoff', 'Close'];
const STAGE_COLORS = ['#1976d2', '#9c27b0', '#f06292', '#f44336', '#ff9800', '#4caf50', '#00bcd4', '#388e3c'];

const TRIGGER_META = {
  autonomous: { label: 'Auto', icon: Bot, color: '#2d8a4e' },
  'one-click': { label: '1-Click', icon: Zap, color: '#1565c0' },
  guided: { label: 'Guided', icon: Play, color: '#c49a40' },
  manual: { label: 'Manual', icon: Hand, color: '#8a8682' },
};

const TEMPLATE_SETS = [
  { id: 'website', label: 'Website Build', track: 'app', desc: 'Custom website from design to deployment', icon: '🌐' },
  { id: 'ai_audit', label: 'AI Audit', track: 'service', desc: 'Evaluate AI readiness and opportunities', icon: '🔍' },
  { id: 'clinical_app', label: 'Clinical App', track: 'app', desc: 'HIPAA-aware clinical application', icon: '🏥' },
  { id: 'crm_setup', label: 'CRM Setup', track: 'service', desc: 'CRM implementation and migration', icon: '📊' },
  { id: 'data_pipeline', label: 'Data Pipeline', track: 'app', desc: 'ETL pipeline from sources to warehouse', icon: '🔄' },
  { id: 'consulting', label: 'Consulting Engagement', track: 'service', desc: 'Full consulting lifecycle', icon: '💼' },
];

const TemplateLibrary = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [selectedSet, setSelectedSet] = useState(null);
  const [expandedStages, setExpandedStages] = useState(new Set([1]));
  const [cloning, setCloning] = useState(null);
  const [cloned, setCloned] = useState(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('pipeline_task_templates').select('*').order('stage', { ascending: true }).order('sort_order', { ascending: true });
      setTemplates(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = templates.filter(t => {
    if (selectedTrack !== 'all') {
      const tracks = Array.isArray(t.tracks) ? t.tracks : [];
      if (!tracks.includes(selectedTrack)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!(t.title || '').toLowerCase().includes(s) && !(t.description || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stageGroups = {};
  filtered.forEach(t => {
    if (!stageGroups[t.stage]) stageGroups[t.stage] = [];
    stageGroups[t.stage].push(t);
  });

  const toggleStage = (stage) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  };

  const cloneToProject = async (template, projectId) => {
    setCloning(template.id);
    const { error } = await supabase.from('global_tasks').insert({
      title: template.title,
      description: template.description,
      project_id: projectId,
      column_id: 'backlog',
      assigned_to: template.trigger_level === 'autonomous' ? 'Agent' : 'lance',
    });
    if (!error) {
      setCloned(prev => new Set(prev).add(template.id));
    }
    setCloning(null);
  };

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenuOpen]);

  const templateToMarkdown = (t) => {
    let md = `# ${t.title}\n\n`;
    if (t.description) md += `${t.description}\n\n`;
    md += `**Stage:** ${STAGE_LABELS[(t.stage || 1) - 1] || 'Unknown'}\n`;
    md += `**Trigger:** ${(TRIGGER_META[t.trigger_level] || TRIGGER_META.manual).label}\n`;
    if (t.tracks?.length) md += `**Tracks:** ${t.tracks.join(', ')}\n`;
    if (t.client_visible) md += `**Client-visible:** Yes\n`;
    if (t.checklist?.length) {
      md += `\n## Checklist\n`;
      t.checklist.forEach(item => { md += `- [ ] ${item}\n`; });
    }
    if (t.prompt_template) md += `\n## Prompt Template\n\n${t.prompt_template}\n`;
    if (t.deliverable) md += `\n## Deliverable\n\n${t.deliverable}\n`;
    md += watermarkFooterText();
    return md;
  };

  const copyToClipboard = async (template) => {
    const md = templateToMarkdown(template);
    await navigator.clipboard.writeText(md);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActionMenuOpen(null);
  };

  const downloadAsMd = (template) => {
    const md = templateToMarkdown(template);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(template.title || 'template').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActionMenuOpen(null);
  };

  const downloadAsPdf = (template) => {
    const md = templateToMarkdown(template);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:2rem;max-width:700px;margin:0 auto;color:#2e2c2a;line-height:1.6}h1{font-size:1.5rem;border-bottom:1px solid #ddd;padding-bottom:8px}h2{font-size:1.1rem;margin-top:1.5rem}code{background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:0.9em}pre{background:#f4f4f4;padding:1rem;border-radius:8px;overflow-x:auto}</style></head><body>${md.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- \[ \] (.+)$/gm, '<div style="margin:4px 0"><input type="checkbox" disabled> $1</div>').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
    setActionMenuOpen(null);
  };

  const createProjectFromTemplate = (template) => {
    const name = encodeURIComponent(template.title || 'template');
    window.location.href = `/studio?template=${name}`;
    setActionMenuOpen(null);
  };

  const exportAllTemplates = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-library-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleActionMenu = (e, templateId) => {
    e.stopPropagation();
    setActionMenuOpen(prev => prev === templateId ? null : templateId);
  };

  const renderActionMenu = (template) => {
    if (actionMenuOpen !== template.id) return null;
    const isCopied = copiedId === template.id;
    return (
      <div ref={actionMenuRef} style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 4,
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 200,
        padding: '4px 0', fontSize: '0.8rem',
      }}>
        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(template); }} style={actionItemStyle}>
          {isCopied ? <Check size={13} color="#2d8a4e" /> : <Copy size={13} />}
          <span>{isCopied ? 'Copied' : 'Copy to Clipboard'}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); downloadAsMd(template); }} style={actionItemStyle}>
          <FileText size={13} /> <span>Download as .md</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); downloadAsPdf(template); }} style={actionItemStyle}>
          <Printer size={13} /> <span>Download as PDF</span>
        </button>
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', margin: '4px 0' }} />
        <button onClick={(e) => { e.stopPropagation(); createProjectFromTemplate(template); }} style={{ ...actionItemStyle, color: '#b06050', fontWeight: 600 }}>
          <ExternalLink size={13} /> <span>Create Project from Template</span>
        </button>
      </div>
    );
  };

  const actionItemStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
    color: '#2e2c2a', fontSize: '0.8rem', textAlign: 'left',
    transition: 'background 0.1s',
  };

  const totalByTrack = {
    all: templates.length,
    app: templates.filter(t => (t.tracks || []).includes('app')).length,
    service: templates.filter(t => (t.tracks || []).includes('service')).length,
  };

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading templates...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Library size={24} /> Template Library <InfoTooltip text={PAGE_INFO.templates} />
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <p style={{ color: '#6b6764', fontSize: '0.88rem', flex: 1, margin: 0 }}>
            Browse, search, and clone pipeline task templates. {templates.length} templates across 8 stages.
          </p>
          <button
            onClick={exportAllTemplates}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a',
              whiteSpace: 'nowrap',
            }}
          >
            <FileDown size={14} /> Export All
          </button>
        </div>
      </div>

      {/* Template Set Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {TEMPLATE_SETS.map(ts => (
          <div
            key={ts.id}
            onClick={() => { setSelectedSet(selectedSet === ts.id ? null : ts.id); setSelectedTrack(ts.track); }}
            className="glass-panel"
            style={{
              padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease',
              background: selectedSet === ts.id ? 'rgba(176,96,80,0.06)' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${selectedSet === ts.id ? 'rgba(176,96,80,0.2)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{ts.icon}</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2e2c2a' }}>{ts.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '4px' }}>{ts.desc}</div>
            <div style={{ fontSize: '0.68rem', color: '#b06050', fontWeight: 500, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {ts.track === 'app' ? 'App Build' : 'Service Build'}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8682' }} />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.5)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ key: 'all', label: 'All' }, { key: 'app', label: 'App Build' }, { key: 'service', label: 'Service Build' }].map(f => (
            <button key={f.key} onClick={() => { setSelectedTrack(f.key); setSelectedSet(null); }} className={`filter-pill${selectedTrack === f.key ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {f.label}
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: selectedTrack === f.key ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.06)', padding: '0 5px', borderRadius: '8px' }}>{totalByTrack[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stage-by-Stage Template View */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        {STAGE_LABELS.map((label, i) => {
          const stage = i + 1;
          const tasks = stageGroups[stage] || [];
          const isExpanded = expandedStages.has(stage);
          return (
            <div key={stage} style={{ marginBottom: '4px' }}>
              <div
                onClick={() => toggleStage(stage)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderRadius: '8px', cursor: 'pointer',
                  background: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                {isExpanded ? <ChevronDown size={14} color="#6b6764" /> : <ChevronRight size={14} color="#6b6764" />}
                <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: STAGE_COLORS[i] + '18', color: STAGE_COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>{stage}</span>
                <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#2e2c2a', flex: 1 }}>{label}</span>
                <span style={{ fontSize: '0.72rem', color: '#8a8682', fontWeight: 500 }}>{tasks.length} template{tasks.length !== 1 ? 's' : ''}</span>
              </div>
              {isExpanded && tasks.length > 0 && (
                <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', marginBottom: '8px' }}>
                  {tasks.map(t => {
                    const trigger = TRIGGER_META[t.trigger_level] || TRIGGER_META.manual;
                    const TIcon = trigger.icon;
                    const isCloned = cloned.has(t.id);
                    return (
                      <div key={t.id} onClick={() => setPreviewTemplate(previewTemplate?.id === t.id ? null : t)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                        borderRadius: '8px', background: previewTemplate?.id === t.id ? 'rgba(176,96,80,0.04)' : 'rgba(255,255,255,0.5)',
                        border: previewTemplate?.id === t.id ? '1px solid rgba(176,96,80,0.15)' : '1px solid rgba(0,0,0,0.05)',
                        borderLeft: `3px solid ${STAGE_COLORS[i]}`, cursor: 'pointer', transition: 'all 0.15s ease',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '2px' }}>{t.description}</div>}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: trigger.color + '15', color: trigger.color, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                          <TIcon size={10} /> {trigger.label}
                        </span>
                        {(t.tracks || []).map(track => (
                          <span key={track} style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764', textTransform: 'capitalize' }}>{track}</span>
                        ))}
                        {t.client_visible && (
                          <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(45,138,78,0.08)', color: '#2d8a4e' }}>Client-visible</span>
                        )}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => toggleActionMenu(e, t.id)}
                            style={{
                              background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6,
                              cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center',
                              color: '#6b6764',
                            }}
                            title="Use Template"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {renderActionMenu(t)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template Preview Panel */}
      {previewTemplate && (
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative', borderLeft: `3px solid ${STAGE_COLORS[(previewTemplate.stage || 1) - 1]}` }}>
          <button
            onClick={() => setPreviewTemplate(null)}
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#8a8682', padding: 4 }}
          >
            <X size={16} />
          </button>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '4px' }}>{previewTemplate.title}</h3>
          {previewTemplate.description && (
            <p style={{ fontSize: '0.85rem', color: '#6b6764', marginBottom: '12px' }}>{previewTemplate.description}</p>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: STAGE_COLORS[(previewTemplate.stage || 1) - 1] + '15', color: STAGE_COLORS[(previewTemplate.stage || 1) - 1], fontWeight: 600 }}>
              Stage {previewTemplate.stage}: {STAGE_LABELS[(previewTemplate.stage || 1) - 1]}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: (TRIGGER_META[previewTemplate.trigger_level] || TRIGGER_META.manual).color + '15', color: (TRIGGER_META[previewTemplate.trigger_level] || TRIGGER_META.manual).color, fontWeight: 600 }}>
              {(TRIGGER_META[previewTemplate.trigger_level] || TRIGGER_META.manual).label}
            </span>
            {(previewTemplate.tracks || []).map(track => (
              <span key={track} style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.04)', color: '#6b6764', textTransform: 'capitalize' }}>{track}</span>
            ))}
            {previewTemplate.client_visible && (
              <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: 'rgba(45,138,78,0.08)', color: '#2d8a4e' }}>Client-visible</span>
            )}
          </div>
          {previewTemplate.checklist?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '6px' }}>Checklist</div>
              {previewTemplate.checklist.map((item, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: '#6b6764', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          )}
          {previewTemplate.prompt_template && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '6px' }}>Prompt Template</div>
              <pre style={{ fontSize: '0.75rem', color: '#6b6764', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid rgba(0,0,0,0.05)' }}>{previewTemplate.prompt_template}</pre>
            </div>
          )}
          {previewTemplate.deliverable && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '6px' }}>Deliverable</div>
              <p style={{ fontSize: '0.78rem', color: '#6b6764' }}>{previewTemplate.deliverable}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px' }}>
            <button onClick={() => copyToClipboard(previewTemplate)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#2e2c2a' }}>
              {copiedId === previewTemplate.id ? <Check size={12} color="#2d8a4e" /> : <Copy size={12} />}
              {copiedId === previewTemplate.id ? 'Copied' : 'Copy'}
            </button>
            <button onClick={() => downloadAsMd(previewTemplate)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#2e2c2a' }}>
              <FileText size={12} /> .md
            </button>
            <button onClick={() => downloadAsPdf(previewTemplate)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#2e2c2a' }}>
              <Printer size={12} /> PDF
            </button>
            <button onClick={() => createProjectFromTemplate(previewTemplate)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.06)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#b06050', marginLeft: 'auto' }}>
              <ExternalLink size={12} /> Create Project
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {Object.entries(TRIGGER_META).map(([key, meta]) => {
          const count = templates.filter(t => t.trigger_level === key).length;
          const Icon = meta.icon;
          return (
            <div key={key} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <Icon size={20} color={meta.color} style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: meta.color }}>{count}</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{meta.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateLibrary;
