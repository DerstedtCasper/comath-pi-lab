# Extensions

Research Alpha plus Phase 18-22 implements the Pi extension layer as a thin-client package under `extensions/comath-pi`.

Implemented surfaces:

- `/cm:*` command parsing for project, claim, evidence, graph, paper, snapshot, replay, research, campaign, status, and dashboard flows;
- schema-like tool descriptors for claim, GraphPatch, paper, snapshot, replay, research campaign, and campaign audit/replay actions;
- resource discovery for local skills, prompts, domain packs, subagent definitions, and snapshot/replay artifact descriptors;
- read-only text/TUI dashboard renderers and review helpers backed by service-owned claim/evidence/gate read models;
- one-command research campaign loop helpers that start, tick, and return dashboard state through `comathd`.

Boundary rules:

- Extension code must call `comathd` instead of mutating memory, claims, artifacts, snapshots, or runtime DB files directly.
- Dashboard aggregation may call read routes only; claim/evidence/gate boards must come from `comathd` read-model routes rather than direct `.comath/` access.
- Research loop execution must hold a scoped campaign-loop capability and may only mutate state through `comathd` campaign routes.
- Mutating tools remain descriptor-level and require confirmation before a host Pi runtime invokes `comathd`.
- Phase 18 research/campaign tools call `comathd` campaign routes and do not create, inspect, or edit Lean proof artifacts directly inside the extension.
- Production Pi runtime registration is still deferred to Research Beta and must be revalidated against the installed Pi API.
