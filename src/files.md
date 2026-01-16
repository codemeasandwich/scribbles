# Source Files

## Directory Structure

```
src/
├── args2keys.js
├── checkNodeVer.js
├── colors.js
├── config.js
├── getGitStatus.js
├── helpers.js
├── hijacker.js
├── loader.js
├── middleware.js
├── namespace.js
├── parceStringVals.js
├── regexUtils.js
├── scribble.js
├── scribblesConfig.js
├── status.js
├── stringify.js
├── trace.js
└── utils.js
```

## Files

### `args2keys.js`
Parses arguments and converts them to key-value pairs for logging.

### `checkNodeVer.js`
Validates Node.js version compatibility.

### `colors.js`
ANSI color utilities for terminal output, including color schemes and colorblind accessibility.

### `config.js`
Default configuration values for scribbles.

### `getGitStatus.js`
Retrieves git repository information (hash, branch, repo name).

### `helpers.js`
Utility functions including deepMerge and getSource for stack traces.

### `hijacker.js`
HTTP/HTTPS request hijacker for automatic trace header injection.

### `loader.js`
Babel-style loader for instrumenting code with scribbles logging.

### `middleware.js`
Express middleware for distributed tracing and trace context propagation.

### `namespace.js`
CLS (Continuation-Local Storage) namespace management for trace correlation.

### `parceStringVals.js`
Template string parsing for log messages with type annotations.

### `regexUtils.js`
Regular expression utility functions for pattern validation and conversion.

### `scribble.js`
Core scribble logging function that creates structured log entries.

### `scribblesConfig.js`
Scribbles configuration and log level setup.

### `status.js`
System status collection (CPU, memory, process info).

### `stringify.js`
Custom JSON stringification with pretty printing support.

### `trace.js`
Distributed tracing functions for creating trace contexts and W3C headers.

### `utils.js`
Utility functions for trace state parsing.
