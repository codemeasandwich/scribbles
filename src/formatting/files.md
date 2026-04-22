# Formatting

Output formatting and display.

## Directory Structure

```
formatting/
├── colors.js
├── groupLogPrefix.js
└── stringify.js
```

## Files

### `colors.js`
ANSI color utilities for terminal output, including color schemes, colorblind accessibility mode, and auto-detection (respects `NO_COLOR`, `FORCE_COLOR`, and `CI` environment variables). Also hosts `groupTreeOpenAtDepth` and helpers for per-depth 24-bit rail colors when `pretty.groupBrackets` and colors are on.

### `groupLogPrefix.js`
Builds group-marker and in-group line prefixes for `body.toString` (tree rails, optional colored lanes); delegates to `colors.js` for 24-bit segments.

### `stringify.js`
Custom JSON stringification with pretty printing support.
