# RLS Audit Test Suite

pgTAP-based test suite that validates Row-Level Security policies across all 11 tables in the Labno Labs Center database.

## What It Tests

| Section | Description | Tables |
|---------|-------------|--------|
| 1 | RLS is enabled on every table | All 11 |
| 2 | Anonymous users see zero rows everywhere | All 11 |
| 3 | Authenticated non-employees (outsider@gmail.com) are blocked | All 11 |
| 4 | Employees (@labnolabs.com) get correct read/write access | All 11 |
| 5 | Lance has elevated write access where expected | oracle_sops, geo_telemetry, moso_clinical_leads |
| 5b | Cross-org (@movement-solutions.com) access is scoped correctly | oracle_sops, geo_telemetry vs labnolabs-only tables |
| 6 | Clinical/IFS data is owner-isolated (HIPAA) | moso_clinical_leads, ifs_* |
| 7 | Cross-table JOINs do not leak RLS-hidden rows | Various combinations |

## Prerequisites

1. **pgTAP extension** must be installed in the database:

```sql
CREATE EXTENSION IF NOT EXISTS pgtap;
```

2. **Supabase CLI** (recommended) or direct `psql` access to the database.

## Running the Tests

### Option A: Supabase CLI (recommended)

```bash
# From the project root
supabase test db
```

The Supabase CLI automatically discovers SQL files in `supabase/tests/` and runs them with pgTAP.

### Option B: Against a local Supabase instance

```bash
# Start local Supabase if not running
supabase start

# Run all tests
supabase test db

# Or run just this file
supabase test db --file supabase/tests/rls_audit.sql
```

### Option C: Direct psql

```bash
psql "$DATABASE_URL" -f supabase/tests/rls_audit.sql
```

### Option D: Against remote (staging only, never production)

```bash
supabase test db --linked
```

## How It Works

The test file:

1. **Wraps everything in a transaction** (`BEGIN` ... `ROLLBACK`) so no test data persists.
2. **Creates helper functions** (`_test_set_auth`, `_test_set_anon`, `_test_reset_auth`) that manipulate Supabase's `request.jwt.claims` GUC variables to simulate different user personas.
3. **Seeds deterministic test data** with fixed UUIDs for reproducibility.
4. **Switches between personas** (anon, outsider, employee, lance, cross-org) and asserts expected access.
5. **Cleans up** all helpers and test data, then rolls back the transaction.

## Test Personas

| Persona | Email | UID | Represents |
|---------|-------|-----|-----------|
| anon | (none) | (none) | Unauthenticated visitor |
| outsider | outsider@gmail.com | a4444444-... | Authenticated but not an employee |
| avery | avery@labnolabs.com | a2222222-... | Employee (non-admin) |
| lance | lance@labnolabs.com | a1111111-... | Owner / admin / HIPAA custodian |
| romy | romy@movement-solutions.com | a3333333-... | Cross-org employee (Movement Solutions) |

## Expected Output

All tests pass:

```
ok 1 - RLS enabled on internal_projects
ok 2 - RLS enabled on global_tasks
...
ok N - join leakage: outsider gets zero from projects JOIN tasks
```

Any failure indicates an RLS policy regression. Investigate immediately -- especially failures in Sections 2, 3, or 6, which indicate potential data exposure.

## Adding New Tables

When you add a new table to the schema:

1. Add an `ok()` test to Section 1 verifying RLS is enabled.
2. Add `is(count, 0)` tests to Sections 2 and 3 for anon/outsider denial.
3. Add appropriate read/write tests to Sections 4 and 5 based on the table's policy.
4. If the table holds sensitive data, add isolation tests to Section 6.
5. If the table can be joined with sensitive tables, add a join test to Section 7.
