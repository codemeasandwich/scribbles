module.exports = {
  mode: process.env.NODE_ENV || 'dev',
  logLevel:process.env.LOG_LEVEL || "debug",
  levels:["error", "warn", "log", "info", "debug"],
  stdOut: console,
  dataOut : undefined,
  //vendor:defaultVendor, // this is the name of the project
  time:'YYYY-MM-DDTHH:mm:ss.SSS',
  format:`{repo}:{mode}:{branch} [{spanLabel} {spanId}] {time} #{gitHash} <{logLevel}> {fileName}:{lineNumber} {message} {value} {stackTrace}`
}
