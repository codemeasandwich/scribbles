#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T1 — Scenario harness and failing E2E coverage for multi-runtime support.
#
# Establishes the test harness that every subsequent v2 task drives against,
# per the CASE "test harness first" rule. Five scenario suites land as RED
# tests that flip green as their corresponding production task lands. Zero
# production code changes in this commit.
#
# Idempotent: if these paths have already been committed, the script detects
# "nothing to commit" after staging and exits 0 without creating an empty
# commit.
# ----------------------------------------------------------------------------

set -euo pipefail

# Disable git's pager so `git diff --cached --name-status` doesn't pipe into
# `less` and hang the script waiting for a human to press `q`. This is
# essential in automation-style runs where stdin is still attached to a TTY
# and git's auto-detection would otherwise invoke the pager for diffs.
export GIT_PAGER=cat
export PAGER=cat

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> T1: staging scenario harness + CI workflow + jest ignore update"

# Explicit file list rather than `git add __tests__/scenarios/` because the
# latter would also stage __tests__/scenarios/named-exports.scenarios.test.js,
# which belongs to T4 (the named-export regression test lands alongside
# MIGRATION.md, not with the harness scaffolding).
#
# The `__tests__/scenarios/fixtures/` and `__tests__/scenarios/harness/`
# paths are staged recursively, which picks up the README.md + files.md
# the pre-commit docs-check hook requires inside those subdirectories.
# The scenarios-root README.md + files.md are listed explicitly because
# they sit alongside (not inside) those subdirectories.
git add .github/workflows/ci.yml \
        __tests__/scenarios/fixtures/ \
        __tests__/scenarios/harness/ \
        __tests__/scenarios/README.md \
        __tests__/scenarios/files.md \
        __tests__/scenarios/bun-cjs.scenarios.test.js \
        __tests__/scenarios/bun-esm.scenarios.test.js \
        __tests__/scenarios/bun-test.scenarios.test.js \
        __tests__/scenarios/node-cjs.scenarios.test.js \
        __tests__/scenarios/node-esm.scenarios.test.js \
        package.json

if git diff --cached --quiet; then
  echo "    nothing to commit — T1 changes already in HEAD"
  exit 0
fi

echo "==> T1: files staged:"
git diff --cached --name-status

echo "==> T1: creating commit"

git commit -m "$(cat <<'EOF'
test: add scenario harness and failing E2E coverage for multi-runtime support

Establishes the test harness that every subsequent v2 task will drive its
implementation against, per the CASE "test harness first" rule. Five scenario
suites are scaffolded as RED tests that each go green when their corresponding
production task lands. Zero production code changes in this commit.

WHAT CHANGED

- __tests__/scenarios/fixtures/basic-logging/
    CJS (.js) and ESM (.mjs) entry+lib fixture pair that drives an identical
    log sequence (scribbles.log('user', userName) etc.) through every
    supported runtime, so any difference in observed output between scenarios
    is attributable to the runtime rather than to fixture variation.
- __tests__/scenarios/harness/spawn.cjs
    Single-seam child-process spawner that every scenario uses, plus a
    hasBinary('bun') probe so Bun-targeted suites skip gracefully on
    Node-only developer machines.
- __tests__/scenarios/{node-cjs,node-esm,bun-cjs,bun-esm,bun-test}.scenarios.test.js
    Five Jest-hosted scenario suites covering: Node-CJS drop-in, Node-ESM
    configured+unconfigured, Bun-CJS drop-in, Bun-ESM configured+unconfigured,
    and bun test under a bunfig.toml preload. Each asserts against the raw
    stdout/stderr of a real child process using .toContain() substring
    matches rather than byte-identical comparison, which keeps assertions
    robust to time/hash/instance-id noise without a normalizer.
- .github/workflows/ci.yml (new)
    Push/PR-gated matrix: Node 18, 20, 22 x Bun latest. Complements the
    existing publish.yml which only runs on release and on a single Node.
- package.json
    testPathIgnorePatterns extended so Jest's default *.[jt]s?(x) discovery
    skips the new __tests__/scenarios/fixtures/ and .../harness/ dirs.
    Note that Jest's default pattern matches `.js` — the fixture-dir ignore
    entry is therefore load-bearing: without it, Jest would try to run
    entry.js and lib.js as test files and fail with "no tests in file".
    The `.mjs` ESM fixtures and the `.cjs` harness module are outside
    Jest's default pattern and are skipped automatically.

WHY — KEY DESIGN DECISIONS

1. Entry-file / library-file split in every fixture.
   Scribbles' source-transform hook installs when `require('scribbles')`
   evaluates. That means the file doing the require is already being
   evaluated by Node and is therefore never itself transformed. This matches
   the project's architectural rule that "Scribbles initialises the source
   code analyser but cannot analyse the file that it is initialised from."
   Our fixtures model this the correct way: a thin entry that boots Scribbles
   and then hands off to a separate lib file where the scribbles.log()
   call sites live and CAN be transformed. Scenarios therefore exercise
   the pattern the library recommends to end users, not a test-only shortcut.

2. CJS fixtures use `.js` (not `.cjs`).
   An earlier iteration used `.cjs` to be "unambiguously CJS regardless of
   package.json type", but empirical Bun testing showed that Bun's CJS
   loader path for `.cjs` does NOT fire `Module._extensions['.cjs']` the
   way it fires `Module._extensions['.js']`, which silently skipped the
   source-transform hook for the Bun-CJS scenario. Since scribbles' own
   package.json does not declare `type: "module"`, `.js` is CJS by
   default in this repo and works consistently on Node-CJS and Bun-CJS.
   If scribbles ever opts into `type: "module"`, these fixtures will need
   to be revisited.

3. Substring assertions instead of normalized full-output comparison.
   The product's public contract is "the rendered log line includes
   `userName:alice`" — not any particular layout of timestamps, instance
   ids, or hostname. toContain() expresses that contract directly and
   requires no normalizer. If byte-identical comparison becomes necessary
   in future (e.g. for format regression tests), a normalize.cjs module
   can be added alongside spawn.cjs.

4. Scenario-level skip-on-missing-binary rather than a CI-only job split.
   hasBinary('bun') lets contributors without Bun installed still run the
   Node half of the suite locally. CI always has Bun via setup-bun, so
   nothing is silently skipped there.

5. Matrix = Node 18/20/22 + Bun latest.
   Covers the declared v2 runtime floor (CJS Node 8.5.0 stays supported
   via the unchanged CJS path — Node 18 is the lowest still-supported LTS
   that CI images reliably provide; ESM path will require Node 20.6+
   once T5 lands, which Node 20/22 covers).

EXPECTED STATE

- All 40+ existing __tests__/*.test.js continue to pass (regression contract).
- All five new scenario suites fail RED as per T1 design:
    * node-cjs + bun-cjs: loader not auto-installed on require('scribbles')
      (D11 bug — fixed by T3).
    * node-esm configured + bun-esm configured + bun-test: `scribbles/register`
      preload target doesn't exist yet (fixed by T5/T6).
    * node-esm unconfigured warn + bun-esm unconfigured warn: warning helper
      not implemented yet (fixed by T5/T6).

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T1: done. HEAD now:"
git log --oneline -1
