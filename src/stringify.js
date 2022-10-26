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
              .map(name => `${name}:${wrapRecursive(val[name],refs,name)}`)
              .join(", ") } }`
    }
    return `${val}`
} // END stringify

function wrapRecursive(val,refs,name){
  //debugger
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
/*stringify({
  b2:b,
  e:console.log,
  f:(a,b)=>({}),
  f2:function(c,d){},
  f3:function doog(e,f){}
})
var a2 = ()=>{}
var b = {c:a2,a2}
var a = [1,2,3]
a.push(a)

var y = {s:6}
a.push(y)
y.y = y
stringify({
  a,
  b:null,
  b2:b,
  c:",",
    err:new Error("qwe"),
  d:undefined,
  e:console.log,
  f:(a,b)=>({}),
  f2:function(c,d){},
  f3:function doog(e,f){},
  g:Symbol("s"),
  a1:a,
//    w:window,
    x:new Date(),
    y,
    z:NaN
})
*/
module.exports = stringify
