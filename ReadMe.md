# Scribbles

**scribbles** a log and tracing lib for Node [![npm version](https://badge.fury.io/js/scribbles.svg)](https://www.npmjs.com/package/scribbles)

---

### Scribbles has some nice features.

* [Customised output](#how-to-customise-log-output)
* [Tracing logs](#how-to-trace-logs)
  * All logs with [`.trace(`](#trace-function-signature) will be **automatically** tagged, no matter where in your app it is.
  * use `traceTrigger` to filter a set of logs to only when there is a threshold is met or exceeded
  * Can trace incoming requests with the [w3c trace-context](https://www.w3.org/TR/trace-context/) headers
  * scribbles will attempt to intercept all outgoing requests and inject the headers :sunglasses:
  * Can **automatically** inject IDs into outgoing headers. Works with [axios](https://www.npmjs.com/package/axios#axios), [request](https://www.npmjs.com/package/request) & [http](https://nodejs.org/api/http.html#http_http_get_url_options_callback)/[https](https://nodejs.org/api/https.html#https_https_get_url_options_callback)
* More insight in your logs
  * Git repository name
  * Current branch
  * Last commit hash
  * Environment: local / dev / prod
* Static code analysis to log file & line numbers
  * Resolve the calling location **without** the expensive of a stacktrace
  * If you App is bundle, scribbles try to load with the map file to report the correct source file and line :sunglasses:
* [Generate performance reports](#performance-monitoring)
  * Detailed metrics on service and host
  * Flag when the eventloop is blocking. This can happen when your app is over-loaded.

## **scribbles** is 100% agnostic. **Connect your logging service of choice** to either: `stdOut` to get a string of the entry OR `dataOut` to get an enriched object representing the log event

### If you like it, [★ it on github](https://github.com/codemeasandwich/scribbles), [![Buy me a coffee](https://img.shields.io/badge/buy%20me-a%20coffee-orange.svg)](https://www.buymeacoffee.com/codemeasandwich) and/or share :beers:

## How to install

You should be running **node v8.5.0+**

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

// myRepo:local:master [ ] 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 hello world
```

## Logging signature

```
scribbles[logLevel](message, [value, [error]])
```

## How to customise

There is a `config` that takes a configuration object.

* **stdOut** [function] - *defaults: `console`*
  * Redirect the string output of the log entry
* **dataOut**  [function]
  * A callback to receive an object representing the log entry
* **stringify**  [function]
  * A function used in stdOut to parsing for values into a string
* **mode** [string] - *default: 'dev'*
  * Can use NODE_ENV from environment variables
* **format** [string] - *defaults: "{repo}:{mode}:{branch} [{spanLabel} {spanId}] {time} #{hash} <{logLevel}> {fileName}:{lineNumber} {message} {value} {stackTrace}"*
  * git:
    * `repo`: The git repository name as it appears on the origin
    * `branch`: The current git branch
    * `hash`: Short git hash of current commit
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
    * `instance`: a base16 value representing the current instance
    * `mode`: The environment your application is running in. *e.g. local, dev, prod etc..*
  * context:
    * `fileName`: The file name
    * `lineNumber`: The line in the file
  * input:  
    * `message`: Message to log
    * `value`: Values to log
    * `stackTrace`: The stack trace if an Error object was passed
  * `v`: The version of scribbles used to create this entry. This allows matching log body with parsers. As the layout may change with new versions.
* **time** [string] - *defaults: "YYYY-MM-DDTHH:mm:ss.SSS"*
  * [Time formatting is provided by Moment.js](https://momentjs.com/docs/#/displaying/format/)
* **traceTrigger** [string] *
  * Used within trace call.
  * Log events will be stored and only push out if the scribbles[logLevel] >= the traceTrigger level
* **logLevel** [string] - *defaults: "debug"*
  * Report on this level and higher
  * Can use LOG_LEVEL from environment variables
* **levels** [array] - *defaults: `["error", "warn", "status", "log", "timer", "info", "debug"]`*
  * Messages will be filtered from the `logLevel` to the start of the array
  * These log levels will also be available as functions on scribbles
* **headers** [string/array/null]
  * **activated when using [scribbles.middleware...](#tracing-across-your-micro-services)**
  * `string` of a header name to forward
  * `RegExp` to match header names to forward
  * `array` of header names to forward. Can exact matching `string`s and/or `RegExp`s.
  * `null` to disable forwarding headers
* **headersMapping** [object:[array/string]]
  * An `object` of output keys with input selector values.
  * Values can be A `string` OR `array of strings`: that will be taken in order of preference to be selected(i.e. If an incoming request has a header named the same as first index. Ues that, else check the next index and so on)
* **gitEnv** [Object] - the **attribute names** at the **end** of their `process.env`
  * `hash`: attribute name of git short hash
  * `repo`: attribute name of git repository name
  * `branch`: attribute name of git branch
* **pretty** [Object]
  * `indent`[string]: preferred indentation. _Defaults  `"  "` ~ 2 spaces_
  * `singleQuotes`[string]: Set to true to get single-quoted strings. _Default: `false`_
  * `filter`(object, key) [function]: Expected to return a boolean of whether to include the property in the output.
  * `transform`(object, key, val) [function]: Expected to return a string that transforms the string that resulted from stringifying a given property. 
    * This can be used to detect special types of objects that need to be stringified in a particular way, or to return an alternate string in this case. e.g. given a field named "password" return "****"
---

### Example:

Via **package.json**

Just add a "scribbles" attribute

```json
{
  "name": "myrepo",
  "version": "0.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {

  },
  "scribbles":{
     "mode":"test-runner",
     "logLevel":"warn",
     "levels":["danger", "error", "warn", "log", "info", "debug"],
     "format":"{time} [{mode}#{hash}] <{logLevel}> {message}"
  }
}
```

Via **.config(...) function**

```js
scribbles.config({
   mode:'test-runner',
   logLevel:"warn", //only output warning messages or higher
   levels:["danger", "error", "warn", "log", "info", "debug"],
   format:'{time} [{mode}#{hash}] <{logLevel}> {message}'
})

scribbles.danger("hello world")

// 2022-06-27T16:24:06.473 [test-runner#3d608bf] <danger> hello world
```

## dataOut

There is also a option in config to set the `dataOut` that will receive an object representing the log entry.

```js
scribbles.config({
   dataOut:function(data){
     console.log(data);
   }
})

scribbles.log("hello world")

/*{
   v:"1.2.3",
   git:{
      repo:"myRepo",
      branch:"master",
      hash:"3d608bf"
   },
   trace:{
      ...
   }
   info:{
      time:2022-06-27T16:24:06.473Z,
      mode:"local",
      hostname:"box",
      logLevel:"log",
      instance:"bfc977a"
   },
   context:{
      fileName:"index.js",
      lineNumber:174
   },
   input:{
    message: "hello world"
   },
}*/
```

---

# performance monitoring

:rocket: You can also poll the performance of your service. By calling `scribbles.status(...)`

This will attach an additional attribute to the **dataOut** and will not be available in *stdOut*.

* status:
  * `state`: the state of the services. e.g. *"up"*, *"blocking"*
  * `cpu`: CPU info
    * `cores`: number of available cores
    * `model`: description of the processor
    * `speed`: MHz frequency speed
    * `percUsed`: load on process as percentage
    * `percFree`: available on process as percentage
  * `sys`: System info
    * `startedAt`: when the system was started
    * `arch`: platform architecture. e.g "x64"
    * `platform`: the operating system platform
    * `totalMem`: the total megabytes of memory being used
    * `freeMem`: the total megabytes of memory free
    * `usedMem`: the total megabytes of memory being used
  * `process`: Node process info
    * `percUsedCpu`: the percentage of processing power being used by this process
    * `percFreeMem`: the percentage of memory being used by this process
    * `usedMem`: the total megabytes of memory being used by this process
    * `startedAt`: when it's process was started
    * `pTitle`: the current process title (i.e. returns the current value of ps)
    * `pid`: the ID of the process
    * `ppid`: the ID of the current parent process
    * `user`: node the name of the user who started node
    * `vNode`: version of node
  * `network`: Networking info
    * `port`: listening on this Port
    * `connections`: number of current established connections


### Example:

```js
scribbles.config({
   dataOut:console.log
})

setInterval(function(){
  scribbles.status();
}, 5000);
```

*This will give you a performance snapshot every 5 seconds.*

---

## Using webpack and GIT but only deploying the bundle?

**You can get Scribbles to store the Git info at build time, in order to show in the run time logs**

Via **webpack.config.js**

Here is how to add git status to you logs.

```js
//...
const ScribblesWithGitInBundle = require('scribbles/gitStatus');
//...
module.exports = {
//...
  plugins: [
    ScribblesWithGitInBundle,
//  ...
  ]
//...
};
```
That's it!

#### If your **git** values are passed by the `process.env`.

You can select then via the config opts.

Via **package.js**

```json
{
  ...,
  "scribbles":{
     ...,
     "gitEnv": {
        "hash":"GITHUB_SHA",
        "repo":"GITHUB_REPOSITORY",
        "branch":"GITHUB_REF"
     }
  }
}
```

**Tip**: If you are using **Heroku**, the git hash is storted in the *"SOURCE_VERSION"*

---

## Using TypeScript in a bundle?

To get accurate file & line references when transpiling your code. 
You will need to enable inlining sourceMaps.
There are two steps you need to add.

1. **Generate source-map as part of the build**
    * In your `tsconfig.json` add `"sourceMap": true` under "*compilerOptions*" 

2. **Enable sourceMap support in Node**
    * **Node v12.12+** : can just add the ` --enable-source-maps ` flag to the node command
      
      OR
    * **Node older** : Will need to install **[NPM->source-map-support](https://www.npmjs.com/package/source-map-support)** and add `require('source-map-support').install()` to the top for you service

---

## How to analyzing performance of pieces of your code

You can start a timer to calculate the duration of a specific operation. To start one, call the `scribbles.timer(tag,[message])` function, giving it a name and an optional message. To stop the timer, just call the `scribbles.timerEnd(tag,[message])` function, again passing the timer's name as the first parameter.

There are 3 functions:

1. `scribbles.timer()` - Starts and/or logs the current value a timer based on the tag passed to the function.
3. `scribbles.timerEnd()` - logs the current value a timer and removes it, to be used later.

```js
scribbles.timer("Yo")
setTimeout(()=>{
  scribbles.timer("Yo","123")
  setTimeout(()=>{
    scribbles.timerEnd("Yo","done!")
  }, 300)
}, 400)
```
Output: You see the time it took to run the code
```cli
myRepo:local:master [ ] 2022-06-27T13:04:52.133 <timer> app.js:18 Yo (+0.00ms|0.00ms)  
myRepo:local:master [ ] 2022-06-27T13:04:52.552 <timer> app.js:20 Yo:123 (+419.40ms|419.40ms)  
myRepo:local:master [ ] 2022-06-27T13:04:52.875 <timerEnd> app.js:22 Yo:done! (+323.21ms|742.61ms)
```

---

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

### Filter Tracing logs to **only when there is a problem**.

Log just the timeline of events you care about.

By setting a "traceTrigger" level. All scribbles calls **within** a trace context will respect it. If a call is make that matchs or exceds this level. Past, current & new events in this context will be outputted, else they will be suppressed

```js
scribbles.config({
  // Any call to error or higher will trigger all logs from logLevel for this specific this execution context
  traceTrigger:"error",
  // logLevel dont not have to be set. Will default to All
  logLevel:'warning',
  // Levels do not need to be set this is only for demonstration purposes
  levels:['fatal','error','warning','info'],
})


scribbles.trace('in_trace',()=>{
  scribbles.info(" --- Will NEVER be shown") // as this is below the logLevel
  setTimeout(()=>{
     // will be store, but will not be sent out at this point
    scribbles.warning(" --- Wait")
    setTimeout(()=>{
      // traceTrigger exceded! store event will be sent out + this event
      scribbles.fatal(" --- Now!")
      setTimeout(()=>{
        // will be sent out at the traceTrigger was already hit, for this *trace context*
        scribbles.warning(" --- More!")
      }, 500)
    }, 500)
  }, 500)
})

/*
  myRepo:local:master [in_trace 3b3c6000000001] 2022-06-27T09:22:52.588 #3d608bf <warning> app.js:14  --- Wait
  myRepo:local:master [in_trace 3b3c6000000001] 2022-06-27T09:22:52.890 #3d608bf <fatal> app.js:16  --- Now!  
  myRepo:local:master [in_trace 3b3c6000000001] 2022-06-27T09:22:53.199 #3d608bf <warning> app.js:18  --- More!
*/
```

### Tracing across your micro-services.
in accordance with [W3C trace-context](https://www.w3.org/TR/trace-context/)

Distributed tracing is powerful and makes it easy for developers to find the causes of issues in highly-distributed microservices applications, as they track how a single interaction was processed across multiple services. But while tracing has exploded in popularity in recent years, there still isn’t much built-in support for it in languages, web frameworks, load balancers, and other components, which can lead to missing components or broken traces.

🤔 Generating and attaching **trace-context** values to request headers is a standardized way of addressing this problem.

Instrumenting web frameworks, storage clients, application code, etc. to make tracing work out of the box. 🥳

---

### Example: Using [Express](https://expressjs.com/) & [Axios](https://github.com/axios/axios#axios) within [AWS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-request-tracing.html)

```js
const scribbles = require('scribbles');
const axios     = require('axios');
const express   = require('express');

scribbles.config({
  headers:["X-Amzn-Trace-Id"]
});

const app = express();

// start a trace for each incoming request.
app.use(scribbles.middleware.express);

app.get('/', function (req, res){

  scribbles.log("incoming");
  // myRepo:local:master [198.10.120.12 090e8e40000005] 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 incoming

  // Just by calling this other service normally, scribbles will inject the tracing headers
  axios.get('https://some.domain.com/foo/')
    .then(response => {
      scribbles.log(response.data);
      res.send("fin")
    })
    .catch(error => {
      scribbles.error(error);
    });

}) // END app.get '/'


app.listen(port, () => scribbles.status(`App is ready!`))
```

**Example above is for [axios](https://www.npmjs.com/package/axios) but it will also work with [http](https://nodejs.org/api/http.html#http_http_get_url_options_callback) and [request](https://www.npmjs.com/package/request)**

---

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
  },(spanId) => next());
} // END express
```

#### if you want to handle the out going headers

```js
app.get('/', function (req, res){

  scribbles.log("incoming");
  // myRepo:local:master [198.10.120.12 090e8e40000005] 2022-06-27T16:24:06.473 #3d608bf <log> index.js:174 incoming


  axios.get('https://some.domain.com/foo/',{
      headers:scribbles.trace.headers() // tracing header IDs
    })
    .then(response => {
      scribbles.log(response.data);
      res.send("fin")
    })
    .catch(error => {
      scribbles.error(error);
    });

}) // END app.get '/'
```

---

**small print:**

**MIT** - If you use this module(or part), credit it in the readme of your project and failing to do so constitutes an irritating social faux pas. Besides this, do what you want with this code but don't blame me if it does not work.  If you find any problems with this module, [open issue on Github](https://github.com/codemeasandwich/scribbles/issues). However reading the Source Code is suggested for experience JavaScript and node engineer's and may be unsuitable for overly sensitive persons with low self-esteem or no sense of humour. Unless the word tnetennba has been used in it's correct context somewhere other than in this warning, it does not have any legal or grammatical use and may be ignored. No animals were harmed in the making of this module, although the yorkshire terrier next door is living on borrowed time, let me tell you. Those of you with an overwhelming fear of the unknown will be gratified to learn that there is no hidden message revealed by reading this warning backwards, I think.
