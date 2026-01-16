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
│   ├── args2keys.js
│   ├── loader.js
│   └── parceStringVals.js
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

### `system/`
System and environment information - git status, CPU/memory metrics.

### `tracing/`
Distributed tracing and correlation - trace contexts, middleware, HTTP hijacking.

### `utils/`
Shared utility functions - helpers, regex utils, version checking.
