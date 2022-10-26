require('./src/checkNodeVer')
require('source-map-support').install()
var sVer = require('./package.json').version;

const compile = require("string-template/compile");
const moment = require('moment')
const crypto = require('crypto')
const os = require('os');
const fs = require("fs");
const cls = require('@ashleyw/cls-hooked');
const createNamespace = require('@ashleyw/cls-hooked').createNamespace;

const status = require('./src/status');
//const loader = require('./src/loader');
const hijacker = require('./src/hijacker');
const config = require('./src/config');
const args2keys = require('./src/args2keys');
const { deepMerge, getSource } = require('./src/helpers');
const { parceTracestate } = require('./src/utils');
const stringify = require('./src/stringify');

const gitValues = require('./src/getGitStatus');

let packageJson_scribbles = {}

if(fs.existsSync(__dirname+'/../../package.json')){
  const packageJson = require('../../package.json');
  if(packageJson.scribbles){
    packageJson_scribbles = packageJson.scribbles
  }
}

const regxTraceparent = /[\d\w]{2}-[\d\w]{32}-[\d\w]{16}-[\d\w]{02}/g


//config.defaultVendor = gitValues.repo.toLocaleLowerCase().replace(/[^a-z]/gi, '')

let traceCount = 0, lastActiveSpan;
const hostname = os.hostname();
const pValues = {
        pTitle :  process.title,
        pid:      process.pid,
        ppid:     process.ppid || 0,
        user :    process.env.USER,
        vNode:    process.version
      };
const inUse = {};
const cuidPrefixRaw = ((process.ppid ? process.ppid.toString(16).slice(-2)
                              : Math.floor(Math.random()*15).toString(16) +
                                Math.floor(Math.random()*15).toString(16))
              + process.pid.toString(16).slice(-2)
              + Math.floor(Math.random()*15).toString(16))
let cuidPrefix = gitValues.hash.slice(-2) + cuidPrefixRaw


function myNamespace(){

  let correlaterValue = () => undefined;

  // check to see if we are still in the same namespace
  if( lastActiveSpan
  && process.namespaces[lastActiveSpan]
  && process.namespaces[lastActiveSpan].active){
    const trace = cls.getNamespace(lastActiveSpan)
    correlaterValue = function correlaterValue(key,value){
      return 1 === arguments.length ? trace.get(key) : trace.set(key,value)
    }
  } else {
    // check to see if we are still in a differint namespace
    Object.keys(process.namespaces)
          .forEach(spanId => {

      // find the active namespace
      if(!! process.namespaces[spanId].active){
        const trace = cls.getNamespace(spanId)
        correlaterValue = function correlaterValue(key,value){
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

const notUsed = {not:'used'}

function scribble(from, level, ...args){


    let statusinfo, now;
    if("status" === level){
      const vals = args[1]
      statusinfo = vals.statusinfo;
      now = vals.now

      args[1] = vals.value;
    }

    let { message, value, error } = args2keys(args, notUsed);

     if("statusX" === level){
      const now = new Date();
      from = from || getSource(new Error().stack)
      status().then( statusinfo => {
        Object.assign(statusinfo.process,pValues)
        scribble(from, "status", message, { statusinfo,value, now}, error)
      })
      return
    }

    const originalMessage = notUsed !== error
                         && notUsed !== message ? error.message : undefined;

//console.log({ message, originalMessage,value, error })

    if(notUsed === message
    && notUsed !== error){
      message = error.message;
    }


    let correlaterValue = myNamespace()

    const { traceId, spanId, span64, tracestate, spanLabel } = correlaterValue('traceVals') || {};

    const stackTrace = notUsed !== error ? error.stack.split("\n")
                                      .slice(1)// if there is a custom message leave the original in the trace
                                      .filter( line => !!line) // some stacks may have an extra empty line
                                      .map((line) => line.trim().indexOf("at") === 0 ? line.split(/at(.+)/)[1].trim() : line.trim() )
                           : undefined
//console.log("============",stackTrace)
    from = from || getSource(new Error().stack)

    const body = {
      v:sVer,
      git:{
        repo:gitValues.repo,
        branch:gitValues.branch,
        hash: gitValues.hash
      },
      trace:{
        traceId,
        spanId,
        span64,
        spanLabel,
        tracestate
      },
      info:{
        time: now || new Date(),
        mode:config.mode,
        hostname,
        instance:cuidPrefix,
        logLevel:level
      },
      context:{
        fileName: from.file,
        lineNumber: from.line,
      //  exeType: from.type
      },
      input:{
        message: notUsed === message ? undefined : message,//:         isErr && message ? message     : err && err.message ? err.message : err,
        originalMessage,//: isErr && message ? err.message : undefined,
        value: notUsed === value ? undefined : value,//:vals,
                            // remove the message line from trace
                            // as its in the "originalMessage" field
        stackTrace
      },
      toString : function(){

        const all = Object.keys(body).reduce((all,topics)=> Object.assign(all,body[topics]),{v:sVer})

        const time  = moment(body.time).format(config.time);

        const outputMessage    = all.message;
        const outputValue      = notUsed === value ? ''
                                                   : value === undefined ? 'undefined'
                                                                         : 'function' === typeof value ? value.toString()
                                                                                                       : stringify(value);

        const outputStackTrace = notUsed !== error ? "\n"+( originalMessage ? "Error: "+originalMessage+"\n":"")+stackTrace.map(line => ` at ${line}`).join("\n") : "";

        // based on: https://www.npmjs.com/package/tracer
        return config.__compile(Object.assign(all,{time,value:outputValue,message:outputMessage,stackTrace:outputStackTrace}))
      }
    } // END body

    if(statusinfo){
      body.status = statusinfo
    }

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
    config.dataOut && config.dataOut(body);//(dataBody)

    return body;
  }// END scribble


const scribbles = {}



traceCount = 1;

function trace(opts, next){

  let traceVals = {};

  // TODO: maybe this can be changed to a switch
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
scribbles.trace = trace

//=====================================================
//================================ framework middleware
//=====================================================

scribbles.middleware = {

  // if the request is part of a larger sequence
  // pull the traceparent from the header
  express:function correlateMiddleware({headers}, res, next){

    let headersOut = {}
    if(config.headers){
      if('string' === typeof config.headers && headers[config.headers]){
        headersOut[config.headers] = headers[config.headers]
      } else if(Array.isArray(config.headers) && 0 < config.headers.length){
          headersOut = config.headers.reduce((all,key)=> headers[key] ? Object.assign(all,{[key] : headers[key]})
                                                                   : all,{})
      }
    }

    if (config.headersMapping) {
        if ("object" !== typeof config.headerMapping) {
            throw new Error("headerMapping must be an Object. Was passed a "+typeof config.headersMapping)
        } // END NOT Object
        Object.keys(config.headerMapping).forEach(targetOutputHeaderName => {
          let findInputHarderNames = config.headerMapping[targetOutputHeaderName] // should be an Array
          if ("string" === typeof findInputHarderNames) {
            findInputHarderNames = [findInputHarderNames]
          } else if( ! Array.isArray(findInputHarderNames)) {
            throw new Error("headersMapping keys must map to a String or Array of string")
          }
          const foundAHeader = findInputHarderNames.reduce((returnHeaderFeid,findThisHarderKey)=>(
             returnHeaderFeid||headers[findThisHarderKey]
          ),false)
          if ("string" === typeof foundAHeader) {
            headersOut[targetOutputHeaderName] = foundAHeader
          }
        }) // END forEach
    }//END config.headersMapping

    scribbles.trace({
      // this traceId is embedded within the traceparent
      traceId:headers.traceparent && headers.traceparent.split('-')[1],
      tracestate:headers.tracestate,
      headers:headersOut,
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


scribbles.config = function scribblesConfig(opts){

  if(opts && opts.levels){
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

//+++++++++++++++++++++++++++++++++++++ setup git Info
//++++++++++++++++++++++++++++++++++++++++++++++++++++

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

  cuidPrefix = gitValues.hash.slice(-2) + cuidPrefixRaw

//+++++++++++++++++++++++++++++++++++ setup log levels
//++++++++++++++++++++++++++++++++++++++++++++++++++++

  config.logRange = config.levels.indexOf(config.logLevel)

  config.levels.forEach((logLevel,index) => {
    if(index <= config.logRange){
      scribbles[logLevel] = scribble.bind(null,null,logLevel)
      scribbles[logLevel].at = function at(from, label, value, error){
        const args = Array.prototype.slice.call(arguments)
              args.splice(1, 0, logLevel);
        // we need to do this dance because
        // we don't want to manually passing undefined that wasn't passed by the colour
        return scribble.apply(null,args)
      }
    } else {
      // Log levels below the seletecd level will be suppressed.
      // This will allow you to have verbose logging calls to out your code without the performance impact
      scribbles[logLevel] = ()=>{ }
      scribbles[logLevel].at = ()=>{ }
    }
  }) // END config.levels.forEach

  scribbles.status = scribble.bind(null,null,"statusX")
  scribbles.status.at = function at(from,label, value, error){
    const args = Array.prototype.slice.call(arguments)
    args[1] = "statusX"
    return scribble.apply(null,args)
  }

  config.__compile = compile(config.format)

} // END scribblesConfig

const resirvedFnNames = Object.keys(scribbles);

scribbles.config(packageJson_scribbles)


hijacker(scribbles)

module.exports = scribbles;
