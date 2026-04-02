# CASE-001: Oracle RLS Audit Report

**Date:** 2026-04-02
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** All Supabase RLS policies + API route authentication for labno-labs-center
**Supabase Project:** jlvxubslxzwmzslvzgxs

---

## CRITICAL FINDINGS (Fix Immediately)

### 1. `backup/export.js` — UNAUTHENTICATED FULL DATABASE EXPORT
- **Severity:** CRITICAL
- **Issue:** GET endpoint exports ALL 10 tables (including `moso_clinical_leads`) as downloadable JSON with zero authentication. Uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS.
- **Impact:** Anyone who discovers this URL can download the entire database including HIPAA-protected clinical data.
- **Fix:** Add Bearer token verification + Lance-only email check, or remove this endpoint entirely.

### 2. `agent/run.js` — UNAUTHENTICATED TASK INJECTION
- **Severity:** HIGH
- **Issue:** POST endpoint inserts into `agent_runs` and updates `global_tasks` with no authentication. Uses `SUPABASE_SERVICE_ROLE_KEY`.
- **Impact:** Anyone can queue arbitrary agent tasks and modify the Kanban board.
- **Fix:** Add Bearer token verification before allowing task creation.

### 3. `audit/log.js` — UNAUTHENTICATED WRITE ACCESS
- **Severity:** HIGH
- **Issue:** POST endpoint writes to `access_log` and `audit_log` tables with no authentication. Uses `SUPABASE_SERVICE_ROLE_KEY`.
- **Impact:** Anyone can inject false audit trail entries, undermining the integrity of your compliance logging.
- **Fix:** Add Bearer token verification.

### 4. `moso_clinical_leads` — RLS POLICY DOES NOT RESTRICT TO LANCE ONLY
- **Severity:** HIGH (HIPAA)
- **Issue:** The schema file says "Only Lance can view Clinical Data" but the live RLS policy is:
  ```sql
  -- Schema file says:
  USING (auth.email() = 'lance@labnolabs.com')
  
  -- Live policy actually deployed:
  USING ((auth.email() ~~ '%@labnolabs.com') OR (auth.email() ~~ '%@movement-solutions.com'))
  ```
  Any employee at either domain can read, write, and delete clinical patient data.
- **Impact:** HIPAA violation. Clinical data is accessible to all employees, not just Lance.
- **Fix:** Update the live policy to match the intended restriction:
  ```sql
  ALTER POLICY "clinical_access" ON moso_clinical_leads
    USING (auth.email() = 'lance@labnolabs.com');
  ```

---

## HIGH-RISK FINDINGS

### 5. `agent/process.js` — WEAK CRON AUTHENTICATION
- **Severity:** MEDIUM-HIGH
- **Issue:** Cron endpoint validates `CRON_SECRET` from headers but explicitly allows unauthenticated manual triggers as a fallback.
- **Fix:** Require `CRON_SECRET` for all invocations. Remove the manual trigger bypass.

### 6. `oracle_sops` — NO PRIVATE/PUBLIC BRAIN SEPARATION IN RLS
- **Severity:** MEDIUM-HIGH
- **Issue:** The `oracle_sops` table has a `visibility` column (`'Private Brain (Internal Only)'` / Public) but no RLS policy enforces this separation. The live policies are:
  - `employee_sop_access` (ALL) — any employee can read/write all SOPs
  - `oracle_read_employees` (SELECT) — redundant with above
  - `oracle_write_lance_only` (INSERT) — Lance only
  - `oracle_update_lance_only` (UPDATE) — Lance only
  - `oracle_delete_lance_only` (DELETE) — Lance only
  
  **The read policy doesn't filter by visibility.** All employees can read Private Brain content.
- **Fix:** Add a visibility filter to the read policy:
  ```sql
  -- Public Brain: all employees can read
  CREATE POLICY "oracle_read_public" ON oracle_sops FOR SELECT
    USING (
      visibility = 'Public Brain'
      AND (auth.email() LIKE '%@labnolabs.com' OR auth.email() LIKE '%@movement-solutions.com')
    );
  
  -- Private Brain: Lance only
  CREATE POLICY "oracle_read_private" ON oracle_sops FOR SELECT
    USING (
      visibility = 'Private Brain (Internal Only)'
      AND auth.email() = 'lance@labnolabs.com'
    );
  ```

### 7. Duplicate RLS Policies on `global_tasks`
- **Severity:** LOW (functional but messy)
- **Issue:** Two identical policies exist: `tasks_employee_access` and `employee_task_access` — both allow ALL for employees at either domain.
- **Fix:** Drop one: `DROP POLICY "employee_task_access" ON global_tasks;`

### 8. `client_api_keys` and `team_member_projects` — OVERLY PERMISSIVE POLICIES
- **Severity:** MEDIUM
- **Issue:** Both tables have an `"Authenticated full access"` policy with `qual: true` — meaning ANY authenticated user (including clients) gets full access, alongside the more restrictive `is_team_member()` policy.
- **Impact:** The `true` policy makes the `is_team_member()` policy meaningless. Any authenticated user can read/write API keys and project assignments.
- **Fix:** Drop the `"Authenticated full access"` policies:
  ```sql
  DROP POLICY "Authenticated full access" ON client_api_keys;
  DROP POLICY "Authenticated full access" ON client_billing;
  DROP POLICY "Authenticated full access" ON team_member_projects;
  ```

### 9. `moso_rx` — ALLOWS ANY AUTHENTICATED USER TO READ
- **Severity:** MEDIUM
- **Issue:** Policy `"Allow authenticated read"` has `qual: true` — any authenticated user can read the exercise prescription data.
- **Impact:** If this contains clinical data (patient-specific prescriptions), this is a HIPAA exposure. If it's the general 189-exercise library, this may be intentional.
- **Decision needed:** Is `moso_rx` clinical data or the general exercise library?

---

## SERVICE ROLE KEY BYPASS RISK

11 of 14 API routes use `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses all RLS policies**. This is architecturally necessary for server-side operations but means:

- RLS protects the **frontend** (browser-side Supabase client with anon key)
- RLS does **NOT protect** against API route abuse if those routes lack their own auth checks

**The 3 unauthenticated API routes (backup/export, agent/run, audit/log) are the primary attack surface** — they use service role keys with no gate.

---

## TABLES WITH RLS STATUS

| Table | RLS Enabled | Policies | Status |
|-------|-------------|----------|--------|
| `moso_clinical_leads` | Yes | 1 (too broad) | **FIX: restrict to Lance only** |
| `labno_consulting_leads` | Yes | 1 (employees) | OK |
| `internal_projects` | Yes | 1 (employees) | OK |
| `global_tasks` | Yes | 2 (duplicate) | OK (drop duplicate) |
| `oracle_sops` | Yes | 5 (no visibility filter) | **FIX: add Private/Public separation** |
| `agent_runs` | Yes | 1 (employees) | OK |
| `access_log` | Yes | 1 (employees) | OK |
| `audit_log` | Yes | 1 (employees) | OK |
| `communication_log` | Yes | 1 (employees) | OK |
| `reactivation_queue` | Yes | 1 (employees) | OK |
| `work_history` | Yes | 1 (employees) | OK |
| `blog_posts` | Yes | 2 (read: employees, manage: Lance) | OK |
| `geo_telemetry` | Yes | 3 (read: employees, write: Lance) | OK |
| `moso_rx` | Yes | 1 (any authenticated) | **REVIEW: intentional?** |
| `client_api_keys` | Yes | 2 (one is `true`) | **FIX: drop `true` policy** |
| `client_billing` | Yes | 2 (one is `true`) | **FIX: drop `true` policy** |
| `team_member_projects` | Yes | 2 (one is `true`) | **FIX: drop `true` policy** |

---

## RECOMMENDED FIX ORDER

1. **NOW:** Add auth to `backup/export.js` (or delete it — this is the most dangerous endpoint)
2. **NOW:** Add auth to `agent/run.js`
3. **NOW:** Add auth to `audit/log.js`
4. **THIS WEEK:** Fix `moso_clinical_leads` RLS to Lance-only
5. **THIS WEEK:** Add Private/Public Brain separation to `oracle_sops` RLS
6. **THIS WEEK:** Drop `"Authenticated full access"` policies on `client_api_keys`, `client_billing`, `team_member_projects`
7. **CLEANUP:** Drop duplicate `global_tasks` policy
8. **REVIEW:** Decide on `moso_rx` access level
9. **NEXT:** Require `CRON_SECRET` on `agent/process.js` (no manual bypass)

---

## FIX SCRIPT (Ready to Apply)

See `CASE-001_rls_fixes.sql` for the SQL migrations.
See the code changes in `api/backup/export.js`, `api/agent/run.js`, and `api/audit/log.js` for auth hardening.
