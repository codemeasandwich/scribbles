# Register

Unified runtime-adapter subtree introduced in v2.0.0. Exports a single
idempotent `register()` function (consumed by `index.js` on library
load) that detects the current runtime and installs the appropriate
source-transform mechanism:

- Node-CJS / Bun-CJS: `Module._extensions` hook (inlined from the
  pre-v2 `node-hook` dependency).
- Node-ESM (via the `scribbles/register` preload module
  `register.mjs` at the repo root): `module.register()` loader worker.
- Bun-ESM (via the same preload): `Bun.plugin()` instance.

The `register` function itself is exposed on the package's named-export
surface as v2's fourth non-level export (alongside `config`, `trace`,
`middleware`), with `register.status()` / `register.assert()`
introspection helpers for CI and production boot scripts.

See [`files.md`](./files.md) for the per-file inventory and
[`docs/runtime-setup.md`](../../docs/runtime-setup.md) for the
user-facing setup documentation.
