import React, { useState, useEffect } from 'react';
import { Database, UploadCloud, BrainCircuit, ShieldAlert, Cpu, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Oracle = () => {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSop, setNewSop] = useState({ title: '', content: '', visibility: 'Private Brain (Internal Only)' });
  const [submitting, setSubmitting] = useState(false);

  const fetchSops = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('oracle_sops')
      .select('id, title, content, visibility, status, token_count, last_synced')
      .order('last_synced', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setSops(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSops(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error: insertErr } = await supabase
      .from('oracle_sops')
      .insert([{
        title: newSop.title,
        content: newSop.content,
        visibility: newSop.visibility,
        status: 'Pending Approval',
        token_count: Math.ceil(newSop.content.length / 4),
      }]);

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setNewSop({ title: '', content: '', visibility: 'Private Brain (Internal Only)' });
      setShowForm(false);
      await fetchSops();
    }
    setSubmitting(false);
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BrainCircuit color="#d15a45" /> The Oracle (Second Brain API)
      </h1>

      <p style={{ marginBottom: '2rem', color: '#555', maxWidth: '800px' }}>
        The Oracle is your central pgvector knowledge retriever. Here you manage what SOPs and Workflow Captures are actively feeding the Labno Labs AI agents and the overnight dispatcher.
      </p>

      {/* Control Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#333' }}>Vector Sync Status</h3>
          <p style={{ color: '#777', fontSize: '0.9rem' }}>
            {sops.length > 0 && sops[0].last_synced
              ? <>Last synced: <strong>{new Date(sops[0].last_synced).toLocaleString()}</strong></>
              : <>No sync data available</>
            }
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add SOP</>}
        </button>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={fetchSops}>
          <UploadCloud size={18} />
          Refresh
        </button>
      </div>

      {/* Add SOP Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Add New SOP Entry</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
            <input
              type="text"
              placeholder="SOP Title (e.g. Audio_Internship_Protocol.md)"
              value={newSop.title}
              onChange={(e) => setNewSop({ ...newSop, title: e.target.value })}
              required
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem' }}
            />
            <textarea
              placeholder="SOP content..."
              value={newSop.content}
              onChange={(e) => setNewSop({ ...newSop, content: e.target.value })}
              required
              rows={5}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem', resize: 'vertical' }}
            />
            <select
              value={newSop.visibility}
              onChange={(e) => setNewSop({ ...newSop, visibility: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem' }}
            >
              <option value="Public Brain">Public Brain</option>
              <option value="Private Brain (Internal Only)">Private Brain (Internal Only)</option>
            </select>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Saving...' : 'Save SOP'}
            </button>
          </form>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828' }}>
          {error}
        </div>
      )}

      {/* SOP Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>Loading SOPs...</div>
        ) : sops.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>No SOPs found. Add one above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>SOP Document</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Token Count</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Visibility Tag</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Agent Status</th>
              </tr>
            </thead>
            <tbody>
              {sops.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '1rem', color: '#222', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Database size={16} color="#888" /> {doc.title}
                  </td>
                  <td style={{ padding: '1rem', color: '#666' }}>{doc.token_count ?? '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      background: doc.visibility === 'Public Brain' ? '#e8f5e9' : '#fff3e0',
                      color: doc.visibility === 'Public Brain' ? '#2e7d32' : '#e65100'
                    }}>
                      {doc.visibility}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {doc.status === 'Blocked (Injection Risk)' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d32f2f', fontSize: '0.9rem', fontWeight: 500 }}>
                        <ShieldAlert size={16} /> Blocked
                      </span>
                    ) : doc.status === 'Pending Approval' ? (
                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f57c00', fontSize: '0.9rem', fontWeight: 500 }}>
                       <Cpu size={16} /> Awaiting Lance
                     </span>
                    ) : (
                      <span style={{ color: '#388e3c', fontSize: '0.9rem', fontWeight: 500 }}>{doc.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Oracle;
