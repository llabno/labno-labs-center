import { useState, useEffect } from 'react';
import { Database, UploadCloud, BrainCircuit, ShieldAlert, Cpu, Plus, X, Info, Search, Send, Loader, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

const InfoTooltip = ({ text }) => (
  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }} className="info-tooltip-wrapper">
    <Info size={14} color="#999" style={{ cursor: 'help' }} />
    <span className="info-tooltip-text" style={{
      visibility: 'hidden', position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
      background: '#333', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.72rem', whiteSpace: 'nowrap',
      zIndex: 1000, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #333' }} />
      {text}
    </span>
    <style>{`.info-tooltip-wrapper:hover .info-tooltip-text { visibility: visible !important; }`}</style>
  </span>
);

const Oracle = () => {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSop, setNewSop] = useState({ title: '', content: '', visibility: 'Private Brain (Internal Only)' });
  const [submitting, setSubmitting] = useState(false);

  // RAG Query state
  const [queryText, setQueryText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  const fetchSops = async () => {
    setLoading(true); setError(null);
    const { data, error: fetchErr } = await supabase
      .from('oracle_sops')
      .select('id, title, content, visibility, status, token_count, last_synced')
      .order('last_synced', { ascending: false });
    if (fetchErr) setError(fetchErr.message);
    else setSops(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSops(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const { error: insertErr } = await supabase.from('oracle_sops').insert([{
      title: newSop.title, content: newSop.content, visibility: newSop.visibility,
      status: 'Pending Approval', token_count: Math.ceil(newSop.content.length / 4),
    }]);
    if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }

    // Auto-trigger embedding for the new SOP (best-effort, won't block UI)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch('/api/oracle/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        }); // fire-and-forget
      }
    } catch { /* embedding is optional — keyword search still works */ }

    setNewSop({ title: '', content: '', visibility: 'Private Brain (Internal Only)' });
    setShowForm(false);
    await fetchSops();
    setSubmitting(false);
  };

  // RAG Query
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

  // Token stats
  const totalTokens = sops.reduce((sum, s) => sum + (s.token_count || 0), 0);
  const avgTokens = sops.length > 0 ? totalTokens / sops.length : 0;
  const efficiencyColor = avgTokens < 40 ? '#388e3c' : avgTokens <= 60 ? '#f9a825' : '#d32f2f';
  const efficiencyLabel = avgTokens < 40 ? 'Excellent' : avgTokens <= 60 ? 'Moderate' : 'High';

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BrainCircuit color="#d15a45" /> The Oracle (Second Brain API)
        <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(209,90,69,0.1)', color: '#d15a45', fontWeight: 600, marginLeft: '8px' }}>
          {sops.length} SOPs · {totalTokens.toLocaleString()} tokens
        </span>
      </h1>

      <p style={{ marginBottom: '1.5rem', color: '#555', maxWidth: '800px' }}>
        Ask the Oracle anything about your SOPs and workflows. It searches your {sops.length} documents and returns answers with sources.
      </p>

      {/* RAG Query Box */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid #d15a45' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="#d15a45" /> Ask the Oracle
        </h3>
        <form onSubmit={handleQuery} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={queryText} onChange={e => setQueryText(e.target.value)}
            placeholder="e.g. How do I onboard a new intern? What's the billing protocol?"
            disabled={querying}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.8)' }}
            onKeyDown={e => { if (e.key === 'Enter') handleQuery(e); }} />
          <button type="submit" disabled={querying || !queryText.trim()} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: (querying || !queryText.trim()) ? 0.5 : 1 }}>
            {querying ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Thinking...</> : <><Send size={16} /> Ask</>}
          </button>
        </form>

        {/* Query Result */}
        {queryResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: 'rgba(209,90,69,0.04)', border: '1px solid rgba(209,90,69,0.12)' }}>
            <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Q: {queryResult.query}</span>
              <span>{queryResult.model} · {queryResult.sopCount} SOPs searched</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {queryResult.response}
            </div>
            {queryResult.sources?.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: 600 }}>Sources:</span>
                {queryResult.sources.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(209,90,69,0.08)', color: '#d15a45' }}>
                    <BookOpen size={10} style={{ verticalAlign: '-1px', marginRight: '3px' }} />{s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Query History */}
        {queryHistory.length > 1 && (
          <details style={{ marginTop: '10px' }}>
            <summary style={{ fontSize: '0.78rem', color: '#999', cursor: 'pointer' }}>Previous queries ({queryHistory.length})</summary>
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {queryHistory.slice(1).map((h, i) => (
                <div key={i} style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                  onClick={() => { setQueryText(h.query); setQueryResult(h); }}>
                  <strong style={{ color: '#666' }}>Q:</strong> {h.query.slice(0, 80)}{h.query.length > 80 ? '...' : ''}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Control Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#333' }}>Vector Sync Status</h3>
          <p style={{ color: '#777', fontSize: '0.9rem' }}>
            {sops.length > 0 && sops[0].last_synced
              ? <>Last synced: <strong>{new Date(sops[0].last_synced).toLocaleString()}</strong></>
              : <>No sync data available</>}
          </p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add SOP</>}
        </button>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={fetchSops}>
          <UploadCloud size={18} /> Refresh
        </button>
      </div>

      {/* Add SOP Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Add New SOP Entry</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
            <input type="text" placeholder="SOP Title (e.g. Audio_Internship_Protocol.md)" value={newSop.title}
              onChange={e => setNewSop({ ...newSop, title: e.target.value })} required
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem' }} />
            <textarea placeholder="SOP content..." value={newSop.content}
              onChange={e => setNewSop({ ...newSop, content: e.target.value })} required rows={5}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem', resize: 'vertical' }} />
            <select value={newSop.visibility} onChange={e => setNewSop({ ...newSop, visibility: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem' }}>
              <option value="Public Brain">Public Brain</option>
              <option value="Private Brain (Internal Only)">Private Brain (Internal Only)</option>
            </select>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Saving...' : 'Save SOP'}
            </button>
          </form>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding: '1rem', marginBottom: '1rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828' }}>{error}</div>}

      {/* SOP Table */}
      <div className="glass-panel" style={{ overflow: 'visible' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>Loading SOPs...</div>
        ) : sops.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>No SOPs found. Add one above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, position: 'relative', overflow: 'visible' }}>Title <InfoTooltip text="The name of this Standard Operating Procedure" /></th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, position: 'relative', overflow: 'visible' }}>Content <InfoTooltip text="The full text/instructions of the SOP" /></th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, position: 'relative', overflow: 'visible' }}>Visibility <InfoTooltip text="Public Brain = shared with team. Private Brain = internal only" /></th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, position: 'relative', overflow: 'visible' }}>Status <InfoTooltip text="Synced = up to date. Draft = work in progress" /></th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, position: 'relative', overflow: 'visible' }}>Tokens <InfoTooltip text="Approximate AI tokens. Lower = more efficient" /></th>
              </tr>
            </thead>
            <tbody>
              {sops.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '1rem', color: '#222', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Database size={16} color="#888" /> {doc.title}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#666', fontSize: '0.82rem', maxWidth: '280px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.content || '—'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem',
                      background: doc.visibility === 'Public Brain' ? '#e8f5e9' : '#fff3e0',
                      color: doc.visibility === 'Public Brain' ? '#2e7d32' : '#e65100' }}>
                      {doc.visibility}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {doc.status === 'Blocked (Injection Risk)' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d32f2f', fontSize: '0.9rem', fontWeight: 500 }}><ShieldAlert size={16} /> Blocked</span>
                    ) : doc.status === 'Pending Approval' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f57c00', fontSize: '0.9rem', fontWeight: 500 }}><Cpu size={16} /> Awaiting Lance</span>
                    ) : (
                      <span style={{ color: '#388e3c', fontSize: '0.9rem', fontWeight: 500 }}>{doc.status}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#666' }}>{doc.token_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Token Efficiency */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="#d15a45" /> Token Efficiency
        </h3>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', fontSize: '0.9rem', color: '#555', lineHeight: 1.7 }}>
            Lower token counts = faster AI processing and lower costs.
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Keep SOPs concise and structured.</li>
              <li>Use bullet points instead of paragraphs.</li>
              <li>Remove redundant instructions.</li>
              <li>Target under 50 tokens per SOP for optimal efficiency.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', minWidth: '130px' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px', fontWeight: 600 }}>Total Tokens</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333' }}>{totalTokens.toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: '#999' }}>{sops.length} SOPs</div>
            </div>
            <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: `2px solid ${efficiencyColor}22`, textAlign: 'center', minWidth: '130px' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px', fontWeight: 600 }}>Avg Tokens</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: efficiencyColor }}>{Math.round(avgTokens)}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: efficiencyColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: efficiencyColor }} />
                {efficiencyLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Oracle;
