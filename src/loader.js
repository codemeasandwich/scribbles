const hook = require('node-hook');
const appDir = require('../appDir');
const config = require('./config');

hook.hook('.js', function processFileForScribblesCalls (source, filename) {

  const path = filename.startsWith("/"+appDir) ? filename.substr(appDir.length+2) : "/"+filename

  const levels2check = [...config.levels,"status"];

  return source.split("\n").map((line,index)=>{

    	if(0 <= line.indexOf("scribbles.")){

        for (let level of levels2check) {

          //TODO: use the list on `resirvedFnNames`
          // if scribbles.***( is NOT a resirvedFnNames
          // then take thats its a LOG & replace with **.at(...)
          const find = "scribbles."+level+"("
          const indexOf = line.indexOf(find)
          if(0 <= indexOf) {
            return line.replace(find,`scribbles.${level}.at({file:"${path}",line:${index+1},col:${indexOf}},`)
          } // END if
        }// END for
      } // END if
      return line

    }).join("\n")

  });
