import { useState, useEffect, useMemo } from 'react';
import { DollarSign, CheckCircle, Clock, Send, FileText, ChevronDown, ChevronRight, AlertTriangle, Filter } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

// CPT code rates — units in 15-minute increments
// Each unit = 1 billable 15-min block. Rate = practitioner hourly rate / 4
// Default rates based on $250/hr → $62.50 per 15-min unit
const CPT_UNITS = {
  '97110': 1, '97140': 1, '97530': 1, '97542': 1,  // 1 unit (15 min)
  '97161': 2, '97162': 2, '97163': 2,                // eval = 2 units (30 min)
  '97164': 1, '97012': 1, '97032': 1,                // 1 unit
};

// Load employee rates from Settings localStorage
const loadEmployeeRates = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('llc_settings') || '{}');
    return settings.billingRates || { 'Lance Labno (Admin)': 250, 'Romy': 125, 'Sarah': 95, 'Avery': 85, 'Bill': 110 };
  } catch { return { 'Lance Labno (Admin)': 250 }; }
};

const BillingReview = () => {
  const [cycles, setCycles] = useState([]);
  const [soaps, setSoaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCycle, setExpandedCycle] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'review', 'sent', 'paid'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [cycleRes, soapRes] = await Promise.all([
        supabase.from('billing_cycles').select('*').order('start_date', { ascending: false }),
        supabase.from('soap_notes').select('*').order('session_date', { ascending: false }),
      ]);
      setCycles(cycleRes.data || []);
      setSoaps(soapRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Auto-generate current billing cycles if they don't exist
  const ensureCurrentCycles = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    const labels = [
      { label: `${monthStr} First Half`, start: `${year}-${(month + 1).toString().padStart(2, '0')}-01`, end: `${year}-${(month + 1).toString().padStart(2, '0')}-15` },
      { label: `${monthStr} Second Half`, start: `${year}-${(month + 1).toString().padStart(2, '0')}-16`, end: `${year}-${(month + 1).toString().padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}` },
    ];

    for (const l of labels) {
      const exists = cycles.find(c => c.cycle_label === l.label);
      if (!exists) {
        await supabase.from('billing_cycles').insert({ cycle_label: l.label, start_date: l.start, end_date: l.end, status: 'open' });
      }
    }

    const { data } = await supabase.from('billing_cycles').select('*').order('start_date', { ascending: false });
    setCycles(data || []);
  };

  // Get unbilled SOAP notes (not in any cycle)
  const assignedSoapIds = useMemo(() => {
    const ids = new Set();
    cycles.forEach(c => (c.soap_note_ids || []).forEach(id => ids.add(id)));
    return ids;
  }, [cycles]);

  const unbilledSoaps = useMemo(() => {
    return soaps.filter(s => !assignedSoapIds.has(s.id) && s.billing_status !== 'billed');
  }, [soaps, assignedSoapIds]);

  const employeeRates = loadEmployeeRates();
  const defaultRate = employeeRates['Lance Labno (Admin)'] || 250;
  const unitRate = defaultRate / 4; // per 15-min unit

  // Calculate total from CPT codes using 15-min unit billing
  const calcTotal = (soapList) => {
    let total = 0;
    soapList.forEach(s => {
      const codes = (s.cpt_codes || '').split(',').map(c => c.trim()).filter(Boolean);
      codes.forEach(code => { total += (CPT_UNITS[code] || 1) * unitRate; });
      if (codes.length === 0) total += unitRate; // default 1 unit
    });
    return Math.round(total * 100) / 100;
  };

  // Assign unbilled SOAPs to a cycle
  const assignToCycle = async (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId);
    if (!cycle) return;

    const startDate = new Date(cycle.start_date);
    const endDate = new Date(cycle.end_date);
    endDate.setHours(23, 59, 59);

    const matchingSoaps = unbilledSoaps.filter(s => {
      const d = new Date(s.session_date);
      return d >= startDate && d <= endDate;
    });

    if (matchingSoaps.length === 0) return;

    const ids = [...(cycle.soap_note_ids || []), ...matchingSoaps.map(s => s.id)];
    const total = calcTotal(matchingSoaps) + (cycle.total_amount || 0);

    setSaving(true);
    await supabase.from('billing_cycles').update({
      soap_note_ids: ids,
      total_amount: total,
    }).eq('id', cycleId);

    const { data } = await supabase.from('billing_cycles').select('*').order('start_date', { ascending: false });
    setCycles(data || []);
    setSaving(false);
  };

  // Update cycle status
  const updateStatus = async (cycleId, newStatus) => {
    setSaving(true);
    const updates = { status: newStatus };
    if (newStatus === 'review') updates.reviewed_at = new Date().toISOString();
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString();

    await supabase.from('billing_cycles').update(updates).eq('id', cycleId);

    // If marking as sent/paid, update SOAP billing_status
    if (newStatus === 'sent' || newStatus === 'paid') {
      const cycle = cycles.find(c => c.id === cycleId);
      if (cycle?.soap_note_ids?.length) {
        for (const soapId of cycle.soap_note_ids) {
          await supabase.from('soap_notes').update({ billing_status: newStatus === 'paid' ? 'billed' : 'sent' }).eq('id', soapId);
        }
      }
    }

    const { data } = await supabase.from('billing_cycles').select('*').order('start_date', { ascending: false });
    setCycles(data || []);
    const { data: soapData } = await supabase.from('soap_notes').select('*').order('session_date', { ascending: false });
    setSoaps(soapData || []);
    setSaving(false);
  };

  const statusColors = {
    open: { bg: 'rgba(90,138,191,0.1)', color: '#5a8abf' },
    review: { bg: 'rgba(196,154,64,0.1)', color: '#c49a40' },
    sent: { bg: 'rgba(230,81,0,0.1)', color: '#e65100' },
    paid: { bg: 'rgba(45,138,78,0.1)', color: '#2d8a4e' },
  };

  const nextAction = {
    open: { label: 'Start Review', next: 'review', icon: FileText },
    review: { label: 'Mark Sent', next: 'sent', icon: Send },
    sent: { label: 'Mark Paid', next: 'paid', icon: CheckCircle },
    paid: null,
  };

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading...</div>;

  const filteredCycles = filter === 'all' ? cycles : cycles.filter(c => c.status === filter);

  // Summary stats
  const totalUnbilled = unbilledSoaps.length;
  const totalPending = cycles.filter(c => c.status === 'review' || c.status === 'sent').reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const totalPaid = cycles.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const openCycles = cycles.filter(c => c.status === 'open').length;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <DollarSign size={24} color="#2d8a4e" /> Billing Review <InfoTooltip text={PAGE_INFO.billing} />
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.82rem' }}>Bi-monthly billing cycles &middot; Review → Send → Paid</p>
        </div>
        <button onClick={ensureCurrentCycles} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem' }}>
          <Clock size={14} /> Generate Current Cycles
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Unbilled Sessions', value: totalUnbilled, color: '#d14040', icon: AlertTriangle },
          { label: 'Open Cycles', value: openCycles, color: '#5a8abf', icon: Clock },
          { label: 'Pending Amount', value: `$${totalPending.toLocaleString()}`, color: '#c49a40', icon: Send },
          { label: 'Total Collected', value: `$${totalPaid.toLocaleString()}`, color: '#2d8a4e', icon: CheckCircle },
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

      {/* Unbilled Sessions Alert */}
      {totalUnbilled > 0 && (
        <div data-highlight="unbilled-section" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(209,64,64,0.04)', border: '1px solid rgba(209,64,64,0.12)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
          <AlertTriangle size={14} color="#d14040" />
          <span style={{ color: '#3e3c3a' }}><strong style={{ color: '#d14040' }}>{totalUnbilled} sessions</strong> not yet assigned to a billing cycle.</span>
          <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>Generate or select a cycle, then assign sessions.</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {['all', 'open', 'review', 'sent', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', fontSize: '0.82rem', fontWeight: filter === f ? 600 : 500,
            color: filter === f ? '#2d8a4e' : '#6b6764', background: 'none', border: 'none',
            borderBottom: filter === f ? '2px solid #2d8a4e' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-1px', textTransform: 'capitalize',
          }}>
            {f} {f !== 'all' && `(${cycles.filter(c => c.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Billing Cycles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredCycles.map(cycle => {
          const isExpanded = expandedCycle === cycle.id;
          const cycleSoaps = soaps.filter(s => (cycle.soap_note_ids || []).includes(s.id));
          const sc = statusColors[cycle.status] || statusColors.open;
          const action = nextAction[cycle.status];
          const dateMatchUnbilled = unbilledSoaps.filter(s => {
            const d = new Date(s.session_date);
            return d >= new Date(cycle.start_date) && d <= new Date(cycle.end_date + 'T23:59:59');
          });

          return (
            <div key={cycle.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Cycle Header */}
              <div onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {isExpanded ? <ChevronDown size={14} color="#8a8682" /> : <ChevronRight size={14} color="#8a8682" />}
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2e2c2a', flex: 1 }}>{cycle.cycle_label}</span>
                <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>
                  {new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>
                  {cycle.status}
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2d8a4e' }}>
                  ${(cycle.total_amount || 0).toLocaleString()}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{(cycle.soap_note_ids || []).length} sessions</span>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', padding: '10px 0', flexWrap: 'wrap' }}>
                    {dateMatchUnbilled.length > 0 && cycle.status === 'open' && (
                      <button onClick={() => assignToCycle(cycle.id)} disabled={saving}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(90,138,191,0.2)', background: 'rgba(90,138,191,0.06)', color: '#5a8abf', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                        Assign {dateMatchUnbilled.length} session{dateMatchUnbilled.length !== 1 ? 's' : ''} from this period
                      </button>
                    )}
                    {action && (
                      <button onClick={() => updateStatus(cycle.id, action.next)} disabled={saving}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${sc.color}30`, background: sc.bg, color: sc.color, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <action.icon size={12} /> {action.label}
                      </button>
                    )}
                  </div>

                  {/* Session List */}
                  {cycleSoaps.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 60px', gap: '8px', padding: '6px 0', fontSize: '0.68rem', fontWeight: 700, color: '#8a8682', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <span>Client</span><span>Date</span><span>CPT Codes</span><span>Duration</span><span>Est.</span>
                      </div>
                      {cycleSoaps.map(s => {
                        const codes = (s.cpt_codes || '').split(',').map(c => c.trim()).filter(Boolean);
                        const est = codes.reduce((sum, c) => sum + ((CPT_UNITS[c] || 1) * unitRate), 0) || unitRate;
                        return (
                          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 60px', gap: '8px', padding: '6px 0', fontSize: '0.78rem', color: '#3e3c3a', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <span style={{ fontWeight: 600 }}>{s.client_name}</span>
                            <span style={{ color: '#8a8682' }}>{new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span style={{ fontSize: '0.72rem', color: '#5a8abf' }}>{codes.join(', ') || 'None'}</span>
                            <span style={{ color: '#8a8682' }}>{s.duration || '55'}min</span>
                            <span style={{ fontWeight: 600, color: '#2d8a4e' }}>${est}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#8a8682', fontSize: '0.78rem', padding: '10px 0' }}>
                      No sessions assigned yet. {dateMatchUnbilled.length > 0 ? 'Click "Assign sessions" above.' : 'No matching sessions found for this period.'}
                    </p>
                  )}

                  {/* Cycle metadata */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.68rem', color: '#8a8682' }}>
                    {cycle.reviewed_at && <span>Reviewed: {new Date(cycle.reviewed_at).toLocaleDateString()}</span>}
                    {cycle.sent_at && <span>Sent: {new Date(cycle.sent_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCycles.length === 0 && (
          <p style={{ color: '#8a8682', textAlign: 'center', padding: '2rem', fontSize: '0.88rem' }}>
            {filter === 'all' ? 'No billing cycles yet. Click "Generate Current Cycles" to create them.' : `No ${filter} cycles.`}
          </p>
        )}
      </div>

      {/* Internal Rate Guide */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px' }}>Internal Rate Guide (not shown to clients)</h3>

        {/* Employee Rates */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', textTransform: 'uppercase', marginBottom: '6px' }}>Employee Hourly Rates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
            {Object.entries(employeeRates).map(([name, rate]) => (
              <div key={name} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#3e3c3a' }}>{name.replace(' (Admin)', '')}</span>
                <span style={{ color: '#2d8a4e' }}>${rate}/hr</span>
              </div>
            ))}
          </div>
        </div>

        {/* CPT Unit Rates */}
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', textTransform: 'uppercase', marginBottom: '6px' }}>CPT Code Units (15-min increments)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
          {Object.entries(CPT_UNITS).map(([code, units]) => (
            <div key={code} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#3e3c3a' }}>{code}</span>
              <span style={{ color: '#5a8abf' }}>{units} unit{units > 1 ? 's' : ''} = ${(units * unitRate).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.65rem', color: '#8a8682', marginTop: '6px' }}>1 unit = 15 min. Rates from Settings → Billing Rates. Client-facing pricing uses package tiers from Proposal Generator.</p>
      </div>
    </div>
  );
};

export default BillingReview;
