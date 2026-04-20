/**
 * @file Scenario: `bun test` with scribbles preload
 *
 * Domain context
 * --------------
 * Users who adopt Scribbles in their Bun-native test suites must get the
 * same variable-name-extraction feature as production runtime code.
 *
 * Crucially, Bun treats `bun test` as its own execution context with
 * its own preload configuration. The top-level `preload = [...]` in
 * `bunfig.toml` applies to `bun run`, `bun <file>`, and the default
 * CLI — but NOT to `bun test`, which reads preloads from a separate
 * `[test]` section. A user who configures only the top-level preload
 * sees variable-name extraction in `bun run` but loses it the moment
 * they switch to `bun test`. This scenario locks in that BOTH preload
 * sections are set and BOTH activate our transform.
 *
 * The canonical user-facing snippet (also shown in the README) is
 * therefore:
 *
 *     preload = ["scribbles/register"]
 *
 *     [test]
 *     preload = ["scribbles/register"]
 *
 * Technical context
 * -----------------
 * - A scratch workspace (like bun-esm-configured) is built on the fly
 *   with a `node_modules/scribbles` symlink, `bunfig.toml` including
 *   both preload sections, and a single test file that exercises the
 *   fixture. The test file is deliberately tiny — it imports the
 *   fixture lib and asserts on its rendered output captured via
 *   Scribbles' `dataOut` hook.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runScenario, hasBinary } = require('./harness/spawn.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.resolve(__dirname, 'fixtures', 'basic-logging');
const describeBun = hasBinary('bun') ? describe : describe.skip;

function buildBunTestWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribbles-bun-test-'));
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.symlinkSync(REPO_ROOT, path.join(dir, 'node_modules', 'scribbles'), 'dir');

  // `bun test` uses the `[test]` section's preload; top-level preload is
  // for `bun run` / `bun <file>`. A full bunfig for a project using both
  // sets both. We set both here so the scenario exercises the exact
  // user-facing snippet from the README.
  fs.writeFileSync(
    path.join(dir, 'bunfig.toml'),
    'preload = ["scribbles/register"]\n' +
    '\n' +
    '[test]\n' +
    'preload = ["scribbles/register"]\n'
  );

  // Copy the ESM lib — the test file below imports it.
  const libSrc = fs.readFileSync(path.join(FIXTURES, 'lib.mjs'), 'utf8')
    .replace("'../../../../index.js'", "'scribbles'");
  fs.writeFileSync(path.join(dir, 'lib.mjs'), libSrc);

  // Minimal `bun:test` file. Calls the fixture, captures stdout via a write
  // spy, and asserts the variable-name prefix is present. Kept inline rather
  // than extracted so the scenario stays hermetic and easy to reason about.
  fs.writeFileSync(path.join(dir, 'scenario.test.js'), `
import { test, expect } from 'bun:test';
import run from './lib.mjs';

test('scribbles under bun test emits variable-name prefix', () => {
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (b) => { chunks.push(String(b)); return true; };
  try { run(); } finally { process.stdout.write = orig; }
  const joined = chunks.join('');
  expect(joined).toContain('userName:alice');
  expect(joined).toContain('answer:42');
});
`);

  return dir;
}

describeBun('Scenario: bun test (preload via bunfig.toml)', () => {
  let workspace;
  beforeAll(() => { workspace = buildBunTestWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('variable-name extraction works inside a bun:test suite', () => {
    const result = runScenario({
      runtime: 'bun',
      args: ['test'],
      entry: 'scenario.test.js',
      cwd: workspace
    });

    // A successful `bun test` exits 0 and prints "1 pass" in its summary.
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout + result.stderr).toMatch(/\b1 pass\b/i);
  });
});
