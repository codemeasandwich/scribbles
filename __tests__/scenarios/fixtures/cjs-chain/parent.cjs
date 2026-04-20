// Mirrors the integrator's reproduction of v2.0.0 Issue 1: a CJS module
// that does `require("./child.cjs")` BEFORE the child itself requires
// scribbles. On Bun 1.3.x before the fix, requiring scribbles from
// inside child — while parent's require() was still in progress —
// corrupted Bun's CJS wrapper state and threw:
//
//   error: Expected CommonJS module to have a function wrapper.
//
// After the fix, scribbles' CJS-extensions handler delegates to the
// original (Bun's native) handler for files that don't contain
// `scribbles.<level>(...)` call sites, so Bun's wrapper pipeline runs
// untouched for the majority of modules — including `child.cjs`.
const handler = require("./child.cjs");
const out = handler({ foo: "bar" });
process.stdout.write("RESULT=" + JSON.stringify(out) + "\n");
