import { useState, useEffect } from 'react';
import { Home, ListChecks, Briefcase, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Dashboard from './Dashboard';
import ProjectsTasks from './ProjectsTasks';

const SUB_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home, desc: 'Kanban boards & executive view' },
  { key: 'projects', label: 'Projects', icon: ListChecks, desc: 'List view with task detail' },
  { key: 'clients', label: 'Client Projects', icon: Briefcase, desc: 'Consulting engagements' },
];

const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectTypeFilter, setProjectTypeFilter] = useState('all');
  const [typeCounts, setTypeCounts] = useState({ all: 0, internal: 0, client: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from('projects').select('project_type');
      if (data) {
        const counts = { all: data.length, internal: 0, client: 0 };
        data.forEach(p => {
          const t = (p.project_type && p.project_type !== '') ? p.project_type : 'internal';
          if (counts[t] !== undefined) counts[t]++;
        });
        setTypeCounts(counts);
      }
    };
    fetchCounts();
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'clients') {
      setProjectTypeFilter('client');
    } else {
      setProjectTypeFilter('all');
    }
  };

  // When type filter changes, auto-navigate to the correct tab
  const handleTypeFilterChange = (filterKey) => {
    setProjectTypeFilter(filterKey);
    if (filterKey === 'client' && activeTab !== 'clients') {
      setActiveTab('clients');
    } else if (filterKey !== 'client' && activeTab === 'clients') {
      // Switching to Internal or All while on Client Projects → go to Projects tab
      setActiveTab('projects');
    }
  };

  const PROJECT_TYPE_FILTERS = [
    { key: 'all', label: 'All', count: typeCounts.all },
    { key: 'internal', label: 'Internal', count: typeCounts.internal },
    { key: 'client', label: 'Consulting', count: typeCounts.client },
  ];

  return (
    <div className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Top navigation bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,255,255,0.3)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                title={tab.desc}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '12px 16px',
                  fontSize: '0.85rem', fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#b06050' : '#6b6764',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid #b06050' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
          <Filter size={13} color="#8a8682" />
          <span style={{ fontSize: '0.72rem', color: '#8a8682', fontWeight: 500, marginRight: '4px' }}>Type</span>
          {PROJECT_TYPE_FILTERS.map(f => {
            const isActive = projectTypeFilter === f.key;
            const isEmpty = f.count === 0 && f.key !== 'all';
            return (
              <button
                key={f.key}
                onClick={() => handleTypeFilterChange(f.key)}
                className={`filter-pill${isActive ? ' active' : ''}`}
                style={{
                  fontSize: '0.78rem', padding: '4px 12px',
                  opacity: isEmpty ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                {f.label}
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.06)',
                  padding: '0 5px', borderRadius: '8px',
                  color: isEmpty ? '#bbb' : undefined,
                }}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'dashboard' && (
          <Dashboard projectTypeFilter={projectTypeFilter} />
        )}
        {activeTab === 'projects' && (
          <ProjectsTasks
            key="projects-all"
            projectTypeFilter={projectTypeFilter}
            initialTab="all"
            onTabChange={(subTab) => {
              if (subTab === 'clients') { setActiveTab('clients'); setProjectTypeFilter('client'); }
            }}
          />
        )}
        {activeTab === 'clients' && (
          <ProjectsTasks
            key="projects-clients"
            projectTypeFilter="client"
            initialTab="clients"
            onTabChange={(subTab) => {
              if (subTab === 'all') { setActiveTab('projects'); setProjectTypeFilter('all'); }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CommandCenter;
