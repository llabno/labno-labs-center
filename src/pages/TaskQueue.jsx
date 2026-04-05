import { useState, useMemo, useCallback, useEffect } from 'react';
import { LayoutList, Columns, Waypoints, List, GitBranch, Zap, Shield, XCircle, Copy, Check, Clock, Play, Terminal } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';

// ─── TRIGGER READINESS ────────────────────────────────────────────────────────
// auto     = Claude Code can run end-to-end autonomously
// gated    = Claude generates, human reviews before merge/deploy
// manual   = Requires clinical judgment, HIPAA, or complex external integration

const TRIGGER_META = {
  auto:   { label: 'Auto', color: '#2d8a4e', bg: 'rgba(45,138,78,0.12)', icon: Zap, tip: 'Fully autonomous — Claude Code runs end-to-end, opens PR' },
  gated:  { label: 'Gated', color: '#b08030', bg: 'rgba(176,128,48,0.12)', icon: Shield, tip: 'Claude generates, Lance reviews before deploy' },
  manual: { label: 'Manual', color: '#999', bg: 'rgba(153,153,153,0.10)', icon: XCircle, tip: 'Requires clinical judgment or external integration' },
};

// Per-case trigger classification + schedule prompt
const TRIGGER_CONFIG = {
  '001': { trigger: 'auto', freq: 'weekly', prompt: 'Audit all Supabase RLS policies. Export the full schema from supabase/, compare Private Brain vs Public Brain table policies, identify any cross-tier data bleed risk, and open a PR with a structured audit report and any policy corrections.' },
  '002': { trigger: 'gated', freq: 'once', prompt: 'Scaffold Supabase Auth with Google OAuth provider. Create auth middleware for Next.js, implement role-assignment edge function (staff, client, admin, agent roles), build login UI components for MoSo and Labno Labs portals. Open a PR for review.' },
  '003': { trigger: 'gated', freq: 'weekly', prompt: 'Run adversarial prompt injection tests against all Oracle API endpoints. Generate 30 categorized attack prompts (direct injection, indirect, multi-turn, context poisoning). Document results, patch confirmed vulnerabilities in Shield middleware, add detection logging. Open PR with report.' },
  '004': { trigger: 'gated', freq: 'once', prompt: 'Create staging vs production environment separation. Generate Supabase project configs for both environments, mirror schemas, create migration promotion scripts, set up environment variable management. Open PR for review.' },
  '005': { trigger: 'auto', freq: 'once', prompt: 'Generate devcontainer.json and .devcontainer/ configuration for cross-location development. Target M2 MacBook Air and MSI PRO MSI (Windows 11). Include GitHub Codespaces support, shared VS Code extensions, and unified Node/Python toolchain. Open PR.' },
  '006': { trigger: 'gated', freq: 'once', prompt: 'Convert the DOE (Directives, Orchestration, Execution) framework into a versioned machine-readable spec. Create YAML schema definitions for each DOE layer, Markdown documentation, and a validation script. Place in docs/doe/. Open PR.' },
  '007': { trigger: 'auto', freq: 'once', prompt: 'Build the Vercel Task Dashboard page with multi-view support (kanban, linear, graph). Fetch task data from Supabase global_tasks and agent_runs tables. Include status transitions, dependency visualization, and history timeline. Open PR.' },
  '008': { trigger: 'auto', freq: 'monthly', prompt: 'Optimize Oracle vector storage. Experiment with chunk sizes (256, 512, 1024 tokens), benchmark retrieval accuracy with synthetic test queries, configure HNSW index parameters on pgvector, document metadata tagging strategy. Generate performance report as Markdown. Open PR.' },
  '009': { trigger: 'auto', freq: 'once', prompt: 'Create GitHub Actions CI/CD pipeline. Implement PR checks (lint, type-check, test), auto-deploy to staging on merge to main, manual production promotion gate via workflow_dispatch. Place in .github/workflows/. Open PR.' },
  '010': { trigger: 'auto', freq: 'weekly', prompt: 'Run full integrity check on the 189 M1-XXXX exercise records. Validate: all required fields present, NS state assignments valid (Green/Transition/Amber/Blue), avatar coverage across A1-A10, fascial line tagging consistency. Generate JSON validation report and flag issues. Open PR.' },
  '011': { trigger: 'gated', freq: 'once', prompt: 'Integrate Lemon Squeezy checkout for mosolabs.com consumer apps. Implement webhook handler at api/lemon-squeezy/webhook, create checkout session endpoints, build digital delivery flow writing purchase records to Supabase. Open PR for review.' },
  '012': { trigger: 'gated', freq: 'once', prompt: 'Implement mosolabs.com subdomain routing. Configure Vercel wildcard domain in vercel.json, create per-app subdomain middleware, implement shared Supabase Auth session across subdomains. Open PR for DNS review.' },
  '013': { trigger: 'auto', freq: 'once', prompt: 'Implement token cost monitoring system. Create a logging wrapper that captures per-query token usage, cost attribution by agent/domain/period, and billing per client. Store in Supabase usage_logs table. Build a cost summary API endpoint. Open PR.' },
  '014': { trigger: 'gated', freq: 'once', prompt: 'Implement Oracle API rate limiting at Vercel Edge. Create middleware with per-user and per-client tier limits, configurable rate tiers (free/pro/enterprise), friendly error responses with retry-after headers. Open PR for tier policy review.' },
  '015': { trigger: 'manual', freq: 'once', prompt: 'Build NS State routing validation test suite. Create 20+ test cases (5 per NS state: Green, Transition, Amber, Blue) validating correct agent dispatch. Requires clinical judgment for expected routing outcomes.' },
  '016': { trigger: 'manual', freq: 'once', prompt: 'Implement autonomous session arc generation from NS state + avatar + goals. Requires clinical protocol knowledge for warm-up/work/cool-down sequencing.' },
  '017': { trigger: 'manual', freq: 'weekly', prompt: 'Run population-level NS state regression analysis. Requires access to clinical outcomes data and clinical interpretation of trend signals.' },
  '018': { trigger: 'manual', freq: 'once', prompt: 'Implement CPT automation with 8-minute rule enforcement. Requires deep CPT coding knowledge and Clinicient EMR integration specifics.' },
  '019': { trigger: 'gated', freq: 'monthly', prompt: 'Generate 90-day evergreen content calendar from existing clinical IP. Tag each piece by NS state, audience segment, and platform. Output as structured JSON with content briefs. Open PR for clinical review.' },
  '020': { trigger: 'manual', freq: 'once', prompt: 'Implement Kylie intake NS state pre-classification. Requires clinical intake form design and HIPAA-compliant data handling.' },
  '021': { trigger: 'auto', freq: 'once', prompt: 'Build the AI Readiness Audit Pipeline. Create ingestion endpoints for client SOPs, org charts, and tech stack docs. Generate formatted audit report using DOE framework. Store per-client in Supabase with RLS. Open PR.' },
  '022': { trigger: 'auto', freq: 'once', prompt: 'Build the Workflow Registry Generator. Ingest client task logs, map to DOE framework, generate workflow registry with recommended agent assignments. Output as structured YAML + dashboard component. Open PR.' },
  '023': { trigger: 'auto', freq: 'once', prompt: 'Build Multi-Client Benchmark Dashboard. Create anonymized performance metrics aggregation across engagements, per-client ROI calculation, and comparison views. Fetch from Supabase with client-level RLS. Open PR.' },
  '024': { trigger: 'gated', freq: 'once', prompt: 'Implement per-client Row Level Security architecture. Create RLS policies for all consulting tables, build client provisioning script that sets up isolated data access. Generate test suite for cross-client isolation. Open PR for security review.' },
  '025': { trigger: 'manual', freq: 'once', prompt: 'Build referral network translation layer. Requires medical terminology mapping logic and understanding of the 114-doctor referral network communication standards.' },
  '026': { trigger: 'gated', freq: 'once', prompt: 'Design Core Three App architecture. Create Supabase schema, data models, user flow diagrams, NS state integration points. Generate migration files and initial Next.js page scaffolding. Open PR for architecture review.' },
  '027': { trigger: 'auto', freq: 'once', prompt: 'Build Couch to 5K personalization engine. Create 9-week structured JSON plan generator that adapts based on NS state, movement screen results, and fitness history. Build API endpoint and plan renderer component. Open PR.' },
  '028': { trigger: 'auto', freq: 'once', prompt: 'Build Breathwork Tool with NS state protocol library. Create protocol definitions (box breathing, 4-7-8, physiological sigh, etc.) mapped to NS states. Build animated session guide component, session logger, and progress dashboard. Open PR.' },
  '029': { trigger: 'gated', freq: 'quarterly', prompt: 'Run brand voice audit across all live copy on MoSo, Labno Labs, and mosolabs.com. Flag voice/tone drift from brand guidelines. Generate correction suggestions with before/after examples. Open PR with audit report.' },
  '030': { trigger: 'auto', freq: 'weekly', prompt: 'Process pending transcripts through the repurposing pipeline. For each transcript: generate blog post draft, 5 social media posts, email newsletter segment, and 3 short clip descriptions. Output as structured JSON per transcript. Open PR.' },
  '031': { trigger: 'auto', freq: 'once', prompt: 'Build the Consulting Proposal Generator. Create proposal templates for the three-tier model (Audit/Implementation/Retainer). Build generation logic from audit output, pricing calculator, and PDF/Markdown renderer. Open PR.' },
  '032': { trigger: 'auto', freq: 'once', prompt: 'Analyze current repo structure and implement monorepo vs multi-repo decision. Scaffold chosen structure with access controls, shared dependency management via workspaces, and cross-package build configuration. Open PR with migration plan.' },
  '033': { trigger: 'manual', freq: 'once', prompt: 'Integrate parts awareness detection and core drive systems into session arc routing. Requires deep clinical framework knowledge.' },
  '034': { trigger: 'gated', freq: 'quarterly', prompt: 'Generate SEO content strategy for MoSo and Labno Labs. Run keyword research, content gap analysis, and produce 6-month editorial calendar. Output as structured plan with priority scores. Open PR for review.' },
  '035': { trigger: 'auto', freq: 'once', prompt: 'Build app analytics pipeline. Implement event tracking for onboarding completion, session frequency, feature usage, and churn signals. Create Supabase analytics tables, ingestion endpoints, and summary dashboard component. Open PR.' },
  '036': { trigger: 'auto', freq: 'once', prompt: 'Build retainer client dashboard. Create per-client portal with workflow status, task history, ROI metrics, and upcoming deliverables. Implement with Supabase RLS per client. Open PR.' },
  '037': { trigger: 'manual', freq: 'monthly', prompt: 'Build clinical outcomes database. Requires clinical data modeling for longitudinal NS state tracking and outcomes interpretation.' },
  '038': { trigger: 'gated', freq: 'monthly', prompt: 'Generate GreenRope email drip sequences with NS state theming. Create segment-specific nurture sequences and re-engagement flows. Output as importable GreenRope templates. Open PR for copy review.' },
  '039': { trigger: 'auto', freq: 'once', prompt: 'Build mosolabs.com shared component library. Create reusable React components: NS state indicators, breathing animations, progress bars, session timers. Include Storybook stories and usage docs. Open PR.' },
  '040': { trigger: 'auto', freq: 'once', prompt: 'Build Agent Assignment Recommender. Create recommendation engine that matches client profiles (industry, tech stack, pain points) to best-fit agents and modules from the DOE registry. Open PR.' },
  '041': { trigger: 'manual', freq: 'quarterly', prompt: 'Generate case studies from clinical outcomes. Requires anonymization protocols and clinical narrative interpretation.' },
  '042': { trigger: 'auto', freq: 'once', prompt: 'Implement backup and disaster recovery. Create automated daily Supabase backup script (pg_dump via edge function or cron), tested recovery procedure documentation, and Vercel rollback protocol. Open PR.' },
  '043': { trigger: 'gated', freq: 'once', prompt: 'Implement Spanish language localization for patient-facing content. Translate exercise instructions, intake forms, and patient education materials. Create i18n infrastructure with locale switching. Open PR for translation review.' },
  '044': { trigger: 'auto', freq: 'once', prompt: 'Build client onboarding pipeline automation. Create provisioning flow triggered by contract signature: set up Supabase environment with RLS, create client portal, run initial audit, generate workflow registry. Open PR.' },
  '045': { trigger: 'auto', freq: 'once', prompt: 'Build Core Three adaptive learning path engine. Create algorithm that sequences practice based on NS state history, completion rate, and response quality. Implement spaced repetition and difficulty adjustment. Open PR.' },
  '046': { trigger: 'manual', freq: 'once', prompt: 'Implement insurance pre-authorization verification. Requires integration with insurance eligibility APIs and PT benefit structures.' },
  '047': { trigger: 'gated', freq: 'monthly', prompt: 'Generate monthly newsletters for MoSo and Labno Labs from evergreen content queue. Maintain separate brand voices. Output as HTML email templates ready for GreenRope. Open PR for editorial review.' },
  '048': { trigger: 'auto', freq: 'daily', prompt: 'Run Oracle content freshness check. Scan all oracle_sops entries, flag any content older than 90 days or with outdated references. Generate staleness report with recommended refresh actions. Open PR with report.' },
  '049': { trigger: 'auto', freq: 'once', prompt: 'Build the Labno Labs ROI Calculator. Create public-facing tool that estimates time savings, error reduction, and cost per workflow from AI implementation. Build interactive form with real-time calculation. Open PR.' },
  '050': { trigger: 'auto', freq: 'once', prompt: 'Build unified System Health Dashboard. Create monitoring page showing Oracle uptime, agent response times, Supabase connection health, Vercel deployment status, and error rate trends. Open PR.' },
};

const FREQ_LABELS = { once: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' };
const FREQ_CRON = { once: null, daily: '0 9 * * *', weekly: '0 9 * * 1', monthly: '0 9 1 * *', quarterly: '0 9 1 1,4,7,10 *' };

// Pipeline stage mapping: which build stage each CASE belongs to
const CASE_STAGE = {
  '001':1, '002':1, '003':5, '004':6, '005':1, '006':2, '007':4, '008':4,
  '009':1, '010':5, '011':4, '012':6, '013':4, '014':4, '015':5,
  '016':4, '017':4, '018':4, '019':4, '020':4, '021':1, '022':2, '023':4,
  '024':1, '025':4, '026':3, '027':4, '028':4, '029':8, '030':4, '031':2,
  '032':1, '033':4, '034':2, '035':4, '036':7, '037':4, '038':4, '039':3,
  '040':2, '041':8, '042':6, '043':4, '044':1, '045':4, '046':4, '047':4,
  '048':5, '049':4, '050':6,
};
const STAGE_LABELS = { 1:'Kickoff', 2:'Scope', 3:'Design', 4:'Build', 5:'Test', 6:'Deploy', 7:'Handoff', 8:'Close' };

const CASES = [
  // P0
  { id:"001", title:"Oracle RLS Audit", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"Both", status:"TODO", depends:[], desc:"Verify Private/Public Brain separation; no data bleed between tiers." },
  { id:"002", title:"Supabase Auth + Google OAuth", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["001"], desc:"Production auth layer gated by Google OAuth for MoSo staff and Labno Labs clients." },
  { id:"003", title:"Prompt Injection Shield — Stress Test", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["001","002"], desc:"Adversarial testing of all Oracle endpoints; patch confirmed vulnerabilities; add logging." },
  { id:"004", title:"Staging vs. Production Separation", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["001"], desc:"Two isolated Supabase projects; mirrored schemas; promotion workflow." },
  { id:"005", title:"Cross-Location Dev Env Sync", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:[], desc:"Standardize dev env across M2 MacBook Air and MSI PRO via devcontainer / Codespaces." },
  { id:"006", title:"DOE Framework — Machine-Readable Spec", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["001"], desc:"Convert DOE (Directives, Orchestration, Execution) into a versioned YAML+Markdown agent spec." },
  { id:"007", title:"Vercel Task Dashboard — Queue + History UI", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["002","004","006"], desc:"Multi-view dashboard (kanban, linear, graph) showing all task queue items with status and history." },
  { id:"008", title:"Oracle Vector Storage Optimization", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["001","004"], desc:"Chunk sizing, embedding model, metadata tagging, HNSW index, retrieval accuracy benchmarks." },
  { id:"009", title:"CI/CD — GitHub Actions Automated Deploy", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["004","005"], desc:"PR checks, auto-deploy to staging, manual production promotion gate." },
  { id:"010", title:"Exercise Schema Validation — M1-XXXX", domain:"BRAIN", priority:"P0", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["006"], desc:"Full integrity check on 189 exercises: NS state, avatar coverage, fascial line tagging." },
  { id:"011", title:"Lemon Squeezy Checkout Integration", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["002","004"], desc:"Checkout + digital delivery for all mosolabs.com consumer apps; webhook → Supabase." },
  { id:"012", title:"mosolabs.com Subdomain Routing", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["002","011"], desc:"Vercel wildcard domain; per-app subdomain; shared Supabase Auth across subdomains." },
  { id:"013", title:"Token Cost Monitoring", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["007","009"], desc:"Per-query usage logging; cost by agent/domain/period; billing attribution per client." },
  { id:"014", title:"Oracle API Rate Limiting", domain:"INFRA", priority:"P0", agent:"Claude Code", oracle:"Both", status:"TODO", depends:["002","003","013"], desc:"Per-user/per-client rate limiting at Vercel Edge; configurable tiers; friendly error responses." },
  { id:"015", title:"NS State Routing Logic — Validation", domain:"BRAIN", priority:"P0", agent:"The Mechanic", oracle:"Private", status:"TODO", depends:["006","010"], desc:"Test suite (20+ cases, 5 per NS state) validating correct agent dispatch per state." },
  // P1
  { id:"016", title:"Session Arc — Autonomous Generation", domain:"BRAIN", priority:"P1", agent:"The Mechanic", oracle:"Private", status:"TODO", depends:["010","015"], desc:"Complete session arc (warm-up → work → cool-down) from NS state + avatar + goals." },
  { id:"017", title:"Population Regression Alerts", domain:"BRAIN", priority:"P1", agent:"The Overseer", oracle:"Private", status:"TODO", depends:["015","013"], desc:"Weekly population-level NS state trend monitoring; alerts before regression appears in notes." },
  { id:"018", title:"CPT Automation — 8-Minute Rule", domain:"BRAIN", priority:"P1", agent:"Billing Agent", oracle:"Private", status:"TODO", depends:["006"], desc:"Automated CPT coding; 8-minute rule enforcement; Clinicient-compatible superbill export." },
  { id:"019", title:"Evergreen Content Queue — 90 Days", domain:"BRAIN", priority:"P1", agent:"The Sniper", oracle:"Private", status:"TODO", depends:["006","013"], desc:"90-day content calendar from existing clinical IP, tagged by NS state, segment, platform." },
  { id:"020", title:"Kylie Intake — NS State Pre-Classification", domain:"BRAIN", priority:"P1", agent:"Kylie", oracle:"Private", status:"TODO", depends:["015","016"], desc:"Pre-classify new patient NS state from intake form; structured JSON output for routing." },
  { id:"021", title:"AI Readiness Audit Pipeline", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["002","006","008"], desc:"Ingest client SOPs/org chart/tech stack; generate formatted audit report; store per client." },
  { id:"022", title:"Workflow Registry Generator", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["006","021"], desc:"Ingest client task logs; generate DOE-mapped workflow registry with agent assignments." },
  { id:"023", title:"Multi-Client Benchmark Dashboard", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["007","013","021"], desc:"Anonymized performance metrics across all engagements; per-client ROI reporting." },
  { id:"024", title:"Per-Client RLS Architecture", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["001","002"], desc:"Per-client Row Level Security on all consulting tables; provisioning script for new clients." },
  { id:"025", title:"Referral Network Translation Layer", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["006","013"], desc:"Auto-translate session notes to medical terminology for 114-doctor referral network." },
  { id:"026", title:"Core Three App — Architecture", domain:"APP", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["011","012","015"], desc:"Data model, user flow, NS state integration, Supabase schema for Core Three somatic app." },
  { id:"027", title:"Couch to 5K Personalization Engine", domain:"APP", priority:"P1", agent:"Claude Code", oracle:"Public", status:"TODO", depends:["011","012","026"], desc:"C25K personalized by NS state, movement screen, fitness history; 9-week structured JSON plan." },
  { id:"028", title:"Breathwork Tool — NS State Protocol Library", domain:"APP", priority:"P1", agent:"Claude Code", oracle:"Public", status:"TODO", depends:["011","012","015"], desc:"NS state-specific breathing protocols; animated session guide; session logger; progress dashboard." },
  { id:"029", title:"Brand Voice Audit — Cross-Platform", domain:"CONTENT", priority:"P1", agent:"The Sniper", oracle:"Both", status:"TODO", depends:["008","013"], desc:"Audit all live copy across MoSo, Labno Labs, mosolabs.com; flag drift; generate corrections." },
  { id:"030", title:"Transcript Repurposing Pipeline", domain:"CONTENT", priority:"P1", agent:"The Sniper", oracle:"Public", status:"TODO", depends:["008","019"], desc:"Transcript → blog + 5 social posts + email segment + 3 short clips; clean before ingestion." },
  { id:"031", title:"Consulting Proposal Generator", domain:"CONSULT", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["021","022"], desc:"Auto-generate scoped proposal from audit output; three-tier model (Audit→Implementation→Retainer)." },
  { id:"032", title:"Repo Structure — Monorepo vs. Multi-Repo", domain:"INFRA", priority:"P1", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["005","009"], desc:"Decide and implement repo structure with access controls; shared dependency management." },
  { id:"033", title:"Parts + Core Drives Integration into Prescription", domain:"BRAIN", priority:"P1", agent:"The Mechanic", oracle:"Private", status:"TODO", depends:["015","016"], desc:"Layer parts awareness detection and core drive systems into session arc routing logic." },
  { id:"034", title:"SEO Content Strategy — MoSo + Labno Labs", domain:"CONTENT", priority:"P1", agent:"The Sniper", oracle:"Public", status:"TODO", depends:["019","029"], desc:"Keyword research, content gap analysis, 6-month editorial plan for both brands." },
  { id:"035", title:"App Analytics Pipeline", domain:"APP", priority:"P1", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["026","027","028"], desc:"Onboarding completion, session frequency, feature usage, churn signals across all apps." },
  // P2
  { id:"036", title:"Retainer Client Dashboard", domain:"CONSULT", priority:"P2", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["007","023","024"], desc:"Per-client portal: workflow status, task history, ROI metrics, upcoming deliverables." },
  { id:"037", title:"Clinical Outcomes Database", domain:"BRAIN", priority:"P2", agent:"The Overseer", oracle:"Private", status:"TODO", depends:["017","010"], desc:"Longitudinal outcomes by NS state, avatar, presenting complaint — proprietary research asset." },
  { id:"038", title:"Email Drip Sequence Automation", domain:"CONTENT", priority:"P2", agent:"The Sniper", oracle:"Public", status:"TODO", depends:["019","029"], desc:"GreenRope segment-specific nurture sequences with NS state theming and re-engagement." },
  { id:"039", title:"mosolabs.com Component Library", domain:"APP", priority:"P2", agent:"Claude Code", oracle:"Public", status:"TODO", depends:["026","027","028"], desc:"Shared UI components (NS state indicators, breathing animations, progress bars) across all apps." },
  { id:"040", title:"Agent Assignment Recommender", domain:"CONSULT", priority:"P2", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["021","022","023"], desc:"Recommend best-fit agents/modules for new client from profile (industry, stack, pain points)." },
  { id:"041", title:"Case Study Generator", domain:"BRAIN", priority:"P2", agent:"The Sniper", oracle:"Private", status:"TODO", depends:["019","037"], desc:"Anonymized clinical outcomes → compelling Labno Labs consulting case studies." },
  { id:"042", title:"Backup and Disaster Recovery", domain:"INFRA", priority:"P2", agent:"Claude Code", oracle:"N/A", status:"TODO", depends:["004"], desc:"Automated daily Supabase backups; tested recovery procedure; Vercel rollback protocol." },
  { id:"043", title:"Spanish Language Localization", domain:"CONTENT", priority:"P2", agent:"The Sniper", oracle:"Public", status:"TODO", depends:["019","010"], desc:"Patient-facing content in Spanish (exercises, intake forms, education) for North Shore population." },
  { id:"044", title:"Client Onboarding Pipeline Automation", domain:"CONSULT", priority:"P2", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["002","021","022","024"], desc:"Automated provisioning triggered by contract signature: environment + portal + audit + registry." },
  { id:"045", title:"Core Three Adaptive Learning Path", domain:"APP", priority:"P2", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["026","035"], desc:"Adaptive practice sequence based on NS state history, completion rate, response quality." },
  { id:"046", title:"Insurance Pre-Authorization Check", domain:"BRAIN", priority:"P2", agent:"Billing Agent", oracle:"Private", status:"TODO", depends:["018"], desc:"Automated eligibility and PT benefit verification before first session; reduces billing surprises." },
  { id:"047", title:"Newsletter Automation — Dual Brand", domain:"CONTENT", priority:"P2", agent:"The Sniper", oracle:"Public", status:"TODO", depends:["019","038"], desc:"Monthly newsletters for MoSo and Labno Labs from evergreen queue; separate lists and voice." },
  { id:"048", title:"Oracle Freshness Checks", domain:"INFRA", priority:"P2", agent:"Claude Code", oracle:"Both", status:"TODO", depends:["001","003","008"], desc:"Scheduled staleness detection for Oracle content; flag for review or auto-refresh." },
  { id:"049", title:"Labno Labs ROI Calculator", domain:"CONSULT", priority:"P2", agent:"Claude Code", oracle:"Private", status:"TODO", depends:["023","031"], desc:"Public-facing tool: estimate time savings, error reduction, cost per workflow from AI implementation." },
  { id:"050", title:"System Health Dashboard", domain:"INFRA", priority:"P2", agent:"Claude Code", oracle:"Both", status:"TODO", depends:["007","013","014"], desc:"Unified monitoring: Oracle uptime, agent response times, Supabase health, Vercel status." },
];

const DOMAIN_COLORS = {
  INFRA:   { bg: 'rgba(120,130,150,0.08)', accent: '#8a9ab5', badge: 'rgba(120,130,150,0.15)', badgeText: '#6a7a95', dot: '#8a9ab5' },
  BRAIN:   { bg: 'rgba(80,160,100,0.08)', accent: '#5aaa6e', badge: 'rgba(80,160,100,0.15)', badgeText: '#3a8a4e', dot: '#5aaa6e' },
  CONSULT: { bg: 'rgba(140,110,180,0.08)', accent: '#9a7aba', badge: 'rgba(140,110,180,0.15)', badgeText: '#7a5a9a', dot: '#9a7aba' },
  APP:     { bg: 'rgba(70,150,200,0.08)', accent: '#4a9ac8', badge: 'rgba(70,150,200,0.15)', badgeText: '#3a7aa8', dot: '#4a9ac8' },
  CONTENT: { bg: 'rgba(200,160,60,0.08)', accent: '#c8a03c', badge: 'rgba(200,160,60,0.15)', badgeText: '#a0803a', dot: '#c8a03c' },
};

const PRIORITY_STYLES = {
  P0: { bg: '#d14040', color: '#fff' },
  P1: { bg: '#c49a40', color: '#fff' },
  P2: { bg: 'rgba(158,154,151,0.25)', color: '#6b6764' },
};

const ORACLE_COLORS = {
  Private: '#c05050',
  Public: '#4a9ac8',
  Both: '#9a7aba',
  'N/A': '#aaa',
};

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const STATUS_STYLES = {
  TODO:        { bg: 'rgba(158,154,151,0.15)', color: '#6b6764' },
  IN_PROGRESS: { bg: 'rgba(90,138,191,0.18)', color: '#4a7aaf' },
  DONE:        { bg: 'rgba(106,171,110,0.18)', color: '#4a8a4e' },
  BLOCKED:     { bg: 'rgba(209,64,64,0.15)', color: '#c04040' },
};

const VIEWS = [
  { key: 'Simple', icon: List },
  { key: 'Linear', icon: LayoutList },
  { key: 'Kanban', icon: Columns },
  { key: 'Mindmap', icon: Waypoints },
  { key: 'Graph', icon: GitBranch },
];
const DOMAINS = ['All', 'INFRA', 'BRAIN', 'CONSULT', 'APP', 'CONTENT'];
const PRIORITIES = ['All', 'P0', 'P1', 'P2'];
const TRIGGER_FILTERS = ['All', 'auto', 'gated', 'manual'];

// ─── Run Tracking Helpers ────────────────────────────────────────────────────

function formatRunDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function computeNextRun(freq, lastRunAt) {
  if (freq === 'once') return 'On demand';
  const now = new Date();
  let next;
  switch (freq) {
    case 'daily':
      next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      break;
    case 'weekly': {
      next = new Date(now);
      const dayOfWeek = next.getDay(); // 0=Sun
      const daysUntilMon = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
      next.setDate(next.getDate() + daysUntilMon);
      next.setHours(9, 0, 0, 0);
      break;
    }
    case 'monthly':
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
      break;
    case 'quarterly': {
      const currentQ = Math.floor(now.getMonth() / 3);
      const nextQMonth = (currentQ + 1) * 3;
      next = nextQMonth >= 12
        ? new Date(now.getFullYear() + 1, nextQMonth - 12, 1, 9, 0, 0)
        : new Date(now.getFullYear(), nextQMonth, 1, 9, 0, 0);
      break;
    }
    default:
      return 'On demand';
  }
  return formatRunDate(next);
}

const RUN_STATUS_COLORS = {
  success: '#2d8a4e',
  failure: '#d14040',
  pending: '#c49a40',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateScheduleCommand(c) {
  const cfg = TRIGGER_CONFIG[c.id];
  if (!cfg || cfg.trigger === 'manual') return null;
  const cron = FREQ_CRON[cfg.freq];
  const freqText = FREQ_LABELS[cfg.freq] || cfg.freq;
  const scheduleStr = cron ? `${freqText.toLowerCase()} at 9am` : 'once';
  return `/schedule "${cfg.prompt}" ${scheduleStr}`;
}

function generateNaturalLanguage(c) {
  const cfg = TRIGGER_CONFIG[c.id];
  if (!cfg) return null;
  return `schedule case ${c.id}`;
}

const sty = {
  badge: (bg, color) => ({
    display: 'inline-block', fontSize: 11, fontFamily: 'monospace', padding: '1px 8px',
    borderRadius: 4, background: bg, color, fontWeight: 500, whiteSpace: 'nowrap',
  }),
  card: (dc) => ({
    cursor: 'pointer', borderRadius: 10, borderLeft: `3px solid ${dc.accent}`,
    background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
    padding: '12px 14px', transition: 'box-shadow 0.15s, transform 0.15s',
    boxShadow: 'var(--glass-shadow)',
  }),
};

// ─── Components ───────────────────────────────────────────────────────────────

function Badge({ bg, color, children }) {
  return <span style={sty.badge(bg, color)}>{children}</span>;
}

function TriggerBadge({ caseId, compact }) {
  const cfg = TRIGGER_CONFIG[caseId];
  if (!cfg) return null;
  const tm = TRIGGER_META[cfg.trigger];
  const Icon = tm.icon;
  return (
    <span
      title={tm.tip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 10, fontFamily: 'monospace', padding: compact ? '0 5px' : '1px 7px',
        borderRadius: 4, background: tm.bg, color: tm.color, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      <Icon size={compact ? 10 : 11} />
      {!compact && tm.label}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button onClick={handleCopy} title="Copy to clipboard"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#2d8a4e' : '#999', padding: 4, display: 'flex', alignItems: 'center' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function SchedulePanel({ c }) {
  const cfg = TRIGGER_CONFIG[c.id];
  if (!cfg) return null;
  const tm = TRIGGER_META[cfg.trigger];
  const cmd = generateScheduleCommand(c);
  const isSchedulable = cfg.trigger !== 'manual';

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Terminal size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#3a3836' }}>Remote Agent Trigger</span>
      </div>

      {/* Readiness + Frequency */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: tm.bg, padding: '6px 12px', borderRadius: 8 }}>
          {(() => { const Icon = tm.icon; return <Icon size={14} style={{ color: tm.color }} />; })()}
          <span style={{ fontSize: 12, fontWeight: 600, color: tm.color }}>{tm.label}</span>
          <span style={{ fontSize: 11, color: '#999' }}>— {tm.tip}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.03)', padding: '6px 12px', borderRadius: 8 }}>
          <Clock size={12} style={{ color: '#999' }} />
          <span style={{ fontSize: 12, color: '#666' }}>{FREQ_LABELS[cfg.freq]}</span>
          {FREQ_CRON[cfg.freq] && (
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#bbb', marginLeft: 4 }}>({FREQ_CRON[cfg.freq]})</span>
          )}
        </div>
      </div>

      {/* Prompt Preview */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Agent Prompt</div>
        <div style={{
          background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 12px',
          fontSize: 12, color: '#555', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          {cfg.prompt}
        </div>
      </div>

      {/* Schedule Command */}
      {isSchedulable && cmd && (
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
            Paste into Claude Code CLI — or say: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>"schedule case {c.id}"</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            background: '#1e1e2e', borderRadius: 8, padding: '10px 12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <code style={{
              flex: 1, fontSize: 11, fontFamily: "'DM Mono', 'Fira Code', monospace",
              color: '#a6e3a1', lineHeight: 1.5, wordBreak: 'break-all', whiteSpace: 'pre-wrap',
            }}>
              {cmd}
            </code>
            <CopyButton text={cmd} />
          </div>
        </div>
      )}

      {!isSchedulable && (
        <div style={{
          background: 'rgba(153,153,153,0.08)', borderRadius: 8, padding: '10px 14px',
          fontSize: 12, color: '#999', lineHeight: 1.5,
        }}>
          This case requires clinical judgment, HIPAA-compliant handling, or external integration that cannot be fully automated. Use as a reference prompt for manual Claude Code sessions.
        </div>
      )}
    </div>
  );
}

function CaseCard({ c, onClick, compact }) {
  const dc = DOMAIN_COLORS[c.domain];
  const ps = PRIORITY_STYLES[c.priority];
  const ss = STATUS_STYLES[c.status];
  return (
    <div
      onClick={() => onClick(c)}
      style={sty.card(dc)}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999' }}>#{c.id}</span>
            <Badge bg={ps.bg} color={ps.color}>{c.priority}</Badge>
            <Badge bg={dc.badge} color={dc.badgeText}>{c.domain}</Badge>
            <Badge bg={ss.bg} color={ss.color}>{c.status}</Badge>
            <TriggerBadge caseId={c.id} compact={compact} />
            {CASE_STAGE[c.id] && <Badge bg="rgba(176,96,80,0.10)" color="#b06050">Stage {CASE_STAGE[c.id]}: {STAGE_LABELS[CASE_STAGE[c.id]]}</Badge>}
          </div>
          <div style={{ fontWeight: 600, color: '#3a3836', fontSize: compact ? 12 : 13, lineHeight: 1.3 }}>{c.title}</div>
          {!compact && <div style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.4 }}>{c.desc}</div>}
        </div>
      </div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#999' }}>{c.agent}</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: ORACLE_COLORS[c.oracle] }}>&#x2B21; {c.oracle}</span>
          {c.depends.length > 0 && (
            <span style={{ fontSize: 11, color: '#bbb' }}>&#x21B3; {c.depends.map(d => `#${d}`).join(', ')}</span>
          )}
        </div>
      )}
      {/* Run tracking metadata with color-coded status */}
      {(() => {
        const cfg = TRIGGER_CONFIG[c.id];
        if (!cfg) return null;
        const lastRun = c.last_run_at ? formatRunDate(c.last_run_at) : null;
        const runStatus = c.last_run_status || null;
        const nextRun = c.next_run_at ? formatRunDate(c.next_run_at) : computeNextRun(cfg.freq, c.last_run_at);
        const isOnDemandNeverRun = !lastRun && cfg.freq === 'once';
        const statusColor = runStatus ? (RUN_STATUS_COLORS[runStatus] || '#999') : '#999';

        // Color-coded indicator: green = ran recently, amber = due soon, red = overdue, gray = never/on-demand
        let indicatorColor = '#9e9a97'; // gray default
        let indicatorLabel = '';
        if (lastRun && runStatus === 'success') {
          indicatorColor = '#2d8a4e'; // green
          indicatorLabel = 'OK';
        } else if (lastRun && runStatus === 'failure') {
          indicatorColor = '#d14040'; // red
          indicatorLabel = 'Failed';
        } else if (lastRun && runStatus === 'pending') {
          indicatorColor = '#c49a40'; // amber
          indicatorLabel = 'Pending';
        } else if (!lastRun && cfg.freq !== 'once') {
          indicatorColor = '#d14040'; // red — recurring task that has never run = overdue
          indicatorLabel = 'Overdue';
        }

        return (
          <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {!isOnDemandNeverRun && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: indicatorColor, flexShrink: 0, boxShadow: `0 0 4px ${indicatorColor}44` }} />
            )}
            {isOnDemandNeverRun ? (
              <span style={{ fontSize: '0.68rem', color: '#bbb', fontStyle: 'italic' }}>On demand — runs when triggered</span>
            ) : (
              <>
                <span style={{ fontSize: '0.68rem', color: lastRun ? statusColor : '#d14040', fontWeight: indicatorLabel === 'Overdue' ? 600 : 400 }}>
                  {lastRun ? `Last: ${lastRun}` : 'Never run'}
                  {indicatorLabel && ` · ${indicatorLabel}`}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#aaa' }}>
                  Next: {nextRun}
                </span>
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.04)', color: '#8a8682' }}>
                  {FREQ_LABELS[cfg.freq]}
                </span>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function Modal({ c, onClose, onStatusChange }) {
  if (!c) return null;
  const dc = DOMAIN_COLORS[c.domain];
  const ps = PRIORITY_STYLES[c.priority];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16, overflowY: 'auto' }} onClick={onClose}>
      <div
        style={{ width: '100%', maxWidth: 600, borderRadius: 16, border: `1px solid ${dc.accent}`, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <Badge bg="rgba(158,154,151,0.2)" color="#6b6764">CASE-{c.id}</Badge>
              <Badge bg={ps.bg} color={ps.color}>{c.priority}</Badge>
              <Badge bg={dc.badge} color={dc.badgeText}>{c.domain}</Badge>
              <TriggerBadge caseId={c.id} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3a3836', lineHeight: 1.3 }}>{c.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', marginLeft: 16 }}>&#x2715;</button>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>{c.desc}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Agent</div>
            <div style={{ fontSize: 13, color: '#3a3836', fontWeight: 500 }}>{c.agent}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Oracle Tier</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: ORACLE_COLORS[c.oracle] }}>{c.oracle} Brain</div>
          </div>
        </div>
        {c.depends.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Depends On</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {c.depends.map(d => <Badge key={d} bg="rgba(158,154,151,0.2)" color="#6b6764">#{d}</Badge>)}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Set Status</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(st => {
              const ss = STATUS_STYLES[st];
              const active = c.status === st;
              return (
                <button key={st} onClick={() => onStatusChange(c.id, st)}
                  style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: active ? ss.bg : 'rgba(0,0,0,0.04)', color: active ? ss.color : '#aaa',
                    transition: 'all 0.15s',
                  }}
                >{st}</button>
              );
            })}
          </div>
        </div>

        {/* ── Schedule Panel ── */}
        <SchedulePanel c={c} />
      </div>
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function LinearView({ cases, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cases.map(c => <CaseCard key={c.id} c={c} onClick={onSelect} />)}
    </div>
  );
}

function KanbanView({ cases, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {STATUS_OPTIONS.map(status => {
        const cols = cases.filter(c => c.status === status);
        const ss = STATUS_STYLES[status];
        return (
          <div key={status} style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 12, padding: 12, boxShadow: 'var(--glass-shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, marginBottom: 12, background: ss.bg, color: ss.color, display: 'inline-block' }}>
              {status} ({cols.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cols.map(c => <CaseCard key={c.id} c={c} onClick={onSelect} compact />)}
              {cols.length === 0 && <div style={{ fontSize: 12, color: '#ccc', textAlign: 'center', padding: '16px 0' }}>Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleView({ cases, onSelect }) {
  const byPriority = { P0: [], P1: [], P2: [] };
  cases.forEach(c => byPriority[c.priority].push(c));
  const labels = { P0: 'Ship Blockers', P1: 'Core System', P2: 'Growth Layer' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Object.entries(byPriority).map(([p, cs]) => cs.length > 0 && (
        <div key={p}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, marginBottom: 12, background: PRIORITY_STYLES[p].bg, color: PRIORITY_STYLES[p].color }}>
            {p} — {labels[p]} ({cs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cs.map(c => {
              const dc = DOMAIN_COLORS[c.domain];
              const ss = STATUS_STYLES[c.status];
              return (
                <div key={c.id} onClick={() => onSelect(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999', width: 32 }}>#{c.id}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dc.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#3a3836', flex: 1 }}>{c.title}</span>
                  <TriggerBadge caseId={c.id} compact />
                  <Badge bg={ss.bg} color={ss.color}>{c.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MindmapView({ cases, onSelect }) {
  const byDomain = {};
  DOMAINS.slice(1).forEach(d => { byDomain[d] = cases.filter(c => c.domain === d); });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent), #8a7aba)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 24, boxShadow: '0 4px 16px var(--accent-glow)' }}>
          LABNO LABS SYSTEM
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {Object.entries(byDomain).map(([domain, cs]) => {
          const dc = DOMAIN_COLORS[domain];
          return cs.length > 0 && (
            <div key={domain} style={{ borderRadius: 12, border: `1px solid ${dc.accent}`, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', padding: 16, boxShadow: 'var(--glass-shadow)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 12, padding: '3px 10px', borderRadius: 6, display: 'inline-block', background: dc.badge, color: dc.badgeText }}>
                {domain} ({cs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {cs.map(c => {
                  const ps = PRIORITY_STYLES[c.priority];
                  const statusDot = c.status === 'DONE' ? '#5aaa6e' : c.status === 'IN_PROGRESS' ? '#4a9ac8' : c.status === 'BLOCKED' ? '#d14040' : '#ccc';
                  return (
                    <div key={c.id} onClick={() => onSelect(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'monospace', background: ps.bg, color: ps.color, padding: '0 4px', borderRadius: 3 }}>{c.priority}</span>
                      <span style={{ fontSize: 12, color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                      <TriggerBadge caseId={c.id} compact />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphView({ cases, onSelect }) {
  const allIds = new Set(cases.map(c => c.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Cases with no dependencies run first. Arrows show blocking relationships.</div>
      {cases.map(c => {
        const dc = DOMAIN_COLORS[c.domain];
        const ss = STATUS_STYLES[c.status];
        const blockedBy = c.depends.filter(d => allIds.has(d));
        const blocks = cases.filter(x => x.depends.includes(c.id)).map(x => x.id);
        return (
          <div key={c.id} onClick={() => onSelect(c)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 10, borderLeft: `3px solid ${dc.accent}`, background: 'var(--glass-bg)', padding: '10px 12px', transition: 'box-shadow 0.15s', boxShadow: 'var(--glass-shadow)' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--glass-shadow)'}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999', width: 32, flexShrink: 0, paddingTop: 2 }}>#{c.id}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#3a3836', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <TriggerBadge caseId={c.id} compact />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                {blockedBy.length > 0 && <span style={{ fontSize: 11, color: '#999' }}>&larr; needs: {blockedBy.map(d => `#${d}`).join(' ')}</span>}
                {blocks.length > 0 && <span style={{ fontSize: 11, color: '#777' }}>&rarr; unlocks: {blocks.map(d => `#${d}`).join(' ')}</span>}
                {blockedBy.length === 0 && <span style={{ fontSize: 11, color: '#5aaa6e' }}>&#x2713; no dependencies</span>}
              </div>
            </div>
            <Badge bg={ss.bg} color={ss.color}>{c.status}</Badge>
          </div>
        );
      })}
    </div>
  );
}

// ─── Suggested Auto-Triggers Panel ────────────────────────────────────────────

function SuggestedTriggers({ cases, onSelect }) {
  const suggested = useMemo(() => {
    return cases
      .filter(c => {
        const cfg = TRIGGER_CONFIG[c.id];
        return cfg && cfg.trigger === 'auto' && c.status === 'TODO';
      })
      .sort((a, b) => {
        const pOrder = { P0: 0, P1: 1, P2: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        // Prefer cases with no unresolved dependencies
        const aReady = a.depends.every(d => cases.find(x => x.id === d)?.status === 'DONE');
        const bReady = b.depends.every(d => cases.find(x => x.id === d)?.status === 'DONE');
        if (aReady !== bReady) return aReady ? -1 : 1;
        return 0;
      });
  }, [cases]);

  if (suggested.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(45,138,78,0.06), rgba(45,138,78,0.02))',
      border: '1px solid rgba(45,138,78,0.15)', borderRadius: 12, padding: 16, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={16} style={{ color: '#2d8a4e' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#2d8a4e' }}>Suggested Auto-Triggers</span>
        <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>
          {suggested.length} cases ready for autonomous scheduling
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {suggested.slice(0, 8).map(c => {
          const dc = DOMAIN_COLORS[c.domain];
          const cfg = TRIGGER_CONFIG[c.id];
          const depsReady = c.depends.every(d => cases.find(x => x.id === d)?.status === 'DONE');
          const hasUnmetDeps = c.depends.length > 0 && !depsReady;
          return (
            <div key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                cursor: 'pointer', transition: 'background 0.15s',
                opacity: hasUnmetDeps ? 0.6 : 1,
              }}
              onClick={() => onSelect(c)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,138,78,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Play size={12} style={{ color: '#2d8a4e', flexShrink: 0 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999', width: 28 }}>#{c.id}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dc.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#3a3836', flex: 1 }}>{c.title}</span>
              <Badge bg={PRIORITY_STYLES[c.priority].bg} color={PRIORITY_STYLES[c.priority].color}>{c.priority}</Badge>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#999' }}>{FREQ_LABELS[cfg.freq]}</span>
              {hasUnmetDeps && (
                <span style={{ fontSize: 10, color: '#c49a40' }} title={`Waiting on: ${c.depends.join(', ')}`}>deps</span>
              )}
            </div>
          );
        })}
        {suggested.length > 8 && (
          <div style={{ fontSize: 11, color: '#999', padding: '4px 12px' }}>+{suggested.length - 8} more</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const selectStyle = {
  fontSize: 12, background: 'var(--glass-bg)', color: '#3a3836', border: '1px solid var(--glass-border)',
  borderRadius: 8, padding: '6px 10px', backdropFilter: 'var(--glass-blur)', outline: 'none', cursor: 'pointer',
};

const TaskQueue = () => {
  const [view, setView] = useState('Simple');
  const [domainFilter, setDomainFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [triggerFilter, setTriggerFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [statuses, setStatuses] = useState(() => Object.fromEntries(CASES.map(c => [c.id, c.status])));
  const [runHistory, setRunHistory] = useState({});

  // Load task run history from global_tasks table
  useEffect(() => {
    async function loadRunHistory() {
      try {
        const { data, error } = await supabase
          .from('global_tasks')
          .select('case_id, last_run_at, last_run_status, next_run_at');
        if (!error && data) {
          const history = {};
          data.forEach(row => {
            if (row.case_id) {
              history[row.case_id] = {
                last_run_at: row.last_run_at || null,
                last_run_status: row.last_run_status || null,
                next_run_at: row.next_run_at || null,
              };
            }
          });
          setRunHistory(history);
        }
      } catch {
        // Silently fail — fields may not exist yet
      }
    }
    loadRunHistory();
  }, []);

  const casesWithStatus = useMemo(() =>
    CASES.map(c => ({
      ...c,
      status: statuses[c.id] || c.status,
      last_run_at: runHistory[c.id]?.last_run_at || null,
      last_run_status: runHistory[c.id]?.last_run_status || null,
      next_run_at: runHistory[c.id]?.next_run_at || null,
    })),
    [statuses, runHistory]
  );

  const filtered = useMemo(() => casesWithStatus.filter(c => {
    const cfg = TRIGGER_CONFIG[c.id];
    return (
      (domainFilter === 'All' || c.domain === domainFilter) &&
      (priorityFilter === 'All' || c.priority === priorityFilter) &&
      (statusFilter === 'All' || c.status === statusFilter) &&
      (triggerFilter === 'All' || (cfg && cfg.trigger === triggerFilter))
    );
  }), [casesWithStatus, domainFilter, priorityFilter, statusFilter, triggerFilter]);

  const stats = useMemo(() => {
    const s = { TODO: 0, IN_PROGRESS: 0, DONE: 0, BLOCKED: 0 };
    casesWithStatus.forEach(c => s[c.status]++);
    return s;
  }, [casesWithStatus]);

  const triggerStats = useMemo(() => {
    const s = { auto: 0, gated: 0, manual: 0 };
    casesWithStatus.forEach(c => {
      const cfg = TRIGGER_CONFIG[c.id];
      if (cfg) s[cfg.trigger]++;
    });
    return s;
  }, [casesWithStatus]);

  const handleStatusChange = async (id, newStatus) => {
    const c = casesWithStatus.find(x => x.id === id);
    const oldStatus = c?.status;
    setStatuses(prev => ({ ...prev, [id]: newStatus }));
    setSelected(prev => prev ? { ...prev, status: newStatus } : prev);

    // Auto-log status change to work_history
    if (c && oldStatus !== newStatus) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          fetch('/api/hooks/work-log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              task_title: `CASE-${c.id}: ${c.title} → ${newStatus}`,
              project_name: 'labno-labs-center',
              category: c.domain === 'INFRA' ? 'Infrastructure' : c.domain === 'BRAIN' ? 'Feature' : c.domain === 'CONTENT' ? 'UI/UX' : 'Feature',
              status: newStatus === 'DONE' ? 'completed' : newStatus === 'IN_PROGRESS' ? 'in_progress' : newStatus.toLowerCase(),
              notes: `${c.desc}\nPriority: ${c.priority} | Agent: ${c.agent} | Previous: ${oldStatus}`,
              agent_or_mcp: c.agent === 'Claude Code' ? 'Claude Opus' : c.agent,
            }),
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const selectedWithStatus = selected
    ? { ...selected, status: statuses[selected.id] || selected.status }
    : null;

  return (
    <div className="page-content" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#999', marginBottom: 2 }}>LABNO LABS / SYSTEM TASK QUEUE</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#3a3836', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>50-Case Build Spec v1.0 <InfoTooltip text={PAGE_INFO.taskqueue} /></h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats).map(([st, n]) => {
              const ss = STATUS_STYLES[st];
              return <span key={st} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: ss.bg, color: ss.color, fontWeight: 500 }}>{st}: {n}</span>;
            })}
          </div>
        </div>
        {/* Trigger readiness summary */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {Object.entries(triggerStats).map(([t, n]) => {
            const tm = TRIGGER_META[t];
            const Icon = tm.icon;
            return (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: tm.color }}>
                <Icon size={12} />
                {n} {tm.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Suggested Auto-Triggers */}
      <SuggestedTriggers cases={casesWithStatus} onSelect={setSelected} />

      {/* Domain Sub-Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 12,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        overflowX: 'auto',
      }}>
        {DOMAINS.map(d => {
          const isActive = domainFilter === d;
          const dc = d !== 'All' ? DOMAIN_COLORS[d] : null;
          const count = d === 'All' ? CASES.length : CASES.filter(c => c.domain === d).length;
          return (
            <button key={d} onClick={() => setDomainFilter(d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: '0.82rem', fontWeight: isActive ? 600 : 500,
                color: isActive ? (dc ? dc.accent : '#b06050') : '#6b6764',
                background: 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${dc ? dc.accent : '#b06050'}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s', marginBottom: '-1px', whiteSpace: 'nowrap',
              }}
            >
              {dc && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dc.dot, flexShrink: 0 }} />}
              {d === 'All' ? 'All Domains' : d}
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                background: isActive ? (dc ? dc.badge : 'rgba(176,96,80,0.12)') : 'rgba(0,0,0,0.05)',
                color: isActive ? (dc ? dc.badgeText : '#b06050') : '#8a8682',
                padding: '1px 7px', borderRadius: 10,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div className="glass-panel" style={{ display: 'flex', padding: 3, gap: 2, borderRadius: 10 }}>
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 7, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: view === v.key ? 'var(--accent-light)' : 'transparent',
                  color: view === v.key ? 'var(--accent)' : '#999',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Icon size={14} />
                {v.key}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} style={selectStyle}>
            <option value="All">All Triggers</option>
            {TRIGGER_FILTERS.slice(1).map(t => <option key={t} value={t}>{TRIGGER_META[t].label} ({triggerStats[t]})</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={selectStyle}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#999', marginBottom: 12 }}>
        Showing {filtered.length} of {CASES.length} cases
        {domainFilter !== 'All' && ` \u00B7 ${domainFilter}`}
        {priorityFilter !== 'All' && ` \u00B7 ${priorityFilter}`}
        {statusFilter !== 'All' && ` \u00B7 ${statusFilter}`}
        {triggerFilter !== 'All' && ` \u00B7 ${TRIGGER_META[triggerFilter].label}`}
      </div>

      {/* View */}
      <div style={{ paddingBottom: 32 }}>
        {view === 'Linear' && <LinearView cases={filtered} onSelect={setSelected} />}
        {view === 'Kanban' && <KanbanView cases={filtered} onSelect={setSelected} />}
        {view === 'Simple' && <SimpleView cases={filtered} onSelect={setSelected} />}
        {view === 'Mindmap' && <MindmapView cases={filtered} onSelect={setSelected} />}
        {view === 'Graph' && <GraphView cases={filtered} onSelect={setSelected} />}
      </div>

      {/* Legend */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        {Object.entries(DOMAIN_COLORS).map(([d, dc]) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dc.dot }} />
            <span style={{ fontSize: 12, color: '#999' }}>{d}</span>
          </div>
        ))}
        <span style={{ color: '#ddd' }}>|</span>
        {Object.entries(TRIGGER_META).map(([t, tm]) => {
          const Icon = tm.icon;
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={11} style={{ color: tm.color }} />
              <span style={{ fontSize: 12, color: '#999' }}>{tm.label}</span>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal c={selectedWithStatus} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
    </div>
  );
};

export default TaskQueue;
