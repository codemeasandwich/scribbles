function args2keys(args, notUsed){

  let message = notUsed,
      value   = notUsed,
      error   = notUsed;
  let indexs = []
  if(2 < args.length){
    const [ a,b,c ] = args;
    message = a+''
    indexs[0] = "message"
    value = b
    indexs[1] = "value"
    if(c instanceof Error){
      error = c
      indexs[2] = "error"
    } else if (b instanceof Error){
      error = b
      indexs[1] = "error"
      value = c
      indexs[2] = "value"
    }
  } else if(2 === args.length){
    const [ a,b ] = args;
    if('string' === typeof a){
      message = a
      indexs[0] = "message"
      if(b instanceof Error){
        error = b
        indexs[1] = "error"
      } else {
        value = b
        indexs[1] = "value"
      }
    } else {
      value = a
      indexs[0] = "value"
      if(a instanceof Error){
        error = a
        indexs[0] = "error"
        value = b
        indexs[1] = "value"
      } else if(b instanceof Error){
        error = b
        indexs[1] = "error"
      }
    } // END else

  } else if(1 === args.length){
    const [ a ] = args;
    if('string' === typeof a){
      message = a
      indexs[0] = "message"
    } else if(a instanceof Error){
      error = a
      indexs[0] = "error"
    } else {
      value = a
      indexs[0] = "value"
    }
  }

  return { message, value, error, indexs }
}

module.exports = args2keys
