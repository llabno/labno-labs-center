import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Database, PhoneCall, Code, Layers, LogOut, Settings as SettingsIcon, Terminal, Inbox, Compass, Map, Clock, FileText, Image, BarChart3, ListChecks, Sparkles, Activity, Brain, Briefcase, Calendar, Library, Menu, X, Target, DollarSign, Sun, MessageSquare } from 'lucide-react';
import { supabase } from './lib/supabase';
import './index.css';

// Lazy-loaded Pages — code-split for faster initial load
import Login from './pages/Login'; // Login loads eagerly (first thing users see)
const CommandCenter = React.lazy(() => import('./pages/CommandCenter'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Oracle = React.lazy(() => import('./pages/Oracle'));
const DualCRM = React.lazy(() => import('./pages/DualCRM'));
const AppStudio = React.lazy(() => import('./pages/AppStudio'));
const UILibrary = React.lazy(() => import('./pages/UILibrary'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const Autonomous = React.lazy(() => import('./pages/Autonomous'));
const Reactivation = React.lazy(() => import('./pages/Reactivation'));
const Strategic = React.lazy(() => import('./pages/Strategic'));
const StrategicPlaybook = React.lazy(() => import('./pages/StrategicPlaybook'));
const WorkHistory = React.lazy(() => import('./pages/WorkHistory'));
const ClinicalBlog = React.lazy(() => import('./pages/ClinicalBlog'));
const Telemetry = React.lazy(() => import('./pages/Telemetry'));
const ProjectsTasks = React.lazy(() => import('./pages/ProjectsTasks'));
const TaskQueue = React.lazy(() => import('./pages/TaskQueue'));
const Wishlist = React.lazy(() => import('./pages/Wishlist'));
const ResourceMonitor = React.lazy(() => import('./pages/ResourceMonitor'));
const InternalMechanic = React.lazy(() => import('./pages/InternalMechanic'));
const ProjectPassport = React.lazy(() => import('./pages/ProjectPassport'));
const ClientOnboarding = React.lazy(() => import('./pages/ClientOnboarding'));
const CalendarView = React.lazy(() => import('./pages/CalendarView'));
const TimePicker = React.lazy(() => import('./pages/TimePicker'));
const ProposalGenerator = React.lazy(() => import('./pages/ProposalGenerator'));
const TemplateLibrary = React.lazy(() => import('./pages/TemplateLibrary'));
const SmartScheduler = React.lazy(() => import('./pages/SmartScheduler'));
const ClientDocuments = React.lazy(() => import('./pages/ClientDocuments'));
const ClientProfitability = React.lazy(() => import('./pages/ClientProfitability'));
const SOAPNotes = React.lazy(() => import('./pages/SOAPNotes'));
const ClientAvailability = React.lazy(() => import('./pages/ClientAvailability'));
const AvailabilityForm = React.lazy(() => import('./pages/AvailabilityForm'));
const BillingReview = React.lazy(() => import('./pages/BillingReview'));
const TodayView = React.lazy(() => import('./pages/TodayView'));
const DemoMode = React.lazy(() => import('./pages/DemoMode'));
const ClientPortal = React.lazy(() => import('./pages/ClientPortal'));
const WorkPlanner = React.lazy(() => import('./pages/WorkPlanner'));
const ContentPipeline = React.lazy(() => import('./pages/ContentPipeline'));
const AgentQueue = React.lazy(() => import('./pages/AgentQueue'));
import NotificationBell from './components/NotificationBell';
import OnboardingWizard, { isOnboardingComplete } from './components/OnboardingWizard';
import Watermark from './components/Watermark';
import SessionTimer from './components/SessionTimer';
import { getRole, filterZonesForRole, getRoleLabel, getRoleColor } from './lib/useRole';
import { useDemo } from './lib/useDemo';

// The interactive background blob follower
// Loading skeleton for lazy-loaded pages
const PageSkeleton = () => (
  <div className="main-content" style={{ padding: '1.5rem' }}>
    <div style={{ width: '200px', height: '24px', borderRadius: '6px', background: 'rgba(0,0,0,0.06)', marginBottom: '1.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="glass-panel" style={{ height: '80px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
    <div className="glass-panel" style={{ height: '300px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.3s' }} />
    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
  </div>
);

// Error boundary for lazy-loaded routes
class PageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="main-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>Something went wrong</div>
          <p style={{ color: '#8a8682', marginBottom: '16px' }}>{this.state.error?.message || 'Page failed to load'}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="btn-primary" style={{ padding: '10px 24px' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const GlassCursorBlob = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (e) => {
      setPos({ x: e.clientX - 200, y: e.clientY - 200 });
    };
    window.addEventListener('mousemove', updatePosition);
    return () => window.removeEventListener('mousemove', updatePosition);
  }, []);

  return <div className="cursor-blob" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />;
};

const ZONES = [
  {
    name: 'Command Center', icon: Home, color: '#b06050',
    items: [
      { name: 'Today', path: '/today', icon: Sun },
      { name: 'Dashboard', path: '/', icon: Home },
      { name: 'Task Queue', path: '/taskqueue', icon: Layers },
      { name: 'Calendar', path: '/calendar', icon: Calendar },
      { name: 'Work Planner', path: '/planner', icon: Target },
      { name: 'Quick Pick', path: '/quickpick', icon: Clock },
      { name: 'Smart Scheduler', path: '/scheduler', icon: Target },
    ]
  },
  {
    name: 'Build Lab', icon: Code, color: '#9c27b0',
    items: [
      { name: 'App Studio', path: '/studio', icon: Code },
      { name: 'Wishlist', path: '/wishlist', icon: Sparkles },
      { name: 'Template Library', path: '/templates', icon: Library },
      { name: 'UI Library', path: '/library', icon: Layers },
    ]
  },
  {
    name: 'Intelligence', icon: Database, color: '#1565c0',
    items: [
      { name: 'The Oracle', path: '/oracle', icon: Database },
      { name: 'Strategic Analysis', path: '/strategic', icon: Compass },
      { name: 'Playbook', path: '/playbook', icon: Map },
      { name: 'Content Pipeline', path: '/content', icon: Layers },
    ]
  },
  {
    name: 'Operations', icon: Activity, color: '#00695c',
    items: [
      { name: 'Telemetry', path: '/telemetry', icon: BarChart3 },
      { name: 'Resources', path: '/resources', icon: Activity },
      { name: 'Work History', path: '/history', icon: Clock },
      { name: 'Autonomous', path: '/autonomous', icon: Terminal },
      { name: 'Agent Queue', path: '/agent-queue', icon: MessageSquare },
    ]
  },
  {
    name: 'Clinical', icon: Brain, color: '#ad1457',
    items: [
      { name: 'Speak Freely', path: '/mechanic', icon: Brain },
      { name: 'SOAP Notes', path: '/soap', icon: Activity },
      { name: 'Clinical Blog', path: '/blog', icon: FileText },
      { name: 'Reactivation', path: '/reactivation', icon: Inbox },
      { name: 'Client Availability', path: '/availability', icon: Calendar },
    ]
  },
  {
    name: 'Sales & Clients', icon: PhoneCall, color: '#e65100',
    items: [
      { name: 'Dual CRM', path: '/crm', icon: PhoneCall },
      { name: 'Client Onboarding', path: '/onboarding', icon: Briefcase },
      { name: 'Proposal Generator', path: '/proposals', icon: FileText },
      { name: 'Client Documents', path: '/documents', icon: FileText },
      { name: 'Client Profitability', path: '/profitability', icon: BarChart3 },
      { name: 'Billing Review', path: '/billing', icon: DollarSign },
      { name: 'Screenshot to Code', path: null, icon: Image, external: 'https://design-to-code-app.vercel.app' },
    ]
  },
];

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const displayName = user?.email?.split('@')[0] || 'User';
  const role = getRole(user?.email);
  const visibleZones = filterZonesForRole(ZONES, role);

  // Favorites — synced to Supabase (cross-device), localStorage as fallback
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('llc_favorites') || '[]'); } catch { return []; }
  });
  const [editingFavorites, setEditingFavorites] = useState(false);

  // Load favorites from Supabase on mount
  useEffect(() => {
    if (!user?.email) return;
    supabase.from('user_preferences').select('favorites').eq('user_email', user.email).single()
      .then(({ data }) => {
        if (data?.favorites && Array.isArray(data.favorites) && data.favorites.length > 0) {
          setFavorites(data.favorites);
          localStorage.setItem('llc_favorites', JSON.stringify(data.favorites));
        }
      }).catch(() => {}); // table may not exist yet
  }, [user?.email]);

  // Save favorites to both localStorage and Supabase
  const saveFavorites = (next) => {
    localStorage.setItem('llc_favorites', JSON.stringify(next));
    if (user?.email) {
      supabase.from('user_preferences').upsert({
        user_email: user.email,
        favorites: next,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email' }).catch(() => {});
    }
  };

  const allPages = visibleZones.flatMap(z => z.items.filter(i => i.path));
  const toggleFavorite = (path) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : prev.length < 10 ? [...prev, path] : prev;
      saveFavorites(next);
      return next;
    });
  };
  const moveFavorite = (path, dir) => {
    setFavorites(prev => {
      const idx = prev.indexOf(path);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      saveFavorites(next);
      return next;
    });
  };

  // Auto-expand the zone that contains the current path
  const activeZoneIdx = visibleZones.findIndex(z => z.items.some(i => i.path === location.pathname));
  const [openZones, setOpenZones] = useState(new Set(activeZoneIdx >= 0 ? [activeZoneIdx] : [0]));

  const toggleZone = (idx) => {
    setOpenZones(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="sidebar glass-panel">
      <h2>Labno Labs</h2>
      <nav>
        {/* Favorites Quick Links */}
        {!editingFavorites && (
          <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '6px 0' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#b06050', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Favorites ({favorites.length})
              <span onClick={() => setEditingFavorites(true)} style={{ cursor: 'pointer', color: '#8a8682', fontSize: '0.58rem' }}>edit</span>
            </div>
            {favorites.length > 0 ? favorites.map(path => {
              const page = allPages.find(p => p.path === path);
              if (!page) return null;
              const PIcon = page.icon;
              return (
                <Link key={path} to={path} className={`nav-item${location.pathname === path ? ' active' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '5px 12px', gap: '8px' }}>
                  <PIcon size={14} style={{ color: location.pathname === path ? '#b06050' : '#888' }} />
                  {page.name}
                </Link>
              );
            }) : (
              <div style={{ fontSize: '0.72rem', color: '#aaa', padding: '4px 12px' }}>Click "edit" to pick up to 10 quick links</div>
            )}
          </div>
        )}
        {editingFavorites && (
          <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '6px 0' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#b06050', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Edit Favorites ({favorites.length}/10)
              <span onClick={() => setEditingFavorites(false)} style={{ cursor: 'pointer', color: '#2d8a4e', fontSize: '0.6rem', fontWeight: 600 }}>done</span>
            </div>
            {/* Current favorites with reorder */}
            {favorites.length > 0 && (
              <div style={{ marginBottom: '6px', padding: '0 8px' }}>
                {favorites.map((path, idx) => {
                  const page = allPages.find(p => p.path === path);
                  if (!page) return null;
                  const PIcon = page.icon;
                  return (
                    <div key={path} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '3px 4px', color: '#b06050', fontWeight: 600 }}>
                      <span style={{ fontSize: '0.58rem', color: '#8a8682', width: '14px' }}>{idx + 1}</span>
                      <PIcon size={11} />
                      <span style={{ flex: 1 }}>{page.name}</span>
                      <span onClick={() => moveFavorite(path, -1)} style={{ cursor: idx > 0 ? 'pointer' : 'default', color: idx > 0 ? '#8a8682' : '#ddd', fontSize: '0.7rem', padding: '0 2px' }}>&#9650;</span>
                      <span onClick={() => moveFavorite(path, 1)} style={{ cursor: idx < favorites.length - 1 ? 'pointer' : 'default', color: idx < favorites.length - 1 ? '#8a8682' : '#ddd', fontSize: '0.7rem', padding: '0 2px' }}>&#9660;</span>
                      <span onClick={() => toggleFavorite(path)} style={{ cursor: 'pointer', color: '#d14040', fontSize: '0.65rem', padding: '0 2px' }}>&#10005;</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ maxHeight: '200px', overflow: 'auto', borderTop: favorites.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', paddingTop: '4px' }}>
              {allPages.filter(p => !favorites.includes(p.path)).map(page => {
                const PIcon = page.icon;
                return (
                  <div key={page.path} onClick={() => toggleFavorite(page.path)}
                    style={{ fontSize: '0.75rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: favorites.length >= 10 ? 'not-allowed' : 'pointer', color: favorites.length >= 10 ? '#ccc' : '#6b6764', fontWeight: 400 }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }} />
                    <PIcon size={12} /> {page.name}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {visibleZones.map((zone, zIdx) => {
          const ZIcon = zone.icon;
          const isOpen = openZones.has(zIdx);
          const hasActivePage = zone.items.some(i => i.path === location.pathname);
          return (
            <div key={zone.name}>
              <div
                className={`nav-item${hasActivePage ? ' active' : ''}`}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}
                onClick={() => toggleZone(zIdx)}
              >
                <ZIcon size={18} style={{ color: hasActivePage ? zone.color : '#888', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: hasActivePage ? 600 : 500, fontSize: '0.88rem' }}>{zone.name}</span>
                <span style={{ fontSize: '0.6rem', color: '#aaa', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>&#9654;</span>
              </div>
              {isOpen && (
                <div style={{ paddingLeft: '18px', overflow: 'hidden' }}>
                  {zone.items.map(item => {
                    const IIcon = item.icon;
                    if (item.external) {
                      return (
                        <a key={item.name} href={item.external} target="_blank" rel="noopener noreferrer"
                          className="nav-item" style={{ fontSize: '0.82rem', padding: '6px 10px', gap: '8px' }}>
                          <IIcon size={15} style={{ color: '#888' }} />
                          {item.name}
                          <span style={{ fontSize: '9px', opacity: 0.4, marginLeft: 'auto' }}>↗</span>
                        </a>
                      );
                    }
                    return (
                      <Link key={item.name} to={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        style={{ fontSize: '0.82rem', padding: '6px 10px', gap: '8px' }}>
                        <IIcon size={15} style={{ color: location.pathname === item.path ? zone.color : '#888' }} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ marginTop: 'auto' }}>
          <Link to="/demo" className={`nav-item ${location.pathname === '/demo' ? 'active' : ''}`} style={{ marginBottom: '4px', opacity: 0.7 }}>
            <Sparkles size={18} style={{ color: '#9c27b0' }} />
            <span style={{ color: '#9c27b0', fontSize: '0.82rem' }}>Demo Mode</span>
          </Link>
          <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} style={{ marginBottom: '4px' }}>
            <SettingsIcon size={20} style={{ color: '#555' }} />
            <span style={{ color: '#555' }}>Settings ({displayName})
              <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: getRoleColor(role) + '15', color: getRoleColor(role), marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getRoleLabel(role)}</span>
            </span>
          </Link>
          <div className="nav-item" style={{ cursor: 'pointer' }} onClick={onLogout}>
            <LogOut size={20} style={{ color: '#d32f2f' }} />
            <span style={{ color: '#d32f2f', fontSize: '0.82rem' }}>Sign Out</span>
          </div>
        </div>
      </nav>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ALLOWED_DOMAINS = ['labnolabs.com', 'movement-solutions.com'];

  const isAllowedEmail = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // If user signed in but email not in allowed domains, sign them out
  if (session && !isAllowedEmail(session.user?.email)) {
    supabase.auth.signOut();
    return (
      <div className="app-container" style={{ padding: 0 }}>
        <Login onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))}
               error="Access denied. Only @labnolabs.com and @movement-solutions.com accounts are allowed." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    // Allow public routes even when not authenticated
    if (window.location.pathname === '/availability/fill' || window.location.pathname === '/demo' || window.location.pathname === '/portal') {
      return (
        <Router>
          <PageErrorBoundary><React.Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/availability/fill" element={<AvailabilityForm />} />
              <Route path="/demo" element={<DemoMode />} />
              <Route path="/portal" element={<ClientPortal />} />
            </Routes>
          </React.Suspense></PageErrorBoundary>
        </Router>
      );
    }

    return (
      <div className="app-container" style={{ padding: 0 }}>
        <Login onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))} />
      </div>
    );
  }

  return (
    <Router>
      <AppShell session={session} onLogout={handleLogout} />
    </Router>
  );
}

function AppShell({ session, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());
  const { isDemo, tierName, exitDemo } = useDemo();
  const location = useLocation();

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K opens quick wishlist add
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickAdd(prev => !prev);
      }
      if (e.key === 'Escape') setShowQuickAdd(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
      <div className="app-container">
        <div className="animated-bg"></div>
        <GlassCursorBlob />

        {/* Mobile hamburger */}
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile overlay */}
        <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className={sidebarOpen ? 'sidebar-wrapper open' : 'sidebar-wrapper'}>
          <Sidebar user={session.user} onLogout={onLogout} />
        </div>

        <NotificationBell />

        {/* Demo Mode Banner */}
        {isDemo && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
            color: '#fff', textAlign: 'center',
            padding: '6px 16px', fontSize: '0.78rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            flexWrap: 'wrap',
          }}>
            <span>DEMO MODE — {tierName}</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 400 }}>
              All data is fictional. No real client information is displayed.
            </span>
            <button onClick={() => { exitDemo(); window.location.href = '/demo'; }} style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 600,
            }}>
              Exit
            </button>
          </div>
        )}
        {isDemo && <Watermark mode="overlay" isDemo />}
        {session?.user && <SessionTimer />}

        {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}

        <PageErrorBoundary><React.Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Command Center (merged Mission Control + Projects & Tasks) */}
          <Route path="/" element={<CommandCenter />} />
          <Route path="/command-center" element={<CommandCenter />} />
          {/* Redirect old /projects path to Command Center */}
          <Route path="/projects" element={<CommandCenter />} />
          <Route path="/oracle" element={<Oracle />} />
          <Route path="/crm" element={<DualCRM />} />
          <Route path="/studio" element={<AppStudio />} />
          <Route path="/library" element={<UILibrary />} />
          <Route path="/reactivation" element={<Reactivation />} />
          <Route path="/strategic" element={<Strategic />} />
          <Route path="/playbook" element={<StrategicPlaybook />} />
          <Route path="/blog" element={<ClinicalBlog />} />
          <Route path="/taskqueue" element={<TaskQueue />} />
          <Route path="/history" element={<WorkHistory />} />
          <Route path="/telemetry" element={<Telemetry />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/resources" element={<ResourceMonitor />} />
          <Route path="/mechanic" element={<InternalMechanic />} />
          <Route path="/soap" element={<SOAPNotes />} />
          <Route path="/autonomous" element={<Autonomous />} />
          <Route path="/project/:id" element={<ProjectPassport />} />
          <Route path="/onboarding" element={<ClientOnboarding />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/quickpick" element={<TimePicker />} />
          <Route path="/planner" element={<WorkPlanner />} />
          <Route path="/content" element={<ContentPipeline />} />
          <Route path="/agent-queue" element={<AgentQueue />} />
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="/proposals" element={<ProposalGenerator />} />
          <Route path="/templates" element={<TemplateLibrary />} />
          <Route path="/scheduler" element={<SmartScheduler />} />
          <Route path="/documents" element={<ClientDocuments />} />
          <Route path="/profitability" element={<ClientProfitability />} />
          <Route path="/availability" element={<ClientAvailability />} />
          <Route path="/availability/fill" element={<AvailabilityForm />} />
          <Route path="/billing" element={<BillingReview />} />
          <Route path="/today" element={<TodayView />} />
          <Route path="/demo" element={<DemoMode />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        </React.Suspense></PageErrorBoundary>

        {/* Global Quick Add (Cmd+K / Ctrl+K) */}
        {showQuickAdd && <QuickAddOverlay onClose={() => setShowQuickAdd(false)} />}

        {/* Mobile Bottom Nav — shown on small screens */}
        <nav className="mobile-bottom-nav">
          <Link to="/today" className={location.pathname === '/today' ? 'active' : ''}>
            <Sun size={20} />
            <span>Today</span>
          </Link>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Home size={20} />
            <span>Home</span>
          </Link>
          <Link to="/planner" className={location.pathname === '/planner' ? 'active' : ''}>
            <Target size={20} />
            <span>Planner</span>
          </Link>
          <Link to="/soap" className={location.pathname === '/soap' ? 'active' : ''}>
            <Activity size={20} />
            <span>SOAP</span>
          </Link>
          <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
            <SettingsIcon size={20} />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
  );
}

// Quick Add Overlay — global keyboard shortcut modal
function QuickAddOverlay({ onClose }) {
  const [input, setInput] = useState('');
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    if (!input.trim()) return;
    const items = input.split(/\n+/).map(s => s.trim()).filter(s => s.length > 3);
    for (const chunk of items) {
      await supabase.from('wishlist').insert({ raw_text: chunk, status: 'New Idea', analyzed: false });
    }
    setInput('');
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1200);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '20px', width: '90%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>Quick Idea Capture</span>
          <span style={{ fontSize: '0.62rem', color: '#8a8682', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)' }}>Cmd+K</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#8a8682', cursor: 'pointer' }} onClick={onClose}>ESC to close</span>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#2d8a4e', fontWeight: 600, fontSize: '1.1rem' }}>Added to Wishlist</div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type an idea and press Enter..."
              rows={3}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.95rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <p style={{ fontSize: '0.68rem', color: '#8a8682', marginTop: '6px' }}>Press Enter to add. Shift+Enter for new line. Ideas are auto-analyzed and routed.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
