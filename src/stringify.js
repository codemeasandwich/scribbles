function validatingPropertyName(name){
  return /^(?!\d)[\w$]+$/.test(name)
}

function getObjName(val){
  if(val.constructor
  && "Object" !== val.constructor.name){
    return val.constructor.name + " "
  }
  return ""
} // END getObjName

function stringify(val,refs = [],name=""){
      if (val instanceof Date && !isNaN(val)) {
        return `Date(${val.toJSON()})`
    }
    if("symbol" === typeof val){
        return val.toString()
    }
    if("function" === typeof val){

      const [start]   = val.toString().split(")");
      const isArrow   = ! start.includes("function")
      const [nameA,argsB] = start.replace("function",'')
                               .replace(/ /g,'')
                               .split("(")
        let realName = name

        if(isArrow){
          if(name !=val.name)
            realName = val.name
          else
            realName = ""
        } else {
          if(name === val.name)
            realName = "ƒ"
          else
            realName = val.name
        }

        return `${realName}(${argsB})${
          isArrow?"=>":""
        }{-}`
    }
    if ("string" === typeof val) {
        return `”${val}”`
    }
    if (val instanceof Error) {
        return `${val.name}("${val.message}")`
    }
    if(Array.isArray(val)){
        return `[ ${val.map(v=>wrapRecursive(v,refs)).join(", ")} ]`
    }
    if(val && "object" === typeof val){

        return `${getObjName(val)}{ ${ Object.keys(val)
              .filter(name=> val.hasOwnProperty ? val.hasOwnProperty(name) : true)
              .map(name => `${validatingPropertyName(name)?name:`'${name}'`
                            }:${
                              wrapRecursive(val[name],refs,name)}`)
              .join(", ") } }`
    }
    return `${val}`
} // END stringify

function wrapRecursive(val,refs,name){

  if(refs.includes(val)){
    if(Array.isArray(val)){
      return `[ ...! ]`
    } else {
      return `{ ...${getObjName(val)||"!"} }`
    }
  } // END refs.includes

  if(Array.isArray(val) && val.length){
    refs = refs.concat([val])
  }else if(val && "object" === typeof val){
    refs = refs.concat(val)
  }

  return stringify(val,refs,name)
} // END wrapRecursive

module.exports = stringify
