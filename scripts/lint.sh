#!/usr/bin/env bash
# ============================================================================
# Code Quality Gate — unified entry point for ALL linters
# ============================================================================
# Usage:
#   bash scripts/lint.sh          # Run all checks (stop on first failure)
#   bash scripts/lint.sh --all    # Run all checks (report all, even on failure)
#   bash scripts/lint.sh --fix    # Auto-fix what tools can, then check remaining
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

REPORT_ALL=false
AUTO_FIX=false

for arg in "$@"; do
    case "$arg" in
        --all) REPORT_ALL=true ;;
        --fix) AUTO_FIX=true ;;
    esac
done

FAILED=0
PASSED=0
TOTAL=3

run_check() {
    local name="$1"
    local cmd="$2"
    printf "${BOLD}[%d/%d]${NC} %-20s" "$((PASSED + FAILED + 1))" "$TOTAL" "$name"

    if output=$(eval "$cmd" 2>&1); then
        printf "${GREEN}PASSED${NC}\n"
        PASSED=$((PASSED + 1))
    else
        printf "${RED}FAILED${NC}\n"
        echo "$output" | head -20
        FAILED=$((FAILED + 1))
        if [ "$REPORT_ALL" = false ]; then
            echo ""
            printf "${RED}Stopping on first failure.${NC} Use ${BOLD}--all${NC} to run remaining checks.\n"
            exit 1
        fi
    fi
}

echo ""
printf "${BOLD}Code Quality Gate${NC}\n"
echo "============================================"
echo ""

if [ "$AUTO_FIX" = true ]; then
    printf "${YELLOW}Auto-fixing...${NC}\n"
    npx eslint . --fix 2>/dev/null || true
    npx prettier --write . 2>/dev/null || true
    echo ""
fi

run_check "typecheck"       "npx tsc --noEmit"
run_check "eslint"          "npx eslint ."
run_check "prettier"        "npx prettier --check ."

echo ""
echo "============================================"
if [ "$FAILED" -eq 0 ]; then
    printf "${GREEN}${BOLD}All %d checks passed!${NC}\n" "$TOTAL"
else
    printf "${RED}${BOLD}%d/%d checks failed${NC}\n" "$FAILED" "$TOTAL"
    exit 1
fi
