import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login = ({ onLogin, error: externalError }) => {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(externalError || '');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onLogin();
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { prompt: 'select_account' } }
    });
    if (error) setError(error.message);
  };

  const handlePasswordReset = async () => {
    setError('');
    if (!email) { setError('Enter your email first.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else alert('Password reset link sent to ' + email);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="animated-bg" style={{ filter: 'blur(120px)' }}></div>

      <div className="glass-panel" style={{
        width: '400px',
        padding: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
        boxShadow: '0 25px 50px -12px rgba(100, 80, 70, 0.2)'
      }}>
        <h1 style={{ fontSize: '1.8rem', color: '#333', marginBottom: '0.5rem', fontWeight: 700 }}>Labno Labs Center</h1>

        {error && (
          <div style={{ width: '100%', padding: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {view === 'login' && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
              Secure Central Intelligence & Operations
            </p>

            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                background: '#fff',
                marginBottom: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: 600,
                color: '#333'
              }}
            >
              <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="G" width="18" />
              Sign in with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '1rem 0' }}>
              <hr style={{ flex: 1, borderTop: '1px solid rgba(0,0,0,0.1)', borderBottom: 'none' }} />
              <span style={{ fontSize: '0.8rem', color: '#888', padding: '0 10px' }}>or any email</span>
              <hr style={{ flex: 1, borderTop: '1px solid rgba(0,0,0,0.1)', borderBottom: 'none' }} />
            </div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', fontSize: '0.9rem' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1.5rem', fontSize: '0.9rem' }}
            />

            <button className="btn-primary" onClick={handleEmailLogin} disabled={loading} style={{ width: '100%', padding: '0.85rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Access Dashboard'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1.5rem', fontSize: '0.8rem' }}>
              <span onClick={() => setView('forgotPassword')} style={{ color: '#1976d2', cursor: 'pointer' }}>What is my password?</span>
              <span onClick={() => setView('forgotEmail')} style={{ color: '#1976d2', cursor: 'pointer' }}>Forgot email / ID?</span>
            </div>
          </>
        )}

        {view === 'forgotPassword' && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
              Enter your email to receive a secure reset link.
            </p>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem' }} />
            <button className="btn-primary" onClick={handlePasswordReset} style={{ width: '100%', marginBottom: '1rem' }}>Send Reset Link</button>
            <span onClick={() => setView('login')} style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>← Back to login</span>
          </>
        )}

        {view === 'forgotEmail' && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
              Enter your recovery phone number or alternate email.
            </p>
            <input type="text" placeholder="Phone or alternate email" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem' }} />
            <button className="btn-primary" onClick={() => alert("Recovery instructions sent.")} style={{ width: '100%', marginBottom: '1rem' }}>Recover Agent ID</button>
            <span onClick={() => setView('login')} style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>← Back to login</span>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
