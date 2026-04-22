#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# T6 — Documentation (README runtime-support section, CHANGELOG,
# docs/runtime-setup.md) + register.status() / register.assert() scenario
# tests.
#
# The .status() / .assert() *implementation* landed in T5's rewrite of
# src/register/index.js — they could not be cleanly separated from the
# register.mjs warning plumbing because they share the same module-local
# detection helpers. This commit ships the scenario tests that pin their
# contract, plus the user-facing docs the MIGRATION.md file has been
# referencing throughout the v2 branch.
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

echo "==> T6: staging docs + introspection scenarios"

git add ReadMe.md \
        CHANGELOG.md \
        docs/runtime-setup.md \
        __tests__/scenarios/named-exports.scenarios.test.js

if git diff --cached --quiet; then
  echo "    nothing to commit — T6 changes already in HEAD"
  exit 0
fi

echo "==> T6: files staged:"
git diff --cached --name-status

echo "==> T6: creating commit"

git commit -m "$(cat <<'EOF'
docs: add Runtime support README section, CHANGELOG, docs/runtime-setup.md

Ships the user-facing documentation for the v2 multi-runtime story and
pins the `register.status()` / `register.assert()` contract with scenario
tests.

WHAT CHANGED

- ReadMe.md
    New "Runtime support" section inserted under "How to install". Covers
    the three supported configurations (Node CJS drop-in, Node ESM with
    `--import` preload, Bun with bunfig.toml preload) and includes a
    `bun add` line alongside the existing `npm install` / `yarn add`
    entries. Links back to MIGRATION.md for v1 users. Does NOT replace or
    reorganise any existing sections — strictly additive, so the rest of
    the README (which is the canonical reference for features, config,
    and examples) stays intact.
- CHANGELOG.md (new)
    Keep-a-Changelog-format entry for the v2.0.0 Unreleased section.
    Covers: Added (ESM support, Bun support, register, status/assert,
    exports map, preload entries, scenario harness, CI matrix, docs),
    Changed (main field, files array, auto-install behaviour), Fixed
    (D11), Removed (node-hook devDep), Internal (transform/args-parser
    split, loader.js shim status), and the pre-existing hijacker flake.
- docs/runtime-setup.md (new)
    Reference document for per-runtime setup that the ReadMe and
    MIGRATION.md both link to. Covers why the preload is needed under
    ESM, a per-runtime setup matrix, programmatic verification via
    register.status() / register.assert(), and a troubleshooting section
    for the most common "why aren't my logs showing variable names?"
    confusions.
- __tests__/scenarios/named-exports.scenarios.test.js
    Adds a second describe-block covering register.status() and
    register.assert(). Asserts:
      * status() returns an object with the documented keys.
      * status().cjsInstalled + transformActive are true when the CJS
        auto-install ran (which is the Jest-runner context).
      * status().runtime correctly classifies the current context as
        one of the node-cjs / bun-cjs values (Jest runs as node-cjs).
      * assert() does not throw when the transform is active.
      * register() is idempotent across multiple calls — losing that
        property would cause double-transform of every file load.

WHY — KEY DESIGN DECISIONS

1. Additive documentation rather than rewriting the existing ReadMe.
   The ReadMe is 1000+ lines and documents the v1 feature surface in
   detail — changing its structure risks breaking external links and
   forcing every reader through a refresh cycle. Inserting a focused
   "Runtime support" section alongside the existing "How to install"
   content gives v2 users what they need without disturbing v1 material.

2. docs/runtime-setup.md as a detail reference, not a replacement for the
   ReadMe section.
   The ReadMe carries the screenful-size setup overview; the docs file
   carries everything that would otherwise have bloated the ReadMe
   (troubleshooting, per-runtime matrix, programmatic verification,
   version-floor tables). One link from the ReadMe to the docs file
   preserves discoverability without cluttering the main document.

3. Scenario tests for status/assert live alongside the named-export
   tests.
   Both are about "the shape of the public API surface" rather than
   per-runtime behaviour, so they share a file. Per-runtime exercises
   (e.g. "status().esmPreloaded is true under --import") would logically
   extend the node-esm / bun-esm scenarios instead — a follow-up
   when the need arises.

EXPECTED TEST STATE AFTER THIS COMMIT

  All existing 40+ __tests__/*.test.js suites — pass
  All six scenario suites under __tests__/scenarios/ — pass
  __tests__/32-hijacker-http-request.test.js — pre-existing flaky failure.

Part of the v2.0.0 multi-runtime refactor.
EOF
)"

echo "==> T6: done. HEAD now:"
git log --oneline -1
