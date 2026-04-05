import { useState, useEffect } from 'react';
import { FileText, Send, Eye, CheckCircle, Clock, AlertCircle, ExternalLink, Download, Shield, AlertOctagon, Plus, ArrowRight, Briefcase, FileSignature, ChevronDown, ChevronRight, Edit3, Trash2, Copy, Link2, Sparkles, X } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

const STATUS_META = {
  draft: { label: 'Draft', color: '#8a8682', icon: FileText, next: 'sent', nextLabel: 'Mark Sent' },
  sent: { label: 'Sent', color: '#5a8abf', icon: Send, next: 'viewed', nextLabel: 'Mark Viewed' },
  viewed: { label: 'Viewed', color: '#c49a40', icon: Eye, next: 'signed', nextLabel: 'Mark Signed' },
  signed: { label: 'Signed', color: '#2d8a4e', icon: CheckCircle, next: null, nextLabel: null },
  expired: { label: 'Expired', color: '#d14040', icon: AlertCircle, next: null, nextLabel: null },
};

const TYPE_LABELS = {
  proposal: { label: 'Proposal', color: '#5a8abf' },
  contract: { label: 'Contract', color: '#b06050' },
  invoice: { label: 'Invoice', color: '#2d8a4e' },
  report: { label: 'Report', color: '#9c27b0' },
  template: { label: 'Template', color: '#8a8682' },
};

// Client contract workflow stages
const CLIENT_WORKFLOW = [
  { step: 1, label: 'Discovery Call', desc: 'Understand client needs via onboarding form', action: 'Go to Client Onboarding', path: '/onboarding' },
  { step: 2, label: 'Generate Proposal', desc: 'Auto-generate proposal from onboarding data + tier', action: 'Open Proposal Generator', path: '/proposals' },
  { step: 3, label: 'Review & Save', desc: 'Review proposal, adjust pricing, click "Save to Client"', action: null },
  { step: 4, label: 'Send via Google Docs', desc: 'Open in Google Docs → File → eSignature → Request Signature', action: null },
  { step: 5, label: 'Track Here', desc: 'Update status as client views and signs. Mark milestones.', action: null },
];

// Internal approval workflow stages
const INTERNAL_WORKFLOW = [
  { step: 1, label: 'Draft Document', desc: 'Create the document (proposal, SOW, or approval form)', action: 'Create New Document', modal: 'create' },
  { step: 2, label: 'Download PDF', desc: 'Export the document as PDF for internal review', action: null },
  { step: 3, label: 'Email for Approval', desc: 'Send PDF via email to approver (Lance, team lead, etc.)', action: null },
  { step: 4, label: 'Log Approval', desc: 'Once reply received, mark as "Signed" here to complete the trail', action: null },
];

const ClientDocuments = () => {
  const [docs, setDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(null); // 'client' or 'internal'
  const [newDoc, setNewDoc] = useState({ client_id: '', document_type: 'proposal', title: '', notes: '' });
  const [creating, setCreating] = useState(false);

  const fetchDocs = async () => {
    const [docRes, clientRes] = await Promise.all([
      supabase.from('client_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name, company, email, tier'),
    ]);
    // Merge client info locally (avoids FK join issues)
    const clientMap = {};
    (clientRes.data || []).forEach(c => { clientMap[c.id] = c; });
    const docsWithClients = (docRes.data || []).map(d => ({
      ...d,
      clients: clientMap[d.client_id] || null,
    }));
    setDocs(docsWithClients);
    setClients(clientRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const updateStatus = async (docId, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString();
    if (newStatus === 'signed') updates.signed_at = new Date().toISOString();
    await supabase.from('client_documents').update(updates).eq('id', docId);
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d));
  };

  const deleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    await supabase.from('client_documents').delete().eq('id', docId);
    setDocs(prev => prev.filter(d => d.id !== docId));
    setExpandedDoc(null);
  };

  const createDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.client_id) return;
    setCreating(true);
    const { error } = await supabase.from('client_documents').insert({
      client_id: newDoc.client_id,
      document_type: newDoc.document_type,
      title: newDoc.title.trim(),
      status: 'draft',
      metadata: { notes: newDoc.notes, created_from: 'documents_page' },
    });
    if (!error) {
      setShowCreateModal(false);
      setNewDoc({ client_id: '', document_type: 'proposal', title: '', notes: '' });
      await fetchDocs();
    }
    setCreating(false);
  };

  const filtered = docs.filter(d => {
    if (filterClient !== 'all' && d.client_id !== filterClient) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterType !== 'all' && d.document_type !== filterType) return false;
    return true;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading documents...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />

      {/* Header with Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <FileText size={24} /> Client Documents <InfoTooltip text={PAGE_INFO.documents} />
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.82rem' }}>{docs.length} documents across {clients.length} clients</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}>
            <Plus size={15} /> New Document
          </button>
          <Link to="/proposals" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.06)', color: '#b06050', textDecoration: 'none', fontWeight: 500 }}>
            <Sparkles size={15} /> Proposal Generator
          </Link>
        </div>
      </div>

      {/* Workflow Launcher Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', cursor: 'pointer', border: showWorkflow === 'client' ? '2px solid #5a8abf' : undefined, transition: 'all 0.2s' }}
          onClick={() => setShowWorkflow(showWorkflow === 'client' ? null : 'client')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(90,138,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="#5a8abf" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2e2c2a' }}>Client Contract & Proposal</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Full workflow: discovery → proposal → signature</div>
            </div>
            {showWorkflow === 'client' ? <ChevronDown size={16} color="#6b6764" style={{ marginLeft: 'auto' }} /> : <ChevronRight size={16} color="#6b6764" style={{ marginLeft: 'auto' }} />}
          </div>
          {showWorkflow === 'client' && (
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
              {CLIENT_WORKFLOW.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#5a8abf', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#2e2c2a' }}>{s.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{s.desc}</div>
                  </div>
                  {s.path && (
                    <Link to={s.path} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(90,138,191,0.08)', color: '#5a8abf', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {s.action} <ArrowRight size={10} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', cursor: 'pointer', border: showWorkflow === 'internal' ? '2px solid #2d8a4e' : undefined, transition: 'all 0.2s' }}
          onClick={() => setShowWorkflow(showWorkflow === 'internal' ? null : 'internal')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(45,138,78,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#2d8a4e" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2e2c2a' }}>Internal Approvals</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>PDF + email workflow for team approvals</div>
            </div>
            {showWorkflow === 'internal' ? <ChevronDown size={16} color="#6b6764" style={{ marginLeft: 'auto' }} /> : <ChevronRight size={16} color="#6b6764" style={{ marginLeft: 'auto' }} />}
          </div>
          {showWorkflow === 'internal' && (
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
              {INTERNAL_WORKFLOW.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2d8a4e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#2e2c2a' }}>{s.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{s.desc}</div>
                  </div>
                  {s.modal === 'create' && (
                    <button onClick={() => setShowCreateModal(true)} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(45,138,78,0.08)', color: '#2d8a4e', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {s.action} <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const count = docs.filter(d => d.status === key).length;
          return (
            <div key={key} className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', cursor: 'pointer', border: filterStatus === key ? `2px solid ${meta.color}` : undefined, transition: 'all 0.2s' }} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}>
              <Icon size={16} color={meta.color} style={{ marginBottom: '2px' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: meta.color }}>{count}</div>
              <div style={{ fontSize: '0.68rem', color: '#8a8682' }}>{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.85rem', minWidth: '200px' }}>
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
        </select>
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
        <button className={`filter-pill${filterStatus === 'all' ? ' active' : ''}`} onClick={() => setFilterStatus('all')}>All Status</button>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button key={key} className={`filter-pill${filterStatus === key ? ' active' : ''}`} onClick={() => setFilterStatus(key)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <meta.icon size={11} /> {meta.label}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
        <button className={`filter-pill${filterType === 'all' ? ' active' : ''}`} onClick={() => setFilterType('all')}>All Types</button>
        {Object.entries(TYPE_LABELS).map(([key, meta]) => (
          <button key={key} className={`filter-pill${filterType === key ? ' active' : ''}`} onClick={() => setFilterType(key)}>{meta.label}</button>
        ))}
      </div>

      {/* Documents List (Interactive Cards, not just a table) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <FileText size={40} color="#ddd" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#8a8682', fontSize: '0.92rem', marginBottom: '16px' }}>
              {docs.length === 0 ? 'No documents yet.' : 'No documents match the current filters.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 20px' }}>
                <Plus size={15} /> Create Document
              </button>
              <Link to="/proposals" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.06)', color: '#b06050', textDecoration: 'none', fontWeight: 500 }}>
                <Sparkles size={15} /> Generate Proposal
              </Link>
            </div>
          </div>
        ) : (
          filtered.map(doc => {
            const sm = STATUS_META[doc.status] || STATUS_META.draft;
            const SIcon = sm.icon;
            const tl = TYPE_LABELS[doc.document_type] || { label: doc.document_type, color: '#8a8682' };
            const isExpanded = expandedDoc === doc.id;
            const meta = doc.metadata || {};

            return (
              <div key={doc.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s' }}>
                {/* Document Row — Clickable */}
                <div
                  onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  {isExpanded ? <ChevronDown size={16} color="#6b6764" /> : <ChevronRight size={16} color="#6b6764" />}

                  {/* Status Dot */}
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sm.color, flexShrink: 0 }} />

                  {/* Title & Client */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#2e2c2a' }}>{doc.title}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: tl.color + '12', color: tl.color }}>{tl.label}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#8a8682' }}>
                      {doc.clients?.name || 'No client'}{doc.clients?.company ? ` — ${doc.clients.company}` : ''} &middot; Created {formatDate(doc.created_at)}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: sm.color, padding: '4px 10px', borderRadius: '8px', background: sm.color + '10' }}>
                    <SIcon size={12} /> {sm.label}
                  </span>

                  {/* Quick Action — Advance Status */}
                  {sm.next && (
                    <button
                      onClick={e => { e.stopPropagation(); updateStatus(doc.id, sm.next); }}
                      style={{ fontSize: '0.72rem', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${STATUS_META[sm.next]?.color || '#5a8abf'}30`, background: `${STATUS_META[sm.next]?.color || '#5a8abf'}08`, color: STATUS_META[sm.next]?.color || '#5a8abf', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowRight size={10} /> {sm.nextLabel}
                    </button>
                  )}
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '14px 0' }}>
                      {/* Timeline */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', marginBottom: '8px', textTransform: 'uppercase' }}>Timeline</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#3e3c3a' }}>Created: <strong>{formatDate(doc.created_at)}</strong></div>
                          <div style={{ fontSize: '0.78rem', color: doc.sent_at ? '#3e3c3a' : '#ccc' }}>Sent: <strong>{formatDate(doc.sent_at)}</strong></div>
                          <div style={{ fontSize: '0.78rem', color: doc.signed_at ? '#2d8a4e' : '#ccc' }}>Signed: <strong>{doc.signed_at ? formatDate(doc.signed_at) : 'Awaiting'}</strong></div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', marginBottom: '8px', textTransform: 'uppercase' }}>Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#3e3c3a' }}>
                          {meta.tier && <div>Tier: <strong style={{ textTransform: 'capitalize' }}>{meta.tier}</strong></div>}
                          {meta.track && <div>Track: <strong style={{ textTransform: 'capitalize' }}>{meta.track}</strong></div>}
                          {meta.addOns && meta.addOns.length > 0 && <div>Add-ons: {meta.addOns.join(', ')}</div>}
                          {meta.notes && <div style={{ marginTop: '4px', color: '#6b6764', fontStyle: 'italic' }}>{meta.notes}</div>}
                          {doc.clients?.tier && <div>Client Tier: <strong>{doc.clients.tier}</strong></div>}
                          {doc.clients?.email && <div>Email: {doc.clients.email}</div>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', marginBottom: '8px', textTransform: 'uppercase' }}>Actions</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Status progression buttons */}
                          {Object.entries(STATUS_META).map(([key, meta2]) => {
                            if (key === doc.status) return null;
                            return (
                              <button key={key} onClick={() => updateStatus(doc.id, key)}
                                style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${meta2.color}25`, background: `${meta2.color}06`, color: meta2.color, cursor: 'pointer', fontWeight: 500, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <meta2.icon size={11} /> Set as {meta2.label}
                              </button>
                            );
                          })}
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', color: '#6b6764', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <ExternalLink size={11} /> Open Document
                            </a>
                          )}
                          <button onClick={() => deleteDoc(doc.id)}
                            style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(209,64,64,0.15)', background: 'rgba(209,64,64,0.04)', color: '#d14040', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Content Viewer — renders saved proposal_content from metadata */}
                    {meta.proposal_content && (
                      <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#2e2c2a', margin: 0 }}>
                            {meta.proposal_content.title || 'Proposal Document'}
                          </h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={async () => {
                              const { downloadProposalPDF: dl } = await import('../components/ProposalPDF');
                              dl({ ...meta.proposal_content, tier: { key: meta.tier, ...(meta.proposal_content.tier || {}) } });
                            }} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.06)', color: '#b06050', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Download size={11} /> PDF
                            </button>
                            <button onClick={() => {
                              const pc = meta.proposal_content;
                              const text = [
                                `# ${pc.title || doc.title}`,
                                `Date: ${pc.date || formatDate(doc.created_at)}`,
                                pc.client ? `Prepared for: ${pc.client.name} (${pc.client.company})` : '',
                                '',
                                pc.features ? ['## Features', ...pc.features.map(f => `- ${f}`), ''].join('\n') : '',
                                pc.stages ? pc.stages.map(s => `### ${s.number}. ${s.label}\n${(s.tasks || []).map(t => `- ${t.title}`).join('\n')}`).join('\n\n') : '',
                                pc.pricing ? `\n## Pricing\nBuild: $${(pc.pricing.buildFee || 0).toLocaleString()}\nMonthly: $${(pc.pricing.monthlyFee || 0).toLocaleString()}/mo` : '',
                              ].filter(Boolean).join('\n');
                              navigator.clipboard.writeText(text);
                            }} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)', color: '#6b6764', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Copy size={11} /> Copy
                            </button>
                          </div>
                        </div>
                        {meta.proposal_content.date && (
                          <p style={{ fontSize: '0.78rem', color: '#8a8682', marginBottom: '12px' }}>
                            Prepared {meta.proposal_content.date}
                            {meta.proposal_content.client && ` for ${meta.proposal_content.client.name}`}
                          </p>
                        )}
                        {meta.proposal_content.features && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>Included Features</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {meta.proposal_content.features.map((f, i) => (
                                <span key={i} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(176,96,80,0.08)', color: '#b06050' }}>{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {meta.proposal_content.stages && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>Project Phases ({meta.proposal_content.stages.reduce((s, st) => s + (st.tasks?.length || 0), 0)} deliverables)</div>
                            {meta.proposal_content.stages.map(s => (
                              <div key={s.number} style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2e2c2a' }}>{s.number}. {s.label}</div>
                                {(s.tasks || []).map((t, i) => (
                                  <div key={i} style={{ fontSize: '0.72rem', color: '#6b6764', paddingLeft: '14px' }}>• {t.title}</div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {meta.proposal_content.pricing && (
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.1)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.82rem' }}>
                              {meta.proposal_content.pricing.buildFee > 0 && (
                                <><span style={{ fontWeight: 500 }}>Build Fee:</span><span style={{ fontWeight: 700, color: '#b06050' }}>${meta.proposal_content.pricing.buildFee.toLocaleString()}</span></>
                              )}
                              <span style={{ fontWeight: 500 }}>Monthly:</span>
                              <span style={{ fontWeight: 700, color: '#5a8abf' }}>${(meta.proposal_content.pricing.monthlyFee || 0).toLocaleString()}/mo</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tracking gap reminder for signed docs */}
                    {doc.status === 'sent' && (
                      <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(196,154,64,0.06)', border: '1px solid rgba(196,154,64,0.12)', fontSize: '0.75rem', color: '#a0803a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertOctagon size={13} /> If the client signed via Google Docs, click "Set as Signed" above to keep this in sync.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Signing Method Guide (collapsed by default) */}
      <details className="glass-panel" style={{ padding: '1.25rem' }}>
        <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: '#2e2c2a', listStyle: 'none' }}>
          <Shield size={16} color="#2d8a4e" /> Document Signing Methods
          <ChevronRight size={14} color="#8a8682" style={{ marginLeft: 'auto' }} />
        </summary>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(90,138,191,0.04)', border: '1px solid rgba(90,138,191,0.1)', borderLeft: '3px solid #5a8abf' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#4a7aaf', marginBottom: '6px' }}>Client Contracts & Proposals</div>
            <div style={{ fontSize: '0.78rem', color: '#6b6764', lineHeight: 1.5 }}>
              <strong>Method:</strong> Google Docs "Request Signature"<br />
              <strong>How:</strong> Open contract in Google Docs → File → eSignature → Request Signature<br />
              <strong>Cost:</strong> Free (included with Workspace)<br />
              <strong>Tracking:</strong> Google Docs tracks who signed and when
            </div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)', borderLeft: '3px solid #2d8a4e' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2d8a4e', marginBottom: '6px' }}>Internal Approvals</div>
            <div style={{ fontSize: '0.78rem', color: '#6b6764', lineHeight: 1.5 }}>
              <strong>Method:</strong> PDF download + email confirmation<br />
              <strong>How:</strong> Generate PDF → email to approver → reply = approval<br />
              <strong>Cost:</strong> Free<br />
              <strong>Tracking:</strong> Email thread serves as audit trail
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(209,64,64,0.04)', border: '1px solid rgba(209,64,64,0.12)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertOctagon size={16} color="#d14040" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.78rem', color: '#6b6764', lineHeight: 1.5 }}>
            <strong style={{ color: '#d14040' }}>Tracking Gap:</strong> Google Docs signatures are NOT automatically tracked here.
            When a client signs via Google Docs, you must manually click "Mark Signed" above. <strong>All outward-facing contracts must go through Google Docs "Request Signature"</strong> — if it's not tracked, it didn't happen.
          </div>
        </div>
      </details>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreateModal(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '460px', width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Create New Document</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8682' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 500, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Client *</label>
                <select value={newDoc.client_id} onChange={e => setNewDoc(d => ({ ...d, client_id: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.85rem' }}>
                  <option value="">Select a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
                {clients.length === 0 && <p style={{ fontSize: '0.72rem', color: '#c49a40', marginTop: '4px' }}>No clients yet. <Link to="/onboarding" style={{ color: '#5a8abf' }}>Add one via Client Onboarding</Link></p>}
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 500, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Document Type</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(TYPE_LABELS).map(([key, meta]) => (
                    <button key={key} onClick={() => setNewDoc(d => ({ ...d, document_type: key }))}
                      className={`filter-pill${newDoc.document_type === key ? ' active' : ''}`}
                      style={{ fontSize: '0.78rem' }}>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 500, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Title *</label>
                <input
                  type="text" value={newDoc.title}
                  onChange={e => setNewDoc(d => ({ ...d, title: e.target.value }))}
                  placeholder={`e.g. ${newDoc.document_type === 'proposal' ? 'Website Build Proposal' : newDoc.document_type === 'contract' ? 'Consulting Services Agreement' : 'Q2 2026 Invoice'}`}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 500, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
                <textarea
                  value={newDoc.notes} onChange={e => setNewDoc(d => ({ ...d, notes: e.target.value }))}
                  rows={2} placeholder="Any context about this document..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button onClick={createDocument} disabled={!newDoc.title.trim() || !newDoc.client_id || creating}
                className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.88rem', opacity: (!newDoc.title.trim() || !newDoc.client_id) ? 0.5 : 1 }}>
                {creating ? 'Creating...' : 'Create Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;
