

# Scribbles

**scribbles** is a node console out formatter inspired by [tracer](https://www.npmjs.com/package/tracer)

[![npm version](https://badge.fury.io/js/scribbles.svg)](https://www.npmjs.com/package/scribbles) [![Buy me a coffee](https://img.shields.io/badge/buy%20me-a%20coffee-orange.svg)](https://www.buymeacoffee.com/codemeasandwich)

Scribbles has some nice features.

* customised output
* correlated logs
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

## Logging signature

```
scribble[logLevel](message/err,[values,[additional error message]])
```

## How to customise log output

There is a `config` that takes a configuration object.

* **standerOut** [function] - *defaults: `console`*
  * Redirect the string output of the log entry
* **dataOut**  [function]
  * A called back to receive an object representing the log entry
* **mode** [string] - *default: 'dev'*
  * Can use NODE_ENV from environment variables
* **format** [string] - *defaults: "{repo}:{mode}:{branch} {time} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}"*
  * git values:
    * `repo`: The gif repository name as it appears on the origin
    * `mode`: The environment your application is running in. *e.g. local, dev, prod etc..*
    * `branch`: The current git branch
    * `gitHash`: Short git hash of current commit
  * correlation:  
    * `correlationName`: The correlation name
    * `correlationId`: The correlation id. Automatically generated
  * info:
    * `time`: Time of logging
    * `logLevel`: The logging level
  * context:
    * `fileName`: The file name
    * `lineNumber`: The line in the file
    * `exeType`: The context where the log was called
  * input:  
    * `message`: Message to log
    * `value`: Values to log
    * `stackTrace`: The stack trace if an Error object was passed
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

## How to correlate logs

When trying to debug a problem. A stacktrace will give you limited information. You can see where the Error occurred and a message. However you cannot see the values as it flow through your system.

Using the correlation system. Each log entry will be able to be connected, as it flows through your system.

To use the correlation system you only need to pass in a root function that acts as the start of the execution. Everything that is executed within this function will be matched to the same correlation ID, and name if provided.

## correlate signature

```
scribbles.correlate([correlationName,]next_fu,[args_for_next_fn])
```

The correlation name can be used when wanting to correlate across microservices. In this pattern a shared Ids is normally pasted in the `header` of the request. You can set this as the correlationName so your logs will reflect this distributed Id.

Example:

*index.js*
```js
scribbles.config({format:`[{correlationName} {correlationId}] {message}`})

function incoming(dataIn){
  scribbles.correlate("eventstream",workToDo,[dataIn])
}
```

*eventstream.js*
```js
function workToDo(dataIn){
  // ...
  scribble.log("Doing something with the eventstream")
  // [eventstream A4D87154] Doing something with the eventstream
  // ...
}
```

---

Todo:

* Add tests
* Allow for coloured logs
* support console.group
