import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Database, PhoneCall, Code, Layers, LogOut } from 'lucide-react';
import './index.css';

// Import Pages
import Dashboard from './pages/Dashboard';
import Oracle from './pages/Oracle';
import DualCRM from './pages/DualCRM';
import AppStudio from './pages/AppStudio';
import UILibrary from './pages/UILibrary';

// The interactive background blob follower
const GlassCursorBlob = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (e) => {
      // Small delay on blob for smooth following
      setPos({ x: e.clientX - 200, y: e.clientY - 200 });
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
    { name: 'App Studio', path: '/studio', icon: <Code size={20} /> },
    { name: 'UI Library Assets', path: '/library', icon: <Layers size={20} /> },
  ];

  return (
    <div className="sidebar glass-panel">
      <h2>Labno Labs</h2>
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
          <LogOut size={20} style={{ color: '#d32f2f' }} />
          <span style={{ color: '#d32f2f' }}>Sign Out Lance</span>
        </div>
      </nav>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Animated BG elements */}
        <div className="animated-bg"></div>
        <GlassCursorBlob />
        
        {/* Core Dashboard UI */}
        <Sidebar />
        
        {/* Page Routing */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/oracle" element={<Oracle />} />
          <Route path="/crm" element={<DualCRM />} />
          <Route path="/studio" element={<AppStudio />} />
          <Route path="/library" element={<UILibrary />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
