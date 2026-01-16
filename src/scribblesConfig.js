/**
 * @file Scribbles configuration and log level setup
 */
const compile = require("string-template/compile");
const { performance } = require('perf_hooks');

const config = require('./config');
const { getSource } = require('./helpers');

/**
 * Creates the config function for scribbles
 * @param {Object} deps - Dependencies
 * @param {Object} deps.scribbles - The scribbles object to configure
 * @param {Function} deps.scribble - The core scribble function
 * @param {Object} deps.gitValues - Git info
 * @param {Object} deps.cuidPrefix - Object with get/set for prefix
 * @param {string} deps.cuidPrefixRaw - Raw prefix string
 * @param {string[]} deps.resirvedFnNames - Reserved function names
 * @returns {Function} The config function
 */
function createConfig(deps) {
  const { scribbles, scribble, gitValues, cuidPrefix, cuidPrefixRaw, resirvedFnNames } = deps;

  /**
   * Configures scribbles with the given options
   * @param {Object} [opts] - Configuration options
   */
  return function scribblesConfig(opts = {}) {

    if (opts && opts.levels) {
      opts.levels.forEach((logLevel) => {
        if (-1 < resirvedFnNames.indexOf(logLevel)) {
          throw new Error('You cant use "' + logLevel + '" as a log level!')
        }
      }) // END forEach
    } // END if

    // Clean config - remove old log level functions
    config.levels.forEach((logLevel) => {
      delete scribbles[logLevel];
    })

    // Overwrite options
    const defaultPretty = config.pretty = config.pretty || {}

    Object.assign(config, opts);
    Object.assign(config.pretty, defaultPretty, opts.pretty || {});

    // Setup pretty printing
    config.pretty = config.pretty || {}

    if (undefined === config.pretty.inlineCharacterLimit) {
      if ("dev" === config.mode.toLowerCase()) {
        config.pretty.inlineCharacterLimit = process.stdout && process.stdout.columns || 80
        if (undefined === config.pretty.indent) {
          config.pretty.indent = "  "
        }
      } else {
        config.pretty.inlineCharacterLimit = Number.POSITIVE_INFINITY
      }
    }

    if (undefined === config.pretty.singleQuotes) {
      config.pretty.singleQuotes = false
    }

    // Setup git info from environment
    if (config.gitEnv) {
      if (config.gitEnv.hash
        && process.env[config.gitEnv.hash]) {
        gitValues.hash = process.env[config.gitEnv.hash].substr(0, 7)
      }
      if (config.gitEnv.repo
        && process.env[config.gitEnv.repo]) {
        gitValues.repo = process.env[config.gitEnv.repo]
      }
      if (config.gitEnv.branch
        && process.env[config.gitEnv.branch]) {
        gitValues.branch = process.env[config.gitEnv.branch]
      }
    } // END packageJson_scribbles.gitEnv

    cuidPrefix.set(gitValues.hash.slice(-2) + cuidPrefixRaw)

    // Setup log levels
    config.logRange = config.levels.indexOf(config.logLevel)

    config.levels.forEach((logLevel, index) => {
      if (index <= config.logRange) {
        scribbles[logLevel] = scribble.bind(null, null, logLevel)
        scribbles[logLevel].at = function at(from, label, value, error) {
          const args = Array.prototype.slice.call(arguments)
          args.splice(1, 0, logLevel);
          return scribble.apply(null, args)
        }
      } else {
        scribbles[logLevel] = () => { }
        scribbles[logLevel].at = () => { }
      }
    }) // END config.levels.forEach

    scribbles.status = scribble.bind(null, null, "statusX")
    scribbles.status.at = function at(from, label, value, error) {
      const args = Array.prototype.slice.call(arguments)
      args[1] = "statusX"
      return scribble.apply(null, args)
    }

    const times = {}

    /**
     * Formats and logs timer output with elapsed and increment times
     * @param {Object} from - Source location info
     * @param {string} level - Log level (timer or timerEnd)
     * @param {string} tag - Timer tag identifier
     * @param {string} [message] - Optional message
     * @returns {Object} The structured log body
     */
    function timePrint(from, level, tag, message) {
      tag = tag + ""
      const timeAr = times[tag]
      let elapsed = 0, increment = 0
      if (1 < timeAr.length) {
        const [a, b] = timeAr.slice(-2)
        increment = b - a
        elapsed = timeAr[timeAr.length - 1] - timeAr[0]
      }
      return scribble.call({ originalMessage: message },
        from,
        level,
        `${tag}${message ? `:${message}` : ""} (+${increment.toFixed(2)}ms|${elapsed.toFixed(2)}ms)`,
        { tag, elapsed, increment })
    } // END timePrint

    scribbles.timer = (tag, message) => {
      tag = tag + ""
      const t = times[tag] || []
      t.push(Math.round(performance.now() * 100) / 100)
      times[tag] = t
      return timePrint(getSource(new Error().stack), "timer", tag, message)
    } // END timeLog

    scribbles.timerEnd = (tag, message) => {
      tag = tag + ""
      if (!times[tag]) {
        throw new Error(`Timer '${tag}' does not exist`)
      }
      times[tag].push(performance.now())
      const result = timePrint(getSource(new Error().stack), "timerEnd", tag, message)
      delete times[tag]
      return result
    }// END timeEnd

    config.__compile = compile(config.format)

  } // END scribblesConfig
}

module.exports = { createConfig };
