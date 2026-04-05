import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_TIERS } from '../lib/demo-data';
import { useDemo } from '../lib/useDemo';
import { Play, LogOut, Check, Sparkles, Users, Stethoscope } from 'lucide-react';

const TIER_ICONS = {
  'project-track': Sparkles,
  'build': Users,
  'build-plus': Stethoscope,
};

const DemoMode = () => {
  const navigate = useNavigate();
  const { isDemo, tier: activeTier, activateDemo, exitDemo } = useDemo();
  const [hoveredTier, setHoveredTier] = useState(null);

  const handleActivate = (tierKey) => {
    activateDemo(tierKey);
    navigate('/');
  };

  const handleExit = () => {
    exitDemo();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f6f4 0%, #efe9e3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    }}>
      {/* Demo Mode Banner */}
      {isDemo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #f59e0b, #d97706)',
          color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}>
          DEMO MODE — {DEMO_TIERS[activeTier]?.name} Tier
          <button onClick={handleExit} style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 600,
          }}>
            Exit Demo
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: isDemo ? '40px' : 0 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '8px' }}>
          Labno Labs Center
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#6b6764', maxWidth: '500px' }}>
          Explore the platform with demo data. Choose a service tier to see what's included.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#a09d9a', marginTop: '8px' }}>
          All data shown is fictional. No real client information is displayed.
        </p>
      </div>

      {/* Tier Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1000px',
        width: '100%',
      }}>
        {Object.entries(DEMO_TIERS).map(([key, tier]) => {
          const TierIcon = TIER_ICONS[key];
          const isActive = activeTier === key;
          const isHovered = hoveredTier === key;
          const d = tier.data;

          return (
            <div
              key={key}
              onMouseEnter={() => setHoveredTier(key)}
              onMouseLeave={() => setHoveredTier(null)}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '28px',
                border: isActive ? `2px solid ${tier.color}` : '2px solid transparent',
                boxShadow: isHovered
                  ? '0 12px 40px rgba(0,0,0,0.12)'
                  : '0 4px 16px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Tier Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: `${tier.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <TierIcon size={22} color={tier.color} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2e2c2a', margin: 0 }}>
                    {tier.name}
                  </h2>
                  {isActive && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, color: tier.color,
                      background: `${tier.color}15`, padding: '2px 8px', borderRadius: '4px',
                    }}>
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.88rem', color: '#6b6764', margin: 0, lineHeight: 1.5 }}>
                {tier.description}
              </p>

              {/* Data Counts */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
                fontSize: '0.75rem', color: '#8a8682',
              }}>
                <span>{d.projects.length} projects</span>
                <span>{d.tasks.length} tasks</span>
                <span>{d.wishlist.length} wishlist items</span>
                <span>{d.leads.length} CRM leads</span>
                {d.proposals.length > 0 && <span>{d.proposals.length} proposals</span>}
                {d.soaps.length > 0 && <span>{d.soaps.length} SOAP notes</span>}
                {d.briefs.length > 0 && <span>{d.briefs.length} session briefs</span>}
              </div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.8rem', color: '#4a4745',
                  }}>
                    <Check size={14} color={tier.color} />
                    {f}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => isActive ? handleExit() : handleActivate(key)}
                style={{
                  marginTop: 'auto',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? '#f5f3f1' : tier.color,
                  color: isActive ? '#6b6764' : '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                {isActive ? (
                  <>
                    <LogOut size={16} />
                    Exit Demo
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Explore {tier.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '48px', textAlign: 'center',
        fontSize: '0.75rem', color: '#a09d9a',
      }}>
        <p>Demo mode uses localStorage only. No data is sent to any server.</p>
        {isDemo && (
          <button onClick={handleExit} style={{
            marginTop: '12px', padding: '8px 20px', borderRadius: '8px',
            border: '1px solid #d97706', background: 'transparent',
            color: '#d97706', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
          }}>
            <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Exit Demo Mode
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoMode;
