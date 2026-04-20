# Basic-logging fixture

A minimal entry+lib pair spawned by every basic-logging scenario
(Node-CJS, Node-ESM, Bun-CJS, Bun-ESM, bun-test). The entry file
represents a real user's start-up file that `require`s / `import`s
Scribbles first and then delegates to the lib file; the lib file
contains the `scribbles.log(...)` calls that scenarios assert get
transformed (variable-name extraction). The split matches the project's
architectural rule that "Scribbles initialises the source-code analyser
but cannot analyse the file that it is initialised from", so the
fixture exercises the pattern the library recommends to end users.

See [`files.md`](./files.md) for the per-file inventory.
