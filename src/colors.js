/**
 * @file ANSI color utilities for terminal output
 */

// ANSI escape codes
const ANSI = {
  reset: '\x1b[0m',
  // Standard colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m'
};

// Default color scheme mapping log levels to colors
const defaultColorScheme = {
  error: 'red',
  warn: 'yellow',
  log: 'cyan',
  info: 'green',
  debug: 'gray',
  // Group colors
  group: 'magenta',
  groupCollapsed: 'magenta',
  groupEnd: 'magenta',
  // Timer colors
  timer: 'blue',
  timerEnd: 'blue',
  // Status
  status: 'brightCyan',
  statusX: 'brightCyan'
};

// Colorblind-friendly scheme (uses patterns/intensity instead of red/green)
const colorblindScheme = {
  error: 'brightRed',
  warn: 'brightYellow',
  log: 'white',
  info: 'brightCyan',
  debug: 'dim',
  group: 'brightMagenta',
  groupCollapsed: 'brightMagenta',
  groupEnd: 'brightMagenta',
  timer: 'brightBlue',
  timerEnd: 'brightBlue',
  status: 'cyan',
  statusX: 'cyan'
};

/**
 * Wraps text with ANSI color codes
 * @param {string} text - Text to colorize
 * @param {string} colorName - Color name from ANSI object
 * @returns {string} Colorized text with reset code appended
 */
function colorize(text, colorName) {
  const code = ANSI[colorName];
  if (!code) return text;
  return code + text + ANSI.reset;
}

/**
 * Checks if colors should be enabled based on environment
 * @returns {boolean}
 */
function shouldEnableColors() {
  // Respect NO_COLOR environment variable (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) return false;

  // Respect FORCE_COLOR environment variable
  if (process.env.FORCE_COLOR !== undefined) return true;

  // Check if stdout is a TTY (terminal)
  if (process.stdout && !process.stdout.isTTY) return false;

  // Check for CI environments that support color
  if (process.env.CI) return true;

  return true;
}

module.exports = {
  ANSI,
  defaultColorScheme,
  colorblindScheme,
  colorize,
  shouldEnableColors
};
