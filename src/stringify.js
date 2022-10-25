

function stringify(val,refs = []){
      if (val instanceof Date && !isNaN(val)) {
        return `Date(${val.toJSON()})`
    }
    if("symbol" === typeof val){
        return val.toString()
    }
    if("function" === typeof val){
        return `${val.name}()`
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
        return `{ ${ Object.keys(val)
              .filter(name=> val.hasOwnProperty(name))
              .map(name => `${name}:${wrapRecursive(val[name],refs)}`)
              .join(", ") } }`
    }
    return `${val}`
} // END stringify

function wrapRecursive(val,refs){
  //debugger
  if(refs.includes(val)){
    if(Array.isArray(val)){
      return `[ ..! ]`
    } else {
      return `{ ..! }`
    }
  }

  if(Array.isArray(val) && val.length){
    refs = refs.concat([val])
  }else if(val && "object" === typeof val){
    refs = refs.concat(val)
  }

  return stringify(val,refs)
} // END wrapRecursive

module.exports = stringify
