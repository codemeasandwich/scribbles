# cjs-chain fixture

Minimal two-file reproduction of the integrator-reported v2.0.0 Issue 1:
requiring `scribbles` from inside a CJS child module while the parent's
`require()` is still on the call stack.

Used by `__tests__/scenarios/bun-cjs-chain.scenarios.test.js` (Bun) and
`__tests__/scenarios/node-cjs-chain.scenarios.test.js` (Node) to pin
that the chained-require pattern works on both runtimes after the
CJS-extensions handler learned to delegate to the original (native)
Module._extensions['.js'] handler for files without scribbles call
sites.
