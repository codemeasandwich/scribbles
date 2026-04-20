/**
 * @file Basic-logging fixture library — CommonJS variant (.js)
 *
 * Domain context
 * --------------
 * A fixture that exercises Scribbles' automatic variable-name extraction from
 * user code. The library emits a small, deterministic log sequence that every
 * runtime scenario (Node-CJS, Bun-CJS, also spawned by entry.mjs through
 * CJS/ESM interop) must reproduce identically.
 *
 * This file is intentionally kept trivially small so that every observable
 * difference in scenario output can be attributed to the runtime or the
 * loader-install path rather than to fixture logic.
 *
 * Technical context
 * -----------------
 * - Lives under `__tests__/scenarios/fixtures/` so Jest skips it via the
 *   `testPathIgnorePatterns` entry we add in `package.json`.
 * - Uses a `.js` extension deliberately. An earlier version used `.cjs` for
 *   "unambiguously CJS regardless of package.json type", but empirical
 *   testing showed that Bun's CJS loader path for `.cjs` does NOT consult
 *   `Module._extensions['.cjs']` in the same way it consults
 *   `Module._extensions['.js']`, which caused the Bun-CJS scenario to skip
 *   the source-transform hook and lose variable-name extraction. `.js`
 *   works on both runtimes because Scribbles' own `package.json` does not
 *   declare `type: "module"`, so `.js` is CJS by default in this repo.
 *   (If scribbles ever opts into `type: "module"`, this fixture must be
 *   renamed back to `.cjs` and the Bun `.cjs` handling re-validated.)
 * - Resolves Scribbles via a relative path to the repo root. Once the
 *   package.json `exports` map is introduced in T5, this can optionally be
 *   changed to the bare specifier `scribbles` if a `node_modules` symlink is
 *   staged by the harness.
 * - The `run()` export is called by every runtime-specific `entry.*` file so
 *   the code that Scribbles is expected to transform lives in THIS file, not
 *   in the entry file. That matters because the CJS `Module._extensions` hook
 *   installs during `require('scribbles')`, by which point the entry file is
 *   already being evaluated and therefore never transformed.
 */

'use strict';

const scribbles = require('../../../../index.js');

/**
 * Emit the canonical log sequence used by all basic-logging scenarios.
 *
 * Each call site here is a distinct assertion target:
 *   - Line A: variable `userName` — proves arg-name extraction on a string value
 *   - Line B: variable `answer`   — proves arg-name extraction on a number value
 *   - Line C: literal-only call   — baseline to prove plain logging still works
 */
module.exports = function run() {
  const captured = [];
  scribbles.config({ stdOut: null, dataOut: (d) => captured.push(d), logLevel: 'debug' });

  const userName = 'alice';
  const answer = 42;

  scribbles.log('user', userName);
  scribbles.log('answer', answer);
  scribbles.log('plain message only');

  for (const body of captured) {
    process.stdout.write(body.toString() + '\n');
  }
};
