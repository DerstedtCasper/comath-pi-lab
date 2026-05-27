# CoMath Pi Lab

CoMath Pi Lab is a Pi-based, auditable, memory-native research workbench for mathematical projects. Pi is the interaction shell; `comathd` is the local single-write service; the native proof-kernel owns GA proof replay evidence; MathProve remains an evidence producer and gate runner rather than a proof authority; TriviumDB remains an optional embedded memory backend behind an adapter.

This repository is at Research Alpha plus a Phase 18 GA vertical-slice implementation. It provides a working local prototype for project initialization, claim registration, fail-closed promotion gates, artifacts/audit logs, in-memory research memory, workstreams, GraphPatch review, MathProve bridge mock, exact/numeric compute runners, literature condition checks, working paper provenance, braid-statistics domain scaffolding, read-only Pi extension renderers, snapshot/replay verification, and service-owned ResearchCampaign proof-kernel routes.

The Phase 18 proof-kernel slice can lock and replay the elementary Lean theorem `n + 0 = n`, reject statement drift and cheat constructs, preserve 8 candidate audit artifacts, refute `n + 1 = n` by exact counterexample, expose Pi campaign tools as thin `comathd` clients, and replay after snapshot restore. It is still not a production arbitrary theorem prover. Generic proof planning beyond the implemented vertical slices, real MathProve execution, production Pi runtime registration, native TriviumDB performance validation, full DLP-grade secret scanning, and runner re-execution replay remain deferred.

## Runtime Baseline

- Node.js: `>=22.19.0`
- Package manager: `pnpm@11.3.0` via Corepack
- Root validation:
  - `corepack pnpm install`
  - `corepack pnpm build`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`

## Phase 18 GA Evidence

- `corepack pnpm --filter @comath/comathd test` includes proof-kernel gate, campaign, refutation, and snapshot replay tests.
- `corepack pnpm --filter @comath/pi-extension test` includes research/campaign command and tool descriptor tests.
- The proof authority is the service-owned replay artifact path under `services/comathd/src/proof-kernel`; Pi and MathProve do not promote claims by themselves.

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
