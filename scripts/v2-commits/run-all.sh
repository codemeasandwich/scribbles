#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Convenience wrapper — run every v2 commit script in order.
#
# Each individual script is idempotent (see their headers) so this is safe to
# re-run if any step fails partway through: already-committed work is
# detected and skipped, and the script stops on the first real error.
# ----------------------------------------------------------------------------

set -euo pipefail

# Disable git's pager globally for the duration of this run so the per-task
# `git diff --cached --name-status` calls inside the child scripts do not
# hang on an interactive pager when stdout is a TTY. The export propagates
# through the `bash <script>` calls below because those are child processes
# that inherit this shell's environment.
export GIT_PAGER=cat
export PAGER=cat

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "Running v2 commit scripts in order"
echo "=============================================="

for script in "$HERE"/[0-9][0-9]-*.sh; do
  echo ""
  echo "=============================================="
  echo "Running: $(basename "$script")"
  echo "=============================================="
  bash "$script"
done

echo ""
echo "=============================================="
echo "All v2 commit scripts completed"
echo "=============================================="
echo ""
echo "Recent commits:"
(cd "$HERE/../.." && git log --oneline -5)
