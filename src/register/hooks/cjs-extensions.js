/**
 * @file CJS source-transformation hook installer (inlined from node-hook)
 *
 * Domain context
 * --------------
 * For CommonJS loads — `require('./lib.js')` and friends — Scribbles installs
 * a transform on Node's `Module._extensions['.js']` handler. Any file loaded
 * after install has its source piped through `transformSource` (from
 * `src/parsing/transform.js`) before being compiled and evaluated. This is
 * the mechanism that rewrites `scribbles.log(user.name)` to
 * `scribbles.log.at({...}, "hello", user.name)` so the runtime can emit
 * `user.name:<value>` in its output.
 *
 * Historically Scribbles consumed the `node-hook` npm package for this. In
 * v2 we inline the ~25 LOC of logic we actually used, dropping the
 * dependency entirely (honouring CASE's zero-runtime-deps rule) and gaining
 * explicit control over the hook chain's semantics. The behaviour mirrors
 * node-hook's "nested transforms" model: each `install(fn)` call stacks
 * another transform on top of the previously-registered ones for the same
 * extension, and they run in registration order with each transform's
 * string output feeding the next.
 *
 * Technical context
 * -----------------
 * - `Module._extensions['.js']` is Node's legacy-but-stable public extension
 *   point for CJS source loading. Bun implements the same object with the
 *   same contract (verified empirically — Bun 1.3 exposes it for .js, .cjs,
 *   .mjs, .ts, .tsx, .mts, .cts), which means this one installer delivers
 *   full Node-CJS + Bun-CJS parity with no Bun-specific code at all.
 * - ESM loads (`import './lib.mjs'`) bypass this hook completely. For ESM a
 *   separate installer using `module.register()` is introduced alongside
 *   this one in the Node ESM adapter; for Bun ESM, a `Bun.plugin()`
 *   installer lives in register.mjs. All three installers delegate to the
 *   same `transformSource` so the algorithm has exactly one implementation.
 * - The stack-of-transforms map lives on globalThis (same protocol as
 *   `install-flag.js`) so two independently-bundled copies of Scribbles
 *   cooperatively share the hook chain instead of clobbering each other.
 * - The extension handler calls `module._compile(source, filename)` — an
 *   internal API — because that is the *only* way to return transformed
 *   source to Node's CJS loader from an extension handler. This mirrors
 *   how node-hook, istanbul, ts-node, and @swc/register all do it.
 */

'use strict';

const fs = require('fs');
const Module = require('module');

// Per-extension ordered list of transforms. Shared across all Scribbles
// copies in the process via globalThis so the hook chain is coherent even
// in pathological dependency-linking scenarios. Keyed by extension (".js").
const STACKS_KEY = Symbol.for('scribbles.cjs-extensions.transforms');

// Default set of CJS extensions Scribbles hooks. `.js` covers the
// overwhelming majority of CJS files in the wild; `.cjs` covers the
// explicit-CJS opt-in that users sprinkle into `type: "module"`
// packages. No public caller inside Scribbles ever passes a different
// list, so the parameter is non-optional — callers that want a
// different set can construct their own module.
const DEFAULT_EXTENSIONS = ['.js', '.cjs'];

/**
 * Install a source-text transform for CJS `.js` / `.cjs` file loads.
 *
 * @param {(src: string, filename: string) => string} transformFn
 *        Must always return a string.
 */
function install(transformFn) {
  // Lazily create the shared stacks map. Keeping it under Symbol.for means
  // every Scribbles copy in the process sees the same object.
  if (!globalThis[STACKS_KEY]) {
    globalThis[STACKS_KEY] = {};
  }
  const stacks = globalThis[STACKS_KEY];

  for (const ext of DEFAULT_EXTENSIONS) {
    if (!stacks[ext]) {
      // First install for this extension: create the transform stack and
      // register our dispatch handler with Node. The handler reads the
      // file, runs it through every currently-registered transform in
      // order, then hands the final string to module._compile.
      stacks[ext] = [];
      Module._extensions[ext] = function scribblesExtensionHandler(module, filename) {
        let source = fs.readFileSync(filename, 'utf8');
        for (const fn of stacks[ext]) {
          source = fn(source, filename);
        }
        module._compile(source, filename);
      };
    }

    // Subsequent install() calls on the same extension append to the stack
    // rather than replacing the handler. Deduped so repeated register()
    // calls (e.g. from divergent bundles) don't pile on duplicates.
    if (!stacks[ext].includes(transformFn)) {
      stacks[ext].push(transformFn);
    }
  }
}

module.exports = { install };
