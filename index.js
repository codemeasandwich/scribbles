
const gitRevP = require('git-rev-promises')
const format = require("string-template");
const path = require('path');
const moment = require('moment')
let appDir = path.dirname(require.main.filename);
 const createNamespace = require('cls-hooked').createNamespace;

const cls = require('cls-hooked');

appDir = appDir[0] === '/' ? appDir.substr(1) : appDir

let gitValues;
let flushingBuffer = false;
Promise.all([gitRevP.short(),gitRevP.repo(), gitRevP.branch()])
       .then(function([short,repo,branch]){
          gitValues = {short,repo,branch};
          flushingBuffer = true;
          logBuffer.forEach(({err, vals, message,opts, level}) => scribble(level, err, vals, message, opts))
          flushingBuffer = false;
       })// END get GIT values + process todo list

const logBuffer = []

function scribble(level, err, vals, message){

    const correlater = cls.getNamespace('correlate')
    const getCorrelaterValue = correlater ? correlater.get.bind(correlater) : ()=>"";

    if( ! gitValues){
      logBuffer.push({
        err,
        vals,
        message,
        level,
        opts:{
          time:new Date(),
          stack:new Error().stack,
          correlationId:getCorrelaterValue('correlationId'),
          correlationName:getCorrelaterValue('correlationName')
        }
      })
      return;
    }// END if( ! gitValues)

    // we are in the pcress of flushing old messages
    const { time, stack, correlationId, correlationName } = flushingBuffer ? arguments[4] : { correlationId:getCorrelaterValue('correlationId'), correlationName:getCorrelaterValue('correlationName') };



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

    const body = {

      message:         isErr && message ? message     : err.message || err,
      originalMessage: isErr && message ? err.message : undefined,
      level,
      branch:gitValues.branch,
      repo:gitValues.repo,
      vals,
      correlationId:correlationId?correlationId:undefined,
      correlationName:correlationName?correlationName:undefined,
      mode:config.mode,
      from:getSource(flushingBuffer ? stack : new Error().stack),
                          // remove the message line from trace
                          // as its in the "originalMessage" field
      stackTrace: message ? stackTrace.splice(1)
                          : stackTrace, // if there is no message the
      gitHash: gitValues.short,
      time: flushingBuffer ? time : new Date(),
      toString : function(){
        const time  = moment(body.time).format(config.time);
        const logLevel = body.level;

        const fileName   = body.from.file;
        const lineNumber = body.from.line;
        const exeType    = body.from.type;
        const mode       = body.mode
        const repo       = body.repo
        const branch     = body.branch
        const gitHash    = body.gitHash

        const outputMessage    = message || err.message || err;
        const outputValue      = "object" === typeof vals ? JSON.stringify(vals) : '';
        const outputStackTrace = isErr ? "\n"+stackTrace.map(line => ` at ${line}`).join("\n") : "";

        // based on: https://www.npmjs.com/package/tracer
        return format(config.format,{ repo,       mode,
                                      branch,     time,
                                      gitHash,    logLevel,
                                      fileName,   lineNumber,
                                      exeType,    correlationId,
                                      message : outputMessage,
                                      value : outputValue,
                                      stackTrace : outputStackTrace,
                                    correlationName})
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

    config.dataOut && config.dataOut(Object.assign({},body,{time : moment(body.time).format(config.time)}))
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
  time:'YYYY-MM-DDTHH:mm:ss.SSS',
  format:`{repo}:{mode}:{branch} [{correlationName} {correlationId}] {time} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}`
}




scribbles.correlate = function correlate(name, next){

  if('function' === typeof name){
    next = name;
    name = '';
  }

  const correlater = createNamespace('correlate')

  correlater.run(()=>{
    const correlationId = uuidGen().toUpperCase();
    correlater.set('correlationId', uuidGen().toUpperCase());
    correlater.set('correlationName', name);
      next(correlationId)
  })
}

//=====================================================
//==================================== Scribbles Config
//=====================================================

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


function uuidGen(a){return a?(a^Math.random()*16>>a/4).toString(32):([1e4]+1e2).replace(/[018]/g,uuidGen)}
