# Extensions

CoMath Pi Lab implements the Pi extension layer as a thin-client package under `extensions/comath-pi`. Local installation paths and runtime wiring are documented in `docs/integrations/pi-installation.md`.

Implemented surfaces:

- `/cm:*` command parsing for project, claim, evidence, graph, paper, snapshot, replay, status, and dashboard flows;
- an installable Pi extension entry that calls `pi.registerTool()`, `pi.registerCommand(name, options)`, and `pi.on("tool_call", ...)`;
- TypeBox-backed JSON Schema tool parameters for research start, service health, project lifecycle, claim/evidence, artifact, workstream, GraphPatch, memory, literature, paper, snapshot, replay, and status actions;
- resource discovery for local skills, prompts, domain packs, subagent definitions, and snapshot/replay artifact descriptors;
- read-only text/TUI dashboard renderers and review helpers.

Boundary rules:

- Extension code must call `comathd` instead of mutating memory, claims, artifacts, snapshots, or runtime DB files directly.
- Dashboard aggregation may call read routes only and must report degraded read-model limitations instead of reading `.comath/` directly.
- `comath.research.start` is the Pi SDK/RPC entry tool for initializing a project and spawning the first workstream through `comathd`.
- Mutating tools remain confirmation-gated through Pi's `tool_call` event; headless contexts without confirmation fail closed.
- Production Pi runtime registration is represented by the npm/local package manifest and default Pi extension entry, but it still requires installed-runtime evidence before GA.
