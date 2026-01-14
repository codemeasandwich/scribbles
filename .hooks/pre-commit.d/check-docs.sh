#!/usr/bin/env bash
# .hooks/pre-commit.d/check-docs.sh - Documentation validation
# Ensures:
# 1. Every new folder has README.md and files.md
# 2. Every committed file has entries in parent's files.md (Directory Structure + Files section)

ERROR=0
MISSING_DOCS=()
MISSING_README=()
MISSING_FILES_MD=()

# Directories to exclude from documentation checks
EXCLUDED_DIRS="node_modules|coverage|.next|.git|.hooks|.github|example|todo|scripts"

# Function to check if a path should be excluded
is_excluded() {
    local path="$1"
    echo "$path" | grep -qE "($EXCLUDED_DIRS)" && return 0
    return 1
}

# Function to get the parent directory's files.md path
get_parent_files_md() {
    local file="$1"
    local parent_dir=$(dirname "$file")
    echo "$parent_dir/files.md"
}

# Function to extract just the filename from a path
get_filename() {
    basename "$1"
}

# Function to check if a value exists in an array
array_contains() {
    local needle="$1"
    shift
    for item in "$@"; do
        if [ "$item" = "$needle" ]; then
            return 0
        fi
    done
    return 1
}

# Function to check if file is documented in files.md
check_file_documented() {
    local file="$1"
    local files_md="$2"
    local filename=$(get_filename "$file")

    if [ ! -f "$files_md" ]; then
        return 1
    fi

    # Check for entry in Directory Structure section (look for the filename in a code block or tree)
    local in_dir_structure=false
    # Check for entry in Files section (look for ### `filename` or ### filename pattern)
    local in_files_section=false

    # For directories, check if mentioned in Directory Structure
    if [ -d "$file" ]; then
        if grep -qE "^\s*(├──|└──|│)?\s*${filename}/?(\s|$|\`)" "$files_md" 2>/dev/null; then
            in_dir_structure=true
        fi
        # Also check for ### `dirname/` pattern in Files section
        if grep -qE "^###\s+\`?${filename}/?\`?" "$files_md" 2>/dev/null; then
            in_files_section=true
        fi
    else
        # For files, check Directory Structure
        if grep -qE "(├──|└──|│)?\s*${filename}(\s|$|\`)" "$files_md" 2>/dev/null; then
            in_dir_structure=true
        fi
        # Check Files section for ### `filename` or ### filename
        if grep -qE "^###\s+\`?${filename}\`?" "$files_md" 2>/dev/null; then
            in_files_section=true
        fi
    fi

    if $in_dir_structure && $in_files_section; then
        return 0
    fi
    return 1
}

# Get list of staged files (added or modified)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null || true)

# Exit early if no staged files
if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# Track new directories (using a regular array with deduplication)
NEW_DIRS=()

for file in $STAGED_FILES; do
    # Skip excluded paths
    if is_excluded "$file"; then
        continue
    fi

    # Track new directories
    dir=$(dirname "$file")
    while [ "$dir" != "." ] && [ "$dir" != "/" ]; do
        # Check if this directory is being newly created (not in HEAD)
        if ! git ls-tree -d HEAD "$dir" &>/dev/null 2>&1; then
            # Add to array if not already present
            if ! array_contains "$dir" "${NEW_DIRS[@]}"; then
                NEW_DIRS+=("$dir")
            fi
        fi
        dir=$(dirname "$dir")
    done
done

# Check that new directories have README.md and files.md
for dir in "${NEW_DIRS[@]}"; do
    if is_excluded "$dir"; then
        continue
    fi

    # Check for README.md
    readme_staged=$(echo "$STAGED_FILES" | grep -x "$dir/README.md" || true)
    if [ -z "$readme_staged" ] && [ ! -f "$dir/README.md" ]; then
        MISSING_README+=("$dir")
        ERROR=1
    fi

    # Check for files.md
    filesmd_staged=$(echo "$STAGED_FILES" | grep -x "$dir/files.md" || true)
    if [ -z "$filesmd_staged" ] && [ ! -f "$dir/files.md" ]; then
        MISSING_FILES_MD+=("$dir")
        ERROR=1
    fi
done

# Check that each staged file is documented in its parent's files.md
for file in $STAGED_FILES; do
    # Skip excluded paths
    if is_excluded "$file"; then
        continue
    fi

    # Skip documentation files themselves
    filename=$(get_filename "$file")
    if [ "$filename" = "README.md" ] || [ "$filename" = "files.md" ]; then
        continue
    fi

    # Skip test files
    if [[ "$filename" == *.test.js ]]; then
        continue
    fi

    # Skip root-level files (they don't need files.md documentation)
    parent_dir=$(dirname "$file")
    if [ "$parent_dir" = "." ]; then
        continue
    fi

    # Get the files.md for this file's parent directory
    files_md=$(get_parent_files_md "$file")

    # Check if files.md exists (either staged or on disk)
    files_md_exists=false
    if echo "$STAGED_FILES" | grep -qx "$files_md"; then
        files_md_exists=true
    elif [ -f "$files_md" ]; then
        files_md_exists=true
    fi

    if ! $files_md_exists; then
        MISSING_DOCS+=("$file (no files.md in $parent_dir)")
        ERROR=1
        continue
    fi

    # Check if the file is documented
    if ! check_file_documented "$file" "$files_md"; then
        MISSING_DOCS+=("$file (not in $files_md)")
        ERROR=1
    fi
done

# Output results
if [ $ERROR -eq 1 ]; then
    echo ""

    if [ ${#MISSING_README[@]} -gt 0 ]; then
        echo "❌ New directories missing README.md:"
        for dir in "${MISSING_README[@]}"; do
            echo "   - $dir/README.md"
        done
        echo ""
    fi

    if [ ${#MISSING_FILES_MD[@]} -gt 0 ]; then
        echo "❌ New directories missing files.md:"
        for dir in "${MISSING_FILES_MD[@]}"; do
            echo "   - $dir/files.md"
        done
        echo ""
    fi

    if [ ${#MISSING_DOCS[@]} -gt 0 ]; then
        echo "❌ Files not documented in files.md (need ## Directory Structure AND ## Files entry):"
        for doc in "${MISSING_DOCS[@]}"; do
            echo "   - $doc"
        done
        echo ""
        echo "   Each file needs:"
        echo "   1. Entry in '## Directory Structure' section (in the tree diagram)"
        echo "   2. Entry in '## Files' section as '### \`filename\`' with description"
        echo ""
    fi

    exit 1
fi

exit 0
