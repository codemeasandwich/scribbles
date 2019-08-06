const scribbles = require('./index');

scribbles.debug('HelloWorld');
scribbles.info('HelloWorld');
scribbles.log('HelloWorld');
scribbles.warn('HelloWorld');
scribbles.error('HelloWorld');
console.log();
scribbles.config({
  logLevel:'warning',
  levels:['fatal','error','warning','info'],
  stdOut:null,
  dataOut: data => data.status ? console.log(data+'',data.status) : console.log(data+'')
})

scribbles.status("Im async");

  scribbles.info('A');
  scribbles.warning('B');
scribbles.trace('in_trace',()=>{
  scribbles.error('C');
  scribbles.fatal('D');
})
