const scribbles = require('./index');

// API use cases
// API (label)
// API (label, value)
// API (label, value, error)
// API (value, error)
// API (value)
// API (error)

scribbles.debug('HelloWorld');
scribbles.info( 'HelloWorld');
scribbles.log(  'HelloWorld');
scribbles.warn( 'HelloWorld');
scribbles.error('HelloWorld');
console.log();
scribbles.debug('HelloNull',null);
scribbles.info( 'HelloNumber',123);
scribbles.log(  'HelloObject',{foo:'bar'});
scribbles.warn( 'HelloUndefined',undefined);
scribbles.error('HelloError',new Error("an err"));
scribbles.error('HelloError2',{bar:'baz'},new Error("an err2"));
console.log();
scribbles.debug(null);
scribbles.info(123);
scribbles.log({foo:'bar'});
scribbles.warn(undefined);
scribbles.error(new Error("an err"));
console.log();
scribbles.config({
  logLevel:'warning',
  levels:['fatal','error','warning','info'],
  stdOut:null,
  obj2json:true,
  multiline:false,
  dataOut: data => data.status ? console.log(data+'',data)
                               : console.log(data+'')
})

scribbles.warning("obj2json",{foo:'bar'});

scribbles.status("Im async");

scribbles.info('SOURCE fn',foo);
scribbles.warning('true',true);

scribbles.trace('in_trace',()=>{
  scribbles.error('false',false);
  scribbles.fatal('null',null);
})

function foo(){
  return "abc"
}
