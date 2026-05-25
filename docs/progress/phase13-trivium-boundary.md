# Phase 13 TriviumDB Boundary

## Scope

TriviumDB is an optional native backend behind `ResearchMemoryDB`. Normal builds and tests must pass without the native package installed. The default backend remains in-memory unless the caller explicitly selects TriviumDB.

## Files

Add:

- `services/comathd/src/memory/trivium-capability.ts`
- `services/comathd/src/memory/trivium-db.ts`
- `services/comathd/tests/unit/phase13-trivium-capability.test.mjs`
- `services/comathd/tests/optional/phase13-trivium-db.test.mjs`

Avoid broad churn in:

- `package.json`
- `services/comathd/package.json`
- `pnpm-lock.yaml`
- `services/comathd/src/api/server.ts`
- `services/comathd/src/index.ts`
- `services/comathd/src/memory/index.ts`

## Required Invariants

- No top-level `triviumdb` import in the normal module graph.
- Dynamic import only inside capability probe or selected adapter construction.
- Normal tests do not require native TriviumDB.
- Native numeric ids never leave the adapter.
- `MemoryNode.id`, `MemoryEdge.source_id`, `MemoryEdge.target_id`, and `GraphPatch.patch_id` remain stable string ids.
- `StableIdMap` is the mandatory numeric-id translation layer.
- `beginPatch` and `applyPatch` semantics match the in-memory backend.
- GraphPatch must not bypass claim promotion protections.
- `.tdb` or native DB files live only under `.comath/db`.

## Capability Report

`probeTriviumCapability()` should return diagnostics rather than failing normal tests:

- `available`
- `packageVersion`
- `platform`
- `arch`
- `nodeVersion`
- `loadError`
- `canOpenDatabase`
- `ffiDisabled`
- `fallbackBackend`

## Fallback Policy

```text
memory requested -> in-memory backend
trivium requested + probe succeeds -> TriviumResearchMemoryDB
trivium requested + probe fails + fallback allowed -> in-memory backend with warning
trivium required + probe fails -> clear startup error
```

## Tests

Always-on tests:

- no native import is required by default;
- probe returns `available:false` when package is absent;
- factory falls back to memory unless Trivium is required;
- `StableIdMap` conflict behavior still holds;
- GraphPatch claim-promotion protections remain intact.

Optional native tests require:

```text
COMATH_ENABLE_TRIVIUM_TESTS=1
```

Optional tests should verify native load, DB open under a temp project root, stable-id round trip, graph search/context expansion through `StableIdMap`, snapshot/restore id-map preservation, and clear single-owner/file-lock behavior.
