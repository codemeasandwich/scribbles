/**
 * @file Function-level JSDoc checker
 * Validates that functions have proper JSDoc documentation.
 */

const { extractJSDocBefore, parseParams, hasReturnsTag, parseFunctionParams } =
  require("./parsers.js");
const { hasReturnValue, findClosingBrace } = require("./utils.js");

/**
 * Checks JSDoc for a single function
 * @param {object} func - Function info object
 * @param {string[]} lines - Array of file lines
 * @param {string} content - Full file content
 * @returns {string[]} Array of error messages
 */
function checkFunctionJSDoc(func, lines, content) {
  const errors = [];
  const { lineNumber, funcName, paramsStr, index } = func;

  // Look for JSDoc ending on the line before the function
  let jsdocEndLine = lineNumber - 2; // 0-indexed, line before function

  // Skip blank lines and find JSDoc
  while (jsdocEndLine >= 0 && lines[jsdocEndLine].trim() === "") {
    jsdocEndLine--;
  }

  // Check if we have a JSDoc block ending here
  const jsdoc =
    lines[jsdocEndLine]?.includes("*/")
      ? extractJSDocBefore(lines, jsdocEndLine)
      : null;

  if (!jsdoc) {
    errors.push(
      `Line ${lineNumber}: Function '${funcName}' is missing JSDoc comment`,
    );
    return errors;
  }

  // Check parameter documentation
  checkParams(errors, lineNumber, funcName, paramsStr, jsdoc.text);

  // Check @returns tag if function has return value
  checkReturns(errors, lineNumber, funcName, index, content, jsdoc.text);

  return errors;
}

/**
 * Checks that function parameters are documented
 * @param {string[]} errors - Array to push errors to
 * @param {number} lineNumber - Line number of function
 * @param {string} funcName - Function name
 * @param {string} paramsStr - Function parameters string
 * @param {string} jsdocText - JSDoc text
 */
function checkParams(errors, lineNumber, funcName, paramsStr, jsdocText) {
  const expectedParams = parseFunctionParams(`(${paramsStr})`);
  const docParams = parseParams(jsdocText);
  const filteredExpected = expectedParams.filter((p) => p !== null);

  // Check for missing @param tags
  for (const param of filteredExpected) {
    if (!docParams.includes(param)) {
      errors.push(
        `Line ${lineNumber}: Function '${funcName}' - @param '${param}' missing in JSDoc`,
      );
    }
  }

  // Check for extra @param tags
  for (const docParam of docParams) {
    if (!filteredExpected.includes(docParam) && filteredExpected.length > 0) {
      const isDestructured =
        paramsStr.includes("{") || paramsStr.includes("[");
      if (!isDestructured) {
        errors.push(
          `Line ${lineNumber}: Function '${funcName}' - @param '${docParam}' not in function signature`,
        );
      }
    }
  }
}

/**
 * Checks that function return value is documented
 * @param {string[]} errors - Array to push errors to
 * @param {number} lineNumber - Line number of function
 * @param {string} funcName - Function name
 * @param {number} index - Index in content where function starts
 * @param {string} content - Full file content
 * @param {string} jsdocText - JSDoc text
 */
function checkReturns(errors, lineNumber, funcName, index, content, jsdocText) {
  const braceIndex = content.indexOf("{", index);
  if (braceIndex === -1) return;

  const closeBrace = findClosingBrace(content, braceIndex);
  if (closeBrace === -1) return;

  const body = content.slice(braceIndex, closeBrace + 1);
  if (hasReturnValue(body) && !hasReturnsTag(jsdocText)) {
    errors.push(
      `Line ${lineNumber}: Function '${funcName}' returns a value but has no @returns tag`,
    );
  }
}

module.exports = { checkFunctionJSDoc };
