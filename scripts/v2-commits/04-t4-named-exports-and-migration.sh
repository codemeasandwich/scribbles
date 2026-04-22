#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T4 — v2 MIGRATION.md + regression test for the named-export surface.
#
# T3 already attached `register` alongside `config`, `trace`, `middleware` on
# `module.exports` (those three were already attached in v1; `register` was
# the new one). T4 narrows its scope to the user-facing artifacts that
# document and pin that surface:
#   - MIGRATION.md — the living v1 → v2 upgrade guide.
#   - __tests__/scenarios/named-exports.scenarios.test.js — regression
#     test that all four infrastructure APIs destructure cleanly, that
#     destructured `register` is reference-equal across requires, that
#     `config({})` is callable as a no-op, and that the v1 property-access
#     compat surface is preserved.
#
# No further index.js changes in this commit — T3's own staging included the
# `scribbles.register = register;` line because it could not be split from
# the rest of T3's index.js edits at the file level.
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

echo "==> T4: staging MIGRATION.md + named-exports scenario"

git add MIGRATION.md \
        __tests__/scenarios/named-exports.scenarios.test.js

if git diff --cached --quiet; then
  echo "    nothing to commit — T4 changes already in HEAD"
  exit 0
fi

echo "==> T4: files staged:"
git diff --cached --name-status

echo "==> T4: creating commit"

git commit -m "$(cat <<'EOF'
docs: add MIGRATION.md and named-export regression test for v2

Documents the v1 → v2 upgrade story as a living top-level document and pins
the CJS named-export surface with an in-process regression test. The
`register` attachment on `module.exports` itself landed in the preceding
commit together with the rest of the T3 runtime-adapter work (the
`scribbles.register = register;` line sits in index.js inside T3's index.js
edits and couldn't be cleanly separated at the file level without running
interactive git-add-patch operations).

WHAT CHANGED

- MIGRATION.md (new, top of repo)
    Living upgrade guide covering: the auto-install bug fix (D11), the
    node-hook dep removal, `register` as the new named export joining
    `config` / `trace` / `middleware`, the multi-runtime support arriving
    through T5/T6, the tiered version floor (CJS Node 8.5.0 unchanged;
    ESM Node 20.6+; Bun 1.0+), and a note that
    __tests__/32-hijacker-http-request.test.js has been failing before the
    v2 branch opened and is tracked separately.
- __tests__/scenarios/named-exports.scenarios.test.js (new)
    In-process scenarios pinning the CJS named-export contract:
      * config, trace, middleware, and register all destructure cleanly
        and are callable (all four are functions, not namespace objects).
      * destructured `register` is reference-equal across requires,
        proving the Symbol.for install-flag guard in src/register/
        sees the same function on every path.
      * config({}) is callable as a no-op, proving the binding is live.
      * legacy property access (scribbles.config etc.) still works —
        the soft-cut compat surface CJS offers.
    Kept small and in-process because this suite is about `module.exports`
    shape, not runtime parity; runtime parity is already covered by the
    basic-logging scenarios that spawn real child processes.

WHY — KEY DESIGN DECISIONS

1. Why MIGRATION.md lives at repo root, not in docs/.
   npm and GitHub both surface root-level MIGRATION / CHANGELOG /
   CONTRIBUTING markdown files on the package page and repo front
   page. Upgrade docs need the highest possible discoverability for
   users who see "v2.0.0" in their update stream and wonder what broke.

2. Why a dedicated in-process regression test for the export shape.
   The runtime-parity scenarios (node-cjs, bun-cjs, etc.) spawn child
   processes and assert on stdout. They cannot efficiently assert
   "`register` is a function, not a namespace object" — that is a shape
   property of the module itself, best pinned with a minimal Jest test
   that imports the module in-process and introspects. This file becomes
   the canonical regression point for any future change to the
   `module.exports` shape.

3. Why assert reference-equality on `register` across two requires.
   CJS caches `require()` results, so two destructures from the same
   specifier must yield the same function. Losing that invariant would
   mean the library's own auto-install and any user code that called
   `register()` were running against different Symbol.for flags —
   breaking the "exactly one hook chain" guarantee that T3's
   install-flag.js provides.

EXPECTED TEST STATE AFTER THIS COMMIT

  Existing 40+ __tests__/*.test.js suites — pass
  __tests__/scenarios/node-cjs.scenarios.test.js — PASSES (from T3)
  __tests__/scenarios/bun-cjs.scenarios.test.js  — PASSES (from T3)
  __tests__/scenarios/named-exports.scenarios.test.js — PASSES (T4)
  __tests__/scenarios/node-esm.scenarios.test.js — still RED (needs T5)
  __tests__/scenarios/bun-esm.scenarios.test.js  — still RED (needs T6)
  __tests__/scenarios/bun-test.scenarios.test.js — still RED (needs T6)
  __tests__/32-hijacker-http-request.test.js — pre-existing flaky failure
    unrelated to this commit.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T4: done. HEAD now:"
git log --oneline -1
