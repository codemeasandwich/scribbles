
const gitRevP = require('git-rev-promises')
var format = require("string-template");
var path = require('path');
var appDir = path.dirname(require.main.filename);

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

    if( ! gitValues){
      logBuffer.push({
        err,
        vals,
        message,
        level,
        opts:{
          time:new Date(),
          stack:new Error().stack
        }
      })
      return;
    }// END if( ! gitValues)

    const { time, stack } = arguments[4] || {};
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
      err,
      mode:config.mode,
      from:getSource(flushingBuffer ? stack : new Error().stack),
                          // remove the message line from trace
                          // as its in the "originalMessage" field
      stackTrace: message ? stackTrace.splice(1)
                          : stackTrace, // if there is no message the
      gitHash: gitValues.short,
      time: flushingBuffer ? time : new Date(),
      toString : function(){
        const timeIso  = moment(body.time).format(config.time);//body.time.toISOString().replace(/([^T]+)TT([^\.]+).*/g, '$1 $2');
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
                                      branch,     timeIso,
                                      gitHash,    logLevel,
                                      fileName,   lineNumber,
                                      exeType,
                                      message : outputMessage,
                                      value : outputValue,
                                      stackTrace : outputStackTrace})
      }
    } // END body

    if(config.standerOut){
      let standerOut;
      if(config.standerOut[body.level]){
        standerOut = config.standerOut[body.level]
      } else if('function' === typeof config.standerOut){
        standerOut = config.standerOut
      } else if('function' === typeof config.standerOut.log) {
        standerOut = config.standerOut.log
      } else {
        throw new Error(`${body.level} was not found on standerOut`)
      }
      standerOut(body.toString())
    } // END if config.standerOut

    config.dataOut && config.dataOut(body)
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
  standerOut: console,
  dataOut : undefined,
  time:'YYYY-MM-DDTHH:mm:ss.SSS',
  format:`{repo}:{mode}:{branch} {timeIso} #{gitHash} <{logLevel}> {fileName}:{lineNumber} ({exeType}) {message} {value} {stackTrace}`
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
      scribbles[logLevel] = ()=>{ }
    }
  }) // END config.levels.forEach

} // END scribblesConfig

scribbles.config()
