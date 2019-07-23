
(function(){
  var v = process.version.split('.');
  var ver = +(v[0].slice(1))
  var fe = +v[1];
  var bug = +v[2];
  if(8 > ver
  || 8 === ver && 3 > fe){
    throw new Error("Scribbles needs node v8.3.0 or higher. You are running "+process.version)
  }
})()

var hook = require('node-hook');
const format = require("string-template");
const path = require('path');
const moment = require('moment')
const crypto = require('crypto')
const os = require('os');
const fs = require("fs");
const cls = require('@ashleyw/cls-hooked');
const createNamespace = require('@ashleyw/cls-hooked').createNamespace;
var exec = require('child_process').execSync
hook.hook('.js', function (source, filename) {

const path = filename.startsWith("/"+appDir) ? filename.substr(appDir.length+2) : "/"+filename

return source.split("\n").map((line,index)=>{

  	if(0 <= line.indexOf("scribbles.")){
      for (let level of config.levels) {

        //TODO: use the list on `resirvedFnNames`
        // if scribbles.***( is NOT a resirvedFnNames
        // then take thats its a LOG & replace with **.at(...)

        if(0 <= line.indexOf("scribbles."+level+"(")) {
          return line.replace("scribbles."+level+"(",
                              `scribbles.${level}.at({file:"${path}",line:${index+1}},`)
        } // END if
      }// END for
    } // END if
    return line

  }).join("\n")

});

const regxTraceparent = /[\d\w]{2}-[\d\w]{32}-[\d\w]{16}-[\d\w]{02}/g

const gitValues = {
  short:exec('git rev-parse --short HEAD',{ encoding: 'utf8' }).trim(),
  repo:exec('basename -s .git `git config --get remote.origin.url`',{ encoding: 'utf8' }).trim(),
  branch:exec('git rev-parse --abbrev-ref HEAD',{ encoding: 'utf8' }).trim()
};

const defaultVendor = gitValues.repo.toLocaleLowerCase().replace(/[^a-z]/gi, '')

let appDir = path.dirname(require.main.filename);
    appDir = appDir[0] === '/' ? appDir.substr(1) : appDir
let traceCount = 0, lastActiveSpan;
const hostname = os.hostname(), defaultPpid = 0;
const inUse = {}, cuidPrefix = (gitValues.short.slice(-2)
                             + (process.ppid||defaultPpid).toString(16).slice(-2)
                             + process. pid.toString(16).slice(-2)
                             + Math.floor(Math.random() * 15).toString(16))



function myNamespace(){

  let correlaterValue = () => undefined;

  // check to see if we are still in the same namespace
  if( lastActiveSpan
  && process.namespaces[lastActiveSpan]
  && process.namespaces[lastActiveSpan].active){
    const trace = cls.getNamespace(lastActiveSpan)
    correlaterValue = function(key,value){
      return 1 === arguments.length ? trace.get(key) : trace.set(key,value)
    }
  } else {
    // check to see if we are still in a differint namespace
    Object.keys(process.namespaces)
          .forEach(spanId => {

      // find the active namespace
      if(!! process.namespaces[spanId].active){
        const trace = cls.getNamespace(spanId)
        correlaterValue = function(key,value){
          return 1 === arguments.length ? trace.get(key) : trace.set(key,value)
        }
        lastActiveSpan = spanId;
      } else if(0 === process.namespaces[spanId]._contexts.size && inUse[spanId]){
        // if used + no more context => garbage collecte
        cls.destroyNamespace(spanId);
        delete inUse[spanId];
      } else if(! inUse[spanId]) {
        // add to the inuse if new
        inUse[spanId] = true
      }

    })// END namespaces.forEach

  } // END else

  return correlaterValue

} // END myNamespace


function scribble(from, level, err, vals, message){

    let correlaterValue = myNamespace()

    const { traceId, spanId, span64, tracestate, spanLabel } = correlaterValue('traceVals') || {};

    const isErr = err instanceof Error;
  //  const level = isErr ? "error" : level || this.level || "log"

    if( ! isErr
    && "string" !== typeof err
    && "number" !== typeof err){
      err = JSON.stringify(err)
    } // END if is a basic value

    const stackTrace = isErr ? err.stack.split("\n")
                                      .slice(1)// if there is a custom message leave the original in the trace
                                      .filter( line => !!line) // some stacks may have an extra empty line
                                      .map((line) => line.trim().indexOf("at") === 0 ? line.split(/at(.+)/)[1].trim() : line.trim() )
                           : undefined

    from = from || getSource(new Error().stack)

    const body = {
      git:{
        repo:gitValues.repo,
        branch:gitValues.branch,
        gitHash: gitValues.short
      },
      trace:{
        traceId,
        spanId,
        span64,
        spanLabel,
        tracestate
      },
      info:{
        time: new Date(),
        mode:config.mode,
        hostname,
        logLevel:level
      },
      context:{
        fileName: from.file,
        lineNumber: from.line,
        exeType: from.type
      },
      input:{
        message:         isErr && message ? message     : err.message || err,
        originalMessage: isErr && message ? err.message : undefined,
        value:vals,
                            // remove the message line from trace
                            // as its in the "originalMessage" field
        stackTrace
      },
      process:{
        pTitle :  process.title,
        pid:      process.pid,
        ppid:     process.ppid || defaultPpid,
        user :    process.env.USER,
        vNode:    process.version,
        arch:     process.arch,
        platform: process.platform
      },
      toString : function(){

        const all = Object.keys(body).reduce((all,topics)=> Object.assign(all,body[topics]),{})

        const time  = moment(body.time).format(config.time);

        const outputMessage    = message || err.message || err;
        const outputValue      = "object" === typeof vals ? JSON.stringify(vals) : '';
        const outputStackTrace = isErr ? "\n"+( message ? "Error: "+err.message+"\n":"")+all.stackTrace.map(line => ` at ${line}`).join("\n") : "";

        // based on: https://www.npmjs.com/package/tracer
        return format(config.format,Object.assign(all,{time,value:outputValue,message:outputMessage,stackTrace:outputStackTrace}))
      }
    } // END body

    if(config.stdOut){
      let stdOut;
      if(config.stdOut[body.level]){
        stdOut = config.stdOut[body.level]
      } else if('function' === typeof config.stdOut){
        stdOut = config.stdOut
      } else if('function' === typeof config.stdOut.log) {
        stdOut = config.stdOut.log
      } else {
        throw new Error(`${body.level} was not found on stdOut`)
      }
      stdOut(body.toString())
    } // END if config.stdOut
    //const dataBody = Object.assign({},body,{time : moment(body.time).format(config.time)})
    config.dataOut && config.dataOut(body)//(dataBody)
    return body;
  }// END scribble


//=====================================================
//=============================================== Utils
//=====================================================

//++++++++++++++++++++++++++++++++++++++++++ getSource
//++++++++++++++++++++++++++++++++++++++++++++++++++++

function getSource(stack){

    const originFile = stack.split('\n')[2].split('/');
    const file = originFile[originFile.length - 1].split(':')[0];
    const line = originFile[originFile.length - 1].split(':')[1];
    let path = originFile.splice(1).join('/')
        path = path[path.length - 1] === ')' ? path.substring(0, path.length - 1) : path;
        path = path.startsWith(appDir) ? path.substr(appDir.length+1) : "/"+path
    return {
      type:originFile[0].split('at').pop().trim().split(" ")[0],
      file,
      line:+line,
      path
    } // END return
} // END getSource

const scribbles = {}

module.exports = scribbles;

//=====================================================
//====================================== Default Config
//=====================================================

let config = {
  mode: process.env.NODE_ENV || 'dev',
  logLevel:process.env.LOG_LEVEL || "log",
  levels:["error", "warn", "log", "info", "debug"],
  stdOut: console,
  dataOut : undefined,
  vendor:defaultVendor,
  time:'YYYY-MM-DDTHH:mm:ss.SSS',
  format:`{repo}:{mode}:{branch} [{spanLabel} {spanId}] {time} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}`
}

traceCount = 1;

scribbles.trace = function trace(opts, next){

  const traceVals = {};

  if('object' === typeof opts){
    traceVals.headers = opts.headers;
    spanLabel  = opts.spanLabel

    if(opts.traceId){
      if(regxTraceparent.test(opts.traceId)){
        const [version,traceId,parentId,flag] = opts.traceId.split('-')
        traceVals = {version,traceId,parentId,flag}
      } else {
        traceVals.traceId = opts.traceId
      }
    }
    traceVals.spanLabel  = opts.spanLabel

    traceVals.tracestate = 'string' === typeof opts.tracestate
                  && "" !== opts.tracestate ? parceTracestate(opts.tracestate)
                                            : opts.tracestate // this maybe undefined
  } else if('string' === typeof opts){

    traceVals.spanLabel = opts
  } else if('function' === typeof opts){
    next = opts;
  }

  if( ! traceVals.traceId){
    traceVals.traceId = crypto.randomBytes(16).toString('hex');
  }

  if( ! traceVals.tracestate){
    traceVals.tracestate = []
  }

  traceVals.spanId = cuidPrefix+("00000000" + traceCount.toString(16)).slice(-9)
  traceVals.span64 = Buffer.from(traceVals.spanId, 'hex').toString('base64').slice(0, -1)

  traceCount++;

//  tracestate = tracestate.filter(span=> config.vendor !== span.key)
//  tracestate.unshift({key:config.vendor,value:hexToBase64(spanId)})

  const trace = createNamespace(traceVals.spanId)
  trace.run(()=>{
    trace.set('traceVals', traceVals);
    next(traceVals.spanId)
  })
} // END trace


//=====================================================
//================================ framework middleware
//=====================================================

scribbles.middleware = {

  // if the request is part of a larger sequence
  // pull the traceparent from the header
  express:function correlateMiddleware({headers}, res, next){

    let headers = {}
    if(config.headers){
      if('string' === typeof config.headers && headers[config.headers]){
        headers[config.headers] = headers[config.headers]
      } else if(Array.isArray(config.headers) && 0 < config.headers.length){
          headers = config.headers.reduce((all,key)=> headers[key] ? Object.assign(all,{[key] : headers[key]})
                                                                   : all,{})
      }
    }

    scribbles.trace({
      // this traceId is embedded within the traceparent
      traceId:headers.traceparent && headers.traceparent.split('-')[1],
      tracestate:headers.tracestate,
      headers,
      // lets tag the current trace/span with the caller's IP
      spanLabel:headers['x-forwarded-for']
    },(spanId) => next())
  } // END express
} // END scribbles.middleware

//=====================================================
//=================================== Trace Context W3C
//=====================================================

scribbles.trace.headers = function traceContext(customHeader){

  const correlaterValue = myNamespace()

  const { traceId, spanId, span64, tracestate, version,flag, headers } = correlaterValue('traceVals') || {};

  return deepMerge(Object.assign({
    traceparent:`${version||'00'}-${traceId}-${spanId}-${flag||'01'}`,
    tracestate:tracestate.filter(span=> config.vendor !== span.key)
    .reduce((arr, {key,value}) => {
        arr.push(`${key}=${value}`);
        return arr;
      },[`${config.vendor}=${span64}`]).slice(0,32).join()
  },headers || {}),customHeader)
} // END traceContext

function parceTracestate(tracestate){
  return tracestate.split(',')
            .reduce((accumulator, currentValue)=>{
                  const [key, value] = currentValue.split('=')
                  accumulator.push({key,value})
                  return accumulator
              },[])
} // END parceTracestate

scribbles.config = function scribblesConfig(opts){

  if(opts.levels){
    opts.levels.forEach((logLevel) => {
      if(-1 < resirvedFnNames.indexOf(logLevel)){
        throw new Error('You cant use "'+logLevel+'" as a log level!')
      }
    }) // END forEach
  } // END if

//+++++++++++++++++++++++++++++++++++++++ Clean config
//++++++++++++++++++++++++++++++++++++++++++++++++++++

  config.levels.forEach((logLevel) => {
    delete scribbles[logLevel];
  })

//++++++++++++++++++++++++++++++++++ overwrite options
//++++++++++++++++++++++++++++++++++++++++++++++++++++

  Object.assign(config,opts);

//+++++++++++++++++++++++++++++++++++ setup log levels
//++++++++++++++++++++++++++++++++++++++++++++++++++++

  config.logRange = config.levels.indexOf(config.logLevel)

  config.levels.forEach((logLevel,index) => {
    if(index <= config.logRange){
      scribbles[logLevel] = scribble.bind(null,null,logLevel)
      scribbles[logLevel].at = function(from,err, vals, message){
        return scribble(from,logLevel,err, vals, message)
      }
    } else {
      // Log levels below the seletecd level will be suppressed.
      // This will allow you to have verbose logging calls to out your code without the performance impact
      scribbles[logLevel] = ()=>{ }
      scribbles[logLevel].at = ()=>{ }
    }
  }) // END config.levels.forEach

} // END scribblesConfig

const resirvedFnNames = Object.keys(scribbles)

scribbles.config()

if(fs.existsSync(__dirname+'/../../package.json')){
  const packageJson = require('../../package.json');
  if(packageJson.scribbles){
    scribbles.config(packageJson.scribbles)
  }
}

//=====================================================
//================================================ Util
//=====================================================

function deepMerge(target, source) {
if(typeof target === 'object' && undefined === source) return target;
if(typeof target !== 'object' || typeof source !== 'object') return false; // target or source or both ain't objects, merging doesn't make sense
for(var prop in source) {
  if(!source.hasOwnProperty(prop)) continue; // take into consideration only object's own properties.
  if(prop in target) { // handling merging of two properties with equal names
    if(typeof target[prop] !== 'object') {
      target[prop] = source[prop];
    } else {
      if(typeof source[prop] !== 'object') {
        target[prop] = source[prop];
      } else {
        if(target[prop].concat && source[prop].concat) { // two arrays get concatenated
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

//=====================================================
//====================================== forwardHeaders
//=====================================================
const http = require('http')
const reqHttp = http.request.bind(http)

http.request = function(url, options, callback){

  if( ! config.forwardHeaders){
    return reqHttp(url, options, callback)
}

  if('function' === typeof options){
    callback = options
    options = {}
  }

  if('object' === typeof url){
    options = url;
    url = null;
  }

  options.headers = scribbles.trace.headers(options.headers || {})

  if(url){
    return reqHttp(url, options, callback)
  } else {
    return reqHttp(options, callback)
  }
}
