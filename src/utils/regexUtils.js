/**
 * @file Regular expression utility functions
 */

/**
 * Checks if a string is a valid regex pattern
 * @param {string} s - The string to test
 * @returns {boolean} True if the string is a valid regex pattern
 */
function isValidRegex(s) {
  try {
    const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
    return m ? !!new RegExp(m[2], m[3])
      : false;
  } catch (e) {
    return false
  }
}

/**
 * Converts a string pattern to a RegExp object
 * @param {string} s - The string pattern to convert
 * @returns {RegExp} The compiled regular expression
 */
function stringToRegex(s) {
  const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
  return m ? new RegExp(m[2], m[3]) : new RegExp(s);
}

module.exports = { isValidRegex, stringToRegex };
