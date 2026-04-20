/**
 * @file Legacy loader entry — backward-compat shim during the v2 refactor
 *
 * Domain context
 * --------------
 * Until v1.7.0 this file carried three responsibilities at once:
 *   1. the pure source transform (`processFileForScribblesCalls`);
 *   2. the argument-list parser (`loadArgNames` / `splitArgs`);
 *   3. the CJS-only side-effect of installing the `Module._extensions['.js']`
 *      hook via `node-hook`.
 *
 * T2 split (1) and (2) into dedicated pure modules. T3 (this revision) moves
 * the hook install into the unified `src/register/` adapter and removes the
 * `node-hook` dependency entirely — the ~25 LOC of install logic we actually
 * used is inlined in `src/register/hooks/cjs-extensions.js`. This file now
 * exists purely so that the test corpus (~12 suites that import
 * `_loadArgNames` / `_splitArgs` / `_processSource`) keeps working unchanged.
 * Scheduled for deletion in T12's dead-code sweep once those tests have
 * been migrated to import from the new module locations.
 *
 * Technical context
 * -----------------
 * - Delegates to `./transform` (the pure rewrite function) and `./args-parser`
 *   (the character-at-a-time state machine). No logic lives in this file.
 * - The hook install still happens on require (same observable behaviour as
 *   v1.x) but goes through `src/register/index.js` which coordinates with
 *   `index.js`'s auto-register and is idempotent across call sites.
 */

'use strict';

const register = require('../register');
const { transformSource } = require('./transform');
const { loadArgNames, splitArgs } = require('./args-parser');

// Preserve the side-effect that the pre-v2 loader had: merely requiring
// this file installs the transform hook. register() is idempotent, so if
// `index.js` (the package main) has already called register() this is a
// no-op; if a test requires the loader directly without first requiring
// scribbles, register() installs here instead.
register();

// Legacy aliases. Kept verbatim so the test suite compiled against the v1
// shape continues to work unmodified during T2. The underscore-prefixed
// naming (`_loadArgNames`, `_splitArgs`, `_processSource`) is the convention
// the pre-v2 codebase used for "exported for tests only" symbols.
module.exports = {
  _loadArgNames: loadArgNames,
  _splitArgs: splitArgs,
  _processSource: transformSource
};
