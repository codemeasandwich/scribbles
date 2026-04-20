/**
 * @file Scenario: Node-CJS drop-in (should Just Work with zero setup)
 *
 * Domain context
 * --------------
 * The turnkey promise is that a Node-CJS user who does `npm i scribbles` and
 * writes `const scribbles = require('scribbles')` gets automatic variable-name
 * extraction without any configuration, flags, or preload.
 *
 * This scenario spawns a real Node child process against the `basic-logging`
 * fixture and asserts that `scribbles.log('user', userName)` renders as
 * `user userName:alice` (not `user alice`). That only happens when the
 * CJS source-transform hook was installed before `lib.js` was required.
 *
 * Expected state per task
 * -----------------------
 *   T1 (this commit): RED. `index.js` does not install the loader on import
 *                     (pre-existing v1.7.0 bug, tracked as D11). Output shows
 *                     `user alice`, assertion fails.
 *   T3:               GREEN. `index.js` calls `register()` which installs the
 *                     `Module._extensions['.js']` hook for subsequent requires.
 *
 * Technical context
 * -----------------
 * - Spawns `node entry.js` with no flags. This is the bare drop-in case.
 * - Uses the shared `spawn.cjs` harness so if the invocation shape ever needs
 *   to change (e.g. NODE_OPTIONS propagation) it's a single point of change.
 */

'use strict';

const path = require('path');
const { runScenario } = require('./harness/spawn.cjs');

// Resolve the fixture directory once at module load. Using `path.resolve` keeps
// the test location-independent (works from any cwd Jest picks).
const FIXTURES = path.resolve(__dirname, 'fixtures', 'basic-logging');

describe('Scenario: Node-CJS (drop-in, no preload)', () => {
  it('emits variable-name prefix for `scribbles.log("user", userName)`', () => {
    const result = runScenario({
      runtime: 'node',
      entry: path.join(FIXTURES, 'entry.js')
    });

    // First, fail loudly with diagnostic stderr if the child crashed so a
    // future regression shows up as a readable error rather than a bare
    // "expected true, got false".
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);

    // The load order is: entry.js requires scribbles (installs hook), then
    // requires lib.js (transformed), which calls scribbles.log('user', userName).
    // After T3, the rendered string contains `userName:alice`.
    expect(result.stdout).toContain('userName:alice');
    expect(result.stdout).toContain('answer:42');

    // The literal-only call should always appear, regardless of transform —
    // this is the baseline that proves the fixture ran at all.
    expect(result.stdout).toContain('plain message only');
  });
});
