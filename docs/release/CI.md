# CI

The default CI workflow is `.github/workflows/ci.yml`.

It runs on Windows because the primary workstation and path-policy risks are Windows-first:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm release:check
```

`corepack pnpm test` includes the release readiness repository contract test. `corepack pnpm release:check` repeats the repository-level string-contract release gate so CI fails if workflow wiring, scripts, release docs, or runtime-state guard files drift. It is not a substitute for target-runtime evidence.

The tag/release guard is `.github/workflows/release-guard.yml`. It runs `corepack pnpm release:check` and `corepack pnpm external:check` on version tags and GitHub release events. This is intentionally fail-closed: without reviewed external evidence, release/tag workflows fail.

## External Checks

The following are not satisfied by default CI and remain GA blockers until target-runtime evidence is attached:

- Pi installed runtime validation;
- MathProve workspace runner validation;
- TriviumDB native validation;
- runner re-execution replay validation;
- package metadata and artifacts;
- DLP and secret scanning;
- locking stress.

Use:

```powershell
corepack pnpm external:check
```

This command is intentionally separate from default CI because it requires installed target runtimes and evidence files that are not available in a clean CI clone.
