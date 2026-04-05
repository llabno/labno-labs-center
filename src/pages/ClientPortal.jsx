import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, Eye, Send, Mail, Calendar, ArrowRight, ExternalLink, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * ClientPortal — Self-service client view
 *
 * URL: /portal?token=xxx or /portal?client=xxx
 *
 * Shows:
 * - Proposal status and content (read-only)
 * - Document lifecycle (Draft → Sent → Viewed → Signed)
 * - Scheduling preferences (links to availability form)
 * - Request contact button (sends notification to Lance)
 */

const STATUS_META = {
  draft: { label: 'In Preparation', color: '#8a8682', icon: FileText },
  sent: { label: 'Sent to You', color: '#5a8abf', icon: Send },
  viewed: { label: 'Under Review', color: '#c49a40', icon: Eye },
  signed: { label: 'Signed', color: '#2d8a4e', icon: CheckCircle },
};

const ClientPortal = () => {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [contactSent, setContactSent] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedSlots, setSchedSlots] = useState([]);
  const [schedNote, setSchedNote] = useState('');
  const [schedSubmitted, setSchedSubmitted] = useState(false);
  const [newSlot, setNewSlot] = useState({ day: 'Monday', time: 'Morning' });

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get('client');
      const token = params.get('token');

      if (!clientId && !token) {
        setError('No client identifier provided. Check your link.');
        setLoading(false);
        return;
      }

      // Fetch client info
      let clientData = null;
      if (clientId) {
        const { data } = await supabase.from('clients').select('id, name, company, email, tier').eq('id', clientId).single();
        clientData = data;
      } else if (token) {
        // Token-based lookup from availability invites
        const { data: invite } = await supabase.from('availability_invites').select('client_name, client_type').eq('token', token).single();
        if (invite) {
          const { data } = await supabase.from('clients').select('id, name, company, email, tier').ilike('name', invite.client_name).single();
          clientData = data;
        }
      }

      if (!clientData) {
        setError('Client not found. Please contact us for an updated link.');
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Fetch documents for this client
      const { data: docs } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      setDocuments(docs || []);

      // Mark any "sent" documents as "viewed" when client opens the portal
      const sentDocs = (docs || []).filter(d => d.status === 'sent');
      for (const doc of sentDocs) {
        await supabase.from('client_documents').update({ status: 'viewed' }).eq('id', doc.id);
      }
      if (sentDocs.length > 0) {
        setDocuments(prev => prev.map(d => sentDocs.find(s => s.id === d.id) ? { ...d, status: 'viewed' } : d));
      }

      setLoading(false);
    };
    load();
  }, []);

  const requestContact = async () => {
    if (!client) return;
    setContactSent(true);
    // Log a communication request
    await supabase.from('communication_log').insert({
      lead_name: client.name,
      comm_type: 'portal_request',
      direction: 'inbound',
      subject: `${client.name} requested contact via Client Portal`,
      body: `Client ${client.name} (${client.company || ''}) viewed their portal and clicked "Request Contact". Please follow up.`,
      status: 'pending',
    }).catch(() => {});

    // Also log to activity
    await supabase.from('activity_log').insert({
      source_type: 'CRM',
      title: `Client portal contact request: ${client.name}`,
      action: 'contact_requested',
      project: client.company || null,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f5f2' }}>
        <div style={{ textAlign: 'center', color: '#8a8682' }}>Loading your portal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f5f2', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <FileText size={40} color="#d14040" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: '#2e2c2a', marginBottom: '8px' }}>Portal Access Issue</h2>
          <p style={{ color: '#8a8682', lineHeight: 1.6 }}>{error}</p>
          <a href="mailto:lance@labnolabs.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '10px 20px', borderRadius: '8px', background: '#b06050', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
            <Mail size={14} /> Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f2', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b06050', marginBottom: '4px' }}>Labno Labs</h1>
          <p style={{ color: '#8a8682', fontSize: '0.88rem' }}>Client Portal</p>
        </div>

        {/* Client Card */}
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '1.5rem', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '4px' }}>
            Welcome, {client.name}
          </h2>
          {client.company && <p style={{ color: '#6b6764', fontSize: '0.88rem' }}>{client.company}</p>}
        </div>

        {/* Documents */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '12px' }}>Your Documents</h3>

        {documents.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <FileText size={32} color="#ccc" style={{ marginBottom: '10px' }} />
            <p style={{ color: '#8a8682' }}>No documents yet. We'll notify you when your proposal is ready.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
            {documents.map(doc => {
              const sm = STATUS_META[doc.status] || STATUS_META.draft;
              const SIcon = sm.icon;
              const meta = doc.metadata || {};
              const isExpanded = expandedDoc === doc.id;

              return (
                <div key={doc.id} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}>
                    <SIcon size={18} color={sm.color} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#2e2c2a' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8a8682' }}>
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', background: sm.color + '12', color: sm.color }}>
                      {sm.label}
                    </span>
                  </div>

                  {isExpanded && meta.proposal_content && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      {meta.proposal_content.features && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>What's Included</div>
                          <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.82rem', color: '#3e3c3a', lineHeight: 1.7 }}>
                            {meta.proposal_content.features.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                      )}
                      {meta.proposal_content.stages && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>
                            Project Phases ({meta.proposal_content.stages.reduce((s, st) => s + (st.tasks?.length || 0), 0)} deliverables)
                          </div>
                          {meta.proposal_content.stages.map(s => (
                            <div key={s.number} style={{ marginBottom: '6px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a' }}>{s.number}. {s.label}</div>
                              {(s.tasks || []).map((t, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: '#6b6764', paddingLeft: '14px' }}>- {t.title}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {meta.proposal_content.pricing && (
                        <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.1)' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b06050', marginBottom: '6px' }}>Investment</div>
                          <div style={{ fontSize: '0.88rem', color: '#2e2c2a' }}>
                            {meta.proposal_content.pricing.buildFee > 0 && (
                              <div>Build: <strong>${meta.proposal_content.pricing.buildFee.toLocaleString()}</strong></div>
                            )}
                            <div>Monthly: <strong>${(meta.proposal_content.pricing.monthlyFee || 0).toLocaleString()}/mo</strong></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isExpanded && !meta.proposal_content && (
                    <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '0.82rem', color: '#8a8682' }}>
                      Document details will be available once finalized. Contact us for more information.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
          <a href={`/availability/fill?client=${encodeURIComponent(client.name)}`}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.7)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textDecoration: 'none', color: '#2e2c2a' }}>
            <Calendar size={20} color="#5a8abf" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Update Availability</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Share when you're free for sessions</div>
            </div>
            <ArrowRight size={14} color="#8a8682" style={{ marginLeft: 'auto' }} />
          </a>

          <button onClick={requestContact} disabled={contactSent}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: '14px', background: contactSent ? 'rgba(45,138,78,0.06)' : 'rgba(255,255,255,0.7)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: 'none', cursor: contactSent ? 'default' : 'pointer', textAlign: 'left', width: '100%' }}>
            {contactSent ? <CheckCircle size={20} color="#2d8a4e" /> : <Mail size={20} color="#b06050" />}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: contactSent ? '#2d8a4e' : '#2e2c2a' }}>
                {contactSent ? 'Request Sent!' : 'Request Contact'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>
                {contactSent ? 'We\'ll get back to you soon' : 'We\'ll reach out via email'}
              </div>
            </div>
          </button>
        </div>

        {/* Scheduling Widget */}
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2e2c2a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calendar size={18} color="#5a8abf" /> Share Your Availability
            </h3>
            {!schedSubmitted && (
              <button onClick={() => setShowScheduler(!showScheduler)}
                style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(90,138,191,0.2)', background: 'rgba(90,138,191,0.06)', color: '#5a8abf', cursor: 'pointer', fontWeight: 600 }}>
                {showScheduler ? 'Close' : 'Add Times'}
              </button>
            )}
          </div>

          {schedSubmitted ? (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <CheckCircle size={28} color="#2d8a4e" style={{ marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, color: '#2d8a4e', marginBottom: '4px' }}>Availability submitted!</p>
              <p style={{ fontSize: '0.78rem', color: '#8a8682' }}>We'll use this to find the best times for your sessions.</p>
            </div>
          ) : showScheduler ? (
            <div>
              <p style={{ fontSize: '0.78rem', color: '#6b6764', marginBottom: '12px' }}>Tell us when you're typically available. We'll match you with open slots.</p>

              {/* Add slot */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <select value={newSlot.day} onChange={e => setNewSlot(s => ({ ...s, day: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: '#fff' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={newSlot.time} onChange={e => setNewSlot(s => ({ ...s, time: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: '#fff' }}>
                  {['Morning (7-11am)', 'Midday (11am-1pm)', 'Afternoon (1-5pm)', 'Any time'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => {
                  setSchedSlots(prev => [...prev, { ...newSlot, id: Date.now() }]);
                }} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#5a8abf', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Slots list */}
              {schedSlots.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {schedSlots.map(s => (
                    <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(90,138,191,0.08)', border: '1px solid rgba(90,138,191,0.15)', fontSize: '0.82rem' }}>
                      {s.day} · {s.time}
                      <button onClick={() => setSchedSlots(prev => prev.filter(x => x.id !== s.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d14040', fontSize: '0.72rem', padding: 0 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              <textarea value={schedNote} onChange={e => setSchedNote(e.target.value)}
                placeholder="Any notes? (e.g., 'Not available first week of May', 'Prefer early morning')"
                rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.82rem', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box' }} />

              {/* Submit */}
              <button
                onClick={async () => {
                  if (schedSlots.length === 0) return;
                  // Save to client_availability
                  await supabase.from('client_availability').upsert({
                    client_name: client.name,
                    client_type: 'clinical',
                    preferred_days: [...new Set(schedSlots.map(s => s.day))],
                    general_preference: schedSlots.some(s => s.time.includes('Morning')) ? 'mornings' : schedSlots.some(s => s.time.includes('Afternoon')) ? 'afternoons' : 'flexible',
                    scheduling_notes: `Client portal submission: ${schedSlots.map(s => `${s.day} ${s.time}`).join(', ')}. ${schedNote}`.trim(),
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'client_name' }).catch(() => {});

                  // Log the submission
                  await supabase.from('communication_log').insert({
                    lead_name: client.name,
                    comm_type: 'portal_scheduling',
                    direction: 'inbound',
                    subject: `${client.name} submitted availability via portal`,
                    body: `Preferred times: ${schedSlots.map(s => `${s.day} ${s.time}`).join(', ')}. Notes: ${schedNote || 'none'}`,
                    status: 'pending',
                  }).catch(() => {});

                  setSchedSubmitted(true);
                }}
                disabled={schedSlots.length === 0}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: schedSlots.length > 0 ? '#5a8abf' : 'rgba(0,0,0,0.08)', color: schedSlots.length > 0 ? '#fff' : '#aaa', cursor: schedSlots.length > 0 ? 'pointer' : 'default', fontWeight: 600, fontSize: '0.88rem' }}>
                Submit Availability ({schedSlots.length} time{schedSlots.length !== 1 ? 's' : ''})
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#8a8682' }}>Click "Add Times" to share when you're available for sessions.</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.72rem', color: '#b0ada9' }}>
          Labno Labs · <a href="https://labnolabs.com" style={{ color: '#b06050', textDecoration: 'none' }}>labnolabs.com</a>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
