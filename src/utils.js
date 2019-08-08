
function parceTracestate(tracestate){
  return tracestate.split(',')
            .reduce((accumulator, currentValue)=>{
                  const [key, value] = currentValue.split('=')
                  accumulator.push({key,value})
                  return accumulator
              },[])
} // END parceTracestate

module.exports = { parceTracestate }
