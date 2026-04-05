-- ============================================================
-- Phase 2.1: Seed pipeline_task_templates
-- Exhaustive task trees for all 8 stages x 2 tracks (app/service)
-- ============================================================
-- RUN IN: Supabase SQL Editor (Mission Control project)
-- ============================================================

-- Fix any NULL project_type values
UPDATE projects SET project_type = 'internal' WHERE project_type IS NULL OR project_type = '';

-- ═══════════════════════════════════════════════════════════════
-- STAGE 1: KICKOFF
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
-- App Build tasks
(1, '{app}', 'Clone starter template repo', 'Clone labno-starter or create-next-app with TypeScript', 'auto', 'Claude Code', 1, NULL),
(1, '{app}', 'Initialize Next.js with TypeScript', 'npx create-next-app with App Router, TypeScript, Tailwind', 'auto', 'Claude Code', 2, NULL),
(1, '{app}', 'Install core dependencies', 'Tailwind CSS, Lucide icons, Supabase client, date-fns', 'auto', 'Claude Code', 3, NULL),
(1, '{app}', 'Create .env.example with required keys', 'Document all VITE_ and server-side env vars needed', 'auto', 'Claude Code', 4, NULL),
(1, '{app}', 'Set up .gitignore', 'Protect credentials, node_modules, .env, build artifacts', 'auto', 'Claude Code', 5, NULL),
(1, '{app}', 'Create config.yaml for project settings', 'Centralize project name, version, feature flags', 'auto', 'Claude Code', 6, NULL),
(1, '{app}', 'Set up Supabase project and tables', 'Create project in Supabase, run initial schema migration', 'gated', 'Claude Code', 7, NULL),
(1, '{app}', 'Configure Supabase Auth with Google OAuth', 'Wire OAuth provider, set redirect URLs for dev and prod', 'gated', 'Claude Code', 8, '002'),
(1, '{app}', 'Create RLS policies for all tables', 'Row Level Security based on auth email domain', 'gated', 'Claude Code', 9, '001'),
(1, '{app}', 'Create API route scaffolding', 'Set up /api directory structure with health check endpoint', 'auto', 'Claude Code', 10, NULL),
(1, '{app}', 'Set up error logging', 'Configure PostHog or Sentry for error tracking', 'auto', 'Claude Code', 11, NULL),
(1, '{app}', 'Configure Vercel project', 'Create Vercel project, link repo, set env vars', 'gated', 'Claude Code', 12, NULL),
(1, '{app}', 'Deploy initial preview branch', 'Push to feature branch, verify Vercel preview deploys', 'auto', 'Claude Code', 13, NULL),
(1, '{app}', 'Run smoke test on preview', 'Verify homepage loads, auth works, Supabase connects', 'auto', 'Claude Code', 14, NULL),
(1, '{app}', 'Set up CI/CD with GitHub Actions', 'Lint, type-check, test on PR; auto-deploy on merge', 'gated', 'Claude Code', 15, '009'),
(1, '{app}', 'Create project card in Command Center', 'Add to projects table with correct venture and type', 'auto', 'Claude Code', 16, NULL),
(1, '{app}', 'Record setup in Workflow Capture', 'Capture this kickoff as a reusable workflow', 'auto', 'Claude Code', 17, NULL),
-- Service Build tasks
(1, '{service}', 'Create client record in clients table', 'Add client name, email, company, tier, enabled features', 'gated', 'Claude Code', 1, NULL),
(1, '{service}', 'Process onboarding form answers', 'Review intake submission, tag type and priority', 'manual', 'Lance', 2, NULL),
(1, '{service}', 'Schedule discovery call', 'Book 30-min call to align on scope and expectations', 'manual', 'Lance', 3, NULL),
(1, '{service}', 'Run AI Readiness Audit', 'Ingest client SOPs, org chart, tech stack; generate audit report', 'gated', 'Claude Code', 4, '021'),
(1, '{service}', 'Create project in Command Center', 'Add project with project_type=client, link to client record', 'auto', 'Claude Code', 5, NULL),
(1, '{service}', 'Set up per-client RLS policies', 'Isolate client data with Row Level Security', 'gated', 'Claude Code', 6, '024'),
(1, '{service}', 'Send welcome email with portal access', 'Provide login credentials and onboarding guide', 'manual', 'Lance', 7, NULL),
-- Both tracks
(1, '{app,service}', 'Create Slack/comms channel for project', 'Set up dedicated communication channel', 'manual', 'Lance', 18, NULL),
(1, '{app,service}', 'Define success criteria and KPIs', 'Document what done looks like, measurable outcomes', 'manual', 'Lance', 19, NULL),
(1, '{app,service}', 'Assign team members', 'Set assigned_to on project for Lance, Avery, Romy, Sarah, or Agent', 'manual', 'Lance', 20, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 2: SCOPE
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(2, '{app}', 'Draft feature list from requirements', 'Break down user needs into discrete features', 'gated', 'Claude Code', 1, NULL),
(2, '{app}', 'Map user stories for each feature', 'As a [user], I want [action] so that [benefit]', 'gated', 'Claude Code', 2, NULL),
(2, '{app}', 'Prioritize MVP scope', 'Must-have vs nice-to-have; what ships in v1', 'manual', 'Lance', 3, NULL),
(2, '{app}', 'Define data model and schema', 'Tables, columns, relationships, indexes', 'gated', 'Claude Code', 4, NULL),
(2, '{app}', 'Create database migration files', 'SQL migration scripts for all tables', 'auto', 'Claude Code', 5, NULL),
(2, '{app}', 'Map API endpoints needed', 'REST or RPC endpoints, request/response shapes', 'gated', 'Claude Code', 6, NULL),
(2, '{app}', 'Identify third-party integrations', 'Lemon Squeezy, GreenRope, Google APIs, etc.', 'manual', 'Lance', 7, NULL),
(2, '{app}', 'Estimate token budget for AI features', 'Forecast API costs based on expected usage', 'gated', 'Claude Code', 8, NULL),
(2, '{app}', 'Write technical spec document', 'Architecture, stack decisions, deployment strategy', 'gated', 'Claude Code', 9, NULL),
(2, '{service}', 'Generate Workflow Registry from audit', 'Map client task logs to DOE framework with agent assignments', 'auto', 'Claude Code', 1, '022'),
(2, '{service}', 'Define deliverable list and timeline', 'Concrete deliverables with dates and owners', 'manual', 'Lance', 2, NULL),
(2, '{service}', 'Scope automation opportunities', 'Which client workflows can be automated immediately', 'gated', 'Claude Code', 3, NULL),
(2, '{service}', 'Create consulting proposal', 'Auto-generate scoped proposal from audit output', 'gated', 'Claude Code', 4, '031'),
(2, '{service}', 'Get client sign-off on scope', 'Client reviews and approves deliverables and timeline', 'manual', 'Lance', 5, NULL),
(2, '{service}', 'Set up billing and payment schedule', 'Configure Lemon Squeezy or manual invoicing', 'manual', 'Lance', 6, NULL),
(2, '{app,service}', 'Create risk register', 'Identify blockers, dependencies, and mitigation plans', 'gated', 'Claude Code', 10, NULL),
(2, '{app,service}', 'Set project milestones', 'Key dates for each pipeline stage completion', 'manual', 'Lance', 11, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 3: DESIGN
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(3, '{app}', 'Create wireframes for all pages', 'Low-fidelity layout for each route/view', 'gated', 'Claude Code', 1, NULL),
(3, '{app}', 'Define color palette and typography', 'Primary, secondary, accent colors; font stack', 'gated', 'Claude Code', 2, NULL),
(3, '{app}', 'Build component library', 'Reusable React components: buttons, cards, modals, inputs', 'auto', 'Claude Code', 3, '039'),
(3, '{app}', 'Design responsive layouts', 'Mobile-first breakpoints for all pages', 'gated', 'Claude Code', 4, NULL),
(3, '{app}', 'Create glass-panel CSS theme', 'Apple Glass aesthetic with backdrop-filter and blur', 'auto', 'Claude Code', 5, NULL),
(3, '{app}', 'Design navigation and sidebar', 'Zone-based sidebar with sub-tabs', 'gated', 'Claude Code', 6, NULL),
(3, '{app}', 'Design data tables and lists', 'Sortable, filterable table components', 'auto', 'Claude Code', 7, NULL),
(3, '{app}', 'Design forms and input patterns', 'Consistent form layout, validation states, error messages', 'auto', 'Claude Code', 8, NULL),
(3, '{app}', 'Design loading and empty states', 'Skeleton loaders, empty state illustrations', 'auto', 'Claude Code', 9, NULL),
(3, '{app}', 'Design error and success feedback', 'Toast notifications, inline errors, success confirmations', 'auto', 'Claude Code', 10, NULL),
(3, '{app}', 'Implement dark mode support', 'CSS variables for light/dark theme switching', 'auto', 'Claude Code', 11, NULL),
(3, '{app}', 'Create icon set mapping', 'Map Lucide icons to all UI elements', 'auto', 'Claude Code', 12, NULL),
(3, '{service}', 'Design client-facing dashboard', 'Filtered view: deliverables, timeline, next steps, feedback', 'gated', 'Claude Code', 1, NULL),
(3, '{service}', 'Design workflow mapping visualizations', 'DOE framework diagrams for client presentation', 'gated', 'Claude Code', 2, NULL),
(3, '{service}', 'Create white-label theme config', 'Client branding: logo, colors, app name in theme_config', 'gated', 'Claude Code', 3, NULL),
(3, '{service}', 'Design client onboarding flow', 'Step-by-step intake form with progress indicator', 'gated', 'Claude Code', 4, NULL),
(3, '{app,service}', 'Accessibility audit of designs', 'WCAG 2.1 AA compliance check on all components', 'auto', 'Claude Code', 13, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 4: BUILD / EXECUTE
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(4, '{app}', 'Build all page routes', 'Create React Router routes for every page', 'auto', 'Claude Code', 1, NULL),
(4, '{app}', 'Implement authentication flow', 'Login, logout, session management, protected routes', 'gated', 'Claude Code', 2, '002'),
(4, '{app}', 'Build data fetching layer', 'Supabase queries, loading states, error handling', 'auto', 'Claude Code', 3, NULL),
(4, '{app}', 'Implement CRUD operations', 'Create, read, update, delete for all entities', 'auto', 'Claude Code', 4, NULL),
(4, '{app}', 'Build filtering and search', 'Client-side filtering, search across entities', 'auto', 'Claude Code', 5, NULL),
(4, '{app}', 'Implement real-time subscriptions', 'Supabase realtime for live data updates', 'gated', 'Claude Code', 6, NULL),
(4, '{app}', 'Build API endpoints', 'Server-side API routes for external integrations', 'auto', 'Claude Code', 7, NULL),
(4, '{app}', 'Implement file upload handling', 'Image/document upload to Supabase Storage if needed', 'gated', 'Claude Code', 8, NULL),
(4, '{app}', 'Build export functionality', 'CSV/JSON export for data tables', 'auto', 'Claude Code', 9, NULL),
(4, '{app}', 'Implement token cost tracking', 'Log per-query usage to token_usage_log', 'auto', 'Claude Code', 10, '013'),
(4, '{app}', 'Build agent execution endpoints', 'POST /api/agent/run for task dispatch', 'gated', 'Claude Code', 11, NULL),
(4, '{app}', 'Implement rate limiting', 'Per-user and per-client rate limits at edge', 'gated', 'Claude Code', 12, '014'),
(4, '{app}', 'Build notification system', 'In-app notifications for task completion, errors', 'auto', 'Claude Code', 13, NULL),
(4, '{app}', 'Implement keyboard shortcuts', 'Common actions: new task, search, navigate', 'auto', 'Claude Code', 14, NULL),
(4, '{app}', 'Build telemetry integration', 'PostHog events for user behavior tracking', 'auto', 'Claude Code', 15, NULL),
(4, '{service}', 'Execute audit deliverables', 'Run all audit tasks from the workflow registry', 'gated', 'Claude Code', 1, NULL),
(4, '{service}', 'Build client-specific automations', 'Custom workflows based on audit findings', 'gated', 'Claude Code', 2, NULL),
(4, '{service}', 'Generate implementation report', 'Document what was built, how it works, how to maintain', 'auto', 'Claude Code', 3, NULL),
(4, '{service}', 'Build client dashboard portal', 'Per-client filtered view with RLS', 'gated', 'Claude Code', 4, '036'),
(4, '{service}', 'Set up client agent assignments', 'Recommend and configure agents for client workflows', 'gated', 'Claude Code', 5, '040'),
(4, '{app,service}', 'Code review all implementations', 'Review for security, performance, correctness', 'manual', 'Lance', 16, NULL),
(4, '{app,service}', 'Update documentation', 'README, API docs, inline comments where needed', 'auto', 'Claude Code', 17, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 5: TEST
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(5, '{app}', 'Write unit tests for utilities', 'Test helper functions, formatters, validators', 'auto', 'Claude Code', 1, NULL),
(5, '{app}', 'Write integration tests for API routes', 'Test each endpoint with valid and invalid inputs', 'auto', 'Claude Code', 2, NULL),
(5, '{app}', 'Test authentication flows', 'Login, logout, session expiry, unauthorized access', 'gated', 'Claude Code', 3, NULL),
(5, '{app}', 'Test RLS policies', 'Verify data isolation between users and roles', 'auto', 'Claude Code', 4, '001'),
(5, '{app}', 'Run prompt injection tests', 'Adversarial testing of AI-facing endpoints', 'gated', 'Claude Code', 5, '003'),
(5, '{app}', 'Test responsive layouts on mobile', 'iPhone, iPad, Android breakpoints', 'manual', 'Lance', 6, NULL),
(5, '{app}', 'Test cross-browser compatibility', 'Chrome, Safari, Firefox, Edge', 'manual', 'Lance', 7, NULL),
(5, '{app}', 'Performance testing', 'Lighthouse audit, bundle size check, load time', 'auto', 'Claude Code', 8, NULL),
(5, '{app}', 'Test error handling paths', 'Network failures, invalid data, rate limits', 'auto', 'Claude Code', 9, NULL),
(5, '{app}', 'Run accessibility audit', 'Screen reader, keyboard navigation, contrast ratios', 'auto', 'Claude Code', 10, NULL),
(5, '{app}', 'Test data export functionality', 'CSV/JSON exports produce valid files', 'auto', 'Claude Code', 11, NULL),
(5, '{app}', 'Load testing for API endpoints', 'Simulate concurrent users, check response times', 'auto', 'Claude Code', 12, NULL),
(5, '{service}', 'Client UAT review', 'Client tests deliverables against acceptance criteria', 'manual', 'Lance', 1, NULL),
(5, '{service}', 'Validate automation outputs', 'Check all automated workflows produce correct results', 'gated', 'Claude Code', 2, NULL),
(5, '{service}', 'Test client portal access', 'Verify client can only see their own data', 'gated', 'Claude Code', 3, NULL),
(5, '{service}', 'Collect client feedback', 'Structured feedback form on deliverables', 'manual', 'Lance', 4, NULL),
(5, '{app,service}', 'Fix all critical and high bugs', 'Resolve P0 and P1 issues before deployment', 'gated', 'Claude Code', 13, NULL),
(5, '{app,service}', 'Security review', 'Check for XSS, SQL injection, exposed secrets', 'gated', 'Claude Code', 14, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 6: DEPLOY
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(6, '{app}', 'Merge feature branch to main', 'Final PR review and merge', 'gated', 'Claude Code', 1, NULL),
(6, '{app}', 'Verify production build succeeds', 'npm run build completes without errors', 'auto', 'Claude Code', 2, NULL),
(6, '{app}', 'Deploy to Vercel production', 'Push to main triggers auto-deploy', 'auto', 'Claude Code', 3, NULL),
(6, '{app}', 'Verify production deployment', 'Smoke test on production URL', 'auto', 'Claude Code', 4, NULL),
(6, '{app}', 'Set up production environment variables', 'All VITE_ and server env vars configured in Vercel', 'gated', 'Claude Code', 5, NULL),
(6, '{app}', 'Configure custom domain DNS', 'Point domain to Vercel, set up SSL', 'gated', 'Claude Code', 6, NULL),
(6, '{app}', 'Set up production monitoring', 'Error alerts, uptime checks, performance monitoring', 'auto', 'Claude Code', 7, '050'),
(6, '{app}', 'Configure backup and recovery', 'Automated Supabase backups, Vercel rollback protocol', 'auto', 'Claude Code', 8, '042'),
(6, '{app}', 'Set up staging vs production separation', 'Separate Supabase projects for staging and prod', 'gated', 'Claude Code', 9, '004'),
(6, '{app}', 'Monitor error rates post-deploy', 'Watch api_error_log and PostHog for 24 hours', 'auto', 'Claude Code', 10, NULL),
(6, '{service}', 'Deploy client automations to production', 'Move from staging to live environment', 'gated', 'Claude Code', 1, NULL),
(6, '{service}', 'Activate client portal access', 'Enable client login and verify RLS isolation', 'gated', 'Claude Code', 2, NULL),
(6, '{service}', 'Send deployment notification to client', 'Email with live URLs and access instructions', 'manual', 'Lance', 3, NULL),
(6, '{app,service}', 'Update Active Portfolio entry', 'Set status to Live, add Vercel URL and GitHub link', 'auto', 'Claude Code', 11, NULL),
(6, '{app,service}', 'Create rollback plan', 'Document how to revert if issues found post-deploy', 'auto', 'Claude Code', 12, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 7: HANDOFF
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(7, '{app}', 'Map custom domain for client', 'Configure DNS records, verify SSL cert', 'manual', 'Lance', 1, NULL),
(7, '{app}', 'Set up client user accounts', 'Create auth accounts with appropriate roles', 'gated', 'Claude Code', 2, NULL),
(7, '{app}', 'Create user onboarding guide', 'Step-by-step walkthrough for end users', 'auto', 'Claude Code', 3, NULL),
(7, '{app}', 'Send onboarding email', 'Welcome email with login URL, guide link, support info', 'manual', 'Lance', 4, NULL),
(7, '{app}', 'Record walkthrough video', 'Loom video showing key features and workflows', 'manual', 'Lance', 5, NULL),
(7, '{app}', 'Set up support channel', 'Email or chat channel for bug reports and questions', 'manual', 'Lance', 6, NULL),
(7, '{app}', 'Transfer ownership if applicable', 'Give client admin access to Vercel project and repo', 'manual', 'Lance', 7, NULL),
(7, '{service}', 'Conduct training session', 'Live walkthrough of delivered automations and tools', 'manual', 'Lance', 1, NULL),
(7, '{service}', 'Deliver final documentation', 'Implementation report, workflow registry, runbooks', 'auto', 'Claude Code', 2, NULL),
(7, '{service}', 'Set up retainer agreement', 'Monthly support hours, SLA, escalation path', 'manual', 'Lance', 3, NULL),
(7, '{service}', 'Configure retainer dashboard', 'Client portal showing ongoing status and metrics', 'gated', 'Claude Code', 4, '036'),
(7, '{service}', 'Handoff to ongoing support agent', 'Assign long-term agent monitoring for client', 'gated', 'Claude Code', 5, NULL),
(7, '{app,service}', 'Collect launch feedback', 'Post-launch survey or structured feedback call', 'manual', 'Lance', 8, NULL),
(7, '{app,service}', 'Update project status to Handoff', 'Move project to handoff stage in Command Center', 'auto', 'Claude Code', 9, NULL);

-- ═══════════════════════════════════════════════════════════════
-- STAGE 8: CLOSE
-- ═══════════════════════════════════════════════════════════════
INSERT INTO pipeline_task_templates (stage, tracks, title, description, trigger_level, agent, sort_order, case_id) VALUES
(8, '{app}', 'Lock telemetry config', 'Finalize PostHog events, freeze tracking schema', 'auto', 'Claude Code', 1, NULL),
(8, '{app}', 'Archive project repository', 'Tag release version, archive if no ongoing development', 'gated', 'Claude Code', 2, NULL),
(8, '{app}', 'Final QA sign-off', 'Last check that everything works in production', 'manual', 'Lance', 3, NULL),
(8, '{app}', 'Update portfolio metrics', 'Set final MRR, active users, progress to 100%', 'auto', 'Claude Code', 4, NULL),
(8, '{app}', 'Run brand voice audit', 'Check all copy matches brand guidelines', 'gated', 'The Sniper', 5, '029'),
(8, '{service}', 'Generate case study from engagement', 'Anonymized outcomes for consulting portfolio', 'gated', 'The Sniper', 1, '041'),
(8, '{service}', 'Calculate ROI metrics', 'Time saved, error reduction, cost per workflow', 'auto', 'Claude Code', 2, '049'),
(8, '{service}', 'Send final invoice', 'Close out billing for project scope', 'manual', 'Lance', 3, NULL),
(8, '{service}', 'Request testimonial', 'Ask client for review or testimonial', 'manual', 'Lance', 4, NULL),
(8, '{app,service}', 'Run retrospective capture', 'What tasks were added, skipped, slow? Feed back into templates', 'gated', 'Claude Code', 5, NULL),
(8, '{app,service}', 'Update Workflow Capture library', 'Save new tasks and workflows discovered during this project', 'auto', 'Claude Code', 6, NULL),
(8, '{app,service}', 'Mark project as Completed', 'Set status to Completed in Command Center', 'auto', 'Claude Code', 7, NULL),
(8, '{app,service}', 'Generate cross-tab improvement suggestions', 'Suggest 5 ways this project type could integrate better across tabs', 'auto', 'Claude Code', 8, NULL),
(8, '{app,service}', 'Close project pipeline', 'Mark all pipeline stages as done, record completion date', 'auto', 'Claude Code', 9, NULL);
