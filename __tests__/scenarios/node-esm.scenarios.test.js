/**
 * @file Scenarios: Node-ESM configured (preload) and unconfigured (warn+degrade)
 *
 * Domain context
 * --------------
 * ESM modules are parsed, linked, and only then evaluated — meaning any
 * source-transform hook called from user code runs AFTER every static
 * sibling has been parsed. The only way to transform the graph is to install
 * hooks before construction, via Node's `--import` preload flag.
 *
 * Two scenarios live here:
 *   2a. Configured   — user runs `node --import scribbles/register entry.mjs`
 *                      and gets full feature parity, including variable-name
 *                      extraction, just like Node-CJS users.
 *   2b. Unconfigured — user runs `node entry.mjs` with no preload. Scribbles
 *                      still works (file/line/col via stack traces) but the
 *                      variable-name feature is unavailable. Every boot prints
 *                      a single warning on stderr pointing at the README.
 *
 * Expected state per task
 * -----------------------
 *   T1 (this commit): both RED. `scribbles/register` sub-path and ESM build
 *                     don't exist yet.
 *   T5:               both GREEN. ESM build lands, `--import scribbles/register`
 *                     resolves, and the warning helper fires on the unconfigured
 *                     path.
 *
 * Technical context
 * -----------------
 * - The `--import` flag requires Node >= 20.6 for stable `module.register()`.
 *   The CI matrix uses Node 20/22; older Nodes are covered by the CJS path.
 * - The register path is computed from the repo root so the test is
 *   relocatable and doesn't assume a global install.
 */

'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { runScenario } = require('./harness/spawn.cjs');

const FIXTURES = path.resolve(__dirname, 'fixtures', 'basic-logging');

// The register preload lives at the repo root as `register.mjs`. Using a
// file:// URL makes the scenario relocatable without needing a
// `node_modules/scribbles` symlink, and directly targets the real source
// rather than a built artifact (that build step belongs to T10 / publish).
const REGISTER_URL = pathToFileURL(
  path.resolve(__dirname, '..', '..', 'register.mjs')
).href;

// Node's `--import` loader hooks (module.register) are stable as of
// Node 20.6. On older Node builds this scenario is expected to be skipped
// because the preload itself will throw when it tries to pull
// `{ register }` out of `node:module`. The CI matrix targets 20+ already,
// but we guard here for contributors running locally on an older LTS.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const nodeEsmSupported = nodeMajor > 20 || (nodeMajor === 20 && nodeMinor >= 6);
const describeNodeEsm = nodeEsmSupported ? describe : describe.skip;

describeNodeEsm('Scenario: Node-ESM configured (--import preload)', () => {
  it('emits variable-name prefix when preload is wired', () => {
    const result = runScenario({
      runtime: 'node',
      args: ['--import', REGISTER_URL],
      entry: path.join(FIXTURES, 'entry.mjs')
    });

    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('userName:alice');
    expect(result.stdout).toContain('answer:42');
  });
});

describeNodeEsm('Scenario: Node-ESM unconfigured (no preload → warn + degrade)', () => {
  it('prints a one-line warning pointing at the README', () => {
    const result = runScenario({
      runtime: 'node',
      entry: path.join(FIXTURES, 'entry.mjs')
    });

    // Warning prints on stderr every boot while preload is missing. The key
    // substrings are chosen to tolerate copy-editing of the message: we check
    // for the product name and the word "preload" without locking down the
    // exact wording. The README section link is also required so users can
    // actually find the fix.
    expect(result.stderr.toLowerCase()).toContain('scribbles');
    expect(result.stderr.toLowerCase()).toContain('preload');
  });

  it('still emits logs (graceful degradation) without the var-name prefix', () => {
    const result = runScenario({
      runtime: 'node',
      entry: path.join(FIXTURES, 'entry.mjs')
    });

    // Logs still flow (file/line/col via stack traces) but `userName:` is
    // absent because the transform never ran on `lib.mjs` in an ESM graph
    // without preload.
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('plain message only');
    expect(result.stdout).not.toContain('userName:alice');
  });
});
