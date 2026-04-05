import { useState, useEffect } from 'react';
import { Layers, ArrowRight, FileText, Lightbulb, Pencil, CheckCircle, BookOpen, Eye } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import Breadcrumbs from '../components/Breadcrumbs';
import { supabase } from '../lib/supabase';

const FILTERS = ['All Sources', 'Wishlist Only', 'Agent Only', 'Oracle Only'];

const COLUMNS = [
  { key: 'ideas', label: 'Ideas', icon: Lightbulb, color: '#c49a40' },
  { key: 'drafting', label: 'Drafting', icon: Pencil, color: '#5a8abf' },
  { key: 'review', label: 'Review', icon: Eye, color: '#b06050' },
  { key: 'published', label: 'Published', icon: BookOpen, color: '#2d8a4e' },
];

const SOURCE_BADGES = {
  wishlist: { label: 'Wishlist', bg: '#fff3e0', color: '#e65100' },
  agent: { label: 'Agent Run', bg: '#e3f2fd', color: '#1565c0' },
  oracle: { label: 'Oracle SOP', bg: '#e8f5e9', color: '#2e7d32' },
  brief: { label: 'Session Brief', bg: '#f3e5f5', color: '#7b1fa2' },
};

const isContentRelated = (text) => {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('blog') || t.includes('content') || t.includes('sniper') || t.includes('article') || t.includes('seo') || t.includes('post');
};

const truncate = (str, len = 120) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ContentPipeline() {
  const [items, setItems] = useState({ ideas: [], drafting: [], review: [], published: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Sources');
  const [expandedCard, setExpandedCard] = useState(null);

  const fetchData = async () => {
    setLoading(true);

    const [wishlistRes, agentRunsRes, oracleRes, briefsRes] = await Promise.all([
      supabase.from('wishlist').select('*').order('created_at', { ascending: false }),
      supabase.from('agent_runs').select('*').order('created_at', { ascending: false }),
      supabase.from('oracle_sops').select('*').order('created_at', { ascending: false }),
      supabase.from('session_briefs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const wishlist = wishlistRes.data || [];
    const agentRuns = agentRunsRes.data || [];
    const oracleSops = oracleRes.data || [];
    const briefs = briefsRes.data || [];

    const ideas = [];
    const drafting = [];
    const review = [];
    const published = [];

    // Wishlist items
    wishlist.forEach((w) => {
      const typeMatch = w.type && (w.type.toLowerCase().includes('content') || w.type.toLowerCase().includes('blog'));
      const textMatch = isContentRelated(w.raw_text) || isContentRelated(w.title);
      if (!typeMatch && !textMatch) return;

      const card = {
        id: `wishlist-${w.id}`,
        dbId: w.id,
        table: 'wishlist',
        title: w.title || truncate(w.raw_text, 60) || 'Untitled Idea',
        preview: truncate(w.raw_text || w.title),
        source: 'wishlist',
        date: w.created_at,
        status: w.status,
        fullContent: w.raw_text || w.title || '',
      };

      if (w.status === 'In Review') review.push(card);
      else if (w.status === 'In Progress') drafting.push(card);
      else if (w.status === 'Completed') published.push(card);
      else ideas.push(card); // New Idea, Deferred, etc.
    });

    // Agent runs
    agentRuns.forEach((r) => {
      if (!isContentRelated(r.task_title)) return;

      const card = {
        id: `agent-${r.id}`,
        dbId: r.id,
        table: 'agent_runs',
        title: r.task_title || 'Agent Run',
        preview: truncate(r.result_summary || r.task_title),
        source: 'agent',
        date: r.created_at,
        status: r.status,
        fullContent: r.result_summary || r.task_title || '',
      };

      if (r.status === 'running' || r.status === 'pending') drafting.push(card);
      else if (r.status === 'completed') review.push(card);
      else if (r.status === 'published') published.push(card);
      else ideas.push(card);
    });

    // Oracle SOPs — always published
    oracleSops.forEach((s) => {
      published.push({
        id: `oracle-${s.id}`,
        dbId: s.id,
        table: 'oracle_sops',
        title: s.title || s.topic || 'SOP',
        preview: truncate(s.content || s.summary || s.topic),
        source: 'oracle',
        date: s.created_at || s.updated_at,
        status: 'published',
        fullContent: s.content || s.summary || '',
      });
    });

    // Session briefs with content wins
    briefs.forEach((b) => {
      if (!isContentRelated(b.the_win)) return;
      ideas.push({
        id: `brief-${b.id}`,
        dbId: b.id,
        table: 'session_briefs',
        title: truncate(b.the_win, 60),
        preview: truncate(b.the_win),
        source: 'brief',
        date: b.created_at,
        status: 'insight',
        fullContent: b.the_win || '',
      });
    });

    setItems({ ideas, drafting, review, published });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const applyFilter = (cards) => {
    if (filter === 'All Sources') return cards;
    if (filter === 'Wishlist Only') return cards.filter((c) => c.source === 'wishlist');
    if (filter === 'Agent Only') return cards.filter((c) => c.source === 'agent');
    if (filter === 'Oracle Only') return cards.filter((c) => c.source === 'oracle');
    return cards;
  };

  const moveToNextStage = async (card, currentColumn) => {
    const stageOrder = ['ideas', 'drafting', 'review', 'published'];
    const currentIdx = stageOrder.indexOf(currentColumn);
    if (currentIdx >= stageOrder.length - 1) return;

    const nextStage = stageOrder[currentIdx + 1];

    // Update status in database for wishlist items
    if (card.table === 'wishlist') {
      const statusMap = { drafting: 'In Progress', review: 'In Review', published: 'Completed' };
      const newStatus = statusMap[nextStage];
      if (newStatus) {
        await supabase.from('wishlist').update({ status: newStatus }).eq('id', card.dbId);
      }
    }

    // Move card locally
    setItems((prev) => {
      const updated = { ...prev };
      updated[currentColumn] = prev[currentColumn].filter((c) => c.id !== card.id);
      updated[nextStage] = [{ ...card, status: nextStage }, ...prev[nextStage]];
      return updated;
    });
  };

  const stats = {
    ideas: applyFilter(items.ideas).length,
    drafting: applyFilter(items.drafting).length,
    review: applyFilter(items.review).length,
    published: applyFilter(items.published).length,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Breadcrumbs />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Layers size={22} color="#b06050" />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2e2c2a', margin: 0 }}>Content Pipeline</h1>
        <InfoTooltip text={PAGE_INFO.contentPipeline || 'Unified view of content flowing from idea to published across Wishlist, Agent Runs, and Oracle SOPs.'} />
      </div>
      <p style={{ color: '#8a8682', fontSize: '0.82rem', margin: '0 0 20px 0' }}>
        Track content from spark to publication across all sources.
      </p>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {COLUMNS.map((col) => (
          <div key={col.key} className="glass-panel" style={{ flex: '1 1 140px', padding: '14px 18px', textAlign: 'center', minWidth: '120px' }}>
            <col.icon size={18} color={col.color} style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: col.color }}>{stats[col.key]}</div>
            <div style={{ fontSize: '0.72rem', color: '#8a8682', fontWeight: 600 }}>{col.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className="filter-pill"
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: filter === f ? '#b06050' : 'rgba(0,0,0,0.04)',
              color: filter === f ? '#fff' : '#8a8682',
              transition: 'all 0.15s ease',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8a8682' }}>Loading pipeline...</div>
      ) : (
        /* Kanban Columns */
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {COLUMNS.map((col) => {
            const cards = applyFilter(items[col.key]);
            return (
              <div key={col.key} style={{ flex: '1 1 280px', minWidth: '260px' }}>
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px' }}>
                  <col.icon size={16} color={col.color} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2e2c2a' }}>{col.label}</span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600, color: col.color,
                    background: `${col.color}15`, padding: '2px 8px', borderRadius: '10px',
                  }}>
                    {cards.length}
                  </span>
                  {col.key !== 'published' && col.key !== 'ideas' && (
                    <ArrowRight size={12} color="#ccc" style={{ marginLeft: 'auto' }} />
                  )}
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cards.length === 0 && (
                    <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: '#b0ada9', fontSize: '0.78rem' }}>
                      No items
                    </div>
                  )}
                  {cards.map((card) => {
                    const badge = SOURCE_BADGES[card.source];
                    const isExpanded = expandedCard === card.id;
                    return (
                      <div
                        key={card.id}
                        className="glass-panel"
                        style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.12s ease' }}
                        onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                      >
                        {/* Source Badge + Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                            background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {badge.label}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#b0ada9' }}>{formatDate(card.date)}</span>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '4px', lineHeight: 1.35 }}>
                          {card.title}
                        </div>

                        {/* Preview */}
                        <div style={{ fontSize: '0.72rem', color: '#8a8682', lineHeight: 1.45, marginBottom: isExpanded ? '10px' : '0' }}>
                          {isExpanded ? card.fullContent : card.preview}
                        </div>

                        {/* Move Button (visible when expanded, not on published) */}
                        {isExpanded && col.key !== 'published' && (
                          <button
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveToNextStage(card, col.key);
                              setExpandedCard(null);
                            }}
                            style={{
                              marginTop: '8px',
                              padding: '6px 14px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              width: '100%',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowRight size={13} />
                            Move to {COLUMNS[COLUMNS.findIndex((c) => c.key === col.key) + 1]?.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
