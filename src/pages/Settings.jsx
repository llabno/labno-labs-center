import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Palette, Users, Key, ChevronDown, ChevronUp, Info, Clock, Lock, DollarSign, Save, CheckCircle, RotateCcw } from 'lucide-react';
import { clearOnboardingFlag } from '../components/OnboardingWizard';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'llc_settings';

const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('permissions');
  const [saved, setSaved] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaStatus, setMfaStatus] = useState(null); // 'enrolled', 'error', null
  const [mfaError, setMfaError] = useState(null);

  const projects = [
    { name: 'College Career OS', client: 'Northwestern U' },
    { name: 'Exercise DB V2', client: 'MOSO Comprehensive Exercise Database (Internal)' },
    { name: 'Stretching App', client: 'Internal' },
    { name: 'Art Portfolio', client: 'Internal' },
  ];

  const phases = ['Planning', 'Execution', 'Review', 'Maintenance'];
  const roles = ['No Access', 'Owner', 'Contributor', 'Reviewer', 'Observer'];

  const employees = [
    { name: 'Lance Labno (Admin)', email: 'lance@labnolabs.com', role: 'Owner' },
    { name: 'Avery', email: 'avery@labnolabs.com', role: 'UX/UI Designer' },
    { name: 'Romy', email: 'romy@labnolabs.com', role: 'Clinical Apps' },
    { name: 'Sarah', email: 'sarah@labnolabs.com', role: 'Project Manager' },
    { name: 'Bill', email: 'bill@labnolabs.com', role: 'Developer' },
  ];

  const clientProjects = [
    { client: 'Northwestern U', project: 'College Career OS', assigned: ['Lance', 'Sarah'] },
    { client: 'MOSO Comprehensive Exercise Database (Internal)', project: 'Exercise DB V2', assigned: ['Lance', 'Romy'] },
  ];

  // Employee billing rates (per hour)
  const [billingRates, setBillingRates] = useState(() => {
    const stored = loadSettings();
    return stored.billingRates || {
      'Lance Labno (Admin)': 250,
      'Avery': 85,
      'Romy': 125,
      'Sarah': 95,
      'Bill': 110,
    };
  });

  // Task 13: Employee expansion & task assignment
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState(() => {
    const stored = loadSettings();
    if (stored.employeeAssignments) return stored.employeeAssignments;
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {};
      projects.forEach(proj => {
        initial[emp.name][proj.name] = { role: 'Observer', phase: 'Planning' };
      });
    });
    initial['Lance Labno (Admin)']['College Career OS'] = { role: 'Owner', phase: 'Execution' };
    initial['Lance Labno (Admin)']['Exercise DB V2'] = { role: 'Owner', phase: 'Review' };
    initial['Sarah']['College Career OS'] = { role: 'Contributor', phase: 'Execution' };
    initial['Romy']['Exercise DB V2'] = { role: 'Contributor', phase: 'Execution' };
    initial['Romy']['College Career OS'] = { role: 'Observer', phase: 'Planning' };
    initial['Avery']['Art Portfolio'] = { role: 'Owner', phase: 'Planning' };
    initial['Bill']['College Career OS'] = { role: 'Observer', phase: 'Planning' };
    initial['Bill']['Exercise DB V2'] = { role: 'Contributor', phase: 'Execution' };
    return initial;
  });

  // Task 14: Global permissions
  const permissionTypes = ['Can create projects', 'Can delete tasks', 'Can view Labno CRM', 'Can view MOSO CRM (HIPAA)', 'Can manage billing'];
  const [permissions, setPermissions] = useState(() => {
    const stored = loadSettings();
    if (stored.permissions) return stored.permissions;
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {
        'Can create projects': emp.role === 'Owner',
        'Can delete tasks': emp.role === 'Owner',
        'Can view Labno CRM': emp.role === 'Owner' || emp.role === 'Project Manager',
        'Can view MOSO CRM (HIPAA)': emp.name === 'Lance Labno (Admin)',
        'Can manage billing': emp.role === 'Owner',
      };
    });
    return initial;
  });

  // Phase permissions
  const phaseNames = ['Planning', 'Execution', 'Review', 'Maintenance'];
  const phaseAccessLevels = ['Full Access', 'Read Only', 'No Access'];
  const [phasePermissions, setPhasePermissions] = useState(() => {
    const stored = loadSettings();
    if (stored.phasePermissions) return stored.phasePermissions;
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {};
      phaseNames.forEach(phase => {
        initial[emp.name][phase] = emp.role === 'Owner' ? 'Full Access' : 'Read Only';
      });
    });
    return initial;
  });

  // Session timeout settings
  const [adminTimeout, setAdminTimeout] = useState(() => loadSettings().adminTimeout || '30');
  const [userTimeout, setUserTimeout] = useState(() => loadSettings().userTimeout || '20');

  // Save all settings to localStorage
  const saveAllSettings = () => {
    const settings = { employeeAssignments, permissions, phasePermissions, billingRates, adminTimeout, userTimeout };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updatePhasePermission = (empName, phase, value) => {
    setPhasePermissions(prev => ({
      ...prev,
      [empName]: { ...prev[empName], [phase]: value },
    }));
  };

  // Client isolation accordion
  const [expandedClient, setExpandedClient] = useState(null);

  const updateAssignment = (empName, projName, field, value) => {
    setEmployeeAssignments(prev => ({
      ...prev,
      [empName]: {
        ...prev[empName],
        [projName]: {
          ...prev[empName][projName],
          [field]: value,
        },
      },
    }));
  };

  const togglePermission = (empName, perm) => {
    setPermissions(prev => ({
      ...prev,
      [empName]: {
        ...prev[empName],
        [perm]: !prev[empName][perm],
      },
    }));
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsIcon color="#d15a45" /> Executive Login & Settings <InfoTooltip text={PAGE_INFO.settings} />
      </h1>

      <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
        {/* Settings Sidebar */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className={`nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'permissions' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Shield size={18} /> Global Permissions (Admin)
          </button>
          <button
            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'security' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Key size={18} /> Security & Passwords
          </button>
          <button
            className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'billing' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <DollarSign size={18} /> Billing Rates
          </button>
          <button
            className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'appearance' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Palette size={18} /> Dashboard Appearance
          </button>

          {/* Global Save Button */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={saveAllSettings} className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save All Settings</>}
            </button>
            <p style={{ fontSize: '0.62rem', color: '#8a8682', marginTop: '4px', textAlign: 'center' }}>Saves permissions, rates, and timeouts</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>

          {activeTab === 'permissions' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Lance's Vault: Team & Client Permissions</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Manage who can see which projects. Clients are strictly sandboxed into their own views. Employees can see client projects they are assigned to.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Users size={16} /> Internal Employees</h4>
                  {employees.map((emp, empIdx) => (
                    <div key={emp.name} style={{ marginBottom: '10px' }}>
                      <div
                        onClick={() => setExpandedEmployee(expandedEmployee === empIdx ? null : empIdx)}
                        style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderRadius: expandedEmployee === empIdx ? '8px 8px 0 0' : '8px',
                          background: expandedEmployee === empIdx ? 'rgba(255, 120, 100, 0.04)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#222' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>{emp.role}</div>
                        </div>
                        <div style={{ color: '#aaa' }}>
                          {expandedEmployee === empIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Task 13: Expanded employee detail panel */}
                      {expandedEmployee === empIdx && (
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '0 0 8px 8px',
                          background: '#fff',
                        }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Project Assignments
                          </div>
                          {projects.map(proj => {
                            const assignment = employeeAssignments[emp.name]?.[proj.name] || { role: 'Observer', phase: 'Planning' };
                            return (
                              <div
                                key={proj.name}
                                style={{
                                  padding: '8px 0',
                                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333' }}>{proj.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#999' }}>{proj.client}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#888' }}>Role:</label>
                                  <select
                                    value={assignment.role}
                                    onChange={(e) => updateAssignment(emp.name, proj.name, 'role', e.target.value)}
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #ddd',
                                      background: '#fff',
                                      color: '#444',
                                    }}
                                  >
                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#888' }}>Phase:</label>
                                  <select
                                    value={assignment.phase}
                                    onChange={(e) => updateAssignment(emp.name, proj.name, 'phase', e.target.value)}
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #ddd',
                                      background: '#fff',
                                      color: '#444',
                                    }}
                                  >
                                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Shield size={16} /> Client Isolation Boxes</h4>
                  {clientProjects.map((proj, idx) => (
                    <div key={proj.client} style={{ marginBottom: '10px' }}>
                      <div
                        onClick={() => setExpandedClient(expandedClient === idx ? null : idx)}
                        style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderRadius: expandedClient === idx ? '8px 8px 0 0' : '8px',
                          background: expandedClient === idx ? 'rgba(255, 120, 100, 0.04)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#222' }}>{proj.client}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>Project: {proj.project}</div>
                        </div>
                        <div style={{ color: '#aaa' }}>
                          {expandedClient === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {expandedClient === idx && (
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '0 0 8px 8px',
                          background: '#fff',
                        }}>
                          <div style={{ fontSize: '0.8rem', color: '#1976d2', marginBottom: '8px' }}>Assigned: {proj.assigned.join(', ')}</div>
                          <div style={{ fontSize: '0.78rem', color: '#666' }}>
                            <strong>Isolation Rules:</strong> This client can only view their own project data. No cross-client data leakage.
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '4px' }}>
                            <strong>Data Region:</strong> US-East (default)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '4px' }}>
                            <strong>Last Audit:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn-primary" style={{ width: '100%', marginTop: '10px', padding: '0.5rem' }}>+ Create Secure Client Portal</button>
                </div>
              </div>

              {/* Task 14: Global Permissions & Security Matrix */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> Global Permissions Matrix
                </h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Toggle access levels for each team member across the platform.
                </p>
                <div className="glass-panel" style={{ overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          Employee
                        </th>
                        {permissionTypes.map(perm => (
                          <th key={perm} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#444', fontSize: '0.78rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {perm}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => (
                        <tr key={emp.name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#222', fontSize: '0.9rem' }}>{emp.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{emp.role}</div>
                          </td>
                          {permissionTypes.map(perm => {
                            const enabled = permissions[emp.name]?.[perm] ?? false;
                            return (
                              <td key={perm} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => togglePermission(emp.name, perm)}
                                  style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: enabled ? '#4caf50' : 'rgba(0,0,0,0.12)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    padding: 0,
                                  }}
                                >
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: '3px',
                                    left: enabled ? '23px' : '3px',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }} />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phase Permissions Matrix */}
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> Phase Permissions
                </h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Control access levels per project phase for each team member.
                </p>
                <div className="glass-panel" style={{ overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          Employee
                        </th>
                        {phaseNames.map(phase => (
                          <th key={phase} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#444', fontSize: '0.78rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {phase}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#222', fontSize: '0.9rem' }}>{emp.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{emp.role}</div>
                          </td>
                          {phaseNames.map(phase => (
                            <td key={phase} style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <select
                                value={phasePermissions[emp.name]?.[phase] || 'Read Only'}
                                onChange={(e) => updatePhasePermission(emp.name, phase, e.target.value)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #ddd',
                                  background: '#fff',
                                  color: '#444',
                                }}
                              >
                                {phaseAccessLevels.map(level => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#333' }}>Employee & Partner Billing Rates</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Set hourly rates per team member. These feed into Billing Review for accurate session costing. Internal only — never shown to clients.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px' }}>
                {employees.map(emp => (
                  <div key={emp.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{emp.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#2d8a4e', fontWeight: 600 }}>$</span>
                      <input type="number" value={billingRates[emp.name] || 0}
                        onChange={e => setBillingRates(prev => ({ ...prev, [emp.name]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.88rem', textAlign: 'right', fontWeight: 600 }} />
                      <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>/hr</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8a8682', minWidth: '60px', textAlign: 'right' }}>
                      ${((billingRates[emp.name] || 0) / 4).toFixed(0)}/15min
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)', fontSize: '0.78rem', color: '#6b6764', maxWidth: '500px' }}>
                <strong>Note:</strong> CPT code billing uses 15-minute increments. A $250/hr rate = $62.50 per 15-min unit. Rates are used in Billing Review for session cost estimates.
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Workspace Aesthetics</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Modify the Apple Glass background gradients and UI themes across the entire ecosystem.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Labno Labs', gradient: 'linear-gradient(135deg, #ff7e67, #ff9a85)', primary: 'rgba(255, 120, 100, 0.4)', secondary: 'rgba(220, 190, 160, 0.6)' },
                  { name: 'Ocean Blue', gradient: 'linear-gradient(135deg, #1976d2, #64b5f6)', primary: 'rgba(25, 118, 210, 0.4)', secondary: 'rgba(100, 181, 246, 0.6)' },
                  { name: 'Forest', gradient: 'linear-gradient(135deg, #388e3c, #81c784)', primary: 'rgba(56, 142, 60, 0.4)', secondary: 'rgba(129, 199, 132, 0.6)' },
                  { name: 'Dark Mode', gradient: 'linear-gradient(135deg, #1a1a1a, #333)', primary: 'rgba(20, 20, 20, 0.4)', secondary: 'rgba(80, 80, 80, 0.6)' },
                  { name: 'Movement Solutions', gradient: 'linear-gradient(135deg, #0d9488, #5eead4)', primary: 'rgba(13, 148, 136, 0.35)', secondary: 'rgba(94, 234, 212, 0.5)' },
                  { name: 'Lavender', gradient: 'linear-gradient(135deg, #7c3aed, #c4b5fd)', primary: 'rgba(124, 58, 237, 0.3)', secondary: 'rgba(196, 181, 253, 0.5)' },
                  { name: 'Sunset', gradient: 'linear-gradient(135deg, #ea580c, #fbbf24)', primary: 'rgba(234, 88, 12, 0.35)', secondary: 'rgba(251, 191, 36, 0.5)' },
                  { name: 'Rose Gold', gradient: 'linear-gradient(135deg, #be185d, #fda4af)', primary: 'rgba(190, 24, 93, 0.3)', secondary: 'rgba(253, 164, 175, 0.5)' },
                ].map(t => (
                  <div key={t.name} onClick={() => {
                    document.documentElement.style.setProperty('--primary-glow', t.primary);
                    document.documentElement.style.setProperty('--secondary-glow', t.secondary);
                    localStorage.setItem('llc_theme', JSON.stringify(t));
                  }} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: '70px', borderRadius: '10px', background: t.gradient, border: '2px solid rgba(0,0,0,0.08)', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3e3c3a', marginTop: '4px' }}>{t.name}</div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#888' }}>Click a theme to apply. Saved locally.</p>

              {/* Onboarding Tour */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={16} color="#b06050" /> Onboarding Tour
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.75rem' }}>
                  Re-run the 5-step guided tour that introduces new staff to Labno Labs Center.
                </p>
                <button
                  onClick={() => {
                    clearOnboardingFlag();
                    window.location.reload();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #b06050, #c47a6c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(176,96,80,0.3)',
                  }}
                >
                  <RotateCcw size={14} /> Restart Tour
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Session Timeout — HIPAA Compliance */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#b06050" /> Session Timeout (HIPAA)
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem' }}>
                  Auto-lock the app after inactivity. Admin sets the maximum; employees can choose a shorter window.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '500px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#b06050', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Maximum (enforced)</label>
                    <select value={adminTimeout} onChange={e => setAdminTimeout(e.target.value)} className="kanban-select" style={{ marginTop: 0, padding: '10px 28px 10px 10px', fontSize: '0.88rem', width: '100%' }}>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                    <p style={{ fontSize: '0.68rem', color: '#8a8682', marginTop: '4px' }}>No employee can exceed this limit</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#5a8abf', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Timeout (personal)</label>
                    <select value={userTimeout} onChange={e => setUserTimeout(e.target.value)} className="kanban-select" style={{ marginTop: 0, padding: '10px 28px 10px 10px', fontSize: '0.88rem', width: '100%' }}>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes (admin max)</option>
                    </select>
                    <p style={{ fontSize: '0.68rem', color: '#8a8682', marginTop: '4px' }}>Must be ≤ admin maximum</p>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.1)', fontSize: '0.78rem', color: '#6b6764' }}>
                  <strong>HIPAA Note:</strong> When the session times out, the user is returned to the login screen. No patient data remains visible. Recommended: 20 minutes for clinical users, 30 minutes for admin.
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} color="#2d8a4e" /> Two-Factor Authentication
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem' }}>
                  Add a second verification step for extra security. Supabase Auth supports these options:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                  {[
                    { name: 'TOTP App (Recommended)', desc: 'Google Authenticator, Authy, 1Password. Free, works offline.', status: 'available', color: '#2d8a4e', type: 'totp' },
                    { name: 'SMS Verification', desc: 'Code sent via text. Requires Twilio ($0.0075/SMS). Less secure than TOTP.', status: 'available', color: '#5a8abf', type: 'sms' },
                    { name: 'Email OTP', desc: 'One-time code sent to email. Free with Supabase. Good fallback.', status: 'available', color: '#9c27b0', type: 'email' },
                    { name: 'WebAuthn / Passkeys', desc: 'Biometric (Face ID, fingerprint) or hardware key (YubiKey). Most secure.', status: 'coming', color: '#c49a40', type: 'webauthn' },
                  ].map(opt => (
                    <div key={opt.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)', borderLeft: `3px solid ${opt.color}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2e2c2a' }}>{opt.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8a8682' }}>{opt.desc}</div>
                      </div>
                      <button
                        disabled={opt.status === 'coming' || (opt.type !== 'totp' && opt.type !== 'sms')}
                        onClick={opt.type === 'totp' ? async () => {
                          setMfaEnrolling(true);
                          setMfaError(null);
                          try {
                            const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
                            if (error) throw error;
                            setMfaQR(data.totp.qr_code);
                            setMfaFactorId(data.id);
                          } catch (err) {
                            setMfaError(err.message || 'Failed to start TOTP enrollment. Ensure MFA is enabled in Supabase Dashboard → Auth → MFA.');
                            setMfaEnrolling(false);
                          }
                        } : undefined}
                        style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${opt.color}30`, background: `${opt.color}08`, color: opt.color, cursor: opt.status === 'coming' ? 'not-allowed' : 'pointer', opacity: opt.status === 'coming' ? 0.5 : 1 }}
                      >
                        {opt.status === 'coming' ? 'Coming Soon' : mfaStatus === 'enrolled' && opt.type === 'totp' ? 'Enrolled' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* TOTP Enrollment Flow */}
                {mfaEnrolling && mfaQR && (
                  <div style={{ marginTop: '16px', padding: '16px', borderRadius: '10px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.15)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: '#2d8a4e' }}>Scan this QR Code</h4>
                    <p style={{ fontSize: '0.78rem', color: '#6b6764', marginBottom: '12px' }}>Open Google Authenticator, Authy, or 1Password and scan:</p>
                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                      <img src={mfaQR} alt="TOTP QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '300px', margin: '0 auto' }}>
                      <input
                        type="text" placeholder="Enter 6-digit code"
                        value={mfaVerifyCode}
                        onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 700 }}
                      />
                      <button
                        disabled={mfaVerifyCode.length !== 6}
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaVerifyCode });
                            if (error) throw error;
                            setMfaStatus('enrolled');
                            setMfaEnrolling(false);
                            setMfaQR(null);
                            setMfaVerifyCode('');
                          } catch (err) {
                            setMfaError(err.message || 'Invalid code. Try again.');
                          }
                        }}
                        className="btn-primary" style={{ padding: '10px 18px' }}
                      >Verify</button>
                    </div>
                    {mfaError && <p style={{ color: '#d14040', fontSize: '0.78rem', marginTop: '8px', textAlign: 'center' }}>{mfaError}</p>}
                  </div>
                )}
                {mfaError && !mfaEnrolling && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(209,64,64,0.04)', border: '1px solid rgba(209,64,64,0.1)', fontSize: '0.78rem', color: '#d14040' }}>
                    {mfaError}
                  </div>
                )}
                {mfaStatus === 'enrolled' && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.06)', border: '1px solid rgba(45,138,78,0.15)', fontSize: '0.78rem', color: '#2d8a4e', fontWeight: 600 }}>
                    TOTP successfully enrolled. Two-factor authentication is now active.
                  </div>
                )}
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)', fontSize: '0.78rem', color: '#6b6764' }}>
                  <strong>Recommendation:</strong> Enable TOTP App for all users. It's free, works offline, and is HIPAA-compliant. Supabase has built-in MFA support — enable it in the Supabase Dashboard → Auth → Multi Factor Authentication.
                </div>
              </div>

              {/* Password Change */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Change Password</h3>
                <div style={{ maxWidth: '400px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Current Password</label>
                    <input type="password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>New Password</label>
                    <input type="password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>
                  <button className="btn-primary" style={{ width: '100%' }}>Update Password</button>
                </div>
              </div>

              {/* Backup & Data Export */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333' }}>Data Backup & Export</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Download a full JSON backup of all CRM leads, projects, tasks, SOPs, and agent logs.
                </p>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/backup/export');
                      const data = await res.json();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url;
                      a.download = `labno-backup-${new Date().toISOString().split('T')[0]}.json`;
                      a.click(); URL.revokeObjectURL(url);
                    } catch (err) { alert('Backup failed: ' + err.message); }
                  }}>
                  Download Full Backup (JSON)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
