const scribbles = require('./index');

scribbles.debug('HelloWorld');
scribbles.info('HelloWorld');
scribbles.log('HelloWorld');
scribbles.warn('HelloWorld');
scribbles.error('HelloWorld');

scribbles.config({
  logLevel:'warning',
  levels:['fatal','error','warning','info'],
  stdOut:null,
  dataOut: data => console.log(data+'',data.status)
})

scribbles.status();

scribbles.trace('sample_trace',()=>{
  scribbles.info('A');
  scribbles.warning('B');
  scribbles.error('C');
  scribbles.fatal('B');
})