/**
 * @file File-level JSDoc checker
 * Validates that files start with proper JSDoc documentation.
 */

/**
 * Checks file-level JSDoc requirements
 * @param {string} content - The file content
 * @returns {string[]} Array of error messages
 */
function checkFileJSDoc(content) {
  const errors = [];
  const trimmedContent = content.trimStart();

  // Check if file starts with JSDoc (allow shebang before)
  if (!trimmedContent.startsWith("/**")) {
    const lines = trimmedContent.split("\n");
    const firstNonShebang = lines.findIndex(
      (l) => !l.startsWith("#!") && l.trim() !== "",
    );

    if (
      firstNonShebang === -1 ||
      !lines[firstNonShebang].trim().startsWith("/**")
    ) {
      errors.push(
        `Line 1: File must start with a JSDoc comment (/** @file ... */)`,
      );
    }
  }

  // Check for @file or @fileoverview tag in opening JSDoc
  const firstJSDocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  if (firstJSDocMatch && !/@file(overview)?\b/.test(firstJSDocMatch[0])) {
    errors.push(
      `Line 1: File-level JSDoc should include @file or @fileoverview tag`,
    );
  }

  return errors;
}

module.exports = { checkFileJSDoc };
