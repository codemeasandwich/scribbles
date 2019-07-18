

# Scribbles

**scribbles** is a log and tracing lib for NodeJs

[![npm version](https://badge.fury.io/js/scribbles.svg)](https://www.npmjs.com/package/scribbles) [![Buy me a coffee](https://img.shields.io/badge/buy%20me-a%20coffee-orange.svg)](https://www.buymeacoffee.com/codemeasandwich)

### If you like it, [★ it on github](https://github.com/codemeasandwich/scribbles) and share  :beers:

Scribbles has some nice features.

* [customised output](#how-to-customise-log-output)
* [tracing logs](#how-to-trace-logs) following the [w3c standard](https://www.w3.org/TR/trace-context/)
* more insight
  * git repository name
  * current branch
  * last commit hash
  * environment: local / dev / prod

## How to install

You should be running **node > v8.2.1**

```
npm install --save scribbles
```

```
yarn add scribbles
```

## How to use

```js
const scribbles = require('scribbles');

scribbles.log("hello world")

// myRepo:local:master [ ] 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 (Object.<anonymous>) hello world
```

## Logging signature

```
scribbles[logLevel](message/err,[values,[additional error message]])
```

## How to customise log output

There is a `config` that takes a configuration object.

* **stdOut** [function] - *defaults: `console`*
  * Redirect the string output of the log entry
* **dataOut**  [function]
  * A callback to receive an object representing the log entry
* **mode** [string] - *default: 'dev'*
  * Can use NODE_ENV from environment variables
* **format** [string] - *defaults: "{repo}:{mode}:{branch} [{spanLabel} {spanId}] {time} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}"*
  * git:
    * `repo`: The git repository name as it appears on the origin
    * `branch`: The current git branch
    * `gitHash`: Short git hash of current commit
  * trace:  
    * `traceId`: Used for distributed tracing in microservices [**[more](https://www.w3.org/TR/trace-context/#trace-id)**]
    * `spanId`: the execution of a client call [**[more](https://www.w3.org/TR/trace-context/#parent-id)**]
    * `span64`: the base64 encoded version of `spanId`
    * `spanLabel`: A label to identify this trace
    * `tracestate`: Ordered list of key/value hops
  * info:
    * `time`: Time of logging
    * `logLevel`: The logging level for this entry
    * `hostname`: The hostname of the operating system.
    * `mode`: The environment your application is running in. *e.g. local, dev, prod etc..*
  * context:
    * `fileName`: The file name
    * `lineNumber`: The line in the file
    * `exeType`: The context where the log was called
  * input:  
    * `message`: Message to log
    * `value`: Values to log
    * `stackTrace`: The stack trace if an Error object was passed
  * [process](https://nodejs.org/api/process.html):
    * `pTitle`: the current process title (i.e. returns the current value of ps)
    * `pid`: the PID of the process
    * `ppid`:  the PID of the current parent process.
    * `user`: node the name of the user who started node,
    * `vNode`: version of node,
    * `arch`: platform architecture. e.g "x64"
    * `platform`: the operating system platform
* **time** [string] - *defaults: "YYYY-MM-DDTHH:mm:ss.SSS"*
  * [Time formatting is provided by Moment.js](https://momentjs.com/docs/#/displaying/format/)
* **logLevel** [string] - *defaults: "log"*
  * Report on this level and higher
  * Can use LOG_LEVEL from environment variables
* **levels** [array] - *defaults: `["error", "warn", "log", "info", "debug"]`*
  * Messages will be filtered from the `logLevel` to the start of the array
  * These log levels will also be available as functions on scribbles

Example:
```js
scribbles.config({
   mode:'test-runner',
   logLevel:"warn", //only output warning messages or higher
   levels:["danger", "error", "warn", "log", "info", "debug"],
   format:'{time} [{mode}#{gitHash}] <{logLevel}> {message}'
})

scribbles.danger("hello world")

// 2022-06-27T16:24:06.473 [test-runner#3d608bf] <danger> hello world
```

## How to trace logs

When trying to debug a problem with logs that are intertwined. A stacktrace will give you limited information. You can see where the Error occurred and a message. However you cannot see the values as it flow through your system.

Using the trace system. Each log entry will be able to be connected, as it flows through your system.

To use the trace system you only need to pass in a root function that acts as the start of the execution. Everything that is executed within this function will be matched to the same trace ID, and name if provided.

## trace function signature

```
scribbles.trace([label/opt,]next_fu)
```

The first argument to can be an options object. Here you can specify a `spanLabel` to tag your entries, a`traceId` & the `tracestate` that are using in distributed tracing.

### Tracing a path within your service

*index.js*
```js
// for fun lets set a custom format for our logs
scribbles.config({format:`[{traceName} {spanId}] {message}`})

// an example of an event handler
function incoming(dataIn){
  // wrap the work we want to do in `scribbles.trace`
  scribbles.trace("eventstream",(spanId)=>{

    // Event message logged from with here will have this correlation ID
    // spanId = 090e8e40000005

    workToDo(dataIn); // kick of the work
  })
}
```

*eventstream.js*
```js
function workToDo(dataIn){
  // ...
  // user scribbles as normal
  scribbles.log("Doing something with the eventstream")
  // [eventstream 090e8e40000005] Doing something with the eventstream
  // ...
}
```

### Tracing across your micro-services.
in accordance with [W3C trace-context](https://www.w3.org/TR/trace-context/)

Distributed tracing is powerful and makes it easy for developers to find the causes of issues in highly-distributed microservices applications, as they track how a single interaction was processed across multiple services. But while tracing has exploded in popularity in recent years, there still isn’t much built-in support for it in languages, web frameworks, load balancers, and other components, which can lead to missing components or broken traces.

🤔 Generating and attaching **trace-context** values to request headers is a standardized way of addressing this problem.

Instrumenting web frameworks, storage clients, application code, etc. to make tracing work out of the box. 🥳

---

This is an express **BUT** can be used in any other framework :blush:

```js
const scribbles = require('scribbles');

// start a trace for each incoming request.
app.get('/', scribbles.middleware.express, function (req, res){

  scribbles.log("doing stuff")
  // myRepo:local:master [198.10.120.12 090e8e40000005] 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 (Object.<anonymous>) doing stuff
  // lets call anoher service
  http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/',
    method: 'POST',

    // To continue the trace to the next micro-service.
    // We just need to send on the generated headers
    headers: scribbles.trace.headers(), // { traceparent: '...', tracestate:'...'},
   (res) => {
    scribbles.log(`statusCode: ${res.statusCode}`)
  })

}
```
The `tracestate` lists each hop/service the request has flown through, regardless of who owns that service.

### If you want to spin you own middleware


It may look something like this
```js
function traceMiddleware({headers}, res, next){
  scribbles.trace({
    // You can pass the traceparent as the traceId
    // or you can pull the traceId from the traceparent and pass that
    traceId:headers.traceparent,
    tracestate:headers.tracestate,

    // lets tag the current trace/span with the caller's IP
    spanLabel:headers['x-forwarded-for']
  },(spanId) => next())
} // END express
```

---

Todo:

* Add tests
* Allow for coloured logs
* Support console.group
* Allow custom json parser for `input values`
* a proxy that sits at the edge of your infrastructure swapping header tracestate with a lookup hash.
