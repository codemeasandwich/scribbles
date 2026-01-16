# Source Files

## Directory Structure

```
src/
├── args2keys.js
├── checkNodeVer.js
├── config.js
├── getGitStatus.js
├── helpers.js
├── hijacker.js
├── loader.js
├── status.js
├── stringify.js
└── utils.js
```

## Files

### `args2keys.js`
Parses arguments and converts them to key-value pairs for logging.

### `checkNodeVer.js`
Validates Node.js version compatibility.

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

### `status.js`
System status collection (CPU, memory, process info).

### `stringify.js`
Custom JSON stringification with pretty printing support.

### `utils.js`
Utility functions for trace state parsing.
