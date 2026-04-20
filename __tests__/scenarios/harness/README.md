# Scenario harness

Support utilities shared by every scenario suite. Kept in a separate
directory so that `jest.testPathIgnorePatterns` can exclude the harness
from Jest's test-file discovery without also excluding the
`*.scenarios.test.js` suite files one directory up.

See [`files.md`](./files.md) for the per-file inventory.
