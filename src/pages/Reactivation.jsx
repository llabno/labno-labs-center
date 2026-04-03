import { useState, useEffect, useMemo } from 'react';
import { Inbox, Phone, Mail, MessageSquare, CheckCircle, XCircle, Archive, ChevronDown, ChevronUp, Send, RefreshCw, Star, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const METHOD_ICONS = { email: Mail, call: Phone, text: MessageSquare };
const METHOD_COLORS = { email: '#1565c0', call: '#2e7d32', text: '#7b1fa2' };

const EMAIL_TEMPLATES = [
  {
    name: 'Wellness Check-In',
    subject: 'How are you feeling? — Movement Solutions',
    body: `Hi {name},\n\nIt's been a while since your last visit and I wanted to check in. How are you feeling? If any of your symptoms have returned or you're dealing with something new, we're here to help.\n\nWould you like to schedule a follow-up? I have some openings this week.\n\nBest,\nLance Labno, PT\nMovement Solutions`,
  },
  {
    name: 'New Program Announcement',
    subject: 'Something new at Movement Solutions',
    body: `Hi {name},\n\nWe've launched some exciting new programs since your last visit and I thought you might be interested.\n\nWhether you're looking to improve mobility, reduce pain, or optimize performance — we have something that fits.\n\nWant to learn more? Just reply to this email or give us a call.\n\nBest,\nLance Labno, PT\nMovement Solutions`,
  },
  {
    name: 'Referral Ask',
    subject: 'Know someone who could use our help?',
    body: `Hi {name},\n\nI hope you've been doing well since we last worked together. If you know anyone — a friend, family member, or colleague — who's dealing with pain or mobility issues, I'd love to help them too.\n\nReferrals are the best compliment we can receive. Thank you for trusting us with your care.\n\nBest,\nLance Labno, PT\nMovement Solutions`,
  },
  {
    name: 'Quick Re-engagement',
    subject: 'Checking in — {name}',
    body: `Hi {name},\n\nJust a quick note to see how you're doing. It's been a while and I want to make sure you're still on track with your goals.\n\nIf you'd like to come back in for a tune-up session, I have availability this week. No commitment needed.\n\nBest,\nLance`,
  },
];

const Reactivation = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending | contacted | archived | all
  const [editingMessage, setEditingMessage] = useState({});
  const [sending, setSending] = useState({});
  const [commLog, setCommLog] = useState([]);
  const [scoring, setScoring] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reactivation_queue')
      .select('*')
      .order('priority_score', { ascending: false });
    if (!error) setQueue(data || []);
    setLoading(false);
  };

  const fetchCommLog = async () => {
    const { data } = await supabase
      .from('communication_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setCommLog(data);
  };

  useEffect(() => { fetchQueue(); fetchCommLog(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return queue;
    return queue.filter(q => q.status === filter);
  }, [queue, filter]);

  const stats = useMemo(() => ({
    total: queue.length,
    pending: queue.filter(q => q.status === 'pending').length,
    contacted: queue.filter(q => q.status === 'contacted').length,
    archived: queue.filter(q => q.status === 'archived').length,
    highPriority: queue.filter(q => q.priority_score >= 80).length,
    avgScore: queue.length ? Math.round(queue.reduce((s, q) => s + q.priority_score, 0) / queue.length) : 0,
  }), [queue]);

  const updateStatus = async (id, newStatus) => {
    await supabase.from('reactivation_queue')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    await fetchQueue();
  };

  const updateMethod = async (id, method) => {
    await supabase.from('reactivation_queue')
      .update({ outreach_method: method })
      .eq('id', id);
    await fetchQueue();
  };

  const logAndSend = async (item, type) => {
    setSending(prev => ({ ...prev, [item.id]: type }));
    const message = editingMessage[item.id] || item.suggested_message;

    // Log the communication
    await supabase.from('communication_log').insert({
      lead_id: item.lead_id,
      lead_name: item.lead_name,
      comm_type: type,
      direction: 'outbound',
      subject: `Reactivation ${type} to ${item.lead_name}`,
      body: message,
      status: 'sent',
      user_email: 'lance@movement-solutions.com'
    });

    // Update queue
    await supabase.from('reactivation_queue')
      .update({
        status: 'contacted',
        contact_attempts: (item.contact_attempts || 0) + 1,
        last_contact_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    // Try RingCentral for calls/texts
    if (type === 'call' || type === 'text') {
      try {
        const endpoint = type === 'call' ? '/api/ringcentral/call' : '/api/ringcentral/sms';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: item.phone || item.mobile,
            message: message,
            leadName: item.lead_name,
            leadId: item.lead_id
          })
        });
        const data = await res.json();
        if (data.fallback) {
          // RingCentral not configured — use native link
          window.open(data.fallback, '_blank');
        }
      } catch (e) { console.error('RingCentral error:', e); }
    }

    if (type === 'email') {
      // Open mailto with pre-filled message
      const subject = encodeURIComponent('Checking in — Movement Solutions');
      const body = encodeURIComponent(message);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    }

    setSending(prev => ({ ...prev, [item.id]: null }));
    await fetchQueue();
    await fetchCommLog();
  };

  const ScoreBadge = ({ score }) => {
    const color = score >= 80 ? '#2e7d32' : score >= 60 ? '#e65100' : '#666';
    const bg = score >= 80 ? '#e8f5e9' : score >= 60 ? '#fff3e0' : '#f5f5f5';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: bg, color }}>
        {score >= 80 && <Star size={10} />}
        {score}
      </span>
    );
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Inbox color="#b06050" /> Reactivation Inbox
        <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(176,96,80,0.1)', color: '#b06050', fontWeight: 600 }}>
          {stats.pending} pending · {stats.highPriority} high priority
        </span>
      </h1>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', value: stats.pending, color: '#e65100', key: 'pending' },
          { label: 'Contacted', value: stats.contacted, color: '#2e7d32', key: 'contacted' },
          { label: 'Archived', value: stats.archived, color: '#666', key: 'archived' },
          { label: 'Avg Score', value: stats.avgScore, color: '#1565c0', key: null },
        ].map(s => (
          <div key={s.label} onClick={() => s.key && setFilter(filter === s.key ? 'all' : s.key)}
            className="glass-panel" style={{
              padding: '0.75rem 1rem', cursor: s.key ? 'pointer' : 'default', minWidth: '100px',
              borderTop: `3px solid ${s.color}`,
              background: filter === s.key ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s ease'
            }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>{s.label}</div>
          </div>
        ))}
        <button onClick={async () => {
          setScoring(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/reactivation/score', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            await fetchQueue();
          } catch (e) { console.error('Scoring failed:', e); }
          setScoring(false);
        }} className="glass-panel"
          style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#b06050', border: 'none', background: 'rgba(176,96,80,0.06)', fontWeight: 600, fontSize: '0.8rem' }}>
          {scoring ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scoring...</> : <><AlertTriangle size={14} /> Rescore Leads</>}
        </button>
        <button onClick={() => { fetchQueue(); fetchCommLog(); }} className="glass-panel"
          style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#666', border: 'none', background: 'rgba(255,255,255,0.5)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Main Content: Queue + Log side by side */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

        {/* Queue */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem' }}>
            {['pending', 'contacted', 'archived', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`filter-pill${filter === f ? ' active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '5px 12px', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading queue...</div> :
              filtered.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No {filter} leads</div> :
                filtered.map(item => {
                  const isExpanded = expandedId === item.id;
                  const MethodIcon = METHOD_ICONS[item.outreach_method] || Mail;
                  return (
                    <div key={item.id} className="glass-panel" style={{
                      marginBottom: '0.5rem', padding: '0.75rem 1rem',
                      borderLeft: `3px solid ${item.priority_score >= 80 ? '#2e7d32' : item.priority_score >= 60 ? '#e65100' : '#999'}`,
                      transition: 'all 0.2s ease'
                    }}>
                      {/* Header Row */}
                      <div onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <ScoreBadge score={item.priority_score} />
                        <strong style={{ flex: 1, fontSize: '0.9rem', color: '#2e2c2a' }}>{item.lead_name}</strong>
                        <MethodIcon size={14} color={METHOD_COLORS[item.outreach_method] || '#666'} />
                        <select value={item.outreach_method} onClick={e => e.stopPropagation()}
                          onChange={e => updateMethod(item.id, e.target.value)}
                          style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.7)' }}>
                          <option value="email">Email</option>
                          <option value="text">Text</option>
                          <option value="call">Call</option>
                        </select>
                        {item.contact_attempts > 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#999' }}>{item.contact_attempts}x contacted</span>
                        )}
                        {isExpanded ? <ChevronUp size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          {/* Template Selector */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Template</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {EMAIL_TEMPLATES.map(tpl => (
                                <button
                                  key={tpl.name}
                                  onClick={() => setEditingMessage(prev => ({ ...prev, [item.id]: tpl.body.replace(/\{name\}/g, item.lead_name?.split(' ')[0] || 'there') }))}
                                  style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer',
                                    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', color: '#444',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {tpl.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Message */}
                          <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Message</label>
                            <textarea
                              value={editingMessage[item.id] !== undefined ? editingMessage[item.id] : item.suggested_message}
                              onChange={e => setEditingMessage(prev => ({ ...prev, [item.id]: e.target.value }))}
                              rows={3}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem', resize: 'vertical', background: 'rgba(255,255,255,0.7)', fontFamily: 'inherit' }}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button onClick={() => logAndSend(item, 'email')} disabled={!!sending[item.id]}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#1565c0', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <Mail size={12} /> {sending[item.id] === 'email' ? 'Sending...' : 'Send Email'}
                            </button>
                            <button onClick={() => logAndSend(item, 'text')} disabled={!!sending[item.id]}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#7b1fa2', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <MessageSquare size={12} /> {sending[item.id] === 'text' ? 'Sending...' : 'Send Text'}
                            </button>
                            <button onClick={() => logAndSend(item, 'call')} disabled={!!sending[item.id]}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#2e7d32', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <Phone size={12} /> {sending[item.id] === 'call' ? 'Calling...' : 'Call'}
                            </button>

                            <div style={{ flex: 1 }}></div>

                            <button onClick={() => updateStatus(item.id, 'contacted')}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', cursor: 'pointer', color: '#2e7d32' }}>
                              <CheckCircle size={12} /> Mark Contacted
                            </button>
                            <button onClick={() => updateStatus(item.id, 'archived')}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', cursor: 'pointer', color: '#999' }}>
                              <Archive size={12} /> Archive
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Communication Log Sidebar */}
        <div className="glass-panel" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> Recent Activity
          </h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {commLog.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>No communications logged yet</div>
            ) : commLog.map(log => {
              const LogIcon = METHOD_ICONS[log.comm_type] || Mail;
              return (
                <div key={log.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LogIcon size={12} color={METHOD_COLORS[log.comm_type] || '#666'} />
                    <strong style={{ color: '#444' }}>{log.lead_name || 'Unknown'}</strong>
                    <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: '0.7rem' }}>
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: '#888', marginTop: '2px', paddingLeft: '18px' }}>
                    {log.comm_type} — {log.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reactivation;
