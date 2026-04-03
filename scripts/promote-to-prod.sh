#!/usr/bin/env bash
# =============================================================================
# promote-to-prod.sh — Promotion checklist: staging -> production
#
# This script does NOT auto-deploy. It runs checks and outputs instructions.
#
# Usage:
#   ./scripts/promote-to-prod.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0
PROMOTION_LOG=""

log_pass() { PASS=$((PASS + 1)); PROMOTION_LOG+="  PASS: $1\n"; echo -e "  ${GREEN}PASS${NC}: $1"; }
log_warn() { WARN=$((WARN + 1)); PROMOTION_LOG+="  WARN: $1\n"; echo -e "  ${YELLOW}WARN${NC}: $1"; }
log_fail() { FAIL=$((FAIL + 1)); PROMOTION_LOG+="  FAIL: $1\n"; echo -e "  ${RED}FAIL${NC}: $1"; }

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  Labno Labs Center — Promotion Check${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo "Date: $(date -u +"%Y-%m-%d %H:%M UTC")"
echo "Branch: $(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'unknown')"
echo "Commit: $(cd "$PROJECT_ROOT" && git log -1 --format='%h %s' 2>/dev/null || echo 'unknown')"
echo ""

# ---------------------------------------------------------------------------
# 1. Verify staging build passes
# ---------------------------------------------------------------------------
echo -e "${CYAN}[1/5] Build verification${NC}"

if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "  Running build..."
    if (cd "$PROJECT_ROOT" && npm run build > /tmp/labno-build-output.txt 2>&1); then
        log_pass "Build completed successfully"
    else
        log_fail "Build failed. See output:"
        tail -20 /tmp/labno-build-output.txt | while IFS= read -r line; do echo "    $line"; done
    fi
else
    log_fail "package.json not found at $PROJECT_ROOT"
fi

# Check TypeScript errors
if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
    echo "  Checking TypeScript..."
    if (cd "$PROJECT_ROOT" && npx tsc --noEmit > /tmp/labno-tsc-output.txt 2>&1); then
        log_pass "No TypeScript errors"
    else
        TSC_ERRORS=$(wc -l < /tmp/labno-tsc-output.txt | tr -d ' ')
        log_warn "TypeScript reported issues ($TSC_ERRORS lines of output)"
    fi
fi

echo ""

# ---------------------------------------------------------------------------
# 2. List migrations not yet in production
# ---------------------------------------------------------------------------
echo -e "${CYAN}[2/5] Migration audit${NC}"

MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
    echo "  Found $MIGRATION_COUNT migration file(s):"

    for migration in "$MIGRATIONS_DIR"/*.sql; do
        [ -f "$migration" ] || continue
        BASENAME=$(basename "$migration")
        echo -e "    ${CYAN}$BASENAME${NC}"

        # Check for destructive operations
        if grep -qiE '\bDROP\s+(TABLE|COLUMN|INDEX|POLICY|FUNCTION)\b' "$migration" 2>/dev/null; then
            log_warn "DESTRUCTIVE: $BASENAME contains DROP statements"
            echo -e "      ${YELLOW}Lines with DROP:${NC}"
            grep -niE '\bDROP\s+(TABLE|COLUMN|INDEX|POLICY|FUNCTION)\b' "$migration" | while IFS= read -r line; do
                echo -e "        ${YELLOW}$line${NC}"
            done
        fi

        if grep -qiE '\bTRUNCATE\b' "$migration" 2>/dev/null; then
            log_fail "DESTRUCTIVE: $BASENAME contains TRUNCATE"
        fi

        if grep -qiE '\bDELETE\s+FROM\b' "$migration" 2>/dev/null; then
            log_warn "CAUTION: $BASENAME contains DELETE FROM"
        fi

        if grep -qiE '\bALTER\s+TABLE.*DROP\s+COLUMN\b' "$migration" 2>/dev/null; then
            log_fail "DESTRUCTIVE: $BASENAME drops column(s) — data loss risk"
        fi
    done

    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        log_pass "No pending migrations"
    fi
else
    log_warn "No migrations directory found"
fi

echo ""

# ---------------------------------------------------------------------------
# 3. Env var validation
# ---------------------------------------------------------------------------
echo -e "${CYAN}[3/5] Environment validation${NC}"

if [ -f "$PROJECT_ROOT/.env.production" ]; then
    if "$SCRIPT_DIR/env-setup.sh" validate production > /tmp/labno-env-check.txt 2>&1; then
        log_pass "Production env vars validated"
    else
        log_fail "Production env validation failed"
        tail -5 /tmp/labno-env-check.txt | while IFS= read -r line; do echo "    $line"; done
    fi
else
    log_warn ".env.production not found — ensure Vercel env vars are configured"
fi

# Cross-check for leaks
if [ -f "$PROJECT_ROOT/.env.staging" ] && [ -f "$PROJECT_ROOT/.env.production" ]; then
    if "$SCRIPT_DIR/env-setup.sh" check-leak > /tmp/labno-leak-check.txt 2>&1; then
        log_pass "No credential leaks detected"
    else
        log_fail "Credential leak detected between staging and production"
        cat /tmp/labno-leak-check.txt | while IFS= read -r line; do echo "    $line"; done
    fi
fi

echo ""

# ---------------------------------------------------------------------------
# 4. Git status check
# ---------------------------------------------------------------------------
echo -e "${CYAN}[4/5] Git status${NC}"

if (cd "$PROJECT_ROOT" && git diff --quiet 2>/dev/null); then
    log_pass "Working tree is clean"
else
    log_warn "Uncommitted changes detected — commit or stash before promoting"
    (cd "$PROJECT_ROOT" && git diff --stat 2>/dev/null) | while IFS= read -r line; do echo "    $line"; done
fi

# Check if branch is pushed
CURRENT_BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "")
if [ -n "$CURRENT_BRANCH" ]; then
    LOCAL_SHA=$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE_SHA=$(cd "$PROJECT_ROOT" && git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || echo "")
    if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
        log_pass "Branch is pushed and up-to-date with remote"
    elif [ -z "$REMOTE_SHA" ]; then
        log_warn "Branch '$CURRENT_BRANCH' has no remote tracking branch"
    else
        log_warn "Local branch is ahead of remote — push before promoting"
    fi
fi

echo ""

# ---------------------------------------------------------------------------
# 5. Vercel config check
# ---------------------------------------------------------------------------
echo -e "${CYAN}[5/5] Vercel config${NC}"

if [ -f "$PROJECT_ROOT/vercel.json" ]; then
    log_pass "vercel.json present"

    # Check cron count
    CRON_COUNT=$(grep -c '"schedule"' "$PROJECT_ROOT/vercel.json" 2>/dev/null || echo "0")
    echo "  Crons configured: $CRON_COUNT"
else
    log_fail "vercel.json not found"
fi

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  PROMOTION SUMMARY${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo -e "  ${GREEN}Passed:  $PASS${NC}"
echo -e "  ${YELLOW}Warnings: $WARN${NC}"
echo -e "  ${RED}Failed:  $FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}PROMOTION BLOCKED — Fix $FAIL failure(s) above before proceeding.${NC}"
    echo ""
    exit 1
fi

if [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}PROMOTION POSSIBLE — Review $WARN warning(s) above.${NC}"
else
    echo -e "${GREEN}ALL CHECKS PASSED — Ready for promotion.${NC}"
fi

echo ""
echo -e "${BOLD}Manual deployment steps:${NC}"
echo ""
echo "  1. Ensure all migrations have been applied to the PRODUCTION Supabase project:"
echo "     supabase db push --db-url \$PRODUCTION_DB_URL"
echo ""
echo "  2. Deploy to Vercel production:"
echo "     vercel --prod"
echo ""
echo "  3. Or merge to main and let Vercel auto-deploy:"
echo "     git checkout main && git merge $CURRENT_BRANCH && git push origin main"
echo ""
echo "  4. Verify production after deploy:"
echo "     curl -s https://labno-labs-center.vercel.app/api/agent/process | head -5"
echo ""
echo "  5. Monitor for 15 minutes — check Vercel logs and Supabase dashboard."
echo ""

# Save promotion report
REPORT_FILE="/tmp/labno-promotion-report-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "Labno Labs Center — Promotion Report"
    echo "Date: $(date -u)"
    echo "Branch: $CURRENT_BRANCH"
    echo "Commit: $(cd "$PROJECT_ROOT" && git log -1 --format='%H %s' 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Results: $PASS passed, $WARN warnings, $FAIL failed"
    echo ""
    echo -e "$PROMOTION_LOG"
} > "$REPORT_FILE"

echo -e "Report saved to: ${CYAN}$REPORT_FILE${NC}"
echo ""
