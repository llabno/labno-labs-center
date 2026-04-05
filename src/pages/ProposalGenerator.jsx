import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronRight, Download, Copy, Check, Sparkles, DollarSign, Clock, Layers, Save } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import { logProposalGenerated, logDocumentSent } from '../lib/activity-logger';
// Lazy-load PDF renderer to avoid bloating main bundle
const downloadProposalPDF = async (proposal) => {
  const { downloadProposalPDF: dl } = await import('../components/ProposalPDF');
  return dl(proposal);
};
import Breadcrumbs from '../components/Breadcrumbs';

// Package-based pricing — clients see packages, not hourly rates
// Each tier has detailed deliverables so clients know exactly what they get
const TIERS = {
  starter: {
    label: 'Starter', color: '#8a8682', monthly: 500, buildFee: 0,
    target: 'Solo practitioners, 1-person operations, department heads',
    features: [
      '1 AI agent or automation (e.g., scheduling bot, intake form, follow-up emailer)',
      'Basic email support (48hr response)',
      'Monthly 30-min performance review call',
      'Standard templates (website, email, forms)',
      'Hosted on shared infrastructure',
    ],
    deliverables: 'We build one focused automation on our dime and charge monthly. Best for testing AI with low commitment. Ideal white-label candidate if it proves value — can upgrade to Growth.',
    whiteLabel: true,
    pricing: '$500-$1,500/mo · No upfront build fee',
  },
  growth: {
    label: 'Growth', color: '#5a8abf', monthly: 2500, buildFee: 8000,
    target: 'Small teams (2-5 people), department heads with budget',
    features: [
      'Custom website (responsive, SEO-optimized)',
      'CRM setup + lead capture automation',
      '2-3 custom automations (email sequences, form routing, notifications)',
      'Bi-weekly 30-min check-in calls',
      'Priority email support (24hr response)',
      'Analytics dashboard with monthly reporting',
      'Google Workspace integration',
    ],
    deliverables: '8-stage project: Kickoff → Scope → Design → Build → Test → Deploy → Handoff → Close. Includes 60 days post-launch support in the monthly fee.',
    pricing: '$8,000-$20,000 build + $1,500-$3,500/mo',
  },
  professional: {
    label: 'Professional', color: '#c49a40', monthly: 5000, buildFee: 25000,
    target: 'Growing businesses, multi-location clinics, practices with 5+ staff',
    features: [
      'Full custom application build (React + Supabase)',
      'Weekly 45-min strategy + progress meetings',
      'Custom AI agents (intake, scheduling, follow-up, content)',
      'Dedicated project manager',
      'All third-party integrations (GCal, email, payment, EHR)',
      'HIPAA-compliant architecture (BAA included)',
      'Staff training (2 sessions)',
      'Quarterly optimization review',
    ],
    deliverables: 'Full 8-stage pipeline with 30-50 tasks per stage. Includes dedicated Slack channel, priority bug fixes (4hr response), and all hosting costs in monthly fee.',
    pricing: '$15,000-$50,000 build + $2,500-$5,000/mo',
  },
  premium: {
    label: 'Premium', color: '#b06050', monthly: 8000, buildFee: 50000,
    target: 'Established businesses needing full AI transformation',
    features: [
      'Everything in Professional',
      'Embedded AI team (15-20 hrs/mo dedicated capacity)',
      'Unlimited integrations and custom modules',
      'White-label option (your brand, our tech)',
      'Custom SLA with guaranteed uptime',
      'Quarterly strategy sessions with roadmap planning',
      'Multi-agent system (autonomous task execution)',
      'Advanced analytics + predictive insights',
    ],
    deliverables: 'You get a fractional AI team. We handle ongoing development, maintenance, and innovation. Includes source code escrow and disaster recovery.',
    pricing: '$35,000-$75,000 build + $5,000-$12,000/mo',
  },
  enterprise: {
    label: 'Enterprise', color: '#9c27b0', monthly: 15000, buildFee: 100000,
    target: 'Multi-department, org-wide AI deployment, hospital systems',
    features: [
      'Everything in Premium',
      'On-call support (2hr response, including weekends)',
      'Full source code access and ownership',
      'Dedicated infrastructure (isolated cloud environment)',
      'Staff training program (unlimited sessions)',
      'Revenue share option (reduced build fee + % of savings)',
      'Compliance audit support (HIPAA, SOC2)',
      'Executive quarterly business review',
    ],
    deliverables: 'Enterprise engagement with MSA, SOW, and dedicated account team. Includes on-site visits (2/year), custom compliance documentation, and white-glove migration support.',
    pricing: '$75,000-$200,000+ build + $12,000-$25,000/mo',
  },
};

const ProposalGenerator = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [selectedTrack, setSelectedTrack] = useState('service');
  const [addOns, setAddOns] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState(new Set([1]));
  const [savedToClient, setSavedToClient] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const ADD_ON_OPTIONS = [
    { id: 'mechanic', label: 'Speak Freely Module', price: '$2,500/mo', desc: 'Relational intelligence + somatic tracking' },
    { id: 'exercise_db', label: 'Exercise Database', price: '$1,500/mo', desc: 'Custom exercise library with video + safety tiers' },
    { id: 'dual_crm', label: 'Dual CRM Engine', price: '$1,800/mo', desc: 'Clinical + consulting pipeline management' },
    { id: 'ai_agents', label: 'AI Agent Suite', price: '$3,000/mo', desc: 'Autonomous task execution + agent monitoring' },
    { id: 'oracle', label: 'Oracle Knowledge Base', price: '$1,200/mo', desc: 'RAG-powered SOP search + strategic Q&A' },
  ];

  useEffect(() => {
    const fetch = async () => {
      const [clientRes, templateRes, subRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('pipeline_task_templates').select('*').order('stage', { ascending: true }).order('sort_order', { ascending: true }),
        supabase.from('client_onboarding_submissions').select('*').order('created_at', { ascending: false }),
      ]);
      const clientList = clientRes.data || [];
      setClients(clientList);
      setTemplates(templateRes.data || []);
      setSubmissions(subRes.data || []);

      // Auto-select client from URL param (from onboarding pipeline)
      const params = new URLSearchParams(window.location.search);
      const preselectedId = params.get('client');
      if (preselectedId && clientList.length > 0) {
        const match = clientList.find(c => c.id === preselectedId);
        if (match) {
          setSelectedClient(match);
          // Map old tier names to new package names
          const tierMap = { free: 'starter', basic: 'growth', mid: 'professional', high: 'premium', enterprise: 'enterprise' };
          setSelectedTier(tierMap[match.tier] || match.tier || 'professional');
        }
      }

      setLoading(false);
    };
    fetch();
  }, []);

  const stageTemplates = templates.filter(t => {
    if (!t.tracks) return true;
    const tracks = Array.isArray(t.tracks) ? t.tracks : [];
    return tracks.includes(selectedTrack);
  });

  const stageGroups = {};
  stageTemplates.forEach(t => {
    if (!stageGroups[t.stage]) stageGroups[t.stage] = [];
    stageGroups[t.stage].push(t);
  });

  const STAGE_LABELS = ['Kickoff', 'Scope', 'Design', 'Build/Execute', 'Test', 'Deploy', 'Handoff', 'Close'];

  const clientSubmission = selectedClient
    ? submissions.find(s => s.email === selectedClient.email || s.client_id === selectedClient.id)
    : null;

  const toggleStage = (stage) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  };

  const generateProposal = () => {
    setGenerating(true);
    const tier = TIERS[selectedTier];
    const clientName = selectedClient?.name || 'Prospective Client';
    const company = selectedClient?.company || 'Your Company';
    const answers = clientSubmission?.answers || {};

    // Count tasks per stage
    const taskCounts = {};
    let totalTasks = 0;
    Object.entries(stageGroups).forEach(([stage, tasks]) => {
      // Filter to client-visible tasks for proposal
      const visible = tasks.filter(t => t.client_visible !== false);
      taskCounts[stage] = visible.length;
      totalTasks += visible.length;
    });

    const selectedAddOns = ADD_ON_OPTIONS.filter(a => addOns.includes(a.id));

    // Package-based pricing: use tier's build fee + monthly + multiplier adjustment
    const baseRate = Number(localStorage.getItem('llc_base_hourly_rate') || '250');
    const clientMultiplier = selectedClient?.billing_multiplier || 1.0;
    const effectiveRate = Math.round(baseRate * clientMultiplier);

    // Package pricing from tier
    const buildFee = Math.round((tier.buildFee || 0) * clientMultiplier);
    const monthlyFee = Math.round((tier.monthly || 0) * clientMultiplier);

    // Also calculate estimated hours for internal reference
    const templateTasks = Object.values(stageGroups).flat().filter(t => t.client_visible !== false);
    let totalEstimatedHours;
    if (templateTasks.length > 0) {
      const totalEstimatedMinutes = templateTasks.reduce((sum, t) => sum + (t.estimated_minutes || 60), 0);
      totalEstimatedHours = Math.round(totalEstimatedMinutes / 60);
    } else {
      const tierHourDefaults = { starter: 10, growth: 60, professional: 120, premium: 250, enterprise: 500 };
      totalEstimatedHours = tierHourDefaults[selectedTier] || 120;
    }
    const estimatedProjectCost = buildFee || (totalEstimatedHours * effectiveRate);
    const addOnMonthlyCost = selectedAddOns.reduce((sum, a) => {
      const price = parseInt((a.price || '0').replace(/[^0-9]/g, ''));
      return sum + price;
    }, 0);

    const doc = {
      title: `${tier.label} Proposal for ${company}`,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      client: { name: clientName, company, email: selectedClient?.email || '' },
      tier: { key: selectedTier, ...tier },
      track: selectedTrack,
      stages: Object.entries(stageGroups).map(([stage, tasks]) => ({
        number: Number(stage),
        label: STAGE_LABELS[Number(stage) - 1] || `Stage ${stage}`,
        tasks: tasks.filter(t => t.client_visible !== false).map(t => ({
          title: t.title,
          description: t.description,
          trigger: t.trigger_level || 'manual',
        })),
      })),
      addOns: selectedAddOns,
      totalTasks,
      answers,
      features: tier.features,
      pricing: {
        baseRate,
        multiplier: clientMultiplier,
        effectiveRate,
        totalEstimatedHours,
        buildFee,
        monthlyFee,
        projectCost: estimatedProjectCost,
        addOnMonthly: addOnMonthlyCost,
        pricingLabel: tier.pricing || '',
        target: tier.target || '',
      },
    };

    setTimeout(() => {
      setProposal(doc);
      setGenerating(false);
    }, 800);
  };

  const copyProposal = () => {
    if (!proposal) return;
    const text = [
      `# ${proposal.title}`,
      `Date: ${proposal.date}`,
      `Prepared for: ${proposal.client.name} (${proposal.client.company})`,
      '',
      `## Service Tier: ${proposal.tier.label}`,
      `Track: ${proposal.track === 'app' ? 'App Build' : 'Service Build'}`,
      '',
      '## Included Features',
      ...proposal.features.map(f => `- ${f}`),
      '',
      '## Project Phases',
      ...proposal.stages.map(s => [
        `### ${s.number}. ${s.label} (${s.tasks.length} deliverables)`,
        ...s.tasks.map(t => `- ${t.title}${t.description ? `: ${t.description}` : ''}`),
        '',
      ]).flat(),
      ...(proposal.addOns.length > 0 ? [
        '## Add-On Modules',
        ...proposal.addOns.map(a => `- ${a.label} (${a.price}) — ${a.desc}`),
        '',
      ] : []),
      `## Summary`,
      `Total Deliverables: ${proposal.totalTasks}`,
      `Service Tier: ${proposal.tier.label}`,
      '',
      '---',
      'Prepared by Labno Labs · labnolabs.com',
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading proposal generator...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText size={24} /> Proposal Generator <InfoTooltip text={PAGE_INFO.proposals} />
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Client Selection */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '10px' }}>Client</h3>
            <select
              value={selectedClient?.id || ''}
              onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
              className="kanban-select"
              style={{ width: '100%', padding: '10px 28px 10px 10px', fontSize: '0.88rem', marginTop: 0 }}
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
              ))}
            </select>
            {clientSubmission && (
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(45,138,78,0.06)', border: '1px solid rgba(45,138,78,0.15)', fontSize: '0.8rem', color: '#2d8a4e' }}>
                <Check size={12} style={{ marginRight: '4px' }} /> Onboarding answers found — will be incorporated into proposal
              </div>
            )}
          </div>

          {/* Tier Selection */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '10px' }}>Service Tier</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(TIERS).map(([key, tier]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: selectedTier === key ? tier.color + '12' : 'rgba(255,255,255,0.3)', border: `1px solid ${selectedTier === key ? tier.color + '30' : 'rgba(0,0,0,0.05)'}`, transition: 'all 0.15s ease' }}>
                  <input type="radio" name="tier" checked={selectedTier === key} onChange={() => setSelectedTier(key)} style={{ accentColor: tier.color }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: tier.color }}>{tier.label}</span>
                    <div style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '2px' }}>{tier.features.slice(0, 3).join(' · ')}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Track */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '10px' }}>Project Track</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ key: 'app', label: 'App Build', desc: 'Software product development' }, { key: 'service', label: 'Service Build', desc: 'Consulting + implementation' }].map(t => (
                <button key={t.key} onClick={() => setSelectedTrack(t.key)} className={`filter-pill${selectedTrack === t.key ? ' active' : ''}`} style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{t.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Add-Ons */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '10px' }}>
              <Sparkles size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Add-On Modules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ADD_ON_OPTIONS.map(addon => (
                <label key={addon.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: addOns.includes(addon.id) ? 'rgba(176,96,80,0.06)' : 'transparent', border: `1px solid ${addOns.includes(addon.id) ? 'rgba(176,96,80,0.15)' : 'rgba(0,0,0,0.04)'}` }}>
                  <input type="checkbox" checked={addOns.includes(addon.id)} onChange={e => {
                    if (e.target.checked) setAddOns(p => [...p, addon.id]);
                    else setAddOns(p => p.filter(a => a !== addon.id));
                  }} style={{ accentColor: '#b06050' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a' }}>{addon.label}</span>
                    <span style={{ fontSize: '0.72rem', color: '#8a8682', marginLeft: '6px' }}>{addon.desc}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b06050' }}>{addon.price}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={generateProposal} className="btn-primary" style={{ padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={generating}>
            {generating ? 'Generating...' : <><Sparkles size={18} /> Generate Proposal</>}
          </button>
        </div>

        {/* Right: Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Pipeline Preview */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} /> Pipeline Stages ({selectedTrack === 'app' ? 'App Build' : 'Service Build'})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {STAGE_LABELS.map((label, i) => {
                const stage = i + 1;
                const tasks = stageGroups[stage] || [];
                const visibleTasks = tasks.filter(t => t.client_visible !== false);
                const isExpanded = expandedStages.has(stage);
                return (
                  <div key={stage}>
                    <div onClick={() => toggleStage(stage)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isExpanded ? 'rgba(176,96,80,0.04)' : 'transparent' }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2e2c2a' }}>{stage}. {label}</span>
                      <span style={{ fontSize: '0.72rem', color: '#8a8682', marginLeft: 'auto' }}>{visibleTasks.length} tasks</span>
                    </div>
                    {isExpanded && visibleTasks.length > 0 && (
                      <div style={{ paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px' }}>
                        {visibleTasks.map((t, j) => (
                          <div key={j} style={{ fontSize: '0.78rem', color: '#3e3c3a', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#b06050', flexShrink: 0 }} />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated Proposal */}
          {proposal && (
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(176,96,80,0.03) 0%, rgba(255,255,255,0.3) 100%)' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2e2c2a' }}>Generated Proposal</h3>
                <p style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '2px' }}>Review below, then use the action buttons at the bottom to copy, download, or save.</p>
              </div>

              <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: '#3e3c3a' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b06050', marginBottom: '4px' }}>{proposal.title}</h2>
                <p style={{ color: '#8a8682', marginBottom: '16px' }}>Prepared {proposal.date} for {proposal.client.name}</p>

                <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Service Tier: {proposal.tier.label}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {proposal.features.map((f, i) => (
                    <span key={i} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', background: proposal.tier.color + '12', color: proposal.tier.color, fontWeight: 500 }}>
                      {f}
                    </span>
                  ))}
                </div>

                <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Project Phases ({proposal.totalTasks} total deliverables)</h4>
                {proposal.stages.map(s => (
                  <div key={s.number} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#2e2c2a', marginBottom: '4px' }}>{s.number}. {s.label}</div>
                    {s.tasks.map((t, i) => (
                      <div key={i} style={{ paddingLeft: '16px', fontSize: '0.78rem', color: '#5a5856', marginBottom: '2px' }}>• {t.title}</div>
                    ))}
                  </div>
                ))}

                {proposal.addOns.length > 0 && (
                  <>
                    <h4 style={{ fontWeight: 600, marginBottom: '6px', marginTop: '12px' }}>Add-On Modules</h4>
                    {proposal.addOns.map(a => (
                      <div key={a.id} style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{a.label}</span> ({a.price}) — {a.desc}
                      </div>
                    ))}
                  </>
                )}

                {/* Package Pricing Section */}
                {proposal.pricing && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.1)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '4px', color: '#b06050' }}>Investment Summary</h4>
                    {proposal.pricing.target && <p style={{ fontSize: '0.75rem', color: '#8a8682', marginBottom: '12px', marginTop: 0 }}>Designed for: {proposal.pricing.target}</p>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                      {proposal.pricing.buildFee > 0 && (
                        <>
                          <div style={{ fontWeight: 600 }}>Build & Implementation:</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#b06050' }}>${proposal.pricing.buildFee.toLocaleString()}</div>
                        </>
                      )}
                      {proposal.pricing.buildFee === 0 && (
                        <>
                          <div style={{ fontWeight: 600 }}>Build Fee:</div>
                          <div style={{ fontWeight: 700, color: '#2d8a4e' }}>Included in monthly</div>
                        </>
                      )}

                      <div style={{ fontWeight: 600, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>Monthly Service:</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#5a8abf', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                        ${proposal.pricing.monthlyFee.toLocaleString()}/mo
                      </div>

                      {proposal.pricing.addOnMonthly > 0 && (
                        <>
                          <div>Add-On Modules:</div>
                          <div style={{ fontWeight: 600 }}>+${proposal.pricing.addOnMonthly.toLocaleString()}/mo</div>
                        </>
                      )}

                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px', fontWeight: 600 }}>Total Monthly:</div>
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px', fontWeight: 800, fontSize: '1.05rem', color: '#2e2c2a' }}>
                        ${(proposal.pricing.monthlyFee + proposal.pricing.addOnMonthly).toLocaleString()}/mo
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#8a8682' }}>First Year Investment:</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#6b6764' }}>
                        ${(proposal.pricing.buildFee + (proposal.pricing.monthlyFee + proposal.pricing.addOnMonthly) * 12).toLocaleString()}
                      </div>
                    </div>

                    {proposal.pricing.pricingLabel && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', fontSize: '0.72rem', color: '#8a8682' }}>
                        Package range: {proposal.pricing.pricingLabel}
                      </div>
                    )}
                    <p style={{ fontSize: '0.68rem', color: '#8a8682', marginTop: '8px', marginBottom: 0 }}>
                      Build fee covers design, development, and deployment. Monthly fee covers maintenance, support, optimization, and hosting. Pricing adjusts based on scope and complexity.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons — at bottom after review */}
              <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3e3c3a', marginRight: '8px' }}>Actions:</span>
                <button onClick={copyProposal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '0.85rem' }}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
                </button>
                <button onClick={() => { downloadProposalPDF(proposal); logProposalGenerated(selectedClient, selectedTier); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.3)', background: 'rgba(176,96,80,0.08)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#b06050' }}>
                  <Download size={14} /> Download PDF
                </button>
                {selectedClient && (
                  <button onClick={async () => {
                    setSaveError(null);
                    try {
                      const { data, error } = await supabase.from('client_documents').insert({
                        client_id: selectedClient.id,
                        project_id: null,
                        document_type: 'proposal',
                        title: proposal.title,
                        status: 'draft',
                        metadata: {
                          tier: selectedTier, track: selectedTrack, addOns,
                          proposal_content: {
                            title: proposal.title,
                            client: proposal.client,
                            date: proposal.date,
                            features: proposal.features,
                            stages: proposal.stages,
                            pricing: proposal.pricing,
                            addOns: proposal.addOns,
                            totalTasks: proposal.totalTasks,
                          },
                        },
                      }).select();
                      if (error) throw error;
                      logDocumentSent({ id: data?.[0]?.id || selectedClient.id, title: proposal.title });
                      setSavedToClient(true);
                      setTimeout(() => setSavedToClient(false), 3000);
                    } catch (err) {
                      console.error('Save to client failed:', err);
                      setSaveError(err.message || 'Failed to save');
                    }
                  }} disabled={savedToClient}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: `1px solid ${savedToClient ? 'rgba(45,138,78,0.3)' : 'rgba(90,138,191,0.3)'}`, background: savedToClient ? 'rgba(45,138,78,0.08)' : 'rgba(90,138,191,0.08)', cursor: savedToClient ? 'default' : 'pointer', fontSize: '0.85rem', fontWeight: 600, color: savedToClient ? '#2d8a4e' : '#5a8abf' }}>
                    {savedToClient ? <><Check size={14} /> Saved to Client!</> : <><Save size={14} /> Save to Client Documents</>}
                  </button>
                )}
                {saveError && <span style={{ fontSize: '0.78rem', color: '#d14040' }}>{saveError}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalGenerator;
