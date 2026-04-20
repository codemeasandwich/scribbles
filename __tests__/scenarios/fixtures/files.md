# Scenario fixtures

Test fixture applications for the scenario suites.

## Directory Structure

```
fixtures/
├── basic-logging/
├── README.md
└── files.md
```

## Subdirectories

### `basic-logging/`
The canonical fixture: a minimal entry+lib pair that calls
`scribbles.log(...)` with a mix of literal and variable arguments.
Used by every basic-logging scenario (Node-CJS, Node-ESM, Bun-CJS,
Bun-ESM, bun-test). See `basic-logging/files.md`.
