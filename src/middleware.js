/**
 * @file Express middleware for distributed tracing
 */
const config = require('./config');
const { isValidRegex, stringToRegex } = require('./regexUtils');

/**
 * Creates middleware with injected trace function
 * @param {Function} trace - The trace function
 * @returns {Object} Middleware object with express handler
 */
function createMiddleware(trace) {

  return {
    /**
     * Express middleware for correlating requests with trace context
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    express: function correlateMiddleware(req, res, next) {
      const { headers, socket, connection, ip } = req;

      let headersOut = {}
      if (config.headers) {

        let configHeaders = config.headers

        if (!Array.isArray(configHeaders)) {
          configHeaders = [configHeaders]
        }
        configHeaders = configHeaders.filter(key => key
          && ('string' === typeof key
            || key instanceof RegExp))
          .map(key => 'string' === typeof key
            && isValidRegex(key) ? stringToRegex(key)
            : key)
        headersOut = configHeaders.reduce((all, key) => {
          if (key instanceof RegExp) {
            Object.keys(headers)
              .forEach(headerName => {
                if (key.test(headerName)) {
                  all[headerName] = headers[headerName]
                } // END if
              })// END forEach
          } else if (headers[key]) {
            all[key] = headers[key]
          }// END else if
          return all
        }, {}) // END reduce
      } // END if config.headers

      if (config.headersMapping) {
        if ("object" !== typeof config.headersMapping) {
          throw new Error("headersMapping must be an Object. Was passed a " + typeof config.headersMapping)
        } // END NOT Object
        Object.keys(config.headersMapping).forEach(targetOutputHeaderName => {
          let findInputHarderNames = config.headersMapping[targetOutputHeaderName]
          if ("string" === typeof findInputHarderNames) {
            findInputHarderNames = [findInputHarderNames]
          } else if (!Array.isArray(findInputHarderNames)) {
            throw new Error("headersMapping keys must map to a String or Array of string")
          }
          const foundAHeader = findInputHarderNames.reduce((returnHeaderFeid, findThisHarderKey) => (
            returnHeaderFeid || headers[findThisHarderKey]
          ), false)
          if ("string" === typeof foundAHeader) {
            headersOut[targetOutputHeaderName] = foundAHeader
          }
        }) // END forEach
      }//END config.headersMapping
      let spanLabel = headers['x-forwarded-for']
      if (!spanLabel
        && socket
        && socket.remoteAddress) {
        spanLabel = socket.remoteAddress
      }

      if (!spanLabel
        && connection) {
        if (connection.remoteAddress) {
          spanLabel = connection.remoteAddress
        } else if (connection.socket
          && connection.socket.remoteAddress) {
          spanLabel = connection.socket.remoteAddress
        }
      }

      if (!spanLabel && ip) {
        spanLabel = ip
      }
      trace({
        traceId: headers.traceparent && headers.traceparent.split('-')[1],
        tracestate: headers.tracestate,
        headers: headersOut,
        spanLabel,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        method: req.method
      }, (spanId) => next())
    } // END express
  } // END middleware
}

module.exports = { createMiddleware };
