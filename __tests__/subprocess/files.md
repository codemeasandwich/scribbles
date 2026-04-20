# subprocess/ test harness files

## Directory Structure

```
subprocess/
├── run-all.js
├── test-git-default-fallback.js
├── test-git-global-fallback.js
├── test-node-version.js
├── test-package-json-config.js
└── files.md
```

## Files

### `run-all.js`
Runner for every subprocess-based test in this directory. Spawns each
test as its own Node child process under `nyc` instrumentation so
coverage of module-load-time code paths (which Jest's in-process
instrumentation cannot reach) is captured. Invoked by
`npm run test:subprocess`.

### `test-git-default-fallback.js`
Exercises the `src/system/getGitStatus` inner-catch arm that fires when
`git` is unavailable AND the webpack `__scribbles_gitStatus__` define
is absent — proves `module.exports` falls through to
`{ hash: '', repo: '', branch: '' }`.

### `test-git-global-fallback.js`
Exercises the `src/system/getGitStatus` middle-catch arm that fires
when `git` is unavailable but the webpack `__scribbles_gitStatus__`
define IS present in the global scope — proves the bundled-git-info
pathway is honoured.

### `test-node-version.js`
Exercises the `src/utils/checkNodeVer` throw path on a spoofed
pre-8.5.0 `process.version`. Confirms the thrown error matches the
documented guard-rail message text.

### `test-package-json-config.js`
Documents the root `index.js` parent-package.json branch. Does not
exercise the branch itself (that needs a filesystem layout
manipulation beyond what a single-file subprocess can set up); an
in-process boot-environment scenario covers the branch with
`jest.isolateModules`. Kept for discoverability of the design intent.
