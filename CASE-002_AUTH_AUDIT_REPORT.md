# CASE-002: Supabase Auth + Google OAuth — Audit Report

**Date:** 2026-04-02
**Auditor:** Claude Opus 4.6 (automated)
**Status:** MOSTLY IMPLEMENTED — 4 issues to address

---

## Current State

### What's Working
- **Google OAuth:** Enabled and configured with Google Cloud client ID `362137287734-...`
- **Email/password auth:** Enabled, working for `lance@labnolabs.com`
- **Domain restriction:** App.jsx enforces `@labnolabs.com` and `@movement-solutions.com` at the React layer (lines 119-125)
- **Session management:** `onAuthStateChange` listener properly handles session updates
- **OAuth redirect:** Configured to `https://labno-labs-center-labno-labs.vercel.app/**`
- **Token refresh:** Rotation enabled with 10-second reuse interval
- **JWT expiry:** 3600 seconds (1 hour) — reasonable

### Active Users
| Email | Provider | Last Sign In |
|-------|----------|-------------|
| lance.labno@movement-solutions.com | Google | 2026-04-02 |
| lance@labnolabs.com | Email | 2026-04-01 |
| lance.labno@gmail.com | Email | 2026-03-31 |
| demo@acme.com | Email | Never |

---

## Issues Found

### 1. `demo@acme.com` — Unauthorized Test Account Still in Auth
- **Severity:** MEDIUM
- **Issue:** A demo account with `@acme.com` domain exists in `auth.users`. The frontend domain check prevents login, but the account exists in the auth table and could be exploited if any API route doesn't check domains.
- **Fix:** Delete this user from the Supabase Auth dashboard or via admin API.

### 2. `lance.labno@gmail.com` — Personal Gmail Bypasses Intended Domain Restriction
- **Severity:** MEDIUM
- **Issue:** This account was created via email/password. The frontend blocks it at the React layer, but if any API route accepts a valid JWT without checking the email domain, this account could access data.
- **Status:** The CASE-001 API hardening now checks domains on sensitive endpoints, so this is partially mitigated. However, the account should be removed if not intentionally kept.
- **Fix:** Either delete this user or add `gmail.com` to ALLOWED_DOMAINS if Lance needs it.

### 3. Signup Is Still Open (`disable_signup: false`)
- **Severity:** MEDIUM
- **Issue:** Anyone can create an account via email/password at the Supabase project level. The React frontend blocks non-domain emails, but the Supabase Auth endpoint itself accepts signups from any email.
- **Impact:** An attacker could create accounts via direct Supabase Auth API calls. RLS policies would still block data access (after CASE-001 fixes), but unnecessary accounts accumulate.
- **Fix:** Disable public signup in Supabase dashboard. Use invite-only for new employees.

### 4. No Role System Beyond Domain Check
- **Severity:** LOW (acceptable for current scale)
- **Issue:** The task queue spec calls for roles: staff, client, admin, agent. Currently there's only `authenticated` role with domain-based access. This works for 2-4 employees but won't scale for consulting client portals.
- **Status:** Not blocking. Build role-based access when the first consulting client needs portal access.
- **Future fix:** Add a `user_role` column to a profiles table, create a Supabase trigger to assign roles on signup, and enforce roles in RLS policies.

---

## What's NOT Needed Yet

The CASE-002 spec calls for "role-based session tokens" and "protected API routes per portal." Given the current state:
- API routes are now auth-gated (CASE-001 fixed this)
- Domain check provides sufficient access control for the current team size
- Role-based access should be built when the first external client needs portal access, not before

---

## Fixes Applied

### Fix 1: Delete unauthorized accounts
