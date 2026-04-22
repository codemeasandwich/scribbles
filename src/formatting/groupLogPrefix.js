/**
 * @file Group bracket and colored-tree prefix for `body.toString` in `scribble.js`
 *
 * Domain: when `pretty.groupBrackets` is on, log lines for group markers and
 * content inside groups are prefixed for a tree-shaped terminal layout. Optional
 * 24-bit per-depth color uses `formatColoredGroupBracketPrefix` from `colors.js`.
 */
const {
  colorize,
  formatColoredGroupBracketPrefix,
  groupBracketTailOpen,
  ANSI
} = require('./colors');

/**
 * Build plain and/or colored prefixes for a group-related log line (stdOut only).
 *
 * @param {Object} config - Scribbles config (pretty, colors, colorScheme, colorblindMode).
 * @param {string} level - Log level.
 * @param {number} groupLevel - Nesting depth from `body.context.groupLevel`.
 * @param {string} compiledLine - Already compiled template body line.
 * @param {string} [levelColor] - Named color from `colorScheme[level]` when not using the tree.
 * @returns {string} Full line to write to stdOut
 */
function formatGroupLogLineForStdOut(
  config,
  level,
  groupLevel,
  compiledLine,
  levelColor
) {
  let groupPrefix = '';
  let treePrefixColored = null;
  const useColoredTree =
    config.pretty &&
    config.pretty.groupBrackets &&
    config.colors &&
    config.colorScheme;

  if (groupLevel > 0 || ['group', 'groupCollapsed', 'groupEnd'].includes(level)) {
    if (config.pretty && config.pretty.groupBrackets) {
      if (useColoredTree) {
        treePrefixColored = formatColoredGroupBracketPrefix(
          level,
          groupLevel,
          !!config.colorblindMode
        );
      } else if (level === 'group' || level === 'groupCollapsed') {
        groupPrefix = '⎜'.repeat(Math.max(0, groupLevel - 1)) + '┌ ';
      } else if (level === 'groupEnd') {
        groupPrefix = '⎜'.repeat(groupLevel) + '└ ';
      } else {
        groupPrefix = '⎜'.repeat(groupLevel) + ' '.repeat(Math.max(1, groupLevel));
      }
    } else {
      if (!['group', 'groupCollapsed', 'groupEnd'].includes(level)) {
        groupPrefix = '  '.repeat(groupLevel);
      }
    }
  }

  if (treePrefixColored !== null) {
    if (level === 'group' || level === 'groupCollapsed' || level === 'groupEnd') {
      const tailOpen = groupBracketTailOpen(
        level,
        groupLevel,
        !!config.colorblindMode
      );
      return treePrefixColored + tailOpen + compiledLine + ANSI.reset;
    }
    const lc = levelColor;
    return treePrefixColored + (lc ? colorize(compiledLine, lc) : compiledLine);
  }

  let formattedOutput = groupPrefix + compiledLine;
  if (config.colors && config.colorScheme) {
    const lc = levelColor;
    if (lc) {
      formattedOutput = colorize(formattedOutput, lc);
    }
  }
  return formattedOutput;
}

module.exports = { formatGroupLogLineForStdOut };
