#!/usr/bin/env bash
# .hooks/pre-commit.d/check-jsdoc.sh - JSDoc validation for staged files
# Ensures:
# 1. Every JS file starts with a JSDoc file-level comment
# 2. Every function has complete JSDoc documentation
# 3. JSDoc @param tags match function parameters
# 4. JSDoc @returns matches function return behavior

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
VALIDATOR="$HOOKS_DIR/jsdoc-validator.js"

# Directories to exclude from JSDoc checks
EXCLUDED_DIRS="node_modules|coverage|.next|.git|.hooks|.github|example|todo|scripts"

ERROR=0
FAILED_FILES=()

# Check if validator exists
if [ ! -f "$VALIDATOR" ]; then
    echo "❌ JSDoc validator not found: $VALIDATOR"
    exit 1
fi

# Get list of staged JS files (added or modified)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null | grep '\.js$' || true)

# Exit early if no JS files staged
if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

for file in $STAGED_FILES; do
    # Skip excluded paths
    if echo "$file" | grep -qE "($EXCLUDED_DIRS)"; then
        continue
    fi

    # Skip test files
    if echo "$file" | grep -qE '\.test\.js$'; then
        continue
    fi

    # Skip if file doesn't exist (deleted)
    if [ ! -f "$file" ]; then
        continue
    fi

    # Run the JSDoc validator
    output=$(node "$VALIDATOR" "$file" 2>&1)
    status=$?

    if [ $status -ne 0 ]; then
        FAILED_FILES+=("$file")
        echo "$output"
        ERROR=1
    fi
done

if [ $ERROR -eq 1 ]; then
    echo ""
    echo "❌ JSDoc validation failed for ${#FAILED_FILES[@]} file(s):"
    for failed in "${FAILED_FILES[@]}"; do
        echo "   - $failed"
    done
    echo ""
    echo "   Each file needs:"
    echo "   1. File-level JSDoc comment at the start (/** @file ... */)"
    echo "   2. JSDoc comment before every function"
    echo "   3. @param tags matching function parameters"
    echo "   4. @returns tag if function returns a value"
    echo ""
    exit 1
fi

exit 0
