import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Sun, Plane, Star, Plus, Save, X, CheckCircle, Trash2, Edit3, Link2, Copy, ExternalLink } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 07:00 - 17:00
const TIERS = [
  { value: 'tier1', label: 'Tier 1 — Resilience', color: '#2d8a4e', context: 'Long-term stable, great rapport. Retain client, recurring monthly.' },
  { value: 'tier2', label: 'Tier 2 — Flow', color: '#5a8abf', context: 'Active engagement, building relationship. Growth opportunity.' },
  { value: 'tier3', label: 'Tier 3 — Edge', color: '#c49a40', context: 'New or at-risk. Needs extra attention and scheduling priority.' },
];
const PREFERENCES = ['mornings', 'afternoons', 'flexible'];

const ClientAvailability = () => {
  const [clients, setClients] = useState([]);
  const [clinicalLeads, setClinicalLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // client_id being edited
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [form, setForm] = useState({
    client_name: '', client_type: 'clinical',
    preferred_slots: [], preferred_days: [], unavailable_days: [],
    general_preference: 'flexible', vacation_dates: [],
    seasonal_notes: '', client_value_tier: 'standard', scheduling_notes: '',
  });

  // Invite link state
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(null); // client name being invited
  const [inviteCopied, setInviteCopied] = useState(false);

  // Slot add form
  const [newSlot, setNewSlot] = useState({ day: 'Monday', start: '09:00', end: '10:00' });
  const [newVacation, setNewVacation] = useState({ start: '', end: '', notes: '' });

  useEffect(() => {
    const fetch = async () => {
      const [availRes, leadsRes] = await Promise.all([
        supabase.from('client_availability').select('*').order('created_at', { ascending: false }),
        supabase.from('moso_clinical_leads').select('patient_name, id, status, tier').order('patient_name'),
      ]);
      setClients(availRes.data || []);
      setClinicalLeads(leadsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Build heat map data: days × hours → client count
  const heatMapData = useMemo(() => {
    const grid = {};
    DAYS.forEach(day => {
      grid[day] = {};
      HOURS.forEach(hour => { grid[day][hour] = []; });
    });

    clients.forEach(c => {
      const name = c.client_name || c.client_id;
      const hasSlots = (c.preferred_slots || []).length > 0;
      const hasDays = (c.preferred_days || []).length > 0;

      // From preferred_slots (most specific)
      (c.preferred_slots || []).forEach(slot => {
        const startHr = parseInt(slot.start?.split(':')[0]);
        const endHr = parseInt(slot.end?.split(':')[0]);
        if (isNaN(startHr) || isNaN(endHr)) return;
        for (let h = startHr; h < endHr; h++) {
          const hourKey = `${h.toString().padStart(2, '0')}:00`;
          if (grid[slot.day]?.[hourKey] && !grid[slot.day][hourKey].includes(name)) {
            grid[slot.day][hourKey].push(name);
          }
        }
      });

      // From preferred_days + general_preference
      const daysToUse = hasDays ? (c.preferred_days || []) :
        (!hasSlots ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] : []);

      daysToUse.forEach(day => {
        if (!grid[day]) return;
        // Skip days already covered by specific slots
        if ((c.unavailable_days || []).includes(day)) return;
        const pref = c.general_preference || 'flexible';
        const startH = pref === 'afternoons' ? 12 : 7;
        const endH = pref === 'mornings' ? 12 : 17;
        for (let h = startH; h < endH; h++) {
          const hourKey = `${h.toString().padStart(2, '0')}:00`;
          if (grid[day]?.[hourKey] && !grid[day][hourKey].includes(name)) {
            grid[day][hourKey].push(name);
          }
        }
      });
    });

    return grid;
  }, [clients]);

  const getHeatColor = (count) => {
    if (count >= 4) return 'rgba(209,64,64,0.3)';
    if (count === 3) return 'rgba(196,154,64,0.25)';
    if (count === 2) return 'rgba(90,138,191,0.2)';
    if (count === 1) return 'rgba(45,138,78,0.15)';
    return 'rgba(0,0,0,0.02)';
  };

  const startEdit = (client) => {
    setEditing(client.id);
    setForm({
      client_name: client.client_name || client.client_id,
      client_type: client.client_type || 'clinical',
      preferred_slots: client.preferred_slots || [],
      preferred_days: client.preferred_days || [],
      unavailable_days: client.unavailable_days || [],
      general_preference: client.general_preference || 'flexible',
      vacation_dates: client.vacation_dates || [],
      seasonal_notes: client.seasonal_notes || '',
      client_value_tier: client.client_value_tier || 'standard',
      scheduling_notes: client.scheduling_notes || '',
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setEditing(null);
    setForm({
      client_name: '', client_type: 'clinical',
      preferred_slots: [], preferred_days: [], unavailable_days: [],
      general_preference: 'flexible', vacation_dates: [],
      seasonal_notes: '', client_value_tier: 'standard', scheduling_notes: '',
    });
    setShowAdd(true);
  };

  const addSlot = () => {
    if (!newSlot.day || !newSlot.start || !newSlot.end) return;
    setForm(p => ({ ...p, preferred_slots: [...p.preferred_slots, { ...newSlot }] }));
    setNewSlot({ day: 'Monday', start: '09:00', end: '10:00' });
  };

  const removeSlot = (idx) => {
    setForm(p => ({ ...p, preferred_slots: p.preferred_slots.filter((_, i) => i !== idx) }));
  };

  const addVacation = () => {
    if (!newVacation.start || !newVacation.end) return;
    setForm(p => ({ ...p, vacation_dates: [...p.vacation_dates, { ...newVacation }] }));
    setNewVacation({ start: '', end: '', notes: '' });
  };

  const removeVacation = (idx) => {
    setForm(p => ({ ...p, vacation_dates: p.vacation_dates.filter((_, i) => i !== idx) }));
  };

  const toggleDay = (day, field) => {
    setForm(p => {
      const arr = p[field] || [];
      return { ...p, [field]: arr.includes(day) ? arr.filter(d => d !== day) : [...arr, day] };
    });
  };

  const saveClient = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);

    const payload = {
      client_id: form.client_name,
      client_name: form.client_name,
      client_type: form.client_type,
      preferred_slots: form.preferred_slots,
      preferred_days: form.preferred_days,
      unavailable_days: form.unavailable_days,
      general_preference: form.general_preference,
      vacation_dates: form.vacation_dates,
      seasonal_notes: form.seasonal_notes,
      client_value_tier: form.client_value_tier,
      scheduling_notes: form.scheduling_notes,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (editing) {
      const res = await supabase.from('client_availability').update(payload).eq('id', editing);
      err = res.error;
    } else {
      const res = await supabase.from('client_availability').insert(payload);
      err = res.error;
    }

    if (err) {
      // If client_name column doesn't exist yet, retry without it
      delete payload.client_name;
      if (editing) {
        await supabase.from('client_availability').update(payload).eq('id', editing);
      } else {
        await supabase.from('client_availability').insert(payload);
      }
    }

    const { data } = await supabase.from('client_availability').select('*').order('created_at', { ascending: false });
    setClients(data || []);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowAdd(false); setEditing(null); }, 1500);
    setSaving(false);
  };

  const deleteClient = async (id) => {
    await supabase.from('client_availability').delete().eq('id', id);
    setClients(prev => prev.filter(c => c.id !== id));
    if (editing === id) { setEditing(null); setShowAdd(false); }
  };

  const generateInviteLink = async (clientName, clientEmail, clientType) => {
    setInviteLoading(clientName);
    setInviteLink(null);
    setInviteCopied(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/availability/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientName, clientEmail: clientEmail || '', clientType: clientType || 'clinical' }),
      });
      const result = await res.json();
      if (result.success) {
        setInviteLink(result.link);
      } else {
        console.error('Invite error:', result.error);
      }
    } catch (err) {
      console.error('Invite fetch error:', err);
    }
    setInviteLoading(null);
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // Upcoming vacations (next 60 days)
  const upcomingVacations = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 60 * 86400000);
    const vacations = [];
    clients.forEach(c => {
      (c.vacation_dates || []).forEach(v => {
        const start = new Date(v.start);
        const end = new Date(v.end);
        if (end >= now && start <= cutoff) {
          vacations.push({ ...v, client: c.client_name || c.client_id, tier: c.client_value_tier });
        }
      });
    });
    return vacations.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [clients]);

  // CRM name suggestions
  const [clientSelected, setClientSelected] = useState(false);
  const clientSuggestions = useMemo(() => {
    if (clientSelected || !form.client_name || form.client_name.length < 2) return [];
    const q = form.client_name.toLowerCase();
    return clinicalLeads.filter(l => (l.patient_name || '').toLowerCase().includes(q)).slice(0, 5);
  }, [form.client_name, clinicalLeads, clientSelected]);

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading...</div>;

  const tierCounts = TIERS.map(t => ({ ...t, count: clients.filter(c => c.client_value_tier === t.value).length, clients: clients.filter(c => c.client_value_tier === t.value) }));
  const [expandedTier, setExpandedTier] = useState(null);
  const [expandedScheduling, setExpandedScheduling] = useState(null);

  // Scheduling breakdown
  const schedulingStats = useMemo(() => {
    const mornings = clients.filter(c => c.general_preference === 'mornings');
    const afternoons = clients.filter(c => c.general_preference === 'afternoons');
    const flexible = clients.filter(c => c.general_preference === 'flexible' || !c.general_preference);
    return [
      { key: 'mornings', label: 'Morning Preference', count: mornings.length, clients: mornings, color: '#c49a40', icon: '☀️' },
      { key: 'afternoons', label: 'Afternoon Preference', count: afternoons.length, clients: afternoons, color: '#5a8abf', icon: '🌤' },
      { key: 'flexible', label: 'Flexible', count: flexible.length, clients: flexible, color: '#2d8a4e', icon: '✓' },
    ];
  }, [clients]);

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Calendar size={24} color="#ad1457" /> Client Availability <InfoTooltip text={PAGE_INFO.availability} />
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.82rem' }}>{clients.length} clients tracked &middot; Scheduling heat map &middot; Vacation tracking</p>
        </div>
        <button onClick={startAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem' }}>
          <Plus size={14} /> Add Client
        </button>
      </div>

      {/* Tier Summary Cards — clickable to expand client list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {tierCounts.map(t => (
          <div key={t.value} className="glass-panel" onClick={() => setExpandedTier(expandedTier === t.value ? null : t.value)}
            style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', border: expandedTier === t.value ? `2px solid ${t.color}` : '2px solid transparent' }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Star size={16} color={t.color} style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: t.color }}>{t.count}</div>
            <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{t.label}</div>
            <div style={{ fontSize: '0.6rem', color: t.color, marginTop: '4px' }}>{expandedTier === t.value ? 'Click to collapse' : 'Click to see clients'}</div>
          </div>
        ))}
      </div>

      {/* Expanded Tier Client List */}
      {expandedTier && (() => {
        const tier = tierCounts.find(t => t.value === expandedTier);
        if (!tier || tier.clients.length === 0) return <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: '#8a8682', fontSize: '0.85rem' }}>No clients in {tier?.label}</div>;
        return (
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: `3px solid ${tier.color}` }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: tier.color, marginBottom: '10px' }}>
              {tier.label} — {tier.clients.length} client{tier.clients.length !== 1 ? 's' : ''}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {tier.clients.map(c => (
                <div key={c.id} style={{ padding: '8px 12px', borderRadius: '8px', background: `${tier.color}08`, border: `1px solid ${tier.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e2c2a' }}>{c.client_name || c.client_id}</div>
                    <div style={{ fontSize: '0.68rem', color: '#8a8682' }}>
                      {c.general_preference || 'flexible'} &middot; {(c.preferred_slots || []).length} slots
                      {(c.vacation_dates || []).length > 0 && ` · ${(c.vacation_dates || []).length} vacation`}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#8a8682' }}>
                    <Edit3 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Scheduling Preference Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {schedulingStats.map(s => (
          <div key={s.key} className="glass-panel" onClick={() => setExpandedScheduling(expandedScheduling === s.key ? null : s.key)}
            style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s', border: expandedScheduling === s.key ? `2px solid ${s.color}` : '2px solid transparent' }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{s.label}</div>
            <div style={{ fontSize: '0.6rem', color: s.color, marginTop: '4px' }}>{expandedScheduling === s.key ? 'Collapse' : 'See clients'}</div>
          </div>
        ))}
      </div>

      {/* Expanded Scheduling Client List */}
      {expandedScheduling && (() => {
        const stat = schedulingStats.find(s => s.key === expandedScheduling);
        if (!stat || stat.clients.length === 0) return null;
        return (
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: `3px solid ${stat.color}` }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: stat.color, marginBottom: '10px' }}>
              {stat.label} — {stat.clients.length} client{stat.clients.length !== 1 ? 's' : ''}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {stat.clients.map(c => {
                const tierInfo = TIERS.find(t => t.value === c.client_value_tier) || TIERS[1];
                return (
                  <div key={c.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e2c2a' }}>{c.client_name || c.client_id}</div>
                    <div style={{ fontSize: '0.68rem', color: tierInfo.color }}>{tierInfo.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Scheduling Heat Map */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflow: 'auto' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={16} color="#c49a40" /> Scheduling Heat Map
          <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#8a8682' }}>Client density by day/time</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`, gap: '2px', fontSize: '0.72rem' }}>
          {/* Header row */}
          <div />
          {DAYS.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 700, color: '#3e3c3a', padding: '6px 0' }}>{day.slice(0, 3)}</div>
          ))}

          {/* Time rows */}
          {HOURS.map(hour => (
            <>
              <div key={`label-${hour}`} style={{ textAlign: 'right', paddingRight: '8px', color: '#8a8682', fontWeight: 600, lineHeight: '32px' }}>{hour}</div>
              {DAYS.map(day => {
                const names = heatMapData[day]?.[hour] || [];
                return (
                  <div key={`${day}-${hour}`} title={names.length > 0 ? `${names.join(', ')} (${names.length})` : 'Open'}
                    style={{ background: getHeatColor(names.length), borderRadius: '4px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 600, color: names.length > 0 ? '#3e3c3a' : '#ccc', cursor: 'default', transition: 'background 0.2s' }}>
                    {names.length > 0 ? names.length : ''}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.68rem', color: '#8a8682' }}>
          {[
            { label: 'Open', bg: 'rgba(0,0,0,0.02)' },
            { label: '1 client', bg: 'rgba(45,138,78,0.15)' },
            { label: '2 clients', bg: 'rgba(90,138,191,0.2)' },
            { label: '3 clients', bg: 'rgba(196,154,64,0.25)' },
            { label: '4+ clients', bg: 'rgba(209,64,64,0.3)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: l.bg }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scheduling Seasons + Weekly Openings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Scheduling Seasons */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} color="#b06050" /> Scheduling Seasons
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#8a8682', marginBottom: '12px' }}>Major scheduling review periods. Plan client loads ahead of each season.</p>
          {[
            { label: 'Spring (Mar–Apr)', months: [2, 3], color: '#2d8a4e', desc: 'Post-winter ramp-up. New client intake. Insurance resets.' },
            { label: 'Summer (May–Aug)', months: [4, 5, 6, 7], color: '#5a8abf', desc: 'Vacation coverage. Reduced frequency. Maintain consistency.' },
            { label: 'Fall–Winter (Sep–Dec)', months: [8, 9, 10, 11], color: '#c49a40', desc: 'Peak volume. Holiday scheduling. Year-end billing push.' },
          ].map(season => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const isActive = season.months.includes(currentMonth);
            const clientsInSeason = clients.filter(c => {
              // Count clients with vacation dates NOT in this season
              const hasVacation = (c.vacation_dates || []).some(v => {
                const vStart = new Date(v.start);
                return season.months.includes(vStart.getMonth());
              });
              return !hasVacation;
            });
            return (
              <div key={season.label} style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', background: isActive ? `${season.color}08` : 'rgba(0,0,0,0.02)', border: isActive ? `2px solid ${season.color}30` : '1px solid rgba(0,0,0,0.04)', borderLeft: `3px solid ${season.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: season.color }}>{season.label}</span>
                  {isActive && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: `${season.color}18`, color: season.color, textTransform: 'uppercase' }}>Current</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b6764', marginBottom: '4px' }}>{season.desc}</div>
                <div style={{ fontSize: '0.68rem', color: '#8a8682' }}>~{clientsInSeason.length} clients available this season</div>
              </div>
            );
          })}
        </div>

        {/* Weekly Openings — clients without appointments this week */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="#5a8abf" /> Weekly Openings
            <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#8a8682' }}>Clients to call/text/email</span>
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#8a8682', marginBottom: '10px' }}>Clients with preferences but no confirmed appointment this week. Sorted by tier (highest-value first).</p>
          {(() => {
            // All clients sorted by tier priority, then by preference
            const tierOrder = { tier1: 0, tier2: 1, tier3: 2, standard: 3 };
            const sorted = [...clients]
              .sort((a, b) => (tierOrder[a.client_value_tier] ?? 9) - (tierOrder[b.client_value_tier] ?? 9));
            const top = sorted.slice(0, 8);
            if (top.length === 0) return <p style={{ fontSize: '0.78rem', color: '#bbb', fontStyle: 'italic' }}>No clients with availability preferences yet.</p>;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {top.map(c => {
                  const tier = TIERS.find(t => t.value === c.client_value_tier);
                  const pref = c.general_preference || 'flexible';
                  const days = (c.preferred_days || []).map(d => d.slice(0, 3)).join(', ') || 'Any day';
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tier?.color || '#8a8682', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#2e2c2a', flex: 1 }}>{c.client_name || c.client_id}</span>
                      <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: `${tier?.color || '#8a8682'}12`, color: tier?.color || '#8a8682' }}>{tier?.label?.split(' — ')[1] || 'Standard'}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8a8682' }}>{pref} · {days}</span>
                    </div>
                  );
                })}
                {sorted.length > 8 && <div style={{ fontSize: '0.68rem', color: '#8a8682', padding: '4px 10px' }}>+{sorted.length - 8} more clients</div>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Upcoming Vacations */}
      {upcomingVacations.length > 0 && (
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plane size={14} color="#5a8abf" /> Upcoming Vacations (60 days)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {upcomingVacations.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(90,138,191,0.04)', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: '#2e2c2a', minWidth: '120px' }}>{v.client}</span>
                <span style={{ color: '#5a8abf' }}>{new Date(v.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(v.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                {v.notes && <span style={{ color: '#8a8682', fontSize: '0.72rem' }}>{v.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Link Banner */}
      {inviteLink && (
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(90,138,191,0.06)', border: '1px solid rgba(90,138,191,0.15)' }}>
          <ExternalLink size={16} color="#5a8abf" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5a8abf', marginBottom: '4px' }}>Availability Link Generated</div>
            <input
              type="text" value={inviteLink} readOnly
              onClick={e => e.target.select()}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: '6px',
                border: '1px solid rgba(90,138,191,0.2)', fontSize: '0.78rem',
                background: '#fff', color: '#3e3c3a', boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '0.68rem', color: '#8a8682', marginTop: '4px' }}>Copy this link and send it to the client. It expires in 7 days.</div>
          </div>
          <button onClick={copyInviteLink} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
            border: '1px solid rgba(90,138,191,0.3)', cursor: 'pointer',
            background: inviteCopied ? 'rgba(45,138,78,0.1)' : 'rgba(90,138,191,0.08)',
            color: inviteCopied ? '#2d8a4e' : '#5a8abf',
            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
          }}>
            {inviteCopied ? <><CheckCircle size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          <button onClick={() => setInviteLink(null)} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#8a8682' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Client List + Edit Form */}
      <div style={{ display: 'grid', gridTemplateColumns: (showAdd || editing) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Client List */}
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px' }}>Clients ({clients.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflow: 'auto' }}>
            {clients.map(c => {
              const tier = TIERS.find(t => t.value === c.client_value_tier);
              const slotCount = (c.preferred_slots || []).length + (c.preferred_days || []).length;
              return (
                <div key={c.id} onClick={() => startEdit(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: editing === c.id ? 'rgba(173,20,87,0.06)' : 'rgba(0,0,0,0.01)', border: editing === c.id ? '1px solid rgba(173,20,87,0.15)' : '1px solid transparent' }}
                  onMouseEnter={e => { if (editing !== c.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                  onMouseLeave={e => { if (editing !== c.id) e.currentTarget.style.background = 'rgba(0,0,0,0.01)'; }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2e2c2a', flex: 1 }}>{c.client_name || c.client_id}</span>
                  <span title={tier?.context || ''} style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: `${tier?.color}15`, color: tier?.color }}>{tier?.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>{slotCount} slot{slotCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>{c.general_preference}</span>
                  <button onClick={e => { e.stopPropagation(); generateInviteLink(c.client_name || c.client_id, c.client_email, c.client_type); }}
                    title="Generate availability link"
                    style={{ padding: '3px', borderRadius: '4px', border: 'none', background: 'none', color: inviteLoading === (c.client_name || c.client_id) ? '#ad1457' : '#ccc', cursor: 'pointer' }}
                    onMouseEnter={e => { if (inviteLoading !== (c.client_name || c.client_id)) e.currentTarget.style.color = '#5a8abf'; }}
                    onMouseLeave={e => { if (inviteLoading !== (c.client_name || c.client_id)) e.currentTarget.style.color = '#ccc'; }}>
                    <Link2 size={12} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteClient(c.id); }} style={{ padding: '3px', borderRadius: '4px', border: 'none', background: 'none', color: '#ccc', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#d14040'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
            {clients.length === 0 && <p style={{ color: '#8a8682', textAlign: 'center', padding: '2rem', fontSize: '0.82rem' }}>No clients yet. Click "Add Client" to start.</p>}
          </div>
        </div>

        {/* Edit / Add Form */}
        {(showAdd || editing) && (
          <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative', zIndex: clientSuggestions.length > 0 && !clientSelected ? 100 : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2e2c2a' }}>
                {editing ? 'Edit Client' : 'Add Client'}
              </h3>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#8a8682' }}>
                <X size={16} />
              </button>
            </div>

            {/* Client Name */}
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Client Name *</label>
              <input type="text" value={form.client_name}
                onChange={e => { setForm(p => ({ ...p, client_name: e.target.value })); setClientSelected(false); }}
                placeholder="Start typing..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              {clientSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', borderRadius: '0 0 8px 8px', border: '1px solid rgba(0,0,0,0.15)', borderTop: 'none', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                  {clientSuggestions.map(lead => (
                    <div key={lead.id}
                      onClick={(e) => { e.stopPropagation(); setForm(p => ({ ...p, client_name: lead.patient_name })); setClientSelected(true); }}
                      style={{ padding: '12px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#ffffff', userSelect: 'none', position: 'relative', zIndex: 9999 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0eeec'} onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                      <strong style={{ display: 'block', color: '#2e2c2a' }}>{lead.patient_name}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#8a8682' }}>{lead.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Type + Tier + Preference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Type</label>
                <select value={form.client_type} onChange={e => setForm(p => ({ ...p, client_type: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                  <option value="clinical">Clinical</option>
                  <option value="consulting">Consulting</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Value Tier</label>
                <select value={form.client_value_tier} onChange={e => setForm(p => ({ ...p, client_value_tier: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                  {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {(() => {
                  const selected = TIERS.find(t => t.value === form.client_value_tier);
                  if (!selected) return null;
                  return (
                    <div style={{ fontSize: '0.68rem', color: selected.color, marginTop: '4px', lineHeight: 1.4, padding: '4px 6px', borderRadius: '4px', background: `${selected.color}08` }}>
                      <strong>{selected.label}</strong><br />
                      {selected.context}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>General Preference</label>
                <select value={form.general_preference} onChange={e => setForm(p => ({ ...p, general_preference: e.target.value }))} className="kanban-select" style={{ marginTop: 0, width: '100%', fontSize: '0.82rem' }}>
                  {PREFERENCES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Preferred Days */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#2d8a4e', display: 'block', marginBottom: '4px' }}>Preferred Days</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {DAYS.map(day => (
                  <button key={day} onClick={() => toggleDay(day, 'preferred_days')}
                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      border: form.preferred_days.includes(day) ? '1px solid #2d8a4e' : '1px solid rgba(0,0,0,0.08)',
                      background: form.preferred_days.includes(day) ? 'rgba(45,138,78,0.1)' : 'rgba(0,0,0,0.02)',
                      color: form.preferred_days.includes(day) ? '#2d8a4e' : '#8a8682' }}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Unavailable Days */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d14040', display: 'block', marginBottom: '4px' }}>Unavailable Days</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {DAYS.map(day => (
                  <button key={day} onClick={() => toggleDay(day, 'unavailable_days')}
                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      border: form.unavailable_days.includes(day) ? '1px solid #d14040' : '1px solid rgba(0,0,0,0.08)',
                      background: form.unavailable_days.includes(day) ? 'rgba(209,64,64,0.1)' : 'rgba(0,0,0,0.02)',
                      color: form.unavailable_days.includes(day) ? '#d14040' : '#8a8682' }}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Time Slots */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5a8abf', display: 'block', marginBottom: '4px' }}>Preferred Time Slots</label>
              {form.preferred_slots.map((slot, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.78rem', color: '#3e3c3a' }}>
                  <span style={{ fontWeight: 600 }}>{slot.day.slice(0, 3)}</span>
                  <span>{slot.start} — {slot.end}</span>
                  <button onClick={() => removeSlot(i)} style={{ padding: '2px', border: 'none', background: 'none', color: '#ccc', cursor: 'pointer' }}><X size={12} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select value={newSlot.day} onChange={e => setNewSlot(p => ({ ...p, day: e.target.value }))} className="kanban-select" style={{ marginTop: 0, fontSize: '0.75rem', padding: '4px 6px' }}>
                  {DAYS.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                </select>
                <input type="time" value={newSlot.start} onChange={e => setNewSlot(p => ({ ...p, start: e.target.value }))} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem' }} />
                <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>to</span>
                <input type="time" value={newSlot.end} onChange={e => setNewSlot(p => ({ ...p, end: e.target.value }))} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem' }} />
                <button onClick={addSlot} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(90,138,191,0.2)', background: 'rgba(90,138,191,0.06)', color: '#5a8abf', cursor: 'pointer', fontSize: '0.72rem' }}>
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Vacation Dates */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e65100', display: 'block', marginBottom: '4px' }}>
                <Plane size={11} style={{ marginRight: '4px' }} /> Vacation / Out of Town
              </label>
              {form.vacation_dates.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.78rem', color: '#3e3c3a' }}>
                  <span>{v.start} — {v.end}</span>
                  {v.notes && <span style={{ color: '#8a8682', fontSize: '0.72rem' }}>({v.notes})</span>}
                  <button onClick={() => removeVacation(i)} style={{ padding: '2px', border: 'none', background: 'none', color: '#ccc', cursor: 'pointer' }}><X size={12} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input type="date" value={newVacation.start} onChange={e => setNewVacation(p => ({ ...p, start: e.target.value }))} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem' }} />
                <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>to</span>
                <input type="date" value={newVacation.end} onChange={e => setNewVacation(p => ({ ...p, end: e.target.value }))} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem' }} />
                <input type="text" value={newVacation.notes} onChange={e => setNewVacation(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', width: '100px' }} />
                <button onClick={addVacation} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(230,81,0,0.2)', background: 'rgba(230,81,0,0.06)', color: '#e65100', cursor: 'pointer', fontSize: '0.72rem' }}>
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Seasonal Notes */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Seasonal Notes</label>
              <input type="text" value={form.seasonal_notes} onChange={e => setForm(p => ({ ...p, seasonal_notes: e.target.value }))} placeholder="e.g. Snowbird to AZ Dec-Jan"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.82rem', boxSizing: 'border-box' }} />
            </div>

            {/* Scheduling Notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', display: 'block', marginBottom: '4px' }}>Scheduling Notes</label>
              <textarea value={form.scheduling_notes} onChange={e => setForm(p => ({ ...p, scheduling_notes: e.target.value }))} placeholder="Any other scheduling preferences..."
                rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveClient} disabled={!form.client_name.trim() || saving} className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {saved ? <><CheckCircle size={14} /> Saved!</> : saving ? 'Saving...' : <><Save size={14} /> {editing ? 'Update' : 'Add'} Client</>}
              </button>
              {editing && (
                <button
                  onClick={() => generateInviteLink(form.client_name, '', form.client_type)}
                  disabled={!form.client_name.trim() || inviteLoading === form.client_name}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid rgba(90,138,191,0.3)', cursor: 'pointer',
                    background: 'rgba(90,138,191,0.06)', color: '#5a8abf',
                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  }}
                  title="Generate a link for this client to fill in their own availability"
                >
                  <Link2 size={14} /> Send Link
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAvailability;
