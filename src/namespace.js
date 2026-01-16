/**
 * @file CLS namespace management for trace correlation
 */
const cls = require('@ashleyw/cls-hooked');

let lastActiveSpan;
const inUse = {};

/**
 * Gets or creates the current CLS namespace for trace correlation
 * @returns {Function} A function to get/set values in the namespace
 */
function myNamespace() {

  /**
   * Gets or sets a value in the trace namespace
   * @param {string} key - The key to get or set
   * @param {*} [value] - The value to set (if provided)
   * @returns {*} The value for the key, or undefined
   */
  let correlaterValue = () => undefined;

  // check to see if we are still in the same namespace
  if (lastActiveSpan
    && process.namespaces[lastActiveSpan]
    && process.namespaces[lastActiveSpan].active) {
    const trace = cls.getNamespace(lastActiveSpan)
    correlaterValue = function correlaterValue(key, value) {
      return 1 === arguments.length ? trace.get(key) : trace.set(key, value)
    }
  } else {
    // check to see if we are still in a differint namespace
    Object.keys(process.namespaces)
      .forEach(spanId => {

        // find the active namespace
        if (!!process.namespaces[spanId].active) {
          const trace = cls.getNamespace(spanId)
          correlaterValue = function correlaterValue(key, value) {
            return 1 === arguments.length ? trace.get(key) : trace.set(key, value)
          }
          lastActiveSpan = spanId;
        } else if (0 === process.namespaces[spanId]._contexts.size && inUse[spanId]) {
          // if used + no more context => garbage collecte
          cls.destroyNamespace(spanId);
          delete inUse[spanId];
        } else if (!inUse[spanId]) {
          // add to the inuse if new
          inUse[spanId] = true
        }

      })// END namespaces.forEach

  } // END else

  return correlaterValue

} // END myNamespace

module.exports = { myNamespace };
