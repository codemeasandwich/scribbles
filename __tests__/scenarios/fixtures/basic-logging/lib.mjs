/**
 * @file Basic-logging fixture library — ES-module variant
 *
 * Domain context
 * --------------
 * ESM counterpart to `lib.js`. Scenario tests for Node-ESM, Bun-ESM, and
 * `bun test` all import this file to drive the same log sequence through
 * Scribbles' public API. Keeping the CJS and ESM variants byte-for-byte
 * similar (modulo module-system syntax) is deliberate: any difference in
 * scenario output between the CJS and ESM paths must then come from the
 * runtime or the loader-install mechanism, not from the fixture itself.
 *
 * v2.0.0 hard-cut exercise
 * ------------------------
 * This fixture deliberately follows the v2.0.0 ESM API shape documented
 * in the README and MIGRATION guide:
 *
 *   - `scribbles` (default import) is log-levels only. Calling
 *     `scribbles.config(...)` in ESM MUST be `undefined` under v2;
 *     the assertion below pins that contract so any regression to the
 *     pre-hard-cut behaviour is caught in every ESM scenario.
 *   - `config` is a named import — the only way to reach configuration
 *     in an ESM context. This mirrors the exact snippet shown to users
 *     in the README's Runtime Support section.
 *
 * Technical context
 * -----------------
 * - Imports from `../../../../index.mjs` so the package.json `exports`
 *   map's `import` condition is exercised end-to-end. The Bun scenarios
 *   rewrite this relative specifier to the bare `scribbles` specifier
 *   when running inside their scratch workspace (to drive the exports
 *   map via the resolver), and the Node-ESM scenario resolves the
 *   relative path directly against the repo.
 * - A static `import` is used deliberately so that scenarios 3 and 5
 *   ("ESM unconfigured") can demonstrate why `register()` called from
 *   user code is too late to transform statically-imported siblings:
 *   the module graph is parsed and linked before any evaluation runs.
 * - The assertion on `scribbles.config === undefined` runs at module
 *   evaluation time, not inside `run()`, so even if a test harness
 *   somehow suppresses the run-time output the assertion still trips
 *   the spawn's exit code when the hard cut regresses.
 */

import scribbles, { config } from '../../../../index.mjs';

// v2.0.0 hard-cut contract: the ESM default export must NOT carry
// infrastructure. If this ever starts passing truthily, the Proxy in
// index.mjs (or its `INFRA` hide-set) has regressed and every ESM
// scenario's spawn will exit non-zero with a clear message.
if (typeof scribbles.config !== 'undefined') {
  throw new Error(
    'scribbles v2 ESM hard-cut regression: `scribbles.config` should ' +
    'be undefined on the default export but was ' + typeof scribbles.config
  );
}
if (typeof config !== 'function') {
  throw new Error(
    'scribbles v2 ESM named-export regression: `config` named import ' +
    'should be a function but was ' + typeof config
  );
}

// Same sequence as the CJS variant. See lib.js for the per-call rationale.
export default function run() {
  const captured = [];
  config({ stdOut: null, dataOut: (d) => captured.push(d), logLevel: 'debug' });

  const userName = 'alice';
  const answer = 42;

  scribbles.log('user', userName);
  scribbles.log('answer', answer);
  scribbles.log('plain message only');

  for (const body of captured) {
    process.stdout.write(body.toString() + '\n');
  }
}
