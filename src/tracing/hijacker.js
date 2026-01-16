/**
 * @file HTTP/HTTPS request hijacker for automatic trace header injection
 */
//=====================================================
//====================================== forwardHeaders
//=====================================================
const http = require('http')
const https = require('https')
const reqHttp = http.request.bind(http)
const reqHttps = https.request.bind(https)

/**
 * Wraps http.request and https.request to inject trace headers
 * @param {object} scribbles - The scribbles instance
 * @param {object} config - Configuration object with headers and headersMapping
 * @returns {void}
 */
function hijacker(scribbles, config) {

  /**
   * Creates a wrapper function for http/https request
   * @param {Function} originalRequest - The original request function to wrap
   * @returns {Function} Wrapped request function that injects trace headers
   */
  function createWrapper(originalRequest) {
    return function requestWrapper(url, options, callback) {

      if (!config || (!config.headers && !config.headersMapping)) {
        return originalRequest(url, options, callback)
      }

      if ('function' === typeof options) {
        callback = options
        options = {}
      }

      if ('object' === typeof url) {
        options = url;
        url = null;
      }

      options.headers = scribbles.trace.headers(options.headers || {})

      if (url) {
        return originalRequest(url, options, callback)
      } else {
        return originalRequest(options, callback)
      }
    }
  }

  http.request = createWrapper(reqHttp)
  https.request = createWrapper(reqHttps)
}

module.exports = hijacker
