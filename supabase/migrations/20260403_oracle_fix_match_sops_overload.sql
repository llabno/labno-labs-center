-- ============================================================
-- Fix match_sops() function overload ambiguity
-- Date: 2026-04-03
-- Author: Claude Code (autonomous)
-- ============================================================
-- PROBLEM:
--   Two versions of match_sops() exist:
--     1. match_sops(query_embedding, match_threshold, match_count) — original from 20260401_oracle_rls_and_geo_telemetry.sql
--     2. match_sops(query_embedding, match_threshold, match_count, filter_visibility) — from 20260401_case001_rls_audit_hardening.sql
--   PostgREST cannot disambiguate between them, causing PGRST203 errors.
--
-- FIX: Drop the old 3-parameter version. The 4-parameter version with
--      filter_visibility DEFAULT NULL handles both use cases.
-- ============================================================

-- Drop the old 3-parameter overload (the one WITHOUT filter_visibility)
DROP FUNCTION IF EXISTS match_sops(vector(1536), float, int);

-- The 4-parameter version (with filter_visibility DEFAULT NULL) remains untouched.
-- It already handles the "no filter" case via NULL default.
