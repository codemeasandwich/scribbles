/**
 * @file Template string parsing for log messages
 */

/**
 * Parses template string fragments and values into a formatted string
 * @param {string[]} fragments - Template literal string fragments
 * @param {...*} vals - Interpolated values
 * @returns {string} The formatted string with type annotations
 */
function parceStringVals(fragments, ...vals) {
  return fragments.map((txt, index) => {
    if (index >= vals.length) {
      return txt
    }
    let input = vals[index]
    if ("function" === typeof input) {
      input = `:ƒ(){..}`
    } else if (input instanceof Error) {
      input = `:${input.name}-Error()`
    } else if (input instanceof Date) {
      input = `:Date(${input.toJSON()})`;
    } else if (Buffer.isBuffer(input)) {
      input = `:Buffer[..]`;
    } else if (input instanceof Map) {
      input = `:Map{..}`;
    } else if (input instanceof Set) {
      input = `:Set[..]`;
    } else if (Array.isArray(input)) {
      input = `:[..]`;
    } else if (input !== null && 'object' === typeof input) {
      input = `:{..}`;
    } else if ("string" === typeof input) {
      input = `:"${input}"`
    } else {
      input = ":" + String(input)
    }
    return txt + input
  }).join("")
}// END parceStringVals

module.exports = { parceStringVals };
