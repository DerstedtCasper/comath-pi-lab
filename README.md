# CoMath Pi Lab

CoMath Pi Lab is a Pi-based, auditable, memory-native research workbench for mathematical projects. Pi is the interaction shell; `comathd` is the local single-write service; the native proof-kernel owns GA proof replay evidence; MathProve remains an evidence producer and gate runner rather than a proof authority; TriviumDB remains an optional embedded memory backend behind an adapter.

This repository is at Research Alpha plus Phase 18-46 GA vertical-slice implementation. It provides a working local prototype for project initialization, claim registration, fail-closed promotion gates, artifacts/audit logs, in-memory research memory, workstreams, GraphPatch review, MathProve bridge mock plus a real external MathProve evidence-runner bridge, exact/numeric compute runners, literature condition checks, working paper provenance, braid-statistics domain scaffolding, read-only Pi extension renderers backed by service read models, snapshot/replay verification with runner re-execution, service-owned ResearchCampaign proof-kernel routes, a Pi-side one-command research campaign loop, a registered-theorem-family Lean replay path, a Pi 0.75.5-compatible runtime registration package, a local Pi/comathd install-session e2e over a real HTTP server and built Pi package entrypoint, an auditable AgentRun runtime boundary, a service-side AgentRun process scheduler for absolute-realpath allowlisted child-agent commands, scheduler integration with project writer/session locks, live profile-backed adapter execution, capped AgentRun log readback, cursor-based AgentRun log-stream polling, and bounded adapter health probes, a service-owned `codex-cli` adapter package registry with bundled launcher lifecycle and service-configured external CLI backend, service-owned GA agent profiles exposed through `comathd` profile/run/launch APIs, Pi runtime `/cm:agent` tools/commands for profile inspection, profile-bound AgentRun preparation, execution, logs, log streaming, health checks, packaged adapter launch/execute, and packaged external-backend selection, configurable Lean trust-profile/static-audit boundaries, target-theorem signature binding, explicitly registered Lean statement-alias equivalence, native TriviumDB target-platform evaluation, native planning-stage proof-obligation DAG/line-map/skeleton artifacts, campaign-scoped ensemble candidate/decision artifacts, claim-scoped final replay audit pointers, and runner replay sandbox/dependency provenance for the registered theorem-family, memory, and compute-runner slices.

The Phase 18-46 slices can lock and replay the elementary Lean theorems `n + 0 = n` and `n * 0 = 0`, reject statement drift and cheat constructs, preserve 8 candidate audit artifacts, verify the seven-failures-plus-one-Lean-pass ensemble recovery benchmark, keep interleaved supported campaigns from reading or overwriting one another's ensemble candidates/decisions, write final replay stage-run artifact pointers with the current claim id rather than a hardcoded claim, write structured V8 dialectical stress artifacts, expose v3 canonical ResearchCampaign states, refute `n + 1 = n` by exact counterexample, expose Pi campaign tools as thin `comathd` clients, replay after snapshot restore, read claim/evidence/gate boards through service-owned list routes, drive start/tick/dashboard campaign flow behind a scoped Pi capability, validate a local installed-session path where the built Pi package talks to a real `comathd` HTTP server, re-execute replayable compute runner reports from service-owned canonical input, preserve runner sandbox policy and dependency-lock provenance in reports and replay manifests, invoke `MathProve-Skill`'s `verify_sympy.py` as a controlled non-authoritative evidence runner with statement-hash binding and fail-closed archival, load the built Pi extension through the installed Pi 0.75.5 package-extension loader, persist AgentRuns with scoped write access plus producer/reviewer GraphPatch separation, launch real allowlisted child processes with concurrency/rpm/timeout/cancel controls behind project writer locks, execute profile-backed adapter processes from both comathd and Pi, read capped AgentRun stdout/stderr logs, poll cursor-based AgentRun log streams, and run bounded adapter health probes from both comathd and Pi, resolve the built-in `codex-cli` adapter package to a service-owned launcher, optionally invoke a service-configured external Codex-compatible CLI through the packaged launcher with fixed argv and untrusted output wrapping, prepare profile-bound child-agent launch envelopes that preserve `rpm=4`, scoped writes, no direct trusted-state mutation, and no proof authority, operate those profile surfaces from Pi without direct `.comath/` access, enforce project-level Lean axiom trust profiles, allow `sorry` only in explicitly allowlisted skeleton files rather than final proof artifacts, bind statement equivalence to a unique target theorem signature instead of arbitrary stdout substrings, accept only explicitly registered definitional-alias signatures such as Lean notation expansion, evaluate `triviumdb@0.7.1` as an optional native backend on the Windows x64 target platform, protect project writers with a service-owned session lock, and persist native lemma-DAG/line-map/proof-obligation artifacts during planning. It is still not a production arbitrary theorem prover. Broad proof planning beyond registered theorem families, broad MathProve proof search or MathProve-as-authority semantics, real Codex API backend, continuous WebSocket/SSE operator streaming beyond cursor polling, full DLP-grade secret scanning, OS-enforced network sandboxed runner replay, Lean parser/logical-equivalence semantics beyond registered aliases, and richer real-host Pi UX/service lifecycle management remain deferred.

## Runtime Baseline

- Node.js: `>=22.19.0`
- Package manager: `pnpm@11.3.0` via Corepack
- Root validation:
  - `corepack pnpm install`
  - `corepack pnpm build`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`

## Phase 18-46 GA Vertical-Slice Evidence

- `corepack pnpm --filter @comath/comathd test` includes proof-kernel gate, ensemble recovery, v3 campaign state-machine, campaign, refutation, snapshot replay, runner re-execution replay, runner replay sandbox/dependency provenance, real MathProve external evidence-runner bridge, AgentRun runtime-boundary, AgentRun process-scheduler, AgentRun scheduler writer-lock integration, live profile-backed adapter execution, AgentRun observability, cursor-based AgentRun log streams, adapter-health probes, Agent adapter package registry, packaged launcher tests, external Codex-compatible CLI invocation tests, Agent Profile service integration, Lean trust-profile hardening, Lean statement-signature binding, registered Lean statement-alias equivalence, TriviumDB target-platform evaluation harness, project writer/session lock tests, proof-obligation DAG planning, campaign-scoped ensemble isolation, claim-scoped final replay artifact paths, read-model route, and theorem-family generalization tests.
- `corepack pnpm --filter @comath/comathd eval:trivium` runs the real optional `triviumdb@0.7.1` native package on the target platform and emits a fail-closed evaluation report for capability, upsert/search/context timing, search top-hit ratio, and persistence reopen behavior.
- `corepack pnpm --filter @comath/pi-extension test` includes research/campaign command, tool descriptor tests, the Phase 22 research loop, read-only dashboard aggregation over claim/evidence/gate list routes, Phase 26 runtime-registration contract checks, Phase 30 agent profile tools, Phase 41 profile execution tools, Phase 42 agent logs/health tools, Phase 43 packaged adapter tools, Phase 44 external backend selection tools, Phase 46 log-stream tools, manifest-driven dynamic import, fake Pi API registration, command dispatch, and Pi host-side mutating-tool confirmation gates.
- `corepack pnpm test` also includes `tests/e2e/phase45-pi-comathd-install-session.test.mjs`, which starts a real local `comathd` HTTP server, imports the built Pi package entrypoint from its manifest, registers into a fake Pi host, and exercises campaign/agent commands through `createComathClient({ baseUrl })` plus host confirmation.
- `node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs` and `node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs` cover cursor-based stdout/stderr polling, `GET /agent/run/:id/log-stream`, audit events, `proof_authority=none`, Pi `comath.agent.streamLogs`, and `/cm:agent stream`.
- The installed `@earendil-works/pi-coding-agent@0.75.5` loader has been smoke-tested against `extensions/comath-pi/dist/index.js`; the package `pi.extensions` contract is a path array, and CoMath runtime policy metadata lives under `pi.runtime_policy` plus the named `runtime_registration` export.
- The proof authority is the service-owned replay artifact path under `services/comathd/src/proof-kernel`; Pi and MathProve do not promote claims by themselves.
- These checks are vertical-slice evidence, not global GA readiness; unresolved blockers are tracked in `TODO.md`.

## Non-Negotiable Invariants

- No mathematical claim is promoted without evidence.
- No unreviewed workstream patch mutates the trusted graph.
- No agent writes project-runtime files outside the path policy.
- No TriviumDB write bypasses `comathd`.
- No reviewer approval is a proof.

## Canonical Documents

- [COMATH_PI_LAB_DEV_PLAN.md](COMATH_PI_LAB_DEV_PLAN.md)
- [CODEX_GOAL_RUNBOOK.md](CODEX_GOAL_RUNBOOK.md)
- [AGENTS.md](AGENTS.md)
- [TODO.md](TODO.md)
- [REVIEW.md](REVIEW.md)

## Design Companion Documents

- [End-State Blueprint](docs/architecture/end-state-blueprint.md)
- [Acceptance Matrix](docs/architecture/acceptance-matrix.md)
- [Risk Register](docs/architecture/risk-register.md)
- [Agent Operating Model](docs/architecture/agent-operating-model.md)
- [Design Handoff](docs/progress/design-handoff.md)
