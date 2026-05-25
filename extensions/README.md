# Extensions

Research Alpha implements the Pi extension layer as a thin-client package under `extensions/comath-pi`.

Implemented surfaces:

- `/cm:*` command parsing for project, claim, evidence, graph, paper, snapshot, replay, status, and dashboard flows;
- schema-like tool descriptors for claim, GraphPatch, paper, snapshot, and replay actions;
- resource discovery for local skills, prompts, domain packs, subagent definitions, and snapshot/replay artifact descriptors;
- read-only text/TUI dashboard renderers and review helpers.

Boundary rules:

- Extension code must call `comathd` instead of mutating memory, claims, artifacts, snapshots, or runtime DB files directly.
- Dashboard aggregation may call read routes only and must report degraded read-model limitations instead of reading `.comath/` directly.
- Mutating tools remain descriptor-level and require confirmation before a host Pi runtime invokes `comathd`.
- Production Pi runtime registration is still deferred to Research Beta and must be revalidated against the installed Pi API.
