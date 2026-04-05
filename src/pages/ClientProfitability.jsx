import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Star, Heart, AlertTriangle, Mail, Users, BarChart3, Sliders, Send, ChevronDown, ChevronRight, Phone } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { calculateCLV } from '../lib/project-health';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';
import ClientHealthWidget from '../components/ClientHealthWidget';

// Personality types with descriptions
const PERSONALITY_TYPES = {
  collaborative: { label: 'Collaborative', color: '#2d8a4e', desc: 'Easy to work with, respects boundaries' },
  easy_going: { label: 'Easy-Going', color: '#5a8abf', desc: 'Flexible, low-maintenance' },
  perfectionist: { label: 'Perfectionist', color: '#c49a40', desc: 'High standards, detailed feedback, needs extra revisions' },
  pusher: { label: 'Pusher', color: '#e65100', desc: 'Rushes timelines, scope creep, frequent check-ins' },
  ocd: { label: 'Detail-Obsessed', color: '#9c27b0', desc: 'Micro-manages pixels, needs everything explained' },
  demanding: { label: 'Demanding', color: '#d14040', desc: 'High effort, boundary-testing, burn risk' },
};

// Effort rating labels
const EFFORT_LABELS = {
  1: { label: 'Joy', color: '#2d8a4e', emoji: '1' },
  2: { label: 'Easy', color: '#5a8abf', emoji: '2' },
  3: { label: 'Normal', color: '#8a8682', emoji: '3' },
  4: { label: 'High Effort', color: '#e65100', emoji: '4' },
  5: { label: 'P', color: '#e65100', emoji: '5' },
};

// Suggested multipliers based on effort + joy
const calcSuggestedMultiplier = (effort, joy) => {
  if (joy >= 4 && effort <= 2) return 0.8;   // Joy discount
  if (joy >= 4 && effort === 3) return 0.9;
  if (effort === 4) return 1.5;
  if (effort === 5 && joy <= 2) return 3.0;   // Maximum surcharge
  if (effort === 5) return 2.0;
  return 1.0;
};

// Milestone survey questions
const SURVEY_QUESTIONS = [
  { id: 'communication', q: 'How would you rate our communication?', type: 'scale' },
  { id: 'deliverables', q: 'Are deliverables meeting your expectations?', type: 'scale' },
  { id: 'timeline', q: 'How satisfied are you with the timeline?', type: 'scale' },
  { id: 'value', q: 'Do you feel you are getting good value?', type: 'scale' },
  { id: 'recommend', q: 'Would you recommend us to a colleague? (NPS)', type: 'nps' },
  { id: 'feedback', q: 'Any specific feedback or concerns?', type: 'text' },
];

// Break-up email templates
const BREAKUP_TEMPLATES = {
  gentle: {
    subject: 'Transition of Services',
    body: `Hi {name},

Thank you for the opportunity to work together. After careful review of our current capacity and project needs, we believe you would be better served by a team that can dedicate more focused attention to your project requirements.

We want to ensure a smooth transition and would be happy to:
- Provide a summary of all work completed
- Transfer all files and documentation
- Recommend qualified professionals who may be a better fit

We wish you the best with your project and appreciate the trust you placed in us.

Warm regards,
Lance Labno`,
  },
  capacity: {
    subject: 'Update on Project Capacity',
    body: `Hi {name},

I hope this message finds you well. I wanted to be transparent about our current situation — due to increased demand, we are unable to continue providing the level of service your project deserves within our current capacity.

To ensure your project gets the attention it needs, we'd like to help you transition to a provider who can better accommodate your requirements. We can:
- Complete any immediate deliverables in progress
- Provide a comprehensive handoff document
- Connect you with trusted professionals in our network

Thank you for your understanding, and we are committed to making this transition as smooth as possible.

Best,
Lance Labno`,
  },
  referral: {
    subject: 'A Better Fit for Your Project',
    body: `Hi {name},

After working together, I believe your project would benefit from a specialist who can dedicate more focused expertise to your specific needs. I'd like to connect you with a few professionals in my network who I think would be an excellent match.

This isn't a reflection of your project — it's about ensuring you get the best possible outcome. I'll provide a full handoff including all work completed, documentation, and recommendations.

Would you like me to make those introductions?

Best,
Lance Labno`,
  },
};

const ClientProfitability = () => {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [touchpoints, setTouchpoints] = useState([]);
  const [showTouchpointForm, setShowTouchpointForm] = useState(null); // client id
  const [newTouchpoint, setNewTouchpoint] = useState({ type: 'call', duration: 15, direction: 'outbound', notes: '' });
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showBreakup, setShowBreakup] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [breakupTemplate, setBreakupTemplate] = useState('gentle');
  const [adjustingMultiplier, setAdjustingMultiplier] = useState(null);
  const [newMultiplier, setNewMultiplier] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);
  const [editingGuide, setEditingGuide] = useState(false);
  const [baseHourlyRate, setBaseHourlyRate] = useState(() => {
    try { return JSON.parse(localStorage.getItem('llc_base_hourly_rate') || '250'); } catch { return 250; }
  });
  const [guideRates, setGuideRates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('llc_guide_rates') || 'null') || [
        { mult: 0.80, label: 'Joy Discount', desc: 'They bring joy, low effort' },
        { mult: 0.90, label: 'Easy Client', desc: 'Enjoyable, normal effort' },
        { mult: 1.00, label: 'Standard', desc: 'Normal client relationship' },
        { mult: 1.50, label: 'High Effort', desc: 'Extra revisions, meetings' },
        { mult: 3.00, label: 'P Rating', desc: 'Maximum effort, consider referral' },
      ];
    } catch { return []; }
  });

  useEffect(() => {
    const fetch = async () => {
      const [clientRes, projRes, surveyRes, adjRes, tpRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('projects').select('*'),
        supabase.from('client_surveys').select('*').order('created_at', { ascending: false }),
        supabase.from('billing_adjustments').select('*').order('created_at', { ascending: false }),
        supabase.from('client_touchpoints').select('*').order('created_at', { ascending: false }),
      ]);
      setClients(clientRes.data || []);
      setProjects(projRes.data || []);
      setSurveys(surveyRes.data || []);
      setAdjustments(adjRes.data || []);
      setTouchpoints(tpRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateClient = async (id, updates) => {
    await supabase.from('clients').update(updates).eq('id', id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const adjustMultiplier = async (client, newMult, reason) => {
    const prev = client.billing_multiplier || 1.0;
    await Promise.all([
      supabase.from('clients').update({ billing_multiplier: newMult }).eq('id', client.id),
      supabase.from('billing_adjustments').insert({
        client_id: client.id, previous_multiplier: prev, new_multiplier: newMult, reason,
      }),
    ]);
    setClients(p => p.map(c => c.id === client.id ? { ...c, billing_multiplier: newMult } : c));
    setAdjustingMultiplier(null);
  };

  const submitSurvey = async (client, milestone) => {
    const satisfaction = Object.values(surveyResponses)
      .filter(v => typeof v === 'number')
      .reduce((sum, v, _, a) => sum + v / a.length, 0) * 10;

    const effortAdj = satisfaction >= 80 ? -0.1 : satisfaction <= 40 ? 0.5 : 0;

    await supabase.from('client_surveys').insert({
      client_id: client.id, milestone, survey_type: 'milestone',
      responses: surveyResponses, satisfaction_score: Math.round(satisfaction),
      effort_adjustment: effortAdj,
      personality_signals: detectPersonalitySignals(surveyResponses),
    });

    await updateClient(client.id, { satisfaction_score: Math.round(satisfaction) });
    setSurveyResponses({});
    setShowSurvey(false);

    // Re-fetch surveys
    const { data } = await supabase.from('client_surveys').select('*').order('created_at', { ascending: false });
    setSurveys(data || []);
  };

  const detectPersonalitySignals = (responses) => {
    const signals = {};
    if (responses.communication <= 3 && responses.timeline <= 3) signals.demanding = true;
    if (responses.deliverables <= 2) signals.perfectionist = true;
    if (responses.feedback && responses.feedback.length > 200) signals.detail_obsessed = true;
    return signals;
  };

  const sendBreakupEmail = async (client) => {
    const template = BREAKUP_TEMPLATES[breakupTemplate];
    const body = template.body.replace(/\{name\}/g, client.name?.split(' ')[0] || 'there');

    await updateClient(client.id, {
      referral_status: 'breakup_pending',
      breakup_email_sent_at: new Date().toISOString(),
      dnc_status: true,
      dnc_reason: `Break-up email sent (${breakupTemplate} template)`,
    });

    // Log activity
    await supabase.from('activity_feed').insert({
      action: 'breakup_email_drafted', entity_type: 'client',
      entity_id: client.id, entity_name: client.name,
      actor: 'Lance',
      details: { template: breakupTemplate, subject: template.subject },
    });

    // Copy to clipboard for manual sending via Gmail
    await navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${body}`);
    alert('Break-up email copied to clipboard. Paste into Gmail to send.');
    setShowBreakup(false);
  };

  // Summary stats
  const stats = useMemo(() => {
    const active = clients.filter(c => !c.dnc_status);
    const avgMultiplier = active.length > 0 ? active.reduce((s, c) => s + (c.billing_multiplier || 1), 0) / active.length : 1;
    const totalRevenue = clients.reduce((s, c) => s + (c.lifetime_revenue || 0), 0);
    const avgSatisfaction = clients.filter(c => c.satisfaction_score).length > 0
      ? clients.filter(c => c.satisfaction_score).reduce((s, c) => s + c.satisfaction_score, 0) / clients.filter(c => c.satisfaction_score).length : 0;
    const highEffort = clients.filter(c => (c.effort_rating || 3) >= 4).length;
    return { active: active.length, avgMultiplier, totalRevenue, avgSatisfaction, highEffort };
  }, [clients]);

  const formatCurrency = (n) => n ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '$0';

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />

      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BarChart3 size={24} color="#b06050" /> Client Profitability & Satisfaction <InfoTooltip text={PAGE_INFO.profitability} />
      </h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Active Clients', value: stats.active, color: '#2d8a4e', icon: Users },
          { label: 'Avg Multiplier', value: `${stats.avgMultiplier.toFixed(2)}x`, color: '#5a8abf', icon: Sliders },
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: '#b06050', icon: DollarSign },
          { label: 'Avg Satisfaction', value: `${Math.round(stats.avgSatisfaction)}%`, color: stats.avgSatisfaction >= 70 ? '#2d8a4e' : '#c49a40', icon: Heart },
          { label: 'High Effort', value: stats.highEffort, color: '#e65100', icon: AlertTriangle },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <Icon size={16} color={card.color} style={{ marginBottom: '4px' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Client List */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#2e2c2a' }}>Client Health Dashboard</h3>

        {clients.length === 0 ? (
          <p style={{ color: '#8a8682', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No clients yet. Add clients through Client Onboarding.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clients.map(client => {
              const effort = EFFORT_LABELS[client.effort_rating || 3];
              const personality = PERSONALITY_TYPES[client.personality_type] || null;
              const multiplier = client.billing_multiplier || 1.0;
              const suggested = calcSuggestedMultiplier(client.effort_rating || 3, client.joy_score || 3);
              const hourlyRate = client.effective_hourly_rate || (client.total_hours_spent > 0 ? (client.lifetime_revenue || 0) / client.total_hours_spent : null);
              const isExpanded = expandedClient === client.id;
              const clientSurveys = surveys.filter(s => s.client_id === client.id);
              const clientAdjustments = adjustments.filter(a => a.client_id === client.id);

              return (
                <div key={client.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: client.dnc_status ? '1px solid rgba(209,64,64,0.2)' : undefined }}>
                  {/* Client Row */}
                  <div
                    onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                    style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    {isExpanded ? <ChevronDown size={16} color="#6b6764" /> : <ChevronRight size={16} color="#6b6764" />}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2e2c2a' }}>{client.name}</span>
                        {client.company && <span style={{ fontSize: '0.75rem', color: '#8a8682' }}>— {client.company}</span>}
                        {client.dnc_status && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#ffebee', color: '#d14040' }}>DNC</span>}
                        {personality && <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: personality.color + '15', color: personality.color }}>{personality.label}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#8a8682' }}>
                        <span>Tier: {client.tier || 'basic'}</span>
                        {hourlyRate && <span>Eff. Rate: ${hourlyRate.toFixed(0)}/hr</span>}
                        <span>Revenue: {formatCurrency(client.lifetime_revenue)}</span>
                      </div>
                    </div>

                    {/* Effort Stars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '100px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: effort.color }}>{effort.label}</span>
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            size={12}
                            fill={i <= (client.effort_rating || 3) ? effort.color : 'none'}
                            color={i <= (client.effort_rating || 3) ? effort.color : '#ddd'}
                            style={{ cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); updateClient(client.id, { effort_rating: i }); }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Billing Multiplier */}
                    <div style={{ minWidth: '80px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: multiplier > 1.5 ? '#e65100' : multiplier < 1 ? '#2d8a4e' : '#3e3c3a' }}>
                        {multiplier.toFixed(2)}x
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#8a8682' }}>multiplier</div>
                    </div>

                    {/* Satisfaction */}
                    <div style={{ minWidth: '60px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (client.satisfaction_score || 0) >= 70 ? '#2d8a4e' : (client.satisfaction_score || 0) >= 40 ? '#c49a40' : '#d14040' }}>
                        {client.satisfaction_score || '—'}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#8a8682' }}>CSAT</div>
                    </div>

                    {/* Joy Score Hearts */}
                    <div style={{ display: 'flex', gap: '2px', minWidth: '70px' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Heart
                          key={i}
                          size={12}
                          fill={i <= (client.joy_score || 3) ? '#e0598b' : 'none'}
                          color={i <= (client.joy_score || 3) ? '#e0598b' : '#ddd'}
                          style={{ cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); updateClient(client.id, { joy_score: i }); }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <ClientHealthWidget clientName={client.name} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        {/* Personality */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', display: 'block', marginBottom: '4px' }}>Personality Type</label>
                          <select
                            value={client.personality_type || ''}
                            onChange={e => updateClient(client.id, { personality_type: e.target.value || null })}
                            className="kanban-select" style={{ marginTop: 0, fontSize: '0.82rem' }}
                          >
                            <option value="">Not Set</option>
                            {Object.entries(PERSONALITY_TYPES).map(([k, v]) => (
                              <option key={k} value={k}>{v.label} — {v.desc}</option>
                            ))}
                          </select>
                        </div>

                        {/* Multiplier Adjustment */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', display: 'block', marginBottom: '4px' }}>
                            Billing Multiplier (suggested: {suggested.toFixed(2)}x)
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="number" step="0.1" min="0.5" max="5.0"
                              value={adjustingMultiplier === client.id ? newMultiplier : multiplier}
                              onChange={e => { setAdjustingMultiplier(client.id); setNewMultiplier(e.target.value); }}
                              style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                            />
                            {adjustingMultiplier === client.id && (
                              <button onClick={() => adjustMultiplier(client, parseFloat(newMultiplier), 'manual')} className="btn-primary" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>Save</button>
                            )}
                            {suggested !== multiplier && (
                              <button onClick={() => adjustMultiplier(client, suggested, 'auto_suggested')}
                                style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(45,138,78,0.2)', background: 'rgba(45,138,78,0.06)', color: '#2d8a4e', cursor: 'pointer' }}>
                                Apply {suggested.toFixed(2)}x
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Hours & Revenue */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', display: 'block', marginBottom: '4px' }}>Hours Spent</label>
                          <input
                            type="number" step="0.5"
                            value={client.total_hours_spent || 0}
                            onChange={e => {
                              const hrs = parseFloat(e.target.value);
                              const rate = hrs > 0 ? (client.lifetime_revenue || 0) / hrs : null;
                              updateClient(client.id, { total_hours_spent: hrs, effective_hourly_rate: rate });
                            }}
                            style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowTouchpointForm(showTouchpointForm === client.id ? null : client.id)}
                          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(45,138,78,0.2)', background: showTouchpointForm === client.id ? 'rgba(45,138,78,0.12)' : 'rgba(45,138,78,0.06)', color: '#2d8a4e', cursor: 'pointer', fontWeight: 500 }}>
                          Log Touchpoint
                        </button>
                        <button onClick={() => { setSelectedClient(client); setShowSurvey(true); }}
                          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(90,138,191,0.2)', background: 'rgba(90,138,191,0.06)', color: '#5a8abf', cursor: 'pointer', fontWeight: 500 }}>
                          Send Milestone Survey
                        </button>
                        {(client.effort_rating || 3) >= 4 && (
                          <button onClick={() => { setSelectedClient(client); setShowBreakup(true); }}
                            style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(209,64,64,0.2)', background: 'rgba(209,64,64,0.06)', color: '#d14040', cursor: 'pointer', fontWeight: 500 }}>
                            Draft Break-Up Email
                          </button>
                        )}
                      </div>

                      {/* Touchpoint Logger */}
                      {showTouchpointForm === client.id && (
                        <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select value={newTouchpoint.type} onChange={e => setNewTouchpoint(p => ({ ...p, type: e.target.value }))} className="kanban-select" style={{ marginTop: 0, fontSize: '0.78rem', width: '100px' }}>
                              {['call', 'email', 'meeting', 'slack', 'text', 'review'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                            <select value={newTouchpoint.direction} onChange={e => setNewTouchpoint(p => ({ ...p, direction: e.target.value }))} className="kanban-select" style={{ marginTop: 0, fontSize: '0.78rem', width: '100px' }}>
                              <option value="outbound">Outbound</option>
                              <option value="inbound">Inbound</option>
                            </select>
                            <input type="number" value={newTouchpoint.duration} onChange={e => setNewTouchpoint(p => ({ ...p, duration: Number(e.target.value) }))} style={{ width: '60px', padding: '5px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.78rem' }} />
                            <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>min</span>
                            <input type="text" value={newTouchpoint.notes} onChange={e => setNewTouchpoint(p => ({ ...p, notes: e.target.value }))} placeholder="Quick notes..." style={{ flex: 1, minWidth: '120px', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.78rem' }} />
                            <button onClick={async () => {
                              await supabase.from('client_touchpoints').insert({ client_id: client.id, touchpoint_type: newTouchpoint.type, duration_minutes: newTouchpoint.duration, direction: newTouchpoint.direction, notes: newTouchpoint.notes });
                              setNewTouchpoint({ type: 'call', duration: 15, direction: 'outbound', notes: '' });
                              setShowTouchpointForm(null);
                              const { data } = await supabase.from('client_touchpoints').select('*').order('created_at', { ascending: false });
                              setTouchpoints(data || []);
                            }} className="btn-primary" style={{ fontSize: '0.72rem', padding: '5px 12px' }}>Log</button>
                          </div>
                        </div>
                      )}

                      {/* Touchpoint History */}
                      {(() => {
                        const clientTouchpoints = touchpoints.filter(t => t.client_id === client.id);
                        const totalCommsMinutes = clientTouchpoints.reduce((s, t) => s + (t.duration_minutes || 0), 0);
                        if (clientTouchpoints.length === 0) return null;
                        return (
                          <div style={{ marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>
                              Communication Log ({clientTouchpoints.length} touchpoints, {Math.round(totalCommsMinutes / 60 * 10) / 10}hrs total)
                            </h4>
                            {clientTouchpoints.slice(0, 5).map(tp => (
                              <div key={tp.id} style={{ fontSize: '0.75rem', color: '#6b6764', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.02)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{tp.touchpoint_type} ({tp.direction}) {tp.duration_minutes}m {tp.notes ? `— ${tp.notes}` : ''}</span>
                                <span>{new Date(tp.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Survey History */}
                      {clientSurveys.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>Survey History</h4>
                          {clientSurveys.slice(0, 3).map(s => (
                            <div key={s.id} style={{ fontSize: '0.75rem', color: '#6b6764', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.02)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{s.milestone} — CSAT: {s.satisfaction_score}%</span>
                              <span>{new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Billing Adjustment History */}
                      {clientAdjustments.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '6px' }}>Multiplier History</h4>
                          {clientAdjustments.slice(0, 3).map(a => (
                            <div key={a.id} style={{ fontSize: '0.75rem', color: '#6b6764', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.02)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{a.previous_multiplier}x → {a.new_multiplier}x ({a.reason})</span>
                              <span>{new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
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

      {/* Billing Multiplier Guide — Editable */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2e2c2a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Sliders size={16} color="#b06050" /> Billing Multiplier Guide
          </h3>
          <button onClick={() => setEditingGuide(!editingGuide)}
            style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: editingGuide ? 'rgba(176,96,80,0.08)' : 'rgba(0,0,0,0.02)', color: editingGuide ? '#b06050' : '#6b6764', cursor: 'pointer', fontWeight: 500 }}>
            {editingGuide ? 'Done Editing' : 'Edit Guide'}
          </button>
        </div>

        {/* Base Rate Setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.1)' }}>
          <DollarSign size={16} color="#b06050" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e2c2a' }}>Base Hourly Rate:</span>
          {editingGuide ? (
            <input type="number" value={baseHourlyRate} onChange={e => {
              const v = Number(e.target.value);
              setBaseHourlyRate(v);
              localStorage.setItem('llc_base_hourly_rate', JSON.stringify(v));
            }} style={{ width: '100px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '1rem', fontWeight: 700 }} />
          ) : (
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b06050' }}>${baseHourlyRate}/hr</span>
          )}
          <span style={{ fontSize: '0.72rem', color: '#8a8682', marginLeft: 'auto' }}>This is your standard consulting rate before multipliers</span>
        </div>

        {/* Multiplier Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {guideRates.map((m, i) => {
            const colors = ['#2d8a4e', '#5a8abf', '#3e3c3a', '#e65100', '#d14040'];
            const bgs = ['rgba(45,138,78,0.06)', 'rgba(90,138,191,0.06)', 'rgba(0,0,0,0.02)', 'rgba(230,81,0,0.06)', 'rgba(209,64,64,0.06)'];
            const c = colors[i] || '#3e3c3a';
            const bg = bgs[i] || 'rgba(0,0,0,0.02)';
            const effectiveRate = Math.round(baseHourlyRate * m.mult);
            return (
              <div key={i} style={{ padding: '10px', borderRadius: '8px', background: bg, textAlign: 'center' }}>
                {editingGuide ? (
                  <>
                    <input type="number" step="0.1" value={m.mult} onChange={e => {
                      const updated = [...guideRates];
                      updated[i] = { ...updated[i], mult: parseFloat(e.target.value) || 1 };
                      setGuideRates(updated);
                      localStorage.setItem('llc_guide_rates', JSON.stringify(updated));
                    }} style={{ width: '60px', textAlign: 'center', fontSize: '1rem', fontWeight: 700, border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', padding: '2px', color: c }} />
                    <input type="text" value={m.label} onChange={e => {
                      const updated = [...guideRates];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setGuideRates(updated);
                      localStorage.setItem('llc_guide_rates', JSON.stringify(updated));
                    }} style={{ width: '100%', textAlign: 'center', fontSize: '0.7rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '2px', marginTop: '4px' }} />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c }}>{m.mult.toFixed(2)}x</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c, marginBottom: '2px' }}>{m.label}</div>
                  </>
                )}
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: c, marginTop: '4px' }}>${effectiveRate}/hr</div>
                <div style={{ fontSize: '0.62rem', color: '#8a8682' }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#8a8682', marginTop: '10px' }}>
          The multiplier adjusts your base rate of <strong>${baseHourlyRate}/hr</strong>. A {guideRates[4]?.mult || 3}x client gets billed <strong>${Math.round(baseHourlyRate * (guideRates[4]?.mult || 3))}/hr</strong>. Click "Edit Guide" to customize rates and labels. Changes saved to your browser.
        </p>
      </div>

      {/* Survey Modal */}
      {showSurvey && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowSurvey(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Milestone Survey — {selectedClient.name}</h3>
            <p style={{ fontSize: '0.82rem', color: '#6b6764', marginBottom: '16px' }}>
              {selectedClient.personality_type && `Personality: ${PERSONALITY_TYPES[selectedClient.personality_type]?.label || selectedClient.personality_type}. Tailor questions accordingly.`}
            </p>

            {SURVEY_QUESTIONS.map(sq => (
              <div key={sq.id} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a', display: 'block', marginBottom: '6px' }}>{sq.q}</label>
                {sq.type === 'scale' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button key={n} onClick={() => setSurveyResponses(p => ({ ...p, [sq.id]: n }))}
                        style={{
                          width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)',
                          background: surveyResponses[sq.id] === n ? '#b06050' : 'rgba(0,0,0,0.02)',
                          color: surveyResponses[sq.id] === n ? '#fff' : '#3e3c3a',
                          fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                        }}>{n}</button>
                    ))}
                  </div>
                )}
                {sq.type === 'nps' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button key={n} onClick={() => setSurveyResponses(p => ({ ...p, [sq.id]: n }))}
                        style={{
                          width: '30px', height: '30px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)',
                          background: surveyResponses[sq.id] === n ? (n >= 9 ? '#2d8a4e' : n >= 7 ? '#c49a40' : '#d14040') : 'rgba(0,0,0,0.02)',
                          color: surveyResponses[sq.id] === n ? '#fff' : '#3e3c3a',
                          fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                        }}>{n}</button>
                    ))}
                  </div>
                )}
                {sq.type === 'text' && (
                  <textarea
                    value={surveyResponses[sq.id] || ''} onChange={e => setSurveyResponses(p => ({ ...p, [sq.id]: e.target.value }))}
                    rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => submitSurvey(selectedClient, 'manual_milestone')} className="btn-primary" style={{ flex: 1 }}>Submit Survey</button>
              <button onClick={() => setShowSurvey(false)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Break-up Email Modal */}
      {showBreakup && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowBreakup(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#d14040' }}>Draft Break-Up Email — {selectedClient.name}</h3>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {Object.entries(BREAKUP_TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => setBreakupTemplate(key)}
                  className={`filter-pill${breakupTemplate === key ? ' active' : ''}`}
                  style={{ textTransform: 'capitalize' }}>
                  {key}
                </button>
              ))}
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Subject: {BREAKUP_TEMPLATES[breakupTemplate].subject}</div>
              <pre style={{ fontSize: '0.78rem', color: '#3e3c3a', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, fontFamily: 'inherit' }}>
                {BREAKUP_TEMPLATES[breakupTemplate].body.replace(/\{name\}/g, selectedClient.name?.split(' ')[0] || 'there')}
              </pre>
            </div>

            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(209,64,64,0.04)', border: '1px solid rgba(209,64,64,0.1)', fontSize: '0.75rem', color: '#d14040', marginBottom: '12px' }}>
              This will mark the client as DNC and copy the email to your clipboard for sending via Gmail.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => sendBreakupEmail(selectedClient)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#d14040', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14} /> Copy & Mark DNC
              </button>
              <button onClick={() => setShowBreakup(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProfitability;
