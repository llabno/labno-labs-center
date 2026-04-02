import { useState, useEffect } from 'react';
import { Layers, Grid, List, X, Code, Star, ExternalLink, Copy } from 'lucide-react';

const DESIGN_TO_CODE_URL = 'https://design-to-code-app.vercel.app';

const VENTURE_COLORS = {
  'Labno Labs': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Movement Solutions': { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  'Slowbraid': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  'Shared': { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
};

const TYPE_COLORS = {
  page: '#3b82f6', section: '#8b5cf6', card: '#f59e0b', form: '#10b981',
  nav: '#ec4899', modal: '#6366f1', widget: '#14b8a6', layout: '#f97316', other: '#6b7280',
};

const UILibrary = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVenture, setFilterVenture] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showCode, setShowCode] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = searchQuery
        ? `${DESIGN_TO_CODE_URL}/api/library?q=${encodeURIComponent(searchQuery)}`
        : `${DESIGN_TO_CODE_URL}/api/library`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchAssets, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const getScreenshotSrc = (asset) => asset.screenshotBase64 || asset.screenshotPath || null;

  const filtered = assets.filter(a => {
    if (filterVenture !== 'all' && a.metadata?.venture !== filterVenture) return false;
    if (filterType !== 'all' && a.metadata?.componentType !== filterType) return false;
    return true;
  });

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  // Grid View
  const renderGridView = () => (
    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
      {filtered.map((asset) => {
        const screenshot = getScreenshotSrc(asset);
        const ventureStyle = VENTURE_COLORS[asset.metadata?.venture] || VENTURE_COLORS.Shared;
        const typeColor = TYPE_COLORS[asset.metadata?.componentType] || TYPE_COLORS.other;

        return (
          <div
            key={asset.id}
            className="glass-panel"
            style={{
              overflow: 'hidden',
              background: '#fff',
              transition: 'all 0.2s',
              cursor: 'pointer',
              border: selectedAsset?.id === asset.id ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.06)',
            }}
            onClick={() => { setSelectedAsset(asset); setShowCode(false); }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Thumbnail */}
            <div style={{
              height: '150px',
              background: screenshot ? '#000' : 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {screenshot ? (
                <img src={screenshot} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              ) : (
                <Code size={36} color="rgba(255,255,255,0.5)" />
              )}
              {/* Type badge */}
              <span style={{
                position: 'absolute', top: 8, right: 8,
                background: typeColor, color: '#fff',
                fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px',
                fontWeight: 700, textTransform: 'uppercase',
              }}>
                {asset.metadata?.componentType || 'component'}
              </span>
              {asset.favorited && (
                <Star size={14} fill="#facc15" color="#facc15" style={{ position: 'absolute', top: 8, left: 8 }} />
              )}
            </div>

            {/* Card Content */}
            <div style={{ padding: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#222', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.description}
              </div>

              {/* Venture badge */}
              <span style={{
                fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px',
                background: ventureStyle.bg, color: ventureStyle.color,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
                display: 'inline-block', marginBottom: 6,
              }}>
                {asset.metadata?.venture}
              </span>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(asset.metadata?.tags || []).slice(0, 4).map(t => (
                  <span key={t} style={{ background: '#f0f0f0', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>{t}</span>
                ))}
                {(asset.metadata?.tags?.length || 0) > 4 && (
                  <span style={{ background: '#f0f0f0', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>+{asset.metadata.tags.length - 4}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.65rem', color: '#aaa' }}>
                <span>{asset.metadata?.responsive ? 'Responsive' : 'Fixed'}</span>
                <span>·</span>
                <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>{(asset.oracle?.generationTimeMs / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.05)', padding: '0.5rem 0.8rem', gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); setShowCode(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: '#666', padding: 4 }}
              >
                <Code size={13} /> Code
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); copyCode(asset.componentCode); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: '#1976d2', fontWeight: 600, padding: 4, marginLeft: 'auto' }}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // List View
  const renderListView = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Component</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Venture</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Type</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Tags</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Generated</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((asset) => {
          const screenshot = getScreenshotSrc(asset);
          const ventureStyle = VENTURE_COLORS[asset.metadata?.venture] || VENTURE_COLORS.Shared;
          return (
            <tr key={asset.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }} onClick={() => { setSelectedAsset(asset); setShowCode(false); }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    background: screenshot ? '#000' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {screenshot ? (
                      <img src={screenshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Code size={16} color="rgba(255,255,255,0.6)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#222' }}>{asset.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>{asset.description}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: ventureStyle.bg, color: ventureStyle.color, fontWeight: 600 }}>
                  {asset.metadata?.venture}
                </span>
              </td>
              <td style={{ padding: '1rem', textTransform: 'capitalize', fontSize: '0.85rem', color: '#555' }}>{asset.metadata?.componentType}</td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(asset.metadata?.tags || []).slice(0, 3).map(t => (
                    <span key={t} style={{ background: '#f0f0f0', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, color: '#666' }}>{t}</span>
                  ))}
                </div>
              </td>
              <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#888' }}>{new Date(asset.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '1rem' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); copyCode(asset.componentCode); }}
                  style={{ background: 'none', border: '1px solid #ccc', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                >
                  <Copy size={13} /> Copy Code
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Detail slide-out panel
  const renderDetailPanel = () => {
    if (!selectedAsset) return null;
    const screenshot = getScreenshotSrc(selectedAsset);
    const ventureStyle = VENTURE_COLORS[selectedAsset.metadata?.venture] || VENTURE_COLORS.Shared;

    return (
      <div style={{
        position: 'fixed', top: 0, right: 0, width: '520px', height: '100vh',
        background: '#fff', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#222' }}>{selectedAsset.name}</h3>
          <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#666" />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Screenshot */}
          {screenshot && !showCode && (
            <div style={{ background: '#111', padding: 0 }}>
              <img src={screenshot} alt={selectedAsset.name} style={{ width: '100%', maxHeight: 280, objectFit: 'contain' }} />
            </div>
          )}

          {/* Code view */}
          {showCode && (
            <div style={{ background: '#1e1e2e', padding: '1rem', maxHeight: 350, overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '0.72rem', color: '#cdd6f4', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {selectedAsset.componentCode}
              </pre>
            </div>
          )}

          {/* Toggle */}
          <div style={{ display: 'flex', gap: 4, padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee' }}>
            <button
              onClick={() => setShowCode(false)}
              style={{
                padding: '4px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
                background: !showCode ? '#222' : '#f0f0f0', color: !showCode ? '#fff' : '#666',
              }}
            >
              Preview
            </button>
            <button
              onClick={() => setShowCode(true)}
              style={{
                padding: '4px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
                background: showCode ? '#222' : '#f0f0f0', color: showCode ? '#fff' : '#666',
              }}
            >
              Code
            </button>
            <button
              onClick={() => copyCode(selectedAsset.componentCode)}
              style={{
                marginLeft: 'auto', padding: '4px 14px', borderRadius: 14, border: '1px solid #ccc',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: '#fff', color: '#1976d2',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Copy size={12} /> Copy
            </button>
          </div>

          {/* Metadata */}
          <div style={{ padding: '1rem 1.5rem' }}>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>{selectedAsset.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem' }}>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Venture</div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: ventureStyle.bg, color: ventureStyle.color, fontWeight: 600 }}>
                  {selectedAsset.metadata?.venture}
                </span>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Type</div>
                <div style={{ color: '#333', textTransform: 'capitalize' }}>{selectedAsset.metadata?.componentType}</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Category</div>
                <div style={{ color: '#333' }}>{selectedAsset.metadata?.category}</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Version</div>
                <div style={{ color: '#333' }}>v{selectedAsset.version}</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Model</div>
                <div style={{ color: '#333' }}>{selectedAsset.oracle?.model}</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Gen Time</div>
                <div style={{ color: '#333' }}>{(selectedAsset.oracle?.generationTimeMs / 1000).toFixed(1)}s</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Responsive</div>
                <div style={{ color: '#333' }}>{selectedAsset.metadata?.responsive ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 2 }}>Interactive</div>
                <div style={{ color: '#333' }}>{selectedAsset.metadata?.hasInteractivity ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {/* Design Tokens */}
            {selectedAsset.metadata?.designTokensUsed?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 6 }}>Design Tokens</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedAsset.metadata.designTokensUsed.map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 6 }}>Tags</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(selectedAsset.metadata?.tags || []).map(t => (
                  <span key={t} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: '#f0f0f0', color: '#555' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Dependencies */}
            {selectedAsset.metadata?.dependencies?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 6 }}>Dependencies</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedAsset.metadata.dependencies.map(d => (
                    <span key={d} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(168,85,247,0.1)', color: '#a855f7', fontWeight: 600 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: '0.7rem', color: '#bbb' }}>
              Created {new Date(selectedAsset.createdAt).toLocaleString()} · Updated {new Date(selectedAsset.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Layers color="#d15a45" /> UI Library & Generated Assets
          </h1>
          <p style={{ color: '#555' }}>Components generated by the Visual to Code Engine. Browse, search, copy code.</p>
        </div>

        <a
          href={DESIGN_TO_CODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
        >
          <ExternalLink size={16} /> Open Screenshot to Code
        </a>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', flex: 1, background: 'rgba(255,255,255,0.7)' }}>

        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: 20, padding: 3, marginRight: 8 }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 17, border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === 'grid' ? '#fff' : 'transparent',
                color: viewMode === 'grid' ? '#d15a45' : '#888',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Grid size={14} /> Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 17, border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === 'list' ? '#fff' : 'transparent',
                color: viewMode === 'list' ? '#d15a45' : '#888',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <List size={14} /> List
            </button>
          </div>

          {/* Venture filter */}
          <select
            value={filterVenture}
            onChange={(e) => setFilterVenture(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.8rem' }}
          >
            <option value="all">All Ventures</option>
            <option value="Labno Labs">Labno Labs</option>
            <option value="Movement Solutions">Movement Solutions</option>
            <option value="Slowbraid">Slowbraid</option>
            <option value="Shared">Shared</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.8rem' }}
          >
            <option value="all">All Types</option>
            <option value="page">Page</option>
            <option value="section">Section</option>
            <option value="card">Card</option>
            <option value="form">Form</option>
            <option value="nav">Navigation</option>
            <option value="modal">Modal</option>
            <option value="widget">Widget</option>
            <option value="layout">Layout</option>
            <option value="other">Other</option>
          </select>

          <div style={{ marginLeft: 'auto' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', width: 240, fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#999' }}>Loading library from Screenshot to Code engine...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#d32f2f', marginBottom: 8 }}>Failed to load: {error}</p>
            <button onClick={fetchAssets} style={{ color: '#1976d2', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#999', fontSize: '1.1rem', marginBottom: 8 }}>
              {assets.length === 0 ? 'No components in library yet' : 'No components match your filters'}
            </p>
            <p style={{ color: '#bbb', fontSize: '0.85rem' }}>
              {assets.length === 0 ? (
                <>Generate your first component at <a href={DESIGN_TO_CODE_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>Screenshot to Code</a> and save it to the library.</>
              ) : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
      </div>

      {/* Detail Panel Overlay */}
      {selectedAsset && (
        <>
          <div
            onClick={() => setSelectedAsset(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          />
          {renderDetailPanel()}
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default UILibrary;
