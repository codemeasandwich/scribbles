/**
 * @file Scribbles - A structured logging library for Node.js with tracing support
 */
require('./src/checkNodeVer')
require('source-map-support').install()
var sVer = require('./package.json').version;

const os = require('os');
const fs = require("fs");

const config = require('./src/config');
const hijacker = require('./src/hijacker');
const gitValues = require('./src/getGitStatus');
const { createScribble } = require('./src/scribble');
const { myNamespace } = require('./src/namespace');
const { createTrace } = require('./src/trace');
const { createMiddleware } = require('./src/middleware');
const { createConfig } = require('./src/scribblesConfig');

let packageJson_scribbles = {}

if (fs.existsSync(__dirname + '/../../package.json')) {
  const packageJson = require('../../package.json');
  if (packageJson.scribbles) {
    packageJson_scribbles = packageJson.scribbles
  }
}

const hostname = os.hostname();
const pValues = {
  pTitle: process.title,
  pid: process.pid,
  ppid: process.ppid || 0,
  user: process.env.USER,
  vNode: process.version
};

const cuidPrefixRaw = ((process.ppid ? process.ppid.toString(16).slice(-2)
  : Math.floor(Math.random() * 15).toString(16) +
  Math.floor(Math.random() * 15).toString(16))
  + process.pid.toString(16).slice(-2)
  + Math.floor(Math.random() * 15).toString(16))

let cuidPrefixValue = gitValues.hash.slice(-2) + cuidPrefixRaw
const cuidPrefix = {
  get: () => cuidPrefixValue,
  set: (val) => { cuidPrefixValue = val }
}

const traceCount = {
  value: 1,
  increment: function() { this.value++ }
}

const scribbles = {}

const scribble = createScribble({
  sVer,
  gitValues,
  hostname,
  cuidPrefix,
  pValues,
  scribbles
});

const trace = createTrace({
  cuidPrefix,
  traceCount,
  gitValues,
  myNamespace
});
scribbles.trace = trace

scribbles.middleware = createMiddleware(trace);

// Capture reserved function names before adding log levels
// This includes: trace, middleware (and soon: config, status, timer, timerEnd)
const resirvedFnNames = Object.keys(scribbles);

const scribblesConfig = createConfig({
  scribbles,
  scribble,
  gitValues,
  cuidPrefix,
  cuidPrefixRaw,
  resirvedFnNames
});
scribbles.config = scribblesConfig

// Add config to reserved names since it was just added
resirvedFnNames.push('config');
// Add special logging functions to reserved names (issue #24)
resirvedFnNames.push('status');
resirvedFnNames.push('timer');
resirvedFnNames.push('timerEnd');
// Add group functions to reserved names (issue #13)
resirvedFnNames.push('group');

scribbles.config(packageJson_scribbles)

if (config.hijack !== false) {
  hijacker(scribbles, config)
}

module.exports = scribbles;
