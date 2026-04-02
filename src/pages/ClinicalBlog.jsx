import { useState, useEffect } from 'react';
import { FileText, Send, RefreshCw, Rss, Trash2, Clock, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ClinicalBlog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soapNote, setSoapNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    const { data, error: fetchErr } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!fetchErr && data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const generatePost = async () => {
    if (soapNote.trim().length < 50) { setError('SOAP note must be at least 50 characters.'); return; }
    setGenerating(true); setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Not authenticated.'); setGenerating(false); return; }

      const res = await fetch('/api/sniper/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ soap_note: soapNote })
      });
      const data = await res.json();

      if (data.status === 'success' && data.post) {
        const post = data.post;
        const { error: insertErr } = await supabase.from('blog_posts').insert({
          title: post.title,
          slug: post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          excerpt: post.excerpt || '',
          content: post.markdown_body,
          author: 'Lance Labno, DPT',
          category: post.category || 'Clinical Pearls',
          status: 'draft',
          published_at: null
        });
        if (insertErr) setError('Generated but failed to save: ' + insertErr.message);
        else { setSoapNote(''); await fetchPosts(); }
      } else {
        setError(data.error || 'Generation failed.');
      }
    } catch (e) {
      setError('Network error: ' + e.message);
    }
    setGenerating(false);
  };

  const togglePublish = async (post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const updates = { status: newStatus };
    if (newStatus === 'published' && !post.published_at) updates.published_at = new Date().toISOString();
    await supabase.from('blog_posts').update(updates).eq('id', post.id);
    await fetchPosts();
    if (selectedPost?.id === post.id) setSelectedPost({ ...post, ...updates });
  };

  const deletePost = async (id) => {
    await supabase.from('blog_posts').delete().eq('id', id);
    if (selectedPost?.id === id) setSelectedPost(null);
    await fetchPosts();
  };

  const sc = (status) => status === 'published'
    ? { bg: 'rgba(106,171,110,0.15)', color: '#6aab6e' }
    : { bg: 'rgba(196,154,64,0.15)', color: '#c49a40' };

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} /> Clinical Blog + Sniper Agent
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.85rem', marginTop: '4px' }}>
            SOAP notes in, HIPAA-safe blog posts out. Powered by the Sniper Agent.
          </p>
        </div>
        <a href="/api/rss" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b06050', fontSize: '0.85rem', textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.2)', background: 'rgba(176,96,80,0.05)' }}>
          <Rss size={14} /> RSS Feed
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPost ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* SOAP Input */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px' }}>Generate from SOAP Note</h3>
            <textarea value={soapNote} onChange={e => setSoapNote(e.target.value)}
              placeholder="Paste a SOAP note here. The Sniper Agent will strip all HIPAA identifiers and generate an anonymous clinical blog post..."
              style={{ width: '100%', minHeight: '140px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            {error && <p style={{ color: '#d32f2f', fontSize: '0.8rem', marginTop: '8px' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9e9a97' }}>{soapNote.length} chars {soapNote.length < 50 ? '(min 50)' : ''}</span>
              <button onClick={generatePost} disabled={generating || soapNote.length < 50} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', opacity: generating || soapNote.length < 50 ? 0.5 : 1 }}>
                {generating ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Send size={14} /> Generate Post</>}
              </button>
            </div>
          </div>

          {/* Post List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px' }}>All Posts ({posts.length})</h3>
            {loading ? <p style={{ color: '#8a8682', fontSize: '0.85rem' }}>Loading...</p>
            : posts.length === 0 ? <p style={{ color: '#8a8682', fontSize: '0.85rem' }}>No posts yet. Generate your first one above.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posts.map(post => {
                  const s = sc(post.status);
                  return (
                    <div key={post.id} onClick={() => setSelectedPost(post)}
                      style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                        background: selectedPost?.id === post.id ? 'rgba(176,96,80,0.08)' : 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s ease',
                        borderLeft: selectedPost?.id === post.id ? '3px solid #b06050' : '3px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1d1c' }}>{post.title}</h4>
                          {post.excerpt && <p style={{ fontSize: '0.78rem', color: '#6b6764', marginTop: '4px' }}>{post.excerpt}</p>}
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: s.bg, color: s.color, fontWeight: 500, flexShrink: 0, marginLeft: '8px' }}>{post.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.72rem', color: '#9e9a97' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {post.created_at ? new Date(post.created_at).toLocaleDateString() : '-'}</span>
                        {post.category && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Tag size={10} /> {post.category}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>}
          </div>
        </div>

        {/* Preview Pane */}
        {selectedPost && (
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem', maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2e2c2a', flex: 1 }}>{selectedPost.title}</h3>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => togglePublish(selectedPost)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                    background: selectedPost.status === 'published' ? 'rgba(196,154,64,0.15)' : 'rgba(106,171,110,0.15)',
                    color: selectedPost.status === 'published' ? '#c49a40' : '#6aab6e' }}>
                  {selectedPost.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deletePost(selectedPost.id)}
                  style={{ padding: '6px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(211,47,47,0.1)', color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {selectedPost.excerpt && (
              <p style={{ fontSize: '0.9rem', color: '#6b6764', fontStyle: 'italic', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{selectedPost.excerpt}</p>
            )}
            <div style={{ fontSize: '0.88rem', color: '#2e2c2a', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedPost.content || 'No content body.'}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '0.75rem', color: '#9e9a97' }}>
              <span>{selectedPost.author}</span><span>|</span><span>{selectedPost.category}</span>
              {selectedPost.published_at && <><span>|</span><span>Published {new Date(selectedPost.published_at).toLocaleDateString()}</span></>}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ClinicalBlog;
