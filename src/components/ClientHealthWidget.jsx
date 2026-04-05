import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ClientHealthWidget = ({ clientName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientName || clientName.trim().length < 2) { setLoading(false); setData(null); return; }

    const fetchHealth = async () => {
      setLoading(true);
      try {
        // Fetch last session brief
        const { data: briefs } = await supabase
          .from('session_briefs')
          .select('client_name, tier, nervous_system_state, session_date, created_at')
          .eq('client_name', clientName)
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch last SOAP note
        const { data: soaps } = await supabase
          .from('soap_notes')
          .select('client_name, session_date, billing_status, created_at')
          .eq('client_name', clientName)
          .order('created_at', { ascending: false })
          .limit(5);

        // Determine most recent visit
        const allDates = [
          ...(briefs || []).map(b => b.session_date || b.created_at),
          ...(soaps || []).map(s => s.session_date || s.created_at),
        ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));

        const lastVisitDate = allDates[0] || null;
        const daysSince = lastVisitDate ? Math.floor((Date.now() - new Date(lastVisitDate)) / 86400000) : null;

        // Nervous system state from last brief
        const nsState = briefs?.[0]?.nervous_system_state || null;

        // Tier from last brief
        const tier = briefs?.[0]?.tier || null;

        // Billing: count unbilled SOAP notes
        const unbilledCount = (soaps || []).filter(s => s.billing_status === 'pending' || s.billing_status === 'unbilled').length;

        setData({
          lastVisitDate,
          daysSince,
          nsState,
          tier,
          unbilledCount,
        });
      } catch (err) {
        console.error('ClientHealthWidget error:', err);
        setData(null);
      }
      setLoading(false);
    };

    fetchHealth();
  }, [clientName]);

  if (loading || !data) return null;

  const nsColors = { Green: '#2d8a4e', Amber: '#c49a40', Red: '#d14040' };
  const daysColor = data.daysSince == null ? '#8a8682' : data.daysSince > 30 ? '#d14040' : data.daysSince > 14 ? '#c49a40' : '#2d8a4e';

  // Determine status badge
  const statusLabel = data.tier || 'Active Client';
  const tierNum = data.tier?.match(/Tier\s*(\d)/)?.[1];
  const statusColor = tierNum === '1' ? '#2d8a4e' : tierNum === '2' ? '#5a8abf' : tierNum === '3' ? '#c49a40' : '#2d8a4e';

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '8px 16px',
      height: '50px',
      boxSizing: 'border-box',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      fontSize: '0.78rem',
      color: '#6b6764',
      flexWrap: 'nowrap',
      overflowX: 'auto',
    }}>
      {/* Client Name */}
      <span style={{ fontWeight: 700, color: '#2e2c2a', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {clientName}
      </span>

      {/* Divider */}
      <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />

      {/* Status Badge */}
      <span style={{
        padding: '2px 8px',
        borderRadius: '6px',
        background: statusColor + '15',
        color: statusColor,
        fontWeight: 600,
        fontSize: '0.72rem',
        whiteSpace: 'nowrap',
      }}>
        {statusLabel}
      </span>

      {/* Divider */}
      <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />

      {/* Last Visit */}
      <span style={{ whiteSpace: 'nowrap' }}>
        Last visit: <strong>{formatDate(data.lastVisitDate)}</strong>
      </span>

      {/* NS State */}
      {data.nsState && (
        <>
          <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: nsColors[data.nsState] || '#8a8682',
              display: 'inline-block',
            }} />
            {data.nsState}
          </span>
        </>
      )}

      {/* Divider */}
      <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />

      {/* Days Since */}
      <span style={{ color: daysColor, fontWeight: data.daysSince > 14 ? 600 : 400, whiteSpace: 'nowrap' }}>
        {data.daysSince != null ? `${data.daysSince}d ago` : '—'}
        {data.daysSince > 30 && ' !!'}
        {data.daysSince > 14 && data.daysSince <= 30 && ' !'}
      </span>

      {/* Divider */}
      <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />

      {/* Billing */}
      <span style={{
        color: data.unbilledCount > 0 ? '#c49a40' : '#2d8a4e',
        fontWeight: data.unbilledCount > 0 ? 600 : 400,
        whiteSpace: 'nowrap',
      }}>
        {data.unbilledCount > 0 ? `${data.unbilledCount} unbilled` : 'Billing current'}
      </span>
    </div>
  );
};

export default ClientHealthWidget;
