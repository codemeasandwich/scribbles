// Pure-CJS child module. `require("scribbles")` happens inside this
// module while the parent's require() is still on the call stack —
// the exact pattern that triggered Bun's "Expected CommonJS module to
// have a function wrapper" error under v2.0.0. No scribbles.<level>
// call sites, so the fast-path delegation inside the CJS-extensions
// handler should kick in for this file.
const scribbles = require("scribbles");
void scribbles;
module.exports = function handler(data) {
  return { ok: true, data };
};
