/**
 * @file Helper utilities for scribbles logging library
 */
const appDir = require('../appDir');
const sourceMapSupport = require('source-map-support');
//=====================================================
//================================================ Util
//=====================================================

/**
 * Deep merge two objects, concatenating arrays and recursively merging nested objects
 * @param {object} target - The target object to merge into
 * @param {object} source - The source object to merge from
 * @returns {object|boolean} The merged object, or false if inputs are not objects
 */
function deepMerge(target, source) {
  if (typeof target === 'object' && undefined === source) return target;
  if (typeof target !== 'object' || typeof source !== 'object') return false; // target or source or both ain't objects, merging doesn't make sense
  for (var prop in source) {
    if (!source.hasOwnProperty(prop)) continue; // take into consideration only object's own properties.
    if (prop in target) { // handling merging of two properties with equal names
      if (typeof target[prop] !== 'object') {
        target[prop] = source[prop];
      } else {
        if (typeof source[prop] !== 'object') {
          target[prop] = source[prop];
        } else {
          if (target[prop].concat && source[prop].concat) { // two arrays get concatenated
            target[prop] = target[prop].concat(source[prop]);
          } else { // two objects get merged recursively
            target[prop] = deepMerge(target[prop], source[prop]);
          }
        }
      }
    } else { // new properties get added to target
      target[prop] = source[prop];
    }
  }
  return target;
}

//++++++++++++++++++++++++++++++++++++++++++ getSource
//++++++++++++++++++++++++++++++++++++++++++++++++++++

/**
 * Extract source file location from a stack trace, resolving source maps when available
 * @param {string} stack - The stack trace string from an Error object
 * @returns {object} Object containing file, line, col, path, type, and args
 */
function getSource(stack) {
  const rawLines = stack.split('\n')
  const originFile = (rawLines[2] || rawLines[1]).split('/');
  const file = decodeURIComponent(originFile[originFile.length - 1].split(':')[0]);
  const line = originFile[originFile.length - 1].split(':')[1];
  const col = originFile[originFile.length - 1].split(':')[2];
  let path = originFile.splice(1).join('/')
  path = path[path.length - 1] === ')' ? path.substring(0, path.length - 1) : path;

  // Use source-map-support to resolve original file paths from source maps
  const mappedPosition = sourceMapSupport.mapSourcePosition({
    source: '/' + path,
    line: parseInt(line),
    column: parseInt(col) - 1  // Convert from 1-indexed to 0-indexed
  });

  // Use mapped values if source map resolution succeeded, otherwise use original
  const resolvedPath = mappedPosition.source !== '/' + path ? mappedPosition.source : path;
  const resolvedLine = mappedPosition.source !== '/' + path ? mappedPosition.line : parseInt(line);
  const resolvedCol = mappedPosition.source !== '/' + path ? mappedPosition.column + 1 : col;

  // Clean up path relative to appDir
  let finalPath = resolvedPath;
  if (finalPath.startsWith('/')) {
    finalPath = finalPath.substring(1);
  }
  finalPath = finalPath.startsWith(appDir) ? finalPath.substr(appDir.length + 1) : "/" + finalPath;

  const finalFile = decodeURIComponent(resolvedPath.split('/').pop().split(':')[0]);

  return {
    type: originFile[0].split('at').pop().trim().split(" ")[0],
    file: finalFile,
    line: resolvedLine,
    col: resolvedCol,
    path: finalPath,
    args: []  // Required for scribble() to use from.args.map()
  } // END return
} // END getSource

module.exports = { deepMerge, getSource }
