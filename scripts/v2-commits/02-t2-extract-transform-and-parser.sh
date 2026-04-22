#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T2 — Split src/parsing/loader.js into pure transform + args-parser modules.
#
# Mechanical refactor with zero behaviour change. Existing tests must stay
# green; T1 scenarios must stay RED for the same reasons as after T1.
#
# Idempotent: if these paths have already been committed, the script detects
# "nothing to commit" after staging and exits 0 without creating an empty
# commit.
# ----------------------------------------------------------------------------

set -euo pipefail

# Disable git's pager so `git diff --cached --name-status` doesn't pipe into
# `less` and hang the script waiting for a human to press `q`.
export GIT_PAGER=cat
export PAGER=cat

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> T2: staging extracted modules + shim + docs"

git add src/parsing/args-parser.js \
        src/parsing/transform.js \
        src/parsing/loader.js \
        src/parsing/files.md \
        src/files.md

if git diff --cached --quiet; then
  echo "    nothing to commit — T2 changes already in HEAD"
  exit 0
fi

echo "==> T2: files staged:"
git diff --cached --name-status

echo "==> T2: creating commit"

git commit -m "$(cat <<'EOF'
refactor: split src/parsing/loader.js into pure transform + args-parser

Mechanical refactor with zero behavior change. Carves the "what to rewrite"
logic out of the legacy loader.js so that every v2 runtime adapter
(Node-CJS, Node-ESM, Bun) can call into a single shared transform function
rather than duplicating it. No new APIs, no package.json changes.

WHAT CHANGED

- src/parsing/transform.js (new)
    Pure `transformSource(source, filename) -> string`. Rewrites every
    scribbles.<level>(args...) call to scribbles.<level>.at({file,line,col,
    args:[...]}, ...originalArgs). Extracted verbatim from the pre-v2
    processFileForScribblesCalls with no semantic changes; comments expanded
    to document why the tagged-template thunks must be created at transform
    time (they close over the caller's lexical scope — the only way to
    resolve the *value* of e.g. `user.name` from post-hoc code).
    The `/* istanbul ignore next */` from the pre-v2 version is dropped
    because the function is now reachable via direct tests against
    _processSource, so coverage is measurable.
- src/parsing/args-parser.js (new)
    Pure `loadArgNames(getChar)` driver and `splitArgs(state, char, preChar)`
    state-machine step. The argument-list parser for a single
    scribbles.<level>(...) call site. Extracted verbatim. Comments expanded
    to describe why it's a char-at-a-time state machine rather than an AST
    parser (tolerance for partial / unbalanced source, zero new deps).
- src/parsing/loader.js (refactored to shim)
    Reduced from ~195 NCLOC to ~15 NCLOC. Still installs the
    Module._extensions['.js'] hook via node-hook (identical to v1.7.0) and
    still re-exports the legacy _loadArgNames / _splitArgs / _processSource
    aliases used by ~6 existing test files. Scheduled for deletion in T3/T12
    once the unified src/register/ adapter takes over hook installation.
- src/parsing/files.md + src/files.md
    Reflect the new module layout.

WHY — KEY DESIGN DECISIONS

1. Single-source-of-truth for the transform.
   v2 introduces up to three runtime adapters (Node-CJS Module._extensions,
   Node-ESM module.register, Bun.plugin) plus bundler plugins in the
   deferred follow-up issues. All of them must rewrite source the same way.
   Pulling the transform into its own pure module means the algorithm has
   exactly one implementation and one coverage report, independent of the
   various installation mechanisms.

2. Keep loader.js as a shim for this commit, delete it later.
   The existing test corpus (__tests__/12, 17, 21, 26, 33, 34, 35, 37, 42,
   43, 46, 99) imports _loadArgNames / _splitArgs / _processSource from
   loader.js. Preserving those exports through a thin shim means T2 is a
   provably-zero-behavior refactor — if any existing test regresses after
   T2, it's a bug in T2, not an API coupling the tests had to the internal
   structure. The shim is deleted in T3/T12 when the register adapter takes
   over and the tests have a more appropriate seam to target.

3. Scribbles' variable-name extraction is deliberately "invisible clever
   machinery" (quoting the project design notes). transform.js's header
   comment makes that framing explicit so a new contributor reading just
   that one file understands that `.at(...)` is an escape hatch, not a
   user-facing API, and that the point of the transform is to preserve
   feature parity where a post-hoc / stack-based approach fundamentally
   cannot (values of closed-over variables vanish once the caller frame
   exits).

EXPECTED STATE

- All 40+ existing __tests__/*.test.js continue to pass (regression contract).
- All five T1 scenario suites continue to fail RED for the same reasons as
  after T1 — this commit does not install any new hooks or change any
  public behavior.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T2: done. HEAD now:"
git log --oneline -1
