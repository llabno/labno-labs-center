import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Download, Upload, Eye, Grid, List, Tag, X } from 'lucide-react';

const TAG_OPTIONS = ['brand', 'icon', 'layout', 'motion', 'typography'];
const TAG_COLORS = {
  brand: { bg: 'rgba(209, 90, 69, 0.12)', color: '#d15a45' },
  icon: { bg: 'rgba(25, 118, 210, 0.12)', color: '#1976d2' },
  layout: { bg: 'rgba(156, 39, 176, 0.12)', color: '#9c27b0' },
  motion: { bg: 'rgba(255, 152, 0, 0.12)', color: '#ff9800' },
  typography: { bg: 'rgba(0, 150, 136, 0.12)', color: '#009688' },
};

// Gradient generators based on file type
const getTypeGradient = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const gradients = {
    png: 'linear-gradient(135deg, #667eea, #764ba2)',
    fig: 'linear-gradient(135deg, #f093fb, #f5576c)',
    zip: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    jpg: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    svg: 'linear-gradient(135deg, #fa709a, #fee140)',
    pdf: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  };
  return gradients[ext] || 'linear-gradient(135deg, #89f7fe, #66a6ff)';
};

const getTypeBadgeColor = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const colors = {
    png: '#764ba2',
    fig: '#f5576c',
    zip: '#00b4d8',
    jpg: '#38b000',
    svg: '#e07c24',
    pdf: '#a18cd1',
  };
  return colors[ext] || '#888';
};

const UILibrary = () => {
  const initialAssets = [
    { title: 'Placeholder_Hero_Image_01.png', project: 'Labno Labs Website V1', intent: 'Clean minimal vibe for tech consulting.', tags: ['Hero', 'Aesthetic'], tag1: 'brand', tag2: 'layout' },
    { title: 'Glassmorphism_Tile_Template.fig', project: 'Global Architecture', intent: 'Base node for all dashboard cards.', tags: ['Figma', 'UI Core'], tag1: 'layout', tag2: 'icon' },
    { title: 'Dark_Mode_Backgrounds.zip', project: 'Career OS', intent: 'Provide cinematic depth to the Interview Hub.', tags: ['Backgrounds', 'Assets'], tag1: 'motion', tag2: 'brand' },
  ];

  const [viewMode, setViewMode] = useState('grid');
  const [assets, setAssets] = useState(initialAssets);
  const [editingTag, setEditingTag] = useState(null); // { assetIdx, field }

  const updateTag = (assetIdx, field, value) => {
    setAssets(prev => {
      const updated = [...prev];
      updated[assetIdx] = { ...updated[assetIdx], [field]: value };
      return updated;
    });
    setEditingTag(null);
  };

  const renderTagBadge = (tag, assetIdx, field) => {
    const isEditing = editingTag && editingTag.assetIdx === assetIdx && editingTag.field === field;
    const tagStyle = TAG_COLORS[tag] || { bg: 'rgba(0,0,0,0.06)', color: '#666' };

    if (isEditing) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            autoFocus
            value={tag || ''}
            onChange={(e) => updateTag(assetIdx, field, e.target.value)}
            onBlur={() => setEditingTag(null)}
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">None</option>
            {TAG_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <span
        onClick={(e) => { e.stopPropagation(); setEditingTag({ assetIdx, field }); }}
        style={{
          fontSize: '0.65rem',
          padding: '2px 8px',
          borderRadius: '10px',
          background: tagStyle.bg,
          color: tagStyle.color,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
        title="Click to edit tag"
      >
        {tag || 'set tag'}
      </span>
    );
  };

  // Grid View - Tile Cards
  const renderGridView = () => (
    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
      {assets.map((file, idx) => (
        <div
          key={idx}
          className="glass-panel"
          style={{
            overflow: 'hidden',
            background: '#fff',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {/* Thumbnail Placeholder */}
          <div style={{
            height: '130px',
            background: getTypeGradient(file.title),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <ImageIcon size={36} color="rgba(255,255,255,0.6)" />
            {/* File type badge */}
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              fontSize: '0.6rem',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
            }}>
              {file.title.split('.').pop()}
            </span>
          </div>

          {/* Card Content */}
          <div style={{ padding: '0.8rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#222', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {file.title}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '8px' }}>{file.project}</div>

            {/* Original tags */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
              {file.tags.map(t => (
                <span key={t} style={{ background: '#f0f0f0', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>{t}</span>
              ))}
            </div>

            {/* Meta tags */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {renderTagBadge(file.tag1, idx, 'tag1')}
              {renderTagBadge(file.tag2, idx, 'tag2')}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.05)', padding: '0.5rem 0.8rem', gap: '8px' }}>
            <button onClick={() => alert("Previewing asset")} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#666', padding: '4px' }}>
              <Eye size={13} /> View
            </button>
            <button onClick={() => alert("Downloading asset")} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#1976d2', fontWeight: 600, padding: '4px', marginLeft: 'auto' }}>
              <Download size={13} /> Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // List View - Table
  const renderListView = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>File Name</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Associated Project</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>UX Ideation / Suggestion</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Meta Tags</th>
          <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((file, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
            <td style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#222', fontWeight: 500 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: getTypeGradient(file.title),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ImageIcon size={14} color="rgba(255,255,255,0.8)" />
                </div>
                {file.title}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', marginLeft: '42px' }}>
                {file.tags.map(t => <span key={t} style={{ background: '#eee', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>{t}</span>)}
              </div>
            </td>
            <td style={{ padding: '1rem', color: '#555', fontSize: '0.9rem' }}>{file.project}</td>
            <td style={{ padding: '1rem', color: '#666', fontSize: '0.85rem', maxWidth: '300px' }}>{file.intent}</td>
            <td style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {renderTagBadge(file.tag1, idx, 'tag1')}
                {renderTagBadge(file.tag2, idx, 'tag2')}
              </div>
            </td>
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
  );

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

        {/* Toolbar with View Toggle */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View Toggle - Segmented Pill */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '20px',
            padding: '3px',
            marginRight: '8px',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 14px',
                borderRadius: '17px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
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
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 14px',
                borderRadius: '17px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: viewMode === 'list' ? '#fff' : 'transparent',
                color: viewMode === 'list' ? '#d15a45' : '#888',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <List size={14} /> List
            </button>
          </div>

          <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option>Sort by: Newest</option>
            <option>Sort by: A-Z</option>
            <option>Sort by: Project</option>
          </select>
          <input type="text" placeholder="Search intent or tags..." style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', flex: 1, maxWidth: '300px' }} />
        </div>

        {/* Conditional View Rendering */}
        {viewMode === 'grid' ? renderGridView() : renderListView()}
      </div>
    </div>
  );
};

export default UILibrary;
