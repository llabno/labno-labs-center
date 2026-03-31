import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Compass, Layers, PhoneCall, Code, Database, Calendar as CalendarIcon, FilePen, LogOut } from 'lucide-react';
import './index.css';

// The interactive background blob follower
const GlassCursorBlob = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (e) => {
      // Small delay on blob for smooth following
      setPos({ x: e.clientX - 150, y: e.clientY - 150 });
    };
    window.addEventListener('mousemove', updatePosition);
    return () => window.removeEventListener('mousemove', updatePosition);
  }, []);

  return <div className="cursor-blob" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />;
};

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { name: 'Mission Control', path: '/', icon: <Home size={20} /> },
    { name: 'The Oracle (API)', path: '/oracle', icon: <Database size={20} /> },
    { name: 'Dual CRM Engine', path: '/crm', icon: <PhoneCall size={20} /> },
    { name: 'Labno Labs App Studio', path: '/studio', icon: <Code size={20} /> },
    { name: 'UI Library / Uploads', path: '/library', icon: <Layers size={20} /> },
  ];

  return (
    <div className="sidebar glass-panel">
      <h2>Labno Labs Center</h2>
      <nav>
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path} 
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
        {/* Placeholder for Auth/Logout */}
        <div style={{ marginTop: 'auto' }} className="nav-item">
          <LogOut size={20} style={{ color: '#ff4d4f' }} />
          <span style={{ color: '#ff4d4f' }}>Sign Out</span>
        </div>
      </nav>
    </div>
  );
};

const DashboardHome = () => {
  // Mock Data representing Mission Control Start Screen requirements
  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14' },
    { title: 'Daily Active Users (DAU)', value: '1,280' },
    { title: 'Total Daily Revenue', value: '$450.00' },
  ];

  return (
    <div className="main-content">
      {/* Top Value Stats Grid */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.title} className="stat-card glass-panel">
            <span className="stat-title">{s.title}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>Global Workflow & Edge Cases</h3>
        
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
          {/* Column 1 */}
          <div className="kanban-column">
            <div className="kanban-header">Backlog / Ideas</div>
            <div className="task-card glass-panel">
              <h4>Setup Vercel Custom Subdomains</h4>
              <p>Task: Configure *.labnolabs.com explicitly to reduce client DNS failure rates.</p>
            </div>
          </div>
          
          {/* Column 2 */}
          <div className="kanban-column">
            <div className="kanban-header">Overnight Agent Sync</div>
            <div className="task-card glass-panel" style={{ borderLeft: '4px solid #ffaa00' }}>
              <h4>Awaiting Lance's Review</h4>
              <p>The Oracle has finished parsing `Audio_Internship.md`. Click to approve sync to Second Brain API.</p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="kanban-column">
            <div className="kanban-header">Completed Tasks</div>
            <div className="task-card glass-panel" style={{ opacity: 0.6 }}>
              <h4>Install Labno Labs Starter Kit</h4>
              <p>Initialized Apple Glass aesthetic UI globally.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceholderPage = ({ title }) => (
  <div className="main-content glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <h1 style={{ color: '#aaa', fontWeight: 300 }}>{title}</h1>
  </div>
);

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Animated BG elements */}
        <div className="animated-bg"></div>
        <GlassCursorBlob />
        
        {/* Core Dashboard UI */}
        <Sidebar />
        
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/oracle" element={<PlaceholderPage title="Second Brain API (The Oracle)" />} />
          <Route path="/crm" element={<PlaceholderPage title="Dual CRM Pipelines (MOSO / Labno)" />} />
          <Route path="/studio" element={<PlaceholderPage title="App Development Studio" />} />
          <Route path="/library" element={<PlaceholderPage title="Global UI Components & File Upload" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
