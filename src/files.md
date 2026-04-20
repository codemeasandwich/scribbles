# Source Files

## Directory Structure

```
src/
├── core/
│   ├── config.js
│   ├── scribble.js
│   └── scribblesConfig.js
├── formatting/
│   ├── colors.js
│   └── stringify.js
├── parsing/
│   ├── args-parser.js
│   ├── args2keys.js
│   ├── loader.js
│   ├── parceStringVals.js
│   └── transform.js
├── register/
│   ├── hooks/
│   │   ├── cjs-extensions.js
│   │   └── esm-loader.mjs
│   ├── index.js
│   ├── install-flag.js
│   └── warn.js
├── system/
│   ├── getGitStatus.js
│   └── status.js
├── tracing/
│   ├── hijacker.js
│   ├── middleware.js
│   ├── namespace.js
│   └── trace.js
└── utils/
    ├── checkNodeVer.js
    ├── helpers.js
    ├── regexUtils.js
    └── utils.js
```

## Subdirectories

### `core/`
Core logging functionality - scribble function, configuration, and log level setup.

### `formatting/`
Output formatting and display - colors, JSON stringification.

### `parsing/`
Input processing and argument parsing - argument conversion, code instrumentation.

### `register/`
Unified runtime adapter for installing Scribbles' source-transform hook.
Exports a single idempotent `register()` function consumed by `index.js`
on library load. The CJS hook (Node + Bun) lives in `hooks/cjs-extensions.js`;
ESM and Bun-specific installers join it as T5 and T6 land.

### `system/`
System and environment information - git status, CPU/memory metrics.

### `tracing/`
Distributed tracing and correlation - trace contexts, middleware, HTTP hijacking.

### `utils/`
Shared utility functions - helpers, regex utils, version checking.
