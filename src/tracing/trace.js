/**
 * @file Distributed tracing functions
 */
const crypto = require('crypto');
const createNamespace = require('@ashleyw/cls-hooked').createNamespace;

const config = require('../core/config');
const { deepMerge } = require('../utils/helpers');
const { parceTracestate, hashTracestate } = require('../utils/utils');

const tracestateLookup = new Map();

const regxTraceparent = /[\d\w]{2}-[\d\w]{32}-[\d\w]{16}-[\d\w]{02}/g

/**
 * Creates a trace function with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.cuidPrefix - Object with get() method for prefix
 * @param {Object} deps.traceCount - Object with value and increment()
 * @param {Object} deps.gitValues - Git info
 * @param {Function} deps.myNamespace - Namespace function
 * @returns {Function} The trace function
 */
function createTrace(deps) {
  const { cuidPrefix, traceCount, gitValues, myNamespace } = deps;

  /**
   * Creates a trace context for distributed tracing
   * @param {Object|string|Function} opts - Trace options, label, or callback
   * @param {Function} [next] - Callback to run within the trace context
   * @returns {Object} Trace context with traceId, spanId, and run method
   */
  function trace(opts, next) {

    let traceVals = { logs: [] };

    if ('object' === typeof opts) {
      traceVals.headers = opts.headers;
      traceVals.url = opts.url;
      traceVals.path = opts.path;
      traceVals.query = opts.query;
      traceVals.params = opts.params;
      traceVals.method = opts.method;
      let spanLabel = opts.spanLabel

      if (opts.traceId) {
        if (regxTraceparent.test(opts.traceId)) {
          const [version, traceId, parentId, flag] = opts.traceId.split('-')
          traceVals = { version, traceId, parentId, flag }
        } else {
          traceVals.traceId = opts.traceId
        }
      }
      traceVals.spanLabel = opts.spanLabel

      traceVals.tracestate = 'string' === typeof opts.tracestate
        && "" !== opts.tracestate ? parceTracestate(opts.tracestate)
        : opts.tracestate
    } else if ('string' === typeof opts) {

      traceVals.spanLabel = opts
    } else if ('function' === typeof opts) {
      next = opts;
    }

    if (!traceVals.traceId) {
      traceVals.traceId = crypto.randomBytes(16).toString('hex');
    }

    if (!traceVals.tracestate) {
      traceVals.tracestate = []
    }

    traceVals.spanId = cuidPrefix.get() + ("00000000" + traceCount.value.toString(16)).slice(-9)
    traceVals.span64 = Buffer.from(traceVals.spanId, 'hex').toString('base64').slice(0, -1)

    traceCount.increment();

    const traceNs = createNamespace(traceVals.spanId)
    traceNs.run(() => {
      traceNs.set('traceVals', traceVals);
      next(traceVals.spanId)
    })
  } // END trace

  /**
   * Gets trace context headers for W3C Trace Context propagation
   * @param {Object} [customHeader] - Custom headers to merge
   * @returns {Object} Headers object with traceparent and tracestate
   */
  trace.headers = function traceContext(customHeader) {

    const correlaterValue = myNamespace()

    const { traceId, spanId, span64, tracestate, version, flag, headers } = correlaterValue('traceVals') || {};

    let tracestateValue = (tracestate || []).filter(span => config.vendor !== span.key)
      .reduce((arr, { key, value }) => {
        arr.push(`${key}=${value}`);
        return arr;
      }, [`${config.vendor}=${span64}`]).slice(0, 32);

    if (config.edgeLookupHash && tracestateValue.length > 0) {
      const fullTracestate = tracestateValue.join();
      const hash = 'h:' + hashTracestate(tracestate || []);
      tracestateLookup.set(hash, fullTracestate);
      tracestateValue = hash;
    } else {
      tracestateValue = tracestateValue.join();
    }

    return deepMerge(Object.assign({
      "x-git-hash": gitValues && gitValues.hash || undefined,
      traceparent: `${version || '00'}-${traceId}-${spanId}-${flag || '01'}`,
      tracestate: tracestateValue
    }, headers || {}), customHeader)
  } // END traceContext

  /**
   * Looks up the original tracestate from a hash
   * @param {string} hash - The hash to look up
   * @returns {string|undefined} The original tracestate or undefined
   */
  trace.lookupTracestate = function(hash) {
    return tracestateLookup.get(hash);
  } // END lookupTracestate

  return trace;
}

module.exports = { createTrace };
