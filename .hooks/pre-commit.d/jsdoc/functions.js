/**
 * @file Function finder module for JSDoc validator
 * Finds function declarations in JavaScript source code.
 */

/**
 * Patterns to find function declarations
 * @type {RegExp[]}
 */
const FUNCTION_PATTERNS = [
  /^(\s*)(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/gm,
  /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/gm,
  /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(\w+)\s*=>/gm,
  /^(\s*)(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm,
  /^(\s*)module\.exports\s*=\s*(?:async\s+)?function\s*(\w*)\s*\(([^)]*)\)/gm,
  /^(\s*)exports\.(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/gm,
];

/**
 * Keywords that should not be treated as function names
 * @type {Set<string>}
 */
const SKIP_NAMES = new Set([
  "function",
  "if",
  "for",
  "while",
  "switch",
  "catch",
]);

/**
 * Checks if a match is a getter or setter
 * @param {string} matchStr - The matched string
 * @returns {boolean}
 */
function isGetterSetter(matchStr) {
  return /\b(get|set)\s+\w+\s*\(/.test(matchStr);
}

/**
 * Finds all function declarations in the given content
 * @param {string} content - The file content
 * @returns {Array<{lineNumber: number, funcName: string, paramsStr: string, index: number}>}
 */
function findFunctions(content) {
  const functionLocations = [];

  for (const pattern of FUNCTION_PATTERNS) {
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
      const beforeMatch = content.slice(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      const funcName = match[2] || "anonymous";
      const paramsStr = match[3] || "";

      if (isGetterSetter(match[0])) continue;
      if (SKIP_NAMES.has(funcName)) continue;

      functionLocations.push({
        lineNumber,
        funcName,
        paramsStr,
        fullMatch: match[0],
        index: match.index,
      });
    }
  }

  return deduplicateByLine(functionLocations);
}

/**
 * Removes duplicate functions on the same line
 * @param {Array<{lineNumber: number}>} functions - Array of function info
 * @returns {Array<{lineNumber: number}>}
 */
function deduplicateByLine(functions) {
  const seenLines = new Set();
  return functions.filter((f) => {
    if (seenLines.has(f.lineNumber)) return false;
    seenLines.add(f.lineNumber);
    return true;
  });
}

module.exports = { findFunctions };
