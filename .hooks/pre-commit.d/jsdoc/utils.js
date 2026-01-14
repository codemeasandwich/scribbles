/**
 * @file JSDoc validator utility functions
 * String and brace matching utilities for JavaScript parsing.
 */

/**
 * Checks if a function body likely returns a value
 * @param {string} body - The function body
 * @returns {boolean} True if function returns a value
 */
function hasReturnValue(body) {
  // Remove strings and comments to avoid false positives
  const cleaned = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "")
    .replace(/'(?:[^'\\]|\\.)*'/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '""');

  // Check for return with a value (not just "return;" or "return}")
  return /return\s+[^;\s}]/.test(cleaned);
}

/**
 * Finds the matching closing brace for a function body
 * @param {string} content - File content
 * @param {number} startIndex - Index of opening brace
 * @returns {number} Index of closing brace or -1
 */
function findClosingBrace(content, startIndex) {
  let depth = 1;
  let i = startIndex + 1;
  let inString = false;
  let stringChar = "";

  while (i < content.length && depth > 0) {
    const char = content[i];
    const prev = content[i - 1];

    if (inString) {
      if (char === stringChar && prev !== "\\") {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'" || char === "`") {
        inString = true;
        stringChar = char;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      }
    }
    i++;
  }

  return depth === 0 ? i - 1 : -1;
}

module.exports = {
  hasReturnValue,
  findClosingBrace,
};
