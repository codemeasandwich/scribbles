#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Chore — commit the v2-commit tooling itself.
#
# The scripts/v2-commits/ tree is the mechanism this v2 work was shipped
# through. Keeping it in git history helps future maintainers understand
# how the v2 rollout was sequenced and preserves the detailed commit-message
# HEREDOCs that doubled as the changelog during the v2 branch's lifetime.
#
# Runs LAST in the run-all sequence so all per-task commits are made first.
#
# Idempotent: if the scripts are already committed, exits 0 without a
# duplicate commit.
# ----------------------------------------------------------------------------

set -euo pipefail

# Disable git's pager so `git diff --cached --name-status` doesn't pipe into
# `less` and hang the script waiting for a human to press `q`.
export GIT_PAGER=cat
export PAGER=cat

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> chore: staging scripts/v2-commits/ tooling"

git add scripts/v2-commits/

if git diff --cached --quiet; then
  echo "    nothing to commit — tooling already in HEAD"
  exit 0
fi

echo "==> chore: files staged:"
git diff --cached --name-status

echo "==> chore: creating commit"

git commit -m "$(cat <<'EOF'
chore: add v2 commit-script tooling

Captures the per-task commit scripts that mechanically sequenced the
v2.0.0 multi-runtime refactor. Each script in scripts/v2-commits/ is
self-documenting via its header comment and stages a narrow, specific
set of paths for one v2 task.

WHAT CHANGED

- scripts/v2-commits/README.md
    Explains the purpose of the directory, the run order, and the
    safety properties of the scripts (set -euo pipefail, narrow
    git add, no-op on "nothing to commit").
- scripts/v2-commits/01-t1-scenario-harness.sh
- scripts/v2-commits/02-t2-extract-transform-and-parser.sh
- scripts/v2-commits/03-t3-auto-install-drop-node-hook.sh
- scripts/v2-commits/04-t4-named-exports-and-migration.sh
- scripts/v2-commits/05-t5-esm-support.sh
- scripts/v2-commits/06-t6-docs-and-introspection-tests.sh
    One script per v2 task committed so far. Each uses a
    single-quoted HEREDOC so commit-message content is preserved
    verbatim regardless of shell interpolation quirks.
- scripts/v2-commits/run-all.sh
    Convenience wrapper that iterates every [0-9][0-9]-*.sh script
    in order. Safe to re-run — per-script idempotency checks keep
    it from producing empty commits.
- scripts/v2-commits/99-chore-v2-tooling.sh
    Self-referential — commits this tooling directory. Runs last.

WHY

The interactive shell this work was authored through was not
executing commands (0-ms completion with empty output on every
invocation), so the authoring agent could neither run the commits
itself nor run the test suite. Saving each commit as a self-contained
bash script let the human collaborator execute them verbatim in a
working terminal without having to retype long HEREDOC bodies, and
preserved the commit-message discipline the project's CASE rules
require.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> chore: done. HEAD now:"
git log --oneline -1
