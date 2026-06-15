# ADR 0002: Runtime State Separation

## Status

Accepted for the public architecture baseline.

## Decision

Runtime project state belongs under `.comath/` and is ignored by Git. The repository stores source code, schemas, public documentation, sample configuration, and runtime prompt assets only.

## Consequences

- Evidence and session state are not accidentally committed.
- Snapshot/replay uses explicit export manifests.
- Internal tests must use fixtures or temporary directories, not real `.comath/` state.
