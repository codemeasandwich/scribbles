

# Scribbles

**scribbles** is a console out formatter inspired by [tracer](https://www.npmjs.com/package/tracer)

[![npm version](https://badge.fury.io/js/scribbles.svg)](https://www.npmjs.com/package/scribbles) [![Buy me a coffee](https://img.shields.io/badge/buy%20me-a%20coffee-orange.svg)](https://www.buymeacoffee.com/codemeasandwich)

Scribbles has some nice features.

* customised output
* more insight
  * git repository name
  * current branch
  * last commit hash
  * environment: local / dev / prod

## How to install

```
npm install --save scribbles
```

## How to use

```js
const scribble = require('scribbles');

scribble.log("hello world")

// myRepo:local:master 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 (Object.<anonymous>) hello world
```

## How to customise

There is a `config` that takes a configuration object.

* **standerOut** [function] - *defaults: `console`*
  * Redirect the string output of the log entry
* **dataOut**  [function]
  * A called back to receive an object representing the log entry
* **mode** [string] - *default: 'dev'*
  * Can use NODE_ENV from environment variables
* **format** [string] - *defaults: "{repo}:{mode}:{branch} {timeIso} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}"*
* **time** [string] - *defaults: "YYYY-MM-DDTHH:mm:ss.SSS"*
  * [Time formatting is provided by Moment.js](https://momentjs.com/docs/#/displaying/format/)
* **logLevel** - *defaults: "log"*
  * Report on this level and higher
  * Can use LOG_LEVEL from environment variables
* **levels** - *defaults: `["error", "warn", "log", "info", "debug"]`*
  * Messages will be filtered from the `logLevel` to the start of the array

Example:
```js
scribble.config({
   mode:'test-runner',
   format:'{timeIso} [{mode}#{gitHash}] {message}'
})

scribble.log("hello world")

// 2022-06-27T16:24:06.473 [test-runner#3d608bf] hello world
```

---

Todo:

* Allow for coloured logs
* support correlation IDs
* support console.group
