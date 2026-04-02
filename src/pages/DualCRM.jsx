import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, Briefcase, Plus, Search, X, ChevronDown, ChevronUp, ArrowRight, Phone, Mail, MapPin, Activity, DollarSign, Calendar, Tag, Download, Check, Edit3, Save, BarChart3, AlertTriangle, Copy, Filter, Columns, TrendingUp, Hash } from 'lucide-react';
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

// Format dollar amounts compactly
const fmtDollars = (n) => {
  if (n == null || isNaN(n)) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};

// Column definitions for toggle
const MOSO_COLUMNS = [
  { key: 'patient_name', label: 'Name', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'case_primary', label: 'Case', default: true },
  { key: 'body_region', label: 'Body Region', default: true },
  { key: 'tier', label: 'Tier', default: true },
  { key: 'total_visits', label: 'Visits', default: true },
  { key: 'rate_per_session', label: 'Rate', default: false },
  { key: 'est_annual_revenue', label: 'Est Revenue', default: false },
  { key: 'referred_by', label: 'Referral', default: true },
  { key: 'primary_payer', label: 'Payer', default: false },
  { key: 'city', label: 'City', default: false },
  { key: 'greenrope_tags', label: 'Tags', default: true },
];

const LABNO_COLUMNS = [
  { key: 'company_name', label: 'Name', default: true },
  { key: 'client_status', label: 'Status', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'contact_type', label: 'Type', default: true },
  { key: 'lifetime_value', label: 'LTV', default: true },
  { key: 'app_interest', label: 'Interest', default: false },
  { key: 'referred_by', label: 'Referral', default: true },
  { key: 'source', label: 'Source', default: true },
];

// Risk score calculation for clinical leads
const calcRiskScore = (lead) => {
  let score = 0;
  if (lead.status === 'PITA-DNC') return { score: 0, label: 'DNC', color: '#b71c1c' };
  if (!lead.last_visit_date) score += 20;
  else {
    const daysSince = Math.floor((Date.now() - new Date(lead.last_visit_date).getTime()) / 86400000);
    if (daysSince > 180) score += 40;
    else if (daysSince > 90) score += 25;
    else if (daysSince > 30) score += 10;
  }
  if ((lead.total_visits || 0) <= 2) score += 15;
  if (lead.status === 'Inactive') score += 20;
  if (lead.status === 'Reactivation') score += 10;
  if (lead.tier === 1 || lead.tier === '1') score -= 10;
  score = Math.max(0, Math.min(100, score));
  if (score >= 60) return { score, label: 'High', color: '#d32f2f' };
  if (score >= 30) return { score, label: 'Medium', color: '#ff9800' };
  return { score, label: 'Low', color: '#4caf50' };
};

const DualCRM = () => {
  const [activeTab, setActiveTab] = useState('moso');
  const [viewMode, setViewMode] = useState('pipeline');

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
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [revenueRange, setRevenueRange] = useState({ min: '', max: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedFilters, setSavedFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_saved_filters') || '[]'); } catch { return []; }
  });

  // Detail view
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailEdits, setDetailEdits] = useState({});

  // Form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClinical, setNewClinical] = useState({ patient_name: '', email: '', condition_notes: '', status: 'Active' });
  const [newConsulting, setNewConsulting] = useState({ company_name: '', email: '', app_interest: '', lifetime_value: 0 });

  // Pagination
  const [page, setPage] = useState(0);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Column toggle
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_visible_cols') || 'null'); } catch { return null; }
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  // Similar leads (fetched from Supabase)
  const [similarLeads, setSimilarLeads] = useState([]);

  const getColumns = useCallback(() => {
    const cols = activeTab === 'moso' ? MOSO_COLUMNS : LABNO_COLUMNS;
    const key = activeTab === 'moso' ? 'moso' : 'labno';
    if (visibleColumns && visibleColumns[key]) {
      return cols.filter(c => visibleColumns[key].includes(c.key));
    }
    return cols.filter(c => c.default);
  }, [activeTab, visibleColumns]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const [clinical, consulting] = await Promise.all([
      supabase.from('moso_clinical_leads').select('*').order('patient_name', { ascending: true }),
      supabase.from('labno_consulting_leads').select('*').order('created_at', { ascending: false }),
    ]);
    if (clinical.error) setError(clinical.error.message);
    else setClinicalLeads(clinical.data || []);
    if (consulting.error && !clinical.error) setError(consulting.error.message);
    else setConsultingLeads(consulting.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(0); setSelectedLead(null); setSelectedIds(new Set()); }, [activeTab, searchQuery, statusFilter, tierFilter, dateRange, revenueRange]);

  // Fetch similar leads when detail opens
  useEffect(() => {
    if (!selectedLead) { setSimilarLeads([]); return; }
    const isMoso = activeTab === 'moso';
    const table = isMoso ? 'moso_clinical_leads' : 'labno_consulting_leads';
    if (isMoso && selectedLead.case_primary && selectedLead.body_region) {
      supabase.from(table).select('*')
        .eq('case_primary', selectedLead.case_primary)
        .eq('body_region', selectedLead.body_region)
        .neq('id', selectedLead.id).limit(5)
        .then(({ data }) => setSimilarLeads(data || []));
    } else if (!isMoso && selectedLead.contact_type) {
      supabase.from(table).select('*')
        .eq('contact_type', selectedLead.contact_type)
        .neq('id', selectedLead.id).limit(5)
        .then(({ data }) => setSimilarLeads(data || []));
    } else {
      setSimilarLeads([]);
    }
  }, [selectedLead?.id, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') { setSelectedLead(null); setEditingCell(null); }
      if (e.key === 't') setViewMode(v => v === 'table' ? 'pipeline' : 'table');
      if (e.key === '/') { e.preventDefault(); document.querySelector('[data-search-input]')?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (editingCell && editInputRef.current) editInputRef.current.focus();
  }, [editingCell]);

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
        if (String(l.tier || 'None') !== tierFilter) return false;
      }
      if (dateRange.from && new Date(l.created_at) < new Date(dateRange.from)) return false;
      if (dateRange.to && new Date(l.created_at) > new Date(dateRange.to + 'T23:59:59')) return false;
      if (revenueRange.min !== '') {
        const rev = activeTab === 'moso' ? parseFloat(l.est_annual_revenue || 0) : parseFloat(l.lifetime_value || 0);
        if (rev < parseFloat(revenueRange.min)) return false;
      }
      if (revenueRange.max !== '') {
        const rev = activeTab === 'moso' ? parseFloat(l.est_annual_revenue || 0) : parseFloat(l.lifetime_value || 0);
        if (rev > parseFloat(revenueRange.max)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField];
      if (['total_visits', 'lifetime_value', 'est_annual_revenue', 'rate_per_session', 'tier'].includes(sortField)) {
        return sortDir === 'asc' ? (parseFloat(aVal || 0) - parseFloat(bVal || 0)) : (parseFloat(bVal || 0) - parseFloat(aVal || 0));
      }
      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return filtered;
  }, [activeTab, clinicalLeads, consultingLeads, searchQuery, statusFilter, tierFilter, sortField, sortDir, dateRange, revenueRange]);

  const paginatedLeads = filteredLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);

  // Pipeline stats with revenue per stage
  const pipelineStats = useMemo(() => {
    const leads = activeTab === 'moso' ? clinicalLeads : consultingLeads;
    const statuses = activeTab === 'moso' ? MOSO_STATUSES : LABNO_STATUSES;
    const stats = {};
    statuses.forEach(s => { stats[s] = { count: 0, revenue: 0 }; });
    leads.forEach(l => {
      const status = activeTab === 'moso' ? l.status : (l.client_status || 'Inactive');
      if (!stats[status]) stats[status] = { count: 0, revenue: 0 };
      stats[status].count++;
      stats[status].revenue += activeTab === 'moso' ? parseFloat(l.est_annual_revenue || 0) : parseFloat(l.lifetime_value || 0);
    });
    return stats;
  }, [activeTab, clinicalLeads, consultingLeads]);

  // KPI calculations
  const kpis = useMemo(() => {
    const leads = activeTab === 'moso' ? clinicalLeads : consultingLeads;
    let totalRevenue = 0, totalVisits = 0, activeCount = 0;
    leads.forEach(l => {
      totalRevenue += activeTab === 'moso' ? parseFloat(l.est_annual_revenue || 0) : parseFloat(l.lifetime_value || 0);
      totalVisits += parseInt(l.total_visits || 0);
      const status = activeTab === 'moso' ? l.status : (l.client_status || 'Inactive');
      if (status === 'Active' || status === 'Active Client') activeCount++;
    });
    return {
      totalRevenue, totalVisits, activeCount,
      avgRevenue: leads.length > 0 ? totalRevenue / leads.length : 0,
      conversionRate: leads.length > 0 ? ((activeCount / leads.length) * 100).toFixed(1) : 0,
      total: leads.length,
    };
  }, [activeTab, clinicalLeads, consultingLeads]);

  // Totals for filtered view
  const filteredTotals = useMemo(() => {
    let revenue = 0, visits = 0;
    filteredLeads.forEach(l => {
      revenue += activeTab === 'moso' ? parseFloat(l.est_annual_revenue || 0) : parseFloat(l.lifetime_value || 0);
      visits += parseInt(l.total_visits || 0);
    });
    return { revenue, visits, count: filteredLeads.length };
  }, [filteredLeads, activeTab]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleAddClinical = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.from('moso_clinical_leads').insert([newClinical]);
    if (error) setError(error.message);
    else { setNewClinical({ patient_name: '', email: '', condition_notes: '', status: 'Active' }); setShowForm(false); await fetchData(); }
    setSubmitting(false);
  };

  const handleAddConsulting = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.from('labno_consulting_leads').insert([{ ...newConsulting, lifetime_value: parseFloat(newConsulting.lifetime_value) || 0 }]);
    if (error) setError(error.message);
    else { setNewConsulting({ company_name: '', email: '', app_interest: '', lifetime_value: 0 }); setShowForm(false); await fetchData(); }
    setSubmitting(false);
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    const table = activeTab === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';
    const field = activeTab === 'moso' ? 'status' : 'client_status';
    const { error } = await supabase.from(table).update({ [field]: newStatus }).eq('id', leadId);
    if (!error) { await fetchData(); if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, [field]: newStatus })); }
  };

  const saveInlineEdit = async (leadId, field, value) => {
    const table = activeTab === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';
    const parsedVal = ['total_visits', 'lifetime_value', 'est_annual_revenue', 'rate_per_session', 'tier'].includes(field) ? (parseFloat(value) || 0) : value;
    const { error: err } = await supabase.from(table).update({ [field]: parsedVal }).eq('id', leadId);
    if (!err) await fetchData(); else setError(err.message);
    setEditingCell(null);
  };

  const saveDetailEdits = async () => {
    if (!selectedLead) return;
    const table = activeTab === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';
    const updates = {};
    Object.entries(detailEdits).forEach(([k, v]) => {
      updates[k] = ['total_visits', 'lifetime_value', 'est_annual_revenue', 'rate_per_session', 'tier'].includes(k) ? (parseFloat(v) || 0) : v;
    });
    if (Object.keys(updates).length === 0) { setDetailEditMode(false); return; }
    const { error: err } = await supabase.from(table).update(updates).eq('id', selectedLead.id);
    if (!err) { await fetchData(); setSelectedLead(prev => ({ ...prev, ...updates })); setDetailEdits({}); setDetailEditMode(false); }
    else setError(err.message);
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;
    const table = activeTab === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';
    const field = activeTab === 'moso' ? 'status' : 'client_status';
    const ids = Array.from(selectedIds);
    if (bulkAction === 'delete') {
      if (!window.confirm(`Delete ${ids.length} lead(s)? This cannot be undone.`)) return;
      const { error: err } = await supabase.from(table).delete().in('id', ids);
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.from(table).update({ [field]: bulkAction }).in('id', ids);
      if (err) setError(err.message);
    }
    setSelectedIds(new Set()); setBulkAction(''); await fetchData();
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === paginatedLeads.length ? new Set() : new Set(paginatedLeads.map(l => l.id)));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const exportCSV = () => {
    const cols = getColumns();
    const header = cols.map(c => c.label).join(',');
    const rows = filteredLeads.map(lead => cols.map(c => {
      let val = String(lead[c.key] ?? '').replace(/"/g, '""');
      return (val.includes(',') || val.includes('"') || val.includes('\n')) ? `"${val}"` : val;
    }).join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${activeTab === 'moso' ? 'clinical' : 'consulting'}_leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const saveCurrentFilter = () => {
    const name = prompt('Filter name:');
    if (!name) return;
    const updated = [...savedFilters, { name, tab: activeTab, searchQuery, statusFilter, tierFilter, dateRange, revenueRange }];
    setSavedFilters(updated); localStorage.setItem('crm_saved_filters', JSON.stringify(updated));
  };

  const loadSavedFilter = (f) => {
    setActiveTab(f.tab); setSearchQuery(f.searchQuery || ''); setStatusFilter(f.statusFilter || 'All');
    setTierFilter(f.tierFilter || 'All'); setDateRange(f.dateRange || { from: '', to: '' }); setRevenueRange(f.revenueRange || { min: '', max: '' });
  };

  const deleteSavedFilter = (i) => {
    const updated = savedFilters.filter((_, idx) => idx !== i);
    setSavedFilters(updated); localStorage.setItem('crm_saved_filters', JSON.stringify(updated));
  };

  const toggleColumn = (colKey) => {
    const key = activeTab === 'moso' ? 'moso' : 'labno';
    const allCols = activeTab === 'moso' ? MOSO_COLUMNS : LABNO_COLUMNS;
    const current = visibleColumns?.[key] || allCols.filter(c => c.default).map(c => c.key);
    const updated = current.includes(colKey) ? current.filter(k => k !== colKey) : [...current, colKey];
    const newVis = { ...visibleColumns, [key]: updated };
    setVisibleColumns(newVis); localStorage.setItem('crm_visible_cols', JSON.stringify(newVis));
  };

  const copyLeadInfo = (lead) => {
    const isMoso = activeTab === 'moso';
    const name = isMoso ? lead.patient_name : (lead.company_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim());
    const text = isMoso
      ? `${name}\n${lead.email || ''}\n${lead.case_primary || ''} - ${lead.body_region || ''}\nTier ${lead.tier || '—'} · ${lead.total_visits || 0} visits`
      : `${name}\n${lead.email || ''}\n${lead.contact_type || ''}\nLTV: $${parseFloat(lead.lifetime_value || 0).toLocaleString()}`;
    navigator.clipboard.writeText(text);
  };

  // --- COMPONENTS ---

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

  const MiniVisitChart = ({ lead }) => {
    const visits = parseInt(lead.total_visits || 0);
    const maxVisits = Math.max(...(activeTab === 'moso' ? clinicalLeads : consultingLeads).map(l => parseInt(l.total_visits || 0)), 1);
    const pct = (visits / maxVisits) * 100;
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#999', marginBottom: '4px' }}>
          <span>Visits</span><span>{visits}</span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #b06050, #c47a6a)', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    );
  };

  // --- KPI Stats Bar ---
  const renderKPIs = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
      {[
        { label: activeTab === 'moso' ? 'Est Annual Revenue' : 'Total LTV', value: fmtDollars(kpis.totalRevenue), icon: <DollarSign size={16} color="#2e7d32" /> },
        { label: 'Active', value: kpis.activeCount, icon: <TrendingUp size={16} color="#b06050" /> },
        { label: activeTab === 'moso' ? 'Avg Revenue' : 'Avg LTV', value: fmtDollars(kpis.avgRevenue), icon: <BarChart3 size={16} color="#1565c0" /> },
        { label: 'Active Rate', value: `${kpis.conversionRate}%`, icon: <Hash size={16} color="#7b1fa2" /> },
      ].map((kpi, i) => (
        <div key={i} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(176,96,80,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{kpi.icon}</div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2e2c2a' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // --- Pipeline View ---
  const renderPipeline = () => {
    const statuses = activeTab === 'moso' ? MOSO_STATUSES : LABNO_STATUSES;
    const colors = activeTab === 'moso' ? MOSO_STATUS_COLORS : LABNO_STATUS_COLORS;
    const goals = PIPELINE_GOALS[activeTab] || {};
    const maxRevenue = Math.max(...Object.values(pipelineStats).map(s => s.revenue), 1);
    return (
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {statuses.map(status => {
          const c = colors[status] || {};
          const stats = pipelineStats[status] || { count: 0, revenue: 0 };
          const isActive = statusFilter === status;
          const goal = goals[status];
          const revPct = maxRevenue > 0 ? (stats.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={status} onClick={() => setStatusFilter(isActive ? 'All' : status)}
              className="glass-panel" style={{
                minWidth: '150px', flex: 1, padding: '1rem', cursor: 'pointer',
                borderTop: `3px solid ${c.dot || '#ccc'}`,
                background: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                transform: isActive ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: c.color || '#444' }}>{stats.count}</div>
                {goal && <span style={{ fontSize: '0.7rem', color: '#bbb' }}>/ {goal}</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>{status}</div>
              {stats.revenue > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 600, marginTop: '4px' }}>{fmtDollars(stats.revenue)}</div>
              )}
              <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(0,0,0,0.06)', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${revPct}%`, borderRadius: '2px', background: 'rgba(176,96,80,0.5)', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Detail Panel ---
  const renderDetailCard = () => {
    if (!selectedLead) return null;
    const lead = { ...selectedLead, ...detailEdits };
    const isMoso = activeTab === 'moso';
    const statuses = isMoso ? MOSO_STATUSES : LABNO_STATUSES;
    const risk = isMoso ? calcRiskScore(lead) : null;

    const EditableField = ({ label, field, value }) => {
      if (detailEditMode) {
        return (
          <div><span style={{ color: '#999' }}>{label}:</span>{' '}
            <input value={detailEdits[field] !== undefined ? detailEdits[field] : (value || '')}
              onChange={e => setDetailEdits(prev => ({ ...prev, [field]: e.target.value }))}
              style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(176,96,80,0.3)', fontSize: '0.85rem', width: '100px', background: 'rgba(255,255,255,0.8)' }} />
          </div>
        );
      }
      return <div><span style={{ color: '#999' }}>{label}:</span> <strong>{value || '—'}</strong></div>;
    };

    return (
      <div style={{ position: 'fixed', top: 0, right: 0, width: '480px', height: '100vh', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', boxShadow: '-4px 0 30px rgba(0,0,0,0.1)', zIndex: 2000, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#2e2c2a', fontWeight: 700 }}>
            {isMoso ? lead.patient_name : (lead.company_name || `${lead.first_name} ${lead.last_name}`)}
          </h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => copyLeadInfo(selectedLead)} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Copy size={16} color="#999" /></button>
            {detailEditMode
              ? <button onClick={saveDetailEdits} title="Save" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Save size={16} color="#2e7d32" /></button>
              : <button onClick={() => setDetailEditMode(true)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Edit3 size={16} color="#999" /></button>
            }
            <button onClick={() => { setSelectedLead(null); setDetailEditMode(false); setDetailEdits({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} color="#666" /></button>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
          {lead.email && <a href={`mailto:${lead.email}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(176,96,80,0.08)', color: '#b06050', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(176,96,80,0.15)' }}><Mail size={12} /> Email</a>}
          {(lead.phone || lead.mobile) && <a href={`tel:${lead.phone || lead.mobile}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(30,130,76,0.08)', color: '#2e7d32', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(30,130,76,0.15)' }}><Phone size={12} /> Call</a>}
          <button onClick={() => copyLeadInfo(selectedLead)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', color: '#666', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}><Copy size={12} /> Copy</button>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '1rem' }}>
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

        {/* Risk Score */}
        {isMoso && risk && (
          <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `3px solid ${risk.color}` }}>
            <AlertTriangle size={16} color={risk.color} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: risk.color }}>Churn Risk: {risk.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#999' }}>Score: {risk.score}/100</div>
            </div>
            <div style={{ marginLeft: 'auto', width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${risk.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: risk.color }}>{risk.score}</div>
          </div>
        )}

        {/* Contact */}
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Contact</h4>
          {lead.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Mail size={14} color="#b06050" /> {lead.email}</div>}
          {lead.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Phone size={14} color="#b06050" /> {lead.phone}</div>}
          {lead.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}><Phone size={14} color="#b06050" /> {lead.mobile} (mobile)</div>}
          {(lead.city || lead.state || lead.zip) && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}><MapPin size={14} color="#b06050" /> {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}</div>}
        </div>

        {/* Clinical */}
        {isMoso && (
          <>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Clinical</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <EditableField label="Case" field="case_primary" value={lead.case_primary} />
                <EditableField label="Body Region" field="body_region" value={lead.body_region} />
                <EditableField label="Tier" field="tier" value={lead.tier} />
                <EditableField label="Waitlist" field="waitlist_level" value={lead.waitlist_level ? `Level ${lead.waitlist_level}` : null} />
                <EditableField label="Diagnosis" field="diagnosis_icd10" value={lead.diagnosis_icd10} />
                <EditableField label="Duration" field="visit_duration_usual" value={lead.visit_duration_usual ? `${lead.visit_duration_usual} min` : null} />
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Visits & Revenue</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <EditableField label="Total Visits" field="total_visits" value={lead.total_visits || 0} />
                <EditableField label="Rate/Session" field="rate_per_session" value={lead.rate_per_session ? `$${lead.rate_per_session}` : null} />
                <EditableField label="Revenue Band" field="revenue_band" value={lead.revenue_band} />
                <EditableField label="Est Annual" field="est_annual_revenue" value={lead.est_annual_revenue ? `$${lead.est_annual_revenue}` : null} />
                <div><span style={{ color: '#999' }}>First Visit:</span> <strong>{lead.first_visit_date || '—'}</strong></div>
                <div><span style={{ color: '#999' }}>Last Visit:</span> <strong>{lead.last_visit_date || '—'}</strong></div>
              </div>
              <MiniVisitChart lead={lead} />
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

        {/* Consulting */}
        {!isMoso && (
          <>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Business</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <EditableField label="Type" field="contact_type" value={lead.contact_type} />
                <EditableField label="Interest" field="app_interest" value={lead.app_interest} />
                <EditableField label="LTV" field="lifetime_value" value={`$${parseFloat(lead.lifetime_value || 0).toLocaleString()}`} />
                <EditableField label="Source" field="source" value={lead.source} />
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

        {/* Similar Leads */}
        {similarLeads.length > 0 && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Similar {isMoso ? 'Patients' : 'Leads'}</h4>
            {similarLeads.map(s => (
              <div key={s.id} onClick={() => { setSelectedLead(s); setDetailEditMode(false); setDetailEdits({}); }}
                style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', background: 'rgba(0,0,0,0.02)' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(176,96,80,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}>
                <span style={{ fontWeight: 500 }}>{isMoso ? s.patient_name : (s.company_name || s.first_name)}</span>
                <StatusBadge status={isMoso ? s.status : (s.client_status || 'Inactive')} type={activeTab} />
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '0.75rem', color: '#bbb', marginTop: 'auto', paddingTop: '1rem' }}>
          ID: {lead.client_id || lead.id?.slice(0, 8)} · Source: {lead.source || '—'} · Created: {new Date(lead.created_at).toLocaleDateString()}
        </div>
      </div>
    );
  };

  // --- Table View ---
  const renderTable = () => {
    const isMoso = activeTab === 'moso';
    const columns = getColumns();
    const statuses = isMoso ? MOSO_STATUSES : LABNO_STATUSES;

    const SortHeader = ({ field, children }) => (
      <th onClick={() => toggleSort(field)} style={{ padding: '0.6rem 0.75rem', color: '#666', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.3px', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          {children}
          {sortField === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );

    const renderCellValue = (lead, col) => {
      const val = lead[col.key];
      if (editingCell && editingCell.id === lead.id && editingCell.field === col.key) {
        return <input ref={editInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
          onBlur={() => saveInlineEdit(lead.id, col.key, editValue)}
          onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(lead.id, col.key, editValue); if (e.key === 'Escape') setEditingCell(null); }}
          style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(176,96,80,0.4)', fontSize: '0.85rem', width: '100%', background: 'rgba(255,255,255,0.9)' }} />;
      }
      if (col.key === 'status' || col.key === 'client_status') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StatusBadge status={col.key === 'status' ? val : (val || 'Inactive')} type={activeTab} />
            <select value="" onChange={e => { if (e.target.value) updateLeadStatus(lead.id, e.target.value); }} onClick={e => e.stopPropagation()}
              style={{ width: '20px', height: '20px', opacity: 0.3, cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }} title="Quick status change">
              <option value=""></option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        );
      }
      if (col.key === 'lifetime_value') return <span style={{ color: '#2e7d32', fontWeight: 500 }}>{fmtDollars(parseFloat(val || 0))}</span>;
      if (col.key === 'est_annual_revenue' || col.key === 'rate_per_session') return val ? <span style={{ color: '#2e7d32' }}>{fmtDollars(parseFloat(val))}</span> : '—';
      if (col.key === 'total_visits') return <span style={{ textAlign: 'center', display: 'block' }}>{val || 0}</span>;
      if (col.key === 'tier') return <span style={{ textAlign: 'center', display: 'block' }}>{val || '—'}</span>;
      if (col.key === 'greenrope_tags') return val ? <span style={{ fontSize: '0.7rem', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '150px' }}>{val}</span> : null;
      if (col.key === 'company_name') return <span style={{ fontWeight: 500, color: '#2e2c2a' }}>{val || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '—'}</span>;
      if (col.key === 'patient_name') return <span style={{ fontWeight: 500, color: '#2e2c2a' }}>{val}</span>;
      return <span style={{ color: '#666' }}>{val || '—'}</span>;
    };

    return (
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
              <th style={{ padding: '0.6rem 0.5rem', width: '36px' }}>
                <input type="checkbox" checked={selectedIds.size === paginatedLeads.length && paginatedLeads.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#b06050' }} />
              </th>
              {columns.map(col => <SortHeader key={col.key} field={col.key}>{col.label}</SortHeader>)}
              <th style={{ padding: '0.6rem 0.5rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map(lead => (
              <tr key={lead.id}
                style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.15s', background: selectedIds.has(lead.id) ? 'rgba(176,96,80,0.06)' : 'transparent' }}
                onMouseOver={e => { if (!selectedIds.has(lead.id)) e.currentTarget.style.background = 'rgba(176,96,80,0.04)'; }}
                onMouseOut={e => { if (!selectedIds.has(lead.id)) e.currentTarget.style.background = 'transparent'; }}>
                <td style={{ padding: '0.6rem 0.5rem' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelectOne(lead.id)} style={{ cursor: 'pointer', accentColor: '#b06050' }} />
                </td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '0.6rem 0.75rem' }} onClick={() => setSelectedLead(lead)}
                    onDoubleClick={e => { e.stopPropagation(); if (!['status', 'client_status', 'greenrope_tags'].includes(col.key)) { setEditingCell({ id: lead.id, field: col.key }); setEditValue(lead[col.key] || ''); } }}>
                    {renderCellValue(lead, col)}
                  </td>
                ))}
                <td style={{ padding: '0.6rem 0.5rem' }} onClick={e => e.stopPropagation()}>
                  {lead.email && <a href={`mailto:${lead.email}`} title="Email" style={{ padding: '2px', color: '#999', textDecoration: 'none' }}
                    onMouseOver={e => e.currentTarget.style.color = '#b06050'} onMouseOut={e => e.currentTarget.style.color = '#999'}><Mail size={13} /></a>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              <td style={{ padding: '0.6rem 0.5rem' }}></td>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#444' }}>
                  {col.key === (isMoso ? 'patient_name' : 'company_name') ? `${filteredTotals.count} leads` : ''}
                  {col.key === 'total_visits' ? <span style={{ display: 'block', textAlign: 'center' }}>{filteredTotals.visits.toLocaleString()}</span> : ''}
                  {(col.key === 'lifetime_value' || col.key === 'est_annual_revenue') ? <span style={{ color: '#2e7d32' }}>{fmtDollars(filteredTotals.revenue)}</span> : ''}
                </td>
              ))}
              <td></td>
            </tr>
          </tfoot>
        </table>
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

  // --- MAIN RENDER ---
  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Users color="#b06050" /> Dual CRM Engine
        <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontWeight: 600, marginLeft: '8px' }}>
          {(clinicalLeads.length + consultingLeads.length).toLocaleString()} contacts
        </span>
      </h1>
      <p style={{ marginBottom: '1rem', color: '#777', fontSize: '0.85rem' }}>
        HIPAA-separated pipelines. MOSO = clinical patients (Lance only). Labno = consulting & app leads.
        <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: '#bbb' }}>[ t ] toggle view · [ / ] search · [ esc ] close</span>
      </p>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('moso')} className={`filter-pill${activeTab === 'moso' ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} /> MOSO Clinical ({clinicalLeads.length})
          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: '#fce4ec', color: '#c62828' }}>HIPAA</span>
        </button>
        <button onClick={() => setActiveTab('labno')} className={`filter-pill${activeTab === 'labno' ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Briefcase size={14} /> Labno Consulting ({consultingLeads.length})
        </button>
      </div>

      {renderKPIs()}
      {renderPipeline()}

      {/* Search + Controls */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input data-search-input type="text" placeholder={activeTab === 'moso' ? "Search patients, conditions, body region..." : "Search companies, contacts, interests..."}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.7)' }} />
        </div>
        {activeTab === 'moso' && (
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.7)' }}>
            <option value="All">All Tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option>
          </select>
        )}
        {statusFilter !== 'All' && (
          <button onClick={() => setStatusFilter('All')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.3)', background: 'rgba(176,96,80,0.05)', color: '#b06050', fontSize: '0.8rem', cursor: 'pointer' }}>
            <X size={12} /> {statusFilter}
          </button>
        )}
        <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`filter-pill${showAdvancedFilters ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
          <Filter size={12} /> Filters
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`filter-pill${showColumnPicker ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
            <Columns size={12} /> Columns
          </button>
          {showColumnPicker && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '8px', zIndex: 100, minWidth: '160px' }}>
              {(activeTab === 'moso' ? MOSO_COLUMNS : LABNO_COLUMNS).map(col => {
                const isVisible = getColumns().some(c => c.key === col.key);
                return (
                  <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <input type="checkbox" checked={isVisible} onChange={() => toggleColumn(col.key)} style={{ accentColor: '#b06050' }} /> {col.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setViewMode('table')} className={`filter-pill${viewMode === 'table' ? ' active' : ''}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Table</button>
          <button onClick={() => setViewMode('pipeline')} className={`filter-pill${viewMode === 'pipeline' ? ' active' : ''}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Cards</button>
        </div>
        <button onClick={exportCSV} className="filter-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
          <Download size={12} /> CSV
        </button>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add</>}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '0.5rem', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', borderLeft: '3px solid #b06050' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Calendar size={13} color="#999" />
            <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }} />
            <span style={{ color: '#999' }}>to</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <DollarSign size={13} color="#999" />
            <input type="number" placeholder="Min $" value={revenueRange.min} onChange={e => setRevenueRange(prev => ({ ...prev, min: e.target.value }))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', width: '80px' }} />
            <span style={{ color: '#999' }}>to</span>
            <input type="number" placeholder="Max $" value={revenueRange.max} onChange={e => setRevenueRange(prev => ({ ...prev, max: e.target.value }))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', width: '80px' }} />
          </div>
          <button onClick={saveCurrentFilter} className="filter-pill" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}><Save size={11} /> Save Filter</button>
          {(dateRange.from || dateRange.to || revenueRange.min || revenueRange.max) && (
            <button onClick={() => { setDateRange({ from: '', to: '' }); setRevenueRange({ min: '', max: '' }); }} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(176,96,80,0.1)', color: '#b06050', cursor: 'pointer' }}>Clear</button>
          )}
          {savedFilters.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
              {savedFilters.map((f, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => loadSavedFilter(f)} className="filter-pill" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>{f.name}</button>
                  <button onClick={() => deleteSavedFilter(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#ccc', fontSize: '0.7rem' }}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="glass-panel" style={{ padding: '0.6rem 1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '3px solid #1565c0', background: 'rgba(21,101,192,0.04)' }}>
          <Check size={14} color="#1565c0" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1565c0' }}>{selectedIds.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
            <option value="">Bulk action...</option>
            {(activeTab === 'moso' ? MOSO_STATUSES : LABNO_STATUSES).map(s => <option key={s} value={s}>Move to: {s}</option>)}
            <option value="delete">Delete selected</option>
          </select>
          <button onClick={handleBulkAction} disabled={!bulkAction} className="btn-primary" style={{ fontSize: '0.78rem', padding: '5px 12px', opacity: bulkAction ? 1 : 0.4 }}>Apply</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '0.8rem' }}>Cancel</button>
        </div>
      )}

      {/* Add Forms */}
      {showForm && activeTab === 'moso' && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '0.5rem', borderLeft: '3px solid #1565c0' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#1565c0', fontSize: '0.9rem' }}>New Clinical Lead (HIPAA)</h4>
          <form onSubmit={handleAddClinical} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input type="text" placeholder="Patient Name" value={newClinical.patient_name} onChange={e => setNewClinical({ ...newClinical, patient_name: e.target.value })} required style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="email" placeholder="Email" value={newClinical.email} onChange={e => setNewClinical({ ...newClinical, email: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="text" placeholder="Condition" value={newClinical.condition_notes} onChange={e => setNewClinical({ ...newClinical, condition_notes: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <select value={newClinical.status} onChange={e => setNewClinical({ ...newClinical, status: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
              {MOSO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: '0.85rem' }}>{submitting ? '...' : 'Add'}</button>
          </form>
        </div>
      )}
      {showForm && activeTab === 'labno' && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '0.5rem', borderLeft: '3px solid #2e7d32' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#2e7d32', fontSize: '0.9rem' }}>New Consulting Lead</h4>
          <form onSubmit={handleAddConsulting} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input type="text" placeholder="Company Name" value={newConsulting.company_name} onChange={e => setNewConsulting({ ...newConsulting, company_name: e.target.value })} required style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="email" placeholder="Email" value={newConsulting.email} onChange={e => setNewConsulting({ ...newConsulting, email: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 150px' }} />
            <input type="text" placeholder="App Interest" value={newConsulting.app_interest} onChange={e => setNewConsulting({ ...newConsulting, app_interest: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', flex: '1 1 100px' }} />
            <input type="number" placeholder="LTV $" value={newConsulting.lifetime_value} onChange={e => setNewConsulting({ ...newConsulting, lifetime_value: e.target.value })} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', width: '80px' }} />
            <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: '0.85rem' }}>{submitting ? '...' : 'Add'}</button>
          </form>
        </div>
      )}

      {error && <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828', fontSize: '0.85rem' }}>{error}</div>}

      {/* Main Content */}
      <div className="glass-panel" style={{ flex: 1, padding: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Loading {activeTab === 'moso' ? 'clinical' : 'consulting'} leads...</div>
        ) : viewMode === 'table' ? renderTable() : (
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
                        {lead.est_annual_revenue > 0 && <div style={{ color: '#2e7d32', fontWeight: 500, marginTop: '2px' }}>{fmtDollars(parseFloat(lead.est_annual_revenue))}/yr</div>}
                        {lead.tier && <div style={{ marginTop: '4px' }}><Tag size={11} style={{ verticalAlign: '-1px' }} /> Tier {lead.tier}</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        {lead.email && <div>{lead.email}</div>}
                        {lead.contact_type && <span>{lead.contact_type}</span>}
                        {lead.lifetime_value > 0 && <span style={{ color: '#2e7d32' }}> · {fmtDollars(parseFloat(lead.lifetime_value))}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '1rem', fontSize: '0.85rem' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
                <span style={{ color: '#666' }}>Page {page + 1} of {totalPages} ({filteredLeads.length} results)</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedLead && renderDetailCard()}
      {selectedLead && <div onClick={() => { setSelectedLead(null); setDetailEditMode(false); setDetailEdits({}); }} style={{ position: 'fixed', top: 0, left: 0, right: '480px', bottom: 0, background: 'rgba(0,0,0,0.15)', zIndex: 1999 }} />}
    </div>
  );
};

export default DualCRM;
