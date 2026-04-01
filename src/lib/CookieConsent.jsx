import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

/**
 * PostHog Cookie Consent Banner
 *
 * Controls whether PostHog sets tracking cookies.
 * - On first visit: PostHog is loaded but does NOT set cookies until user consents.
 * - "Accept": calls posthog.opt_in_capturing() — cookies are set, tracking begins.
 * - "Decline": calls posthog.opt_out_capturing() — no cookies, no tracking.
 * - Choice is persisted in localStorage so the banner doesn't reappear.
 *
 * Cookie logic verification:
 * 1. PostHog is initialized in index.html with person_profiles: 'identified_only'
 * 2. This component calls opt_in_capturing() or opt_out_capturing() based on user choice
 * 3. Before consent, PostHog runs in a limited mode (no persistent cookies for anonymous users)
 * 4. After opt-out, PostHog stops all capturing and removes its cookies
 */

const CONSENT_KEY = 'labno_cookie_consent';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);

    if (stored === 'accepted') {
      // User previously accepted — ensure PostHog is opted in
      if (window.posthog && typeof window.posthog.opt_in_capturing === 'function') {
        window.posthog.opt_in_capturing();
      }
      return;
    }

    if (stored === 'declined') {
      // User previously declined — ensure PostHog is opted out
      if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
        window.posthog.opt_out_capturing();
      }
      return;
    }

    // No stored preference — opt out immediately so no cookies are set before consent,
    // then show the banner after a short delay
    if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
      window.posthog.opt_out_capturing();
    }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => setVisible(false), 300);
  };

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    if (window.posthog && typeof window.posthog.opt_in_capturing === 'function') {
      window.posthog.opt_in_capturing();
    }
    dismiss();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
      window.posthog.opt_out_capturing();
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '420px',
        width: '90vw',
        animation: closing ? 'cookieFadeOut 0.3s ease forwards' : 'cookieFadeIn 0.4s ease forwards',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2e2c2a' }}>Cookie Preferences</span>
          </div>
          <button
            onClick={handleDecline}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9e9a97', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#6b6764', lineHeight: 1.5, marginBottom: '14px' }}>
          We use PostHog to understand how you use this app and improve it.
          No personal health information is ever collected. You can change this anytime in Settings.
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDecline}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.5)',
              color: '#6b6764',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
