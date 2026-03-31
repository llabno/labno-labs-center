import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [view, setView] = useState('login'); // login | forgotPassword | forgotEmail
  
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
      {/* Background elements */}
      <div className="animated-bg" style={{ filter: 'blur(120px)' }}></div>
      
      {/* Login Card */}
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
        
        {view === 'login' && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
              Secure Central Intelligence & Operations
            </p>

            <button 
              onClick={onLogin}
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
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', fontSize: '0.9rem' }} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1.5rem', fontSize: '0.9rem' }} 
            />

            <button className="btn-primary" onClick={onLogin} style={{ width: '100%', padding: '0.85rem' }}>
              Access Dashboard
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
            <input type="email" placeholder="Email address" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem' }} />
            <button className="btn-primary" onClick={() => alert("Simulated: Password reset link sent.")} style={{ width: '100%', marginBottom: '1rem' }}>Send Reset Link</button>
            <span onClick={() => setView('login')} style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>← Back to login</span>
          </>
        )}

        {view === 'forgotEmail' && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
              Enter your recovery phone number or alternate email.
            </p>
            <input type="text" placeholder="Phone or alternate email" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem' }} />
            <button className="btn-primary" onClick={() => alert("Simulated: Recovery instructions sent.")} style={{ width: '100%', marginBottom: '1rem' }}>Recover Agent ID</button>
            <span onClick={() => setView('login')} style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>← Back to login</span>
          </>
        )}

      </div>
    </div>
  );
};

export default Login;
