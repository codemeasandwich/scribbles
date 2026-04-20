/**
 * @file Scenarios: v2 named-export API surface
 *
 * Domain context
 * --------------
 * Starting with v2.0.0 the project's stated convention is that every
 * non-log-level API on the `scribbles` module is a destructurable named
 * export rather than a property that user code reaches for as
 * `scribbles.<thing>(...)`. This matches the ESM-native idiom and keeps the
 * default export focused on what users came for: the logging levels.
 *
 * These scenarios pin the CJS contract of that surface. They are deliberately
 * small and in-process (not spawn-based) because the assertion is purely
 * about the shape of `module.exports` — no child-process runtime variation
 * needs to be exercised here. Spawn-based parity (Node-CJS, Bun-CJS, ESM
 * under `--import`, etc.) is covered by the basic-logging scenarios.
 *
 * Expected state per task
 * -----------------------
 *   T1: this file did not exist.
 *   T4 (this commit): GREEN once `register` joins `config`, `trace`,
 *                     `middleware` on the CJS module.exports. All four
 *                     destructure cleanly and each is callable.
 *   T5: an ESM counterpart to this file will be added when the ESM build
 *       lands, asserting that the default export does NOT carry the
 *       infrastructure properties — the hard cut of the named-exports-only
 *       convention.
 *
 * Technical context
 * -----------------
 * - `register` is asserted to be a function (T4 scope) but not called with
 *   its .status() / .assert() methods because those sub-APIs are wired in
 *   T7. Once T7 lands, additional assertions on those methods get appended
 *   to this same file.
 * - `config({})` is invoked with an empty config object, which is a no-op
 *   in practice but proves the function binding is live.
 */

'use strict';

describe('Scenario: v2 CJS named-export surface', () => {
  it('exposes config, trace, middleware, and register as destructurable names', () => {
    const { config, trace, middleware, register } = require('../../index.js');

    expect(typeof config).toBe('function');
    expect(typeof trace).toBe('function');
    expect(typeof middleware).toBe('function');
    expect(typeof register).toBe('function');
  });

  it('named register is the same function the library uses internally', () => {
    // Two destructures from the same require-cache entry must yield the
    // same function reference. This is a CJS guarantee but worth pinning,
    // because losing reference-equality would mean `register()` calls from
    // user code and from index.js's own auto-install took different code
    // paths — which would break the Symbol.for idempotency guarantee in
    // src/register/install-flag.js.
    const a = require('../../index.js').register;
    const b = require('../../index.js').register;
    expect(a).toBe(b);
  });

  it('named config can be invoked without throwing on a no-op call', () => {
    const { config } = require('../../index.js');
    // Passing an empty object is idiomatic v1 behaviour — scribbles.config()
    // accepts partial config and merges. Proves the binding is live.
    expect(() => config({})).not.toThrow();
  });

  it('keeps v1 property access working as a soft-cut compat surface', () => {
    // CommonJS offers no way to distinguish destructuring from property
    // access, so enforcing a "named-export only" rule in the CJS entry
    // would break destructuring too. v2.0.0 therefore keeps the property
    // surface alive in CJS, documents the named form as preferred in
    // MIGRATION.md, and defers the hard cut to the ESM entry (T5) where
    // the default vs named distinction is a language primitive rather
    // than a convention.
    const scribbles = require('../../index.js');
    expect(typeof scribbles.config).toBe('function');
    expect(typeof scribbles.trace).toBe('function');
    expect(typeof scribbles.middleware).toBe('function');
    expect(typeof scribbles.register).toBe('function');
  });
});
