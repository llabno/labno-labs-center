import React from 'react';
import { Layers, Image as ImageIcon, Download, Upload, Paintbrush } from 'lucide-react';

const UILibrary = () => {
  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Layers color="#d15a45" /> Global UI Library & Assets
          </h1>
          <p style={{ color: '#555' }}>Centralized Apple Glass tokens, core SVG assets, and design downloads for Romy & Avery.</p>
        </div>
        
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Upload size={16} /> Upload New Asset
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
        {/* Left Column: UI Tokens */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#333', fontWeight: 600 }}>Design Tokens & CSS Vars</h3>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Paintbrush size={18} color="#f06292" />
                <span style={{ fontWeight: 500, color: '#333' }}>Primary Glass Gradient (Salmon)</span>
              </div>
              <button style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Copy Var</button>
            </div>
            <div style={{ width: '100%', height: '40px', borderRadius: '8px', background: 'rgba(255, 120, 100, 0.4)' }}></div>
            
            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)', margin: '1.5rem 0' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Paintbrush size={18} color="#8d6e63" />
                <span style={{ fontWeight: 500, color: '#333' }}>Secondary Glass Gradient (Earth)</span>
              </div>
              <button style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Copy Var</button>
            </div>
            <div style={{ width: '100%', height: '40px', borderRadius: '8px', background: 'rgba(220, 190, 160, 0.6)' }}></div>
          </div>
        </div>

        {/* Right Column: Asset Downloads */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#333', fontWeight: 600 }}>Asset Repository</h3>
          
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            {['Labno_Labs_Vector_Logo.svg', 'Glassmorphism_Tile_Template.fig', 'Dark_Mode_Backgrounds.zip', 'Placeholder_Hero_Image_01.png'].map((file, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1.25rem 1.5rem', 
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                transition: 'background 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ImageIcon size={20} color="#777" />
                  <span style={{ fontWeight: 500, color: '#333', fontSize: '0.95rem' }}>{file}</span>
                </div>
                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Download size={16} /> Download
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#777', marginTop: '-0.5rem', textAlign: 'right' }}>
            * Assets sync directly to cloud storage overnight.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UILibrary;
