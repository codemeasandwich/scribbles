# Scenarios

End-to-end scenario tests for Scribbles' multi-runtime support (v2+).
Each scenario spawns a real child process of the target runtime
(`node`, `bun`, `bun test`, optionally with a preload flag) against a
fixture application and asserts on the resulting stdout / stderr. This
proves Scribbles' behaviour through its public surface rather than
through in-process mocks.

See [`files.md`](./files.md) for the per-file inventory and
[`docs/runtime-setup.md`](../../docs/runtime-setup.md) for the end-user
setup story these scenarios exercise.
