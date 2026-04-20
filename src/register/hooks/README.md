# Register hooks

Per-runtime source-transform installers. Each file adapts the same
shared `transformSource` function (from `src/parsing/transform.js`) to
the loader mechanism the runtime provides:

- CJS via `Module._extensions` (covers Node-CJS and Bun-CJS).
- Node-ESM via `module.register()` loader worker.
- Bun-ESM via `Bun.plugin()` (lives in the top-level `register.mjs`
  preload entry because Bun's plugin registration cannot happen inside
  a worker thread the way Node's can).

See [`files.md`](./files.md) for the per-file inventory.
