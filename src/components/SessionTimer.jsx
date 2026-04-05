import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * SessionTimer — Auto-logout after inactivity
 *
 * Tracks mouse, keyboard, and touch activity.
 * After TIMEOUT_MINUTES of no activity, logs the user out and redirects to /login.
 * Shows a warning banner 2 minutes before logout.
 */

const TIMEOUT_MINUTES = 30; // Logout after 30 min of inactivity
const WARNING_MINUTES = 2;  // Show warning 2 min before

const SessionTimer = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARNING_MINUTES * 60);
      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, (TIMEOUT_MINUTES - WARNING_MINUTES) * 60 * 1000);

    // Set logout timer
    logoutTimerRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }, TIMEOUT_MINUTES * 60 * 1000);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => {
      // Debounce: only reset if >5 seconds since last reset
      if (Date.now() - lastActivityRef.current > 5000) {
        resetTimers();
      }
    };

    events.forEach(event => document.addEventListener(event, handleActivity, { passive: true }));
    resetTimers();

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: 'linear-gradient(135deg, #d14040, #b03030)',
      color: '#fff', padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
      fontSize: '0.88rem', fontWeight: 600,
      boxShadow: '0 4px 16px rgba(209,64,64,0.3)',
      animation: 'slideDown 0.3s ease-out',
    }}>
      <span>Session expiring in {minutes}:{seconds.toString().padStart(2, '0')} due to inactivity</span>
      <button onClick={resetTimers} style={{
        padding: '6px 16px', borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.15)',
        color: '#fff', cursor: 'pointer', fontWeight: 600,
        fontSize: '0.82rem',
      }}>
        Stay Active
      </button>
    </div>
  );
};

export default SessionTimer;
