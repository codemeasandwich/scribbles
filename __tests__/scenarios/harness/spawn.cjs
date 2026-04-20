/**
 * @file Scenario spawner — runs a runtime as a child process and captures output
 *
 * Domain context
 * --------------
 * Per CASE, scenario tests must exercise Scribbles through its public surface
 * as a user would. That means running real Node / Bun processes against real
 * fixture files, never requiring Scribbles inside Jest's own process. This
 * module is the single seam through which every scenario does that.
 *
 * It exists so the spawn plumbing (which binary, which args, which env) lives
 * in one place, and so scenario `.test.js` files stay short, readable, and
 * focused on "arrange fixture → spawn → assert output".
 *
 * Technical context
 * -----------------
 * - Uses the synchronous `spawnSync` API. Jest's `it()` bodies are synchronous
 *   by default and scenario tests here only need the final stdout/stderr, so
 *   async streaming adds no value.
 * - Each spawn gets a cwd of the fixture directory. That keeps relative paths
 *   in fixtures predictable and, crucially, makes `bunfig.toml` discovery
 *   work for Bun scenarios — Bun looks for `bunfig.toml` starting from cwd.
 * - The `.cjs` extension here (and on `normalize.cjs`) means Jest's default
 *   `testMatch` (`*.[jt]s?(x)`) skips this file during test discovery without
 *   any `testPathIgnorePatterns` entry needed — an intentional hygiene choice.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

/**
 * Run a target runtime against a fixture entry file, return captured output.
 *
 * @param {object} opts
 * @param {'node'|'bun'} opts.runtime             - Binary to invoke.
 * @param {string}        opts.entry              - Absolute or cwd-relative entry file.
 * @param {string[]}      [opts.args=[]]          - Extra runtime args (e.g. ['--import', ...]).
 * @param {string}        [opts.cwd]              - Working directory. Defaults to entry's dir.
 * @param {Object<string,string>} [opts.env]      - Extra env vars merged over process.env.
 * @param {number}        [opts.timeoutMs=20000]  - Child timeout; prevents hung tests.
 * @returns {{stdout: string, stderr: string, status: number, timedOut: boolean}}
 */
function runScenario(opts) {
  const {
    runtime,
    entry,
    args = [],
    cwd = path.dirname(entry),
    env = {},
    timeoutMs = 20000
  } = opts;

  // Compose full argv: runtime-specific args come BEFORE the entry, matching
  // how users type these commands (e.g. `node --import ... entry.mjs`).
  const argv = [...args, entry];

  const result = spawnSync(runtime, argv, {
    cwd,
    env: Object.assign({}, process.env, env),
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status == null ? -1 : result.status,
    timedOut: result.signal === 'SIGTERM' && result.status === null
  };
}

/**
 * Check whether a binary is discoverable on PATH. Bun scenarios use this to
 * skip gracefully on environments where Bun isn't installed (e.g. a contributor
 * who only has Node — they should still be able to run the Node scenarios).
 *
 * @param {string} binary - e.g. 'bun'
 * @returns {boolean} true if the binary can be invoked
 */
function hasBinary(binary) {
  // spawnSync with a no-op arg exits 0 if the binary exists and supports
  // `--version`. Both `node` and `bun` do. Status -1 / ENOENT means missing.
  const probe = spawnSync(binary, ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

module.exports = { runScenario, hasBinary };
