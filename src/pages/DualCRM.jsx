import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Plus, Filter, Mail, Calendar as DateRange, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DualCRM = () => {
  const [activeTab, setActiveTab] = useState('moso'); // moso | labno

  // Clinical leads state
  const [clinicalLeads, setClinicalLeads] = useState([]);
  const [clinicalLoading, setClinicalLoading] = useState(true);
  const [clinicalError, setClinicalError] = useState(null);

  // Consulting leads state
  const [consultingLeads, setConsultingLeads] = useState([]);
  const [consultingLoading, setConsultingLoading] = useState(true);
  const [consultingError, setConsultingError] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClinical, setNewClinical] = useState({ patient_name: '', email: '', condition_notes: '', status: 'New Intake' });
  const [newConsulting, setNewConsulting] = useState({ company_name: '', email: '', app_interest: '', lifetime_value: 0 });

  const fetchClinicalLeads = async () => {
    setClinicalLoading(true);
    setClinicalError(null);
    const { data, error } = await supabase
      .from('moso_clinical_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setClinicalError(error.message);
    else setClinicalLeads(data || []);
    setClinicalLoading(false);
  };

  const fetchConsultingLeads = async () => {
    setConsultingLoading(true);
    setConsultingError(null);
    const { data, error } = await supabase
      .from('labno_consulting_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setConsultingError(error.message);
    else setConsultingLeads(data || []);
    setConsultingLoading(false);
  };

  useEffect(() => {
    fetchClinicalLeads();
    fetchConsultingLeads();
  }, []);

  const handleAddClinical = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('moso_clinical_leads').insert([newClinical]);
    if (error) setClinicalError(error.message);
    else {
      setNewClinical({ patient_name: '', email: '', condition_notes: '', status: 'New Intake' });
      setShowForm(false);
      await fetchClinicalLeads();
    }
    setSubmitting(false);
  };

  const handleAddConsulting = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('labno_consulting_leads').insert([{
      ...newConsulting,
      lifetime_value: parseFloat(newConsulting.lifetime_value) || 0,
    }]);
    if (error) setConsultingError(error.message);
    else {
      setNewConsulting({ company_name: '', email: '', app_interest: '', lifetime_value: 0 });
      setShowForm(false);
      await fetchConsultingLeads();
    }
    setSubmitting(false);
  };

  const renderError = (err) => err && (
    <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: '#fde8e8', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
      {err}
    </div>
  );

  const renderClinicalTable = () => {
    if (clinicalLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>Loading clinical leads...</div>;
    if (clinicalLeads.length === 0) return (
      <div style={{ padding: '1.5rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '12px', textAlign: 'center' }}>
        <Users size={32} color="#999" style={{ margin: '0 auto 10px' }} />
        <p style={{ color: '#666' }}>No clinical leads yet. Add one above.</p>
      </div>
    );
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Patient Name</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Email</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Condition Notes</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {clinicalLeads.map((lead) => (
            <tr key={lead.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <td style={{ padding: '0.75rem 1rem', color: '#222', fontWeight: 500 }}>{lead.patient_name}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#666' }}>{lead.email || '—'}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#666', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.condition_notes || '—'}</td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem',
                  background: lead.status === 'New Intake' ? '#e3f2fd' : lead.status === 'Active' ? '#e8f5e9' : '#f5f5f5',
                  color: lead.status === 'New Intake' ? '#1565c0' : lead.status === 'Active' ? '#2e7d32' : '#666',
                }}>{lead.status}</span>
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#999', fontSize: '0.85rem' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderConsultingTable = () => {
    if (consultingLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>Loading consulting leads...</div>;
    if (consultingLeads.length === 0) return (
      <div style={{ padding: '1.5rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '12px', textAlign: 'center' }}>
        <Briefcase size={32} color="#999" style={{ margin: '0 auto 10px' }} />
        <p style={{ color: '#666' }}>No consulting leads yet. Add one above.</p>
      </div>
    );
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Company</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Email</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>App Interest</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Lifetime Value</th>
            <th style={{ padding: '0.75rem 1rem', color: '#444', fontWeight: 600 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {consultingLeads.map((lead) => (
            <tr key={lead.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <td style={{ padding: '0.75rem 1rem', color: '#222', fontWeight: 500 }}>{lead.company_name}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#666' }}>{lead.email || '—'}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#666' }}>{lead.app_interest || '—'}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#2e7d32', fontWeight: 500 }}>${parseFloat(lead.lifetime_value || 0).toLocaleString()}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#999', fontSize: '0.85rem' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>

      {/* Header and Controls */}
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Users color="#d15a45" /> Dual CRM Engine
      </h1>

      <p style={{ marginBottom: '1.5rem', color: '#555' }}>
        Databases strictly separated for HIPAA compliance. The CRM overlaps with Lemon Squeezy integration for marketing sweeps. Lance views both; Romy/Sara/Avery are restricted via Supabase RLS.
      </p>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <button
          onClick={() => { setActiveTab('moso'); setShowForm(false); }}
          style={{
            padding: '10px 24px',
            borderRadius: '20px',
            border: '1px solid rgba(0,0,0,0.1)',
            background: activeTab === 'moso' ? '#fff' : 'rgba(255,255,255,0.3)',
            color: activeTab === 'moso' ? '#333' : '#666',
            fontWeight: activeTab === 'moso' ? 700 : 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'moso' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
          }}>
          MOSO Clinical Pipeline (Patients)
        </button>
        <button
          onClick={() => { setActiveTab('labno'); setShowForm(false); }}
          style={{
            padding: '10px 24px',
            borderRadius: '20px',
            border: '1px solid rgba(0,0,0,0.1)',
            background: activeTab === 'labno' ? '#fff' : 'rgba(255,255,255,0.3)',
            color: activeTab === 'labno' ? '#333' : '#666',
            fontWeight: activeTab === 'labno' ? 700 : 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'labno' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
          }}>
          Labno Labs Pipeline (B2B & Apps)
        </button>
      </div>

      {/* CRM UI Container */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} /> Filter List
            </button>
            <button style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DateRange size={16} /> Date Range
            </button>
          </div>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Contact</>}
          </button>
        </div>

        {/* Add Form */}
        {showForm && activeTab === 'moso' && (
          <div style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(227,242,253,0.4)', borderRadius: '12px', border: '1px solid rgba(21,101,192,0.15)' }}>
            <h4 style={{ marginBottom: '0.75rem', color: '#1565c0' }}>New Clinical Lead (HIPAA Protected)</h4>
            <form onSubmit={handleAddClinical} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
              <input type="text" placeholder="Patient Name" value={newClinical.patient_name} onChange={(e) => setNewClinical({ ...newClinical, patient_name: e.target.value })} required
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <input type="email" placeholder="Email (optional)" value={newClinical.email} onChange={(e) => setNewClinical({ ...newClinical, email: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <textarea placeholder="Condition Notes" value={newClinical.condition_notes} onChange={(e) => setNewClinical({ ...newClinical, condition_notes: e.target.value })} rows={3}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', resize: 'vertical' }} />
              <select value={newClinical.status} onChange={(e) => setNewClinical({ ...newClinical, status: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }}>
                <option value="New Intake">New Intake</option>
                <option value="Active">Active</option>
                <option value="Discharged">Discharged</option>
              </select>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
                {submitting ? 'Saving...' : 'Add Clinical Lead'}
              </button>
            </form>
          </div>
        )}

        {showForm && activeTab === 'labno' && (
          <div style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(232,245,233,0.4)', borderRadius: '12px', border: '1px solid rgba(46,125,50,0.15)' }}>
            <h4 style={{ marginBottom: '0.75rem', color: '#2e7d32' }}>New Consulting Lead</h4>
            <form onSubmit={handleAddConsulting} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
              <input type="text" placeholder="Company Name" value={newConsulting.company_name} onChange={(e) => setNewConsulting({ ...newConsulting, company_name: e.target.value })} required
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <input type="email" placeholder="Email (optional)" value={newConsulting.email} onChange={(e) => setNewConsulting({ ...newConsulting, email: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <input type="text" placeholder="App Interest (e.g. Career OS, MoSo)" value={newConsulting.app_interest} onChange={(e) => setNewConsulting({ ...newConsulting, app_interest: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <input type="number" placeholder="Lifetime Value ($)" value={newConsulting.lifetime_value} onChange={(e) => setNewConsulting({ ...newConsulting, lifetime_value: e.target.value })} min="0" step="0.01"
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem' }} />
              <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
                {submitting ? 'Saving...' : 'Add Consulting Lead'}
              </button>
            </form>
          </div>
        )}

        {/* Tab Logic Display */}
        {activeTab === 'moso' ? (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Physical Therapy / Massage Contacts
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: '#fce4ec', color: '#c62828', fontWeight: 600 }}>HIPAA</span>
            </h3>
            {renderError(clinicalError)}
            {renderClinicalTable()}
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#444' }}>Agency Clients, Mentorship & Interns</h3>
            {renderError(consultingError)}
            {renderConsultingTable()}
          </div>
        )}

      </div>
    </div>
  );
};

export default DualCRM;
