# Tests

The test tree now covers the Production Formal Workbench Core, not GA release state.

## Default Checks

Run the local CI equivalent:

```powershell
corepack pnpm run ci
```

This executes:

- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

`corepack pnpm test` runs the Phase 0/design smoke check, Release readiness repository contract, package unit/integration suites, and Phase 17 integrity evaluation.

## Release Readiness

Run:

```powershell
corepack pnpm release:check
```

This verifies CI workflow files, release guard wiring, release docs, root scripts, and that the repository/worktree root has no `.comath` runtime state.

## External And Native Checks

`corepack pnpm external:check` is fail-closed until reviewed target-runtime evidence exists. It covers:

- Pi installed runtime validation;
- MathProve workspace runner validation;
- TriviumDB native validation;
- runner re-execution replay validation;
- package metadata and artifacts;
- DLP and secret scanning;
- locking stress.

Optional native TriviumDB tests remain separate:

```powershell
corepack pnpm --filter @comath/comathd test:trivium
```

