/**
 * @file CJS preload entry point for Scribbles
 *
 * Domain context
 * --------------
 * Counterpart to `register.mjs`. Gets invoked when a user pre-loads
 * Scribbles into a CJS process via `node --require scribbles/register
 * app.js` or similar. Its sole job is to install the CJS source-transform
 * hook (`Module._extensions['.js']`, `.cjs`) before any user `require()`
 * calls happen.
 *
 * For pure-CJS projects this file is rarely needed in practice because
 * `require('scribbles')` in index.js already calls `register()` during
 * its own top-level evaluation (the D11 bug fix in T3), which installs
 * the same hook. This file exists for the two cases where the automatic
 * install is not enough:
 *
 *   1. The user wants to guarantee the hook is up BEFORE their own entry
 *      file is loaded, so that even the entry file itself — which is
 *      evaluated before `require('scribbles')` in it — gets transformed.
 *      `node --require scribbles/register app.js` achieves that.
 *   2. Mixed CJS + ESM bootstraps where the CJS side is loaded via
 *      --require and the ESM side via --import.
 *
 * Technical context
 * -----------------
 * - Kept intentionally trivial: one require, one call. No flags, no env
 *   reads. This is the smallest file in the package and is what gets
 *   executed on every --require scribbles/register boot.
 * - `require('./src/register')` returns the register function directly
 *   (see `src/register/index.js`'s tail for rationale). Invoking it
 *   installs the hook + runs the ESM-preload-missing warn path if the
 *   entry file looks like ESM.
 */

'use strict';

require('./src/register')();
