# subprocess/

Subprocess-based tests that run OUTSIDE Jest's in-process instrumentation
to cover module-load-time code paths. Invoked by `npm run test:subprocess`
and merged with Jest coverage by `npm run test:full-coverage`.

Each file is a standalone Node script that:

1. Mocks/arranges the environment its target code path needs
   (`process.version` spoof, `PATH` tweak, etc.).
2. Requires the target module (clearing `require.cache` first to force
   module-top re-evaluation).
3. Asserts on observable side-effects (thrown error, fallback export
   shape).
4. `process.exit(0)` on success / `process.exit(1)` on failure.

See `files.md` for the per-file breakdown.
