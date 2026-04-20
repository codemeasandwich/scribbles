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
 * Technical context
 * -----------------
 * - Imports Scribbles from `../../../../index.js`. That file is CJS today;
 *   Node and Bun both support default-importing CJS from ESM, which returns
 *   the `module.exports` object as the default export.
 * - Once T5 ships a real ESM entry at `dist/scribbles.mjs` and a
 *   `package.json` `exports` map, this path can be switched to the bare
 *   specifier `scribbles`. Until then, the relative path keeps T1 RED for the
 *   right reason (missing ESM entry) rather than a spurious resolver failure.
 * - A static `import` is used deliberately so that scenarios 3 and 5 ("ESM
 *   unconfigured") can demonstrate why `register()` called from user code is
 *   too late to transform statically-imported siblings: the module graph is
 *   parsed and linked before any evaluation runs.
 */

import scribbles from '../../../../index.js';

// Same sequence as the CJS variant. See lib.js for the per-call rationale.
export default function run() {
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
}
