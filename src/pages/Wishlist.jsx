import { useState, useEffect } from 'react';
import { Sparkles, Plus, Send, Folder, Zap, CheckCircle, Clock, AlertCircle, Trash2, Filter, Lightbulb, Link2, Rocket, ExternalLink, Terminal, Mic, MicOff } from 'lucide-react';
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

const PRIORITY_COLORS = {
  'P0 — Ship Blocker': '#d32f2f',
  'P1 — Core System': '#e65100',
  'P2 — Growth Layer': '#1565c0',
  'P3 — Nice to Have': '#757575',
};

const analyzeWishlistItem = (text) => {
  const t = text.toLowerCase();
  let type = 'System Improvement', project = 'General', priority = 'P2 — Growth Layer', integration = '', relatedWorkflows = [];

  if (t.includes('mcp') || t.includes('tool stack') || t.includes('loom') || t.includes('wispr') || t.includes('pandadoc')) {
    type = 'Tool Stack'; project = 'Infrastructure & DevOps'; integration = 'Maps to MCP stack standardization (CASE-005)'; relatedWorkflows.push('MCP Stack Canonical Config');
  }
  if (t.includes('website') || t.includes('wordpress') || t.includes('avada') || t.includes('movement-solutions.com') || t.includes('google sites')) {
    type = 'Website'; project = 'Movement Solutions'; priority = 'P1 — Core System'; integration = 'Website Builder workflow exists in library'; relatedWorkflows.push('Website Builder: Multi-Brand Site Generator');
  }
  if (t.includes('blog') || t.includes('sniper') || t.includes('content') || t.includes('article')) {
    type = 'Content'; project = 'Movement Solutions'; integration = 'The Sniper agent handles content generation'; relatedWorkflows.push('Content Repurposing Pipeline');
  }
  if (t.includes('research') || t.includes('dossier') || t.includes('biography') || t.includes('deep dive')) {
    type = 'Research'; project = 'Personal / Brand'; integration = 'Oracle knowledge base stores research outputs';
  }
  if (t.includes('clinical') || t.includes('exercise') || t.includes('patient') || t.includes('ns state') || t.includes('polyvagal')) {
    type = 'Clinical'; project = 'Clinical Brain'; priority = 'P1 — Core System'; relatedWorkflows.push('Clinical Brain Agent System');
  }
  if (t.includes('automat') || t.includes('kylie') || t.includes('agent') || t.includes('workflow')) {
    type = 'Automation'; project = 'Labno Labs'; relatedWorkflows.push('MOSO Overseer Automation Pipeline');
  }
  if (t.includes('lead') || t.includes('client') || t.includes('referral') || t.includes('crm') || t.includes('sales')) {
    type = 'Business Dev'; project = 'Labno Labs'; relatedWorkflows.push('Lead Generation Pipeline');
  }
  if (t.includes('oracle') || t.includes('claude') || t.includes('gpt') || t.includes('gemini') || t.includes('prompt')) {
    type = 'Agent / AI'; project = 'Labno Labs'; relatedWorkflows.push('Multi-Agent Clinical Brain System');
  }
  return { type, project, priority, integration, relatedWorkflows };
};

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({});
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [dispatching, setDispatching] = useState({});
  const [listening, setListening] = useState(false);

  const fetchAll = async () => {
    const [wishRes, projRes, taskRes, caseRes] = await Promise.all([
      supabase.from('wishlist').select('*').order('created_at', { ascending: false }),
      supabase.from('internal_projects').select('*').order('name'),
      supabase.from('global_tasks').select('*'),
      supabase.from('task_queue_cases').select('*').order('case_id'),
    ]);
    if (!wishRes.error) setItems(wishRes.data || []);
    if (!caseRes.error) setCases(caseRes.data || []);
    if (!projRes.error) setProjects(projRes.data || []);
    if (!taskRes.error) {
      const grouped = {};
      (taskRes.data || []).forEach(t => {
        if (!grouped[t.project_id]) grouped[t.project_id] = [];
        grouped[t.project_id].push(t);
      });
      setTasksByProject(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Voice input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Use Chrome.');
      return;
    }
    if (listening) { setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInputText(prev => prev ? prev + '\n' + transcript : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const processInput = async () => {
    if (!inputText.trim()) return;
    setProcessing(true);
    const rawItems = inputText.split(/\n+/).map(s => s.trim()).filter(s => s.length > 10);
    const chunks = rawItems.length > 1 ? rawItems : [inputText.trim()];
    for (const chunk of chunks) {
      const analysis = analyzeWishlistItem(chunk);
      await supabase.from('wishlist').insert({
        raw_text: chunk, type: analysis.type, project: analysis.project,
        priority: analysis.priority, status: 'New Idea',
        integration_notes: analysis.integration,
        related_workflows: analysis.relatedWorkflows.join(', '), analyzed: true,
      });
    }
    setInputText('');
    setProcessing(false);
    await fetchAll();
  };

  const updateItem = async (id, field, value) => {
    await supabase.from('wishlist').update({ [field]: value }).eq('id', id);
    await fetchAll();
  };

  const deleteItem = async (id) => {
    await supabase.from('wishlist').delete().eq('id', id);
    setSelectedItems(prev => { const n = new Set(prev); n.delete(id); return n; });
    await fetchAll();
  };

  const linkToProject = async (wishlistId, projectId) => {
    await supabase.from('wishlist').update({ linked_project_id: projectId || null }).eq('id', wishlistId);
    await fetchAll();
  };

  const dispatchToAgent = async (item) => {
    setDispatching(prev => ({ ...prev, [item.id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const linkedProject = projects.find(p => p.id === item.linked_project_id);
      const prompt = [
        `## Wishlist Task: ${item.raw_text}`,
        `**Type:** ${item.type} | **Project:** ${item.project} | **Priority:** ${item.priority}`,
        item.integration_notes ? `**Integration:** ${item.integration_notes}` : '',
        item.related_workflows ? `**Related Workflows:** ${item.related_workflows}` : '',
        linkedProject ? `**Linked Mission Control Project:** ${linkedProject.name}` : '',
        `\nExecute this task autonomously. Work through it step by step. Commit and push results when done.`,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          taskId: item.id,
          taskTitle: `Wishlist: ${item.raw_text.slice(0, 80)}`,
          projectName: item.project,
          context: prompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await supabase.from('wishlist').update({ agent_run_id: data.runId, status: 'In Progress' }).eq('id', item.id);
        await fetchAll();
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
    }
    setDispatching(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  };

  const dispatchSelected = async () => {
    for (const id of selectedItems) {
      const item = items.find(i => i.id === id);
      if (item) await dispatchToAgent(item);
    }
    setSelectedItems(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const getTab = (id) => activeTab[id] || 'details';
  const setTab = (id, tab) => setActiveTab(prev => ({ ...prev, [id]: tab }));

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
          Dump ideas freely. They get analyzed, tagged, and mapped to projects and workflows. Then dispatch to agents.
        </p>
      </div>

      {/* Input Area */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add to Wishlist
          </h3>
          <button onClick={toggleVoice} title={listening ? 'Stop listening' : 'Voice input'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: listening ? '#d32f2f' : 'rgba(0,0,0,0.04)', color: listening ? '#fff' : '#6b6764', fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.2s' }}>
            {listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Voice</>}
          </button>
        </div>
        <p style={{ color: '#8a8682', fontSize: '0.8rem', marginBottom: '12px' }}>
          Type, paste, or speak — one idea per line. Each item gets analyzed and sorted.
        </p>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={"What do you want to build, fix, research, or improve?\n\nExamples:\n- Update the Movement Solutions website\n- Research the ideal MCP tool stack\n- Build an automated referral report generator"}
          style={{
            width: '100%', minHeight: '120px', padding: '14px', borderRadius: '10px',
            border: listening ? '2px solid #d32f2f' : '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', transition: 'border 0.2s',
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) processInput(); }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: listening ? '#d32f2f' : '#9e9a97' }}>
            {listening ? '🔴 Listening... speak freely' : `${inputText.split('\n').filter(l => l.trim().length > 10).length} item(s) detected — Ctrl+Enter to submit`}
          </span>
          <button onClick={processInput} disabled={processing || !inputText.trim()} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', opacity: processing ? 0.6 : 1 }}>
            <Send size={14} /> {processing ? 'Analyzing...' : 'Analyze & Sort'}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(176,96,80,0.06)', borderLeft: '3px solid #b06050' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b06050' }}>{selectedItems.size} selected</span>
          <button onClick={dispatchSelected} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}>
            <Rocket size={13} /> Send All to Agent
          </button>
          <button onClick={() => setSelectedItems(new Set())} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'none', cursor: 'pointer', color: '#6b6764', fontSize: '0.75rem' }}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Type Stats */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
          const style = TYPE_COLORS[type] || { bg: '#f5f5f5', color: '#666' };
          return (
            <div key={type} onClick={() => setFilterType(filterType === type ? 'All' : type)}
              style={{ padding: '5px 10px', borderRadius: '6px', background: filterType === type ? style.color : style.bg, color: filterType === type ? '#fff' : style.color, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
              {type} ({count})
            </div>
          );
        })}
        {filterType !== 'All' && (
          <div onClick={() => setFilterType('All')} style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.05)', color: '#666', fontSize: '0.72rem', cursor: 'pointer' }}>Clear</div>
        )}
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <Filter size={13} color="#9e9a97" />
        {['All', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '3px 9px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500, background: filterStatus === s ? '#b06050' : 'rgba(0,0,0,0.04)', color: filterStatus === s ? '#fff' : '#6b6764' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, marginBottom: '14px' }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </h3>

        {filtered.length === 0 ? (
          <p style={{ color: '#9e9a97', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No wishlist items yet. Add some above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(item => {
              const typeStyle = TYPE_COLORS[item.type] || { bg: '#f5f5f5', color: '#666' };
              const isExpanded = expandedId === item.id;
              const isSelected = selectedItems.has(item.id);
              const linkedProject = projects.find(p => p.id === item.linked_project_id);
              const linkedTasks = linkedProject ? (tasksByProject[linkedProject.id] || []) : [];
              const tab = getTab(item.id);

              return (
                <div key={item.id} style={{
                  background: isSelected ? 'rgba(176,96,80,0.06)' : 'rgba(255,255,255,0.5)',
                  border: isSelected ? '1px solid rgba(176,96,80,0.2)' : '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '10px', borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] || '#999'}`,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#b06050', flexShrink: 0 }} />
                    <div onClick={() => setExpandedId(isExpanded ? null : item.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                      <span style={{ color: isExpanded ? '#b06050' : '#9e9a97', fontSize: '0.6rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', background: typeStyle.bg, color: typeStyle.color, fontSize: '0.66rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.type}</span>
                      <span style={{ flex: 1, fontSize: '0.85rem', color: '#2e2c2a', fontWeight: 500, lineHeight: 1.4 }}>
                        {item.raw_text.length > 100 ? item.raw_text.slice(0, 100) + '...' : item.raw_text}
                      </span>
                      {linkedProject && (
                        <span style={{ padding: '2px 7px', borderRadius: '4px', background: 'rgba(90,138,191,0.1)', color: '#5a8abf', fontSize: '0.62rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Link2 size={10} /> {linkedProject.name.length > 25 ? linkedProject.name.slice(0, 25) + '...' : linkedProject.name}
                        </span>
                      )}
                      {item.agent_run_id && (
                        <span style={{ padding: '2px 7px', borderRadius: '4px', background: 'rgba(106,171,110,0.1)', color: '#6aab6e', fontSize: '0.62rem', fontWeight: 500, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Rocket size={10} /> Agent
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#9e9a97', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px 38px' }}>
                      {/* Tab bar */}
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                        {[
                          { id: 'details', label: 'Details' },
                          { id: 'links', label: `Links & Projects${linkedProject ? ' ✓' : ''}` },
                          { id: 'agent', label: 'Send to Agent' },
                        ].map(t => (
                          <button key={t.id} onClick={() => setTab(item.id, t.id)} style={{
                            padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500,
                            background: tab === t.id ? '#b06050' : 'rgba(0,0,0,0.04)', color: tab === t.id ? '#fff' : '#6b6764', transition: 'all 0.15s',
                          }}>{t.label}</button>
                        ))}
                      </div>

                      {/* Tab: Details */}
                      {tab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <p style={{ fontSize: '0.85rem', color: '#4a4744', lineHeight: 1.7, background: 'rgba(0,0,0,0.02)', padding: '10px 12px', borderRadius: '8px' }}>{item.raw_text}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '0.66rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
                              <p style={{ fontSize: '0.82rem', color: '#2e2c2a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}><Folder size={13} color="#b06050" /> {item.project}</p>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.66rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
                              <select value={item.priority} onChange={(e) => updateItem(item.id, 'priority', e.target.value)} className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem', color: PRIORITY_COLORS[item.priority] }}>
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.66rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                              <select value={item.status} onChange={(e) => updateItem(item.id, 'status', e.target.value)} className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.66rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                              <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)} className="kanban-select" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          {item.integration_notes && (
                            <div style={{ background: 'rgba(124,152,133,0.08)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #7C9885' }}>
                              <label style={{ fontSize: '0.66rem', color: '#7C9885', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Integration</label>
                              <p style={{ fontSize: '0.8rem', color: '#4a4744', marginTop: '4px' }}>{item.integration_notes}</p>
                            </div>
                          )}
                          {item.related_workflows && (
                            <div>
                              <label style={{ fontSize: '0.66rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related Workflows</label>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {item.related_workflows.split(', ').filter(Boolean).map((w, i) => (
                                  <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764', fontSize: '0.72rem' }}>
                                    <Zap size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <button onClick={() => deleteItem(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(209,64,64,0.2)', background: 'none', color: '#d14040', fontSize: '0.72rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      )}

                      {/* Tab: Links & Projects */}
                      {tab === 'links' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Link to project */}
                          <div>
                            <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Link to Mission Control Project</label>
                            <select value={item.linked_project_id || ''} onChange={(e) => linkToProject(item.id, e.target.value || null)}
                              className="kanban-select" style={{ fontSize: '0.82rem', width: '100%', maxWidth: '400px' }}>
                              <option value="">— Not linked —</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                              ))}
                            </select>
                          </div>

                          {/* Show linked project details */}
                          {linkedProject && (
                            <div style={{ background: 'rgba(90,138,191,0.06)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #5a8abf' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Link2 size={14} color="#5a8abf" /> {linkedProject.name}
                                </span>
                                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: linkedProject.status === 'Active' ? 'rgba(106,171,110,0.15)' : 'rgba(0,0,0,0.05)', color: linkedProject.status === 'Active' ? '#2e7d32' : '#757575' }}>
                                  {linkedProject.status}
                                </span>
                              </div>
                              {linkedProject.due_date && (
                                <p style={{ fontSize: '0.75rem', color: '#6b6764', marginBottom: '8px' }}>Due: {new Date(linkedProject.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              )}

                              {/* Tasks in project */}
                              {linkedTasks.length > 0 && (
                                <div>
                                  <label style={{ fontSize: '0.66rem', color: '#5a8abf', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                    Tasks ({linkedTasks.length})
                                  </label>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {linkedTasks.map(t => (
                                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                                          background: t.column_id === 'completed' ? '#6aab6e' : t.column_id === 'in_progress' ? '#b06050' : t.column_id === 'blocked' ? '#d14040' : t.column_id === 'review' ? '#c49a40' : t.column_id === 'triage' ? '#5a8abf' : '#9e9a97' }} />
                                        <span style={{ flex: 1, color: '#2e2c2a' }}>{t.title}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#9e9a97', textTransform: 'uppercase' }}>{t.column_id?.replace('_', ' ')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Link to case */}
                          <div>
                            <label style={{ fontSize: '0.68rem', color: '#9e9a97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Link to Task Queue Case</label>
                            <select value={item.linked_case_id || ''} onChange={(e) => updateItem(item.id, 'linked_case_id', e.target.value || null)}
                              className="kanban-select" style={{ fontSize: '0.82rem', width: '100%', maxWidth: '500px' }}>
                              <option value="">— Not linked —</option>
                              {cases.map(c => (
                                <option key={c.case_id} value={c.case_id}>{c.case_id} | {c.priority} | {c.title} ({c.status})</option>
                              ))}
                            </select>
                          </div>

                          {/* Show linked case details */}
                          {item.linked_case_id && (() => {
                            const linkedCase = cases.find(c => c.case_id === item.linked_case_id);
                            if (!linkedCase) return null;
                            return (
                              <div style={{ background: 'rgba(123,31,162,0.06)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #7b1fa2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a' }}>{linkedCase.case_id}: {linkedCase.title}</span>
                                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px',
                                    background: linkedCase.status === 'DONE' ? 'rgba(106,171,110,0.15)' : linkedCase.status === 'IN_PROGRESS' ? 'rgba(176,96,80,0.15)' : 'rgba(0,0,0,0.05)',
                                    color: linkedCase.status === 'DONE' ? '#2e7d32' : linkedCase.status === 'IN_PROGRESS' ? '#b06050' : '#757575' }}>
                                    {linkedCase.status}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#6b6764', marginBottom: '6px' }}>{linkedCase.objective}</p>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764' }}>{linkedCase.domain}</span>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: PRIORITY_COLORS[linkedCase.priority] || '#666' }}>{linkedCase.priority}</span>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764' }}>{linkedCase.trigger_type} / {linkedCase.frequency}</span>
                                  {linkedCase.depends_on?.length > 0 && (
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#6b6764' }}>
                                      Depends on: {linkedCase.depends_on.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Tab: Send to Agent */}
                      {tab === 'agent' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <p style={{ fontSize: '0.82rem', color: '#4a4744', lineHeight: 1.6 }}>
                            Send this wishlist item to the Claude agent for autonomous execution. The agent will receive the full context including type, project, integration notes, and any linked projects.
                          </p>

                          {/* Preview the agent prompt */}
                          <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '12px 14px', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto' }}>
                            <span style={{ color: '#569cd6' }}>## Wishlist Task:</span> {item.raw_text}{'\n'}
                            <span style={{ color: '#569cd6' }}>Type:</span> {item.type} | <span style={{ color: '#569cd6' }}>Project:</span> {item.project} | <span style={{ color: '#569cd6' }}>Priority:</span> {item.priority}{'\n'}
                            {item.integration_notes && <><span style={{ color: '#569cd6' }}>Integration:</span> {item.integration_notes}{'\n'}</>}
                            {item.related_workflows && <><span style={{ color: '#569cd6' }}>Related Workflows:</span> {item.related_workflows}{'\n'}</>}
                            {linkedProject && <><span style={{ color: '#569cd6' }}>Linked Project:</span> {linkedProject.name}{'\n'}</>}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => dispatchToAgent(item)} disabled={dispatching[item.id]}
                              className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', opacity: dispatching[item.id] ? 0.6 : 1 }}>
                              <Rocket size={14} /> {dispatching[item.id] ? 'Dispatching...' : 'Send to Agent (Vercel)'}
                            </button>
                            <button onClick={() => {
                              const prompt = `Wishlist Task: ${item.raw_text}\nType: ${item.type} | Project: ${item.project}\n${item.integration_notes || ''}`;
                              navigator.clipboard.writeText(prompt);
                              alert('Copied to clipboard — paste into Claude Code terminal');
                            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'none', cursor: 'pointer', color: '#6b6764', fontSize: '0.8rem' }}>
                              <Terminal size={14} /> Copy for IDE Terminal
                            </button>
                          </div>

                          {item.agent_run_id && (
                            <div style={{ background: 'rgba(106,171,110,0.08)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #6aab6e', fontSize: '0.8rem', color: '#2e7d32' }}>
                              Agent run active — ID: <code style={{ fontSize: '0.72rem' }}>{item.agent_run_id}</code>
                            </div>
                          )}
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
  );
};

export default Wishlist;
