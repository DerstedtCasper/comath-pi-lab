# TriviumDB Risk Notes

TriviumDB is a strong candidate for embedded research memory, but it remains an optional backend.

Planning facts recorded before Phase 0:

- npm package: `triviumdb@0.7.1`.
- Node bindings expose numeric IDs; CoMath business IDs must remain stable strings.
- Python package availability depends on Python version and wheel support.
- Native dependencies and file locks require runtime probing.
- FFI hooks and unsafe extension points are disabled by default.

Required before enabling the real backend:

- capability probe;
- stable string ID map;
- fallback memory backend;
- snapshot/restore tests;
- single-process ownership documentation;
- migration plan for embedding dimension changes.

