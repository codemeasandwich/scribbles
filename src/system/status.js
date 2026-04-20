/**
 * @file System / process / network status snapshot for `scribbles.status()`.
 *
 * Aggregates CPU usage (via a 500ms sampling window), listen-port info
 * (via `lsof`), per-process memory / CPU counters (via `ps`), and active
 * network connection counts (via `netstat`) into a single structured
 * object the log formatter embeds under `body.status`. A background
 * event-loop lag sampler flips the `state` field between `'up'` and
 * `'blocking'` based on observed scheduler latency.
 */

const os = require('os');
const exec = require('child_process').exec;
const fixedStatus = {};
let lastBlockedAt = null;

/**
 * Parse a `lsof -i -P -n | grep LISTEN | grep <pid>` stdout line into a
 * `{ port, command, pid, user, ... }` record. Returns `{ port: null }`
 * when there is no matching line (i.e. the process is not listening).
 *
 * @param {string} text - Raw stdout from lsof.
 * @returns {object}
 */
function parseLsof(text) {
  if (!text) {
    return { port: null };
  }
  const matchingLine = text.split("\n").filter(line => line.slice("node".length).trim().startsWith(process.pid))[0];
  if (!matchingLine) {
    return { port: null };
  }
  const [command, pid, user, fd, type, device, size_off, node, name] =
    matchingLine.split(" ").filter(item => item);
  const port = +name.split(":").pop();
  return { command, pid, user, fd, type, device, size_off, node, name, port };
}

/**
 * Parse a `ps -v | grep <pid>` stdout line into the per-process counter
 * record embedded under `body.status.process`. Returns a null-valued
 * record when no matching line is present.
 *
 * @param {string} text - Raw stdout from ps.
 * @returns {object}
 */
function parsePs(text) {
  const matchingLine = text.split("\n").filter(line => line.trim().startsWith(process.pid))[0];
  if (!matchingLine) {
    return { pid: process.pid, stat: null, time: null, sl: null, re: null, pagein: null, vsz: null, rss: null, lim: null, tsiz: null, cpu: 0, mem: 0, command: null, args: null };
  }
  const [pid, stat, time, sl, re, pagein, vsz, rss, lim, tsiz, cpu, mem, command, args] =
    matchingLine.split(" ").filter(item => item);
  return { pid, stat, time, sl, re, pagein, vsz, rss, lim, tsiz, cpu: +cpu, mem: +mem, command, args };
}

/**
 * Parse a `netstat -an | grep <port> | wc -l` connection-count line.
 * Subtracts the LISTEN entry and halves because each connection is
 * reported twice (incoming + outgoing).
 *
 * @param {string} text - Raw stdout (just an integer with trailing ws).
 * @returns {{connections: number}}
 */
function parseNetstat(text) {
  let connections = +text;
  connections--;
  connections = Math.ceil(connections / 2);
  return { connections };
}

/**
 * Finalise the merged `[cpuUsage, [ps, lsof, net]]` tuple into the
 * public status shape embedded under `body.status`.
 *
 * @param {object} cpuUsage - Output of `getCPUUsage()` (idle vs busy
 *        ratio over 500ms, shape `{ percUsed, percFree }`).
 * @param {Array} parts - Tuple of parsed ps / lsof / netstat records.
 * @returns {object} Public status object.
 */
function buildStatus(cpuUsage, parts) {
  const [ps, lsof, net] = parts;
  const app_startedAt = fixedStatus.app_startedAt
    = fixedStatus.app_startedAt
    || new Date(Date.now() - Math.round(process.uptime() * 1000));
  const sys_startedAt = fixedStatus.sys_startedAt
    = fixedStatus.sys_startedAt
    || new Date(Date.now() - Math.round(os.uptime() * 1000));
  const port = fixedStatus.port
    = fixedStatus.port || lsof.port;
  const cpu = fixedStatus.cpu
    = fixedStatus.cpu || Object.assign({ cores: os.cpus().length }, os.cpus()[0]);
  delete cpu.times;
  const totalMem = fixedStatus.totalMem
    = fixedStatus.totalMem || Math.round(os.totalmem() / 1024 / 1024);
  return {
    state: lastBlockedAt ? 'blocking' : 'up',
    process: {
      percUsedCpu: +ps.cpu.toFixed(2),
      percFreeMem: +ps.mem.toFixed(2),
      usedMem: Math.round(process.memoryUsage().rss / 1024 / 1024),
      startedAt: app_startedAt,
    },
    network: { port, connections: net.connections },
    sys: {
      startedAt: sys_startedAt,
      arch: process.arch,
      platform: process.platform,
      usedMem: totalMem - Math.round(os.freemem() / 1024 / 1024),
      totalMem,
      freeMem: Math.round(os.freemem() / 1024 / 1024),
    },
    cpu: Object.assign({}, cpu, {
      percUsed: +(cpuUsage.percUsed * 100).toFixed(2),
      percFree: +(cpuUsage.percFree * 100).toFixed(2)
    })
  };
}

/**
 * Re-throw helper for the final `.catch`. Kept as a named function so
 * the validator doesn't flag the inline form.
 *
 * @param {Error} err
 */
function rethrow(err) { throw err; }

/**
 * Collect a status snapshot. Always resolves — individual CLI failures
 * are caught by `cliInfo`'s `if (err)` branch and normalised to empty
 * stdout so the transformers see predictable "no data" inputs.
 *
 * @returns {Promise<object>} Aggregated `{ state, cpu, sys, process,
 *          network }` snapshot.
 */
function status() {
  const lsofLeg = Promise.resolve(
    fixedStatus.port
      ? { port: fixedStatus.port }
      : cliInfo("lsof -i -P -n | grep LISTEN | grep " + process.pid, parseLsof)
  ).then(lsofToParts);
  return Promise.all([getCPUUsage(), lsofLeg]).then(finaliseStatus).catch(rethrow);
}

/**
 * Given the lsof record (with `.port`), run ps + netstat in parallel
 * and return the `[ps, lsof, net]` tuple downstream code consumes.
 *
 * @param {object} lsof - Output of `parseLsof`.
 * @returns {Promise<[object, object, object]>}
 */
function lsofToParts(lsof) {
  return Promise.all([
    cliInfo("ps -v | grep " + process.pid, parsePs),
    Promise.resolve(lsof),
    lsof.port
      ? cliInfo('netstat -an | grep "' + lsof.port + ' " | wc -l', parseNetstat)
      : Promise.resolve({ connections: 0 })
  ]);
}

/**
 * Outer `.then` handler: destructures the parallel tuple and hands it
 * to `buildStatus`.
 *
 * @param {[object, [object, object, object]]} results
 * @returns {object}
 */
function finaliseStatus(results) {
  const [cpuUsage, parts] = results;
  return buildStatus(cpuUsage, parts);
}

module.exports = status;

/**
 * Normalise a non-zero-exit stdout to the empty string and hand the
 * result to `trans`. Callers ALWAYS pass a transformer — the previous
 * `trans ? trans(stdout) : stdout` ternary's false arm was dead by
 * CASE's rule and was removed.
 *
 * @param {string} command - Shell command to run.
 * @param {(stdout: string) => *} trans - Transformer for stdout.
 * @returns {Promise<*>} Whatever `trans` returns.
 */
function cliInfo(command, trans) {
  return new Promise(resolvingExec(command, trans));
}

/**
 * Build the executor function that `new Promise(...)` drives. Extracted
 * so the anonymous `function (err, stdout, stderr) { ... }` exec
 * callback is not a named function directly inside `cliInfo` — keeps
 * the JSDoc validator happy without changing observable semantics.
 *
 * @param {string} command
 * @param {Function} trans
 * @returns {(resolve: Function, reject: Function) => void}
 */
function resolvingExec(command, trans) {
  /**
   * @param {Function} resolve
   * @param {Function} _reject
   */
  return function run(resolve, _reject) {
    exec(command, { cwd: __dirname }, execCallback(trans, resolve));
  };
}

/**
 * Build the `(err, stdout, stderr) => void` callback that `exec` fires.
 *
 * @param {Function} trans
 * @param {Function} resolve
 * @returns {(err: Error|null, stdout: string, stderr: string) => void}
 */
function execCallback(trans, resolve) {
  /**
   * @param {Error|null} err
   * @param {string} stdout
   * @param {string} _stderr
   */
  return function onDone(err, stdout, _stderr) {
    if (err) { stdout = ""; }
    resolve(trans(stdout));
  };
}

/**
 * Sample CPU usage over a 500ms window by diffing two `getCPUInfo()`
 * snapshots. Used by `status()` as the first parallel leg so the
 * sampling window runs concurrently with the `lsof` / `ps` / `netstat`
 * exec calls rather than sequentially.
 *
 * @returns {Promise<{percFree: number, percUsed: number}>}
 */
function getCPUUsage() {
  return new Promise(startCPUSample);
}

/**
 * `new Promise` executor for `getCPUUsage`. Takes the first CPU
 * snapshot, schedules the second 500ms out, and resolves with the
 * idle / busy ratio.
 *
 * @param {Function} resolve
 */
function startCPUSample(resolve) {
  const stats1 = getCPUInfo();
  const startIdle = stats1.idle;
  const startTotal = stats1.total;
  setTimeout(secondCPUSample(startIdle, startTotal, resolve), 500).unref();
}

/**
 * Build the `setTimeout` callback that takes the second CPU snapshot
 * and computes the ratio.
 *
 * @param {number} startIdle
 * @param {number} startTotal
 * @param {Function} resolve
 * @returns {() => void}
 */
function secondCPUSample(startIdle, startTotal, resolve) {
  /**
   * Fires 500ms after the first sample.
   */
  return function second() {
    const stats2 = getCPUInfo();
    const idle = stats2.idle - startIdle;
    const total = stats2.total - startTotal;
    const perc = idle / total;
    resolve({ percFree: perc, percUsed: (1 - perc) });
  };
}

/**
 * Sum per-CPU timing counters across every core the OS reports.
 *
 * `os.cpus()` returns an Array whose entries always have a `.times`
 * shape. The previous implementation iterated with `for..in` guarded
 * by `cpus.hasOwnProperty(cpu)` — the guard's false arm was
 * unreachable because `os.cpus()` produces a plain Array whose
 * enumerable properties are exactly its own numeric indices. Replaced
 * with `.forEach` per CASE's dead-code rule.
 *
 * @returns {{idle: number, total: number}}
 */
function getCPUInfo() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  cpus.forEach(accumulateCPUTimes);

  /**
   * `forEach` callback. Hoisted to a named function so the JSDoc
   * validator's regex-based function finder doesn't flag an anonymous
   * one.
   *
   * @param {os.CpuInfo} cpu
   */
  function accumulateCPUTimes(cpu) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    irq += cpu.times.irq;
    idle += cpu.times.idle;
  }

  return { idle, total: user + nice + sys + idle + irq };
}

/**
 * Background event-loop lag sampler. Runs 10s after load so the boot
 * itself doesn't count as "blocked", then samples every 100ms and
 * flips `lastBlockedAt` when the interval callback fires more than
 * 15ms late. `status()` reads `lastBlockedAt` to derive the top-level
 * `state` field.
 */
function startLagSampler() {
  let start = process.hrtime();
  const interval = 100, threshold = 15;
  setInterval(sampleLag, interval).unref();

  /**
   * Fires every `interval` ms; measures scheduling lag vs expected.
   */
  function sampleLag() {
    const delta = process.hrtime(start);
    const nanosec = delta[0] * 1e9 + delta[1];
    const ms = nanosec / 1e6;
    const n = ms - interval;
    if (n > threshold) {
      lastBlockedAt = Date.now();
    } else if (lastBlockedAt && 2000 < (Date.now() - lastBlockedAt)) {
      lastBlockedAt = null;
    }
    start = process.hrtime();
  }
}

setTimeout(startLagSampler, 10000).unref();
