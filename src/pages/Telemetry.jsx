import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Users, TrendingUp, BarChart3, Globe, Search, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Mock seed data — used when the geo_telemetry table doesn't exist yet.
// Once the migration in supabase_geo_telemetry.sql is run, live data takes over.
const MOCK_DATA = [
  { id: 1, city: 'Evanston', state: 'IL', zipcode: '60201', visitors: 342, sessions: 1204, avg_duration_sec: 187, top_page: '/crm', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 2, city: 'Evanston', state: 'IL', zipcode: '60202', visitors: 218, sessions: 764, avg_duration_sec: 142, top_page: '/', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 3, city: 'Chicago', state: 'IL', zipcode: '60614', visitors: 189, sessions: 612, avg_duration_sec: 203, top_page: '/studio', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 4, city: 'Chicago', state: 'IL', zipcode: '60657', visitors: 156, sessions: 498, avg_duration_sec: 178, top_page: '/oracle', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 5, city: 'Chicago', state: 'IL', zipcode: '60611', visitors: 134, sessions: 421, avg_duration_sec: 165, top_page: '/', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 6, city: 'Skokie', state: 'IL', zipcode: '60076', visitors: 97, sessions: 310, avg_duration_sec: 134, top_page: '/projects', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 7, city: 'Wilmette', state: 'IL', zipcode: '60091', visitors: 84, sessions: 267, avg_duration_sec: 198, top_page: '/crm', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 8, city: 'Oak Park', state: 'IL', zipcode: '60302', visitors: 72, sessions: 231, avg_duration_sec: 156, top_page: '/studio', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 9, city: 'San Francisco', state: 'CA', zipcode: '94107', visitors: 67, sessions: 198, avg_duration_sec: 221, top_page: '/oracle', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 10, city: 'San Francisco', state: 'CA', zipcode: '94110', visitors: 54, sessions: 165, avg_duration_sec: 189, top_page: '/', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 11, city: 'New York', state: 'NY', zipcode: '10001', visitors: 48, sessions: 142, avg_duration_sec: 167, top_page: '/crm', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 12, city: 'New York', state: 'NY', zipcode: '10013', visitors: 41, sessions: 118, avg_duration_sec: 145, top_page: '/studio', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 13, city: 'Austin', state: 'TX', zipcode: '78701', visitors: 38, sessions: 112, avg_duration_sec: 201, top_page: '/oracle', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 14, city: 'Denver', state: 'CO', zipcode: '80202', visitors: 31, sessions: 94, avg_duration_sec: 176, top_page: '/', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 15, city: 'Seattle', state: 'WA', zipcode: '98101', visitors: 29, sessions: 87, avg_duration_sec: 192, top_page: '/projects', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 16, city: 'Portland', state: 'OR', zipcode: '97201', visitors: 22, sessions: 68, avg_duration_sec: 158, top_page: '/crm', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 17, city: 'Los Angeles', state: 'CA', zipcode: '90012', visitors: 19, sessions: 56, avg_duration_sec: 134, top_page: '/', source: 'posthog', recorded_at: '2026-03-30' },
  { id: 18, city: 'Boston', state: 'MA', zipcode: '02101', visitors: 17, sessions: 49, avg_duration_sec: 211, top_page: '/oracle', source: 'posthog', recorded_at: '2026-03-30' },
];

const PAGE_LABELS = {
  '/': 'Mission Control',
  '/crm': 'Dual CRM',
  '/oracle': 'The Oracle',
  '/studio': 'App Studio',
  '/projects': 'Projects & Tasks',
  '/library': 'UI Library',
  '/autonomous': 'Autonomous',
  '/settings': 'Settings',
  '/telemetry': 'Telemetry',
};

const STATE_ABBRS = {
  'IL': 'Illinois', 'CA': 'California', 'NY': 'New York', 'TX': 'Texas',
  'CO': 'Colorado', 'WA': 'Washington', 'OR': 'Oregon', 'MA': 'Massachusetts',
};

// Simple horizontal bar chart rendered in pure CSS
const HorizontalBar = ({ value, max, color = 'var(--accent)', label, sublabel }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <div style={{ minWidth: '110px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e2c2a' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.7rem', color: '#9e9a97' }}>{sublabel}</div>}
      </div>
      <div style={{ flex: 1, height: '24px', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          borderRadius: '6px',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: pct > 0 ? '2px' : 0,
        }} />
        <span style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: pct > 60 ? '#fff' : '#6b6764',
        }}>{value.toLocaleString()}</span>
      </div>
    </div>
  );
};

const Telemetry = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('visitors');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('city'); // 'city' | 'zip' | 'state'
  const [expandedCity, setExpandedCity] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('geo_telemetry')
        .select('*')
        .order('visitors', { ascending: false });

      if (error || !rows || rows.length === 0) {
        // Table doesn't exist or is empty — use mock data
        setData(MOCK_DATA);
        setUsingMock(true);
      } else {
        setData(rows);
        setUsingMock(false);
      }
    } catch {
      setData(MOCK_DATA);
      setUsingMock(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Aggregate by view mode
  const aggregated = useMemo(() => {
    const filtered = data.filter(row => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        row.city.toLowerCase().includes(s) ||
        row.state.toLowerCase().includes(s) ||
        row.zipcode.includes(s)
      );
    });

    if (viewMode === 'zip') {
      return filtered.map(row => ({
        key: row.zipcode,
        label: row.zipcode,
        sublabel: `${row.city}, ${row.state}`,
        visitors: row.visitors,
        sessions: row.sessions,
        avg_duration_sec: row.avg_duration_sec,
        top_page: row.top_page,
      }));
    }

    if (viewMode === 'state') {
      const grouped = {};
      filtered.forEach(row => {
        if (!grouped[row.state]) {
          grouped[row.state] = { visitors: 0, sessions: 0, durations: [], zips: 0, pages: {} };
        }
        grouped[row.state].visitors += row.visitors;
        grouped[row.state].sessions += row.sessions;
        grouped[row.state].durations.push(row.avg_duration_sec);
        grouped[row.state].zips += 1;
        grouped[row.state].pages[row.top_page] = (grouped[row.state].pages[row.top_page] || 0) + row.visitors;
      });
      return Object.entries(grouped).map(([state, g]) => {
        const topPage = Object.entries(g.pages).sort((a, b) => b[1] - a[1])[0]?.[0] || '/';
        return {
          key: state,
          label: STATE_ABBRS[state] || state,
          sublabel: `${g.zips} zip codes`,
          visitors: g.visitors,
          sessions: g.sessions,
          avg_duration_sec: Math.round(g.durations.reduce((a, b) => a + b, 0) / g.durations.length),
          top_page: topPage,
        };
      });
    }

    // city mode (default)
    const grouped = {};
    filtered.forEach(row => {
      const ck = `${row.city}, ${row.state}`;
      if (!grouped[ck]) {
        grouped[ck] = { visitors: 0, sessions: 0, durations: [], zips: [], pages: {} };
      }
      grouped[ck].visitors += row.visitors;
      grouped[ck].sessions += row.sessions;
      grouped[ck].durations.push(row.avg_duration_sec);
      grouped[ck].zips.push(row.zipcode);
      grouped[ck].pages[row.top_page] = (grouped[ck].pages[row.top_page] || 0) + row.visitors;
    });
    return Object.entries(grouped).map(([city, g]) => {
      const topPage = Object.entries(g.pages).sort((a, b) => b[1] - a[1])[0]?.[0] || '/';
      return {
        key: city,
        label: city,
        sublabel: `${g.zips.length} zip${g.zips.length > 1 ? 's' : ''}: ${g.zips.join(', ')}`,
        visitors: g.visitors,
        sessions: g.sessions,
        avg_duration_sec: Math.round(g.durations.reduce((a, b) => a + b, 0) / g.durations.length),
        top_page: topPage,
      };
    });
  }, [data, searchTerm, viewMode]);

  const sorted = useMemo(() => {
    return [...aggregated].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [aggregated, sortField, sortDir]);

  // Summary stats
  const totalVisitors = data.reduce((s, r) => s + r.visitors, 0);
  const totalSessions = data.reduce((s, r) => s + r.sessions, 0);
  const uniqueCities = [...new Set(data.map(r => `${r.city}, ${r.state}`))].length;
  const uniqueZips = [...new Set(data.map(r => r.zipcode))].length;
  const avgDuration = data.length > 0
    ? Math.round(data.reduce((s, r) => s + r.avg_duration_sec, 0) / data.length)
    : 0;

  const maxVisitors = sorted.length > 0 ? sorted[0].visitors : 1;

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  // PostHog tracking
  useEffect(() => {
    if (window.posthog) {
      window.posthog.capture('viewed_telemetry_dashboard');
    }
  }, []);

  if (loading) {
    return (
      <div className="main-content" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8682' }}>
        Loading telemetry data...
      </div>
    );
  }

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Global Telemetry</h1>
          <p style={{ color: '#6b6764', fontSize: '0.85rem' }}>
            Visitor demographics by city, zip code, and state
            {usingMock && (
              <span style={{ marginLeft: '10px', background: 'rgba(196, 154, 64, 0.15)', color: '#c49a40', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                Mock Data — run migration to connect PostHog
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 0 }}>
        <div className="stat-card glass-panel">
          <span className="stat-title">Total Visitors</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{totalVisitors.toLocaleString()}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-title">Total Sessions</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{totalSessions.toLocaleString()}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-title">Unique Cities</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{uniqueCities}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-title">Zip Codes</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{uniqueZips}</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-title">Avg Duration</span>
          <span className="stat-value" style={{ fontSize: '2rem' }}>{formatDuration(avgDuration)}</span>
        </div>
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* View Mode Selector */}
        <div className="filter-bar">
          <span className="filter-label">Group By</span>
          {[
            { key: 'city', label: 'City', icon: <MapPin size={13} /> },
            { key: 'zip', label: 'Zip Code', icon: <BarChart3 size={13} /> },
            { key: 'state', label: 'State', icon: <Globe size={13} /> },
          ].map(mode => (
            <button
              key={mode.key}
              className={`filter-pill${viewMode === mode.key ? ' active' : ''}`}
              onClick={() => setViewMode(mode.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9e9a97' }} />
          <input
            type="text"
            placeholder="Search city, state, or zip..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              fontSize: '0.82rem',
              color: '#3a3836',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Main Content: Chart + Table side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Bar Chart Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--accent)" />
            Visitors by {viewMode === 'zip' ? 'Zip Code' : viewMode === 'state' ? 'State' : 'City'}
          </h3>
          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
            {sorted.slice(0, 15).map(row => (
              <HorizontalBar
                key={row.key}
                value={row.visitors}
                max={maxVisitors}
                label={row.label}
                sublabel={row.sublabel}
                color="var(--accent)"
              />
            ))}
            {sorted.length === 0 && (
              <p style={{ color: '#9e9a97', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                No results match your search.
              </p>
            )}
          </div>
        </div>

        {/* Data Table Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--accent)" />
            Detailed Breakdown
          </h3>
          <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '0.75rem', color: '#3e3c3a', fontWeight: 600, fontSize: '0.8rem' }}>
                      {viewMode === 'zip' ? 'Zip Code' : viewMode === 'state' ? 'State' : 'City'}
                    </th>
                    <th
                      style={{ padding: '0.75rem', color: '#3e3c3a', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSort('visitors')}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Visitors <SortIcon field="visitors" />
                      </span>
                    </th>
                    <th
                      style={{ padding: '0.75rem', color: '#3e3c3a', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSort('sessions')}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Sessions <SortIcon field="sessions" />
                      </span>
                    </th>
                    <th
                      style={{ padding: '0.75rem', color: '#3e3c3a', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSort('avg_duration_sec')}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Avg Duration <SortIcon field="avg_duration_sec" />
                      </span>
                    </th>
                    <th style={{ padding: '0.75rem', color: '#3e3c3a', fontWeight: 600, fontSize: '0.8rem' }}>
                      Top Page
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(row => (
                    <tr
                      key={row.key}
                      style={{
                        borderBottom: '1px solid rgba(0,0,0,0.02)',
                        background: expandedCity === row.key ? 'rgba(176, 96, 80, 0.06)' : 'rgba(255,255,255,0.5)',
                        cursor: viewMode === 'city' ? 'pointer' : 'default',
                        transition: 'background 0.2s ease',
                      }}
                      onClick={() => viewMode === 'city' && setExpandedCity(expandedCity === row.key ? null : row.key)}
                    >
                      <td style={{ padding: '0.75rem', color: '#1e1d1c', fontWeight: 500, fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="#9e9a97" /> {row.label}
                          </div>
                          {row.sublabel && (
                            <div style={{ fontSize: '0.7rem', color: '#9e9a97', marginTop: '2px', marginLeft: '19px' }}>{row.sublabel}</div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#2e2c2a', fontWeight: 600, fontSize: '0.85rem' }}>
                        {row.visitors.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#6b6764', fontSize: '0.85rem' }}>
                        {row.sessions.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#6b6764', fontSize: '0.85rem' }}>
                        {formatDuration(row.avg_duration_sec)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: 'rgba(176, 96, 80, 0.08)',
                          color: 'var(--accent)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          {PAGE_LABELS[row.top_page] || row.top_page}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9e9a97' }}>
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PostHog Cookie Status Card */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertCircle size={18} color="#c49a40" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e2c2a' }}>PostHog Cookie Consent Status</div>
          <div style={{ fontSize: '0.78rem', color: '#6b6764', marginTop: '2px' }}>
            {window.posthog ? (
              window.posthog.has_opted_out_capturing?.()
                ? 'User has opted OUT of tracking. No cookies are being set.'
                : window.posthog.has_opted_in_capturing?.()
                  ? 'User has opted IN to tracking. PostHog cookies are active.'
                  : 'PostHog loaded — using default consent mode (identified_only). Cookie banner controls opt-in/opt-out.'
            ) : (
              'PostHog is not loaded. The script may be blocked or not yet initialized.'
            )}
          </div>
        </div>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: window.posthog
            ? (window.posthog.has_opted_out_capturing?.() ? '#9e9a97' : '#6aab6e')
            : '#d32f2f',
          boxShadow: window.posthog
            ? (window.posthog.has_opted_out_capturing?.() ? 'none' : '0 0 6px rgba(106,171,110,0.5)')
            : '0 0 6px rgba(211,47,47,0.5)',
        }} />
      </div>

    </div>
  );
};

export default Telemetry;
