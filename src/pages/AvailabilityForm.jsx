import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, CheckCircle, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PREFERENCES = [
  { value: 'mornings', label: 'Mornings (before noon)' },
  { value: 'afternoons', label: 'Afternoons (after noon)' },
  { value: 'flexible', label: 'Flexible / No preference' },
];

const AvailabilityForm = () => {
  const [token, setToken] = useState(null);
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | expired | used | submitted | error
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [preferredDays, setPreferredDays] = useState([]);
  const [generalPreference, setGeneralPreference] = useState('flexible');
  const [preferredSlots, setPreferredSlots] = useState([]);
  const [vacationDates, setVacationDates] = useState([]);
  const [schedulingNotes, setSchedulingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add slot/vacation forms
  const [newSlot, setNewSlot] = useState({ day: 'Monday', start: '09:00', end: '10:00' });
  const [newVacation, setNewVacation] = useState({ start: '', end: '', notes: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setStatus('invalid');
      setErrorMsg('No invitation token provided.');
      return;
    }
    setToken(t);
    validateToken(t);
  }, []);

  const validateToken = async (t) => {
    const { data, error } = await supabase
      .from('availability_invites')
      .select('*')
      .eq('token', t)
      .single();

    if (error || !data) {
      setStatus('invalid');
      setErrorMsg('This invitation link is not valid. Please contact us for a new link.');
      return;
    }

    if (data.used) {
      setStatus('used');
      setErrorMsg('This form has already been submitted. If you need to update your preferences, please contact us for a new link.');
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus('expired');
      setErrorMsg('This invitation link has expired. Please contact us for a new link.');
      return;
    }

    setInvite(data);
    setStatus('valid');
  };

  const toggleDay = (day) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addSlot = () => {
    if (!newSlot.day || !newSlot.start || !newSlot.end) return;
    setPreferredSlots(prev => [...prev, { ...newSlot }]);
    setNewSlot({ day: 'Monday', start: '09:00', end: '10:00' });
  };

  const removeSlot = (idx) => {
    setPreferredSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const addVacation = () => {
    if (!newVacation.start || !newVacation.end) return;
    setVacationDates(prev => [...prev, { ...newVacation }]);
    setNewVacation({ start: '', end: '', notes: '' });
  };

  const removeVacation = (idx) => {
    setVacationDates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!invite) return;
    setSubmitting(true);

    try {
      // Upsert into client_availability using client_name as key
      const payload = {
        client_id: invite.client_name,
        client_name: invite.client_name,
        client_type: invite.client_type || 'clinical',
        preferred_days: preferredDays,
        general_preference: generalPreference,
        preferred_slots: preferredSlots,
        vacation_dates: vacationDates,
        scheduling_notes: schedulingNotes,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('client_availability')
        .upsert(payload, { onConflict: 'client_id' });

      if (upsertErr) {
        console.error('Upsert error:', upsertErr);
        setStatus('error');
        setErrorMsg('Something went wrong saving your preferences. Please try again or contact us.');
        setSubmitting(false);
        return;
      }

      // Mark token as used
      await supabase
        .from('availability_invites')
        .update({ used: true })
        .eq('token', token);

      setStatus('submitted');
    } catch (err) {
      console.error('Submit error:', err);
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  // Shared styles
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #f8f6f4 0%, #eee8e4 50%, #f0eeec 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '600px',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    padding: '2.5rem',
  };

  const labelStyle = {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#3e3c3a',
    display: 'block',
    marginBottom: '6px',
  };

  const sectionStyle = {
    marginBottom: '1.5rem',
  };

  // Status screens for invalid/expired/used/submitted
  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8682' }}>
            <Clock size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '1rem' }}>Validating your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle size={48} color="#2d8a4e" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px' }}>
              Thank You!
            </h2>
            <p style={{ color: '#6b6764', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Your scheduling preferences have been saved. We will use this information to find the best appointment times for you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'valid') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} color="#d14040" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px' }}>
              {status === 'expired' ? 'Link Expired' : status === 'used' ? 'Already Submitted' : 'Invalid Link'}
            </h2>
            <p style={{ color: '#6b6764', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {errorMsg}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Calendar size={32} color="#ad1457" style={{ marginBottom: '8px' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '4px' }}>
            Scheduling Preferences
          </h1>
          <p style={{ color: '#8a8682', fontSize: '0.88rem' }}>
            Help us find the best times for your appointments
          </p>
        </div>

        {/* Client Name (read-only) */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Your Name</label>
          <input
            type="text"
            value={invite.client_name}
            readOnly
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.92rem',
              background: 'rgba(0,0,0,0.02)', color: '#3e3c3a', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Preferred Days */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Which days work best for you?</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  border: preferredDays.includes(day) ? '1px solid #2d8a4e' : '1px solid rgba(0,0,0,0.1)',
                  background: preferredDays.includes(day) ? 'rgba(45,138,78,0.1)' : 'rgba(0,0,0,0.02)',
                  color: preferredDays.includes(day) ? '#2d8a4e' : '#8a8682',
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* General Preference */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Do you prefer mornings or afternoons?</label>
          <select
            value={generalPreference}
            onChange={e => setGeneralPreference(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.92rem',
              background: '#fff', color: '#3e3c3a', boxSizing: 'border-box',
              appearance: 'auto',
            }}
          >
            {PREFERENCES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Preferred Time Slots */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Specific time slots that work well (optional)</label>
          {preferredSlots.map((slot, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
              padding: '8px 12px', borderRadius: '8px', background: 'rgba(90,138,191,0.06)',
              fontSize: '0.88rem', color: '#3e3c3a',
            }}>
              <span style={{ fontWeight: 600 }}>{slot.day}</span>
              <span>{slot.start} - {slot.end}</span>
              <button onClick={() => removeSlot(i)} style={{
                marginLeft: 'auto', padding: '4px', border: 'none', background: 'none',
                color: '#ccc', cursor: 'pointer',
              }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={newSlot.day}
              onChange={e => setNewSlot(p => ({ ...p, day: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem', background: '#fff',
              }}
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="time" value={newSlot.start}
              onChange={e => setNewSlot(p => ({ ...p, start: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem',
              }}
            />
            <span style={{ color: '#8a8682', fontSize: '0.82rem' }}>to</span>
            <input
              type="time" value={newSlot.end}
              onChange={e => setNewSlot(p => ({ ...p, end: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem',
              }}
            />
            <button onClick={addSlot} style={{
              padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(90,138,191,0.3)', background: 'rgba(90,138,191,0.08)',
              color: '#5a8abf', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Vacation Dates */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Upcoming dates you will be unavailable (optional)</label>
          {vacationDates.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
              padding: '8px 12px', borderRadius: '8px', background: 'rgba(230,81,0,0.04)',
              fontSize: '0.88rem', color: '#3e3c3a',
            }}>
              <span>{new Date(v.start).toLocaleDateString()} - {new Date(v.end).toLocaleDateString()}</span>
              {v.notes && <span style={{ color: '#8a8682', fontSize: '0.82rem' }}>({v.notes})</span>}
              <button onClick={() => removeVacation(i)} style={{
                marginLeft: 'auto', padding: '4px', border: 'none', background: 'none',
                color: '#ccc', cursor: 'pointer',
              }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date" value={newVacation.start}
              onChange={e => setNewVacation(p => ({ ...p, start: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem',
              }}
            />
            <span style={{ color: '#8a8682', fontSize: '0.82rem' }}>to</span>
            <input
              type="date" value={newVacation.end}
              onChange={e => setNewVacation(p => ({ ...p, end: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem',
              }}
            />
            <input
              type="text" value={newVacation.notes}
              onChange={e => setNewVacation(p => ({ ...p, notes: e.target.value }))}
              placeholder="Reason (optional)"
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.85rem', flex: 1, minWidth: '100px',
              }}
            />
            <button onClick={addVacation} style={{
              padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(230,81,0,0.3)', background: 'rgba(230,81,0,0.06)',
              color: '#e65100', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Scheduling Notes */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Any other scheduling preferences or notes?</label>
          <textarea
            value={schedulingNotes}
            onChange={e => setSchedulingNotes(e.target.value)}
            placeholder="e.g. I prefer back-to-back appointments, or I need 30 minutes between sessions..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.92rem',
              resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: 'none', fontSize: '1rem', fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            background: submitting ? '#ccc' : 'linear-gradient(135deg, #ad1457, #880e4f)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(173,20,87,0.2)',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? (
            'Saving...'
          ) : (
            <>
              <Send size={18} /> Submit Preferences
            </>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#aaa', marginTop: '1rem' }}>
          Your information is kept private and used only for scheduling.
        </p>
      </div>
    </div>
  );
};

export default AvailabilityForm;
