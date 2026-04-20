# Scenarios

End-to-end scenario tests for Scribbles' multi-runtime support.

## Directory Structure

```
scenarios/
├── bun-cjs.scenarios.test.js
├── bun-esm.scenarios.test.js
├── bun-test.scenarios.test.js
├── fixtures/
├── harness/
├── named-exports.scenarios.test.js
├── node-cjs.scenarios.test.js
├── node-esm.scenarios.test.js
├── README.md
└── files.md
```

## Subdirectories

### `fixtures/`
Small reusable test applications spawned by the scenario suites. See
`fixtures/files.md`.

### `harness/`
Support utilities shared by the scenario suites (child-process
spawner, binary probe). See `harness/files.md`.

## Files

### `bun-cjs.scenarios.test.js`
Bun-CJS drop-in scenario. Asserts that `require('scribbles')` inside a
`bun run app.js` process automatically enables variable-name
extraction.

### `bun-esm.scenarios.test.js`
Bun-ESM scenarios: `configured` (via `bunfig.toml preload`) and
`unconfigured` (warn-and-degrade behaviour).

### `bun-test.scenarios.test.js`
Bun test runner scenario. Exercises the separate `[test]` section in
`bunfig.toml` preload configuration because `bun test` does not share
preload state with `bun run`.

### `named-exports.scenarios.test.js`
In-process pin on the v2 CJS named-export surface
(`config`, `trace`, `middleware`, `register`) and the
`register.status()` / `register.assert()` introspection helpers.

### `node-cjs.scenarios.test.js`
Node-CJS drop-in scenario. Same claim as `bun-cjs.scenarios.test.js`
but against a `node app.js` child process.

### `node-esm.scenarios.test.js`
Node-ESM scenarios: `configured` (via `--import scribbles/register`)
and `unconfigured` (warn-and-degrade). Skipped on Node < 20.6 where
`module.register()` is not stable.
