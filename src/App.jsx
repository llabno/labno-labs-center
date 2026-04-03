import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Database, PhoneCall, Code, Layers, LogOut, Settings as SettingsIcon, Terminal, Inbox, Compass, Map, Clock, FileText, Image, BarChart3, ListChecks, Sparkles, Brain, Gauge } from 'lucide-react';
import { supabase } from './lib/supabase';
import './index.css';

// Eager imports (needed before auth)
import Login from './pages/Login';
import CookieConsent from './lib/CookieConsent';

// Lazy-loaded pages (code-split per route)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Oracle = lazy(() => import('./pages/Oracle'));
const DualCRM = lazy(() => import('./pages/DualCRM'));
const AppStudio = lazy(() => import('./pages/AppStudio'));
const UILibrary = lazy(() => import('./pages/UILibrary'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Autonomous = lazy(() => import('./pages/Autonomous'));
const Reactivation = lazy(() => import('./pages/Reactivation'));
const Strategic = lazy(() => import('./pages/Strategic'));
const StrategicPlaybook = lazy(() => import('./pages/StrategicPlaybook'));
const WorkHistory = lazy(() => import('./pages/WorkHistory'));
const ClinicalBlog = lazy(() => import('./pages/ClinicalBlog'));
const InternalMechanic = lazy(() => import('./pages/InternalMechanic'));
const Telemetry = lazy(() => import('./pages/Telemetry'));
const ProjectsTasks = lazy(() => import('./pages/ProjectsTasks'));
const TaskQueue = lazy(() => import('./pages/TaskQueue'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Efficiency = lazy(() => import('./pages/Efficiency'));

const PageLoader = () => (
  <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8682', padding: '2rem' }}>
    Loading...
  </div>
);

// The interactive background blob follower
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

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const displayName = user?.email?.split('@')[0] || 'User';
  const menuItems = [
    { name: 'Mission Control', path: '/', icon: <Home size={20} /> },
    { name: 'The Oracle (API)', path: '/oracle', icon: <Database size={20} /> },
    { name: 'Dual CRM Engine', path: '/crm', icon: <PhoneCall size={20} /> },
    { name: 'App Studio', path: '/studio', icon: <Code size={20} /> },
    { name: 'UI Library Assets', path: '/library', icon: <Layers size={20} /> },
    { name: 'Reactivation Inbox', path: '/reactivation', icon: <Inbox size={20} /> },
    { name: 'Strategic Deep Analysis', path: '/strategic', icon: <Compass size={20} /> },
    { name: 'Strategic Playbook', path: '/playbook', icon: <Map size={20} /> },
    { name: 'Clinical Blog', path: '/blog', icon: <FileText size={20} /> },
    { name: 'Task Queue (50)', path: '/taskqueue', icon: <Layers size={20} /> },
    { name: 'Work History', path: '/history', icon: <Clock size={20} /> },
    { name: 'Internal Mechanic', path: '/mechanic', icon: <Brain size={20} /> },
    { name: 'Projects & Tasks', path: '/projects', icon: <ListChecks size={20} /> },
    { name: 'Telemetry', path: '/telemetry', icon: <BarChart3 size={20} /> },
    { name: 'Efficiency', path: '/efficiency', icon: <Gauge size={20} /> },
    { name: 'Wishlist', path: '/wishlist', icon: <Sparkles size={20} /> },
    { name: 'Autonomous Systems', path: '/autonomous', icon: <Terminal size={20} /> },
    { name: 'Screenshot to Code', path: null, icon: <Image size={20} />, external: 'https://design-to-code-app.vercel.app' },
  ];

  return (
    <div className="sidebar glass-panel">
      <h2>Labno Labs</h2>
      <nav>
        {menuItems.map((item) => (
          item.external ? (
            <a
              key={item.name}
              href={item.external}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
            >
              {item.icon}
              {item.name}
              <span style={{ fontSize: '10px', opacity: 0.4, marginLeft: 'auto' }}>↗</span>
            </a>
          ) : (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          )
        ))}
        <div style={{ marginTop: 'auto' }}>
          <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} style={{ marginBottom: '10px' }}>
            <SettingsIcon size={20} style={{ color: '#555' }} />
            <span style={{ color: '#555' }}>Settings ({displayName})</span>
          </Link>
          <div className="nav-item" style={{ cursor: 'pointer' }} onClick={onLogout}>
            <LogOut size={20} style={{ color: '#d32f2f' }} />
            <span style={{ color: '#d32f2f' }}>Sign Out {displayName}</span>
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
    return (
      <div className="app-container" style={{ padding: 0 }}>
        <Login onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))} />
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <div className="animated-bg"></div>
        <GlassCursorBlob />
        <CookieConsent />
        <Sidebar user={session.user} onLogout={handleLogout} />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/mechanic" element={<InternalMechanic />} />
          <Route path="/projects" element={<ProjectsTasks />} />
          <Route path="/telemetry" element={<Telemetry />} />
          <Route path="/efficiency" element={<Efficiency />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/autonomous" element={<Autonomous />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
