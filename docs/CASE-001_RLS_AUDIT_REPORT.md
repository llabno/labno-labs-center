# CASE-001: Oracle RLS Audit Report

**Date:** 2026-04-01
**Status:** COMPLETED
**Agent:** Claude Code (autonomous)
**Priority:** P0 Ship Blocker

---

## Executive Summary

Audited all Supabase RLS policies, Oracle API routes, and the `match_sops()` vector search function for Private/Public Brain data separation. Found **1 critical**, **2 high**, and **3 medium** severity issues. All have been patched.

---

## Findings

### CRITICAL: `/api/agent/run.js` — No Authentication

**Before:** Any unauthenticated HTTP POST could queue agent tasks and modify `global_tasks` status. The route used `SERVICE_ROLE_KEY` (bypasses all RLS) with zero auth checks.

**Fix:** Added JWT verification via `supabase.auth.getUser()` + email domain whitelist before any database operations. Service role key is now only used for writes after auth succeeds.

**File:** `api/agent/run.js`

---

### HIGH: `oracle_sops` RLS — No Visibility Filtering

**Before:** The `oracle_read_employees` policy allowed all `@labnolabs.com` users to `SELECT` all SOPs regardless of `visibility` field. Any employee query (or any code using the anon key with a valid session) returned Private Brain content.

**Fix:** Replaced with two policies:
- `oracle_read_public_brain` — all employees see `visibility = 'Public Brain'` only
- `oracle_read_private_brain` — `lance@labnolabs.com` sees everything else

**File:** `supabase/migrations/20260401_case001_rls_audit_hardening.sql`

---

### HIGH: `match_sops()` — Bypassed Visibility at Database Level

**Before:** The pgvector semantic search function returned all matching SOPs regardless of visibility. Filtering was done in application code (`ask.js` line 37-39), which means any direct RPC call bypassed the filter.

**Fix:** Added `filter_visibility` parameter to `match_sops()`. When set to `'Public Brain'`, only public SOPs are returned at the SQL level. Application code updated to pass this parameter.

**Files:** `supabase/migrations/20260401_case001_rls_audit_hardening.sql`, `api/oracle/ask.js`

---

### MEDIUM: `agent_runs` — No RLS Enabled

**Before:** The `agent_runs` table had no Row Level Security. Any authenticated user (or service role) could read/write all agent execution logs, which may contain sensitive task context.

**Fix:** Enabled RLS with employee-read access and lance/service_role write access.

---

### MEDIUM: `global_tasks` — Missing `@movement-solutions.com`

**Before:** `tasks_employee_access` policy only matched `@labnolabs.com`. Movement Solutions staff were locked out of task boards.

**Fix:** Updated to include `@movement-solutions.com`.

---

### MEDIUM: `internal_projects` — Missing `@movement-solutions.com`

**Before:** Same issue as `global_tasks`.

**Fix:** Updated to include `@movement-solutions.com`.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260401_case001_rls_audit_hardening.sql` | New migration: RLS policies, match_sops filter, bleed test function |
| `api/agent/run.js` | Added JWT auth + email whitelist before SERVICE_ROLE_KEY usage |
| `api/oracle/ask.js` | Updated vectorSearch to use database-level visibility filtering |

---

## Verification

Run the bleed test after applying the migration:

```sql
SELECT * FROM test_oracle_rls_bleed();
```

Expected output: all tests pass, 0 unprotected tables.

---

## Remaining Recommendations

1. **Rotate `CRON_SECRET`** — the current value is committed in `.env` (even though `.env` is gitignored, it's in the template)
2. **Audit `service_role` key usage** — all API routes that use it should have auth gates (now fixed for `run.js`)
3. **Add CI test** — run `test_oracle_rls_bleed()` in GitHub Actions after each migration (blocked on CASE-009)
