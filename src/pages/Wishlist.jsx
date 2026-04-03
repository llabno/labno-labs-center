import { useState, useEffect } from 'react';
import { Sparkles, Plus, Send, Tag, Folder, Zap, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Trash2, Filter, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TYPE_OPTIONS = ['Tool Stack', 'Website', 'Content', 'Research', 'System Improvement', 'Automation', 'Clinical', 'Business Dev', 'Agent / AI', 'Personal'];
const STATUS_OPTIONS = ['New Idea', 'Already Exists', 'In Progress', 'Improved', 'Deferred', 'Completed'];
const PRIORITY_OPTIONS = ['P0 — Ship Blocker', 'P1 — Core System', 'P2 — Growth Layer', 'P3 — Nice to Have'];

const TYPE_COLORS = {
  'Tool Stack': { bg: '#e3f2fd', color: '#1565c0' },
  'Website': { bg: '#e8f5e9', color: '#2e7d32' },
  'Content': { bg: '#fff3e0', color: '#e65100' },
  'Research': { bg: '#f3e5f5', color: '#7b1fa2' },
  'System Improvement': { bg: '#e0f2f1', color: '#00695c' },
  'Automation': { bg: '#fce4ec', color: '#ad1457' },
  'Clinical': { bg: '#e8eaf6', color: '#283593' },
  'Business Dev': { bg: '#fff8e1', color: '#f57f17' },
  'Agent / AI': { bg: '#efebe9', color: '#4e342e' },
  'Personal': { bg: '#f5f5f5', color: '#616161' },
};

const STATUS_ICONS = {
  'New Idea': <Lightbulb size={13} />,
  'Already Exists': <CheckCircle size={13} />,
  'In Progress': <Clock size={13} />,
  'Improved': <Zap size={13} />,
  'Deferred': <AlertCircle size={13} />,
  'Completed': <CheckCircle size={13} />,
};

const PRIORITY_COLORS = {
  'P0 — Ship Blocker': '#d32f2f',
  'P1 — Core System': '#e65100',
  'P2 — Growth Layer': '#1565c0',
  'P3 — Nice to Have': '#757575',
};

// Simple AI-like analysis that maps raw text to metadata
const analyzeWishlistItem = (text) => {
  const t = text.toLowerCase();
  let type = 'System Improvement';
  let project = 'General';
  let priority = 'P2 — Growth Layer';
  let integration = '';
  let relatedWorkflows = [];

  // Type detection
  if (t.includes('mcp') || t.includes('tool stack') || t.includes('loom') || t.includes('wispr') || t.includes('pandadoc')) {
    type = 'Tool Stack';
    project = 'Infrastructure & DevOps';
    integration = 'Maps to MCP stack standardization (CASE-005)';
    relatedWorkflows.push('MCP Stack Canonical Config');
  }
  if (t.includes('website') || t.includes('wordpress') || t.includes('avada') || t.includes('movement-solutions.com') || t.includes('google sites')) {
    type = 'Website';
    project = 'Movement Solutions';
    priority = 'P1 — Core System';
    integration = 'Website Builder workflow exists in library (10 Vite+Tailwind sites)';
    relatedWorkflows.push('Website Builder: Multi-Brand Site Generator');
  }
  if (t.includes('blog') || t.includes('sniper') || t.includes('content') || t.includes('article')) {
    type = 'Content';
    project = 'Movement Solutions';
    integration = 'The Sniper agent handles content generation and improvement';
    relatedWorkflows.push('Content Repurposing Pipeline');
  }
  if (t.includes('research') || t.includes('dossier') || t.includes('biography') || t.includes('deep dive') || t.includes('history')) {
    type = 'Research';
    project = 'Personal / Brand';
    integration = 'Oracle knowledge base can store and retrieve research outputs';
  }
  if (t.includes('clinical') || t.includes('exercise') || t.includes('patient') || t.includes('ns state') || t.includes('polyvagal')) {
    type = 'Clinical';
    project = 'Clinical Brain';
    priority = 'P1 — Core System';
    relatedWorkflows.push('Clinical Brain Agent System');
  }
  if (t.includes('automat') || t.includes('kylie') || t.includes('agent') || t.includes('workflow')) {
    type = 'Automation';
    project = 'Labno Labs';
    relatedWorkflows.push('MOSO Overseer Automation Pipeline');
  }
  if (t.includes('lead') || t.includes('client') || t.includes('referral') || t.includes('crm') || t.includes('sales')) {
    type = 'Business Dev';
    project = 'Labno Labs';
    relatedWorkflows.push('Lead Generation Pipeline');
  }
  if (t.includes('oracle') || t.includes('claude') || t.includes('gpt') || t.includes('gemini') || t.includes('ai') || t.includes('prompt')) {
    type = 'Agent / AI';
    project = 'Labno Labs';
    relatedWorkflows.push('Multi-Agent Clinical Brain System');
  }

  return { type, project, priority, integration, relatedWorkflows };
};

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const processInput = async () => {
    if (!inputText.trim()) return;
    setProcessing(true);

    // Split by newlines or periods followed by capital letters to detect multiple items
    const rawItems = inputText
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    // If only one chunk, treat the whole thing as one item
    const chunks = rawItems.length > 1 ? rawItems : [inputText.trim()];

    for (const chunk of chunks) {
      const analysis = analyzeWishlistItem(chunk);
      await supabase.from('wishlist').insert({
        raw_text: chunk,
        type: analysis.type,
        project: analysis.project,
        priority: analysis.priority,
        status: 'New Idea',
        integration_notes: analysis.integration,
        related_workflows: analysis.relatedWorkflows.join(', '),
        analyzed: true,
      });
    }

    setInputText('');
    setProcessing(false);
    await fetchItems();
  };

  const updateItem = async (id, field, value) => {
    await supabase.from('wishlist').update({ [field]: value }).eq('id', id);
    await fetchItems();
  };

  const deleteItem = async (id) => {
    await supabase.from('wishlist').delete().eq('id', id);
    await fetchItems();
  };

  const filtered = items.filter(item => {
    if (filterType !== 'All' && item.type !== filterType) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    return true;
  });

  const typeCounts = {};
  items.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });

  if (loading) return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8682' }}>Loading wishlist...</div>
  );

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={24} color="#c49a40" /> Wishlist — Idea Intake
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.9rem', marginTop: '4px' }}>
          Dump ideas freely. They get analyzed, tagged, and mapped to projects and workflows automatically.
        </p>
      </div>

      {/* Input Area */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add to Wishlist
        </h3>
        <p style={{ color: '#8a8682', fontSize: '0.8rem', marginBottom: '12px' }}>
          Type or paste freely — one idea per line, or dump everything at once. Each item gets analyzed and sorted.
        </p>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={"What do you want to build, fix, research, or improve?\n\nExamples:\n- I want to update the Movement Solutions website\n- Research the ideal MCP tool stack including Loom and PandaDoc\n- Build an automated referral physician report generator\n- Create a deep dive dossier on Lance Labno's background"}
          style={{
            width: '100%', minHeight: '140px', padding: '14px', borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit',
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) processInput(); }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9e9a97' }}>
            {inputText.split('\n').filter(l => l.trim().length > 10).length} item(s) detected — Cmd+Enter to submit
          </span>
          <button
            onClick={processInput}
            disabled={processing || !inputText.trim()}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', opacity: processing ? 0.6 : 1 }}
          >
            <Send size={14} /> {processing ? 'Analyzing...' : 'Analyze & Sort'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
          const style = TYPE_COLORS[type] || { bg: '#f5f5f5', color: '#666' };
          return (
            <div key={type} onClick={() => setFilterType(filterType === type ? 'All' : type)}
              style={{ padding: '6px 12px', borderRadius: '8px', background: filterType === type ? style.color : style.bg, color: filterType === type ? '#fff' : style.color, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
              {type} ({count})
            </div>
          );
        })}
        {filterType !== 'All' && (
          <div onClick={() => setFilterType('All')} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.05)', color: '#666', fontSize: '0.75rem', cursor: 'pointer' }}>
            Clear filter
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Filter size={14} color="#9e9a97" />
        {['All', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, background: filterStatus === s ? '#b06050' : 'rgba(0,0,0,0.04)', color: filterStatus === s ? '#fff' : '#6b6764', transition: 'all 0.2s' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''} {filterType !== 'All' ? `in ${filterType}` : ''} {filterStatus !== 'All' ? `— ${filterStatus}` : ''}
        </h3>

        {filtered.length === 0 ? (
          <p style={{ color: '#9e9a97', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
            No wishlist items yet. Add some ideas above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(item => {
              const typeStyle = TYPE_COLORS[item.type] || { bg: '#f5f5f5', color: '#666' };
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} style={{
                  background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '10px', borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] || '#999'}`,
                  transition: 'all 0.2s',
                }}>
                  {/* Header row */}
                  <div onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer' }}>
                    <span style={{ color: isExpanded ? '#b06050' : '#9e9a97', fontSize: '0.6rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: typeStyle.bg, color: typeStyle.color, fontSize: '0.68rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {item.type}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.88rem', color: '#2e2c2a', fontWeight: 500, lineHeight: 1.4 }}>
                      {item.raw_text.length > 120 ? item.raw_text.slice(0, 120) + '...' : item.raw_text}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9e9a97', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px 30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Full text */}
                      <p style={{ fontSize: '0.85rem', color: '#4a4744', lineHeight: 1.7, background: 'rgba(0,0,0,0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                        {item.raw_text}
                      </p>

                      {/* Metadata grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
                          <p style={{ fontSize: '0.82rem', color: '#2e2c2a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Folder size={13} color="#b06050" /> {item.project}
                          </p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
                          <select value={item.priority} onChange={(e) => updateItem(item.id, 'priority', e.target.value)}
                            className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem', color: PRIORITY_COLORS[item.priority] }}>
                            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                          <select value={item.status} onChange={(e) => updateItem(item.id, 'status', e.target.value)}
                            className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                          <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                            className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Integration notes */}
                      {item.integration_notes && (
                        <div style={{ background: 'rgba(124,152,133,0.08)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #7C9885' }}>
                          <label style={{ fontSize: '0.68rem', color: '#7C9885', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Integration</label>
                          <p style={{ fontSize: '0.8rem', color: '#4a4744', marginTop: '4px' }}>{item.integration_notes}</p>
                        </div>
                      )}

                      {/* Related workflows */}
                      {item.related_workflows && (
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related Workflows</label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {item.related_workflows.split(', ').filter(Boolean).map((w, i) => (
                              <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764', fontSize: '0.72rem' }}>
                                <Zap size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => deleteItem(item.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(209,64,64,0.2)', background: 'none', color: '#d14040', fontSize: '0.72rem', cursor: 'pointer' }}>
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
