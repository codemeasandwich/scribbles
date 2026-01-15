const os = require('os');
const exec = require('child_process').exec;
const fixedStatus = {};
let lastBlockedAt = null;

function status(){

  return Promise.all([
    // getCPUUsage take 500ms to run. So kick it off first
    getCPUUsage(),

        Promise.resolve(
          // check if port was set
          fixedStatus.port ?
          // return existing port
          { port:fixedStatus.port } :
          // ELSE  find connected port
          cliInfo("lsof -i -P -n | grep LISTEN | grep " + process.pid, text => {
            if(!text){
              // if the serivce is NOT connected to a port
              return { port:null }
            }
            const matchingLine = text.split("\n").filter(line => line.slice("node".length).trim().startsWith(process.pid))[0];
            if(!matchingLine){
              return { port:null }
            }
            const [command, pid, user, fd, type, device, size_off, node,name] =
            matchingLine.split(" ").filter(item => item);
            const port = +name.split(":").pop()
            return { command, pid, user, fd, type, device, size_off, node,name, port }
          }) // END lsof -i -P -n | grep LISTEN | grep

      ).then((lsof) => Promise.all([

      cliInfo("ps -v | grep " + process.pid, text => {
        const matchingLine = text.split("\n").filter(line => line.trim().startsWith(process.pid))[0];
        if(!matchingLine){
          return { pid: process.pid, stat: null, time: null, sl: null, re: null, pagein: null, vsz: null, rss: null, lim: null, tsiz: null, cpu: 0, mem: 0, command: null, args: null }
        }
        const [pid, stat, time, sl,re, pagein, vsz, rss, lim, tsiz, cpu, mem, command, args] =
        matchingLine.split(" ").filter(item => item);
        return { pid, stat, time, sl,re, pagein, vsz, rss, lim, tsiz, cpu:+cpu, mem:+mem, command, args }
      }), // END ps -v | grep

      lsof,
      // "netstat -an" = Proto, Recv-Q, Send-Q, Local Address, Foreign Address, (state)
      lsof.port ? cliInfo('netstat -an | grep "'+lsof.port+' " | wc -l', text => {
        let connections = +text;
        connections--; // remove the "LISTEN" entry
        connections = Math.ceil(connections / 2) // each connection is reported twice.
        // incoming port -> outgoing port AND outgoing port -> incoming Port
        return ({connections})
      }) : {connections:0} // END netstat -an | grep
    ])) // END then - inner
  ]) // END Promise.all -outter
      .then(([cupUsage,[ps,lsof,net]])=>{

        const app_startedAt = fixedStatus.app_startedAt
                            = fixedStatus.app_startedAt
                            || new Date(Date.now()-Math.round(process.uptime()*1000))

        const sys_startedAt = fixedStatus.sys_startedAt
                            = fixedStatus.sys_startedAt
                            || new Date(Date.now()-Math.round(os.uptime()*1000))

        const port = fixedStatus.port
                   = fixedStatus.port || lsof.port

        const cpu = fixedStatus.cpu
                  = fixedStatus.cpu || Object.assign({cores:os.cpus().length},os.cpus()[0])

        delete cpu.times;

        const totalMem = fixedStatus.totalMem
                       = fixedStatus.totalMem || Math.round(os.totalmem()/1024/1024)//+"M"

        return {
            state: lastBlockedAt ? 'blocking' : 'up',
            process: {
              percUsedCpu:+ps.cpu.toFixed(2),
              percFreeMem:+ps.mem.toFixed(2),
              usedMem: Math.round(process.memoryUsage().rss / 1024 / 1024),//+"M",
              startedAt:app_startedAt,
            },
            network:{
              port,
              connections: net.connections
            },
            sys: {
              startedAt: sys_startedAt,
              arch:     process.arch,
              platform: process.platform,
              usedMem: totalMem - Math.round(os.freemem()/1024/1024),
              totalMem,
              freeMem: Math.round(os.freemem()/1024/1024),//+"M"
            },
            cpu: Object.assign({},cpu,{
              percUsed: +(cupUsage.percUsed*100).toFixed(2),
              percFree: +(cupUsage.percFree*100).toFixed(2)})
          } // END return
      }).catch(err => {
        throw err
      })
} // END status

module.exports = status

function cliInfo(command,trans){
    return new Promise(function(resolve, reject) {
      exec(command, { cwd: __dirname }, function (err, stdout, stderr) {
        if(err){ stdout = "" }
        resolve(trans ? trans(stdout) : stdout)
      })
    });
} // END cliInfo

function getCPUUsage(){
	return new Promise(function(resolve, reject) {

      var stats1     = getCPUInfo();
      var startIdle  = stats1.idle;
      var startTotal = stats1.total;

      setTimeout(function() {
          var stats2   = getCPUInfo();
          var endIdle  = stats2.idle;
          var endTotal = stats2.total;

          var idle 	= endIdle - startIdle;
          var total = endTotal - startTotal;
          var perc	= idle / total;

          resolve( { percFree: perc, percUsed:(1 - perc) });
      }, 500 ).unref();
  }) // END new Promise
} // END getCPUUsage

function getCPUInfo(){
    const cpus = os.cpus();
    let user = 0,nice = 0,sys = 0,idle = 0,irq = 0;

    for(const cpu in cpus){
        if (!cpus.hasOwnProperty(cpu)) continue;
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys  += cpus[cpu].times.sys;
        irq  += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    } // END for

    return { idle, total: user + nice + sys + idle + irq };
} // END getCPUInfo

setTimeout(function () {
    let start = process.hrtime();
    const interval = 100, threshold = 15;
    setInterval(function () {
        const delta = process.hrtime(start);
        const nanosec = delta[0] * 1e9 + delta[1];
        const ms = nanosec / 1e6;
        const n = ms - interval;

        if (n > threshold) {
            lastBlockedAt = Date.now();
        } else if( lastBlockedAt
               &&  2000 < (Date.now() - lastBlockedAt) ){
          // reset if the eventloop has been UN-blocked for 2sec+
          lastBlockedAt = null
        }
        start = process.hrtime();
    }, interval).unref();
},10000).unref() // wait 10 sec for everything to get setup & running
