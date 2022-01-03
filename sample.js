const scribbles = require('./index');

// API use cases

// API (message)
// API (value)
// API (error)

// API (message, value)
// API (error, value)
// API (value, error)
// API (message, error)

// API (message, value, error)
// API (message, error, value)

scribbles.debug('HelloWorld');
//return
scribbles.info( 'HelloWorld');
scribbles.log(  'HelloWorld');
scribbles.warn( 'HelloWorld');
scribbles.error('HelloWorld');
console.log();
scribbles.debug('HelloNull',null);
scribbles.info( 'HelloNumber',123);
scribbles.log(  'HelloObject',{foo:'bar'});
scribbles.warn( 'HelloUndefined',undefined);
scribbles.error(new Error("an err1"));
scribbles.error('HelloError2',new Error("an err2"));
scribbles.error('HelloError3',{bar:'baz'},new Error("an err3"));
scribbles.error({bar:'baz'},new Error("an err4"));
console.log();
scribbles.debug(null);
scribbles.info(123);
scribbles.log({foo:'bar'});
scribbles.warn();
scribbles.warn(undefined);
scribbles.error(new Error("an err"));
console.log();
scribbles.config({
  logLevel:'warning',
  levels:['fatal','error','warning','info'],
  stdOut:null,
  //obj2json:true,
  //multiline:false,
  dataOut: data => data.status ? console.log(data+'',data)
                               : console.log(data+'')
})

//scribbles.warning("obj2json",{foo:'bar'});

scribbles.status("Im async");

scribbles.warning('SOURCE fn',foo);
scribbles.warning(foo);
scribbles.warning('true',true);

scribbles.trace('in_trace',()=>{
  scribbles.error('false',false);
  scribbles.fatal('null',null);
})

function foo(){
  return "abc"
}
