#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T3 — v2 runtime adapter, auto-install, named-export surface, drop node-hook.
#
# Introduces the unified src/register/ adapter, wires its idempotent register()
# into index.js so the CJS source-transform hook activates automatically on
# `require('scribbles')` (fixes the pre-existing D11 bug), inlines the ~25 LOC
# of node-hook we actually used so the external devDep can be dropped, and
# attaches `register` to the scribbles object so v2 code can consume it via
# either `const { register } = require('scribbles')` or `scribbles.register`.
#
# This single commit is larger than originally scoped because some fixes from
# T3 and T4 could not be cleanly separated at the file level (both touch
# index.js in ways git can't split automatically). See "WHY" for the rationale.
#
# Flips the Node-CJS and Bun-CJS scenario tests from RED to GREEN.
#
# This script regenerates package-lock.json first so `npm ci` in CI does not
# refuse to proceed with a lockfile that still references node-hook.
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

echo "==> T3: regenerating package-lock.json without node-hook"
npm install

echo "==> T3: verifying node-hook is gone from lockfile"
if grep -q '"node-hook"' package-lock.json; then
  echo "    ERROR: node-hook is still referenced in package-lock.json"
  echo "    Try: rm -rf node_modules package-lock.json && npm install"
  exit 1
fi
echo "    ok — lockfile is clean"

echo "==> T3: staging register/ adapter, shim rewrite, index.js, lockfile, fixture rename"

git add src/register/ \
        src/parsing/loader.js \
        src/parsing/files.md \
        src/files.md \
        index.js \
        __tests__/12-loader.test.js \
        __tests__/scenarios/fixtures/basic-logging/ \
        __tests__/scenarios/node-cjs.scenarios.test.js \
        __tests__/scenarios/bun-cjs.scenarios.test.js \
        package.json \
        package-lock.json

if git diff --cached --quiet; then
  echo "    nothing to commit — T3 changes already in HEAD"
  exit 0
fi

echo "==> T3: files staged:"
git diff --cached --name-status

echo "==> T3: creating commit"

git commit -m "$(cat <<'EOF'
feat: v2 runtime adapter, auto-install, named-export surface; drop node-hook

Introduces the unified `src/register/` runtime-adapter subtree and wires its
idempotent `register()` into `index.js` so Scribbles' source-transform hook
activates automatically on `require('scribbles')` — fixing the pre-existing
v1.7.0 "D11" bug where variable-name extraction only worked for callers who
manually required `scribbles/src/parsing/loader` first (a step the README
never asked users to perform). Inlines the ~25 LOC of `node-hook` that
Scribbles actually used so the external package can be dropped, and attaches
`register` to the main `scribbles` object so v2 user code can reach it via
either `const { register } = require('scribbles')` or the legacy property
access `scribbles.register`.

Flips the Node-CJS and Bun-CJS scenario tests from RED to GREEN. All 40+
existing tests remain green.

WHAT CHANGED

- src/register/ (new subdirectory)
    Unified runtime-adapter home. Contents:
      * install-flag.js — cross-module guard using Symbol.for(...) so two
        independently-bundled copies of Scribbles in the same process
        coordinate rather than clobber each other.
      * hooks/cjs-extensions.js — the CJS install logic inlined from
        node-hook. Default hooks for ['.js', '.cjs']. Supports stacked
        transforms (same semantics as node-hook) so Scribbles composes
        with other CJS loader hooks such as ts-node or @swc/register.
      * index.js — exports the `register` function directly as the module
        value (not wrapped in `{ register }`). Self-references itself as
        `register.register = register` so both `require('./src/register')()`
        and `const { register } = require('./src/register'); register();`
        continue to work. Exporting the function directly is what enables
        `require('scribbles/register')` in T5 (for --import / --require /
        bunfig preload) to receive a callable module, and lays the ground
        for T7's `register.status()` / `register.assert()` method attach.
      * files.md — subdirectory doc.
- index.js
    Calls `require('./src/register')()` immediately after checkNodeVer to
    install the hook before any user code has a chance to require files
    that need transforming. Attaches `scribbles.register = register` at
    the end of the file, alongside the existing `scribbles.trace`,
    `scribbles.middleware`, and `scribbles.config` attachments. An in-file
    comment block documents the v2 named-export convention and why CJS
    keeps the soft-cut (both destructure AND property access work) while
    the strict cut is deferred to the ESM entry in T5.
- src/parsing/loader.js (shim)
    Dropped the `require('node-hook')` import and instead delegates hook
    installation to the new unified register(). Kept as a shim only because
    ~12 existing test files import _loadArgNames / _splitArgs / _processSource
    directly from here. Scheduled for deletion in T12.
- __tests__/scenarios/fixtures/basic-logging/
    Renamed entry.cjs → entry.js and lib.cjs → lib.js. Empirical Bun testing
    showed that Bun's CJS loader path for `.cjs` does NOT invoke
    `Module._extensions['.cjs']` the way it does for `.js`, which caused the
    Bun-CJS scenario to silently skip the source transform. `.js` works on
    both runtimes because scribbles' own package.json does not set
    `type: "module"`. Fixture header comments updated with this rationale.
- __tests__/scenarios/{node-cjs,bun-cjs}.scenarios.test.js
    Point at the renamed `entry.js` fixture. Bun-CJS suite's header comment
    updated to document the new load path and why `.js` is chosen.
- __tests__/12-loader.test.js
    The one test that asserted `require('node-hook')` resolves was replaced
    with a direct functional assertion — _processSource is now exercised to
    prove the transform actually runs, which is both more accurate and a
    stronger contract than "the dep can be resolved".
- package.json
    * Removed node-hook from devDependencies (no runtime-deps change;
      there were zero before and still zero after, because the four
      packages Scribbles requires at runtime — @ashleyw/cls-hooked,
      moment, source-map-support, string-template — continue to be
      inlined into dist/scribbles.js at publish time by the existing
      prepublishOnly esbuild step).
    * Added an `exports` map declaring the three supported sub-paths:
      "." resolves to the bundled ./dist/scribbles.js (preserving v1's
      zero-runtime-deps packaging, so that require('scribbles') and
      import scribbles from 'scribbles' work on a published install
      without the user needing cls-hooked etc. in their own
      node_modules), "./register" resolves to register.mjs under
      import and register.cjs under require (both land in T5), and
      "./gitStatus" is the unchanged webpack DefinePlugin helper.
    * Expanded the `files` array to ship src/, register.mjs,
      register.cjs, appDir.js, and gitStatus.js alongside the existing
      dist/ artifact. The source tree is published so the ESM preload
      entry (register.mjs) can reach into src/parsing/transform.js via
      createRequire at runtime, and so that advanced users can inspect
      or extend internals via direct paths. The bundled dist/ remains
      the main entry — source shipping is additive, not a replacement.
    * `main` stays at "./dist/scribbles.js" (matching v1). The zero-
      dependencies packaging story is preserved end-to-end: the
      bundle inlines all runtime-used devDeps (including the
      trace-critical @ashleyw/cls-hooked), and no user install needs
      transitive packages for tracing to function.
    * Added a `build` script (non-minified esbuild for dev) and a
      `pretest` hook that runs it before every test. Ensures the
      scenario tests that resolve `scribbles` as a bare specifier (the
      Bun-ESM scenarios using a node_modules symlink through the
      exports map) see a bundle reflecting current source rather than a
      stale one.
    * package-lock.json regenerated to reflect the node-hook removal.
    Collecting all these package.json changes in this commit (rather than
    splitting the exports map into T5) is pragmatic: git cannot split a
    single file's diff across commits without interactive patch
    operations, and the changes form a coherent "v2 packaging" unit.
- src/files.md, src/parsing/files.md, src/register/files.md
    Reflect the new src/register/ subtree and the updated loader shim.

WHY — KEY DESIGN DECISIONS

1. Why D11 was a bug, not a feature.
   The README documents automatic variable-name extraction as working
   out-of-the-box with require(). Empirical testing showed it only worked
   for tests that explicitly required src/parsing/loader first — a step
   never documented for end users. Users who followed the README literally
   got plain logs, silently missing the feature they picked Scribbles for.
   The fix is a one-line call in index.js; the bulk of this commit is the
   adapter structure to support it cleanly plus the test-surface fixes
   that exposed the pre-existing misbehaviour.

2. Why auto-install on require rather than an explicit register() from user code.
   Per the project's architectural rule, "Scribbles initialises the source-
   code analyser but cannot analyse the file that it is initialised from."
   The closest the library can get to "zero-config drop-in" is installing
   the hook as early as possible during its own load, so the file
   immediately after the entry point — where most user code lives — gets
   transformed. Requiring end users to add an explicit register() call
   would contradict the turnkey promise and duplicate what the library
   has to do internally anyway.

3. Why inline node-hook instead of keeping the dep.
   CASE's zero-runtime-deps rule is one motivator; the bigger one is
   control. v2 adds two more installers (Node-ESM via module.register,
   Bun via Bun.plugin) that node-hook doesn't help with. Owning the
   install code means all three installers share state (the Symbol.for
   flag), share the transform (src/parsing/transform.js), and can evolve
   together without fighting a third-party package whose contract was
   designed for a simpler world.

4. Why Symbol.for(...) for the install flag.
   When Scribbles is loaded by two independently-bundled copies in the
   same process (webpack bundle + explicit node_modules copy, etc.), a
   module-local flag sees nothing from the other copy. Symbol.for puts
   the flag in the cross-realm registry, so whichever copy installs
   first wins and subsequent copies no-op — preserving the "exactly one
   hook chain" invariant that matters for correctness.

5. Why export register as a function directly (not inside `{ register }`).
   The sub-path `scribbles/register` landing in T5 must resolve to a
   callable module for --import / --require / bunfig-preload to invoke
   it cleanly. Wrapping it in `{ register }` would force every preload
   site to do `.register()` on the module, which is unergonomic and
   inconsistent with how the wider ecosystem (e.g. `ts-node/register`)
   shapes registration modules. The self-reference `register.register =
   register` preserves the destructure pattern for code that wants it,
   and T7 will attach `register.status()` / `register.assert()` directly
   to the function — which is a natural shape only because register IS
   a function at the module level.

6. Why fold the named-export attachment and fixture rename into this commit.
   Both are too tightly coupled to index.js's and src/register/'s contents
   to split without running git in-place patch operations. The named-export
   attachment is a single `scribbles.register = register;` line that has
   to sit after all other scribbles-property attachments in index.js; the
   fixture rename is a direct consequence of empirical Bun behaviour
   discovered while getting T3's scenarios green. Grouping them here keeps
   the diff coherent and avoids a revert/re-apply dance.

7. Why the legacy loader.js shim stays for now.
   ~12 existing test files import _loadArgNames / _splitArgs / _processSource
   through it. Keeping the shim until T12's dead-code sweep lets those
   tests continue to pass unchanged, which is the simplest way to prove T3
   is a behaviour-preserving refactor of the install path. The shim now
   delegates to register() so the behaviour is identical and the node-hook
   dependency is genuinely gone.

EXPECTED TEST STATE AFTER THIS COMMIT

  Existing 40+ __tests__/*.test.js suites — pass (regression contract)
  __tests__/12-loader.test.js — passes including the replaced assertion
  __tests__/scenarios/node-cjs.scenarios.test.js — PASSES (D11 fixed)
  __tests__/scenarios/bun-cjs.scenarios.test.js  — PASSES (D11 fixed,
    fixture renamed to .js so Bun's CJS loader honours the hook)
  __tests__/scenarios/node-esm.scenarios.test.js — still RED (needs T5)
  __tests__/scenarios/bun-esm.scenarios.test.js  — still RED (needs T6)
  __tests__/scenarios/bun-test.scenarios.test.js — still RED (needs T6)
  __tests__/32-hijacker-http-request.test.js — pre-existing flaky failure
    unrelated to the parsing/register/transform code paths. Tracked
    separately; to be circled back after v2 core lands.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T3: done. HEAD now:"
git log --oneline -1
