# cjs-chain fixture files

## Directory Structure

```
cjs-chain/
├── parent.cjs
├── child.cjs
├── README.md
└── files.md
```

## Files

### `parent.cjs`
Top-level entry. Requires `./child.cjs` synchronously, then invokes
the handler child exports. Pins that scribbles does not corrupt the
parent's in-progress CJS wrapper when child requires scribbles mid-
chain.

### `child.cjs`
Pure-CJS module that does `require("scribbles")` and exports a
handler function. Deliberately contains no `scribbles.<level>(...)`
call sites so the CJS-extensions fast-path delegates to the runtime's
native handler.
