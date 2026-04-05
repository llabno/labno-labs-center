import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
