const format = require("string-template");
const path = require('path');
const moment = require('moment')
const crypto = require('crypto')
const os = require('os');
const cls = require('@ashleyw/cls-hooked');
const createNamespace = require('@ashleyw/cls-hooked').createNamespace;
var exec = require('child_process').execSync

const defaultVendor = 'scribbles'

const gitValues = {
  short:exec('git rev-parse --short HEAD',{ encoding: 'utf8' }).trim(),
  repo:exec('basename -s .git `git config --get remote.origin.url`',{ encoding: 'utf8' }).trim(),
  branch:exec('git rev-parse --abbrev-ref HEAD',{ encoding: 'utf8' }).trim()
};

let appDir = path.dirname(require.main.filename);
    appDir = appDir[0] === '/' ? appDir.substr(1) : appDir
let traceCount = 0, lastActiveSpan;
const inUse = {}, cuidPrefix = (gitValues.short.slice(-2)
                             + process.ppid.toString(16).slice(-2)
                             + process. pid.toString(16).slice(-2)
                             + Math.floor(Math.random() * 15).toString(16))

const hostname = os.hostname()

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


function scribble(level, err, vals, message){

    let correlaterValue = myNamespace()

    // we are in the pcress of flushing old messages
    const traceId    = correlaterValue('traceId');
    const spanLabel  = correlaterValue('spanLabel');
    const spanId     = correlaterValue('spanId');
    const tracestate = correlaterValue('tracestate');

    const isErr = err instanceof Error;
  //  const level = isErr ? "error" : level || this.level || "log"

    if( ! isErr
    && "string" !== typeof err
    && "number" !== typeof err){
      err = JSON.stringify(err)
    } // END if is a basic value

    const stackTrace = isErr ? err.stack.split("\n")
                                      .splice(message ? 0 : 1)// if there is a custom message leave the original in the trace
                                      .map((line,index) => {
                                        // if its the first line && we have an custom message ? just return the raw line.
                                        return 0 === index && message ? line : line.split("at").pop().trim()
                                      })
                           : undefined

    const from = getSource(new Error().stack)

    const body = {
      git:{
        repo:gitValues.repo,
        branch:gitValues.branch,
        gitHash: gitValues.short
      },
      trace:{
        traceId,
        spanId,
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
        stackTrace: message ? stackTrace.splice(1)
                            : stackTrace // if there is no message the
      },
      process:{
        pTitle :  process.title,
        pid:      process.pid,
        ppid:     process.ppid,
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
        const outputStackTrace = isErr ? "\n"+stackTrace.map(line => ` at ${line}`).join("\n") : "";

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
    const dataBody = Object.assign({},body,{time : moment(body.time).format(config.time)})
    config.dataOut && config.dataOut(dataBody)
    return body;
  }// END scribble


//=====================================================
//=============================================== Utils
//=====================================================

//++++++++++++++++++++++++++++++++++++++++++ getSource
//++++++++++++++++++++++++++++++++++++++++++++++++++++

function getSource(stack){

    var originFile = stack.split('\n')[2].split('/');
    var file = originFile[originFile.length - 1].split(':')[0];
    var line = originFile[originFile.length - 1].split(':')[1];
    var path = originFile.splice(1).join('/')
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

  let traceId, spanLabel, tracestate;

  if('object' === typeof opts){
    spanLabel  = opts.spanLabel
    traceId    = opts.traceId
    tracestate = 'string' === typeof opts.tracestate
                  && "" !== opts.tracestate ? parceTracestate(opts.tracestate)
                                            : opts.tracestate // this maybe undefined
  } else if('string' === typeof opts){
    spanLabel = opts
  } else if('function' === typeof opts){
    next = opts;
  }

  if( ! traceId){
    traceId = crypto.randomBytes(16).toString('hex');
  }

  if( ! tracestate){
    tracestate = []
  }

  const spanId = cuidPrefix+("00000000" + traceCount.toString(16)).slice(-9)

  traceCount++;

  tracestate = tracestate.filter(span=> config.vendor !== span.vendor)
  tracestate.unshift({vendor:config.vendor,opaque:hexToBase64(spanId)})

  const trace = createNamespace(spanId)
  trace.run(()=>{
              trace.set('traceId', traceId);
              trace.set('spanId', spanId);
              trace.set('tracestate', tracestate);
    if(spanLabel){ trace.set('spanLabel', spanLabel); }
    next(spanId)
  })
} // END trace

//=====================================================
//=================================== Trace Context W3C
//=====================================================

scribbles.trace.header = function traceContext(){

  const correlaterValue = myNamespace()
  const traceId = correlaterValue('traceId')
  const spanId = correlaterValue('spanId')
  const tracestate = correlaterValue('tracestate');
  console.log(tracestate)
  return {
    tracespan:`00-${traceId}-${spanId}-01`,
    tracestate:tracestate.reduce((arr, {vendor,opaque}) => {
        arr.push(`${vendor}=${opaque}`);
        return arr;
      },[]).join()
  }
}

function parceTracestate(tracestate){
  return tracestate.split(',')
            .reduce((accumulator, currentValue)=>{
                  const [vendor, opaque] = currentValue.split('=')
                  accumulator.push({vendor,opaque})
                  return accumulator
              },[])
}

scribbles.updateTracestate = function updateTracestate(incomingTraceState){

  const correlaterValue = myNamespace()
  const spanId = crypto.randomBytes(8).toString('hex');
  let tracestate = parceTracestate(incomingTraceState)
      tracestate = tracestate.filter(span=> config.vendor !== span.vendor)
      tracestate.unshift({vendor:config.vendor,opaque:hexToBase64(spanId)})

  //update
  correlaterValue('spanId', spanId);
  correlaterValue('tracestate', tracestate);
} // updateTracestate

function hexToBase64(str) {

  const btoa = (str) => new Buffer(str, 'binary').toString('base64');

  return btoa(String.fromCharCode.apply(null,
    str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
  ).slice(0, -1);
}

scribbles.config = function scribblesConfig(opts){

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
      scribbles[logLevel] = scribble.bind(null,logLevel)
    } else {
      // Log levels below the seletecd level will be suppressed.
      // This will allow you to have verbose logging calls to out your code without the performance impact
      scribbles[logLevel] = ()=>{ }
    }
  }) // END config.levels.forEach

} // END scribblesConfig

scribbles.config()
