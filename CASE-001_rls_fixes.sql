-- CASE-001: RLS Policy Fixes
-- Generated: 2026-04-02
-- Apply via Supabase SQL Editor or supabase db query --linked

-- ============================================================
-- FIX 1: Restrict moso_clinical_leads to Lance only (HIPAA)
-- ============================================================
DROP POLICY IF EXISTS "clinical_access" ON moso_clinical_leads;
CREATE POLICY "clinical_lance_only" ON moso_clinical_leads
    FOR ALL
    USING (auth.email() = 'lance@labnolabs.com');

-- ============================================================
-- FIX 2: Add Private/Public Brain separation to oracle_sops
-- ============================================================
-- Drop the overly broad employee read policy
DROP POLICY IF EXISTS "employee_sop_access" ON oracle_sops;
DROP POLICY IF EXISTS "oracle_read_employees" ON oracle_sops;

-- Public Brain: all employees can read
CREATE POLICY "oracle_read_public" ON oracle_sops FOR SELECT
    USING (
        (visibility != 'Private Brain (Internal Only)' OR visibility IS NULL)
        AND (auth.email() LIKE '%@labnolabs.com' OR auth.email() LIKE '%@movement-solutions.com')
    );

-- Private Brain: Lance only can read
CREATE POLICY "oracle_read_private" ON oracle_sops FOR SELECT
    USING (
        visibility = 'Private Brain (Internal Only)'
        AND auth.email() = 'lance@labnolabs.com'
    );

-- Write/Update/Delete policies already restrict to Lance — keep them

-- ============================================================
-- FIX 3: Drop duplicate global_tasks policy
-- ============================================================
DROP POLICY IF EXISTS "employee_task_access" ON global_tasks;

-- ============================================================
-- FIX 4: Drop overly permissive "Authenticated full access" policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON client_api_keys;
DROP POLICY IF EXISTS "Authenticated full access" ON client_billing;
DROP POLICY IF EXISTS "Authenticated full access" ON team_member_projects;
DROP POLICY IF EXISTS "Authenticated full access" ON task_projects;
