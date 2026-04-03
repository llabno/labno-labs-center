-- =============================================================================
-- seed-staging.sql — Staging seed data for labno-labs-center
--
-- HIPAA COMPLIANCE: This file contains ONLY fake/anonymized test data.
-- NO real patient names, emails, phone numbers, or clinical information.
-- All data uses obviously fake identifiers (Test, Demo, Alpha, etc.)
--
-- Covers all 11 tables:
--   1. internal_projects       (5 rows)
--   2. global_tasks            (20 rows)
--   3. oracle_sops             (10 rows)
--   4. moso_clinical_leads     (5 rows — ANONYMIZED)
--   5. labno_consulting_leads  (5 rows)
--   6. geo_telemetry           (8 rows)
--   7. moso_sync_log           (6 rows)
--   8. ifs_parts               (0 rows — requires auth.users, skip in seed)
--   9. ifs_contracts           (0 rows — requires auth.users, skip in seed)
--  10. ifs_relationships       (0 rows — requires auth.users, skip in seed)
--  11. ifs_unburdening_sessions(0 rows — requires auth.users, skip in seed)
--
-- Note: IFS tables (8-11) require a real auth.users UUID from Supabase Auth.
-- They cannot be seeded without a logged-in user. Test them via the UI.
--
-- Usage:
--   psql $STAGING_DB_URL -f scripts/seed-staging.sql
--   OR
--   supabase db reset --db-url $STAGING_DB_URL && psql $STAGING_DB_URL -f scripts/seed-staging.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. internal_projects (5 rows)
-- Covers: all statuses, zero tasks, max complexity, null due_date
-- =============================================================================
INSERT INTO internal_projects (id, name, status, total_tasks, completed_tasks, due_date, complexity) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Test Project Alpha',   'Active',   8, 3, '2026-05-15', 3),
    ('a0000000-0000-0000-0000-000000000002', 'Test Project Bravo',   'Planning',  5, 0, '2026-06-01', 2),
    ('a0000000-0000-0000-0000-000000000003', 'Test Project Charlie', 'Blocked',   4, 2, '2026-04-20', 5),
    ('a0000000-0000-0000-0000-000000000004', 'Test Project Delta',   'Active',    3, 3, NULL,         1),
    ('a0000000-0000-0000-0000-000000000005', 'Empty Project Echo',   'Planning',  0, 0, NULL,         1);

-- =============================================================================
-- 2. global_tasks (20 rows)
-- Covers: all column_id states (backlog, review, completed), all assignees,
--         blocked/unblocked, null descriptions, varying complexity
-- =============================================================================
INSERT INTO global_tasks (id, project_id, title, description, column_id, complexity, assigned_to, is_blocked) VALUES
    -- Project Alpha tasks (8 tasks, mixed states)
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Set up staging environment',    'Configure Supabase staging project',          'completed', 2, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Build Oracle search endpoint',  'Implement /api/oracle/ask with embeddings',   'completed', 4, 'agent',  false),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Integrate PostHog telemetry',   NULL,                                           'completed', 3, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Design geo heatmap component',  'React component for zip code visualization',  'review',    3, 'avery',  false),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Add RingCentral click-to-call', 'SMS and voice from reactivation inbox',        'review',    4, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Write API rate limiting',       NULL,                                           'backlog',   2, 'agent',  false),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Blocked: waiting on API key',   'Need Lemon Squeezy production key',           'backlog',   1, 'lance',  true),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Mobile responsive pass',        'Test all pages on iOS Safari',                'backlog',   3, 'romy',   false),

    -- Project Bravo tasks (5 tasks, all backlog — planning phase)
    ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Research competitor dashboards', 'Document 3 competitor approaches',             'backlog',   1, 'avery',  false),
    ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Draft data model for CRM v2',   NULL,                                           'backlog',   3, NULL,     false),
    ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Create wireframes',             'Figma wireframes for new layout',             'backlog',   2, 'romy',   false),
    ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'Write RFC for auth flow',       'Apple Sign In + Instagram OAuth',             'backlog',   4, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Estimate timeline',             NULL,                                           'backlog',   1, 'lance',  false),

    -- Project Charlie tasks (4 tasks, 2 completed, 2 blocked)
    ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000003', 'Migrate legacy CSV data',       'Convert 3 spreadsheets to Supabase',          'completed', 3, 'agent',  false),
    ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 'Validate migrated records',     'Run quality checks on imported data',         'completed', 2, 'agent',  false),
    ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000003', 'Fix duplicate detection',       'Fuzzy matching finds false positives',        'review',    5, 'lance',  true),
    ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000003', 'Deploy migration to prod',      'Blocked on duplicate fix',                    'backlog',   2, 'lance',  true),

    -- Project Delta tasks (3 tasks, all completed)
    ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000004', 'Create MOSO bridge endpoint',   '/api/data/moso-bridge',                       'completed', 3, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000004', 'Test bridge with Apps Script',  'Verify GAS can POST to the endpoint',         'completed', 2, 'lance',  false),
    ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000004', 'Document bridge protocol',      'Added to Oracle as SOP',                      'completed', 1, 'agent',  false);

    -- Project Echo has 0 tasks (edge case: empty project)

-- =============================================================================
-- 3. oracle_sops (10 rows)
-- Covers: different visibility, varying token counts, NULL embedding
-- =============================================================================
INSERT INTO oracle_sops (id, title, content, visibility, status, token_count) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Test SOP: Morning Standup',        'Daily standup format: 1) What I did yesterday 2) What I am doing today 3) Blockers. Keep under 5 minutes.', 'Private Brain (Internal Only)', 'Synced', 45),
    ('c0000000-0000-0000-0000-000000000002', 'Test SOP: Deployment Checklist',   'Before deploying: run tests, check env vars, verify migrations, notify team in Slack.', 'Private Brain (Internal Only)', 'Synced', 38),
    ('c0000000-0000-0000-0000-000000000003', 'Test SOP: Client Onboarding',      'Step 1: Discovery call. Step 2: Send proposal. Step 3: Sign contract. Step 4: Kickoff meeting. Step 5: Begin sprint 1.', 'Public (Share with clients)', 'Synced', 52),
    ('c0000000-0000-0000-0000-000000000004', 'Test SOP: Lead Qualification',     'Score leads by: budget (1-5), timeline (1-5), fit (1-5). Total >= 10 = qualified. Route to CRM.', 'Private Brain (Internal Only)', 'Synced', 40),
    ('c0000000-0000-0000-0000-000000000005', 'Test SOP: Content Publishing',     'Write draft -> Review -> SEO check -> Schedule in CMS -> Promote on social.', 'Public (Share with clients)', 'Synced', 30),
    ('c0000000-0000-0000-0000-000000000006', 'Test SOP: Exercise Programming',   'Template: warm-up (5 min), main block (30 min), cooldown (10 min). Always include RPE scale.', 'Private Brain (Internal Only)', 'Synced', 35),
    ('c0000000-0000-0000-0000-000000000007', 'Test SOP: Data Backup Protocol',   'Weekly: export Supabase via API. Monthly: full pg_dump. Store in Google Cloud Storage with 90-day retention.', 'Private Brain (Internal Only)', 'Synced', 48),
    ('c0000000-0000-0000-0000-000000000008', 'Test SOP: Bug Triage',             'P0: Production down. P1: Feature broken. P2: Minor issue. P3: Nice to have. Respond within: P0=1hr, P1=4hr, P2=24hr, P3=sprint.', 'Private Brain (Internal Only)', 'Synced', 55),
    ('c0000000-0000-0000-0000-000000000009', 'Test SOP: Agent Task Format',      'All agent tasks must include: objective, constraints, expected output format, max token budget.', 'Private Brain (Internal Only)', 'Synced', 32),
    ('c0000000-0000-0000-0000-000000000010', 'Test SOP: Empty Content Edge',     NULL, 'Private Brain (Internal Only)', 'Draft', NULL);

-- =============================================================================
-- 4. moso_clinical_leads (5 rows) — ANONYMIZED, NO REAL DATA
-- Covers: all statuses, null email, null condition_notes
-- =============================================================================
INSERT INTO moso_clinical_leads (id, patient_name, email, condition_notes, status) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'Test Patient Alpha',   'test.alpha@example.com',   'Test condition: general wellness evaluation',    'New Intake'),
    ('d0000000-0000-0000-0000-000000000002', 'Test Patient Bravo',   'test.bravo@example.com',   'Test condition: movement assessment requested',  'In Progress'),
    ('d0000000-0000-0000-0000-000000000003', 'Test Patient Charlie', NULL,                        'Test condition: follow-up scheduling',           'Completed'),
    ('d0000000-0000-0000-0000-000000000004', 'Test Patient Delta',   'test.delta@example.com',   NULL,                                             'New Intake'),
    ('d0000000-0000-0000-0000-000000000005', 'Test Patient Echo',    'test.echo@example.com',    'Test condition: max complexity edge case with a very long note that tests column width and rendering in the dashboard UI component', 'Archived');

-- =============================================================================
-- 5. labno_consulting_leads (5 rows)
-- Covers: varying LTV, null email, null app_interest
-- =============================================================================
INSERT INTO labno_consulting_leads (id, company_name, email, app_interest, lifetime_value) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Demo Corp Alpha',       'contact@democorp-alpha.example.com',  'Dashboard + Analytics',           4500.00),
    ('e0000000-0000-0000-0000-000000000002', 'Demo Corp Bravo',       'hello@democorp-bravo.example.com',    'Lead Generation Pipeline',        12000.00),
    ('e0000000-0000-0000-0000-000000000003', 'Demo Corp Charlie',     NULL,                                   'Website Rebuild',                 0.00),
    ('e0000000-0000-0000-0000-000000000004', 'Demo Corp Delta',       'team@democorp-delta.example.com',     NULL,                              750.00),
    ('e0000000-0000-0000-0000-000000000005', 'Demo Corp Echo',        'ceo@democorp-echo.example.com',       'Full Agent System + CRM + Site',  28500.00);

-- =============================================================================
-- 6. geo_telemetry (8 rows)
-- Covers: multiple dates, multiple states, zero values, high traffic
-- =============================================================================
INSERT INTO geo_telemetry (id, zipcode, city, state, country, visitor_count, session_count, avg_duration_seconds, page_views, top_pages, date, source) VALUES
    ('f0000000-0000-0000-0000-000000000001', '60201', 'Evanston',     'IL', 'US', 145, 210, 187.5,  890, ARRAY['/dashboard', '/oracle', '/projects'],     '2026-04-01', 'posthog'),
    ('f0000000-0000-0000-0000-000000000002', '60202', 'Evanston',     'IL', 'US', 32,  45,  95.2,   120, ARRAY['/dashboard'],                             '2026-04-01', 'posthog'),
    ('f0000000-0000-0000-0000-000000000003', '10001', 'New York',     'NY', 'US', 78,  102, 142.8,  450, ARRAY['/oracle', '/sniper'],                     '2026-04-01', 'posthog'),
    ('f0000000-0000-0000-0000-000000000004', '90210', 'Beverly Hills','CA', 'US', 12,  15,  45.0,   30,  ARRAY['/'],                                      '2026-04-01', 'posthog'),
    ('f0000000-0000-0000-0000-000000000005', '60201', 'Evanston',     'IL', 'US', 160, 230, 195.0,  950, ARRAY['/dashboard', '/oracle', '/crm'],          '2026-04-02', 'posthog'),
    ('f0000000-0000-0000-0000-000000000006', '00000', 'Unknown',      NULL, 'US', 0,   0,   0,      0,   NULL,                                            '2026-04-01', 'manual'),
    ('f0000000-0000-0000-0000-000000000007', '60601', 'Chicago',      'IL', 'US', 55,  70,  110.3,  280, ARRAY['/sniper', '/dashboard'],                  '2026-04-02', 'posthog'),
    ('f0000000-0000-0000-0000-000000000008', '30301', 'Atlanta',      'GA', 'US', 8,   10,  30.0,   15,  ARRAY['/oracle'],                                '2026-04-02', 'posthog');

-- =============================================================================
-- 7. moso_sync_log (6 rows)
-- Covers: all agents, various output types, different energy states
-- =============================================================================
INSERT INTO moso_sync_log (id, agent, output_type, title, content, metadata, energy_state, domains_active) VALUES
    ('g0000000-0000-0000-0000-000000000001', 'chief',      'weekly_pulse',     'Test Weekly Pulse — Week 14',          'Summary of week 14 activities. All projects on track. Focus areas: Oracle launch and staging setup.', '{"week": 14, "year": 2026}', 'High', ARRAY['Labno Labs', 'Movement Solutions']),
    ('g0000000-0000-0000-0000-000000000002', 'coach',      'morning_briefing', 'Test Morning Briefing — Apr 1',        'Today focus: staging environment setup and seed data. Energy is steady. No fires.',                   '{"date": "2026-04-01"}',     'Steady', ARRAY['Labno Labs']),
    ('g0000000-0000-0000-0000-000000000003', 'architect',  'pattern_alert',    'Test Pattern: Repeated manual deploys','Detected 5 manual deploys this week. Recommend: add CI/CD pipeline or Vercel auto-deploy.',           '{"occurrences": 5}',         'Steady', ARRAY['Labno Labs']),
    ('g0000000-0000-0000-0000-000000000004', 'librarian',  'sop_update',       'Test SOP Sync — 3 new entries',        'Synced 3 new SOPs from Google Docs. Token counts: 45, 38, 52.',                                       '{"sop_count": 3}',           'High', ARRAY['Labno Labs', 'Slowbraid']),
    ('g0000000-0000-0000-0000-000000000005', 'voice',      'content_draft',    'Test Content Draft — Blog Post',       'Draft: How to Build a Dashboard in 48 Hours. Word count: 1200. Status: needs review.',                '{"word_count": 1200}',       'Low', ARRAY['Slowbraid']),
    ('g0000000-0000-0000-0000-000000000006', 'overseer',   'system_health',    'Test System Health Check',             'All agents operational. Last failure: none. Queue depth: 0. Uptime: 99.8%.',                          '{"uptime": 99.8}',           'Steady', ARRAY['Labno Labs', 'Movement Solutions', 'Slowbraid']);

COMMIT;

-- =============================================================================
-- Verify seed counts
-- =============================================================================
DO $$
DECLARE
    tbl RECORD;
    cnt BIGINT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'internal_projects', 'global_tasks', 'oracle_sops',
            'moso_clinical_leads', 'labno_consulting_leads',
            'geo_telemetry', 'moso_sync_log'
        ]) AS name
    LOOP
        EXECUTE format('SELECT count(*) FROM %I', tbl.name) INTO cnt;
        RAISE NOTICE 'Table % has % rows', tbl.name, cnt;
    END LOOP;
END $$;
