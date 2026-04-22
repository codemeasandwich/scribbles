# v2 Commit Scripts

Staged, one-per-task commit scripts for the v2.0.0 multi-runtime refactor.
Each script stages a specific, narrow set of files and records a highly
detailed commit message that doubles as a changelog entry.

## Why these are scripts and not just a list of commands

The interactive shell in the chat session that authored this work was
non-functional (`Exit code 0, no output, 0 ms` on every invocation). Saving
each commit as a dedicated shell script lets you execute them verbatim in
a working terminal without having to retype long HEREDOC commit bodies.

## Run order

```bash
bash scripts/v2-commits/01-t1-scenario-harness.sh
bash scripts/v2-commits/02-t2-extract-transform-and-parser.sh
bash scripts/v2-commits/03-t3-auto-install-drop-node-hook.sh
bash scripts/v2-commits/04-t4-named-exports-and-migration.sh
bash scripts/v2-commits/05-t5-esm-support.sh
bash scripts/v2-commits/06-t6-docs-and-introspection-tests.sh
bash scripts/v2-commits/99-chore-v2-tooling.sh
```

Or run the convenience wrapper (which iterates every numbered script
in order):

```bash
bash scripts/v2-commits/run-all.sh
```

## Safety properties

- Every script uses `set -euo pipefail` so the first failure stops the run
  and nothing unexpected slips through.
- Scripts stage **specific paths**, never `git add .`, so you can have other
  unrelated dirty files in the tree without them being swept in.
- Scripts run `git diff --cached --quiet` after staging; if nothing changes
  (i.e. you've already committed that task), they exit 0 with a "nothing
  to commit" note rather than creating an empty commit.
- Script 03 runs `npm install` first to regenerate `package-lock.json`
  without `node-hook`, then stages the lockfile alongside the rest of the
  T3 changes. Without that, CI's `npm ci` would refuse to install.

## After running all scripts

```
git log --oneline -8
```

should show the commits on top, in order (newest first):

```
<hash> chore: add v2 commit-script tooling
<hash> docs: add Runtime support README section, CHANGELOG, docs/runtime-setup.md
<hash> feat: Node ESM and Bun ESM support via `scribbles/register` preload
<hash> docs: add MIGRATION.md and named-export regression test for v2
<hash> feat: v2 runtime adapter, auto-install, named-export surface; drop node-hook
<hash> refactor: split src/parsing/loader.js into pure transform + args-parser
<hash> test: add scenario harness and failing E2E coverage for multi-runtime support
```

Then run `npm test` and confirm all scenario suites are green. The only
known failure at this point is the pre-existing hijacker-passthrough
flake in `__tests__/32-hijacker-http-request.test.js`, which was failing
before the v2 branch opened and is tracked as a separate issue.
