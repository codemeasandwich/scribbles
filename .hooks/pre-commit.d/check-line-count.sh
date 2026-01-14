#!/usr/bin/env bash
# check-line-count.sh - Check that no source file exceeds 260 lines (excluding block comments)
# This script is READ-ONLY and does not modify any files.

MAX_LINES=260
ERROR=0
FAILED_FILES=()

# Function to count lines excluding block comments (/* ... */ and /** ... */)
# Also excludes the first blank line immediately before each block comment or single-line comment.
count_lines_without_block_comments() {
    cat "$1" | perl -0777 -ne 's|\n[ \t]*\n/\*.*?\*/|\n|gs; s|/\*.*?\*/||gs; s|\n[ \t]*\n([ \t]*//)|$1|g; print' | grep -c '' || echo 0
}

# Find all STAGED JS source files (excluding node_modules, coverage, test files, examples, .next)
while IFS= read -r file; do
    # Skip if file doesn't exist (e.g., deleted in index)
    [ -f "$file" ] || continue
    
    # Apply exclusion filters
    if [[ "$file" =~ node_modules/ ]] || \
       [[ "$file" =~ ^coverage/ ]] || \
       [[ "$file" =~ \.next/ ]] || \
       [[ "$file" =~ ^example/ ]] || \
       [[ "$file" =~ \.test\.js$ ]]; then
        continue
    fi

    lines=$(count_lines_without_block_comments "$file")
    if [ "$lines" -gt "$MAX_LINES" ]; then
        FAILED_FILES+=("$file ($lines lines)")
        ERROR=1
    fi
done < <(git diff --cached --name-only --diff-filter=ACM | grep '\.js$')

if [ $ERROR -eq 1 ]; then
    echo ""
    echo "❌ Files exceeding $MAX_LINES source lines (excluding block comments):"
    for failed in "${FAILED_FILES[@]}"; do
        echo "   - $failed"
    done
    echo ""
    echo "   Run: find . -name '*.js' ! -path '*/node_modules/*' ! -name '*.test.js' -exec wc -l {} + | sort -rn"
    exit 1
fi

exit 0
