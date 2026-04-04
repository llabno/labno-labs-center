import { useState, useEffect, useRef } from 'react';
import { Database, UploadCloud, BrainCircuit, ShieldAlert, Cpu, Plus, X, Info, Search, Send, Loader, BookOpen, Pencil, Trash2, ChevronDown, ChevronRight, Tag, FileUp, Eye, EyeOff, Check, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['General', 'Clinical', 'Billing', 'Operations', 'Agent', 'Security', 'Onboarding', 'Technical', 'Marketing'];

const CATEGORY_COLORS = {
  General: { bg: '#f5f5f5', color: '#666' },
  Clinical: { bg: '#e8f5e9', color: '#2e7d32' },
  Billing: { bg: '#fff3e0', color: '#e65100' },
  Operations: { bg: '#e3f2fd', color: '#1565c0' },
  Agent: { bg: '#f3e5f5', color: '#7b1fa2' },
  Security: { bg: '#fce4ec', color: '#c62828' },
  Onboarding: { bg: '#e0f2f1', color: '#00695c' },
  Technical: { bg: '#ede7f6', color: '#4527a0' },
  Marketing: { bg: '#fff8e1', color: '#f57f17' },
};

const Oracle = () => {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSop, setNewSop] = useState({ title: '', content: '', visibility: 'Public Brain', category: 'General' });
  const [submitting, setSubmitting] = useState(false);
  const [embedStatus, setEmbedStatus] = useState(null); // null | 'embedding' | 'done' | 'error'

  // RAG Query state
  const [queryText, setQueryText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  // SOP management state
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);

  const fetchSops = async () => {
    setLoading(true); setError(null);
    const { data, error: fetchErr } = await supabase
      .from('oracle_sops')
      .select('id, title, content, visibility, status, token_count, last_synced, category')
      .order('last_synced', { ascending: false });
    if (fetchErr) setError(fetchErr.message);
    else setSops(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSops(); }, []);

  // --- Add SOP ---
  const handleAdd = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const { error: insertErr } = await supabase.from('oracle_sops').insert([{
      title: newSop.title, content: newSop.content, visibility: newSop.visibility,
      category: newSop.category,
      status: 'Synced', token_count: Math.ceil(newSop.content.length / 4),
    }]);
    if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }
    await triggerEmbed();
    setNewSop({ title: '', content: '', visibility: 'Public Brain', category: 'General' });
    setShowForm(false);
    await fetchSops();
    setSubmitting(false);
  };

  // --- Edit SOP ---
  const startEdit = (sop) => {
    setEditingId(sop.id);
    setEditData({ title: sop.title, content: sop.content, visibility: sop.visibility, category: sop.category || 'General' });
  };

  const saveEdit = async () => {
    const { error: updateErr } = await supabase.from('oracle_sops')
      .update({
        title: editData.title, content: editData.content, visibility: editData.visibility,
        category: editData.category,
        token_count: Math.ceil((editData.content || '').length / 4),
        last_synced: new Date().toISOString(),
        // Clear embedding so it gets re-generated
        embedding: null,
      })
      .eq('id', editingId);
    if (updateErr) { setError(updateErr.message); return; }
    setEditingId(null);
    await triggerEmbed();
    await fetchSops();
  };

  // --- Delete SOP ---
  const handleDelete = async (id) => {
    const { error: delErr } = await supabase.from('oracle_sops').delete().eq('id', id);
    if (delErr) { setError(delErr.message); return; }
    setDeleteConfirm(null);
    setExpandedId(null);
    await fetchSops();
  };

  // --- Embedding ---
  const triggerEmbed = async () => {
    setEmbedStatus('embedding');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/oracle/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setEmbedStatus(data.embedded > 0 ? 'done' : 'done');
        setTimeout(() => setEmbedStatus(null), 3000);
      }
    } catch {
      setEmbedStatus('error');
      setTimeout(() => setEmbedStatus(null), 3000);
    }
  };

  // --- File Import ---
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const title = file.name.replace(/\.(md|txt|yaml|json)$/, '');
    setNewSop(prev => ({ ...prev, title, content: text }));
    setShowForm(true);
    e.target.value = '';
  };

  // --- RAG Query ---
  const handleQuery = async (e) => {
    e?.preventDefault();
    if (!queryText.trim() || querying) return;
    setQuerying(true); setQueryResult(null); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Not authenticated. Please log in.'); setQuerying(false); return; }
      const res = await fetch('/api/oracle/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ query: queryText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Query failed'); setQuerying(false); return; }
      const result = { query: queryText.trim(), ...data, timestamp: new Date() };
      setQueryResult(result);
      setQueryHistory(prev => [result, ...prev].slice(0, 10));
      setQueryText('');
    } catch (err) {
      setError(err.message || 'Network error');
    }
    setQuerying(false);
  };

  // --- Filtering ---
  const filtered = sops.filter(s => {
    if (categoryFilter !== 'All' && (s.category || 'General') !== categoryFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (s.title || '').toLowerCase().includes(q) || (s.content || '').toLowerCase().includes(q);
    }
    return true;
  });

  // --- Stats ---
  const totalTokens = sops.reduce((sum, s) => sum + (s.token_count || 0), 0);
  const categoryCounts = {};
  sops.forEach(s => { const c = s.category || 'General'; categoryCounts[c] = (categoryCounts[c] || 0) + 1; });

  return (
    <div className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <BrainCircuit color="#d15a45" /> The Oracle
          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(209,90,69,0.1)', color: '#d15a45', fontWeight: 600 }}>
            {sops.length} docs · {totalTokens.toLocaleString()} tokens
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {embedStatus && (
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px',
              background: embedStatus === 'embedding' ? '#fff3e0' : embedStatus === 'done' ? '#e8f5e9' : '#fde8e8',
              color: embedStatus === 'embedding' ? '#e65100' : embedStatus === 'done' ? '#2e7d32' : '#c62828',
            }}>
              {embedStatus === 'embedding' ? '⟳ Embedding...' : embedStatus === 'done' ? '✓ Embedded' : '✗ Embed failed'}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".md,.txt,.yaml,.json" style={{ display: 'none' }} onChange={handleFileImport} />
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', color: '#555', fontSize: '0.82rem' }}>
            <FileUp size={15} /> Import File
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add SOP</>}
          </button>
        </div>
      </div>

      {/* RAG Query */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: '3px solid #d15a45' }}>
        <form onSubmit={handleQuery} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={queryText} onChange={e => setQueryText(e.target.value)}
            placeholder="Ask the Oracle anything about your SOPs and workflows..."
            disabled={querying}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.8)' }}
            onKeyDown={e => { if (e.key === 'Enter') handleQuery(e); }} />
          <button type="submit" disabled={querying || !queryText.trim()} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: (querying || !queryText.trim()) ? 0.5 : 1 }}>
            {querying ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Thinking...</> : <><Send size={16} /> Ask</>}
          </button>
        </form>

        {queryResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: 'rgba(209,90,69,0.04)', border: '1px solid rgba(209,90,69,0.12)' }}>
            <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Q: {queryResult.query}</span>
              <span>{queryResult.model} · {queryResult.sopCount} searched</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{queryResult.response}</div>
            {queryResult.sources?.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: 600 }}>Sources:</span>
                {queryResult.sources.map((s, i) => (
                  <span key={i} onClick={() => { const match = sops.find(x => x.title === s.title); if (match) setExpandedId(match.id); }}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(209,90,69,0.08)', color: '#d15a45', cursor: 'pointer' }}>
                    <BookOpen size={10} style={{ verticalAlign: '-1px', marginRight: '3px' }} />{s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {queryHistory.length > 1 && (
          <details style={{ marginTop: '8px' }}>
            <summary style={{ fontSize: '0.75rem', color: '#999', cursor: 'pointer' }}>History ({queryHistory.length})</summary>
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {queryHistory.slice(1).map((h, i) => (
                <div key={i} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                  onClick={() => { setQueryText(h.query); setQueryResult(h); }}>
                  Q: {h.query.slice(0, 80)}{h.query.length > 80 ? '...' : ''}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Add SOP Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#333', fontSize: '0.95rem' }}>Add New SOP</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input type="text" placeholder="Title (e.g. Billing_Protocol)" value={newSop.title}
                onChange={e => setNewSop({ ...newSop, title: e.target.value })} required
                style={{ flex: 2, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem' }} />
              <select value={newSop.category} onChange={e => setNewSop({ ...newSop, category: e.target.value })}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={newSop.visibility} onChange={e => setNewSop({ ...newSop, visibility: e.target.value })}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem' }}>
                <option value="Public Brain">Public</option>
                <option value="Private Brain (Internal Only)">Private</option>
              </select>
            </div>
            <textarea placeholder="SOP content (supports markdown)..." value={newSop.content}
              onChange={e => setNewSop({ ...newSop, content: e.target.value })} required rows={12}
              style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#999' }}>~{Math.ceil((newSop.content || '').length / 4)} tokens</span>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '8px 20px' }}>
                {submitting ? 'Saving...' : 'Save SOP'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div style={{ padding: '0.75rem', marginBottom: '0.75rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828', fontSize: '0.85rem' }}>{error}</div>}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Filter size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
            placeholder="Filter SOPs by title or content..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }} />
        </div>
        {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const cs = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
          const active = categoryFilter === cat;
          return (
            <button key={cat} onClick={() => setCategoryFilter(active ? 'All' : cat)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500,
                background: active ? cs.color : cs.bg, color: active ? '#fff' : cs.color }}>
              {cat} ({count})
            </button>
          );
        })}
        {categoryFilter !== 'All' && (
          <button onClick={() => setCategoryFilter('All')} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', background: 'rgba(0,0,0,0.05)', color: '#666' }}>Clear</button>
        )}
        <button onClick={triggerEmbed} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <UploadCloud size={12} /> Sync Vectors
        </button>
      </div>

      {/* SOP List */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>Loading SOPs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>
            {sops.length === 0 ? 'No SOPs yet. Add one above or import a file.' : 'No SOPs match your filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(doc => {
              const isExpanded = expandedId === doc.id;
              const isEditing = editingId === doc.id;
              const catStyle = CATEGORY_COLORS[doc.category || 'General'] || CATEGORY_COLORS.General;

              return (
                <div key={doc.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {/* Row Header */}
                  <div onClick={() => !isEditing && setExpandedId(isExpanded ? null : doc.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer',
                      background: isExpanded ? 'rgba(209,90,69,0.03)' : 'transparent',
                      transition: 'background 0.15s' }}>
                    {isExpanded ? <ChevronDown size={14} color="#999" /> : <ChevronRight size={14} color="#999" />}
                    <Database size={14} color="#999" />
                    <span style={{ fontWeight: 500, color: '#222', fontSize: '0.9rem', flex: 1 }}>{doc.title}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 500, background: catStyle.bg, color: catStyle.color }}>
                      {doc.category || 'General'}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem',
                      background: doc.visibility === 'Public Brain' ? '#e8f5e9' : '#fff3e0',
                      color: doc.visibility === 'Public Brain' ? '#2e7d32' : '#e65100' }}>
                      {doc.visibility === 'Public Brain' ? 'Public' : 'Private'}
                    </span>
                    {doc.status === 'Blocked (Injection Risk)' && (
                      <span style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}><ShieldAlert size={13} /> Blocked</span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: '#aaa', minWidth: '50px', textAlign: 'right' }}>{doc.token_count ?? '—'} tk</span>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && !isEditing && (
                    <div style={{ padding: '0 16px 16px 44px' }}>
                      <div style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '16px',
                        fontSize: '0.85rem', color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                        maxHeight: '400px', overflowY: 'auto' }}>
                        {doc.content || 'No content.'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(doc); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#555' }}>
                          <Pencil size={13} /> Edit
                        </button>
                        {deleteConfirm === doc.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#c62828' }}>Delete permanently?</span>
                            <button onClick={() => handleDelete(doc.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#c62828', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#666' }}>No</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#c62828' }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#bbb', marginLeft: 'auto' }}>
                          Last synced: {doc.last_synced ? new Date(doc.last_synced).toLocaleString() : 'never'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Edit Mode */}
                  {isExpanded && isEditing && (
                    <div style={{ padding: '0 16px 16px 44px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })}
                            style={{ flex: 2, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem' }} />
                          <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={editData.visibility} onChange={e => setEditData({ ...editData, visibility: e.target.value })}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
                            <option value="Public Brain">Public</option>
                            <option value="Private Brain (Internal Only)">Private</option>
                          </select>
                        </div>
                        <textarea value={editData.content} onChange={e => setEditData({ ...editData, content: e.target.value })}
                          rows={15}
                          style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: '#999' }}>~{Math.ceil((editData.content || '').length / 4)} tokens · Embedding will regenerate on save</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingId(null)}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#666' }}>Cancel</button>
                            <button onClick={saveEdit} className="btn-primary" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{filtered.length} of {sops.length} SOPs shown</span>
        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>·</span>
        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{totalTokens.toLocaleString()} total tokens</span>
        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>·</span>
        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>Avg {sops.length > 0 ? Math.round(totalTokens / sops.length) : 0} tokens/doc</span>
      </div>
    </div>
  );
};

export default Oracle;
