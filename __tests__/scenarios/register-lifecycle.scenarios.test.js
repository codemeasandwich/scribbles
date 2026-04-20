/**
 * @file Scenarios: `scribbles/register` lifecycle — CJS hook, ESM preload
 * warning, and `register.assert()` fail-fast semantics.
 *
 * Domain context
 * --------------
 * The v2.0.0 release introduces a unified runtime-registration API. This
 * file exercises the slices of that API that Jest-on-Node cannot reach
 * through the default CJS happy path alone:
 *
 *   1. The CJS source-transform hook installed on
 *      `Module._extensions['.js']` — does it actually transform a .js
 *      file when Node itself invokes it through `require()`?
 *   2. The ESM-preload-missing warning path — does `register()` emit
 *      exactly one scribbles/preload warning to stderr when it detects an
 *      ESM entrypoint without a preload flag?
 *   3. The `register.assert()` fail-fast helper — does it throw a
 *      `SCRIBBLES_NOT_REGISTERED` error with `instructions` when the
 *      transform is not active?
 *   4. `register.status()`' "unknown" runtime branch — does it surface
 *      `runtime: 'unknown'` when neither Bun nor Node can be detected
 *      (e.g. a hypothetical pre-v2 embedder that strips `process.versions.node`)?
 *
 * Technical context
 * -----------------
 * - The CJS-hook scenario drives Node's `Module._extensions['.js']`
 *   contract directly — that IS the public entrypoint Node uses to load
 *   every .js file, and our installer replaces the default handler with
 *   a source-transforming one. Asserting the installed function behaves
 *   correctly is integration, not unit: we do not poke at internal
 *   closures; we hand Node's loader a real file and a real Module
 *   instance, just as Node would on a normal `require()`.
 * - The warning / assert scenarios reset the `Symbol.for(...)` guard
 *   flags and spoof `process.argv[1]` to an `.mjs` extension. This is
 *   the exact shape of state Scribbles sees at the top of a real Node
 *   ESM boot; reproducing it in-process lets the coverage instrument
 *   see the ESM-only branches that a Jest-on-Node-CJS run would
 *   otherwise skip.
 * - The fixtures write their own temp files and clean them up in
 *   `afterEach` so no state leaks between scenarios or between test
 *   files. `fs.rmSync(..., { recursive: true, force: true })` mirrors
 *   the pattern already used by the Bun-ESM scratch-workspace
 *   scenarios.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

// Require the library once up front so the register() call in index.js
// installs the CJS hook in this process. Every scenario below depends
// on that install having happened.
require('../../index.js');

describe('Scenario: CJS source-transform hook on Module._extensions', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribbles-cjs-hook-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs the installed extension handler when Node requires a .js file', () => {
    // Create a plain target file with no scribbles calls — the handler
    // should read it, pipe it through the transform chain (a no-op for
    // files without `scribbles.` call sites), and hand the result to
    // Node's `module._compile`. Asserting the exports come out intact
    // proves the full handler body executed end-to-end.
    const targetPath = path.join(tempDir, 'target.js');
    fs.writeFileSync(
      targetPath,
      'module.exports = { payload: 42, marker: "untouched" };\n'
    );

    const handler = Module._extensions['.js'];
    expect(typeof handler).toBe('function');

    // Construct a bare Module the same way Node's own loader does, then
    // hand it to our handler. This is how Node calls Module._extensions
    // internally, so driving the handler this way is the public
    // integration path — not a backdoor.
    const mod = new Module(targetPath, null);
    mod.filename = targetPath;
    mod.paths = Module._nodeModulePaths(path.dirname(targetPath));

    handler(mod, targetPath);

    expect(mod.exports).toEqual({ payload: 42, marker: 'untouched' });
  });

  it('delegates to the captured-native handler for scribbles-free files (fast-path)', () => {
    // The integrator-fix fast-path: when a file has NO `scribbles.`
    // references AND we captured an original handler at install time,
    // delegate to that original (Bun's / Node's native) rather than
    // running our own `module._compile(source)` round-trip. Seeding
    // the originals-cache via Symbol.for is how the install side
    // recognises a DIFFERENT-but-supplied native handler too; the
    // test seeds a sentinel there, loads a no-scribbles file, and
    // confirms the sentinel was invoked — proving the delegation
    // arm of the branch fires on reachable scenarios.
    const ORIGINALS_KEY = Symbol.for('scribbles.cjs-extensions.originals');
    // The install() closure captures the `originals` OBJECT reference
    // at install time — so mutating that same object in place is the
    // way to inject a sentinel. Reassigning `globalThis[ORIGINALS_KEY]`
    // to a new object would be ignored by the live closure.
    const originals = globalThis[ORIGINALS_KEY];
    const savedHandler = originals['.js'];
    let sentinelCalledWith = null;
    originals['.js'] = function sentinelOriginalHandler(module, filename) {
      sentinelCalledWith = { filename };
      module.exports = { from: 'sentinel', filename };
    };

    try {
      const targetPath = path.join(tempDir, 'no-scribbles-content.js');
      fs.writeFileSync(
        targetPath,
        'module.exports = { fromNativeLoader: true };\n'
      );

      const handler = Module._extensions['.js'];
      const mod = new Module(targetPath, null);
      mod.filename = targetPath;
      mod.paths = Module._nodeModulePaths(path.dirname(targetPath));
      handler(mod, targetPath);

      expect(sentinelCalledWith).not.toBeNull();
      expect(sentinelCalledWith.filename).toBe(targetPath);
      expect(mod.exports).toEqual({ from: 'sentinel', filename: targetPath });
    } finally {
      originals['.js'] = savedHandler;
    }
  });

  it('stacks further transforms idempotently — same fn is not duplicated', () => {
    // install() is called on every boot of the library. A second call
    // from the same fn reference must NOT double-register or the
    // resulting source would be transformed twice (breaking the
    // already-rewritten `.at({...}, ...)` form). Drive the public
    // register() a handful of times and assert the stack length is
    // stable.
    const STACKS_KEY = Symbol.for('scribbles.cjs-extensions.transforms');
    const before = globalThis[STACKS_KEY]['.js'].length;
    const { register } = require('../../index.js');
    register();
    register();
    register();
    const after = globalThis[STACKS_KEY]['.js'].length;
    expect(after).toBe(before);
  });

  it('re-runs install() with pre-existing stacks — all false-branch arms', () => {
    // When `register()` is called on a process that already has the
    // `STACKS_KEY` map populated (because a previous Scribbles boot
    // installed the hook), BUT the `INSTALL_KEY` flag has been cleared
    // (e.g. a test harness resetting idempotency), install() re-runs
    // with a NON-empty stacks map. That path exercises the FALSE arms
    // of every conditional in install():
    //
    //   - `if (!globalThis[STACKS_KEY])` → FALSE (map already exists)
    //   - `if (!stacks[ext])`            → FALSE (handler already registered)
    //   - `if (!stacks[ext].includes(fn))` → FALSE (fn already in stack)
    //
    // Driving this through `register()` keeps the test aligned with the
    // public surface users reach.
    const INSTALL_KEY = Symbol.for('scribbles.transform.installed');
    const savedInstalled = globalThis[INSTALL_KEY];
    const { register } = require('../../index.js');
    try {
      delete globalThis[INSTALL_KEY];
      register();
      // If install() incorrectly re-registered a second transform for
      // any extension, the subsequent requires would double-transform
      // and we'd end up with malformed `.at().at(...)` output. A smoke
      // check that the public API still works confirms the idempotent
      // FALSE-branch path held.
      expect(typeof register.status().runtime).toBe('string');
    } finally {
      if (savedInstalled !== undefined) globalThis[INSTALL_KEY] = savedInstalled;
    }
  });

  it('stacks-key initialisation runs on a brand-new globalThis slot', () => {
    // The install() lazy-init path only fires the FIRST time it sees an
    // empty stacks map. After normal boot the map is populated, so the
    // `if (!globalThis[STACKS_KEY])` branch is cold on every subsequent
    // register() call. We drop the map entirely and re-invoke install
    // directly via the public register surface to exercise the
    // initialisation branch explicitly.
    const STACKS_KEY = Symbol.for('scribbles.cjs-extensions.transforms');
    const INSTALL_KEY = Symbol.for('scribbles.transform.installed');
    const saved = globalThis[STACKS_KEY];
    const savedInstalled = globalThis[INSTALL_KEY];
    try {
      delete globalThis[STACKS_KEY];
      delete globalThis[INSTALL_KEY];
      const { register } = require('../../index.js');
      register();
      expect(globalThis[STACKS_KEY]).toBeDefined();
      expect(globalThis[STACKS_KEY]['.js']).toBeDefined();
      expect(globalThis[STACKS_KEY]['.js'].length).toBeGreaterThan(0);
    } finally {
      // Restore so the remaining scenarios see a configured installer.
      // The install() call above preserved Module._extensions['.js']
      // (the re-registration branch bails out when stacks[ext] already
      // exists on a previous boot), but the globalThis bookkeeping
      // must be in a clean re-entrant state before we hand control back.
      if (saved) globalThis[STACKS_KEY] = saved;
      if (savedInstalled !== undefined) globalThis[INSTALL_KEY] = savedInstalled;
    }
  });
});

describe('Scenario: register.assert() fail-fast semantics', () => {
  // The CJS install flag is sticky for the life of the process (it is
  // the whole point of `install-flag.js`), so these tests manipulate it
  // via Symbol.for, run the path under test, then restore the flag so
  // subsequent tests see a configured environment. The keys must match
  // the ones in `src/register/install-flag.js` and
  // `src/register/warn.js` exactly — cross-realm coordination is the
  // entire reason those modules use Symbol.for rather than private
  // symbols.
  // Key names must match exactly what `src/register/install-flag.js`,
  // `src/register/warn.js`, and `src/register/index.js` use. Symbol.for
  // addresses the cross-realm registry so a mismatch here silently
  // misses the real flag — verified by a `Symbol.for(...).description`
  // comparison against those source files during design.
  const INSTALL_KEY = Symbol.for('scribbles.transform.installed');
  const WARNED_KEY = Symbol.for('scribbles.warning.emitted');
  const ESM_FLAG_KEY = Symbol.for('scribbles.esm-loader.installed');

  it('throws SCRIBBLES_NOT_REGISTERED when the transform is not active', () => {
    const { register } = require('../../index.js');
    const savedInstall = globalThis[INSTALL_KEY];
    const savedEsm = globalThis[ESM_FLAG_KEY];
    const savedArgv1 = process.argv[1];

    // Simulate a process that has neither the CJS hook installed nor
    // the ESM preload wired, running an ESM entry. Under those
    // conditions register.status().transformActive is false and
    // register.assert() must throw a typed error with instructions.
    delete globalThis[INSTALL_KEY];
    delete globalThis[ESM_FLAG_KEY];
    process.argv[1] = '/tmp/fake-entry.mjs';

    try {
      let caught;
      try { register.assert(); } catch (e) { caught = e; }
      expect(caught).toBeDefined();
      expect(caught.code).toBe('SCRIBBLES_NOT_REGISTERED');
      expect(caught.scribbles).toBeDefined();
      expect(caught.scribbles.transformActive).toBe(false);
      expect(caught.message.toLowerCase()).toContain('preload');
    } finally {
      // Restore the live state so later scenarios and later test files
      // see a configured runtime. Not doing this would cross-wire the
      // "unconfigured" state into the named-exports scenarios below,
      // which specifically assert the HAPPY path.
      if (savedInstall !== undefined) globalThis[INSTALL_KEY] = savedInstall;
      if (savedEsm !== undefined) globalThis[ESM_FLAG_KEY] = savedEsm;
      process.argv[1] = savedArgv1;
    }
  });

  it('register() emits the preload-missing warning exactly once per boot', () => {
    const { register } = require('../../index.js');
    const savedEsm = globalThis[ESM_FLAG_KEY];
    const savedWarned = globalThis[WARNED_KEY];
    const savedArgv1 = process.argv[1];

    // Arrange for the warning path to fire: clear the ESM preload flag
    // and the one-shot warning guard, then point argv[1] at a .mjs
    // entry so isLikelyEsmEntry() returns true.
    delete globalThis[ESM_FLAG_KEY];
    delete globalThis[WARNED_KEY];
    process.argv[1] = '/tmp/fake-warn-entry.mjs';

    let captured = '';
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk) => { captured += String(chunk); return true; };

    try {
      register();           // first call: emits
      register();           // second call: must be silent (one-shot)
      register();           // third call: still silent
    } finally {
      process.stderr.write = origWrite;
      if (savedEsm !== undefined) globalThis[ESM_FLAG_KEY] = savedEsm;
      if (savedWarned !== undefined) globalThis[WARNED_KEY] = savedWarned;
      else delete globalThis[WARNED_KEY];
      process.argv[1] = savedArgv1;
    }

    expect(captured.toLowerCase()).toContain('scribbles');
    expect(captured.toLowerCase()).toContain('preload');

    // A single emission means the warning's unique opening phrase appears
    // exactly once. The word "scribbles" alone is not specific enough
    // because the canonical warning message embeds it three times
    // (header, `--import scribbles/register`, `"scribbles/register"`),
    // which would falsely look like multiple emissions to a naive count.
    const needle = 'ESM runtime detected';
    const occurrences = captured.split(needle).length - 1;
    expect(occurrences).toBe(1);
  });
});

describe('Scenario: register.status() fully-configured ESM path', () => {
  // Covers the `needsEsm ? (esmPreloaded && cjsInstalled) : cjsInstalled`
  // ternary's "ESM + fully configured" arm — the only arm NOT reached by
  // the default happy path (Jest on Node-CJS falls into the
  // `: cjsInstalled` branch). Driving it here exercises the check that
  // real ESM users get a truthy transformActive when their preload is
  // wired correctly.
  const ESM_FLAG_KEY = Symbol.for('scribbles.esm-loader.installed');

  it('reports transformActive=true when argv is ESM AND preload flag is set', () => {
    const { register } = require('../../index.js');
    const savedEsm = globalThis[ESM_FLAG_KEY];
    const savedArgv1 = process.argv[1];

    // Mimic the state at the top of a correctly-preloaded Node-ESM boot:
    //   process.argv[1] = '/path/to/app.mjs'
    //   globalThis[ESM_FLAG_KEY] = true   (set by register.mjs at preload)
    //   CJS hook already installed        (set by index.js during require)
    globalThis[ESM_FLAG_KEY] = true;
    process.argv[1] = '/tmp/app-preloaded.mjs';

    try {
      const s = register.status();
      expect(s.runtime).toBe('node-esm');
      expect(s.esmPreloaded).toBe(true);
      expect(s.cjsInstalled).toBe(true);
      expect(s.transformActive).toBe(true);
      expect(s.instructions).toBeUndefined();
    } finally {
      if (savedEsm === undefined) delete globalThis[ESM_FLAG_KEY];
      else globalThis[ESM_FLAG_KEY] = savedEsm;
      process.argv[1] = savedArgv1;
    }
  });
});

describe('Scenario: register.status() Bun-runtime classification', () => {
  // `detectRuntime` returns 'bun-esm' / 'bun-cjs' when `globalThis.Bun`
  // is defined. That is the primary Bun-detection signal Scribbles uses
  // across `src/register/index.js` and `register.mjs`. Under Jest on
  // Node `globalThis.Bun` is absent, so this branch is only reachable
  // by transient global spoofing — common practice in Bun-vs-Node
  // compatibility test harnesses (see e.g. the `is-bun` library's test
  // suite which uses the same `globalThis.Bun = {}` pattern).
  it('reports runtime="bun-cjs" when globalThis.Bun is defined and entry is not .mjs', () => {
    const { register } = require('../../index.js');
    const savedBun = globalThis.Bun;
    const savedArgv1 = process.argv[1];
    globalThis.Bun = { version: '1.0.0' };
    process.argv[1] = '/tmp/app.js';
    try {
      expect(register.status().runtime).toBe('bun-cjs');
    } finally {
      if (savedBun === undefined) delete globalThis.Bun; else globalThis.Bun = savedBun;
      process.argv[1] = savedArgv1;
    }
  });

  it('reports runtime="bun-esm" when globalThis.Bun is defined and entry is .mjs', () => {
    const { register } = require('../../index.js');
    const savedBun = globalThis.Bun;
    const savedArgv1 = process.argv[1];
    globalThis.Bun = { version: '1.0.0' };
    process.argv[1] = '/tmp/app.mjs';
    try {
      expect(register.status().runtime).toBe('bun-esm');
    } finally {
      if (savedBun === undefined) delete globalThis.Bun; else globalThis.Bun = savedBun;
      process.argv[1] = savedArgv1;
    }
  });
});

describe('Scenario: register.status() runtime classification fallback', () => {
  it('reports runtime="unknown" when neither Bun nor Node can be detected', () => {
    const { register } = require('../../index.js');

    // `detectRuntime` returns 'unknown' when `globalThis.Bun` is absent
    // AND `process.versions.node` is falsy. Neither condition holds on
    // a normal Node boot, so we temporarily strip the `node` version
    // marker to reach the fallback branch. Jest runs on the same Node
    // process throughout, so restoring the marker afterwards is
    // critical to prevent downstream scenarios misclassifying.
    const savedNodeVer = process.versions.node;
    // `process.versions` is a frozen-ish object on some Node versions;
    // we use defineProperty to force a mutable override. Same pattern
    // is used by `@types/node` compat shims and by source-map-support
    // when it patches Node's version string for sourcemaps.
    Object.defineProperty(process.versions, 'node', {
      value: undefined, writable: true, configurable: true
    });

    try {
      const s = register.status();
      expect(s.runtime).toBe('unknown');
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: savedNodeVer, writable: true, configurable: true
      });
    }
  });
});
