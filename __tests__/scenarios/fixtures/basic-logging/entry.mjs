/**
 * @file ESM entry point for the basic-logging scenario
 *
 * Domain context
 * --------------
 * Mirrors `entry.js` but uses static ESM imports. This entry file is spawned
 * directly by scenarios 2, 3 (Node-ESM), and 5 (Bun-ESM) in the harness.
 *
 * Technical context
 * -----------------
 * - ESM parses and links the entire import graph BEFORE any evaluation runs.
 *   That means `lib.mjs`' source is fetched at graph-construction time, while
 *   Scribbles' top-level code has not yet executed. Therefore any attempt to
 *   install a source-transform hook from within Scribbles' own module
 *   evaluation is too late to affect `lib.mjs`.
 * - The ONLY way to transform `lib.mjs` under ESM is to register hooks BEFORE
 *   the graph is constructed — which means a preload: either
 *     • `node --import scribbles/register entry.mjs`, or
 *     • `bunfig.toml` `preload = ["scribbles/register"]` for Bun.
 * - Scenarios 3 and 5 deliberately omit that preload to prove the warning
 *   path. Scenarios 2 and 5-configured include the preload to prove parity.
 * - `.mjs` extension makes this unambiguously ESM regardless of the nearest
 *   `package.json`'s `type` field.
 * - Reinforces the project's architectural rule that "Scribbles initialises
 *   the source-code analyser but cannot analyse the file that it is
 *   initialised from." Under ESM this rule is even stricter than under CJS:
 *   not only is the entry file not transformed, but every statically-imported
 *   sibling is also already parsed before any user code executes, which is
 *   why a preload is unavoidable for full parity in this runtime.
 */

import scribbles from '../../../../index.mjs';
import run from './lib.mjs';

// `scribbles` is imported purely for side-effect: the (future) D11 bug fix
// will have `index.js` call `register()` on load. In ESM that register call
// is too late for siblings, so we expect the warning path to fire when no
// preload is present. This import keeps the shape honest even though its
// installation effect is ineffective in ESM.
void scribbles;

run();
