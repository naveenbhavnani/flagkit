#!/bin/bash

# Script to validate CI setup locally before pushing
# This runs the same checks that GitHub Actions will run

set -e  # Exit on error

echo "🔍 Validating CI Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

run_check() {
    local name=$1
    local command=$2

    echo -e "${YELLOW}Running: $name${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✓ $name passed${NC}"
        echo ""
    else
        echo -e "${RED}✗ $name failed${NC}"
        echo ""
        FAILED=1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    echo -e "${RED}Error: Must be run from project root${NC}"
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile
echo ""

echo "🔧 Generating Prisma Client..."
pnpm --filter @flagkit/database exec prisma generate
echo ""

# Linting
run_check "API Lint" "pnpm --filter @flagkit/api lint"
run_check "Web Lint" "pnpm --filter @flagkit/web lint"

# Type checking
run_check "API Type Check" "pnpm --filter @flagkit/api exec tsc --noEmit"
run_check "Web Type Check" "pnpm --filter @flagkit/web exec tsc --noEmit"

# Tests
echo -e "${YELLOW}Note: Skipping API tests (require PostgreSQL and Redis)${NC}"
echo -e "${YELLOW}To run API tests locally, ensure services are running and use:${NC}"
echo -e "${YELLOW}  pnpm --filter @flagkit/api test${NC}"
echo ""

run_check "Web Tests" "pnpm --filter @flagkit/web test:run"

# Builds
run_check "API Build" "pnpm --filter @flagkit/api build"
run_check "Web Build" "pnpm --filter @flagkit/web build"

# Summary
echo ""
echo "════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All CI checks passed!${NC}"
    echo ""
    echo "Your code is ready to push. The CI pipeline should pass."
    exit 0
else
    echo -e "${RED}✗ Some CI checks failed${NC}"
    echo ""
    echo "Please fix the issues above before pushing."
    exit 1
fi
