/**
 * @file Cross-module installation guard for the source-transform hook
 *
 * Domain context
 * --------------
 * Scribbles' source-transform hook must be installed exactly once per Node
 * / Bun process regardless of how many times `register()` is called. In
 * real-world projects `require('scribbles')` may be reached from multiple
 * bundles, linked dependencies, or even two divergent copies of the library
 * hanging off different node_modules trees — if each copy blindly registered
 * its own hook we would transform the same source text multiple times, which
 * at best wastes work and at worst corrupts it (the `.at(...)` envelope the
 * first pass emits would itself be eligible for a second pass).
 *
 * Technical context
 * -----------------
 * - The flag lives on the Node `global` / Bun `globalThis` under a
 *   `Symbol.for(...)` key so two copies of Scribbles that were bundled
 *   separately but loaded into the same process can still see each other's
 *   state. `Symbol.for` looks up symbols in the cross-realm registry rather
 *   than creating a new private symbol, which is exactly the semantics we
 *   need for a cross-copy coordination primitive.
 * - Pure helpers — no side effects beyond reading and writing the single
 *   flag. The actual hook install lives in `./hooks/cjs-extensions.js`;
 *   callers combine the two by checking `isInstalled()` first and calling
 *   `markInstalled()` after a successful install.
 * - Exposed functions (rather than a raw symbol) so the mechanism can be
 *   changed later (e.g. to a richer "installed under which runtime" record
 *   for T5/T6) without breaking call sites.
 */

'use strict';

// Shared symbol in the cross-realm registry. The exact string is part of the
// protocol between independently-bundled copies of Scribbles, so it should
// not be renamed casually.
const FLAG = Symbol.for('scribbles.transform.installed');

/**
 * @returns {boolean} true if any copy of Scribbles has already installed
 *          the source-transform hook in this process.
 */
function isInstalled() {
  // Use globalThis rather than `global` so the module works identically on
  // Node and Bun without any runtime sniffing.
  return globalThis[FLAG] === true;
}

/**
 * Record that the transform hook is now installed. Idempotent; callers are
 * expected to wrap the actual install in a `if (!isInstalled()) { install();
 * markInstalled(); }` pattern.
 */
function markInstalled() {
  globalThis[FLAG] = true;
}

module.exports = { isInstalled, markInstalled };
