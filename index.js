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
      const body = {}
      status().then( statusinfo => {
        Object.assign(statusinfo.process,pValues)
        const result = scribble(from, "status", message, { statusinfo, value, now}, error)
        // THIS is a VERY ugly hack !!
        // by returning the 'body' var we give the caller I reference synchronously.
        // when the promise is finished we inject the result of values
        // however there will be the stage for the receiver first gets it on it is empty
        // and sometime in the near future it will be magically populated :/
        Object.assign(body,result)
      })
      // maybe.. I can sleep well at night knowing that this is an undocumented feature
      return body
    } // END if statusX

    let originalMessage = notUsed !== error
                       && notUsed !== message ? error.message
                                              : undefined;
    if(notUsed === message
    && notUsed !== error){
      message = error.message;
    }


    let correlaterValue = myNamespace()
    const traceVals =  correlaterValue('traceVals') || {};
    const { traceId, spanId, span64, tracestate, spanLabel, trigger, logs } = traceVals

    const stackTrace = notUsed !== error ? error.stack.split("\n")
                                      .slice(1)// if there is a custom message leave the original in the trace
                                      .filter( line => !!line) // some stacks may have an extra empty line
                                      .map((line) => line.trim().indexOf("at") === 0 ? line.split(/at(.+)/)[1].trim()
                                                                                     : line                   .trim() )
                           : undefined
//console.log("============",stackTrace)
    from = from || getSource(new Error().stack)

    if(this.originalMessage){
      originalMessage = this.originalMessage
    }

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
        time: new Date(),
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

        const time  = moment(body.info.time).format(config.time);

        const outputMessage    = all.message;

        let outputValue;
        if(notUsed === value
        || ["timer","timerEnd"].includes(level)){
          outputValue = ''
        } else if ("function" === typeof config.stringify){
          outputValue = config.stringify(value)
        } else if(! value){
          outputValue = value + ""
        } else if ('function' === typeof value){
          outputValue = value.toString()
        } else {
          outputValue = stringify(value)
        }

        const outputStackTrace = notUsed !== error ? "\n"+( originalMessage ? "Error: "+originalMessage+"\n":"")+stackTrace.map(line => ` at ${line}`).join("\n") : "";

        // based on: https://www.npmjs.com/package/tracer
        return config.__compile(Object.assign(all,{time,value:outputValue,message:outputMessage,stackTrace:outputStackTrace}))
      }
    } // END body

    if(statusinfo){
      body.status = statusinfo
    }

     const output = (body)=>{

           if(config.stdOut){
             let stdOut;
             if(config.stdOut[level]){
               stdOut = config.stdOut[level]
             } else if('function' === typeof config.stdOut){
               stdOut = config.stdOut
             } else if('function' === typeof config.stdOut.log) {
               stdOut = config.stdOut.log
             } else {
               throw new Error(`${level} was not found on stdOut`)
             }
             stdOut(body.toString())
           } // END if config.stdOut
           //const dataBody = Object.assign({},body,{time : moment(body.time).format(config.time)})
           config.dataOut && config.dataOut(body);//(dataBody)
     }

     // Am I inside a trace ?
     if(traceId
     && config.traceTrigger){
       // if was HIT.. output this one
       if(trigger){
         output(body)
         // if this is the HIT = push logs, push this one & clear
       } else if(config.levels.indexOf(config.traceTrigger)
              >= config.levels.indexOf(level) ){
         traceVals.trigger = true;
         logs.forEach(output)
         output(body)
         // if not HTI = store log
       } else {
         logs.push(body)
       }
     } else {
       output(body)
     }

    return body;
  }// END scribble


const scribbles = {}



traceCount = 1;

function trace(opts, next){

  let traceVals = { logs:[] };

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

      let configHeaders = config.headers

      if( ! Array.isArray(configHeaders)){
        configHeaders = [configHeaders]
      }
      configHeaders = configHeaders.filter(key => key
                                               && ('string' === typeof key
                                               ||   key instanceof RegExp))
                                   .map(key => 'string' === typeof key
                                            && isValidRegex(key) ? stringToRegex(key)
                                                                 : key)
      headersOut = configHeaders.reduce((all,key)=> {
          if(key instanceof RegExp){
            Object.keys(headers)
                  .forEach(headerName => {
                    if(key.test(headerName)){
                      all[headerName] = headers[headerName]
                    } // END if
                  })// END forEach
          } else if(headers[key]){
            all[key] = headers[key]
          }// END else if
          return all
      },{}) // END reduce
    } // END if config.headers

    if (config.headersMapping) {
        if ("object" !== typeof config.headersMapping) {
            throw new Error("headersMapping must be an Object. Was passed a "+typeof config.headersMapping)
        } // END NOT Object
        Object.keys(config.headersMapping).forEach(targetOutputHeaderName => {
          let findInputHarderNames = config.headersMapping[targetOutputHeaderName] // should be an Array
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
    "x-git-hash":gitValues && gitValues.hash || undefined,
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

  const times = {}

  function timePrint(from,level,tag,message){
    tag = tag+""
    const timeAr = times[tag]
    let elapsed = 0, increment = 0
    if( 1 < timeAr.length){
      const [a,b] = timeAr.slice(-2)
      increment = b - a
      elapsed = timeAr[timeAr.length - 1] - timeAr[0]
    }
    return scribble.call({originalMessage:message},
                          from,
                          level,
                          `${tag}${message?`:${message}`:""} (+${increment.toFixed(2)}ms|${elapsed.toFixed(2)}ms)`,
                          {tag,elapsed,increment})
  } // END timePrint

  scribbles.timer = (tag,message)=>{
    tag = tag+""
    const t = times[tag] || []
    t.push(Math.round(performance.now() * 100)/100)
    times[tag] = t
    return timePrint(getSource(new Error().stack),"timer",tag,message)
  } // END timeLog

  scribbles.timerEnd = (tag,message)=>{
      tag = tag+""
      if( ! times[tag]){
        throw new Error(`Timer '${tag}' does not exist`)
      }
      times[tag].push(performance.now())
      const result = timePrint(getSource(new Error().stack),"timerEnd",tag,message)
      delete times[tag]
      return result
  }// END timeEnd



  config.__compile = compile(config.format)

} // END scribblesConfig

const resirvedFnNames = Object.keys(scribbles);

scribbles.config(packageJson_scribbles)

function isValidRegex(s) {
  try {
    const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
    return m ? !!new RegExp(m[2],m[3])
        : false;
  } catch (e) {
    return false
  }
}
function stringToRegex(s) {
   const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
   return m ? new RegExp(m[2], m[3]) : new RegExp(s);
}

hijacker(scribbles)

module.exports = scribbles;
