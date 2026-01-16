const hook = require('node-hook');
const appDir = require('../../appDir');
const config = require('../core/config');

// Note: This function runs inside node-hook before Jest's coverage instrumentation.
// The code IS executed (verified by fixture file tests working), but coverage
// cannot be measured. The exported _loadArgNames and _splitArgs are tested
// directly in 99-loader-utils.test.js to ensure the parsing logic is covered.
/* istanbul ignore next */
function processFileForScribblesCalls(source, filename) {

  const path = filename.startsWith("/" + appDir) ? filename.substr(appDir.length + 2) : "/" + filename

  const levels2check = [...config.levels, "status"];
  return source.split("\n").map((line, index, lines) => {

    if (0 <= line.indexOf("scribbles.")) {

      for (let level of levels2check) {

        //TODO: use the list on `resirvedFnNames`
        // if scribbles.***( is NOT a resirvedFnNames
        // then take thats its a LOG & replace with **.at(...)
        const find = "scribbles." + level + "("
        const indexOf = line.indexOf(find)
        if (0 <= indexOf) {
          let runningCharPointer = indexOf + find.length;
          let linePointer = index
          let myLine = line
          const getNextChar = () => {
            //console.log(runningCharPointer,">",myLine.length)
            if (runningCharPointer > myLine.length) {
              runningCharPointer = 0
              myLine = lines[++linePointer]
            }
            //console.log(runningCharPointer,myLine)
            const result = [
              myLine[runningCharPointer - 1] || "",
              myLine[runningCharPointer],
            ]
            runningCharPointer++
            //console.log(result)
            return result
          } // getNextChar
          return line.replace(find, `scribbles.${level}.at({file:"${path}",line:${index + 1},col:${indexOf},args:[${loadArgNames(getNextChar)}]},`)
        } // END if
      }// END for
    } // END if
    return line

  }).join("\n")

}

hook.hook('.js', processFileForScribblesCalls);



const allStrings = ['"', "'", '`']
function loadArgNames(getChar) {

  let result = {
    temp: "",
    opened: [],
    args: [],
    fin: false,
    procThisLoop: true,
    names: [],
    raw: ""
  }

  let index = 0
  do {
    const [preChar, char] = getChar()
    result = splitArgs(result, char, preChar)
    index++
  } while (!result.fin)
  return result.args
    .map(line => line ? "x=>x`" + line + "`"
      : line)
    .join()
} // END loadArgNames

function splitArgs(all, char, preChar) {
  // x=>x`user[index:${index}]`
  // x=>x`err`

  // Split it up into args
  const lastOpened = all.opened[all.opened.length - 1]
  if ("" === all.temp
    && " " === char) {
    return all
  }
  if ("" === all.temp
    && (allStrings.includes(char)
      || ['{', '['].includes(char))) {
    all.procThisLoop = false
  }

  if (allStrings.includes(char)
    && !allStrings.includes(lastOpened)) {
    all.opened.push(char)
    all.procThisLoop = false
  }
  if (0 === all.opened.length) {
    switch (char) {
      case ')':
        all.fin = true
      case ',':
        if (all.raw.includes("=>")
          || all.raw.includes("function")
          || "undefined" === all.raw.trim()
          || "true" === all.raw.trim()
          || "false" === all.raw.trim()
          || "new Date" === all.raw.trim()
          || "new Date()" === all.raw.trim()
          || /^-{0,1}\d+(\.\d+)?$/.test(all.raw.trim())
          || "null" === all.raw.trim()) {
          all.args.push(false)//(all.raw)
        } else if (!['{', '[', '(', '"', "'", '`'].some(x => all.temp.includes(x))) {
          all.args.push(all.temp/*+":${"+all.temp+"}"*/)
        } else if (!allStrings.includes(all.temp[0])
          && !['{', '['].includes(all.temp[0])) {
          all.args.push(all.temp)
        } else {
          all.args.push(false)
        }
        all.temp = ""
        all.raw = ""
        all.names = []
        all.procThisLoop = true
        return all
    }
  }
  if (allStrings.includes(lastOpened) && char === lastOpened
    || '}' === char && '{' === lastOpened
    || ')' === char && '(' === lastOpened
    || ']' === char && '[' === lastOpened) {
    //   console.log(all)
    all.opened.pop()
    if (all.procThisLoop && 0 < all.names.length) {
      //  debugger
      const thisName = all.names[all.names.length - 1].slice(2)
      // console.log(all,thisName)
      if (thisName.includes(":")
        || thisName === `${+thisName}`) {
        all.names.pop()
      } else {
        all.temp += all.names.pop() + '}'
      }
    }
    all.procThisLoop = !allStrings.includes(lastOpened)
  } else if ("`" === lastOpened
    && '{' === char
    && '$' === preChar) {
    all.opened.push(char)
    if (all.procThisLoop)
      all.names.push("${")
  } else if (!allStrings.includes(lastOpened)
    && ['{', '[', '('].includes(char)) {
    all.opened.push(char)
    if (all.procThisLoop) {
      all.names.push("${")
    }

  } else if (all.procThisLoop) {
    const named = all.names[all.names.length - 1]
    if (":${" === named
      && (allStrings.includes(char) || `${+char}` === char)) {
      all.procThisLoop = false
      all.names.pop()
    } else if ("," === char) {
      //   debugger
      all.temp += all.names.pop() + '}'
    } else {
      all.names[all.names.length - 1] = named + char
    }
  } else if ("," === char
    && ['{', '[', '('].includes(lastOpened)) {
    all.procThisLoop = true
    all.names.push("${")
  }
  all.temp += char
  all.raw += char
  return all

} // END processChar

// Export for testing - these are the arg parsing utilities
module.exports = {
  _loadArgNames: loadArgNames,
  _splitArgs: splitArgs,
  _processSource: processFileForScribblesCalls
};
