import { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, Clock, Eye, ArrowRight, Briefcase, FileText, Trash2, ExternalLink } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ONBOARDING_QUESTIONS = [
  { id: 'q1', category: 'Discovery', question: 'What is the core problem you need solved?', hint: 'Describe the pain point or opportunity in 2-3 sentences.' },
  { id: 'q2', category: 'Discovery', question: 'What does success look like in 90 days?', hint: 'Measurable outcomes you want to achieve.' },
  { id: 'q3', category: 'Discovery', question: 'What exists today? (Current tools, processes, data)', hint: 'List any existing systems, spreadsheets, or manual processes.' },
  { id: 'q4', category: 'Discovery', question: 'What is your budget range and timeline?', hint: 'Approximate monthly budget and desired launch date.' },
  { id: 'q5', category: 'Discovery', question: 'Who are the key stakeholders?', hint: 'Decision makers, end users, technical contacts.' },
  { id: 'q6', category: 'Technical', question: 'Do you have an existing website or domain?', hint: 'URL, hosting provider, CMS platform.' },
  { id: 'q7', category: 'Technical', question: 'Do you have an existing codebase or database?', hint: 'GitHub repos, databases, APIs.' },
  { id: 'q8', category: 'Technical', question: 'What brand assets do you have?', hint: 'Logos, color palette, fonts, brand guidelines.' },
  { id: 'q9', category: 'Technical', question: 'What integrations do you need?', hint: 'Email, CRM, payment, analytics, scheduling, etc.' },
  { id: 'q10', category: 'Technical', question: 'What data sources need to be connected?', hint: 'Spreadsheets, APIs, databases, manual entry.' },
  { id: 'q11', category: 'Business', question: 'What happens if this project doesn\'t ship?', hint: 'Business impact of not solving this problem.' },
  { id: 'q12', category: 'Business', question: 'Who is the end user of this system?', hint: 'Internal team, customers, patients, public.' },
  { id: 'q13', category: 'Business', question: 'What metrics will you track to measure success?', hint: 'Revenue, time saved, error reduction, user adoption.' },
  { id: 'q14', category: 'Business', question: 'What is your competitive landscape?', hint: 'Competitors, alternatives, market position.' },
  { id: 'q15', category: 'Business', question: 'What is the long-term vision for this system?', hint: 'Where should this be in 1-3 years?' },
];

const TIER_OPTIONS = ['free', 'basic', 'mid', 'high', 'enterprise'];

const ClientOnboarding = () => {
  const [submissions, setSubmissions] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientProjects, setClientProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ contact_name: '', contact_email: '', company_name: '', phone: '', answers: {} });
  const [submitting, setSubmitting] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  const fetchAll = async () => {
    const [subRes, clientRes, projRes] = await Promise.all([
      supabase.from('client_onboarding_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('projects').select('id, name, client_id, status').eq('project_type', 'client'),
    ]);
    if (!subRes.error) setSubmissions(subRes.data || []);
    if (!clientRes.error) setClients(clientRes.data || []);
    if (!projRes.error && projRes.data) {
      const grouped = {};
      projRes.data.forEach(p => {
        if (p.client_id) {
          if (!grouped[p.client_id]) grouped[p.client_id] = [];
          grouped[p.client_id].push(p);
        }
      });
      setClientProjects(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAnswer = (qId, value) => {
    setFormData(prev => ({ ...prev, answers: { ...prev.answers, [qId]: value } }));
  };

  const submitForm = async () => {
    if (!formData.contact_name.trim() || !formData.contact_email.trim()) return;
    setSubmitting(true);

    // Auto-suggest tier and type based on answers
    const allAnswers = Object.values(formData.answers).join(' ').toLowerCase();
    let suggestedTier = 'basic';
    let suggestedType = 'service';
    if (allAnswers.includes('enterprise') || allAnswers.includes('multi-location') || allAnswers.includes('hipaa')) suggestedTier = 'enterprise';
    else if (allAnswers.includes('automation') || allAnswers.includes('ai') || allAnswers.includes('agent')) suggestedTier = 'high';
    else if (allAnswers.includes('website') || allAnswers.includes('app') || allAnswers.includes('dashboard')) suggestedTier = 'mid';
    if (allAnswers.includes('app') || allAnswers.includes('website') || allAnswers.includes('platform')) suggestedType = 'app';

    await supabase.from('client_onboarding_submissions').insert({
      contact_name: formData.contact_name.trim(),
      contact_email: formData.contact_email.trim(),
      company_name: formData.company_name.trim() || null,
      phone: formData.phone.trim() || null,
      answers: formData.answers,
      suggested_tier: suggestedTier,
      suggested_type: suggestedType,
      suggested_priority: 'P2 — Growth Layer',
    });

    setFormData({ contact_name: '', contact_email: '', company_name: '', phone: '', answers: {} });
    setShowNewForm(false);
    setSubmitting(false);
    await fetchAll();
  };

  const [convertError, setConvertError] = useState(null);

  const convertToClient = async (submission) => {
    setConvertError(null);
    // 1. Create client
    const { data: newClient, error: clientErr } = await supabase.from('clients').insert({
      name: submission.contact_name,
      email: submission.contact_email,
      company: submission.company_name,
      phone: submission.phone,
      tier: submission.suggested_tier || 'basic',
      onboarding_answers: submission.answers,
    }).select().single();
    if (clientErr || !newClient) {
      console.error('Error creating client:', clientErr);
      setConvertError(`Failed to create client: ${clientErr?.message || 'Unknown error'}`);
      return;
    }

    // 2. Create project
    const track = submission.suggested_type === 'app' ? 'app' : 'service';
    const projectName = submission.company_name ? `${submission.company_name} — ${submission.suggested_type === 'app' ? 'App Build' : 'Consulting'}` : `${submission.contact_name} Project`;
    const { data: newProj, error: projErr } = await supabase.from('projects').insert({
      name: projectName,
      status: 'Planning',
      project_type: 'client',
      venture: 'consulting',
      pipeline_track: track,
      client_id: newClient.id,
      client_name: submission.contact_name,
      client_email: submission.contact_email,
      total_tasks: 0,
      completed_tasks: 0,
    }).select().single();

    if (!projErr && newProj) {
      // 3. Create pipeline stages
      const stages = [1,2,3,4,5,6,7,8].map(n => ({
        project_id: newProj.id,
        stage_number: n,
        status: n === 1 ? 'active' : 'pending',
        track,
      }));
      await supabase.from('project_pipelines').insert(stages);

      // 4. Update submission
      await supabase.from('client_onboarding_submissions').update({
        status: 'converted',
        converted_client_id: newClient.id,
        converted_project_id: newProj.id,
        processed_at: new Date().toISOString(),
      }).eq('id', submission.id);
    }

    await fetchAll();
  };

  const deleteSubmission = async (id) => {
    await supabase.from('client_onboarding_submissions').delete().eq('id', id);
    await fetchAll();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) return <div className="main-content" style={{ padding: '2rem', color: '#8a8682' }}>Loading...</div>;

  const statusColors = {
    pending: { bg: 'rgba(255,152,0,0.12)', color: '#e65100' },
    processing: { bg: 'rgba(90,138,191,0.12)', color: '#1565c0' },
    converted: { bg: 'rgba(106,171,110,0.12)', color: '#2e7d32' },
    rejected: { bg: 'rgba(209,64,64,0.12)', color: '#c62828' },
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
            <Users size={28} color="#b06050" /> Client Onboarding <InfoTooltip text={PAGE_INFO.onboarding} />
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.9rem' }}>
            {submissions.length} submissions &middot; {clients.length} active clients &middot; {submissions.filter(s => s.status === 'pending').length} pending review
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Intake Form
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Clients', value: clients.length, color: '#2e2c2a' },
          { label: 'Pending Review', value: submissions.filter(s => s.status === 'pending').length, color: '#e65100' },
          { label: 'Converted', value: submissions.filter(s => s.status === 'converted').length, color: '#2e7d32' },
          { label: 'Active Engagements', value: clients.filter(c => c.tier !== 'free').length, color: '#1565c0' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b6764', fontWeight: 500, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {convertError && (
        <div style={{ padding: '0.8rem 1.2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{convertError}</span>
          <button onClick={() => setConvertError(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Dismiss</button>
        </div>
      )}

      {/* Submissions List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>Intake Submissions</h3>
        {submissions.length === 0 ? (
          <p style={{ color: '#8a8682' }}>No submissions yet. Click "New Intake Form" to create one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {submissions.map(sub => {
              const sc = statusColors[sub.status] || statusColors.pending;
              const isExpanded = expandedSubmission === sub.id;
              const answeredCount = Object.keys(sub.answers || {}).filter(k => sub.answers[k]?.trim()).length;
              return (
                <div key={sub.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div
                    style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                    onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#2e2c2a' }}>{sub.contact_name}</span>
                        {sub.company_name && <span style={{ fontSize: '0.82rem', color: '#6b6764' }}>— {sub.company_name}</span>}
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>{sub.status}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#8a8682' }}>
                        {sub.contact_email} &middot; {answeredCount}/15 questions answered &middot; Submitted {formatDate(sub.created_at)}
                        {sub.suggested_tier && <> &middot; Suggested tier: <strong>{sub.suggested_tier}</strong></>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {sub.status === 'pending' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); convertToClient(sub); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#2e7d32', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <CheckCircle size={13} /> Convert to Client
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSubmission(sub.id); }}
                            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'none', cursor: 'pointer', color: '#999' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                      {sub.status === 'converted' && (
                        <Link
                          to={`/proposals?client=${sub.converted_client_id || ''}`}
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.06)', color: '#b06050', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <FileText size={13} /> Generate Proposal <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ paddingTop: '1rem' }}>
                        {ONBOARDING_QUESTIONS.map(q => {
                          const answer = (sub.answers || {})[q.id];
                          if (!answer) return null;
                          return (
                            <div key={q.id} style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b6764', marginBottom: '4px' }}>{q.category}: {q.question}</div>
                              <div style={{ fontSize: '0.85rem', color: '#2e2c2a', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', borderLeft: '3px solid #b06050' }}>{answer}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Clients */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>Active Clients</h3>
        {clients.length === 0 ? (
          <p style={{ color: '#8a8682' }}>No clients yet. Convert an intake submission to create one.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {clients.map(c => {
              const projects = clientProjects[c.id] || [];
              return (
                <div key={c.id} className="glass-panel" style={{ padding: '1.25rem', transition: 'all 0.2s', cursor: 'default' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2e2c2a' }}>{c.name}</div>
                      {c.company && <div style={{ fontSize: '0.82rem', color: '#6b6764' }}>{c.company}</div>}
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(90,138,191,0.12)', color: '#4a7aaf' }}>{c.tier}</span>
                  </div>
                  {c.email && <div style={{ fontSize: '0.75rem', color: '#8a8682', marginBottom: '8px' }}>{c.email}</div>}
                  {projects.length > 0 ? (
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6b6764', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Projects</div>
                      {projects.map(p => (
                        <Link key={p.id} to={`/project/${p.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '0.82rem', color: '#1565c0', textDecoration: 'none',
                          padding: '4px 8px', borderRadius: '6px',
                          background: 'rgba(25,118,210,0.06)',
                          transition: 'background 0.2s',
                        }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(25,118,210,0.12)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(25,118,210,0.06)'}
                        >
                          <ExternalLink size={12} /> {p.name}
                          <span style={{ fontSize: '0.65rem', color: '#8a8682', marginLeft: 'auto' }}>{p.status}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#b0ada9', fontStyle: 'italic', marginTop: '6px' }}>No projects yet</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Intake Form Modal */}
      {showNewForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem' }}
          onClick={() => setShowNewForm(false)}>
          <div className="glass-panel" style={{ width: '700px', maxWidth: '95vw', padding: '2rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(32px)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={22} color="#b06050" /> Client Intake Form
            </h3>

            {/* Contact Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Contact Name *</label>
                <input type="text" value={formData.contact_name} onChange={e => setFormData(f => ({ ...f, contact_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Email *</label>
                <input type="email" value={formData.contact_email} onChange={e => setFormData(f => ({ ...f, contact_email: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Company</label>
                <input type="text" value={formData.company_name} onChange={e => setFormData(f => ({ ...f, company_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
            </div>

            {/* Questions by category */}
            {['Discovery', 'Technical', 'Business'].map(cat => (
              <div key={cat} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b06050', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{cat} Questions</h4>
                {ONBOARDING_QUESTIONS.filter(q => q.category === cat).map(q => (
                  <div key={q.id} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#2e2c2a', marginBottom: '4px', fontWeight: 500 }}>{q.question}</label>
                    <textarea
                      value={formData.answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                      placeholder={q.hint}
                      rows={2}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.82rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'none', cursor: 'pointer', color: '#6b6764' }}>Cancel</button>
              <button onClick={submitForm} disabled={submitting || !formData.contact_name.trim() || !formData.contact_email.trim()}
                className="btn-primary" style={{ padding: '10px 24px', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit Intake Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOnboarding;
