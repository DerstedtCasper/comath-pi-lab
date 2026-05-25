# Runtime Layout

Future project runtime state will live under `.comath/`.

```text
.comath/
  project.yaml
  config.yaml
  lock/
  db/
  memory/
  claims/
  evidence/
  audit/
  workstreams/
  artifacts/
  lean/
  sessions/
  snapshots/
```

## Repository Rule

`.comath/` is ignored by Git. Real project state, transcripts, evidence logs, database files, and secrets must not be committed.

Fixtures and replay manifests may be committed only when scrubbed and intentionally placed outside `.comath/`.
