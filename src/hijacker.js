//=====================================================
//====================================== forwardHeaders
//=====================================================
const http = require('http')
const reqHttp = http.request.bind(http)
function hijacker(scribbles){

  http.request = function httpRequestWrapper(url, options, callback){

    if( ! config.headers && ! config.headersMapping ){
      return reqHttp(url, options, callback)
    }

    if('function' === typeof options){
      callback = options
      options = {}
    }

    if('object' === typeof url){
      options = url;
      url = null;
    }

    options.headers = scribbles.trace.headers(options.headers || {})

    if(url){
      return reqHttp(url, options, callback)
    } else {
      return reqHttp(options, callback)
    }
  }
}

module.exports = hijacker
