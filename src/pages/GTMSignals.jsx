import { useState, useEffect } from 'react';
import { Target, TrendingUp, Mail, Search, RefreshCw, ChevronDown, ChevronUp, FileText, Zap, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SCORE_TIER_COLORS = {
  immediate: { bg: 'rgba(209,64,64,0.12)', color: '#d14040', label: 'Immediate' },
  nurture: { bg: 'rgba(196,154,64,0.12)', color: '#c49a40', label: 'Nurture' },
  watch: { bg: 'rgba(90,138,191,0.12)', color: '#5a8abf', label: 'Watch' },
  archive: { bg: 'rgba(158,154,151,0.12)', color: '#9e9a97', label: 'Archive' }
};

const SEVERITY_COLORS = {
  critical: '#d14040',
  high: '#c49a40',
  medium: '#5a8abf',
  low: '#9e9a97'
};

const GTMSignals = () => {
  const [tab, setTab] = useState('pipeline');
  const [accounts, setAccounts] = useState([]);
  const [signals, setSignals] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(null);
  const [dossierData, setDossierData] = useState({});
  const [outreachLoading, setOutreachLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'pipeline' || tab === 'accounts') {
        const { data: accts } = await supabase
          .from('gtm_intent_scores')
          .select('*')
          .order('composite_score', { ascending: false })
          .limit(100);
        setAccounts(accts || []);
      }

      if (tab === 'signals') {
        const { data: sigs } = await supabase
          .from('gtm_parsed_signals')
          .select('*')
          .order('parsed_at', { ascending: false })
          .limit(200);
        setSignals(sigs || []);
      }

      if (tab === 'outreach') {
        const { data: msgs } = await supabase
          .from('gtm_outreach_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setOutreach(msgs || []);
      }

      // Pipeline stats
      const [
        { count: reviewCount },
        { count: b2bCount },
        { count: jobCount },
        { count: signalCount },
        { count: scoredCount },
        { count: outreachCount }
      ] = await Promise.all([
        supabase.from('gtm_mobile_reviews').select('*', { count: 'exact', head: true }),
        supabase.from('gtm_b2b_reviews').select('*', { count: 'exact', head: true }),
        supabase.from('gtm_job_postings').select('*', { count: 'exact', head: true }),
        supabase.from('gtm_parsed_signals').select('*', { count: 'exact', head: true }),
        supabase.from('gtm_intent_scores').select('*', { count: 'exact', head: true }),
        supabase.from('gtm_outreach_messages').select('*', { count: 'exact', head: true })
      ]);
      setPipelineStats({
        reviews: (reviewCount || 0) + (b2bCount || 0),
        jobs: jobCount || 0,
        signals: signalCount || 0,
        scored: scoredCount || 0,
        outreach: outreachCount || 0
      });
    } catch (err) {
      console.error('GTM load error:', err);
    }
    setLoading(false);
  };

  const runPipeline = async () => {
    setRunningPipeline(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/gtm/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });
      const result = await res.json();
      if (result.success) loadData();
      else alert('Pipeline error: ' + (result.error || 'Unknown'));
    } catch (err) {
      alert('Pipeline failed: ' + err.message);
    }
    setRunningPipeline(false);
  };

  const generateDossier = async (companyName) => {
    setDossierLoading(companyName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/gtm/dossier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ company_name: companyName })
      });
      const result = await res.json();
      if (result.success) {
        setDossierData(prev => ({ ...prev, [companyName]: result.dossier }));
      }
    } catch (err) {
      console.error('Dossier error:', err);
    }
    setDossierLoading(null);
  };

  const generateOutreach = async (companyName) => {
    setOutreachLoading(companyName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/gtm/outreach/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ company_name: companyName })
      });
      const result = await res.json();
      if (result.success) loadData();
    } catch (err) {
      console.error('Outreach error:', err);
    }
    setOutreachLoading(null);
  };

  const filtered = (tab === 'accounts' ? accounts : []).filter(a =>
    !searchTerm || a.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>GTM Signal Intelligence</h1>
        <button
          onClick={runPipeline}
          disabled={runningPipeline}
          className="glass-panel"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: runningPipeline ? 'rgba(196,154,64,0.2)' : 'rgba(106,171,110,0.15)', color: '#e8e4e0' }}
        >
          <RefreshCw size={16} className={runningPipeline ? 'spinning' : ''} />
          {runningPipeline ? 'Running Pipeline...' : 'Run Full Pipeline'}
        </button>
      </div>

      {/* Pipeline Stats */}
      {pipelineStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Reviews Ingested', value: pipelineStats.reviews, icon: <FileText size={16} /> },
            { label: 'Jobs Ingested', value: pipelineStats.jobs, icon: <Zap size={16} /> },
            { label: 'Signals Parsed', value: pipelineStats.signals, icon: <AlertCircle size={16} /> },
            { label: 'Accounts Scored', value: pipelineStats.scored, icon: <Target size={16} /> },
            { label: 'Outreach Drafts', value: pipelineStats.outreach, icon: <Mail size={16} /> }
          ].map(stat => (
            <div key={stat.label} className="glass-panel" style={{ padding: 16, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ color: '#9e9a97', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {stat.icon} {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e8e4e0' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
        {[
          { key: 'pipeline', label: 'Pipeline', icon: <TrendingUp size={14} /> },
          { key: 'accounts', label: 'Accounts', icon: <Target size={14} /> },
          { key: 'signals', label: 'Signals', icon: <Zap size={14} /> },
          { key: 'outreach', label: 'Outreach', icon: <Mail size={14} /> }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: tab === t.key ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              color: tab === t.key ? '#e8e4e0' : '#9e9a97', fontSize: 13, fontWeight: tab === t.key ? 600 : 400
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9e9a97' }}>Loading...</div>
      ) : (
        <>
          {/* Pipeline View — Tier breakdown */}
          {tab === 'pipeline' && (
            <div>
              {['immediate', 'nurture', 'watch', 'archive'].map(tier => {
                const tierAccounts = accounts.filter(a => a.score_tier === tier);
                if (!tierAccounts.length) return null;
                const tierStyle = SCORE_TIER_COLORS[tier];
                return (
                  <div key={tier} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ background: tierStyle.bg, color: tierStyle.color, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {tierStyle.label}
                      </span>
                      <span style={{ color: '#9e9a97', fontSize: 12 }}>{tierAccounts.length} accounts</span>
                    </div>
                    {tierAccounts.map(account => (
                      <AccountCard
                        key={account.company_name}
                        account={account}
                        expanded={expandedAccount === account.company_name}
                        onToggle={() => setExpandedAccount(expandedAccount === account.company_name ? null : account.company_name)}
                        onDossier={() => generateDossier(account.company_name)}
                        onOutreach={() => generateOutreach(account.company_name)}
                        dossier={dossierData[account.company_name]}
                        dossierLoading={dossierLoading === account.company_name}
                        outreachLoading={outreachLoading === account.company_name}
                      />
                    ))}
                  </div>
                );
              })}
              {!accounts.length && (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center', borderRadius: 12, color: '#9e9a97' }}>
                  No scored accounts yet. Ingest data and run the pipeline to see results.
                </div>
              )}
            </div>
          )}

          {/* Accounts View — Searchable list */}
          {tab === 'accounts' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Search size={14} style={{ color: '#9e9a97' }} />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#e8e4e0', fontSize: 13, flex: 1, outline: 'none' }}
                  />
                </div>
              </div>
              {filtered.map(account => (
                <AccountCard
                  key={account.company_name}
                  account={account}
                  expanded={expandedAccount === account.company_name}
                  onToggle={() => setExpandedAccount(expandedAccount === account.company_name ? null : account.company_name)}
                  onDossier={() => generateDossier(account.company_name)}
                  onOutreach={() => generateOutreach(account.company_name)}
                  dossier={dossierData[account.company_name]}
                  dossierLoading={dossierLoading === account.company_name}
                  outreachLoading={outreachLoading === account.company_name}
                />
              ))}
            </div>
          )}

          {/* Signals View — Recent parsed signals */}
          {tab === 'signals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {signals.map(signal => (
                <div key={signal.id} className="glass-panel" style={{ padding: 14, borderRadius: 10, borderLeft: `3px solid ${SEVERITY_COLORS[signal.severity] || '#9e9a97'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e4e0' }}>{signal.company_name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(90,138,191,0.15)', color: '#5a8abf' }}>
                        {signal.pain_point_category?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${SEVERITY_COLORS[signal.severity]}20`, color: SEVERITY_COLORS[signal.severity] }}>
                        {signal.severity}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#b0aca8', marginBottom: 4 }}>{signal.pain_point_description}</div>
                  {signal.evidence_quote && (
                    <div style={{ fontSize: 11, color: '#8a8682', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: 8 }}>
                      "{signal.evidence_quote?.slice(0, 200)}"
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#6a6662' }}>
                    <span>Service: {signal.labno_service_match?.replace(/_/g, ' ')}</span>
                    <span>Confidence: {Math.round((signal.confidence_score || 0) * 100)}%</span>
                    <span>{signal.source_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outreach View — Draft messages */}
          {tab === 'outreach' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {outreach.map(msg => (
                <div key={msg.id} className="glass-panel" style={{ padding: 14, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e4e0' }}>{msg.subject_line || 'No subject'}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(106,171,110,0.15)', color: '#6aab6e' }}>
                        {msg.status}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(90,138,191,0.15)', color: '#5a8abf' }}>
                        {msg.channel}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#b0aca8', whiteSpace: 'pre-wrap' }}>{msg.body_text}</div>
                  {msg.personalization_data?.personalization_score && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#6a6662' }}>
                      Personalization: {msg.personalization_data.personalization_score}/5 | Template: {msg.template_type}
                    </div>
                  )}
                </div>
              ))}
              {!outreach.length && (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center', borderRadius: 12, color: '#9e9a97' }}>
                  No outreach drafts yet. Score accounts and generate outreach from the Pipeline tab.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AccountCard = ({ account, expanded, onToggle, onDossier, onOutreach, dossier, dossierLoading, outreachLoading }) => {
  const tier = SCORE_TIER_COLORS[account.score_tier] || SCORE_TIER_COLORS.archive;
  const topSignals = account.top_signals || [];

  return (
    <div className="glass-panel" style={{ padding: 14, borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${tier.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e4e0' }}>{account.company_name}</div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tier.bg, color: tier.color, fontWeight: 700, fontSize: 14 }}>
            {Math.round(account.composite_score)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#9e9a97' }}>{account.signal_count} signals</span>
          <button
            onClick={e => { e.stopPropagation(); onDossier(); }}
            disabled={dossierLoading}
            style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(90,138,191,0.15)', color: '#5a8abf', cursor: 'pointer' }}
          >
            {dossierLoading ? '...' : 'Dossier'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOutreach(); }}
            disabled={outreachLoading}
            style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(106,171,110,0.15)', color: '#6aab6e', cursor: 'pointer' }}
          >
            {outreachLoading ? '...' : 'Draft Outreach'}
          </button>
          {expanded ? <ChevronUp size={14} color="#9e9a97" /> : <ChevronDown size={14} color="#9e9a97" />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Score breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Recency', value: account.recency_score },
              { label: 'Frequency', value: account.frequency_score },
              { label: 'Depth', value: account.depth_score },
              { label: 'Seniority', value: account.seniority_score }
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6a6662' }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e4e0' }}>{Math.round(s.value || 0)}</div>
              </div>
            ))}
          </div>

          {/* Top signals */}
          {topSignals.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#6a6662', marginBottom: 6 }}>Top Signals:</div>
              {topSignals.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#b0aca8', marginBottom: 4, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${SEVERITY_COLORS[s.severity]}20`, color: SEVERITY_COLORS[s.severity], whiteSpace: 'nowrap' }}>
                    {s.severity}
                  </span>
                  <span>{s.category?.replace(/_/g, ' ')} — {s.service_match?.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dossier */}
          {dossier && (
            <div style={{ background: 'rgba(90,138,191,0.06)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5a8abf', marginBottom: 6 }}>{dossier.headline}</div>
              <div style={{ fontSize: 12, color: '#b0aca8', marginBottom: 8 }}>{dossier.pain_summary}</div>
              <div style={{ fontSize: 11, color: '#6a6662' }}>
                <div><strong>Lead with:</strong> {dossier.primary_pain}</div>
                <div><strong>Angle:</strong> {dossier.recommended_angle}</div>
                <div><strong>Channel:</strong> {dossier.suggested_outreach_channel}</div>
                {dossier.urgency_note && <div><strong>Urgency:</strong> {dossier.urgency_note}</div>}
              </div>
              {dossier.supporting_evidence?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: '#6a6662', marginBottom: 4 }}>Evidence:</div>
                  {dossier.supporting_evidence.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#8a8682', fontStyle: 'italic', marginBottom: 2 }}>"{e}"</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GTMSignals;
