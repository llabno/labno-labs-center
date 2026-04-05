import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Restore dark mode and theme from localStorage before first paint
if (localStorage.getItem('llc_dark_mode') === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark');
}
try {
  const savedTheme = JSON.parse(localStorage.getItem('llc_theme'));
  if (savedTheme) {
    document.documentElement.style.setProperty('--primary-glow', savedTheme.primary);
    document.documentElement.style.setProperty('--secondary-glow', savedTheme.secondary);
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for offline cache
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    // Re-sync cache when coming back online
    window.addEventListener('online', () => {
      navigator.serviceWorker.controller?.postMessage('SYNC_CACHE');
    });
  });
}
