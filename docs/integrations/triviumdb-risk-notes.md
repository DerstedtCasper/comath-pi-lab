# TriviumDB Risk Notes

TriviumDB is a candidate embedded research-memory backend, but it remains optional and must sit behind the `ResearchMemoryDB` adapter boundary.

Current integration constraints:

- CoMath business IDs must remain stable strings even when a backend exposes numeric IDs.
- Native package availability depends on platform, Python version, and wheel support.
- Native dependencies and file locks require runtime probing.
- FFI hooks and unsafe extension points are disabled by default.

Required before enabling a real backend:

- capability probe;
- stable string ID map;
- fallback memory backend;
- snapshot/restore tests;
- single-process ownership documentation;
- migration plan for embedding dimension changes.
