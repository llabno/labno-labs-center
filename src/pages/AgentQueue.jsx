import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquareWarning, Send, SkipForward, CheckCircle2, Clock, HelpCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import Breadcrumbs from '../components/Breadcrumbs';
import { supabase } from '../lib/supabase';

const AgentQueue = () => {
  const [pendingRuns, setPendingRuns] = useState([]);
  const [resolvedRuns, setResolvedRuns] = useState([]);
  const [responses, setResponses] = useState({});
  const [sending, setSending] = useState({});
  const [expandedResolved, setExpandedResolved] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);

    // Fetch runs needing input: status = 'needs_input' OR failed with question-like errors
    const { data: needsInput } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('status', 'needs_input')
      .order('created_at', { ascending: false });

    const { data: failedWithQ } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter failed runs that contain questions or "need"/"require" in the error
    const questionPattern = /\?|need|require/i;
    const filteredFailed = (failedWithQ || []).filter(r =>
      r.error && questionPattern.test(r.error)
    );

    // Combine and deduplicate
    const allPending = [...(needsInput || []), ...filteredFailed];
    const seen = new Set();
    const deduped = allPending.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    setPendingRuns(deduped);

    // Fetch recently resolved (requeued runs from today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: resolved } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('status', 'requeued')
      .gte('updated_at', todayStart.toISOString())
      .order('updated_at', { ascending: false })
      .limit(25);

    setResolvedRuns(resolved || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = resolvedRuns.filter(r => new Date(r.updated_at) >= todayStart).length;
    return {
      pending: pendingRuns.length,
      resolvedToday,
      totalResolved: resolvedRuns.length,
    };
  }, [pendingRuns, resolvedRuns]);

  // Extract questions from a run
  const getQuestions = (run) => {
    // Check agent_questions JSONB first
    if (run.agent_questions && Array.isArray(run.agent_questions)) {
      return run.agent_questions;
    }
    if (run.agent_questions && run.agent_questions.questions) {
      return run.agent_questions.questions;
    }
    // Fall back to parsing error/result for question marks
    const text = run.error || run.result || '';
    const sentences = text.split(/[.!]\s+|[\n]/);
    const questions = sentences.filter(s => s.includes('?')).map(s => s.trim()).filter(Boolean);
    if (questions.length > 0) return questions;
    // Return the full error as the question
    return [text || 'Agent needs additional input to continue.'];
  };

  // Extract suggested responses from agent_questions
  const getSuggestions = (run) => {
    if (run.agent_questions && run.agent_questions.suggestions) {
      return run.agent_questions.suggestions;
    }
    if (run.agent_questions && Array.isArray(run.agent_questions) && run.agent_questions[0]?.suggestions) {
      return run.agent_questions[0].suggestions;
    }
    return [];
  };

  // Get Q&A pairs from resolved runs
  const getQAPairs = (run) => {
    if (run.result && typeof run.result === 'string') {
      try {
        const parsed = JSON.parse(run.result);
        if (parsed.qa_pairs) return parsed.qa_pairs;
      } catch { /* not JSON */ }
    }
    if (run.agent_questions) {
      const questions = getQuestions(run);
      const answer = run.result || 'Response sent';
      return [{ question: questions[0], answer }];
    }
    return [];
  };

  const handleRespond = async (run) => {
    const responseText = responses[run.id];
    if (!responseText?.trim()) return;

    setSending(prev => ({ ...prev, [run.id]: true }));

    try {
      // Update the agent_run with status='requeued' and store Q&A
      const questions = getQuestions(run);
      const qaPairs = questions.map(q => ({ question: q, answer: responseText }));

      await supabase
        .from('agent_runs')
        .update({
          status: 'requeued',
          result: JSON.stringify({ qa_pairs: qaPairs, human_response: responseText }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      // Re-dispatch the agent with the response as additional context
      await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_title: run.task_title,
          project_name: run.project_name,
          additional_context: `Human response to agent question: "${responseText}"\n\nOriginal question(s): ${questions.join('; ')}`,
          parent_run_id: run.id,
        }),
      });

      // Clear response and refresh
      setResponses(prev => ({ ...prev, [run.id]: '' }));
      await fetchQueue();
    } catch (err) {
      console.error('Failed to send response:', err);
    } finally {
      setSending(prev => ({ ...prev, [run.id]: false }));
    }
  };

  const handleSkip = async (run) => {
    await supabase
      .from('agent_runs')
      .update({
        status: 'requeued',
        result: JSON.stringify({ skipped: true, note: 'Human skipped this question' }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    await fetchQueue();
  };

  const handleSuggestionClick = (runId, suggestion) => {
    setResponses(prev => ({ ...prev, [runId]: suggestion }));
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <Breadcrumbs />

      <h1 data-highlight="agent-needs-input" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MessageSquareWarning size={22} color="#b06050" /> Agent Confirmation Queue
        <InfoTooltip text="Agents post questions here when they cannot complete a task autonomously. Respond to unblock them, or skip to dismiss." />
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#8a8682', marginBottom: '1.25rem' }}>
        Review and respond to agent questions. Your answers re-dispatch the agent with additional context.
      </p>

      {/* Stats Bar */}
      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={16} color="#e8a87c" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stats.pending}</span>
          <span style={{ fontSize: '0.78rem', color: '#8a8682' }}>pending</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#6abf69" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stats.resolvedToday}</span>
          <span style={{ fontSize: '0.78rem', color: '#8a8682' }}>resolved today</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#7a8ba8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stats.totalResolved}</span>
          <span style={{ fontSize: '0.78rem', color: '#8a8682' }}>total resolved</span>
        </div>
        <button
          onClick={fetchQueue}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#8a8682', fontSize: '0.75rem' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && pendingRuns.length === 0 && resolvedRuns.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#8a8682' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
          <p>Loading agent queue...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && pendingRuns.length === 0 && resolvedRuns.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckCircle2 size={32} color="#6abf69" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>All clear</h3>
          <p style={{ fontSize: '0.85rem', color: '#8a8682', maxWidth: '400px', margin: '0 auto' }}>
            No agents are waiting for input. When an agent encounters a question it cannot resolve, it will appear here.
          </p>
        </div>
      )}

      {/* Pending Questions */}
      {pendingRuns.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} color="#e8a87c" /> Pending Questions
            <span className="filter-pill active" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{pendingRuns.length}</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingRuns.map(run => {
              const questions = getQuestions(run);
              const suggestions = getSuggestions(run);
              const isSending = sending[run.id];

              return (
                <div key={run.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #e8a87c' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{run.task_title || 'Untitled Task'}</span>
                      {run.project_name && (
                        <span style={{ fontSize: '0.68rem', marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#8a8682' }}>
                          {run.project_name}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{timeAgo(run.created_at)}</span>
                  </div>

                  {/* Questions */}
                  <div style={{ background: 'rgba(232,168,124,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.85rem' }}>
                    {questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: i < questions.length - 1 ? '8px' : 0, alignItems: 'flex-start' }}>
                        <MessageSquareWarning size={14} color="#e8a87c" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{q}</span>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {suggestions.slice(0, 3).map((s, i) => (
                        <button
                          key={i}
                          className="filter-pill"
                          onClick={() => handleSuggestionClick(run.id, s)}
                          style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Response Input */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      value={responses[run.id] || ''}
                      onChange={e => setResponses(prev => ({ ...prev, [run.id]: e.target.value }))}
                      placeholder="Type your response to the agent..."
                      rows={2}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        background: 'rgba(255,255,255,0.5)',
                        fontSize: '0.85rem',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                        outline: 'none',
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.metaKey) handleRespond(run);
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleRespond(run)}
                        disabled={isSending || !responses[run.id]?.trim()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '0.82rem', opacity: isSending || !responses[run.id]?.trim() ? 0.5 : 1 }}
                      >
                        <Send size={13} /> {isSending ? 'Sending...' : 'Send'}
                      </button>
                      <button
                        onClick={() => handleSkip(run)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                          fontSize: '0.72rem', background: 'none', border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px', cursor: 'pointer', color: '#8a8682', justifyContent: 'center',
                        }}
                      >
                        <SkipForward size={11} /> Skip
                      </button>
                    </div>
                  </div>

                  {/* Cmd+Enter hint */}
                  <div style={{ fontSize: '0.65rem', color: '#b5b0aa', marginTop: '6px' }}>
                    Press Cmd+Enter to send
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Resolved */}
      {resolvedRuns.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#6abf69" /> Recently Resolved
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resolvedRuns.map(run => {
              const qaPairs = getQAPairs(run);
              const isExpanded = expandedResolved === run.id;

              return (
                <div key={run.id} className="glass-panel" style={{ padding: '0.85rem 1.1rem', borderLeft: '3px solid #6abf69', opacity: 0.85 }}>
                  <div
                    onClick={() => setExpandedResolved(isExpanded ? null : run.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    {isExpanded ? <ChevronDown size={14} color="#8a8682" /> : <ChevronRight size={14} color="#8a8682" />}
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1 }}>{run.task_title || 'Untitled Task'}</span>
                    {run.project_name && (
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#8a8682' }}>
                        {run.project_name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{formatTime(run.updated_at)}</span>
                  </div>

                  {isExpanded && qaPairs.length > 0 && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(106,191,105,0.04)', borderRadius: '8px' }}>
                      {qaPairs.map((qa, i) => (
                        <div key={i} style={{ marginBottom: i < qaPairs.length - 1 ? '10px' : 0 }}>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'flex-start' }}>
                            <HelpCircle size={13} color="#e8a87c" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#6b6560' }}>{qa.question}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', paddingLeft: '2px' }}>
                            <Send size={12} color="#6abf69" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{qa.answer}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && qaPairs.length === 0 && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#8a8682', fontStyle: 'italic' }}>
                      Skipped or no Q&A data recorded.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentQueue;
