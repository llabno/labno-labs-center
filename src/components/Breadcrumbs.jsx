import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '/': 'Command Center',
  '/command-center': 'Command Center',
  '/taskqueue': 'Task Queue',
  '/studio': 'App Studio',
  '/wishlist': 'Wishlist',
  '/library': 'UI Library',
  '/oracle': 'The Oracle',
  '/strategic': 'Strategic Analysis',
  '/playbook': 'Strategic Playbook',
  '/telemetry': 'Telemetry',
  '/resources': 'Resource Monitor',
  '/history': 'Work History',
  '/autonomous': 'Autonomous Systems',
  '/mechanic': 'Speak Freely',
  '/blog': 'Clinical Blog',
  '/reactivation': 'Reactivation Inbox',
  '/crm': 'Dual CRM',
  '/onboarding': 'Client Onboarding',
  '/calendar': 'Calendar',
  '/quickpick': 'Quick Pick',
  '/proposals': 'Proposal Generator',
  '/templates': 'Template Library',
  '/documents': 'Client Documents',
  '/profitability': 'Client Profitability',
  '/soap': 'SOAP Notes',
  '/scheduler': 'Smart Scheduler',
  '/today': 'Today',
  '/demo': 'Demo Mode',
  '/settings': 'Settings',
};

const ROUTE_ZONES = {
  '/': 'Command Center',
  '/command-center': 'Command Center',
  '/taskqueue': 'Command Center',
  '/calendar': 'Command Center',
  '/quickpick': 'Command Center',
  '/scheduler': 'Command Center',
  '/today': 'Command Center',
  '/studio': 'Build Lab',
  '/wishlist': 'Build Lab',
  '/library': 'Build Lab',
  '/oracle': 'Intelligence',
  '/strategic': 'Intelligence',
  '/playbook': 'Intelligence',
  '/telemetry': 'Operations',
  '/resources': 'Operations',
  '/history': 'Operations',
  '/autonomous': 'Operations',
  '/mechanic': 'Clinical',
  '/blog': 'Clinical',
  '/reactivation': 'Clinical',
  '/soap': 'Clinical',
  '/crm': 'Sales & Clients',
  '/onboarding': 'Sales & Clients',
  '/proposals': 'Sales & Clients',
  '/documents': 'Sales & Clients',
  '/profitability': 'Sales & Clients',
  '/templates': 'Build Lab',
  '/demo': 'Demo',
};

const Breadcrumbs = ({ projectName }) => {
  const location = useLocation();
  const path = location.pathname;

  // Don't show on root
  if (path === '/') return null;

  const crumbs = [{ label: 'Home', path: '/' }];

  // Check if this is a project passport route
  if (path.startsWith('/project/')) {
    crumbs.push({ label: 'Command Center', path: '/' });
    crumbs.push({ label: 'Projects', path: '/' });
    if (projectName) crumbs.push({ label: projectName, path: null });
  } else {
    const basePath = '/' + path.split('/')[1];
    const zone = ROUTE_ZONES[basePath];
    if (zone && zone !== 'Command Center') {
      crumbs.push({ label: zone, path: null });
    }
    const label = ROUTE_LABELS[basePath];
    if (label) crumbs.push({ label, path: null });
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '0.75rem', color: '#8a8682',
      padding: '8px 0', flexWrap: 'wrap',
    }}>
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {i > 0 && <ChevronRight size={11} color="#bbb" />}
          {crumb.path && i < crumbs.length - 1 ? (
            <Link to={crumb.path} style={{ color: '#8a8682', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.color = '#b06050'}
              onMouseOut={e => e.currentTarget.style.color = '#8a8682'}>
              {i === 0 ? <Home size={12} /> : crumb.label}
            </Link>
          ) : (
            <span style={{ color: i === crumbs.length - 1 ? '#2e2c2a' : '#8a8682', fontWeight: i === crumbs.length - 1 ? 500 : 400 }}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
};

export default Breadcrumbs;
