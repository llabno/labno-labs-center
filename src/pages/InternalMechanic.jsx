import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit3, Save, X, Heart, Shield, Flame, Sun, Users, FileText, Eye, ChevronRight, ChevronDown, Zap, Brain, RefreshCw, Send, Activity, User, Loader, CheckCircle, AlertTriangle, BookOpen, UserPlus, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ============================================
// Constants
// ============================================
const ROLE_CONFIG = {
  protector: { label: 'Protector (Manager)', icon: <Shield size={16} />, color: '#5c7a6f' },
  exile: { label: 'Exile', icon: <Heart size={16} />, color: '#b06050' },
  firefighter: { label: 'Firefighter', icon: <Flame size={16} />, color: '#d4843e' },
  self: { label: 'Self Energy', icon: <Sun size={16} />, color: '#c4a55a' },
};

const NS_STATES = {
  ventral_vagal: { label: 'Ventral Vagal (Safe/Social)', color: '#4caf50' },
  sympathetic: { label: 'Sympathetic (Fight/Flight)', color: '#ff9800' },
  dorsal_vagal: { label: 'Dorsal Vagal (Freeze/Shutdown)', color: '#9e9e9e' },
};

const UNBURDENING_STEPS = [
  { id: 'check_readiness', label: 'Check Readiness', prompt: 'Ask the part: "Are you willing to explore releasing what you\'ve been carrying?" Notice what comes up — resistance is welcome here.' },
  { id: 'listen', label: 'Listen to the Part', prompt: 'Let the part tell its story. What happened? What does it want you to know? Stay present with Self energy. Don\'t fix — just witness.' },
  { id: 'do_over', label: 'Offer a Do-Over', prompt: 'Ask the part: "What did you need back then that you didn\'t get?" Imagine providing that now — safety, protection, being seen, being held.' },
  { id: 'release', label: 'Visualize Release', prompt: 'Invite the part to release its burden. How does it want to let go? Fire, water, wind, earth, light? Watch the burden leave the body.' },
  { id: 'new_qualities', label: 'Invite New Qualities', prompt: 'Now that space has opened, what does this part want to fill it with? Confidence, playfulness, peace, trust? Let it choose.' },
  { id: 'integrate', label: 'Integrate & Close', prompt: 'Welcome this part back into the system. Thank it for its courage. Notice how the body feels different. Check in with other parts — how do they respond to this shift?' },
];

const TABS = [
  { id: 'journal', label: 'Journal', icon: <BookOpen size={18} /> },
  { id: 'log', label: 'New Log', icon: <Send size={18} /> },
  { id: 'analysis', label: 'Analysis', icon: <Activity size={18} /> },
  { id: 'entities', label: 'Entities', icon: <User size={18} /> },
  { id: 'parts', label: 'Parts Registry', icon: <Brain size={18} /> },
  { id: 'board', label: 'Visual Board', icon: <Eye size={18} /> },
  { id: 'contracts', label: 'Conscious Contracts', icon: <FileText size={18} /> },
  { id: 'unburdening', label: 'Unburdening', icon: <RefreshCw size={18} /> },
  { id: 'relationships', label: 'Relationships', icon: <Users size={18} /> },
];

const DEFAULT_RELATIONSHIP_TYPES = [
  'parent', 'partner', 'sibling', 'child', 'friend', 'colleague',
  'authority', 'client', 'therapist', 'mentor', 'self', 'other',
];

const MODULE_NAMES = {
  m9: 'Polyvagal (NS State)',
  m16: 'IFS (Parts)',
  m18: 'Compassionate Inquiry',
  m19: 'Panksepp (Drives)',
  m21: 'Winnicott (Holding)',
  m22: 'Epstein (Ethics Gate)',
  m23: 'Integral (AQAL)',
  m20: 'Spiral Dynamics',
  m25: 'Watts (Wu Wei)',
};

const MODULE_SEQUENCE = ['m9', 'm16', 'm18', 'm19', 'm21', 'm22', 'm23', 'm20', 'm25'];

const SOMATIC_STATES = [
  { id: 'green', label: 'GREEN — open, connected, curious', color: '#4caf50' },
  { id: 'amber', label: 'AMBER — guarded, cautious, contracted', color: '#ff9800' },
  { id: 'red', label: 'RED — activated, reactive, overwhelmed', color: '#d32f2f' },
];

const AFFECTIVE_DRIVES = [
  { id: 'seeking', label: 'SEEKING — forward motion, wanting, striving' },
  { id: 'rage', label: 'RAGE — boundary violation, injustice, thwarted' },
  { id: 'fear', label: 'FEAR — threat detected, retreat, vigilance' },
  { id: 'panic_grief', label: 'PANIC-GRIEF — separation, loss, abandonment' },
  { id: 'care', label: 'CARE — nurturing, wanting to protect, tending' },
  { id: 'play', label: 'PLAY — connection, lightness, creativity' },
];

// ============================================
// Styles (inline, matching glass aesthetic)
// ============================================
const s = {
  page: { padding: '30px', maxHeight: '100vh', overflowY: 'auto' },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#3a3836', marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#888', fontStyle: 'italic' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: (active) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
    borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    background: active ? 'rgba(176, 96, 80, 0.15)' : 'rgba(255,255,255,0.2)',
    border: active ? '1px solid rgba(176, 96, 80, 0.3)' : '1px solid rgba(255,255,255,0.3)',
    color: active ? '#b06050' : '#666', transition: 'all 0.2s ease',
  }),
  card: {
    background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.45)', borderRadius: '16px',
    padding: '20px', marginBottom: '16px', transition: 'all 0.2s ease',
  },
  cardHover: { boxShadow: '0 8px 32px rgba(120,115,110,0.15)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  btn: (variant = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
    background: variant === 'primary' ? '#b06050' : variant === 'danger' ? '#d32f2f' : 'rgba(255,255,255,0.4)',
    color: variant === 'ghost' ? '#666' : '#fff', transition: 'all 0.2s ease',
  }),
  input: {
    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)',
    outline: 'none', transition: 'border 0.2s ease',
  },
  select: {
    padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)',
    outline: 'none', cursor: 'pointer',
  },
  textarea: {
    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)',
    outline: 'none', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit',
  },
  label: { fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
    borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    background: `${color}18`, color: color, border: `1px solid ${color}30`,
  }),
  row: { display: 'flex', gap: '12px', marginBottom: '12px' },
  col: { flex: 1 },
  tagInput: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' },
  tag: (color = '#b06050') => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px',
    borderRadius: '20px', fontSize: '11px', background: `${color}15`, color: color,
    border: `1px solid ${color}25`, cursor: 'pointer',
  }),
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999' },
};

// ============================================
// Tag Input Component
// ============================================
const TagInput = ({ tags = [], onChange, placeholder = 'Type and press Enter', color = '#b06050' }) => {
  const [input, setInput] = useState('');
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onChange([...tags, input.trim()]);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <div>
      <div style={s.tagInput}>
        {tags.map((tag, i) => (
          <span key={i} style={s.tag(color)} onClick={() => onChange(tags.filter((_, j) => j !== i))}>
            {tag} <X size={10} />
          </span>
        ))}
      </div>
      <input style={{ ...s.input, marginTop: '6px' }} value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown} placeholder={placeholder} />
    </div>
  );
};

// ============================================
// Parts Registry Tab
// ============================================
const PartsRegistry = ({ parts, setParts, fetchParts, userId }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState({});

  const blankPart = {
    name: '', role: 'protector', description: '', triggers: [], beliefs: [],
    body_location: '', emotions: [], age_origin: '', burdens: [],
    protects_part_id: null, ns_state: 'ventral_vagal', color: '#b06050', notes: '',
  };

  const startNew = () => { setForm(blankPart); setEditing('new'); };
  const startEdit = (part) => { setForm({ ...part }); setEditing(part.id); };
  const cancel = () => { setEditing(null); setForm({}); };

  const savePart = async () => {
    const payload = { ...form, user_id: userId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (editing === 'new') {
      await supabase.from('ifs_parts').insert(payload);
    } else {
      await supabase.from('ifs_parts').update(payload).eq('id', editing);
    }
    cancel();
    fetchParts();
  };

  const deletePart = async (id) => {
    if (!confirm('Delete this part? This cannot be undone.')) return;
    await supabase.from('ifs_parts').delete().eq('id', id);
    fetchParts();
  };

  const exiles = parts.filter(p => p.role === 'exile');

  if (editing) {
    return (
      <div style={s.card}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editing === 'new' ? 'Add New Part' : `Edit: ${form.name}`}</h3>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Part Name</label>
            <input style={s.input} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., The Perfectionist" />
          </div>
          <div style={s.col}>
            <label style={s.label}>Role</label>
            <select style={{ ...s.select, width: '100%' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>NS State (Polyvagal)</label>
            <select style={{ ...s.select, width: '100%' }} value={form.ns_state || ''} onChange={e => setForm({ ...form, ns_state: e.target.value })}>
              <option value="">Unknown</option>
              {Object.entries(NS_STATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={s.col}>
            <label style={s.label}>Age / Era of Origin</label>
            <input style={s.input} value={form.age_origin || ''} onChange={e => setForm({ ...form, age_origin: e.target.value })} placeholder="e.g., Age 7, childhood" />
          </div>
        </div>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Body Location (Somatic)</label>
            <input style={s.input} value={form.body_location || ''} onChange={e => setForm({ ...form, body_location: e.target.value })} placeholder="e.g., Chest tightness, throat" />
          </div>
          <div style={s.col}>
            <label style={s.label}>Node Color</label>
            <input type="color" value={form.color || '#b06050'} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '60px', height: '38px', border: 'none', cursor: 'pointer', borderRadius: '8px' }} />
          </div>
        </div>
        {(form.role === 'protector' || form.role === 'firefighter') && (
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Protects Which Exile?</label>
            <select style={{ ...s.select, width: '100%' }} value={form.protects_part_id || ''} onChange={e => setForm({ ...form, protects_part_id: e.target.value || null })}>
              <option value="">None / Unknown</option>
              {exiles.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this part do? How does it show up?" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Triggers</label>
          <TagInput tags={form.triggers || []} onChange={t => setForm({ ...form, triggers: t })} placeholder="What activates this part?" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Core Beliefs</label>
          <TagInput tags={form.beliefs || []} onChange={t => setForm({ ...form, beliefs: t })} placeholder="e.g., I'm not good enough" color="#8b5e3c" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Emotions Carried</label>
          <TagInput tags={form.emotions || []} onChange={t => setForm({ ...form, emotions: t })} placeholder="e.g., shame, fear, anger" color="#6b5b8a" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Burdens</label>
          <TagInput tags={form.burdens || []} onChange={t => setForm({ ...form, burdens: t })} placeholder="What is this part carrying?" color="#d32f2f" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Notes</label>
          <textarea style={s.textarea} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Session notes, observations..." />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button style={s.btn('ghost')} onClick={cancel}><X size={14} /> Cancel</button>
          <button style={s.btn('primary')} onClick={savePart} disabled={!form.name?.trim()}><Save size={14} /> Save Part</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '14px', color: '#888' }}>{parts.length} parts mapped</span>
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
            const count = parts.filter(p => p.role === role).length;
            return count > 0 ? <span key={role} style={{ ...s.badge(cfg.color), marginLeft: '8px' }}>{cfg.icon} {count}</span> : null;
          })}
        </div>
        <button style={s.btn('primary')} onClick={startNew}><Plus size={14} /> Add Part</button>
      </div>
      {parts.length === 0 ? (
        <div style={s.emptyState}>
          <Brain size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No parts mapped yet</p>
          <p style={{ fontSize: '13px' }}>Start by adding your first internal part — a protector, exile, or firefighter.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {parts.map(part => {
            const cfg = ROLE_CONFIG[part.role] || ROLE_CONFIG.protector;
            const ns = NS_STATES[part.ns_state];
            const isExpanded = expanded[part.id];
            const protectedExile = part.protects_part_id ? parts.find(p => p.id === part.protects_part_id) : null;
            return (
              <div key={part.id} style={{ ...s.card, borderLeft: `4px solid ${part.color || cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={s.badge(cfg.color)}>{cfg.icon} {cfg.label}</span>
                      {ns && <span style={s.badge(ns.color)}>{ns.label.split(' (')[0]}</span>}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{part.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={s.btn('ghost')} onClick={() => startEdit(part)}><Edit3 size={13} /></button>
                    <button style={s.btn('ghost')} onClick={() => deletePart(part.id)}><Trash2 size={13} style={{ color: '#d32f2f' }} /></button>
                  </div>
                </div>
                {part.description && <p style={{ fontSize: '13px', color: '#666', margin: '8px 0' }}>{part.description}</p>}
                {protectedExile && (
                  <p style={{ fontSize: '12px', color: '#b06050', margin: '4px 0' }}>
                    <Shield size={12} /> Protects: <strong>{protectedExile.name}</strong>
                  </p>
                )}
                {part.body_location && <p style={{ fontSize: '12px', color: '#888', margin: '4px 0' }}>Body: {part.body_location}</p>}
                {part.age_origin && <p style={{ fontSize: '12px', color: '#888', margin: '4px 0' }}>Origin: {part.age_origin}</p>}
                <div style={{ cursor: 'pointer', fontSize: '12px', color: '#aaa', marginTop: '8px' }}
                  onClick={() => setExpanded({ ...expanded, [part.id]: !isExpanded })}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {isExpanded ? 'Less' : 'More'}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
                    {part.triggers?.length > 0 && <div style={{ marginBottom: '8px' }}><label style={s.label}>Triggers</label><div style={s.tagInput}>{part.triggers.map((t, i) => <span key={i} style={s.tag()}>{t}</span>)}</div></div>}
                    {part.beliefs?.length > 0 && <div style={{ marginBottom: '8px' }}><label style={s.label}>Beliefs</label><div style={s.tagInput}>{part.beliefs.map((b, i) => <span key={i} style={s.tag('#8b5e3c')}>{b}</span>)}</div></div>}
                    {part.emotions?.length > 0 && <div style={{ marginBottom: '8px' }}><label style={s.label}>Emotions</label><div style={s.tagInput}>{part.emotions.map((e, i) => <span key={i} style={s.tag('#6b5b8a')}>{e}</span>)}</div></div>}
                    {part.burdens?.length > 0 && <div style={{ marginBottom: '8px' }}><label style={s.label}>Burdens</label><div style={s.tagInput}>{part.burdens.map((b, i) => <span key={i} style={s.tag('#d32f2f')}>{b}</span>)}</div></div>}
                    {part.notes && <div><label style={s.label}>Notes</label><p style={{ fontSize: '13px', color: '#666' }}>{part.notes}</p></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// Visual Board Tab (SVG-based parts map)
// ============================================
const VisualBoard = ({ parts, relationships, fetchParts, fetchRelationships }) => {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  useEffect(() => {
    const updateDims = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth - 40,
          height: Math.max(500, window.innerHeight - 280),
        });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Auto-layout parts in a circle if no positions set
  useEffect(() => {
    const needsLayout = parts.filter(p => p.board_x === 0 && p.board_y === 0);
    if (needsLayout.length > 0 && parts.length > 0) {
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      const radius = Math.min(cx, cy) * 0.6;
      const updates = parts.map((p, i) => {
        if (p.board_x !== 0 || p.board_y !== 0) return null;
        const angle = (2 * Math.PI * i) / parts.length - Math.PI / 2;
        return { id: p.id, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
      }).filter(Boolean);
      updates.forEach(async (u) => {
        await supabase.from('ifs_parts').update({ board_x: u.x, board_y: u.y }).eq('id', u.id);
      });
      if (updates.length) fetchParts();
    }
  }, [parts.length, dimensions]);

  const handleMouseDown = (e, id, type = 'part') => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const item = type === 'part' ? parts.find(p => p.id === id) : relationships.find(r => r.id === id);
    setDragOffset({ x: svgP.x - (item?.board_x || 0), y: svgP.y - (item?.board_y || 0) });
    setDragging({ id, type });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const newX = svgP.x - dragOffset.x;
    const newY = svgP.y - dragOffset.y;
    const table = dragging.type === 'part' ? 'ifs_parts' : 'ifs_relationships';
    supabase.from(table).update({ board_x: newX, board_y: newY }).eq('id', dragging.id).then(() => {
      if (dragging.type === 'part') fetchParts();
      else fetchRelationships();
    });
  }, [dragging, dragOffset]);

  const handleMouseUp = () => setDragging(null);

  // Draw connection lines between protectors and exiles
  const connections = [];
  parts.forEach(p => {
    if (p.protects_part_id) {
      const target = parts.find(t => t.id === p.protects_part_id);
      if (target) {
        connections.push({ from: p, to: target, type: 'protects' });
      }
    }
  });

  // Draw lines from relationships to activated parts
  const relConnections = [];
  relationships.forEach(rel => {
    (rel.parts_activated || []).forEach(partId => {
      const part = parts.find(p => p.id === partId);
      if (part) relConnections.push({ from: rel, to: part });
    });
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#888' }}>Drag nodes to arrange. Lines show protection relationships and relationship triggers.</span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#888' }}>
          {Object.entries(ROLE_CONFIG).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.color, display: 'inline-block' }} />
              {v.label.split(' (')[0]}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: '#6b8e9b', display: 'inline-block' }} />
            Person
          </span>
        </div>
      </div>
      <div style={{ ...s.card, padding: '0', overflow: 'hidden' }}>
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height}
          style={{ background: 'rgba(245,243,240,0.5)', cursor: dragging ? 'grabbing' : 'default' }}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <defs>
            <marker id="arrow-protects" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="none" stroke="#5c7a6f" strokeWidth="1.5" />
            </marker>
            <marker id="arrow-rel" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="none" stroke="#6b8e9b" strokeWidth="1.5" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Protection lines */}
          {connections.map((c, i) => (
            <line key={`prot-${i}`} x1={c.from.board_x} y1={c.from.board_y} x2={c.to.board_x} y2={c.to.board_y}
              stroke="#5c7a6f" strokeWidth="2" strokeDasharray="6,4" opacity="0.6" markerEnd="url(#arrow-protects)" />
          ))}

          {/* Relationship trigger lines */}
          {relConnections.map((c, i) => (
            <line key={`rel-${i}`} x1={c.from.board_x} y1={c.from.board_y} x2={c.to.board_x} y2={c.to.board_y}
              stroke="#6b8e9b" strokeWidth="1.5" strokeDasharray="4,6" opacity="0.5" markerEnd="url(#arrow-rel)" />
          ))}

          {/* Part nodes */}
          {parts.map(part => {
            const cfg = ROLE_CONFIG[part.role] || ROLE_CONFIG.protector;
            const radius = part.role === 'self' ? 40 : part.role === 'exile' ? 28 : 32;
            return (
              <g key={part.id} style={{ cursor: 'grab' }} onMouseDown={(e) => handleMouseDown(e, part.id, 'part')}>
                <circle cx={part.board_x} cy={part.board_y} r={radius + 4}
                  fill="none" stroke={part.color || cfg.color} strokeWidth="2" opacity="0.3" filter="url(#glow)" />
                <circle cx={part.board_x} cy={part.board_y} r={radius}
                  fill={`${part.color || cfg.color}30`} stroke={part.color || cfg.color} strokeWidth="2" />
                <text x={part.board_x} y={part.board_y - 4} textAnchor="middle" fontSize="11" fontWeight="600"
                  fill={part.color || cfg.color}>{part.name}</text>
                <text x={part.board_x} y={part.board_y + 10} textAnchor="middle" fontSize="9" fill="#999">
                  {cfg.label.split(' (')[0]}
                </text>
              </g>
            );
          })}

          {/* Relationship (person) nodes */}
          {relationships.map(rel => (
            <g key={rel.id} style={{ cursor: 'grab' }} onMouseDown={(e) => handleMouseDown(e, rel.id, 'relationship')}>
              <rect x={rel.board_x - 45} y={rel.board_y - 20} width="90" height="40" rx="8"
                fill={`${rel.color || '#6b8e9b'}20`} stroke={rel.color || '#6b8e9b'} strokeWidth="1.5" />
              <text x={rel.board_x} y={rel.board_y - 2} textAnchor="middle" fontSize="11" fontWeight="600"
                fill={rel.color || '#6b8e9b'}>{rel.person_name}</text>
              <text x={rel.board_x} y={rel.board_y + 12} textAnchor="middle" fontSize="9" fill="#999">
                {rel.relationship_type || 'person'}
              </text>
            </g>
          ))}

          {/* Self energy center marker */}
          {parts.length === 0 && (
            <text x={dimensions.width / 2} y={dimensions.height / 2} textAnchor="middle" fontSize="14" fill="#ccc">
              Add parts to see your system map
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};

// ============================================
// Conscious Contracts Tab
// ============================================
const ConsciousContracts = ({ contracts, parts, fetchContracts, userId }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const blank = {
    part_id: '', contract_type: 'unconscious', sworn_to: '', vow_action: '', vow_purpose: '',
    cost_recognized: '', new_contract: '', is_released: false, release_notes: '',
  };

  const startNew = () => { setForm(blank); setEditing('new'); };
  const startEdit = (c) => { setForm({ ...c }); setEditing(c.id); };
  const cancel = () => { setEditing(null); setForm({}); };

  const saveContract = async () => {
    const payload = { ...form, user_id: userId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (!payload.part_id) payload.part_id = null;
    if (editing === 'new') {
      await supabase.from('ifs_contracts').insert(payload);
    } else {
      await supabase.from('ifs_contracts').update(payload).eq('id', editing);
    }
    cancel();
    fetchContracts();
  };

  const releaseContract = async (id) => {
    await supabase.from('ifs_contracts').update({
      is_released: true, contract_type: 'released',
      release_date: new Date().toISOString(),
    }).eq('id', id);
    fetchContracts();
  };

  const deleteContract = async (id) => {
    if (!confirm('Delete this contract?')) return;
    await supabase.from('ifs_contracts').delete().eq('id', id);
    fetchContracts();
  };

  if (editing) {
    return (
      <div style={s.card}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editing === 'new' ? 'Identify an Unconscious Contract' : 'Edit Contract'}</h3>
        <div style={{ ...s.card, background: 'rgba(176,96,80,0.06)', border: '1px solid rgba(176,96,80,0.15)', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#b06050', fontStyle: 'italic' }}>
            "I, [your name], solemnly swear to <strong>[sworn_to]</strong> that I will <strong>[vow_action]</strong> in order to <strong>[vow_purpose]</strong>, no matter the cost to myself or the people I love."
          </p>
        </div>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Sworn To (Who was this contract made with?)</label>
            <input style={s.input} value={form.sworn_to || ''} onChange={e => setForm({ ...form, sworn_to: e.target.value })} placeholder="e.g., Mom, Dad, God, myself" />
          </div>
          <div style={s.col}>
            <label style={s.label}>Connected Part</label>
            <select style={{ ...s.select, width: '100%' }} value={form.part_id || ''} onChange={e => setForm({ ...form, part_id: e.target.value || null })}>
              <option value="">None</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.name} ({ROLE_CONFIG[p.role]?.label.split(' (')[0]})</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>The Vow (What did you promise to do/be?)</label>
          <textarea style={s.textarea} value={form.vow_action || ''} onChange={e => setForm({ ...form, vow_action: e.target.value })}
            placeholder="e.g., always be strong, never show weakness, take care of everyone else first" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>The Purpose (Why? To stay connected? To survive?)</label>
          <textarea style={s.textarea} value={form.vow_purpose || ''} onChange={e => setForm({ ...form, vow_purpose: e.target.value })}
            placeholder="e.g., to keep Mom from falling apart, to avoid being abandoned" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>The Cost (What does this contract cost you now?)</label>
          <textarea style={s.textarea} value={form.cost_recognized || ''} onChange={e => setForm({ ...form, cost_recognized: e.target.value })}
            placeholder="e.g., I can never rest, I push people away, I don't trust anyone" />
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)', margin: '20px 0' }} />
        <h4 style={{ fontSize: '15px', marginBottom: '12px', color: '#5c7a6f' }}>The Conscious Rewrite</h4>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>New Contract (What do you choose instead?)</label>
          <textarea style={s.textarea} value={form.new_contract || ''} onChange={e => setForm({ ...form, new_contract: e.target.value })}
            placeholder="e.g., I choose to show my vulnerability as strength. I can rest and still be loved." />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Release Notes</label>
          <textarea style={s.textarea} value={form.release_notes || ''} onChange={e => setForm({ ...form, release_notes: e.target.value })}
            placeholder="What came up during this process? How did it feel?" />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button style={s.btn('ghost')} onClick={cancel}><X size={14} /> Cancel</button>
          <button style={s.btn('primary')} onClick={saveContract}><Save size={14} /> Save Contract</button>
        </div>
      </div>
    );
  }

  const active = contracts.filter(c => !c.is_released);
  const released = contracts.filter(c => c.is_released);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{active.length} active, {released.length} released</span>
        <button style={s.btn('primary')} onClick={startNew}><Plus size={14} /> Identify Contract</button>
      </div>
      {contracts.length === 0 ? (
        <div style={s.emptyState}>
          <FileText size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No contracts identified yet</p>
          <p style={{ fontSize: '13px' }}>Unconscious contracts are vows we made — often as children — to survive or stay connected.</p>
          <p style={{ fontSize: '13px', marginTop: '8px', fontStyle: 'italic', color: '#b06050' }}>
            "I solemnly swear to ___ that I will ___ in order to ___, no matter the cost."
          </p>
        </div>
      ) : (
        <div style={s.grid}>
          {contracts.map(c => {
            const linkedPart = c.part_id ? parts.find(p => p.id === c.part_id) : null;
            return (
              <div key={c.id} style={{ ...s.card, borderLeft: `4px solid ${c.is_released ? '#4caf50' : '#b06050'}`, opacity: c.is_released ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={s.badge(c.is_released ? '#4caf50' : '#b06050')}>
                    {c.is_released ? 'Released' : 'Active Contract'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={s.btn('ghost')} onClick={() => startEdit(c)}><Edit3 size={13} /></button>
                    <button style={s.btn('ghost')} onClick={() => deleteContract(c.id)}><Trash2 size={13} style={{ color: '#d32f2f' }} /></button>
                  </div>
                </div>
                {linkedPart && <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Held by: <strong>{linkedPart.name}</strong></p>}
                <p style={{ fontSize: '13px', color: '#b06050', fontStyle: 'italic', marginBottom: '10px' }}>
                  "I swear to <strong>{c.sworn_to || '___'}</strong> that I will <strong>{c.vow_action || '___'}</strong> in order to <strong>{c.vow_purpose || '___'}</strong>."
                </p>
                {c.cost_recognized && <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Cost: {c.cost_recognized}</p>}
                {c.new_contract && (
                  <div style={{ background: 'rgba(92,122,111,0.08)', padding: '10px', borderRadius: '8px', marginTop: '8px' }}>
                    <label style={{ ...s.label, color: '#5c7a6f' }}>Conscious Rewrite</label>
                    <p style={{ fontSize: '13px', color: '#5c7a6f' }}>{c.new_contract}</p>
                  </div>
                )}
                {!c.is_released && c.new_contract && (
                  <button style={{ ...s.btn('ghost'), marginTop: '10px', color: '#4caf50' }} onClick={() => releaseContract(c.id)}>
                    <Sun size={14} /> Mark as Released
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// Unburdening Flow Tab
// ============================================
const UnburdeningFlow = ({ parts, sessions, fetchSessions, userId }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [message, setMessage] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const messagesEndRef = useRef(null);

  const startSession = async (partId) => {
    const part = parts.find(p => p.id === partId);
    const initialMessages = [{
      role: 'system', content: `Beginning unburdening session with ${part?.name || 'a part'}.`,
      step: 'check_readiness', timestamp: new Date().toISOString(),
    }];
    const { data, error } = await supabase.from('ifs_unburdening_sessions').insert({
      user_id: userId, part_id: partId, status: 'in_progress',
      current_step: 'check_readiness', messages: initialMessages,
    }).select().single();
    if (data) { setActiveSession(data); fetchSessions(); }
  };

  const addMessage = async (role, content) => {
    if (!activeSession) return;
    const newMsg = { role, content, step: activeSession.current_step, timestamp: new Date().toISOString() };
    const updatedMessages = [...(activeSession.messages || []), newMsg];
    await supabase.from('ifs_unburdening_sessions').update({ messages: updatedMessages }).eq('id', activeSession.id);
    setActiveSession({ ...activeSession, messages: updatedMessages });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    await addMessage('user', message.trim());
    setMessage('');
  };

  const advanceStep = async () => {
    const currentIdx = UNBURDENING_STEPS.findIndex(s => s.id === activeSession.current_step);
    if (currentIdx < UNBURDENING_STEPS.length - 1) {
      const nextStep = UNBURDENING_STEPS[currentIdx + 1];
      await supabase.from('ifs_unburdening_sessions').update({ current_step: nextStep.id }).eq('id', activeSession.id);
      await addMessage('system', `Moving to: ${nextStep.label}`);
      setActiveSession({ ...activeSession, current_step: nextStep.id });
    } else {
      await supabase.from('ifs_unburdening_sessions').update({
        status: 'completed', current_step: 'integrate',
        completed_at: new Date().toISOString(),
      }).eq('id', activeSession.id);
      setActiveSession({ ...activeSession, status: 'completed' });
      fetchSessions();
    }
  };

  const getSuggestion = async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/mechanic/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeSession.messages,
          currentStep: activeSession.current_step,
          partName: parts.find(p => p.id === activeSession.part_id)?.name,
        }),
      });
      const data = await res.json();
      if (data.suggestion) {
        await addMessage('assistant', data.suggestion);
      }
    } catch (err) {
      console.error('Suggestion error:', err);
    }
    setSuggesting(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length]);

  if (activeSession) {
    const currentStepConfig = UNBURDENING_STEPS.find(s => s.id === activeSession.current_step);
    const currentIdx = UNBURDENING_STEPS.findIndex(s => s.id === activeSession.current_step);
    const part = parts.find(p => p.id === activeSession.part_id);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>Session with: {part?.name || 'Unknown Part'}</h3>
            <span style={s.badge(activeSession.status === 'completed' ? '#4caf50' : '#b06050')}>
              {activeSession.status === 'completed' ? 'Completed' : `Step ${currentIdx + 1} of ${UNBURDENING_STEPS.length}`}
            </span>
          </div>
          <button style={s.btn('ghost')} onClick={() => setActiveSession(null)}><X size={14} /> Close</button>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {UNBURDENING_STEPS.map((step, i) => (
            <div key={step.id} style={{
              flex: 1, height: '6px', borderRadius: '3px',
              background: i < currentIdx ? '#4caf50' : i === currentIdx ? '#b06050' : 'rgba(0,0,0,0.08)',
              transition: 'background 0.3s ease',
            }} title={step.label} />
          ))}
        </div>

        {/* Current step guidance */}
        {currentStepConfig && activeSession.status !== 'completed' && (
          <div style={{ ...s.card, background: 'rgba(176,96,80,0.06)', border: '1px solid rgba(176,96,80,0.15)', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', color: '#b06050', marginBottom: '6px' }}>{currentStepConfig.label}</h4>
            <p style={{ fontSize: '13px', color: '#666' }}>{currentStepConfig.prompt}</p>
          </div>
        )}

        {/* Messages */}
        <div style={{ ...s.card, maxHeight: '400px', overflowY: 'auto', padding: '16px' }}>
          {(activeSession.messages || []).map((msg, i) => (
            <div key={i} style={{
              marginBottom: '12px', padding: '10px 14px', borderRadius: '12px',
              background: msg.role === 'user' ? 'rgba(176,96,80,0.08)' : msg.role === 'assistant' ? 'rgba(92,122,111,0.08)' : 'rgba(0,0,0,0.03)',
              borderLeft: msg.role === 'user' ? '3px solid #b06050' : msg.role === 'assistant' ? '3px solid #5c7a6f' : '3px solid #ddd',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: msg.role === 'user' ? '#b06050' : msg.role === 'assistant' ? '#5c7a6f' : '#999', textTransform: 'uppercase' }}>
                {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Guide' : 'System'}
              </span>
              <p style={{ fontSize: '14px', color: '#444', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {activeSession.status !== 'completed' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <textarea style={{ ...s.textarea, minHeight: '50px', flex: 1 }} value={message}
              onChange={e => setMessage(e.target.value)} placeholder="Write what comes up... what the part is saying, what you notice in your body..."
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button style={s.btn('primary')} onClick={sendMessage} disabled={!message.trim()}>Send</button>
              <button style={s.btn('ghost')} onClick={getSuggestion} disabled={suggesting}>
                <Zap size={13} /> {suggesting ? '...' : 'Suggest'}
              </button>
              <button style={{ ...s.btn('ghost'), color: '#5c7a6f' }} onClick={advanceStep}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Session list / start new
  const inProgress = sessions.filter(s => s.status === 'in_progress');
  const completed = sessions.filter(s => s.status === 'completed');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{inProgress.length} in progress, {completed.length} completed</span>
      </div>
      {parts.length === 0 ? (
        <div style={s.emptyState}>
          <RefreshCw size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Add parts first</p>
          <p style={{ fontSize: '13px' }}>You need to register parts before starting an unburdening session.</p>
        </div>
      ) : (
        <>
          <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Start a New Session</h4>
          <div style={s.grid}>
            {parts.filter(p => p.role !== 'self').map(part => {
              const cfg = ROLE_CONFIG[part.role];
              return (
                <div key={part.id} style={{ ...s.card, cursor: 'pointer', borderLeft: `4px solid ${part.color || cfg.color}` }}
                  onClick={() => startSession(part.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={s.badge(cfg.color)}>{cfg.icon} {cfg.label.split(' (')[0]}</span>
                      <h4 style={{ fontSize: '16px', marginTop: '4px' }}>{part.name}</h4>
                    </div>
                    <ChevronRight size={20} style={{ color: '#ccc' }} />
                  </div>
                  {part.burdens?.length > 0 && (
                    <div style={{ ...s.tagInput, marginTop: '8px' }}>
                      {part.burdens.map((b, i) => <span key={i} style={s.tag('#d32f2f')}>{b}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {sessions.length > 0 && (
            <>
              <h4 style={{ fontSize: '15px', margin: '24px 0 12px' }}>Previous Sessions</h4>
              {sessions.map(sess => {
                const part = parts.find(p => p.id === sess.part_id);
                return (
                  <div key={sess.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => setActiveSession(sess)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={s.badge(sess.status === 'completed' ? '#4caf50' : '#ff9800')}>
                          {sess.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                        <h4 style={{ fontSize: '15px', marginTop: '4px' }}>{part?.name || 'Unknown Part'}</h4>
                        <p style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(sess.started_at).toLocaleDateString()} — {(sess.messages || []).length} messages
                        </p>
                      </div>
                      <ChevronRight size={20} style={{ color: '#ccc' }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
};

// ============================================
// Relationships Tab
// ============================================
const RelationshipsTab = ({ relationships, parts, fetchRelationships, userId }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const blank = {
    person_name: '', relationship_type: 'other', description: '',
    parts_activated: [], contracts_linked: [], patterns: [], color: '#6b8e9b', notes: '',
  };

  const startNew = () => { setForm(blank); setEditing('new'); };
  const startEdit = (r) => { setForm({ ...r }); setEditing(r.id); };
  const cancel = () => { setEditing(null); setForm({}); };

  const saveRelationship = async () => {
    const payload = { ...form, user_id: userId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (editing === 'new') {
      await supabase.from('ifs_relationships').insert(payload);
    } else {
      await supabase.from('ifs_relationships').update(payload).eq('id', editing);
    }
    cancel();
    fetchRelationships();
  };

  const deleteRelationship = async (id) => {
    if (!confirm('Delete this relationship?')) return;
    await supabase.from('ifs_relationships').delete().eq('id', id);
    fetchRelationships();
  };

  const togglePartActivated = (partId) => {
    const current = form.parts_activated || [];
    if (current.includes(partId)) {
      setForm({ ...form, parts_activated: current.filter(id => id !== partId) });
    } else {
      setForm({ ...form, parts_activated: [...current, partId] });
    }
  };

  if (editing) {
    return (
      <div style={s.card}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{editing === 'new' ? 'Add Person' : `Edit: ${form.person_name}`}</h3>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Person Name</label>
            <input style={s.input} value={form.person_name || ''} onChange={e => setForm({ ...form, person_name: e.target.value })} placeholder="e.g., Mom, Partner, Boss" />
          </div>
          <div style={s.col}>
            <label style={s.label}>Relationship Type</label>
            <select style={{ ...s.select, width: '100%' }} value={form.relationship_type || 'other'}
              onChange={e => setForm({ ...form, relationship_type: e.target.value })}>
              <option value="parent">Parent</option>
              <option value="partner">Partner</option>
              <option value="sibling">Sibling</option>
              <option value="child">Child</option>
              <option value="friend">Friend</option>
              <option value="authority">Authority Figure</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Description (How this person shows up in your system)</label>
          <textarea style={s.textarea} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., When they criticize, my perfectionist part takes over..." />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Parts This Person Activates</label>
          <div style={{ ...s.tagInput, gap: '8px' }}>
            {parts.map(part => {
              const isActive = (form.parts_activated || []).includes(part.id);
              const cfg = ROLE_CONFIG[part.role];
              return (
                <span key={part.id} onClick={() => togglePartActivated(part.id)}
                  style={{ ...s.tag(isActive ? cfg.color : '#ccc'), cursor: 'pointer', opacity: isActive ? 1 : 0.5 }}>
                  {cfg.icon} {part.name}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Recurring Patterns</label>
          <TagInput tags={form.patterns || []} onChange={p => setForm({ ...form, patterns: p })} placeholder="e.g., withdraws when I set boundaries" color="#6b8e9b" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Notes</label>
          <textarea style={s.textarea} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional observations..." />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button style={s.btn('ghost')} onClick={cancel}><X size={14} /> Cancel</button>
          <button style={s.btn('primary')} onClick={saveRelationship} disabled={!form.person_name?.trim()}><Save size={14} /> Save</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{relationships.length} people mapped</span>
        <button style={s.btn('primary')} onClick={startNew}><Plus size={14} /> Add Person</button>
      </div>
      {relationships.length === 0 ? (
        <div style={s.emptyState}>
          <Users size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No relationships mapped yet</p>
          <p style={{ fontSize: '13px' }}>Add people in your life to see how they connect to your parts system.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {relationships.map(rel => {
            const activatedParts = (rel.parts_activated || []).map(id => parts.find(p => p.id === id)).filter(Boolean);
            return (
              <div key={rel.id} style={{ ...s.card, borderLeft: `4px solid ${rel.color || '#6b8e9b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={s.badge('#6b8e9b')}>{rel.relationship_type}</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>{rel.person_name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={s.btn('ghost')} onClick={() => startEdit(rel)}><Edit3 size={13} /></button>
                    <button style={s.btn('ghost')} onClick={() => deleteRelationship(rel.id)}><Trash2 size={13} style={{ color: '#d32f2f' }} /></button>
                  </div>
                </div>
                {rel.description && <p style={{ fontSize: '13px', color: '#666', margin: '8px 0' }}>{rel.description}</p>}
                {activatedParts.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={s.label}>Activates</label>
                    <div style={s.tagInput}>
                      {activatedParts.map(p => (
                        <span key={p.id} style={s.tag(ROLE_CONFIG[p.role]?.color || '#b06050')}>
                          {ROLE_CONFIG[p.role]?.icon} {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {rel.patterns?.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={s.label}>Patterns</label>
                    <div style={s.tagInput}>
                      {rel.patterns.map((p, i) => <span key={i} style={s.tag('#6b8e9b')}>{p}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// Log Submission Tab (5-step intake from Gem)
// ============================================
// ============================================
// Journal Tab (free-flow diary + entity extraction)
// ============================================
const JournalTab = ({ entities, fetchEntities, userId, customRelTypes, fetchCustomRelTypes }) => {
  const [entries, setEntries] = useState([]);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState('');
  const [nsStateBefore, setNsStateBefore] = useState('');
  const [nsStateAfter, setNsStateAfter] = useState('');
  const [logPeriod, setLogPeriod] = useState('');
  const [analyzing, setAnalyzing] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);
  const [newRelType, setNewRelType] = useState('');
  const [showPatterns, setShowPatterns] = useState(false);
  const [patterns, setPatterns] = useState(null);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [consultation, setConsultation] = useState(null);
  const [loadingConsultation, setLoadingConsultation] = useState(false);

  const fetchEntries = async () => {
    const { data } = await supabase.from('ifs_journal_entries').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setEntries(data);
  };

  useEffect(() => { fetchEntries(); }, []);

  const saveEntry = async () => {
    if (content.trim().length < 10) return;
    const now = new Date();
    const hour = now.getHours();
    const autoPeriod = logPeriod || (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening');
    const { data } = await supabase.from('ifs_journal_entries').insert({
      user_id: userId, content: content.trim(), entry_type: 'freeflow',
      ns_state_before: nsStateBefore || null, ns_state_after: nsStateAfter || null,
      word_count: content.trim().split(/\s+/).length,
      log_period: autoPeriod,
      time_of_day_hour: hour,
    }).select().single();
    if (data) {
      setContent(''); setNsStateBefore(''); setNsStateAfter(''); setWriting(false);
      fetchEntries();
      analyzeEntry(data.id);
    }
  };

  const analyzeEntry = async (id) => {
    setAnalyzing(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mechanic/journal-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ journalId: id }),
      });
      const data = await res.json();
      if (data.status === 'completed') {
        fetchEntries();
        // Offer to create new entities
        if (data.new_entities?.length > 0) {
          for (const ne of data.new_entities) {
            if (confirm(`New person detected: "${ne.name}" (${ne.relationship_guess}). Add to your entities?`)) {
              await supabase.from('ifs_entities').insert({
                user_id: userId, name: ne.name,
                relationship_type: ne.relationship_guess || 'other',
                is_group: ne.is_group || false,
              });
              fetchEntities();
            }
          }
        }
      }
    } catch (err) { console.error('Journal analysis error:', err); }
    setAnalyzing(null);
  };

  const addCustomRelType = async () => {
    if (!newRelType.trim()) return;
    await supabase.from('ifs_relationship_types').insert({
      user_id: userId, label: newRelType.trim().toLowerCase(), is_group: false,
    });
    setNewRelType('');
    fetchCustomRelTypes();
  };

  // Viewing an analyzed entry
  if (viewEntry) {
    const a = viewEntry.analysis_result;
    return (
      <div>
        <button style={s.btn('ghost')} onClick={() => setViewEntry(null)}>← Back</button>
        <div style={{ ...s.card, marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px' }}>{new Date(viewEntry.entry_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <span style={{ fontSize: '12px', color: '#888' }}>{viewEntry.word_count} words</span>
            </div>
            {viewEntry.ns_state_before && <span style={s.badge(SOMATIC_STATES.find(st => st.id === viewEntry.ns_state_before)?.color || '#999')}>Before: {viewEntry.ns_state_before}</span>}
          </div>
          <p style={{ fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.7', marginBottom: '16px' }}>{viewEntry.content}</p>
        </div>

        {a && (
          <>
            {/* Extracted Entities */}
            {a.entities?.length > 0 && (
              <div style={{ ...s.card, borderLeft: '4px solid #6b8e9b' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}><User size={14} /> People & Groups Mentioned</h4>
                {a.entities.map((e, i) => (
                  <div key={i} style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(107,142,155,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {e.is_group ? <UsersRound size={14} style={{ color: '#6b8e9b' }} /> : <User size={14} style={{ color: '#6b8e9b' }} />}
                      <strong style={{ fontSize: '14px' }}>{e.name}</strong>
                      <span style={s.badge(e.sentiment === 'positive' ? '#4caf50' : e.sentiment === 'negative' ? '#d32f2f' : '#ff9800')}>{e.sentiment}</span>
                      <span style={{ fontSize: '11px', color: '#999' }}>{e.relationship_guess}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>"{e.context_snippet}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Detected Parts */}
            {a.parts?.length > 0 && (
              <div style={{ ...s.card, borderLeft: '4px solid #b06050' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}><Brain size={14} /> Parts Detected</h4>
                <div style={s.tagInput}>
                  {a.parts.map((p, i) => (
                    <span key={i} style={s.tag(ROLE_CONFIG[p.role]?.color || '#b06050')}>
                      {p.name} ({p.role}) — {p.activation_level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Themes */}
            {a.themes?.length > 0 && (
              <div style={{ ...s.card, borderLeft: '4px solid #6b5b8a' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Themes</h4>
                <div style={s.tagInput}>
                  {a.themes.map((t, i) => <span key={i} style={s.tag('#6b5b8a')}>{t}</span>)}
                </div>
              </div>
            )}

            {/* NS State & Summary */}
            {a.ns_state_read && (
              <div style={s.card}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>NS STATE READ: </span>
                <span style={{ color: a.ns_state_read === 'green' ? '#4caf50' : a.ns_state_read === 'amber' ? '#ff9800' : '#d32f2f', fontWeight: 600 }}>
                  {a.ns_state_read.toUpperCase()}
                </span>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>{a.ns_state_reasoning}</p>
              </div>
            )}

            {a.summary && (
              <div style={{ ...s.card, background: 'rgba(176,96,80,0.04)' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>Summary</h4>
                <p style={{ fontSize: '13px', color: '#666' }}>{a.summary}</p>
              </div>
            )}

            {/* Suggested Interactions */}
            {a.suggested_interactions?.length > 0 && (
              <div style={{ ...s.card, background: 'rgba(90,138,191,0.06)', border: '1px solid rgba(90,138,191,0.2)' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Suggested for Full Analysis</h4>
                {a.suggested_interactions.map((si, i) => (
                  <p key={i} style={{ fontSize: '13px', color: '#5a8abf', marginBottom: '4px' }}>
                    → <strong>{si.entity_name}</strong>: {si.description}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Writing mode
  if (writing) {
    return (
      <div>
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Free-Flow Journal</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
            Write freely. No structure needed. The Mechanic will extract people, parts, and patterns.
          </p>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>How are you right now? (Optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SOMATIC_STATES.map(st => (
                <div key={st.id} onClick={() => setNsStateBefore(st.id)}
                  style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                    background: nsStateBefore === st.id ? `${st.color}20` : 'rgba(0,0,0,0.03)',
                    border: nsStateBefore === st.id ? `2px solid ${st.color}` : '2px solid transparent',
                    color: st.color, fontWeight: nsStateBefore === st.id ? 600 : 400 }}>
                  {st.id.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Log Period (auto-detected, or choose)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['morning', 'afternoon', 'evening'].map(p => (
                <div key={p} onClick={() => setLogPeriod(p)}
                  style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                    background: logPeriod === p ? 'rgba(176,96,80,0.12)' : 'rgba(0,0,0,0.03)',
                    border: logPeriod === p ? '2px solid #b06050' : '2px solid transparent',
                    fontWeight: logPeriod === p ? 600 : 400 }}>
                  {p}
                </div>
              ))}
            </div>
          </div>

          <textarea style={{ ...s.textarea, minHeight: '300px', fontSize: '15px', lineHeight: '1.8' }}
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind? Write about interactions, feelings, people, whatever comes up..."
            autoFocus />

          <div style={{ marginTop: '12px' }}>
            <label style={s.label}>How do you feel after writing? (Optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SOMATIC_STATES.map(st => (
                <div key={st.id} onClick={() => setNsStateAfter(st.id)}
                  style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                    background: nsStateAfter === st.id ? `${st.color}20` : 'rgba(0,0,0,0.03)',
                    border: nsStateAfter === st.id ? `2px solid ${st.color}` : '2px solid transparent',
                    color: st.color, fontWeight: nsStateAfter === st.id ? 600 : 400 }}>
                  {st.id.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.btn('ghost')} onClick={() => { setWriting(false); setContent(''); }}>
                <X size={14} /> Discard
              </button>
              <button style={s.btn('primary')} onClick={saveEntry} disabled={content.trim().length < 10}>
                <Save size={14} /> Save & Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Custom relationship type manager */}
        <div style={{ ...s.card, marginTop: '12px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Custom Relationship Types</h4>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Add types like "bandmate", "softball parent", "church group" — they'll appear in all dropdowns.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...s.input, flex: 1 }} value={newRelType} onChange={e => setNewRelType(e.target.value)}
              placeholder="New type..." onKeyDown={e => e.key === 'Enter' && addCustomRelType()} />
            <button style={s.btn('primary')} onClick={addCustomRelType} disabled={!newRelType.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ ...s.tagInput, marginTop: '8px' }}>
            {DEFAULT_RELATIONSHIP_TYPES.map(t => <span key={t} style={s.tag('#999')}>{t}</span>)}
            {customRelTypes.map(t => <span key={t.id} style={s.tag('#5a8abf')}>{t.label}</span>)}
          </div>
        </div>
      </div>
    );
  }

  // Entry list
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{entries.length} entries</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btn('ghost')} onClick={async () => {
            setLoadingPatterns(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch('/api/mechanic/patterns', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: '{}',
              });
              const data = await res.json();
              setPatterns(data); setShowPatterns(true);
            } catch (e) { console.error(e); }
            setLoadingPatterns(false);
          }} disabled={loadingPatterns}>
            <Activity size={14} /> {loadingPatterns ? 'Analyzing...' : 'Patterns'}
          </button>
          <button style={s.btn('ghost')} onClick={async () => {
            setLoadingConsultation(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch('/api/mechanic/export-consultation', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ timeRange: 30 }),
              });
              const data = await res.json();
              setConsultation(data);
            } catch (e) { console.error(e); }
            setLoadingConsultation(false);
          }} disabled={loadingConsultation}>
            <FileText size={14} /> {loadingConsultation ? 'Generating...' : 'Peer Consultation'}
          </button>
          <button style={s.btn('primary')} onClick={() => setWriting(true)}>
            <BookOpen size={14} /> New Entry
          </button>
        </div>
      </div>

      {/* Patterns View */}
      {showPatterns && patterns && (
        <div style={{ ...s.card, background: 'rgba(90,138,191,0.04)', border: '1px solid rgba(90,138,191,0.15)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px' }}>Temporal & Relational Patterns</h3>
            <button style={s.btn('ghost')} onClick={() => setShowPatterns(false)}><X size={14} /></button>
          </div>
          {patterns.status === 'insufficient_data' ? (
            <p style={{ fontSize: '13px', color: '#888' }}>{patterns.message} ({patterns.journal_count} journals, {patterns.analysis_count} analyses)</p>
          ) : patterns.patterns ? (
            <>
              {patterns.patterns.key_insight && (
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(176,96,80,0.06)', marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#b06050', fontWeight: 500 }}>{patterns.patterns.key_insight}</p>
                </div>
              )}
              {patterns.patterns.time_patterns?.map((tp, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <span style={s.badge(tp.confidence === 'high' ? '#4caf50' : tp.confidence === 'medium' ? '#ff9800' : '#999')}>{tp.confidence}</span>
                  <span style={{ fontSize: '13px', marginLeft: '8px' }}>{tp.pattern}</span>
                </div>
              ))}
              {patterns.patterns.trigger_clusters?.map((tc, i) => (
                <div key={i} style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(255,152,0,0.06)' }}>
                  <p style={{ fontSize: '13px', color: '#e65100' }}>Structural theme: <strong>{tc.structural_theme}</strong></p>
                  <p style={{ fontSize: '12px', color: '#888' }}>Trigger: {tc.trigger} — across: {tc.entities?.join(', ')}</p>
                </div>
              ))}
              {patterns.patterns.somatic_trend && (
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  Regulation trend: <strong style={{ color: patterns.patterns.somatic_trend.direction === 'regulating' ? '#4caf50' : '#ff9800' }}>
                    {patterns.patterns.somatic_trend.direction}
                  </strong> — {patterns.patterns.somatic_trend.evidence}
                </p>
              )}
              {patterns.patterns.recommendation && (
                <p style={{ fontSize: '13px', color: '#5c7a6f', marginTop: '12px', fontStyle: 'italic' }}>{patterns.patterns.recommendation}</p>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Peer Consultation Export */}
      {consultation?.markdown && (
        <div style={{ ...s.card, background: 'rgba(92,122,111,0.04)', border: '1px solid rgba(92,122,111,0.15)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', color: '#5c7a6f' }}>Peer Consultation Summary</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={s.btn('ghost')} onClick={() => {
                navigator.clipboard.writeText(consultation.markdown);
                alert('Copied to clipboard!');
              }}><FileText size={14} /> Copy</button>
              <button style={s.btn('ghost')} onClick={() => setConsultation(null)}><X size={14} /></button>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
            {consultation.markdown}
          </div>
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '12px' }}>
            Based on {consultation.metadata?.journal_count} journal entries + {consultation.metadata?.analysis_count} analyses from the last {consultation.metadata?.time_range_days} days
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <div style={s.emptyState}>
          <BookOpen size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No journal entries yet</p>
          <p style={{ fontSize: '13px' }}>Write freely — the Mechanic will extract people, parts, and relational patterns from your words.</p>
        </div>
      ) : (
        entries.map(entry => {
          const entityCount = (entry.extracted_entities || []).length;
          const partCount = (entry.extracted_parts || []).length;
          const isLoading = analyzing === entry.id;
          return (
            <div key={entry.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => entry.is_analyzed && setViewEntry(entry)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>
                      {new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>{entry.word_count} words</span>
                    {entry.is_analyzed ? (
                      <>
                        {entityCount > 0 && <span style={s.badge('#6b8e9b')}>{entityCount} people</span>}
                        {partCount > 0 && <span style={s.badge('#b06050')}>{partCount} parts</span>}
                        {entry.analysis_result?.ns_state_read && (
                          <span style={s.badge(entry.analysis_result.ns_state_read === 'green' ? '#4caf50' : entry.analysis_result.ns_state_read === 'amber' ? '#ff9800' : '#d32f2f')}>
                            {entry.analysis_result.ns_state_read}
                          </span>
                        )}
                      </>
                    ) : isLoading ? (
                      <span style={s.badge('#ff9800')}><Loader size={10} /> Analyzing...</span>
                    ) : (
                      <button style={s.btn('ghost')} onClick={(e) => { e.stopPropagation(); analyzeEntry(entry.id); }}>Analyze</button>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
                    {entry.content.slice(0, 150)}{entry.content.length > 150 ? '...' : ''}
                  </p>
                </div>
                {entry.is_analyzed && <ChevronRight size={20} style={{ color: '#ccc' }} />}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ============================================
// Log Submission Tab (5-step intake from Gem)
// ============================================
const LogSubmission = ({ entities, fetchEntities, fetchAnalyses, userId, customRelTypes }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    entity_id: '', entity_name: '', relationship_type: 'other', is_new_entity: false,
    raw_text: '', somatic_state: '', affective_drive_self_report: '', parts_self_report: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const createEntityAndSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Create entity if new
      let entityId = form.entity_id;
      if (form.is_new_entity && form.entity_name.trim()) {
        const { data: newEntity } = await supabase.from('ifs_entities').insert({
          user_id: userId, name: form.entity_name.trim(), relationship_type: form.relationship_type,
        }).select().single();
        if (newEntity) { entityId = newEntity.id; fetchEntities(); }
      }

      // Create interaction log
      const { data: log } = await supabase.from('ifs_interaction_logs').insert({
        user_id: userId, entity_id: entityId || null,
        raw_text: form.raw_text, somatic_state: form.somatic_state,
        affective_drive_self_report: form.affective_drive_self_report,
        parts_self_report: form.parts_self_report || null,
      }).select().single();

      if (!log) { setSubmitting(false); return; }

      // Trigger analysis pipeline
      const res = await fetch('/api/mechanic/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ logId: log.id }),
      });
      const data = await res.json();
      setResult(data);
      fetchAnalyses();
    } catch (err) {
      console.error('Submit error:', err);
    }
    setSubmitting(false);
  };

  if (result?.status === 'completed') {
    return (
      <div>
        <div style={{ ...s.card, background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle size={20} style={{ color: '#4caf50' }} />
            <h3 style={{ fontSize: '18px', color: '#4caf50' }}>Analysis Complete</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            {result.tokens?.input + result.tokens?.output} tokens used across 9 modules + retrospective
          </p>
          <button style={s.btn('primary')} onClick={() => { setResult(null); setStep(1); setForm({ entity_id: '', entity_name: '', relationship_type: 'other', is_new_entity: false, raw_text: '', somatic_state: '', affective_drive_self_report: '', parts_self_report: '' }); }}>
            <Plus size={14} /> New Log
          </button>
        </div>
        <AnalysisRenderer analysis={result} />
      </div>
    );
  }

  if (submitting) {
    return (
      <div style={{ ...s.card, textAlign: 'center', padding: '60px 20px' }}>
        <Loader size={32} style={{ color: '#b06050', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Running 9-Module Analysis Pipeline</h3>
        <p style={{ fontSize: '13px', color: '#888' }}>M9 → M16 → M18 → M19 → M21 → M22 → M23 → M20 → M25 → Retrospective</p>
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>This takes 30-60 seconds (Sonnet × 10 calls)</p>
      </div>
    );
  }

  return (
    <div>
      {/* Step progress */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < step ? '#4caf50' : i === step ? '#b06050' : 'rgba(0,0,0,0.08)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Step 1: Entity */}
      {step === 1 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Step 1 — Who is this interaction with?</h3>
          <div style={{ marginBottom: '12px' }}>
            <select style={{ ...s.select, width: '100%' }} value={form.is_new_entity ? '__new__' : form.entity_id}
              onChange={e => {
                if (e.target.value === '__new__') setForm({ ...form, is_new_entity: true, entity_id: '' });
                else setForm({ ...form, is_new_entity: false, entity_id: e.target.value });
              }}>
              <option value="">Select a person...</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.relationship_type}) — {e.log_count} logs</option>)}
              <option value="__new__">+ New person</option>
            </select>
          </div>
          {form.is_new_entity && (
            <div style={s.row}>
              <div style={s.col}>
                <label style={s.label}>Name</label>
                <input style={s.input} value={form.entity_name} onChange={e => setForm({ ...form, entity_name: e.target.value })} placeholder="Name or identifier" />
              </div>
              <div style={s.col}>
                <label style={s.label}>Relationship</label>
                <select style={{ ...s.select, width: '100%' }} value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })}>
                  {[...DEFAULT_RELATIONSHIP_TYPES, ...(customRelTypes || []).map(c => c.label)].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button style={s.btn('primary')} onClick={() => setStep(2)} disabled={!form.entity_id && !form.entity_name.trim()}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Raw Dump */}
      {step === 2 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Step 2 — What happened?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>No format required — plain language, as long as needed. Fragmented or emotional text is fine.</p>
          <textarea style={{ ...s.textarea, minHeight: '200px' }} value={form.raw_text} onChange={e => setForm({ ...form, raw_text: e.target.value })}
            placeholder="Describe the interaction... what happened, what was said, how it went..." />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            <button style={s.btn('ghost')} onClick={() => setStep(1)}>Back</button>
            <button style={s.btn('primary')} onClick={() => setStep(3)} disabled={form.raw_text.trim().length < 20}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Somatic Anchor */}
      {step === 3 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Step 3 — Right now, in your body — which state?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {SOMATIC_STATES.map(st => (
              <div key={st.id} onClick={() => setForm({ ...form, somatic_state: st.id })}
                style={{ ...s.card, cursor: 'pointer', marginBottom: 0, borderLeft: `4px solid ${st.color}`, background: form.somatic_state === st.id ? `${st.color}15` : undefined }}>
                <span style={{ fontSize: '15px', fontWeight: form.somatic_state === st.id ? 600 : 400 }}>{st.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            <button style={s.btn('ghost')} onClick={() => setStep(2)}>Back</button>
            <button style={s.btn('primary')} onClick={() => setStep(4)} disabled={!form.somatic_state}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Affective Drive */}
      {step === 4 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Step 4 — The drive underneath — which one fits?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {AFFECTIVE_DRIVES.map(dr => (
              <div key={dr.id} onClick={() => setForm({ ...form, affective_drive_self_report: dr.id })}
                style={{ ...s.card, cursor: 'pointer', marginBottom: 0, background: form.affective_drive_self_report === dr.id ? 'rgba(176,96,80,0.08)' : undefined }}>
                <span style={{ fontSize: '14px', fontWeight: form.affective_drive_self_report === dr.id ? 600 : 400 }}>{dr.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            <button style={s.btn('ghost')} onClick={() => setStep(3)}>Back</button>
            <button style={s.btn('primary')} onClick={() => setStep(5)} disabled={!form.affective_drive_self_report}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Parts Self-Report (Optional) */}
      {step === 5 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Step 5 — Anything you noticed in yourself? (Optional)</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>Parts active, body sensations, thoughts, reactions</p>
          <textarea style={s.textarea} value={form.parts_self_report} onChange={e => setForm({ ...form, parts_self_report: e.target.value })}
            placeholder="Optional — what did you notice during or after the interaction?" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button style={s.btn('ghost')} onClick={() => setStep(4)}>Back</button>
            <button style={s.btn('primary')} onClick={createEntityAndSubmit}>
              <Send size={14} /> Submit & Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Analysis Renderer (structured 9-module output)
// ============================================
const AnalysisRenderer = ({ analysis }) => {
  if (!analysis?.results) return null;
  const r = analysis.results;
  const retro = analysis.retrospective;

  const ModuleSection = ({ id, title, children }) => (
    <div style={{ ...s.card, marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={s.badge('#b06050')}>{id}</span>
        <h4 style={{ fontSize: '15px' }}>{title}</h4>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, value, color }) => value ? (
    <div style={{ marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>{label}: </span>
      <span style={{ fontSize: '13px', color: color || '#444' }}>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
    </div>
  ) : null;

  return (
    <div style={{ marginTop: '16px' }}>
      {r.m9 && (
        <ModuleSection id="M9" title="Nervous System Read">
          <Field label="NS State Confirmed" value={r.m9.ns_state_confirmed} color={r.m9.ns_state_confirmed === 'green' ? '#4caf50' : r.m9.ns_state_confirmed === 'amber' ? '#ff9800' : '#d32f2f'} />
          {r.m9.discrepancy && <Field label="Discrepancy" value={r.m9.discrepancy_note} color="#d32f2f" />}
          <Field label="Reasoning" value={r.m9.reasoning} />
          {r.m9.routing_limitations?.length > 0 && <Field label="Routing Limitations" value={r.m9.routing_limitations.join(', ')} color="#ff9800" />}
        </ModuleSection>
      )}

      {r.m16 && (
        <ModuleSection id="M16" title="Parts Active">
          <Field label="Self-Energy Present" value={r.m16.self_energy_present} color={r.m16.self_energy_present === 'yes' ? '#4caf50' : '#ff9800'} />
          <Field label="Blending Level" value={r.m16.blending_level} />
          {r.m16.self_vs_manager_flag && <Field label="Self vs Manager" value={r.m16.self_vs_manager_note} color="#ff9800" />}
          {(r.m16.parts_active || []).map((p, i) => (
            <div key={i} style={{ ...s.tag(ROLE_CONFIG[p.role]?.color || '#b06050'), margin: '4px 4px 4px 0', display: 'inline-flex' }}>
              {p.name}: {p.protective_function}
            </div>
          ))}
        </ModuleSection>
      )}

      {r.m18 && (
        <ModuleSection id="M18" title="Messenger Analysis">
          <Field label="CI Level" value={r.m18.ci_level} />
          <Field label="Disconnection" value={r.m18.disconnection_pattern} />
          <Field label="What Triggered Me" value={r.m18.what_triggered_me} color="#b06050" />
          <Field label="Belief Defended" value={r.m18.belief_defended} />
          <Field label="Conscious Response Available" value={r.m18.conscious_response_available} color="#5c7a6f" />
        </ModuleSection>
      )}

      {r.m19 && (
        <ModuleSection id="M19" title="Affective Drive">
          <Field label="Self-Reported" value={r.m19.self_reported} />
          <Field label="Confirmed" value={r.m19.affective_drive_confirmed} color={r.m19.discrepancy ? '#d32f2f' : '#4caf50'} />
          {r.m19.discrepancy && <Field label="Discrepancy" value={r.m19.discrepancy_note} color="#d32f2f" />}
        </ModuleSection>
      )}

      {r.m21 && (
        <ModuleSection id="M21" title="Four-Layer Check">
          {r.m21.four_layer_check && Object.entries(r.m21.four_layer_check).map(([k, v]) => (
            <Field key={k} label={`Layer: ${k}`} value={v} />
          ))}
          {r.m21.patterns_detected?.length > 0 && <Field label="Patterns" value={r.m21.patterns_detected.join(', ')} color="#ff9800" />}
        </ModuleSection>
      )}

      {r.m22 && (
        <ModuleSection id="M22" title="Feel-Towards Gate">
          <Field label="Gate" value={r.m22.feel_towards_gate} color={r.m22.feel_towards_gate === 'pass' ? '#4caf50' : '#d32f2f'} />
          <Field label="Reasoning" value={r.m22.reasoning} />
        </ModuleSection>
      )}

      {r.m23 && (
        <ModuleSection id="M23" title="Four Quadrant View">
          {r.m23.aqal_breakdown && <>
            <Field label="UL — Interior" value={r.m23.aqal_breakdown.ul} />
            <Field label="UR — Exterior" value={r.m23.aqal_breakdown.ur} />
            <Field label="LL — Between Us" value={r.m23.aqal_breakdown.ll} />
            <Field label="LR — Systemic" value={r.m23.aqal_breakdown.lr} />
          </>}
          {r.m23.over_indexed_quadrant && <Field label="Over-Indexed" value={r.m23.over_indexed_quadrant} color="#ff9800" />}
        </ModuleSection>
      )}

      {r.m20 && (
        <ModuleSection id="M20" title="Spiral Dynamics">
          <Field label="Your vMeme" value={r.m20.user_vmeme} />
          <Field label="Entity vMeme" value={r.m20.entity_vmeme} />
          {r.m20.vmeme_clash && <Field label="Clash" value={r.m20.clash_description} color="#d32f2f" />}
          <Field label="Tier Shift" value={r.m20.tier_shift_assessment} />
        </ModuleSection>
      )}

      {r.m25 && (
        <ModuleSection id="M25" title="Non-Forcing Path">
          <Field label="Wu Wei Note" value={r.m25.wu_wei_note} />
          <Field label="Non-Forcing Alternative" value={r.m25.non_forcing_alternative} color="#5c7a6f" />
          {r.m25.backwards_law_active && <Field label="Backwards Law" value="Active — the harder you pushed, the more resistance generated" color="#ff9800" />}
        </ModuleSection>
      )}

      {retro && (
        <div style={{ ...s.card, background: 'rgba(176,96,80,0.04)', border: '1px solid rgba(176,96,80,0.15)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#b06050' }}>Retrospective — Five Angles</h3>
          <Field label="My Inside (UL)" value={retro.my_inside} />
          <Field label="Their System — Hypothesis" value={retro.their_system_hypothesis} />
          <Field label="Between Us (LL)" value={retro.between_us} />
          <Field label="Body Reading (UR)" value={retro.body_reading} />
          <Field label="Non-Forcing Path (M25)" value={retro.non_forcing_path} />
        </div>
      )}

      {analysis.pattern_flags && (
        <div style={{ ...s.card, background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
          <h4 style={{ fontSize: '14px', color: '#ff9800' }}>Pattern Flags</h4>
          <p style={{ fontSize: '13px', color: '#666' }}>{analysis.pattern_flags.note}</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// Analysis History Tab
// ============================================
const AnalysisHistory = ({ analyses, entities, fetchAnalyses }) => {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <div>
        <button style={s.btn('ghost')} onClick={() => setSelected(null)}>← Back to list</button>
        <AnalysisRenderer analysis={{ results: {
          m9: selected.m9_polyvagal, m16: selected.m16_ifs, m18: selected.m18_compassionate_inquiry,
          m19: selected.m19_panksepp, m21: selected.m21_winnicott, m22: selected.m22_epstein,
          m23: selected.m23_integral, m20: selected.m20_spiral, m25: selected.m25_watts,
        }, retrospective: selected.retrospective, pattern_flags: selected.pattern_flags }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{analyses.length} analyses</span>
      </div>
      {analyses.length === 0 ? (
        <div style={s.emptyState}>
          <Activity size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No analyses yet</p>
          <p style={{ fontSize: '13px' }}>Submit an interaction log to run the 9-module pipeline.</p>
        </div>
      ) : (
        analyses.map(a => {
          const entity = entities.find(e => e.id === a.entity_id);
          const nsState = a.m9_polyvagal?.ns_state_confirmed;
          const nsColor = nsState === 'green' ? '#4caf50' : nsState === 'amber' ? '#ff9800' : nsState === 'red' ? '#d32f2f' : '#999';
          return (
            <div key={a.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => setSelected(a)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={s.badge(a.pipeline_status === 'completed' ? '#4caf50' : a.pipeline_status === 'running' ? '#ff9800' : '#d32f2f')}>
                      {a.pipeline_status === 'completed' ? <CheckCircle size={12} /> : a.pipeline_status === 'running' ? <Loader size={12} /> : <AlertTriangle size={12} />}
                      {' '}{a.pipeline_status}
                    </span>
                    {nsState && <span style={s.badge(nsColor)}>{nsState.toUpperCase()}</span>}
                    {a.m19_panksepp?.affective_drive_confirmed && <span style={s.badge('#6b5b8a')}>{a.m19_panksepp.affective_drive_confirmed}</span>}
                  </div>
                  <h4 style={{ fontSize: '15px' }}>{entity?.name || 'Unknown Entity'}</h4>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(a.created_at).toLocaleDateString()} — {(a.modules_completed || []).length}/9 modules
                    {a.total_input_tokens ? ` — ${a.total_input_tokens + a.total_output_tokens} tokens` : ''}
                  </p>
                </div>
                <ChevronRight size={20} style={{ color: '#ccc' }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ============================================
// Entity Profiles Tab
// ============================================
const EntityProfiles = ({ entities, fetchEntities, userId, customRelTypes }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const blank = { name: '', relationship_type: 'other', notes: '', color: '#6b8e9b', is_group: false, group_description: '', group_members: [] };
  const startNew = () => { setForm(blank); setEditing('new'); };
  const startEdit = (e) => { setForm({ ...e }); setEditing(e.id); };
  const cancel = () => { setEditing(null); setForm({}); };

  const saveEntity = async () => {
    const payload = { ...form, user_id: userId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    delete payload.log_count; delete payload.confidence_level; delete payload.last_log_date;
    if (editing === 'new') {
      await supabase.from('ifs_entities').insert(payload);
    } else {
      await supabase.from('ifs_entities').update(payload).eq('id', editing);
    }
    cancel(); fetchEntities();
  };

  const deleteEntity = async (id) => {
    if (!confirm('Delete this entity and all linked data?')) return;
    await supabase.from('ifs_entities').delete().eq('id', id);
    fetchEntities();
  };

  if (editing) {
    return (
      <div style={s.card}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{editing === 'new' ? (form.is_group ? 'Add Group' : 'Add Person') : `Edit: ${form.name}`}</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_group || false} onChange={e => setForm({ ...form, is_group: e.target.checked })} />
            This is a group (e.g., "Softball parents", "Old band", "Staff meeting")
          </label>
        </div>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>{form.is_group ? 'Group Name' : 'Name'}</label>
            <input style={s.input} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={form.is_group ? 'e.g., Willard softball parents' : 'Name or identifier'} />
          </div>
          <div style={s.col}>
            <label style={s.label}>Type</label>
            <select style={{ ...s.select, width: '100%' }} value={form.relationship_type || 'other'} onChange={e => setForm({ ...form, relationship_type: e.target.value })}>
              {[...DEFAULT_RELATIONSHIP_TYPES, ...(customRelTypes || []).map(c => c.label)].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {form.is_group && (
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Group Description</label>
            <textarea style={s.textarea} value={form.group_description || ''} onChange={e => setForm({ ...form, group_description: e.target.value })}
              placeholder="Who is in this group? What context do you interact with them in?" />
            <label style={{ ...s.label, marginTop: '8px' }}>Members (select existing entities)</label>
            <div style={{ ...s.tagInput, gap: '8px' }}>
              {entities.filter(e => !e.is_group && e.id !== form.id).map(ent => {
                const isIn = (form.group_members || []).includes(ent.id);
                return (
                  <span key={ent.id} style={{ ...s.tag(isIn ? '#5a8abf' : '#ccc'), cursor: 'pointer', opacity: isIn ? 1 : 0.5 }}
                    onClick={() => {
                      const members = form.group_members || [];
                      setForm({ ...form, group_members: isIn ? members.filter(id => id !== ent.id) : [...members, ent.id] });
                    }}>
                    {ent.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={s.label}>Notes</label>
          <textarea style={s.textarea} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button style={s.btn('ghost')} onClick={cancel}><X size={14} /> Cancel</button>
          <button style={s.btn('primary')} onClick={saveEntity} disabled={!form.name?.trim()}><Save size={14} /> Save</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#888' }}>{entities.filter(e => !e.is_group).length} people, {entities.filter(e => e.is_group).length} groups</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btn('primary')} onClick={() => { setForm(blank); setEditing('new'); }}><UserPlus size={14} /> Person</button>
          <button style={s.btn('ghost')} onClick={() => { setForm({ ...blank, is_group: true }); setEditing('new'); }}><UsersRound size={14} /> Group</button>
        </div>
      </div>
      {entities.length === 0 ? (
        <div style={s.emptyState}>
          <User size={48} style={{ color: '#ccc', marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No entities yet</p>
          <p style={{ fontSize: '13px' }}>Entities are created automatically when you submit a log, or add one manually.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {entities.map(e => (
            <div key={e.id} style={{ ...s.card, borderLeft: `4px solid ${e.color || '#6b8e9b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={s.badge('#6b8e9b')}>{e.relationship_type}</span>
                    <span style={s.badge(e.confidence_level === 'high' ? '#4caf50' : e.confidence_level === 'medium' ? '#ff9800' : '#999')}>
                      {e.confidence_level} ({e.log_count} logs)
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{e.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={s.btn('ghost')} onClick={() => startEdit(e)}><Edit3 size={13} /></button>
                  <button style={s.btn('ghost')} onClick={() => deleteEntity(e.id)}><Trash2 size={13} style={{ color: '#d32f2f' }} /></button>
                </div>
              </div>
              {/* Hypothesized profile */}
              {e.vmeme_center && <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>vMeme: <strong>{e.vmeme_center}</strong></p>}
              {e.autonomic_baseline && <p style={{ fontSize: '12px', color: '#888' }}>Autonomic: <strong>{e.autonomic_baseline}</strong></p>}
              {e.affective_drive && <p style={{ fontSize: '12px', color: '#888' }}>Drive: <strong>{e.affective_drive}</strong></p>}
              {e.hypothesized_wound && <p style={{ fontSize: '12px', color: '#b06050', marginTop: '6px', fontStyle: 'italic' }}>Wound (hypothesis): {e.hypothesized_wound}</p>}
              {e.compassion_frame && <p style={{ fontSize: '12px', color: '#5c7a6f', fontStyle: 'italic' }}>Compassion: {e.compassion_frame}</p>}
              {e.observed_protectors?.length > 0 && (
                <div style={{ ...s.tagInput, marginTop: '8px' }}>
                  {e.observed_protectors.map((p, i) => <span key={i} style={s.tag('#6b8e9b')}>{p}</span>)}
                </div>
              )}
              <p style={{ fontSize: '11px', color: '#bbb', marginTop: '8px' }}>
                Disclaimer: Profile built from your observations only. Working hypothesis, not diagnosis.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Page Component
// ============================================
export default function InternalMechanic() {
  const [activeTab, setActiveTab] = useState('journal');
  const [parts, setParts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [entities, setEntities] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [customRelTypes, setCustomRelTypes] = useState([]);
  const [userId, setUserId] = useState(null);

  const fetchParts = async () => {
    const { data } = await supabase.from('ifs_parts').select('*').order('created_at', { ascending: true });
    if (data) setParts(data);
  };

  const fetchContracts = async () => {
    const { data } = await supabase.from('ifs_contracts').select('*').order('created_at', { ascending: false });
    if (data) setContracts(data);
  };

  const fetchRelationships = async () => {
    const { data } = await supabase.from('ifs_relationships').select('*').order('created_at', { ascending: true });
    if (data) setRelationships(data);
  };

  const fetchSessions = async () => {
    const { data } = await supabase.from('ifs_unburdening_sessions').select('*').order('started_at', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchEntities = async () => {
    const { data } = await supabase.from('ifs_entities').select('*').order('name', { ascending: true });
    if (data) setEntities(data);
  };

  const fetchAnalyses = async () => {
    const { data } = await supabase.from('ifs_analysis_results').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setAnalyses(data);
  };

  const fetchCustomRelTypes = async () => {
    const { data } = await supabase.from('ifs_relationship_types').select('*').order('label', { ascending: true });
    if (data) setCustomRelTypes(data);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetchParts();
        fetchContracts();
        fetchRelationships();
        fetchSessions();
        fetchEntities();
        fetchAnalyses();
        fetchCustomRelTypes();
      }
    };
    init();
  }, []);

  return (
    <div className="main-content" style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>The Internal Mechanic</h1>
        <p style={s.subtitle}>9-module relational intelligence engine — IFS × Polyvagal × Maté × Panksepp × Winnicott × Spiral × AQAL × Wu Wei</p>
      </div>

      <div style={s.tabs}>
        {TABS.map(tab => (
          <div key={tab.id} style={s.tab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {activeTab === 'journal' && <JournalTab entities={entities} fetchEntities={fetchEntities} userId={userId} customRelTypes={customRelTypes} fetchCustomRelTypes={fetchCustomRelTypes} />}
      {activeTab === 'log' && <LogSubmission entities={entities} fetchEntities={fetchEntities} fetchAnalyses={fetchAnalyses} userId={userId} customRelTypes={customRelTypes} />}
      {activeTab === 'analysis' && <AnalysisHistory analyses={analyses} entities={entities} fetchAnalyses={fetchAnalyses} />}
      {activeTab === 'entities' && <EntityProfiles entities={entities} fetchEntities={fetchEntities} userId={userId} customRelTypes={customRelTypes} />}
      {activeTab === 'parts' && <PartsRegistry parts={parts} setParts={setParts} fetchParts={fetchParts} userId={userId} />}
      {activeTab === 'board' && <VisualBoard parts={parts} relationships={relationships} fetchParts={fetchParts} fetchRelationships={fetchRelationships} />}
      {activeTab === 'contracts' && <ConsciousContracts contracts={contracts} parts={parts} fetchContracts={fetchContracts} userId={userId} />}
      {activeTab === 'unburdening' && <UnburdeningFlow parts={parts} sessions={sessions} fetchSessions={fetchSessions} userId={userId} />}
      {activeTab === 'relationships' && <RelationshipsTab relationships={relationships} parts={parts} fetchRelationships={fetchRelationships} userId={userId} customRelTypes={customRelTypes} />}
    </div>
  );
}
