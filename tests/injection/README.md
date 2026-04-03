# Oracle Prompt Injection Test Harness

Tests the `/api/oracle/ask` endpoint against adversarial prompt injection attacks.

## What It Tests

| Category | Count | Description |
|----------|-------|-------------|
| system-prompt-extraction | 4 | Attempts to make the Oracle reveal its system prompt or internal structure |
| role-hijacking | 3 | Attempts to override the Oracle's role and remove restrictions |
| data-exfiltration | 5 | Attempts to extract PII, credentials, or raw database contents |
| instruction-override | 4 | Attempts to override or escape the SOP-only instruction boundary |
| encoding-attacks | 3 | Base64, ROT13, and hex-encoded injection payloads |
| nested-injection | 3 | Injection payloads disguised as fake SOP content |
| multi-turn | 2 | Attempts to plant triggers or chain instructions across turns |
| clinical-boundary | 4 | Questions the Oracle should refuse or caveat (prescribing, diagnosing) |
| benign-control | 3 | Legitimate questions that should be answered normally |

## Quick Start

```bash
# Start your dev server first
npm run dev  # or vercel dev

# Dry run -- list all tests without sending requests
node tests/injection/run-tests.js --dry-run

# Run against local dev server (no auth -- will get 401s but tests injection shield)
node tests/injection/run-tests.js

# Run with a Supabase auth token for full end-to-end testing
node tests/injection/run-tests.js --token YOUR_SUPABASE_JWT
```

## CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--endpoint URL` | `http://localhost:3000/api/oracle/ask` | Oracle API endpoint |
| `--dry-run` | off | List tests without executing |
| `--token JWT` | none | Supabase auth token (Bearer) |
| `--category NAME` | all | Run only tests in this category |
| `--id TEST_ID` | all | Run only this specific test |
| `--delay MS` | 500 | Milliseconds between requests (rate limiting) |
| `--verbose` | off | Show response previews |

## How It Works

1. Loads test cases from `test-cases.json`
2. Sends each payload as a POST to the Oracle endpoint
3. Checks the response for indicators of injection success:
   - **System prompt leak**: response contains fragments of the system prompt
   - **Role hijack**: response confirms a role change
   - **Data exfiltration**: response contains PII, credentials, or raw data
   - **Clinical boundary violation**: response answers a clinical question without caveats
4. Outputs pass/fail for each test and a summary
5. Writes detailed results to `last-run-results.json`

Exit code is 0 if all tests pass, 1 if any fail.

## Adding New Test Cases

Add entries to `test-cases.json`. Each test case needs:

```json
{
  "id": "category-NNN",
  "category": "one of the categories above or a new one",
  "payload": "The text sent as the user query",
  "expected_behavior": "should_block | should_warn | should_pass",
  "description": "Human-readable explanation of what this tests"
}
```

- `should_block`: The Oracle must either reject the request (HTTP 400/403) or respond without leaking information
- `should_warn`: The Oracle should include caveats, refusals, or defer to proper channels
- `should_pass`: Legitimate query that should be answered normally

## Known Gaps in Current Oracle Shield

Based on analysis of `api/oracle/ask.js`, the existing injection shield (line 73-76) only catches:
- "ignore previous instructions"
- "forget your rules"
- "system: override"
- "dump the oracle_sops"

This test harness covers many more attack vectors that bypass the current regex filter. Failures indicate where the shield needs strengthening.

## Non-Destructive

This harness only sends POST requests with query payloads. It never modifies, deletes, or writes any data. Safe to run against production (though you probably want to use staging).
