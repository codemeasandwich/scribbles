/**
 * @file Scenarios: Bun-ESM configured (bunfig.toml preload) and unconfigured
 *
 * Domain context
 * --------------
 * Bun's ESM has the same graph-before-evaluation ordering that Node's ESM has,
 * so a source-transform plugin has to register BEFORE user code parses. Bun's
 * mechanism for that is a `preload` entry in `bunfig.toml` pointing at a
 * module that calls `Bun.plugin(...)`.
 *
 *   5a. Configured   — `bunfig.toml` has `preload = ["scribbles/register"]`.
 *                      Full variable-name extraction works.
 *   5b. Unconfigured — no `bunfig.toml`. Scribbles emits the same warning as
 *                      the Node-ESM unconfigured path, and continues to log
 *                      without variable-name extraction (graceful degradation).
 *
 * Expected state per task
 * -----------------------
 *   T1: both RED. No register module, no warning helper yet.
 *   T6: both GREEN.
 *
 * Technical context
 * -----------------
 * - For the configured case, the test writes a temporary `bunfig.toml` into a
 *   scratch directory that symlinks `node_modules/scribbles` back to the repo
 *   root, so Bun's resolver finds `scribbles/register` via the package's
 *   `exports` map (added in T5). Pre-T5/T6 this setup fails at preload time,
 *   which is the correct RED.
 * - For the unconfigured case, no scratch setup is needed; we just run bun
 *   against the ESM entry from the fixture directory.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runScenario, hasBinary } = require('./harness/spawn.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.resolve(__dirname, 'fixtures', 'basic-logging');
const describeBun = hasBinary('bun') ? describe : describe.skip;

/**
 * Build a scratch workspace that contains:
 *   - a `node_modules/scribbles` symlink back to the repo, so the bare
 *     specifier `scribbles/register` resolves via the package's exports map
 *   - a `bunfig.toml` with the preload entry
 *   - a copy of the ESM entry + lib so bun runs from here
 *
 * Returns the scratch directory's absolute path. Caller is responsible for
 * cleanup via `fs.rmSync(dir, { recursive: true })` in an `afterAll`.
 */
function buildBunConfiguredWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribbles-bun-esm-'));
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.symlinkSync(REPO_ROOT, path.join(dir, 'node_modules', 'scribbles'), 'dir');

  // bunfig.toml — minimal preload entry. Bun resolves the specifier against
  // node_modules (→ repo root → package.json exports map, added by T5).
  fs.writeFileSync(
    path.join(dir, 'bunfig.toml'),
    'preload = ["scribbles/register"]\n'
  );

  // Copy the fixture ESM files, rewriting their scribbles import from the
  // four-dot relative path to the bare specifier so the exports map is
  // exercised. Pre-T5, the bare specifier won't resolve cleanly — that's the
  // expected RED for this path.
  const entrySrc = fs.readFileSync(path.join(FIXTURES, 'entry.mjs'), 'utf8')
    .replace("'../../../../index.js'", "'scribbles'");
  const libSrc = fs.readFileSync(path.join(FIXTURES, 'lib.mjs'), 'utf8')
    .replace("'../../../../index.js'", "'scribbles'");
  fs.writeFileSync(path.join(dir, 'entry.mjs'), entrySrc);
  fs.writeFileSync(path.join(dir, 'lib.mjs'), libSrc);

  return dir;
}

describeBun('Scenario: Bun-ESM configured (bunfig.toml preload)', () => {
  let workspace;
  beforeAll(() => { workspace = buildBunConfiguredWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('emits variable-name prefix when preload is wired', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(workspace, 'entry.mjs'),
      cwd: workspace
    });

    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('userName:alice');
    expect(result.stdout).toContain('answer:42');
  });
});

describeBun('Scenario: Bun-ESM unconfigured (no bunfig.toml → warn + degrade)', () => {
  it('prints a one-line warning pointing at the README', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(FIXTURES, 'entry.mjs')
    });

    expect(result.stderr.toLowerCase()).toContain('scribbles');
    expect(result.stderr.toLowerCase()).toContain('preload');
  });

  it('still emits logs without the var-name prefix', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(FIXTURES, 'entry.mjs')
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('plain message only');
    expect(result.stdout).not.toContain('userName:alice');
  });
});
