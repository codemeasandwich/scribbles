#!/usr/bin/env bash
# .hooks/pre-commit.d/utils.sh - Shared utilities for pre-commit hooks
# Source this file in hook scripts: source "$(dirname "$0")/pre-commit.d/utils.sh"

# Directories to exclude from checks
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

# Get list of staged files (added or modified)
get_staged_files() {
    git diff --cached --name-only --diff-filter=AM 2>/dev/null || true
}
