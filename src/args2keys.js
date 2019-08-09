function args2keys(args, notUsed){

  let message = notUsed,
      value   = notUsed,
      error   = notUsed;

  if(2 < args.length){
    const [ a,b,c ] = args;
    message = a+''
    value = b
    if(c instanceof Error){
      error = c
    } else if (b instanceof Error){
      error = b
      value = c
    }
  } else if(2 === args.length){
    const [ a,b ] = args;
    if('string' === typeof a){
      message = a
      if(b instanceof Error){
        error = b
      } else {
        value = b
      }
    } else {
      value = a
      if(a instanceof Error){
        error = a
        value = b
      } else if(b instanceof Error){
        error = b
      }
    } // END else

  } else if(1 === args.length){
    const [ a ] = args;
    if('string' === typeof a){
      message = a
    } else if(a instanceof Error){
      error = a
    } else {
      value = a
    }
  }

  return { message, value, error }
}

module.exports = args2keys
