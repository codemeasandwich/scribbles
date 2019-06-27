

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

scribble("hello world")

// myRepo:local:master 2022-06-27T16:24:06.473Z #3d608bf <log> index.js:174 (Object.<anonymous>) hello world
```

## How to customise

There is a `config` that takes a configuration object.

* **sendTo**  [function]
  * A called back to receive an object representing the log entry
* **mode** [string] - *default: 'dev'*
* **standerOut** [function] - *defaults: `console`*
  *  Redirect the string output of the log entry
* **format** [string] - *defaults: "{repo}:{mode}:{branch} {timeIso} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}"*

Example:
```js
scribble.config({
   mode:'live',
   format:'{timeIso} [{mode}#{gitHash}] {message}'
})

scribble("hello world")

// 2022-06-27T16:24:06.473Z [live#3d608bf] hello world
```

---

Todo:

* Customising Time format
* Default environment based on environment variables
* Allow log level to be set
* Suppress logs based on log level
* Allow for coloured logs
