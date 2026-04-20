/**
 * @file CJS entry point for the basic-logging scenario (.js)
 *
 * Domain context
 * --------------
 * This file is what the harness `spawn()`s directly. It represents the
 * developer's "index / start-up" file — the one that boots the app. Importantly
 * it requires Scribbles FIRST, and only then requires the library that
 * contains the `scribbles.log(...)` calls.
 *
 * That ordering matters because the CJS source-transform hook is installed by
 * `require('scribbles')` itself (D11 fix landed in T3). Any file required
 * AFTER that point is transformed; any file required BEFORE is not. The
 * entry file itself is never transformed because Node is already evaluating
 * it by the time the hook can install.
 *
 * This is a fundamental property of the library, documented in its
 * architecture notes: "Scribbles initialises the source-code analyser but
 * cannot analyse the file that it is initialised from." The recommended user
 * pattern is therefore exactly what this fixture models: a thin entry file
 * that boots Scribbles, then loads the real application code from a separate
 * module where the transform CAN fire.
 *
 * Technical context
 * -----------------
 * - `.js` (not `.cjs`) extension deliberately. See `lib.js`'s header comment
 *   for the empirical reason — Bun's CJS path for `.cjs` does not invoke
 *   Module._extensions the same way it does for `.js`, so using `.js` here
 *   keeps the scenario consistent across Node-CJS and Bun-CJS runtimes.
 * - No test assertions here — the test file asserts on this process's stdout.
 */

'use strict';

require('../../../../index.js');    // installs the CJS transform hook (T3)
const run = require('./lib.js');    // loaded AFTER scribbles → eligible for transform

run();
