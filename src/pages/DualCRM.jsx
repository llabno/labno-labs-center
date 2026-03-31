import React, { useState } from 'react';
import { Users, Briefcase, Plus, Filter, Mail, Calendar as DateRange } from 'lucide-react';

const DualCRM = () => {
  const [activeTab, setActiveTab] = useState('moso'); // moso | labno

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
          onClick={() => setActiveTab('moso')}
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
          onClick={() => setActiveTab('labno')}
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
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Contact
          </button>
        </div>

        {/* Tab Logic Display */}
        {activeTab === 'moso' ? (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#444' }}>Physical Therapy / Massage Contacts</h3>
            <div style={{ padding: '1.5rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '12px', textAlign: 'center' }}>
              <Users size={32} color="#999" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#666' }}>HIPAA secure vault. Contacts will populate when Supabase RLS policies are loaded.</p>
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#444' }}>Agency Clients, Mentorship & Interns</h3>
            <div style={{ padding: '1.5rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '12px', textAlign: 'center' }}>
              <Briefcase size={32} color="#999" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#666' }}>Lead Gen & App Sales pipeline. $10 Career OS sweep targets go here.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DualCRM;
