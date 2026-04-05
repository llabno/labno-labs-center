import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEMO_TIERS } from '../lib/demo-data';
import { useDemo } from '../lib/useDemo';
import { Play, LogOut, Check, Sparkles, Users, Stethoscope, Link2, Copy, Palette, Building2, Image } from 'lucide-react';

const TIER_ICONS = {
  'project-track': Sparkles,
  'build': Users,
  'build-plus': Stethoscope,
};

const DemoMode = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemo, tier: activeTier, activateDemo, exitDemo } = useDemo();
  const [hoveredTier, setHoveredTier] = useState(null);
  const [linkCopied, setLinkCopied] = useState(null);

  // Auto-activate tier from query param (e.g. /demo?tier=build-plus)
  useEffect(() => {
    const tierParam = searchParams.get('tier');
    if (tierParam && DEMO_TIERS[tierParam]) {
      activateDemo(tierParam);
      navigate('/');
    }
  }, [searchParams, activateDemo, navigate]);

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

      {/* Share Demo Link */}
      <div style={{
        marginTop: '48px', maxWidth: '1000px', width: '100%',
        background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
        borderRadius: '16px', padding: '28px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2e2c2a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={18} color="#d97706" />
          Share This Demo
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#6b6764', margin: '0 0 16px 0' }}>
          Send a link that auto-activates a specific tier for prospective clients.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(DEMO_TIERS).map(([key, tier]) => {
            const shareUrl = `${window.location.origin}/demo?tier=${key}`;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#fff', borderRadius: '10px', padding: '10px 16px',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: tier.color, minWidth: '120px' }}>
                  {tier.name}
                </span>
                <code style={{
                  flex: 1, fontSize: '0.72rem', color: '#8a8682',
                  background: '#f8f6f4', padding: '6px 10px', borderRadius: '6px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {shareUrl}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setLinkCopied(key);
                    setTimeout(() => setLinkCopied(null), 2000);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    background: linkCopied === key ? '#16a34a' : '#f59e0b',
                    color: '#fff', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                  }}
                >
                  <Copy size={12} />
                  {linkCopied === key ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* White Label Preview */}
      <div style={{
        marginTop: '24px', maxWidth: '1000px', width: '100%',
        background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
        borderRadius: '16px', padding: '28px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2e2c2a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={18} color="#8b5cf6" />
          White Label Preview
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#6b6764', margin: '0 0 20px 0' }}>
          See how this platform looks with your branding. Coming soon — contact{' '}
          <a href="mailto:lance@labnolabs.com" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>
            lance@labnolabs.com
          </a>
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
        }}>
          {/* Company Name */}
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center',
          }}>
            <Building2 size={24} color="#a09d9a" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '4px' }}>
              Company Name
            </div>
            <div style={{
              fontSize: '0.75rem', color: '#a09d9a', fontStyle: 'italic',
            }}>
              Your Company Here
            </div>
          </div>
          {/* Accent Color */}
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center',
          }}>
            <Palette size={24} color="#a09d9a" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '4px' }}>
              Accent Color
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
              {['#f59e0b', '#8b5cf6', '#1565c0', '#16a34a', '#e11d48'].map(c => (
                <div key={c} style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: c,
                  border: '2px solid rgba(0,0,0,0.08)',
                }} />
              ))}
            </div>
          </div>
          {/* Logo */}
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center',
          }}>
            <Image size={24} color="#a09d9a" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '4px' }}>
              Logo
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '10px', margin: '4px auto 0',
              background: '#f5f3f1', border: '2px dashed #d0ccc8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', color: '#a09d9a',
            }}>
              +
            </div>
          </div>
        </div>
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
