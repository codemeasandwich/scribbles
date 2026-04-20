# Basic-logging fixture

Minimal entry+lib fixture application shared by every basic-logging
scenario.

## Directory Structure

```
basic-logging/
├── entry.js
├── entry.mjs
├── lib.js
├── lib.mjs
├── README.md
└── files.md
```

## Files

### `entry.js`
CJS entry point. Required by `node-cjs.scenarios.test.js` and
`bun-cjs.scenarios.test.js`. A thin wrapper that requires Scribbles
first and then `require`s `lib.js` — modelling the pattern the
library recommends to end users (the entry file cannot be transformed
because Scribbles installs its source-transform hook during its own
load, so the transform-eligible code has to live in a separately-
required module).

### `entry.mjs`
ESM counterpart to `entry.js`. Used by `node-esm.scenarios.test.js`
and by the Bun-ESM scenarios (copied into a scratch workspace). Same
thin-wrapper pattern, but using static `import` declarations, which
makes the preload requirement of ESM explicit.

### `lib.js`
CJS library file loaded by `entry.js`. Contains the actual
`scribbles.log(...)` call sites that scenario tests assert get
transformed (variable-name extraction). Uses `.js` rather than `.cjs`
because Bun's CJS loader path for `.cjs` does not invoke
`Module._extensions` the way it does for `.js`; Scribbles' own
`package.json` does not declare `"type": "module"`, so `.js` is CJS
by default in this repo.

### `lib.mjs`
ESM counterpart to `lib.js`. Loaded by `entry.mjs` and by the
Bun-ESM / bun-test scenarios (after being copied into a scratch
workspace with its import path rewritten to the bare specifier
`'scribbles'`).
