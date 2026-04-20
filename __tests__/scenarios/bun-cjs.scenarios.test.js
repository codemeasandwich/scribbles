/**
 * @file Scenario: Bun-CJS drop-in (mirrors Node-CJS)
 *
 * Domain context
 * --------------
 * Bun implements `Module._extensions` with the same semantics as Node, so the
 * CJS source-transform hook works on Bun without any Bun-specific code. This
 * scenario exists to prove that empirically and to prevent regression if Bun
 * ever changes its CJS compatibility surface.
 *
 * Expected state per task
 * -----------------------
 *   T1: RED for the same reason as Node-CJS (hook not auto-installed).
 *   T3: GREEN. Same `register()` → `Module._extensions` install path the
 *       Node-CJS scenario exercises — Bun runs that code unchanged.
 *
 * Technical context
 * -----------------
 * - Skips gracefully on environments without Bun so contributors on Node-only
 *   setups can still run the suite locally.
 * - Invokes `bun entry.js` with no flags. In this repo's package.json (no
 *   `type: "module"` set), `.js` files are CJS by default, so the bare
 *   `bun entry.js` invocation runs through Bun's CJS loader path — which
 *   honours `Module._extensions['.js']` faithfully enough that the hook
 *   we install there fires for any subsequent `require('./lib.js')`.
 */

'use strict';

const path = require('path');
const { runScenario, hasBinary } = require('./harness/spawn.cjs');

const FIXTURES = path.resolve(__dirname, 'fixtures', 'basic-logging');
const describeBun = hasBinary('bun') ? describe : describe.skip;

describeBun('Scenario: Bun-CJS (drop-in, no preload)', () => {
  it('emits variable-name prefix for `scribbles.log("user", userName)`', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(FIXTURES, 'entry.js')
    });

    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('userName:alice');
    expect(result.stdout).toContain('answer:42');
    expect(result.stdout).toContain('plain message only');
  });
});
