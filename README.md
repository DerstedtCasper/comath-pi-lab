# CoMath Pi Lab

CoMath Pi Lab is a Pi-based, auditable, memory-native research workbench for mathematical projects. Pi is the interaction shell; `comathd` is the local single-write service; the native proof-kernel owns GA proof replay evidence; MathProve remains an evidence producer and gate runner rather than a proof authority; TriviumDB remains an optional embedded memory backend behind an adapter.

This repository is at Research Alpha plus Phase 18-26 GA vertical-slice implementation. It provides a working local prototype for project initialization, claim registration, fail-closed promotion gates, artifacts/audit logs, in-memory research memory, workstreams, GraphPatch review, MathProve bridge mock plus a real external MathProve evidence-runner bridge, exact/numeric compute runners, literature condition checks, working paper provenance, braid-statistics domain scaffolding, read-only Pi extension renderers backed by service read models, snapshot/replay verification with runner re-execution, service-owned ResearchCampaign proof-kernel routes, a Pi-side one-command research campaign loop, a registered-theorem-family Lean replay path, and a Pi 0.75.5-compatible runtime registration package.

The Phase 18-26 slices can lock and replay the elementary Lean theorems `n + 0 = n` and `n * 0 = 0`, reject statement drift and cheat constructs, preserve 8 candidate audit artifacts, verify the seven-failures-plus-one-Lean-pass ensemble recovery benchmark, write structured V8 dialectical stress artifacts, expose v3 canonical ResearchCampaign states, refute `n + 1 = n` by exact counterexample, expose Pi campaign tools as thin `comathd` clients, replay after snapshot restore, read claim/evidence/gate boards through service-owned list routes, drive start/tick/dashboard campaign flow behind a scoped Pi capability, re-execute replayable compute runner reports from service-owned canonical input, invoke `MathProve-Skill`'s `verify_sympy.py` as a controlled non-authoritative evidence runner with statement-hash binding and fail-closed archival, and load the built Pi extension through the installed Pi 0.75.5 package-extension loader. It is still not a production arbitrary theorem prover. Broad proof planning beyond registered theorem families, broad MathProve proof search or MathProve-as-authority semantics, real agent scheduling, native TriviumDB performance validation, full DLP-grade secret scanning, OS/network sandboxed runner replay, and a full interactive Pi/comathd install-session e2e remain deferred.

## Runtime Baseline

- Node.js: `>=22.19.0`
- Package manager: `pnpm@11.3.0` via Corepack
- Root validation:
  - `corepack pnpm install`
  - `corepack pnpm build`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`

## Phase 18-26 GA Vertical-Slice Evidence

- `corepack pnpm --filter @comath/comathd test` includes proof-kernel gate, ensemble recovery, v3 campaign state-machine, campaign, refutation, snapshot replay, runner re-execution replay, real MathProve external evidence-runner bridge, read-model route, and theorem-family generalization tests.
- `corepack pnpm --filter @comath/pi-extension test` includes research/campaign command, tool descriptor tests, the Phase 22 research loop, read-only dashboard aggregation over claim/evidence/gate list routes, Phase 26 runtime-registration contract checks, manifest-driven dynamic import, fake Pi API registration, command dispatch, and Pi host-side mutating-tool confirmation gates.
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
