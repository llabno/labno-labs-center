import { useState, useEffect, useMemo } from 'react';
import { FileText, Clock, Plus, CheckCircle, AlertTriangle, Activity, ChevronDown, ChevronRight, Search, Save, X, Zap, Send, Dumbbell, Mic, MicOff, Clipboard } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-logger';
import Breadcrumbs from '../components/Breadcrumbs';
import ClientHealthWidget from '../components/ClientHealthWidget';

// Voice-enabled textarea for SOAP dictation
const VoiceTextarea = ({ value, onChange, placeholder, rows = 3, borderColor = 'rgba(0,0,0,0.1)' }) => {
  const [listening, setListening] = useState(false);
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Voice not supported. Use Chrome.'); return; }
    if (listening) { setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      onChange(value ? value + ' ' + transcript : transcript);
    };
    rec.onend = () => setListening(false);
    rec.start(); setListening(true);
  };
  return (
    <div style={{ position: 'relative' }}>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: '100%', padding: '10px 36px 10px 10px', borderRadius: '8px', border: `1px solid ${listening ? '#d14040' : borderColor}`, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: listening ? 'rgba(209,64,64,0.02)' : 'transparent' }} />
      <button onClick={toggleVoice} title={listening ? 'Stop dictation' : 'Dictate'}
        style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', borderRadius: '4px', border: 'none', background: listening ? '#d14040' : 'rgba(0,0,0,0.04)', color: listening ? '#fff' : '#8a8682', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {listening ? <MicOff size={13} /> : <Mic size={13} />}
      </button>
    </div>
  );
};

// Maintenance session quick-fill templates
const MAINTENANCE_TEMPLATES = {
  mobility: {
    label: 'Joint Mobility Check',
    subjective: 'Patient reports maintaining current functional level. No new complaints.',
    objective: 'ROM assessed: within functional limits for ADLs. Joint mobility screening completed.',
    assessment: 'Maintenance phase — functional preservation. No regression noted.',
    plan: 'Continue current HEP. Focus on joint mobility and flexibility. Re-assess in 4 weeks.',
    exercises: 'Gentle ROM series, Chair stretches, Balance work, Walking program',
  },
  balance: {
    label: 'Balance & Fall Prevention',
    subjective: 'Patient reports feeling stable. Performing home exercises as prescribed.',
    objective: 'Balance assessment completed. Single leg stance, tandem walk, and functional reach tested.',
    assessment: 'Maintenance phase — balance preservation for fall prevention.',
    plan: 'Progress balance challenges as tolerated. Continue fall prevention exercises. Next session in 1 week.',
    exercises: 'Single leg stance, Tandem walking, Heel-to-toe, Step-ups, Weight shifts',
  },
  strength: {
    label: 'Functional Strength',
    subjective: 'Patient reports ability to perform daily tasks independently. Goals: maintain stair climbing, walking, transfers.',
    objective: 'Functional strength assessment. Sit-to-stand, stair negotiation, and grip strength measured.',
    assessment: 'Maintenance phase — functional strength preserved. Age-appropriate performance.',
    plan: 'Maintain current resistance program. Monitor for any decline. Celebrate functional wins.',
    exercises: 'Sit-to-stand, Mini squats, Wall push-ups, Resistance band rows, Step practice',
  },
};

const TIERS = ['Tier 1 (Resilience)', 'Tier 2 (Flow)', 'Tier 3 (New)', 'Reactivation'];
const TRACKS = ['01 Sanctuary', '02 Softening', '03 Blueprint', '04 Listening', '05 Unlearning', '06 Mirror', '07 Dance', '08 Sport', 'R1 Ground', 'R2 Ascent', 'R3 Anchor', 'R4 Horizon'];
const NS_STATES = [
  { value: 'Green', color: '#2d8a4e', bg: 'rgba(45,138,78,0.1)' },
  { value: 'Amber', color: '#c49a40', bg: 'rgba(196,154,64,0.1)' },
  { value: 'Red', color: '#d14040', bg: 'rgba(209,64,64,0.1)' },
];
const SESSION_TYPES = ['55min', '115min', '175min'];
const PROGRESS_OPTIONS = ['Progressing', 'Plateau', 'Regressing', 'New'];

// Renamed: Kylie → Concierge
const CONCIERGE_TASKS = ['Send follow-up email', 'Schedule next session', 'Send Habit Roadmap', 'Other'];
const MECHANIC_TASKS = ['Generate Habit Roadmap', 'Update Session Prep', 'Flag for clinical review', 'Other'];
const SNIPER_TASKS = ['Draft Clinical Pearl', 'Content idea flagged', 'None'];

// Dispatch agent tasks from Session Brief checkboxes
const dispatchAgentTasks = async (brief, briefId) => {
  const tasks = [];

  // Concierge tasks → create global_tasks assigned to 'Agent'
  for (const task of (brief.concierge_tasks || [])) {
    if (task === 'None') continue;
    tasks.push({
      title: `Concierge: ${task} — ${brief.client_name}`,
      description: `Auto-generated from Session Brief. Client: ${brief.client_name}, Tier: ${brief.tier}, State: ${brief.nervous_system_state}`,
      assigned_to: 'Agent',
      column_id: 'triage',
      source_type: 'session_brief',
      trigger_level: task === 'Send follow-up email' ? 'one-click' : 'guided',
    });
  }

  // Mechanic tasks
  for (const task of (brief.mechanic_tasks || [])) {
    if (task === 'None') continue;
    tasks.push({
      title: `Mechanic: ${task} — ${brief.client_name}`,
      description: `Auto-generated from Session Brief. Track: ${brief.track}, Win: ${brief.the_win || 'N/A'}, Friction: ${brief.the_friction || 'N/A'}`,
      assigned_to: 'Agent',
      column_id: 'triage',
      source_type: 'session_brief',
      trigger_level: task === 'Flag for clinical review' ? 'manual' : 'autonomous',
    });
  }

  // Sniper tasks
  for (const task of (brief.sniper_tasks || [])) {
    if (task === 'None') continue;
    tasks.push({
      title: `Sniper: ${task} — ${brief.client_name}`,
      description: `Auto-generated from Session Brief. Win: ${brief.the_win || 'N/A'}, One Thing: ${brief.the_one_thing || 'N/A'}`,
      assigned_to: 'Agent',
      column_id: 'triage',
      source_type: 'session_brief',
      trigger_level: 'autonomous',
    });
  }

  if (tasks.length > 0) {
    await supabase.from('global_tasks').insert(tasks);
    await logActivity('agent_tasks_created', {
      entityType: 'session_brief', entityId: briefId,
      entityName: `${brief.client_name} — ${tasks.length} tasks`,
      actor: 'System', details: { task_count: tasks.length, types: tasks.map(t => t.title) },
    });
  }

  return tasks.length;
};

const SOAPNotes = () => {
  const [briefs, setBriefs] = useState([]);
  const [soaps, setSoaps] = useState([]);
  const [clinicalLeads, setClinicalLeads] = useState([]); // from moso_clinical_leads
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('brief');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tasksCreated, setTasksCreated] = useState(0);

  // Exercise Library state
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseDropdownOpen, setExerciseDropdownOpen] = useState(false);

  // Session Brief form — "concierge_tasks" replaces "kylie_tasks"
  const [brief, setBrief] = useState({
    client_name: '', tier: TIERS[0], track: TRACKS[0],
    nervous_system_state: 'Green', session_type: '55min',
    the_win: '', the_one_thing: '', the_friction: '',
    concierge_tasks: [], mechanic_tasks: [], sniper_tasks: [],
  });

  // SOAP Note form — now with exercises
  const [soap, setSoap] = useState({
    client_name: '', session_date: new Date().toISOString().split('T')[0],
    subjective: '', objective: '', assessment: '', plan: '',
    cpt_codes: '', duration: '55', diagnosis: '',
    functional_goal: '', progress_to_goal: 'New', clinical_flags: '',
    exercises: '', // comma-separated exercise names
  });
  const [cptSuggesting, setCptSuggesting] = useState(false);
  const [cptSuggestion, setCptSuggestion] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const [briefRes, soapRes, leadsRes, exRes] = await Promise.all([
        supabase.from('session_briefs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('soap_notes').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('moso_clinical_leads').select('patient_name, id, status, tier, case_primary, body_region').order('patient_name'),
        supabase.from('exercise_library').select('*').order('name'),
      ]);
      setBriefs(briefRes.data || []);
      setSoaps(soapRes.data || []);
      setClinicalLeads(leadsRes.data || []);
      setExerciseLibrary(exRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const [clientSelected, setClientSelected] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Client name suggestions from clinical CRM — hidden once selected
  const clientSuggestions = useMemo(() => {
    if (clientSelected || !brief.client_name || brief.client_name.length < 2) return [];
    const q = brief.client_name.toLowerCase();
    return clinicalLeads.filter(l => (l.patient_name || '').toLowerCase().includes(q)).slice(0, 5);
  }, [brief.client_name, clinicalLeads, clientSelected]);

  // Filter exercises from library based on search
  const filteredExercises = useMemo(() => {
    if (!exerciseSearch || exerciseSearch.length < 1) return [];
    const q = exerciseSearch.toLowerCase();
    return exerciseLibrary
      .filter(ex => !selectedExercises.includes(ex.name))
      .filter(ex =>
        ex.name.toLowerCase().includes(q) ||
        (ex.category || '').toLowerCase().includes(q) ||
        (ex.body_region || '').toLowerCase().includes(q) ||
        (ex.movement_family || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [exerciseSearch, exerciseLibrary, selectedExercises]);

  const addExercise = (name) => {
    if (!selectedExercises.includes(name)) {
      const updated = [...selectedExercises, name];
      setSelectedExercises(updated);
      setSoap(p => ({ ...p, exercises: updated.join(', ') }));
    }
    setExerciseSearch('');
    setExerciseDropdownOpen(false);
  };

  const removeExercise = (name) => {
    const updated = selectedExercises.filter(e => e !== name);
    setSelectedExercises(updated);
    setSoap(p => ({ ...p, exercises: updated.join(', ') }));
  };

  const handleExerciseKeyDown = (e) => {
    if (e.key === 'Enter' && exerciseSearch.trim()) {
      e.preventDefault();
      addExercise(exerciseSearch.trim());
    }
  };

  const selectClient = (lead) => {
    setBrief(p => ({
      ...p,
      client_name: lead.patient_name,
      tier: lead.tier ? `Tier ${lead.tier} (${lead.tier === '1' || lead.tier === 1 ? 'Resilience' : lead.tier === '2' || lead.tier === 2 ? 'Flow' : 'New'})` : p.tier,
    }));
    setClientSelected(true);
    setSelectedLeadId(lead.id);
  };

  const saveBrief = async () => {
    if (!brief.client_name.trim()) return;
    setSaving(true);
    const insertData = {
      client_name: brief.client_name,
      tier: brief.tier, track: brief.track,
      nervous_system_state: brief.nervous_system_state,
      session_type: brief.session_type,
      the_win: brief.the_win, the_one_thing: brief.the_one_thing, the_friction: brief.the_friction,
      kylie_tasks: brief.concierge_tasks, // DB column is still kylie_tasks
      mechanic_tasks: brief.mechanic_tasks,
      sniper_tasks: brief.sniper_tasks,
      session_date: new Date().toISOString().split('T')[0],
    };
    const { data, error } = await supabase.from('session_briefs').insert(insertData).select();
    if (!error && data?.[0]) {
      // Dispatch agent tasks from checked boxes
      const count = await dispatchAgentTasks(brief, data[0].id);
      setTasksCreated(count);

      // Update last_visit_date on clinical lead
      const matchingLead = clinicalLeads.find(l => l.patient_name === brief.client_name);
      if (matchingLead) {
        await supabase.from('moso_clinical_leads').update({
          last_visit_date: new Date().toISOString().split('T')[0],
          total_visits: (matchingLead.total_visits || 0) + 1,
        }).eq('id', matchingLead.id);
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); setTasksCreated(0); }, 3000);
      setBrief({ client_name: '', tier: TIERS[0], track: TRACKS[0], nervous_system_state: 'Green', session_type: '55min', the_win: '', the_one_thing: '', the_friction: '', concierge_tasks: [], mechanic_tasks: [], sniper_tasks: [] });
      setSoap(prev => ({ ...prev, client_name: brief.client_name }));
      setActiveTab('soap');
      const { data: newBriefs } = await supabase.from('session_briefs').select('*').order('created_at', { ascending: false }).limit(50);
      setBriefs(newBriefs || []);
    }
    setSaving(false);
  };

  const saveSoap = async () => {
    if (!soap.client_name.trim() || !soap.subjective.trim()) return;
    setSaving(true);
    const matchingBrief = briefs.find(b => b.client_name === soap.client_name && b.session_date === soap.session_date);
    const { error } = await supabase.from('soap_notes').insert({
      client_name: soap.client_name, session_date: soap.session_date,
      subjective: soap.subjective, objective: soap.objective,
      assessment: soap.assessment, plan: soap.plan,
      cpt_codes: soap.cpt_codes, duration: soap.duration,
      diagnosis: soap.diagnosis, functional_goal: soap.functional_goal,
      progress_to_goal: soap.progress_to_goal, clinical_flags: soap.clinical_flags,
      exercises: soap.exercises || null,
      session_brief_id: matchingBrief?.id || null,
    });
    if (!error) {
      setSaved(true);

      // Auto-generate superbill if CPT codes were provided
      if (soap.cpt_codes.trim()) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          // Get the just-saved SOAP note ID
          const { data: latestSoap } = await supabase.from('soap_notes')
            .select('id')
            .eq('client_name', soap.client_name)
            .eq('session_date', soap.session_date)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestSoap?.id) {
            fetch('/api/billing/superbill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession?.access_token || ''}` },
              body: JSON.stringify({ soap_note_id: latestSoap.id }),
            }).catch(() => {}); // fire and forget
          }
        } catch {} // non-blocking
      }

      setTimeout(() => setSaved(false), 2000);
      setSoap({ client_name: '', session_date: new Date().toISOString().split('T')[0], subjective: '', objective: '', assessment: '', plan: '', cpt_codes: '', duration: '55', diagnosis: '', functional_goal: '', progress_to_goal: 'New', clinical_flags: '', exercises: '' });
      setSelectedExercises([]);
      setExerciseSearch('');
      const { data } = await supabase.from('soap_notes').select('*').order('created_at', { ascending: false }).limit(50);
      setSoaps(data || []);
    }
    setSaving(false);
  };

  const toggleCheckbox = (field, value, setter) => {
    setter(prev => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading...</div>;

  const filteredHistory = [...briefs.map(b => ({ ...b, _type: 'brief' })), ...soaps.map(s => ({ ...s, _type: 'soap' }))]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .filter(item => !searchQuery || (item.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />

      {clientSelected && brief.client_name && (
        <ClientHealthWidget clientName={brief.client_name} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={24} color="#b06050" /> Clinical Session Log <InfoTooltip text={PAGE_INFO.soap} />
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.82rem' }}>{briefs.length} session briefs &middot; {soaps.length} SOAP notes &middot; {clinicalLeads.length} clients in CRM</p>
        </div>
      </div>

      {/* HIPAA Voice Dictation Notice */}
      <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)', fontSize: '0.72rem', color: '#6b6764', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Mic size={13} color="#2d8a4e" />
        <span><strong style={{ color: '#2d8a4e' }}>Voice Dictation:</strong> The mic button on SOAP fields uses your browser's speech recognition. For HIPAA compliance, use <strong>Wispr Flow Enterprise</strong> (HIPAA-compliant, BAA available) for dictation, then paste into the fields. Browser speech-to-text sends audio to Google/Apple servers which is NOT HIPAA compliant without a BAA.</span>
      </div>

      {/* Summary Cards */}
      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'This Week', value: briefs.filter(b => new Date(b.created_at) > new Date(Date.now() - 7 * 86400000)).length, color: '#5a8abf', icon: Clock },
          { label: 'Green State', value: briefs.filter(b => b.nervous_system_state === 'Green').length, color: '#2d8a4e', icon: CheckCircle },
          { label: 'Amber/Red', value: briefs.filter(b => ['Amber', 'Red'].includes(b.nervous_system_state)).length, color: '#c49a40', icon: AlertTriangle },
          { label: 'Pending Billing', value: soaps.filter(s => s.billing_status === 'pending').length, color: '#b06050', icon: FileText },
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {[
          { key: 'brief', label: 'Session Brief', desc: '90 seconds' },
          { key: 'soap', label: 'SOAP Note', desc: '3 minutes' },
          { key: 'history', label: 'History', desc: `${filteredHistory.length} records` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 18px', fontSize: '0.88rem', fontWeight: activeTab === tab.key ? 600 : 500,
            color: activeTab === tab.key ? '#b06050' : '#6b6764', background: 'none', border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid #b06050' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-1px',
          }}>
            {tab.label} <span style={{ fontSize: '0.65rem', color: '#8a8682' }}>({tab.desc})</span>
          </button>
        ))}
      </div>

      {/* Session Brief Form */}
      {activeTab === 'brief' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Client Name * <span style={{ fontSize: '0.65rem', color: '#8a8682', fontWeight: 400 }}>(from CRM)</span></label>
              <input type="text" value={brief.client_name} onChange={e => { setBrief(p => ({ ...p, client_name: e.target.value })); setClientSelected(false); }} placeholder="Start typing..." style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.88rem', boxSizing: 'border-box' }} />
              {clientSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', borderRadius: '0 0 8px 8px', border: '1px solid rgba(0,0,0,0.15)', borderTop: 'none', zIndex: 9999, maxHeight: '200px', overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  {clientSuggestions.map(lead => (
                    <div key={lead.id} onClick={(e) => { e.stopPropagation(); selectClient(lead); }}
                      style={{ padding: '12px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', userSelect: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0eeec'} onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                      <span style={{ fontWeight: 600, color: '#2e2c2a' }}>{lead.patient_name}</span>
                      <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{lead.case_primary || ''} {lead.body_region ? `· ${lead.body_region}` : ''} — {lead.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Tier</label>
              <select value={brief.tier} onChange={e => setBrief(p => ({ ...p, tier: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Track</label>
              <select value={brief.track} onChange={e => setBrief(p => ({ ...p, track: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Session Type</label>
              <select value={brief.session_type} onChange={e => setBrief(p => ({ ...p, session_type: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Last Visit Summary + Session Suggestions — shows when client is selected */}
          {clientSelected && (() => {
            const lastBrief = briefs.find(b => b.client_name === brief.client_name);
            const lastSoap = soaps.find(s => s.client_name === brief.client_name);
            const lead = clinicalLeads.find(l => l.id === selectedLeadId);
            if (!lastBrief && !lastSoap) return null;

            // Generate suggestions based on last visit data
            const suggestions = [];
            if (lastBrief?.nervous_system_state === 'Red') suggestions.push('Start with grounding/co-regulation — last session was Red state');
            else if (lastBrief?.nervous_system_state === 'Amber') suggestions.push('Check in on regulation before loading — last session was Amber');
            if (lastBrief?.the_friction) suggestions.push(`Follow up on friction: "${lastBrief.the_friction}"`);
            if (lastBrief?.the_one_thing) suggestions.push(`Build on: "${lastBrief.the_one_thing}"`);
            if (lastSoap?.progress_to_goal === 'Plateau') suggestions.push('Consider adjusting approach — client was at plateau');
            if (lastSoap?.progress_to_goal === 'Regressing') suggestions.push('Priority: assess regression cause before progressing');
            if (lastSoap?.clinical_flags) suggestions.push(`Review clinical flag: ${lastSoap.clinical_flags}`);

            // Track-based suggestions
            const trackNum = parseInt(brief.track);
            if (trackNum <= 2) suggestions.push('Early track — focus on safety, trust, and co-regulation');
            else if (trackNum <= 4) suggestions.push('Mid track — can introduce more complexity and autonomy');
            else if (trackNum >= 7) suggestions.push('Advanced track — high autonomy, sport/performance focus');

            // Tier-based
            if (brief.tier.includes('Reactivation')) suggestions.push('Reactivation client — re-establish rapport, assess current baseline');
            if (brief.tier.includes('Tier 3')) suggestions.push('New client — extra time for education and expectation setting');

            // Maintenance/age-related
            if (lead && (lead.case_primary || '').toLowerCase().includes('maint')) suggestions.push('Maintenance program — focus on functional preservation, not progression');

            return (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(90,138,191,0.04)', border: '1px solid rgba(90,138,191,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Last Visit */}
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5a8abf', textTransform: 'uppercase', marginBottom: '6px' }}>Last Visit ({lastBrief ? formatDate(lastBrief.session_date) : formatDate(lastSoap?.session_date)})</div>
                    {lastBrief && (
                      <div style={{ fontSize: '0.78rem', color: '#3e3c3a', lineHeight: 1.5 }}>
                        <div>State: <strong style={{ color: NS_STATES.find(n => n.value === lastBrief.nervous_system_state)?.color }}>{lastBrief.nervous_system_state}</strong> &middot; Track: {lastBrief.track} &middot; {lastBrief.session_type}</div>
                        {lastBrief.the_win && <div style={{ color: '#2d8a4e' }}>Win: {lastBrief.the_win}</div>}
                        {lastBrief.the_friction && <div style={{ color: '#c49a40' }}>Friction: {lastBrief.the_friction}</div>}
                        {lastBrief.the_one_thing && <div style={{ color: '#5a8abf' }}>Carry forward: {lastBrief.the_one_thing}</div>}
                      </div>
                    )}
                    {lastSoap && (
                      <div style={{ fontSize: '0.75rem', color: '#6b6764', marginTop: '4px' }}>
                        {lastSoap.progress_to_goal && <span>Progress: <strong>{lastSoap.progress_to_goal}</strong></span>}
                        {lastSoap.exercises && <div style={{ marginTop: '2px' }}>Exercises: {lastSoap.exercises}</div>}
                      </div>
                    )}
                  </div>

                  {/* Suggestions for Today */}
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b06050', textTransform: 'uppercase', marginBottom: '6px' }}>Suggested Focus Today</div>
                    {suggestions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {suggestions.slice(0, 5).map((s, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: '#3e3c3a', padding: '3px 0', display: 'flex', gap: '6px' }}>
                            <span style={{ color: '#b06050', fontWeight: 600 }}>{i + 1}.</span> {s}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#8a8682' }}>No prior data — first session with this client.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* NS State */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '6px' }}>Nervous System State</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {NS_STATES.map(ns => (
                <button key={ns.value} onClick={() => setBrief(p => ({ ...p, nervous_system_state: ns.value }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: brief.nervous_system_state === ns.value ? `2px solid ${ns.color}` : '1px solid rgba(0,0,0,0.08)', background: brief.nervous_system_state === ns.value ? ns.bg : 'rgba(255,255,255,0.5)', color: ns.color, fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', textAlign: 'center' }}>
                  {ns.value}
                </button>
              ))}
            </div>
          </div>

          {/* The Win / One Thing / Friction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { key: 'the_win', label: 'The Win', placeholder: 'What went well today?', color: '#2d8a4e' },
              { key: 'the_one_thing', label: 'The One Thing', placeholder: 'One thing to carry forward', color: '#5a8abf' },
              { key: 'the_friction', label: 'The Friction', placeholder: 'What was hard or stuck?', color: '#c49a40' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: f.color, display: 'block', marginBottom: '4px' }}>{f.label}</label>
                <input type="text" value={brief[f.key]} onChange={e => setBrief(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${f.color}30`, fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {/* Agent Tasks — checkboxes that CREATE real tasks */}
          <div style={{ marginBottom: '8px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(156,39,176,0.04)', border: '1px solid rgba(156,39,176,0.08)', fontSize: '0.72rem', color: '#9c27b0' }}>
            <Zap size={11} style={{ marginRight: '4px' }} /> Checked tasks auto-create assignments in Task Queue when you save the brief.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { key: 'concierge_tasks', label: 'Concierge Tasks', options: CONCIERGE_TASKS, color: '#9c27b0' },
              { key: 'mechanic_tasks', label: 'Mechanic Tasks', options: MECHANIC_TASKS, color: '#e65100' },
              { key: 'sniper_tasks', label: 'Sniper Tasks', options: SNIPER_TASKS, color: '#1565c0' },
            ].map(g => (
              <div key={g.key}>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: g.color, display: 'block', marginBottom: '4px' }}>{g.label}</label>
                {g.options.map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#3e3c3a', marginBottom: '3px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(brief[g.key] || []).includes(opt)} onChange={() => toggleCheckbox(g.key, opt, setBrief)} />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <button onClick={saveBrief} disabled={!brief.client_name.trim() || saving} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saved ? <><CheckCircle size={16} /> Logged! {tasksCreated > 0 ? `${tasksCreated} tasks created.` : ''} Moving to SOAP...</> : saving ? 'Saving...' : <><Save size={16} /> Log Session Brief (90 sec)</>}
          </button>
        </div>
      )}

      {/* SOAP Note Form */}
      {activeTab === 'soap' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Client Name *</label>
              <input type="text" value={soap.client_name} onChange={e => setSoap(p => ({ ...p, client_name: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.88rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Session Date</label>
              <input type="date" value={soap.session_date} onChange={e => setSoap(p => ({ ...p, session_date: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Duration</label>
              <select value={soap.duration} onChange={e => setSoap(p => ({ ...p, duration: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                {SESSION_TYPES.map(t => <option key={t} value={t.replace('min', '')}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Progress</label>
              <select value={soap.progress_to_goal} onChange={e => setSoap(p => ({ ...p, progress_to_goal: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                {PROGRESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Maintenance Quick-Fill Templates */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682' }}>Quick-fill:</span>
              {Object.entries(MAINTENANCE_TEMPLATES).map(([key, tmpl]) => (
                <button key={key} onClick={() => {
                  const exNames = tmpl.exercises.split(',').map(s => s.trim()).filter(Boolean);
                  setSelectedExercises(exNames);
                  setSoap(p => ({
                    ...p, subjective: tmpl.subjective, objective: tmpl.objective,
                    assessment: tmpl.assessment, plan: tmpl.plan, exercises: tmpl.exercises,
                  }));
                }} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)', color: '#6b6764', cursor: 'pointer' }}>
                  <Clipboard size={10} style={{ marginRight: '3px' }} />{tmpl.label}
                </button>
              ))}
              <span style={{ fontSize: '0.62rem', color: '#aaa' }}>For maintenance clients — customize after filling</span>
            </div>
          </div>

          {/* SOAP Fields with Voice Dictation */}
          {[
            { key: 'subjective', label: 'S — Subjective', placeholder: 'What the patient reported... (click mic to dictate)', color: '#5a8abf' },
            { key: 'objective', label: 'O — Objective', placeholder: 'What you found/measured... (click mic to dictate)', color: '#2d8a4e' },
            { key: 'assessment', label: 'A — Assessment', placeholder: 'Your clinical reasoning... (click mic to dictate)', color: '#c49a40' },
            { key: 'plan', label: 'P — Plan', placeholder: 'Next session plan + home program... (click mic to dictate)', color: '#b06050' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: f.color, display: 'block', marginBottom: '4px' }}>{f.label} *</label>
              <VoiceTextarea value={soap[f.key]} onChange={v => setSoap(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} rows={3} borderColor={f.color + '30'} />
            </div>
          ))}

          {/* Exercise Tracking — Library-linked picker */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e65100', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Dumbbell size={14} /> Exercises Prescribed
            </label>

            {/* Selected exercise chips */}
            {selectedExercises.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {selectedExercises.map(name => {
                  const libEntry = exerciseLibrary.find(ex => ex.name === name);
                  return (
                    <span key={name} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                      borderRadius: '16px', fontSize: '0.78rem', fontWeight: 500,
                      background: libEntry ? 'rgba(230,81,0,0.08)' : 'rgba(0,0,0,0.04)',
                      border: libEntry ? '1px solid rgba(230,81,0,0.2)' : '1px solid rgba(0,0,0,0.1)',
                      color: libEntry ? '#e65100' : '#3e3c3a',
                    }}>
                      {name}
                      {libEntry && <span style={{ fontSize: '0.6rem', color: '#8a8682', marginLeft: '2px' }}>{libEntry.category}</span>}
                      <button onClick={() => removeExercise(name)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px',
                        color: '#8a8682', display: 'flex', alignItems: 'center',
                      }}><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search input with dropdown */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8682' }} />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={e => { setExerciseSearch(e.target.value); setExerciseDropdownOpen(true); }}
                  onFocus={() => setExerciseDropdownOpen(true)}
                  onKeyDown={handleExerciseKeyDown}
                  placeholder="Search exercises or type custom (Enter to add)..."
                  style={{
                    width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px',
                    border: '1px solid rgba(230,81,0,0.2)', fontSize: '0.85rem',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Dropdown results */}
              {exerciseDropdownOpen && exerciseSearch.length >= 1 && (filteredExercises.length > 0 || exerciseSearch.trim()) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                  background: '#ffffff', borderRadius: '0 0 8px 8px',
                  border: '1px solid rgba(0,0,0,0.15)', borderTop: 'none',
                  maxHeight: '220px', overflow: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  {filteredExercises.map(ex => (
                    <div key={ex.id} onClick={() => addExercise(ex.name)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: '0.82rem',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0eeec'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                      <span style={{ fontWeight: 600, color: '#2e2c2a' }}>{ex.name}</span>
                      <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>
                        {ex.category} {ex.body_region ? `· ${ex.body_region}` : ''} {ex.difficulty ? `· ${ex.difficulty}` : ''}
                      </span>
                    </div>
                  ))}
                  {/* Free-text option when no exact match */}
                  {exerciseSearch.trim() && !exerciseLibrary.some(ex => ex.name.toLowerCase() === exerciseSearch.trim().toLowerCase()) && (
                    <div onClick={() => addExercise(exerciseSearch.trim())}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: '0.82rem',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(90,138,191,0.04)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,138,191,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(90,138,191,0.04)'}>
                      <Plus size={13} color="#5a8abf" />
                      <span style={{ color: '#5a8abf', fontWeight: 600 }}>Add custom: "{exerciseSearch.trim()}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Free-form notes fallback */}
            <textarea value={soap.exercises} onChange={e => setSoap(p => ({ ...p, exercises: e.target.value }))}
              placeholder="Free-form exercise notes (auto-populated from picker above, or type directly)..."
              rows={2} style={{
                width: '100%', padding: '10px', borderRadius: '8px', marginTop: '8px',
                border: '1px solid rgba(230,81,0,0.1)', fontSize: '0.8rem',
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                background: 'rgba(0,0,0,0.01)', color: '#6b6764',
              }} />
            <p style={{ fontSize: '0.65rem', color: '#8a8682', marginTop: '4px' }}>
              Search the Exercise Library above or type custom exercises. Press Enter to add free-text entries. The text field below is auto-populated and can also be edited directly.
            </p>
          </div>

          {/* Billing & Diagnosis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>CPT Codes</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" value={soap.cpt_codes} onChange={e => { setSoap(p => ({ ...p, cpt_codes: e.target.value })); setCptSuggestion(null); }} placeholder="97110, 97140, 97530" style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                <button
                  onClick={async () => {
                    setCptSuggesting(true); setCptSuggestion(null);
                    try {
                      // If we have a saved SOAP note ID, use the API. Otherwise use the form data to suggest locally.
                      const { data: { session: authSession } } = await supabase.auth.getSession();
                      // Build a temporary body with current form data for suggestion
                      const body = soap.cpt_codes
                        ? { soap_note_id: 'preview', cpt_codes: soap.cpt_codes, duration: soap.duration }
                        : { soap_note_id: 'preview', subjective: soap.subjective, objective: soap.objective, assessment: soap.assessment, plan: soap.plan, duration: soap.duration, exercises: soap.exercises };
                      const res = await fetch('/api/billing/auto-cpt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession?.access_token || ''}` },
                        body: JSON.stringify(body),
                      });
                      const data = await res.json();
                      if (data.success && data.suggested_codes) {
                        setCptSuggestion(data);
                        // Auto-fill CPT codes
                        const codes = data.suggested_codes.map(c => c.code).join(', ');
                        setSoap(p => ({ ...p, cpt_codes: codes }));
                      } else {
                        setCptSuggestion({ error: data.error || 'No suggestions returned' });
                      }
                    } catch (err) {
                      setCptSuggestion({ error: err.message });
                    }
                    setCptSuggesting(false);
                  }}
                  disabled={cptSuggesting || (!soap.subjective && !soap.objective && !soap.cpt_codes)}
                  title="AI suggests CPT codes based on your SOAP note content"
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(45,138,78,0.3)', background: 'rgba(45,138,78,0.08)', color: '#2d8a4e', cursor: cptSuggesting ? 'wait' : 'pointer', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', opacity: cptSuggesting ? 0.6 : 1 }}
                >
                  {cptSuggesting ? '...' : 'Suggest'}
                </button>
              </div>
              {cptSuggestion && !cptSuggestion.error && (
                <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(45,138,78,0.06)', border: '1px solid rgba(45,138,78,0.12)', fontSize: '0.72rem' }}>
                  <div style={{ fontWeight: 600, color: '#2d8a4e', marginBottom: '4px' }}>
                    AI Suggestion: {cptSuggestion.total_units} units · ${cptSuggestion.total_amount}
                    {cptSuggestion.source === 'ai_suggested' && <span style={{ color: '#c49a40', marginLeft: '6px' }}>Review before submitting</span>}
                  </div>
                  {cptSuggestion.suggested_codes.map(c => (
                    <div key={c.code} style={{ color: '#3e3c3a', display: 'flex', gap: '8px' }}>
                      <strong>{c.code}</strong> {c.description} · {c.units} unit{c.units !== 1 ? 's' : ''} · {c.minutes}min · ${c.amount}
                    </div>
                  ))}
                </div>
              )}
              {cptSuggestion?.error && (
                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#d14040' }}>{cptSuggestion.error}</div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Diagnosis (ICD-10)</label>
              <input type="text" value={soap.diagnosis} onChange={e => setSoap(p => ({ ...p, diagnosis: e.target.value }))} placeholder="M54.5" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Functional Goal</label>
              <input type="text" value={soap.functional_goal} onChange={e => setSoap(p => ({ ...p, functional_goal: e.target.value }))} placeholder="Current treatment goal" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d14040', display: 'block', marginBottom: '4px' }}>Clinical Flags (if any)</label>
            <input type="text" value={soap.clinical_flags} onChange={e => setSoap(p => ({ ...p, clinical_flags: e.target.value }))} placeholder="Anything requiring Yellow/Red escalation?" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(209,64,64,0.15)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>

          <button onClick={saveSoap} disabled={!soap.client_name.trim() || !soap.subjective.trim() || saving} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saved ? <><CheckCircle size={16} /> SOAP Documented!</> : saving ? 'Saving...' : <><Save size={16} /> Save SOAP Note (3 min)</>}
          </button>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div>
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8a8682' }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by client name..." style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.88rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredHistory.map(item => (
              <div key={item.id} className="glass-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: item._type === 'brief' ? 'rgba(90,138,191,0.1)' : 'rgba(176,96,80,0.1)', color: item._type === 'brief' ? '#5a8abf' : '#b06050' }}>
                  {item._type === 'brief' ? 'Brief' : 'SOAP'}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a' }}>{item.client_name}</span>
                {item.nervous_system_state && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: NS_STATES.find(n => n.value === item.nervous_system_state)?.bg || 'rgba(0,0,0,0.04)', color: NS_STATES.find(n => n.value === item.nervous_system_state)?.color || '#8a8682' }}>
                    {item.nervous_system_state}
                  </span>
                )}
                {item.progress_to_goal && <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>{item.progress_to_goal}</span>}
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#8a8682' }}>
                  {formatDate(item.session_date || item.created_at)}
                </span>
                {item.billing_status === 'pending' && <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#c49a40' }}>Billing pending</span>}
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <p style={{ color: '#8a8682', textAlign: 'center', padding: '2rem', fontSize: '0.88rem' }}>No records yet. Start by logging a Session Brief.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOAPNotes;
