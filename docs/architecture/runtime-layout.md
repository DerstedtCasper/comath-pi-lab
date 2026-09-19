# Runtime Layout

Project runtime state lives under `.comath/`. The durable research control plane is service-owned and uses a SQLite WAL database beneath `control/`.

```text
.comath/
  control/
    research.sqlite
    research.sqlite-wal          # transient while the service is open
    research.sqlite-shm          # transient while the service is open
    owner.sqlite                 # lifetime owner lock; never stolen by PID/timestamp
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

Campaign, proof, artifact, and evidence paths remain service-managed below `.comath/`. A replay directory is scoped to its claim and proof obligation; it is not a shared mutable latest-result directory.

`owner.sqlite`, migration journal/receipt files, and provider homes are local coordination material, not restorable research facts. Internal-restore snapshots are verified before use and exclude those coordination files; public-download snapshots cannot be restored.

## Repository Rule

`.comath/` is ignored by Git. Real project state, transcripts, evidence logs, database files, and secrets must not be committed.

Fixtures and replay manifests may be committed only when scrubbed and intentionally placed outside `.comath/`.
