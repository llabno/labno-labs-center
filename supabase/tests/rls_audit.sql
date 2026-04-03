-- ============================================================================
-- RLS Audit Test Suite for Labno Labs Center
-- ============================================================================
--
-- WHAT THIS TESTS:
--
--   1. RLS ENABLED          -- Every table has row_security = true
--   2. ANONYMOUS DENIAL      -- Anon role cannot SELECT/INSERT on any table
--   3. OUTSIDER DENIAL       -- Authenticated users outside @labnolabs.com
--                               cannot reach employee-only tables
--   4. EMPLOYEE ACCESS       -- @labnolabs.com employees can read/write
--                               tables they should access
--   5. LANCE ELEVATED        -- lance@labnolabs.com has write access to
--                               oracle_sops, geo_telemetry, moso_clinical_leads
--   6. CLINICAL ISOLATION    -- HIPAA tables (moso_clinical_leads, ifs_*)
--                               are invisible to non-owners / non-Lance
--   7. CROSS-TABLE JOINS     -- Joining tables does not leak rows that
--                               RLS would otherwise hide
--
-- TABLES COVERED (11):
--   internal_projects, global_tasks, oracle_sops, moso_clinical_leads,
--   labno_consulting_leads, geo_telemetry, moso_sync_log,
--   ifs_parts, ifs_contracts, ifs_relationships, ifs_unburdening_sessions
--
-- PERSONAS USED:
--   anon                       -- no JWT at all
--   outsider@gmail.com         -- authenticated but not an employee
--   avery@labnolabs.com        -- employee (non-lance)
--   lance@labnolabs.com        -- owner / admin
--   romy@movement-solutions.com -- cross-org employee (MOSO)
--
-- HOW TO RUN:
--   See README.md in this directory.
-- ============================================================================

BEGIN;

-- Load pgTAP
SELECT no_plan();

-- ============================================================================
-- HELPER: set_auth_context
-- Temporarily overrides auth.uid() and auth.email() so RLS evaluates
-- against the persona we want to test.  Works by setting local GUC vars
-- that Supabase auth functions read.
-- ============================================================================
CREATE OR REPLACE FUNCTION _test_set_auth(
    p_uid  UUID,
    p_email TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Supabase reads request.jwt.claims to resolve auth.uid() / auth.email()
    PERFORM set_config('request.jwt.claims',
        json_build_object(
            'sub', p_uid::text,
            'email', p_email,
            'role', 'authenticated'
        )::text,
        true  -- local to transaction
    );
    PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
    PERFORM set_config('request.jwt.claim.email', p_email, true);
    PERFORM set_config('role', 'authenticated', true);
END;
$$;

CREATE OR REPLACE FUNCTION _test_set_anon()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.email', '', true);
    PERFORM set_config('role', 'anon', true);
END;
$$;

CREATE OR REPLACE FUNCTION _test_reset_auth()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '{}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.email', '', true);
END;
$$;

-- Persona UUIDs (deterministic for reproducibility)
DO $$ BEGIN
    PERFORM set_config('test.uid_lance',   'a1111111-1111-1111-1111-111111111111', false);
    PERFORM set_config('test.uid_avery',   'a2222222-2222-2222-2222-222222222222', false);
    PERFORM set_config('test.uid_romy',    'a3333333-3333-3333-3333-333333333333', false);
    PERFORM set_config('test.uid_outsider','a4444444-4444-4444-4444-444444444444', false);
END $$;


-- ############################################################################
-- SECTION 1: RLS IS ENABLED ON EVERY TABLE
-- ############################################################################
SELECT diag('--- Section 1: RLS enabled on every table ---');

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'internal_projects'),
    'RLS enabled on internal_projects'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'global_tasks'),
    'RLS enabled on global_tasks'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'oracle_sops'),
    'RLS enabled on oracle_sops'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'moso_clinical_leads'),
    'RLS enabled on moso_clinical_leads'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'labno_consulting_leads'),
    'RLS enabled on labno_consulting_leads'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'geo_telemetry'),
    'RLS enabled on geo_telemetry'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'moso_sync_log'),
    'RLS enabled on moso_sync_log'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'ifs_parts'),
    'RLS enabled on ifs_parts'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'ifs_contracts'),
    'RLS enabled on ifs_contracts'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'ifs_relationships'),
    'RLS enabled on ifs_relationships'
);
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'ifs_unburdening_sessions'),
    'RLS enabled on ifs_unburdening_sessions'
);

-- Catch-all: no public-schema user tables without RLS
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND NOT c.relrowsecurity
          AND c.relname NOT LIKE 'pg_%'
          AND c.relname NOT LIKE '_pgtap%'
          AND c.relname NOT IN ('schema_migrations', 'spatial_ref_sys')
    ),
    'No public user tables exist without RLS enabled'
);


-- ############################################################################
-- SECTION 2: ANONYMOUS USERS CANNOT ACCESS ANY TABLE
-- ############################################################################
SELECT diag('--- Section 2: Anonymous user access denial ---');

SELECT _test_set_anon();

SELECT is(
    (SELECT count(*) FROM internal_projects),
    0::bigint,
    'anon: zero rows from internal_projects'
);
SELECT is(
    (SELECT count(*) FROM global_tasks),
    0::bigint,
    'anon: zero rows from global_tasks'
);
SELECT is(
    (SELECT count(*) FROM oracle_sops),
    0::bigint,
    'anon: zero rows from oracle_sops'
);
SELECT is(
    (SELECT count(*) FROM moso_clinical_leads),
    0::bigint,
    'anon: zero rows from moso_clinical_leads'
);
SELECT is(
    (SELECT count(*) FROM labno_consulting_leads),
    0::bigint,
    'anon: zero rows from labno_consulting_leads'
);
SELECT is(
    (SELECT count(*) FROM geo_telemetry),
    0::bigint,
    'anon: zero rows from geo_telemetry'
);
SELECT is(
    (SELECT count(*) FROM moso_sync_log),
    0::bigint,
    'anon: zero rows from moso_sync_log'
);
SELECT is(
    (SELECT count(*) FROM ifs_parts),
    0::bigint,
    'anon: zero rows from ifs_parts'
);
SELECT is(
    (SELECT count(*) FROM ifs_contracts),
    0::bigint,
    'anon: zero rows from ifs_contracts'
);
SELECT is(
    (SELECT count(*) FROM ifs_relationships),
    0::bigint,
    'anon: zero rows from ifs_relationships'
);
SELECT is(
    (SELECT count(*) FROM ifs_unburdening_sessions),
    0::bigint,
    'anon: zero rows from ifs_unburdening_sessions'
);

-- Anon INSERT should be denied (policy WITH CHECK fails -> zero rows inserted)
SELECT throws_ok(
    $$INSERT INTO internal_projects (name) VALUES ('anon-hack')$$,
    NULL,
    'anon: cannot insert into internal_projects'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 3: AUTHENTICATED NON-EMPLOYEE (outsider@gmail.com)
-- ############################################################################
SELECT diag('--- Section 3: Outsider (non-employee) access denial ---');

SELECT _test_set_auth(
    current_setting('test.uid_outsider')::uuid,
    'outsider@gmail.com'
);

-- Employee-only tables: outsider sees nothing
SELECT is(
    (SELECT count(*) FROM internal_projects),
    0::bigint,
    'outsider: zero rows from internal_projects'
);
SELECT is(
    (SELECT count(*) FROM global_tasks),
    0::bigint,
    'outsider: zero rows from global_tasks'
);
SELECT is(
    (SELECT count(*) FROM labno_consulting_leads),
    0::bigint,
    'outsider: zero rows from labno_consulting_leads'
);
SELECT is(
    (SELECT count(*) FROM moso_sync_log),
    0::bigint,
    'outsider: zero rows from moso_sync_log'
);

-- Oracle SOPs: outsider is neither @labnolabs.com nor @movement-solutions.com
SELECT is(
    (SELECT count(*) FROM oracle_sops),
    0::bigint,
    'outsider: zero rows from oracle_sops'
);

-- Geo telemetry: outsider cannot read
SELECT is(
    (SELECT count(*) FROM geo_telemetry),
    0::bigint,
    'outsider: zero rows from geo_telemetry'
);

-- HIPAA / clinical: outsider sees nothing
SELECT is(
    (SELECT count(*) FROM moso_clinical_leads),
    0::bigint,
    'outsider: zero rows from moso_clinical_leads'
);

-- IFS tables: outsider has wrong uid -> zero rows
SELECT is(
    (SELECT count(*) FROM ifs_parts),
    0::bigint,
    'outsider: zero rows from ifs_parts'
);
SELECT is(
    (SELECT count(*) FROM ifs_contracts),
    0::bigint,
    'outsider: zero rows from ifs_contracts'
);
SELECT is(
    (SELECT count(*) FROM ifs_relationships),
    0::bigint,
    'outsider: zero rows from ifs_relationships'
);
SELECT is(
    (SELECT count(*) FROM ifs_unburdening_sessions),
    0::bigint,
    'outsider: zero rows from ifs_unburdening_sessions'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 4: EMPLOYEE ACCESS (avery@labnolabs.com)
-- ############################################################################
SELECT diag('--- Section 4: Employee access (avery@labnolabs.com) ---');

-- Seed test data as postgres (bypasses RLS)
INSERT INTO internal_projects (id, name) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Test Project Alpha');

INSERT INTO global_tasks (id, project_id, title) VALUES
    ('c1111111-1111-1111-1111-111111111111',
     'b1111111-1111-1111-1111-111111111111',
     'Test Task One');

INSERT INTO oracle_sops (id, title, content) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'SOP: How to test', 'Step 1...');

INSERT INTO labno_consulting_leads (id, company_name, email) VALUES
    ('e1111111-1111-1111-1111-111111111111', 'Acme Corp', 'acme@example.com');

INSERT INTO moso_sync_log (id, agent, output_type, content) VALUES
    ('f1111111-1111-1111-1111-111111111111', 'chief', 'weekly_pulse', 'All systems go');

INSERT INTO moso_clinical_leads (id, patient_name) VALUES
    ('f2222222-2222-2222-2222-222222222222', 'HIPAA Test Patient');

INSERT INTO geo_telemetry (id, zipcode, date) VALUES
    ('f3333333-3333-3333-3333-333333333333', '60201', CURRENT_DATE);

-- Seed IFS data owned by Lance
INSERT INTO ifs_parts (id, user_id, name, role) VALUES
    ('f4444444-4444-4444-4444-444444444444',
     current_setting('test.uid_lance')::uuid,
     'The Perfectionist', 'protector');

INSERT INTO ifs_contracts (id, user_id, contract_type) VALUES
    ('f5555555-5555-5555-5555-555555555555',
     current_setting('test.uid_lance')::uuid,
     'unconscious');

INSERT INTO ifs_relationships (id, user_id, person_name) VALUES
    ('f6666666-6666-6666-6666-666666666666',
     current_setting('test.uid_lance')::uuid,
     'Test Relationship');

INSERT INTO ifs_unburdening_sessions (id, user_id, part_id, status) VALUES
    ('f7777777-7777-7777-7777-777777777777',
     current_setting('test.uid_lance')::uuid,
     'f4444444-4444-4444-4444-444444444444',
     'in_progress');

-- Switch to Avery
SELECT _test_set_auth(
    current_setting('test.uid_avery')::uuid,
    'avery@labnolabs.com'
);

-- Tables Avery SHOULD be able to read
SELECT is(
    (SELECT count(*) FROM internal_projects WHERE id = 'b1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'employee (avery): can read internal_projects'
);
SELECT is(
    (SELECT count(*) FROM global_tasks WHERE id = 'c1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'employee (avery): can read global_tasks'
);
SELECT is(
    (SELECT count(*) FROM oracle_sops WHERE id = 'd1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'employee (avery): can read oracle_sops'
);
SELECT is(
    (SELECT count(*) FROM labno_consulting_leads WHERE id = 'e1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'employee (avery): can read labno_consulting_leads'
);
SELECT is(
    (SELECT count(*) FROM moso_sync_log WHERE id = 'f1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'employee (avery): can read moso_sync_log'
);

-- Avery can read geo_telemetry (employee read policy)
SELECT is(
    (SELECT count(*) FROM geo_telemetry WHERE id = 'f3333333-3333-3333-3333-333333333333'),
    1::bigint,
    'employee (avery): can read geo_telemetry'
);

-- Tables Avery SHOULD NOT be able to read
SELECT is(
    (SELECT count(*) FROM moso_clinical_leads),
    0::bigint,
    'employee (avery): CANNOT read moso_clinical_leads (HIPAA lance-only)'
);

-- IFS tables: Avery owns nothing -> zero rows
SELECT is(
    (SELECT count(*) FROM ifs_parts),
    0::bigint,
    'employee (avery): CANNOT read ifs_parts (owner-only, not her data)'
);
SELECT is(
    (SELECT count(*) FROM ifs_contracts),
    0::bigint,
    'employee (avery): CANNOT read ifs_contracts (owner-only)'
);
SELECT is(
    (SELECT count(*) FROM ifs_relationships),
    0::bigint,
    'employee (avery): CANNOT read ifs_relationships (owner-only)'
);
SELECT is(
    (SELECT count(*) FROM ifs_unburdening_sessions),
    0::bigint,
    'employee (avery): CANNOT read ifs_unburdening_sessions (owner-only)'
);

-- Employee WRITE tests: Avery can insert into employee-writable tables
SELECT lives_ok(
    $$INSERT INTO internal_projects (name) VALUES ('Avery Project')$$,
    'employee (avery): can insert into internal_projects'
);
SELECT lives_ok(
    $$INSERT INTO labno_consulting_leads (company_name) VALUES ('Avery Lead')$$,
    'employee (avery): can insert into labno_consulting_leads'
);
SELECT lives_ok(
    $$INSERT INTO moso_sync_log (agent, output_type, content) VALUES ('test', 'test', 'test')$$,
    'employee (avery): can insert into moso_sync_log'
);

-- Employee CANNOT write to lance-only write tables
-- oracle_sops: avery can read but not write
SELECT throws_ok(
    $$INSERT INTO oracle_sops (title, content) VALUES ('hack', 'hack')$$,
    NULL,
    'employee (avery): CANNOT insert into oracle_sops (lance-only write)'
);

-- geo_telemetry: avery can read but not write
SELECT throws_ok(
    $$INSERT INTO geo_telemetry (zipcode, date) VALUES ('99999', CURRENT_DATE + 1)$$,
    NULL,
    'employee (avery): CANNOT insert into geo_telemetry (lance-only write)'
);

-- clinical: avery cannot write
SELECT throws_ok(
    $$INSERT INTO moso_clinical_leads (patient_name) VALUES ('Hacked Patient')$$,
    NULL,
    'employee (avery): CANNOT insert into moso_clinical_leads'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 5: LANCE ELEVATED ACCESS (lance@labnolabs.com)
-- ############################################################################
SELECT diag('--- Section 5: Lance elevated access ---');

SELECT _test_set_auth(
    current_setting('test.uid_lance')::uuid,
    'lance@labnolabs.com'
);

-- Lance can read everything an employee can
SELECT is(
    (SELECT count(*) FROM internal_projects WHERE id = 'b1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'lance: can read internal_projects'
);
SELECT is(
    (SELECT count(*) FROM global_tasks WHERE id = 'c1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'lance: can read global_tasks'
);
SELECT is(
    (SELECT count(*) FROM oracle_sops WHERE id = 'd1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'lance: can read oracle_sops'
);

-- Lance can read HIPAA clinical data
SELECT is(
    (SELECT count(*) FROM moso_clinical_leads WHERE id = 'f2222222-2222-2222-2222-222222222222'),
    1::bigint,
    'lance: can read moso_clinical_leads (HIPAA owner)'
);

-- Lance can read his own IFS data
SELECT is(
    (SELECT count(*) FROM ifs_parts WHERE id = 'f4444444-4444-4444-4444-444444444444'),
    1::bigint,
    'lance: can read own ifs_parts'
);
SELECT is(
    (SELECT count(*) FROM ifs_contracts WHERE id = 'f5555555-5555-5555-5555-555555555555'),
    1::bigint,
    'lance: can read own ifs_contracts'
);
SELECT is(
    (SELECT count(*) FROM ifs_relationships WHERE id = 'f6666666-6666-6666-6666-666666666666'),
    1::bigint,
    'lance: can read own ifs_relationships'
);
SELECT is(
    (SELECT count(*) FROM ifs_unburdening_sessions WHERE id = 'f7777777-7777-7777-7777-777777777777'),
    1::bigint,
    'lance: can read own ifs_unburdening_sessions'
);

-- Lance can WRITE to oracle_sops
SELECT lives_ok(
    $$INSERT INTO oracle_sops (title, content) VALUES ('Lance SOP', 'content')$$,
    'lance: can insert into oracle_sops'
);

-- Lance can UPDATE oracle_sops
SELECT lives_ok(
    $$UPDATE oracle_sops SET content = 'updated' WHERE title = 'Lance SOP'$$,
    'lance: can update oracle_sops'
);

-- Lance can DELETE oracle_sops
SELECT lives_ok(
    $$DELETE FROM oracle_sops WHERE title = 'Lance SOP'$$,
    'lance: can delete from oracle_sops'
);

-- Lance can WRITE to geo_telemetry
SELECT lives_ok(
    $$INSERT INTO geo_telemetry (zipcode, date) VALUES ('60202', CURRENT_DATE + 100)$$,
    'lance: can insert into geo_telemetry'
);
SELECT lives_ok(
    $$UPDATE geo_telemetry SET visitor_count = 42 WHERE zipcode = '60202'$$,
    'lance: can update geo_telemetry'
);

-- Lance can WRITE to moso_clinical_leads
SELECT lives_ok(
    $$INSERT INTO moso_clinical_leads (patient_name) VALUES ('Lance Test Patient')$$,
    'lance: can insert into moso_clinical_leads'
);
SELECT lives_ok(
    $$UPDATE moso_clinical_leads SET status = 'Active' WHERE patient_name = 'Lance Test Patient'$$,
    'lance: can update moso_clinical_leads'
);
SELECT lives_ok(
    $$DELETE FROM moso_clinical_leads WHERE patient_name = 'Lance Test Patient'$$,
    'lance: can delete from moso_clinical_leads'
);

-- Lance can WRITE to IFS tables (owner)
SELECT lives_ok(
    $$INSERT INTO ifs_parts (user_id, name, role) VALUES (current_setting('test.uid_lance')::uuid, 'New Part', 'exile')$$,
    'lance: can insert into ifs_parts (owner)'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 5b: CROSS-ORG EMPLOYEE (romy@movement-solutions.com)
-- ############################################################################
SELECT diag('--- Section 5b: Cross-org employee (romy@movement-solutions.com) ---');

SELECT _test_set_auth(
    current_setting('test.uid_romy')::uuid,
    'romy@movement-solutions.com'
);

-- Romy CAN read oracle_sops (policy includes @movement-solutions.com)
SELECT is(
    (SELECT count(*) FROM oracle_sops WHERE id = 'd1111111-1111-1111-1111-111111111111'),
    1::bigint,
    'cross-org (romy): can read oracle_sops'
);

-- Romy CAN read geo_telemetry (policy includes @movement-solutions.com)
SELECT is(
    (SELECT count(*) FROM geo_telemetry WHERE id = 'f3333333-3333-3333-3333-333333333333'),
    1::bigint,
    'cross-org (romy): can read geo_telemetry'
);

-- Romy CANNOT read @labnolabs.com-only tables
SELECT is(
    (SELECT count(*) FROM internal_projects),
    0::bigint,
    'cross-org (romy): CANNOT read internal_projects (labnolabs-only)'
);
SELECT is(
    (SELECT count(*) FROM global_tasks),
    0::bigint,
    'cross-org (romy): CANNOT read global_tasks (labnolabs-only)'
);
SELECT is(
    (SELECT count(*) FROM labno_consulting_leads),
    0::bigint,
    'cross-org (romy): CANNOT read labno_consulting_leads (labnolabs-only)'
);
SELECT is(
    (SELECT count(*) FROM moso_sync_log),
    0::bigint,
    'cross-org (romy): CANNOT read moso_sync_log (labnolabs-only)'
);

-- Romy CANNOT read clinical or IFS data
SELECT is(
    (SELECT count(*) FROM moso_clinical_leads),
    0::bigint,
    'cross-org (romy): CANNOT read moso_clinical_leads'
);
SELECT is(
    (SELECT count(*) FROM ifs_parts),
    0::bigint,
    'cross-org (romy): CANNOT read ifs_parts'
);

-- Romy CANNOT write to oracle_sops (lance-only write)
SELECT throws_ok(
    $$INSERT INTO oracle_sops (title, content) VALUES ('romy hack', 'x')$$,
    NULL,
    'cross-org (romy): CANNOT insert into oracle_sops'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 6: CLINICAL DATA ISOLATION (HIPAA)
-- ############################################################################
SELECT diag('--- Section 6: Clinical data isolation (HIPAA) ---');

-- Verify that a second user (avery) seeded with IFS data cannot see Lance's
-- This was already tested in Section 4, but let's be explicit with a
-- different user owning IFS rows.

-- Seed IFS data owned by Avery (as postgres)
INSERT INTO ifs_parts (id, user_id, name, role) VALUES
    ('f8888888-8888-8888-8888-888888888888',
     current_setting('test.uid_avery')::uuid,
     'Avery Protector', 'protector');

-- Lance should NOT see Avery's IFS data
SELECT _test_set_auth(
    current_setting('test.uid_lance')::uuid,
    'lance@labnolabs.com'
);

SELECT is(
    (SELECT count(*) FROM ifs_parts WHERE id = 'f8888888-8888-8888-8888-888888888888'),
    0::bigint,
    'lance: CANNOT see ifs_parts owned by avery (owner-only isolation)'
);

SELECT _test_reset_auth();

-- Avery CAN see her own IFS data
SELECT _test_set_auth(
    current_setting('test.uid_avery')::uuid,
    'avery@labnolabs.com'
);

SELECT is(
    (SELECT count(*) FROM ifs_parts WHERE id = 'f8888888-8888-8888-8888-888888888888'),
    1::bigint,
    'avery: CAN see her own ifs_parts row'
);

-- But still cannot see Lance's
SELECT is(
    (SELECT count(*) FROM ifs_parts WHERE id = 'f4444444-4444-4444-4444-444444444444'),
    0::bigint,
    'avery: CANNOT see lance ifs_parts (owner-only isolation confirmed)'
);

SELECT _test_reset_auth();


-- ############################################################################
-- SECTION 7: CROSS-TABLE JOIN LEAKAGE
-- ############################################################################
SELECT diag('--- Section 7: Cross-table join leakage prevention ---');

-- Scenario: An employee joins global_tasks with moso_clinical_leads.
-- Even though they can see tasks, clinical data should still be invisible
-- through a JOIN.

SELECT _test_set_auth(
    current_setting('test.uid_avery')::uuid,
    'avery@labnolabs.com'
);

-- This join should return zero rows because moso_clinical_leads is empty
-- for avery (RLS filters it out before the join).
SELECT is(
    (SELECT count(*)
     FROM global_tasks t
     CROSS JOIN moso_clinical_leads c),
    0::bigint,
    'join leakage: employee cannot see clinical data via CROSS JOIN with tasks'
);

-- Join IFS data through a subquery - should also return nothing
SELECT is(
    (SELECT count(*)
     FROM internal_projects p
     LEFT JOIN LATERAL (
         SELECT * FROM ifs_parts LIMIT 1
     ) ip ON true
     WHERE ip.id IS NOT NULL),
    0::bigint,
    'join leakage: employee cannot see ifs_parts via LATERAL JOIN with projects'
);

-- Ensure union-based leakage is also prevented:
-- avery can select from labno_consulting_leads but not moso_clinical_leads
SELECT is(
    (SELECT count(*) FROM (
        SELECT id FROM labno_consulting_leads
        UNION ALL
        SELECT id FROM moso_clinical_leads
    ) combined),
    -- Should only contain the consulting lead rows, not clinical
    (SELECT count(*) FROM labno_consulting_leads),
    'join leakage: UNION ALL of consulting + clinical shows only consulting rows'
);

-- geo_telemetry join: avery can read telemetry but joining with
-- oracle_sops write attempt should not escalate privileges
SELECT is(
    (SELECT count(*)
     FROM geo_telemetry g
     CROSS JOIN moso_clinical_leads c),
    0::bigint,
    'join leakage: telemetry cross clinical yields zero for employee'
);

SELECT _test_reset_auth();

-- Outsider join test: even joining two readable-by-nobody tables yields nothing
SELECT _test_set_auth(
    current_setting('test.uid_outsider')::uuid,
    'outsider@gmail.com'
);

SELECT is(
    (SELECT count(*)
     FROM internal_projects p
     JOIN global_tasks t ON t.project_id = p.id),
    0::bigint,
    'join leakage: outsider gets zero from projects JOIN tasks'
);

SELECT _test_reset_auth();


-- ############################################################################
-- CLEANUP
-- ############################################################################
SELECT diag('--- Cleanup ---');

-- Drop test helpers
DROP FUNCTION IF EXISTS _test_set_auth(UUID, TEXT);
DROP FUNCTION IF EXISTS _test_set_anon();
DROP FUNCTION IF EXISTS _test_reset_auth();

-- Delete seeded test data (as postgres, bypassing RLS)
DELETE FROM ifs_unburdening_sessions WHERE id = 'f7777777-7777-7777-7777-777777777777';
DELETE FROM ifs_contracts WHERE id = 'f5555555-5555-5555-5555-555555555555';
DELETE FROM ifs_relationships WHERE id = 'f6666666-6666-6666-6666-666666666666';
DELETE FROM ifs_parts WHERE id IN (
    'f4444444-4444-4444-4444-444444444444',
    'f8888888-8888-8888-8888-888888888888'
);
DELETE FROM ifs_parts WHERE name = 'New Part';
DELETE FROM geo_telemetry WHERE zipcode IN ('60201', '60202');
DELETE FROM moso_clinical_leads WHERE id = 'f2222222-2222-2222-2222-222222222222';
DELETE FROM moso_sync_log WHERE id = 'f1111111-1111-1111-1111-111111111111';
DELETE FROM moso_sync_log WHERE agent = 'test';
DELETE FROM labno_consulting_leads WHERE id = 'e1111111-1111-1111-1111-111111111111';
DELETE FROM labno_consulting_leads WHERE company_name = 'Avery Lead';
DELETE FROM oracle_sops WHERE id = 'd1111111-1111-1111-1111-111111111111';
DELETE FROM global_tasks WHERE id = 'c1111111-1111-1111-1111-111111111111';
DELETE FROM internal_projects WHERE id = 'b1111111-1111-1111-1111-111111111111';
DELETE FROM internal_projects WHERE name = 'Avery Project';

SELECT * FROM finish();
ROLLBACK;
