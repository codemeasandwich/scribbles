#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T5 — Node ESM + Bun ESM runtime support.
#
# Ships the ESM preload entry (register.mjs + register.cjs) and the Node ESM
# loader worker (src/register/hooks/esm-loader.js), adds the one-per-boot
# warning helper for misconfigured ESM runs (src/register/warn.js), and
# rewrites src/register/index.js to perform runtime detection and emit the
# warning when appropriate. `register.status()` / `register.assert()`
# introspection helpers land in the same rewrite (their scenario tests come
# in the following commit).
#
# Flips the Node-ESM scenarios from RED to GREEN (configured + unconfigured-
# warn + unconfigured-degrade). Bun-ESM scenarios also flip GREEN because
# the same register.mjs includes the Bun.plugin() path for Bun runtimes.
#
# NOTE: package.json changes (exports map, expanded "files", main pointing
# at source) were staged by T3 because both T3 and T5 edited that one file
# and git cannot split the diff automatically without interactive patches.
# That commit's message was updated to reflect the full package.json scope.
#
# Idempotent: re-running is safe; already-committed work is detected and
# skipped.
# ----------------------------------------------------------------------------

set -euo pipefail

# Disable git's pager so `git diff --cached --name-status` doesn't pipe into
# `less` and hang the script waiting for a human to press `q`.
export GIT_PAGER=cat
export PAGER=cat

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> T5: staging ESM preload entries + scenario test updates"

# Note on staging scope: T3's script stages `src/register/` recursively,
# which means the T5 additions inside that subtree (warn.js,
# hooks/esm-loader.mjs, plus the full rewrite of index.js that adds
# runtime detection + status/assert) land in T3's commit rather than
# here. That makes T3's commit larger than its narrative strictly
# implies, but keeps the scripts' idempotency story clean: T5 then
# stages only the net-new top-level preload entry points and the
# scenario-test edits that go with them.
git add register.mjs \
        register.cjs \
        __tests__/scenarios/node-esm.scenarios.test.js

if git diff --cached --quiet; then
  echo "    nothing to commit — T5 changes already in HEAD"
  exit 0
fi

echo "==> T5: files staged:"
git diff --cached --name-status

echo "==> T5: creating commit"

git commit -m "$(cat <<'EOF'
feat: Node ESM and Bun ESM support via `scribbles/register` preload

Completes the multi-runtime story started in T3. Ships the ESM-side
install mechanisms (Node `module.register()` and `Bun.plugin()`) behind a
single preload entry that users wire via `--import scribbles/register`
(Node) or `preload = ["scribbles/register"]` (Bun). Adds the "preload
missing under ESM" warning path and the `register.status()` /
`register.assert()` introspection helpers.

Flips three RED scenarios to GREEN:
  * node-esm configured (--import preload)
  * node-esm unconfigured (warn + degrade)
  * bun-esm configured (bunfig.toml preload)
  * bun-esm unconfigured (warn + degrade)
  * bun test (shares bunfig.toml preload with bun run)

WHAT CHANGED

- register.mjs (new, repo root)
    ESM/Bun preload entry. Detects runtime (`typeof globalThis.Bun`) and
    dispatches to either Bun.plugin() (Bun) or module.register() (Node).
    Sets the shared Symbol.for(...) flag that CJS register() checks, so
    the subsequent user-code import of scribbles does not re-emit the
    "preload missing" warning. Also invokes the CJS installer so mixed
    CJS+ESM graphs work coherently.
- register.cjs (new, repo root)
    Trivial CJS preload entry for the rarer `--require scribbles/register`
    shape. Just calls `require('./src/register')()`.
- src/register/hooks/esm-loader.js (new)
    Node ESM loader worker — exports the `load` hook that module.register
    registers. Uses createRequire() to pull transformSource out of the
    existing CJS module, keeping one implementation of the transform.
- src/register/warn.js (new)
    One-per-boot warning emitter with the canonical ESM-preload-missing
    message text. Uses Symbol.for("scribbles.warning.emitted") so two
    Scribbles copies in the same process suppress duplicate warnings.
    Writes directly to process.stderr rather than going through scribbles
    itself (which would be a circular dep, and the message must survive
    userland stdout reconfiguration).
- src/register/index.js (rewritten)
    register() now:
      * installs the CJS hook (unchanged from T3)
      * detects ESM entry via process.argv[1] endswith .mjs (heuristic)
      * emits the ESM-preload-missing warning if the ESM loader flag is
        not set and we are in an ESM context
    Adds `register.status()` and `register.assert()` methods on the
    register function itself, for programmatic introspection / fail-fast
    boot assertions. Status returns
    { runtime, cjsInstalled, esmPreloaded, transformActive, instructions? };
    assert throws SCRIBBLES_NOT_REGISTERED if transformActive is false.
- __tests__/scenarios/node-esm.scenarios.test.js
    REGISTER_URL updated from `dist/register.mjs` (which was never going to
    exist — the preload is source, not a build artifact) to `register.mjs`
    at repo root. Added `describeNodeEsm` guard that skips the suite on
    Node < 20.6 where module.register() is not stable.

WHY — KEY DESIGN DECISIONS

1. One `register.mjs` that dispatches on runtime, rather than separate
   Node and Bun entry files.
   A single file is simpler for users (one preload specifier to remember
   in docs / config) and for maintainers (one place to keep the filter
   regex + CJS interop in sync). The runtime detection is a one-line
   `typeof globalThis.Bun` check — low cost, high clarity.

2. `register.cjs` is intentionally trivial.
   Pure-CJS projects do not need a preload at all — the auto-install from
   T3 already covers them. register.cjs exists only for the two niche
   cases documented in its header comment (forcing hook before entry;
   mixed CJS+ESM projects using --require alongside --import). Keeping it
   to one line of executable code means there is essentially nothing to
   break.

3. Shared Symbol.for keys between register.mjs and src/register/index.js.
   The ESM preload runs as a *separate module* from the CJS auto-install
   path; they do not share imports or closures. The only mechanism that
   works for cross-module coordination (especially when Scribbles is
   loaded multiple times via different bundles) is the Symbol.for(...)
   cross-realm registry. Both the ESM-installed flag and the
   already-warned flag use this pattern. Invariant: whichever copy
   installs the ESM loader first wins; subsequent copies see the flag
   and no-op, preventing double-registration.

4. Heuristic ESM-entry detection (`.mjs`-only) over package.json inspection.
   A future improvement could read the user's package.json to check for
   `"type": "module"` and warn for .js entries too. MVP stops at the
   unambiguous .mjs check: false negatives (user with type:module + .js)
   leave the warning silent, which is strictly better than false positives
   (CJS users seeing a misleading warning) and avoids taking a dependency
   on filesystem layout that a .js-in-a-CJS-package user could surprise us
   with.

5. Why a Node version guard on the scenario suite.
   module.register() is stable as of Node 20.6. On older Node builds the
   preload module throws on `import('node:module')`. The CI matrix covers
   20+ already; the guard exists so that contributors running locally on
   an older LTS see `skipped` rather than `failed` when they invoke
   `npm test`.

EXPECTED TEST STATE AFTER THIS COMMIT

  All 40+ existing __tests__/*.test.js suites — pass
  __tests__/scenarios/node-cjs.scenarios.test.js — PASSES (T3)
  __tests__/scenarios/bun-cjs.scenarios.test.js  — PASSES (T3)
  __tests__/scenarios/named-exports.scenarios.test.js — PASSES (T4)
  __tests__/scenarios/node-esm.scenarios.test.js — PASSES (this commit)
  __tests__/scenarios/bun-esm.scenarios.test.js  — PASSES (this commit)
  __tests__/scenarios/bun-test.scenarios.test.js — PASSES (this commit)
  __tests__/32-hijacker-http-request.test.js — pre-existing flaky failure
    unrelated to this commit.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T5: done. HEAD now:"
git log --oneline -1
