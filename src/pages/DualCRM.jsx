import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, Briefcase, Plus, Filter, Search, X, ChevronDown, ChevronUp, ArrowRight, Phone, Mail, MapPin, Activity, DollarSign, Calendar, Tag, Download, TrendingUp, TrendingDown, Star, Columns, Save, Eye, MoreHorizontal, Check, Copy, Clock, MessageSquare, AlertTriangle, UserCheck, Clipboard } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Status pipeline stages
const MOSO_STATUSES = ['Active', 'Reactivation', 'Waitlist', 'Inactive', 'Referred Out', 'PITA-DNC'];
const MOSO_STATUS_COLORS = {
  'Active': { bg: '#e8f5e9', color: '#2e7d32', dot: '#4caf50' },
  'Reactivation': { bg: '#fff3e0', color: '#e65100', dot: '#ff9800' },
  'Waitlist': { bg: '#e3f2fd', color: '#1565c0', dot: '#2196f3' },
  'Inactive': { bg: '#f5f5f5', color: '#666', dot: '#9e9e9e' },
  'Referred Out': { bg: '#fce4ec', color: '#c62828', dot: '#ef5350' },
  'PITA-DNC': { bg: '#ffebee', color: '#b71c1c', dot: '#d32f2f' },
};

const LABNO_STATUSES = ['New Lead', 'Qualified', 'Proposal', 'Active Client', 'Inactive', 'Referred Out'];
const LABNO_STATUS_COLORS = {
  'New Lead': { bg: '#e3f2fd', color: '#1565c0', dot: '#2196f3' },
  'Qualified': { bg: '#fff3e0', color: '#e65100', dot: '#ff9800' },
  'Proposal': { bg: '#f3e5f5', color: '#7b1fa2', dot: '#9c27b0' },
  'Active Client': { bg: '#e8f5e9', color: '#2e7d32', dot: '#4caf50' },
  'Inactive': { bg: '#f5f5f5', color: '#666', dot: '#9e9e9e' },
  'Referred Out': { bg: '#fce4ec', color: '#c62828', dot: '#ef5350' },
};

const PAGE_SIZE = 50;

// Pipeline goals (hardcoded targets)
const PIPELINE_GOALS = {
  moso: { 'Active': 150, 'Reactivation': 50, 'Waitlist': 10 },
  labno: { 'Active Client': 20, 'Qualified': 15, 'Proposal': 10 },
};

// Urgency thresholds — stages that pulse when count exceeds threshold
const URGENCY_THRESHOLDS = {
  moso: { 'Waitlist': 5, 'Reactivation': 50 },
  labno: {},
};

// Format dollar amounts compactly: $12,500 → "$12.5K"
const fmtDollars = (n) => {
  if (n == null || isNaN(n)) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};

// Pulse animation CSS (injected once)
const pulseStyleId = 'crm-pulse-style';
if (typeof document !== 'undefined' && !document.getElementById(pulseStyleId)) {
  const style = document.createElement('style');
  style.id = pulseStyleId;
  style.textContent = `
    @keyframes urgencyPulse {
      0% { box-shadow: 0 0 0 0 rgba(211,47,47,0.25); }
      50% { box-shadow: 0 0 0 6px rgba(211,47,47,0.08); }
      100% { box-shadow: 0 0 0 0 rgba(211,47,47,0); }
    }
  `;
  document.head.appendChild(style);
}

const DualCRM = () => {
  const [activeTab, setActiveTab] = useState('moso');
  const [viewMode, setViewMode] = useState('pipeline'); // pipeline | table | detail

  // Data
  const [clinicalLeads, setClinicalLeads] = useState([]);
  const [consultingLeads, setConsultingLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [sortField, setSortField] = useState('patient_name');
  const [sortDir, setSortDir] = useState('asc');

  // Detail view
  const [selectedLead, setSelectedLead] = useState(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClinical, setNewClinical] = useState({ patient_name: '', email: '', condition_notes: '', status: 'Active' });
  const [newConsulting, setNewConsulting] = useState({ company_name: '', email: '', app_interest: '', lifetime_value: 0 });

  // Pagination
  const [page, setPage] = useState(0);

  // Detail card enhancements
  const [activityNotes, setActivityNotes] = useState({}); // { [leadId]: [{text, timestamp}] }
  const [commLogs, setCommLogs] = useState({}); // { [leadId]: [{type, description, timestamp}] }
  const [appointments, setAppointments] = useState({}); // { [leadId]: dateString }
  const [relatedLeads, setRelatedLeads] = useState([]);
  const [similarLeads, setSimilarLeads] = useState([]);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [newActivityNote, setNewActivityNote] = useState('');
  const [newCommType, setNewCommType] = useState('Email');
  const [newCommDesc, setNewCommDesc] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const [clinical, consulting] = await Promise.all([
      supabase.from('moso_clinical_leads').select('*').order('patient_name', { ascending: true }),
      supabase.from('labno_consulting_leads').select('*').order('created_at', { ascending: false }),
    ]);
    if (clinical.error) setError(clinical.error.message);
    else setClinicalLeads(clinical.data || []);
    if (consulting.error && !error) setError(consulting.error.message);
    else setConsultingLeads(consulting.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(0); setSelectedLead(null); }, [activeTab, searchQuery, statusFilter, tierFilter]);

  // Fetch related leads (same referred_by) and similar leads (same case_primary + body_region) when detail opens
  useEffect(() => {
    if (!selectedLead) { setRelatedLeads([]); setSimilarLeads([]); setQuickNoteText(''); setExportCopied(false); return; }
    const isMoso = activeTab === 'moso';
    const table = isMoso ? 'moso_clinical_leads' : 'labno_consulting_leads';

    // Related leads by referred_by
    if (selectedLead.referred_by) {
      supabase.from(table).select('*')
        .eq('referred_by', selectedLead.referred_by)
        .neq('id', selectedLead.id)
        .limit(5)
        .then(({ data }) => setRelatedLeads(data || []));
    } else {
      setRelatedLeads([]);
    }

    // Similar patients (MOSO only) — same case_primary AND body_region
    if (isMoso && selectedLead.case_primary && selectedLead.body_region) {
      supabase.from('moso_clinical_leads').select('*')
        .eq('case_primary', selectedLead.case_primary)
        .eq('body_region', selectedLead.body_region)
        .neq('id', selectedLead.id)
        .limit(3)
        .then(({ data }) => setSimilarLeads(data || []));
    } else {
      setSimilarLeads([]);
    }
  }, [selectedLead?.id, activeTab]);

  // Filtered + sorted data
  const filteredLeads = useMemo(() => {
    const leads = activeTab === 'moso' ? clinicalLeads : consultingLeads;
    let filtered = leads.filter(l => {
      const q = searchQuery.toLowerCase();
      if (q) {
        const searchable = activeTab === 'moso'
          ? `${l.patient_name} ${l.email} ${l.case_primary} ${l.body_region} ${l.referred_by} ${l.city} ${l.notes_clinical}`.toLowerCase()
          : `${l.company_name || l.first_name} ${l.email} ${l.app_interest} ${l.contact_type}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (statusFilter !== 'All') {
        const status = activeTab === 'moso' ? l.status : (l.client_status || 'Inactive');
        if (status !== statusFilter) return false;
      }
      if (activeTab === 'moso' && tierFilter !== 'All') {
        if ((l.tier || 'None') !== tierFilter) return false;
      }
      return true;
    });
    // Sort
    filtered.sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return filtered;
  }, [activeTab, clinicalLeads, consultingLeads, searchQuery, statusFilter, tierFilter, sortField, sortDir]);

  const paginatedLeads = filteredLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const leads = activeTab === 'moso' ? clinicalLeads : consultingLeads;
    const statuses = activeTab === 'moso' ? MOSO_STATUSES : LABNO_STATUSES;
    const counts = {};
    statuses.forEach(s => { counts[s] = 0; });
    leads.forEach(l => {
      const status = activeTab === 'moso' ? l.status : (l.client_status || 'Inactive');
      if (counts[status] !== undefined) counts[status]++;
      else counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [activeTab, clinicalLeads, consultingLeads]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleAddClinical = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('moso_clinical_leads').insert([newClinical]);
    if (error) setError(error.message);
    else { setNewClinical({ patient_name: '', email: '', condition_notes: '', status: 'Active' }); setShowForm(false); await fetchData(); }
    setSubmitting(false);
  };

  const handleAddConsulting = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('labno_consulting_leads').insert([{ ...newConsulting, lifetime_value: parseFloat(newConsulting.lifetime_value) || 0 }]);
    if (error) setError(error.message);
    else { setNewConsulting({ company_name: '', email: '', app_interest: '', lifetime_value: 0 }); setShowForm(false); await fetchData(); }
    setSubmitting(false);
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    const table = activeTab === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';
    const field = activeTab === 'moso' ? 'status' : 'client_status';
    const { error } = await supabase.from(table).update({ [field]: newStatus }).eq('id', leadId);
    if (!error) {
      await fetchData();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, [field]: newStatus }));
      }
    }
  };

  const StatusBadge = ({ status, type = 'moso' }) => {
    const colors = type === 'moso' ? MOSO_STATUS_COLORS : LABNO_STATUS_COLORS;
    const c = colors[status] || { bg: '#f5f5f5', color: '#666', dot: '#9e9e9e' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, background: c.bg, color: c.color }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }}></span>
        {status}
      </span>
    );
  };

  // Pipeline View
  const renderPipeline = () => {
    const statuses = activeTab === 'moso' ? MOSO_STATUSES : LABNO_STATUSES;
    const colors = activeTab === 'moso' ? MOSO_STATUS_COLORS : LABNO_STATUS_COLORS;
    return (
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {statuses.map(status => {
          const c = colors[status] || {};
          const count = pipelineCounts[status] || 0;
          const isActive = statusFilter === status;
          return (
            <div key={status} onClick={() => setStatusFilter(isActive ? 'All' : status)}
              className="glass-panel" style={{
                minWidth: '150px', flex: 1, padding: '1rem', cursor: 'pointer',
                borderTop: `3px solid ${c.dot || '#ccc'}`,
                background: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                transform: isActive ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
              }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: c.color || '#444' }}>{count}</div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>{status}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Detail Card
  const renderDetailCard = () => {
    if (!selectedLead) return null;
    const lead = selectedLead;
    const isMoso = activeTab === 'moso';
    const statuses = isMoso ? MOSO_STATUSES : LABNO_STATUSES;

    return (
      <div style={{ position: 'fixed', top: 0, right: 0, width: '480px', height: '100vh', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', boxShadow: '-4px 0 30px rgba(0,0,0,0.1)', zIndex: 2000, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#2e2c2a', fontWeight: 700 }}>
            {isMoso ? lead.patient_name : (lead.company_name || `${lead.first_name} ${lead.last_name}`)}
          </h2>
          <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} color="#666" /></button>
        </div>

        {/* Status with change dropdown */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <StatusBadge status={isMoso ? lead.status : (lead.client_status || 'Inactive')} type={activeTab} />
            <ArrowRight size={14} color="#999" />
            <select value="" onChange={(e) => { if (e.target.value) updateLeadStatus(lead.id, e.target.value); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', color: '#666', background: 'rgba(255,255,255,0.8)' }}>
              <option value="">Move to...</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Contact</h4>
          {lead.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Mail size={14} color="#b06050" /> {lead.email}</div>}
          {lead.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Phone size={14} color="#b06050" /> {lead.phone}</div>}
          {lead.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Phone size={14} color="#b06050" /> {lead.mobile} (mobile)</div>}
          {(lead.city || lead.state || lead.zip) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}><MapPin size={14} color="#b06050" /> {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}</div>
          )}
        </div>

        {/* Clinical Details (MOSO) */}
        {isMoso && (
          <>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Clinical</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#999' }}>Case:</span> <strong>{lead.case_primary || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Body Region:</span> <strong>{lead.body_region || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Tier:</span> <strong>{lead.tier || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Waitlist:</span> <strong>Level {lead.waitlist_level || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Diagnosis:</span> <strong>{lead.diagnosis_icd10 || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Duration:</span> <strong>{lead.visit_duration_usual || '—'} min</strong></div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Visits & Revenue</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#999' }}>Total Visits:</span> <strong>{lead.total_visits || 0}</strong></div>
                <div><span style={{ color: '#999' }}>Rate/Session:</span> <strong>${lead.rate_per_session || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Revenue Band:</span> <strong>{lead.revenue_band || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Est Annual:</span> <strong>${lead.est_annual_revenue || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>First Visit:</span> <strong>{lead.first_visit_date || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Last Visit:</span> <strong>{lead.last_visit_date || '—'}</strong></div>
              </div>
            </div>

            {lead.referred_by && (
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Referral</h4>
                <div style={{ fontSize: '0.85rem' }}>Referred by: <strong>{lead.referred_by}</strong></div>
                {lead.referral_md && <div style={{ fontSize: '0.85rem' }}>MD: <strong>{lead.referral_md}</strong></div>}
              </div>
            )}

            {lead.notes_clinical && (
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Clinical Notes</h4>
                <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.5 }}>{lead.notes_clinical}</p>
              </div>
            )}

            {/* Insurance */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Insurance</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#999' }}>Primary:</span> <strong>{lead.primary_payer || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Secondary:</span> <strong>{lead.secondary_payer || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Member ID:</span> <strong>{lead.insurance_member_id || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Medicare:</span> <strong>{lead.medicare_flag || '—'}</strong></div>
              </div>
            </div>

            {lead.greenrope_tags && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {lead.greenrope_tags.split(',').map((tag, i) => (
                  <span key={i} style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontSize: '0.7rem' }}>{tag.trim()}</span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Consulting Details */}
        {!isMoso && (
          <>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Business</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#999' }}>Type:</span> <strong>{lead.contact_type || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Interest:</span> <strong>{lead.app_interest || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>LTV:</span> <strong style={{ color: '#2e7d32' }}>${parseFloat(lead.lifetime_value || 0).toLocaleString()}</strong></div>
                <div><span style={{ color: '#999' }}>Source:</span> <strong>{lead.source || '—'}</strong></div>
              </div>
            </div>
            {lead.referred_by && (
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Referral</h4>
                <div style={{ fontSize: '0.85rem' }}>Referred by: <strong>{lead.referred_by}</strong></div>
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: '0.75rem', color: '#bbb', marginTop: 'auto', paddingTop: '1rem' }}>
          ID: {lead.client_id || lead.id?.slice(0, 8)} · Source: {lead.source || '—'} · Created: {new Date(lead.created_at).toLocaleDateString()}
        </div>
      </div>
    );
  };

  // Table View
  const renderTable = () => {
    const isMoso = activeTab === 'moso';
    const SortHeader = ({ field, children }) => (
      <th onClick={() => toggleSort(field)} style={{ padding: '0.6rem 0.75rem', color: '#666', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.3px', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          {children}
          {sortField === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
              {isMoso ? (
                <>
                  <SortHeader field="patient_name">Name</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="case_primary">Case</SortHeader>
                  <SortHeader field="body_region">Body Region</SortHeader>
                  <SortHeader field="tier">Tier</SortHeader>
                  <SortHeader field="total_visits">Visits</SortHeader>
                  <SortHeader field="referred_by">Referral</SortHeader>
                  <th style={{ padding: '0.6rem 0.75rem', color: '#666', fontWeight: 600, fontSize: '0.78rem' }}>Tags</th>
                </>
              ) : (
                <>
                  <SortHeader field="company_name">Name</SortHeader>
                  <SortHeader field="client_status">Status</SortHeader>
                  <SortHeader field="email">Email</SortHeader>
                  <SortHeader field="contact_type">Type</SortHeader>
                  <SortHeader field="lifetime_value">LTV</SortHeader>
                  <SortHeader field="referred_by">Referral</SortHeader>
                  <SortHeader field="source">Source</SortHeader>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map(lead => (
              <tr key={lead.id} onClick={() => setSelectedLead(lead)}
                style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(176,96,80,0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                {isMoso ? (
                  <>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: '#2e2c2a' }}>{lead.patient_name}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}><StatusBadge status={lead.status} type="moso" /></td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666' }}>{lead.case_primary || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666' }}>{lead.body_region || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666', textAlign: 'center' }}>{lead.tier || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666', textAlign: 'center' }}>{lead.total_visits || 0}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666', fontSize: '0.8rem' }}>{lead.referred_by || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: '150px' }}>
                      {lead.greenrope_tags && (
                        <span style={{ fontSize: '0.7rem', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{lead.greenrope_tags}</span>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: '#2e2c2a' }}>{lead.company_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}><StatusBadge status={lead.client_status || 'Inactive'} type="labno" /></td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666', fontSize: '0.8rem' }}>{lead.email || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666' }}>{lead.contact_type || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#2e7d32', fontWeight: 500 }}>${parseFloat(lead.lifetime_value || 0).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#666', fontSize: '0.8rem' }}>{lead.referred_by || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#999', fontSize: '0.8rem' }}>{lead.source || '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '1rem', fontSize: '0.85rem' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
            <span style={{ color: '#666' }}>Page {page + 1} of {totalPages} ({filteredLeads.length} results)</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Users color="#b06050" /> Dual CRM Engine
        <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontWeight: 600, marginLeft: '8px' }}>
          {(clinicalLeads.length + consultingLeads.length).toLocaleString()} contacts
        </span>
      </h1>

      <p style={{ marginBottom: '1rem', color: '#777', fontSize: '0.85rem' }}>
        HIPAA-separated pipelines. MOSO = clinical patients (Lance only). Labno = consulting & app leads.
      </p>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('moso')} className={`filter-pill${activeTab === 'moso' ? ' active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} /> MOSO Clinical ({clinicalLeads.length})
          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: '#fce4ec', color: '#c62828' }}>HIPAA</span>
        </button>
        <button onClick={() => setActiveTab('labno')} className={`filter-pill${activeTab === 'labno' ? ' active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Briefcase size={14} /> Labno Consulting ({consultingLeads.length})
        </button>
      </div>

      {/* Pipeline View */}
      {renderPipeline()}

      {/* Search + Controls */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder={activeTab === 'moso' ? "Search patients, conditions, body region..." : "Search companies, contacts, interests..."}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.7)' }} />
        </div>

        {activeTab === 'moso' && (
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.7)' }}>
            <option value="All">All Tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        )}

        {statusFilter !== 'All' && (
          <button onClick={() => setStatusFilter('All')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.3)', background: 'rgba(176,96,80,0.05)', color: '#b06050', fontSize: '0.8rem', cursor: 'pointer' }}>
            <X size={12} /> {statusFilter}
          </button>
        )}

        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setViewMode('table')} className={`filter-pill${viewMode === 'table' ? ' active' : ''}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Table</button>
          <button onClick={() => setViewMode('pipeline')} className={`filter-pill${viewMode === 'pipeline' ? ' active' : ''}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Cards</button>
        </div>

        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add</>}
        </button>
      </div>

      {/* Add Forms */}
      {showForm && activeTab === 'moso' && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: '3px solid #1565c0' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#1565c0', fontSize: '0.9rem' }}>New Clinical Lead (HIPAA)</h4>
          <form onSubmit={handleAddClinical} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input type="text" placeholder="Patient Name" value={newClinical.patient_name} onChange={e => setNewClinical({ ...newClinical, patient_name: e.target.value })} required
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="email" placeholder="Email" value={newClinical.email} onChange={e => setNewClinical({ ...newClinical, email: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="text" placeholder="Condition" value={newClinical.condition_notes} onChange={e => setNewClinical({ ...newClinical, condition_notes: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <select value={newClinical.status} onChange={e => setNewClinical({ ...newClinical, status: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
              {MOSO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: '0.85rem' }}>{submitting ? '...' : 'Add'}</button>
          </form>
        </div>
      )}

      {showForm && activeTab === 'labno' && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: '3px solid #2e7d32' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#2e7d32', fontSize: '0.9rem' }}>New Consulting Lead</h4>
          <form onSubmit={handleAddConsulting} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input type="text" placeholder="Company Name" value={newConsulting.company_name} onChange={e => setNewConsulting({ ...newConsulting, company_name: e.target.value })} required
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="email" placeholder="Email" value={newConsulting.email} onChange={e => setNewConsulting({ ...newConsulting, email: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="text" placeholder="App Interest" value={newConsulting.app_interest} onChange={e => setNewConsulting({ ...newConsulting, app_interest: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 100px' }} />
            <input type="number" placeholder="LTV $" value={newConsulting.lifetime_value} onChange={e => setNewConsulting({ ...newConsulting, lifetime_value: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', width: '80px' }} />
            <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: '0.85rem' }}>{submitting ? '...' : 'Add'}</button>
          </form>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828', fontSize: '0.85rem' }}>{error}</div>}

      {/* Main Content */}
      <div className="glass-panel" style={{ flex: 1, padding: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Loading {activeTab === 'moso' ? 'clinical' : 'consulting'} leads...</div>
        ) : viewMode === 'table' ? (
          renderTable()
        ) : (
          /* Card View */
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {paginatedLeads.map(lead => {
                const isMoso = activeTab === 'moso';
                const name = isMoso ? lead.patient_name : (lead.company_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim());
                const status = isMoso ? lead.status : (lead.client_status || 'Inactive');
                return (
                  <div key={lead.id} className="glass-panel" onClick={() => setSelectedLead(lead)}
                    style={{ padding: '1rem', cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: '3px solid ' + ((isMoso ? MOSO_STATUS_COLORS : LABNO_STATUS_COLORS)[status]?.dot || '#ccc') }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#2e2c2a' }}>{name}</strong>
                      <StatusBadge status={status} type={activeTab} />
                    </div>
                    {isMoso ? (
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        {lead.case_primary && <span>{lead.case_primary}</span>}
                        {lead.body_region && <span> · {lead.body_region}</span>}
                        {lead.total_visits > 0 && <span> · {lead.total_visits} visits</span>}
                        {lead.tier && <div style={{ marginTop: '4px' }}><Tag size={11} style={{ verticalAlign: '-1px' }} /> Tier {lead.tier}</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        {lead.email && <div>{lead.email}</div>}
                        {lead.contact_type && <span>{lead.contact_type}</span>}
                        {lead.lifetime_value > 0 && <span style={{ color: '#2e7d32' }}> · ${parseFloat(lead.lifetime_value).toLocaleString()}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '1rem', fontSize: '0.85rem' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
                <span style={{ color: '#666' }}>Page {page + 1} of {totalPages} ({filteredLeads.length} results)</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Slide-out Panel */}
      {selectedLead && renderDetailCard()}
      {selectedLead && <div onClick={() => setSelectedLead(null)} style={{ position: 'fixed', top: 0, left: 0, right: '480px', bottom: 0, background: 'rgba(0,0,0,0.15)', zIndex: 1999 }} />}
    </div>
  );
};

export default DualCRM;
