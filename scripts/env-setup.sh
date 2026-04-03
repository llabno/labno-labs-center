#!/usr/bin/env bash
# =============================================================================
# env-setup.sh — Environment configuration for labno-labs-center
#
# Two-project Supabase approach:
#   STAGING:    A separate Supabase project (e.g., "labno-labs-staging")
#               with its own URL, anon key, and service role key.
#               Used for testing migrations, seed data, and new features.
#
#   PRODUCTION: The live Supabase project ("labno-labs-center").
#               Only promoted code reaches this environment.
#
# Why two projects instead of schemas/branches:
#   - Full isolation: staging mistakes cannot touch production data
#   - Separate RLS policies, auth config, and API keys
#   - Free tier covers both (Supabase allows 2 free projects)
#   - HIPAA compliance: no risk of staging code leaking patient data
#
# Usage:
#   ./scripts/env-setup.sh generate   — Create .env.staging and .env.production templates
#   ./scripts/env-setup.sh validate   — Check that required vars are set
#   ./scripts/env-setup.sh check-leak — Detect production creds in staging env
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Required env vars per environment
# ---------------------------------------------------------------------------
REQUIRED_FRONTEND=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
)

REQUIRED_BACKEND=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_ANON_KEY"
    "CRON_SECRET"
)

REQUIRED_AGENT=(
    "AGENT_ROUTE"
)

# Optional but recommended
RECOMMENDED=(
    "ANTHROPIC_API_KEY"
    "POSTHOG_API_KEY"
    "MOSO_BRIDGE_SECRET"
)

# ---------------------------------------------------------------------------
# generate — Create .env.staging and .env.production from .env.example
# ---------------------------------------------------------------------------
generate_envs() {
    local EXAMPLE="$PROJECT_ROOT/.env.example"

    if [ ! -f "$EXAMPLE" ]; then
        echo -e "${RED}ERROR: .env.example not found at $EXAMPLE${NC}"
        exit 1
    fi

    for ENV in staging production; do
        local TARGET="$PROJECT_ROOT/.env.$ENV"

        if [ -f "$TARGET" ]; then
            echo -e "${YELLOW}SKIP: $TARGET already exists. Delete it first to regenerate.${NC}"
            continue
        fi

        echo -e "${CYAN}Generating $TARGET ...${NC}"

        {
            echo "# =================================================="
            echo "# .env.$ENV — Auto-generated from .env.example"
            echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
            echo "# =================================================="
            echo "#"
            if [ "$ENV" = "staging" ]; then
                echo "# STAGING ENVIRONMENT"
                echo "# Points to the STAGING Supabase project."
                echo "# Use clearly fake/test data. Never put real patient info here."
                echo "# Crons run less frequently (see vercel.staging.json)."
                echo "#"
            else
                echo "# PRODUCTION ENVIRONMENT"
                echo "# Points to the LIVE Supabase project."
                echo "# HIPAA-protected. Handle with care."
                echo "#"
            fi
            echo ""

            # Read .env.example and add environment hints
            while IFS= read -r line; do
                # Pass through comments and blank lines
                if [[ "$line" =~ ^# ]] || [[ -z "$line" ]]; then
                    echo "$line"
                    continue
                fi

                # Extract key=value
                local key="${line%%=*}"
                local val="${line#*=}"

                if [ "$ENV" = "staging" ]; then
                    case "$key" in
                        VITE_SUPABASE_URL|SUPABASE_URL)
                            echo "${key}=https://YOUR-STAGING-PROJECT.supabase.co"
                            ;;
                        VITE_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY)
                            echo "${key}=your-staging-anon-key"
                            ;;
                        SUPABASE_SERVICE_ROLE_KEY)
                            echo "${key}=your-staging-service-role-key"
                            ;;
                        CRON_SECRET|MOSO_BRIDGE_SECRET)
                            echo "${key}=staging-$(openssl rand -hex 16 2>/dev/null || echo 'generate-a-random-secret')"
                            ;;
                        AGENT_ROUTE)
                            echo "${key}=local"
                            ;;
                        VERCEL_PROD_URL)
                            echo "VERCEL_PROD_URL=https://labno-labs-center-staging.vercel.app"
                            ;;
                        PERSONAL_LOG_SHEET_ID)
                            echo "# ${key} — Use a TEST sheet for staging, never the real one"
                            echo "${key}=your-staging-test-sheet-id"
                            ;;
                        *)
                            echo "${key}=${val}"
                            ;;
                    esac
                else
                    # Production: keep placeholders, user fills in real values
                    echo "$line"
                fi
            done < "$EXAMPLE"
        } > "$TARGET"

        echo -e "${GREEN}Created $TARGET${NC}"
    done

    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Create a staging Supabase project at https://supabase.com/dashboard"
    echo "  2. Fill in .env.staging with the staging project credentials"
    echo "  3. Fill in .env.production with the production project credentials"
    echo "  4. Run: ./scripts/env-setup.sh validate"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Never commit .env.staging or .env.production to git.${NC}"
    echo "  Verify they are in .gitignore."
}

# ---------------------------------------------------------------------------
# validate — Check required vars are set (non-empty) in a given env file
# ---------------------------------------------------------------------------
validate_env() {
    local ENV="${1:-}"

    if [ -z "$ENV" ]; then
        echo "Usage: $0 validate [staging|production]"
        exit 1
    fi

    local ENVFILE="$PROJECT_ROOT/.env.$ENV"

    if [ ! -f "$ENVFILE" ]; then
        echo -e "${RED}ERROR: $ENVFILE not found. Run '$0 generate' first.${NC}"
        exit 1
    fi

    echo -e "${CYAN}Validating $ENVFILE ...${NC}"
    echo ""

    local ERRORS=0
    local WARNINGS=0

    # Source the env file to check values
    set -a
    # shellcheck disable=SC1090
    source "$ENVFILE"
    set +a

    # Check required frontend vars
    echo "Frontend (VITE_*) vars:"
    for var in "${REQUIRED_FRONTEND[@]}"; do
        if [ -z "${!var:-}" ] || [[ "${!var}" == your-* ]] || [[ "${!var}" == YOUR-* ]]; then
            echo -e "  ${RED}MISSING: $var${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "  ${GREEN}OK: $var${NC}"
        fi
    done

    echo ""
    echo "Backend vars:"
    for var in "${REQUIRED_BACKEND[@]}"; do
        if [ -z "${!var:-}" ] || [[ "${!var}" == your-* ]] || [[ "${!var}" == YOUR-* ]]; then
            echo -e "  ${RED}MISSING: $var${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "  ${GREEN}OK: $var${NC}"
        fi
    done

    echo ""
    echo "Agent routing:"
    for var in "${REQUIRED_AGENT[@]}"; do
        if [ -z "${!var:-}" ]; then
            echo -e "  ${YELLOW}WARNING: $var not set (will default to simulation mode)${NC}"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "  ${GREEN}OK: $var = ${!var}${NC}"
        fi
    done

    echo ""
    echo "Recommended vars:"
    for var in "${RECOMMENDED[@]}"; do
        if [ -z "${!var:-}" ]; then
            echo -e "  ${YELLOW}WARNING: $var not set (some features will be disabled)${NC}"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "  ${GREEN}OK: $var${NC}"
        fi
    done

    echo ""
    echo "---"
    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}FAILED: $ERRORS required var(s) missing. Fix before deploying.${NC}"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}PASSED with $WARNINGS warning(s).${NC}"
    else
        echo -e "${GREEN}ALL CHECKS PASSED.${NC}"
    fi
}

# ---------------------------------------------------------------------------
# check-leak — Detect production credentials accidentally in staging
# ---------------------------------------------------------------------------
check_leak() {
    local STAGING="$PROJECT_ROOT/.env.staging"
    local PRODUCTION="$PROJECT_ROOT/.env.production"

    if [ ! -f "$STAGING" ]; then
        echo -e "${RED}ERROR: .env.staging not found.${NC}"
        exit 1
    fi

    if [ ! -f "$PRODUCTION" ]; then
        echo -e "${YELLOW}WARNING: .env.production not found. Cannot cross-check. Skipping.${NC}"
        exit 0
    fi

    echo -e "${CYAN}Checking for production credentials in staging env...${NC}"
    echo ""

    local LEAKS=0

    # Extract production Supabase URL
    PROD_URL=$(grep -E '^SUPABASE_URL=' "$PRODUCTION" | head -1 | cut -d'=' -f2-)
    PROD_VITE_URL=$(grep -E '^VITE_SUPABASE_URL=' "$PRODUCTION" | head -1 | cut -d'=' -f2-)
    PROD_SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$PRODUCTION" | head -1 | cut -d'=' -f2-)

    # Check staging for production values
    if [ -n "$PROD_URL" ] && [ "$PROD_URL" != "your-supabase-project-url" ]; then
        if grep -q "$PROD_URL" "$STAGING" 2>/dev/null; then
            echo -e "  ${RED}LEAK DETECTED: Production SUPABASE_URL found in .env.staging${NC}"
            LEAKS=$((LEAKS + 1))
        fi
    fi

    if [ -n "$PROD_VITE_URL" ] && [ "$PROD_VITE_URL" != "your-supabase-project-url" ]; then
        if grep -q "$PROD_VITE_URL" "$STAGING" 2>/dev/null; then
            echo -e "  ${RED}LEAK DETECTED: Production VITE_SUPABASE_URL found in .env.staging${NC}"
            LEAKS=$((LEAKS + 1))
        fi
    fi

    if [ -n "$PROD_SERVICE_KEY" ] && [ "$PROD_SERVICE_KEY" != "your-supabase-service-role-key" ]; then
        if grep -q "$PROD_SERVICE_KEY" "$STAGING" 2>/dev/null; then
            echo -e "  ${RED}LEAK DETECTED: Production SERVICE_ROLE_KEY found in .env.staging${NC}"
            LEAKS=$((LEAKS + 1))
        fi
    fi

    # Check that staging and production URLs are different
    STAGING_URL=$(grep -E '^SUPABASE_URL=' "$STAGING" | head -1 | cut -d'=' -f2-)
    if [ -n "$PROD_URL" ] && [ -n "$STAGING_URL" ] && [ "$PROD_URL" = "$STAGING_URL" ]; then
        if [ "$PROD_URL" != "your-supabase-project-url" ]; then
            echo -e "  ${RED}SAME URL: Staging and production use the same SUPABASE_URL${NC}"
            echo -e "  ${RED}         This means staging writes go to production!${NC}"
            LEAKS=$((LEAKS + 1))
        fi
    fi

    if [ $LEAKS -gt 0 ]; then
        echo ""
        echo -e "${RED}FAILED: $LEAKS leak(s) detected. Fix .env.staging before proceeding.${NC}"
        exit 1
    else
        echo -e "  ${GREEN}No production credentials found in staging.${NC}"
        echo -e "${GREEN}CLEAN.${NC}"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-}" in
    generate)
        generate_envs
        ;;
    validate)
        validate_env "${2:-}"
        ;;
    check-leak)
        check_leak
        ;;
    *)
        echo "Usage: $0 {generate|validate [staging|production]|check-leak}"
        echo ""
        echo "Commands:"
        echo "  generate              Create .env.staging and .env.production templates"
        echo "  validate staging      Validate staging env vars are set"
        echo "  validate production   Validate production env vars are set"
        echo "  check-leak            Check for production creds leaked into staging"
        exit 1
        ;;
esac
