import React from 'react';
import { Layers, Image as ImageIcon, Download, Upload, Eye } from 'lucide-react';

const UILibrary = () => {

  const assets = [
    { title: 'Placeholder_Hero_Image_01.png', project: 'Labno Labs Website V1', intent: 'Clean minimal vibe for tech consulting.', tags: ['Hero', 'Aesthetic'] },
    { title: 'Glassmorphism_Tile_Template.fig', project: 'Global Architecture', intent: 'Base node for all dashboard cards.', tags: ['Figma', 'UI Core'] },
    { title: 'Dark_Mode_Backgrounds.zip', project: 'Career OS', intent: 'Provide cinematic depth to the Interview Hub.', tags: ['Backgrounds', 'Assets'] },
  ];

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Layers color="#d15a45" /> Global UI Library & Assets
          </h1>
          <p style={{ color: '#555' }}>Expert-level Digital Asset Management. Tag UX intent, ideation, and project mapping for all uploads.</p>
        </div>
        
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => alert("Simulated: Open 'Upload Asset' Modal with Metadata tagging fields.")}
        >
          <Upload size={16} /> Upload & Tag New Asset
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', flex: 1, background: 'rgba(255,255,255,0.7)' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '10px' }}>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option>Sort by: Newest</option>
            <option>Sort by: A-Z</option>
            <option>Sort by: Project</option>
          </select>
          <input type="text" placeholder="Search intent or tags..." style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', flex: 1, maxWidth: '300px' }} />
        </div>

        {/* Data Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>File Name</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Associated Project</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>UX Ideation / Suggestion</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((file, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#222', fontWeight: 500 }}>
                    <ImageIcon size={18} color="#888" /> {file.title}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {file.tags.map(t => <span key={t} style={{ background: '#eee', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>{t}</span>)}
                  </div>
                </td>
                <td style={{ padding: '1rem', color: '#555', fontSize: '0.9rem' }}>{file.project}</td>
                <td style={{ padding: '1rem', color: '#666', fontSize: '0.85rem', maxWidth: '300px' }}>{file.intent}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => alert("Previewing asset")} style={{ background: 'none', border: '1px solid #ccc', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => alert("Downloading asset")} style={{ background: 'transparent', border: 'none', color: '#1976d2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Download size={16} /> Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UILibrary;
