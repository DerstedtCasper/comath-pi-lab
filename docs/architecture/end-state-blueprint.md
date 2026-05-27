# End-State Blueprint

## Target State

CoMath Pi Lab is complete when a researcher can open a project in Pi, initialize a local `.comath/` workspace, spawn bounded research workstreams, register mathematical claims, attach evidence, review graph patches, and maintain a living working paper whose theorem-like statements are backed by auditable provenance.

## Primary User Loop

```text
Researcher
  -> /cm:open or /cm:init
  -> /cm:claim or /cm:spawn
  -> workstream report and artifacts
  -> GraphPatch review
  -> claim promotion gate
  -> working paper update
  -> snapshot/replay
```

The loop must keep failed routes and blockers visible. The system should make unresolved uncertainty easier to inspect, not easier to hide.

## Control Plane

`comathd` is the control plane:

- owns project runtime state;
- serializes trusted mutations;
- applies path policy;
- writes audit events;
- owns memory adapters;
- invokes verification and compute runners;
- rejects unsafe promotion by default.

Pi is the interaction shell:

- commands;
- tools;
- renderers;
- text/TUI dashboards;
- resource discovery;
- permission-gate pattern;
- human steering.

Pi never writes trusted runtime DB state directly.

## Data Plane

The data plane is split into:

- artifacts: files, logs, PDFs, generated paper outputs, runner outputs;
- claims: statements, assumptions, dependencies, status, evidence references;
- memory graph: definitions, theorem references, failures, citations, evidence, workstreams;
- audit log: append-only mutation trace;
- snapshots: exportable state bundles with replay manifests.

## Mathematical Integrity Plane

Mathematical status is gated:

- `literature_supported` requires exact source artifacts and condition matching.
- `computationally_supported` requires successful bound computation/counterexample runner output, plus replay metadata and stale-output checks.
- `symbolically_checked` requires exact symbolic computation, not float-only output.
- `lean_skeleton` may contain explicit skeleton placeholders.
- `formally_checked` requires kernel-checked proof with no non-skeleton bypass, including a passed proof-kernel final replay manifest bound to the same claim.

## Research Alpha End State

Research Alpha is not the full product. It is the first usable research skeleton:

- local project init/open;
- claim registry;
- fail-closed gate;
- in-memory research DB;
- optional TriviumDB shim/fallback;
- MathProve bridge mock;
- Phase 18 native proof-kernel vertical slices for ResearchCampaign, clean Lean replay, candidate artifacts, statement-drift/cheat rejection, exact refutation, and snapshot restore/replay;
- workstream reports;
- paper init/check;
- basic snapshot;
- security and math-integrity reviews.

## Full Product End State

The full product adds:

- real TriviumDB backend;
- real verification runner paths;
- exact compute runners;
- literature condition matching;
- working paper export;
- braid statistics domain pack;
- TUI dashboard;
- snapshot/replay integrity;
- evaluation suite.
