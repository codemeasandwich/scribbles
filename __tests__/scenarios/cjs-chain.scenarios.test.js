/**
 * @file Scenarios: integrator-reported v2.0.0 regression tests
 *
 * Two blockers reported by an integrator running scribbles under Bun:
 *
 *   Issue 1: requiring scribbles from inside a CJS child while its
 *            parent's require() was still on the call stack threw
 *            `Expected CommonJS module to have a function wrapper` on
 *            Bun 1.3.x. Cause: scribbles' CJS-extensions handler
 *            replaced Module._extensions['.js'] outright, which
 *            corrupted Bun's in-progress wrapper state for the child
 *            and every subsequent CJS require in the process. Fixed
 *            by delegating to the ORIGINAL native handler when a file
 *            contains no `scribbles.<level>(...)` call sites (the
 *            fast-path in `src/register/hooks/cjs-extensions.js`).
 *
 *   Issue 2: the CLS trace context (`scribbles.trace(opts, cb)`) was
 *            lost across the first `await` inside `cb` on Bun 1.3.x.
 *            Cause: Bun's async_hooks implementation does not feed
 *            `@ashleyw/cls-hooked`'s init/before/after lifecycle the
 *            way Node does, so cls-hooked's per-namespace context map
 *            emptied out at the first microtask boundary. Fixed by
 *            migrating the namespace layer to AsyncLocalStorage,
 *            which is supported identically on Node (>=16.4) and Bun
 *            (>=1.0).
 *
 * Both scenarios spawn a real child process (Bun or Node) against a
 * fixture on disk so the Jest worker's own runtime wiring is outside
 * the test's blast radius. The Bun scenarios skip cleanly on
 * environments without Bun installed so contributors on Node-only
 * setups can still run the suite.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runScenario, hasBinary } = require('./harness/spawn.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHAIN_FIXTURE = path.resolve(__dirname, 'fixtures', 'cjs-chain');
const describeBun = hasBinary('bun') ? describe : describe.skip;

/**
 * Build a scratch workspace containing a `node_modules/scribbles`
 * symlink back to the repo, so `require("scribbles")` inside the
 * fixture files resolves via the package's `exports` map rather than
 * falling back to Bun's global auto-install cache (which would load
 * whatever scribbles version Bun last cached, not the source under
 * test).
 *
 * @returns {string} scratch directory path (caller cleans up)
 */
function buildChainWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribbles-cjs-chain-'));
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.symlinkSync(REPO_ROOT, path.join(dir, 'node_modules', 'scribbles'), 'dir');
  fs.copyFileSync(
    path.join(CHAIN_FIXTURE, 'parent.cjs'),
    path.join(dir, 'parent.cjs')
  );
  fs.copyFileSync(
    path.join(CHAIN_FIXTURE, 'child.cjs'),
    path.join(dir, 'child.cjs')
  );
  return dir;
}

describe('Scenario: Node — scribbles required from inside a mid-load CJS chain', () => {
  let workspace;
  beforeAll(() => { workspace = buildChainWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('does not error — parent fully loads child and invokes its handler', () => {
    const result = runScenario({
      runtime: 'node',
      entry: path.join(workspace, 'parent.cjs'),
      cwd: workspace
    });
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).not.toMatch(/function wrapper/i);
    expect(result.stdout).toContain('RESULT={"ok":true,"data":{"foo":"bar"}}');
  });
});

describeBun('Scenario: Bun — scribbles required from inside a mid-load CJS chain', () => {
  let workspace;
  beforeAll(() => { workspace = buildChainWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('does not trip Bun\'s "Expected CommonJS module to have a function wrapper" error', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(workspace, 'parent.cjs'),
      cwd: workspace
    });
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).not.toMatch(/function wrapper/i);
    expect(result.stdout).toContain('RESULT={"ok":true,"data":{"foo":"bar"}}');
  });
});

/**
 * Build a scratch workspace for Issue 2 (trace-across-await) that has:
 *   - a `node_modules/scribbles` symlink (so bare `import` resolves)
 *   - a `trace-probe.mjs` ESM entry that kicks off an async `work()`
 *     chain from inside `trace(...)` and writes each log's traceId to
 *     stdout so the assertion can see whether CLS propagated.
 *
 * @returns {string} scratch directory path (caller cleans up)
 */
function buildTraceAwaitWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribbles-trace-await-'));
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.symlinkSync(REPO_ROOT, path.join(dir, 'node_modules', 'scribbles'), 'dir');
  fs.writeFileSync(path.join(dir, 'trace-probe.mjs'), `
import scribbles, { config, trace } from "scribbles";

const captured = [];
config({
  dataOut: (d) => captured.push(d),
  stdOut: () => {},
});

async function work() {
  scribbles.info("inside-sync");
  await new Promise((r) => setTimeout(r, 5));
  scribbles.info("inside-after-await");
  await new Promise((r) => setTimeout(r, 5));
  scribbles.info("inside-after-two-awaits");
}

let p;
trace("probe-span", () => { p = work(); });
await p;

for (const e of captured) {
  process.stdout.write(
    "MSG=" + JSON.stringify(e.input.message) +
    " TRACE=" + (e.trace && e.trace.traceId ? e.trace.traceId : "-") + "\\n"
  );
}
`);
  return dir;
}

describe('Scenario: Node — trace context survives await chains', () => {
  let workspace;
  beforeAll(() => { workspace = buildTraceAwaitWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('every log line inside the trace callback (sync + post-await) carries the same traceId', () => {
    const result = runScenario({
      runtime: 'node',
      args: ['--import', 'scribbles/register'],
      entry: path.join(workspace, 'trace-probe.mjs'),
      cwd: workspace
    });
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);

    const lines = result.stdout.trim().split('\n')
      .filter((l) => l.startsWith('MSG='));
    expect(lines.length).toBe(3);
    const ids = lines.map((l) => l.match(/TRACE=(\S+)/)[1]);
    // All three lines must share a single non-empty trace id.
    expect(ids[0]).not.toBe('-');
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toBe(ids[2]);
  });
});

describeBun('Scenario: Bun — trace context survives await chains', () => {
  let workspace;
  beforeAll(() => { workspace = buildTraceAwaitWorkspace(); });
  afterAll(() => { fs.rmSync(workspace, { recursive: true, force: true }); });

  it('every log line inside the trace callback (sync + post-await) carries the same traceId', () => {
    const result = runScenario({
      runtime: 'bun',
      entry: path.join(workspace, 'trace-probe.mjs'),
      cwd: workspace
    });
    expect(result.status).toBe(0);
    expect(result.timedOut).toBe(false);

    const lines = result.stdout.trim().split('\n')
      .filter((l) => l.startsWith('MSG='));
    expect(lines.length).toBe(3);
    const ids = lines.map((l) => l.match(/TRACE=(\S+)/)[1]);
    expect(ids[0]).not.toBe('-');
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toBe(ids[2]);
  });
});
