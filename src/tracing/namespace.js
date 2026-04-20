/**
 * @file Async-context storage for trace correlation
 *
 * Domain context
 * --------------
 * Scribbles' trace API (`scribbles.trace(opts, callback)`) establishes a
 * per-request logical "namespace" that every `scribbles.log(...)` call
 * inside the callback — and every asynchronous continuation of that
 * callback — can reach when it needs to emit correlated metadata
 * (traceparent, tracestate, spanId, etc.). Downstream loggers inside
 * microservices rely on that correlation to thread distributed traces
 * together across HTTP/RPC boundaries.
 *
 * Propagation across `await` — why this file uses AsyncLocalStorage
 * -----------------------------------------------------------------
 * Prior to v2.0.1 this file built its namespace on `@ashleyw/cls-hooked`,
 * which backs its context propagation with Node's `async_hooks` lifecycle
 * callbacks. That works well on Node but is *incomplete* on Bun 1.3: when
 * a callback passed to `scribbles.trace(...)` crosses its first `await`,
 * Bun's async_hooks implementation does not thread the `init`/`before`/
 * `after` lifecycle the way cls-hooked expects, and the stored context
 * is silently dropped. The symptom is a log line whose traceId comes
 * through correctly synchronously but is `undefined` on every
 * continuation after the first `await` — reported by integrators and
 * verifiable with a five-line reproduction.
 *
 * `AsyncLocalStorage` (stable since Node 16.4, fully supported by Bun
 * since 1.0) replaces cls-hooked cleanly. It uses the same underlying
 * async_hooks mechanism on Node but also integrates with Bun's
 * scheduler-level continuation tracking. The result is identical
 * synchronous semantics AND correct propagation across Promise
 * continuations on both runtimes.
 *
 * Technical context
 * -----------------
 * - `AsyncLocalStorage` provides a `store` object that stays visible
 *   inside any callback chain initiated from `store.run(data, cb)`.
 *   `store.getStore()` returns that same data object (or undefined
 *   outside a run) from any async depth. This is exactly the
 *   contract Scribbles' trace needed; the lastActiveSpan bookkeeping
 *   the cls-hooked version carried (process.namespaces scan, inUse
 *   map, destroyNamespace housekeeping) is no longer necessary —
 *   the runtime manages scope lifetime for us.
 * - The exported `store` is a module-level singleton. `trace.js`
 *   imports it directly and calls `store.run(traceVals, next)`.
 * - `myNamespace()` keeps the two-step reader API (callable that
 *   accepts a key and returns the value) so the rest of the library
 *   reads as it always did — `correlaterValue('traceVals')` — without
 *   a cascading rewrite. The function returns a no-op reader when
 *   called outside any trace context, matching the v1 contract.
 */

'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

// Singleton store for Scribbles' trace context. One instance per
// process is sufficient: every `scribbles.trace(...)` call shares this
// storage and AsyncLocalStorage natively handles nested runs (inner
// `store.run(...)` frames shadow the outer for the duration of their
// callback, then restore on return).
const store = new AsyncLocalStorage();

/**
 * Return a reader into the currently-active trace context. The reader
 * is a function that takes a key and returns the value stored under it,
 * or `undefined` when no trace is active.
 *
 * Called by `trace.headers()` and `scribble()` to pull the active
 * `traceVals` packet (traceparent, spanId, span64, tracestate, etc.)
 * without leaking the underlying AsyncLocalStorage abstraction.
 *
 * @returns {(key: string) => *} Reader function.
 */
function myNamespace() {
  const current = store.getStore();
  return (key) => (current ? current[key] : undefined);
}

module.exports = { myNamespace, store };
