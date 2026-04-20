/**
 * @file One-shot warning emitter for Scribbles runtime-preload issues
 *
 * Domain context
 * --------------
 * When a user runs Scribbles in an ESM context (`node entry.mjs`, `bun
 * entry.mjs`, `bun test`) without having wired up the source-transform
 * preload, Scribbles still loads and logs correctly — file/line/col come
 * through stack traces — but automatic variable-name extraction silently
 * does not fire because the ESM module graph was parsed and linked before
 * our hook had a chance to install.
 *
 * Rather than silently losing that feature, the library emits one warning
 * on stderr per process explaining what happened and pointing the user at
 * the fix. Per the v2 spec the warning fires on every boot until the user
 * actually wires the preload, but only once per boot to avoid spam when
 * multiple modules transitively import scribbles.
 *
 * Technical context
 * -----------------
 * - Uses a `Symbol.for(...)` key on globalThis for the "already warned"
 *   flag so independently-bundled copies of Scribbles share the guard.
 *   Two copies both warning would produce duplicate stderr output without
 *   adding any signal.
 * - Writes directly to `process.stderr` rather than through Scribbles'
 *   own logging surface. Going through scribbles.log would be a circular
 *   dependency (scribbles calls register which warns which calls
 *   scribbles...), and we want this message to appear even when the
 *   user has reconfigured stdOut to something quiet.
 * - The message MUST contain the strings `scribbles` and `preload`
 *   (case-insensitive). The scenario tests lock that contract via
 *   `expect(stderr.toLowerCase()).toContain('scribbles')` and `toContain('preload')`,
 *   so future rewording must preserve both terms.
 */

'use strict';

// Shared symbol so two Scribbles copies in the same process cooperatively
// suppress duplicate warnings. The exact string is part of the cross-copy
// protocol and must not be renamed casually.
const WARNED_KEY = Symbol.for('scribbles.warning.emitted');

/**
 * Emit a warning on stderr exactly once per process. Subsequent calls are
 * silent no-ops.
 *
 * Callers MUST pass a message that does NOT end with a newline; this
 * helper appends exactly one. The prior implementation defended the
 * already-newlined case with an `.endsWith('\n') ? message : message + '\n'`
 * ternary, but every caller in the codebase (the single
 * `ESM_PRELOAD_MISSING` constant below) follows the no-trailing-newline
 * convention, which made the "already newlined" arm dead. Removed per
 * CASE's dead-code rule; the git history preserves the reasoning for
 * anyone later resurrecting it for a multi-caller future.
 *
 * @param {string} message - The warning text, without a trailing newline.
 */
function warnOncePerBoot(message) {
  if (globalThis[WARNED_KEY]) return;
  globalThis[WARNED_KEY] = true;
  // Direct write, not console.warn, to avoid any chance of the message
  // being swallowed by userland console reassignment (some logging
  // libraries patch console at import time).
  process.stderr.write(message + '\n');
}

/**
 * The canonical "preload not installed under ESM" warning. Pulled out as a
 * constant so tests and the register-api can share the same wording and so
 * any future README cross-reference stays in exactly one place.
 */
const ESM_PRELOAD_MISSING =
  'scribbles: ESM runtime detected but the source-transform preload is not installed.\n' +
  '  Variable-name extraction will be unavailable. Stack-based file/line/col still works.\n' +
  '  To enable full feature parity:\n' +
  '    Node ESM: add `--import scribbles/register` to your `node` invocation, or set\n' +
  '              `NODE_OPTIONS="--import scribbles/register"` in your environment.\n' +
  '    Bun:      add `preload = ["scribbles/register"]` to your `bunfig.toml`.\n' +
  '  See README section "Runtime support" for details.';

module.exports = { warnOncePerBoot, ESM_PRELOAD_MISSING };
