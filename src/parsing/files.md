# Parsing

Input processing and argument parsing.

## Directory Structure

```
parsing/
├── args-parser.js
├── args2keys.js
├── loader.js
├── parceStringVals.js
└── transform.js
```

## Files

### `args-parser.js`
Pure character-at-a-time argument-list parser. Walks a single
`scribbles.<level>(...)` call's argument stream and produces the comma-joined
text of lazy `x=>x\`name\`` thunks that the transform injects into the
rewritten call site. Exports `loadArgNames` (the driver) and `splitArgs`
(the state-machine step). Extracted from the pre-v2 `loader.js` so every
runtime adapter can reuse the same logic.

### `args2keys.js`
Parses arguments and converts them to key-value pairs for logging.

### `loader.js`
Backward-compat shim retained during the v2 refactor. Re-exports the
legacy `_loadArgNames` / `_splitArgs` / `_processSource` aliases consumed
by ~12 existing test files and triggers hook installation on require via
the unified `src/register/` adapter. As of T3 this file no longer depends
on `node-hook` — the ~25 LOC of install logic we actually used is inlined
in `src/register/hooks/cjs-extensions.js`. Scheduled for deletion in T12
once the existing test files have been migrated to import from the new
module locations directly.

### `parceStringVals.js`
Template string parsing for log messages with type annotations.

### `transform.js`
Pure source-code transformer. Given a file's raw text, rewrites every
`scribbles.<level>(...)` call into the form
`scribbles.<level>.at({file, line, col, args:[...]}, ...originalArgs)` so
that Scribbles can display the original argument expressions alongside
their runtime values. Exported as `transformSource(source, filename)` and
shared by every runtime adapter (Node-CJS, Node-ESM, Bun, bundler
plugins) so the transform algorithm has exactly one implementation.
