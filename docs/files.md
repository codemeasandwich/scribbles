# docs/ file index

## Directory Structure

```
docs/
├── argument-combinations.md
├── runtime-setup.md
├── troubleshooting.md
├── README.md
└── files.md
```

## Files

### `argument-combinations.md`
Reference for every accepted shape of
`scribbles.<level>(message?, value?, error?)`. Walks through
`(message)`, `(value)`, `(message, value)`, `(message, error)`,
`(value, error)`, `(message, value, error)` combinations plus the
type-annotation output each produces. Useful when users ask "what
happens if I pass an Error first?".

### `runtime-setup.md`
Deep-dive runtime reference. Covers why the ESM preload is needed,
the per-runtime setup matrix (Node CJS / Node ESM / Bun / bun test),
programmatic verification via `register.status()` /
`register.assert()`, and the mixed CJS+ESM project case.
Cross-links to `troubleshooting.md` for error-indexed remediation.

### `troubleshooting.md`
Error-indexed diagnostic guide. Organised as a triage tool:
a `register.status()` decision table, copy-paste shell probes,
a section per common stderr error message (including both v2.0.1-
fixed integrator regressions), patterns that break at scale
(`deepRequire` chains, module-scope logging), and a
"nothing is working, reset to defaults" nuclear recipe.

### `README.md`
One-liner describing the directory's purpose.
