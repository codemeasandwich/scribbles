# Scenario harness

Support utilities used by every scenario suite.

## Directory Structure

```
harness/
├── spawn.cjs
├── README.md
└── files.md
```

## Files

### `spawn.cjs`
Shared child-process spawner. Exposes two helpers:
  - `runScenario({ runtime, entry, args, cwd, env, timeoutMs })` —
    launches a real `node` / `bun` process against a fixture file and
    returns `{ stdout, stderr, status, timedOut }` for the scenario
    test to assert on.
  - `hasBinary(name)` — cheap probe used by the Bun-dependent suites
    to `describe.skip` themselves when Bun is not installed on the
    developer's machine.
The `.cjs` extension keeps the module outside Jest's default
`testMatch` discovery pattern, so it is never mistaken for a test
file.
