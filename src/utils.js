/**
 * @file Utility functions for trace state parsing
 */
const crypto = require('crypto');

/**
 * Parses a tracestate header string into an array of key/value objects
 * @param {string} tracestate - The tracestate header value
 * @returns {Array<{key: string, value: string}>} Array of parsed key/value pairs
 */
function parceTracestate(tracestate){
  return tracestate.split(',')
            .reduce((accumulator, currentValue)=>{
                  const [key, value] = currentValue.split('=')
                  accumulator.push({key,value})
                  return accumulator
              },[])
} // END parceTracestate

/**
 * Generates a short hash from a tracestate array
 * @param {Array} tracestateArray - Array of tracestate entries with key/value objects
 * @returns {string} A 16-character hex hash
 */
function hashTracestate(tracestateArray) {
  const str = tracestateArray.map(({key, value}) => `${key}=${value}`).join(',');
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
} // END hashTracestate

/**
 * Checks if a value is a tracestate hash (h: prefix + 16 hex chars)
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a tracestate hash
 */
function isTracestateHash(value) {
  return typeof value === 'string' && value.startsWith('h:') && value.length === 18;
} // END isTracestateHash

module.exports = { parceTracestate, hashTracestate, isTracestateHash }
